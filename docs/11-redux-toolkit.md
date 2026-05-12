# 11 — Redux Toolkit and Redux Thunk

## What you're learning & why it matters

You're learning **Redux Toolkit (RTK)** — the official, modern way to write Redux. Doc 08 introduced Zustand as the recommended lightweight store. Redux is the other major option: heavier, more structured, with excellent devtools and a huge ecosystem. You'll encounter it in most large production codebases.

Why learn Redux after Zustand? Different tools for different scales. Zustand is great for small-to-medium apps. Redux shines when:
- The team is big and needs enforced conventions (everyone writes slices the same way).
- You need time-travel debugging, action logging, or the Redux DevTools.
- The app has complex async flows (multi-step workflows, pessimistic updates, retry logic).
- You're joining an existing codebase that already uses Redux.

You're also learning **Redux Thunk** — the default middleware for async operations in RTK. Thunks let you dispatch async actions (like API calls) with full control over when to dispatch loading/success/error states.

### Terms first

- **Store**: the single object holding all your app's Redux state. There's only one store.
- **Slice**: a bundle of reducer logic + actions for one feature. RTK's `createSlice` generates both from one config.
- **Action**: a plain object `{ type: "todos/add", payload: ... }` that describes *what happened*. You never write these by hand in RTK — `createSlice` makes action creators for you.
- **Reducer**: a pure function `(state, action) => newState`. Decides how state changes in response to actions.
- **Dispatch**: calling `dispatch(action)` sends an action to the store, which runs it through reducers.
- **Selector**: a function that extracts a piece of state from the store. Used with `useSelector` to subscribe a component to just that piece.
- **Thunk**: a function that receives `dispatch` and `getState`, letting you write async logic (API calls, conditional dispatches) outside of reducers.
- **Middleware**: code that intercepts every dispatched action. Redux Thunk is a middleware — it intercepts function-dispatches and calls them with `dispatch` and `getState`.
- **Immer**: a library RTK uses under the hood. Inside reducers, you can write "mutating" code (`state.count += 1`) and Immer produces an immutable update. This is not real mutation — it's a convenience layer.

## Mental model

> **Redux is a predictable state container. Every state change is an action → reducer → new state. RTK removes the boilerplate so you write slices, not switch statements.**

The old Redux (pre-toolkit) was notorious for boilerplate: separate action types, action creators, reducers, immutable spread operators everywhere. RTK eliminates all of that. If someone says "Redux is too verbose," they're thinking of 2018 Redux, not RTK.

## Setup

```bash
npm install @reduxjs/toolkit react-redux
```

Two packages: `@reduxjs/toolkit` (the core + utilities) and `react-redux` (the React bindings: `Provider`, `useSelector`, `useDispatch`).

## A complete example: counter

### 1. Create a slice

```tsx
// store/counterSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type CounterState = {
  value: number;
};

const initialState: CounterState = { value: 0 };

const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment(state) {
      state.value += 1; // Immer makes this safe — it's not real mutation
    },
    decrement(state) {
      state.value -= 1;
    },
    incrementByAmount(state, action: PayloadAction<number>) {
      state.value += action.payload;
    },
    reset() {
      return initialState; // returning a new state replaces the old one entirely
    },
  },
});

export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;
export default counterSlice.reducer;
```

What's happening:
- `createSlice` takes a name, initial state, and a map of reducer functions.
- Each reducer receives `state` (the current slice state) and optionally `action`. The `state` is an Immer draft — mutate it directly.
- `PayloadAction<number>` types the `action.payload` as a number.
- RTK auto-generates action creators: `increment()` produces `{ type: "counter/increment" }`, `incrementByAmount(5)` produces `{ type: "counter/incrementByAmount", payload: 5 }`.

### 2. Configure the store

```tsx
// store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counterSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    // add more slices here as the app grows
  },
});

// Infer types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

`configureStore` sets up the store with good defaults: Redux Thunk middleware included, Redux DevTools enabled in dev, serialization checks in dev.

### 3. Typed hooks (do this once)

```tsx
// store/hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

// Use these everywhere instead of plain useDispatch/useSelector
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

