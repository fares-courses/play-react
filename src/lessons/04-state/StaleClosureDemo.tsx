import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THE CORE CONCEPT
//
// Every time React re-renders a component it calls the function again.
// That call creates a brand-new closure — a new `count` variable with the
// current value.  A setTimeout callback captures the closure it was *created
// in*, not the one that exists when it finally runs.  So if the component
// re-renders while the timer is still pending, the callback is forever stuck
// reading the old value — it has no way to reach the newer closure.
// ─────────────────────────────────────────────────────────────────────────────

const DELAY_MS = 2000;

// ─── Bug: stale closure ──────────────────────────────────────────────────────

function BuggyCounter() {
  const [count, setCount] = useState(0);

  console.log(`[BuggyCounter] render — count is ${count}`);

  function handleDelayedIncrement() {
    console.log(
      `[BuggyCounter] setTimeout scheduled — closing over count=${count}`
    );

    setTimeout(() => {
      // `count` here is the value from the render in which this function was
      // created.  If you click "Increment now" several times before the 2 s
      // timer fires, `count` is still the old snapshot.
      console.log(
        `[BuggyCounter] setTimeout fired — count in closure is still ${count}`
      );
      setCount(count + 1); // always adds 1 to the *stale* count
    }, DELAY_MS);
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Buggy — stale closure</h3>
      <p style={styles.hint}>
        Click <em>Increment now</em> several times quickly, then watch the
        delayed increment fire. Check the console to see which{" "}
        <code>count</code> the callback captured.
      </p>
      <p style={styles.counter}>count: {count}</p>
      <div style={styles.row}>
        <button onClick={() => setCount((c) => c + 1)}>Increment now</button>
        <button onClick={handleDelayedIncrement}>
          Increment after {DELAY_MS / 1000} s (buggy)
        </button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
      <p style={styles.explanation}>
        <strong>Why it breaks:</strong> <code>handleDelayedIncrement</code>{" "}
        closes over the <code>count</code> variable from <em>this render</em>.
        When the timer fires it calls <code>setCount(count + 1)</code> using
        that stale value — even if the component has re-rendered many times
        since.
      </p>
    </div>
  );
}

// ─── Fix 1: updater function ──────────────────────────────────────────────────

function FixedWithUpdater() {
  const [count, setCount] = useState(0);

  console.log(`[FixedWithUpdater] render — count is ${count}`);

  function handleDelayedIncrement() {
    console.log(
      `[FixedWithUpdater] setTimeout scheduled — closing over count=${count} (irrelevant now)`
    );

    setTimeout(() => {
      // The updater receives the *latest* state at the time it runs, not the
      // closed-over snapshot.  React queues updaters and applies them against
      // the most recent committed state — the closure over `count` is never
      // read here at all.
      console.log(
        `[FixedWithUpdater] setTimeout fired — updater will receive latest state, not closed-over ${count}`
      );
      setCount((latest) => {
        console.log(
          `[FixedWithUpdater] updater called with latest=${latest}, returning ${latest + 1}`
        );
        return latest + 1;
      });
    }, DELAY_MS);
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Fix 1 — updater function</h3>
      <p style={styles.hint}>
        Same test: click <em>Increment now</em> several times, then wait.
        The delayed increment correctly adds 1 to the <em>actual</em> current
        value.
      </p>
      <p style={styles.counter}>count: {count}</p>
      <div style={styles.row}>
        <button onClick={() => setCount((c) => c + 1)}>Increment now</button>
        <button onClick={handleDelayedIncrement}>
          Increment after {DELAY_MS / 1000} s (fixed)
        </button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
      <p style={styles.explanation}>
        <strong>Why it works:</strong> <code>setCount(latest =&gt; latest + 1)</code>{" "}
        never reads the closed-over <code>count</code>. React calls the updater
        function itself at flush time, passing the most recent state as the
        argument. The callback's closure is irrelevant — it only captures{" "}
        <code>setCount</code> (the stable setter), not the value.
      </p>
    </div>
  );
}

// ─── Fix 2: ref as mutable escape hatch ──────────────────────────────────────

