import { Component } from "react";

/** Last line of defence: a render error shows a way out instead of a blank page. */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Sift crashed while rendering", error, info.componentStack);
  }

  // Filters in the address bar are the likeliest cause, so starting over drops them.
  reload = () => {
    window.location.assign(window.location.pathname);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-5">
        <h1 className="font-display text-3xl font-light tracking-tight">Something went wrong.</h1>
        <p className="text-sm text-muted-foreground">Sift hit an unexpected error. Your library is safe; reloading usually fixes it.</p>
        <button
          type="button"
          onClick={this.reload}
          className="self-start rounded-well bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Reload Sift
        </button>
      </main>
    );
  }
}
