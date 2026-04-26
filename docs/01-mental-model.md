# 01 — Mental model & the React runtime

## What you're learning & why it matters

You're learning what React **is** at its core, before any syntax. Most React bugs aren't typos — they're a wrong mental model. If you start with a wrong picture of how React works, you'll write code that mostly works and occasionally breaks in ways you can't explain. If you start with the right picture, the weird stuff stops being weird.

### A few terms you need before we start

You're a backend dev — these terms come up immediately and I'll use them throughout:

- **The DOM** ("Document Object Model"): the in-memory tree of elements that the browser renders to the screen. When you see `<button>` on a webpage, there's a DOM node behind it. JavaScript can read and modify that tree, and the browser repaints the screen to match. Think of the DOM as the "live state of the UI" the way a database is the live state of your data.
- **Render**: in React, "render" means *call your component function to produce a description of what the UI should look like right now*. It does **not** automatically mean the screen repaints — that's a later step React does for you.
- **Component**: a JavaScript function (in modern React) that returns a description of UI. Your whole app is a tree of these functions calling each other.
- **State**: data that, when it changes, causes the UI to re-render. Roughly: the variables your UI depends on.
- **Hook**: a special function (always starts with `use`, e.g. `useState`) that lets a component talk to React's internals — to remember state across renders, run side effects, etc. We'll go deep on these later; for now, just recognize the word.

That's enough vocabulary to read this doc.

## Where to anchor your intuition (since you do APIs, not full Rails apps)

You spend your day writing **controller actions** that take a request, do work, and return JSON. The request comes in, the action runs once, returns a response, and dies. That action is a **one-shot function**: input in, output out, gone.

**React is the opposite shape.** A React component is a function that gets called *over and over* throughout the user's session — every time anything it depends on changes. It doesn't return a response and die; it stays mounted (alive on screen) and gets re-invoked continuously to keep the UI in sync with whatever the current data looks like.

So:

> A Rails controller action runs once per request. A React component is a function that runs many times — every time the data it shows changes.

If you internalize only one thing from this doc, internalize that. Everything else falls out of it.

## The mental model (the only thing worth memorizing in this doc)

> **`UI = f(state)`** — your component is a function from current state to a description of what the UI should look like. React's job is to make the actual screen match that description, efficiently.

Three consequences fall out of this. Everything else in React follows from these three:

### 1. Components run repeatedly

Every render is a fresh function call. Local variables inside the function body are recreated each call — they don't persist.

Anything you want to **survive** across renders has to live somewhere React manages for you. That's what hooks like `useState` are for: they give your function a "memory" that persists between calls. Without them, your function is amnesiac — every call starts from scratch.

(Loose API-world analogy: a controller action is also stateless across requests. To remember anything between requests, you go to the database, Redis, or session storage. In React, hooks play that "go fetch the persisted thing" role — except React itself is the store.)

### 2. You don't tell React *how* to update the screen — you describe what it should look like

In old-school JavaScript, if a counter went from 5 to 6, you'd write code like "find the element with id `count` and change its text to 6." That's **imperative**: you're issuing step-by-step instructions to mutate the DOM.

React is **declarative**: you describe what the UI should look like for the current state ("the counter shows 6"), and React figures out the minimum changes needed to make the real DOM match. The diffing algorithm React uses to compute those minimum changes is called **reconciliation**. You'll hear that word a lot — that's all it means: "React comparing the new description of the UI against the previous one to figure out what actually changed."

You'll basically never write code that pokes at the DOM directly. If you find yourself wanting to, you're at the wrong layer — and there's an escape hatch for it (refs, doc 06) but you reach for it rarely.

### 3. State changes are the only thing that triggers a re-render

Calling the **state setter** (e.g. `setCount(6)`) does two things: it updates the stored state, and it tells React "please re-run the component and reconcile the result against the DOM."

