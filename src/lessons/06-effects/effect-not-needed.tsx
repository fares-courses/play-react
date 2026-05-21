import { useState, useEffect } from "react";

/**
 * FullNameBuggy — Anti-pattern: deriving state in an effect
 *
 * Why it's bad:
 * - Causes an extra render: render → effect → state update → render again
 * - fullName is briefly stale after firstName/lastName change
 * - More code, more complexity
 */
function FullNameBuggy({ firstName, lastName }: { firstName: string; lastName: string }) {
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    console.log(
      `[FullNameBuggy] Effect: updating fullName from "${firstName} ${lastName}"`
    );
    setFullName(`${firstName} ${lastName}`);
  }, [firstName, lastName]);

  return (
    <div style={{ padding: "1rem", backgroundColor: "#ffe6e6", borderRadius: "4px" }}>
      <h4>❌ Anti-pattern: deriving state in effect</h4>
      <p>Full name: <strong>{fullName}</strong></p>
      <p style={{ fontSize: "0.875rem", color: "#666" }}>
        Watch the console: effect runs after render, causing an extra render cycle.
      </p>
    </div>
  );
}

/**
 * FullNameGood — Correct: compute during render
 *
 * Why it's good:
 * - One render pass: compute fullName, render, done
 * - fullName is always in sync with firstName/lastName
 * - Simpler code
 */
function FullNameGood({ firstName, lastName }: { firstName: string; lastName: string }) {
  // Just compute it. No state, no effect.
  const fullName = `${firstName} ${lastName}`;

  return (
    <div style={{ padding: "1rem", backgroundColor: "#e6ffe6", borderRadius: "4px" }}>
      <h4>✅ Correct: compute during render</h4>
      <p>Full name: <strong>{fullName}</strong></p>
      <p style={{ fontSize: "0.875rem", color: "#666" }}>
        No effect, no extra render. fullName is computed directly in the render function.
      </p>
    </div>
  );
}

function FullNameWrapper() {
  const [firstName, setFirstName] = useState<string>("Alice");
  const [lastName, setLastName] = useState<string>("Smith");

  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc" }}>
      <h3>Deriving State (Anti-pattern)</h3>
      <p>
        Change the inputs below. Open the console to see the difference: the buggy version
        causes an extra effect + render, while the good version computes during render.
      </p>

      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <label>
            First Name:{" "}
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ padding: "0.5rem" }}
            />
          </label>
        </div>
        <div>
          <label>
            Last Name:{" "}
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ padding: "0.5rem" }}
            />
          </label>
        </div>
      </div>

      <div
        style={{
          marginTop: "1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <FullNameBuggy firstName={firstName} lastName={lastName} />
        <FullNameGood firstName={firstName} lastName={lastName} />
      </div>
    </div>
  );
}

export default FullNameWrapper;
