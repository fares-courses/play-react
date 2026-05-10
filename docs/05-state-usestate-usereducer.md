# 05 — `useState`, `useReducer`, and where state lives

## What you're learning & why it matters

You're learning the rules and patterns for managing state inside components. Specifically:

- How `useState` actually works (the rules behind the surface).
- When a single `useState` is wrong and you should reach for `useReducer`.
- The single most important architecture decision in React: **where does each piece of state live?**

Why it matters: state placement is what separates a clean React app from a tangled one. Pick right and your code is obvious. Pick wrong and you'll spend the next year prop-drilling, fighting stale values, and adding global state you didn't need.

### Terms before we start

- **Stateful**: a component that owns one or more pieces of state via hooks. Stateless components only depend on props.
- **Lifting state up**: moving state from a child component to a shared ancestor so multiple siblings can read and update it.
- **Colocation**: keeping state as close as possible to where it's used. The opposite of premature globalization.
- **Closure**: a JavaScript concept — when a function "captures" variables from the scope it was defined in. We'll feel this in the "stale state" footgun below.

## `useState` — the rules behind the surface

You've seen it:
```tsx
const [count, setCount] = useState(0);
```

Things that aren't obvious from that line:

### 1. The initial value is only used on the first render

`useState(0)` doesn't reset to 0 every render — React remembers the current value and ignores the argument on every call after the first. (You learned this in doc 01; reinforcing here.)

### 2. The initializer can be a function (use this for expensive setup)

```tsx
const [board, setBoard] = useState(() => generateBigChessBoard());
```
If you write `useState(generateBigChessBoard())`, that function runs on **every render** (even though React only uses the first result). Passing a function means React calls it only once. Use this whenever the initial value is expensive to compute.

### 3. The setter accepts a value OR a function

```tsx
setCount(count + 1);          // value form
setCount(prev => prev + 1);   // updater function form
```
The updater function form is the safe one when you're updating based on the previous value, especially inside async code or multiple updates in a row:

```tsx
setCount(c => c + 1);
setCount(c => c + 1);
setCount(c => c + 1);
// count goes up by 3 — each updater sees the latest scheduled value
```
Vs:
```tsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);
// count goes up by 1 — all three calls saw the same stale `count`
```
**Rule of thumb:** if your update is based on the previous value, use the function form.

### 4. State updates are batched

If you call multiple setters in the same event handler, React combines them and re-renders once at the end. This is fine and desirable. React 19 batches across async boundaries too (e.g. inside a `setTimeout` or after `await`).

### 5. State updates are asynchronous from your code's perspective

After `setX(newValue)`, the variable `x` in the current function call still has the old value. The new value shows up in the *next* render. This trips up imperative-thinking devs constantly.

### 6. Same reference = no re-render

If you call `setUser(user)` with literally the same object reference, React skips the re-render. So `setUser({...user, name: "new"})` works (new reference) but `user.name = "new"; setUser(user)` does not (same reference, also a mutation footgun).

## Choosing between `useState` and `useReducer`

`useState` is fine for **simple, independent state**: a number, a boolean, a string, an array of strings, a small flat object.

`useReducer` is better when:
- The next state depends on multiple pieces of the current state in non-trivial ways.
- You have **several related fields** that change together (think a form with many inputs and validation).
- The update logic is getting complex enough that you want it in one place outside the component.
- You're seeing the same `setX(prev => ...)` pattern repeated everywhere.

`useReducer` is the same idea Redux made famous, but built into React: you have a single state object, and updates go through a function that takes `(currentState, action) => newState`.

```tsx
type State = { count: number; step: number };
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "setStep"; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment": return { ...state, count: state.count + state.step };
    case "decrement": return { ...state, count: state.count - state.step };
    case "setStep":   return { ...state, step: action.payload };
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });
  return (
    <div>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: "increment" })}>+</button>
      <button onClick={() => dispatch({ type: "decrement" })}>-</button>
    </div>
  );
}
```

The `Action` type is a **discriminated union** (TS feature): each variant has a `type` field literal that distinguishes it, and TS narrows the rest of the fields based on that. Inside `case "setStep":` TS knows `action.payload` exists; in other cases it would error.

Why this is nice: all your state transitions are one function, easy to read, easy to test, and the TS types ensure you handle them all.

### Discriminated Union

