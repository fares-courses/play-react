# 13 — React 19: `use()`, Actions, `useOptimistic`, `useTransition`

## What you're learning & why it matters

You're learning the new primitives in React 19 that change how you write data flows, async UI, and form submissions. Even as an SPA developer (no Server Components yet), several of these are immediately useful and will appear in modern codebases:

- **`use()`** — read a promise or context inline.
- **`useTransition`** — mark slow updates as low-priority so the UI stays responsive.
- **`useOptimistic`** — update UI optimistically while a mutation is in flight.
- **`useActionState`** — connect a form's submit handler to its UI state without manual flags.

These complement Suspense and error boundaries (doc 12) and overlap somewhat with TanStack Query patterns. They're not always replacements — but they reduce a lot of boilerplate when used correctly.

### Terms first

- **Action**: a function that handles a form submission or button click that performs server work. In React 19, "actions" are first-class — hooks know about them.
- **Pending state**: the brief period after the user triggers something and before the result lands.
- **Transition**: a state update marked as "lower priority" — React keeps the old UI visible until the new one is ready, instead of jumping to a Suspense fallback.

## Mental model

> **React 19 builds a vocabulary for async UI: pending states, optimistic UI, and transitions all become hooks instead of manual flags. The hooks know about each other, so writing a "submitting…" state, an optimistic preview, and a smooth transition all stop being separate problems.**

## `use()` — reading promises and contexts inline

`use()` is unique: unlike other hooks, you can call it conditionally (inside an `if`) and inside loops. It reads a value from either a Promise or a Context.

### Reading a promise (suspends)

```tsx
import { use } from "react";

function MessageDisplay({ messagePromise }: { messagePromise: Promise<string> }) {
  const message = use(messagePromise);  // suspends until resolved
  return <p>{message}</p>;
}

// Higher up:
<Suspense fallback={<p>Loading…</p>}>
  <MessageDisplay messagePromise={fetchMessage()} />
</Suspense>
```

The component reads `message` as if it were sync. While the promise is pending, the component suspends; Suspense (doc 12) shows the fallback.

When this is useful: simple "load this one thing" patterns where you don't need TanStack Query's caching/invalidation. For most real apps, prefer Query — but `use()` is great inside Server Components (doc 14) where the promise is created on the server.

### Reading context conditionally

`useContext` must be called unconditionally. `use()` can be called inside an `if`:
```tsx
function Foo({ show }: { show: boolean }) {
  if (show) {
    const theme = use(ThemeContext);
    return <div className={theme}>Hi</div>;
  }
  return null;
}
```
Niche but occasionally useful.

## `useTransition` — keep the UI responsive

When a state update triggers an expensive re-render or a Suspense fallback, the UI feels janky. Mark the update as a "transition" and React keeps the previous UI visible while preparing the new one.

```tsx
const [isPending, startTransition] = useTransition();

function changeTab(newTab: string) {
  startTransition(() => {
    setActiveTab(newTab);
  });
}

return (
  <>
    <TabBar active={activeTab} onChange={changeTab} disabled={isPending} />
    <Suspense fallback={<Spinner />}>
      {activeTab === "users" ? <UsersTab /> : <PostsTab />}
    </Suspense>
  </>
);
```

Without `useTransition`, switching tabs would immediately show the Suspense fallback (the spinner) while the new tab loads. With it, the *old* tab's content stays on screen, and `isPending` is `true` so you can show a subtle indicator (dimmed UI, spinner in the corner). Once the new tab is ready, React swaps it in.

Use cases:
- Tab/route transitions where the new content suspends.
- Filtering/sorting a large list when the computation is slow.
- Anything where "hold the old UI" is better than "fall back to a spinner."

## `useOptimistic` — instant UI feedback

You're sending a chat message. You want it to appear immediately, before the server confirms. Optimistic UI.

```tsx
import { useOptimistic } from "react";

function Chat({ messages, sendMessage }: Props) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (current, newMessage: Message) => [...current, { ...newMessage, sending: true }]
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get("text") as string;
    addOptimisticMessage({ id: "tmp", text, author: me });
    await sendMessage(text); // when this resolves, `messages` updates and the optimistic state is replaced
  }

  return (
    <>
      <ul>
        {optimisticMessages.map(m => (
          <li key={m.id} style={{ opacity: m.sending ? 0.5 : 1 }}>{m.text}</li>
        ))}
      </ul>
      <form action={handleSubmit}>
        <input name="text" />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

`useOptimistic` gives you a "fork" of the real state. While an action is in flight, the optimistic state shows the predicted result. When the real state catches up (e.g., from a refetch), the optimistic layer disappears.

Compared to TanStack Query's `onMutate`/`onError` optimistic pattern (doc 10): `useOptimistic` is simpler but doesn't handle rollback or cache invalidation — those are still TanStack Query's job. They're complementary, not redundant.

## `useActionState` — form submit + pending state in one hook

In doc 11 you wired up `isSubmitting` manually. `useActionState` does that automatically for forms.

```tsx
import { useActionState } from "react";

