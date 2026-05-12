# 19 — Tooling, accessibility, and shipping

## What you're learning & why it matters

You're learning the production concerns that surround the React you've already learned: how the build system works, how to make the app usable for people with disabilities (and SEO/legal compliance), and what to think about when actually deploying.

This is "the boring 20% that prevents 80% of post-launch headaches."

### Terms first

- **Bundler**: a tool that takes your many source files and packages them into a small set of files the browser can load. (Vite uses Rollup under the hood for production builds.)
- **HMR (Hot Module Replacement)**: dev-server feature where edits hot-swap into the running app without a full reload, preserving state.
- **Code splitting**: breaking the bundle into multiple files so the browser loads only what it needs upfront.
- **Tree shaking**: removing unused code from the final bundle.
- **Source map**: a file mapping minified code back to original source, so DevTools shows your real code on errors.
- **Accessibility (a11y)**: design and code practices that make the app usable by people with disabilities (screen readers, keyboard-only, low vision, etc.).
- **ARIA**: extra HTML attributes (`aria-*`, `role=`) that communicate semantics to assistive tech beyond what HTML alone conveys.
- **CDN**: a network of edge servers that serve your static assets close to users for speed.
- **Environment variable**: configuration value supplied at build/run time (API URL, feature flags). In Vite, prefixed with `VITE_`.

## Mental model

> **In production, three concerns dominate: how big is the bundle, how usable is the app for everyone, and how reliably does it deploy. Each has solid defaults — your job is mostly to not break them.**

## Vite (the build tool)

This project already uses Vite. A few things to know:

- **Dev server** (`npm run dev`): runs on port 5173, serves your code as ES modules, hot-reloads on save. Fast because it doesn't bundle in dev — the browser loads modules directly.
- **Build** (`npm run build`): produces `dist/`, optimized for production. Minified, tree-shaken, code-split. Output is static files you can put on any host.
- **Preview** (`npm run preview`): serves the built `dist/` locally to test the production build before deploying.

### Environment variables

Vite reads `.env` files. Variables prefixed with `VITE_` are exposed to your client code.

```bash
# .env.development
VITE_API_URL=http://localhost:3000

# .env.production
VITE_API_URL=https://api.myapp.com
```

Use them via `import.meta.env.VITE_API_URL`. **Anything in the client bundle is public** — never put secrets there.

### Code splitting (mostly automatic)

Vite splits your bundle automatically. Anything you `import("...")` dynamically (or `lazy()` — doc 10) becomes its own chunk. The result: visiting `/` loads only the home page's code; navigating to `/admin` lazy-loads the admin chunk.

Check `dist/` after a build to see chunk sizes. If something looks huge:
```bash
npx vite build --mode production && ls -lh dist/assets
```

For a deeper view, install `vite-plugin-visualizer` to get a treemap of what's in each bundle.

### Aliases (cleaner imports)

Configure `@` → `src/` in `vite.config.ts` and `tsconfig.json` so you can write `import { Foo } from "@/components/Foo"` instead of `../../../components/Foo`. Small quality-of-life win.

## Accessibility: the 80/20

Accessibility is a deep field; here's the high-leverage subset for React apps.

### 1. Use semantic HTML elements

- `<button>` for actions, `<a>` for navigation. Don't make `<div onClick>` clickable — keyboard users and screen readers will fail to use it.
- `<form>` for forms, `<label>` for inputs. Always associate labels with inputs (`<label htmlFor="email">` + `<input id="email" />`).
- `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` give structure that screen readers navigate.

### 2. Labels and names

Every interactive element needs an accessible name. For buttons with only an icon, add a label:
```tsx
<button aria-label="Close modal">×</button>
```
Otherwise screen readers announce "button" with no description.

### 3. Focus management

When a modal opens, focus should move into it. When it closes, focus should return to the element that opened it. When a route changes, consider moving focus to the new page's heading. Libraries help (Radix UI, Headless UI, react-aria) — don't roll modals/menus from scratch.

### 4. Keyboard support

