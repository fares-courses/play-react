# 06 — Refs and imperative escape hatches

## What you're learning & why it matters

You're learning **refs** — the official way to step outside React's declarative model when you need to. Refs do two things:

1. Give you a handle to a real DOM element (so you can call `.focus()`, measure size, etc.).
2. Let you store a mutable value that *survives across renders without causing re-renders*.

Refs are an escape hatch. Most of the time, state and effects are the right tools. But there's a small, important set of problems where refs are the only clean answer — focus management, timers, integrating non-React libraries, holding onto the latest value without re-rendering.

Why this matters: misuse refs and you fight React (sticky bugs, things not updating). Use them in the right places and code that would otherwise be a tangle becomes obvious.

### Terms first

- **DOM node**: a single element in the browser's element tree. `<button>` rendered on screen corresponds to one DOM node.
- **Imperative**: telling the system step-by-step what to do (`button.focus()`, `element.scrollIntoView()`). The opposite of declarative.
- **Mutable**: can be changed in place. State should be immutable (always replaced with new objects); refs are mutable by design.
- **Forward ref**: a way for a parent component to pass a ref through a child component to a DOM element inside the child. In React 19 this is mostly automatic — `ref` is just a regular prop.

## Mental model

> **State is "what the UI looks like." Refs are "stuff React doesn't need to know about."**

If changing the value should re-render the UI, it's state. If it shouldn't, it's a ref. That's the whole rule.

## `useRef` — the basics

```tsx
const ref = useRef<number>(0);

function handleClick() {
  ref.current += 1;          // mutate freely; no re-render
  console.log(ref.current);  // current value, available immediately
}
```

`useRef(initial)` returns an object `{ current: initial }`. React keeps the same object reference for the lifetime of the component, so `ref.current` is a stable place to put a value.

Three properties of refs:

1. **Mutating `ref.current` does not re-render.** Changes are silent from React's perspective.
2. **`ref.current` is readable synchronously and always reflects the latest value.** Unlike state, there's no "next render" delay.
3. **The ref object itself is stable** — same object across renders. So you can pass it as a prop or include it in dep arrays without causing re-renders.

## Use case 1 — accessing a DOM element

The most common reason to use a ref. You attach the ref to a JSX element using the `ref` attribute:

```tsx
function FocusableInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.focus();
  }

  return (
    <>
      <input ref={inputRef} />
      <button onClick={handleClick}>Focus the input</button>
    </>
  );
}
```

After the input renders, React sets `inputRef.current` to the actual `<input>` DOM node. Before that, it's `null` (which is why you initialize it with `null` and use the `?.` optional chaining when accessing). The type `HTMLInputElement` comes from TypeScript's built-in DOM types — every HTML tag has a corresponding type.

When to use: programmatic focus, scrolling, measuring an element, integrating with a non-React library that needs to manage a DOM element (charts, video players, drag-and-drop libs).

## Use case 2 — storing values without triggering re-renders

```tsx
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  function start() {
    intervalRef.current = window.setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);
  }

  function stop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  return (
    <>
      <p>{elapsed}s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  );
}
```

The interval ID isn't UI state — nothing on screen depends on it. So we don't put it in `useState` (which would re-render every time we set it). We put it in a ref.

Other classic uses:
- The previous value of a prop (so you can detect changes).
- A "have we initialized this yet" flag.
- A pointer to a third-party library instance.
- The latest copy of state you want to read from inside a callback that mustn't go stale.

## Forwarding refs to child components (React 19 way)

A common need: a parent wants to focus an input that lives inside a child component.

In React 19, `ref` is just a prop. Pass it like any other:

```tsx
function MyInput({ ref, ...rest }: React.ComponentProps<"input">) {
  return <input ref={ref} {...rest} />;
}

function Form() {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <MyInput ref={inputRef} placeholder="Email" />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
    </>
  );
}
```

`React.ComponentProps<"input">` is a TS utility type meaning "all the props a native `<input>` accepts." `{...rest}` spreads all the remaining props onto the underlying input. This is a really common pattern for building wrapped form inputs.

