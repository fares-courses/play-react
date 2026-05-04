# 02 — Components, JSX, and TypeScript for props

## What you're learning & why it matters

You're learning the three things you'll use in every single React file you ever write:

1. **Components** — how to define one, how to compose them, how to think about them.
2. **JSX** — the HTML-looking syntax inside React code, and what it actually compiles to.
3. **TypeScript for props** — how to declare what data a component accepts, so the agent (and your future self) can't pass the wrong thing without an error.

Why this matters: in doc 01 you learned the runtime model (`UI = f(state)`). This doc is about the **shape of the function** — what it takes as input, what it returns, and how to lock that down with types. Most "the agent generated something subtly wrong" moments are caught by good prop types. They're cheap insurance.

## A short TypeScript primer for backend devs

You're going to see TS syntax throughout the course. Here's the 20% that covers 80% of React work. Skim it; you don't need to memorize.

**Type annotation.** You add `: SomeType` after a variable name to declare its type:
```ts
const userId: number = 42;
const userName: string = "Fares";
```
Most of the time you'll let TS *infer* the type from context and won't write the annotation explicitly. You write annotations mainly on **function parameters** and **return types** when they're not obvious.

**Type alias** (your most-used tool).
```ts
type User = {
  id: number;
  name: string;
  email: string;
};
```
Same idea as a struct or a Ruby class with attribute names. You use `User` anywhere you'd otherwise write that whole shape.

**Interface** — almost the same as `type`, slightly different in edge cases. For React props, both are fine; this course uses `type` for consistency.

**Optional fields** — add `?`:
```ts
type User = {
  id: number;
  name: string;
  nickname?: string; // may or may not be present
};
```

**Union types** — "this OR that":
```ts
type Status = "loading" | "success" | "error";
type ID = number | string;
```
The pipe `|` means "any one of these." Powerful for component variants — a Button's `variant` prop can be `"primary" | "secondary" | "danger"` and TS will reject anything else.

**Generics** — types that take type parameters, like Ruby's "duck typing but checked." You'll see `useState<number>(0)` to say "this state holds a number." Read `<Foo>` as "the type parameter is Foo." Most of the time, TS infers it from the initial value, so you rarely write it.

**Utility types you'll see often:**
- `Partial<User>` — same as `User` but every field optional.
- `Pick<User, "id" | "name">` — `User` but only those two fields.
- `Omit<User, "email">` — `User` without the email field.
- `Readonly<User>` — `User` but every field immutable.

That's enough TS to read this whole course. Other syntax gets defined as it appears.

## Components: what they actually are

