# 00-intro — Frontend for the backend developer

Read this before anything else. It is not about React. It's about the world React lives in — the browser, the languages it speaks, the jargon you'll hear constantly, and how to use an AI agent for frontend work specifically. None of this needs to be memorized. It needs to be understood once so nothing in the rest of the course catches you completely off guard.

---

## Part 1 — What "frontend" actually means

You write APIs. A request comes in, work happens, JSON goes out. The requester could be a mobile app, a curl command, another service, or a browser. You never had to care which — the response was the same.

**Frontend** is the code that runs *inside the browser* and turns your JSON into something a human can see and click. It is the last mile: your API did everything right, but if the frontend is broken, the user sees nothing.

The browser is not a server. It has no file system, no database, no background jobs. It has:
- A **rendering engine** that turns HTML + CSS into pixels on screen.
- A **JavaScript engine** (V8 in Chrome/Node, SpiderMonkey in Firefox) that runs your JS code.
- A set of **Web APIs** — built-in objects and functions the browser exposes to JS: `fetch`, `localStorage`, `WebSocket`, `setTimeout`, the DOM, and many more.

Everything you'll write in React ultimately targets this environment.

### The three languages of the browser

Every browser understands exactly three languages natively:

| Language | What it does |
|---|---|
| **HTML** | Describes the *structure* and *content* — what elements exist and what they contain. |
| **CSS** | Describes the *appearance* — colors, sizes, layout, spacing, animations. |
| **JavaScript** | Describes *behavior* — what happens when the user does something, how data flows, what changes over time. |

React is JavaScript. JSX (the HTML-looking syntax) compiles to JavaScript. TypeScript compiles to JavaScript. Vite bundles everything into JavaScript. In the end, the browser runs JavaScript and uses it to create HTML elements and CSS styles. That's the full stack.

You don't write raw HTML and CSS in a React app very often — React generates HTML for you and your CSS lives in `.css` files or utility classes. But you need to read and understand both, because React's JSX mirrors HTML closely, and any visual problem eventually leads to a CSS question.

---

## Part 2 — How the browser renders a page

When a user visits your app's URL, this happens:

1. **DNS lookup** → resolves the domain to an IP.
2. **TCP + TLS handshake** → establishes a secure connection.
3. **HTTP GET** → browser requests `index.html`.
4. **HTML arrives** → browser starts parsing it top-to-bottom.
5. **CSS discovered** → browser requests CSS files; pauses rendering until they arrive (CSS is render-blocking by default).
6. **JS discovered** → browser requests JS files; may pause parsing.
7. **DOM constructed** → browser turns the HTML into an in-memory tree of elements.
8. **CSSOM constructed** → browser turns CSS rules into an in-memory style tree.
9. **Render tree** → DOM + CSSOM merged.
10. **Layout** → browser figures out where each element goes and how big it is.
11. **Paint** → browser draws pixels.
12. **JavaScript runs** → JS can now read and modify the DOM, fire requests, set timers.

For a React SPA (single-page application), step 3 gives the browser a tiny `index.html` with almost no visible content — just a `<div id="root"></div>` and a `<script>` tag. JavaScript then runs, builds the entire UI, and inserts it into that div. This is why SPAs can feel blank for a fraction of a second on first load — the visible content depends on JS running.

This flow is also why the terms SSR (Server-Side Rendering), hydration, and code splitting matter — they're all techniques to make step 12 feel faster.

---

## Part 3 — The jargon glossary

These terms come up constantly across docs, GitHub issues, blog posts, and conversations with frontend engineers. Understand them now so they don't break your flow later.

### HTML/DOM

