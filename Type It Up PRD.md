# Product Requirements Document: Type It Up

Type It Up is planned as a browser-based writing and design application that recreates the physical experience of composing a document on a typewriter without giving up essential modern conveniences. Users will load a virtual sheet of paper, roll and position it beneath a fixed typing point, place individual character strikes anywhere on the page, overstrike characters for authentic bold and underlining, make visibly imperfect corrections with whiteout, and finish the page with paper aging, worn ink, highlighting, sound, and machine-specific behavior. Documents will remain editable and locally recoverable, while finished work can be printed or exported at its true paper dimensions as PDF or PNG.

## 1. Document Status

- Product name: Type It Up
- Document type: Product Requirements Document (PRD)
- Initial platform: Desktop web browsers
- Initial release: Minimum Viable Product (MVP)
- Product category: Creative writing, document design, and typewriter simulation

## 2. Product Definition

Type It Up is a spatial typewriter simulator rather than a conventional word processor with a typewriter font. Each keypress creates a discrete physical strike at a fixed coordinate on the page. Text does not automatically reflow when other text is inserted, moved, corrected, cut, or pasted.

The application combines two ideas:

1. An authentic typewriter interaction model built around a carriage, fixed character pitch, line spacing, margins, overstriking, and mechanical sound.
2. A forgiving creative tool with undo, redo, selection, cut/copy/paste, autosave, and reliable export.

Authenticity should give the product its identity, but it should not make routine creation frustrating or put the user's work at risk.

## 3. Product Goals

- Make it natural to position the carriage and type anywhere on a virtual page.
- Produce documents that convincingly look mechanically typed rather than digitally typeset.
- Make each virtual typewriter feel distinct in spacing, imprint, alignment, and sound.
- Preserve the physical consequences of overstriking and correction.
- Keep all editing reversible through undo and redo.
- Allow users to save editable projects and export predictable, print-ready results.
- Keep all keyboard handling strictly confined to the focused application editor.
- Present the experience clearly enough that a first-time user can begin typing without a tutorial.

## 4. Non-Goals for the MVP

- Full word-processing behavior such as automatic reflow, stylesheets, tables, footnotes, or mail merge
- Real-time collaboration or cloud accounts
- Exact licensed reproductions of historical typewriter brands or models
- Mobile-first authoring
- Optical character recognition
- DOCX import or export
- Font substitution for arbitrary third-party fonts
- Browser extensions, operating-system hooks, or global keyboard shortcuts

## 5. Target Users and Use Cases

### Primary users

- Writers who want a deliberate, distraction-resistant composing experience
- Designers creating authentic-looking letters, notes, props, or period documents
- Typewriter enthusiasts interested in mechanical behavior and visual variation
- Casual users who want to make a distinctive letter without learning design software

### Primary use cases

- Compose a personal letter on aged paper and print it.
- Create a period-looking document and export it as a PNG.
- Fill in or annotate a page by placing text at exact positions.
- Experiment with different typewriter machines, ribbons, and paper conditions.
- Create an intentionally imperfect document with corrections, overstrikes, and highlighting.

## 6. Core Product Principles

### 6.1 The document is made of strikes

Each visible character is one or more strike objects containing its character, page coordinate, machine, ink condition, alignment variation, and strike order. A bold character is multiple strikes, not merely a heavier font weight. An underline can be an underscore struck over the same character position.

### 6.2 Position is physical

Document coordinates are stored in physical page units and are independent of screen zoom. Screen resizing or zooming must not change layout, spacing, or export placement.

### 6.3 Imperfections are stable

Paper defects, character wear, alignment jitter, and ink dropout must be deterministic after creation. The same project must look the same when reopened, printed, or exported. A deliberate **Regenerate Wear** command may create a new seeded variation.

### 6.4 Modern conveniences remain local and reversible

Undo, redo, selection, clipboard commands, and clean project saving are available, but they do not convert the page into flowing text or conceal the physical model.

## 7. Core User Experience

### 7.1 New document flow

1. The user creates a new document.
2. The user chooses a typewriter and paper size.
3. A sheet appears positioned beneath a visible typing point.
4. The editor surface receives focus after a direct click or explicit start action.
5. The user clicks a position or moves the carriage and begins typing.
6. The project autosaves locally while the user works.
7. The user prints the document or exports it as PDF or PNG.

### 7.2 Editor layout

The initial desktop interface should contain:

- A central paper and carriage workspace
- A clear typing point or type guide
- A top toolbar for document, machine, paper, editing, and export actions
- A compact appearance panel for paper, ink, and wear controls
- Page thumbnails for multi-page documents
- A status area showing the current machine, character pitch, line spacing, and carriage position
- Optional rulers, margins, and tab-stop indicators

