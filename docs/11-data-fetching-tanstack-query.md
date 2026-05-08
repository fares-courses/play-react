# 11 — Data fetching with TanStack Query

## What you're learning & why it matters

You're learning the right way to fetch and cache data from your Rails API in a React app. The library: **TanStack Query** (formerly React Query). After doc 06 (effects), you saw why "fetch in useEffect" goes wrong: race conditions, no caching, no deduplication, manual loading flags. TanStack Query solves all of that and more.

This is the single highest-leverage library in modern React. If your app talks to an API (it almost always does), this is how.

### Terms first

- **Server state** vs **client state**: server state is data owned by the server (users, posts, orders). It can become stale. Client state is local UI (open/closed, draft text, theme). Different concerns, different tools.
- **Cache**: a stored copy of server data, keyed by what you asked for. Lets you avoid refetching the same thing repeatedly.
- **Stale**: data older than some threshold; should be refetched in the background.
- **Mutation**: a request that *changes* server data (POST, PATCH, DELETE). Distinct from a *query* (GET).
- **Optimistic update**: updating the UI immediately as if the mutation succeeded, then rolling back if it fails. Makes apps feel instant.
- **Invalidation**: marking cached data as stale, so next time it's used it gets refetched.
- **Query key**: a unique identifier for a piece of cached data. Like a cache key, but structured.

## Mental model

> **Server data is a remote source of truth your app *caches*. Don't store it in `useState` and don't manually keep it in sync. Ask TanStack Query for it; it handles fetching, caching, deduplication, retries, and refresh.**

You stop thinking about loading states, race conditions, and "when do I refetch this?" — you describe what data you need, and the library figures out everything else.

## Setup

```bash
npm install @tanstack/react-query
```

Wrap your app:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

Optional but useful: `npm install @tanstack/react-query-devtools` and add `<ReactQueryDevtools />` somewhere — it gives you a dev panel showing every cached query and its state.

## `useQuery` — fetching data

```tsx
import { useQuery } from "@tanstack/react-query";

type User = { id: number; name: string; email: string };

function UserList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p>Error: {error.message}</p>;

  return <ul>{data!.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

Two things you supply:
- **`queryKey`**: a structured ID for this piece of data. Always an array. Use clear hierarchical keys: `["users"]`, `["users", id]`, `["users", id, "posts"]`. The key is how the cache identifies the data — same key = same cache entry.
- **`queryFn`**: an async function that returns the data. Throw on error; don't return error states from the function.

What you get back:
- `data` — the data once loaded (typed by your queryFn return type).
- `isLoading` — true on the first fetch.
- `isFetching` — true any time a fetch is in flight (including background refetches).
- `isError`, `error` — the error case.
- `refetch()` — force a refetch.

## Query keys: the convention that scales

Pattern your keys hierarchically:

```ts
["users"]                  // list of all users
["users", { role: "admin" }] // filtered list
["users", id]              // single user
["users", id, "posts"]     // posts of a user
```

Why this matters: TanStack Query lets you invalidate by *prefix*. After creating a user, `invalidateQueries({ queryKey: ["users"] })` invalidates the list and all variants of it. After updating a single user, `invalidateQueries({ queryKey: ["users", id] })` invalidates just that one.

In larger apps, centralize key builders so you don't typo them:
```ts
export const userKeys = {
  all: ["users"] as const,
  list: (filters: Filters) => [...userKeys.all, filters] as const,
  detail: (id: number) => [...userKeys.all, id] as const,
};
```

## Dependent queries

A query that needs another query's result:
```tsx
const { data: user } = useQuery({
  queryKey: ["users", userId],
  queryFn: () => fetchUser(userId),
});

const { data: posts } = useQuery({
  queryKey: ["posts", { authorId: user?.id }],
  queryFn: () => fetchPosts({ authorId: user!.id }),
  enabled: !!user, // only run when we have a user
});
```

`enabled: false` keeps a query paused until its dependencies are ready.

## `useMutation` — changing data

For POST/PATCH/DELETE/PUT:
```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateUserForm() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newUser: { name: string; email: string }) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <button
      onClick={() => mutation.mutate({ name: "Fares", email: "f@example.com" })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? "Creating…" : "Create"}
    </button>
  );
}
```

You call `mutation.mutate(args)` to fire it. `isPending`, `isError`, `isSuccess` give you status. The `onSuccess` callback invalidates the users list, so any `useQuery({ queryKey: ["users"] })` re-fetches automatically.

This pattern — *mutate, then invalidate* — is the bread and butter of CRUD UIs.

## Optimistic updates

Make the UI feel instant: update the cache *before* the server confirms, roll back on failure.

```tsx
const mutation = useMutation({
  mutationFn: updateUser,
  onMutate: async (newUser) => {
    await qc.cancelQueries({ queryKey: ["users", newUser.id] });
    const previous = qc.getQueryData<User>(["users", newUser.id]);
    qc.setQueryData(["users", newUser.id], newUser);
    return { previous };  // returned to onError as `context`
  },
  onError: (err, newUser, context) => {
    qc.setQueryData(["users", newUser.id], context?.previous);
  },
  onSettled: (data, err, newUser) => {
    qc.invalidateQueries({ queryKey: ["users", newUser.id] });
  },
});
```

The flow:
1. `onMutate` — before the request fires, save the current value, write the new one to the cache. UI updates instantly.
2. On error, restore the saved value.
3. After settled (success or failure), invalidate to sync with server truth.

Use this for actions where success is overwhelmingly likely (toggling a like, marking a todo done). Skip for anything where failure is common — the rollback feels worse than waiting.

## Configuration that matters

Two settings to know:
- **`staleTime`**: how long data is considered fresh. While fresh, it's served from cache without refetching. Default 0 (always considered stale, refetched aggressively). Set to e.g. 30 seconds for less-volatile data.
- **`refetchOnWindowFocus`**: refetch when the tab regains focus. Default `true`. Great for keeping data current; can be annoying in dev. Toggle per query or globally.

Set sensible defaults at the QueryClient level:
```tsx
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, refetchOnWindowFocus: false },
  },
});
```

## Talking to a Rails API

A few patterns that come up often:

**1. Auth headers.** Centralize in a fetch wrapper:
```ts
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res);
  return res.json();
}
```

**2. Rails JSON envelopes.** If your API wraps data like `{ data: ..., meta: { ... } }`, unwrap in queryFn:
```ts
queryFn: async () => {
  const json = await api<{ data: User[]; meta: Meta }>("/users");
  return json.data;
}
```

**3. Pagination.** Put the page in the queryKey so each page gets its own cache entry:
```ts
useQuery({ queryKey: ["users", { page }], queryFn: () => fetchUsers(page) });
```
Use `keepPreviousData: true` (or `placeholderData: previousData` in newer versions) so the previous page is shown while the next loads.

**4. Validation errors from Rails (422 with field errors).** Throw a structured error from queryFn/mutationFn so your form can map errors back to fields. Doc 12 covers this with react-hook-form.

## How to use this doc with an agent

**1. Build the lesson (mock backend):**
```
In src/lessons/10-tanstack-query/, install @tanstack/react-query and
@tanstack/react-query-devtools. Set up QueryClientProvider in the lesson's
entry. Build:

