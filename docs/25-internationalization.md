# 25 — Internationalization (i18n)

## What you're learning & why it matters

You're learning how to make your React app speak multiple languages, format numbers/dates per locale, and handle right-to-left layouts (Arabic, Hebrew). Given your context, this is especially relevant — your app may need Arabic from day one, and retrofitting i18n into a hardcoded-strings codebase is painful. Set up early, save weeks later.

The recommended stack: **i18next** + **react-i18next** for translation, and the browser's built-in **`Intl`** API for numbers/dates/currencies/lists.

### Terms first

- **Locale**: a language + region tag (e.g., `en-US`, `ar-EG`, `fr-FR`). Determines language, formatting, and (often) text direction.
- **Translation key**: a stable identifier for a piece of text (`auth.login.title`). The same key in different locale files maps to different strings.
- **ICU MessageFormat**: a syntax for messages that vary by plural / gender / number. Standard across i18n tools.
- **Interpolation**: inserting variables into a translated string (`Hello, {name}`).
- **RTL (right-to-left)**: text direction for Arabic, Hebrew, Persian. Affects layout, not just text.
- **Pluralization rules**: each language has different plural rules (English: 1 vs. other; Arabic: 6 forms!). Libraries handle this.

## Mental model

> **i18n has three concerns: text translation (i18next), formatting numbers/dates/currencies (Intl), and bidirectional layout (CSS logical properties + `dir` attribute). Set each up properly once, then never think about it again.**

Don't roll your own. The libraries solve subtle pluralization, fallback chains, and date formatting that you really don't want to reinvent.

## Setup

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

```ts
// i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    fallbackLng: "en",
    interpolation: { escapeValue: false }, // React already escapes
  });

export default i18n;
```

```ts
// main.tsx
import "./i18n";
```

Translation files:
```json
// locales/en.json
{
  "auth": {
    "login": { "title": "Sign in", "submit": "Log in" }
  },
  "users": {
    "count_one": "{{count}} user",
    "count_other": "{{count}} users"
  }
}
```
```json
// locales/ar.json
{
  "auth": {
    "login": { "title": "تسجيل الدخول", "submit": "دخول" }
  },
  "users": {
    "count_zero": "لا يوجد مستخدمون",
    "count_one": "مستخدم واحد",
    "count_two": "مستخدمان",
    "count_few": "{{count}} مستخدمين",
    "count_many": "{{count}} مستخدماً",
    "count_other": "{{count}} مستخدم"
  }
}
```

Notice Arabic has 6 plural forms (`zero`, `one`, `two`, `few`, `many`, `other`). i18next handles which one to pick based on the count and locale.

## Using translations in components

```tsx
import { useTranslation } from "react-i18next";

function LoginPage() {
  const { t } = useTranslation();
  return (
    <>
      <h1>{t("auth.login.title")}</h1>
      <button>{t("auth.login.submit")}</button>
    </>
  );
}
```

With variables:
```tsx
<p>{t("greetings.hello", { name: user.name })}</p>
```
```json
{ "greetings": { "hello": "Hello, {{name}}" } }
```

With pluralization:
```tsx
<p>{t("users.count", { count: users.length })}</p>
```
i18next picks the right plural form for the current locale.

## Switching languages

```tsx
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="ar">العربية</option>
    </select>
  );
}
```

`changeLanguage` updates the language; all components re-render with new strings.

## Setting `dir` and `lang` on `<html>`

For RTL languages, the entire document direction must flip. Use an effect on language change:

```tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function HtmlLangAndDir() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = ["ar", "he", "fa"].includes(i18n.language) ? "rtl" : "ltr";
  }, [i18n.language]);
  return null;
}
```

Mount `<HtmlLangAndDir />` once near the app root.

## Writing RTL-friendly CSS

The trick: use **logical properties** instead of left/right.

| Don't | Do |
|---|---|
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |

Logical properties auto-flip in RTL. `inline-start` = left in LTR, right in RTL. Modern CSS, supported everywhere.

If you're using **Tailwind**, use the `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*` utilities — they map to logical properties.

For custom RTL-aware components, you can also branch:
```tsx
const isRtl = document.documentElement.dir === "rtl";
```
But logical properties handle 95% of cases without branching.

## Formatting numbers, dates, currencies, lists with `Intl`

Don't translate these manually. Use the browser API:

```ts
const n = 1234567.89;
new Intl.NumberFormat("en-US").format(n);              // "1,234,567.89"
new Intl.NumberFormat("ar-EG").format(n);              // "١٬٢٣٤٬٥٦٧٫٨٩"
new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(99.5);  // "$99.50"
new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(99.5);  // "٩٩٫٥٠ ج.م.‏"

const d = new Date();
new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(d);  // "April 27, 2026"
new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" }).format(d);  // "٢٧ أبريل ٢٠٢٦"

new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-1, "day");  // "yesterday"
new Intl.RelativeTimeFormat("ar", { numeric: "auto" }).format(-1, "day");  // "أمس"

new Intl.ListFormat("en", { type: "conjunction" }).format(["A", "B", "C"]);  // "A, B, and C"
new Intl.ListFormat("ar", { type: "conjunction" }).format(["A", "B", "C"]);  // "A وB وC"
```

Wrap in custom hooks tied to current locale:
```tsx
function useNumberFormat(opts?: Intl.NumberFormatOptions) {
  const { i18n } = useTranslation();
  return useMemo(() => new Intl.NumberFormat(i18n.language, opts), [i18n.language, opts]);
}

const fmt = useNumberFormat({ style: "currency", currency: "USD" });
<span>{fmt.format(price)}</span>
```

