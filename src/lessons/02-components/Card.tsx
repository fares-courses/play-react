// Demonstrates: a reusable layout component that accepts typed props and
// renders arbitrary child content via React.ReactNode (the "composition" pattern).

import React from 'react'

type CardProps = {
  title: string
  children: React.ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '1rem', color: '#1a202c' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
