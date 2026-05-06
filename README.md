# React Learning Course for Backend Developers

A comprehensive, agent-driven React learning course designed for Rails API developers who want to master modern React (v19) with TypeScript.

## What This Is

This is not a traditional tutorial. It's a **learning-by-understanding course** where:
- You read concepts without memorizing syntax
- You use an AI agent (Claude Code, Cursor, or similar) to generate code from structured prompts
- You predict behavior before running code
- You focus on mental models and footguns, not memorization

Perfect if you already know backend APIs, databases, and job queues, but are new to frontend.

## Course Structure: 23 Docs + Intro

**Read in order:**

### Before You Start
- **`docs/-01-intro-to-frontend.md`** — Frontend fundamentals (browser, DOM, HTML, CSS, jargon, AI workflow)
- **`docs/00-how-to-use-this-course.md`** — How to use each doc with an AI agent

### Foundations (Docs 01–04)
- **01 — Mental model & the React runtime** — `UI = f(state)`, why components run many times
- **02 — Components, JSX, TypeScript** — Props typing, JSX rules, the three languages of React
- **03 — Composition patterns** — `children`, slots, compound components, render props
- **04 — Hooks: the concept** — Rules of hooks, why call-order matters, the full hook map

### State & Reactivity (Docs 05–07)
- **05 — useState, useReducer, state architecture** — Where state lives, lifting state up
- **06 — Effects as synchronization** — useEffect deep dive, dependency arrays, cleanup
- **07 — Refs & imperative escape hatches** — useRef, when to step outside React's model

### Sharing & Scaling State (Docs 08–09)
- **08 — Context & external stores** — When to use Context, Zustand, splitting stores
- **09 — Performance, memo, React Compiler** — What to measure, when to memoize, profiling

### Real Apps (Docs 10–13)
- **10 — Routing** — React Router, URL as state, lazy-loading, route guards
- **11 — Data fetching with TanStack Query** — Caching, mutations, optimistic UI, Rails API patterns
- **12 — Forms** — react-hook-form + Zod, server validation errors, Rails integration
- **13 — Error boundaries & Suspense** — Loading states, error UI, declarative data handling

### Modern React (Docs 14–15)
- **14 — React 19 features** — `use()`, `useOptimistic`, `useTransition`, `useActionState`
- **15 — Server Components mental model** — Why RSC exists, when to use it, server vs client boundary

### Production Concerns (Docs 16–17)
- **16 — Testing** — Vitest + React Testing Library + Playwright, what to test
- **17 — Tooling, accessibility, shipping** — Vite internals, a11y basics, deployment, bundle size

### Specialized Topics (Docs 18–23)
- **18 — Auth flows** — Tokens vs cookies, refresh, route guards, Rails API integration
- **19 — WebSockets & real-time** — native WS, Socket.IO, ActionCable, subscriptions
- **20 — File uploads** — multipart, direct-to-S3, ActiveStorage, progress bars
- **21 — Drag-and-drop** — dnd-kit, sortable lists, compound DnD components
- **22 — Animations** — CSS transitions vs Motion, gesture animations, layout animations
- **23 — Internationalization** — i18next, RTL, Intl API, locale-aware formatting

## How to Use This Course

Each doc is self-contained with this structure:

1. **What you're learning & why** — 1-paragraph hook + key terms
2. **Mental model** — The one idea to internalize
3. **Concept sections** — The actual teaching (varies per doc)
4. **How to use this doc with an agent** — 3–4 prompts to build, quiz, refactor
5. **Checkpoints** — Questions to verify understanding
6. **Footguns** — Common bugs that bite even seniors
7. **Ask-the-agent cheatsheet** — Prompt phrasings for real work
8. **Where this goes next** — Links to related docs

**Workflow per doc:**

```
1. Read the doc (no note-taking, just intuition)
2. Use agent prompts to generate lesson code in src/lessons/NN-*/
3. npm run dev — break it, change things, predict behavior
4. Answer checkpoints (without looking at the doc)
5. Pick one footgun and ask the agent to demonstrate it
6. Move on (imperfect learning is fine — you'll loop back)
```

## Key Principles

- **TypeScript throughout** — All code is `.tsx` with strict types
- **No memorization** — You use an agent; the docs teach mental models
- **Backend dev frame** — All analogies use Rails APIs, jobs, databases, not full-stack views
- **Footguns first** — Learn what breaks, not what works perfectly
- **Code with an agent** — The agent writes syntax; you verify the idea

## Quick Start

```bash
npm install
npm run dev          # Start dev server, open http://localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint
npm run preview      # Preview the production build locally
```

## Project Layout

```
docs/
  -01-intro-to-frontend.md     ← Start here
  00-how-to-use-this-course.md
  01-mental-model.md
  ...
  23-internationalization.md

src/
  lessons/
    01-mental-model/           ← You'll create these with an agent
    02-components/
    ...
    23-i18n/
  App.tsx                       ← Mount lessons here while learning
  main.tsx

package.json
tsconfig.json
vite.config.ts
```

## Using an AI Agent With This Course

**Good prompts:**

```
"In src/lessons/04-hooks-concept/, build a component that violates each
rule of hooks (one at a time, in separate files). For each, paste me the
exact ESLint error message."
```

```
"This component has the same useState + useEffect pattern as another.
Extract a custom hook with proper TypeScript types and refactor both
components to use it."
```

**Not memorizing syntax:**

The agent writes code; you predict what it does. If your prediction is wrong, re-read the doc. That gap is the learning.

## Reading Order

**Don't skip the intro.** `docs/-01-intro-to-frontend.md` defines every frontend term you'll see. It's a glossary you can ctrl-F later, but read it once to know what "DOM," "reconciliation," "CSR," "RTL," etc. mean.

Then follow the numbered order. Docs build on each other.

## Prerequisites

- Solid understanding of Rails/APIs (controllers, models, JSON responses, authentication)
- Some JavaScript (arrow functions, array methods like `.map`, destructuring)
- Comfortable with the command line (npm, git)
- A code editor (VS Code + React DevTools extension recommended)

## Built With

- **React 19** + TypeScript
- **Vite 8** for fast dev & builds
- **ESLint** with TypeScript support
- **Strict mode** — no `any` types, unused vars are errors