For dates, **date-fns** has locale-aware helpers if you need richer formatting (relative time, complex patterns) than Intl provides — but for simple cases Intl is enough and ships with the browser.

## Loading translations on demand

For apps with many languages, ship only the active locale:

```ts
import HttpApi from "i18next-http-backend";
i18n.use(HttpApi).init({
  backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
  fallbackLng: "en",
  ns: ["common", "auth", "users"],
});
```

Each locale is a separate JSON fetched on first use — saves bytes upfront. Pair with code-splitting (doc 10) for full optimization.

## Translation key naming

Keys are part of the codebase. Treat them like API.

- **Hierarchical**: `auth.login.title`, `errors.network.timeout`. Group by feature.
- **Stable**: don't rename keys for cosmetic reasons. Translators have to redo work.
- **Generic key + variables, not string concatenation**: `"You have {{count}} {{itemType}}"` — never concatenate `t("you_have") + " " + count + " " + t("items")`. Order varies by language.
- **Avoid mid-sentence interpolation of *components***. If you need bold text inside a translated string, use the `<Trans>` component:
  ```tsx
  <Trans i18nKey="terms">By signing up you agree to <Link to="/terms">our terms</Link>.</Trans>
  ```
  ```json
  { "terms": "By signing up you agree to <0>our terms</0>." }
  ```

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/22-i18n/, set up i18next with English and Arabic. Build:

1. Initialize i18n in i18n/index.ts as in the doc; load via main.tsx.
2. Two locale files (en.json, ar.json) with these namespaces:
   - common: app name, language switcher labels
   - users: count (with full plural forms for ar)
   - greeting: hello with name interpolation
   - terms: a sentence with a link via <Trans>
3. A LanguageSwitcher in the header.
4. An HtmlLangAndDir mounter that updates html lang/dir on language change.
5. A demo page showing:
   - Translated headings and labels in both languages
   - Number, currency, date, relative-time, list formatting via Intl, all
     locale-aware
   - A pluralized message updated by a counter (so I can step through 0,
     1, 2, 5, 10 and see Arabic plural forms change)
   - A <Trans> example with embedded JSX

Use TypeScript strictly. CSS (or Tailwind) must use logical properties so
the layout flips in RTL.
```

**2. RTL audit:**
```
Audit a chosen lesson (your pick) for RTL-readiness. List every CSS rule
or Tailwind class that uses left/right (instead of start/end) and convert
them. Test by switching to Arabic and visually scanning.
```

**3. Translation-key hygiene exercise:**
```
Here's a component with these strings hardcoded:
[paste a fake component with ~10 strings, including one with a count and
one with embedded variables]
Refactor to i18next: extract keys, add to en.json/ar.json, use t() / Trans
appropriately. Critique any anti-patterns I'd be tempted to use (string
concat, mid-sentence variables, etc.).
```

## Checkpoints

1. Why is "string + value + string" concatenation bad for translations?
2. What does the `<Trans>` component solve that `t()` cannot?
3. Why use Intl for numbers/dates instead of writing format strings yourself?
4. What's the difference between `padding-left` and `padding-inline-start`, and which should you use?
5. How does i18next decide which plural form to use, and why does Arabic need more entries than English?
6. What two HTML attributes need to change when switching to an RTL language?

## Footguns

- **Hardcoded strings.** Easy to skip during a sprint, expensive to find later. Lint rule (`eslint-plugin-i18next` or similar) helps.
- **String concatenation across translations.** Order varies by language. Use full sentences with interpolation.
- **Forgetting plurals exist for non-English.** "Today {n} new" works for `n=1` and `n=5`, fails for many languages. Use `count`.
- **Left/right CSS instead of logical.** Layout breaks in RTL. Use logical properties or Tailwind's `ms-/me-/ps-/pe-` utilities.
- **Not setting `dir` on `<html>`.** Browser default-aligns text but doesn't flip layouts. Always set `dir`.
- **Translating in code instead of locale files.** Defeats the workflow — translators can't access the strings.
- **Not honoring prefers / detected language on first load.** Use `i18next-browser-languagedetector` to auto-detect.
- **Reading dates server-side in your locale, sending to client, formatting again.** Send ISO strings; format on client per the user's locale.
- **Missing keys silently rendering "key.path".** Configure `i18next` to throw or log clearly in dev.

## Ask-the-agent cheatsheet

- *"Set up i18next + react-i18next with [languages]. Add LanguageDetector, fallback, and HtmlLangAndDir. Configure backend loading if I'll have many locales."*
- *"Audit this codebase for hardcoded strings; extract them into en.json and ar.json with hierarchical keys. Don't translate Arabic — leave placeholders for the translator."*
- *"Convert all left/right CSS in this component to logical properties (or Tailwind logical utilities). Test mentally in RTL."*
- *"Build a useFormatNumber/useFormatDate/useFormatRelative hook layer that wraps Intl with the current i18n locale. Memoize formatters."*
- *"This sentence requires a link in the middle. Refactor to use the <Trans> component with the right placeholder syntax in the JSON."*

## Where this goes next

You've reached the end of the course. Looping back is healthy — re-read doc 01 (mental model) and doc 06 (effects) after you've built a real app or two; the second pass lands deeper.

The next move is *building*. Pick a small project — a Rails API you've already built, paired with a fresh React SPA in front of it. Use this course's docs as references, the agent prompts as scaffolding, and the footguns as a debugging guide. The docs aren't meant to be memorized — they're meant to be the layer between you and your agent that prevents confidently-wrong code from shipping.
