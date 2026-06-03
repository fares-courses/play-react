import { create } from 'zustand';

/**
 * Example: Zustand Counter Store
 *
 * Demonstrates:
 * - Creating a store with count, increment, and reset actions
 * - Using selectors to subscribe to specific slices of state
 * - Render optimization: updating one selector doesn't trigger other consumers
 * - Console logs show which components render
 */

// ============================================================================
// Store Definition
// ============================================================================

interface CounterStore {
  count: number;
  doubleCount: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  doubleCount: 0,
  increment: () =>
    set((state) => {
      const newCount = state.count + 1;
      return {
        count: newCount,
        doubleCount: newCount * 2,
      };
    }),
  decrement: () =>
    set((state) => {
      const newCount = state.count - 1;
      return {
        count: newCount,
        doubleCount: newCount * 2,
      };
    }),
  reset: () =>
    set({
      count: 0,
      doubleCount: 0,
    }),
}));

// ============================================================================
// Consumer Components (using selectors)
// ============================================================================

/**
 * Component 1: Counter Display
 * Only subscribes to 'count' via selector
 * Will only re-render when count changes
 */
function CounterDisplay() {
  // Selector: only subscribe to 'count'
  const count = useCounterStore((state) => state.count);

  console.log('[CounterDisplay] render - count:', count);

  return (
    <div
      style={{
        padding: '15px',
        margin: '10px',
        border: '2px solid #e74c3c',
        backgroundColor: '#fadbd8',
      }}
    >
      <h3 style={{ color: '#e74c3c' }}>Counter Display</h3>
      <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{count}</p>
      <small style={{ color: '#666' }}>
        Selector: only watches 'count'
      </small>
    </div>
  );
}

/**
 * Component 2: Double Counter Display
 * Only subscribes to 'doubleCount' via selector
 * Will only re-render when doubleCount changes
 */
function DoubleCountDisplay() {
  // Selector: only subscribe to 'doubleCount'
  const doubleCount = useCounterStore((state) => state.doubleCount);

  console.log('[DoubleCountDisplay] render - doubleCount:', doubleCount);

  return (
    <div
      style={{
        padding: '15px',
        margin: '10px',
        border: '2px solid #3498db',
        backgroundColor: '#d6eaf8',
      }}
    >
      <h3 style={{ color: '#3498db' }}>Double Counter Display</h3>
      <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{doubleCount}</p>
      <small style={{ color: '#666' }}>
        Selector: only watches 'doubleCount'
      </small>
    </div>
  );
}

/**
 * Component 3: Controls
 * Subscribes to increment, decrement, reset actions (no re-renders on count change)
 * This component uses the actions but doesn't watch the state values
 */
function CounterControls() {
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);
  const reset = useCounterStore((state) => state.reset);
  const count = useCounterStore((state) => state.count);

  console.log('[CounterControls] render - count:', count);

  return (
    <div
      style={{
        padding: '15px',
        margin: '10px',
        border: '2px solid #27ae60',
        backgroundColor: '#d5f4e6',
      }}
    >
      <h3 style={{ color: '#27ae60' }}>Controls</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button
          onClick={() => decrement()}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          -
        </button>
        <button
          onClick={() => increment()}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#27ae60',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          +
        </button>
        <button
          onClick={() => reset()}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#95a5a6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Reset
        </button>
      </div>
      <small style={{ color: '#666' }}>
        Current count: {count}
      </small>
    </div>
  );
}

/**
 * Component 4: Summary (subscribes to both count and doubleCount)
 * Will re-render when either count or doubleCount changes
 */
function CounterSummary() {
  const count = useCounterStore((state) => state.count);
  const doubleCount = useCounterStore((state) => state.doubleCount);

  console.log('[CounterSummary] render - count:', count, 'doubleCount:', doubleCount);

  return (
    <div
      style={{
        padding: '15px',
        margin: '10px',
        border: '2px solid #f39c12',
        backgroundColor: '#fef5e7',
      }}
    >
      <h3 style={{ color: '#f39c12' }}>Summary</h3>
      <p>Count: <strong>{count}</strong></p>
      <p>Double: <strong>{doubleCount}</strong></p>
      <p>Sum: <strong>{count + doubleCount}</strong></p>
      <small style={{ color: '#666' }}>
        Selectors: watches both 'count' and 'doubleCount'
      </small>
    </div>
  );
}

// ============================================================================
// Example Runner
// ============================================================================

export function ZustandCounterExample() {
  console.log('[ZustandCounterExample] render');

  return (
    <div style={{ padding: '20px' }}>
      <h1>Zustand Counter Store</h1>
      <p>
        <strong>Open the console to see render logs.</strong>
      </p>
      <p>
        Notice how updating count only re-renders CounterDisplay and CounterSummary,
        not DoubleCountDisplay (even though doubleCount is derived from count).
        This is because each component uses selectors to watch only their specific slice.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <CounterDisplay />
        <DoubleCountDisplay />
      </div>

      <CounterControls />
      <CounterSummary />

      <section style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <h3>Key Insights</h3>
        <ul>
          <li>
            <strong>Selectors:</strong> Each component uses a selector function to
            subscribe to only its part of the store.
          </li>
          <li>
            <strong>Render optimization:</strong> CounterDisplay re-renders when count changes.
            DoubleCountDisplay re-renders when doubleCount changes (even though they're
            derived together, Zustand treats them as separate subscriptions).
          </li>
          <li>
            <strong>Predictable updates:</strong> Unlike Context, Zustand gives you
            fine-grained control over what triggers re-renders.
          </li>
          <li>
            <strong>Comparison:</strong> This is more efficient than split contexts because
            you can re-render ONLY the exact components that care about a specific value,
            not entire provider boundaries.
          </li>
        </ul>
      </section>
    </div>
  );
}
