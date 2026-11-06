import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, X, ArrowUpCircle } from 'lucide-react';

export default function UpdateAvailableModal() {
  const [showModal, setShowModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check if an update was already detected and waiting
    if (typeof window !== 'undefined' && window.__pwaRegistration?.waiting) {
      if (sessionStorage.getItem('pwa_update_modal_dismissed') !== 'true') {
        setShowModal(true);
      }
    }

    const handleUpdateAvailable = () => {
      if (sessionStorage.getItem('pwa_update_modal_dismissed') !== 'true') {
        setShowModal(true);
      }
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    const reg = typeof window !== 'undefined' ? window.__pwaRegistration : null;
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    sessionStorage.setItem('pwa_update_modal_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[120] pointer-events-none flex items-end sm:items-center justify-center p-4 sm:p-6">
          {/* Backdrop (semi-transparent blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto"
            onClick={handleDismiss}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            data-testid="pwa-update-modal"
            className="relative pointer-events-auto w-full max-w-sm bg-card/95 border border-border/80 dark:border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4 select-none"
          >
            {/* Close Icon */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>

            {/* Header Content */}
            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 via-primary/20 to-cyan-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 shadow-md">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-foreground tracking-tight">New Version Ready</h3>
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Update
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  A fresh version of Leave Vault has been downloaded. Refresh to load the latest features and fixes.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 py-2.5 px-3 bg-muted/60 hover:bg-muted text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Refreshing...' : 'Refresh App'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