This is the RTK-recommended pattern. `useAppSelector` knows your state shape; `useAppDispatch` knows about thunks. Define once, import everywhere.

### 4. Provide the store

```tsx
// main.tsx or your app root
import { Provider } from "react-redux";
import { store } from "./store/store";

function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}
```

### 5. Use in components

```tsx
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { increment, decrement, reset, incrementByAmount } from "../store/counterSlice";

function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(decrement())}>-1</button>
      <button onClick={() => dispatch(incrementByAmount(10))}>+10</button>
      <button onClick={() => dispatch(reset())}>Reset</button>
    </div>
  );
}
```

`useAppSelector((state) => state.counter.value)` subscribes the component to `state.counter.value` — it re-renders only when that value changes, not when other slices change. This is the same selector benefit Zustand has.

## Redux Thunk — async operations

Reducers must be pure (no side effects). So where does async logic live? In **thunks**.

### createAsyncThunk — the standard pattern

```tsx
// store/usersSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";

type User = { id: number; name: string; email: string };

type UsersState = {
  items: User[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initialState: UsersState = {
  items: [],
  status: "idle",
  error: null,
};

// The thunk — an async action creator
export const fetchUsers = createAsyncThunk("users/fetchUsers", async () => {
  const response = await fetch("https://jsonplaceholder.typicode.com/users");
  if (!response.ok) throw new Error("Failed to fetch users");
  return (await response.json()) as User[];
});

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export default usersSlice.reducer;
```

What's happening:
- `createAsyncThunk("users/fetchUsers", asyncFn)` generates three action types: `users/fetchUsers/pending`, `users/fetchUsers/fulfilled`, `users/fetchUsers/rejected`.
- `extraReducers` uses a builder to handle each case. RTK generates the actions; you say what happens to state for each.
- The component dispatches `fetchUsers()` like any action. The thunk middleware runs the async function, then dispatches pending → fulfilled/rejected automatically.

### Using the thunk in a component

```tsx
import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { fetchUsers } from "../store/usersSlice";

function UsersList() {
  const dispatch = useAppDispatch();
  const { items: users, status, error } = useAppSelector((state) => state.users);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchUsers());
    }
  }, [status, dispatch]);

  if (status === "loading") return <p>Loading…</p>;
  if (status === "failed") return <p>Error: {error}</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name} — {user.email}</li>
      ))}
    </ul>
  );
}
```

### Manual thunks (when createAsyncThunk is overkill)

For simple cases, you can write a plain thunk function:

```tsx
export function incrementIfOdd() {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const currentValue = getState().counter.value;
    if (currentValue % 2 !== 0) {
      dispatch(increment());
    }
  };
}
```

This is just a function that returns a function. The thunk middleware catches it and calls it with `dispatch` and `getState`.

## Redux vs Zustand — when to pick which

| Concern | Zustand | Redux Toolkit |
|---|---|---|
| Bundle size | ~1KB | ~11KB (RTK + react-redux) |
| Boilerplate | Minimal — one `create()` call | More structure — slices, store config, typed hooks |
| DevTools | Plugin available | Built-in, excellent time-travel debugging |
| Async | Your choice (plain async in actions) | createAsyncThunk, RTK Query |
| Learning curve | Very low | Moderate (concepts: actions, reducers, dispatch) |
| Team conventions | Loose — each dev can structure differently | Enforced — slices + RTK patterns are standardized |
| Best for | Small-medium apps, rapid prototyping | Large teams, complex apps, existing Redux codebases |

**Rule of thumb:** start with Zustand. Move to Redux when the team or app complexity demands the structure.

## RTK Query (worth knowing exists)

RTK includes **RTK Query** — a data fetching and caching layer built on top of Redux. It's similar to TanStack Query but integrated with the Redux store. If you're already using Redux heavily, RTK Query keeps everything in one ecosystem. If you're not already in Redux, TanStack Query (doc 12) is more lightweight and independent.

```tsx
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => "/users",
    }),
  }),
});

export const { useGetUsersQuery } = api;
```