The paper is the visual focus. Controls should not resemble a full office word processor.

### 7.3 Carriage and page positioning

- The typing point remains visually fixed while the paper moves beneath it.
- Clicking the page positions the nearest valid character cell beneath the typing point.
- Arrow keys move one character cell horizontally or one line vertically.
- The mouse wheel or trackpad rolls the paper vertically while the editor is focused or directly hovered.
- On-screen platen controls provide an obvious pointer-based way to roll the paper.
- The user may drag the page for coarse positioning and use keys for precise positioning.
- Home returns to the left margin of the current line.
- A margin bell sounds when the carriage approaches the right margin.
- The default mode does not reflow previously typed content.
- An optional **Auto Return** setting may move to the next line at the right margin.

## 8. Functional Requirements

### FR-1: Documents and pages

- Support multi-page documents.
- Support Letter, Legal, and A4 paper in the MVP.
- Support portrait orientation in the MVP.
- Allow adding, duplicating, reordering, and ejecting pages.
- Ejecting a page must be undoable or require confirmation if it would remove unsaved content.
- Retain the selected machine and document settings when adding a page.

### FR-2: Typewriter models

The MVP will include two fictional machines:

#### Office Standard

- Pica spacing at 10 characters per inch
- Heavier, more consistent imprint
- Relatively stable character alignment
- Firm key and carriage-return sounds

#### Travel Portable

- Elite spacing at 12 characters per inch
- Lighter imprint
- Greater baseline and horizontal variation
- Smaller and sharper mechanical sounds

Each machine profile must be able to define:

- Typeface and available character set
- Character pitch
- Default line spacing
- Margin and bell behavior
- Strike force and ink distribution
- Per-character alignment and wear
- Key, spacebar, bell, platen, and carriage-return sounds

### FR-3: Basic typing behavior

| Input | Behavior while the editor is focused |
| --- | --- |
| Printable character | Add a strike and advance one character position |
| Space | Advance without adding a visible strike |
| Backspace | Move back one character position without erasing |
| Delete | Apply whiteout to visible ink at the current character cell or selection |
| Enter | Return to the left margin and advance one line |
| Arrow keys | Move the carriage one character or line |
| Tab | Advance to the next configured tab stop |
| Home | Move to the left margin of the current line |
| Ctrl/Cmd+Z | Undo the last document action |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo the last undone action |

Holding a printable key may repeat according to browser key-repeat events. Repeated marks must remain discrete strikes.

### FR-4: Bold and underline

- A user can manually bold a character by returning to its position and striking it again.
- Ctrl/Cmd+B toggles automatic double-strike mode while the editor surface is focused.
- Automatic bold produces multiple strikes with a subtle machine-appropriate offset.
- A user can manually underline by returning to a character position and striking an underscore.
- Ctrl/Cmd+U toggles automatic underline mode while the editor surface is focused.
- Automatic underline adds an underscore strike at the typed character's position without incorrectly advancing the carriage twice.
- Bold and underline controls must show a visible active state.
- Bold and underline modes may be used together.

### FR-5: Selection, cut, copy, and paste

- Provide a Selection tool that can select strikes by dragging a rectangular region.
- Allow Shift+Arrow expansion of an existing selection as a keyboard-accessible alternative.
- Selection must not imply word-processing reflow.
- Cut removes the selected strikes cleanly and places their content on the clipboard.
- Copy leaves selected strikes in place and places their content on the clipboard.
- Pasting Type It Up content within the application preserves relative spacing, overstrikes, and applicable appearance data, anchored at the current carriage position.
- Pasting ordinary plain text types it from the current carriage position using the currently selected machine and modes.
- Plain-text line breaks perform carriage return and line feed.
- Plain-text tabs advance to the next tab stop.
- Unsupported rich-text formatting is discarded.
- Clipboard operations must be initiated by a direct user action and comply with browser permission rules.
- The application must never read the clipboard in the background.
- If the browser cannot preserve the native Type It Up clipboard payload, the app must still provide a plain-text clipboard representation.
- Cut, copy, and paste actions must be undoable where they change the document.

Cut is treated as a modern editing operation and removes selected objects cleanly. Delete is the physical correction operation and uses whiteout.

### FR-6: Whiteout and deletion

- Pressing Delete at a character cell applies a correction layer that conceals all visible ink marks within that cell.
- Pressing Delete with a selection applies whiteout across the selected content.
- The concealed strike data remains in document history so the action can be undone.
- Newly typed characters appear above the correction layer.
- A brief whiteout brush or correction-tape animation appears at the affected location.
- The animation should be short, approximately 300 to 600 milliseconds, and must not delay further input.
- The animation must be reduced or disabled when the user requests reduced motion.
- A **Show Whiteout Marks** setting controls whether completed corrections retain visible texture, edges, and slight color mismatch.
- The setting is enabled by default to support an authentic appearance.
- When the setting is disabled, the correction still hides the original ink but blends as cleanly as possible with the underlying paper.
- The whiteout visibility setting is saved with the document and used consistently in preview, print, PDF, and PNG output.
- Whiteout must be undoable and redoable.

