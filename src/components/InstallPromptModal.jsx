import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  X, 
  Share2, 
  PlusSquare, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers
} from 'lucide-react';

export const isRunningStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || 
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
};

export const isAndroidDevice = () => {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
};

const InstallPromptModal = ({ isOpen, onClose, deferredPrompt, onInstalled }) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
    setIsAndroid(isAndroidDevice());
    setIsInstalled(isRunningStandalone());
  }, [isOpen]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        setInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if (onInstalled) onInstalled();
          onClose();
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      // For iOS, the modal itself provides the guided visual steps
    }
  };

  const handleDontAskAgain = () => {
    try {
      localStorage.setItem('pwa_prompt_dismissed_permanent', 'true');
    } catch (e) {}
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative bg-card w-full max-w-md mx-auto rounded-[32px] border border-border shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-6 z-10 flex flex-col items-center gap-4 text-center overflow-hidden"
          >
            {/* Top Close Button (X) */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Close for now"
            >
              <X size={16} />
            </button>

            {/* Glowing App Icon Badge */}
            <div className="relative mt-2">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-3xl blur-xl opacity-75 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-card to-muted border border-primary/30 p-2.5 shadow-2xl flex items-center justify-center">
                <img
                  src="/favicon.svg"
                  alt="Leave Vault Icon"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="px-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-black uppercase tracking-wider mb-2">
                <Sparkles size={11} /> Native Web Experience
              </div>
              <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                Install Leave Vault App
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Enjoy full-screen view, faster startup, offline calendar access, and notch-safe topbar navigation.
              </p>
            </div>

            {/* Value Highlights */}
            <div className="grid grid-cols-3 gap-2 w-full pt-1">
              <div className="flex flex-col items-center p-2.5 bg-muted/30 border border-border/70 rounded-2xl">
                <Zap size={15} className="text-amber-500 mb-1" />
                <span className="text-[11px] font-bold text-foreground">Instant</span>
                <span className="text-[9px] text-muted-foreground">Fast launch</span>
              </div>
              <div className="flex flex-col items-center p-2.5 bg-muted/30 border border-border/70 rounded-2xl">
                <Smartphone size={15} className="text-purple-500 mb-1" />
                <span className="text-[11px] font-bold text-foreground">Native Feel</span>
                <span className="text-[9px] text-muted-foreground">No URL bars</span>
              </div>
              <div className="flex flex-col items-center p-2.5 bg-muted/30 border border-border/70 rounded-2xl">
                <ShieldCheck size={15} className="text-emerald-500 mb-1" />
                <span className="text-[11px] font-bold text-foreground">Offline</span>
                <span className="text-[9px] text-muted-foreground">Safe sync</span>
              </div>
            </div>

            {/* Platform-Specific Step Guide / Instructions */}
            {isIOS ? (
              <div className="w-full bg-muted/40 border border-border/80 rounded-2xl p-3.5 flex flex-col gap-2.5 text-left text-xs">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-muted-foreground">
                  Quick 2-Step iOS Setup
                </span>
                
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 text-muted-foreground leading-snug">
                    Tap the <strong className="text-foreground inline-flex items-center gap-1 mx-0.5 bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]"><Share2 size={12} className="text-blue-500" /> Share</strong> button in Safari's bottom toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 text-muted-foreground leading-snug">
                    Scroll down and select <strong className="text-foreground inline-flex items-center gap-1 mx-0.5 bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]"><PlusSquare size={12} className="text-primary" /> Add to Home Screen</strong>.
                  </div>
                </div>
              </div>
            ) : !deferredPrompt ? (
              <div className="w-full bg-muted/40 border border-border/80 rounded-2xl p-3.5 flex flex-col gap-2.5 text-left text-xs">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-muted-foreground">
                  Quick Android & Browser Setup
                </span>
                
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 text-muted-foreground leading-snug">
                    Tap the <strong className="text-foreground inline-flex items-center gap-1 mx-0.5 bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">⋮ Menu</strong> button in Chrome's top-right corner.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 text-muted-foreground leading-snug">
                    Select <strong className="text-foreground inline-flex items-center gap-1 mx-0.5 bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]"><PlusSquare size={12} className="text-primary" /> Install app</strong> or <strong className="text-foreground font-mono text-[11px]">Add to Home screen</strong>.
                  </div>
                </div>
              </div>
            ) : null}

            {/* Action Buttons (CTAs) */}
            <div className="flex flex-col gap-2 w-full mt-1">
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full py-3.5 bg-primary text-primary-foreground hover:opacity-95 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <Download size={16} /> {installing ? 'Installing...' : 'Install App Now'}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full py-3.5 bg-primary text-primary-foreground hover:opacity-95 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Got It, Let's Add
                </button>
              )}

              {/* Don't Ask Again CTA */}
              <button
                onClick={handleDontAskAgain}
                className="w-full py-2.5 text-muted-foreground/70 hover:text-foreground text-[11px] font-bold transition-colors cursor-pointer"
              >
                Don't ask again
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPromptModal;
