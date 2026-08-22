import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, Mic, MicOff, X, Key, ExternalLink, Calendar, 
  Check, ArrowRight, ShieldCheck, Loader2, Bot, User, CornerDownLeft,
  RotateCcw, Compass, MapPin, CheckCircle2, AlertCircle, Trash2, Zap
} from 'lucide-react';
import { 
  queryGeminiAssistant, 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey, 
  hasGeminiApiKey,
  formatAiErrorMessage
} from '../services/aiAssistantService';

const STARTER_PROMPTS = [
  { label: '🌴 4-day trip in October', text: 'Plan a 4-day vacation trip in October' },
  { label: '⚡ Next long weekend', text: 'When is the next best long weekend to take off?' },
  { label: '🏠 WFH tomorrow', text: 'Mark tomorrow as Work From Home' },
  { label: '📊 Check my leave balances', text: 'How many PL and EL leaves do I have left?' }
];

export const AiAssistantChatContent = ({
  onClose,
  context = {},
  onExecuteAction,
  onPreviewRange,
  isMorphedDock = false
}) => {
  const INITIAL_WELCOME_MSG = {
    id: 'welcome',
    role: 'assistant',
    text: "👋 What are we planning? Ask me to find long weekends, plan a vacation, log WFH, or check your remaining leaves.",
    action: 'none',
    details: null
  };

  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('assistant_chat_session_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [INITIAL_WELCOME_MSG];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('assistant_chat_session_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    setApiKeyInput(getStoredGeminiApiKey());
    setShowKeyConfig(!hasGeminiApiKey());
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Web Speech API Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputVal(transcript);
      };

      recognition.onerror = (e) => {
        setIsListening(false);
        setRecognitionError('Voice input unavailable or permission denied');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setRecognitionError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleSaveKey = () => {
    if (!apiKeyInput.trim()) return;
    setStoredGeminiApiKey(apiKeyInput.trim());
    setShowKeyConfig(false);
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isLoading) return;

    if (!hasGeminiApiKey()) {
      setShowKeyConfig(true);
      return;
    }

    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      { id: userMessageId, role: 'user', text: query }
    ];

    setMessages(newMessages);
    setInputVal('');
    setIsLoading(true);

    try {
      const result = await queryGeminiAssistant({
        message: query,
        history: messages.map(m => ({ role: m.role, text: m.text })),
        context
      });

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          text: result.reply,
          action: result.action,
          details: result.details,
          modelUsed: result.modelUsed
        }
      ]);
    } catch (err) {
      console.error('Gemini assistant query error:', err);
      const errorReply = formatAiErrorMessage(err);

      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          text: errorReply,
          action: 'none',
          details: null,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = (action, details) => {
    if (onExecuteAction) {
      onExecuteAction(action, details);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        text: "👋 What are we planning? Ask me to find long weekends, plan a vacation, log WFH, or check your remaining leaves.",
        action: 'none',
        details: null
      }
    ]);
  };

  return (
    <div className={`flex flex-col w-full ${isMorphedDock ? 'max-h-[82vh] h-[75vh]' : 'h-full'} overflow-hidden bg-card`}>
      {/* Dynamic Gradient Top Header */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e3a6e] to-[#1d4ed8] p-4 flex items-center justify-between border-b border-blue-500/30 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
            <Sparkles size={16} className="text-blue-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black font-mono tracking-wide uppercase flex items-center gap-1.5 text-white">
              Calendar Assistant
            </h3>
            <p className="text-[10px] text-white/70 font-medium">Vacations • Leaves • WFH • Quotas</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            title="Configure API Key"
            className={`p-2 rounded-xl transition-colors ${showKeyConfig ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <Key size={15} />
          </button>
          <button
            onClick={handleClearHistory}
            title="Clear Conversation"
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Inline API Key Setup Banner */}
      <AnimatePresence>
        {showKeyConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/70 border-b border-border/80 p-4 flex flex-col gap-2.5 flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 font-mono uppercase">
                <Key size={13} className="text-blue-500" /> API Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"
              >
                Get Free Key (Gemini) <ExternalLink size={10} />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Paste API key..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Saved securely in your browser's LocalStorage. Free tier allows 1,500 requests/day.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="relative flex-shrink-0 mb-0.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  msg.modelUsed === 'local-fallback'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300'
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-500'
                }`}>
                  <Bot size={15} />
                </div>
                {msg.modelUsed === 'local-fallback' && (
                  <div 
                    title="Offline Assistant"
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs border border-background"
                  >
                    <Zap size={8} className="fill-white text-white" />
                  </div>
                )}
              </div>
            )}

            <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground font-medium rounded-br-none'
                    : msg.isError
                    ? 'bg-red-500/10 border border-red-500/30 text-red-500 rounded-bl-none'
                    : 'bg-muted/80 border border-border/70 text-foreground rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>

              {/* Staged Action Card */}
              {msg.action && msg.action !== 'none' && msg.details && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-card border border-border rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5 mt-1"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                        {msg.action === 'stage_plan' ? <Compass size={14} /> : msg.action === 'log_wfh' ? <MapPin size={14} /> : <Calendar size={14} />}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          {msg.details.planName || 'Staged Leave Request'}
                        </h4>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {msg.details.startDate} {msg.details.endDate && msg.details.endDate !== msg.details.startDate ? `→ ${msg.details.endDate}` : ''}
                        </p>
                      </div>
                    </div>

                    {msg.details.leaveType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {msg.details.leaveType}
                      </span>
                    )}
                  </div>

                  {msg.details.leaveDaysCost !== undefined && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Quota Deducted:</span>
                      <span className="font-bold text-foreground font-mono">
                        {msg.details.leaveDaysCost} working day(s)
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(() => {
                    const type = (msg.details?.leaveType || 'pl').toLowerCase();
                    const cost = msg.details?.leaveDaysCost || (msg.details?.dates?.length) || 1;
                    const curTotal = context.leaves && context.leaves[type] ? context.leaves[type].total : 15;
                    const curUsed = context.leaves && context.leaves[type] ? context.leaves[type].used : 0;
                    const curRemaining = Math.max(0, curTotal - curUsed);
                    const isInsufficient = msg.action !== 'cancel_leave' && curRemaining < cost;

                    return (
                      <div className="flex gap-2 pt-1">
                        {isInsufficient ? (
                          <button
                            disabled
                            className="flex-1 py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 opacity-80 cursor-not-allowed"
                          >
                            <AlertCircle size={13} /> Insufficient Quota ({curRemaining}/{curTotal} Left)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecute(msg.action, msg.details)}
                            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <CheckCircle2 size={13} /> Apply & Save
                          </button>
                        )}

                        {onPreviewRange && msg.details.startDate && (
                          <button
                            onClick={() => {
                              onPreviewRange(msg.details.startDate, msg.details.endDate || msg.details.startDate);
                              onClose();
                            }}
                            className="py-2 px-3 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold border border-border/80 transition-colors cursor-pointer"
                          >
                            Preview
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mb-0.5">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-end">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0 mb-0.5">
              <Bot size={15} />
            </div>
            <div className="bg-muted/80 border border-border/70 text-muted-foreground px-4 py-2.5 rounded-2xl rounded-bl-none text-xs flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-blue-500" />
              <span>Thinking & planning schedule...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Starter Prompt Chips */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 border-t border-border/40">
          {STARTER_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p.text)}
              className="px-2.5 py-1.5 bg-muted/60 hover:bg-muted border border-border/60 text-muted-foreground hover:text-foreground text-[11px] font-medium rounded-xl whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Audio Listening Bar / Error Banner */}
      {isListening && (
        <div className="bg-red-500/10 border-t border-red-500/20 px-4 py-2 flex items-center justify-between text-xs text-red-500 font-medium flex-shrink-0">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Listening... Speak your leave request
          </span>
          <button onClick={handleToggleVoice} className="text-[11px] font-bold underline cursor-pointer">
            Stop
          </button>
        </div>
      )}

      {recognitionError && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-1.5 text-[11px] text-amber-500 flex-shrink-0">
          {recognitionError}
        </div>
      )}

      {/* Bottom Chat Input Form */}
      <div className="p-3.5 bg-card border-t border-border/80 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={isListening ? "Listening to your voice..." : "Plan a 4-day trip in October..."}
              disabled={isLoading}
              className="w-full bg-muted/50 border border-border rounded-2xl pl-3.5 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isListening ? "Stop listening" : "Voice input"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-colors cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-blue-600/20 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

const AiAssistantModal = ({ 
  isOpen, 
  onClose, 
  context = {}, 
  onExecuteAction, 
  onPreviewRange 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
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

        {/* Modal Sheet Container */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-xl bg-card border border-border/80 rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col h-[680px] overflow-hidden z-10"
        >
          <AiAssistantChatContent
            onClose={onClose}
            context={context}
            onExecuteAction={onExecuteAction}
            onPreviewRange={onPreviewRange}
            isMorphedDock={false}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AiAssistantModal;
