import React from 'react';
import { RotateCw, AlertTriangle, Copy, Check } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('leave_planner_tutorial_completed_v1');
    } catch (e) {}
    window.location.href = '/';
  };

  handleCopyError = () => {
    const { error } = this.state;
    if (!error) return;
    const textToCopy = `Error: ${error.message || String(error)}\n\nStack Trace:\n${error.stack || 'No stack trace available'}`;
    navigator.clipboard?.writeText(textToCopy).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      } catch (e) {}
    });
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const errorMsg = error?.message || String(error || 'Unknown error');
      const errorStack = error?.stack || '';

      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-text font-sans">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6 shadow-2xl shadow-red-500/10">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-black mb-2 tracking-tight">Something went wrong</h1>
          <p className="text-sm text-slate-400 max-w-sm mb-4 leading-relaxed">
            The application encountered an unexpected display issue. Your saved data is safe.
          </p>

          {error && (
            <div className="max-w-lg w-full bg-red-950/40 border border-red-500/30 rounded-2xl p-4 text-left mb-6 font-mono text-xs text-red-300 relative shadow-lg">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-red-500/20">
                <span className="text-[10px] uppercase font-bold text-red-400/80 tracking-wider">
                  Error Details & Stack Trace
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyError}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                  title="Copy error and stack location to clipboard"
                >
                  {this.state.copied ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Error</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-y-auto max-h-56 select-text cursor-text">
                <p className="font-bold text-red-200 mb-2 leading-relaxed select-text">{errorMsg}</p>
                {errorStack && (
                  <pre className="text-[10px] text-red-400/90 whitespace-pre-wrap font-mono leading-normal bg-black/30 p-2.5 rounded-xl border border-red-500/15 select-text overflow-x-auto">
                    {errorStack}
                  </pre>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <RotateCw size={14} /> Refresh Page
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
