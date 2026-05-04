# 07 — Context and external stores

## What you're learning & why it matters

You're learning how to share state across many components without passing it through every layer as props. Two tools, both worth knowing:

1. **Context** — React's built-in mechanism for "make this value available to a subtree."
2. **External stores** (Zustand, Jotai, Redux) — third-party libraries for app-wide state with better ergonomics for certain shapes of problem.

Why both: Context is great for *low-frequency, broad* values (the current theme, the current locale, the logged-in user). It's *bad* for *high-frequency, large* state (every component subscribed re-renders on any change). External stores fix that with fine-grained subscriptions.

### Terms first

- **Prop drilling**: passing the same prop through 5 layers of components just so a deep child can use it.
- **Provider**: a component (`<XContext.Provider value={...}>`) that wraps a subtree and supplies a value to it.
- **Consumer**: any component inside the provider that reads the value via `useContext`.
- **Subscription**: a component "listening" for changes to a value. When the value changes, subscribers re-render.
- **Selector**: a function that picks out *part* of a store's state, so the component re-renders only when that part changes.

## Mental model

> **Context broadcasts a value to a subtree. External stores let components subscribe to slices of a global value.**

Different tools for different problems. The mistake people make is using Context like a global store, then watching their app re-render constantly.

## Context — the basics

```tsx
import { createContext, useContext } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<Theme>("light");

function App() {
  const [theme, setTheme] = useState<Theme>("light");
  return (
    <ThemeContext.Provider value={theme}>
      <Page />
      <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
        Toggle
      </button>
    </ThemeContext.Provider>
  );
}

function DeepChild() {
  const theme = useContext(ThemeContext); // "light" or "dark"
  return <div className={theme}>Hi</div>;
}
```

Three steps:

1. **Create** a context with a default value: `createContext("light")`.
2. **Provide** a value to a subtree: `<ThemeContext.Provider value={...}>...</ThemeContext.Provider>`.
3. **Consume** it anywhere in that subtree: `useContext(ThemeContext)`.

Components don't need any props passed through them — they grab the value out of thin air via `useContext`. That's the whole "no prop drilling" win.

## Context with both value AND updater

You usually want consumers to be able to *change* the value too. Bundle the setter into the context value:

```tsx
type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
```

Two patterns worth copying from this:

- **Wrap `useContext` in a custom hook** like `useTheme`. Consumers just call `useTheme()` — they don't import the context object directly.
- **Throw if used outside the provider.** The default value (`null`) is a safety check, and the custom hook converts that into a clear error so a typo doesn't silently give you wrong behavior.

## When Context is the right tool

- **Low-frequency, broad data.** Theme, locale, the current user, feature flags. Things that change once in a while and many places need.
- **Compound components.** `<Tabs>` putting the active tab id into a context that `<Tab>` and `<TabPanel>` read. Doc 03 mentioned this.
- **Dependency injection.** Passing a service or config that many components need (e.g., an API client).

## When Context is the wrong tool (the big footgun)

**Every component that calls `useContext(X)` re-renders every time the value of `X` changes.** Doesn't matter which *part* of the value changed. So if you put a big object into context — say `{ user, posts, notifications, settings }` — every consumer re-renders when *any* part of it changes. In a big app this is a performance nightmare.

Workarounds:

1. **Split contexts.** Don't put everything in one. Have a `UserContext`, a `SettingsContext`, etc. Components subscribe only to the one they need.
2. **Memoize the value.** If the provider's value is `{theme, setTheme}` recreated every render, every consumer re-renders every parent render. Wrap it in `useMemo`:
   ```tsx
   const value = useMemo(() => ({ theme, setTheme }), [theme]);
   ```
3. **Use a real store.** When a piece of state is changed often and read by many places that only care about parts of it, an external store with selectors is dramatically better.

## External stores — Zustand (the recommended starting point)

Zustand is a tiny, modern store library. Roughly 1KB. Idiomatic React, no boilerplate.

```tsx
import { create } from "zustand";

type CounterStore = {
  count: number;
  increment: () => void;
  reset: () => void;
};

const useCounter = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}));

function Display() {
  const count = useCounter((s) => s.count); // selector — re-renders only when s.count changes
  return <p>{count}</p>;
}

function Buttons() {
  const increment = useCounter((s) => s.increment);
  const reset = useCounter((s) => s.reset);
  return <><button onClick={increment}>+</button><button onClick={reset}>Reset</button></>;
}
```

Notice the **selector**: `useCounter((s) => s.count)`. The component subscribes to *that slice*. If you later add another piece of state and update it, `Display` won't re-render — because its slice didn't change. That's the win over Context.

When to reach for Zustand (or similar) over Context:
- The state is updated frequently.
- Many components read different *parts* of the same state.
- You want simple actions (mutations) without writing reducers.
- You want to use the state outside of React (e.g., from utility functions).

