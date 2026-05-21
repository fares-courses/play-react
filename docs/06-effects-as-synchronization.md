# 06 — Effects as synchronization (the deep one)

## What you're learning & why it matters

You're learning `useEffect`, which is the most-misused hook in React. Most React bugs you'll encounter in real codebases — flickering UIs, double network requests, infinite loops, stale data, "why does this run twice in development" — are effects written by people who think effects are *lifecycle hooks*. They're not.

If you walk away with one thing from this doc: **effects are not "do this when the component mounts." They are "keep this external thing synchronized with my state."** That mental shift fixes 90% of effect bugs.

---

## The modern rule of thumb: Hook-Last philosophy

In modern React, the general rule is: **you will use `useEffect`, but much less than you think.**

Early on, developers used `useEffect` for everything. Today, the React team pushes a "Hook-Last" approach. Before reaching for `useEffect`, ask:

1. **Can I do this in an `onClick` (or any event handler)?** If yes, do it there.
2. **Is there a library (like TanStack Query) that does this?** If yes, use it.
3. **Is this just calculating a value based on state/props?** If yes, compute it in the render body.
4. **If all else fails:** use `useEffect` — but make sure your dependency array is correct.

This isn't "avoid effects at all costs." It's "effects solve a specific problem — synchronizing with external systems — and you should only use them for that."

---

## Terms first

- **Side effect**: anything a function does besides return a value — network requests, timers, DOM manipulation outside React, subscriptions, logging to a server, writing to localStorage.
- **External system**: anything that lives outside React's render cycle — the browser DOM, a WebSocket, the network, `localStorage`, a third-party widget.
- **Mount / unmount**: when a component instance first appears on screen (mount) and when it's removed (unmount). Between those, it can re-render any number of times.
- **Cleanup**: a function you return from your effect that React runs before the next effect run (or on unmount). Used to undo subscriptions, abort requests, clear timers.
- **Dependency array**: the second argument to `useEffect`. A list of values; if any of them change between renders, React re-runs the effect.
- **Stale closure**: when your effect captures a variable's old value because the effect didn't re-run after the variable changed.

---

## The mental model

> **Effects synchronize a piece of external state with your React state.** They are not lifecycle hooks; they're saying "given my current state, the outside world should look like *this*."

Before writing an effect, ask yourself: **"What external system am I synchronizing?"**

- Connecting to a WebSocket? External system = the socket.
- Setting `document.title`? External system = the browser tab title.
- Fetching a user profile? That's data fetching — use TanStack Query (doc 12), not an effect.

If you can't name the external system, you probably don't need an effect.

Compare to your backend life: a Sidekiq worker watches a queue and reacts to changes. An effect is similar — it watches your component's state (via the dependency array) and reacts by updating something external. You don't think of a Sidekiq worker as "the worker that runs when the app starts" — you think of it as "the thing that keeps state X consistent with state Y." That's the right frame for effects.

---

## The shape of `useEffect`

```tsx
useEffect(() => {
  // setup: do the side effect
  const timer = setInterval(tick, 1000);

  return () => {
    // cleanup: undo the side effect
    clearInterval(timer);
  };
}, [/* dependencies */]);
```

Three pieces:

1. **Setup function** — runs after React commits the render to the DOM.
2. **Cleanup function** (optional but usually needed) — runs before the next setup, and on unmount.
3. **Dependency array** — controls when the effect re-runs.

### When does each piece run?

Here's the full lifecycle with a concrete example — a `ChatRoom` component that connects to a room:

```
Component mounts with roomId="general"
  → setup runs: connect to "general"

roomId prop changes to "random"
  → cleanup runs: disconnect from "general"
  → setup runs: connect to "random"

Component unmounts
  → cleanup runs: disconnect from "random"
```

This is what "synchronization" means. React ensures the external system (the connection) always reflects the current state (`roomId`).

### How the dependency array controls re-runs

| Dependency array | When effect runs |
|---|---|
| `[]` (empty) | Once after mount; cleanup once on unmount |
| `[a, b]` | After mount + any time `a` or `b` change |
| *(omitted entirely)* | After every render (almost always wrong) |

React compares dependencies with `Object.is` (basically `===`). So if you pass an object or array as a dependency and you recreate it on every render, the effect runs every render even if nothing meaningful changed. More on this below.

---