- **DOM (Document Object Model)** — the browser's in-memory, live tree of all elements on the page. JavaScript reads and modifies it. React generates a description of what the DOM *should* look like; the browser applies the actual changes.
- **Element / Node** — one item in the DOM tree. A `<button>`, a `<p>`, a text node — all are nodes.
- **Attribute** — extra info on an HTML tag: `<input type="text" id="email">`. `type` and `id` are attributes.
- **Event** — something that happens: click, keydown, submit, resize, load. You attach functions to events via `addEventListener` (or in React, via `onClick={...}` etc.).
- **Semantic HTML** — using the *right* HTML element for its meaning: `<button>` for actions, `<nav>` for navigation, `<main>` for the main content, `<article>` for a standalone piece of content. Matters for accessibility and SEO (Search Engine Optimization).
- **ARIA** — "Accessible Rich Internet Applications." When you build a standard website using only basic HTML tags, the browser automatically tells assistive devices (like screen readers) what everything is. But as soon as you start building complex, modern web apps with React, you often create custom components that don't have a "standard" HTML tag. That is where ARIA comes in. Extra attributes (`role`, `aria-label`, `aria-hidden`) that communicate semantics to screen readers when plain HTML isn't enough.
- **Accessibility (a1y)** — ensuring your app works for everyone, including people with disabilities. ARIA, semantic HTML, proper contrast, keyboard navigation, and screen reader testing are all part of a1y.
- **SEO** — Search Engine Optimization. The art and science of making your website look "attractive" to search engines like Google, Bing, or DuckDuckGo so they rank you higher in search results.

### CSS

