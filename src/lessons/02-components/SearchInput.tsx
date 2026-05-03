// Demonstrates: typed event handlers using React.SomethingEvent<HTMLSomethingElement>.
// Strict types ensure handlers receive the correct event and element types.

import React from 'react'

type SearchInputProps = {
  placeholder?: string
  onSearch: (query: string) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (e: React.BlurEvent<HTMLInputElement>) => void
}

export function SearchInput({
  placeholder = 'Search...',
  onSearch,
  onFocus,
  onBlur,
}: SearchInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.currentTarget.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        width: '100%',
        padding: '8px 12px',
        fontSize: '0.95rem',
        border: '1px solid #cbd5e0',
        borderRadius: '4px',
        boxSizing: 'border-box',
      }}
    />
  )
}
