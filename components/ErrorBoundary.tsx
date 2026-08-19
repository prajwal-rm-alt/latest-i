import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReset = () => {
    if (window.confirm('Reset application temporary caches and reload? Your backed-up data will be re-synchronized.')) {
      try {
        // Clear caches
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((r) => r.unregister());
          });
        }
      } catch (e) {
        console.warn('Cache clearing notice:', e);
      }
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950 text-white select-none">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-zinc-400">
                SalesTrack encountered an unexpected issue while loading the interface.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/40 border border-zinc-800/80 rounded-xl text-left max-h-32 overflow-y-auto">
                <p className="text-[11px] font-mono text-red-400 break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 active:scale-95"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.href = '/';
                }}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Home size={14} />
                <span>Go to Home</span>
              </button>
            </div>

            <button
              onClick={this.handleClearAndReset}
              className="w-full py-2 text-[11px] text-zinc-400 hover:text-zinc-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={12} />
              <span>Clear browser cache &amp; repair app</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