### FR-7: Paper appearance

- **Paper Age** controls the transition from clean white paper to aged, warmer paper with subtle edge discoloration.
- **Paper Wear** controls fibers, specks, creases, stains, and edge defects.
- **Defects** provides page-specific, softly burn-darkened edge areas, patterned folds, and no more than two controlled edge or interior tears using an independent deterministic seed.
- Tears may visually cover content but must never remove or mutate the underlying editable objects.
- Appearance controls must preserve legibility at their default values.
- Each page may have a stable variation derived from the document's appearance seed.
- Provide a **Regenerate Wear** action with undo support.

### FR-8: Ink and mechanical appearance

- **Ink Condition** controls strike density, dropout, broken edges, and uneven ribbon coverage.
- **Machine Wear** controls recurring character defects, baseline drift, horizontal alignment, and pressure variation.
- Variations must remain recognizable as the intended character.
- Overstriking must accumulate visible ink naturally.
- Visual effects must remain stable at different zoom levels and during export.

### FR-9: Typewriter sound

- Provide distinct sounds for character keys, spacebar, backspace, bell, platen movement, and carriage return.
- Allow sound to be enabled or disabled.
- Provide a volume control independent of the system volume.
- Audio begins only after a user interaction, in accordance with browser autoplay restrictions.
- Sound must not continue after the page loses focus or the application is closed.

### FR-10: Highlighter

- Provide a separate Highlighter tool.
- Allow the user to drag line-sized translucent strokes across the page.
- Render slight texture and edge variation while preserving readability.
- Render highlighting with a blend that appears to sit over typed ink.
- Support yellow in the MVP.
- Highlighter strokes must be selectable, movable, cuttable, copyable, pasteable, deletable, undoable, and redoable.

### FR-11: Saving and recovery

- Autosave the active project locally after document changes.
- Recover the latest autosaved state after an accidental refresh or browser restart when storage remains available.
- Provide an explicit editable project download using a versioned Type It Up file format.
- Allow reopening a downloaded project file.
- Store pages, strikes, corrections, highlights, machine profiles, paper settings, appearance seeds, and document preferences.
- Warn clearly when browser privacy settings or storage restrictions prevent reliable autosave.

### FR-12: Export and printing

- Export all pages or a selected page as PDF.
- Preserve physical paper dimensions in PDF output.
- Export a selected page as PNG.
- Offer screen-resolution PNG and print-quality 300 DPI PNG.
- Print using the same rendering path as PDF wherever practical.
- Preserve all stable imperfections exactly between the editor, export, and print output.
- Represent missing paper in PDF and physical print output as a white vector knockout with a torn rim; do not silently omit page defects.
- Respect the current **Show Whiteout Marks** setting.
- Do not include editor controls, selection boxes, rulers, or the typing point in output.

### FR-13: Keyboard isolation and shortcut safety

- Keyboard redirection and application shortcuts are active only while the Type It Up editor surface has explicit focus.
- Clicking outside the editor, switching tabs, changing applications, opening a dialog, or blurring the browser window immediately ends editor-specific keyboard handling.
- Text fields, menus, file pickers, export dialogs, and settings controls retain their normal keyboard behavior.
- Shortcut handlers should be attached to the focused editor root rather than globally wherever browser APIs permit.
- Any temporary listener must be removed on blur, editor teardown, page navigation, or application shutdown.
- The app may prevent a browser default only for a recognized Type It Up command while the editor is focused.
- Unrecognized shortcuts and browser-reserved shortcuts must pass through unchanged.
- The app must not register operating-system-wide hotkeys.
- The app must not install a browser extension, background keyboard service, startup item, or persistent keyboard remapping component.
- Keyboard behavior must never persist after the user leaves or closes the app.
- Ctrl/Cmd+B and Ctrl/Cmd+U must affect Type It Up only while its editor is focused.
- Clipboard shortcuts must affect Type It Up content only when the editor or a Type It Up selection is focused.
- A visible focus treatment must make it clear when typing will affect the page.

### FR-14: Accessibility and comfort

- Provide full mute and volume controls.
- Honor the operating system's reduced-motion preference.
- Provide a high-legibility view that suppresses nonessential texture without changing exported appearance.
- Ensure toolbar controls are keyboard accessible and have accessible names.
- Do not rely on color alone to communicate active modes or selection.
- Provide a shortcut reference accessible from the editor.

## 9. Editing and Layer Model

