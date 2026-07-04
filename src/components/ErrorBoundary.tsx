import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }
  reset = (): void => this.setState({ hasError: false, error: undefined });
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="m-6 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive-foreground">
            <h2 className="text-lg font-semibold text-destructive">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button
              onClick={this.reset}
              className="mt-4 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
