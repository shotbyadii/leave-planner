export const COLOR_PALETTE = [
  { id: 'blue', name: 'Blue', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', hex: '#3b82f6' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', hex: '#f97316' },
  { id: 'green', name: 'Green', bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500', badge: 'bg-green-500/10 text-green-400 border-green-500/20', hex: '#22c55e' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', hex: '#a855f7' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20', hex: '#ec4899' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', hex: '#06b6d4' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', hex: '#f59e0b' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', hex: '#6366f1' }
];

export const getLeaveColor = (colorId = 'blue') => {
  return COLOR_PALETTE.find(c => c.id === colorId) || COLOR_PALETTE[0];
};

export const getLeaveTheme = (colorId = 'blue') => {
  const c = COLOR_PALETTE.find(p => p.id === colorId) || COLOR_PALETTE[0];
  return {
    ...c,
    activeBoxBorder: c.border,
    activeBoxBg: `${c.bg}/10`,
    activeText: c.text,
    activeBadge: c.badge,
    activeHex: c.hex
  };
};

export const getShortform = (name, fallbackCode = '') => {
  if (!name || typeof name !== 'string') return fallbackCode.toUpperCase();
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallbackCode.toUpperCase();
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  return words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
};

