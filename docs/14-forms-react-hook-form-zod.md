# 14 — Forms with react-hook-form + Zod

## What you're learning & why it matters

You're learning the modern stack for forms in React: **react-hook-form** for state and validation orchestration, **Zod** for type-safe schemas, and how to surface server-side validation errors from your Rails API back into the form.

Why a library? Native form state in React is full of boring decisions: controlled vs uncontrolled, when to validate, how to debounce, how to track dirty/touched per field, focus on the first error, async validation. RHF gives you all of it for free, with great performance (it doesn't re-render the whole form on every keystroke).

Why Zod? Because schemas live everywhere — runtime validation, TS types, and the "shape contract" between your client and server. Zod expresses one schema and gives you both validation and a TypeScript type — no duplication.

### Terms first

- **Controlled input**: an `<input>` whose value is driven by React state. You set `value=` and update via `onChange`.
- **Uncontrolled input**: an `<input>` whose value lives in the DOM; you read it via a ref. Faster (no re-render on each keystroke) but less reactive.
- **Validation**: checking that input is correct (required, format, length, etc.) before submission.
- **Schema**: a structured description of what valid data looks like. Zod schemas are runtime objects; TS types can be derived from them.
- **Dirty / touched**: dirty = value differs from default; touched = field has been focused-then-blurred. Used to decide when to show errors.
- **Submission state**: pending, success, error — distinct from validation state.

## Mental model

> **react-hook-form keeps form state out of React state. Inputs register themselves with the form; the form holds values; React only re-renders pieces that need to. Zod owns the rules. The integration glues them together.**

This is the opposite philosophy to "everything in `useState`": forms are a special case where keeping state in the DOM (uncontrolled) is faster and just as ergonomic when a library does the bookkeeping.

## Setup

```bash
npm install react-hook-form zod @hookform/resolvers
```

The resolver package is the bridge between RHF and any schema library (Zod, Yup, etc.).

## A complete typed form

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  age: z.coerce.number().int().min(18, "Must be 18+"),
  role: z.enum(["admin", "member", "guest"]),
});

type SignupInput = z.infer<typeof SignupSchema>;

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { name: "", email: "", age: 18, role: "member" },
  });

  async function onSubmit(values: SignupInput) {
    try {
      await api.post("/users", values);
    } catch (err) {
      // map Rails 422 errors to fields (see "Server errors" section below)
      mapServerErrors(err, setError);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        Name
        <input {...register("name")} />
        {errors.name && <span>{errors.name.message}</span>}
      </label>

      <label>
        Email
        <input type="email" {...register("email")} />
        {errors.email && <span>{errors.email.message}</span>}
      </label>

      <label>
        Age
        <input type="number" {...register("age")} />
        {errors.age && <span>{errors.age.message}</span>}
      </label>

      <label>
        Role
        <select {...register("role")}>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="guest">Guest</option>
        </select>
        {errors.role && <span>{errors.role.message}</span>}
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Sign up"}
      </button>
    </form>
  );
}
```

What's happening:

- **`SignupSchema`** is a Zod schema. `z.string().min(2, "...")` produces a validator with a custom message. `z.coerce.number()` parses string → number (since `<input type="number">` gives strings). `z.enum([...])` is a fixed-set string union.
- **`type SignupInput = z.infer<typeof SignupSchema>`** — Zod gives you the TS type for free. One source of truth.
- **`useForm<SignupInput>`** registers the form state and ties it to the schema via `zodResolver`.
- **`register("fieldname")`** spreads `name`, `ref`, `onChange`, `onBlur` onto the input — RHF wires it up.
- **`handleSubmit(onSubmit)`** validates first, then calls your handler with typed values if valid. If invalid, it populates `errors`.
- **`errors.name`** has the message you defined in the schema.
- **`isSubmitting`** is true while your async `onSubmit` is in flight.

That's the whole form. ~40 lines. Try matching that with raw `useState` + custom validation.

## Validation timing

By default, RHF validates on submit. You can change to validate on blur or on change:
```tsx
useForm({ mode: "onBlur" });
```
- `onSubmit` (default) — least intrusive; show errors only after they try to submit.
- `onBlur` — validate when leaving each field; common UX choice.
- `onChange` — validate as they type; can be aggressive. Combine with `delayError` to debounce.

## Server-side validation errors (the Rails part)

Your Rails API does validation too. When it returns `422 Unprocessable Entity` with errors per field, you want those errors to appear next to the fields just like client-side ones.

Typical Rails JSON shape:
```json
{ "errors": { "email": ["has already been taken"], "age": ["must be 18+"] } }
```

Mapping helper:
```ts
import type { UseFormSetError } from "react-hook-form";

export function mapServerErrors<T extends Record<string, any>>(
  err: unknown,
  setError: UseFormSetError<T>
) {
  if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
    for (const [field, messages] of Object.entries(err.body.errors)) {
      setError(field as any, {
        type: "server",
        message: (messages as string[]).join(", "),
      });
    }
    return true;
  }
  return false;
}
```

Then in your `onSubmit` catch block, call `mapServerErrors(err, setError)` and the form displays them like any other validation error.

## Combining with TanStack Query mutations

Most forms submit data — that's a mutation. Combine RHF with `useMutation`:

```tsx
const mutation = useMutation({
  mutationFn: (values: SignupInput) => api.post("/users", values),
});