We won't go deep on RTK Query — TanStack Query is covered in doc 12 and is the recommended default for new projects.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/10-redux/, install @reduxjs/toolkit and react-redux.
Build a todo app with Redux Toolkit:

1. Create a todosSlice with: items (array), filter ("all" | "active" | "completed").
   Actions: addTodo, toggleTodo, removeTodo, setFilter.
2. Create a store with the todosSlice.
3. Create typed hooks (useAppSelector, useAppDispatch).
4. Build three components:
   - AddTodo: input + button, dispatches addTodo
   - TodoList: reads filtered todos via a selector, renders them
   - FilterButtons: three buttons that dispatch setFilter
5. Add a createAsyncThunk that fetches initial todos from
   https://jsonplaceholder.typicode.com/todos?_limit=10
   Handle pending/fulfilled/rejected in extraReducers.
6. Add console.logs in each component to show selector-based re-rendering.

Use TypeScript strictly. No `any`. Export typed hooks from store/hooks.ts.
Use the useAppSelector/useAppDispatch pattern, not raw useSelector/useDispatch.
```

**2. Thunk exercise:**
```
Add a "save todo" feature: when the user creates a todo, dispatch a thunk
that POSTs to a fake API (use a setTimeout to simulate), then adds it to
state on success. Handle the loading state — disable the add button while
saving. Handle errors — show an error message if the "API" fails (randomly
fail 20% of the time).
```

**3. Migration exercise:**
```
Take the Zustand counter store from doc 08 and convert it to Redux Toolkit.
Keep the same UI. Compare: what changed in the component code? What changed
in the store definition? Which version has more boilerplate? Which gives
you better devtools?
```

## Checkpoints

1. What problem does `createSlice` solve compared to writing reducers, action types, and action creators separately?
2. Why can you write `state.value += 1` inside a reducer without breaking immutability?
3. What are the three action types that `createAsyncThunk` generates, and when is each dispatched?
4. Why use `useAppSelector` and `useAppDispatch` instead of the plain `useSelector` and `useDispatch`?
5. When would you pick Redux over Zustand?
6. What is middleware in Redux, and what does the thunk middleware specifically do?

## Footguns

- **Using old-style Redux.** `switch` statements, manual action types, spread-based immutability — all replaced by RTK. If a tutorial shows `const ADD_TODO = "ADD_TODO"`, it's outdated.
- **Mutating state outside Immer.** Immer only works inside `createSlice` reducers. If you copy state out and mutate it elsewhere, you'll corrupt the store.
- **Putting everything in Redux.** Local UI state (is this dropdown open?) belongs in `useState`. Server data belongs in TanStack Query (or RTK Query). Redux is for *shared client state*.
- **Giant slices.** Split by feature, not by data type. `todosSlice`, `authSlice`, `settingsSlice` — not one giant `appSlice`.
- **Forgetting to add the reducer to the store.** You create a slice but never add its reducer to `configureStore` → state never updates. Silent failure.
- **Selecting too broadly.** `useAppSelector(state => state)` subscribes to the entire store — every change re-renders. Always select the narrowest piece you need.
- **Dispatching in render.** Don't dispatch inside the component body — use `useEffect` or event handlers.
- **Not typing thunks.** Without `AppDispatch`, TypeScript won't know that `dispatch` can accept thunks, and you'll get type errors.

## Ask-the-agent cheatsheet

- *"Create a Redux Toolkit slice for [feature] with these fields and actions. Include typed hooks and wire it into the store."*
- *"Add a createAsyncThunk for fetching [resource] from [endpoint]. Handle pending/fulfilled/rejected with loading state and error messages."*
- *"Convert this Zustand store to Redux Toolkit. Keep the same component API."*
- *"This Redux code uses old-style action types and switch reducers. Migrate it to createSlice."*
- *"Add RTK Query endpoints for [resource]. Generate the auto-hooks."*

## Where this goes next

- **Doc 12** — Data fetching with TanStack Query. The recommended tool for server state even when using Redux for client state.
- **Doc 13** — Formik, an older but widely-used forms library that uses patterns similar to Redux's philosophy.
- **Doc 14** — Forms with react-hook-form + Zod, the modern alternative.
