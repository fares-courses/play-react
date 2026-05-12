# 13 — Forms with Formik + Yup

## What you're learning & why it matters

You're learning **Formik** — one of the most popular form libraries in the React ecosystem — paired with **Yup** for schema validation. Formik was the dominant React form solution for years and you'll encounter it in many production codebases. Understanding it is essential for working in existing projects, and the patterns it teaches (controlled forms, field-level state, schema validation) carry forward to any form library.

Why Formik before react-hook-form? Doc 03 mentioned Formik as a classic example of the render-props pattern. Formik represents the **controlled-input philosophy**: it keeps all form values in React state and re-renders on every change. Doc 14 will show you react-hook-form, which takes the opposite approach (uncontrolled inputs, fewer re-renders). Learning both lets you make an informed choice and understand codebases that use either.

Why Yup? Yup is to Formik what Zod is to react-hook-form — a schema validation library. Yup came first, has a similar API, and is deeply integrated with Formik. You'll see Yup in most Formik-based projects.

### Terms first

- **Controlled input**: an `<input>` whose value is driven by React state (`value={formik.values.name}`). Every keystroke triggers a state update and re-render.
- **Formik bag**: the object returned by `useFormik()` containing `values`, `errors`, `touched`, `handleChange`, `handleBlur`, `handleSubmit`, and more.
- **Field-level validation**: validating a single field (e.g., on blur) rather than the whole form.
- **Yup schema**: a runtime object describing the shape and rules for valid data. Similar to Zod but predates it.
- **touched**: a field is "touched" after the user has focused and then blurred it. Used to decide when to show validation errors — you don't want to show "required" before the user has even visited the field.
- **isSubmitting**: a boolean flag that Formik sets to `true` while your async `onSubmit` is running. Use it to disable the submit button.

## Mental model

> **Formik owns your form state. Every field value, error, and touched flag lives in Formik's state. Your component reads from it and dispatches changes to it.**

This is the same philosophy as Redux: one source of truth, controlled updates. The tradeoff is more re-renders than uncontrolled approaches — but for most forms, this is completely fine.

## Setup

```bash
npm install formik yup
```

## A complete typed form — the hook approach

```tsx
import { useFormik } from "formik";
import * as Yup from "yup";

const SignupSchema = Yup.object({
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),
  email: Yup.string()
    .email("Invalid email")
    .required("Email is required"),
  age: Yup.number()
    .integer("Must be a whole number")
    .min(18, "Must be 18+")
    .required("Age is required"),
  role: Yup.string()
    .oneOf(["admin", "member", "guest"], "Invalid role")
    .required("Role is required"),
});

type SignupValues = Yup.InferType<typeof SignupSchema>;

function SignupForm() {
  const formik = useFormik<SignupValues>({
    initialValues: { name: "", email: "", age: 0, role: "member" },
    validationSchema: SignupSchema,
    onSubmit: async (values, { setSubmitting, setFieldError }) => {
      try {
        await fakeApi(values);
        alert("Success!");
      } catch {
        setFieldError("email", "This email is already taken");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <label>
        Name
        <input
          name="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {formik.touched.name && formik.errors.name && (
          <span>{formik.errors.name}</span>
        )}
      </label>

      <label>
        Email
        <input
          name="email"
          type="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {formik.touched.email && formik.errors.email && (
          <span>{formik.errors.email}</span>
        )}
      </label>

      <label>
        Age
        <input
          name="age"
          type="number"
          value={formik.values.age}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {formik.touched.age && formik.errors.age && (
          <span>{formik.errors.age}</span>
        )}
      </label>

      <label>
        Role
        <select
          name="role"
          value={formik.values.role}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        >
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="guest">Guest</option>
        </select>
        {formik.touched.role && formik.errors.role && (
          <span>{formik.errors.role}</span>
        )}
      </label>

      <button type="submit" disabled={formik.isSubmitting}>
        {formik.isSubmitting ? "Submitting…" : "Sign up"}
      </button>
    </form>
  );
}
```

What's happening:
- **`useFormik`** returns the "formik bag" — everything you need to wire the form.
- **`validationSchema: SignupSchema`** connects Yup. Formik runs Yup validation automatically on blur and submit.
- **`formik.handleChange`** updates the value in Formik's state. It reads the `name` attribute of the input to know which field.
- **`formik.handleBlur`** marks the field as "touched" so you can gate error display.
- **`formik.touched.name && formik.errors.name`** — only show errors after the user has interacted with the field.
- **`setFieldError`** in `onSubmit` lets you set server-side errors on specific fields.
- **`setSubmitting(false)`** must be called manually in `onSubmit` if you handle async yourself.

