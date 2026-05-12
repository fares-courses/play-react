# 09 — Performance, memo, and the React Compiler

## What you're learning & why it matters

You're learning what makes a React app slow, what the tools are for fixing it, and — most importantly — when *not* to optimize. This last part matters more than the techniques. Premature memoization is a leading cause of unreadable React codebases.

By the end you'll understand:
- Why "unnecessary re-renders" usually don't matter, and when they do.
- `React.memo`, `useMemo`, `useCallback` — what each one does and when to actually use it.
- The **React Compiler** (new in React 19), which automates most of this.
- How to actually measure performance with the React DevTools Profiler.

### Terms first

- **Render**: a call to your component function (doc 01). Returns a description of UI.
- **Commit**: when React applies the result of renders to the actual DOM. One commit can include many components' renders.
- **Reconciliation**: React diffing the new render output against the old to compute DOM changes (doc 01).
- **Memoization**: caching the result of a computation so it isn't redone unless inputs change.
- **Reference equality**: `===` between two objects. Two objects with identical contents but created separately are *not* reference-equal.

## Mental model

> **React rendering is cheap. Reconciliation is cheap. The DOM is the expensive part. Most "unnecessary re-renders" cost microseconds and don't matter. Optimize what you can prove is slow, not what you suspect.**

The default mode is: don't optimize. Let React render. Measure. Fix only the hot spots.

## What actually causes slowness

Three categories, in roughly increasing rarity:

1. **Expensive computations done during render.** Sorting 10,000 items, computing a heavy filter on every keystroke, generating large derived data. → Fix with `useMemo`.
2. **Large component subtrees re-rendering on every parent change** when nothing in their inputs actually changed. → Fix with `React.memo` + stable props.
3. **DOM thrashing**: too many elements changing too often. Long lists especially. → Fix with virtualization (only render visible items) or smarter keys.

If your app is slow and you haven't measured, you don't know which of these it is. Measure first.

## Measuring with the React DevTools Profiler

Install the React Developer Tools browser extension. Open it → Profiler tab → click record → interact with your app → stop. You get a flame chart showing every render: which component, how long, why it rendered.

The "why did this render" reasons are gold. Common ones:
- **Hooks changed**: a state setter was called.
- **Props changed**: a parent passed a new value.
- **Parent re-rendered**: nothing changed about *this* component's inputs, but the parent re-rendered, so by default this child does too.
- **Context changed**: a context this component reads was updated.

Knowing *why* a render happened tells you whether memoization will help. If a component re-rendered because its hook (state) changed, memoization won't help — it had to re-render. If it re-rendered because its parent did and its props are reference-equal to the previous ones, `React.memo` could prevent it.

## `React.memo` — caching a component's output

`React.memo(Component)` returns a new component that re-renders only when its props change (by reference equality, by default).

```tsx
const ExpensiveList = React.memo(function ExpensiveList({ items }: { items: Item[] }) {
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
});
```

Now, if a parent re-renders but passes the *same* `items` array (reference-equal), `ExpensiveList` skips its render.

The catch: **reference equality is fragile.** Inline objects/arrays/functions create new references every render:
```tsx
<ExpensiveList items={[...filtered]} />        // new array every render → memo useless
<ExpensiveList items={data.filter(p)} />       // new array every render → memo useless
<ExpensiveList items={items} onClick={() => …} /> // onClick new every render → memo useless
```

For `React.memo` to help, the props you pass must be stable. That's where `useMemo` and `useCallback` come in.

## `useMemo` — caching a computed value

```tsx
const filtered = useMemo(() => items.filter(matches), [items, matches]);
```

`filtered` is recomputed only when `items` or `matches` changes. Between those, you get the *same array reference*, which is what enables `React.memo` downstream and avoids redoing expensive work.

When to use:
- The computation is genuinely expensive (sorting/filtering thousands of items, heavy math).
- You need a stable reference for a memoized child.

When not to use:
- For cheap computations: `useMemo` itself has overhead (storing, comparing dependency arrays). Just compute it directly.
- "Just in case." The cost of useMemo over no useMemo is real if it's not buying you anything.

## `useCallback` — caching a function

```tsx
const handleClick = useCallback(() => doSomething(id), [id]);
```

Same idea as `useMemo`, but specifically for functions. Returns the same function reference between renders unless `id` changes.

Use only if a memoized child or an effect's dep array depends on the function's reference. Otherwise it's noise.

## The React Compiler (this changes everything in React 19+)

React 19 ships with a **compiler** (currently being adopted; check your project) that automatically inserts memoization where it would help. With the compiler enabled, you mostly **stop writing `useMemo` and `useCallback` by hand** — the compiler analyzes your code and adds the equivalent caching.

