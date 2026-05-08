# 19 — WebSockets and real-time

## What you're learning & why it matters

You're learning how to add real-time updates to a React app — chat, live notifications, collaborative editing, server-pushed status. The transport varies (raw WebSocket, Socket.IO, ActionCable from Rails) but the React patterns are the same: connect on mount, sync events into state, clean up on unmount, handle reconnection.

This is one of the cleanest applications of "effects as synchronization" (doc 06). If you understood that doc, this one is mostly applying it.

### Terms first

- **WebSocket**: a persistent bidirectional connection over TCP, upgraded from HTTP. Messages flow both ways at any time.
- **Server-Sent Events (SSE)**: a simpler one-way alternative — the server pushes, the client receives. Built on plain HTTP. Good for "stream of updates" without client-to-server messaging.
- **Long polling**: an old fallback — client sends a request that the server holds open until something happens. Clunky; mostly replaced by WS/SSE.
- **Socket.IO**: a popular library that wraps WebSockets with reconnection, rooms, fallback transports. Has both server (Node) and client libraries.
- **ActionCable**: Rails' built-in WebSocket framework. Has `@rails/actioncable` as a JS client.
- **Heartbeat / ping**: periodic message to keep the connection alive and detect drops.
- **Reconnection backoff**: when reconnecting after a disconnect, wait longer between attempts so you don't hammer the server.

## Mental model

> **A WebSocket connection is an external system that needs to stay synchronized with a piece of state (the room you're in, the user you're authenticated as). That's exactly what `useEffect` is for. Connect in setup, disconnect in cleanup, dispatch incoming messages into React state.**

The pattern: a custom hook owns the connection. Components subscribe via hooks or context. The connection itself never leaks into component code.

## Approach 1 — Native WebSocket

For simple cases or full control:

```tsx
import { useEffect, useRef, useState } from "react";

type Message = { id: string; text: string; from: string };

function useChat(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`wss://api.myapp.com/ws/rooms/${roomId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as Message;
      setMessages((prev) => [...prev, msg]);
    };

    ws.onerror = (err) => console.error("WS error", err);

    return () => ws.close();
  }, [roomId]);

  function send(text: string) {
    wsRef.current?.send(JSON.stringify({ type: "message", text }));
  }

  return { messages, send };
}
```

Used like:
```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  const { messages, send } = useChat(roomId);
  return (
    <>
      <ul>{messages.map(m => <li key={m.id}>{m.text}</li>)}</ul>
      <button onClick={() => send("hi")}>Send</button>
    </>
  );
}
```

Two key bits:
- The connection is in a ref (doc 07) — it doesn't drive UI re-renders, only the messages do.
- Cleanup closes the connection when `roomId` changes or the component unmounts.

Things this doesn't handle out of the box: reconnection, exponential backoff, auth, heartbeats, message queueing while disconnected. That's why most apps use a library.

## Approach 2 — Socket.IO

If your backend is Node (or your team uses Socket.IO):

```bash
npm install socket.io-client
```

```tsx
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token: localStorage.getItem("token") },
    });
  }
  return socket;
}
```

```tsx
function useRoom(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const s = getSocket();
    s.emit("join", { roomId });
    const onMessage = (msg: Message) => setMessages((prev) => [...prev, msg]);
    s.on("message", onMessage);

    return () => {
      s.emit("leave", { roomId });
      s.off("message", onMessage);
    };
  }, [roomId]);

  return { messages, send: (text: string) => getSocket().emit("message", { roomId, text }) };
}
```

Socket.IO handles reconnection, pings, and room semantics natively. Auth via the `auth` option, which the server reads on connect.

## Approach 3 — Rails ActionCable

If your backend is Rails using ActionCable:

```bash
npm install @rails/actioncable
```

```ts
import { createConsumer } from "@rails/actioncable";

const consumer = createConsumer(`${import.meta.env.VITE_WS_URL}/cable`);
```

```tsx
function useChat(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const subscription = consumer.subscriptions.create(
      { channel: "ChatChannel", room_id: roomId },
      {
        received(data: Message) {
          setMessages((prev) => [...prev, data]);
        },
      }
    );

    return () => subscription.unsubscribe();
  }, [roomId]);

  function send(text: string) {
    consumer.subscriptions.subscriptions
      .find(s => s.identifier.includes(`"room_id":${roomId}`))
      ?.send({ text });
  }

  return { messages, send };
}
```

ActionCable handles reconnection. Auth is typically via session/cookie or a token query param on the connection URL — depends on your Rails setup.

## Authentication

The connection is just like an HTTP request — it needs to identify the user.

- **Bearer in URL or query param**: `wss://api/cable?token=eyJ...` — works but the URL gets logged in some places. Use HTTPS-equivalent (`wss://`).
- **Bearer in subprotocol header** (native WS): non-standard but supported by some servers — pass as the second arg to `new WebSocket(url, [token])`.
- **Cookie-based**: if you use cookie sessions, `wss://` connections from the same origin send cookies automatically. Easiest with same-origin.
- **Socket.IO `auth` option**: clean — sent on the initial handshake.
- **ActionCable**: typically uses cookies (so the user must be logged in to the same domain). For separate-origin SPAs, configure ActionCable to accept tokens.

Match the auth scheme to your HTTP API's choice.

## Reconnection and resilience

For production, you need reconnection logic:

