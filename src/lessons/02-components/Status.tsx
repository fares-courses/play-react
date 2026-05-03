// Demonstrates: union of string literals to restrict prop values.
// TypeScript ensures only specific values ("pending" | "success" | "error") are allowed.

import React from 'react'

type StatusVariant = 'pending' | 'success' | 'error'

type StatusProps = {
  variant: StatusVariant
  message: string
}

const statusStyles: Record<StatusVariant, React.CSSProperties> = {
  pending: { backgroundColor: '#fef3c7', color: '#92400e', borderLeft: '4px solid #fbbf24' },
  success: { backgroundColor: '#dcfce7', color: '#166534', borderLeft: '4px solid #22c55e' },
  error:   { backgroundColor: '#fee2e2', color: '#991b1b', borderLeft: '4px solid #ef4444' },
}

export function Status({ variant, message }: StatusProps) {
  return (
    <div style={{
      ...statusStyles[variant],
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '12px',
      fontSize: '0.9rem',
    }}>
      {message}
    </div>
  )
}
