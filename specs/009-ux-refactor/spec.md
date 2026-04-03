# Spec 009 — SpecForge Application Layer UX Refactor

## Status: Approved  
## Version: 1.0.0  
## Authors: Copilot Task Agent  
## Date: 2026-04-03

---

## 1. Overview

The SpecForge frontend is a React + TypeScript SPA that exposes 8 workflow modules through a single `App.tsx` shell. The current shell has several UX friction points that reduce discoverability, legibility, and usability. This spec defines targeted improvements to the **application layer** (shell, navigation, global styles, and shared UI primitives) without requiring rewrites of the individual module components.

---

## 2. Problem Statement

### 2.1 Navigation Overcrowding
Eight module buttons with long names (e.g., *"Module 4 — Task Forge"*) are packed horizontally into the header next to the logo. On viewports narrower than ~1280 px they wrap onto multiple lines, hiding content and making the active module hard to identify.

### 2.2 Redundant Chrome
Three stacked horizontal bars appear above the content area:
1. **Header bar** — logo + 8 module buttons  
2. **Subtitle bar** — repeats the active module name as a descriptive sentence  
3. **Tab navigation bar** — secondary tabs for views inside the module  

This triple-bar chrome consumes ~90 px of vertical space without adding proportional value.

### 2.3 No Design Tokens
Colors, spacing, and shadows are hard-coded as hex literals in every file. A change to the primary brand colour requires touching 20+ files. There is no support for theming.

### 2.4 No Shared UI Primitives
Every module defines its own `styles.ts` with duplicated button, input, and error-box constants. The resulting 40+ component variants are inconsistent in padding, border-radius, and focus states.

### 2.5 Accessibility Gaps
- Module and tab buttons lack `aria-label`, `aria-selected`, and `role="tab"` attributes.  
- Status is communicated only through colour (no text or icon fallback).  
- No visible keyboard-focus ring on interactive elements.

---

## 3. Goals

| ID | Goal |
|----|------|
| G1 | Replace the header-based module switcher with a collapsible left sidebar, freeing vertical header space and eliminating wrapping. |
| G2 | Consolidate the three chrome bars into two: header + sidebar/tab-bar. |
| G3 | Introduce CSS custom properties (design tokens) for colour, spacing, radius, and shadow. |
| G4 | Create a shared `ui/` component folder with `Button`, `Badge`, `Card`, `Input`, and `Spinner` primitives for future use by module components. |
| G5 | Add ARIA roles and keyboard navigation support to the shell navigation. |

---

## 4. Non-Goals

- Rewriting individual module components (only the shell is in scope).  
- Adding a routing library (React Router) in this iteration.  
- Implementing dark mode (tokens will be structured to enable it later).  
- Adding global state management (Context / Redux).

---

## 5. User Stories

### US-001 — Module Navigation  
*As a developer using SpecForge, I want to switch between the 8 workflow modules without scrolling or squinting at small buttons, so that I can navigate the tool efficiently on any screen size.*

**Acceptance Criteria:**
- A fixed left sidebar lists all 8 modules with an icon and a short name.
- The active module is clearly highlighted with a filled background.
- The sidebar is visible and usable on viewports ≥ 768 px.

### US-002 — Tab Navigation  
*As a developer, I want the sub-views within each module to be immediately visible and clearly differentiated from module navigation, so that I always know where I am.*

**Acceptance Criteria:**
- Secondary tabs appear in a strip immediately above the module content.
- The active tab has a bottom-border indicator and bold label.
- Tab labels support emoji icons for quick scanning.

### US-003 — Consistent Interactive Elements  
*As a developer building new features, I want a set of shared UI primitives (Button, Badge, Card, Input, Spinner) with consistent style, so that new views look cohesive without duplicating CSS.*

**Acceptance Criteria:**
- `Button` supports `variant` prop: `primary | secondary | danger | ghost`.
- `Badge` supports `color` prop for status colours.
- `Card` provides a standard bordered container.
- `Input` uses the global focus ring.
- `Spinner` shows an animated loading indicator.

### US-004 — Accessibility  
*As a keyboard user, I want to navigate modules and tabs using arrow keys, so that I can use the tool without a mouse.*

**Acceptance Criteria:**
- Sidebar module buttons have `role="menuitem"`.
- Tab buttons have `role="tab"` and `aria-selected`.
- Focus is visible on all interactive elements.

---

## 6. Technical Design

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER  SpecForge                          (h: 52px)       │
├──────────┬──────────────────────────────────────────────────┤
│          │  [Tab A] [Tab B] [Tab C] [Tab D]  (tab bar)      │
│ SIDEBAR  ├──────────────────────────────────────────────────┤
│  (220px) │                                                  │
│  ⚖️ Const │   MODULE CONTENT                                 │
│  📐 Spec  │                                                  │
│  🏗️ Arch  │                                                  │
│  🔨 Tasks │                                                  │
│  🚀 Rel.  │                                                  │
│  ⚡ Impl.  │                                                  │
│  🛡️ Qual. │                                                  │
│  📊 Dash  │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│  FOOTER  API: http://localhost:8000/api/v1    (h: 36px)     │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 CSS Design Tokens (`index.css`)

```css
:root {
  --color-primary:        #1d4ed8;
  --color-primary-dark:   #1e3a8a;
  --color-primary-light:  #eff6ff;
  --color-surface:        #ffffff;
  --color-background:     #f3f4f6;
  --color-border:         #e5e7eb;
  --color-text:           #111827;
  --color-text-muted:     #6b7280;
  --color-success:        #16a34a;
  --color-warning:        #d97706;
  --color-danger:         #dc2626;
  --radius-sm:            4px;
  --radius-md:            6px;
  --radius-lg:            8px;
  --shadow-sm:            0 1px 2px rgba(0,0,0,.06);
  --shadow-md:            0 1px 6px rgba(0,0,0,.10);
  --sidebar-width:        220px;
  --header-height:        52px;
}
```

### 6.3 Shared UI Primitives (`frontend/src/ui/`)

| Component | File | Props |
|-----------|------|-------|
| `Button`  | `Button.tsx` | `variant`, `size`, `disabled`, `onClick`, `children` |
| `Badge`   | `Badge.tsx`  | `color`, `children` |
| `Card`    | `Card.tsx`   | `children`, `style` |
| `Input`   | `Input.tsx`  | All standard `<input>` props |
| `Spinner` | `Spinner.tsx`| `size` |

Exported from `frontend/src/ui/index.ts`.

### 6.4 App.tsx Refactor

- Remove the three-bar chrome (module buttons in header, subtitle bar, nav bar).
- Add a `<Sidebar>` inline component rendering 8 `<SidebarItem>` buttons.
- Move tab bar into the main content column above `<main>`.
- Remove duplicated style objects; reference CSS custom properties via `var(--...)`.

---

## 7. Acceptance Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AT-001 | Load app in browser | Sidebar visible on left; header shows "SpecForge" only |
| AT-002 | Click sidebar "📐 Spec" | Module 2 content appears; sidebar item highlighted |
| AT-003 | Click tab within Module 2 | Correct sub-view renders; tab underline moves |
| AT-004 | Resize window to 900px | Sidebar + content remain usable; no overflow |
| AT-005 | Tab through sidebar items | Focus ring visible on each button |
| AT-006 | Import Button from ui/ | Renders correctly with all four variants |

---

## 8. Out of Scope (Future)

- Sidebar collapse (icon-only mode) on small screens  
- URL-based routing with React Router  
- Dark mode toggle  
- Global state (React Context / Zustand)  
- Migration of existing module styles to shared primitives