async function submitAction(prevState: State, formData: FormData) {
  const email = formData.get("email") as string;
  try {
    await api.post("/signup", { email });
    return { ok: true, message: "Signed up!" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

function SignupForm() {
  const [state, formAction, isPending] = useActionState(submitAction, { ok: null, message: "" });

  return (
    <form action={formAction}>
      <input name="email" />
      <button disabled={isPending}>{isPending ? "Submitting…" : "Submit"}</button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

The action function receives `(prevState, formData)` and returns the new state. React tracks pending automatically. The form's `action={formAction}` (note: not `onSubmit`) wires it up.

Pairs naturally with `useOptimistic` for "send chat message" UI.

When to use vs react-hook-form: `useActionState` is light and pairs well with simple forms, especially in Server Components (doc 14). For complex client forms with rich validation, react-hook-form + Zod is still better. They can coexist in the same app.

## `useFormStatus` — pending state inside a form

A submit button often wants to know "am I submitting?" without lifting state up. `useFormStatus` reads it from the parent `<form>`:

```tsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "…" : "Submit"}</button>;
}

<form action={someAction}>
  <input name="email" />
  <SubmitButton />
</form>
```

The `<SubmitButton>` doesn't need props; it asks the surrounding form for status.

## How these all fit together

A modern form pattern combining several:

```tsx
function CommentForm({ comments }: { comments: Comment[] }) {
  const [optimistic, addOptimistic] = useOptimistic(comments, (cur, next: Comment) => [...cur, next]);
  const [state, formAction] = useActionState(async (prev: State, fd: FormData) => {
    const text = fd.get("text") as string;
    addOptimistic({ id: crypto.randomUUID(), text, sending: true });
    return await api.post("/comments", { text });
  }, null);

  return (
    <>
      <CommentList comments={optimistic} />
      <form action={formAction}>
        <input name="text" />
        <SubmitButton />
      </form>
    </>
  );
}
```

The user types, hits submit, sees their comment appear immediately (optimistic), the button disables (form status), and the action completes — all without a single `useState` for UI flags.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/13-react19/, build four small examples (one file each):

1. use-promise.tsx: a component that reads a fetched message via use().
   Wrap in Suspense. Add a button that creates a fresh promise and re-renders
   so I can see suspension on each click.

2. use-transition.tsx: a tab switcher. Two tabs, each lazy-loaded with
   React.lazy. Without useTransition: clicking a tab flashes a Suspense
   fallback. With useTransition: old tab stays visible until new one ready,
   isPending true. Show both versions side by side.

3. use-optimistic.tsx: a fake "send message" UI. Mock the send (700ms
   delay, 20% failure). On send: addOptimisticMessage immediately. Show
   sending=true messages with reduced opacity. On failure, message stays
   shown but with an error indicator.

4. use-action-state.tsx: a signup form using useActionState + useFormStatus.
   No useState. The action returns {ok, message}. SubmitButton reads
   useFormStatus to show pending.

Use TypeScript strictly.
```

**2. Comparison exercise:**
```
For each of these tasks, tell me: should I reach for the React 19 hook, the
TanStack Query equivalent, or both?
- Loading the user's profile on a page
- A "send chat message" button with optimistic UI
- A login form
- Switching between expensive tabs that each have data
- Submitting a form that performs server-side validation
- Showing a "saving…" indicator next to a button during a mutation
```

**3. Pattern combination:**
```
Build a Todos UI combining: Suspense + ErrorBoundary (doc 12), useSuspenseQuery
for the initial load (doc 10), useOptimistic for adding/toggling, and
useTransition for filter switching. Show me the layered architecture.
```

## Checkpoints

1. What's special about `use()` compared to other hooks?
2. What does `useTransition` prevent that you'd otherwise see during slow updates?
3. What's the difference between `useOptimistic` and TanStack Query's `onMutate`-based optimistic update?
4. How does `useActionState` know when an action is pending?
5. What does `useFormStatus` read, and where must it be called from?
6. Why might you still prefer react-hook-form over `useActionState` for complex forms?

## Footguns

- **Throwing a brand-new promise into `use()` every render.** Each render creates a fresh promise; suspends forever. Stabilize the promise (memoize, or pass from a parent that doesn't re-render).
- **Wrapping non-state work in `startTransition`.** Only state updates inside the callback are marked as transitions. Side effects don't get the priority treatment.
- **Forgetting that `useOptimistic` doesn't roll back automatically.** When the real state lands (mutation finishes), the optimistic value is replaced. If your real state doesn't update on failure, the optimistic value stays. Pair with proper error handling.
- **Putting `useFormStatus` outside a `<form>`.** Returns `{ pending: false }` always — useless. Must be in a child of the form.
- **Mixing `onSubmit` and `action` on the same form.** Pick one. `action` is the new model; `onSubmit` is the old.
- **Treating `useActionState` as a state library.** It's for the action's result, not arbitrary state. Don't shoehorn UI state in there.
- **Forgetting Suspense around `use()`.** A `use()`-using component that suspends with no Suspense ancestor crashes — the suspension propagates up looking for a boundary.

## Ask-the-agent cheatsheet

- *"Convert this useState-isSubmitting pattern to useActionState. Keep the UX identical."*
- *"Wrap this tab switch in useTransition and adjust the UI to show a subtle pending indicator (dimmed previous tab) instead of a Suspense fallback."*
- *"Add useOptimistic to this 'send message' button so messages appear instantly with reduced opacity until confirmed."*
- *"This component uses `use(promise)` and re-creates the promise every render — it suspends forever. Fix it by stabilizing the promise."*
- *"Combine useSuspenseQuery (TanStack) with useOptimistic for this list. Read with Suspense; mutate with optimistic UI; invalidate the query on success."*

## Where this goes next

- **Doc 14** — Server Components, where these primitives reach their full power.
- **Doc 17** — Auth flows, including login forms with `useActionState`.
- **Doc 18** — WebSockets, where `useOptimistic` shines for chat-like UIs.
