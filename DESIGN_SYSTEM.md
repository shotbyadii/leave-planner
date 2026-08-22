# Slate Design System (v0.8.0)
> *A precision-engineered, function-driven design language and motion framework for modern web and mobile applications.*

---

## 1. Design Philosophy
- **Function-First Precision**: Clean, distraction-free surfaces where information density and typography lead the user experience.
- **Monospaced Technical Polish**: Monospaced font accents for dates, quotas, counters, and technical badges combined with geometric sans-serif for UI legibility.
- **Fluid Morphing Surfaces**: Multi-state containers (such as floating mobile docks and settings views) morph smoothly in place without jarring layout shifts or component distortion.
- **Depth & Subtlety**: Multi-layered shadows, 1px translucent borders (`border-border/80`), and frosted glass backdrops (`backdrop-blur-2xl bg-card/95`).
- **Tactile Feedback**: Micro-scale interactions on touch (`active:scale-[0.98]`), spring-based active indicator pills, and smooth staggered cascades.

---

## 2. Typography Hierarchy

### Font Families
- **Primary Sans-Serif**: `Geist Sans`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `sans-serif`
- **Secondary Monospace**: `Geist Mono`, `ui-monospace`, `SFMono-Regular`, `monospace`

```css
/* Font Setup */
body {
  font-family: 'Geist Sans', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.font-mono {
  font-family: 'Geist Mono', ui-monospace, monospace;
}
```

### Scale & Hierarchy Rules
| Role | Typography Classes | Usage |
| :--- | :--- | :--- |
| **Hero Display** | `text-3xl md:text-4xl font-black font-mono tracking-tight` | Key metric values, hero headers |
| **Section Header** | `text-sm font-black font-mono uppercase tracking-wider` | Modal titles, card headers, sidebar titles |
| **Interactive Labels**| `text-xs font-bold` | Button text, form labels, tab headers |
| **Eyebrows / Badges**| `text-[9px] md:text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground` | Category indicators, micro-labels, status tags |
| **Body & Explanations**| `text-xs md:text-sm font-medium text-muted-foreground leading-relaxed` | Descriptions, helper text |

---

## 3. Color Token System (HSL)

All visual surfaces use CSS Custom Properties mapped to Tailwind semantic utilities:

```css
:root {
  /* Canvas & Text */
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  
  /* Surfaces & Cards */
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  
  /* Functional Elements */
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  
  /* Primary Action */
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  
  /* Destructive */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;

  /* Radii */
  --radius: 20px;
}

.dark {
  /* Dark Mode Surfaces */
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  
  --card: 240 10% 5.5%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 5.5%;
  --popover-foreground: 0 0% 98%;
  
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --border: 240 3.7% 17%;
  --input: 240 3.7% 17%;
  
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
}
```

### Semantic Accent Palettes
* **Planned / Primary Info**: `Blue` (`#3B82F6` / `bg-blue-500/10 text-blue-500 border-blue-500/20`)
* **Emergency / Warning**: `Orange / Amber` (`#F59E0B` / `bg-amber-500/10 text-amber-500 border-amber-500/20`)
* **Extra / Success**: `Emerald / Green` (`#10B981` / `bg-emerald-500/10 text-emerald-500 border-emerald-500/20`)
* **Remote / Secondary Info**: `Cyan` (`#06B6D4` / `bg-cyan-500/10 text-cyan-500 border-cyan-500/20`)
* **Danger / Destructive**: `Red` (`#EF4444` / `bg-red-500/10 text-red-500 border-red-500/20`)

---

## 4. Elevation, Radii & Border Standards

```css
/* Corner Radii */
--radius-dock:   28px; /* Mobile floating navigation & full sheets */
--radius-modal:  28px; /* Dialogs, dev suite & confirmation modals */
--radius-card:   16px; /* Content panels, calendar months, optimizer cards */
--radius-input:  12px; /* Buttons, text fields, tumbler pickers */
--radius-pill:   9999px; /* Status tags, count chips, segmented controllers */
```