A discriminated union is a TypeScript feature that allows you to create a type that can be one of several specific types, where each type has a unique property (the discriminator) that allows TypeScript to narrow the type based on that property.

Without a discriminated union, you might try to represent a network request like this:
```tsx
type RequestState = {
  status: string;
  data?: string;
  error?: string;
};
```
The Problem: TypeScript doesn't know that if status is "error", data should be empty. You could accidentally try to read data when it's undefined, and TypeScript won't stop you.

With a discriminated union, you can represent the same state like this:
```tsx
type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; error: string };
```
Now TypeScript knows that if status is "success", data must exist, and if status is "error", error must exist. This prevents runtime bugs and makes your code more predictable.

## The big architecture question: *where does state live?*

This is the most consequential decision in any React app and the one most beginners get wrong by going in either direction (everything global, or everything local but duplicated).

The principle: **state lives at the lowest common ancestor of all components that need it.**

### Cases

**Only one component cares?** Put it inside that component (`useState`). Don't move it up "in case you need it later."

**Two siblings need to share state?** Lift it to their common parent. The parent owns it; both children receive the value via props and one child receives a callback to update it.

**Many distant components need it?** Then you reach for Context (doc 08) or an external store. **Don't reach here first.** Most state should not be global.

**State that's actually data from the server (users, posts, etc.)?** That's not "state" in the same sense — it's a cache of remote data. It belongs in a data-fetching library like TanStack Query (doc 11). Don't put server data in `useState` and don't manually keep it in sync. This is one of the highest-leverage rules in modern React.

So we have roughly four buckets of state:

| Kind | Example | Where it lives |
|---|---|---|
| Local UI state | "is this dropdown open" | `useState` in the component |
| Form state | input values, validation errors | `useReducer` or react-hook-form (doc 12) |
| Shared client state | theme, current locale, auth user | Context or external store (doc 08) |
| Server cache | the list of users from your Rails API | TanStack Query (doc 11) |

Knowing which bucket a piece of data falls into is half the battle.

## "Lifting state up" — concrete example

Two siblings, only one knows about a value, the other needs it:

**Before (broken — only the first sibling has the value):**
```tsx
function Parent() {
  return (
    <>
      <ChildA />
      <ChildB />
    </>
  );
}
function ChildA() { const [text, setText] = useState(""); return <input value={text} onChange={e => setText(e.target.value)} />; }
function ChildB() { return <p>You typed: ???</p>; }
```

**After (state lifted to Parent):**
```tsx
function Parent() {
  const [text, setText] = useState("");
  return (
    <>
      <ChildA text={text} onChange={setText} />
      <ChildB text={text} />
    </>
  );
}
function ChildA({ text, onChange }: { text: string; onChange: (v: string) => void }) {
  return <input value={text} onChange={e => onChange(e.target.value)} />;
}
function ChildB({ text }: { text: string }) {
  return <p>You typed: {text}</p>;
}
```

The state moved up to the lowest ancestor that contains both consumers. Children became "controlled" — they don't own the value, they receive it and forward updates.

## Derived state (don't store what you can compute)

If a value can be computed from other state or props, **don't put it in state**. Compute it during render.

```tsx
// ❌ bad
const [items, setItems] = useState<Item[]>([]);
const [count, setCount] = useState(0);
// now you have to keep `count` in sync with items.length forever

// ✅ good
const [items, setItems] = useState<Item[]>([]);
const count = items.length;
```

State that mirrors other state is a bug factory. Only store the *minimal* representation; derive the rest.


### Closure Definition

A closure is a function that has access to variables from its outer (enclosing) scope, even after the outer function has finished executing. In React, this is particularly important when dealing with state and asynchronous operations.
> Normally, when a function finishes running, all its local variables are wiped from memory. A closure prevents this by "holding onto" those variables as long as the inner function exists.
```tsx
function createGreeter(name) {
  // 'name' is a local variable in the parent's scope
  return function() {
    // This inner function is the "Closure"
    console.log("Hello, " + name); 
  };
}

const greetAlice = createGreeter("Alice");
greetAlice(); // Output: "Hello, Alice"
```
#### Example: The "Stale Closure" Problem

