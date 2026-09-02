# Type It Up

> A quiet, tactile typewriter for the browser.

![Type It Up](./type-it-up-header-transparent-cropped.png)

**[Open the live app](https://jimerb.github.io/Type-It-Up/)**

Type It Up turns writing into a small mechanical ritual. Characters land in fixed cells on a sheet of paper, the carriage advances one column at a time, and every page carries the character of its machine, ribbon, and paper. It is deliberately closer to using a typewriter than to using a word processor.

The app runs entirely in the browser. There is no account, server, database, build step, or installation process. Documents and preferences are autosaved locally in the browser, while Export uses the browser's print pipeline to produce a true-size PDF.

## What it can do

- Type on fixed cells with carriage movement, return, backspace, tab stops, bold, and underline.
- Choose between an Office Standard machine with Pica spacing and a Travel Portable machine with Elite spacing.
- Adjust Letter, Legal, or A4 paper; paper age and wear; ink condition; and machine wear.
- Use black record, blue-black, red review, or purple copy ribbon character.
- Draw with pen, pencil, or highlight nibs, and apply physical-looking whiteout corrections.
- Select, cut, copy, and paste without turning the page into flowing text.
- Add, duplicate, and remove pages with undo and redo across document edits.
- Keep the typing point fixed while the page rolls behind it.
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
- Use the document's selected paper size when the printer offers an override.

The app uses a separate print layer, so the tool rail, caret, rulers, and selection controls do not appear in the exported document.

## Project layout

```text
index.html                         GitHub Pages entry point
Type It Up App.dc.html             Full source document and app logic
support.js                         Browser runtime used by the app
type-it-up-header-transparent-cropped.png  Wordmark used by the app
TypeItUp_setup.md                  Detailed setup and implementation notes
Type It Up PRD.md                  Product requirements document
.github/workflows/pages.yml        GitHub Pages deployment workflow
```

`index.html` is the Pages-ready copy of `Type It Up App.dc.html`; both are kept so the original source filename remains available while the hosted site has a conventional entry point.

## Privacy and dependencies

Your document data is stored under `localStorage` in the current browser origin. Type It Up does not upload or sync documents. The runtime loads React, React DOM, and Babel from `unpkg.com`, and the interface loads Courier Prime, IBM Plex Sans, and IBM Plex Mono from Google Fonts, so the first load needs network access to those CDNs.

## Notes for contributors

The app is intentionally a small static project. There is no `npm install`, bundler, or build command. Keep `support.js` beside the HTML files, preserve the dark workshop palette, and keep the interactive app tree separate from the print-only tree. The detailed implementation guide in [`TypeItUp_setup.md`](./TypeItUp_setup.md) documents the geometry, storage keys, export behavior, and modification cautions.

This is currently a public showcase repository. A project license can be added separately if the distribution terms need to be formalized.
