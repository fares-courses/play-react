import Clock from "./effect-tick";
import ChatRoomWrapper from "./effect-sync";
import UserFetchWrapper from "./effect-race";
import FullNameWrapper from "./effect-not-needed";

/**
 * Lesson 06 — Effects as Synchronization
 *
 * Four examples demonstrating useEffect patterns:
 * 1. effect-tick: Clock with setInterval (cleanup & Strict Mode)
 * 2. effect-sync: ChatRoom with prop changes (synchronization)
 * 3. effect-race: User fetch with race condition fix
 * 4. effect-not-needed: Deriving state (anti-pattern)
 */
function Lesson06Effects() {
  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Lesson 06 — Effects as Synchronization</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <Clock />
        <ChatRoomWrapper />
        <UserFetchWrapper />
        <FullNameWrapper />
      </div>
    </div>
  );
}

export default Lesson06Effects;