1. **Detect disconnect** — `ws.onclose` (native), `socket.on("disconnect")` (Socket.IO).
2. **Backoff** — wait 1s, 2s, 4s, 8s, capped at e.g. 30s. Don't reconnect instantly in a tight loop.
3. **Resync state** — after reconnecting, refetch any state that might have changed during the disconnect (e.g., re-query the messages list with TanStack Query).
4. **UI signaling** — show a subtle "reconnecting…" badge so users know the live updates are paused.

Library choice (Socket.IO, ActionCable) handles 1+2 for free. State resync is your responsibility.

## Combining real-time with TanStack Query

The cleanest pattern: TanStack Query owns the data; the WebSocket triggers cache updates.

```tsx
function useLiveMessages(roomId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => api.get<Message[]>(`/rooms/${roomId}/messages`),
  });

  useEffect(() => {
    const s = getSocket();
    s.emit("join", { roomId });
    const onMessage = (msg: Message) => {
      qc.setQueryData<Message[]>(["messages", roomId], (prev) => [...(prev ?? []), msg]);
    };
    s.on("message", onMessage);
    return () => { s.emit("leave", { roomId }); s.off("message", onMessage); };
  }, [roomId, qc]);

  return query;
}
```

Best of both: initial load + pagination via Query, live updates via WebSocket pushing into the same cache.

## Combining with `useOptimistic`

Send a message, see it appear instantly, replaced by the server's authoritative version when the WS echoes it back. Doc 14's `useOptimistic` is perfect for this. Server-confirmed message replaces optimistic placeholder.

## How to use this doc with an agent

**1. Build the lesson:**
```
In src/lessons/18-websockets/, build a Chat component using:

Option A (no real backend): a fake "WS" implemented as a custom hook that
uses BroadcastChannel between tabs to simulate multi-user chat — open two
tabs, type in one, see in the other.

Option B (if I want a real one): set up socket.io-client against a tiny
Node mock server you scaffold (with instructions to npm-i and run separately).

Whichever I choose, the React side should:
- useChat(roomId) hook with messages and send()
- A connection ref, NOT in state
- Proper cleanup on unmount/roomId change
- A "reconnecting…" indicator (simulate by toggling navigator.onLine in
  devtools)
- Bonus: integrate with TanStack Query — initial messages from a fake
  /api/messages, live messages from the WS, both in the same cache
- Bonus: useOptimistic for instant message feedback

Use TypeScript strictly. Comment the synchronization logic.
```

**2. Architecture exercise:**
```
For each scenario, recommend the right approach:
- A live order tracker (server pushes status changes)
- A multiplayer drawing board (high-frequency two-way)
- A notifications dropdown that updates as new ones arrive
- A live "X people viewing this" counter
- A collaborative document editor with cursor positions

Tell me: native WS, Socket.IO, ActionCable, SSE, or polling? And whether
to integrate with TanStack Query.
```

**3. Reconnection deep-dive:**
```
Build a reconnecting WebSocket helper from scratch (no library) that:
- Reconnects on close, with exponential backoff capped at 30s
- Cancels backoff if the user manually triggers reconnect
- Emits status events (connecting / connected / disconnected / reconnecting)
- Buffers outgoing messages while disconnected, sends them on reconnect
Wrap it in a React hook that components consume. Show me the test cases
that matter and write code that passes them.
```

## Checkpoints

1. Why does the WebSocket connection live in a ref instead of state?
2. What does the cleanup function in the connection's useEffect do, and what bug appears without it?
3. What's the difference between Socket.IO and a native WebSocket from the developer's perspective?
4. After a reconnect, why might you need to re-query data with TanStack Query?
5. How does combining `useOptimistic` with WebSocket echoes give the smoothest UX?
6. What are the auth options for WS connections, and which depends on your HTTP auth scheme?

## Footguns

- **No cleanup.** Connections leak; under React Strict Mode you get duplicates immediately. Always close in cleanup.
- **Connecting per component instead of per app.** Every screen opens its own connection — wasteful. Have one shared connection (singleton or via context); subscribe per component.
- **Reconnect storm on disconnect.** Without backoff, you'll hammer the server. Use exponential backoff, possibly with jitter.
- **Stale state in `onmessage`.** The handler closure captures old state. Use the updater form `setX(prev => ...)`, refs for "latest state" reads, or `useEffectEvent`.
- **Re-rendering on every message.** Updating a state array on each message is fine until messages are very frequent. For high-throughput streams (cursor positions, financial ticks), batch updates or use a non-state mechanism.
- **No "reconnecting" UI.** Users don't realize live updates have stopped; data appears stale.
- **Mixing WS auth with HTTP auth carelessly.** Subtle bugs: WS connects with stale token, never refreshes. Reconnect with current token after auth changes.
- **Keeping a connection open on logout.** Reuses the old user's session. Disconnect on logout.

## Ask-the-agent cheatsheet

- *"Build a custom hook that wraps a [Socket.IO/ActionCable/native WS] connection with proper cleanup, reconnection backoff, and integration with TanStack Query for cache updates."*
- *"This component holds a WebSocket in state and re-renders on every message. Move the connection to a ref and only re-render on actual data changes."*
- *"Add an optimistic 'message sending' UI: message appears immediately with reduced opacity, gets replaced when the server echoes it back over the WS."*
- *"My WebSocket is sending messages with stale state from a closure. Identify the bug and apply the right fix (updater function / ref / useEffectEvent)."*
- *"My app reconnects after the server restarts but data shown is stale. Add a post-reconnect TanStack Query invalidation for the relevant keys."*

## Where this goes next

- **Doc 20** — File uploads, where progress events are real-time-ish but use different APIs.
- **Doc 22** — Animations, often used with real-time UIs to soften incoming-data UX.
