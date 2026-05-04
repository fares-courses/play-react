# 17 — Auth flows

## What you're learning & why it matters

You're learning how a React SPA handles authentication when talking to a separate Rails API: login, token storage, attaching credentials to every request, refreshing expired tokens, route guards, and logout. This is the most common "I built it 80% then got stuck" area for SPA developers.

Important: **auth is a security topic.** The right answers depend on your threat model. This doc covers the common, correct-for-most-apps patterns and flags the tradeoffs honestly.

### Terms first

- **JWT (JSON Web Token)**: a signed token containing claims (user id, expiration). Your Rails API issues one on login; the client sends it on every request.
- **Bearer token**: an HTTP `Authorization: Bearer <token>` header. The standard way clients send tokens.
- **Session cookie**: a cookie that the browser automatically attaches to requests. Set by the server, opaque to the client.
- **Refresh token**: a longer-lived token used to get new short-lived access tokens. The access token is what's actually sent on each request.
- **CSRF (Cross-Site Request Forgery)**: an attack where another site tricks the browser into making authenticated requests to your API. Cookies are vulnerable; Bearer tokens generally aren't.
- **XSS (Cross-Site Scripting)**: an attack where attacker JS runs in your page and can read anything in localStorage / sessionStorage.
- **httpOnly cookie**: a cookie that JavaScript cannot read. Mitigates XSS impact on the auth token (but not on the active session).
- **SameSite cookie**: a cookie attribute that limits cross-site sending. `SameSite=Lax` or `Strict` mitigates CSRF.

## Mental model

> **You have two values to manage: "is the user logged in?" (UI state) and "the credential to send with every API call" (transport concern). The first goes in Context. The second goes either in localStorage (Bearer tokens) or in cookies (session).**

The two big architectural choices:

1. **Where does the credential live?**
   - **Bearer tokens in localStorage** — easy to do; vulnerable to XSS (if attacker JS runs, it reads the token). Mitigation: don't have XSS bugs (CSP, sanitize, don't dangerously inject HTML).
   - **httpOnly cookies** — JS can't read them, so XSS can't directly steal them. But cookies are auto-attached, so you must handle CSRF. Best for cross-domain, harder cross-domain than tokens.

2. **Short-lived access + refresh, or long-lived single token?**
   - Best practice: short-lived (15-minute) access tokens, refreshed via a refresh token. Limits the damage if a token leaks.
   - Pragmatic for many apps: a single token with a reasonable expiration (24h–7d) and re-login when it expires. Simpler.

Pick a model based on your security posture. For most internal/B2B apps, "Bearer tokens in localStorage with reasonable expiration" is the practical default. For consumer apps with sensitive data, do the cookie + refresh dance.

This doc shows the **Bearer token** approach in detail since it's the simplest and most common in SPA + separate API setups. We'll note the cookie variant.

## Architecture overview

```
[Login form] → POST /api/login → {token, user}
                                         ↓
                              [save token to localStorage]
                              [set user in AuthContext]
                                         ↓
                              [fetch wrapper attaches token]
                                         ↓
                              [route guards check user]
                                         ↓
                                    [logout: clear both]
```

## The AuthContext

Doc 08's pattern, applied:

```tsx
// auth/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";

type User = { id: number; email: string; name: string };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!token);

  // On mount, if we have a token, validate it by fetching /me
  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    let active = true;
    api.get<User>("/me", token).then(
      (u) => { if (active) { setUser(u); setIsLoading(false); } },
      () => { if (active) { localStorage.removeItem("token"); setToken(null); setIsLoading(false); } }
    );
    return () => { active = false; };
  }, [token]);

  async function login(email: string, password: string) {
    const { token: t, user: u } = await api.post<{ token: string; user: User }>("/login", { email, password });
    localStorage.setItem("token", t);
    setToken(t);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
```

Key points:
- Token is loaded from localStorage on first render (lazy initializer).
- On mount, if a token exists, hit `/me` to validate it and load the user.
- `isLoading` exists so route guards know "we don't know yet" vs "definitely logged out."
- On any rejected `/me`, clear the bad token.

