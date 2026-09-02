# Type It Up — Setup and Implementation Guide

## 1. Overview

**Type It Up** is a browser-based typewriter document app. Instead of a word processor's flowing text, it simulates a real machine: characters are struck into fixed cells on a sheet of paper, the carriage advances one column at a time, a bell rings near the right margin, and the paper carries age, wear and ribbon character. The paper is the interface; the surrounding application chrome is deliberately quiet.

It runs entirely client-side. There is no server, no build step, and no account. Documents autosave to the browser's local storage, and export goes through the browser's own print/Save-as-PDF pipeline.

**The app must be presented in dark mode.** This is not a theme option — the whole design depends on it. The workspace is a dark, warm-neutral "quiet workshop" (near-black `#100f0c` body, `#26221b`/`#1c1913` chrome, amber accent `#d9a15b`, bone text `#e7e0d2`) so the cream paper is the single bright object on screen and reads as a lit sheet on a desk. A light-mode version flattens the paper against the background and destroys the effect. Do not add a light theme or invert the palette.

---

## 2. Features

**Typing and machine feel**
- Spatial, cell-based typing: every character occupies a fixed row/column, so you can type anywhere on the sheet.
- Two machines: Office Standard (Pica, 10 cpi, steady imprint) and Travel Portable (Elite, 12 cpi, lighter imprint and more baseline drift).
- Per-character jitter, ink dropout and imprint opacity derived from machine wear and ribbon condition.
- Margin bell and key/return sounds via the Web Audio API; sound can be muted.
- Carriage return, backspace, arrow navigation, tab stops, bold and underline.
- Auto-return toggle for continuous typing past the right margin.
- The typing line stays pinned at a fixed height on screen and the paper rolls behind it, like a real platen. The mouse wheel rolls the paper one line per click.

**Paper and ribbon**
- Paper sizes: Letter, Legal, A4.
- Paper age, paper wear, ink condition and machine wear as independent sliders; wear speckles are seeded per page, so each sheet is consistently imperfect.
- Four ribbon colors: black record, blue-black, red review, purple copy.
- Condition presets when rolling in a new sheet: fresh, aged, well used.

**Marking up the page**
- **Draw** tool with three nibs — pen, pencil, highlight — each with its own color swatches and thickness slider.
- **Whiteout** with an intensity slider (transparent through fully opaque); apply to a selection or with the Delete key.
- **Select** tool for rectangular selections, with cut, copy, paste and whiteout.

**Pages**
- Multi-page documents with a thumbnail rail; hover a thumbnail for a full-page preview.
- Add, duplicate and trash pages. All page operations are undoable.
- Undo/redo across typing, drawing, whiteout and page structure changes.

**Workspace**
- Collapsible left tool rail: icons collapse, labels expand.
- Single scrollable accordion for tool settings — no nested flyouts.
- Optional rulers with live column flag and margin stops.
- Full-screen mode (real fullscreen where the browser allows it, in-app immersive fallback otherwise).
- Status line showing machine, pitch, line and column, toggles, and page position.
- Settings persisted in the browser: default paper size, show rulers, show thumbnail rail, open tools on launch.
- Autosave to local storage, with recovery on reload.

**Export**
- Export renders a print-only layer containing every page at true paper size, one sheet per printed page, with all application chrome excluded. The `@page` rule is kept in sync with the document's paper size so Cmd/Ctrl+P produces the same result as the Export button.

---

## 3. Project files

Ship these two files together, in the **same directory**:

| File | Required | Purpose |
| --- | --- | --- |
| `Type It Up App.dc.html` | Yes | The entire application: markup, styling and logic. This is the file you open. |
| `support.js` | Yes | The runtime the app file loads. The app will not render without it. |

Nothing else is needed — no `node_modules`, no config, no assets folder.

### External dependencies

The app pulls three fonts from Google Fonts at runtime:

