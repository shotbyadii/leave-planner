export const publicHolidays = [
  { date: '2026-01-01', name: 'New Year', type: 'public' },
  { date: '2026-01-14', name: 'Makara Sankranti', type: 'public' },
  { date: '2026-01-26', name: 'Republic Day', type: 'public' },
  { date: '2026-03-19', name: 'Chandramana Ugadi/Gudipadwa', type: 'public' },
  { date: '2026-05-01', name: 'May Day', type: 'public' },
  { date: '2026-05-28', name: 'Bakrid', type: 'public' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', type: 'public' },
  { date: '2026-10-02', name: 'Gandhi Jayanthi', type: 'public' },
  { date: '2026-10-19', name: 'Ayudha Pooja/Mahanavami', type: 'public' },
  { date: '2026-11-09', name: 'Deepavali/ Diwali Padwa/Vikram', type: 'public' },
  { date: '2026-12-25', name: 'Christmas', type: 'public' }
];

export const isHoliday = (dateString) => {
  return publicHolidays.find(h => h.date === dateString);
};

export const isWeekend = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};
