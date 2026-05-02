# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

## Architecture

This is a minimal React 19 + Vite 8 + TypeScript starter. The entire app lives in `src/App.tsx` — a single component with no routing or state management beyond local `useState`.

- `src/master.tsx` — mounts `<App />` into `#root`
- `src/App.tsx` — the only component; edit this to start building
- `public/icons.svg` — SVG sprite sheet referenced via `<use href="/icons.svg#...">` in TSX
- `tsconfig.json` — root config referencing `tsconfig.app.json` (src) and `tsconfig.node.json` (vite config); strict mode enabled
- ESLint is configured for TS/TSX with `typescript-eslint`; unused vars are errors unless the name starts with an uppercase letter or underscore