What this means for you:
- New code: don't preemptively reach for memoization. Write the natural version. Trust the compiler if it's enabled.
- Old code: pre-compiler codebases often have `useMemo`/`useCallback` everywhere. Don't blindly remove; verify the compiler is active and your perf is fine.
- Profiler still applies. The compiler is good but not magic.

To check whether the compiler is on: look at your project for `babel-plugin-react-compiler` or the equivalent Vite plugin. Ask the agent to confirm. If you start a new project today, turn it on.

## Virtualization (for long lists)

If you're rendering 5,000 rows, *no* memoization fixes it because the DOM nodes themselves are expensive. The fix is **virtualization**: only render the rows currently on screen, with placeholders for the rest. As the user scrolls, swap in/out.

Library: `@tanstack/react-virtual`. Stays close to React, no bloat. Whenever a list might have thousands of rows, reach for it.

## Other quick wins

- **Stable `key`s.** Already covered (doc 02). Reused indexes confuse the reconciler and cause unnecessary unmounts/remounts.
- **Push state down.** A piece of state high in the tree causes the entire subtree to re-render on changes. If only one branch needs it, move it down.
- **Split contexts.** (Doc 08.) One big context = many re-renders.
- **Avoid inline `style={{...}}` if it's hot path.** Each render creates a new object. Use CSS or memoize.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/08-performance/, build three demos:

1. perf-render-cost.tsx: a parent with a counter button (causing parent
   re-renders) and a child component that takes a list as a prop. Add a
   render counter to the child. Show three versions side by side:
     a) no memoization — child re-renders every parent click
     b) React.memo on child — but list is created inline → still re-renders
     c) React.memo on child + useMemo on the list → child stops re-rendering
   Add a brief on-screen explanation under each.

2. perf-expensive-compute.tsx: a search input and a list of 50,000 items
   filtered by the input. First version filters during render directly
   (laggy typing). Second version uses useMemo with [query] dep — should
   recompute only when query changes, not on every parent re-render.

3. perf-virtual.tsx: install @tanstack/react-virtual, render a list of
   10,000 items with virtualization. Show the difference: render counter
   for the list container, scroll, see how few rows are mounted at a time.

Use TypeScript strictly. Add a render counter via a ref so we can see it
without it triggering re-renders itself.
```

**2. Profiler practice:**
```
Walk me through using the React DevTools Profiler on the demos above:
record an interaction, identify which component re-rendered and why,
explain how to read the flame chart. Don't just describe — give me the
exact step-by-step (open extension, click these tabs, etc.).
```

**3. The audit / "should I memoize this?":**
```
Here's a component using useMemo and useCallback in 8 places. For each one,
tell me: (a) is it actually buying anything, (b) what would have to be true
about the surrounding code for it to matter, (c) if the React Compiler is
enabled, can it be removed? Be honest — call out unnecessary memoization.
[paste a contrived over-memoized component]
```

## Checkpoints

1. Why is the default advice "don't optimize"?
2. What does `React.memo` skip, and what condition must be true for it to help?
3. When does `useMemo` actually help, and when is it just overhead?
4. Why is "the parent re-rendered" not by itself a reason to add `React.memo`?
5. What does the React Compiler do for you, and what does it not do?
6. When do you reach for virtualization, and what problem does it solve that memoization can't?

## Footguns

- **Memoizing without measuring.** Adding `useMemo`/`useCallback` "to be safe" makes code harder to read and provides ~zero real-world benefit most of the time. Measure first.
- **`React.memo` on a component that always gets new props.** Useless. The memo check itself is overhead with no payoff.
- **Inline objects/arrays/functions as memoized component props.** Defeats `React.memo`. Either move them out or memoize them too.
- **Memoizing huge computations whose deps change every render anyway.** No win.
- **Disabling Strict Mode to "fix" double-renders in dev.** That's not a perf problem; that's React stress-testing your effects. Don't disable it.
- **Optimizing the wrong thing.** A 100ms expensive computation matters. A 0.05ms unnecessary render does not. The Profiler tells you which is which.
- **Treating memoization as correctness.** Memoization is a perf optimization, not a behavior change. If your code is wrong without it, the bug is elsewhere (usually mutating state).

## Ask-the-agent cheatsheet

- *"Profile this component for me — analyze where re-renders are happening and whether they cost anything. Don't suggest memoization unless you can name a concrete win."*
- *"This list of N items renders slowly. First measure: is it the per-item render cost or the total node count? Recommend memoization vs virtualization based on the diagnosis."*
- *"Audit this file's useMemo/useCallback usage. For each one, tell me whether it's buying anything or just adding noise. Assume the React Compiler is enabled."*
- *"This child component re-renders every parent click even though its props look the same. Walk me through why (probably reference equality), and fix only what needs fixing."*

## Where this goes next

- **Doc 10** — Routing. Page-level code-splitting is a different perf lever (load less code upfront).
- **Doc 15** — Suspense, which gives you better loading UX than manual flags and pairs with code-splitting.
