# 06 — Effects as synchronization (the deep one)

## What you're learning & why it matters

You're learning `useEffect`, which is the most-misused hook in React. Most React bugs you'll encounter in real codebases — flickering UIs, double network requests, infinite loops, stale data, "why does this run twice in development" — are effects written by people who think effects are *lifecycle hooks*. They're not.

If you walk away with one thing from this doc: **effects are not "do this when the component mounts." They are "keep this external thing synchronized with my state."** That mental shift fixes 90% of effect bugs.

### Terms first

- **Side effect**: anything a function does besides return a value — network requests, timers, DOM manipulation outside React, subscriptions, logging to a server, writing to localStorage.
- **External system**: anything that lives outside React's render cycle — the browser DOM, a WebSocket, the network, `localStorage`, a third-party widget.
- **Mount / unmount**: when a component instance first appears on screen (mount) and when it's removed (unmount). Between those, it can re-render any number of times.
- **Cleanup**: a function you return from your effect that React runs before the next effect run (or on unmount). Used to undo subscriptions, abort requests, clear timers.
- **Dependency array**: the second argument to `useEffect`. A list of values; if any of them change between renders, React re-runs the effect.

## The mental model

> **Effects synchronize a piece of external state with your React state.** They are not lifecycle hooks; they're saying "given my current state, the outside world should look like *this*."

Compare to your backend life: a Sidekiq worker watches a queue and reacts to changes. An effect is similar — it watches your component's state (via the dependency array) and reacts by updating something external. You don't think of a Sidekiq worker as "the worker that runs when the app starts" — you think of it as "the thing that keeps state X consistent with state Y." That's the right frame for effects.

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
2. **Cleanup function** (optional) — runs before the next setup, and on unmount.
3. **Dependency array** — controls when the effect re-runs.

### How the dependency array works

- `[]` (empty) — effect runs once after mount, cleanup runs once on unmount.
- `[a, b]` — effect runs after mount AND any time `a` or `b` change between renders.
- *omitted entirely* — effect runs after every render (almost always wrong).

React compares dependencies with `Object.is` (basically `===`). So if you pass an object or array as a dependency and you recreate it on every render, the effect runs every render even if nothing meaningful changed.

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

Read this as: *"At any moment, the connection should match the current `roomId`."* That's the synchronization frame. React is responsible for making it true:

- On mount: connect to `roomId`.
- If `roomId` changes from `"general"` to `"random"`: clean up (disconnect from `"general"`), then setup again (connect to `"random"`).
- On unmount: clean up.

The cleanup isn't an afterthought. It's half the effect. **An effect without cleanup is usually a bug** — if you set something up, you should be able to tear it down.

## Why your effect runs twice in development (Strict Mode)

React's Strict Mode (on by default in new projects) deliberately mounts → unmounts → mounts every component once in development. Your effect runs setup → cleanup → setup. This isn't a bug; it's React stress-testing your cleanup logic. If your effect breaks when run twice, your effect has a missing cleanup. Fix the effect, don't disable Strict Mode.

## When you actually need an effect — and when you don't

This is the most important section in the whole doc.

### You don't need an effect for:

**1. Transforming data for rendering.** Just compute it during render.
```tsx
// ❌
useEffect(() => { setFullName(firstName + " " + lastName); }, [firstName, lastName]);

// ✅
const fullName = firstName + " " + lastName;
```

**2. Handling user events.** Put the logic in the event handler.
```tsx
// ❌
useEffect(() => { if (justClickedSubmit) sendForm(); }, [justClickedSubmit]);

// ✅
function handleSubmit() { sendForm(); }
```

**3. Resetting state when a prop changes.** Use a `key` prop on the component to force a remount, or compute from the prop.

**4. Setting state based on props.** Compute it during render or lift it.

**5. Fetching data in most cases** (use TanStack Query, doc 12). The effect-based fetch pattern is full of footguns: race conditions, stale closures, no caching, no deduplication, no retry. You can write it once correctly to learn, but in real apps, use a library.

### You do need an effect for:

- Connecting to a non-React system: WebSockets, browser APIs (geolocation, intersection observers, media queries), third-party widgets you're embedding.
- Syncing to `localStorage` (though prefer a custom hook that wraps it).
- Setting `document.title` based on current state.
- Subscribing to events from outside React (window resize, keyboard shortcuts, real-time pushes).

If you can't answer "what external system am I synchronizing?" you probably don't need an effect.

## The dependency array — get this right

Two rules:

**Rule 1: Every value from component scope that the effect *uses* must be in the dependency array.** State, props, things derived from them. The ESLint rule `react-hooks/exhaustive-deps` enforces this — keep it on, do not silence it casually.