1. A mock API module with these functions, returning Promise<T> with random
   delays (200-800ms): listUsers(), getUser(id), createUser(input),
   updateUser(id, patch), deleteUser(id). Store users in an in-memory
   array; deliberately make ~20% of mutations throw to demo error states.

2. UsersPage using useQuery(["users"]) — list, loading state, error state.
3. UserDetailPage using useQuery(["users", id]) for selected user.
4. CreateUserForm using useMutation, with onSuccess invalidating ["users"].
5. ToggleFavorite component using OPTIMISTIC update pattern (onMutate +
   onError + onSettled).
6. ReactQueryDevtools mounted so I can see the cache live.

Use TypeScript strictly. Centralize query keys in a `keys` object. Throw
proper Error objects from the API functions on failure.
```

**2. Cache exploration:**
```
Walk me through the React Query Devtools. Show me what each tab/state
means: fresh, stale, fetching, paused, inactive. Trigger each state by
interacting with the lesson and tell me what's happening in the cache.
```

**3. Real Rails-API integration prompt:**
```
Assume we have a real Rails API at http://localhost:3000 with these endpoints:
GET /users, GET /users/:id, POST /users, PATCH /users/:id, DELETE /users/:id.
Auth is Bearer JWT in Authorization header (token in localStorage at "token").
Responses are wrapped: { data: ..., meta: { pagination } }. Errors are 4xx
with { errors: { field: [messages] } } JSON body.

Generate:
- An `api()` fetch wrapper handling auth, JSON, error mapping
- A typed `useUsers`, `useUser(id)`, `useCreateUser`, `useUpdateUser`,
  `useDeleteUser` hook layer that components can call
- Centralized userKeys object
- Proper TypeScript types throughout

This is the layer I'll actually copy into real projects.
```

## Checkpoints

1. Why is putting server data in `useState` a bad idea?
2. What's a queryKey and why does its structure matter?
3. What's the difference between `isLoading` and `isFetching`?
4. After a mutation, what are the two main strategies for keeping the UI in sync (cache invalidation vs optimistic update)? When does each fit?
5. What does `enabled` do, and when do you use it?
6. What's `staleTime` and how does it interact with `refetchOnWindowFocus`?

## Footguns

- **Inconsistent query keys.** Same data with subtly different keys = duplicate cache entries, no cache hits. Centralize key builders.
- **Returning error states from queryFn instead of throwing.** Breaks the library's error handling. Throw real errors.
- **Putting derived UI state in queries.** Search filters, sort order, etc. are client state — don't try to put them in TanStack Query.
- **Forgetting to invalidate after a mutation.** UI shows stale data until the next page navigation.
- **Optimistic updates without rollback.** If the request fails, the UI is now lying. Always implement `onError` if you implement `onMutate`.
- **Aggressive `staleTime: 0`.** Causes constant refetching, especially with `refetchOnWindowFocus`. Tune per-query.
- **Calling mutate inside render.** It runs every render. Mutations go in event handlers or effects.
- **Misusing `enabled` for "if user is logged in" check at every query call site.** Better: split your auth gate so logged-out users don't even render the query-using components.

## Ask-the-agent cheatsheet

- *"Generate a complete TanStack Query hook layer (useFoo, useFoos, useCreateFoo, useUpdateFoo, useDeleteFoo) for this resource: [paste schema]. Include centralized keys and proper TypeScript types."*
- *"Add an optimistic update to this mutation. Include onMutate, onError rollback, and onSettled invalidation. Explain what each step prevents."*
- *"This component uses useState + useEffect to fetch data. Convert to useQuery. Preserve the loading/error UI."*
- *"This Rails API returns errors as { errors: { field: [messages] } }. Add typed error handling to my fetch wrapper that maps these to a structured JS error my mutations can use."*
- *"Audit my query keys for inconsistency. Find any places where the same data has different key shapes."*

## Where this goes next

- **Doc 12** — Forms, where mutations and field-level error handling come together.
- **Doc 13** — Suspense + Error Boundaries, the modern way to handle loading/error states declaratively (TanStack Query supports Suspense mode).
- **Doc 18** — Auth flows, including how to attach tokens to all queries.