Each page should use ordered layers:

1. Base paper and deterministic paper texture
2. Optional background form or image in a later release
3. Typewriter character strikes
4. Whiteout correction regions
5. Characters typed after correction
6. Highlighter strokes using an appropriate translucent blend

The implementation may internally use a chronological scene graph rather than fixed raster layers, provided it preserves the same visual ordering. The source project must retain editable objects; it must not flatten the page until export.

## 10. Focus and Input States

The interface must clearly distinguish these states:

- **Editor focused:** character input and documented editor shortcuts are active.
- **Tool or settings control focused:** the control receives normal keyboard input; typing does not strike the page.
- **Browser or operating system unfocused:** Type It Up receives no keyboard input and performs no shortcut handling.
- **Selection active:** cut, copy, paste, movement, and Delete apply to the selection.
- **No selection active:** typing and Delete apply at the carriage position.

Returning to the browser must not silently restore typing focus unless the user explicitly clicks the editor or activates a clearly labeled resume control.

## 11. MVP Scope

The first usable release includes:

- Two fictional typewriter models
- Letter, Legal, and A4 portrait paper
- Fixed-pitch spatial typing and page positioning
- Multiple pages
- Manual overstriking
- Shortcut-controlled automatic bold and underline
- Rectangular selection
- Cut, copy, and paste
- Whiteout-style Delete with optional visible correction marks
- Undo and redo
- Paper Age, Paper Wear, Ink Condition, and Machine Wear controls
- Stable seeded imperfections
- Yellow highlighter
- Typewriter sound, volume, and mute
- Local autosave and editable project import/export
- PDF, PNG, and print output
- Strictly focus-scoped keyboard handling
- Reduced-motion support

## 12. Later-Release Candidates

- Strict Typewriter Mode without deletion or automatic carriage return
- Black/red ribbon selector
- Correction paper and correction tape variants
- Custom margins and tab stops
- Single, double, and custom line spacing
- Landscape orientation and custom paper sizes
- Envelopes and index cards
- Paper skew and manual sheet alignment
- Carbon-copy sheets
- Background forms for spatial filling
- Additional highlighter colors
- Machine-specific key layouts and missing symbols
- User-created machine wear profiles
- Searchable text layer in PDF exports
- Typing replay and animated export
- Cloud documents and collaboration
- Public document or machine-profile gallery

## 13. Success Measures

Initial product success should be evaluated by whether users can:

- Start a new page and type their first character without instructions.
- Position text in an arbitrary page location accurately.
- Understand that Backspace repositions while Delete applies whiteout.
- Manually create an overstrike, underline, and bold effect.
- Select, cut, and paste spatial content without unexpected reflow.
- Leave the editor and use normal browser and operating-system keyboard shortcuts without interference.
- Reopen an autosaved document without visible changes.
- Produce a PDF, PNG, and print result matching the editor preview.

## 14. MVP Acceptance Criteria

The MVP is ready for release when all of the following are true:

1. A user can create, edit, autosave, reopen, and export a multi-page document.
2. Character position remains stable across reload, browser zoom, PDF, PNG, and print.
3. The two typewriter models are visibly and audibly distinguishable.
4. Manual and automatic overstriking produce authentic, discrete strikes.
5. Cut, copy, and paste preserve spatial relationships for native content and handle plain text predictably.
6. Delete produces a reversible whiteout correction, and visible correction marks can be turned on or off.
7. Paper, ink, and wear effects remain identical between preview and output unless deliberately regenerated.
8. All editor shortcuts work only with explicit editor focus.
9. Switching tabs or applications leaves keyboard behavior completely unaffected outside Type It Up.
10. No operating-system-wide shortcut, persistent keyboard hook, extension, or background remapping is installed or registered.
11. The application remains usable with sound disabled and reduced motion enabled.
12. No document data is lost during an ordinary refresh when local storage is available.

## 15. Open Product Decisions

These decisions can be resolved during interaction prototyping:

- Whether page dragging moves freely or snaps continuously to character and line increments
- Whether Auto Return is enabled or disabled for new users by default
- Whether pasted plain text should stop, continue beyond the margin, or automatically return at the right margin
- Whether rectangular selection includes partially intersected objects or only fully enclosed objects
- Whether whiteout over a multi-cell selection appears as one continuous brush stroke or individual character-cell corrections
- Whether paper appearance settings apply to the whole document or can be overridden per page
- Whether a newly opened document should require an explicit click before the editor receives typing focus

The recommended starting position is free page dragging with snapped placement, Auto Return disabled, pasted text honoring explicit line breaks without automatic reflow, intersection-based selection, continuous whiteout for a selection, document-wide appearance defaults with optional page overrides later, and an explicit click before typing focus is activated.