## A worked example: synchronizing with a chat room

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();

    return () => connection.disconnect();
  }, [roomId]);

  return <h1>Welcome to {roomId}</h1>;
}
```

Read this as: *"At any moment, the connection should match the current `roomId`."* React makes it true:

- On mount: connect to `roomId`.
- If `roomId` changes from `"general"` to `"random"`: clean up (disconnect from `"general"`), then setup again (connect to `"random"`).
- On unmount: clean up.

The cleanup isn't an afterthought. It's half the effect. **An effect without cleanup is usually a bug** — if you set something up, you should be able to tear it down.

---

## Why your effect runs twice in development (Strict Mode)

React's Strict Mode (on by default in new projects) deliberately mounts → unmounts → mounts every component once in development. Your effect runs setup → cleanup → setup.

This is intentional. React is stress-testing your cleanup logic. If your effect breaks when run twice, you have a missing cleanup. Fix the effect, don't disable Strict Mode.

**Example of what you'll see in the console:**
```
connect to general    ← first mount (Strict Mode)
disconnect from general ← Strict Mode unmounts
connect to general    ← real mount
```

In production this only happens once. Strict Mode reveals the bug before it reaches users.

---

## When you do need an effect

`useEffect` is the right tool when you're connecting to something **outside React**:

- **Manual DOM manipulation** — using a third-party library that needs a DOM node (D3.js charts, Google Maps, video players).
- **Subscriptions** — setting up a WebSocket connection, subscribing to an `EventEmitter`, listening to `window` events (resize, keyboard).
- **Browser APIs** — `IntersectionObserver`, `ResizeObserver`, geolocation, media queries.
- **Syncing to `localStorage`** — though prefer a custom hook that wraps it.
- **Setting `document.title`** based on current state.

```tsx
// ✅ Real use case: syncing document title with React state
useEffect(() => {
  document.title = `${unreadCount} new messages`;
}, [unreadCount]);
```

`document` here is the browser's global document object — it represents the entire HTML page. `document.title` is the text that appears in the browser tab.

`unreadCount` is a React state variable defined elsewhere (probably via `useState`). When it changes, the effect runs and updates the browser tab title to show the new count.

Why use `useEffect` for this?

Because updating `document.title` is a side effect — it's changing something outside React's component tree. Here's the flow:

`User interacts with the app` → `unreadCount` state updates
`Component re-renders` with new `unreadCount`
`useEffect` runs because `unreadCount` changed (it's in the dependency array)
The effect updates `document.title` to the new count
`Browser tab title` reflects the new number
Why not do it directly in the component?


❌ Wrong - runs on every render, wasteful
```tsx
function App({ unreadCount }) {
  document.title = `${unreadCount} new messages`;
  return <div>...</div>;
}
```

✅ Right - only runs when unreadCount changes
```tsx
function App({ unreadCount }) {
  useEffect(() => {
    document.title = `${unreadCount} new messages`;
  }, [unreadCount]);
  return <div>...</div>;
}
```
The useEffect version is cleaner because it explicitly says "when unreadCount changes, then update the title" instead of updating it on every render.

---

## When you do NOT need an effect

This is the most important section in the whole doc.

### 1. Transforming data for rendering

Just compute it during render. No effect, no extra state.

```tsx
// ❌ Unnecessary effect + state
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(firstName + " " + lastName);
}, [firstName, lastName]);

// ✅ Just compute it
const fullName = firstName + " " + lastName;
```

Why is the ❌ bad? It causes an extra render cycle: render → effect fires → state updates → render again. The ✅ is one render, no extra work.

### 2. Handling user events

Put the logic in the event handler. Events are explicit — you know exactly what triggered them.

```tsx
// ❌ Using effect to react to a "just clicked" flag
useEffect(() => {
  if (justClickedSubmit) sendForm();
}, [justClickedSubmit]);

// ✅ Just call it directly
function handleSubmit() {
  sendForm();
}
```

### 3. Resetting state when a prop changes

Use a `key` prop on the component to force a remount, or compute from the prop.

```tsx
// ❌ Effect to reset state when userId changes
useEffect(() => {
  setComment("");
}, [userId]);

