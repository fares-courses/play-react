# 03 — Composition patterns

## What you're learning & why it matters

You're learning the patterns that let small components combine into bigger ones without becoming a tangled mess. In a backend, you compose behavior with modules, mixins, service objects, and inheritance. In React, you compose UI almost exclusively through **nesting components** — but there are several distinct patterns for *how* you nest, and picking the right one is the difference between a clean codebase and one where every component takes 30 props.

Why this matters now: as soon as your app has more than a handful of components, you'll hit the question "should this be one big component with options, or several small components that fit together?" The answer is almost always the second — but only if you know the patterns to make it ergonomic.

### A few terms first

- **Prop drilling**: passing a prop down through many layers of components just so a deep child can use it. Annoying, makes refactoring hard. Composition patterns reduce this.
- **Slot**: a "hole" in a component where the caller plugs something in. In React, slots are usually just props that accept JSX.
- **Render prop**: a prop that is *itself* a function returning JSX. The component calls it during rendering and inserts the result.
- **Compound component**: a set of components that are designed to be used together (like `<Tabs>` containing `<TabList>` containing `<Tab>`). They share state implicitly.

## Mental model

> **Components are like LEGO blocks. Props are the studs. The patterns in this doc are different shapes of stud.**

Every composition pattern is answering one question: **"how does the parent let the child do/show something the parent decides?"** The patterns differ in *how flexible* that handoff is and *who controls what*.

## Pattern 1 — `children` (the default, use first)

You saw this in doc 02. A component takes whatever JSX you nest inside it via the `children` prop.

```tsx
type CardProps = { children: React.ReactNode };

function Card({ children }: CardProps) {
  return <div className="card">{children}</div>;
}

<Card><h2>Hello</h2><p>World</p></Card>
```

**When to use:** the component is a *wrapper* and doesn't care what's inside. Layouts, cards, modals, panels, list containers.

**Strength:** maximum flexibility — caller decides everything that goes inside.
**Weakness:** if you need *multiple* slots (a header AND a body AND a footer), `children` alone isn't enough. That's pattern 2.

## Pattern 2 — Multiple slots (named children via props)

When you need more than one "hole," accept JSX through named props instead of (or alongside) `children`.

```tsx
type LayoutProps = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode; // the main content
};

function Layout({ header, sidebar, children }: LayoutProps) {
  return (
    <div className="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

<Layout
  header={<TopBar />}
  sidebar={<Nav />}
>
  <DashboardContent />
</Layout>
```

**When to use:** a component has 2–4 distinct regions the caller fills.

**Strength:** explicit, type-safe (each slot can have its own type).
**Weakness:** with 5+ slots it gets unwieldy. That's when you reach for compound components.

## Pattern 3 — Compound components

A set of components designed to work as a group. Classic examples: `<Tabs>` / `<Tab>` / `<TabPanel>`, `<Select>` / `<Option>`, `<Form>` / `<Field>`.

The "compound" part: the outer component holds shared state, and the inner components read from it implicitly (usually via Context — doc 07). The caller composes them like HTML tags but they cooperate behind the scenes.

```tsx
<Tabs defaultTab="overview">
  <TabList>
    <Tab id="overview">Overview</Tab>
    <Tab id="settings">Settings</Tab>
  </TabList>
  <TabPanel id="overview">Overview content</TabPanel>
  <TabPanel id="settings">Settings content</TabPanel>
</Tabs>
```

`<Tabs>` keeps track of which tab is active. `<Tab>` reads that state to know if it's selected and dispatches a click to change it. `<TabPanel>` reads it to decide whether to render. The caller never wires up state — they just nest the pieces.

**When to use:** you're building a reusable UI primitive with multiple cooperating parts, or you want callers to have flexibility in *ordering* and *which parts to include*.

**Strength:** very ergonomic API for users; flexible structure.
**Weakness:** more setup; uses Context which we haven't covered yet (doc 07). Don't reach for this until you've felt the pain that justifies it.

## Pattern 4 — Render props

A prop that is a function returning JSX. The component calls it with some data and inserts the result.

```tsx
type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item)}</li>)}</ul>;
}

<List
  items={users}
  renderItem={(user) => <span>{user.name} ({user.email})</span>}
/>
```

The `<T>` thing on the function and type is **generics** — `T` is a placeholder for "whatever type the caller's items are." TS infers it from the `items` prop, so the `renderItem` callback knows its argument is a `User` automatically.

**When to use:** the component owns *behavior* (iteration, data fetching, drag state, virtualization) but doesn't know how things should look. Render props let the caller control the appearance.