### Shadows & Borders
* **Cards & Panels**: `border border-border/80 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
* **Floating Docks**: `shadow-[0_12px_40px_-5px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95)]`
* **Dialog Modals**: `shadow-2xl border border-border/90`

---

## 5. Animation & Motion Design (Framer Motion)

### A. Size-Morphing Subviews (No Component Stretching)
Used whenever a container changes size between subviews (e.g. mobile dock states, tab switches, submenus):

```jsx
// Outer Resizing Shell
<motion.div
  layout="size"
  transition={{ layout: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } }}
  className="w-full overflow-hidden"
>
  <AnimatePresence mode="wait">
    <motion.div
      key={activeViewKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
    >
      {/* View Content */}
    </motion.div>
  </AnimatePresence>
</motion.div>
```

### B. Cascading Push-In Stacks (Desktop Mini-Calendar / List Items)
Items cascade in sequentially from the bottom with a gentle, non-jarring spring:

```jsx
const stackItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 240,
      damping: 24,
      mass: 0.7,
      delay: index * 0.05
    }
  })
};

// Usage
{items.map((item, index) => (
  <motion.div
    key={item.id}
    custom={index}
    initial="hidden"
    animate="visible"
    variants={stackItemVariants}
  >
    {/* Item content */}
  </motion.div>
))}
```

### C. Modal & Overlay Transitions
```jsx
// Backdrop Overlay
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15 }}
  className="fixed inset-0 bg-foreground/20 dark:bg-black/60 backdrop-blur-sm z-50"
/>

// Modal Window
<motion.div
  initial={{ opacity: 0, scale: 0.96, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.96, y: 10 }}
  transition={{ type: "spring", stiffness: 350, damping: 28 }}
  className="bg-card border border-border rounded-[28px] p-6 shadow-2xl z-50"
/>
```

### D. Active Segmented Pill Indicator
```jsx
<button className="relative px-3 py-1.5 rounded-xl font-mono text-xs font-bold">
  {isActive && (
    <motion.div
      layoutId="active-tab-indicator"
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className="absolute inset-0 bg-background shadow-apple-sm rounded-xl border border-border/60 -z-10"
    />
  )}
  {tab.label}
</button>
```

### E. Shimmer Skeleton Loading
```css
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted) / 0.4) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite ease-in-out;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 6. Layout & Shell Architecture

### 1. Desktop Experience
- **Header**: Fixed top navbar containing company brand avatar, user badge, and quick theme switcher.
- **Main Workspace**: Split-view with left primary workspace (Yearly grid / Focused month) and right contextual panel.
- **Side Panel Architecture**: Static suggestion/action cards on top; sequentially animated mini-month cards on bottom.

### 2. Mobile Experience
- **Floating Bottom Dock**: Grounded at `bottom-6 left-0 right-0 z-50` with `max-w-sm` pill geometry.
- **Dock States**:
  1. `nav`: Standard 4-icon floating pill with dual usage indicator line.
  2. `selection`: High-contrast dark date confirmation bar with action buttons.
  3. `confirm`: Expandable leave plan submission bottom sheet.
  4. `menu`: Multi-tab drawer (My Profile, App Settings with Quotas, Public Holidays, Backups).
  5. `viewing-leave`: Detail and conversion action bottom sheet.

---

## 7. AI Prompting Playbook (Using Slate in Other Projects)

To apply this design system to any new project using an AI coding assistant, use the prompt templates below:

### Base New Project Prompt
```text
Please build a [Your App Name / Idea] web application using the Slate Design System v0.8.0.
Key Requirements:
1. Typography: Use Geist Sans for body text and Geist Mono for badges, codes, dates, and metrics.
2. Color Palette: Use the HSL CSS custom property tokens from Slate Design System with light and dark mode support.
3. Component Shell: Implement the desktop split-view layout and the mobile floating morph dock with 'layout="size"' and crossfades.
4. Motion: Adhere strictly to the spring parameters (stiffness 240, damping 24 for lists; stiffness 350, damping 28 for modals).
```

### Quick Style Customization Prompts

* **Change Accent Color**:
  > *"Use the Slate Design System v0.8, but shift the primary accent color from Slate to Electric Indigo (`#6366F1`) and use an emerald accent for success states."*

* **Change Density / Radii**:
  > *"Use the Slate Design System, but adopt a sharper, compact enterprise look with card radius at 8px instead of 16px and floating dock at 14px instead of 28px."*

* **Change Typography**:
  > *"Adopt the Slate motion and layout system, but replace Geist Sans with Inter and Geist Mono with JetBrains Mono."*
