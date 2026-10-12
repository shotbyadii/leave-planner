import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, Mic, MicOff, X, Key, ExternalLink, Calendar, 
  Check, ArrowRight, ShieldCheck, Loader2, Bot, User, CornerDownLeft,
  RotateCcw, Compass, MapPin, CheckCircle2, AlertCircle, Trash2, Zap,
  Maximize2, Minimize2, ChevronUp, ChevronDown, Palmtree, Home, Clock,
  CalendarDays, Flame, Building2, Plus
} from 'lucide-react';
import { 
  queryGeminiAssistant, 
  getStoredGeminiApiKey, 
  setStoredGeminiApiKey, 
  hasGeminiApiKey,
  formatAiErrorMessage,
  AVAILABLE_MODELS,
  getStoredGeminiModel
} from '../services/aiAssistantService';
import { getBrandTheme, DEFAULT_BRAND_GRADIENT } from '../utils/brandColorExtractor';
import { getLeaveColor } from '../utils/colorUtils';
import { publicHolidays, isWeekend, isHoliday } from '../data/holidays';
import AppleBalanceTicker from './AppleBalanceTicker';

const STARTER_PROMPTS = [
  { label: '⚡ Upcoming long weekend', text: 'When is the next best long weekend bridge to take off?' },
  { label: '🌴 4-day trip in October', text: 'Plan a 4-day vacation trip in October' },
  { label: '📊 Check my leave balances', text: 'How many PL and EL leaves do I have left?' },
  { label: '🏠 WFH tomorrow', text: 'Mark tomorrow as Work From Home' }
];

/* ─────────────────────────────────────────────────────────────
 * 1. AI BRIDGE STRIP CARD (Visual 5-Day Bridge Timeline)
 * ───────────────────────────────────────────────────────────── */
