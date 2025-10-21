# 🎨 MindOS Design Bible

**Visual Design System & Principles**

---

## 🎯 Design Philosophy

MindOS is designed to feel like **working with your hands on ideas**, not clicking through software.

### Core Principles

1. **Direct Manipulation** — Drag, drop, connect. No menus, no wizards.
2. **Visual Clarity** — Everything readable, nothing chaotic.
3. **Calm Motion** — Physics that feels alive, not jumpy.
4. **Dark & Focused** — Low-contrast dark mode for deep work.
5. **Geometric Precision** — Grid-aligned, structured, engineered.

---

## 🎨 Color Palette

### Background Layers

```css
--bg-primary:   #0f0f0f  /* Deep canvas */
--bg-secondary: #1a1a1a  /* Surfaces (cards, panels) */
--bg-tertiary:  #242424  /* Raised elements (buttons, inputs) */
```

### Text

```css
--text-primary:   #f5f5f5  /* Primary text */
--text-secondary: #a0a0a0  /* Secondary/muted text */
--text-tertiary:  #6b6b6b  /* Disabled/placeholder */
```

### Borders & Dividers

```css
--border-color: #333  /* Subtle dividers */
--border-focus: #4c6ef5  /* Focused elements */
```

### Accent Colors

```css
--accent:       #4c6ef5  /* Primary actions */
--accent-hover: #5c7cfa  /* Hover state */
--accent-light: rgba(76, 110, 245, 0.1)  /* Subtle backgrounds */
```

### Edge Types (Semantic Colors)

```css
--edge-causes:     #ff6b6b  /* Red: Causality */
--edge-supports:   #51cf66  /* Green: Support/Evidence */
--edge-contrasts:  #ffd43b  /* Yellow: Opposition */
--edge-extends:    #74c0fc  /* Blue: Inheritance */
--edge-part-of:    #b197fc  /* Purple: Composition */
--edge-links:      #868e96  /* Gray: Generic link */
--edge-depends:    #ff922b  /* Orange: Dependency */
--edge-relates:    #adb5bd  /* Light gray: Weak relation */
```

---

## 📐 Spacing System

**4px base grid**

```css
--spacing-xs:  4px
--spacing-sm:  8px
--spacing-md:  16px
--spacing-lg:  24px
--spacing-xl:  32px
--spacing-2xl: 48px
```

### Usage Guidelines

- **4px** — Tight grouping (icon + label)
- **8px** — Related elements (buttons in a toolbar)
- **16px** — Section padding (card content)
- **24px** — Major spacing (between sections)
- **32px** — Page margins
- **48px** — Major layout gaps

---

## 🔤 Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont,
  'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
  'Cantarell', 'Fira Sans', 'Droid Sans',
  'Helvetica Neue', sans-serif;
```

### Font Sizes

```css
--font-xs:   0.75rem  /* 12px - labels, captions */
--font-sm:   0.875rem /* 14px - body small */
--font-base: 1rem     /* 16px - body */
--font-lg:   1.125rem /* 18px - emphasis */
--font-xl:   1.25rem  /* 20px - subheadings */
--font-2xl:  1.5rem   /* 24px - headings */
--font-3xl:  2rem     /* 32px - page titles */
```

### Font Weights

```css
--font-normal:  400
--font-medium:  500
--font-semibold: 600
--font-bold:    700
```

### Line Heights

```css
--line-tight:  1.25  /* Headings */
--line-normal: 1.5   /* Body text */
--line-loose:  1.75  /* Spaced paragraphs */
```

---

## 🔲 Border Radius

```css
--radius-sm: 4px   /* Buttons, inputs */
--radius-md: 8px   /* Cards, panels */
--radius-lg: 12px  /* Modals, large containers */
--radius-full: 999px /* Circular elements */
```

---

## ⏱️ Transitions & Timing

### Durations

```css
--transition-fast:   150ms  /* Hover, focus */
--transition-normal: 250ms  /* State changes */
--transition-slow:   400ms  /* Layout shifts */
```

### Easing Functions

```css
--ease-in:     cubic-bezier(0.4, 0, 1, 1)
--ease-out:    cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### Usage

```css
/* Hover effects */
transition: all var(--transition-fast) var(--ease-out);

/* State changes */
transition: opacity var(--transition-normal) var(--ease-in-out);

/* Entrance animations */
animation: slideIn var(--transition-slow) var(--ease-bounce);
```

---

## 🌊 Physics & Motion

### Constrained Physics

**Goal:** Nodes feel alive, but never chaotic.

```typescript
const PHYSICS_CONSTRAINTS = {
  maxOffset: 32,        // Max distance from ideal position (px)
  returnDuration: 500,  // Return animation duration (ms)

  forces: {
    spring: 0.1,        // Edge spring force
    repulsion: 100,     // Node repulsion force
    frameMagnet: 0.05,  // Frame attraction force
  }
}
```

### Animation Principles

