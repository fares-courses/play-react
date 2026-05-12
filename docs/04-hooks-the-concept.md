# 04 — Hooks: the concept

## What you're learning & why it matters

You're learning what hooks **are** before you go deep on specific ones. Every doc from here on uses hooks heavily — `useState`, `useEffect`, `useRef`, `useContext`, `useMemo`, custom hooks. If you don't have a clean mental model of what a hook is and the rules they all share, you'll trip on the same surprises in every doc.

This is a short doc. The point is to install the *concept* — the next docs install the *specifics*.

### Terms first

- **Hook**: a special function whose name starts with `use` that lets a component plug into React's internal features (state, side effects, refs, context, etc.).
- **Built-in hook**: a hook React ships with (`useState`, `useEffect`, ...).
- **Custom hook**: a function *you* write that starts with `use` and calls other hooks. A way to package reusable logic.
- **Rules of hooks**: a small set of rules every hook usage must follow. Enforced by lint.
- **Class component**: the *old* way of writing stateful React components, before hooks (2019). You'll occasionally see them in legacy code; you won't write them.

## Mental model

> **Hooks are how a function-that-runs-many-times gets to remember things and connect to React's machinery.** A plain JS function forgets everything between calls. A React component is a function that runs many times (doc 01). Hooks are React giving your function a way to *not be amnesiac*.

Every hook is React saying: "you're a stateless function, but if you call this special function, I'll remember stuff for you and reconnect you to it on every render."

## Why hooks exist

Before hooks (React 16.7 and earlier), if you wanted state in a component, you had to write a **class component** — a JavaScript class extending `React.Component`, with a constructor, `this.state`, `this.setState`, and lifecycle methods like `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`.

Two big problems:

1. **Logic was hard to share.** If two components both needed "subscribe to window resize and update on change," you couldn't easily extract that logic — classes don't compose well. People invented elaborate workarounds (HOCs, render props — doc 03 mentioned them) that added layers of nesting without solving the problem cleanly.
2. **Lifecycle methods grouped code by *when it ran*, not by *what it did*.** Setting up a subscription and tearing it down ended up in two different methods (`componentDidMount` + `componentWillUnmount`), even though they're conceptually one thing. Reading a class component meant constantly jumping around.

Hooks (React 16.8, early 2019) fixed both:

- **Logic is shared by extracting hooks.** A `useWindowSize()` hook can be called from any component, no wrappers needed.
- **Code groups by concern.** A `useEffect` for "the subscription" contains both the setup AND the cleanup, side by side.

In modern React you'll basically never write a class. Functions + hooks are the model.

## The shape of every hook

```ts
const result = useSomething(arg1, arg2);
```

You call a `use*` function at the top of your component, and it returns something you use during render. That's the surface. Behind the scenes, React tracks which call this is and remembers state for it across renders.

Different hooks return different shapes:

```tsx
const [count, setCount] = useState(0);             // [value, setter]
const ref = useRef(null);                          // { current: ... }
const memoized = useMemo(() => compute(x), [x]);   // a value
useEffect(() => { ... }, [deps]);                  // returns nothing
```

Don't memorize the shapes. Each doc covers them.

## The rules of hooks

There are exactly two rules. Violating them is a bug — possibly subtle, possibly catastrophic.

### Rule 1: Only call hooks at the top level

**No `if`, no loops, no nested functions, no early `return`s before hooks.**

```tsx
// ❌ wrong — conditional hook
function Foo({ enabled }) {
  if (enabled) {
    const [count, setCount] = useState(0);
  }
  // ...
}

// ❌ wrong — hook inside a loop
for (let i = 0; i < items.length; i++) {
  const [x, setX] = useState(0);
}

// ❌ wrong — hook after an early return
function Bar({ user }) {
  if (!user) return null;
  const [x, setX] = useState(0); // never runs on the first render if user is null
}

// ✅ right — hooks at the top, conditions inside the hook
function Foo({ enabled }) {
  const [count, setCount] = useState(0);
  if (!enabled) return null;
  // ...
}
```

### Rule 2: Only call hooks from React functions

Either from a **component** (a function returning JSX, name starts with a capital letter) or from another **custom hook** (name starts with `use`). Never from regular JS functions, event handlers, classes, or random callbacks.

```tsx
// ❌ wrong — hook in a regular function
function calculateThing() {
  const x = useState(0);
}

// ❌ wrong — hook inside an event handler
<button onClick={() => useState(0)}>...</button>

// ✅ right — hook in a component
function MyComp() { const [x, setX] = useState(0); ... }

// ✅ right — hook in a custom hook
function useMyLogic() { const [x, setX] = useState(0); return x; }
```

