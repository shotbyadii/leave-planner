import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, ListTodo, RotateCw } from 'lucide-react';
import { publicHolidays } from './data/holidays';
import { fetchBookedLeaves, fetchLeavePlans, resetAllLeaves, removeLeave, deleteLeavePlan } from './services/leaveService';
import Calendar from './components/Calendar';
import OptimizerPanel from './components/OptimizerPanel';
import LeaveTracker from './components/LeaveTracker';
import TripPlanner from './components/TripPlanner';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [leaves, setLeaves] = useState({
    pl: { total: 15, used: 0, label: 'Privileged', color: 'blue', bg: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600' },
    el: { total: 10, used: 0, label: 'Emergency', color: 'orange', bg: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600' },
    rh: { total: 1, used: 0, label: 'Restricted', color: 'green', bg: 'bg-green-400', badge: 'bg-green-50 text-green-600' }
  });
  const [bookedDates, setBookedDates] = useState([]);
  const [leavePlans, setLeavePlans] = useState([]);
  const [previewDates, setPreviewDates] = useState([]);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);
  const [calendarViewMode, setCalendarViewMode] = useState('yearly');
  const [calendarFocusedMonth, setCalendarFocusedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    const dbLeaves = await fetchBookedLeaves();
    const dbPlans = await fetchLeavePlans();
    setBookedDates(dbLeaves);
    setLeavePlans(dbPlans);
    updateLeaveCounts(dbLeaves);
  };

  const updateLeaveCounts = (datesArray) => {
    const plUsed = datesArray.filter(d => d.type === 'pl').reduce((sum, d) => sum + (d.duration || 1), 0);
    const elUsed = datesArray.filter(d => d.type === 'el').reduce((sum, d) => sum + (d.duration || 1), 0);
    const rhUsed = datesArray.filter(d => d.type === 'rh').reduce((sum, d) => sum + (d.duration || 1), 0);

    setLeaves(prev => ({
      ...prev,
      pl: { ...prev.pl, used: plUsed },
      el: { ...prev.el, used: elUsed },
      rh: { ...prev.rh, used: rhUsed }
    }));
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all leaves? This cannot be undone.")) {
      await resetAllLeaves();
      setBookedDates([]);
      setLeavePlans([]);
      updateLeaveCounts([]);
      setPreviewDates([]);
    }
  };

  const handleDeleteLeave = async (dateStr) => {
    await removeLeave(dateStr);
    const newDates = bookedDates.filter(d => d.date !== dateStr);
    setBookedDates(newDates);
    updateLeaveCounts(newDates);
  };

  const handleDeletePlan = async (planId) => {
    await deleteLeavePlan(planId);
    await loadLeaves(); // Reload everything since CASCADE deletes leaves too
  };

  const handlePreviewRange = (datesArray) => {
    setActiveTab('calendar');
    setPreviewDates(datesArray);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <div className="bg-slate-900 text-white rounded-md p-1.5 w-8 h-8 flex items-center justify-center font-bold">LV</div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Leave Vault</h1>
              <span className="text-lg font-bold text-slate-800">
                {(() => {
                  const hour = new Date().getHours();
                  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
                  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return `${greeting}, it's ${date}`;
                })()}
              </span>
            </div>
          </div>
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">2026</span>
        </div>

        <div className="flex items-center gap-8">
          {Object.entries(leaves).map(([key, data]) => {
            const percentage = ((data.total - data.used) / data.total) * 100;
            const remaining = data.total - data.used;
            const remainingFmt = Number.isInteger(remaining) ? remaining : remaining.toFixed(1);
            const usedFmt = Number.isInteger(data.used) ? data.used : data.used.toFixed(1);
            return (
              <div key={key} className="flex flex-col w-32">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">{key} <span className={`ml-1 text-[10px] lowercase px-1 rounded ${data.badge}`}>{data.label}</span></span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">{remainingFmt}</span>
                  <span className="text-sm text-slate-400">/ {data.total}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${data.bg}`} style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1">{usedFmt} used • {remainingFmt} remaining</span>
              </div>
            );
          })}
          <button onClick={handleReset} title="Reset all leaves" className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <RotateCw size={18} className="text-slate-500" />
          </button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-6 sticky top-[73px] z-30">
        <div className="flex gap-6">
          <button className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'calendar' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('calendar')}>
            <CalendarIcon size={16} /> Calendar
          </button>
          <button className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'trips' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('trips')}>
            <MapPin size={16} /> Trip Planner
          </button>
          <button className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'tracker' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('tracker')}>
            <ListTodo size={16} /> Leave Tracker
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">{bookedDates.length}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 flex gap-6 overflow-hidden relative">
        {/* Dim background if preview is active */}
        {previewDates.length > 0 && activeTab === 'calendar' && (
          <div className="absolute inset-0 bg-slate-900/10 z-20 pointer-events-none transition-opacity duration-300"></div>
        )}

        {activeTab === 'calendar' && (
          <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-140px)] relative z-10">
            <OptimizerPanel 
              onPreviewRange={handlePreviewRange} 
              onHoverSuggestion={setHoveredSuggestion}
              bookedDates={bookedDates.map(d=>d.date)}
              viewMode={calendarViewMode}
              setFocusedMonth={setCalendarFocusedMonth}
            />
          </div>
        )}

        <div className={`flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-140px)] relative ${activeTab === 'calendar' ? 'z-30' : 'z-10'}`}>
          {activeTab === 'calendar' && (
            <div className="p-4 border-b border-slate-100 flex gap-6 items-center bg-slate-50/50">
              <span className="text-sm font-medium text-slate-500">Legend:</span>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200"></div> Weekend</div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-full bg-purple-200"></div> Public Holiday</div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-full bg-blue-300"></div> PL Applied</div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-full bg-orange-300"></div> EL Applied</div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-full bg-green-300"></div> RH Applied</div>
              <div className="flex items-center gap-2 text-sm text-slate-600"><div className="w-3 h-3 rounded-full border-2 border-yellow-400"></div> Selection</div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
            {activeTab === 'calendar' && (
              <Calendar 
                holidays={publicHolidays} 
                bookedDates={bookedDates}
                setBookedDates={setBookedDates}
                leaves={leaves}
                setLeaves={setLeaves}
                loadLeaves={loadLeaves}
                previewDates={previewDates}
                setPreviewDates={setPreviewDates}
                hoveredSuggestion={hoveredSuggestion}
                viewMode={calendarViewMode}
                setViewMode={setCalendarViewMode}
                focusedMonth={calendarFocusedMonth}
                setFocusedMonth={setCalendarFocusedMonth}
              />
            )}
            {activeTab === 'tracker' && (
              <LeaveTracker 
                bookedDates={bookedDates} 
                onDelete={handleDeleteLeave} 
                onDeletePlan={handleDeletePlan}
                leaves={leaves} 
                leavePlans={leavePlans}
              />
            )}
            {activeTab === 'trips' && (
              <TripPlanner 
                leavePlans={leavePlans} 
                bookedDates={bookedDates} 
                leaves={leaves}
                holidays={publicHolidays}
                onPreviewRange={handlePreviewRange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
