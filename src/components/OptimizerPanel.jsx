import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, ChevronRight, Settings2, Sparkles, Minus, Plus, Search, X, 
  ChevronDown, SlidersHorizontal, Compass, Send, Mic, MicOff, Bot, CheckCircle2, 
  Calendar, MapPin, Loader2, Key, Maximize2, ExternalLink, Check, Trash2, User, GripHorizontal, RotateCcw, Zap,
  AlertTriangle, AlertCircle
} from 'lucide-react';
import { findOptimalWindows } from '../utils/leaveOptimizer';
import { parseNaturalLanguage } from '../utils/nlpParser';
import { 
  hasGeminiApiKey, 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey, 
  queryGeminiAssistant,
  formatAiErrorMessage
} from '../services/aiAssistantService';
import AppleBalanceTicker from './AppleBalanceTicker';

const STARTER_PROMPTS = [
  { label: '🌴 4-day trip in Oct', text: 'Plan a 4-day vacation trip in October' },
  { label: '⚡ Next long weekend', text: 'When is the next best long weekend to take off?' },
  { label: '🏠 WFH tomorrow', text: 'Mark tomorrow as Work From Home' },
  { label: '📊 Check balances', text: 'How many PL and EL leaves do I have left?' }
];

const formatActionDateRange = (details) => {
  if (!details) return '';
  const s = details.startDate || (details.dates && details.dates[0]);
  const e = details.endDate || (details.dates && details.dates[details.dates.length - 1]) || s;
  if (!s) return '2026';
  const sDate = new Date(s);
  const eDate = new Date(e);
  if (isNaN(sDate.getTime())) return s;
  const sStr = sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (s === e || isNaN(eDate.getTime()) || sDate.getTime() === eDate.getTime()) {
    return sStr;
  }
  const eStr = eDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${sStr} → ${eStr}`;
};

const getAdaptiveLoadingText = (query = '') => {
  const q = (query || '').toLowerCase().trim();
  if (!q) return 'Thinking...';
  if (/^(hi|hello|hey|yo|greetings|morning|afternoon|evening|who are you|what can you|help)/.test(q)) {
    return 'Typing...';
  }
  if (/(cancel|delete|remove|unbook|undo|drop)/.test(q)) {
    return 'Updating your schedule...';
  }
  if (/(wfh|work from home|remote|home)/.test(q)) {
    return 'Checking WFH schedule...';
  }
  if (/(balance|quota|remaining|left|how many|pl|el|rh)/.test(q)) {
    return 'Calculating leave quotas...';
  }
  if (/(trip|vacation|holiday|weekend|getaway|november|october|december|diwali|plan|suggest|days off)/.test(q)) {
    return 'Finding the best dates...';
  }
  return 'Thinking...';
};

const groupBookedDates = (bookedList = []) => {
  if (!bookedList || bookedList.length === 0) return [];
  const sorted = [...bookedList].sort((a, b) => {
    const da = typeof a === 'string' ? a : a.date;
    const db = typeof b === 'string' ? b : b.date;
    return new Date(da) - new Date(db);
  });

  const groups = [];
  let cur = null;

  for (const item of sorted) {
    const dStr = typeof item === 'string' ? item : item.date;
    const type = typeof item === 'object' ? (item.type || 'pl') : 'pl';
    const curDate = new Date(dStr);

    if (!cur) {
      cur = { startDate: dStr, endDate: dStr, type, count: 1, dates: [dStr] };
    } else {
      const prevDate = new Date(cur.endDate);
      const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
      if (cur.type === type && diffDays >= 1 && diffDays <= 3) {
        cur.endDate = dStr;
        cur.count += 1;
        cur.dates.push(dStr);
      } else {
        groups.push(cur);
        cur = { startDate: dStr, endDate: dStr, type, count: 1, dates: [dStr] };
      }
    }
  }
  if (cur) groups.push(cur);
  return groups;
};

const OptimizerPanel = ({ 
  onPreviewRange, 
  onHoverSuggestion, 
  bookedDates = [], 
  viewMode, 
  setFocusedMonth, 
  inlineOnMobile = false, 
  leaves,
  leaveNames,
  leavePlans = [],
  onOpenAiModal,
  onOpenSettings,
  onExecuteAction
}) => {
  const plRem = leaves?.pl ? (leaves.pl.total - leaves.pl.used) : 15;
  const elRem = leaves?.el ? (leaves.el.total - leaves.el.used) : 10;
  const rhRem = leaves?.rh ? (leaves.rh.total - leaves.rh.used) : 1;
  const maxUsableLeaves = Math.max(1, Math.floor(plRem + Math.min(elRem, 2) + Math.min(rhRem, 1)));

  const [optimizerMode, setOptimizerMode] = useState('best'); // 'best' | 'manual'
  const [leaveFilterTier, setLeaveFilterTier] = useState('all'); // 'all' | '1-2' | '3-4' | '5+'
  const [targetLeaves, setTargetLeaves] = useState(Math.min(2, maxUsableLeaves));
  const [targetDuration, setTargetDuration] = useState(null);
  const [targetMonth, setTargetMonth] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const [agenticText, setAgenticText] = useState('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Gemini AI Assistant State
  const [hasKey, setHasKey] = useState(() => hasGeminiApiKey());
  const [showInlineKeySetup, setShowInlineKeySetup] = useState(false);
  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [crestDismissed, setCrestDismissed] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [panelViewMode, setPanelViewMode] = useState(() => (hasGeminiApiKey() ? 'ai' : 'filters')); // 'ai' | 'filters'

  // Dynamic Vertical Resize Splitter (Percentage of panel height allocated to chat)
  const [chatSplitPercent, setChatSplitPercent] = useState(50);
  const splitContainerRef = useRef(null);
  const isDraggingSplitRef = useRef(false);

  const INITIAL_WELCOME_MSG = {
    id: 'welcome',
    role: 'assistant',
    text: "👋 What are we planning? Ask me to find long weekends, plan a vacation, log WFH, or check your remaining leaves.",
    action: 'none',
    details: null,
    balances: null
  };

  // AI Chat State (Persisted in sessionStorage for the active session across tab switches)
  const [aiMessages, setAiMessages] = useState(() => {
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

  const [appliedActions, setAppliedActions] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('assistant_chat_applied_actions');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const [activeTickerData, setActiveTickerData] = useState({});
  const [aiInputVal, setAiInputVal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('assistant_chat_session_history', JSON.stringify(aiMessages));
    } catch (e) {}
  }, [aiMessages]);

  useEffect(() => {
    try {
      sessionStorage.setItem('assistant_chat_applied_actions', JSON.stringify(appliedActions));
    } catch (e) {}
  }, [appliedActions]);

  const messagesEndRef = useRef(null);
  const aiInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // 1s Delayed banner entry
  useEffect(() => {
    const timer = setTimeout(() => {
      setBannerVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateKey = () => {
      const active = hasGeminiApiKey();
      setHasKey(active);
      if (!active) {
        setPanelViewMode('filters');
      } else {
        setShowInlineKeySetup(false);
      }
    };
    updateKey();
    window.addEventListener('gemini-key-changed', updateKey);
    window.addEventListener('storage', updateKey);
    return () => {
      window.removeEventListener('gemini-key-changed', updateKey);
      window.removeEventListener('storage', updateKey);
    };
  }, []);

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
        setAiInputVal(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
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
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const chatScrollContainerRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight + 9999,
        behavior
      });
    }
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  useEffect(() => {
    if (panelViewMode === 'ai') {
      scrollToBottom('auto');
      const t1 = setTimeout(() => scrollToBottom('smooth'), 60);
      const t2 = setTimeout(() => scrollToBottom('smooth'), 180);
      const t3 = setTimeout(() => scrollToBottom('smooth'), 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [aiMessages, aiLoading, panelViewMode, activeTickerData, appliedActions, chatSplitPercent]);

  // Draggable Divider Handlers
  const handleSplitPointerDown = (e) => {
    e.preventDefault();
    isDraggingSplitRef.current = true;
    document.addEventListener('pointermove', handleSplitPointerMove);
    document.addEventListener('pointerup', handleSplitPointerUp);
  };

  const handleSplitPointerMove = (e) => {
    if (!isDraggingSplitRef.current || !splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const newPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setChatSplitPercent(Math.min(78, Math.max(22, newPercent)));
  };

  const handleSplitPointerUp = () => {
    isDraggingSplitRef.current = false;
    document.removeEventListener('pointermove', handleSplitPointerMove);
    document.removeEventListener('pointerup', handleSplitPointerUp);
  };

  const monthOptions = [
    { value: 'all', label: 'Any Month' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  useEffect(() => {
    handleOptimize();
  }, [optimizerMode, leaveFilterTier, targetLeaves, targetMonth, targetDuration, bookedDates, maxUsableLeaves]);

  const handleOptimize = () => {
    const results = findOptimalWindows({
      targetLeaves: optimizerMode === 'best' ? maxUsableLeaves : targetLeaves,
      targetDuration,
      targetMonth,
      bookedDates,
      mode: optimizerMode,
      leaveFilterTier: optimizerMode === 'best' ? leaveFilterTier : 'all'
    });
    setSuggestions(results);
  };

  const handleAgenticSubmit = (e) => {
    if (e) e.preventDefault();
    if (!agenticText.trim()) return;
    
    const parsed = parseNaturalLanguage(agenticText);
    
    if (parsed.targetLeaves !== null) {
      setOptimizerMode('manual');
      setTargetLeaves(Math.min(parsed.targetLeaves, maxUsableLeaves));
    }
    if (parsed.targetDuration !== null) setTargetDuration(parsed.targetDuration);
    else setTargetDuration(null);
    
    if (parsed.targetMonth !== null) setTargetMonth(parsed.targetMonth);
    else setTargetMonth('all');
  };

  const handleAgenticClear = () => {
    setAgenticText('');
    setTargetDuration(null);
  };

  const handlePreviewClick = (s) => {
    const range = [];
    for (let d = new Date(s.startDate); d <= s.endDate; d.setDate(d.getDate() + 1)) {
      range.push(`${2026}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    
    if (viewMode === 'monthly' && setFocusedMonth) {
      setFocusedMonth(s.startDate.getMonth());
    } else if (viewMode === 'yearly') {
      const el = document.getElementById(`month-card-${s.startDate.getMonth()}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    const startMonthStr = new Date(s.startDate).toLocaleString('default', { month: 'short' });
    const startDay = new Date(s.startDate).getDate();
    const endMonthStr = new Date(s.endDate).toLocaleString('default', { month: 'short' });
    const endDay = new Date(s.endDate).getDate();
    const displayTitle = s.holidayName ? s.holidayName : `${startMonthStr} ${startDay} – ${endMonthStr} ${endDay}`;
    
    onPreviewRange(range, displayTitle);

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleHover = (s) => {
    if (viewMode === 'yearly' && onHoverSuggestion) {
      onHoverSuggestion(s);
      if (s) {
        const el = document.getElementById(`month-card-${s.startDate.getMonth()}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleSendAiMessage = async (customQuery) => {
    const query = (customQuery || aiInputVal).trim();
    if (!query || aiLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...aiMessages,
      { id: userMessageId, role: 'user', text: query }
    ];

    setAiMessages(newMessages);
    setAiInputVal('');
    setLoadingQuery(query);
    setAiLoading(true);

    try {
      const result = await queryGeminiAssistant({
        message: query,
        history: aiMessages.map(m => ({ role: m.role, text: m.text })),
        context: {
          leaves,
          leaveNames,
          bookedDates,
          leavePlans
        }
      });

      const messageId = `bot-${Date.now()}`;
      setAiMessages(prev => [
        ...prev,
        {
          id: messageId,
          role: 'assistant',
          text: result.reply,
          action: result.action,
          details: result.details,
          holidays: result.holidays,
          balances: result.balances,
          bookedLeaves: result.bookedLeaves,
          leavePlans: result.leavePlans,
          modelUsed: result.modelUsed
        }
      ]);

      // Automatically focus calendar and preview dates if action or dates returned
      if (result.details) {
        const startDateStr = result.details.startDate || (result.details.dates && result.details.dates[0]);
        const endDateStr = result.details.endDate || startDateStr;

        if (startDateStr) {
          const sDate = new Date(startDateStr);
          const eDate = new Date(endDateStr);
          const range = [];
          for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
            range.push(`${2026}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
          }
          if (onPreviewRange) {
            onPreviewRange(range, result.details.planName || 'Schedule Focus', { isAiChat: true });
          }
          if (setFocusedMonth && !isNaN(sDate.getTime())) {
            setFocusedMonth(sDate.getMonth());
          }
        }
      } else if (result.bookedLeaves && result.bookedLeaves.length > 0) {
        const firstD = typeof result.bookedLeaves[0] === 'string' ? result.bookedLeaves[0] : result.bookedLeaves[0].date;
        if (firstD) {
          const dObj = new Date(firstD);
          if (!isNaN(dObj.getTime())) {
            const allDates = result.bookedLeaves.map(b => typeof b === 'string' ? b : b.date).filter(Boolean);
            if (onPreviewRange) {
              onPreviewRange(allDates, 'Booked Schedule', { isAiChat: true });
            }
            if (setFocusedMonth) {
              setFocusedMonth(dObj.getMonth());
            }
          }
        }
      }
    } catch (err) {
      console.error('Optimizer inline AI error:', err);
      const friendlyMsg = formatAiErrorMessage(err);
      setAiMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          text: friendlyMsg,
          action: 'none',
          details: null,
          balances: null,
          isError: true
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExecute = async (msgId, action, details) => {
    if (action !== 'cancel_leave') {
      const type = (details?.leaveType || 'pl').toLowerCase();
      const amount = details?.leaveDaysCost || (details?.dates?.length) || 1;
      const curBalance = leaves && leaves[type] ? (leaves[type].total - leaves[type].used) : 15;
      if (curBalance < amount) {
        console.warn('Blocked: Insufficient quota for action');
        return;
      }
    }
    if (onExecuteAction) {
      await onExecuteAction(action, details);
      setAppliedActions(prev => ({ ...prev, [msgId]: true }));
    }
  };

  const handleTriggerActionWithTicker = (msgId, action, details) => {
    const type = (details?.leaveType || 'pl').toLowerCase();
    const amount = details?.leaveDaysCost || (details?.dates?.length) || 1;
    const leaveTypeName = leaveNames?.[type] || `${type.toUpperCase()} Leave`;

    if (action === 'cancel_leave') {
      const curBalance = leaves && leaves[type] ? (leaves[type].total - leaves[type].used) : 10;
      const total = leaves && leaves[type] ? leaves[type].total : 15;
      const targetBalance = Math.min(total, curBalance + amount);
      const chosenColor = type === 'el' ? 'orange' : type === 'rh' ? 'green' : type === 'wfh' ? 'cyan' : 'blue';

      setActiveTickerData(prev => ({
        ...prev,
        [msgId]: {
          initialValue: curBalance,
          targetValue: targetBalance,
          totalQuota: total,
          leaveType: type,
          leaveLabel: leaveTypeName,
          leaveColor: chosenColor,
          deductedCount: amount,
          actionType: 'restore',
          onDone: () => handleExecute(msgId, action, details)
        }
      }));
    } else {
      const curBalance = leaves && leaves[type] ? (leaves[type].total - leaves[type].used) : 15;
      if (curBalance < amount) {
        console.warn('Blocked: Insufficient quota for action');
        return;
      }
      const total = leaves && leaves[type] ? leaves[type].total : 15;
      const targetBalance = Math.max(0, curBalance - amount);
      const chosenColor = type === 'el' ? 'orange' : type === 'rh' ? 'green' : type === 'wfh' ? 'cyan' : 'blue';

      setActiveTickerData(prev => ({
        ...prev,
        [msgId]: {
          initialValue: curBalance,
          targetValue: targetBalance,
          totalQuota: total,
          leaveType: type,
          leaveLabel: leaveTypeName,
          leaveColor: chosenColor,
          deductedCount: amount,
          actionType: type === 'wfh' ? 'wfh' : 'leave',
          onDone: () => handleExecute(msgId, action, details)
        }
      }));
    }
  };

  const handleSaveInlineKey = () => {
    if (!inlineKeyInput.trim()) return;
    setStoredGeminiApiKey(inlineKeyInput.trim());
    setShowInlineKeySetup(false);
    setInlineKeyInput('');
    setPanelViewMode('ai');
  };

  const handleClearHistory = () => {
    const freshWelcomeMsg = {
      ...INITIAL_WELCOME_MSG,
      id: `welcome-${Date.now()}`
    };
    setAiMessages([freshWelcomeMsg]);
    setAppliedActions({});
    setActiveTickerData({});
    try {
      sessionStorage.setItem('assistant_chat_session_history', JSON.stringify([freshWelcomeMsg]));
      sessionStorage.removeItem('assistant_chat_applied_actions');
    } catch (e) {}
  };

  // Render Suggestions List Sub-component
  const renderSuggestionsList = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5">
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-xs font-black uppercase tracking-wider text-foreground font-mono flex items-center gap-1.5">
          <Lightbulb size={13} className="text-amber-500" />
          {panelViewMode === 'ai' ? 'Live Optimization Picks' : (optimizerMode === 'best' ? 'Best Ratio Picks' : `${targetLeaves}-Day Optimizations`)}
        </span>
        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          Max {maxUsableLeaves} Usable
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Compass size={24} className="text-muted-foreground/40 stroke-1" />
          <p className="text-xs font-medium">No optimal leave windows found for selected criteria.</p>
        </div>
      ) : (
        suggestions.map((s, index) => {
          const isHero = index === 0 && optimizerMode === 'best';
          const sMonth = new Date(s.startDate).toLocaleString('default', { month: 'short' });
          const sDay = new Date(s.startDate).getDate();
          const eMonth = new Date(s.endDate).toLocaleString('default', { month: 'short' });
          const eDay = new Date(s.endDate).getDate();
          const dateRangeStr = `${sDay} ${sMonth} – ${eDay} ${eMonth}`;

          if (isHero) {
            return (
              <div
                key={index}
                onClick={() => handlePreviewClick(s)}
                onMouseEnter={() => handleHover(s)}
                onMouseLeave={() => handleHover(null)}
                className="relative overflow-hidden p-3.5 bg-foreground text-background rounded-2xl shadow-apple-md hover:bg-foreground/95 transition-all duration-150 cursor-pointer flex items-center justify-between group select-none"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-background/40 rounded-r-full" />
                
                <div className="flex flex-col gap-1 pl-2 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-bold font-mono bg-background/20 text-background">
                      {sMonth}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-black text-amber-500 dark:text-amber-400">
                      {s.totalDaysOff} DAYS OFF
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider bg-background/10 text-background/80 px-1.5 py-0.5 rounded-sm font-mono">
                      TOP PICK
                    </span>
                  </div>

                  <h4 className="font-bold text-sm leading-tight text-background tracking-tight truncate">
                    {s.holidayName ? s.holidayName : `Long Weekend Opportunity`}
                  </h4>

                  <p className="text-[10px] font-mono text-background/60">
                    {dateRangeStr}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-background leading-none">
                      {s.leavesNeeded}<span className="text-[10px] ml-0.5 text-background/60">L</span>
                    </span>
                    <span className="block text-[8px] font-mono uppercase text-background/50 mt-0.5">
                      COST
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-background/20 text-background flex items-center justify-center transition-all group-hover:scale-105">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              onClick={() => handlePreviewClick(s)}
              onMouseEnter={() => handleHover(s)}
              onMouseLeave={() => handleHover(null)}
              className="p-3 bg-muted/40 hover:bg-muted border border-border/80 rounded-2xl transition-all duration-150 cursor-pointer flex items-center justify-between group shadow-xs hover:shadow-sm select-none"
            >
              <div className="flex flex-col gap-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-wider font-mono text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded">
                    {sMonth}
                  </span>
                  <span className="text-[10px] font-black tracking-wide text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {s.totalDaysOff} DAYS OFF
                  </span>
                </div>

                <h4 className="text-xs font-bold text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                  {s.holidayName ? s.holidayName : `Long Weekend Opportunity`}
                </h4>
                <p className="text-[10px] text-muted-foreground font-mono">{dateRangeStr}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <span className="text-sm font-black font-mono text-foreground">{s.leavesNeeded}</span>
                  <span className="text-[9px] font-bold text-muted-foreground ml-0.5">L</span>
                  <span className="block text-[8px] font-mono uppercase text-muted-foreground">COST</span>
                </div>
                <div className="w-7 h-7 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs">
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div id="tutorial-step-optimizer" className={`flex flex-col bg-card relative ${inlineOnMobile ? 'h-auto md:h-full' : 'h-full'} overflow-hidden`}>
      
      {/* 1. Integrated Crest Banner (when No API Key & Not Dismissed) */}
      <AnimatePresence>
        {!hasKey && !crestDismissed && bannerVisible && (
          <motion.div
            initial={{ height: 0, y: -38, opacity: 0 }}
            animate={{ height: 'auto', y: 0, opacity: 1 }}
            exit={{ height: 0, y: -38, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240, mass: 0.8 }}
            className="bg-gradient-to-r from-[#0f172a] via-[#1e3a6e] to-[#1d4ed8] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-blue-500/30 flex-shrink-0 overflow-hidden"
          >
            <div 
              onClick={() => setShowInlineKeySetup(!showInlineKeySetup)}
              className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1"
            >
              <Sparkles size={14} className="text-blue-300 animate-pulse flex-shrink-0" />
              <span className="text-xs font-bold tracking-tight text-white whitespace-nowrap">
                Plan trips with Assistant
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowInlineKeySetup(!showInlineKeySetup)}
                className="text-[11px] font-bold text-blue-200 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                Connect <ChevronRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => setCrestDismissed(true)}
                title="Dismiss banner"
                className="p-1 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline API Key Drawer when clicking Connect */}
      <AnimatePresence>
        {!hasKey && showInlineKeySetup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/90 border-b border-border p-3.5 flex flex-col gap-2 flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground font-mono uppercase flex items-center gap-1.5">
                <Key size={13} className="text-primary" /> API Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                Get Free Key (Gemini) <ExternalLink size={10} />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={inlineKeyInput}
                onChange={(e) => setInlineKeyInput(e.target.value)}
                placeholder="Paste API key..."
                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSaveInlineKey}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Check size={13} /> Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top Bar Navigation / Mode Toggle & Compact '+' New Chat Button */}
      {hasKey && (
        <div className={`p-2.5 border-b transition-colors flex items-center justify-between gap-2 flex-shrink-0 ${
          panelViewMode === 'ai'
            ? 'bg-gradient-to-r from-blue-100/90 via-sky-50/80 to-indigo-100/80 dark:from-[#0b1325] dark:via-[#142d5b] dark:to-[#173ea5] border-blue-200/50 dark:border-blue-800/40 text-foreground dark:text-white'
            : 'border-border/80 bg-muted/20 text-foreground'
        }`}>
          <div className={`flex p-1 rounded-2xl border shadow-inner flex-1 ${
            panelViewMode === 'ai'
              ? 'bg-black/5 dark:bg-white/10 border-black/5 dark:border-white/15 backdrop-blur-md'
              : 'bg-muted/60 border-border/60'
          }`}>
            <button
              type="button"
              onClick={() => setPanelViewMode('ai')}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                panelViewMode === 'ai'
                  ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white font-black shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles size={13} className={panelViewMode === 'ai' ? 'text-blue-500 dark:text-blue-300 animate-pulse' : 'text-muted-foreground'} />
              <span>Assistant</span>
            </button>
            <button
              type="button"
              onClick={() => setPanelViewMode('filters')}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                panelViewMode === 'filters'
                  ? 'bg-card text-foreground font-black shadow-sm'
                  : panelViewMode === 'ai'
                  ? 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters & Picks</span>
            </button>
          </div>

          {panelViewMode === 'ai' && (
            <motion.button
              type="button"
              onClick={handleClearHistory}
              whileTap={{ scale: 0.86, rotate: 90 }}
              transition={{ type: 'spring', damping: 16, stiffness: 400 }}
              title="New Chat"
              className="w-8 h-8 rounded-2xl bg-white/80 dark:bg-white/15 hover:bg-white dark:hover:bg-white/25 text-slate-700 dark:text-white border border-blue-200/60 dark:border-white/15 shadow-xs transition-colors flex items-center justify-center cursor-pointer flex-shrink-0 backdrop-blur-md"
            >
              <Plus size={15} strokeWidth={2.5} />
            </motion.button>
          )}
        </div>
      )}

      {/* ── VIEW MODE A: RESIZABLE SPLIT (AI CHAT TOP + SUGGESTIONS BOTTOM) ── */}
      {hasKey && panelViewMode === 'ai' ? (
        <div ref={splitContainerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card relative select-none">
          
          {/* Top Resizable AI Assistant Section with Theme-Matching Focused Calendar Background */}
          <div 
            data-ai-chat="true"
            style={{ height: `${chatSplitPercent}%` }} 
            className="ai-chat-panel min-h-[160px] max-h-[80%] flex flex-col bg-gradient-to-br from-blue-50/95 via-sky-50/85 to-indigo-100/75 dark:from-[#0f172a] dark:via-[#1e3a6e] dark:to-[#1d4ed8] border-b border-blue-200/60 dark:border-blue-900/40 text-foreground dark:text-white overflow-hidden flex-shrink-0 relative shadow-inner"
          >
            {/* AI Messages Scroll Area with Smooth Animation */}
            <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar pb-2">
              <AnimatePresence initial={false} mode="popLayout">
                {aiMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 340, mass: 0.8 }}
                    className={`flex gap-2 items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="relative flex-shrink-0 mb-0.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-xs ${
                          msg.modelUsed === 'local-fallback'
                            ? 'bg-amber-500/20 border border-amber-400/40 text-amber-600 dark:text-amber-300'
                            : 'bg-blue-500/20 border border-blue-400/30 text-blue-600 dark:text-blue-200'
                        }`}>
                          <Bot size={13} />
                        </div>
                        {msg.modelUsed === 'local-fallback' && (
                          <div 
                            title="Offline Assistant"
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs border border-white dark:border-slate-900"
                          >
                            <Zap size={7} className="fill-white text-white" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`max-w-[88%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white font-medium rounded-br-none shadow-xs'
                            : msg.isError
                            ? 'bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 rounded-bl-none'
                            : 'bg-white/90 dark:bg-slate-900/85 border border-blue-200/60 dark:border-white/15 text-slate-800 dark:text-slate-100 rounded-bl-none shadow-xs backdrop-blur-md'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Visual Leave Balances Progress Widget */}
                      {msg.balances && (
                        <div className="w-full bg-white/90 dark:bg-slate-900/85 border border-blue-200/60 dark:border-white/15 rounded-2xl p-2.5 shadow-xs flex flex-col gap-2 backdrop-blur-md">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground dark:text-white/70 flex items-center gap-1.5">
                            <Sparkles size={11} className="text-blue-500 dark:text-blue-300" /> Remaining Quota
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(msg.balances).map(([type, b]) => {
                              if (!b) return null;
                              const typeLabels = { pl: 'Planned (PL)', el: 'Emergency (EL)', rh: 'Restricted (RH)', wfh: 'WFH' };
                              const typeColors = { 
                                pl: 'bg-blue-500 text-blue-500', 
                                el: 'bg-orange-500 text-orange-500', 
                                rh: 'bg-emerald-500 text-emerald-500', 
                                wfh: 'bg-cyan-500 text-cyan-500' 
                              };
                              const percent = Math.min(100, Math.max(0, ((b.remaining || 0) / (b.total || 1)) * 100));
                              return (
                                <div key={type} className="bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 rounded-xl p-1.5 flex flex-col gap-1">
                                  <div className="flex justify-between items-center text-[9px] font-bold">
                                    <span className="text-muted-foreground dark:text-white/70 truncate">{typeLabels[type] || type.toUpperCase()}</span>
                                    <span className="font-mono font-black text-foreground dark:text-white">{b.remaining ?? 0}<span className="text-[8px] opacity-60">/{b.total ?? 0}</span></span>
                                  </div>
                                  <div className="w-full h-1 bg-muted dark:bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${typeColors[type]?.split(' ')[0] || 'bg-primary'} rounded-full transition-all duration-300`} 
                                      style={{ width: `${percent}%` }} 
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* User-Defined Planned Trips Widget */}
                      {msg.leavePlans && msg.leavePlans.length > 0 && (
                        <div className="w-full bg-white/90 dark:bg-slate-900/85 border border-blue-200/60 dark:border-white/15 rounded-2xl p-2.5 shadow-xs flex flex-col gap-2 backdrop-blur-md">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground dark:text-white/70 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Compass size={11} className="text-blue-500 dark:text-blue-300" /> Planned Trips ({msg.leavePlans.length})
                            </span>
                          </span>
                          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
                            {msg.leavePlans.map((p, pIdx) => {
                              const s = p.startDate || p.start_date;
                              const e = p.endDate || p.end_date || s;
                              const sObj = new Date(s);
                              const eObj = new Date(e);
                              const sFormatted = !isNaN(sObj.getTime())
                                ? sObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : s;
                              const eFormatted = !isNaN(eObj.getTime())
                                ? eObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : e;
                              const rangeLabel = s === e ? sFormatted : `${sFormatted} → ${eFormatted}`;
                              const planDates = p.dates && p.dates.length > 0 ? p.dates : [s, e].filter(Boolean);

                              return (
                                <div
                                  key={pIdx}
                                  className="p-2 rounded-xl bg-blue-50/60 dark:bg-white/5 border border-blue-200/60 dark:border-white/10 flex items-center justify-between gap-2"
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {p.name || 'Trip Plan'}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground dark:text-white/60">
                                      {rangeLabel}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onPreviewRange && planDates.length > 0) {
                                        onPreviewRange(planDates, p.name || 'Trip Plan', { isAiChat: true });
                                      }
                                    }}
                                    className="p-1 px-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[10px] font-bold transition-colors cursor-pointer flex-shrink-0"
                                  >
                                    View Plan
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Visual Booked / Scheduled Leaves List (Excluding dates that belong to Leave Plans) */}
                      {(() => {
                        const displayLeaves = (msg.bookedLeaves || []).filter(b => {
                          const dStr = typeof b === 'string' ? b : b.date;
                          const allPlans = msg.leavePlans || leavePlans || [];
                          const belongsToPlan = allPlans.some(p => {
                            if (Array.isArray(p.dates) && p.dates.includes(dStr)) return true;
                            const s = p.startDate || p.start_date;
                            const e = p.endDate || p.end_date || s;
                            return s && e && dStr >= s && dStr <= e;
                          });
                          return !belongsToPlan;
                        });

                        if (displayLeaves.length === 0) return null;

                        return (
                          <div className="w-full bg-white/90 dark:bg-slate-900/85 border border-blue-200/60 dark:border-white/15 rounded-2xl p-2.5 shadow-xs flex flex-col gap-2 backdrop-blur-md">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground dark:text-white/70 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Calendar size={11} className="text-blue-500 dark:text-blue-300" /> {msg.leavePlans && msg.leavePlans.length > 0 ? 'Other Booked Leaves' : 'Booked Leaves'} ({displayLeaves.length})
                              </span>
                            </span>
                            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
                              {displayLeaves.map((b, bIdx) => {
                                const dStr = typeof b === 'string' ? b : b.date;
                                const bType = typeof b === 'object' ? (b.type || 'pl') : 'pl';
                                const dObj = new Date(dStr);
                                const formatted = !isNaN(dObj.getTime())
                                  ? dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
                                  : dStr;
                                const leaveLabel = leaveNames?.[bType] || (bType === 'pl' ? 'Planned Leave' : bType === 'el' ? 'Emergency Leave' : bType.toUpperCase());

                                return (
                                  <div
                                    key={bIdx}
                                    className="p-2 rounded-xl bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                        {formatted}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground dark:text-white/60 truncate" title={leaveLabel}>
                                        {leaveLabel}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold border border-blue-400/20">
                                        {bType}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (onPreviewRange && dStr) {
                                            onPreviewRange([dStr], `Booked ${bType.toUpperCase()}`, { isAiChat: true });
                                          }
                                        }}
                                        className="p-1 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[10px] font-bold transition-colors cursor-pointer"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                        {/* Visual Holiday Badges Card */}
                        {msg.holidays && msg.holidays.length > 0 && (
                          <div className="w-full bg-white/90 dark:bg-slate-900/85 border border-blue-200/60 dark:border-white/15 rounded-2xl p-2.5 shadow-xs flex flex-col gap-2 backdrop-blur-md">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground dark:text-white/70 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Sparkles size={11} className="text-amber-500" /> Holidays ({msg.holidays.length})
                              </span>
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {msg.holidays.map((h, hIdx) => {
                                const dObj = new Date(h.date);
                                const formatted = !isNaN(dObj.getTime())
                                  ? dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
                                  : h.date;
                                return (
                                  <div
                                    key={hIdx}
                                    className="p-2 rounded-xl bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10 flex items-center justify-between gap-2"
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{h.name}</span>
                                      <span className="text-[10px] font-mono text-muted-foreground dark:text-white/60">{formatted}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onPreviewRange && h.date) {
                                          onPreviewRange([h.date], h.name, { isAiChat: true });
                                        }
                                      }}
                                      className="p-1 px-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[10px] font-bold transition-colors cursor-pointer flex-shrink-0"
                                    >
                                      View
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {/* Staged Action Card with Direct Full-Width Action Button */}
                      {msg.action && msg.action !== 'none' && msg.details && (
                        <div className="w-full bg-white/95 dark:bg-slate-900/90 border border-blue-200/70 dark:border-white/15 text-slate-900 dark:text-white rounded-2xl p-3 shadow-xs flex flex-col gap-2.5 backdrop-blur-md">
                          <div className="flex items-center justify-between border-b border-blue-200/40 dark:border-white/10 pb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                msg.action === 'cancel_leave' ? 'bg-red-500/15 text-red-500' : 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                              }`}>
                                {msg.action === 'cancel_leave' ? <Trash2 size={13} /> : <Compass size={13} />}
                              </div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {msg.details.planName || (msg.action === 'cancel_leave' ? 'Cancel Leave' : 'Leave Booking')}
                              </span>
                            </div>
                            {msg.details.leaveType && (
                              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                                msg.action === 'cancel_leave'
                                  ? 'bg-red-500/15 text-red-500 border-red-500/25'
                                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-200 border-blue-400/30'
                              }`}>
                                {msg.details.leaveType}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs px-0.5">
                            <span className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar size={12} className="text-blue-500 dark:text-blue-300" />
                              {formatActionDateRange(msg.details)}
                            </span>
                            {msg.details.leaveDaysCost !== undefined && (
                              <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-white/70">
                                <strong className="text-slate-900 dark:text-white font-bold">{msg.details.leaveDaysCost}</strong> {msg.details.leaveDaysCost === 1 ? 'day' : 'days'}
                              </span>
                            )}
                          </div>

                            {/* Insufficient quota notice if cost > remaining */}
                            {msg.action !== 'cancel_leave' && 
                             msg.details.leaveType && 
                             msg.details.leaveDaysCost > (leaves?.[msg.details.leaveType]?.total - leaves?.[msg.details.leaveType]?.used || 0) && (
                              <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                                <span>⚠️ Low quota: only {Math.max(0, (leaves?.[msg.details.leaveType]?.total || 0) - (leaves?.[msg.details.leaveType]?.used || 0))} {msg.details.leaveType.toUpperCase()} remaining.</span>
                              </div>
                            )}

                          <div className="pt-0.5">
                            {activeTickerData[msg.id] ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                className="py-2.5 px-2 flex flex-col items-center justify-center bg-blue-50/50 dark:bg-white/5 border border-blue-200/50 dark:border-white/10 rounded-xl"
                              >
                                <AppleBalanceTicker
                                  initialValue={activeTickerData[msg.id].initialValue}
                                  targetValue={activeTickerData[msg.id].targetValue}
                                  totalQuota={activeTickerData[msg.id].totalQuota}
                                  leaveType={activeTickerData[msg.id].leaveType}
                                  leaveLabel={activeTickerData[msg.id].leaveLabel}
                                  leaveColor={activeTickerData[msg.id].leaveColor}
                                  deductedCount={activeTickerData[msg.id].deductedCount}
                                  actionType={activeTickerData[msg.id].actionType}
                                  compact={true}
                                  onComplete={async () => {
                                    if (activeTickerData[msg.id]?.onDone) {
                                      await activeTickerData[msg.id].onDone();
                                    }
                                    setActiveTickerData(prev => {
                                      const next = { ...prev };
                                      delete next[msg.id];
                                      return next;
                                    });
                                  }}
                                  autoDismissMs={1300}
                                />
                              </motion.div>
                            ) : appliedActions[msg.id] ? (() => {
                              const type = (msg.details?.leaveType || 'pl').toLowerCase();
                              const leaveTypeName = leaveNames?.[type] || `${type.toUpperCase()} Leave`;
                              const total = leaves && leaves[type] ? leaves[type].total : 15;
                              const used = leaves && leaves[type] ? leaves[type].used : 0;
                              const remaining = Math.max(0, total - used);

                              const isCancel = msg.action === 'cancel_leave';
                              const isExhausted = !isCancel && remaining <= 0;
                              const isLow = !isCancel && remaining <= 3 && !isExhausted;

                              const count = msg.details?.dates?.length || msg.details?.leaveDaysCost || 1;

                              if (isCancel) {
                                return (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full p-2.5 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex flex-col gap-1 text-left shadow-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                        <RotateCcw size={14} className="flex-shrink-0" />
                                        <span>{count} Day{count === 1 ? '' : 's'} {leaveTypeName} Restored</span>
                                      </div>
                                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Restored ✓
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 leading-tight">
                                      Booking cancelled! {remaining} days available in your {leaveTypeName} quota.
                                    </p>
                                  </motion.div>
                                );
                              }

                              if (isExhausted) {
                                return (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full p-2.5 bg-red-500/10 dark:bg-red-950/30 border border-red-500/30 rounded-xl flex flex-col gap-1 text-left shadow-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs">
                                        <AlertCircle size={14} className="flex-shrink-0" />
                                        <span>{count} Day{count === 1 ? '' : 's'} {leaveTypeName} Booked</span>
                                      </div>
                                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25">
                                        Quota Full ⚠️
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-red-700/80 dark:text-red-300/80 leading-tight font-medium">
                                      ⚠️ All {total} days of {leaveTypeName} used for this annual cycle.
                                    </p>
                                  </motion.div>
                                );
                              }

                              if (isLow) {
                                return (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full p-2.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-xl flex flex-col gap-1 text-left shadow-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                        <AlertTriangle size={14} className="flex-shrink-0" />
                                        <span>{count} Day{count === 1 ? '' : 's'} {leaveTypeName} Booked</span>
                                      </div>
                                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                        Low Quota ⚠️
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 leading-tight font-medium">
                                      ⚠️ Heads up! Only {remaining} day{remaining === 1 ? '' : 's'} of {leaveTypeName} remaining in your quota.
                                    </p>
                                  </motion.div>
                                );
                              }

                              return (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="w-full p-2.5 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex flex-col gap-1 text-left shadow-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                      <CheckCircle2 size={14} className="flex-shrink-0" />
                                      <span>{count} Day{count === 1 ? '' : 's'} {leaveTypeName} Booked</span>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Saved ✓
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 leading-tight">
                                    Confirmed and saved! {remaining} days remaining in your {leaveTypeName} quota.
                                  </p>
                                </motion.div>
                              );
                            })() : (() => {
                              const type = (msg.details?.leaveType || 'pl').toLowerCase();
                              const cost = msg.details?.leaveDaysCost || (msg.details?.dates?.length) || 1;
                              const curTotal = leaves && leaves[type] ? leaves[type].total : 15;
                              const curUsed = leaves && leaves[type] ? leaves[type].used : 0;
                              const curRemaining = Math.max(0, curTotal - curUsed);
                              const isInsufficient = msg.action !== 'cancel_leave' && curRemaining < cost;

                              if (isInsufficient) {
                                return (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-red-500/10 dark:bg-red-950/20 border border-red-500/30 text-red-600 dark:text-red-400 opacity-90 cursor-not-allowed select-none shadow-none"
                                    title={`Insufficient quota: only ${curRemaining} ${type.toUpperCase()} remaining.`}
                                  >
                                    <AlertCircle size={13} className="text-red-500" />
                                    Insufficient Quota ({curRemaining}/{curTotal} Left)
                                  </button>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() => handleTriggerActionWithTicker(msg.id, msg.action, msg.details)}
                                  className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer ${
                                    msg.action === 'cancel_leave'
                                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                                  }`}
                                >
                                  {msg.action === 'cancel_leave' ? (
                                    <>
                                      <Trash2 size={13} /> Confirm Remove
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={13} /> Apply Plan
                                    </>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mb-0.5 shadow-xs">
                        <User size={13} />
                      </div>
                    )}
                  </motion.div>
                ))}

                {aiLoading && (
                  <motion.div
                    key="ai-loading-bubble"
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="flex gap-2 items-end"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-600 dark:text-blue-200 flex items-center justify-center flex-shrink-0 mb-0.5">
                      <Bot size={13} />
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/85 border border-blue-200/60 dark:border-white/15 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-2xl rounded-bl-none text-xs flex items-center gap-2 shadow-xs backdrop-blur-md">
                      <Loader2 size={12} className="animate-spin text-blue-500" />
                      <span>{getAdaptiveLoadingText(loadingQuery)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
            </div>

            {/* In-flow Pinned Chat Input Footer */}
            <div className="p-2.5 bg-white/50 dark:bg-slate-900/50 border-t border-blue-200/40 dark:border-white/10 backdrop-blur-md z-10 flex flex-col gap-1.5 flex-shrink-0">
              {/* Quick Starter Chips */}
              {aiMessages.length <= 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {STARTER_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendAiMessage(p.text)}
                      className="px-2.5 py-0.5 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border border-blue-200/60 dark:border-white/15 text-slate-700 dark:text-blue-100 text-[10px] font-medium rounded-xl whitespace-nowrap transition-colors flex-shrink-0 shadow-xs cursor-pointer backdrop-blur-xs"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Audio Listening Bar */}
              {isListening && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-2.5 py-1 flex items-center justify-between text-xs text-red-600 dark:text-red-300 font-medium">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Listening...
                  </span>
                  <button type="button" onClick={handleToggleVoice} className="text-[10px] font-bold underline cursor-pointer">
                    Stop
                  </button>
                </div>
              )}

              {/* Floating Input Bar with Auto-Expanding Height */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiMessage();
                  if (aiInputRef.current) {
                    aiInputRef.current.style.height = 'auto';
                  }
                }}
                className="backdrop-blur-md bg-white/90 dark:bg-slate-900/85 border border-blue-200/70 dark:border-white/20 rounded-2xl p-1.5 shadow-apple-sm flex items-end gap-1.5 transition-all"
              >
                <div className="relative flex-1 flex items-center min-w-0">
                  <textarea
                    ref={aiInputRef}
                    rows={1}
                    value={aiInputVal}
                    onChange={(e) => {
                      setAiInputVal(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!aiLoading && aiInputVal.trim()) {
                          handleSendAiMessage();
                          if (aiInputRef.current) {
                            aiInputRef.current.style.height = 'auto';
                          }
                        }
                      }
                    }}
                    placeholder="Ask anything... e.g. 4 days in Goa around Diwali"
                    disabled={aiLoading}
                    className="w-full bg-transparent pl-2.5 pr-8 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/50 focus:outline-none transition-colors resize-none max-h-24 overflow-y-auto leading-relaxed no-scrollbar"
                    style={{ minHeight: '26px' }}
                  />
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`absolute right-1 bottom-1 p-1 rounded-lg transition-colors cursor-pointer ${
                      isListening ? 'bg-red-500 text-white' : 'text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={aiLoading || !aiInputVal.trim()}
                  className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-blue-600/20 active:scale-95 transition-all flex-shrink-0 cursor-pointer mb-0.5"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          </div>

          {/* Interactive Draggable Resize Splitter Handle */}
          <div
            onPointerDown={handleSplitPointerDown}
            title="Drag to resize chat and suggestions"
            className="h-3 w-full bg-muted/40 hover:bg-muted border-y border-border/70 flex items-center justify-center cursor-row-resize flex-shrink-0 group select-none transition-colors"
          >
            <div className="w-8 h-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary/70 transition-colors" />
          </div>

          {/* Bottom Live Suggestions List */}
          {renderSuggestionsList()}
        </div>
      ) : (
        /* ── VIEW MODE B: STANDARD NATURAL SEARCH & FILTER SUGGESTIONS ── */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Top Natural Language Search Input */}
          <form onSubmit={handleAgenticSubmit} className="p-3 border-b border-border bg-card flex flex-col gap-2 flex-shrink-0">
            <div className="relative flex items-center">
              <Sparkles className="absolute left-3.5 text-purple-400" size={16} />
              <input 
                type="text" 
                value={agenticText}
                onChange={(e) => setAgenticText(e.target.value)}
                placeholder="e.g. 4 day trip in October..."
                className="w-full pl-9 pr-20 py-2.5 bg-muted border border-border rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-muted-foreground text-foreground select-text shadow-inner"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                {agenticText && (
                  <button 
                    type="button" 
                    onClick={handleAgenticClear} 
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
                <button 
                  type="submit" 
                  className="p-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white transition-colors shadow-md flex items-center justify-center cursor-pointer"
                >
                  <Search size={13} strokeWidth={3} />
                </button>
              </div>
            </div>
          </form>

          {/* Controls Bar (Auto / Manual + Month) */}
          <div className="p-3 border-b border-border bg-muted/30 flex flex-col gap-2.5 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex bg-card p-1 rounded-2xl border border-border shadow-sm flex-1">
                <button 
                  type="button"
                  onClick={() => setOptimizerMode('best')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    optimizerMode === 'best' 
                      ? 'bg-primary text-primary-foreground font-black shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles size={13} className={optimizerMode === 'best' ? 'text-primary-foreground' : 'text-amber-500'} /> 
                  <span>Auto</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setOptimizerMode('manual')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    optimizerMode === 'manual' 
                      ? 'bg-primary text-primary-foreground font-black shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <SlidersHorizontal size={13} /> 
                  <span>Manual</span>
                </button>
              </div>

              {/* Month Selector Dropdown */}
              <div className="relative flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-card border border-border rounded-2xl px-3 py-2 text-foreground shadow-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="truncate max-w-[100px] font-mono">{monthOptions.find(m => m.value === targetMonth)?.label || 'Any Month'}</span>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMonthDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMonthDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-44 bg-card rounded-2xl shadow-2xl border border-border z-50 flex flex-col py-1.5 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto no-scrollbar">
                      {monthOptions.map(m => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => { setTargetMonth(m.value); setIsMonthDropdownOpen(false); }}
                          className={`px-3.5 py-2 text-xs font-bold text-left transition-colors flex items-center justify-between cursor-pointer ${
                            targetMonth === m.value 
                              ? 'bg-primary/10 text-primary font-black' 
                              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                          }`}
                        >
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mode Specific Sub-Controls */}
            <AnimatePresence mode="wait">
              {optimizerMode === 'best' ? (
                <motion.div 
                  key="best"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: "easeInOut" }}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5"
                >
                  {[
                    { id: 'all', label: '🌟 All Tiers' },
                    { id: '1-2', label: '⚡ 1-2 Leaves' },
                    { id: '3-4', label: '✈️ 3-4 Leaves' },
                    { id: '5+', label: '🏝️ 5+ Leaves' }
                  ].map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setLeaveFilterTier(tier.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                        leaveFilterTier === tier.id
                          ? 'bg-primary text-primary-foreground font-black shadow-xs'
                          : 'bg-card text-muted-foreground border border-border/80 hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="manual"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: "easeInOut" }}
                  className="flex items-center justify-between bg-card p-2 rounded-2xl border border-border"
                >
                  <span className="text-xs font-bold text-muted-foreground">Leaves to Spend:</span>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setTargetLeaves(Math.max(1, targetLeaves - 1))}
                      className="w-7 h-7 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-mono font-black text-sm text-foreground w-4 text-center">{targetLeaves}</span>
                    <button 
                      type="button"
                      onClick={() => setTargetLeaves(Math.min(maxUsableLeaves, targetLeaves + 1))}
                      className="w-7 h-7 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Suggestions List Header & Cards */}
          {renderSuggestionsList()}
        </div>
      )}
    </div>
  );
};

export default OptimizerPanel;