A **component** in modern React is a JavaScript function that:
1. Takes one argument: an object called **props** (short for "properties" — the inputs to the component).
2. Returns a description of UI (JSX, which we'll cover in a moment).

That's it. There's no class, no lifecycle, no special framework registration — it's just a function. The convention is that component function names start with a **capital letter** (`Button`, not `button`), because React uses that capitalization to distinguish your components from built-in HTML tags.

```tsx
function Greeting(props: { name: string }) {
  return <h1>Hello, {props.name}</h1>;
}
```

Reading that:
- `Greeting` is the component name.
- `props: { name: string }` says: this function takes one argument, an object with a single field `name` that's a string. If you call `<Greeting name={42} />` somewhere, TS errors out before you even run the code.
- The body returns a description of an `<h1>` containing the text `Hello, ` followed by the value of `props.name`.

You **use** the component by writing it as a tag:
```tsx
<Greeting name="Fares" />
```
That's syntactic sugar for `Greeting({ name: "Fares" })` — it's just a function call dressed up to look like an HTML element.

### Destructuring props (you'll see this everywhere)

Instead of writing `props.name`, idiomatic React destructures the props object right in the parameter list:
```tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}
```
Functionally identical. Just shorter. You'll see this in 99% of real-world code.

### Pulling the props type out

For anything more than one or two props, you give the props type its own name:
```tsx
type GreetingProps = {
  name: string;
  excited?: boolean;
};

function Greeting({ name, excited = false }: GreetingProps) {
  return <h1>Hello, {name}{excited && "!"}</h1>;
}
```
Notice `excited = false` — that's a default value if the caller doesn't pass `excited`. And `excited && "!"` is a JS idiom: if `excited` is true, evaluate to `"!"`; otherwise evaluate to `false`. React renders strings, but it ignores `false`/`null`/`undefined`. So this conditionally appends a `!`.

## JSX: the HTML-looking thing

**JSX** is the syntax that lets you write `<button>Click</button>` inside JavaScript. It is **not** HTML. It's a syntax extension to JavaScript that compiles to function calls. Under the hood:

```tsx
<button onClick={handleClick}>Click</button>
```
becomes (roughly):
```ts
React.createElement("button", { onClick: handleClick }, "Click");
```
That `createElement` call returns a plain JavaScript object — a description of "a button element with these props and these children." React's reconciler (doc 01) takes a tree of those objects and figures out what to do with the real DOM.

You almost never call `createElement` directly. You write JSX. But it helps to know that's what's happening, because it explains the rules:

### JSX rules that catch you off guard coming from HTML

- **`class` is `className`.** `class` is a reserved word in JavaScript, so React renamed it.
- **`for` is `htmlFor`.** Same reason.
- **All attributes are camelCase.** `onclick` → `onClick`, `tabindex` → `tabIndex`, `readonly` → `readOnly`.
- **Self-closing tags must close themselves.** `<br>` is HTML; `<br />` is JSX. Same for `<img />`, `<input />`.
- **Curly braces `{...}` embed any JS expression.** `<p>Total: {price * quantity}</p>` — anything inside `{}` is executed JS, and the result is rendered.
- **Strings vs expressions in props.** `<input type="text" />` is a string literal. `<input type={someVariable} />` is an expression. Use quotes for static strings, braces for dynamic values.
- **You can only return one root element from a component.** If you need to return multiple siblings without a wrapper, use a **Fragment**: `<>...</>`. It's an empty tag that groups children without adding a DOM node.

### What can go inside `{}`

Anything that's a JavaScript expression — meaning anything that *evaluates to a value*. Statements like `if` or `for` don't work directly inside JSX. You'll use these patterns:

**Conditional rendering with `&&`:**
```tsx
{isLoggedIn && <LogoutButton />}
```
If `isLoggedIn` is true, render the button. If false, render nothing (`false` is ignored by React).

**Conditional rendering with ternary:**
```tsx
{isLoggedIn ? <LogoutButton /> : <LoginButton />}
```

**Lists with `.map()`:**
```tsx
{users.map(user => <UserCard key={user.id} user={user} />)}
```
The `key` prop is required for lists — it's how React identifies which item is which across re-renders. Use a stable unique ID (typically the database ID). Never use the array index as a key unless the list is static and never reordered (we'll cover *why* in doc 05).

`key` is a built-in React prop — you don't declare it in your Props type.


## Children: components nesting components

Components can take other JSX as a special prop called `children`. This is how composition works.

```tsx
type CardProps = {
  title: string;
  children: React.ReactNode;
};

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </div>
  );
}

// Used like:
<Card title="Profile">
  <p>Name: Fares</p>
  <p>Role: Backend dev</p>
</Card>
```

`React.ReactNode` is the type for "anything React can render" — strings, numbers, JSX, arrays of those, `null`. Use it for `children` 99% of the time.

This is how UI gets composed: small components take `children` and wrap them. A real app's component tree is mostly nesting like this.

You don't pass children as a normal attribute like title. Instead, you place the content

## Typing event handlers

Common props that accept functions:

```tsx
type ButtonProps = {
  label: string;
  onClick: () => void;             // a function taking no args, returning nothing
  onSubmit?: (value: string) => void; // optional, takes a string
};
```

For DOM events specifically (when you need the event object):
```tsx
function MyInput() {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    console.log(e.target.value);
  }
  return <input onChange={handleChange} />;
}
```
You won't memorize these event types — you'll let the agent generate them, or hover the prop in your editor and copy the type from the tooltip. The pattern is `React.SomethingEvent<HTMLSomethingElement>`.

## How to use this doc with an agent

**1. Generate the lesson:**
```
In src/lessons/02-components/, build a small example demonstrating components,
JSX, and TypeScript props. Specifically:

- A `Card` component that takes a `title: string` and `children: React.ReactNode`
- A `Badge` component with a `variant: "info" | "warning" | "danger"` prop
  that changes its background color, and a `children` prop for the label
- A `UserList` component that takes `users: { id: number; name: string;
  role: string }[]` and renders each as a Card containing a Badge for the role
- Wire it up in src/App.tsx with 3-4 fake users

Use TypeScript strictly. Define a separate `type FooProps = ...` for each
component's props. No `any`. Add brief comments at the top of each component
explaining what it demonstrates.
```