## The `<Formik>` component approach (render props)

This is the original Formik pattern — a render-prop component. You'll see it in older codebases:

```tsx
import { Formik, Form, Field, ErrorMessage } from "formik";

function SignupFormWithComponents() {
  return (
    <Formik<SignupValues>
      initialValues={{ name: "", email: "", age: 0, role: "member" }}
      validationSchema={SignupSchema}
      onSubmit={async (values, { setSubmitting }) => {
        await fakeApi(values);
        setSubmitting(false);
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <label>
            Name
            <Field name="name" />
            <ErrorMessage name="name" component="span" />
          </label>

          <label>
            Email
            <Field name="email" type="email" />
            <ErrorMessage name="email" component="span" />
          </label>

          <label>
            Age
            <Field name="age" type="number" />
            <ErrorMessage name="age" component="span" />
          </label>

          <label>
            Role
            <Field name="role" as="select">
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </Field>
            <ErrorMessage name="role" component="span" />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Sign up"}
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

- **`<Formik>`** wraps the form and passes the formik bag via render props.
- **`<Form>`** is a shortcut for `<form onSubmit={formik.handleSubmit}>`.
- **`<Field name="name">`** auto-wires `value`, `onChange`, `onBlur` for you — much less boilerplate.
- **`<ErrorMessage name="name">`** renders the error if the field is touched and has one.

The `useFormik` hook approach is cleaner in modern React, but the component approach is what you'll find in older code.

## Yup schema patterns

```tsx
// Basic types
Yup.string().required("Required")
Yup.number().positive().integer()
Yup.boolean()
Yup.date().min(new Date(), "Must be in the future")

// Conditional validation
Yup.string().when("role", {
  is: "admin",
  then: (schema) => schema.required("Admin must provide this"),
  otherwise: (schema) => schema.optional(),
})

// Custom test
Yup.string().test(
  "no-spaces",
  "Cannot contain spaces",
  (value) => !value?.includes(" ")
)

// Array validation
Yup.array()
  .of(Yup.string().required())
  .min(1, "At least one item required")
  .max(10, "Maximum 10 items")

// Nested object
Yup.object({
  street: Yup.string().required(),
  city: Yup.string().required(),
  zip: Yup.string().matches(/^\d{5}$/, "Must be 5 digits"),
})

// Type inference
type FormValues = Yup.InferType<typeof schema>;
```

`Yup.InferType` gives you a TypeScript type from the schema — similar to `z.infer` in Zod, but Yup's type inference is less precise (Yup predates the TS-first era).

## Dynamic fields (FieldArray)

For repeating groups of fields (skills, addresses):

```tsx
import { FieldArray } from "formik";

<Formik initialValues={{ skills: [{ name: "" }] }} ...>
  {({ values }) => (
    <Form>
      <FieldArray name="skills">
        {({ push, remove }) => (
          <>
            {values.skills.map((_, index) => (
              <div key={index}>
                <Field name={`skills.${index}.name`} placeholder="Skill" />
                <ErrorMessage name={`skills.${index}.name`} component="span" />
                <button type="button" onClick={() => remove(index)}>X</button>
              </div>
            ))}
            <button type="button" onClick={() => push({ name: "" })}>
              Add Skill
            </button>
          </>
        )}
      </FieldArray>
    </Form>
  )}