- **Courier Prime** — the typed characters on the paper
- **IBM Plex Sans** — interface labels
- **IBM Plex Mono** — status line, numeric readouts, small caps labels

If the machine will be offline, download those families and swap the `<link>` in the `<helmet>` block for a local `@font-face` set. Courier Prime is the one that matters most; without it the typed page loses its character.

---

## 4. Installation

1. Put `Type It Up App.dc.html` and `support.js` in the same folder.
2. Open `Type It Up App.dc.html` in a modern browser (Chrome, Edge or Safari; Chromium-based browsers give the best print fidelity).
3. If your browser blocks local file access to `support.js`, serve the folder over HTTP instead of opening the file directly:

   ```
   cd path/to/folder
   python3 -m http.server 3991
   ```

   Then visit `http://localhost:3991/Type%20It%20Up%20App.dc.html`.

That is the whole install. No build, no install step, no dependencies to resolve.

---

## 5. First run

On first launch the app opens the "new document" sheet, where you choose machine, paper size and paper condition, then roll in a sheet. Click the page once to start typing. On later visits the previous document is recovered from autosave and the app opens straight into it.

Keyboard reference lives under **Keys and help** at the bottom of the tool rail.

---

## 6. Export and printing

Export uses the browser's print pipeline, so "Save as PDF" in the print dialog is the export path.

For it to come out right:

- **Destination:** Save as PDF (or a real printer).
- **Margins:** the app sets `@page { margin: 0 }` itself. Leave the browser's margin setting alone; do not set "Default" margins on top of it.
- **Background graphics:** must be **on**. The paper tone, wear texture and highlights are backgrounds. With backgrounds off you get black text on white and lose the sheet.
- **Scale:** 100%. Do not use "Fit to page."
- **Paper size:** match the document's paper size (Letter, Legal or A4). The app declares this, but some print drivers override it.

Both the Export button and Cmd/Ctrl+P produce identical output: one physical page per document page, paper only, no interface.

---

## 7. Implementation notes

Useful to know if you are hosting, modifying or reviewing the app.

**Structure.** The app is a single self-contained component. The markup is a template; the behavior is one logic class. There are no CSS classes or stylesheets driving the design — all visual styling is inline, computed from document state. The only global CSS is font loading, range-input styling, one keyframe animation, and the print rules.

**Geometry.** A page is laid out on an internal 80-units-per-inch grid (`SCALE = 80`) at 6 lines per inch. Cell width is `SCALE / cpi`, so switching machines rescales the whole grid. For printing, the page is scaled by `96 / 80` to reach true CSS inches.

**Print layer.** A second, hidden DOM tree (`#tiu-print`) renders every page at real paper size. On print, the interactive app (`#tiu-app`) is hidden and the print layer is shown. Each sheet is a fixed-size box with a page break after it. This is why the printout contains no rails, rulers, caret or selection — those elements exist only in the app tree.

**Storage keys.** Documents are saved under `typeitup.doc.v2` and preferences under `typeitup.prefs.v1` in local storage. Clearing site data resets both. If you deploy multiple copies on the same origin they will share storage — change the keys if that matters.

**Audio.** Key, return and bell sounds are synthesized with the Web Audio API on demand. No audio files ship with the app. Browsers require a user interaction before audio starts, so the first keystroke may be silent.

**Tweakable behavior.** Two parameters are exposed for adjustment without editing logic: start in fullscreen, and the typing-point offset (how far down the viewport the active typing line sits, 80–320px).

**Undo model.** Undo captures document snapshots, which is why page add/duplicate/trash are undoable alongside typing. Page indices are clamped on undo so restoring a state with fewer pages cannot leave the view pointing at a page that no longer exists.

**Modification cautions.**
- Keep the dark palette. See section 1.
- Keep the print layer and the app tree separate. Printing the app tree directly is what produced interface elements and clipped pages in the first place.
- If you add a new paper size, add it to the size table only; page geometry, rulers, thumbnails and the print `@page` rule all derive from that table.
