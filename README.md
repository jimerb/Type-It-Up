# Type It Up

> A quiet, tactile typewriter for the browser.

![Type It Up](./type-it-up-header-transparent-cropped.png)

**[Open the live app](https://jimerb.github.io/Type-It-Up/)**

Type It Up turns writing into a small mechanical ritual. Characters land in fixed cells on a sheet of paper, the carriage advances one column at a time, and every page carries the character of its machine, ribbon, and paper. It is deliberately closer to using a typewriter than to using a word processor.

The app runs entirely in the browser. There is no account, server, database, build step, or installation process. Documents and preferences are autosaved locally in the browser, and an editable project can be saved as a self-contained `.tiu` file. Export uses the browser's print pipeline to produce a true-size PDF.

## What it can do

- Type on fixed cells with carriage movement, return, backspace, tab stops, bold, and underline.
- Choose between an Office Standard machine with Pica spacing and a Travel Portable machine with Elite spacing.
- Adjust Letter, Legal, or A4 paper; paper age and wear; ink condition; and machine wear.
- Add page-specific soft, burn-darkened edges, patterned folds, and up to two controlled edge or interior tears without damaging editable content.
- Use black record, blue-black, red review, or purple copy ribbon character.
- Draw with pen, pencil, or highlight nibs, and apply physical-looking whiteout corrections.
- Select, cut, copy, and paste without turning the page into flowing text.
- Add, duplicate, and remove pages with undo and redo across document edits.
- Keep the typing point fixed while the page rolls behind it.
- Save and reopen editable `.tiu` projects containing the document scene, deterministic paper and defect appearance data, reference previews, and the Courier Prime typeface.
- Hear key, carriage-return, and margin-bell sounds through the Web Audio API, with a mute option.
- Export paper-only pages through the browser's Save as PDF flow.

## Try it

The easiest way to use Type It Up is the hosted version:

**[jimerb.github.io/Type-It-Up](https://jimerb.github.io/Type-It-Up/)**

To run it locally:

1. Keep `index.html`, `support.js`, and the header image together.
2. Serve this folder with any simple static web server. For example:

   ```text
   python -m http.server 3991
   ```

3. Open `http://localhost:3991/` in Chrome, Edge, or Safari.

Opening `index.html` directly may work in some browsers, but serving the folder over HTTP avoids local-file restrictions around the runtime and fonts.

## Controls

| Input | Action |
| --- | --- |
| Printable character | Strike a character and advance one cell |
| Space | Advance without leaving ink |
| Backspace | Move the carriage back without erasing |
| Enter | Return to the left margin and advance one line |
| Arrow keys | Move one cell or line |
| Tab | Advance to the next tab stop |
| Home | Move to the left margin of the current line |
| Delete | Apply whiteout to the current cell or selection |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y | Redo |
| Ctrl/Cmd + B | Toggle automatic bold striking |
| Ctrl/Cmd + U | Toggle automatic underlining |
| Mouse wheel | Roll the paper while over the editor |

## Exporting

Choose **Export** or press Ctrl/Cmd + P. In the print dialog:

- Choose **Save as PDF**.
- Keep scale at **100%**.
- Turn on **background graphics** so the paper tone and wear are retained.
- Page defects are included automatically; interior tears print as a white knockout with a visible torn-paper rim.
- Use the document's selected paper size when the printer offers an override.

The app uses a separate print layer, so the tool rail, caret, rulers, and selection controls do not appear in the exported document.

## Saving editable projects

Choose **Save project** to download a single `.tiu` file, then use **Open** to continue editing it later. The project format is versioned and integrity-checked; it retains pages, strikes, corrections, highlights, freehand marks, page geometry, paper/ribbon settings, page-specific defects and seeds, stable resolved imperfections, and the last active carriage location. Browser layout and temporary editing state are deliberately excluded. Current saves use schema version 2; version 1 projects open as clean, defect-free pages and upgrade on their next save.

## Project layout

```text
index.html                         GitHub Pages entry point
Type It Up App.dc.html             Full source document and app logic
support.js                         Browser runtime used by the app
project-format.js                  Versioned .tiu package, import validation, and recovery autosave
assets/fonts/                      Locally bundled Courier Prime typefaces
assets/machines/                   Transparent chooser artwork for both machines
type-it-up-header-transparent-cropped.png  Wordmark used by the app
TypeItUp_setup.md                  Detailed setup and implementation notes
Type It Up PRD.md                  Product requirements document
.github/workflows/pages.yml        GitHub Pages deployment workflow
```

`index.html` is the Pages-ready copy of `Type It Up App.dc.html`; both are kept so the original source filename remains available while the hosted site has a conventional entry point.

## Privacy and dependencies

Your active document is recovered from IndexedDB in the current browser origin, with legacy local storage retained as a fallback. Type It Up does not upload or sync documents. The `.tiu` package includes its own editable content and Courier Prime typeface; the runtime still loads React, React DOM, Babel, IBM Plex Sans, and IBM Plex Mono from CDNs on first app load.

Courier Prime is distributed under the SIL Open Font License 1.1; its license is included at `assets/fonts/OFL.txt`.

## Notes for contributors

The app is intentionally a small static project. There is no `npm install`, bundler, or build command. Keep `support.js` beside the HTML files, preserve the dark workshop palette, and keep the interactive app tree separate from the print-only tree. The detailed implementation guide in [`TypeItUp_setup.md`](./TypeItUp_setup.md) documents the geometry, storage keys, export behavior, and modification cautions.

This is currently a public showcase repository. A project license can be added separately if the distribution terms need to be formalized.
