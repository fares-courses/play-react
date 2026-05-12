# 10 — Routing

## What you're learning & why it matters

You're learning how a React app maps URLs to UI. In a Rails API world, "routing" means mapping HTTP verbs and paths to controller actions. In a React **single-page application** (SPA), routing means: when the URL changes (the user clicks a link or hits Back), show a different component — *without a full page reload*.

You'll learn:
- The mental model of client-side routing.
- The two main libraries (React Router and TanStack Router) and when to pick each.
- Route params, search params, nested routes, lazy loading, route guards.

### Terms first

- **SPA (Single-Page Application)**: a web app where the browser loads one HTML page once, and JavaScript swaps the visible UI as the user navigates. The URL changes, but no full page reload happens.
- **Client-side routing**: changing the URL via JavaScript and updating the UI to match, instead of asking the server for a new HTML page.
- **History API**: browser-built-in API for pushing URLs into history without reloading. All routers use it under the hood.
- **Route**: a mapping from a URL pattern to a component. e.g., `/users/:id` → `<UserPage />`.
- **Route param**: a variable piece of the URL — `:id` in `/users/:id`. The router extracts it and passes it to your component.
- **Search params (query string)**: the `?key=value&...` part of a URL. Used for filters, pagination, etc.
- **Nested route**: a route that renders inside another route's layout (e.g. a sidebar that's always there with content swapping below).
- **Lazy loading / code splitting**: loading a chunk of your JS bundle only when needed, so the initial page is faster.
- **Route guard**: redirecting users away from a route they shouldn't see (auth check, role check).

## Mental model

> **The URL is state. Routing is "syncing the visible UI with that piece of state."** The router's job is to read the current URL, decide which components should be on screen, and update them when the URL changes.

This sounds obvious, but the implication is important: **the URL is an excellent place to store certain state** — search filters, the currently open record, pagination — because it's free, shareable (you can copy/paste the URL to a colleague), and survives reloads.

## React Router vs TanStack Router

Two real choices in 2026:

| | React Router (v6/v7) | TanStack Router |
|---|---|---|
| Maturity | Oldest, largest ecosystem | Newer, gaining ground fast |
| Type-safety on routes | Limited (manual typing) | Excellent (fully typed routes & search params) |
| Learning curve | Easier; tons of tutorials | Steeper but pays off |
| Best for | Most apps, especially smaller | Apps that benefit from heavy type safety |

For this course we'll use **React Router** as the default — it's the most common and the patterns transfer. If you later want full TS-typed routes, the agent can convert.

## Installing and setting up React Router

```bash
npm install react-router-dom
```

Wrap your app in a `<BrowserRouter>`:
```tsx
// main.tsx
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

Then declare routes:
```tsx
import { Routes, Route, Link } from "react-router-dom";

function App() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link> | <Link to="/users">Users</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
```

`<Link to="/users">` is React Router's replacement for `<a href>`. Use `<Link>` for internal navigation — it changes the URL via the History API without a page reload. Use `<a href>` only for external links.

`*` is the catch-all for "no route matched" — your 404 page.

## Reading route params

```tsx
import { useParams } from "react-router-dom";

function UserPage() {
  const { id } = useParams<{ id: string }>();
  return <h1>User {id}</h1>;
}
```

The `<{ id: string }>` is a TS generic telling `useParams` what shape to return. You'll need this because params are always strings (and `useParams` can't know your route shape automatically). If `id` should be a number for your logic, parse it: `Number(id)`.

## Reading and writing search params

For things like `/users?role=admin&page=2`:

```tsx
import { useSearchParams } from "react-router-dom";

function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role") ?? "all";
  const page = Number(searchParams.get("page") ?? 1);

  return (
    <>
      <select value={role} onChange={e => setSearchParams({ role: e.target.value })}>
        <option value="all">All</option>
        <option value="admin">Admins</option>
      </select>
      ...
    </>
  );
}
```

`setSearchParams` updates the URL, which updates the search params, which re-renders the component. The URL is your state — the component just reads it.

This is one of the most underused patterns in React. Filter state, sort state, pagination, "currently selected tab" — all of these can live in the URL. Benefits: shareable, bookmarkable, survives refreshes, the back button works correctly.

## Programmatic navigation

When you need to navigate from code (e.g., after submitting a form):

```tsx
import { useNavigate } from "react-router-dom";

function CreateUser() {
  const navigate = useNavigate();
  async function handleSubmit() {
    const user = await createUser(...);
    navigate(`/users/${user.id}`);     // forward
    // navigate(-1);                   // back
  }
}
```

## Nested routes (layouts)

Almost every app has a "shell" — header, sidebar, footer — that stays put while the main area changes. Nested routes handle this with `<Outlet />`:

```tsx
function AppLayout() {
  return (
    <>
      <Sidebar />
      <main><Outlet /></main>   {/* child route renders here */}
    </>
  );
}

