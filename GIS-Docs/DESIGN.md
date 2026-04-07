# Design System Specification

## 1. Overview & Creative North Star
This design system is built to transform complex environmental data into a serene, authoritative, and high-end editorial experience. 

**Creative North Star: "The Earth’s Ledger"**
The system avoids the frantic, "tech-heavy" aesthetic typical of AI platforms. Instead, it adopts the persona of a prestigious scientific journal combined with the tactile warmth of a luxury environmental atelier. We move beyond the "template" look by utilizing wide-open horizontal layouts, intentional asymmetry in data visualization, and a deep, tonal palette that suggests both wisdom and urgency.

The experience is defined by **Breathing Room**. We do not fill white space; we curate it. By utilizing a sophisticated cream-based foundation, the UI feels less like a software tool and more like an archival document.

---

## 2. Colors
The palette balances the biological (Teals), the geological (Cream/Stone), and the urgent (Orange). 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined through:
1.  **Background Color Shifts:** Use `surface-container-low` components against a `surface` background.
2.  **Tonal Transitions:** Define areas through soft changes in depth, never with a structural line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper.
*   **Base:** `surface` (#fcf9f4) – The infinite canvas.
*   **Secondary Sections:** `surface-container-low` (#f6f3ee) – For grouping related research modules.
*   **Primary Cards:** `surface-container-lowest` (#ffffff) – For actionable data points or chat bubbles.

### Signature Finishes
*   **Glassmorphism:** For map overlays and floating sidebars, use `surface` at 70% opacity with a `24px` backdrop-blur. This integrates the UI into the environmental data visualizations underneath.
*   **Organic Gradients:** For primary CTAs, use a subtle linear gradient from `primary` (#012d1d) to `primary-container` (#1b4332) at 135 degrees. This adds "soul" and depth that flat color cannot provide.

---

## 3. Typography
The system uses a dual-typeface strategy to bridge the gap between "Scientific Authority" and "Modern AI Accessibility."

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and wide apertures. It feels expansive and data-driven.
    *   `display-lg` (3.5rem): Used for primary environmental metrics and hero statements.
*   **Body & Labels (Inter):** The workhorse. Inter provides maximum legibility for dense research papers and AI chat responses.
*   **Editorial Hierarchy:** Use a significant scale jump between `headline-lg` and `body-md` to create a rhythmic, high-end layout. Titles should feel "loud" and authoritative; body text should feel "quiet" and meticulous.

---

## 4. Elevation & Depth
Depth in this system is a product of light and material, not artificial dividers.

*   **The Layering Principle:** Stacking determines importance. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural lift.
*   **Ambient Shadows:** Floating elements (like the sidebar) must use a "Natural Bloom" shadow.
    *   **Value:** `0px 12px 32px rgba(28, 28, 25, 0.06)`
    *   **Note:** The shadow is tinted with the `on-surface` color (#1c1c19) to mimic natural ambient light.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token at 15% opacity. Never use 100% opaque borders.
*   **Softened Geometry:** Use the `lg` (2rem) and `md` (1.5rem) corner radii to move away from "industrial" sharp corners toward "organic" soft forms.

---

## 5. Components

### Sidebar (The Floating Monolith)
*   **Width:** Fixed 72px (collapsed).
*   **Style:** `surface-container-lowest` with a "Natural Bloom" shadow.
*   **Interaction:** Icons use `on-surface-variant`. The active state uses a `secondary-container` (#aeeecb) pill shape behind the icon.

### Cards (The Data Vessels)
*   **Rule:** Forbid the use of divider lines.
*   **Separation:** Use vertical white space (32px minimum) or subtle background shifts between header and body content.
*   **Radius:** `md` (1.5rem).

### Buttons
*   **Primary:** Teal gradient (`primary` to `primary-container`). Pill-shaped (`full`). White text.
*   **Secondary:** `surface-container-high` background with `primary` text. No border.
*   **Tertiary (Editorial):** `on-tertiary-container` (#fd862c) text. Underline only on hover.

### Map Overlays & Sliders
*   **Overlays:** Use the "Glassmorphism" finish.
*   **Sliders:** Track uses `outline-variant` at 20% opacity. The thumb is a `primary` solid circle with a 4px `surface` stroke to ensure it "pops" against the background.

---

## 6. Do's and Don'ts

### Do
*   **DO** use asymmetric margins to lead the eye through data (e.g., a wide left margin for a headline, a tighter right margin for a chart).
*   **DO** use the `tertiary` Orange (#E8761B) sparingly for "Critical Insight" chips and interactive map pins.
*   **DO** ensure all "Surface Lowest" cards have a minimum of 24px internal padding to maintain the editorial feel.

### Don't
*   **DON'T** use black (#000000) for text. Use `on-surface` (#1c1c19) to maintain the soft, premium contrast against the cream background.
*   **DON'T** use standard 8px or 4px "box" shadows. They look "cheap" and "out-of-the-box."
*   **DON'T** place a Teal header directly against a dark image without a `surface-dim` overlay to preserve legibility.