(In React 18 and earlier, you needed `forwardRef`. You'll see it in old code; React 19 deprecated it. New code uses the prop form.)

## `useImperativeHandle` — exposing a custom imperative API

Sometimes a parent shouldn't get the raw DOM node — they should get a controlled set of imperative methods:

```tsx
type FormHandle = { reset: () => void; focusFirst: () => void };

function MyForm({ ref }: { ref: React.Ref<FormHandle> }) {
  const firstInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    reset: () => { /* clear all fields */ },
    focusFirst: () => firstInputRef.current?.focus(),
  }));

  return <form>...</form>;
}

function Page() {
  const formRef = useRef<FormHandle>(null);
  return (
    <>
      <MyForm ref={formRef} />
      <button onClick={() => formRef.current?.reset()}>Reset</button>
    </>
  );
}
```

You're saying "here's a small, controlled imperative interface" — instead of leaking the entire DOM. Use sparingly. If you find yourself calling many imperative methods on a child, consider whether the child's behavior should be controlled by props instead.

## When *not* to use a ref

- **Don't store render-affecting data in a ref.** If the UI needs to change when the value changes, it's state, not a ref.
- **Don't write to a ref during render.** Render must be pure (doc 01). Writes happen in event handlers or effects.
- **Don't read a ref during render to compute UI.** Same reason — refs can change at any time without triggering a render, so the value you read might be wrong by the next render. Read refs in event handlers and effects.
- **Don't use refs to skip "lifting state up."** If two components need to share data, lift the state. Refs for sharing values across components is almost always wrong.

## A tricky pattern: keeping a ref of the latest state

Sometimes a callback (an event handler attached to a DOM node, a setTimeout fired in an effect) closes over an old value of state. You can keep the latest value in a ref and read it from the callback:

```tsx
function Chat() {
  const [draft, setDraft] = useState("");
  const draftRef = useRef(draft);

  // keep the ref in sync with state on every render
  useEffect(() => { draftRef.current = draft; });

  useEffect(() => {
    const onPaste = () => console.log("current draft:", draftRef.current);
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []); // listener is set up once but always sees latest draft via the ref

  return <textarea value={draft} onChange={e => setDraft(e.target.value)} />;
}
```

This is the kind of pattern `useEffectEvent` (doc 05) replaces in newer React. But you'll still see this idiom and it's worth knowing.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/06-refs/, build four small examples:

1. ref-dom.tsx: a button that focuses an <input> via a ref. Type the ref
   correctly with HTMLInputElement.

2. ref-stopwatch.tsx: a stopwatch using setInterval, with the interval ID
   stored in a ref. Use Start/Stop/Reset buttons. Show that the interval
   ID changing does NOT cause a re-render (add a console.log on render).

3. ref-forward.tsx: a custom <Input> component (with its own styling) that
   forwards a ref to the underlying <input>. Use React 19's ref-as-prop
   pattern. A parent component focuses it via the ref.

4. ref-imperative.tsx: a <Modal> component with imperativeHandle exposing
   open() and close() methods (no isOpen prop — fully imperative as a demo
   of the pattern, even though prop-controlled is usually better).

Use TypeScript strictly, including correct DOM element types.
```

**2. State-vs-ref classification quiz:**
```
For each of these, decide whether it should be useState or useRef and why:

a) The current value of a controlled text input
b) The DOM node of a video element so we can call .play() on it
c) Whether a tooltip is currently visible
d) The ID returned by setTimeout, so we can clear it later
e) A counter that displays on screen
f) A counter that's used internally to debounce rapid events but never shown
g) The previous value of a prop, used to detect when it changes
h) A boolean tracking "has this component done its first-render setup?"
```

**3. The "should this even be a ref?" review:**
```
Here's a component using 4 useRefs. Audit each one. Is it actually the
right tool? Could any of them be replaced by state, by a useEffectEvent,
or by restructuring the component to not need them at all?
[paste a contrived example]
```

## Checkpoints

1. What's the difference between `useState` and `useRef` in terms of (a) re-rendering, (b) when the new value is readable, and (c) typical use cases?
2. Why do you usually initialize a DOM ref with `null`?
3. When you attach a ref via `<input ref={myRef} />`, when exactly does `myRef.current` become the actual element? (And what is it before?)
4. Why is writing to a ref during render forbidden?
5. What's `useImperativeHandle` for, and why should you reach for it sparingly?
6. Why is "lifting state up" almost always preferable to "share data via a ref"?

## Footguns

- **Reading a ref during render and expecting the UI to update.** It won't. Use state for anything UI-visible.
- **Mutating a ref's `.current` and expecting React to react.** It doesn't. That's the whole point of a ref — but people forget.
- **Forgetting `.current`.** `myRef.focus()` is wrong; `myRef.current?.focus()` is right. The ref object itself is the wrapper, not the value.
- **Using a ref to "fix" a stale-state bug instead of understanding why state was stale.** Sometimes the right answer is restructuring or using `useEffectEvent`. Refs to dodge state can hide design problems.
- **Writing to a ref inside the render body.** Render must be pure. Do it in an effect or an event handler.
- **Treating `useImperativeHandle` like a default API style.** It's an escape hatch. Most components should be controlled by props, not by imperative method calls.

## Ask-the-agent cheatsheet

- *"Should this be useState or useRef? Here's the value: [describe]. Tell me which and why, considering whether the UI depends on it."*
- *"Add a ref to this component to give the parent access to the underlying DOM node, using React 19's ref-as-prop pattern (no forwardRef)."*
- *"Expose only an `open()` and `close()` method to the parent via useImperativeHandle. Don't expose the underlying DOM."*
- *"This callback is reading stale state. Show me both fixes: (a) using a ref to track the latest value, (b) using useEffectEvent. Explain when each is preferred."*

## Where this goes next

- **Doc 07** — Context, for sharing state across distant components without prop drilling.
- **Doc 18** — WebSockets, where refs come up naturally for the connection instance.
- **Doc 20** — Drag-and-drop, which leans heavily on refs for DOM measurements.
