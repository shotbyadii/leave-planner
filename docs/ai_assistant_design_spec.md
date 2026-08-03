# Technical Specification: Voice & Text AI Assistant for Leave Planner

## 📌 Executive Summary
This document outlines the architecture, integration options, and UI flow for a lightweight **Voice & Text AI Assistant** in the Leave Planner application.

The assistant allows users to type or speak natural language requests such as:
> *"I want to take leave from 23rd to 28th September for a vacation to Pondicherry"*

And automatically extracts structured slots to open and pre-fill booking modals.

---

## 🎯 Target Use Cases
1. **Vacation & Multi-Day Trip Staging**: *"Book a 6 day trip to Pondicherry from 23rd to 28th September"*
2. **Quick Leave Requests**: *"Apply PL on next Monday"*
3. **WFH Logging**: *"Mark WFH for tomorrow"*
4. **Quota Queries**: *"How many PL leaves do I have left?"*

---

## 🏗️ Architecture & Engine Options

### Option A: Free Cloud LLM APIs (Recommended: Groq or Gemini 1.5 Flash)
- **Client Bundle Size**: 0 MB (No model downloads on user devices)
- **Payload Size**: ~1 KB via lightweight `fetch()` HTTP POST request
- **Latency**: ~150ms – 250ms

#### Free Tier Comparison Table:
| Provider | Free Quota / Limits | Speed | Features |
| :--- | :--- | :--- | :--- |
| **Groq Cloud API** (`llama-3.1-8b-instant`) | **14,400 Requests/Day** (30 RPM) | ~150ms (500+ tok/s) | Free Dev Tier, JSON Mode |
| **Google Gemini 1.5 Flash** | **1,500 Requests/Day** (15 RPM) | ~200ms | Native Function Calling |
| **Cloudflare Workers AI** | **10,000 Requests/Day** | ~250ms | Edge Serverless API |

---

### Option B: Native Browser Speech + Client NLP Extractor (100% Offline & Free)
- **Speech Recognition**: Browser native `webkitSpeechRecognition` API.
- **NLP Slot Parser**: Enhanced regex slot extraction in `src/utils/nlpParser.js`.
- **Latency**: Instant (~0ms).

---

## 🛠️ API Data Flow & Tool Spec

### System Prompt & JSON Response Schema
```json
{
  "name": "stage_leave_action",
  "parameters": {
    "action": "book_plan | single_leave | wfh_log",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "leaveType": "pl | el | rh | wfh",
    "planName": "String",
    "note": "String"
  }
}
```

### Example Input / Output Mapping
- **Input**: *"Taking 3 days off from 12th Oct for Diwali trip to Jaipur"*
- **Output**:
  ```json
  {
    "action": "book_plan",
    "startDate": "2026-10-12",
    "endDate": "2026-10-14",
    "leaveType": "pl",
    "planName": "Diwali trip to Jaipur",
    "note": "Diwali trip to Jaipur"
  }
  ```

---

## 🎨 UI & Interactive Flow

1. **Floating Mic & Sparkles Assistant Trigger**:
   - Located on the top bar or inside `OptimizerPanel.jsx`.
2. **Voice & Text Input Drawer**:
   - Live speech waveform animation when speaking.
3. **Staged Confirmation Card**:
   - Renders a preview card showing extracted dates, plan title, and leave cost.
   - Buttons: **[ Confirm & Book ]** | **[ Edit Details ]** | **[ Cancel ]**

---

## 📂 Implementation Roadmap
- [ ] Add `VITE_GROQ_API_KEY` or `VITE_GEMINI_API_KEY` to `.env`.
- [ ] Create `src/services/aiAssistantService.js`.
- [ ] Create `src/components/AiAssistantDrawer.jsx` with Web Speech mic trigger.
- [ ] Wire staged JSON responses directly to `createLeavePlan` and `addLeave` in `App.jsx`.