**2. Break it on purpose to feel the type system:**
```
Now intentionally introduce three TypeScript errors so I can see what they
look like:
1. Pass a number where the Card title (string) is expected
2. Pass a variant value not in the union ("success" instead of info/warning/danger)
3. Forget to pass a required prop entirely
For each one, paste me the exact error message TypeScript produces, and
explain what part of the type definition triggered it.
```
Run `npm run dev` and look at the terminal output, or hover the red squiggles in your editor to see the messages.

**3. Refactor to feel composition:**
```
Refactor the UserList so the Badge styling lives entirely inside the Badge
component (no styling logic leaks out). Then add a new variant "success"
to Badge and use it for one of the users. Show me the diff.
```

**4. Quiz prompt:**
```
Quiz me on doc 02 — components, JSX, TypeScript props. Ask one question at
a time. Cover: what JSX compiles to, why class is renamed to className,
what React.ReactNode means, when to use union types vs string for a prop,
and one footgun. Stop after 5 questions.
```

## Checkpoints

1. What does JSX compile to under the hood? Why does that matter for understanding the rules (e.g. why `class` is `className`)?
2. What's the difference between `<Greeting name="Fares" />` and calling `Greeting({ name: "Fares" })` directly? (Trick — they're nearly equivalent.)
3. Why must component names start with a capital letter?
4. When should a prop be a union of string literals (`"info" | "warning"`) versus just `string`?
5. What's the type for "any valid React child," and where do you typically use it?
6. Why does each item in a `.map()`-rendered list need a `key`, and why is using the array index dangerous?

## Footguns

- **Forgetting `key` on list items.** React warns you in the console, but it's easy to ignore. Use a stable unique ID. Array index works only if the list never reorders, never gets items inserted/removed in the middle, and never filters. In practice, just always use a real ID.
- **Returning multiple sibling elements without a wrapper.** A component must return one root. If you don't want an extra `<div>`, use a Fragment: `<>...</>`.
- **Conditional rendering with numbers.** `{count && <Foo />}` — if `count` is `0`, this renders the literal `0` on the page (because `0` is falsy in JS, but React renders numbers, not skips them like `false`). Use `{count > 0 && <Foo />}` or `{count ? <Foo /> : null}`. (Different Behavior than Ruby)
- **Mutating props.** Props are read-only. If you need to "modify" something a parent gave you, ask the parent for an update (pass a callback prop). Treat props like immutable inputs to a pure function — because that's what they are.
- **Reaching for `any` when types feel hard.** `any` turns off type checking for that value and quietly poisons everything it touches. If you don't know the type, use `unknown` (forces you to narrow before using it) or ask the agent to type it properly. The whole point of TS is to catch the agent's mistakes — `any` defeats that.
- **Inline object/array props recreate on every render.** `<Foo style={{ color: "red" }} />` creates a new object every render. Usually fine, but it can break memoization (doc 09). Worth knowing exists; don't preemptively optimize.

## Ask-the-agent cheatsheet

- *"Generate a `<Foo>` component with strict TypeScript types. Define a separate `type FooProps` and use it as the parameter annotation. No `any`."*
- *"This prop should only accept these specific values: A, B, C. Use a union of string literals."*
- *"Add proper TypeScript types to this component's event handlers. Use the `React.SomethingEvent<HTMLSomethingElement>` pattern."*
- *"Refactor this so any styling logic for variants lives inside the component, not in the caller."*
- *"This component is taking too many props. Help me identify which ones could be replaced by `children` for better composition."*

## Where this goes next

- **Doc 03** — Composition patterns. Once you've got components and JSX down, the next leap is patterns for composing them: `children`, slots, compound components, render props. This is how real component libraries are built.
- **Doc 04** — Hooks: the concept. The rules and mental model that govern every hook you'll meet from doc 05 onward.
- **Doc 05** — State in depth. We pick up `useState` and add `useReducer`, plus the question of *where* state should live.