Everything clickable must be operable with the keyboard. Tab to focus, Enter/Space to activate. If you use `<div role="button">` (don't), you'd need to add `tabIndex={0}` and key handlers — better to just use `<button>`.

### 5. Color contrast

Text must be legible — minimum 4.5:1 contrast ratio for normal text. Use a tool (Chrome DevTools' contrast checker, or extensions) when picking colors.

### 6. Forms and errors

Errors should be programmatically associated with inputs:
```tsx
<input id="email" aria-invalid={!!error} aria-describedby="email-error" />
{error && <span id="email-error" role="alert">{error}</span>}
```
`role="alert"` makes screen readers announce the error immediately.

### 7. Use the right libraries

For complex interactions (modals, menus, tabs, comboboxes), use accessibility-focused primitives:
- **Radix UI** (`@radix-ui/react-*`) — unstyled, accessible primitives.
- **Headless UI** — same idea from the Tailwind team.
- **react-aria** — Adobe's accessibility-first hooks.

Custom modal/dropdown code is one of the most common sources of a11y bugs. Use a library.

### 8. Tools

- **eslint-plugin-jsx-a11y** — catches obvious issues at lint time. Already partially configured in many starter setups; verify it's on.
- **axe DevTools** browser extension — runs accessibility audits on the page.
- **Lighthouse** (Chrome DevTools → Lighthouse tab) — a11y + performance + SEO scores.

## Internationalization (briefly — doc 25 goes deep)

If your app needs to support multiple languages, set that up early. Retrofitting translations to a hardcoded-strings codebase is painful. We cover the full setup in doc 25.

## Error monitoring in production

Even with error boundaries (doc 15), you want to know when users hit errors. Plug in **Sentry** or similar:

```tsx
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: "https://..." });
```

Sentry reports errors with stack traces, breadcrumbs (recent user actions), browser/OS info. Worth it for any non-toy app. Costs nothing for low-volume projects.

## Deployment

A built React SPA is just static files in `dist/`. Hosts that work well:

- **Vercel, Netlify, Cloudflare Pages** — git-connected, deploy on push, free tier, automatic HTTPS, edge-cached, SPA fallback handled. The default for SPAs.
- **Static hosting (S3 + CloudFront, GitHub Pages)** — works but requires more config, especially the SPA fallback.
- **Same server as your Rails API** — bundle the SPA into Rails' public folder, served by Nginx. More work; better when you want a single deployment.

### SPA fallback

A subtle but critical piece. When a user reloads `/users/42`, the host gets a request for that path. Without configuration, it returns 404 because there's no `users/42.html` file.

Fix: the host must serve `index.html` for any unknown path; the React Router takes over from there. Vercel/Netlify do this automatically. For a generic Nginx config:
```
try_files $uri $uri/ /index.html;
```

Without this, refreshes on non-root URLs break. Test it before you ship.

### Caching

Production builds output filenames with content hashes (`index-abc123.js`). Configure your host to:
- Cache hashed files forever (`Cache-Control: max-age=31536000, immutable`).
- Cache `index.html` for ~5 minutes (so deploys propagate quickly).

Most modern hosts do this by default.

## CI/CD basics

A reasonable GitHub Actions workflow:

1. On PR: install, lint, type-check, test.
2. On merge to main: build, deploy to staging.
3. On tag: deploy to production.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```

Adapt to whatever host's deploy action you use.

## How to use this doc with an agent

**1. Audit and harden the project:**
```
For this Vite + React project, do an audit and propose changes:
- Add a path alias `@` -> `src/` in vite.config.ts and tsconfig.json,
  show me the diff
- Add eslint-plugin-jsx-a11y if not present and turn on the recommended
  rules; show me which existing files trip the rules and fix them
- Add a CI workflow file at .github/workflows/ci.yml that runs lint,
  typecheck, test, build on PRs
- Show me how to set up Sentry (just stub the init; I'll add the DSN)
Keep changes minimal and focused.
```

**2. Bundle inspection:**
```
Build the project, then walk me through what's in `dist/`. Identify the
largest chunk(s), tell me what's in them, and suggest whether anything
should be lazy-loaded or replaced with a smaller library.
```

**3. Accessibility pass:**
```
Audit one of the lesson folders (you pick one) for accessibility issues.
For each issue, tell me: (a) what the bug is, (b) who it affects, (c) the
fix. Run through: semantic elements, labels, keyboard nav, focus, color
contrast, error association.
```

**4. Deployment plan:**
```
I want to deploy this app to Vercel/Netlify/Cloudflare Pages, fronting a
separate Rails API at api.myapp.com. Walk me through:
- What environment variables I'd set
- How auth cookies would work cross-domain (or whether to use Bearer tokens)
- How to configure SPA fallback (probably automatic)
- How to set up preview deploys per PR
```

## Checkpoints

1. Why are env vars in a client bundle public? What does that mean for what you can put in them?
2. What does the SPA fallback do, and why is it needed?
3. What's the difference between using `<button>` and `<div onClick>` from an accessibility standpoint?
4. Why use a library (Radix/Headless UI) for complex interactive components like modals or menus?
5. What does code splitting do, and what's the typical entry point for it in a SPA?
6. What does Sentry add that error boundaries alone don't?

## Footguns

- **Putting secrets in `VITE_*` env vars.** They're public. Anything client-side is exposed.
- **Forgetting the SPA fallback on deploy.** Refresh on `/users/42` returns 404 in production.
- **Custom interactive components without keyboard support.** Inaccessible to keyboard-only users.
- **Skipping image alt text.** `<img alt="">` (empty) is fine for decorative; missing entirely is a bug; use a real alt for content images.
- **Color-only signaling.** Red text for errors with no icon/label — bad for color-blind users. Combine color with text/iconography.
- **Treating Lighthouse score as the goal.** It's a proxy; real users with screen readers/keyboards are the target.
- **Massive bundles from unmaintained imports.** A 500KB charting lib for one chart. Audit your bundle.
- **Forgetting to set `lang` on `<html>`.** Screen readers need it (`<html lang="en">`).

## Ask-the-agent cheatsheet

- *"Audit my Vite config and tsconfig — recommend improvements (path aliases, build options, types config). Don't make speculative changes; explain each first."*
- *"Run an accessibility audit on this component using the WCAG 2.1 AA checklist. List concrete issues and fixes."*
- *"My bundle is large. Help me find the biggest contributor and either lazy-load it or replace it with a lighter alternative."*
- *"Set up Sentry for this app. I want unhandled errors and React error boundary errors reported with React component stacks. Show me the setup and how to test it."*
- *"Set up a CI workflow that runs lint, typecheck, test, and build on every PR. Cache npm. Use the latest Node LTS."*

## Where this goes next

- **Doc 20** — Auth flows. Where production concerns (cookies vs tokens, refresh, route guards) get real.