- **Selector** — the part of a CSS rule that says *which elements* it applies to: `.card`, `button:hover`, `#header > nav`.
- **Specificity** — a ranking system: if two rules target the same element, the more *specific* one wins. IDs beat classes beat tags. This causes a large fraction of "why isn't my CSS working?" bugs.
- **Box model** — every element is a rectangular box: content → padding → border → margin. `width` and `height` set the content area; `padding` is inside the border; `margin` is outside.
- **Block vs inline** — by default, block elements (`<div>`, `<p>`) stack vertically and take full width. Inline elements (`<span>`, `<a>`) flow with text horizontally.
- **Flexbox** — a CSS layout mode for arranging items in a row or column, distributing space, aligning them. The default tool for most UI layout.
- **Grid** — a CSS layout mode for two-dimensional layout (rows and columns simultaneously). Powerful for page structure.
- **Cascade** — the "C" in CSS. Rules fall through multiple sources (browser defaults → third-party → your styles) and the final value is determined by specificity and order.
- **`rem` / `em`** — relative units. `1rem` = the root font size (usually 16px). `1em` = the current element's font size. More scalable than px for text and spacing.
- **Media query** — CSS condition on the viewport size: `@media (max-width: 768px) { ... }`. Makes CSS responsive to screen width.
- **Viewport** — the visible area of the browser window, not counting the browser chrome (tabs, address bar). `100vw` = full viewport width, `100vh` = full height.
- **z-index** — controls stacking order on the z-axis (what's "on top"). Modals need high z-index. Can cause mysterious "I can't click this" bugs.

### JavaScript / Build

- **ES Module (ESM)** — the modern standard for JS files that import/export. `import { foo } from "./foo"`. This is what you use in React and what modern browsers understand natively.
- **CommonJS (CJS)** — the older Node.js module system: `const foo = require("./foo")`. You'll see it in older configs; not used in your React code.
- **Transpile** — convert newer JavaScript/TypeScript syntax into something older browsers can run. Vite uses `esbuild` for this.
- **Bundle** — take many JS files (`imports` of `imports` of `imports`) and stitch them into one (or a few) files the browser can load efficiently. Vite + Rollup does this for production builds.
- **Bundler** — the tool that does the above (Vite, webpack, Rollup, esbuild, Parcel).
- **Minify** — strip whitespace, shorten variable names, remove comments from JS/CSS to reduce file size. Production builds are always minified.
- **Tree shaking** — removing code that's imported but never actually used. The bundler traces what your app uses and discards the rest.
- **Source map** — a companion file that maps minified production code back to your original source. When an error appears in production, source maps let you see the real file and line number.
- **Hot Module Replacement (HMR)** — Vite's dev-server feature. When you save a file, only that module is updated in the running app, preserving state. Faster than a full page reload.
- **`node_modules`** — the directory where `npm install` puts your dependencies. Never commit it; it's regenerated from `package.json` + `package-lock.json`.
- **`package.json`** — your project's manifest: name, scripts (`dev`, `build`, `test`), dependencies, devDependencies.
- **`package-lock.json`** — the exact resolved versions of every transitive dependency. Commit this — it ensures every developer gets the same packages.
- **`devDependencies`** — packages needed only during development/build (Vite, TypeScript, ESLint). Not shipped to users.
- **`dependencies`** — packages needed at runtime in the browser (React, TanStack Query). Bundled into your build output.

### React / SPA specific

- **SPA (Single-Page Application)** — one HTML file. JavaScript builds and manages all the "pages" inside it. URL changes without full page reloads. Your project is an SPA.
- **MPA (Multi-Page Application)** — traditional: each URL is a separate HTML response from the server.
- **CSR (Client-Side Rendering)** — the HTML you get from the server is mostly empty; JavaScript renders the UI in the browser. SPAs use CSR.
- **SSR (Server-Side Rendering)** — the server runs your React code and sends back populated HTML. Faster first paint, better SEO. Next.js and Remix do this.
- **SSG (Static Site Generation)** — HTML is generated at *build time* (not per-request). Good for content sites that don't change per-user.
- **Hydration** — after SSR sends populated HTML to the browser, React "takes over" the existing DOM by attaching event listeners and making it interactive. The process is called hydration.
- **Code splitting** — breaking the JS bundle into smaller chunks, loading each only when needed. Visiting `/login` shouldn't download the code for `/admin`.
- **Lazy loading** — loading something (a component, an image, a chunk) only when it's about to be needed, not upfront.
- **Virtual DOM** — an old React concept. React keeps an in-memory description of the UI, diffs it against the previous one, and applies only the minimal real DOM changes. "Virtual DOM" just means "React's description of what the DOM should look like."
- **Reconciliation** — the diffing process React uses to figure out what actually changed and needs to be updated in the real DOM.
- **JSX** — the HTML-looking syntax in React files. Not HTML. Compiled to JavaScript `React.createElement(...)` calls. Lives in `.tsx`/`.jsx` files.
- **Component** — a JavaScript function that returns JSX.
- **Props** — the inputs to a component. Passed like HTML attributes. Read-only inside the component. (More in the next lessons)
- **State** — data a component owns that, when changed, triggers a re-render. (More in the next lessons)
- **Hook** — a special function (starting with `use`) that lets components tap into React's features (state, effects, refs, context). (More in the next lessons)
- **Re-render** — calling the component function again. Cheap. Happens a lot. Not the same as a DOM update.

### Network / Auth / Ops

- **REST API** — the kind you write in Rails. HTTP verbs + resource paths. JSON in, JSON out.
- **CORS (Cross-Origin Resource Sharing)** — browser security policy that blocks JS from making requests to a different origin (domain/port/protocol) unless the server explicitly allows it. Your SPA at `localhost:5173` fetching your Rails API at `localhost:3000` hits this in dev. Fix: add `Access-Control-Allow-Origin` headers on the Rails side.
- **Origin** — `protocol + host + port`. `http://localhost:5173` and `http://localhost:3000` are different origins.
- **JWT (JSON Web Token)** — a signed, base64-encoded token containing claims (user ID, expiry). Server issues it on login; client sends it on every subsequent request.
- **Bearer token** — convention for sending a token in the HTTP `Authorization: Bearer <token>` header.
- **Cookie** — a browser-stored key/value set by the server via a `Set-Cookie` response header. Automatically sent on subsequent requests to the same origin. `httpOnly` cookies can't be read by JS; `SameSite` limits cross-site sending.
- **CDN (Content Delivery Network)** — a globally distributed network of edge servers. Your static files (`index.html`, JS bundles, images) are served from the edge closest to the user. Fast. Vercel, Cloudflare, and AWS CloudFront are examples.

### Performance

- **First Contentful Paint (FCP)** — the moment any visible content first appears. A commonly measured performance metric.
- **Time to Interactive (TTI)** — when the page is fully interactive (JS has loaded, event handlers attached).
- **Lighthouse** — Google's automated tool (built into Chrome DevTools) that audits performance, accessibility, SEO, best practices. Gives scores 0–100.
- **Core Web Vitals** — Google's set of user-experience metrics: LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), INP (Interaction to Next Paint).
- **Bundle size** — how large your JS (and CSS) is. Affects load time, especially on mobile. Check with `npm run build` and look at the output.
- **Lazy chunk** — a piece of your bundle that loads on demand, not upfront.

---

## Part 4 — The minimum HTML you need to read React

You won't write raw HTML often. But JSX mirrors it closely, so you need to recognize the elements that appear in component output.

### Structure elements (layout)

```html
<div>      Generic container — no semantic meaning. A box.
<span>     Generic inline container — flows with text.
<main>     The main content area of the page. One per page.
<header>   Page or section header.
<footer>   Page or section footer.
<nav>      Navigation links.
<aside>    Sidebar or tangential content.
<section>  A themed group of content.
<article>  A standalone, self-contained piece of content.
```

### Text elements

```html
<h1> to <h6>    Headings. h1 is the largest/most important; h6 the smallest.
<p>             A paragraph.
<span>          Inline text without semantic meaning.
<strong>        Bold, semantically important.
<em>            Italic, semantically emphasized.
<code>          Inline code.
<pre>           Preformatted text (preserves whitespace/newlines).
<br />          A line break. (Always self-closing in JSX.)
```

### Interactive elements

```html
<button>        A clickable button. Always use for actions.
<a href="...">  A link. Always use for navigation.
<input>         A form input field (text, email, password, checkbox, radio, etc.)
<textarea>      Multi-line text input.
<select>        A dropdown.
<option>        One choice in a select.
<form>          A group of inputs with a submit action.
<label>         Associates text with an input; click the label = focus the input.
```

### Media / other

```html
<img src="..." alt="...">    An image. Always have alt text.
<video src="...">            A video.
<ul>  <ol>  <li>             Unordered/ordered lists and list items.
<table> <thead> <tbody> <tr> <th> <td>   A data table.
```

### Key differences in JSX

Every standard HTML attribute works in JSX — but with two changes you need to know:

| HTML | JSX | Reason |
|---|---|---|
| `class="foo"` | `className="foo"` | `class` is a JS reserved word |
| `for="email"` | `htmlFor="email"` | `for` is a JS reserved word |
| `onclick="..."` | `onClick={...}` | all events are camelCase |
| `tabindex="0"` | `tabIndex={0}` | all attributes camelCase |
| `<br>` | `<br />` | JSX requires explicit self-close |
| `style="color: red"` | `style={{ color: "red" }}` | style is an object in JSX |

---

## Part 5 — The minimum CSS you need to not get lost

You won't write much CSS early on — lesson code uses minimal inline styles. But you'll read it, and you'll need to debug it eventually. Here's the 20% that lets you read 80% of the CSS you'll encounter.

### The box model

Every element on the page is a rectangle. Four layers, inside out:

```
┌─────────────────────────────────────┐   ← margin (outside space)
│                                     │
│   ┌─────────────────────────────┐   │
│   │         border              │   │
│   │   ┌─────────────────────┐   │   │
│   │   │      padding        │   │   │
│   │   │   ┌─────────────┐   │   │   │
│   │   │   │   content   │   │   │   │
│   │   │   └─────────────┘   │   │   │
│   │   └─────────────────────┘   │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

```css
.card {
  width: 300px;        /* content width */
  padding: 16px;       /* space inside the border */
  border: 1px solid #ccc;
  margin: 8px;         /* space outside the border */
}
```

`box-sizing: border-box` (the modern default in most frameworks) makes `width` include padding and border — otherwise width is content-only and the box ends up larger than you specified.

### Display modes

```css
display: block;          /* stack vertically, full width */
display: inline;         /* flow with text, no width/height */
display: inline-block;   /* flow with text, but width/height work */
display: flex;           /* flex layout — most common */
display: grid;           /* grid layout */
display: none;           /* hidden, takes no space */
```
```
DISPLAY MODES OVERVIEW
────────────────────────────────────────

block:
[ BLOCK 1           ]
[ BLOCK 2           ]
[ BLOCK 3           ]

inline:
Text [i1] [i2] [i3] flows in one line

inline-block:
[ box1 ] [ box2 ] [ box3 ]

flex (row):
| item1 | item2 | item3 |

grid:
| 1 | 2 | 3 |
| 4 | 5 | 6 |

none:
[ item1 ] [ item3 ]
(item2 removed, no space)

────────────────────────────────────────
```

### Flexbox (the one you'll use constantly)

```css
.container {
  display: flex;
  flex-direction: row;       /* row (default) | column */
  justify-content: center;   /* main axis: start|center|end|space-between|space-around */
  align-items: center;       /* cross axis: start|center|end|stretch */
  gap: 8px;                  /* space between children */
}
```

Think of `justify-content` as spacing along the arrow direction, `align-items` as spacing perpendicular to it.

```
.container (display: flex; flex-direction: row)

                cross axis (align-items)
                        ↓
        ┌───────────────────────────────────────┐
        │                                       │
        │        justify-content: center        │
        │                                       │
        │        ┌────┐  ┌────┐  ┌────┐         │
        │        │ A  │  │ B  │  │ C  │         │
        │        └────┘  └────┘  └────┘         │
        │             ↑ gap: 8px ↑              │
        │                                       │
        └───────────────────────────────────────┘
                 → main axis (row direction)

Legend:
- flex-direction: row → items go left → right
- justify-content: center → centers items horizontally
- align-items: center → centers items vertically
- gap: spacing between items
```

### Positioning

```css
position: static;     /* default; normal flow */
position: relative;   /* normal flow, but can offset with top/left/etc. relative to itself */
position: absolute;   /* removed from normal flow; positioned relative to nearest non-static ancestor */
position: fixed;      /* removed from flow; positioned relative to viewport (stays on scroll) */
position: sticky;     /* stays in flow until it hits a scroll position, then sticks */
```

```css
top: 0; right: 0; bottom: 0; left: 0;   /* offsets (only matter when position is non-static) */
z-index: 100;   /* stacking order — higher numbers appear on top */
```

### Common properties you'll read

```css
color: #333;             /* text color */
background-color: #fff;  /* background */
font-size: 16px;         /* text size */
font-weight: bold;       /* 400 = normal, 700 = bold */
border-radius: 8px;      /* rounded corners */
opacity: 0.5;            /* 0 = invisible, 1 = fully visible */
cursor: pointer;         /* show the hand pointer cursor on hover */
overflow: hidden;        /* clip content that overflows the box */
transition: opacity 200ms ease-out;   /* animate changes to opacity */
transform: translateY(-4px);          /* move/scale/rotate without affecting layout */
```

### Tailwind (you'll encounter it)

Tailwind CSS is a library of utility classes. Instead of writing CSS, you apply pre-built classes directly in JSX:
```tsx
<div className="flex items-center gap-4 rounded-lg p-4 bg-white shadow">
```
Each class does one thing: `flex` = `display: flex`, `items-center` = `align-items: center`, `p-4` = `padding: 1rem`. You compose them. No custom CSS file needed for most things.

This course uses inline styles to keep lesson code standalone. Real projects usually use Tailwind or a component library (Shadcn, MUI, Chakra).

---

## Part 6 — How to use an AI agent for frontend work

Frontend has a different rhythm than backend when working with AI — here's what that means in practice.

### The main difference from backend work

In backend work, the agent's output is mostly verifiable by running it: tests pass, the endpoint returns the right JSON. In frontend work, "does it work" is partially visual and behavioral — you have to *look at it in the browser*. The agent can't see the screen.

This means you need to run the code yourself and verify what the agent produced. The agent is fast and confident; your job is to catch when it's confidently wrong about the visual result or the browser behavior.

### The feedback loop for frontend

```
1. Agent writes code
2. npm run dev — look at it in the browser
3. Open DevTools Console — any errors?
4. Interact with it — click things, resize, try edge cases
5. Tell the agent what you see ("the button is invisible", "clicking does nothing")
6. Agent fixes → repeat
```

You're the eyes. Build the habit of running it every time, not just when you think you need to.

You can also use playwright mcp to automate testing and verification. (your coding agent builds a site → launches it → opens it in a browser → takes a screenshot → compares it to expected behavior.)

### Useful DevTools tabs (Chrome / Firefox)

Always have DevTools open during learning. Open with `F12` or right-click → Inspect.

- **Console** — logs, errors, warnings. First place to look when something's wrong.
- **Elements** — the live DOM tree. Click any element to see its computed styles. Edit HTML/CSS live to try things.
- **Network** — every HTTP request and response. Check your API calls here: what was sent, what came back, what status code.
- **Application** — localStorage, sessionStorage, cookies. Check your auth tokens here.
- **Performance** — flame charts for profiling slow renders.
- **React DevTools** (separate extension, install it, and then restart the opened tab and open the inspect) — component tree, props, state, re-render highlighting.

### What the agent is bad at in frontend

- **Knowing what looks right visually.** It can generate code; it can't see the result. You can.
- **Debugging layout issues.** If something is misaligned, the agent's first guess is often wrong. Tell it what you see ("the button is off to the right and I expect it centered") and it'll do better.
- **Catching stale browser cache.** If your change isn't showing up, hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`) before blaming the code.
- **Accessibility judgment calls.** It knows the rules; it can't feel what a screen reader would announce. Ask explicitly: "audit this for a11y issues."

