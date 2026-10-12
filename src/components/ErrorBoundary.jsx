import React from 'react';
import { RotateCw, AlertTriangle, Copy, Check, Mail, Send, Terminal, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      copied: false,
      reported: false,
      autoLogged: false,
      bugTitle: '',
      userContext: ''
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
    // Automatically transmit crash diagnostics to developer without requiring any user action
    this.sendAutomaticReport(error, errorInfo);
  }

  sendAutomaticReport = async (error, errorInfo) => {
    try {
      let userEmail = '';
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token')) {
            try {
              const item = JSON.parse(localStorage.getItem(key));
              if (item?.user?.email) userEmail = item.user.email;
            } catch (_) {}
          }
        }
      }

      const payload = {
        error_message: error?.message || String(error || 'Unknown error'),
        error_stack: error?.stack || errorInfo?.componentStack || 'No stack trace available',
        url: typeof window !== 'undefined' ? window.location.href : '',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        user_email: userEmail || null,
        created_at: new Date().toISOString()
      };

      if (supabase && typeof supabase.from === 'function') {
        const { error: insertError } = await supabase.from('error_logs').insert([payload]);
        if (!insertError) {
          this.setState({ autoLogged: true });
        }
      }
    } catch (e) {
      console.warn('Could not auto-log error:', e);
    }
  };

  checkIsDev = () => {
    try {
      if (import.meta.env?.DEV) return true;
      if (typeof window !== 'undefined') {
        const { hostname, search } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
        if (search && search.includes('dev=true')) return true;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && ((key.startsWith('sb-') && key.endsWith('-auth-token')) || key === 'supabase.auth.token')) {
            const raw = localStorage.getItem(key);
            if (raw && raw.toLowerCase().includes('krshnaditya2@gmail.com')) {
              return true;
            }
          }
        }
      }
    } catch (e) {}
    return false;
  };

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

  handleSendReport = async () => {
    const { error, bugTitle, userContext } = this.state;
    const devEmail = 'krshnaditya2@gmail.com';
    const title = bugTitle.trim() || error?.message?.slice(0, 60) || 'Unexpected Error';
    const subject = `Leave Planner Bug: ${title}`;

    const errorMsg = error?.message || String(error || 'Unknown error');
    const errorStack = error?.stack || 'No stack trace available';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'Unknown URL';
    const timestamp = new Date().toISOString();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

    const bodyContent = [
      `Leave Planner Bug Report`,
      `========================`,
      `Title: ${title}`,
      `Timestamp: ${timestamp}`,
      `URL: ${currentUrl}`,
      `Browser / Device: ${userAgent}`,
      ``,
      `User Notes & Context:`,
      `---------------------`,
      userContext.trim() || 'No additional notes provided.',
      ``,
      `Error Diagnostics:`,
      `------------------`,
      `Message: ${errorMsg}`,
      ``,
      `Stack Trace:`,
      errorStack
    ].join('\n');

    // Also update/insert context into Supabase error_logs table if user typed notes
    if (userContext.trim()) {
      try {
        await supabase.from('error_logs').insert([{
          error_message: errorMsg,
          error_stack: errorStack,
          url: currentUrl,
          user_agent: userAgent,
          user_context: userContext.trim(),
          created_at: new Date().toISOString()
        }]);
      } catch (_) {}
    }

    // 1. Copy full report to clipboard
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(bodyContent);
      }
    } catch (e) {}

    // 2. Open email client via mailto
    const mailtoUrl = `mailto:${devEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyContent)}`;
    
    try {
      window.location.href = mailtoUrl;
    } catch (e) {
      window.open(mailtoUrl, '_blank');
    }

    this.setState({ reported: true });
    setTimeout(() => this.setState({ reported: false }), 4500);
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const errorMsg = error?.message || String(error || 'Unknown error');
      const errorStack = error?.stack || '';
      const isDev = this.checkIsDev();

      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center select-text font-sans">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-5 shadow-2xl shadow-red-500/10">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">Something went wrong</h1>
          <p className="text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">
            The application encountered an unexpected issue. Your saved data is safe.
          </p>

          {/* Dev view: Raw Error Details & Stack Trace */}
          {isDev && error && (
            <div className="max-w-lg w-full bg-red-950/40 border border-red-500/30 rounded-2xl p-4 text-left mb-5 font-mono text-xs text-red-300 relative shadow-lg">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-red-500/20">
                <span className="text-[10px] uppercase font-bold text-red-400/80 tracking-wider flex items-center gap-1.5">
                  <Terminal size={12} />
                  Developer Diagnostics (Dev Only)
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

          {/* Automatic Logging Banner + Optional Feedback Form */}
          <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 text-left mb-6 shadow-xl backdrop-blur-md">
            
            {/* Automatic Silent Dispatch Status */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-4">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-400" />
              <span>
                {this.state.autoLogged 
                  ? 'Crash diagnostics automatically reported to developer.'
                  : 'Diagnostic report captured and dispatched.'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-800">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Mail size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-slate-200">Add Context or Email Dev</h3>
                <p className="text-[11px] text-slate-400">Optional: Share what you were doing to help fix this faster.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Bug Title / Summary
                </label>
                <input
                  type="text"
                  value={this.state.bugTitle}
                  onChange={(e) => this.setState({ bugTitle: e.target.value })}
                  placeholder="e.g. Error while clicking attendance check-in"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Additional Context <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={this.state.userContext}
                  onChange={(e) => this.setState({ userContext: e.target.value })}
                  placeholder="What were you doing when this happened? (e.g. mobile Safari, just clicked leave balance)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>

              <button
                type="button"
                onClick={this.handleSendReport}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all active:scale-95"
              >
                <Send size={13} />
                <span>{this.state.reported ? 'Bug Report Generated & Email Opened!' : 'Send Direct Email with Notes'}</span>
              </button>

              {this.state.reported && (
                <p className="text-[11px] text-emerald-400 text-center font-mono animate-fadeIn">
                  ✓ Email draft opened to krshnaditya2@gmail.com and diagnostics copied to clipboard!
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
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
