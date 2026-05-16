import React from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const fmt = (h24) => {
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:00 ${ampm}`;
};

const TimePicker = ({ fromHour, toHour, onChange }) => {
  const diffHours = toHour > fromHour ? toHour - fromHour : 0;
  const isHalfDay = diffHours > 0 && diffHours < 4.5;

  return (
    <div className="rounded-lg border border-border bg-muted p-3 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">From</label>
          <select 
            value={fromHour}
            onChange={(e) => onChange(parseInt(e.target.value), toHour)}
            className="w-full bg-card border border-border rounded-md p-1.5 text-xs font-medium focus:outline-none focus:border-foreground/50 text-foreground"
          >
            {HOURS.map(h => <option key={h} value={h}>{fmt(h)}</option>)}
          </select>
        </div>
        
        <div className="pt-4 text-muted-foreground/50">→</div>

        <div className="flex-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">To</label>
          <select 
            value={toHour}
            onChange={(e) => onChange(fromHour, parseInt(e.target.value))}
            className="w-full bg-card border border-border rounded-md p-1.5 text-xs font-medium focus:outline-none focus:border-foreground/50 text-foreground"
          >
            {HOURS.map(h => <option key={h} value={h} disabled={h <= fromHour}>{fmt(h)}</option>)}
          </select>
        </div>
      </div>

      <div className={`px-3 py-1.5 rounded text-center text-[11px] font-bold transition-colors ${
        diffHours > 0 
          ? (isHalfDay ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
          : 'bg-muted-foreground/20 text-muted-foreground'
      }`}>
        {diffHours > 0 
          ? `${diffHours}h Duration · ${isHalfDay ? 'Half-Day Leave' : 'Full-Day Leave'}`
          : 'Invalid Duration'}
      </div>
    </div>
  );
};

export default TimePicker;
export { TimePicker };