<Routes>
  <Route element={<AppLayout />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/users" element={<UsersPage />} />
    <Route path="/users/:id" element={<UserPage />} />
  </Route>
</Routes>
```

`<AppLayout>` is rendered for any matching child route. The child component goes where `<Outlet />` is. This is how you build "sidebar + content" layouts without each page repeating the chrome.

You can nest deeper too — `/settings` has its own sub-nav with `/settings/profile`, `/settings/security`, etc.

## Lazy loading (code splitting)

The whole app's JS doesn't need to load on first page view. Most users won't visit every route. Lazy-load route components:

```tsx
import { lazy, Suspense } from "react";

const SettingsPage = lazy(() => import("./pages/SettingsPage"));

<Routes>
  <Route
    path="/settings"
    element={
      <Suspense fallback={<div>Loading…</div>}>
        <SettingsPage />
      </Suspense>
    }
  />
</Routes>
```

`lazy()` tells the bundler to put this component's code in a separate chunk that downloads only when the route is visited. `<Suspense fallback>` is what shows while the chunk loads. (Doc 15 covers Suspense properly.)

For an app with many routes, lazy-loading the heavy/uncommon ones is the single biggest perf win you can do.

## Route guards (auth-only routes)

```tsx
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); // from your AuthContext (doc 20)
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

<Routes>
  <Route path="/dashboard" element={
    <RequireAuth><Dashboard /></RequireAuth>
  } />
</Routes>
```

A wrapper component checks auth and either renders children or redirects. The `state={{ from }}` lets the login page redirect back after a successful login. We'll wire the actual auth context up in doc 20.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/09-routing/, set up React Router and build a small multi-page
demo. Steps:

1. npm install react-router-dom
2. Wrap the App in BrowserRouter (in main.tsx if needed, but isolate to
   the lesson if possible)
3. Build these routes:
   - / : HomePage
   - /users : UsersPage with a hardcoded list of 5 fake users (Link each
     to their detail page)
   - /users/:id : UserPage that reads :id via useParams and shows fake details
   - /search : SearchPage that uses useSearchParams to filter a fake list by
     a `q` query param. Typing in an input updates the URL.
   - * : NotFound
4. Use a nested AppLayout with a sidebar (3 links) and an Outlet
5. Lazy-load the UserPage with Suspense fallback

Use TypeScript strictly. Use Link, not <a>, for internal navigation. Add
brief comments showing the router concepts at each step.
```

**2. URL-as-state exercise:**
```
Take a typical filter UI: a select for category, an input for search,
and a checkbox for "in stock only." Implement two versions:
  a) State stored in useState (filters reset on refresh, not shareable)
  b) State stored in URL search params (shareable, survives refresh)
Show me the difference in how each version behaves and how URL state
makes "share this filter view" trivially easy.
```

**3. Architecture exercise:**
```
For a fictional admin panel with these screens, design the route structure
including nested layouts and lazy loading:
- Login page (no chrome)
- Dashboard (sidebar + content)
- Users list, user detail, edit user (all under sidebar)
- Settings with sub-nav: profile, security, billing
Tell me which routes should be lazy-loaded and why.
```

## Checkpoints

1. Why does `<Link>` exist instead of just using `<a href>`?
2. What's the difference between route params and search params? Give an example use case for each.
3. What is `<Outlet />` and why does it exist?
4. When should you store filter/pagination state in the URL vs in component state?
5. What does `lazy()` do, and what role does Suspense play?
6. How does a route guard work, and why redirect with `state={{ from }}`?

## Footguns

- **Using `<a href>` for internal links.** Triggers a full page reload — you lose all client state, restart your app, slow.
- **Forgetting to wrap the app in `<BrowserRouter>`.** Hooks like `useNavigate` throw confusingly.
- **Storing URL-worthy state in `useState`.** Filters lost on refresh, not shareable, back button broken.
- **Hardcoding paths as strings everywhere.** When you rename a route, you find them all by grep. Centralize route paths in a constants file.
- **Lazy-loading every route.** Each lazy chunk is a network request. Pages used immediately should not be lazy. Lazy-load less-common pages.
- **Auth check in the page component instead of a guard.** Page renders briefly, then redirects — flicker. Guard at the route level.
- **Server-side routing assumptions.** SPAs need server config so `/users/42` doesn't 404 on refresh. With Vite + a static host, configure SPA fallback (see doc 19).

## Ask-the-agent cheatsheet

- *"Set up React Router with these routes [list]. Use a nested layout with `<Outlet />` for the chrome. Lazy-load routes [X, Y]. Type all `useParams` returns explicitly."*
- *"Move this filter state from useState to URL search params. Keep the UI behavior identical."*
- *"Add a `<RequireAuth>` route guard that uses my AuthContext. Redirect unauthenticated users to /login and remember where they came from."*
- *"This route's component is huge. Lazy-load it with React.lazy and add a Suspense fallback. Show me how the bundle splits in the build output."*

## Where this goes next

- **Doc 12** — Data fetching, often combined with route params (`/users/:id` triggers a fetch for user `:id`).
- **Doc 15** — Suspense, the same primitive lazy() uses, applied to data loading.
- **Doc 20** — Auth flows; we'll wire up the route guard with a real AuthContext.
