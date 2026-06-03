import { ReactNode, createContext, useContext, useState } from 'react';

/**
 * Example: ThemeContext with light/dark toggle
 *
 * Demonstrates the "value + setter + custom hook + throw-if-no-provider" pattern.
 * - Single context holds both current theme and setter
 * - Custom hook enforces provider presence
 * - Three nested components with deepest one toggling theme
 */

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Context defaults to null; custom hook throws if not in provider
const ThemeContext = createContext<ThemeContextType | null>(null);

// Custom hook that enforces provider
function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within <ThemeProvider>');
  }
  return context;
}

// Provider component
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Level 1: Outer component using theme
function OuterBox() {
  const { theme } = useTheme();
  console.log('[OuterBox] render');
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a',
        color: theme === 'light' ? '#000' : '#fff',
        border: `2px solid ${theme === 'light' ? '#ccc' : '#666'}`,
      }}
    >
      <h2>Outer Box (Theme: {theme})</h2>
      <MiddleBox />
    </div>
  );
}

// Level 2: Middle component (just passes children, doesn't consume theme)
function MiddleBox() {
  console.log('[MiddleBox] render');
  return (
    <div style={{ padding: '15px', margin: '10px', border: '1px dashed #999' }}>
      <p>Middle Box (doesn't use theme directly)</p>
      <InnerBox />
    </div>
  );
}

// Level 3: Deepest component with toggle button
function InnerBox() {
  const { theme, setTheme } = useTheme();
  console.log('[InnerBox] render');

  const handleToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div
      style={{
        padding: '15px',
        margin: '10px',
        backgroundColor: theme === 'light' ? '#f0f0f0' : '#333',
        border: `2px solid ${theme === 'light' ? '#999' : '#666'}`,
      }}
    >
      <p>Inner Box (deepest level)</p>
      <button
        onClick={handleToggle}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          backgroundColor: theme === 'light' ? '#007bff' : '#0056b3',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        Toggle Theme ({theme})
      </button>
    </div>
  );
}

// Example runner
export function ContextThemeExample() {
  return (
    <div>
      <h1>Context Theme Example</h1>
      <p>
        Demonstrates: value + setter + custom hook + throw-if-no-provider pattern
      </p>
      <ThemeProvider>
        <OuterBox />
      </ThemeProvider>
      <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        Watch the console: OuterBox and InnerBox re-render on theme change.
        MiddleBox doesn't consume theme, but still re-renders (context propagation).
      </p>
    </div>
  );
}