// ✅ Force remount with key — React resets all state automatically
<ProfilePage key={userId} userId={userId} />
```
`key` tells React "this is a different component instance" → all state resets automatically.
- React sees the key change → React unmounts the old component instance completely
- React mounts a brand new component instance

### 4. Fetching data (in most real apps)

This one surprises people. Effect-based fetch is a footgun:

```tsx
// ❌ Common in tutorials, problematic in production
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
}, [id]);
```

Problems: race conditions, no caching, no deduplication, no retry, no loading/error states without manual work.

```tsx
// ✅ In professional codebases
const { data, isLoading } = useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) });
```

The library (`TanStack Query`, `SWR`) has already written the complex `useEffect` so you don't have to. This is why in a real-world job, you almost never write `fetch()` inside an effect directly. Doc 12 covers this.

### Decision table

| Task | Don't use `useEffect`... | Use this instead |
|---|---|---|
| **Computing a value** | `useEffect(() => setY(f(x)), [x])` | `const y = f(x)` during render |
| **Reacting to a click** | Effect watching a flag | `onClick` handler |
| **Data fetching** | `fetch()` in an effect | TanStack Query / SWR |
| **Form logic** | Effect watching inputs | React Hook Form / local state |
| **Filtering a list** | Effect to derive filtered state | `useMemo` or inline variable |

---

## The dependency array — get this right

Two rules you must internalize:

**Rule 1: Every value from component scope that the effect *uses* must be in the dependency array.** State, props, things derived from them. The ESLint rule `react-hooks/exhaustive-deps` enforces this — keep it on, do not silence it casually.

**Rule 2: If a dep is a freshly-recreated object/array/function, the effect runs every render.** You either:
- Move the value inside the effect (so it's not a dep).
- Memoize it with `useMemo`/`useCallback` (doc 09).
- Restructure to depend on primitives (strings, numbers, booleans).

### The object dependency trap

```tsx
function Search({ query }: { query: string }) {
  const options = { query, limit: 20 }; // ← new object every render

  useEffect(() => {
    fetchResults(options).then(setResults);
  }, [options]); // ← React sees a new object every render → runs every render
}
```

`Object.is({ query, limit: 20 }, { query, limit: 20 })` is `false`. They're two different objects, even with the same content. So `options` is "changed" on every render.

Fix: depend on the primitives directly.
```tsx
useEffect(() => {
  fetchResults({ query, limit: 20 }).then(setResults);
}, [query]); // ← `20` is a constant, doesn't need to be a dep
```

### The stale closure trap

```tsx
// ❌ Stale closure: x is always the value from the first render
useEffect(() => {
  const t = setTimeout(() => setX(x + 1), 1000);
  return () => clearTimeout(t);
}, []); // x is missing from deps

// ✅ Use the functional updater form — no dep needed
useEffect(() => {
  const t = setTimeout(() => setX(prev => prev + 1), 1000);
  return () => clearTimeout(t);
}, []);
```

---

## Race conditions in effects (the bug you'll write at least once)

```tsx
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
}, [id]);
```

User changes from id=1 to id=2 quickly. Two requests fire. Whichever responds *last* wins — even if it's the response to id=1. Now your UI shows user 1's data while `id` is 2.

This is a race condition. Here's what happens step by step:
```
id=1 → fetch starts for user 1
id=2 → fetch starts for user 2
user 2 response arrives → setUser(user2) ✓
user 1 response arrives → setUser(user1) ✗ overwrites!
```

Fix with `AbortController`:
```tsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(`/api/users/${id}`, { signal: ctrl.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(e => {
      if (e.name !== "AbortError") throw e; // ignore expected abort errors
    });
  return () => ctrl.abort(); // cancel the in-flight request on cleanup
}, [id]);
```

When `id` changes, the cleanup runs `ctrl.abort()`, cancelling the previous request before the next one starts. No stale data.

Or fix with an "is this still relevant" flag:
```tsx
useEffect(() => {
  let active = true;
  fetch(`/api/users/${id}`).then(r => r.json()).then(data => {
    if (active) setUser(data); // only update if this effect is still current
  });
  return () => { active = false; };
}, [id]);
```

In real apps you let TanStack Query (doc 12) handle this for you. But you should know it exists, so you can spot the bug in code that doesn't use a library.

---

## The library reality: effects you never write yourself

When you use a library like `framer-motion`, `Apollo Client`, or `TanStack Query`, those library authors have written complex `useEffect`s so **you don't have to.** In a professional codebase your code often looks like:

```tsx
// You call a hook from a library (which uses useEffect under the hood)
const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

// No useEffect here at all — the library handles timing, caching, deduplication
return isLoading ? <Spinner /> : <UserList users={data} />;
```

This is the payoff of understanding effects correctly: you know *why* the library abstraction is better, not just that you're "supposed to use it."

---

## `useEffectEvent` (React 19, useful when stable)

A common pain: an effect needs to *use* a value, but you don't want changes to that value to retrigger the effect.

```tsx
// Problem: theme change causes a full reconnect, which is wrong
useEffect(() => {
  const conn = connect(roomId);
  conn.on("message", (msg) => showNotification(msg, theme));
  return () => conn.disconnect();
}, [roomId, theme]); // ← theme in deps = reconnect on every theme change
```

`useEffectEvent` lets you extract the part that reads `theme` so it always sees the latest value but doesn't retrigger the effect:

```tsx
const onMessage = useEffectEvent((msg) => showNotification(msg, theme));