## Why those rules exist (the *real* reason)

This is the part that makes the rules make sense. **React tracks hooks by call order, not by name.**

Internally, React keeps a list per component instance: "the first hook called returned `[0, setCount0]`; the second returned `[false, setEnabled]`; the third returned a ref `{ current: null }`." On every re-render, React expects you to call the *same hooks in the same order*, so it can hand back the right state to each call.

If you wrap a hook in an `if`:

```tsx
if (enabled) {
  const [a, setA] = useState(0);
}
const [b, setB] = useState(false);
```

On render 1 with `enabled=true`, the call order is `useState(0)`, then `useState(false)`. React stores `[0, false]`.

On render 2 with `enabled=false`, only `useState(false)` runs. React thinks the *first* hook was called — and hands back the state that belonged to the previous *first* hook (the number `0`) into the boolean variable `b`. Now `b === 0`, type-wrong, behavior-broken.

This is the core mechanism. The "top-level only" rule is what guarantees call order is stable.

(Side note: you may have seen [doc 16](./16-react-19-features.md) mention `use()` — which can be called inside `if`. That hook is special: it has a different mechanism. It's the *only* exception. Every other hook follows the rules above.)

## The ESLint rule (turn it on, leave it on)

The package `eslint-plugin-react-hooks` ships two rules:

- **`react-hooks/rules-of-hooks`** — yells if you violate the two rules above.
- **`react-hooks/exhaustive-deps`** — yells if your `useEffect`/`useMemo`/`useCallback` dependency arrays are wrong (doc 06 covers this).

Both are already enabled in modern starter setups (your Vite project has them via the `eslint-plugin-react-hooks` dependency). Verify they're on by writing a deliberately conditional `useState` and watching for the lint error. If you don't see one, fix the config and install ESLint extension for your IDE.

**Don't disable these rules to "make warnings go away."** Almost every time someone disables them, the bug they were warned about hits in production.

## The built-in hooks (your map)

Here's the full list of React's built-in hooks, with one-liners. Each gets proper coverage in later docs.

### Core (you'll use constantly)

- **`useState`** — local component state. Doc 05.
- **`useEffect`** — side effects (subscriptions, manual DOM, fetching). Doc 06.
- **`useRef`** — a mutable container that doesn't trigger re-renders; also for DOM refs. Doc 07.

### Common

- **`useReducer`** — alternative to `useState` for complex state transitions. Doc 05.
- **`useContext`** — read a value from a Context provider. Doc 08.
- **`useMemo`** — cache an expensive computed value. Doc 09.
- **`useCallback`** — cache a function reference (special case of `useMemo`). Doc 09.

### Less common (occasional)

- **`useLayoutEffect`** — like `useEffect` but runs synchronously after DOM mutations, before paint. For measuring DOM. Mentioned in doc 07.
- **`useImperativeHandle`** — expose an imperative API to a parent via a ref. Doc 07.
- **`useId`** — generate a stable unique ID (for accessibility attributes mostly).
- **`useDebugValue`** — label a custom hook in React DevTools.
- **`useSyncExternalStore`** — subscribe to an external store (low-level; libraries like Zustand use this internally). Doc 08.

### React 19 additions

- **`use()`** — read a promise or context inline; the only hook that can be called conditionally. Doc 16.
- **`useTransition`** — mark state updates as low-priority. Doc 16.
- **`useDeferredValue`** — defer rendering of a value to keep UI responsive. Doc 16.
- **`useOptimistic`** — manage optimistic UI updates. Doc 16.
- **`useActionState`** — connect form actions to UI state. Doc 16.
- **`useFormStatus`** (from `react-dom`) — read pending state of a parent `<form>`. Doc 16.

You don't need to remember this list. You'll meet each one in context.

## Custom hooks: the most important payoff

A **custom hook** is just a function that:

1. Has a name starting with `use`.
2. Calls other hooks (built-in or custom).
3. Returns whatever it wants.

That's the entire definition. There's no special API, no registration, no React-knows-about-it magic. The naming convention is what makes the lint rule kick in to enforce the rules of hooks inside the function.

Tiny example: extracting a piece of common logic.

```tsx
// before — the same useState + useEffect pattern repeated in 3 components
function PageA() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return <div>{width < 600 ? "mobile" : "desktop"}</div>;
}
// (PageB and PageC repeat the same five lines)
```

Extract:

```tsx
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// now any component can do:
function PageA() {
  const width = useWindowWidth();
  return <div>{width < 600 ? "mobile" : "desktop"}</div>;
}
```

That's it. No registration. No setup. Just a function whose name starts with `use`.

Two things to notice:

1. **Each component that calls `useWindowWidth()` gets its own state.** The hook isn't a singleton. Calling it from 5 components creates 5 independent pieces of state. (For *shared* state, you use Context or a store — doc 08.)
2. **Custom hooks compose.** A custom hook can call other custom hooks, which call other custom hooks, all the way down. Logic builds up cleanly.

You'll write custom hooks constantly in real apps:
- `useDebounce(value, ms)` — debounce a value.
- `useLocalStorage("key", initial)` — sync state to localStorage.
- `useAuth()` — wrap your AuthContext consumer with checks.
- `useUsers()` — wrap a TanStack Query call with the right keys/types.
- `useChat(roomId)` — wrap a WebSocket connection with proper cleanup.

Every later doc has examples. The rule of thumb: **if you find yourself writing the same `useState` + `useEffect` pattern in two components, extract it into a custom hook.**

## How to use this doc with an agent

**1. Verify the rules with a deliberately broken component:**
```
In src/lessons/04-hooks-concept/, build a component that violates each
rule of hooks (one at a time, in separate files):

1. broken-conditional.tsx: a useState inside an if
2. broken-loop.tsx: a useState inside a for loop
3. broken-callback.tsx: a useState inside a regular function (not a
   hook, not a component)

For each, paste me the exact ESLint error message. Then write the fixed
version next to it. Comment what the rule is and why violating it would
cause real problems.
```

**2. Build your first custom hook:**
```
In src/lessons/04-hooks-concept/, write `useWindowWidth` (the example
from the doc) and use it in two different components on the page so I
can see they both update independently when I resize. Then write a
second custom hook `useToggle(initial)` that returns
`[value, toggle, setValue]` and demo it. Use TypeScript strictly.
```

**3. Quiz prompt:**
```
Quiz me on the hooks concept doc. Cover:
- Why hooks exist (the class-component pain points)
- The two rules of hooks
- Why React tracks hooks by call order
- The difference between built-in and custom hooks
- Whether two components calling the same custom hook share state
Stop after 5 questions; one at a time.
```

## Checkpoints

1. Why does React rely on **call order** to track hooks, and what happens if you wrap a hook in an `if`?
2. What's the rule for *where* you can call a hook from?
3. Why was logic-sharing hard before hooks? What pattern do hooks replace?
4. What's the *only* thing that makes a function a "custom hook"?
5. If two components both call `useWindowWidth()`, do they share state? Why not?
6. Why do React 19's `use()` hook get to break the "top-level only" rule when no other hook can?

## Footguns

- **Hook inside a conditional.** Even if it "works" the first render, a future render with a different condition silently breaks state mapping. Always top-level.
- **Hook after an early return.** Same problem — depending on the return path, the hook count differs between renders.
- **Hook in an event handler.** Hooks must run during render. Event handlers run later. Doesn't compile (lint catches it) but conceptually: the hook would be called at the wrong time.
- **Custom hook not starting with `use`.** Lint rule won't enforce hook rules inside it; you can sneak violations in. Always name them `useFoo`.
- **Sharing state between components by calling the same custom hook.** It doesn't work that way. Each component gets its own. Use Context or a store for shared state (doc 09).
- **Disabling `react-hooks/rules-of-hooks` to silence a warning.** Almost always a real bug.
- **Writing a "hook" that doesn't call any hooks internally.** Then it's just a regular function. That's fine — but don't name it `useFoo` and trick yourself. The `use` prefix is a contract: this function uses React's hook machinery.

## Ask-the-agent cheatsheet

- *"Audit this file for rules-of-hooks violations. Don't just fix; explain each violation and why it's broken."*
- *"This component has the same useState + useEffect pattern as another. Extract a custom hook with proper TypeScript types and refactor both components to use it."*
- *"Why is this lint warning firing? Don't suggest disabling it — explain what real bug it's preventing."*
- *"For this piece of logic, decide: should it be a custom hook, a regular utility function, or stay inline in the component? Justify."*
- *"This custom hook isn't behaving like I expect. Walk me through the lifetime of its state across renders, and show me whether the issue is hooks-related or just regular JS."*

## Where this goes next

- **Doc 06** — `useState` and `useReducer` in depth. The first hook you'll use everywhere.
- **Doc 07** — `useEffect`. The hook most people get wrong; the "rules of hooks" matter especially here because effects run conditionally on dependency-array changes.
- All later docs build on this foundation. Whenever a new hook appears, the rules in this doc apply.