const AiBridgeStripCard = ({ bridge, onExecute, onPreview, brandTheme, activeTicker, isApplied, onDismissTicker }) => {
  if (!bridge || !bridge.startDate) return null;

  const start = new Date(bridge.startDate);
  // Generate 5 continuous day pills around the bridge
  const days = [];
  for (let i = -1; i <= 3; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    const isW = isWeekend(dStr);
    const isH = isHoliday(dStr);
    const isTarget = dStr === bridge.startDate;
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();

    days.push({
      dateStr: dStr,
      weekday,
      dayNum,
      isWeekend: isW,
      isHoliday: isH,
      isTarget,
      label: isH ? (bridge.holidayName || 'Holiday') : isW ? 'Off' : isTarget ? '1 PL' : 'Work'
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 mt-1 text-left"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <Sparkles size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {bridge.holidayName ? `${bridge.holidayName} Bridge` : 'Long Weekend Bridge'}
            </h4>
            <p className="text-[10px] font-mono text-muted-foreground">
              {bridge.startDate} → {bridge.endDate || bridge.startDate}
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <Flame size={10} /> {bridge.consecutiveDaysOff || 4} Days Off
        </span>
      </div>

      {/* 5-Day Visual Strip */}
      <div className="grid grid-cols-5 gap-1 text-center py-1">
        {days.map((d, i) => (
          <div
            key={i}
            className={`rounded-xl p-1.5 flex flex-col items-center justify-center transition-all ${
              d.isTarget
                ? 'bg-blue-500/15 border-2 border-blue-500 text-blue-400 font-bold relative shadow-xs'
                : d.isHoliday
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : d.isWeekend
                ? 'bg-muted/60 border border-border/60 text-muted-foreground'
                : 'bg-muted/30 border border-border/40 text-muted-foreground/70'
            }`}
          >
            {d.isTarget && (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            <span className="text-[8px] font-mono uppercase leading-tight">{d.weekday}</span>
            <span className="text-[11px] font-mono font-bold leading-tight my-0.5">{d.dayNum}</span>
            <span className="text-[7.5px] font-mono truncate max-w-full leading-tight opacity-90">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
        <span>Cost: <strong className="text-foreground font-mono">{bridge.leaveDaysCost || 1} leave day</strong></span>
        <span>Benefit: <strong className="text-emerald-500 font-mono">+{bridge.consecutiveDaysOff || 4} days rest</strong></span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        {activeTicker ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-2 flex flex-col items-center justify-center bg-card border border-border rounded-xl"
          >
            <AppleBalanceTicker
              initialValue={activeTicker.initialValue}
              targetValue={activeTicker.targetValue}
              totalQuota={activeTicker.totalQuota}
              leaveType={activeTicker.leaveType}
              leaveLabel={activeTicker.leaveLabel}
              leaveColor={activeTicker.leaveColor}
              deductedCount={activeTicker.deductedCount}
              actionType={activeTicker.actionType}
              compact={true}
              onComplete={async () => {
                if (activeTicker?.onDone) await activeTicker.onDone();
                if (onDismissTicker) onDismissTicker();
              }}
              autoDismissMs={1300}
            />
          </motion.div>
        ) : isApplied ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 size={13} /> Applied to Calendar
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => onExecute('stage_plan', {
              planName: `${bridge.holidayName || 'Holiday'} Long Weekend`,
              startDate: bridge.startDate,
              endDate: bridge.endDate || bridge.startDate,
              leaveType: bridge.leaveType || 'pl',
              dates: bridge.dates || [bridge.startDate],
              leaveDaysCost: bridge.leaveDaysCost || 1
            })}
            style={brandTheme?.buttonStyle || { backgroundColor: brandTheme?.primary || '#2563EB' }}
            className="flex-1 py-2 px-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <CheckCircle2 size={13} /> Apply Bridge to Calendar
          </button>
        )}

        {onPreview && !activeTicker && (
          <button
            type="button"
            onClick={() => onPreview(bridge.startDate, bridge.endDate || bridge.startDate)}
            className="py-2 px-3 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold border border-border/80 transition-colors cursor-pointer"
          >
            Preview
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 2. AI BOOKING PREVIEW CARD (Leave Booking & Quota Burn)
 * ───────────────────────────────────────────────────────────── */
const AiBookingPreviewCard = ({ details, onExecute, onPreview, context, brandTheme, activeTicker, isApplied, onDismissTicker }) => {
  if (!details || !details.startDate) return null;

  const type = (details.leaveType || 'pl').toLowerCase();
  const cost = details.leaveDaysCost || (details.dates?.length) || 1;
  const curTotal = context.leaves && context.leaves[type] ? context.leaves[type].total : 15;
  const curUsed = context.leaves && context.leaves[type] ? context.leaves[type].used : 0;
  const curRemaining = Math.max(0, curTotal - curUsed);
  const isInsufficient = curRemaining < cost;
  const colorObj = getLeaveColor(type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 mt-1 text-left"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-xl ${colorObj.bg}/15 ${colorObj.text} flex items-center justify-center border ${colorObj.border}`}>
            <Calendar size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {details.planName || `${details.leaveType?.toUpperCase() || 'PL'} Leave Request`}
            </h4>
            <p className="text-[10px] font-mono text-muted-foreground">
              {details.startDate} {details.endDate && details.endDate !== details.startDate ? `→ ${details.endDate}` : ''}
            </p>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${colorObj.bg}/15 ${colorObj.text} border ${colorObj.border}`}>
          {details.leaveType?.toUpperCase() || 'PL'}
        </span>
      </div>

      <div className="bg-muted/40 border border-border/60 rounded-xl p-2.5 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Leave Days Cost:</span>
          <span className="font-bold text-foreground font-mono">{cost} working day(s)</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Quota Deduction:</span>
          <span className="font-bold font-mono text-foreground">
            {curRemaining} → <span className={isInsufficient ? 'text-red-500' : 'text-emerald-500'}>{Math.max(0, curRemaining - cost)}</span> left
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {activeTicker ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-2 flex flex-col items-center justify-center bg-card border border-border rounded-xl"
          >
            <AppleBalanceTicker
              initialValue={activeTicker.initialValue}
              targetValue={activeTicker.targetValue}
              totalQuota={activeTicker.totalQuota}
              leaveType={activeTicker.leaveType}
              leaveLabel={activeTicker.leaveLabel}
              leaveColor={activeTicker.leaveColor}
              deductedCount={activeTicker.deductedCount}
              actionType={activeTicker.actionType}
              compact={true}
              onComplete={async () => {
                if (activeTicker?.onDone) await activeTicker.onDone();
                if (onDismissTicker) onDismissTicker();
              }}
              autoDismissMs={1300}
            />
          </motion.div>
        ) : isApplied ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 size={13} /> Booked to Calendar
          </motion.div>
        ) : isInsufficient ? (
          <button
            disabled
            className="flex-1 py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 opacity-80 cursor-not-allowed"
          >
            <AlertCircle size={13} /> Insufficient Quota ({curRemaining}/{curTotal} Left)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onExecute('stage_leave', details)}
            style={brandTheme?.buttonStyle || { backgroundColor: brandTheme?.primary || '#2563EB' }}
            className="flex-1 py-2 px-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <CheckCircle2 size={13} /> Confirm & Book
          </button>
        )}

        {onPreview && !activeTicker && (
          <button
            type="button"
            onClick={() => onPreview(details.startDate, details.endDate || details.startDate)}
            className="py-2 px-3 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold border border-border/80 transition-colors cursor-pointer"
          >
            Preview
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 3. AI QUOTA CAPSULE CARD (Balances Breakdown)
 * ───────────────────────────────────────────────────────────── */
const AiQuotaCapsuleCard = ({ balances }) => {
  if (!balances) return null;

  const entries = [
    { id: 'pl', name: 'Planned (PL)', data: balances.pl, color: 'blue' },
    { id: 'el', name: 'Emergency (EL)', data: balances.el, color: 'orange' },
    { id: 'rh', name: 'Extra (RH)', data: balances.rh, color: 'green' },
    { id: 'wfh', name: 'Remote (WFH)', data: balances.wfh, color: 'cyan', isMonthly: true }
  ].filter(e => e.data && typeof e.data.total === 'number');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 mt-1 text-left"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <CalendarDays size={13} className="text-primary" /> Leave Quotas & Balances
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">Year 2026</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {entries.map(e => {
          const colorObj = getLeaveColor(e.color);
          const pct = e.data.total > 0 ? (e.data.remaining / e.data.total) * 100 : 0;
          return (
            <div key={e.id} className="bg-muted/30 border border-border/50 rounded-xl p-2 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-foreground truncate">{e.name}</span>
                <span className="font-mono font-black text-foreground">
                  {e.data.remaining}<span className="text-muted-foreground font-normal text-[9px]">/{e.data.total}</span>
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${colorObj.bg}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
              </div>
              <span className="text-[8px] font-mono text-muted-foreground">
                {e.isMonthly ? 'Per Month' : 'Annual Pool'}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 4. AI VACATION ITINERARY CARD (Multi-Day Trips)
 * ───────────────────────────────────────────────────────────── */
const AiVacationItineraryCard = ({ details, onExecute, onPreview, brandTheme, activeTicker, isApplied, onDismissTicker }) => {
  if (!details || !details.startDate) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 mt-1 text-left"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-sm shadow-sm shrink-0">
            🌴
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground truncate">
              {details.planName || 'Vacation Itinerary'}
            </h4>
            <p className="text-[10px] font-mono text-muted-foreground">
              {details.startDate} → {details.endDate || details.startDate}
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black text-pink-400 bg-pink-500/10 border border-pink-500/20 shrink-0">
          {details.totalSpanDays || details.dates?.length || 4} Days Total
        </span>
      </div>

      <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-xl border border-border/50 font-mono">
        <span className="text-muted-foreground">Working Leaves Needed:</span>
        <span className="font-bold text-foreground">{details.leaveDaysCost || details.dates?.length || 2} Day(s)</span>
      </div>

      <div className="flex gap-2 pt-1">
        {activeTicker ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-2 flex flex-col items-center justify-center bg-card border border-border rounded-xl"
          >
            <AppleBalanceTicker
              initialValue={activeTicker.initialValue}
              targetValue={activeTicker.targetValue}
              totalQuota={activeTicker.totalQuota}
              leaveType={activeTicker.leaveType}
              leaveLabel={activeTicker.leaveLabel}
              leaveColor={activeTicker.leaveColor}
              deductedCount={activeTicker.deductedCount}
              actionType={activeTicker.actionType}
              compact={true}
              onComplete={async () => {
                if (activeTicker?.onDone) await activeTicker.onDone();
                if (onDismissTicker) onDismissTicker();
              }}
              autoDismissMs={1300}
            />
          </motion.div>
        ) : isApplied ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 size={13} /> Itinerary Saved
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => onExecute('stage_plan', details)}
            style={brandTheme?.buttonStyle || { backgroundColor: brandTheme?.primary || '#2563EB' }}
            className="flex-1 py-2 px-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <CheckCircle2 size={13} /> Save Itinerary
          </button>
        )}

        {onPreview && !activeTicker && (
          <button
            type="button"
            onClick={() => onPreview(details.startDate, details.endDate || details.startDate)}
            className="py-2 px-3 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold border border-border/80 transition-colors cursor-pointer"
          >
            Preview
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 5. AI WFH ATTENDANCE CARD (Remote Check-in)
 * ───────────────────────────────────────────────────────────── */
const AiWfhAttendanceCard = ({ details, onExecute, brandTheme, context, activeTicker, isApplied, onDismissTicker }) => {
  if (!details || !details.startDate) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 mt-1 text-left"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Home size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Remote / WFH Check-in</h4>
            <p className="text-[10px] font-mono text-muted-foreground">{details.startDate}</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Monthly Quota
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Logging attendance as Work From Home. Automatically synced with your monthly allowance tracker.
      </p>

      <div className="flex gap-2 pt-1">
        {activeTicker ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-2 flex flex-col items-center justify-center bg-card border border-border rounded-xl"
          >
            <AppleBalanceTicker
              initialValue={activeTicker.initialValue}
              targetValue={activeTicker.targetValue}
              totalQuota={activeTicker.totalQuota}
              leaveType={activeTicker.leaveType}
              leaveLabel={activeTicker.leaveLabel}
              leaveColor={activeTicker.leaveColor}
              deductedCount={activeTicker.deductedCount}
              actionType={activeTicker.actionType}
              compact={true}
              onComplete={async () => {
                if (activeTicker?.onDone) await activeTicker.onDone();
                if (onDismissTicker) onDismissTicker();
              }}
              autoDismissMs={1300}
            />
          </motion.div>
        ) : isApplied ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 size={13} /> WFH Logged
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={() => onExecute('log_wfh', details)}
            style={brandTheme?.buttonStyle || { backgroundColor: '#06B6D4' }}
            className="flex-1 py-2 px-3 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <CheckCircle2 size={13} /> Confirm WFH Attendance
          </button>
        )}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 6. AI HOLIDAY LIST CARD (Upcoming Holidays)
 * ───────────────────────────────────────────────────────────── */
const AiHolidayListCard = ({ holidays, onPreview }) => {
  if (!holidays || !Array.isArray(holidays) || holidays.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-2 mt-1 text-left"
    >
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
        <CalendarDays size={12} className="text-primary" /> Upcoming Public Holidays
      </span>

      <div className="flex flex-col gap-1.5">
        {holidays.map((h, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/50 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="font-bold text-foreground">{h.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{h.date}</span>
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(h.date, h.date)}
                  className="px-2 py-0.5 rounded-lg bg-card border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  View
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * CORE CHAT CONTENT (Shared between Desktop & Mobile Chatbar)
 * ───────────────────────────────────────────────────────────── */
export const AiAssistantChatContent = ({
  onClose,
  context = {},
  onExecuteAction,
  onPreviewRange,
  isMorphedDock = false,
  isMobileChatbar = false,
  mobileChatbarMode = 'compact',
  onToggleMobileExpand = () => {},
  companyName = ''
}) => {
  const brandTheme = useMemo(() => getBrandTheme(companyName), [companyName]);

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
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('assistant_chat_session_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    try {
      sessionStorage.setItem('assistant_chat_applied_actions', JSON.stringify(appliedActions));
    } catch (e) {}
  }, [appliedActions]);

  useEffect(() => {
    setApiKeyInput(getStoredGeminiApiKey());
    setShowKeyConfig(!hasGeminiApiKey());
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeTickerData]);

  const handleNewChat = () => {
    const freshWelcomeMsg = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      text: "👋 What are we planning? Ask me to find long weekends, plan a vacation, log WFH, or check your remaining leaves.",
      action: 'none',
      details: null
    };
    setMessages([freshWelcomeMsg]);
    setAppliedActions({});
    setActiveTickerData({});
    setInputVal('');
    try {
      sessionStorage.setItem('assistant_chat_session_history', JSON.stringify([freshWelcomeMsg]));
      sessionStorage.removeItem('assistant_chat_applied_actions');
    } catch (e) {}
  };

  const handleTriggerActionWithTicker = (msgId, action, details) => {
    const type = (details?.leaveType || 'pl').toLowerCase();
    const amount = details?.leaveDaysCost || (details?.dates?.length) || 1;
    const leaveTypeName = context.leaveConfigs?.find(c => c.id === type)?.name || context.leaveNames?.[type] || `${type.toUpperCase()} Leave`;

    if (action === 'cancel_leave') {
      const curBalance = context.leaves && context.leaves[type] ? (context.leaves[type].total - context.leaves[type].used) : 10;
      const total = context.leaves && context.leaves[type] ? context.leaves[type].total : 15;
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
          onDone: async () => {
            if (onExecuteAction) await onExecuteAction(action, details);
            setAppliedActions(prev => ({ ...prev, [msgId]: true }));
          }
        }
      }));
    } else {
      const curBalance = context.leaves && context.leaves[type] ? (context.leaves[type].total - context.leaves[type].used) : 15;
      if (curBalance < amount && action !== 'log_wfh') {
        console.warn('Blocked: Insufficient quota for action');
        return;
      }
      const total = context.leaves && context.leaves[type] ? context.leaves[type].total : 15;
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
          onDone: async () => {
            if (onExecuteAction) await onExecuteAction(action, details);
            setAppliedActions(prev => ({ ...prev, [msgId]: true }));
          }
        }
      }));
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
          bridge: result.bridge,
          balances: result.balances,
          holidays: result.holidays,
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
    setMessages([INITIAL_WELCOME_MSG]);
  };

  // In mobile compact mode, show ONLY the latest turn so the background calendar remains visible!
  const displayedMessages = useMemo(() => {
    if (isMobileChatbar && mobileChatbarMode === 'compact') {
      return messages.length > 2 ? messages.slice(-2) : messages;
    }
    return messages;
  }, [messages, isMobileChatbar, mobileChatbarMode]);

  return (
    <div 
      style={{ background: brandTheme?.css || DEFAULT_BRAND_GRADIENT.css }}
      className={`flex flex-col w-full overflow-hidden text-white transition-all duration-300 ${
        isMobileChatbar
          ? mobileChatbarMode === 'compact'
            ? 'h-[50vh] max-h-[50vh]'
            : 'h-[85vh] max-h-[88vh]'
          : isMorphedDock
          ? 'h-[50vh] max-h-[50vh]'
          : 'h-full'
      }`}
    >
      {/* Header Styled like Desktop Sidebar with Frosted Glass Effect */}
      <div 
        className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md text-white flex-shrink-0 transition-all duration-300 shadow-xs"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner shrink-0">
            <Sparkles size={16} className="text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black font-mono tracking-wide uppercase flex items-center gap-1.5 text-white truncate">
              Assistant
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold border border-white/25">
                3.8 Flash
              </span>
            </h3>
            <p className="text-[10px] text-white/70 font-medium truncate">
              Vacations • Leaves • WFH • Quotas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile Compact / Expand Toggle */}
          {isMobileChatbar && (
            <button
              type="button"
              onClick={onToggleMobileExpand}
              title={mobileChatbarMode === 'compact' ? "Expand Conversation" : "Collapse to Focus View"}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              {mobileChatbarMode === 'compact' ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer ml-0.5"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Conversation Message List (or Latest Focused Turn in Mobile Compact Mode) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {displayedMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="relative flex-shrink-0 mb-0.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  msg.modelUsed === 'local-fallback'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300'
                    : 'bg-primary/10 border border-primary/20 text-primary'
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

            <div className={`max-w-[88%] sm:max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed text-left ${
                  msg.role === 'user'
                    ? 'text-white font-medium rounded-br-none shadow-xs border border-white/20'
                    : msg.isError
                    ? 'bg-red-500/20 border border-red-500/40 text-red-100 rounded-bl-none backdrop-blur-md'
                    : 'bg-white/95 dark:bg-slate-900/90 border border-white/20 text-slate-800 dark:text-slate-100 rounded-bl-none shadow-xs backdrop-blur-md'
                }`}
                style={msg.role === 'user' ? { backgroundColor: brandTheme?.primary || '#2563EB' } : undefined}
              >
                {msg.text}
              </div>

              {/* 1. Bridge Strip Card */}
              {msg.bridge && (
                <AiBridgeStripCard 
                  bridge={msg.bridge} 
                  onExecute={(action, details) => handleTriggerActionWithTicker(msg.id, action, details)} 
                  onPreview={onPreviewRange} 
                  brandTheme={brandTheme}
                  activeTicker={activeTickerData[msg.id]}
                  isApplied={appliedActions[msg.id]}
                  onDismissTicker={() => setActiveTickerData(prev => { const n = { ...prev }; delete n[msg.id]; return n; })}
                />
              )}

              {/* 2. Vacation Itinerary Card */}
              {!msg.bridge && msg.action === 'stage_plan' && msg.details && (
                <AiVacationItineraryCard 
                  details={msg.details} 
                  onExecute={(action, details) => handleTriggerActionWithTicker(msg.id, action, details)} 
                  onPreview={onPreviewRange} 
                  brandTheme={brandTheme}
                  activeTicker={activeTickerData[msg.id]}
                  isApplied={appliedActions[msg.id]}
                  onDismissTicker={() => setActiveTickerData(prev => { const n = { ...prev }; delete n[msg.id]; return n; })}
                />
              )}

              {/* 3. Leave Booking Card */}
              {msg.action === 'stage_leave' && msg.details && (
                <AiBookingPreviewCard 
                  details={msg.details} 
                  onExecute={(action, details) => handleTriggerActionWithTicker(msg.id, action, details)} 
                  onPreview={onPreviewRange} 
                  context={context} 
                  brandTheme={brandTheme}
                  activeTicker={activeTickerData[msg.id]}
                  isApplied={appliedActions[msg.id]}
                  onDismissTicker={() => setActiveTickerData(prev => { const n = { ...prev }; delete n[msg.id]; return n; })}
                />
              )}

              {/* 4. WFH Attendance Card */}
              {msg.action === 'log_wfh' && msg.details && (
                <AiWfhAttendanceCard 
                  details={msg.details} 
                  onExecute={(action, details) => handleTriggerActionWithTicker(msg.id, action, details)} 
                  brandTheme={brandTheme} 
                  context={context}
                  activeTicker={activeTickerData[msg.id]}
                  isApplied={appliedActions[msg.id]}
                  onDismissTicker={() => setActiveTickerData(prev => { const n = { ...prev }; delete n[msg.id]; return n; })}
                />
              )}

              {/* 5. Quota Balances Card */}
              {msg.balances && (
                <AiQuotaCapsuleCard balances={msg.balances} />
              )}

              {/* 6. Upcoming Holidays List Card */}
              {msg.holidays && (
                <AiHolidayListCard holidays={msg.holidays} onPreview={onPreviewRange} />
              )}
            </div>

            {msg.role === 'user' && (
              <div 
                className="w-7 h-7 rounded-xl text-white flex items-center justify-center flex-shrink-0 mb-0.5 shadow-xs border border-white/20"
                style={{ backgroundColor: brandTheme?.primary || '#2563EB' }}
              >
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-end">
            <div className="w-7 h-7 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0 mb-0.5 shadow-xs">
              <Bot size={15} />
            </div>
            <div className="bg-white/95 dark:bg-slate-900/90 border border-white/20 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-none text-xs flex items-center gap-2 shadow-xs backdrop-blur-md">
              <Loader2 size={13} className="animate-spin text-blue-500" />
              <span>Checking calendars & planning schedule...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Starter Prompt Chips (visible when starting conversation) */}
      {messages.length <= 2 && (
        <div className="px-3 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 border-t border-white/10 bg-black/15 backdrop-blur-xs">
          {STARTER_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p.text)}
              className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[11px] font-medium rounded-xl whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer backdrop-blur-xs shadow-2xs"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Chat Input Form styled like desktop sidebar */}
      <div className="p-2.5 sm:p-3.5 bg-black/25 backdrop-blur-md border-t border-white/10 flex-shrink-0">
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
              placeholder="Plan a 4-day trip in October..."
              disabled={isLoading}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-3.5 py-2 sm:py-2.5 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            title="New Chat"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white border border-white/20 flex items-center justify-center shadow-xs transition-all flex-shrink-0 cursor-pointer backdrop-blur-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>

          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            style={brandTheme?.buttonStyle || { backgroundColor: brandTheme?.primary || '#2563EB' }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl disabled:opacity-40 text-white flex items-center justify-center shadow-md active:scale-95 transition-all flex-shrink-0 cursor-pointer"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * DESKTOP MODAL WRAPPER
 * ───────────────────────────────────────────────────────────── */
const AiAssistantModal = ({ 
  isOpen, 
  onClose, 
  context = {}, 
  onExecuteAction, 
  onPreviewRange,
  companyName = ''
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
            companyName={companyName}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AiAssistantModal;
