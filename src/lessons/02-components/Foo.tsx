// Demonstrates: strict TypeScript typing for components.
// Define a separate Props type, use it as parameter annotation, no 'any'.

import React from 'react'

type FooProps = {
  label: string
  count: number
  onIncrement: (newCount: number) => void
  children?: React.ReactNode
}

export function Foo({
  label,
  count,
  onIncrement,
  children,
}: FooProps) {
  return (
    <div style={{
      border: '1px solid #cbd5e0',
      borderRadius: '6px',
      padding: '12px',
      backgroundColor: '#f7fafc',
    }}>
      <h4 style={{ margin: '0 0 8px' }}>{label}</h4>
      <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>
        Count: <strong>{count}</strong>
      </p>
      <button
        onClick={() => onIncrement(count + 1)}
        style={{
          padding: '4px 8px',
          backgroundColor: '#4299e1',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
        }}
      >
        Increment
      </button>
      {children && <div style={{ marginTop: '12px' }}>{children}</div>}
    </div>
  )
}