**Rule 2: If a dep is a freshly-recreated object/array/function, the effect runs every render.** You either:
- Move the value inside the effect (so it's not a dep).
- Memoize it with `useMemo`/`useCallback` (doc 09).
- Restructure to depend on primitives (strings, numbers, booleans).

### Example of getting it wrong

```tsx
function Search({ query }: { query: string }) {
  const options = { query, limit: 20 }; // new object every render

  useEffect(() => {
    fetchResults(options).then(setResults);
  }, [options]); // ← `options` is new every render, so this fetches every render
}
```

Fix: depend on the primitives.
```tsx
useEffect(() => {
  fetchResults({ query, limit: 20 }).then(setResults);
}, [query]); // 20 is a constant, doesn't need to be a dep
```

## Race conditions in effects (the bug you'll write at least once)

```tsx
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
}, [id]);
```

User changes from id=1 to id=2 quickly. Two requests fire. Whichever responds *last* wins — even if it's the response to id=1. Now your UI shows user 1's data while displaying id=2.

Fix with a "still relevant" flag in cleanup:
```tsx
useEffect(() => {
  let active = true;
  fetch(`/api/users/${id}`).then(r => r.json()).then(data => {
    if (active) setUser(data);
  });
  return () => { active = false; };
}, [id]);
```

Or use `AbortController`:
```tsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(`/api/users/${id}`, { signal: ctrl.signal })
    .then(r => r.json()).then(setUser)
    .catch(e => { if (e.name !== "AbortError") throw e; });
  return () => ctrl.abort();
}, [id]);
```

In real apps you let TanStack Query (doc 12) handle this for you. But you should know it exists, so you can spot the bug in code that doesn't use a library.

## `useEffectEvent` (React 19, useful when stable)

A common pain: an effect needs to use a value, but you don't want changes to that value to retrigger the effect. Example:
```tsx
useEffect(() => {
  const conn = connect(roomId);
  conn.on("message", (msg) => showNotification(msg, theme));
  return () => conn.disconnect();
}, [roomId, theme]); // ← theme change causes a reconnect, which is wrong
```

`useEffectEvent` lets you extract the part that uses `theme` so it always sees the latest value but doesn't retrigger the effect:
```tsx
const onMessage = useEffectEvent((msg) => showNotification(msg, theme));

useEffect(() => {
  const conn = connect(roomId);
  conn.on("message", onMessage);
  return () => conn.disconnect();
}, [roomId]); // theme not a dep
```
This is one of those niche tools you don't use often, but when you need it, nothing else fits.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/05-effects/, build four examples in separate files (and an
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

## Checkpoints

1. Why is "effects are like componentDidMount/componentDidUpdate" the wrong mental model?
2. What does the cleanup function do, and when does it run?
3. Why does React Strict Mode mount → unmount → mount your component in development?
4. Give two cases where you should *not* use an effect, and what to use instead.
5. What's a race condition in an effect, and how do you fix it without a library?
6. What does it mean when an effect depends on an object or function and runs on every render? How do you fix that?
7. When does `useEffectEvent` help?

## Footguns

- **No cleanup.** Setting up a subscription, timer, or listener without cleanup leaks resources and breaks under Strict Mode.
- **Lying about dependencies.** Silencing `react-hooks/exhaustive-deps` to "make the warning go away" — you'll get stale data and weird re-renders. Fix the deps instead.
- **Object/function deps recreated each render.** Causes the effect to run constantly. Either inline the value, depend on primitives, or memoize.
- **Putting derived state in an effect.** `useEffect(() => setY(f(x)), [x])` — just compute `y` during render: `const y = f(x)`.
- **Fetching in an effect without cleanup.** Race conditions on prop changes. Use AbortController, or use TanStack Query.
- **Effect chains.** `useEffect` updates state A, which triggers another `useEffect` that updates state B, which... — you've built a Rube Goldberg machine. Compute it directly during render or in one place.
- **Conditional `useEffect` calls.** Hooks must be called in the same order every render. Never wrap `useEffect` in an `if`. Put the condition *inside* the effect body.

## Ask-the-agent cheatsheet

- *"Audit this component's effects. For each one, tell me: (a) what external system it's synchronizing, (b) whether it actually needs to be an effect, and (c) whether the cleanup is correct."*
- *"This effect is missing dependencies that the linter wants me to add. Add them properly without introducing infinite loops — restructure if needed."*
- *"This fetch-in-effect has a race condition. Add an AbortController fix and walk me through what it prevents."*
- *"This effect depends on an inline object/function and runs every render. Restructure so it only runs when something meaningful changes."*
- *"Replace this effect-based fetch with a TanStack Query call (doc 12 territory). Keep the loading and error states."*

## Where this goes next

- **Doc 07** — Refs, the imperative escape hatch when effects/state aren't the right tool.
- **Doc 12** — TanStack Query, which makes most fetch-in-effect code obsolete.
- **Doc 15** — Suspense, the modern way to handle loading states without manual flags.
