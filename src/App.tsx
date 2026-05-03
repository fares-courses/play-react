import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { UserList } from './lessons/02-components/UserList'
import { Foo } from './lessons/02-components/Foo'
import { Status } from './lessons/02-components/Status'
import { SearchInput } from './lessons/02-components/SearchInput'

const DEMO_USERS = [
  { id: 1, name: 'Alice Chen',    role: 'Admin'   },
  { id: 2, name: 'Bob Martínez',  role: 'Manager' },
  { id: 3, name: 'Carol Okafor',  role: 'Lead'    },
  { id: 4, name: 'David Kim',     role: 'Member'  },
]

function App() {
  const [count, setCount] = useState(0)
  const [fooCount, setFooCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedInput, setFocusedInput] = useState(false)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '16px' }}>Lesson 02 — Components, JSX &amp; Props</h2>
        <UserList users={DEMO_USERS} />

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 12px' }}>Foo Component Demo</h3>
          <Foo
            label="Counter"
            count={fooCount}
            onIncrement={setFooCount}
          >
            The Foo component re-renders when count changes via setState.
          </Foo>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 12px' }}>Status Component Demo</h3>
          <p style={{ fontSize: '0.9rem', margin: '0 0 8px', color: '#666' }}>
            Union types restrict variant to: "pending" | "success" | "error"
          </p>
          <Status variant="pending" message="Loading your data..." />
          <Status variant="success" message="Data loaded successfully!" />
          <Status variant="error" message="Something went wrong. Please try again." />
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 12px' }}>SearchInput Component Demo</h3>
          <p style={{ fontSize: '0.9rem', margin: '0 0 8px', color: '#666' }}>
            Typed event handlers: onChange, onKeyDown, onFocus, onBlur
          </p>
          <SearchInput
            placeholder="Type to search..."
            onSearch={setSearchQuery}
            onFocus={() => setFocusedInput(true)}
            onBlur={() => setFocusedInput(false)}
          />
          {searchQuery && (
            <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
              Search query: <strong>{searchQuery}</strong>
            </p>
          )}
          {focusedInput && (
            <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
              (Input is focused)
            </p>
          )}
        </div>
      </section>

      <div className="ticks"></div>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
