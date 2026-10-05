// Tutorial Service - Interactive 7-Step Sandboxed Walkthrough

const TUTORIAL_COMPLETED_KEY = 'leave_planner_tutorial_completed_v1';

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const getTutorialMonthIndex = () => {
  if (typeof window === 'undefined') return 9;
  return new Date().getMonth();
};

export const getTutorialSteps = (monthIndex = undefined, year = 2026) => {
  const mIndex = (typeof monthIndex === 'number' && monthIndex >= 0 && monthIndex <= 11) 
    ? monthIndex 
    : getTutorialMonthIndex();
  const monthName = MONTH_NAMES[mIndex];
  const shortMonth = SHORT_MONTH_NAMES[mIndex];
  const mStr = String(mIndex + 1).padStart(2, '0');
  
  const startDay = 10;
  const endDay = 15;
  const startDateStr = `${year}-${mStr}-${String(startDay).padStart(2, '0')}`;
  const endDateStr = `${year}-${mStr}-${String(endDay).padStart(2, '0')}`;

  return [
    {
      id: 1,
      title: `1. Click ${monthName} to Open Focused View`,
      targetSelector: `#month-card-${mIndex}`,
      description: `Click the ${monthName} month card on the Yearly Grid to open Focused View.`,
      executeAction: "prompt-open-month",
      monthIndex: mIndex,
      startDate: startDateStr,
      endDate: endDateStr,
      monthName,
      shortMonth
    },
    {
      id: 2,
      title: `2. Select Start Date (${shortMonth} ${startDay})`,
      targetSelector: `#date-cell-${year}-${mIndex}-${startDay}`,
      description: `Click ${shortMonth} ${startDay} on the calendar to set your leave start date.`,
      executeAction: "select-start-date",
      monthIndex: mIndex,
      startDate: startDateStr,
      endDate: endDateStr,
      monthName,
      shortMonth
    },
    {
      id: 3,
      title: `3. Extend to End Date (${shortMonth} ${endDay})`,
      targetSelector: `#date-cell-${year}-${mIndex}-${endDay}`,
      description: `Click ${shortMonth} ${endDay} on the calendar to extend your leave to a 6-day range across the weekend.`,
      executeAction: "select-end-range",
      monthIndex: mIndex,
      startDate: startDateStr,
      endDate: endDateStr,
      monthName,
      shortMonth
    },
    {
      id: 4,
      title: "4. Click 'Confirm Plan' on Selection Bar",
      targetSelector: "#tutorial-step-confirm-plan-btn, #tutorial-step-confirm-plan-btn-mobile",
      description: "Click 'Confirm Plan' on the selection bar to open the leave details modal.",
      executeAction: "prompt-confirm-plan",
      monthIndex: mIndex,
      startDate: startDateStr,
      endDate: endDateStr,
      monthName,
      shortMonth
    },
    {
      id: 5,
      title: "5. Select Leave Category (PL)",
      targetSelector: "#tutorial-step-category-pl, #tutorial-step-category-pl-mobile",
      description: "Click Planned Leave (PL) to pick your category. (Optional: Type a custom plan name above).",
      executeAction: "select-modal-category",
      monthIndex: mIndex,
      startDate: startDateStr,
      endDate: endDateStr,
      monthName,
      shortMonth
    },
    {
      id: 6,
      title: "6. Click 'Confirm & Apply' inside Modal",
      targetSelector: "#tutorial-step-modal-apply-btn, #tutorial-step-modal-apply-btn-mobile",
      description: "Click 'Confirm & Apply' to log your sandboxed demo leave!",
      executeAction: "apply-modal-leave",
      monthIndex: mIndex,
      startDate: startDateStr,
      endDate: endDateStr,
      monthName,
      shortMonth
    },
    {
      id: 7,
      title: "7. Review Created Plan in Leave Tracker",
      targetSelector: "#tutorial-demo-plan-card, #tutorial-step-leave-plans > div:first-child",
      description: `Your demo 6-day ${shortMonth} leave plan is logged! Track total leaves used, weekends gained, and holiday overlaps here.`,
      executeAction: "review-created-plan",
      monthIndex: mIndex,
      startDate: startDateStr,
      endDate: endDateStr,
      monthName,
      shortMonth
    }
  ];
};

export const TUTORIAL_STEPS = getTutorialSteps();


export const isTutorialCompleted = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true';
};

export const markTutorialCompleted = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
};

export const resetTutorialStatus = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
};