### What the agent is excellent at in frontend

- **Generating component skeletons.** Give it a component spec and you get 80% of the code instantly.
- **TypeScript types.** Describe your data shape; it generates correct prop types and Zod schemas.
- **Patterns.** "Use the AuthContext + RequireAuth + api() pattern from doc 18" — it reads the prompt and produces code consistent with the pattern.
- **Debugging with logs.** "Add console.logs at every render and inside effects; show me what's happening" — very effective.
- **Explaining existing code.** Paste unfamiliar code, ask "explain this like I know backend but not React."

### Prompt patterns worth internalizing

**When something looks wrong:**
```
The [component] is rendering but [describe what you see] instead of [what you expected].
I'm looking at the console and I see [paste any errors or nothing].
What are the most likely causes and how do I check each one?
```

**When you want to understand before building:**
```
Before writing code, explain in 2-3 sentences: what React hook/pattern
is the right tool for [what I'm trying to do], and why not [the thing
I was going to use instead]?
```

**When the agent generated something that "works" but feels wrong:**
```
This works, but I want to understand it before moving on. Walk me
through what this code does, step by step, as if I've never seen React
before. Flag any part where you made a non-obvious choice.
```

**When you want to go deeper:**
```
I understood the basic explanation. Now give me the footguns — what
are the 2-3 ways this pattern breaks in real apps, and what do the
bugs look like when they appear?
```

### The rule about accepting generated code

Before you copy-run the agent's code: **predict what it'll do.** "When I click the button, I expect the count to go up by one." Then run it. If your prediction was wrong, that gap is the learning — not the code itself.

If you consistently can't predict the behavior, slow down and re-read the relevant doc. The docs are what make your predictions sharp. The agent is what makes your code fast. You need both.

---

## Where this leads

Now you have the vocabulary to not be lost. Nothing in this intro needs to be memorized — you'll re-encounter every term in context as you go through the docs.

Next: [docs/00-how-to-use-this-course.md](./00-how-to-use-this-course.md) — how the course is structured and how to use each doc with an agent.

Then: [docs/01-mental-model.md](./01-mental-model.md) — where the actual React learning begins.
