import { Component } from 'react';

/** Last line of defence: an unexpected render error shows a recovery screen instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">Your saved notes are safe. Reload the page to continue.</p>
          <button type="button" className="btn btn-primary mt-6" onClick={() => window.location.reload()}>
            Reload NoteFlow
          </button>
        </div>
      </div>
    );
  }
}
