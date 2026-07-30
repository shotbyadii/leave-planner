import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CalendarDays, MapPin, Home, ArrowRight, Check, User, SlidersHorizontal } from 'lucide-react';
import AppleWheelPicker from './AppleWheelPicker';

const OnboardingModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  
  // Quotas, Names & Colors State
  const [quotas, setQuotas] = useState({
    pl: 15,
    el: 10,
    rh: 1,
    wfh: 10
  });

  const [names, setNames] = useState({
    pl: 'Planned Leave',
    el: 'Emergency Leave',
    rh: 'Extra Leave',
    wfh: 'Work From Home'
  });

  const [colors, setColors] = useState({
    pl: 'blue',
    el: 'orange',
    rh: 'green',
    wfh: 'cyan'
  });

  if (!isOpen) return null;

  const handleFinish = () => {
    if (onComplete) {
      onComplete({
        name: name.trim() || 'User',
        quotas,
        names,
        colors
      });
    }
    onClose();
  };

  const slides = [
    {
      icon: Sparkles,
      title: 'Welcome to Leave Vault',
      subtitle: 'Your intelligent annual leave planner & attendance tracker.',
      highlights: [
        { icon: CalendarDays, title: 'Smart Leave Optimizer', desc: 'Auto-finds long weekend bridges with minimal leave cost.' },
        { icon: MapPin, title: 'Trip Range Planner', desc: 'Group & label multi-day vacations effortlessly.' },
        { icon: Home, title: '12 PM WFH Attendance Tracker', desc: 'Track your monthly remote days with daily check-ins.' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Dark Blur Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300" />

      {/* Modal Container */}
      <div className="relative bg-card w-full max-w-4xl mx-auto rounded-[32px] border border-border shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        
        {/* Step Progress Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground font-mono">
              Onboarding • Step {step} of 3
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-6 bg-primary' : s < step ? 'w-2 bg-primary/60' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Step Content */}
        <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Feature Showcase */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6 max-w-xl mx-auto"
              >
                <div className="text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3 shadow-inner">
                    <Sparkles size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">{slides[0].title}</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{slides[0].subtitle}</p>
                </div>

                <div className="flex flex-col gap-3">
                  {slides[0].highlights.map((h, i) => {
                    const IconComp = h.icon;
                    return (
                      <div key={i} className="flex items-start gap-3.5 bg-muted/40 border border-border/60 p-4 rounded-2xl">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl mt-0.5">
                          <IconComp size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{h.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{h.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: Name Personalization */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6 items-center text-center py-8 max-w-md mx-auto"
              >
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">What should we call you?</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Personalize your Leave Vault experience.</p>
                </div>

                <div className="w-full">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name (e.g. Aditya)"
                    className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-4 text-base font-bold text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: 4 Horizontally Stacked Quota, Name & Color Cards */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <SlidersHorizontal size={24} />
                  </div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Quotas, Colors & Custom Names</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure your annual leave limits, category names, and UI theme colors.</p>
                </div>

                {/* 4 Horizontally Stacked Columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* PL Tumbler */}
                  <AppleWheelPicker
                    code="PL"
                    label="Privileged Leave"
                    value={quotas.pl}
                    onChange={(val) => setQuotas(q => ({ ...q, pl: val }))}
                    min={0} max={30}
                    customName={names.pl}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, pl: val }))}
                    color={colors.pl}
                    onColorChange={(val) => setColors(c => ({ ...c, pl: val }))}
                  />

                  {/* EL Tumbler */}
                  <AppleWheelPicker
                    code="EL"
                    label="Emergency Leave"
                    value={quotas.el}
                    onChange={(val) => setQuotas(q => ({ ...q, el: val }))}
                    min={0} max={20}
                    customName={names.el}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, el: val }))}
                    color={colors.el}
                    onColorChange={(val) => setColors(c => ({ ...c, el: val }))}
                  />

                  {/* RH Tumbler */}
                  <AppleWheelPicker
                    code="RH"
                    label="Extra Leave"
                    value={quotas.rh}
                    onChange={(val) => setQuotas(q => ({ ...q, rh: val }))}
                    min={0} max={10}
                    customName={names.rh}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, rh: val }))}
                    color={colors.rh}
                    onColorChange={(val) => setColors(c => ({ ...c, rh: val }))}
                  />

                  {/* WFH Tumbler */}
                  <AppleWheelPicker
                    code="WFH"
                    label="Monthly WFH"
                    value={quotas.wfh}
                    onChange={(val) => setQuotas(q => ({ ...q, wfh: val }))}
                    min={0} max={20}
                    customName={names.wfh}
                    onCustomNameChange={(val) => setNames(n => ({ ...n, wfh: val }))}
                    color={colors.wfh}
                    onColorChange={(val) => setColors(c => ({ ...c, wfh: val }))}
                  />

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation Controls */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-between items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-5 py-3 bg-muted border border-border text-foreground font-bold text-xs rounded-2xl hover:bg-muted/80 transition-all"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="px-6 py-3 bg-primary text-primary-foreground font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto"
            >
              Complete Setup <Check size={14} strokeWidth={3} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;
