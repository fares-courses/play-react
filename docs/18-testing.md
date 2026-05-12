# 18 — Testing

## What you're learning & why it matters

You're learning what to test in a React app, what tools to use, and — just as important — what *not* to test. Frontend testing has a wide spectrum: unit tests of pure functions, component tests that render and interact, end-to-end tests that drive a real browser. Knowing where to invest is the difference between a test suite that helps you ship and one that's an annoying obstacle.

You've written backend tests in Rails (RSpec, Minitest). The mental model carries — but the scope of "unit" is fuzzier in UI code, and the highest-value tests are usually integration-level (rendering a component with its dependencies).

### Terms first

- **Unit test**: tests one unit (a function, a class) in isolation. Mocks its dependencies.
- **Component test / integration test**: renders a component (with maybe its real children) and asserts on what the user would see/do. The most common type in React.
- **End-to-end test (E2E)**: drives a real browser, hits a real (or mocked) backend, simulates the full user journey.
- **Test runner**: the program that finds and runs your tests. Examples: Vitest, Jest.
- **Test renderer**: the library that mounts components for tests. **React Testing Library (RTL)** is the standard.
- **Mock**: a stand-in for a dependency, returning canned values.
- **Selector / query**: a way to find an element in the rendered output (`getByRole`, `getByText`).

## Mental model

> **Test what users do, not how the code is wired internally.** Open a component in your test, click around, assert on what's visible. If a refactor changes the internals but preserves behavior, the tests should still pass. If the user-visible behavior breaks, the tests should fail.

