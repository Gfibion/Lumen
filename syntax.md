# LUMEN Syntax Reference
## Version 0.1 — Foundation

> The future UI is not brighter. It is clearer.

---

## Table of Contents

1. [Overview](#overview)
2. [How LUMEN Fits Into HTML](#how-lumen-fits-into-html)
3. [Core Constructs](#core-constructs)
   - [surface](#surface)
   - [material](#material)
   - [text](#text)
4. [Properties Reference](#properties-reference)
   - [Dimensions](#dimensions)
   - [Layout](#layout)
   - [Visual / Material](#visual--material)
   - [Typography](#typography)
   - [Spacing](#spacing)
   - [Utility](#utility)
5. [Value Types](#value-types)
   - [Dimension Values](#dimension-values)
   - [Color Values](#color-values)
   - [Material Functions](#material-functions)
   - [Keywords](#keywords)
6. [Comments](#comments)
7. [Rules and Constraints](#rules-and-constraints)
8. [Complete Examples](#complete-examples)

---

## Overview

LUMEN is a declarative language for building user interfaces.
You describe **what** your interface looks like — LUMEN compiles it
to standard CSS and HTML so browsers render it immediately.

A LUMEN program is a collection of **surfaces** (renderable regions),
**materials** (reusable visual styles), and **text** nodes.

```lumen
surface card {
  width: 320px
  height: 180px
  material: solid(#1a1a2e)
  radius: 12px
}
```

That is a complete, valid LUMEN program. It compiles to a `<div>`
with the correct CSS and renders in any browser.

---

## How LUMEN Fits Into HTML

Load `lumen.js` once. Write LUMEN inside `<script type="text/lumen">` tags.
LUMEN auto-discovers those tags and renders them into the page.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="lumen.js"></script>
</head>
<body>

  <!-- Mount point — LUMEN renders here -->
  <div id="lumen-root"></div>

  <!-- LUMEN code -->
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

### Mount Targets

LUMEN mounts rendered output using this priority:

| Priority | Mount Location |
|----------|----------------|
| 1 | Element matching the script's `target` attribute |
| 2 | `<div id="lumen-root">` anywhere on the page |
| 3 | Auto-generated `<div>` inserted after the script tag |

**Targeting a specific container:**
```html
<div id="my-panel"></div>

<script type="text/lumen" target="my-panel">
  surface panel {
    width: 100%
    height: 300px
    material: solid(#0f0f1a)
  }
</script>
```

Multiple `<script type="text/lumen">` blocks are allowed per page.
Each is compiled and mounted independently.

---

## Core Constructs

### `surface`

A surface is the fundamental unit of LUMEN — a bounded, renderable
region. Every visible element is a surface or lives inside one.

**Syntax:**
```
surface <name> {
  <properties>
  <nested surfaces>
  <text nodes>
}
```

**Name rules:**
- Must start with a letter or underscore
- May contain letters, digits, underscores, hyphens
- Examples: `card`, `hero-panel`, `sidebar_2`

**Surfaces can be nested:**
```lumen
surface dashboard {
  width: 100%
  height: 100vh
  layout: row

  surface sidebar {
    width: 240px
    height: fill
    material: solid(#111827)
  }

  surface main {
    width: fill
    height: fill
    material: solid(#0f0f1a)
  }
}
```

**What a surface compiles to:**

| LUMEN feature | HTML output |
|---------------|-------------|
| `surface`     | `<div id="lmN" class="lumen-surface">` |
| Properties    | CSS declarations on that `<div>` |
| Nested surfaces | Nested `<div>` elements |

---

### `material`

A material is a named, reusable set of visual properties.
Define it once, reference it anywhere with `use:`.

**Syntax:**
```
material <name> {
  <visual properties>
}
```

**Example — defining and using a material:**
```lumen
material dark-glass {
  color: #0f0f1a
  opacity: 0.9
  radius: 12px
  border: 1px solid rgba(255,255,255,0.08)
  shadow: 0 8px 32px rgba(0,0,0,0.4)
}

surface card {
  width: 320px
  height: 200px
  use: dark-glass
}
```

**Material-specific property note:**

Inside a `material` block, `color` means the background fill color
of any surface that uses the material. This differs from `color`
inside a `text` block (where it means text color).

| Context | `color` means |
|---------|--------------|
| `material { }` | background fill → CSS `background` |
| `text "…" { }` | text color → CSS `color` |

---

### `text`

A text node renders a string of text with optional typography styling.
Text nodes must live inside a surface.

**Syntax:**
```
text "<content>" {
  <typography properties>
}
```

**Example:**
```lumen
surface card {
  width: 320px
  height: 120px
  material: solid(#1a1a2e)
  layout: column
  align: center
  justify: center
  padding: 24px

  text "Hello from LUMEN" {
    size: 28px
    color: #e2e8f0
    weight: 700
    align: center
  }

  text "A unified UI language" {
    size: 14px
    color: #94a3b8
    align: center
  }
}
```

**What a text node compiles to:**

```html
<p id="lmN" class="lumen-text">Hello from LUMEN</p>
```
With corresponding CSS declarations.

---

## Properties Reference

### Dimensions

| Property | Values | CSS output | Notes |
|----------|--------|-----------|-------|
| `width` | dimension, `fill` | `width` / `flex:1` | `fill` = take remaining space |
| `height` | dimension, `fill` | `height` / `flex:1` | |
| `min-width` | dimension | `min-width` | |
| `max-width` | dimension | `max-width` | |
| `min-height` | dimension | `min-height` | |
| `max-height` | dimension | `max-height` | |

---

### Layout

Layout properties turn a surface into a flex container and control
how its children are arranged.

| Property | Values | CSS output | Notes |
|----------|--------|-----------|-------|
| `layout` | `row` \| `column` | `display:flex; flex-direction:…` | Activates flex layout |
| `gap` | dimension | `gap` | Space between children |
| `align` | `start` \| `center` \| `end` \| `stretch` | `align-items` | Cross-axis alignment |
| `justify` | `start` \| `center` \| `end` \| `between` \| `around` \| `evenly` | `justify-content` | Main-axis distribution |
| `wrap` | `true` \| `false` | `flex-wrap` | Allow children to wrap |

**Layout example:**
```lumen
surface row-container {
  width: 100%
  height: 80px
  layout: row
  align: center
  justify: between
  gap: 16px
  padding: 0 24px
}
```

---

### Visual / Material

| Property | Values | CSS output |
|----------|--------|-----------|
| `material` | material function or named material | `background` (and more) |
| `use` | material name | Applies all material properties |
| `radius` | dimension | `border-radius` |
| `opacity` | 0–1 | `opacity` |
| `border` | shorthand (e.g. `1px solid #333`) | `border` |
| `shadow` | shorthand (e.g. `0 4px 20px rgba(0,0,0,0.4)`) | `box-shadow` |
| `layer` | integer | `z-index` |
| `overflow` | `hidden` \| `visible` \| `scroll` \| `auto` | `overflow` |
| `cursor` | CSS cursor value | `cursor` |
| `transition` | CSS transition shorthand | `transition` |

---

### Typography

Typography properties are used inside `text` blocks.

| Property | Values | CSS output |
|----------|--------|-----------|
| `font` | font family name | `font-family` |
| `size` | dimension | `font-size` |
| `color` | color value | `color` |
| `weight` | `400` \| `600` \| `700` \| `bold` etc. | `font-weight` |
| `align` | `left` \| `center` \| `right` | `text-align` |
| `style` | `normal` \| `italic` | `font-style` |
| `spacing` | dimension | `letter-spacing` |
| `height` | number or dimension | `line-height` |
| `transform` | `uppercase` \| `lowercase` \| `capitalize` | `text-transform` |
| `decoration` | `none` \| `underline` \| `line-through` | `text-decoration` |
| `wrap` | `true` \| `false` | `white-space` |

---

### Spacing

| Property | Values | CSS output |
|----------|--------|-----------|
| `padding` | shorthand (e.g. `16px`, `8px 16px`, `8px 16px 8px 16px`) | `padding` |
| `margin` | shorthand | `margin` |

---

### Utility

| Property | Values | CSS output |
|----------|--------|-----------|
| `layer` | integer | `z-index` |
| `overflow` | `hidden` \| `visible` \| `scroll` | `overflow` |
| `cursor` | any CSS cursor | `cursor` |
| `transition` | CSS transition shorthand | `transition` |

---

## Value Types

### Dimension Values

A dimension is a number followed by a unit.

| Unit | Meaning | Example |
|------|---------|---------|
| `px` | pixels | `300px` |
| `%`  | percent of parent | `50%` |
| `vw` | percent of viewport width | `100vw` |
| `vh` | percent of viewport height | `100vh` |
| `rem` | root em units | `1.5rem` |
| `em` | local em units | `2em` |
| *(none)* | depends on property | `line-height: 1.6` |

**Special keyword:**

| Keyword | Meaning |
|---------|---------|
| `fill` | Expand to consume all remaining space in the parent flex container. Compiles to `flex: 1`. |

---

### Color Values

Any standard CSS color syntax is accepted as a color value.

```lumen
// Hex
material dark { color: #1a1a2e }
material dark-3 { color: #1a2 }

// RGB / RGBA
material semi { color: rgba(15, 15, 26, 0.8) }

// HSL
material hue { color: hsl(220, 60%, 12%) }

// Named colors
material white-fill { color: white }
```

---

### Material Functions

Material functions appear as the value of the `material:` property.

#### `solid(color)`
A flat, single-color fill.
```lumen
material: solid(#1a1a2e)
material: solid(rgba(0,0,0,0.6))
```

#### `gradient(from, to)` or `gradient(angle, from, to)`
A linear gradient. Default angle is `135deg`.
```lumen
material: gradient(#0f0f1a, #1e3a5f)
material: gradient(90deg, #0f0f1a, #1a1a2e)
```

#### `radial(center-color, edge-color)`
A radial gradient from center outward.
```lumen
material: radial(#1e3a5f, #0f0f1a)
```

#### `glass(color, opacity)`
A frosted-glass effect. Applies background color with given opacity
and a `backdrop-filter: blur(12px)`.
```lumen
material: glass(#ffffff, 0.08)
material: glass(#1a1a2e, 0.6)
```

#### `noise(color)`
A flat color with a subtle procedural noise texture overlay.
```lumen
material: noise(#1a1a2e)
```

---

### Keywords

| Keyword | Used in | Meaning |
|---------|---------|---------|
| `fill` | `width`, `height` | Flex-grow to fill remaining space |
| `row` | `layout` | Horizontal flex direction |
| `column` | `layout` | Vertical flex direction |
| `center` | `align`, `justify` | Center alignment |
| `start` | `align`, `justify` | Flex-start |
| `end` | `align`, `justify` | Flex-end |
| `between` | `justify` | space-between |
| `around` | `justify` | space-around |
| `evenly` | `justify` | space-evenly |
| `stretch` | `align` | stretch |
| `hidden` | `overflow` | clip overflow |
| `true` | `wrap` | enable flex-wrap |
| `false` | `wrap` | disable flex-wrap |

---

## Comments

Two comment styles are supported:

```lumen
// Single-line comment — everything after // to end of line is ignored

/*
  Multi-line comment
  Spans multiple lines
*/

surface card {
  width: 300px   // inline comment after a property is fine
  height: 200px
}
```

---

## Rules and Constraints

1. **One property per line.** Each property assignment must be on its own line.
   The value ends at the end of that line.

2. **No semicolons required.** Line endings terminate property values.
   Semicolons are not used and not allowed.

3. **Blocks require braces.** `{` opens a block, `}` closes it.
   There is no indent-based block syntax.

4. **Names are case-sensitive.** `Card` and `card` are different names.

5. **Materials must be defined before they are referenced** by `use:` or
   by name in `material:`. Define all materials at the top of your LUMEN block.

6. **Text nodes must live inside a surface.** A `text` at the top level
   is invalid and will be ignored.

7. **`fill` requires a flex parent.** Using `width: fill` or `height: fill`
   only works correctly when the parent surface has `layout: row` or
   `layout: column`.

8. **Whitespace inside values is preserved.** The value
   `shadow: 0 4px 20px rgba(0,0,0,0.4)` is collected exactly as written.

---

## Complete Examples

### Example 1 — Simple Card
```lumen
surface card {
  width: 320px
  height: 180px
  material: solid(#1a1a2e)
  radius: 12px
  shadow: 0 8px 32px rgba(0,0,0,0.4)
  padding: 24px

  text "Welcome to LUMEN" {
    size: 22px
    weight: 700
    color: #e2e8f0
  }
}
```

### Example 2 — Named Material
```lumen
material panel {
  color: #111827
  radius: 10px
  border: 1px solid rgba(255,255,255,0.06)
  shadow: 0 4px 24px rgba(0,0,0,0.3)
}

surface sidebar {
  width: 260px
  height: 100vh
  use: panel
  padding: 20px
  layout: column
  gap: 12px
}
```

### Example 3 — Row Layout with Fill
```lumen
surface app {
  width: 100vw
  height: 100vh
  layout: row
  material: solid(#0f0f1a)

  surface nav {
    width: 220px
    height: fill
    material: solid(#111827)
    padding: 24px
    layout: column
    gap: 8px
  }

  surface content {
    width: fill
    height: fill
    padding: 32px
    layout: column
    gap: 16px
  }
}
```

### Example 4 — Glass Effect
```lumen
surface backdrop {
  width: 100%
  height: 100vh
  material: gradient(135deg, #0f0f1a, #1e3a5f)
  layout: row
  align: center
  justify: center

  surface modal {
    width: 400px
    height: 240px
    material: glass(#ffffff, 0.06)
    radius: 16px
    border: 1px solid rgba(255,255,255,0.12)
    shadow: 0 16px 48px rgba(0,0,0,0.5)
    padding: 32px
    layout: column
    align: center
    justify: center
    gap: 12px

    text "LUMEN Glass Surface" {
      size: 20px
      weight: 600
      color: #f1f5f9
      align: center
    }

    text "Backdrop filter applied automatically" {
      size: 13px
      color: rgba(255,255,255,0.5)
      align: center
    }
  }
}
```

---

*LUMEN v0.1 Foundation — © Gfibion @SPENCER WRITERS*
