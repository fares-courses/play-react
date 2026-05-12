# 15 — Error boundaries, Suspense, and loading UX

## What you're learning & why it matters

You're learning the modern way to handle two things that used to be tedious:

1. **Loading states** — without `if (isLoading) return <Spinner />` scattered everywhere.
2. **Errors during render** — without crashing the whole app when one component throws.

Tools: **Suspense** and **Error Boundaries**. Both are "boundaries" you place high in the tree that catch a specific concern below them. The components inside don't have to know they exist.

### Terms first

- **Loading state**: the UI shown while data isn't ready yet.
- **Error state**: the UI shown when something failed.
- **Throwing a promise**: how Suspense knows a component is "loading" — the component literally throws a Promise, Suspense catches it.
- **Error boundary**: a special component that catches errors thrown by descendants during render and shows a fallback UI instead of crashing.
- **Fallback**: the UI shown by Suspense (while loading) or an error boundary (on error).

## Mental model

> **Suspense and error boundaries let you handle "not ready" and "broken" *outside* the components that produce them. Components throw — boundaries catch.**

Instead of every component carrying its own loading/error logic, you place boundaries at the right granularity and the components inside become much simpler.

## Suspense: declarative loading

A Suspense boundary wraps a subtree. If any descendant component "suspends" (signals it's not ready), Suspense shows the fallback instead of the subtree.

```tsx
import { Suspense } from "react";

<Suspense fallback={<Spinner />}>
  <UserProfile userId={42} />
</Suspense>
```

If `<UserProfile>` (or anything inside it) is waiting on data, the spinner shows. Once it's ready, the real UI renders.

What can suspend?

1. **Lazy components** — `lazy(() => import("./Foo"))` suspends while the chunk loads (you saw this in doc 10).
2. **Suspense-enabled data fetching.** TanStack Query has a Suspense mode, and React 19's `use()` hook (doc 16) suspends on unresolved promises.

### Why this is better than `if (isLoading)`

Old way:
```tsx
function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery(...);
  if (isLoading) return <Spinner />;
  return <div>{data.name}</div>;
}
```

Suspense way:
```tsx
function UserProfile({ userId }: { userId: number }) {
  const { data } = useSuspenseQuery(...); // throws while loading
  return <div>{data.name}</div>;
}

// elsewhere:
<Suspense fallback={<Spinner />}>
  <UserProfile userId={42} />
</Suspense>
```

The component body becomes purely "I have data, render it." Loading is a boundary concern, not a per-component concern. Multiple components inside one Suspense share one fallback — no spinner-per-card chaos.

### Where to place Suspense boundaries

A balance:

- **Too high** (around the whole app) — one tiny query suspends, the entire app shows a spinner.
- **Too low** (around every component) — flickery spinner soup.
- **Right** — at meaningful UI sections. Each "panel," route page, or independently-loadable card gets its own.

A good heuristic: a Suspense boundary is "this whole region is unusable without this data." If part of the region can show progressively, give it its own boundary.

### Nested Suspense

```tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />
  </Suspense>
  <Suspense fallback={<MainSkeleton />}>
    <Main />
  </Suspense>
</Suspense>
```

The outer fallback shows until the header is ready; once the page shell is up, sidebar and main load independently. This is how you get the "shell renders, then sections fill in" feel of fast apps.

## Error boundaries: declarative error handling

Error boundaries catch render errors thrown by descendants. They're class components historically (the only thing in modern React that has to be a class). You'll usually use a library: `react-error-boundary`.

```bash
npm install react-error-boundary
```

```tsx
import { ErrorBoundary } from "react-error-boundary";

function Fallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={Fallback}>
  <UserProfile userId={42} />
</ErrorBoundary>
```

If anything inside throws during render, the fallback shows. `resetErrorBoundary` clears the error and re-renders.

What error boundaries catch:

- Errors thrown during render in a descendant.
- Errors thrown in lifecycle methods.
- Errors thrown in constructors.

What they **do not** catch:

- Errors in event handlers (use try/catch there).
- Errors in async code (after a `setTimeout`, after `await`) — handle in the promise.
- Errors in the boundary itself.

Pair error boundaries with TanStack Query's `useSuspenseQuery` (which throws on errors when not handled): the loading flows into Suspense, the error flows into the error boundary. Both are now boundary concerns.

## The pattern: Suspense + ErrorBoundary together

```tsx
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Suspense fallback={<Spinner />}>
    <UserProfile userId={42} />
  </Suspense>
</ErrorBoundary>
```

The component body in `<UserProfile>` is now purely "I have data; render it." Loading is one concern, errors are another, and the component does neither.

For TanStack Query, opt in to throwing on error:
```tsx
const { data } = useSuspenseQuery({
  queryKey: ["users", id],
  queryFn: () => fetchUser(id),
});
// throws on loading (caught by Suspense) and on error (caught by ErrorBoundary)
```

You can also configure per-query: `useQuery({ ..., throwOnError: true })`.

## Skeleton fallbacks (good UX)

Spinners are ok. Skeleton screens — gray placeholders shaped like the real UI — feel better. Show users *where* the content will be, not just *that* it's coming.

```tsx
function UserCardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton avatar" />
      <div className="skeleton line w-60" />
      <div className="skeleton line w-40" />
    </div>
  );
}

<Suspense fallback={<UserCardSkeleton />}>
  <UserCard userId={42} />
</Suspense>
```

## Loading transitions (avoiding flicker)

When you change a query's input (e.g., switching pages), you don't want the new data to "suspend" — you want the old UI to stay until the new data arrives.

`useTransition` (we'll cover properly in doc 16) marks an update as low-priority and tells React to keep showing the old UI:

```tsx
const [isPending, startTransition] = useTransition();

function changePage(newPage: number) {
  startTransition(() => setPage(newPage));
}
```

Or use TanStack Query's `placeholderData: keepPreviousData` to keep the previous query result while the next one loads. Either way, the user sees the old data + a subtle "loading" indicator instead of a jarring fallback.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/12-suspense-errors/, install react-error-boundary. Build:

1. A UserProfile component that uses useSuspenseQuery to load a user.
   Mock the API: 30% chance it fails, 70% it succeeds after 600ms.
2. An ErrorBoundary + Suspense pair wrapping it. Fallback for loading is
   a SkeletonCard (with grayed bars). Fallback for error has a "Try again"
   button that calls resetErrorBoundary AND invalidates the query.
3. A button to remount the component with a new userId so I can re-trigger
   the loading state easily.
4. A second example that places three SuspenseBoundaries side by side, one
   per card, so I can see independent loading.

Use TypeScript strictly. Comment what each boundary catches.
```

**2. Side-by-side comparison:**
```
Build the same UserProfile twice in one file:
  a) Old style: useQuery with isLoading/isError checks inside the component
  b) New style: useSuspenseQuery + Suspense + ErrorBoundary outside

