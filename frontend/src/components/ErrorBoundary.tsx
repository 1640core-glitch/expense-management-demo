import { Component, ErrorInfo, ReactNode } from 'react';
import { notifyError } from '../lib/toast';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    notifyError(error, '予期しないエラーが発生しました');
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div role="alert" className="p-6">
          <h2 className="text-lg font-semibold mb-2">予期しないエラーが発生しました</h2>
          <p className="text-sm text-muted mb-4">
            画面の表示中に問題が発生しました。再読み込みするか、しばらく時間をおいて再度お試しください。
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-3 py-1.5 rounded border"
          >
            再試行
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