Wrap your app in `<AuthProvider>` at the root.

## The fetch wrapper

Centralize token-attaching:

```tsx
// auth/api.ts
class ApiError extends Error {
  constructor(public status: number, public body: any) { super(`API ${status}`); }
}

function getToken() { return localStorage.getItem("token"); }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    // token bad → kick to login
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new ApiError(401, null);
  }

  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.json();
}

api.get = <T,>(p: string) => api<T>(p);
api.post = <T,>(p: string, body: any) => api<T>(p, { method: "POST", body: JSON.stringify(body) });
api.patch = <T,>(p: string, body: any) => api<T>(p, { method: "PATCH", body: JSON.stringify(body) });
api.delete = <T,>(p: string) => api<T>(p, { method: "DELETE" });
```

Now every TanStack Query (doc 11) call uses this wrapper, gets the token automatically, and 401s hard-redirect to login.

## Route guards

```tsx
// auth/RequireAuth.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
```

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
    <Route path="/" element={<Home />} />
    <Route path="/users" element={<Users />} />
  </Route>
</Routes>
```

Important: handle the *loading* state. Without it, the user briefly sees a "you're not logged in" redirect before the auth check finishes.

## The login form

Combining doc 12 (forms) and doc 11 (mutations):

```tsx
const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(Schema),
  });

  async function onSubmit(values: z.infer<typeof Schema>) {
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError("root", { message: "Invalid email or password" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="email" {...register("email")} placeholder="Email" />
      <input type="password" {...register("password")} placeholder="Password" />
      {errors.email && <span>{errors.email.message}</span>}
      {errors.root && <span>{errors.root.message}</span>}
      <button type="submit" disabled={isSubmitting}>Log in</button>
    </form>
  );
}
```

Notice `from` — after login, we send the user back where they tried to go. The route guard's `state={{ from: location }}` made this possible.

## Token refresh (the harder version)

For sensitive apps, don't keep a 7-day token sitting in localStorage. Use:

1. **Access token** — short-lived (15 min), in memory or sessionStorage.
2. **Refresh token** — longer-lived (7-30 days), in an httpOnly cookie set by the server.

When an access token expires, the fetch wrapper detects 401, calls `/refresh` (which uses the refresh-token cookie automatically), gets a new access token, retries the original request.

Pseudocode:
```ts
async function api(path, init) {
  let res = await fetch(path, addToken(init));
  if (res.status === 401 && !init._retry) {
    const newToken = await refresh();
    if (newToken) {
      saveToken(newToken);
      return api(path, { ...init, _retry: true });
    } else {
      logout();
    }
  }
  return res.json();
}
```

Concurrency footgun: if 5 requests fire and all get 401 simultaneously, you'll trigger 5 refresh attempts. Coalesce them — keep a single in-flight refresh promise that all retries await.

Real implementations are 50+ lines and easy to get wrong. Use a library if your stack has one (axios + interceptors, ky, your team's existing client) rather than reinventing.

## Cookie-based session (the alternative)

If your Rails API uses Devise sessions or a custom cookie-based auth:

- API sets an httpOnly, Secure, SameSite=Lax cookie on login.
- Client uses `fetch(url, { credentials: "include" })` so the browser sends the cookie.
- CORS must allow credentials and the API must echo the exact origin (not `*`).
- CSRF protection: API requires a CSRF token in a header for state-changing requests. Read the token from a meta tag or a separate endpoint.

Cookie-based has slightly different ergonomics — you don't manage a token in JS at all. The Auth Context just tracks the *user*, fetched via `/me`. Login/logout are just API calls; the cookie magic happens on the server.

For Rails Devise/JWT-cookie hybrids, follow the pattern your gem's docs prescribe. Don't mix and match.

## Logging out

Three things to clear:

1. The token (localStorage / cookie).
2. The AuthContext state.
3. **TanStack Query's cache** — otherwise after logout, cached user data persists. Call `queryClient.clear()` on logout.

```tsx
function logout() {
  localStorage.removeItem("token");
  setToken(null);
  setUser(null);
  queryClient.clear();
}
```

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/17-auth/, build a complete Bearer-token auth flow against
a mocked API:

1. Mock API: in-memory user store {email, password, id, name}. Endpoints
   /api/login (returns {token, user} or 401), /api/me (auth required, 401
   without token), /api/logout (no-op). Mock with msw if installed, else
   a simple wrapper.

2. AuthContext with the pattern in this doc: token from localStorage on
   load, validate via /me on mount, login/logout, isLoading.

3. api() wrapper that attaches token, treats 401 as session expiry.

4. LoginPage using react-hook-form + zod, navigates back to `from` after login.

5. RequireAuth route guard with proper isLoading handling.

6. Routes: /login (public), /, /profile (protected).

7. A logout button in the header that clears everything including the
   query client's cache (assume TanStack Query is set up; else just clear
   localStorage and state).

Use TypeScript strictly. No `any`. Centralize the User type.
```

**2. Threat-model exercise:**
```
Walk me through the security tradeoffs for these three options for this
specific app type (B2B internal tool with a Rails API):
  a) Long-lived JWT in localStorage
  b) Short-lived JWT in memory + refresh token in httpOnly cookie
  c) Pure cookie session with CSRF tokens

What attacks does each defend against / not defend against? Make a
recommendation and explain why.
```

**3. Refresh-token implementation:**
```
Add a refresh-token flow to the auth: 15-minute access token in memory,
30-day refresh token (mock as an httpOnly cookie via msw). The api()
wrapper should: detect 401, call /refresh, retry the original request.
Coalesce concurrent refreshes into one. Show me the test cases I should
care about, then write code that passes them.
```

## Checkpoints

1. Why does `isLoading` matter in the AuthContext for route guards?
2. Why is "JWT in localStorage" vulnerable to XSS but not CSRF, and why is "session cookie" the opposite?
3. Why centralize fetch in an `api()` wrapper rather than calling `fetch` directly everywhere?
4. After logout, why must you also clear the TanStack Query cache?
5. What's the concurrency hazard with refresh tokens, and how do you fix it?
6. After login, why navigate to `from` (the route they tried) instead of just `/`?

## Footguns

- **Storing tokens in `localStorage` and ignoring XSS.** Without rigorous XSS protection, your tokens are stealable. Use CSP, sanitize, never `dangerouslySetInnerHTML` user content.
- **Forgetting `isLoading`.** Users see a flash of "logged out" UI before auth resolves.
- **Not handling 401 globally.** Each component handles its own 401, inconsistently. Centralize in the api wrapper.
- **No cache clear on logout.** Cached queries keep showing the previous user's data.
- **Refresh-token races.** Multiple expired requests trigger N parallel refreshes; tokens get into a weird state. Coalesce.
- **CORS misconfiguration.** Cookies don't send because origin isn't allowed. Tokens don't send because `Authorization` isn't in `Access-Control-Allow-Headers`. Configure both sides.
- **Logging users out on every page refresh.** Means you're not persisting the token. Save to localStorage (or use cookies).
- **Re-using a token after logout.** Server-side, ensure logout invalidates server-side state if applicable; client-side, clear and bail.
- **No HTTPS in production.** Tokens and credentials in clear text. Always serve over HTTPS.

## Ask-the-agent cheatsheet

- *"Build me an AuthContext + api() wrapper pattern for a Rails API at VITE_API_URL with Bearer JWT auth. Include isLoading, /me bootstrap, RequireAuth guard, login form with react-hook-form + zod."*
- *"Add refresh-token logic to the api wrapper. Access token in memory, refresh via httpOnly cookie call to /refresh. Coalesce concurrent refreshes. Test cases first."*
- *"Switch this app from Bearer-token auth to cookie-session auth. Update the api wrapper to use credentials: 'include', remove token storage, handle CSRF token from a meta tag."*
- *"Audit my auth code for the common bugs: missing isLoading, no cache clear on logout, no 401 handling, no XSS protections."*

## Where this goes next

- **Doc 19** — WebSockets, where authenticated connections need similar token-passing logic.
- **Doc 20** — File uploads, sometimes requiring signed URLs that themselves are auth-flavored.
