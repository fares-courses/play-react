# 14 — Server Components mental model

## What you're learning & why it matters

You're learning what **React Server Components (RSC)** are, what problem they solve, and how to think about them — even though this Vite project is an SPA and doesn't use them. You should know RSC because:

1. The most popular React framework today (Next.js App Router) is built on RSC.
2. RSC reframes how data fetching, code splitting, and rendering interact — and the new mental model is increasingly the *default* in modern React.
3. Even when you don't use RSC, the patterns it enables (action-based mutations, streaming, server-driven boundaries) influence client-only React too.

This doc is **conceptual**. We won't build a Next.js app here; we'll just install the mental model so you understand RSC code when you see it and can decide whether your next project should use it.

### Terms first

- **Server Component**: a React component that runs **on the server**, not in the browser. It can do server-only things (DB queries, file reads) directly, and never ships its code to the browser.
- **Client Component**: a normal React component as you've been writing — runs in the browser, can use state/effects/event handlers.
- **`"use client"` directive**: a file-top marker (`"use client";` as the first line) that says "this file is a client component."
- **`"use server"` directive**: marks a function as a Server Action — a function that runs on the server but is called from the client.
- **Streaming**: the server starts sending HTML before the whole page is ready, so users see content faster.
- **RSC Payload**: the special wire format the server sends to the client describing the rendered tree.

## Mental model

> **Server Components are functions that run on the server, return UI, and can use server-only resources (DB, secrets, files). Client Components are functions that run in the browser. RSC is a way of choosing, per component, where it runs — and composing them naturally.**

In an SPA (your current setup), **everything is a client component** — there's no server side. In an RSC framework like Next.js App Router, components are server-by-default and you opt into "client" with `"use client"`.

## A concrete contrast

Old SPA pattern (your current world):
```tsx
// runs in the browser
function UsersPage() {
  const { data } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  if (!data) return <Spinner />;
  return <UserList users={data} />;
}
```
The browser fetches the JS bundle, mounts the component, fires a network request, gets data, renders.

Server Component pattern:
```tsx
// runs on the server
async function UsersPage() {
  const users = await db.users.findMany(); // direct DB call, no API
  return <UserList users={users} />;
}
```
The server runs `UsersPage`, queries the DB directly, renders to HTML/RSC payload, streams to the browser. The browser sees the page already populated. No client-side fetch. No spinner.

Server Components are async functions. The browser never executes their code. They never appear in your JS bundle. Secrets, DB credentials, server-only libraries — all safe.

## What server vs client components can do

| Capability | Server Component | Client Component |
|---|---|---|
| `await` async work | ✅ | ❌ (use `useEffect` or `use()`) |
| Direct DB access | ✅ | ❌ |
| Read environment secrets | ✅ | ❌ |
| `useState`, `useEffect`, hooks | ❌ | ✅ |
| Event handlers (`onClick`, etc.) | ❌ | ✅ |
| Render in browser | ❌ | ✅ |
| Render server-side, ship as HTML | ✅ | ❌ |
| Use browser-only libraries | ❌ | ✅ |

The split is "what runs where," and most components actually fit cleanly on one side.

## Composition: server inside client, and vice versa

The crucial rule: **Server Components can render Client Components, but Client Components cannot directly import Server Components.** They can, however, accept Server Components passed as `children` or props.

```tsx
// Server component
async function Page() {
  const posts = await db.posts.findMany();
  return (
    <Layout>                                {/* client */}
      <PostList posts={posts} />            {/* server */}
      <Comments postId={posts[0].id} />     {/* client (interactive) */}
    </Layout>
  );
}

// Client wrapper
"use client";
function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <div>{!collapsed && children}</div>;
}
```

You can mix them as long as data flows from server → client (server passes JSON-serializable props down). The boundary is: client components don't need to know they're surrounded by server ones.

## Server Actions ("use server")

The flip side: client → server function calls without writing a REST/GraphQL endpoint.

```tsx
"use server";
export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  await db.posts.create({ title });
  revalidatePath("/posts");
}
```

```tsx
"use client";
import { createPost } from "./actions";

export function NewPostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button>Create</button>
    </form>
  );
}
```

The client form calls the server function as if it were local. Behind the scenes, the framework serializes the call to an HTTP request. From the developer's perspective, you're just calling a function. Pairs naturally with `useActionState` (doc 14).

This replaces a lot of "client form → REST endpoint → controller" plumbing in many apps. **Note for your case:** if your backend is Rails (separate API), you typically *won't* use Server Actions — your API is your source of truth, and the React app is a client. Server Actions shine when the React framework owns both client and server (Next.js + Postgres, say). Worth understanding the pattern though, because in the future your app might consolidate or you might work in mixed environments.

## Why RSC matters even if you stay client-only

Even in a pure SPA, RSC's vocabulary is shaping React:

- **Components as boundaries of "where work happens"** — even client-only apps now think about Suspense and streaming explicitly.
- **Actions as a first-class concept** — `useActionState`, form `action={fn}`, `useFormStatus` all came from the RSC world but work in client apps too.
- **Less manual data-fetching code** — RSC pushes data fetching close to the component that uses it; SPA ecosystems are converging on similar (if you use TanStack Query close to the consumer, you're doing the same thing).

## When *should* you use RSC?

Rough decision guide:

**Use RSC (Next.js App Router or similar)** when:
- You're building a full-stack app, not just a frontend for an existing API.
- You want SEO, fast first paint, and minimal client bundle for content-heavy pages.
- Your team is willing to learn the new mental model.

**Stick with SPA (Vite + React Router + your Rails API)** when:
- You're a "frontend for a backend API" (your case).
- Your app is highly interactive after the initial load — dashboards, editors, tools — where SEO and first-paint don't matter as much.
- You want simple deployment (any static host).

For learning React, SPA is fine — and that's why this course uses it. RSC is a layer on top that you can adopt later if your context calls for it.

## Frameworks that implement RSC

- **Next.js (App Router)** — the dominant RSC implementation. If you're going to learn RSC for real, learn it here.
- **Remix → React Router 7** — Remix merged with React Router; the new versions have RSC support.
- **Waku, RedwoodJS, others** — smaller players experimenting.

If you decide to try RSC, build a small Next.js project alongside this one and port a feature.

## How to use this doc with an agent

**1. Conceptual quiz:**
```
Quiz me on RSC concepts from doc 15. Cover:
- Difference between server and client components
- What "use client" and "use server" mean
- The composition rule (who can render whom)
- When Server Actions are useful and when they're not
- Why I'd choose RSC vs an SPA for a given project
Ask one question at a time, stop after 6.
```

**2. "Where does this run" sorter:**
```
For each of these components, decide whether it should be a server component
or a client component (or both, with a split). Justify each:

1. A page that lists products from a database
2. A search box that filters a list as the user types
3. A footer with copyright info
4. A real-time chat panel
5. A login form
6. A nav menu that highlights the current route
7. A "trending posts" sidebar that reads from the DB
8. An infinite-scroll list
```

**3. Migration thought experiment:**
```
Imagine I have a Next.js Pages-Router app (old style) with these screens:
- List of users (fetched in getServerSideProps)
- Edit user form
- A real-time notifications widget in the layout
Sketch how I'd port this to App Router with RSC. What becomes a server
component, what becomes "use client", where do I put server actions?
```

## Checkpoints

1. What's the fundamental difference between a server and a client component?
2. Why can't you use `useState` in a server component?
3. What's the rule for who-can-render-whom between server and client components?
4. What's a Server Action and how does it relate to the form `action={...}` prop?
5. Why might a Rails-API + SPA app *not* benefit from Server Actions?
6. When would you choose a Next.js (RSC) project vs a Vite SPA project?

## Footguns

- **Importing server-only code from a client component.** Bundlers throw at build time. Move the dependency or split the file.
- **Trying to use hooks in a server component.** Server components don't have state, effects, or event handlers. Lift the interactivity into a client component.
- **Passing non-serializable props from server to client.** Functions, Dates that aren't ISO strings, class instances — these can't cross the boundary. Stick to JSON-safe data.
- **Putting `"use client"` everywhere.** Defeats the point of RSC (zero JS for content). Default to server, opt into client only where interactivity demands it.
- **Forgetting that Server Actions are HTTP calls under the hood.** They have latency. Don't call one in a tight loop.
- **Confusing "rendered on the server" with "Server Component."** Old SSR (Pages Router) renders client components on the server too. RSC is different — it's a separate kind of component.
- **Trying to use RSC with a separate Rails API.** Possible but mostly redundant — your API is already the server. RSC's biggest wins (DB-direct components, server actions) are wasted when there's a backend already doing those jobs.

## Ask-the-agent cheatsheet

- *"For this component, decide whether it's better as a server or client component, considering whether it needs state, event handlers, or DB access. Justify your choice."*
- *"This file mixes interactive bits and static data fetching. Split it into a server component (the data part) and a client component (the interactive part) using the children-prop pattern."*
- *"Convert this REST endpoint + form fetch flow to a Server Action. Show me the before/after."*
- *"I'm building [project description] with a separate Rails API. Tell me honestly: would RSC help here, or is SPA + TanStack Query the right fit?"*

## Where this goes next

- **Doc 16** — Testing. Same principles whether SPA or RSC.
- **Doc 17** — Tooling and shipping. Vite, accessibility, bundle awareness.
- **Doc 18** — Auth flows. Differs slightly in RSC (cookies + middleware) vs SPA (Bearer tokens) — we'll do SPA-style and note the RSC variant.
