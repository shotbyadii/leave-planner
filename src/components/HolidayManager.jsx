import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, List, Upload, Plus, Trash2, Edit2, 
  Check, X, Sparkles, ChevronLeft, ChevronRight, AlertCircle, Search, FileText, Key
} from 'lucide-react';
import { extractHolidaysFromFile } from '../services/holidayExtractionService';
import { defaultPublicHolidays, saveStoredHolidays, getStoredHolidays, deduplicateHolidays } from '../data/holidays';

const MONTH_SHORT_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const MONTH_FULL_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format YYYY-MM-DD string to compact date chit like "01/01", "14/01", "02/05"
 */
function formatOrdinalDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const day = String(parts[2]).padStart(2, '0');
  const month = String(parts[1]).padStart(2, '0');

  return `${day}/${month}`;
}

export default function HolidayManager({ 
  initialHolidays = [], 
  onChange,
  onStagingChange,
  showTitle = true 
}) {
  const [holidays, setHolidays] = useState(() => {
    const safeInit = (Array.isArray(initialHolidays) && initialHolidays.length > 0)
      ? initialHolidays
      : getStoredHolidays();
    return (Array.isArray(safeInit) && safeInit.length > 0) ? deduplicateHolidays(safeInit) : defaultPublicHolidays;
  });

  // Sync state with props & localStorage updates
  useEffect(() => {
    if (Array.isArray(initialHolidays) && initialHolidays.length > 0) {
      setHolidays(deduplicateHolidays(initialHolidays));
    } else {
      const stored = getStoredHolidays();
      setHolidays(deduplicateHolidays(stored));
    }
  }, [initialHolidays]);

  useEffect(() => {
    const handleHolidaysSync = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setHolidays(deduplicateHolidays(e.detail));
      }
    };
    window.addEventListener('company_holidays_updated', handleHolidaysSync);
    return () => window.removeEventListener('company_holidays_updated', handleHolidaysSync);
  }, []);

  // Staging state for file uploads
  const [stagedHolidays, setStagedHolidays] = useState(null);
  const [isStaging, setIsStaging] = useState(false);

  // Calendar State
  const [viewDate, setViewDate] = useState(() => {
    const initList = (Array.isArray(initialHolidays) && initialHolidays.length > 0) ? initialHolidays : getStoredHolidays();
    if (initList && initList.length > 0 && initList[0]?.date) {
      const parts = initList[0].date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) return new Date(y, m, 1);
      }
    }
    return new Date();
  });
  const [slideDirection, setSlideDirection] = useState(0); // -1 left, 1 right

  // Popover State (for calendar click)
  const [activeDateModal, setActiveDateModal] = useState(null); // 'YYYY-MM-DD'
  const [modalHolidayName, setModalHolidayName] = useState('');

  // Manual Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState('2026-01-01');
  const [newName, setNewName] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editName, setEditName] = useState('');

  // Hover sync state for glowing active state & smooth scroll
  const [hoveredDate, setHoveredDate] = useState(null); // 'YYYY-MM-DD'
  const listRefMap = useRef(new Map());

  const handleCalendarDateHover = (dateStr) => {
    setHoveredDate(dateStr);
    if (dateStr) {
      const el = listRefMap.current.get(dateStr);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Dual-sided scroll fade state for mini calendar track
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleMiniTrackScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  // File Upload & Gemini API Key State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  // Mobile Segmented Tab ('list' | 'calendar')
  const [mobileTab, setMobileTab] = useState('list');

  // Notify parent on change & persist to localStorage and Supabase
  const updateHolidays = (newList) => {
    setHolidays(newList);
    saveStoredHolidays(newList);
    if (onChange) onChange(newList);
  };

  const activeList = isStaging ? (stagedHolidays || []) : holidays;

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setSlideDirection(-1);
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSlideDirection(1);
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Jump calendar to specific date string YYYY-MM-DD
  const jumpToDate = (dateStr, shouldSwitchMobileTab = false) => {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        setViewDate(new Date(y, m, 1));
        if (shouldSwitchMobileTab) {
          setMobileTab('calendar');
        }
      }
    }
  };

  // Add holiday manually
  const handleAddHoliday = (e) => {
    if (e) e.preventDefault();
    if (!newDate || !newName.trim()) return;

    const newItem = {
      id: `custom-${Date.now()}`,
      date: newDate,
      name: newName.trim(),
      type: 'public'
    };

    const existingIndex = activeList.findIndex(h => h.date === newDate);
    let nextList;
    if (existingIndex >= 0) {
      nextList = activeList.map((h, i) => i === existingIndex ? newItem : h);
    } else {
      nextList = [...activeList, newItem];
    }
    nextList = deduplicateHolidays(nextList);

    if (isStaging) {
      setStagedHolidays(nextList);
    } else {
      updateHolidays(nextList);
    }

    setNewName('');
    setShowAddForm(false);
    jumpToDate(newDate);
  };

  // Click on date cell
  const handleDateCellClick = (dateStr, existingHoliday) => {
    setActiveDateModal(dateStr);
    setModalHolidayName(existingHoliday ? existingHoliday.name : '');
  };

  const handleSaveModalHoliday = () => {
    if (!activeDateModal) return;
    const trimmed = modalHolidayName.trim();

    let nextList;
    if (trimmed) {
      const existsIndex = activeList.findIndex(h => h.date === activeDateModal);
      if (existsIndex >= 0) {
        nextList = activeList.map((h, i) => i === existsIndex ? { ...h, name: trimmed } : h);
      } else {
        nextList = [...activeList, {
          id: `custom-${Date.now()}`,
          date: activeDateModal,
          name: trimmed,
          type: 'public'
        }].sort((a, b) => a.date.localeCompare(b.date));
      }
    } else {
      nextList = activeList.filter(h => h.date !== activeDateModal);
    }

    if (isStaging) {
      setStagedHolidays(nextList);
    } else {
      updateHolidays(nextList);
    }

    setActiveDateModal(null);
    setModalHolidayName('');
  };

  const handleDeleteModalHoliday = () => {
    if (!activeDateModal) return;
    const nextList = activeList.filter(h => h.date !== activeDateModal);
    if (isStaging) {
      setStagedHolidays(nextList);
    } else {
      updateHolidays(nextList);
    }
    setActiveDateModal(null);
    setModalHolidayName('');
  };

  // Start inline editing row
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDate(item.date);
    setEditName(item.name);
  };

  const saveEdit = (id) => {
    if (!editDate || !editName.trim()) return;

    const nextList = activeList.map(item => {
      if (item.id === id) {
        return { ...item, date: editDate, name: editName.trim() };
      }
      return item;
    }).sort((a, b) => a.date.localeCompare(b.date));

    if (isStaging) {
      setStagedHolidays(nextList);
    } else {
      updateHolidays(nextList);
    }

    setEditingId(null);
  };

  const deleteHoliday = (id) => {
    const nextList = activeList.filter(item => item.id !== id);
    if (isStaging) {
      setStagedHolidays(nextList);
    } else {
      updateHolidays(nextList);
    }
  };

  // Helper to merge incoming extracted holidays with existing list (by date)
  const mergeHolidays = (existingList = [], incomingList = []) => {
    const safeExisting = Array.isArray(existingList) ? existingList : [];
    const safeIncoming = Array.isArray(incomingList) ? incomingList : [];
    const merged = [...safeExisting];
    safeIncoming.forEach(inc => {
      if (!inc || typeof inc !== 'object' || !inc.date) return;
      const idx = merged.findIndex(h => h && h.date === inc.date);
      if (idx >= 0) {
        merged[idx] = inc;
      } else {
        merged.push(inc);
      }
    });
    return merged.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  };

  // Process Document Extraction using Gemini API
  const processExtraction = async (file, apiKeyToUse = null) => {
    setIsUploading(true);
    setUploadError('');

    try {
      const extracted = await extractHolidaysFromFile(file, apiKeyToUse);
      if (extracted && extracted.length > 0) {
        setStagedHolidays(extracted);
        setIsStaging(true);
        setShowApiKeyModal(false);
        setPendingFile(null);

        // Auto-jump calendar view to year/month of first parsed holiday!
        if (extracted[0]?.date) {
          jumpToDate(extracted[0].date);
        }
      } else {
        setUploadError('No valid holidays could be parsed from the document.');
      }
    } catch (err) {
      console.error('File upload extraction error:', err);
      if (err.message.includes('API Key') || err.message.includes('HTTP 404') || err.message.includes('HTTP 400') || err.message.includes('MISSING_API_KEY')) {
        setPendingFile(file);
        setShowApiKeyModal(true);
        setUploadError('Google AI Studio API key required. Please enter a valid API key starting with AIzaSy...');
      } else {
        setUploadError(`Extraction error: ${err.message || 'Please verify Gemini API key.'}`);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Click on "Upload Sheet (PDF/Img)" Button (Checks key first)
  const handleUploadButtonClick = () => {
    const storedKey = localStorage.getItem('gemini_api_key') || (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);
    if (!storedKey || !storedKey.trim()) {
      setShowApiKeyModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  // File Upload Handler (Gemini API)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storedKey = localStorage.getItem('gemini_api_key') || (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);
    if (!storedKey || !storedKey.trim()) {
      setPendingFile(file);
      setShowApiKeyModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    await processExtraction(file, storedKey);
  };

  const handleSaveApiKeyAndExtract = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;

    localStorage.setItem('gemini_api_key', trimmed);
    if (pendingFile) {
      processExtraction(pendingFile, trimmed);
    } else {
      setShowApiKeyModal(false);
    }
  };

  // Confirm Staging (Uploads clear the previous list entirely with the new deduplicated list)
  const handleConfirmStaging = () => {
    if (stagedHolidays && stagedHolidays.length > 0) {
      const deduped = deduplicateHolidays(stagedHolidays);
      updateHolidays(deduped);
    }
    setIsStaging(false);
    setStagedHolidays(null);
  };

  // Reject Staging
  const handleRejectStaging = () => {
    setIsStaging(false);
    setStagedHolidays(null);
  };

  // Communicate staging state & actions to parent SettingsModal
  useEffect(() => {
    if (onStagingChange) {
      onStagingChange({
        isStaging,
        stagedCount: stagedHolidays?.length || 0,
        confirmStaging: handleConfirmStaging,
        discardStaging: handleRejectStaging
      });
    }
  }, [isStaging, stagedHolidays?.length]);

  // Auto-commit staged holidays when unmounting (e.g. user clicks "Save Changes" in Settings Modal)
  const stagedHolidaysRef = useRef(stagedHolidays);
  const isStagingRef = useRef(isStaging);
  const holidaysRef = useRef(holidays);

  useEffect(() => {
    stagedHolidaysRef.current = stagedHolidays;
    isStagingRef.current = isStaging;
    holidaysRef.current = holidays;
  }, [stagedHolidays, isStaging, holidays]);

  useEffect(() => {
    return () => {
      if (isStagingRef.current && stagedHolidaysRef.current && stagedHolidaysRef.current.length > 0) {
        const deduped = deduplicateHolidays(stagedHolidaysRef.current);
        saveStoredHolidays(deduped);
      }
    };
  }, []);

  // Filtered List
  const filteredList = activeList.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.date.includes(searchQuery) ||
    formatOrdinalDate(h.date).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Current Month's Holidays for Badge Display below main calendar
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const currentMonthHolidays = activeList.filter(h => h.date.startsWith(monthPrefix));

  // Generate calendar days for current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sun

  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push({ type: 'empty', key: `empty-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const holiday = activeList.find(h => h.date === dateStr);
    calendarCells.push({
      type: 'day',
      dayNum: d,
      dateStr,
      holiday,
      key: `day-${dateStr}`
    });
  }

  // Next 11 Months for Horizontally Scrollable Mini Grid Cards (Pinned to bottom)
  const miniMonths = Array.from({ length: 11 }, (_, i) => {
    return new Date(year, month + 1 + i, 1);
  });

  const existingHolidayForModal = activeList.find(h => h.date === activeDateModal);

  return (
    <div className="w-full h-full flex flex-col gap-3 text-foreground min-h-0 overflow-hidden">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".pdf,image/*" 
        className="hidden" 
      />

      {/* GEMINI API KEY DIALOG MODAL */}
      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
                  <h4 className="text-sm font-bold text-foreground">Gemini API Key Required</h4>
                </div>
                <button onClick={() => setShowApiKeyModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                To extract dates & event names automatically from uploaded holiday sheets (images/PDFs), connect your Google Gemini API Key. Your key is saved locally in your browser.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase font-mono">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-background border border-border rounded-xl text-foreground font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  autoFocus
                />
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mt-1 font-medium"
                >
                  <span>Get a free API key from Google AI Studio →</span>
                </a>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKeyAndExtract}
                  disabled={!apiKeyInput.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Save Key & Extract
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER (Rendered only when showTitle is true) */}
      {showTitle && (
        <div className="flex-shrink-0 flex items-center justify-between pb-1.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="text-lg font-bold text-foreground">Company Public Holidays</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
              {activeList.length} Holidays
            </span>
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex-shrink-0 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError('')} className="p-1 hover:bg-red-500/20 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UPLOADING SKELETON STATUS BANNER */}
      {isUploading && (
        <div className="flex-shrink-0 p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center gap-3 text-purple-700 dark:text-purple-300 animate-pulse shadow-sm">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <div className="text-xs font-bold">Parsing document table with Gemini AI...</div>
            <div className="text-[11px] opacity-80">Detecting official holidays, dates, and event titles.</div>
          </div>
        </div>
      )}

      {/* INFORMATIVE STAGING BANNER (Clean single message, no duplicate CTA buttons) */}
      {isStaging && !isUploading && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-200 shadow-sm"
        >
          <div className="p-2 bg-amber-500/20 rounded-xl flex-shrink-0">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
              Review Extracted Holidays ({stagedHolidays?.length || 0} found)
            </div>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
              Verify dates and event names below. Click <strong>Confirm & Save Holidays</strong> at the bottom to apply.
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Segmented Switcher (< md) with Smooth Animated Pill */}
      <div className="flex-shrink-0 flex md:hidden items-center p-1 bg-muted/50 border border-border rounded-xl relative">
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 relative z-10 ${
            mobileTab === 'list' 
              ? 'text-foreground font-bold' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {mobileTab === 'list' && (
            <motion.div
              layoutId="activeHolidayTabPill"
              className="absolute inset-0 bg-card rounded-lg shadow-sm -z-10 border border-border/60"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <List className="w-3.5 h-3.5" />
          <span>List View ({activeList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('calendar')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 relative z-10 ${
            mobileTab === 'calendar' 
              ? 'text-foreground font-bold' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {mobileTab === 'calendar' && (
            <motion.div
              layoutId="activeHolidayTabPill"
              className="absolute inset-0 bg-card rounded-lg shadow-sm -z-10 border border-border/60"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Calendar View</span>
        </button>
      </div>

      {/* MAIN DUAL-PANE INTERFACE */}
      <motion.div 
        layout="position"
        transition={{ layout: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } }}
        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch flex-1 min-h-0 overflow-hidden relative"
      >
        
        {/* LEFT PANEL: Holiday List */}
        <div className={`md:col-span-5 lg:col-span-5 flex-col gap-2 relative h-full min-h-0 overflow-hidden ${
          mobileTab === 'calendar' 
            ? 'hidden md:flex' 
            : 'flex animate-in fade-in-50 slide-in-from-left-2 duration-200'
        }`}>
          
          {/* Search Input Box */}
          <div className="relative flex-shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search holidays..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={isUploading}
              className="w-full pl-8 pr-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {/* SKELETON LOADING STATE FOR LIST */}
          {isUploading ? (
            <div className="flex-1 max-h-[220px] md:max-h-none overflow-y-auto px-1 py-1 pb-16 flex flex-col gap-1.5 rounded-xl no-scrollbar min-h-0">
              {[1, 2, 3, 4, 5, 6, 7].map((sk) => (
                <div key={sk} className="p-2 bg-card/60 border border-border/50 rounded-xl animate-pulse flex items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-10 h-5 rounded-md bg-muted/60" />
                    <div className="h-3 bg-muted/60 rounded-md w-28" />
                  </div>
                  <div className="w-4 h-4 rounded bg-muted/40" />
                </div>
              ))}
            </div>
          ) : (
            /* Regular Holiday List Scroll Container - Full length on desktop, compact on mobile */
            <div className="flex-1 max-h-[220px] md:max-h-none overflow-y-auto px-1 py-1 pb-16 flex flex-col gap-1.5 rounded-xl no-scrollbar overscroll-contain min-h-0">
              {filteredList.length === 0 ? (
                <div className="p-6 text-center bg-card/40 border border-border/60 rounded-xl text-muted-foreground text-xs flex flex-col items-center justify-center gap-1.5 my-auto">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground/40" />
                  <span>No holidays found. Upload a sheet or add one manually!</span>
                </div>
              ) : (
                filteredList.map((item) => {
                  const isEditing = editingId === item.id;
                  const formattedDate = formatOrdinalDate(item.date);
                  const isHovered = hoveredDate === item.date;
                  
                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        if (el) listRefMap.current.set(item.date, el);
                        else listRefMap.current.delete(item.date);
                      }}
                      onMouseEnter={() => {
                        setHoveredDate(item.date);
                        jumpToDate(item.date);
                      }}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`rounded-xl transition-all group ${
                        isEditing ? 'p-2.5 bg-card border border-purple-500/50 shadow-md' : 'py-1.5 px-2.5 border shadow-2xs'
                      } ${
                        !isEditing && isHovered
                          ? 'border-purple-400 bg-purple-500/10 dark:bg-purple-950/40 shadow-[0_0_12px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50 scale-[1.01]'
                          : !isEditing ? 'bg-card border-border/70 hover:border-purple-500/40' : ''
                      }`}
                    >
                      {/* EDIT MODE */}
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between pb-1 border-b border-border/50">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <Edit2 className="w-3.5 h-3.5 text-purple-500" /> Edit Holiday
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Date</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                                className="w-full px-2.5 py-1 text-xs bg-background border border-border rounded-xl text-foreground font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Holiday Name</label>
                              <input
                                type="text"
                                placeholder="Holiday Name (e.g. Republic Day)"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="w-full px-2.5 py-1 text-xs bg-background border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                autoFocus
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                            <button 
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              type="button"
                              onClick={() => saveEdit(item.id)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="flex-1 text-left flex items-center gap-2 min-w-0 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                          >
                            {/* COMPACT DATE CHIT (e.g. 01/01, 14/01) */}
                            <div className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold flex-shrink-0 tracking-tight ${
                              isHovered 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-muted/80 dark:bg-zinc-900 border border-border/60 text-foreground dark:text-white'
                            }`}>
                              {formattedDate}
                            </div>
                            
                            <div className={`text-xs font-medium truncate transition-colors ${
                              isHovered ? 'text-purple-700 dark:text-purple-200 font-semibold' : 'text-foreground'
                            }`}>
                              {item.name}
                            </div>
                          </button>

                          <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              title="Edit Holiday"
                              className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteHoliday(item.id)}
                              title="Delete Holiday"
                              className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* FLOATING BOTTOM "+ ADD HOLIDAY" BUTTON WITH SUBTLE GRADIENT FADE */}
          <div className="absolute bottom-0 left-0 right-0 p-2 pt-6 bg-gradient-to-t from-card via-card/90 dark:from-[#0b0b0d] dark:via-[#0b0b0d]/90 to-transparent pointer-events-auto z-10">
            <AnimatePresence mode="wait">
              {!isUploading && !showAddForm ? (
                <motion.button
                  key="add-button"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-2 px-3 bg-purple-500/15 dark:bg-purple-600/25 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 dark:border-purple-500/40 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 group backdrop-blur-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:rotate-90 transition-transform" />
                  <span>Add Holiday</span>
                </motion.button>
              ) : !isUploading && showAddForm ? (
                <motion.form
                  key="add-form-expanded"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  onSubmit={handleAddHoliday}
                  className="p-3 bg-card dark:bg-[#141418] border border-purple-500/50 rounded-2xl flex flex-col gap-2 shadow-2xl backdrop-blur-md"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-purple-500" /> Add New Holiday
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Date</label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-background border border-border rounded-xl text-foreground font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Holiday Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Founders Day"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-background border border-border rounded-xl text-foreground font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Add Holiday
                    </button>
                  </div>
                </motion.form>
              ) : null}
            </AnimatePresence>
          </div>

        </div>

        {/* RIGHT PANEL: Calendar */}
        <div className={`md:col-span-7 lg:col-span-7 bg-card dark:bg-[#0b0b0d] border border-border/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl flex-col justify-between gap-2 sm:gap-3 h-full min-h-0 overflow-y-auto sm:overflow-hidden ${
          mobileTab === 'list' 
            ? 'hidden md:flex' 
            : 'flex animate-in fade-in-50 slide-in-from-right-2 duration-200'
        }`}>
          
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {/* Calendar Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wider text-foreground dark:text-white font-mono uppercase">
                  {MONTH_SHORT_NAMES[month]}
                </span>
                <span className="text-xs font-bold text-muted-foreground/80 font-mono">
                  '{String(year).slice(-2)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  disabled={isUploading}
                  className="p-1 hover:bg-muted dark:hover:bg-zinc-800 rounded-lg transition-colors text-muted-foreground hover:text-foreground dark:hover:text-white cursor-pointer disabled:opacity-40"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewDate(new Date())}
                  disabled={isUploading}
                  className="px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-40"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  disabled={isUploading}
                  className="p-1 hover:bg-muted dark:hover:bg-zinc-800 rounded-lg transition-colors text-muted-foreground hover:text-white cursor-pointer disabled:opacity-40"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* SKELETON OR ANIMATED CALENDAR GRID */}
            <div className="relative overflow-visible pb-1">
              {isUploading ? (
                <div className="grid grid-cols-7 gap-1 text-center p-0.5 pb-1.5">
                  {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d) => (
                    <div key={d} className="text-[10px] font-black text-muted-foreground/40 py-0.5 font-mono">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: 35 }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className="h-7 rounded-lg bg-muted/40 dark:bg-zinc-800/40 animate-pulse border border-border/30" 
                    />
                  ))}
                </div>
              ) : (
                <AnimatePresence custom={slideDirection} mode="wait">
                  <motion.div
                    key={`${year}-${month}`}
                    initial={{ opacity: 0, x: slideDirection * 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: slideDirection * -30 }}
                    transition={{ duration: 0.18 }}
                    className="grid grid-cols-7 gap-1 text-center p-0.5 pb-1.5"
                  >
                    {/* Day Names Header (SU MO TU WE TH FR SA) */}
                    {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, idx) => (
                      <div 
                        key={d} 
                        className={`text-[10px] font-black tracking-wider py-0.5 font-mono ${
                          idx === 0 || idx === 6 ? 'text-amber-600 dark:text-amber-500/90' : 'text-muted-foreground/80'
                        }`}
                      >
                        {d}
                      </div>
                    ))}

                    {/* Day Cells */}
                    {calendarCells.map((cell) => {
                      if (cell.type === 'empty') {
                        return <div key={cell.key} className="h-7" />;
                      }

                      const hasHoliday = Boolean(cell.holiday);
                      const isHovered = hoveredDate === cell.dateStr;

                      return (
                        <button
                          key={cell.key}
                          onClick={() => handleDateCellClick(cell.dateStr, cell.holiday)}
                          onMouseEnter={() => handleCalendarDateHover(cell.dateStr)}
                          onMouseLeave={() => handleCalendarDateHover(null)}
                          className={`h-7 rounded-lg border transition-all flex items-center justify-center relative font-bold text-xs cursor-pointer ${
                            isHovered
                              ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_18px_rgba(168,85,247,0.7)] ring-2 ring-purple-400 scale-105 z-10 animate-pulse'
                              : hasHoliday 
                                ? 'bg-purple-100 dark:bg-[#2b1842] border-purple-400 dark:border-[#7c3aed]/60 text-purple-900 dark:text-purple-300 shadow-sm ring-1 ring-purple-400/40' 
                                : 'bg-muted/30 dark:bg-[#141417] border-border/50 dark:border-[#222226] text-foreground dark:text-white/90 hover:bg-muted dark:hover:bg-zinc-800'
                          }`}
                        >
                          <span>{cell.dayNum}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Click-on-Date Floating Popover Modal */}
              <AnimatePresence>
                {activeDateModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-30"
                  >
                    <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-xs shadow-2xl flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
                          <span>Holiday for {formatOrdinalDate(activeDateModal)}</span>
                        </div>
                        <button onClick={() => setActiveDateModal(null)} className="p-1 text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Holiday Name (e.g. Good Friday)"
                        value={modalHolidayName}
                        onChange={e => setModalHolidayName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveModalHoliday();
                        }}
                        className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        autoFocus
                      />

                      <div className="flex items-center justify-between pt-1">
                        {existingHolidayForModal ? (
                          <button
                            onClick={handleDeleteModalHoliday}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveDateModal(null)}
                            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveModalHoliday}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* MONTH'S REGISTERED HOLIDAY LABELS LIST */}
          <div className="flex-shrink-0 pt-2 border-t border-border/60 dark:border-zinc-800/80">
            {isUploading ? (
              <div className="flex items-center gap-3 py-1">
                <div className="h-3.5 w-28 bg-muted/40 dark:bg-zinc-800/40 rounded-lg animate-pulse" />
                <div className="h-3.5 w-36 bg-muted/40 dark:bg-zinc-800/40 rounded-lg animate-pulse" />
              </div>
            ) : currentMonthHolidays.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/60 italic font-mono">
                No official public holidays in {MONTH_FULL_NAMES[month]}.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {currentMonthHolidays.map((h) => {
                  const dayNum = parseInt(h.date.split('-')[2], 10);
                  const isHovered = hoveredDate === h.date;

                  return (
                    <button 
                      key={h.id || h.date}
                      onClick={() => jumpToDate(h.date)}
                      onMouseEnter={() => handleCalendarDateHover(h.date)}
                      onMouseLeave={() => handleCalendarDateHover(null)}
                      className={`flex items-center gap-1.5 cursor-pointer transition-all ${
                        isHovered ? 'scale-105 text-purple-600 dark:text-purple-300' : 'hover:text-purple-600 dark:hover:text-purple-300'
                      }`}
                    >
                      <span className="text-purple-600 dark:text-purple-400 font-black text-sm">•</span>
                      <span className={`font-mono font-bold ${isHovered ? 'text-purple-700 dark:text-purple-300 underline' : 'text-foreground dark:text-white'}`}>{dayNum}</span>
                      <span className={`text-xs truncate max-w-[150px] ${isHovered ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {h.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* MINI CALENDARS ROW FOR ALL UPCOMING MONTHS */}
          <div className="flex-shrink-0 pt-2 border-t border-border/60 dark:border-zinc-800/80 flex flex-col gap-1.5 mt-auto overflow-hidden">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono flex items-center justify-between px-0.5">
              <span>All Months Overview ({isUploading ? '...' : miniMonths.length})</span>
              {!isUploading && <span className="text-[9px] text-muted-foreground/60 font-normal">Swipe →</span>}
            </div>

            <div className="relative w-full">
              {isUploading ? (
                /* SKELETON MINI CALENDAR TRACK */
                <div className="flex items-center gap-2 overflow-hidden pb-1 pt-0.5 no-scrollbar">
                  {[1, 2, 3, 4, 5].map(idx => (
                    <div 
                      key={idx} 
                      className="flex-shrink-0 w-[96px] sm:w-[116px] h-[80px] sm:h-[94px] p-2 sm:p-2.5 bg-card/40 dark:bg-[#121216]/40 border border-border/40 dark:border-zinc-800/60 rounded-2xl animate-pulse flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-8 bg-muted/50 dark:bg-zinc-700/50 rounded" />
                        <div className="h-2.5 w-4 bg-muted/40 dark:bg-zinc-800/40 rounded" />
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div key={i} className="h-1.5 w-1.5 rounded-[2px] bg-muted/40 dark:bg-zinc-800/50" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* LEFT FADE GRADIENT */}
                  {canScrollLeft && (
                    <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-card dark:from-[#0b0b0d] via-card/80 dark:via-[#0b0b0d]/80 to-transparent pointer-events-none z-10 animate-in fade-in duration-200" />
                  )}

                  {/* RIGHT FADE GRADIENT */}
                  {canScrollRight && (
                    <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-card dark:from-[#0b0b0d] via-card/80 dark:via-[#0b0b0d]/80 to-transparent pointer-events-none z-10 animate-in fade-in duration-200" />
                  )}

                  {/* Horizontal Scroll Track with Squircle Cards */}
                  <div 
                    onScroll={handleMiniTrackScroll}
                    className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar flex-nowrap min-w-0 max-w-full touch-pan-x overscroll-contain"
                  >
                    {miniMonths.map((mDate) => {
                      const mYear = mDate.getFullYear();
                      const mMonth = mDate.getMonth();
                      const isSelected = viewDate.getFullYear() === mYear && viewDate.getMonth() === mMonth;

                      const daysInMMonth = new Date(mYear, mMonth + 1, 0).getDate();
                      const firstDayM = new Date(mYear, mMonth, 1).getDay();

                      const mCells = [];
                      for (let i = 0; i < firstDayM; i++) {
                        mCells.push({ type: 'empty', key: `mini-empty-${i}` });
                      }

                      for (let d = 1; d <= daysInMMonth; d++) {
                        const mStr = String(mMonth + 1).padStart(2, '0');
                        const dStr = String(d).padStart(2, '0');
                        const dateStr = `${mYear}-${mStr}-${dStr}`;
                        const hasHoliday = activeList.some(h => h.date === dateStr);
                        mCells.push({ type: 'day', dayNum: d, hasHoliday, dateStr, key: `mini-${dateStr}` });
                      }

                      return (
                        <button
                          key={`${mYear}-${mMonth}`}
                          onClick={() => setViewDate(new Date(mYear, mMonth, 1))}
                          className={`flex-shrink-0 w-[96px] sm:w-[116px] h-[80px] sm:h-[94px] p-2 sm:p-2.5 bg-card/80 dark:bg-[#121216] border rounded-2xl transition-all text-left flex flex-col gap-1 sm:gap-1.5 justify-start cursor-pointer group active:scale-95 select-none touch-pan-x ${
                            isSelected
                              ? 'border-2 border-purple-500 dark:border-purple-400 bg-purple-500/10 dark:bg-purple-950/40 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                              : 'border-border/70 hover:border-purple-500/50 hover:bg-purple-500/5'
                          }`}
                        >
                          <div className="flex items-center justify-between px-0.5 flex-shrink-0">
                            <span className={`text-[10px] font-black font-mono tracking-wider uppercase ${
                              isSelected ? 'text-purple-600 dark:text-purple-300' : 'text-foreground/90'
                            }`}>
                              {MONTH_SHORT_NAMES[mMonth]}
                            </span>
                            <span className="text-[9px] font-bold text-muted-foreground/70 font-mono">
                              '{String(mYear).slice(-2)}
                            </span>
                          </div>

                          {/* SQUIRCLE PILL DAY CELLS GRID */}
                          <div className="grid grid-cols-7 gap-0.5 text-center items-center justify-center p-0.5">
                            {mCells.map((mc) => {
                              if (mc.type === 'empty') {
                                return <div key={mc.key} className="h-1.5 w-1.5" />;
                              }
                              return (
                                <div
                                  key={mc.key}
                                  className={`h-1.5 w-1.5 rounded-[2px] mx-auto transition-all ${
                                    mc.hasHoliday
                                      ? 'bg-purple-500 dark:bg-purple-400 ring-1 ring-purple-400/80 shadow-[0_0_6px_rgba(168,85,247,0.9)] scale-125'
                                      : 'bg-zinc-800/80 dark:bg-[#1a1a22] border border-zinc-700/40 dark:border-zinc-800'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </motion.div>

      {/* FULL-SPAN BOTTOM UPLOAD ACTION BAR WITH SQUARE KEY BUTTON */}
      <div className="flex-shrink-0 flex items-center gap-2 pt-2 border-t border-border/50">
        <button
          onClick={() => setShowApiKeyModal(true)}
          title="Configure Gemini API Key"
          className="p-2.5 bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded-2xl transition-all cursor-pointer flex-shrink-0"
        >
          <Key className="w-4 h-4" />
        </button>

        <button
          onClick={handleUploadButtonClick}
          disabled={isUploading}
          className="flex-1 py-2.5 px-4 bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20 dark:hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 border border-purple-500/30 dark:border-purple-500/40 rounded-2xl transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 font-bold text-xs"
        >
          {isUploading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span>Parsing Document with Gemini AI...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Upload Sheet (PDF/Img)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
