import { useReducer, useState } from "react";

// ─── 1. useState: value form vs updater function form ───────────────────────

function CounterDemo() {
  console.log("[CounterDemo] render");

  const [directCount, setDirectCount] = useState(0);
  const [updaterCount, setUpdaterCount] = useState(0);

  function incrementDirectThreeTimes() {
    // All three reads see the same stale `directCount` from this render.
    // React batches these — result: +1, not +3.
    setDirectCount(directCount + 1);
    setDirectCount(directCount + 1);
    setDirectCount(directCount + 1);
  }

  function incrementUpdaterThreeTimes() {
    // Each updater receives the latest pending state, so result: +3.
    setUpdaterCount((c) => c + 1);
    setUpdaterCount((c) => c + 1);
    setUpdaterCount((c) => c + 1);
  }

  return (
    <section style={{ border: "1px solid #ccc", padding: 16, marginBottom: 24 }}>
      <h2>1. useState — value form vs updater function</h2>
      <div style={{ display: "flex", gap: 32 }}>
        <div>
          <h3>Direct: setCount(count + 1)</h3>
          <p>Count: {directCount}</p>
          <button onClick={incrementDirectThreeTimes}>
            +1 three times (direct)
          </button>
          <p style={{ fontSize: 12, color: "#888" }}>
            Expect: +1 per click (not +3)
          </p>
        </div>
        <div>
          <h3>Updater: setCount(c =&gt; c + 1)</h3>
          <p>Count: {updaterCount}</p>
          <button onClick={incrementUpdaterThreeTimes}>
            +1 three times (updater)
          </button>
          <p style={{ fontSize: 12, color: "#888" }}>
            Expect: +3 per click
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── 2. useReducer: form with discriminated-union actions ────────────────────

type FormState = {
  name: string;
  email: string;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
};

type FormAction =
  | { type: "setField"; field: "name" | "email"; value: string }
  | { type: "reset" }
  | { type: "submitStart" }
  | { type: "submitSuccess" }
  | { type: "submitFailure"; error: string };

const initialFormState: FormState = {
  name: "",
  email: "",
  submitting: false,
  error: null,
  submitted: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  console.log("[formReducer] action:", action, "| prev state:", state);

  switch (action.type) {
    case "setField":
      return { ...state, [action.field]: action.value };

    case "reset":
      return initialFormState;

    case "submitStart":
      return { ...state, submitting: true, error: null };

    case "submitSuccess":
      return { ...state, submitting: false, submitted: true };

    case "submitFailure":
      return { ...state, submitting: false, error: action.error };
  }
}

function FormDemo() {
  console.log("[FormDemo] render");

  const [state, dispatch] = useReducer(formReducer, initialFormState);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "submitStart" });

    // Simulate async: succeed if email contains "@", fail otherwise.
    setTimeout(() => {
      if (state.email.includes("@")) {
        dispatch({ type: "submitSuccess" });
      } else {
        dispatch({ type: "submitFailure", error: "Invalid email address." });
      }
    }, 800);
  }

  if (state.submitted) {
    return (
      <section style={{ border: "1px solid #ccc", padding: 16, marginBottom: 24 }}>
        <h2>2. useReducer — form</h2>
        <p style={{ color: "green" }}>
          Submitted! name={state.name}, email={state.email}
        </p>
        <button onClick={() => dispatch({ type: "reset" })}>Reset</button>
      </section>
    );
  }

  return (
    <section style={{ border: "1px solid #ccc", padding: 16, marginBottom: 24 }}>
      <h2>2. useReducer — form with discriminated-union actions</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
        <label>
          Name
          <input
            value={state.name}
            onChange={(e) =>
              dispatch({ type: "setField", field: "name", value: e.target.value })
            }
            disabled={state.submitting}
          />
        </label>
        <label>
          Email
          <input
            value={state.email}
            onChange={(e) =>
              dispatch({ type: "setField", field: "email", value: e.target.value })
            }
            disabled={state.submitting}
          />
        </label>
        {state.error && <p style={{ color: "red" }}>{state.error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={state.submitting}>
            {state.submitting ? "Submitting…" : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "reset" })}
            disabled={state.submitting}
          >
            Reset
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#888" }}>
          Tip: use a valid email (with @) to simulate success; omit @ for failure.
        </p>
      </form>
    </section>
  );
}

// ─── 3. Lifting state up ─────────────────────────────────────────────────────

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function TextInput({ value, onChange }: TextInputProps) {
  console.log("[TextInput] render, value:", value);
  return (
    <div>
      <label>
        Type something:{" "}
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

type TransformedDisplayProps = {
  value: string;
};

function TransformedDisplay({ value }: TransformedDisplayProps) {
  console.log("[TransformedDisplay] render, value:", value);
  const transformed = value.toUpperCase().split("").reverse().join("");
  return (
    <div>
      <p>
        Reversed + uppercased: <strong>{transformed || "—"}</strong>
      </p>
    </div>
  );
}

function LiftingStateDemo() {
  console.log("[LiftingStateDemo] render");

  const [text, setText] = useState("");

  return (
    <section style={{ border: "1px solid #ccc", padding: 16, marginBottom: 24 }}>
      <h2>3. Lifting state up</h2>
      <p style={{ fontSize: 12, color: "#888" }}>
        State lives here in the parent; siblings share it via props.
      </p>
      <TextInput value={text} onChange={setText} />
      <TransformedDisplay value={text} />
    </section>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function StateExamples() {
  console.log("[StateExamples] render");
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 720 }}>
      <h1>04 — State: useState &amp; useReducer</h1>
      <CounterDemo />
      <FormDemo />
      <LiftingStateDemo />
    </main>
  );
}
