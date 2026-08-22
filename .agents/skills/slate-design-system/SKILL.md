---
name: slate-design-system
description: Design system guidelines, typography tokens, color palettes, Framer Motion animation curves, and responsive shell layouts for the Slate Design System (v0.8.0). Activate whenever building, styling, or refactoring web and mobile UI components with the Slate aesthetic.
---

# Slate Design System (v0.8.0)

This skill provides comprehensive design tokens, Framer Motion animation parameters, and component architecture patterns for creating modern, function-driven applications using the **Slate Design System**.

---

## 1. Visual Philosophy & Core Tenets

1. **Function-First Density**: High information density without clutter; clean layout structures where typography and data lead.
2. **Technical & Monospaced Polish**: Monospaced fonts for numerals, dates, metrics, chips, and quotas paired with modern geometric sans-serif for UI labels and body text.
3. **Non-Warping Morphing Surfaces**: Multi-state containers (such as floating mobile docks, bottom sheets, and settings views) morph seamlessly using `layout="size"` with internal crossfades to prevent layout projection stretching.
4. **Surface Depth**: Multi-layer drop shadows (`shadow-apple-sm`, `shadow-2xl`), frosted glass backdrops (`backdrop-blur-2xl bg-card/95`), and crisp 1px translucent borders (`border-border/80`).
5. **Tactile Micro-Interactions**: Active press scales (`active:scale-[0.98]`), spring-based active indicator pills, and sequential cascading animations.

---

## 2. Typography Hierarchy

### Font Stack
- **Primary Sans-Serif**: `Geist Sans`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `sans-serif`
- **Secondary Monospace**: `Geist Mono`, `ui-monospace`, `SFMono-Regular`, `monospace`

```css
body {
  font-family: 'Geist Sans', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.font-mono {
  font-family: 'Geist Mono', ui-monospace, monospace;
}
```

### Scale & Hierarchy Rules
- **Hero Display Metric**: `text-3xl md:text-4xl font-black font-mono tracking-tight`
- **Panel & Modal Header**: `text-sm font-black font-mono uppercase tracking-wider`
- **Interactive Labels**: `text-xs font-bold`
- **Eyebrows / Micro-Badges**: `text-[9px] md:text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground`
- **Body & Subtext**: `text-xs md:text-sm font-medium text-muted-foreground leading-relaxed`

---

## 3. Color Token System (HSL)

All visual surfaces use CSS Custom Properties mapped to Tailwind semantic utilities:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --radius: 20px;
}

.dark {
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
- **Primary / Info / Planned**: `Blue` (`#3B82F6` / `bg-blue-500/10 text-blue-500 border-blue-500/20`)
- **Warning / Alert / Emergency**: `Amber` (`#F59E0B` / `bg-amber-500/10 text-amber-500 border-amber-500/20`)
- **Success / Positive / Extra**: `Emerald` (`#10B981` / `bg-emerald-500/10 text-emerald-500 border-emerald-500/20`)
- **Secondary / Remote / WFH**: `Cyan` (`#06B6D4` / `bg-cyan-500/10 text-cyan-500 border-cyan-500/20`)
- **Destructive / Danger**: `Red` (`#EF4444` / `bg-red-500/10 text-red-500 border-red-500/20`)

---

## 4. Radii & Surface Standards

```css
--radius-dock:   28px; /* Mobile floating dock & bottom sheets */
--radius-modal:  28px; /* Dialogs & modals */
--radius-card:   16px; /* Cards, panels & widgets */
--radius-input:  12px; /* Buttons, inputs, tumbler pickers */
--radius-pill:   9999px; /* Status tags, chips, segmented tabs */
```

---

## 5. Animation & Motion Design (Framer Motion)

### A. Size-Morphing Subviews (No Component Warping)
```jsx
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

### B. Cascading Push-In Stacks
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
```

### C. Modal Dialog Transition
```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.96, y: 10 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.96, y: 10 }}
  transition={{ type: "spring", stiffness: 350, damping: 28 }}
  className="bg-card border border-border rounded-[28px] p-6 shadow-2xl z-50"
/>
```

### D. Skeleton Shimmer Loading
```css
.skeleton-shimmer {
  background: linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.4) 50%, hsl(var(--muted)) 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite ease-in-out;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 6. Layout Shell Guidelines

1. **Desktop**:
   - Header with brand avatar, profile badge, and theme switcher.
   - Split-view main canvas (primary workspace on left, contextual side-stack on right).
   - Side panel: static summary/actions on top; cascading animated stack on bottom.
2. **Mobile**:
   - Floating Bottom Dock (`rounded-[28px] max-w-sm`) grounded at bottom of screen.
   - Morphing states: `nav` $\leftrightarrow$ `selection` $\leftrightarrow$ `confirm` $\leftrightarrow$ `menu` $\leftrightarrow$ `detail`.