function FixedWithRef() {
  const [count, setCount] = useState(0);
  // countRef.current is a single mutable box that lives outside the closure
  // system entirely.  Every render writes the latest count into it.  The
  // setTimeout callback reads *from the box* rather than from its closure,
  // so it always sees the current value.
  //
  // Note: this is a preview of doc 07 (Refs).  The important thing here is
  // understanding *why* it escapes the stale-closure problem, not the ref API.
  const countRef = useRef(count);
  // React 19: ref.current must not be read or written during render.
  // useEffect runs after the render is committed, so this is the correct
  // place to sync state into a ref.
  useEffect(() => {
    countRef.current = count;
    console.log(`[FixedWithRef] effect — synced ref.current to ${count}`);
  });

  console.log(`[FixedWithRef] render — count is ${count}`);

  function handleDelayedIncrement() {
    console.log(
      `[FixedWithRef] setTimeout scheduled — closed-over count=${count} (will go stale)`
    );

    setTimeout(() => {
      // countRef is the same object reference across all renders — there is
      // only ever *one* box.  Reading countRef.current bypasses the closure
      // entirely and goes directly to the mutable value.
      console.log(
        `[FixedWithRef] setTimeout fired — countRef.current is now ${countRef.current} (current), closed-over count was ${count} (stale)`
      );
      setCount(countRef.current + 1);
    }, DELAY_MS);
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Fix 2 — ref as mutable escape hatch</h3>
      <p style={styles.hint}>
        Same test. Watch the console: the callback logs both the stale
        closed-over <code>count</code> AND the fresh <code>ref.current</code>.
      </p>
      <p style={styles.counter}>count: {count}</p>
      <div style={styles.row}>
        <button onClick={() => setCount((c) => c + 1)}>Increment now</button>
        <button onClick={handleDelayedIncrement}>
          Increment after {DELAY_MS / 1000} s (fixed)
        </button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
      <p style={styles.explanation}>
        <strong>Why it works:</strong> <code>useRef</code> returns the{" "}
        <em>same object</em> on every render. The callback closes over that
        object reference (stable), not the <code>count</code> value (changes
        each render). Writing <code>countRef.current = count</code> on every
        render keeps the box up-to-date. When the timer fires it dereferences{" "}
        <code>.current</code> at that moment — always fresh.{" "}
        <strong>Trade-off vs the updater:</strong> this reads state
        synchronously inside the callback, so concurrent-mode edge cases are
        possible. The updater form is the idiomatic React solution; the ref is
        useful when you also need the value for non-React logic (e.g. passing
        into a third-party library).
      </p>
    </div>
  );
}

// ─── Closure anatomy diagram ─────────────────────────────────────────────────

function ClosureDiagram() {
  return (
    <div style={{ ...styles.card, background: "#f9f6ff", fontFamily: "monospace", fontSize: 13 }}>
      <h3 style={styles.cardTitle}>Closure anatomy — why the bug happens</h3>
      <pre style={{ lineHeight: 1.7, margin: 0 }}>{`
Render 1 (count = 0)
┌─ closure A ──────────────────────────────────┐
│  count = 0                                   │
│  handleDelayedIncrement = () => {            │
│    setTimeout(() => {                        │
│      setCount(count + 1)  ← reads count = 0 │  ← captured here
│    }, 2000)                                  │
│  }                                           │
└──────────────────────────────────────────────┘
           │ user clicks "Increment now"
           ↓
Render 2 (count = 1)  — NEW closure, OLD timer still pending
┌─ closure B ──────────────────────┐
│  count = 1  ← NEW variable      │
│  ...                             │
└──────────────────────────────────┘
           │ timer from closure A fires
           ↓
setCount(0 + 1)  ← still using count from closure A!
result: count becomes 1, not 2
`}</pre>
      <p style={{ marginTop: 8 }}>
        Fix 1 (updater): the callback never reads <code>count</code> at all —
        React supplies the latest value as an argument at flush time.
        <br />
        Fix 2 (ref): the callback reads from a mutable box that was{" "}
        <em>updated</em> by render 2 before the timer fired.
      </p>
    </div>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function StaleClosureDemo() {
  console.log("[StaleClosureDemo] render");
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 760 }}>
      <h1>04 — Stale closure in setTimeout</h1>
      <p>
        Open DevTools → Console before interacting. Each card runs independently.
      </p>
      <ClosureDiagram />
      <BuggyCounter />
      <FixedWithUpdater />
      <FixedWithRef />
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  card: {
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: 20,
    marginBottom: 24,
  } as React.CSSProperties,
  cardTitle: {
    marginTop: 0,
  } as React.CSSProperties,
  hint: {
    fontSize: 13,
    color: "#555",
    marginBottom: 12,
  } as React.CSSProperties,
  counter: {
    fontSize: 28,
    fontWeight: "bold",
    margin: "12px 0",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    marginBottom: 16,
  } as React.CSSProperties,
  explanation: {
    fontSize: 13,
    background: "#f5f5f5",
    padding: 12,
    borderRadius: 4,
    lineHeight: 1.6,
    margin: 0,
  } as React.CSSProperties,
};