Mount both. Compare the component bodies' complexity. Tell me which feels
cleaner and why.
```

**3. Boundary placement exercise:**
```
For an app with these sections:
- Top nav (always visible)
- Sidebar with user info and notifications (each from different API)
- Main content with a list of articles, each article has its own comments
Where should I place Suspense boundaries and why? Draw out the tree of
boundaries. Avoid both extremes (one big boundary; boundary per leaf).
```

## Checkpoints

1. What does it mean for a component to "suspend"?
2. What's the difference between Suspense and an error boundary?
3. Where don't error boundaries reach — what kinds of errors do they NOT catch?
4. Why do nested Suspense boundaries produce a better UX than one top-level boundary?
5. What's the role of `useSuspenseQuery` vs `useQuery`?
6. What does `useTransition` (doc 16) help with in the context of route or filter changes?

## Footguns

- **Putting Suspense too high.** One slow query causes the whole app to fall back. Place boundaries at meaningful UI sections.
- **Forgetting an error boundary.** Components throw in production and crash the whole app. Always pair Suspense with an error boundary.
- **Using try/catch instead of error boundaries.** Try/catch only works for sync errors in the same scope. Render errors in children won't be caught — only error boundaries catch those.
- **Catching event handler errors with an error boundary.** Boundaries don't catch event handlers. Use try/catch there, or report via an error reporting service.
- **No reset path.** If your fallback doesn't offer a "try again," users have to refresh the whole page.
- **Spinners everywhere even with Suspense.** Defeats the point. Use one skeleton per boundary, not per component.
- **Mixing isLoading checks with Suspense in the same flow.** Pick one pattern per region.

## Ask-the-agent cheatsheet

- *"Convert these components from `if (isLoading) ... if (isError) ...` to Suspense + ErrorBoundary. Keep the same UX (skeleton + retry button)."*
- *"Where should I place Suspense boundaries in this layout? [paste tree]. I want fast initial paint with progressive content fill-in."*
- *"My useSuspenseQuery throws on error and I don't have an ErrorBoundary nearby — wrap it correctly with both Suspense and ErrorBoundary, and make the error fallback retry the query (not just reset the boundary)."*
- *"Replace this loading spinner with a skeleton component shaped like the actual UserCard. It should match the layout so the swap is smooth."*
- *"Add useTransition to my pagination so changing pages keeps the old list visible until the new one is ready, instead of falling back to the Suspense fallback."*

## Where this goes next

- **Doc 16** — React 19 features. `use()`, `useTransition`, `useOptimistic`, `useActionState` — many of which complement Suspense.
- **Doc 17** — Server Components, where Suspense becomes first-class and the patterns scale up.
