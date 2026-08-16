// Tutorial Service - Interactive 7-Step Sandboxed Walkthrough

const TUTORIAL_COMPLETED_KEY = 'leave_planner_tutorial_completed_v1';

export const TUTORIAL_STEPS = [
  {
    id: 1,
    title: "1. Click Month Card to Open Focused View",
    targetSelector: "#month-card-8",
    description: "Click the September month card on the Yearly Grid to open Focused View.",
    executeAction: "prompt-open-month"
  },
  {
    id: 2,
    title: "2. Select Start Date (Sept 10)",
    targetSelector: "#date-cell-2026-8-10",
    description: "Click Sept 10 on the calendar to set your leave start date.",
    executeAction: "select-start-date"
  },
  {
    id: 3,
    title: "3. Extend to End Date (Sept 15)",
    targetSelector: "#date-cell-2026-8-15",
    description: "Click Sept 15 on the calendar to extend your leave to a 6-day range across the weekend.",
    executeAction: "select-end-range"
  },
  {
    id: 4,
    title: "4. Click 'Confirm Plan' on Selection Bar",
    targetSelector: "#tutorial-step-confirm-plan-btn",
    description: "Click 'Confirm Plan' on the selection bar to open the leave details modal.",
    executeAction: "prompt-confirm-plan"
  },
  {
    id: 5,
    title: "5. Select Leave Category (PL)",
    targetSelector: "#tutorial-step-category-pl",
    description: "Click Planned Leave (PL) to pick your category. (Optional: Type a custom plan name above).",
    executeAction: "select-modal-category"
  },
  {
    id: 6,
    title: "6. Click 'Confirm & Apply' inside Modal",
    targetSelector: "#tutorial-step-modal-apply-btn",
    description: "Click 'Confirm & Apply' to log your sandboxed demo leave!",
    executeAction: "apply-modal-leave"
  },
  {
    id: 7,
    title: "7. Review Created Plan in Leave Tracker",
    targetSelector: "#tutorial-demo-plan-card",
    description: "Your demo 6-day leave plan is logged! Track total leaves used, weekends gained, and holiday overlaps here.",
    executeAction: "review-created-plan"
  }
];

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