</Formik>
```

`FieldArray` gives you `push`, `remove`, `insert`, `swap`, `move` helpers for managing array fields.

## Server-side error mapping

When your API returns field-specific errors (e.g., Rails 422):

```tsx
onSubmit: async (values, { setFieldError, setStatus }) => {
  try {
    await api.post("/users", values);
  } catch (err) {
    if (isApiError(err) && err.status === 422) {
      // Map field errors
      for (const [field, messages] of Object.entries(err.body.errors)) {
        setFieldError(field, (messages as string[]).join(", "));
      }
    } else {
      // Non-field error — use setStatus for a global form error
      setStatus("Something went wrong. Please try again.");
    }
  }
}
```

`setFieldError` sets an error on a specific field. `setStatus` sets a form-level value you can display as a banner.

## Formik vs react-hook-form — the key differences

| Concern | Formik | react-hook-form (doc 14) |
|---|---|---|
| Philosophy | Controlled — all values in React state | Uncontrolled — values in the DOM, read via refs |
| Re-renders | Every keystroke re-renders the form | Only changed fields re-render |
| Bundle size | ~12KB | ~9KB |
| Schema library | Yup (traditional) | Zod (TS-first), but supports Yup too |
| API style | `useFormik` hook or `<Formik>` render prop | `useForm` hook + `register` |
| Field arrays | `<FieldArray>` component | `useFieldArray` hook |
| Maturity | Older, huge ecosystem | Newer, growing fast, better perf |

**When to use Formik:**
- You're working in a codebase that already uses it.
- The team is familiar with it.
- You need the render-props component API for a specific integration.

**When to use react-hook-form (doc 14):**
- New projects — it's faster, smaller, and more TypeScript-friendly.
- Large forms where re-render performance matters.
- You want Zod for schema validation (better TS inference than Yup).

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/12-formik/, install formik and yup.
Build a user registration form with Formik + Yup:

1. Schema with: name (string, min 2), email (valid email), password
   (min 8, must contain a number), confirmPassword (must match password),
   age (number, 18+), bio (optional, max 500 chars).
2. Use the useFormik hook approach.
3. Show validation errors only after a field is touched.
4. Disable submit while submitting.
5. Mock the API (await sleep 800ms; randomly throw 422 with
   {email: ["already taken"]}). Map server errors with setFieldError.
6. Add a form-level error banner using formik.status.

Then build a second version of the same form using <Formik>, <Form>,
<Field>, <ErrorMessage> components to show the render-props approach.

Use TypeScript strictly. Use Yup.InferType for the form type.
```

**2. FieldArray exercise:**
```
Add a "skills" field array to the registration form. Each skill has a
name (required) and level (1-5). Use <FieldArray> with push/remove.
Validate that at least 1 skill is required and max 5.
```

**3. Comparison exercise:**
```
Build the exact same form in both Formik and react-hook-form (after doc 14).
Add console.log("render") at the top of the form component. Type in the
name field and compare how many times each version re-renders. Explain
why the numbers differ.
```

## Checkpoints

1. What's the difference between `useFormik` (hook) and `<Formik>` (component) — when would you pick each?
2. Why check `formik.touched.name` before showing `formik.errors.name`?
3. How does Yup's `InferType` compare to Zod's `z.infer`?
4. What's the controlled-input tradeoff that Formik makes, and when does it become a problem?
5. How do you map server-side 422 errors to specific form fields in Formik?
6. What's the difference between `setFieldError` and `setStatus`?

## Footguns

- **Showing errors before touched.** Renders all errors immediately — terrible UX. Always gate with `touched`.
- **Forgetting `setSubmitting(false)`.** The submit button stays disabled forever after a failed submit if you handle async manually and forget to reset.
- **Re-rendering the entire form on every keystroke.** Formik is controlled — this is expected. If it's a problem on large forms, consider react-hook-form instead or use `<FastField>` for fields that don't depend on other fields.
- **Using `Formik` component when `useFormik` is cleaner.** The render-prop style adds nesting. Prefer the hook in new code.
- **Not using `Yup.InferType`.** Defining the type manually and the schema separately → they drift. Derive the type from the schema.
- **Mutating `formik.values` directly.** Always use `setFieldValue`, `handleChange`, or `setValues`. Direct mutation won't trigger re-renders.
- **Mixing Formik with useState for form fields.** Pick one source of truth. Formik should own all form state.

## Ask-the-agent cheatsheet

- *"Generate a Formik + Yup form for this shape: [list fields]. Use `useFormik` with `validationSchema`. Show errors only when touched. Use `Yup.InferType` for the TS type."*
- *"Convert this Formik form to react-hook-form + Zod. Keep the same validation rules and UX."*
- *"Add a FieldArray for [field] with push/remove. Validate min/max items with Yup."*
- *"Map these Rails 422 errors into Formik field errors using setFieldError."*
- *"This form re-renders too much. Should I switch to react-hook-form or can I optimize within Formik? Show me the analysis."*

## Where this goes next

- **Doc 14** — Forms with react-hook-form + Zod. The modern alternative with better performance and TypeScript ergonomics.
- **Doc 15** — Error boundaries and Suspense, including form-level error handling patterns.
- **Doc 20** — Auth flows, where login/signup forms use these patterns in production.
