# 00 — How to use this course

> **First time here?** Read [-01-intro-to-frontend.md](./-01-intro-to-frontend.md) before this file. It covers the browser environment, the full FE jargon glossary, the minimum HTML/CSS you need, and how to work with an AI agent on frontend code. This file assumes you've read it.

You're a Rails API developer learning advanced React. You won't memorize syntax — you'll write code with an AI agent. So this course teaches you what to **understand**, what to **ask for**, and what to **verify**. Memorization is not the goal.

## TypeScript throughout

This course uses **TypeScript** for every code example, every lesson, and every agent prompt — no plain JavaScript anywhere. TypeScript is JavaScript with a type-checker bolted on: you annotate what shape your data has, and a compile step catches mismatches before the code runs. It's the dominant choice in serious React codebases today (Next.js, Remix, most production apps default to it), and it pairs especially well with an agent-driven workflow — type errors give the agent immediate feedback when it generates something wrong, and they give *you* a safety net for catching when the agent confidently generated nonsense.

You don't need TS experience going in. Doc 02 opens with a short "TypeScript for backend devs" primer covering the 20% of TS you'll actually use (type aliases, interfaces, generics, unions, utility types). New TS syntax is defined inline as it first appears, the same way frontend terms are. Doc 01 is deliberately concept-only with minimal code so the mental model lands before TS gets in the way; from doc 02 onward, every file is `.tsx` with proper types.

## The shape of each doc

Every doc (01–22) follows the same structure. Read it in order:

1. **What you're learning & why it matters** — the concept in one paragraph, plus the Rails analogy. If you only read one section, read this.
2. **Mental model** — the single idea to internalize. Once this clicks, the syntax is googleable forever.
3. **How to use this doc with an agent** — concrete prompts to give your agent (Claude Code, Cursor, etc.) to deepen, build, quiz, extend.
4. **Checkpoints** — questions you should be able to answer before moving on. If you can't, loop back or ask the agent to re-explain.
5. **Footguns** — bugs that bite even senior React devs. Knowing these is 80% of the value.
6. **Ask-the-agent cheatsheet** — phrasings you'll reuse in real work. Not code, prompts.

The docs are reading material. The **code lives in `src/lessons/NN-topic/`** — you generate it *with the agent* using the prompts from the doc. That's the practice loop.

## The agent-driven workflow

For each doc, your loop is:

```
1. Read the doc end-to-end. Don't take notes — you're building intuition.
2. Open the agent in src/lessons/NN-topic/ and paste the "build the lesson" prompt
   from the doc. The agent generates a working example.
3. Run it (npm run dev), break it, change things. Ask the agent
   "what happens if I do X?" — make predictions before you run.
4. Hit the checkpoints. If you can't answer one, ask the agent to explain
   that specific point with a different angle or analogy.
5. Pick one footgun from the doc and ask the agent to demonstrate it.
   Seeing the bug is more memorable than reading about it.
6. Move on. Don't perfect — you'll revisit concepts in later docs.
```

The mistake to avoid: copy-pasting the agent's code without predicting what it'll do. Prediction is the whole point. If you can predict the output, you understand. If you can't, you don't — regardless of whether it works.

## How to prompt the agent well (for this course)

Three prompt patterns you'll use constantly:

**1. The "explain like I know backend, not frontend" prompt**
```
I'm a Rails API / backend dev learning React. I know API endpoints,
background jobs, ActiveRecord, and databases. I do NOT know frontend
terminology — define any frontend-specific term the first time you use it
(DOM, bundler, hydration, etc.) in one sentence. Use API/job/DB analogies
where they fit, and flag where the analogy breaks down.
```

**2. The "build the lesson" prompt** (each doc gives you the specific version)
```
In src/lessons/NN-topic/, build a minimal example demonstrating [concept].
Keep it small — one component, no styling beyond what's needed to see what's
happening. Add console.logs at the key moments so I can watch the behavior
in the browser console. Don't add features I didn't ask for.
```

**3. The "quiz me" prompt**
```
Quiz me on [concept] from doc NN. Ask one question at a time, wait for my
answer, then tell me if I'm right and what I missed. Start with the mental
model, then move to footguns. Stop after 5 questions.
```

You'll get other prompt patterns inside the docs.

## Folder convention

```
docs/
  00-how-to-use-this-course.md   ← you are here
  01-mental-model.md
  02-components-jsx-typescript.md
  ...
src/lessons/
  01-mental-model/               ← code for doc 01
  02-components/
  ...
```

Each `src/lessons/NN-*/` folder has its own `index.tsx` that you mount from `src/App.tsx` while you're on that lesson. The agent will set this up; you don't need to manage it manually.

## Course map (22 docs + intro)

**Before you start**
- 00-intro — Frontend for the backend developer (browser, HTML, CSS, jargon, AI workflow)

**Foundations**
- 01 — Mental model & the React runtime
- 02 — Components, JSX, TypeScript for props
- 03 — Composition patterns (children, slots, compound, render props)

**State & reactivity**
- 04 — `useState`, `useReducer`, state architecture
- 05 — Effects as synchronization (the deep one)
- 06 — Refs & imperative escape hatches

**Sharing & scaling state**
- 07 — Context, and when to reach for an external store
- 08 — Performance, memo, the React Compiler, profiling

**Real apps**
- 09 — Routing (React Router / TanStack Router)
- 10 — Data fetching with TanStack Query
- 11 — Forms with react-hook-form + Zod
- 12 — Error boundaries, Suspense, loading/error UX

**Modern React**
- 13 — React 19: `use()`, Actions, `useOptimistic`, `useTransition`
- 14 — Server Components mental model

**Production concerns**
- 15 — Testing (Vitest + RTL + Playwright)
- 16 — Tooling, accessibility, shipping

**Specialized topics**
- 17 — Auth flows (token/session, refresh, guards, Rails integration)
- 18 — WebSockets & real-time (incl. ActionCable)
- 19 — File uploads (multipart, direct-to-S3, ActiveStorage)
- 20 — Drag-and-drop (dnd-kit)
- 21 — Animations (Framer Motion / Motion)
- 22 — Internationalization (i18next)

## How to know you're done with a doc

Not when you've read it. Not when the lesson code runs. **When you can explain the mental model out loud to an imaginary junior dev** — including at least one footgun — without looking at the doc. If you can't, you skipped step 6 of the workflow above.

## A note on memorization

You said you don't want to memorize because you'll always code with an agent. Good — that's the right call. But there is one thing worth memorizing per doc: the **mental model**. Not the API, not the syntax — just the one-sentence model. That's what lets you spot when the agent generates something that looks right but is conceptually wrong. The agent is fast and confident; your job is to be the one who notices when it's confidently wrong. The mental models are how you do that.
