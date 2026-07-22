import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Catches render-time throws that would otherwise blank the whole app --
// hit once already (the env-var misconfiguration in supabase.ts, fixed at
// that one call site rather than generally). Since this is a local-first
// app, a blank page reads as "my data is gone"; the message here is
// deliberately reassuring that it isn't.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Unhandled render error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ink-50 p-6">
          <div className="text-center max-w-sm">
            <h1 className="text-lg font-medium text-ink-800">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink-500">
              Your data is safe -- it's stored separately from this page. Reloading usually fixes this.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-ink-800 rounded-md hover:bg-ink-700"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
