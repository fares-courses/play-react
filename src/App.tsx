import './App.css'
import { ContextThemeExample, ContextSplitExample, ZustandCounterExample } from './lessons/08-context'

function App() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <ContextThemeExample />
      <ContextSplitExample />
      <ZustandCounterExample />
    </div>
  )
}

export default App