When *not* to use a store:
- Server data — that goes in TanStack Query (doc 11), not a client store.
- Tiny piece of UI state for a single component — that's `useState`.

## Other store options (worth knowing exist)

- **Jotai** — atom-based, very granular. Each piece of state is a tiny atom; components read individual atoms. Great for very dynamic, fine-grained state.
- **Redux Toolkit** — the "official" choice when teams want strict patterns and excellent devtools. Heavier; reach for it on bigger apps with complex flows. Modern Redux is much less verbose than the old days.
- **Valtio, MobX** — proxy-based; you mutate state directly and the library tracks reads. Different mental model.

For most React apps in 2026, Zustand is the recommended default. Use Redux when the team needs the structure or you're working in a codebase that already has it.

## Architecture: layering Context, store, and Query

A real app usually has *all three*:

| Layer | Tool | What lives here |
|---|---|---|
| Server data | TanStack Query | Users, posts, anything from your Rails API |
| Client app state | Zustand (or Context) | Filters, UI prefs, current view |
| Cross-cutting | Context | Theme, locale, current user, services |

If you can put it on a server, it goes in Query. If it's UI/client-only and broad, it goes in a store. If it's stable and broadcast to a tree, Context.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/07-context/, build three examples:

1. context-theme.tsx: a ThemeContext with light/dark, using the
   "value + setter + custom useTheme hook + throw-if-no-provider" pattern.
   Three nested components, with the deepest one toggling the theme.

2. context-split.tsx: demonstrate the "context split" pattern. Have a
   user object that changes often and a theme that changes rarely. Show
   them in one combined context first (and log every consumer's renders),
   then split into UserContext and ThemeContext, and show how splitting
   reduces unnecessary renders.

3. zustand-counter.tsx: install zustand if not present (`npm install zustand`),
   build a counter store with count, increment, reset, and use selectors
   in two consumer components. Add console.logs at every render to show
   that updating one selector's slice doesn't re-render the other.

Use TypeScript strictly. Use `null` as the context default and a custom
hook that throws when used outside a provider.
```

**2. Architecture exercise:**
```
For each of these pieces of state, classify it: useState (local), Context,
external store (Zustand), or TanStack Query (server cache). Justify each:

- the current locale (en/ar) used across the app
- the list of products from the API
- whether a specific dropdown is open
- the user's draft comment text in a comment box
- the current logged-in user object
- a global "currently editing" mode that affects 5 different components
- the result of a complex computed filter on the products list
- saved theme preference (persisted to localStorage)
```

**3. Refactor exercise:**
```
Here's a Context value that contains 8 fields, all updated at different
frequencies. Refactor into multiple contexts (or move some into a Zustand
store). Explain your splitting strategy.
[paste a fake bloated context]
```

## Checkpoints

1. What's the rule for when Context will cause unnecessary re-renders, and what are the two main mitigations?
2. Why is wrapping `useContext` in a custom hook (e.g. `useTheme`) better than calling it directly?
3. Why does Zustand's selector pattern reduce re-renders compared to a single big Context value?
4. What's the difference between "client state" and "server state," and why does that distinction drive your tooling choice?
5. When would you reach for Redux Toolkit over Zustand?

## Footguns

- **Putting everything in one giant Context.** Every consumer re-renders on any change. Split or use a store.
- **Provider value as inline object/array.** `<Ctx.Provider value={{ a, b }}>` creates a new object every render → every consumer re-renders every render. Memoize with `useMemo`.
- **Forgetting the provider entirely.** Components mount, `useContext` returns the default value (often `undefined` or `null`), and you get a confusing crash. Wrap `useContext` in a custom hook that throws.
- **Using Context for server data.** Stale data, no caching, no refetching, manual loading flags. Use TanStack Query.
- **Reaching for a store when one component owns the state.** Premature globalization. Try `useState` first.
- **Mutating store state directly outside the provided actions.** Defeats subscription tracking; UI doesn't update. Always use the store's set/update mechanism.

## Ask-the-agent cheatsheet

- *"Create a Context for [X]. Use the pattern with a typed value, a custom hook (`useX`) that throws if used outside the provider, and `useMemo` on the provider value to avoid unnecessary consumer re-renders."*
- *"This Context is causing unnecessary re-renders. Split it into smaller contexts based on update frequency, and tell me which pieces should move."*
- *"Refactor this Context into a Zustand store. Use selectors in consumers and show me the re-render reduction."*
- *"Audit this app's state. For each piece of state, classify as local UI / Context / store / server cache, and recommend any moves."*

## Where this goes next

- **Doc 09** — Performance and re-renders. Where you'll learn the profiler and understand what "unnecessary re-render" actually costs.
- **Doc 11** — TanStack Query, the right home for server state.
- **Doc 18** — Auth flows, where the "current user context" pattern shows up properly.