async function onSubmit(values: SignupInput) {
  try {
    await mutation.mutateAsync(values);
    navigate("/users");
  } catch (err) {
    mapServerErrors(err, setError);
  }
}
```

`mutateAsync` returns a promise so you can `await` and `try/catch`. Use `mutation.mutate(values)` (no await) if you don't need to handle errors inline; `mutation.error` will hold them.

## Controlled fields (when register isn't enough)

For custom inputs (UI library components, date pickers, multi-selects), `register` doesn't work — they're not native `<input>`s. Use the `Controller` component:

```tsx
import { Controller } from "react-hook-form";

<Controller
  name="birthDate"
  control={control}
  render={({ field }) => (
    <DatePicker
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
    />
  )}
/>
```

`field.value`, `field.onChange`, `field.onBlur`, `field.ref` plug into whatever shape your custom component needs.

## Field arrays (dynamic lists)

For repeating groups (a list of skills, multiple addresses):

```tsx
const { fields, append, remove } = useFieldArray({ control, name: "skills" });

return (
  <>
    {fields.map((field, index) => (
      <div key={field.id}>
        <input {...register(`skills.${index}.name`)} />
        <button type="button" onClick={() => remove(index)}>X</button>
      </div>
    ))}
    <button type="button" onClick={() => append({ name: "" })}>Add skill</button>
  </>
);
```

`field.id` is RHF's internal key — use it for the React `key` prop, not `index`.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/11-forms/, install react-hook-form, zod, @hookform/resolvers.
Build a SignupForm with these fields: name (string, min 2), email, age
(number, 18+), role (enum admin|member|guest), bio (optional textarea,
max 500), skills (field array of {name, level: 1-5}).

- Use Zod for the schema; derive the TS type via z.infer.
- Show inline errors per field.
- Disable the submit button while submitting.
- Mock the submit (await sleep 800ms; randomly throw a 422-like error
  with field errors {email: ["already taken"]}).
- Add a `mapServerErrors` helper that maps the 422 errors into RHF errors.
- Show a final success message when the submit succeeds.

Use TypeScript strictly. No `any`. Comment the key RHF/Zod concepts.
```

**2. Custom-component integration:**
```
Add a "tags" field to the SignupForm: an array of strings, edited via a
custom <TagInput /> component (input + chips). Wire it through Controller.
Validate with Zod that there are at least 1 and at most 10 tags.
```

**3. End-to-end with TanStack Query:**
```
Refactor the SignupForm to use useMutation from TanStack Query for the
submit. On success, invalidate the ["users"] query and navigate to
/users. On 422, map field errors. On other errors, show a top-of-form
error banner.
```

## Checkpoints

1. Why does react-hook-form re-render less than naive useState forms?
2. What does `z.infer<typeof Schema>` give you, and why is it powerful?
3. When does `register` work, and when do you need `Controller` instead?
4. How do you surface 422 server-side errors as if they were client-side validation errors?
5. What's the difference between `mutate` and `mutateAsync`?
6. When would you choose `mode: "onBlur"` over the default `mode: "onSubmit"`?

## Footguns

- **Forgetting `defaultValues`.** Without them, fields start as `undefined` and you can hit "uncontrolled to controlled" warnings if values arrive later (e.g., editing a record). Always set them, even to empty strings.
- **Number inputs returning strings.** Native `<input type="number">` gives a string. Use `z.coerce.number()` or a `valueAsNumber: true` register option.
- **Mismatched schema and form types.** If you customize the resolver type or skip `z.infer`, types drift. Always derive the TS type from the schema.
- **Field array `key` from index.** Use `field.id` provided by RHF; index breaks reconciliation when you remove items.
- **Showing all errors immediately on mount.** Annoying UX. Use `mode: "onBlur"` or only show errors when `touchedFields[name]`.
- **Mutating form values directly.** Use `setValue("field", value, { shouldDirty: true, shouldValidate: true })` — RHF needs to know.
- **Forgetting to map server errors.** User submits a valid-looking form, server says 422, you show a generic toast — frustrating. Map them to fields.

## Ask-the-agent cheatsheet

- *"Generate a react-hook-form + Zod form for this shape: [list fields]. Use `z.infer` for the type. Add a `mapServerErrors` helper for Rails 422 responses."*
- *"Convert this useState-based form to react-hook-form + Zod with the same UX. Identify any validation logic and move it into the schema."*
- *"Wire this form's submit through useMutation. On success invalidate [keys], on 422 map field errors, on other errors show a top-of-form banner."*
- *"Add a useFieldArray for [field]. Each item has [shape]. Validate with Zod that the array has min/max [N] items."*
- *"This custom component (date picker / multi-select) doesn't work with register. Wrap it with Controller and tell me which props need wiring."*

## Where this goes next

- **Doc 15** — Error boundaries and loading UX, including for form-level errors.
- **Doc 20** — Auth flows, where you'll build a login form with this exact stack.
- **Doc 22** — File uploads, which add their own form-handling wrinkles.