That principle, attributed to Kent Dodds (RTL's author), drives almost every good testing decision.

## The stack (what to install)

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- **Vitest** — fast modern test runner, integrates seamlessly with Vite. Replaces Jest for new projects.
- **@testing-library/react** — render and query components.
- **@testing-library/user-event** — simulate realistic user interactions (typing, clicking).
- **@testing-library/jest-dom** — extra DOM-related assertions like `toBeInTheDocument`.
- **jsdom** — fake browser environment for tests (lightweight; no real browser).

For E2E later: **Playwright** (`@playwright/test`) — drives a real browser headlessly, much better than older tools like Selenium or Cypress.

Configure Vitest in `vite.config.ts`:
```ts
test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./test/setup.ts"],
}
```

`test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

## Your first component test

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("starts at zero and increments on click", async () => {
    render(<Counter />);
    expect(screen.getByText("0")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /increment/i }));

    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
```

Read this:
- **`render`** mounts the component into a fake DOM.
- **`screen.getByRole("button", { name: /increment/i })`** finds the button by its accessibility role and name. This is the *preferred* query — it tests the way assistive tech (and users) find the element.
- **`userEvent.click(...)`** simulates a real click (focus, mouse events, keyboard accessibility). Use this over the older `fireEvent` for any new tests.
- **`toBeInTheDocument()`** comes from jest-dom; nicer than checking truthiness.

## The query priority (memorize the ranking, not the syntax)

RTL provides many ways to find elements. Use them in this order — top is best:

1. **`getByRole`** — finds by ARIA role and accessible name. Tests behavior the way assistive tech sees it.
2. **`getByLabelText`** — for form fields. Finds the input by its label text.
3. **`getByPlaceholderText`** — only if there's no label.
4. **`getByText`** — for non-interactive text content.
5. **`getByDisplayValue`** — find a form field by its current value.
6. **`getByAltText`** — for images.
7. **`getByTitle`** — last resort.
8. **`getByTestId`** — when none of the above work; requires you to add `data-testid` to the markup.

Don't reach for `getByTestId` first. Tests written with roles and labels accidentally double as accessibility tests and survive refactors better.

Variants:
- **`getBy*`** — throws if not found, returns the element.
- **`queryBy*`** — returns null if not found (use to assert absence).
- **`findBy*`** — async; waits for it to appear (use after triggering an async action).

## What to test

A practical priority for component tests:

1. **The component renders without crashing.** A free smoke test.
2. **Interactions produce the expected visible outcome.** Click button, see new text. Submit form, see success.
3. **Props change produces the expected change.** Pass a different `user`, see different name.
4. **Error states render.** Fetch fails, error message shows.
5. **Loading states render.** Suspended, skeleton appears.

What *not* to test:
- **Implementation details.** "Calls `useState` with this argument" — brittle and useless.
- **Internal class names.** They'll change with styling refactors.
- **Library internals.** Trust that React Router, TanStack Query, react-hook-form work — don't write tests proving their docs.
- **Visual styling.** Pixel-perfect tests are flaky. Use visual regression tools (Chromatic, Percy) if you actually need them.

## Testing components with hooks (TanStack Query, Router, Context)

Components rarely live in isolation. When testing one that uses hooks from a context, wrap it in the appropriate provider in your test.

A **test render helper** is gold:
```tsx
// test/test-utils.tsx
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

export function renderWithProviders(ui: React.ReactElement, { route = "/" } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
```

Then in tests: `renderWithProviders(<UsersPage />, { route: "/users" })`.

`MemoryRouter` is React Router's in-memory variant for tests — no real URL, just simulated navigation history.

## Mocking the network with MSW

You don't want tests hitting your real Rails API. Two options:

**Option A: mock `fetch` per test.** Quick but fragile.

**Option B (preferred): MSW (Mock Service Worker).** Define request handlers once; they intercept fetches transparently. Same handlers can be used in development to fake the API too.

```bash
npm install -D msw
```

```ts
// test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users", () => {
    return HttpResponse.json([{ id: 1, name: "Fares" }]);
  }),
  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 2, ...body }, { status: 201 });
  }),
];

// test/setup.ts
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";
const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Now your component tests can call `useQuery` for real and MSW responds. Realistic and stable.

## Testing hooks directly

For complex custom hooks, test them in isolation:
```tsx
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

it("increments", () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

`act` wraps any state-updating call to flush React updates inside the test environment. `userEvent` already wraps in `act` for you in component tests.

## End-to-end tests with Playwright

Component tests catch most bugs but can't catch issues that depend on real browsers or full integration. For critical user journeys (login, checkout), add Playwright tests:

```bash
npm init playwright@latest
```

```ts
import { test, expect } from "@playwright/test";

test("user can sign up", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("hunter2hunter2");
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(/welcome/i)).toBeVisible();
});
```

Same query philosophy as RTL (Playwright deliberately mirrors it).

E2E tests are *expensive* — slow, can flake, require running the app. Reserve them for critical paths. Component tests should cover most of the feature surface.

## How to use this doc with an agent

**1. Set up the test infrastructure:**
```
In this Vite project, set up Vitest + React Testing Library + jest-dom.
- Install dev deps
- Configure vitest in vite.config.ts (jsdom, globals, setupFiles)
- Create test/setup.ts importing jest-dom matchers
- Add an npm script "test"
- Add a renderWithProviders helper at test/test-utils.tsx that wraps with
  QueryClientProvider and MemoryRouter
- Write one example component test for App.tsx that just asserts it renders
Keep it minimal; don't add features I didn't ask for.
```

**2. Write tests for an existing component:**
```
Write tests for src/lessons/04-state/* (or any chosen lesson). Cover:
- Renders without crashing
- One main interaction produces the expected visible outcome
- Any error/empty/loading state if applicable
Use getByRole / getByLabelText where possible. No data-testid unless
absolutely required. Comment which RTL query you chose and why for at
least one case so I can see the reasoning.
```

**3. Add MSW for API tests:**
```
Add MSW to the test setup. Create handlers for /api/users (GET and POST).
Write a test for a UsersList component that uses useQuery; verify the
loading state, the success state, and a 500 error state. Show me how to
override a handler per-test for the error case.
```

**4. Critical-path Playwright test:**
```
Set up Playwright in this project. Add one E2E test for a critical journey
(login flow if I have one, otherwise the home → users → user detail
navigation). Use getByRole / getByLabel for selectors.
```

## Checkpoints

1. What's the difference in scope between a unit test, a component test, and an E2E test?
2. Why is `getByRole` preferred over `getByTestId`?
3. When do you use `findBy*` vs `getBy*`?
4. Why is "test what the user does, not how the code works" a good guiding principle?
5. What does MSW give you that ad-hoc fetch mocks don't?
6. What's a good rule for what to cover with E2E tests vs component tests?

## Footguns

- **Testing implementation details.** Asserting on which hook was called, which class name appeared, the internal state. Brittle. Test outcomes.
- **Snapshot tests as the primary tool.** Snapshots become noise — they catch every change, including intentional ones, and people just regenerate them blindly.
- **Mocking the entire library you're using.** If you mock `useQuery`, you're not testing realistic behavior. Mock the network with MSW instead.
- **Async tests without `await`.** Tests pass before the assertion runs. Use `findBy*` for things that appear async, and `await` user-event calls.
- **Testing every leaf component.** Aim for component-level tests around meaningful behaviors, not exhaustive per-leaf coverage.
- **Ignoring accessibility queries.** If you can't find an element by role/label in tests, your real users with assistive tech can't either. The test is telling you about an a11y issue, not a testing problem.
- **Disabling Strict Mode in tests.** Same issue as in dev — it surfaces missing cleanup. Keep it on.
- **Heavy E2E suites.** Slow CI, flaky tests, gone unmaintained. Limit to top-priority journeys.

## Ask-the-agent cheatsheet

- *"Write a test for this component. Use RTL with getByRole/getByLabelText. Don't mock React Router or Query — wrap with the renderWithProviders helper. Test outcomes, not implementation."*
- *"This test is failing. The element should appear async. Switch the query from getBy* to findBy* and explain what changed."*
- *"Add MSW handlers for these endpoints [list]. Show me how to override one per-test to simulate an error response."*
- *"Audit my tests for over-mocking. Tell me which mocks could be replaced with MSW or removed entirely. Test brittleness rating each from 1-5."*
- *"Write a Playwright test for the [user journey]. Use getByRole/getByLabel selectors. Make it run against a dev server I'll start manually."*

## Where this goes next

- **Doc 19** — Tooling and shipping; some test patterns relate to CI/CD setup.
- **Doc 20** — Auth flows; testing forms with auth is one of the highest-value cases.
