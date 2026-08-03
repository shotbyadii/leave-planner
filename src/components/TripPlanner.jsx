import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, CalendarDays, Plane, BedDouble, Sun, Cloud, CloudRain, Navigation, ArrowRight, TrendingUp, Globe2, Sparkles, Map as MapIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { findOptimalWindows } from '../utils/leaveOptimizer';
import { destinations, calculateDistance, categorizeDistance } from '../data/destinationIntelligence';
import createGlobe from 'cobe';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import L from 'leaflet';

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper for generic calendar generation
const generateMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = [];
  let dayCounter = 1;
  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) week.push(null);
      else if (dayCounter > daysInMonth) week.push(null);
      else week.push(dayCounter++);
    }
    grid.push(week);
    if (dayCounter > daysInMonth) break;
  }
  return grid;
};

const MonthlyCalendar = ({ startDate, endDate, holidays, bookedDates, calendarStyle = 'classic' }) => {
  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  const grid = generateMonthGrid(year, month);
  
  const start = new Date(startDate); start.setHours(0,0,0,0);
  const end = new Date(endDate); end.setHours(0,0,0,0);

  let totalDays = 0; let leavesUsed = 0; let weekendCount = 0; let holidayCount = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    totalDays++;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isWknd = d.getDay() === 0 || d.getDay() === 6;
    const isHol = holidays.some(h => h.date === dateStr);
    if (isHol) holidayCount++;
    else if (isWknd) weekendCount++;
    else leavesUsed++;
  }

  const isCapsule = calendarStyle === 'capsule';

  const getDayClass = (day) => {
    if (!day) return 'bg-transparent border-transparent';
    const d = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWknd = d.getDay() === 0 || d.getDay() === 6;
    const isHol = holidays.some(h => h.date === dateStr);
    const inRange = d >= start && d <= end;

    if (isCapsule) {
      if (inRange) {
        if (isHol) return 'bg-purple-500/20 border border-purple-500/40 text-purple-400 font-black rounded-xl scale-105 shadow-sm';
        if (isWknd) return 'bg-muted border border-border text-foreground font-black rounded-xl shadow-sm';
        return 'bg-blue-500/20 border border-blue-500/40 text-blue-400 font-black rounded-xl scale-105 shadow-sm';
      }
      if (isHol) return 'bg-purple-500/10 border border-purple-500/20 text-purple-400/80 rounded-xl';
      if (isWknd) return 'bg-muted/20 border-transparent text-muted-foreground/40 rounded-xl';
      return 'bg-card border border-border/50 text-foreground hover:bg-muted rounded-xl';
    }

    if (inRange) {
      if (isHol) return 'bg-purple-200 border-purple-300 text-purple-900 font-bold shadow-inner rounded-lg';
      if (isWknd) return 'bg-muted border-border text-foreground font-bold shadow-inner rounded-lg';
      return 'bg-blue-300 border-blue-400 text-blue-900 font-bold shadow-inner rounded-lg';
    }
    if (isHol) return 'bg-purple-50 border-purple-100 text-purple-400 rounded-lg';
    if (isWknd) return 'bg-muted border-border text-muted-foreground rounded-lg';
    return 'bg-card border-border text-foreground hover:bg-muted rounded-lg';
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-apple-sm flex flex-col md:flex-row gap-8 items-center h-full">
      <div className="flex-1 w-full max-w-sm">
        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center justify-between">
          <span>{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Trip Calendar</span>
        </h4>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-black text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {grid.map((week, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {week.map((day, j) => (
                <div key={j} className={`h-7 md:h-8 flex items-center justify-center font-mono text-xs transition-all ${getDayClass(day)}`}>
                  {day || ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-row md:flex-col flex-wrap gap-4 md:gap-6 md:border-l md:border-border md:pl-8 flex-shrink-0 justify-center">
        <div className="text-center md:text-left">
          <div className="text-3xl font-black text-foreground">{totalDays}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Days</div>
        </div>
        <div className="text-center md:text-left">
          <div className="text-3xl font-black text-blue-600">{leavesUsed}</div>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Leaves Reqd.</div>
        </div>
        <div className="flex gap-4">
          <div className="text-center md:text-left">
            <div className="text-xl font-black text-purple-600">{holidayCount}</div>
            <div className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mt-1">Holidays</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-xl font-black text-foreground">{weekendCount}</div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Weekends</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Globe = ({ lat, lon }) => {
  const canvasRef = useRef();
  useEffect(() => {
    let phi = 0;
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 400,
      height: 400,
      phi: 0,
      theta: 0,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.9, 0.9, 0.9],
      markerColor: [0.1, 0.4, 1],
      glowColor: [1, 1, 1],
      markers: [{ location: [lat, lon], size: 0.1 }],
      onRender: (state) => { state.phi = phi; phi += 0.005; }
    });
    return () => globe.destroy();
  }, [lat, lon]);
  return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><canvas ref={canvasRef} style={{ width: 250, height: 250 }} /></div>;
};

const TripPlanner = ({ leavePlans, bookedDates = [], leaves, holidays = [], onPreviewRange, calendarStyle = 'classic' }) => {
  const [origin, setOrigin] = useState('Bengaluru');
  const [originCoords, setOriginCoords] = useState({ lat: 12.9716, lon: 77.5946 });
  const [passport, setPassport] = useState('IN');
  const [destType, setDestType] = useState('all');
  const [mode, setMode] = useState('optimize'); // 'optimize', 'plan', 'custom'
  const [targetLeaves, setTargetLeaves] = useState(leaves?.pl?.total - leaves?.pl?.used || 10);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [hasSearchedExplicitly, setHasSearchedExplicitly] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeWindowIndex, setActiveWindowIndex] = useState(0);

  // Auto-search on mount (Default State)
  useEffect(() => {
    if (!hasSearchedExplicitly && suggestions.length === 0) {
      handleSearch(true); // isAuto = true
    }
  }, []);

  const generatePricingData = (dest) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, idx) => {
      let price = 50;
      if (dest.peakMonths.includes(idx)) price = 100;
      else if (dest.shoulderMonths.includes(idx)) price = 75;
      else price = 40;
      price = price + (Math.random() * 10 - 5);
      return { month: m, price: Math.round(price) };
    });
  };

  const handleSearch = async (isAuto = false) => {
    setLoading(true);
    if (!isAuto) setHasSearchedExplicitly(true);
    setSuggestions([]);
    setSelectedTrip(null);

    try {
      let currentOrigin = originCoords;
      if (!isAuto) {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(origin)}&count=1&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          currentOrigin = { lat: geoData.results[0].latitude, lon: geoData.results[0].longitude };
          setOriginCoords(currentOrigin);
        }
      }

      let windows = [];
      if (mode === 'optimize' || isAuto) {
        windows = findOptimalWindows({ targetLeaves: isAuto ? 5 : targetLeaves, targetDuration: null, targetMonth: 'all', bookedDates: bookedDates.map(d=>d.date) }).slice(0, 15); // Check top 15 windows
      } else if (mode === 'plan') {
        const plan = leavePlans.find(p => p.id === selectedPlanId);
        if (plan) {
           const s = new Date(plan.start_date); const e = new Date(plan.end_date);
           windows = [{ startDate: s, endDate: e, totalDaysOff: Math.round((e-s)/86400000)+1 }];
        }
      } else if (mode === 'custom' && customStart && customEnd) {
         const s = new Date(customStart); const e = new Date(customEnd);
         windows = [{ startDate: s, endDate: e, totalDaysOff: Math.round((e-s)/86400000)+1 }];
      }

      if (windows.length === 0) {
        if (!isAuto) alert("No valid dates found for this criteria.");
        setLoading(false);
        return;
      }

      // Group by destination to support Date Cycling
      const destMap = new Map();

      for (const w of windows) {
        const startMonth = w.startDate.getMonth();
        destinations
          .filter(d => destType === 'all' || d.type === destType)
          .forEach(d => {
            const distance = calculateDistance(currentOrigin.lat, currentOrigin.lon, d.coordinates.lat, d.coordinates.lon);
            const travelCategory = categorizeDistance(distance);
            
            let seasonMatch = 'Peak (Expensive)';
            let score = 0;
            if (d.offSeasonMonths.includes(startMonth)) { seasonMatch = 'Off-Season (Cheap)'; score += 10; }
            else if (d.shoulderMonths.includes(startMonth)) { seasonMatch = 'Shoulder Season (Good Value)'; score += 5; }

            const visa = d.visaRules[passport] || 'visa-required';
            if (visa === 'visa-free' || visa === 'domestic') score += 5;

            // Give a baseline score so trips always show
            score += 5;

            // Penalize long haul for short trips
            if (travelCategory === 'Long Haul Flight' && w.totalDaysOff < 7) score -= 15;

            if (score > -10) { // Relaxed threshold
               const windowData = { window: w, seasonMatch, score, travelCategory };
               if (!destMap.has(d.id)) {
                 destMap.set(d.id, { ...d, distance, visa, allWindows: [windowData] });
               } else {
                 destMap.get(d.id).allWindows.push(windowData);
               }
            }
          });
      }

      // Sort destinations by their best window score
      let bestDests = Array.from(destMap.values()).map(d => {
         d.allWindows.sort((a, b) => b.score - a.score); // sort windows internally
         return { ...d, bestScore: d.allWindows[0].score };
      }).sort((a, b) => b.bestScore - a.bestScore);

      if (isAuto) {
         // Auto load exactly 3 highly varied
         bestDests = bestDests.slice(0, 3);
      } else {
         bestDests = bestDests.slice(0, 10); // max 10 cards
      }

      const enriched = await Promise.all(bestDests.map(async (s) => {
        try {
          const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(s.name)}`);
          const wikiData = await wikiRes.json();
          return {
            ...s,
            description: wikiData.extract,
            image: wikiData.originalimage?.source || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop',
            pricingData: generatePricingData(s)
          };
        } catch(e) {
          return { ...s, description: 'A beautiful destination.', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop', pricingData: generatePricingData(s) };
        }
      }));

      if (isAuto) enriched.sort(() => Math.random() - 0.5);
      setSuggestions(enriched);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrip = async (trip) => {
    setActiveWindowIndex(0); // reset to best window
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${trip.coordinates.lat}&longitude=${trip.coordinates.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
    const weatherData = await weatherRes.json();
    setSelectedTrip({ ...trip, weather: weatherData.daily });
  };

  const handleApplyTrip = () => {
    if (!selectedTrip || !onPreviewRange) return;
    const currentWindow = selectedTrip.allWindows[activeWindowIndex].window;
    const range = [];
    for (let d = new Date(currentWindow.startDate); d <= currentWindow.endDate; d.setDate(d.getDate() + 1)) {
      range.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    onPreviewRange(range);
  };

  const getWeatherIcon = (code) => {
    if (code <= 3) return <Sun className="text-yellow-500" size={28} />;
    if (code <= 48) return <Cloud className="text-slate-400" size={28} />;
    return <CloudRain className="text-blue-500" size={28} />;
  };



  const currentActiveWindowData = selectedTrip ? selectedTrip.allWindows[activeWindowIndex] : null;

  return (
    <div className="flex flex-col min-h-full bg-background">
      {!selectedTrip && (
        <div className={`flex flex-col items-center px-6 transition-all duration-700 ${hasSearchedExplicitly ? 'pt-4 pb-2' : 'pt-16 pb-8'}`}>
          {!hasSearchedExplicitly && (
            <div className="flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4">
              <Sparkles className="text-blue-500 animate-pulse" size={32} />
              <h1 className="text-4xl font-black text-foreground tracking-tight">Where should we go next?</h1>
            </div>
          )}
          
          {/* Chatbot style Context Bar */}
          <div className={`bg-card rounded-2xl shadow-apple-lg border border-border p-3 max-w-5xl w-full flex flex-wrap lg:flex-nowrap gap-3 items-end transition-all duration-500 ease-out z-20 ${hasSearchedExplicitly ? 'shadow-sm sticky top-0' : 'hover:shadow-apple-xl'}`}>
            <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[120px]">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Origin</label>
              <div className="flex items-center bg-muted rounded-xl px-3 py-2 border border-border focus-within:border-foreground/50 focus-within:bg-card transition-colors">
                <MapPin size={16} className="text-muted-foreground mr-2" />
                <input value={origin} onChange={e=>setOrigin(e.target.value)} className="bg-transparent outline-none text-sm font-bold text-foreground w-full" />
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Passport</label>
              <select value={passport} onChange={e=>setPassport(e.target.value)} className="bg-muted rounded-xl px-3 py-2 border border-border text-sm font-bold text-foreground outline-none focus:border-foreground/50">
                <option value="IN">Indian (IN)</option>
                <option value="US">American (US)</option>
                <option value="EU">European (EU)</option>
              </select>
            </div>

            <div className="w-px h-10 bg-border mx-1 hidden lg:block"></div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Type</label>
              <select value={destType} onChange={e=>setDestType(e.target.value)} className="bg-muted rounded-xl px-3 py-2 border border-border text-sm font-bold text-foreground outline-none focus:border-foreground/50">
                <option value="all">Anywhere</option>
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Mode</label>
              <select value={mode} onChange={e=>setMode(e.target.value)} className="bg-muted rounded-xl px-3 py-2 border border-border text-sm font-bold text-foreground outline-none focus:border-foreground/50">
                <option value="optimize">Optimize Balance</option>
                <option value="plan">Existing Plan</option>
                <option value="custom">Custom Dates</option>
              </select>
            </div>

            {mode === 'optimize' ? (
              <div className="flex flex-col gap-1 w-full sm:w-24">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Leaves</label>
                <input type="number" min="1" max="30" value={targetLeaves} onChange={e=>setTargetLeaves(Number(e.target.value))} className="bg-muted rounded-xl px-3 py-2 border border-border text-sm font-bold text-foreground outline-none focus:border-foreground/50 w-full" />
              </div>
            ) : mode === 'plan' ? (
              <div className="flex flex-col gap-1 w-full sm:w-40">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Select Plan</label>
                <select value={selectedPlanId} onChange={e=>setSelectedPlanId(e.target.value)} className="bg-muted rounded-xl px-3 py-2 border border-border text-sm font-bold text-foreground outline-none focus:border-foreground/50 w-full">
                  <option value="">Select...</option>
                  {leavePlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Start</label>
                  <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="bg-muted rounded-xl px-3 py-2 border border-border text-sm font-bold text-foreground outline-none focus:border-foreground/50 w-full" />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">End</label>
                  <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="bg-muted rounded-xl px-3 py-2 border border-border text-sm font-bold text-foreground outline-none focus:border-foreground/50 w-full" />
                </div>
              </div>
            )}

            <div className="flex items-end h-full w-full sm:w-auto">
              <button onClick={() => handleSearch(false)} disabled={loading} className="bg-primary text-primary-foreground p-3 rounded-xl hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 w-full sm:w-auto flex justify-center">
                <Search size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pb-20">
        {loading && !selectedTrip && (
          <div className="flex flex-col items-center justify-center mt-20 text-muted-foreground">
             <Globe2 size={48} className="animate-spin mb-4 opacity-50" />
             <p className="font-medium animate-pulse">Calculating optimal routes and seasons...</p>
          </div>
        )}

        {!selectedTrip && suggestions.length > 0 && !loading && (
          <div className="mt-2">
            {!hasSearchedExplicitly && (
               <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 px-2 flex items-center gap-2 animate-in fade-in">
                 <Sparkles size={16} className="text-amber-500" /> Recommended for your Balance
               </h3>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${hasSearchedExplicitly ? 'lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'lg:grid-cols-3 gap-6'} animate-in fade-in slide-in-from-bottom-8 duration-700`}>
              {suggestions.map((s, i) => {
                const bestW = s.allWindows[0]; // Card shows the best window by default
                return (
                  <div key={i} onClick={() => handleSelectTrip(s)} className={`bg-card rounded-2xl border border-border overflow-hidden shadow-apple-sm hover:shadow-apple-lg transition-all cursor-pointer group flex flex-col ${hasSearchedExplicitly ? 'h-auto min-h-[260px] md:h-[260px]' : 'h-auto min-h-[320px] md:h-[320px]'}`}>
                    <div className={`${hasSearchedExplicitly ? 'h-32' : 'h-48'} relative overflow-hidden bg-muted flex-shrink-0`}>
                      <img src={s.image} alt={s.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      <div className="absolute top-3 right-3">
                         <span className="bg-background/20 backdrop-blur-md text-white text-[10px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-white/30 shadow-sm">
                          {bestW.window.totalDaysOff} Days Off
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className={`text-white font-black leading-tight drop-shadow-md ${hasSearchedExplicitly ? 'text-lg' : 'text-2xl'}`}>{s.name}</h3>
                      </div>
                    </div>
                    <div className="p-3 md:p-4 flex flex-col gap-2 flex-1 bg-card relative z-10">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="bg-emerald-50/50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-100">{bestW.seasonMatch}</span>
                        <span className="bg-blue-50/50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-blue-100">{bestW.travelCategory}</span>
                      </div>
                      <div className="mt-auto flex items-center gap-2 text-muted-foreground">
                        <CalendarDays size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-wider">{new Date(bestW.window.startDate).toLocaleDateString('en-US', {month:'short', day:'numeric'})} - {new Date(bestW.window.endDate).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedTrip && currentActiveWindowData && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 w-full flex flex-col gap-6 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 rounded-2xl border border-border shadow-apple-sm sticky top-4 z-30 gap-4 sm:gap-0">
              <button onClick={() => setSelectedTrip(null)} className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                <ArrowRight size={16} className="rotate-180" /> Back
              </button>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-2">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border border-emerald-100">{currentActiveWindowData.seasonMatch}</span>
                  <span className="bg-muted text-foreground text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border border-border">Visa: {selectedTrip.visa}</span>
                </div>
                <button onClick={handleApplyTrip} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                  <CalendarDays size={16} /> Apply {currentActiveWindowData.window.totalDaysOff} Days to Calendar
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-card rounded-3xl border border-border p-2 shadow-apple-sm relative z-20">
              <button 
                disabled={activeWindowIndex === 0} 
                onClick={() => setActiveWindowIndex(p=>p-1)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-foreground hover:bg-muted rounded-2xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">Prev Window</span>
              </button>
              <div className="text-center flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Option {activeWindowIndex + 1} of {selectedTrip.allWindows.length}</span>
                <span className="text-sm font-black text-foreground">{new Date(currentActiveWindowData.window.startDate).toLocaleDateString('en-US', {month:'short', day:'numeric'})} - {new Date(currentActiveWindowData.window.endDate).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>
              </div>
              <button 
                disabled={activeWindowIndex === selectedTrip.allWindows.length - 1} 
                onClick={() => setActiveWindowIndex(p=>p+1)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-foreground hover:bg-muted rounded-2xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <span className="hidden sm:inline">Next Window</span> <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <MonthlyCalendar startDate={currentActiveWindowData.window.startDate} endDate={currentActiveWindowData.window.endDate} holidays={holidays} bookedDates={bookedDates} calendarStyle={calendarStyle} />
               
               <div className="bg-card rounded-3xl border border-border shadow-apple-sm overflow-hidden relative p-4 h-full min-h-[300px]">
                  {selectedTrip.type === 'international' ? (
                    <Globe lat={selectedTrip.coordinates.lat} lon={selectedTrip.coordinates.lon} />
                  ) : (
                    <MapContainer center={[selectedTrip.coordinates.lat, selectedTrip.coordinates.lon]} zoom={4} style={{ height: '100%', width: '100%', borderRadius: '1.25rem', zIndex: 10 }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      <Marker position={[originCoords.lat, originCoords.lon]} />
                      <Marker position={[selectedTrip.coordinates.lat, selectedTrip.coordinates.lon]} />
                      <Polyline positions={[[originCoords.lat, originCoords.lon], [selectedTrip.coordinates.lat, selectedTrip.coordinates.lon]]} color="#3b82f6" dashArray="5, 10" weight={3} />
                    </MapContainer>
                  )}
                  <div className="absolute top-6 left-6 z-20 bg-card/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Distance</span>
                    <span className="text-lg font-black text-foreground flex items-center gap-2"><MapIcon size={16} className="text-blue-500"/> {Math.round(selectedTrip.distance)} km</span>
                  </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-card rounded-3xl overflow-hidden shadow-apple-sm border border-border relative group h-[250px] md:h-[400px]">
                  <img src={selectedTrip.image} alt={selectedTrip.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                  <div className="absolute inset-0 z-10 p-10 flex flex-col justify-end">
                    <h1 className="text-5xl font-black text-white mb-4 tracking-tight drop-shadow-lg">{selectedTrip.name}, {selectedTrip.country}</h1>
                    <p className="text-white/90 text-sm max-w-2xl font-medium leading-relaxed">
                      {selectedTrip.description}
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-3xl border border-border p-8 shadow-apple-sm">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-500" /> Seasonal Pricing Trend
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedTrip.pricingData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                        <YAxis hide domain={['dataMin - 10', 'dataMax + 20']} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [`Relative Cost Index: ${value}`, 'Pricing']}
                          labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px' }}
                        />
                        <ReferenceLine x={selectedTrip.pricingData[currentActiveWindowData.window.startDate.getMonth()].month} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: 'YOUR TRIP', fill: '#10b981', fontSize: 10, fontWeight: '900' }} />
                        <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorPrice)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 flex flex-col gap-6">
                
                <div className="bg-card rounded-3xl border border-border p-8 shadow-apple-sm flex flex-col justify-center items-center text-center">
                   <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 w-full text-left">Expected Climate</h3>
                   <div className="bg-muted p-6 rounded-2xl border border-border w-full flex flex-col items-center">
                     {selectedTrip.weather && getWeatherIcon(selectedTrip.weather.weathercode[0])}
                     <div className="text-5xl font-black text-foreground mt-3 tracking-tighter">
                       {selectedTrip.weather ? Math.round(selectedTrip.weather.temperature_2m_max[0]) : '--'}°<span className="text-muted-foreground font-bold text-3xl">C</span>
                     </div>
                     <p className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-widest">Average High</p>
                   </div>
                </div>

                <div className="flex gap-4">
                  <a 
                    href={`https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(selectedTrip.name)}%20from%20${encodeURIComponent(origin)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 bg-foreground text-background hover:bg-primary transition-colors rounded-2xl p-5 flex flex-col items-center justify-center gap-3 group shadow-md"
                  >
                    <Plane size={24} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Find Flights</span>
                  </a>
                  <a 
                    href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(selectedTrip.name)}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 bg-foreground text-background hover:bg-primary transition-colors rounded-2xl p-5 flex flex-col items-center justify-center gap-3 group shadow-md"
                  >
                    <BedDouble size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Find Hotels</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPlanner;
