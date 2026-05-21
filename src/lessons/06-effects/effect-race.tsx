import { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
}

/**
 * UserProfile (BUGGY VERSION)
 * Demonstrates the race condition: if requests complete out of order,
 * the UI shows stale data.
 */
function UserProfileBuggy({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // ❌ BUG: No cleanup. If userId changes before response arrives,
    // we'll set state from the old request, overwriting the new one.
    const delay = Math.random() * 2000; // Random delay to simulate network variance
    const timeout = setTimeout(() => {
      console.log(`[UserProfileBuggy] Resolved userId=${userId} after ${delay.toFixed(0)}ms`);
      setUser({ id: userId, name: `User ${userId}` });
      setLoading(false);
    }, delay);

    // Missing cleanup! This is the bug.
  }, [userId]);

  return (
    <div style={{ padding: "1rem", backgroundColor: "#ffe6e6", borderRadius: "4px" }}>
      <h4>❌ Buggy Version (no cleanup)</h4>
      {loading ? (
        <p>Loading...</p>
      ) : user ? (
        <p>
          User {user.id}: <strong>{user.name}</strong>
        </p>
      ) : (
        <p>No user loaded</p>
      )}
    </div>
  );
}

/**
 * UserProfile (FIXED VERSION)
 * Uses AbortController to cancel in-flight requests when userId changes.
 */
function UserProfileFixed({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // ✅ FIX: Use AbortController to cancel the request if the effect is cleaned up
    const controller = new AbortController();

    const delay = Math.random() * 2000;
    const timeout = setTimeout(() => {
      // Only update state if this effect hasn't been cleaned up
      if (!controller.signal.aborted) {
        console.log(`[UserProfileFixed] Resolved userId=${userId} after ${delay.toFixed(0)}ms`);
        setUser({ id: userId, name: `User ${userId}` });
        setLoading(false);
      } else {
        console.log(`[UserProfileFixed] Ignoring response for userId=${userId} (effect cleaned up)`);
      }
    }, delay);

    // Cleanup: cancel the in-flight request
    return () => {
      console.log(`[UserProfileFixed] Cleanup: userId=${userId}`);
      controller.abort();
      clearTimeout(timeout);
    };
  }, [userId]);

  return (
    <div style={{ padding: "1rem", backgroundColor: "#e6ffe6", borderRadius: "4px" }}>
      <h4>✅ Fixed Version (with AbortController)</h4>
      {loading ? (
        <p>Loading...</p>
      ) : user ? (
        <p>
          User {user.id}: <strong>{user.name}</strong>
        </p>
      ) : (
        <p>No user loaded</p>
      )}
    </div>
  );
}

function UserFetchWrapper() {
  const [userId, setUserId] = useState<number>(1);

  const handleQuickChange = () => {
    // Change userId twice quickly to trigger race condition
    setUserId(2);
    setTimeout(() => setUserId(3), 100);
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc" }}>
      <h3>Race Condition in Effects</h3>
      <p>
        Try clicking "Quick Change" — it changes userId twice quickly. Watch the console
        and the buggy version to see the race condition. The fixed version cancels
        in-flight requests.
      </p>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setUserId(1)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: userId === 1 ? "#007bff" : "#ddd",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          User 1
        </button>
        <button
          onClick={() => setUserId(2)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: userId === 2 ? "#007bff" : "#ddd",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          User 2
        </button>
        <button
          onClick={() => setUserId(3)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: userId === 3 ? "#007bff" : "#ddd",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          User 3
        </button>
        <button
          onClick={handleQuickChange}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#ff6b6b",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Quick Change (2 → 3)
        </button>
      </div>

      <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <UserProfileBuggy userId={userId} />
        <UserProfileFixed userId={userId} />
      </div>
    </div>
  );
}

export default UserFetchWrapper;
