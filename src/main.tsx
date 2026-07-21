import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { installGlobalErrorHandlers } from './lib/globalErrors.ts'

// Installed here, not in an effect, so it's outside StrictMode's
// double-invoke and covers boot-time failures (module init, first
// paint) too (AUDIT.md C4).
const uninstallGlobalErrorHandlers = installGlobalErrorHandlers()
if (import.meta.hot) {
  import.meta.hot.dispose(uninstallGlobalErrorHandlers)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
