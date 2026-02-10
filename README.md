# LUMEN

**A unified declarative language for user interfaces.**

> The future UI is not brighter. It is clearer.

---

## What is LUMEN?

Modern UI development is fragmented.  
You write layout in **CSS**, vector graphics in **SVG**, procedural
visuals in **Canvas**, and reach for **WebGL** when none of those
are enough. Each technology has its own syntax, mental model, and
limitations. Every interface forces decisions that should not exist.

**LUMEN** unifies these into one coherent language with a single syntax,
one compilation model, and one clear mental framework: describe what
your interface looks like. LUMEN compiles it to standards-compliant
CSS and HTML that any browser renders immediately.

No framework. No build pipeline. No configuration. One file.

---

## Quick Start

**1. Add `lumen.js` to your HTML:**
```html
<script src="lumen.js"></script>
```

**2. Write LUMEN code:**
```html
<script type="text/lumen">
  surface card {
    width: 320px
    height: 180px
    material: solid(#1a1a2e)
    radius: 12px
    shadow: 0 8px 32px rgba(0,0,0,0.4)
    padding: 24px

    text "Hello from LUMEN" {
      size: 22px
      weight: 700
      color: #e2e8f0
    }
  }
</script>
```

**3. Open in a browser. Done.**

No terminal. No npm. No configuration. The card renders immediately.

---

## Core Concepts

LUMEN models a UI as a **rendered scene** rather than a DOM tree.

| Concept | What it is |
|---------|-----------|
| `surface` | A bounded, renderable region — the atomic unit |
| `material` | A named set of visual properties — reusable styles |
| `text` | A text node that lives inside a surface |

Everything is declarative. You describe **what** exists —
LUMEN decides how to render it.

---

## Language at a Glance

```lumen
// Named material — define once, use anywhere
material glass-dark {
  color: #0f0f1a
  opacity: 0.85
  radius: 16px
  border: 1px solid rgba(255,255,255,0.08)
  shadow: 0 8px 40px rgba(0,0,0,0.5)
}

// Two-column layout
surface app {
  width: 100vw
  height: 100vh
  layout: row
  material: solid(#0a0a0f)

  // Sidebar
  surface nav {
    width: 240px
    height: fill
    use: glass-dark
    padding: 24px
    layout: column
    gap: 12px

    text "LUMEN" {
      size: 24px
      weight: 700
      color: #e2e8f0
    }
  }

  // Main content area
  surface content {
    width: fill
    height: fill
    padding: 32px
    layout: column
    gap: 20px

    text "Welcome" {
      size: 36px
      weight: 800
      color: #f1f5f9
    }
  }
}
```

---

## HTML Integration

LUMEN is designed to live inside standard HTML.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="lumen.js"></script>
</head>
<body>
  <div id="lumen-root"></div>

  <script type="text/lumen">
    surface hero {
      width: 100%
      height: 400px
      material: gradient(#0f0f1a, #1a1a2e)
    }
  </script>
</body>
</html>
```

### Targeting a specific container:
```html
<div id="my-panel"></div>

<script type="text/lumen" target="my-panel">
  surface panel {
    width: 100%
    height: 300px
    material: solid(#111827)
  }
</script>
```

---

## Material Functions

| Function | Result |
|----------|--------|
| `solid(#color)` | Flat fill |
| `gradient(#from, #to)` | Linear gradient (135°) |
| `gradient(angle, #from, #to)` | Linear gradient at custom angle |
| `radial(#center, #edge)` | Radial gradient |
| `glass(#color, opacity)` | Frosted glass + backdrop blur |
| `noise(#color)` | Color with procedural noise texture |

---

## Repository Structure

```
Lumen/
├── lumen.js              ← compiler + runtime (the entire engine)
├── README.md             ← this file
│
├── docs/
│   └── syntax.md         ← complete syntax reference
│
├── tests/
│   ├── test-surfaces.html    ← foundation test suite
│   ├── test-materials.html   ← material system tests
│   ├── test-layout.html      ← layout tests
│   └── test-signals.html     ← signals tests (coming in v0.2)
│
└── examples/
    └── hello-lumen.html      ← starter example
```

---

## Current Status — v0.1 Foundation

LUMEN v0.1 establishes the foundation layer. It is a **working,
testable language** that compiles to real CSS and HTML.

**Implemented in v0.1:**
- `surface` with full property support
- `material` with named reuse via `use:`
- `text` nodes with typography control
- Material functions: `solid`, `gradient`, `radial`, `glass`, `noise`
- Flex layout: `layout`, `gap`, `align`, `justify`, `wrap`
- `fill` keyword for fluid sizing
- Full nesting: surfaces inside surfaces
- Comments (single-line `//` and multi-line `/* */`)
- HTML integration via `<script type="text/lumen">`
- Mount targets via `target` attribute

**Coming in v0.2 — Signals:**
- `signal hover` — interaction-driven reactivity
- `signal pulse(time)` — time-based animations
- Dynamic surfaces that update on signal change

**Coming in v0.3 — Advanced Materials:**
- Canvas-backed procedural rendering
- Particle emitters
- Advanced filter effects

---

## Philosophy

1. **Declarative** — describe the result, not the process
2. **Deterministic** — identical input always produces identical output
3. **CPU-first** — maximum work at compile time, minimal at runtime
4. **Composable** — build complex UIs from simple pieces
5. **Human-readable** — code that maps visually to what it renders
6. **Zero friction** — works in a browser with one script tag

---

## License

© Gfibion @SPENCER WRITERS  
All rights reserved.