If you mutate state directly without going through the setter — for example `state.count = 6` — React doesn't know anything happened. The variable changes in memory, but no re-render is scheduled, and the screen falls out of sync with your data. **This is the single most common React bug for newcomers.** Always go through the setter.

## A concrete example (read it, don't copy)

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  console.log("rendering with count =", count);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

A few terms in that snippet:
- `useState(0)`: a hook that gives this component a piece of state, initialized to `0` on the first render. It returns a pair: the current value, and a function to update it. The `[count, setCount] = ...` syntax is just JavaScript array destructuring — it pulls those two things out into named variables.
- `onClick={...}`: when the button is clicked, run this function. The `{}` lets us embed any JavaScript expression inside the JSX.
- **JSX** is the HTML-looking syntax. It's not HTML — it's JavaScript that gets compiled into function calls. We'll cover JSX properly in doc 02.

What happens when the user clicks the button:

1. The `onClick` function fires and calls `setCount(count + 1)`, i.e. `setCount(1)`.
2. React schedules a re-render of `Counter`.
3. React **calls the `Counter` function again from the top.** The line `const [count, setCount] = useState(0)` runs again — but this time `useState` returns `1`, not `0`. The `0` you wrote is the *initial* value, used only on the very first call. React remembers the current state for this component and hands it back on every subsequent call.
4. The function returns a new `<button>1</button>` description.
5. React diffs (reconciles) against the previous `<button>0</button>` description. The only difference is the text content, so React updates only that one text node in the real DOM. It does *not* destroy and recreate the button.

Notice three things:
- The function ran twice, the `useState(0)` line ran twice, but the state persisted — because React owns it.
- You never told React *how* to update the screen. You just returned a new description.
- One state change → one re-render → one minimal DOM update.

That's the whole core loop. Everything else is detail.

## "Render must be pure" — the rule that bites backend devs

In your controller actions, you do whatever you want — query the DB, call external services, log stuff, push jobs to Sidekiq. Side effects everywhere, no problem.

In a React component, the **function body itself must be pure**: same inputs (props + state) must produce the same output, with no side effects during the call. That means **no fetching, no logging-to-a-server, no subscribing to anything, no setting timers** inside the render function.

Why? Because React might call your function many times, sometimes speculatively (it actually does in some modes — calls your function twice in development just to catch impurity bugs). If your function pushes a job to a queue every time it runs, you'll push duplicate jobs you didn't intend.

Side effects don't disappear — they go in a separate place called an **effect** (`useEffect`, doc 05). Effects run *after* React has finished rendering and updating the DOM. That's where your "fetch data, set up a subscription, log something" code lives. The render function itself is for *describing* the UI; effects are for *causing things to happen*.

If this feels like a strange constraint, the loosest analogy is: imagine your controller action could be re-invoked dozens of times per request, and only the *last* return value mattered. You'd want the action body to be safe to call many times — so you'd move "create a record," "send an email," "enqueue a job" out of the action body and into an `after_response` callback. That's what effects are.

## How to use this doc with an agent

You're not going to memorize the syntax. You're going to use an AI agent to generate examples, then poke at them until your prediction matches reality. Here's how.

**1. Generate the lesson code:**
```
In src/lessons/01-mental-model/, create a single Counter component that:
- logs "rendering with count = X" on every render
- has one button labeled "increment (correct)" that calls setCount
- has a second button labeled "mutate (wrong)" that does `count++` directly
  WITHOUT calling the setter, just to demonstrate that nothing happens
- mount it from src/App.tsx, replacing whatever is currently rendered
Keep it under 40 lines. No styling beyond the inline minimum needed to see
the buttons. Add brief comments explaining what each part does.
```
Then run `npm run dev` and open the printed URL in your browser. Open the browser's DevTools console (right-click → Inspect → Console tab) so you can see the logs.

**2. Predict before you click.** Before clicking anything, predict out loud:
- "If I click the correct button 3 times, I expect N renders logged."
- "If I click the wrong button 3 times, I expect N renders logged."
Then click and check. If you were wrong, that gap between prediction and reality is the most valuable learning moment in the whole doc.

