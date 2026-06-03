import { ReactNode, createContext, useContext, useState } from 'react';

/**
 * Example: Context Split Pattern
 *
 * Demonstrates how splitting contexts reduces unnecessary renders.
 *
 * Part 1: Combined context (inefficient)
 * - Single context with both user (changes often) and theme (changes rarely)
 * - Consumers re-render even if only the theme changes
 *
 * Part 2: Split contexts (efficient)
 * - UserContext and ThemeContext separate
 * - Components only re-render when their specific context changes
 */

// ============================================================================
// Part 1: Combined Context (Inefficient)
// ============================================================================

interface UserData {
  name: string;
  age: number;
}

interface CombinedContextValue {
  user: UserData;
  setUser: (user: UserData) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const CombinedContext = createContext<CombinedContextValue | null>(null);

function useCombinedContext(): CombinedContextValue {
  const context = useContext(CombinedContext);
  if (!context) {
    throw new Error('useCombinedContext must be used within <CombinedProvider>');
  }
  return context;
}

function CombinedProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData>({ name: 'Alice', age: 30 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <CombinedContext.Provider
      value={{ user, setUser, theme, setTheme }}
    >
      {children}
    </CombinedContext.Provider>
  );
}

// Combined: Consumer that only cares about user
function CombinedUserConsumer() {
  const { user, setUser } = useCombinedContext();
  console.log('[CombinedUserConsumer] render - user:', user.name);

  return (
    <div style={{ padding: '10px', margin: '5px', border: '1px solid #f0a' }}>
      <p>User: {user.name} (age {user.age})</p>
      <button onClick={() => setUser({ ...user, age: user.age + 1 })}>
        Age +1
      </button>
      <small style={{ color: '#f0a' }}>Watch console: re-renders on BOTH user AND theme changes</small>
    </div>
  );
}

// Combined: Consumer that only cares about theme
function CombinedThemeConsumer() {
  const { theme, setTheme } = useCombinedContext();
  console.log('[CombinedThemeConsumer] render - theme:', theme);

  return (
    <div
      style={{
        padding: '10px',
        margin: '5px',
        backgroundColor: theme === 'light' ? '#fff' : '#333',
        color: theme === 'light' ? '#000' : '#fff',
        border: '1px solid #0af',
      }}
    >
      <p>Theme: {theme}</p>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <small style={{ color: '#0af' }}>Watch console: re-renders on BOTH user AND theme changes</small>
    </div>
  );
}

// ============================================================================
// Part 2: Split Contexts (Efficient)
// ============================================================================

interface UserContextValue {
  user: UserData;
  setUser: (user: UserData) => void;
}

interface ThemeContextValue {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const UserContext = createContext<UserContextValue | null>(null);
const ThemeContext = createContext<ThemeContextValue | null>(null);

function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within <UserProvider>');
  }
  return context;
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within <ThemeProvider>');
  }
  return context;
}

function SplitProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData>({ name: 'Bob', age: 25 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// Split: Consumer that only cares about user
function SplitUserConsumer() {
  const { user, setUser } = useUserContext();
  console.log('[SplitUserConsumer] render - user:', user.name);

  return (
    <div style={{ padding: '10px', margin: '5px', border: '1px solid #f0a' }}>
      <p>User: {user.name} (age {user.age})</p>
      <button onClick={() => setUser({ ...user, age: user.age + 1 })}>
        Age +1
      </button>
      <small style={{ color: '#f0a' }}>Watch console: re-renders ONLY when user changes</small>
    </div>
  );
}

// Split: Consumer that only cares about theme
function SplitThemeConsumer() {
  const { theme, setTheme } = useThemeContext();
  console.log('[SplitThemeConsumer] render - theme:', theme);

  return (
    <div
      style={{
        padding: '10px',
        margin: '5px',
        backgroundColor: theme === 'light' ? '#fff' : '#333',
        color: theme === 'light' ? '#000' : '#fff',
        border: '1px solid #0af',
      }}
    >
      <p>Theme: {theme}</p>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <small style={{ color: '#0af' }}>Watch console: re-renders ONLY when theme changes</small>
    </div>
  );
}

// ============================================================================
// Example Runner
// ============================================================================

export function ContextSplitExample() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Context Split Pattern</h1>
      <p>
        <strong>Open the console to see render logs.</strong>
      </p>

      <section style={{ marginBottom: '40px' }}>
        <h2>Part 1: Combined Context (Inefficient)</h2>
        <p>
          Both consumers re-render whenever ANY value changes in the combined context.
        </p>
        <CombinedProvider>
          <CombinedUserConsumer />
          <CombinedThemeConsumer />
        </CombinedProvider>
      </section>

      <section>
        <h2>Part 2: Split Contexts (Efficient)</h2>
        <p>
          Each consumer only re-renders when ITS context changes.
        </p>
        <SplitProviders>
          <SplitUserConsumer />
          <SplitThemeConsumer />
        </SplitProviders>
      </section>

      <section style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <h3>Key Insight</h3>
        <ul>
          <li>
            <strong>Combined:</strong> Click "Age +1" or "Toggle Theme" → BOTH consumers
            re-render (even though one doesn't care)
          </li>
          <li>
            <strong>Split:</strong> Click "Age +1" → only SplitUserConsumer re-renders.
            Click "Toggle Theme" → only SplitThemeConsumer re-renders.
          </li>
          <li>
            <strong>Why it matters:</strong> In real apps with expensive renders, this
            avoids cascading re-renders and keeps performance predictable.
          </li>
        </ul>
      </section>
    </div>
  );
}