**Strength:** highly reusable — one component handles logic, infinite UI variations.
**Weakness:** can get nesty (`render prop returning a render prop`). Modern alternative: extract the behavior into a custom hook (doc 04 + 05) and let the caller do their own rendering.

## Pattern 5 — Polymorphic components (the `as` prop)

A component that can render as different HTML elements depending on a prop:

```tsx
<Button as="a" href="/profile">Profile</Button>  // renders an <a>
<Button as="button" onClick={save}>Save</Button>  // renders a <button>
```

The `as` prop tells the component what underlying tag to use. Common in design systems. Typing this properly in TS is genuinely tricky — when you need it, ask the agent to generate the types and don't try to write them from memory. We won't go deep here.

## Choosing between patterns (quick guide)

| You need… | Use |
|---|---|
| A wrapper with one fillable area | `children` |
| 2–4 distinct regions to fill | Multiple slot props |
| A reusable group with cooperating parts | Compound components |
| Reusable behavior, custom appearance | Render prop *or* custom hook |
| Same component, different HTML tag | Polymorphic (`as`) |

When in doubt, start with `children`. Promote to a more elaborate pattern only when you feel the pain.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/03-composition/, build four small examples in one file:
1. A `<Card>` component using just `children`
2. A `<PageLayout>` component with `header`, `sidebar`, and `children` slot props
3. A compound `<Disclosure>` / `<Disclosure.Trigger>` / `<Disclosure.Panel>`
   that shows/hides content (use useState; we'll learn Context in doc 07)
4. A generic `<DataTable<T>>` component using a render-prop pattern for
   how each row should be rendered

Wire all four into src/App.tsx so I can see them on the page. Use TypeScript
strictly. Keep each example small enough to read in one screen.
```

**2. Refactor exercise (the most valuable thing in this doc):**
```
Here's a component that takes 12 props including `headerText`, `headerColor`,
`showFooter`, `footerActions`, `bodyContent`, `bodyClassName`, etc.
[paste a fake 12-prop component]
Refactor it into a composition-based design. Identify which pattern fits each
piece (children, slots, compound, render prop) and explain your choices. Show
me the before-vs-after caller code so I can see the readability difference.
```

**3. Pattern-recognition quiz:**
```
For each of these scenarios, tell me which composition pattern fits best
and why:
1. A modal that needs different content per use case
2. A tabs UI where the user picks which tab is active
3. A virtualized list that renders 10,000 rows efficiently — caller chooses
   how each row looks
4. A "Link" that's sometimes an anchor, sometimes a button
5. A "Page" with a fixed header, dynamic sidebar, and main content
```

## Checkpoints

1. What's prop drilling, and which patterns in this doc reduce it?
2. When does `children` stop being enough? What do you reach for next?
3. What's the difference between a render prop and just passing JSX as a prop?
4. Why is "start with `children`, escalate only when needed" a good default?
5. Compound components share state behind the scenes — what mechanism is React going to use for that (foreshadowing doc 07)?

## Footguns

- **Inventing patterns prematurely.** Beginners read about render props and compound components and immediately apply them everywhere. Almost every component should be plain props + children. Use the fancier patterns only when a real component takes too many props or has too rigid a structure.
- **Using `children` for things that should be a named slot.** If your component needs to know "is this child the header or the footer?", you don't want `children` — you want named slot props. Inspecting `children` to figure out what's inside is fragile and defeats the point.
- **Render-prop nesting hell.** `<DataA>{a => <DataB>{b => <DataC>{c => ...}}</DataC>}</DataB>}</DataA>` — when this happens, switch to custom hooks instead.
- **Forgetting to type generic render props.** If you write `renderItem: (item: any) => ...`, you've thrown away type safety. Use generics so the callback's argument is properly typed from the items prop.

## Ask-the-agent cheatsheet

- *"This component takes too many props. Refactor it using composition. Suggest the right pattern (children / slots / compound / render prop) and explain why."*
- *"Convert this render-prop component into a custom hook + caller-rendered JSX. Show me both versions side-by-side."*
- *"Build a compound component for [feature] using Context for shared state. Make the API ergonomic — I want to be able to skip optional parts."*
- *"Make this `<Foo>` component polymorphic — it should accept an `as` prop that defaults to `div` but can be any HTML element. Type it correctly."*

## Where this goes next

- **Doc 04** — State in depth. Now that you can compose components, where does the *state* live? `useState`, `useReducer`, lifting state up, when to colocate.
- **Doc 07** — Context, which is the wiring underneath compound components.
