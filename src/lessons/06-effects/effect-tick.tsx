import { useState, useEffect } from "react";

/**
 * Clock component demonstrating useEffect with setInterval.
 *
 * Shows:
 * - Setup: interval is created on mount/dep change
 * - Cleanup: interval is cleared before next setup and on unmount
 * - Strict Mode in dev: you'll see setup → cleanup → setup in console
 */
function Clock() {
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    console.log("[Clock] Setup: interval starting");

    // Run the interval block every 1000ms and put it in useEffect to ensure the block as a whole it running one hence there is only one useInterval that updates the time
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    // Cleanup function: runs before next effect and on unmount
    return () => {
      console.log("[Clock] Cleanup: interval cleared");
      clearInterval(interval);
    };
  }, []); // Empty deps: setup once on mount, cleanup once on unmount

  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc" }}>
      <h3>Clock (with setInterval)</h3>
      <p style={{ fontSize: "2rem", fontFamily: "monospace" }}>{time}</p>
      <p style={{ fontSize: "0.875rem", color: "#666" }}>
        Open the browser console to see setup/cleanup logs. In development (Strict Mode),
        you'll see: setup → cleanup → setup (React stress-tests your cleanup).
      </p>
    </div>
  );
}

export default Clock;