**3. Probe deeper:**
```
Modify the Counter to also log "BEFORE useState" before the useState line
and "AFTER useState" after it, plus add a useEffect that logs "effect ran".
Click the increment button once, then paste me the exact console output
in order. Explain to me why each line appeared in that order, and which
lines came from React calling my function vs from React running effects.
```

**4. Explain it back (the highest-value exercise in this doc):**
```
I'm going to explain "UI = f(state)" and "render must be pure" to you in
my own words. Critique my explanation harshly — point out anything I got
subtly wrong, anything I left out, and any sloppy phrasing. Don't be
polite, be accurate.
```
Then explain it out loud or in writing. Where the agent corrects you is where you should re-read.

## Checkpoints

You should be able to answer these without looking back. If you can't, you're not done with this doc.

1. Why does `useState(0)` not reset the count to `0` on every render, even though that line of code runs every render?
2. What does "render must be pure" mean in plain English, and what's a concrete example of breaking that rule?
3. If a component renders 5 times in a row, how many times does its function body execute? How many times does the actual screen update? (These can differ.)
4. What's the difference between **state** (managed by `useState`) and **a regular variable inside the component function**? Which one survives across renders, and why?
5. You have a piece of data on the screen. The user clicks a button and you want it to update. What's the minimum thing that has to happen for the screen to actually change?

If you can't answer one, ask the agent: *"Re-explain checkpoint N from doc 01 with a different angle. I didn't get it the first time. Don't repeat the original phrasing — find a new framing."*

## Footguns

The bugs that bite even people who've used React for a year.

- **Mutating state directly.** `state.items.push(x)` followed by `setState(state)` will *sometimes* re-render and *sometimes* not. Always create new objects/arrays: `setState({ ...state, items: [...state.items, x] })`. The `...` is JavaScript's spread operator — it shallow-copies the existing fields. We're creating a new object so React sees a new reference and knows something changed.
- **Reading state right after setting it.** `setCount(5); console.log(count);` logs the *old* count, not 5. State updates are asynchronous — they're scheduled, not applied immediately. The new value is available in the *next* render. Coming from imperative backend code this feels broken; it isn't, it's by design (for batching multiple updates together).
- **Doing I/O in the render body.** Calling `fetch('/api/users')` inside the component function will run on every render. If the response triggers a state update, you have an infinite loop. Network calls go in effects (doc 05) or in event handlers (doc 04).
- **Assuming components only re-render when "their data changed."** A parent re-rendering will re-render its children by default, even if their props are identical. That's almost always fine — re-renders are cheap. Don't optimize until you've measured (doc 08).
- **Treating JSX as HTML.** It's not. It's JavaScript that compiles to function calls. `class` is `className`, `for` is `htmlFor`, attributes are camelCase (`onclick` → `onClick`), and `{...}` lets you embed any JS expression. When something looks weird, remember: it's JS, not HTML.

## Ask-the-agent cheatsheet

These are prompt phrasings you'll reuse in real React work — not syntax to memorize.

- *"Write a React component that [does X]. Keep the render function pure — no I/O or subscriptions in the render body. Put any side effects in `useEffect` or in event handlers."*
- *"This component is re-rendering when I don't expect it to. Add console.logs at render time and inside any effects, then help me trace why."*
- *"I'm seeing a stale value in this callback — it's using an old version of the state. Walk me through whether this is a closure issue or a state-batching issue, and which fix applies."*
- *"Refactor this so all state updates go through the setter and nothing is mutated in place."*

## Where this goes next

- **Doc 02** — Components, JSX, and TypeScript types for props. So the agent has guardrails when generating code (TypeScript = compile-time type checks for JavaScript; we'll explain).
- **Doc 04** — Returns to state with `useState` and `useReducer` in depth.
- **Doc 05** — Effects. This is where the mental model in this doc gets stress-tested. Most "why is React weird" questions resolve once you nail effects.
