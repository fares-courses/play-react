import { useState, useEffect } from "react";

/**
 * ChatRoom component demonstrating synchronization with a prop.
 *
 * Shows:
 * - Effect setup/cleanup runs when a dependency changes
 * - The connection always reflects the current roomId
 * - Clicking to switch rooms triggers cleanup (disconnect) then setup (reconnect)
 */
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    console.log(`[ChatRoom] Setup: connecting to "${roomId}"`);

    // Simulate connection
    const connection = {
      connect: () => console.log(`  → Connected to "${roomId}"`),
      disconnect: () => console.log(`  → Disconnected from "${roomId}"`),
    };

    connection.connect();

    // Cleanup: disconnect from the current room before connecting to the next
    return () => {
      console.log(`[ChatRoom] Cleanup: disconnecting from "${roomId}"`);
      connection.disconnect();
    };
  }, [roomId]); // Re-run whenever roomId changes

  return (
    <div style={{ padding: "1rem", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>
      <h4>Connected to: <strong>{roomId}</strong></h4>
      <p style={{ fontSize: "0.875rem", color: "#666" }}>
        Open the console and click buttons below to see the effect synchronize.
      </p>
    </div>
  );
}

function ChatRoomWrapper() {
  const [roomId, setRoomId] = useState<string>("general");
  const rooms = ["general", "random", "react"];

  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc" }}>
      <h3>ChatRoom (Synchronization)</h3>

      <ChatRoom roomId={roomId} />

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {rooms.map((room) => (
          <button
            key={room}
            onClick={() => setRoomId(room)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: roomId === room ? "#007bff" : "#ddd",
              color: roomId === room ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {room}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ChatRoomWrapper;
