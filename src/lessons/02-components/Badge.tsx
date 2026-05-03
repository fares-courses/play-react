// Demonstrates: a union-type prop ("variant") that drives conditional styling —
// TypeScript narrows the valid values at compile time, eliminating invalid states.
// Also encapsulates role-to-variant mapping logic so Badge is self-contained.

import React from 'react'

export type BadgeVariant = 'info' | 'warning' | 'danger' | 'success'

export type BadgeProps = {
  variant: BadgeVariant
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  info:    { backgroundColor: '#bee3f8', color: '#2b6cb0' },
  warning: { backgroundColor: '#fefcbf', color: '#744210' },
  danger:  { backgroundColor: '#fed7d7', color: '#9b2335' },
  success: { backgroundColor: '#c6f6d5', color: '#22543d' },
}

export function roleToBadgeVariant(role: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    admin:   'danger',
    manager: 'warning',
    member:  'info',
    lead:    'success',
  }
  return map[role.toLowerCase()] ?? 'info'
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span style={{
      ...variantStyles[variant],
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}