useEffect(() => {
  const conn = connect(roomId);
  conn.on("message", onMessage); // onMessage always uses current theme
  return () => conn.disconnect();
}, [roomId]); // ← theme is no longer a dep
```
Variables inside useEffect don't automatically update. Even if they come from props or global state, you need to include them in the dependency array or use `useEffectEvent` to keep them in sync.

This is a niche tool you rarely need, but when you do, nothing else fits cleanly.

---

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/06-effects/, build four examples in separate files (and an
index.tsx that mounts them all):

1. effect-tick.tsx: a Clock component using setInterval inside useEffect,
   demonstrating proper cleanup. Add console.logs at setup and cleanup so
   I can see Strict Mode's double-invocation in dev.

2. effect-sync.tsx: a fake "ChatRoom" with a roomId prop. Pretend
   createConnection() exists; log "connect to X" and "disconnect from X"
   in setup/cleanup. Add a button to switch rooms so I can see effects
   sync to the new value.

3. effect-race.tsx: a user-id input that fetches /api/users/:id (mock with
   a setTimeout that resolves after a random delay). Show the race condition
   first (without cleanup), then add the AbortController fix. Comment which
   part is the bug and which is the fix.

4. effect-not-needed.tsx: a side-by-side bad/good of "computing fullName
   in an effect" vs "during render," with comments explaining the difference.

Use TypeScript strictly. No `any`.
```

**2. Stress-test the dependency array:**
```
For each of these, tell me what would happen with the given deps array
and what the correct deps array is. Don't just check; explain the reasoning:

a) useEffect(() => { fetch(`/api/${id}`); }, [])
b) useEffect(() => { const t = setTimeout(() => setX(x+1), 1000); return () => clearTimeout(t); }, [])
c) useEffect(() => { window.addEventListener("resize", handler); return () => window.removeEventListener("resize", handler); }, [])
d) useEffect(() => { fetchResults({query, limit: 20}).then(setResults); }, [query, {query, limit: 20}])
```

**3. The "do I even need an effect?" audit:**
```
Here are 6 useEffects from a hypothetical codebase. For each, decide whether
it should stay an effect or be deleted in favor of computing during render
or moving to an event handler. Justify each decision:

[paste 6 made-up effects covering: deriving state, syncing to a prop,
firing on click, setting document.title, subscribing to a websocket,
doing a fetch on mount]
```

---

## Checkpoints

1. Why is "effects are like componentDidMount/componentDidUpdate" the wrong mental model?
2. What does the cleanup function do, and when does it run?
3. Why does React Strict Mode mount → unmount → mount your component in development?
4. Give two cases where you should *not* use an effect, and what to use instead.
5. What's a race condition in an effect, and how do you fix it without a library?
6. What does it mean when an effect depends on an object or function and runs on every render? How do you fix that?
7. When does `useEffectEvent` help?
8. What question should you ask yourself before writing any `useEffect`?
9. Why do libraries like TanStack Query mean you rarely write fetch-in-effect in real apps?

---

## Footguns

- **No cleanup.** Setting up a subscription, timer, or listener without cleanup leaks resources and breaks under Strict Mode.
- **Lying about dependencies.** Silencing `react-hooks/exhaustive-deps` to "make the warning go away" — you'll get stale data and weird re-renders. Fix the deps instead.
- **Object/function deps recreated each render.** Causes the effect to run constantly. Either inline the value, depend on primitives, or memoize.
- **Putting derived state in an effect.** `useEffect(() => setY(f(x)), [x])` — just compute `y` during render: `const y = f(x)`.
- **Fetching in an effect without cleanup.** Race conditions on prop changes. Use AbortController, or use TanStack Query.
- **Effect chains.** `useEffect` updates state A, which triggers another `useEffect` that updates state B, which... — you've built a Rube Goldberg machine. Compute it directly during render or in one place.
- **Conditional `useEffect` calls.** Hooks must be called in the same order every render. Never wrap `useEffect` in an `if`. Put the condition *inside* the effect body.
- **Stale closures.** Effect captures an old value because the dep array is incomplete. Always use the `react-hooks/exhaustive-deps` lint rule.

---

## Ask-the-agent cheatsheet

- *"Audit this component's effects. For each one, tell me: (a) what external system it's synchronizing, (b) whether it actually needs to be an effect, and (c) whether the cleanup is correct."*
- *"This effect is missing dependencies that the linter wants me to add. Add them properly without introducing infinite loops — restructure if needed."*
- *"This fetch-in-effect has a race condition. Add an AbortController fix and walk me through what it prevents."*
- *"This effect depends on an inline object/function and runs every render. Restructure so it only runs when something meaningful changes."*
- *"Replace this effect-based fetch with a TanStack Query call (doc 12 territory). Keep the loading and error states."*

---

## Where this goes next

- **Doc 07** — Refs, the imperative escape hatch when effects/state aren't the right tool.
- **Doc 09** — `useMemo` / `useCallback`, which solve the "object dep recreated every render" problem.
- **Doc 12** — TanStack Query, which makes most fetch-in-effect code obsolete.
- **Doc 15** — Suspense, the modern way to handle loading states without manual flags.