1. **Micro-Interactions**
   - Hover: `transform: scale(1.02)` in 150ms
   - Click: `transform: scale(0.98)` in 100ms
   - Drag: Smooth follow with slight lag (50ms delay)

2. **Node Movement**
   - Dragging: Instant response (no delay)
   - Release: Return to grid in 500ms with ease-out
   - Connecting: Smooth arc animation (250ms)

3. **Graph Reorganization**
   - Layout change: Stagger nodes by 50ms each
   - Total duration: ≤ 1000ms for full graph
   - Easing: ease-in-out

---

## 🎭 Component States

### Button States

```css
/* Default */
background: var(--bg-tertiary);
color: var(--text-primary);

/* Hover */
background: rgba(255, 255, 255, 0.05);

/* Active */
background: var(--accent);
color: white;

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

### Focus States

```css
outline: 2px solid var(--accent);
outline-offset: 2px;
```

### Elevation (Shadow Layers)

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.6);
```

---

## 🖼️ Canvas & Graph Design

### Grid

- **Grid size:** 16px
- **Grid color:** `rgba(255, 255, 255, 0.02)`
- **Major grid:** Every 5th line `rgba(255, 255, 255, 0.04)`

### Nodes

```css
/* Node Card */
background: var(--bg-secondary);
border: 1px solid var(--border-color);
border-radius: var(--radius-md);
padding: var(--spacing-md);
box-shadow: var(--shadow-md);

/* Selected */
border-color: var(--accent);
box-shadow: 0 0 0 2px var(--accent-light);

/* Locked */
opacity: 0.6;
border-style: dashed;
```

### Edges

```typescript
{
  strokeWidth: 2,
  opacity: 0.6,
  // Animated dasharray for active edge
  animation: 'dash 1s linear infinite',
}
```

---

## 🧪 Interaction Patterns

### Drag & Drop

1. **Start Drag**
   - Cursor: `grabbing`
   - Opacity: `0.8`
   - Shadow: Increase by 1 level

2. **During Drag**
   - Smooth follow (no lag)
   - Show snap guides (dotted lines)
   - Highlight drop zones

3. **Drop**
   - Snap animation (150ms)
   - Restore opacity
   - Reduce shadow

### Connection Drawing

1. **Start**
   - Click node → show connector handles
   - Cursor: `crosshair`

2. **Drawing**
   - Live preview line follows cursor
   - Highlight valid targets
   - Show relation type picker

3. **Complete**
   - Snap to target
   - Animate edge appearance (250ms)
   - Show relation label

---

## 🎯 Accessibility

### Focus Indicators

- Always visible (2px outline)
- High contrast (accent color)
- 2px offset for clarity

### Keyboard Navigation

- `Tab` — Navigate elements
- `Space/Enter` — Activate
- `Escape` — Cancel/Close
- `Arrow keys` — Navigate graph
- `Ctrl+Z/Y` — Undo/Redo

### Color Contrast

- Text on background: ≥ 7:1 (AAA)
- Interactive elements: ≥ 4.5:1 (AA)

---

## 🖱️ Cursor States

```css
--cursor-default: default;
--cursor-pointer: pointer;
--cursor-grab:    grab;
--cursor-grabbing: grabbing;
--cursor-crosshair: crosshair;
--cursor-not-allowed: not-allowed;
```

---

## 📱 Responsive Breakpoints

```css
--mobile:  640px
--tablet:  768px
--laptop:  1024px
--desktop: 1280px
--wide:    1536px
```

---

## 🎬 Animation Library

### Fade In

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
animation: fadeIn 250ms ease-out;
```

### Slide In

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Scale Pop

```css
@keyframes scalePop {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
```

### Pulse (for notifications)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## ✨ Special Effects

### Glass Morphism (for overlays)

```css
background: rgba(26, 26, 26, 0.8);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### Glow Effect (for active nodes)

```css
box-shadow:
  0 0 20px rgba(76, 110, 245, 0.3),
  0 4px 6px rgba(0, 0, 0, 0.5);
```

---

## 🧭 Navigation & Toolbars

### Toolbar Height

```css
--toolbar-height: 48px;
```

### Icon Size

```css
--icon-sm: 16px;
--icon-md: 20px;
--icon-lg: 24px;
```

### Button Groups

```css
display: flex;
gap: var(--spacing-xs);
background: var(--bg-tertiary);
padding: var(--spacing-xs);
border-radius: var(--radius-md);
```

---

## 📝 Implementation Checklist

- [ ] Apply color palette to all components
- [ ] Use spacing system consistently (no hardcoded px)
- [ ] Add focus indicators to all interactive elements
- [ ] Implement smooth transitions (150-400ms)
- [ ] Add hover states to all clickable elements
- [ ] Ensure 4.5:1 contrast ratio minimum
- [ ] Add loading states (skeleton screens)
- [ ] Implement error states (red accent)
- [ ] Add success feedback (green accent)
- [ ] Test keyboard navigation

---

**Last Updated:** October 2025
**Version:** 1.0
**Status:** Living Document