If you use a closure inside a setTimeout, it remembers the state at the exact moment it was created.
```tsx
function Counter() {
  const [count, setCount] = useState(0);

  const handleAlert = () => {
    setTimeout(() => {
      // This function is a closure. It remembers 'count' 
      // from the moment the button was clicked.
      alert("Count was: " + count);
    }, 3000);
  };

  return (
    <div>
      <p>Current: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={handleAlert}>Show Alert in 3s</button>
    </div>
  );
}
```
> The Scenario: You click "Show Alert," then quickly click "Increment" five times. Three seconds later, the alert will show 0, not 5. This is because the closure "captured" the value 0 when it was born.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/04-state/, build three small examples in one file:

1. A counter using useState that demonstrates the value form vs the updater
   function form: include a button that does setCount(count+1) three times
   in a row and a button that does setCount(c => c+1) three times. Show in
   the UI both counters side by side so I can see the difference.

2. A form with name, email, and a submitting boolean, refactored to use
   useReducer. Include a discriminated-union Action type. Cover at least
   actions: setField, reset, submitStart, submitSuccess, submitFailure.

3. A "lifting state up" demo: two sibling components where one is an input
   and the other displays a transformed version of it, with the state
   lifted to the parent.

Use TypeScript strictly. Add console.logs at every render and inside the
reducer so I can trace what's happening.
```

**2. Feel the stale-state bug:**
```
Show me a clear demonstration of stale state caused by reading a state
variable inside a setTimeout callback. Then show me the two ways to fix it
(updater function form, and lifting it to a ref — though we'll do refs
properly in doc 07). Explain why each fix works in terms of closures.
```

**3. Architecture exercise:**
```
For each of these pieces of state, tell me where it should live (local
useState, lifted to parent, in Context, in TanStack Query, or doesn't
need to be state at all). Justify each:

- whether a tooltip is currently visible
- the current logged-in user's profile
- the search input's current text
- the list of search results from the API
- the filtered+sorted view of those search results
- whether the app is in dark mode
- the count of unread notifications
```

## Checkpoints

1. Why does `useState(generateBigArray())` re-run `generateBigArray` on every render, while `useState(() => generateBigArray())` does not?
2. When should you use `setX(prev => ...)` instead of `setX(value)`?
3. What's a discriminated union in TypeScript, and why does it pair so well with `useReducer`?
4. State lives at the *lowest common ancestor* of components that need it. Why not just always lift to the root for safety?
5. Why is "data from the server" generally a bad fit for `useState`?
6. If a value can be computed from other state, where should it go?

## Footguns

- **Storing derived data in state.** Then forgetting to update it when the source changes. Just compute it during render.
- **Mutating state objects.** `state.items.push(x); setState(state)` — React often won't re-render (same reference). Always create new objects/arrays.
- **Reading state immediately after setting it.** `setX(5); console.log(x)` logs the old value. State updates are async; the new value is visible in the next render.
- **Putting everything in one giant `useState({...})` object.** You then have to spread it on every update and changing one field re-renders everything that uses the object. Either split into multiple `useState` calls or graduate to `useReducer`.
- **Lifting state up too aggressively.** Every piece of state that gets lifted causes the lifting parent (and all its descendants) to re-render on changes. Lift only as high as truly necessary.
- **Treating server data as local state.** You set it once on fetch, forget it can become stale, and now your UI shows yesterday's data forever. Use a real data layer (doc 11).
- **Closure-captured stale state in async callbacks.** If a `setTimeout` reads `count`, it sees the value from when it was scheduled, not the current one. Use the updater function form, or a ref (doc 07), or restructure.

## Ask-the-agent cheatsheet

- *"Refactor this useState to a useReducer with a discriminated-union action type. List all the actions and reducer cases first before writing code."*
- *"Identify any state in this component that is derived from other state or props, and rewrite to compute it during render instead of storing it."*
- *"This state is duplicated in two siblings. Lift it to their lowest common ancestor and make the children controlled."*
- *"This callback is reading a stale state value. Tell me whether it's a closure problem or a batching problem, then fix it."*
- *"Audit this component's state: for each piece, classify it as local UI state, shared client state, server data, or derivable. Suggest where each should actually live."*

## Where this goes next

- **Doc 06** — Effects. The other half of "where logic lives in a component," and the place where stale-state bugs reach their final form.
- **Doc 08** — Context, for state that genuinely needs to be shared widely.
- **Doc 11** — TanStack Query, for server data that should never be in `useState`.
