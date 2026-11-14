# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Any student revising for Pearson Edexcel International AS and A Level (IAL) Physics, Chemistry, Biology or Maths. They find the site on GitHub Pages and use it without help, on a phone (often iPhone Safari) or a PC, in revision sessions that run from a few minutes to a few hours. Their job: practise past-paper questions on one topic at a time, check what the mark scheme rewards, and see which topics they have covered.

## Product Purpose

IAL Prep turns every IAL past paper from 2014 to 2024 into topic-sorted practice. Success is a student who can open a specification point, work through every past question on it, see what earns the marks, and know what they have done and what is left.

## Positioning

Every question part is filed under its 2018 specification point, not its paper, with a note on how it is asked, what the mark scheme rewards, where it sits in the original paper, and which earlier part must be done first ("hence" parts are saved together with the part they build on). Topic-first practice with mark-scheme notes is the mechanism; a paper-by-paper archive cannot offer it.

## Operating Context

- Four subjects: Physics (4,094 items), Chemistry (4,794), Biology (3,132), Maths (6,204), from Units 1 to 6 (Maths: P1-P4, FP1-FP3, M1-M3, S1-S3, D1).
- A student picks a subject, then a Unit, topic and specification point; filters by year, marks or text; marks items done or "review later"; selects items to download as question and mark-scheme PDFs.
- Revision notes per subject (Physics in `pages/`, Chemistry and Biology in `notes/`), each with a downloadable PDF built from the page's print styles.
- In the question bank a student picks spec points from a grid of squares under Unit tabs (each square fills as its questions are done), and can combine several.
- A past papers page lists every paper and mark scheme, downloaded from the repository's GitHub releases.
- A whole-exam study report per subject (Markdown in `reports/`).
- Done, review-later and download-selection lists live in the browser's localStorage only.

## Capabilities and Constraints

- Static HTML, CSS and vanilla JavaScript served by GitHub Pages; no build step, no framework, no server.
- Data: `data/<subject>.json` per subject; question screenshots as WebP in `img/<subject>/`.
- jsPDF is loaded from cdnjs only when a download is requested.
- Must work in iOS Safari: no hover-only controls, 16px or larger inputs, safe-area insets, dynamic viewport units.
- Print styles must keep producing the notes PDFs.
- The topic sorting and notes are AI-written and unverified by Pearson or a teacher; the site says so.
- 2025 and later papers are excluded.

## Brand Commitments

- Name: IAL Prep.
- The look follows the menus of the video game Control (Remedy, 2019), approved by the owner from a sample on 2026-11-14: near-black panels with hairlines, the selected tab as a white block, square tick boxes, Control's red capital section labels, typed-in headings, notifications and smooth slides. Dark is the default, with a light mode (grey desk, paper panels, black type). Each subject has its own accent colour (Physics blue, Chemistry teal, Biology lime, Maths violet) and its own seal drawn behind the page. Headings in TeX Gyre Adventor (the free copy of ITC Avant Garde the owner supplied), text in Overpass. The shared parts are `css/control.css` and `js/control.js`.
- Earlier, on 2026-11-03, the owner looked at mosbyfiles.com as a possible restyle and decided against it; the notes are in `docs/design-notes-mosbyfiles.md`.

## Evidence on Hand

- The question bank data and screenshots, the four study reports, the notes pages and the paper manifests in this repository.
- No testimonials, user counts, endorsements or school affiliations exist; none may be invented.
- Questions and mark schemes are Pearson Edexcel material; the site is for study only.

## Product Principles

1. The question is the work: the paper screenshot is always the largest, clearest thing on a card.
2. Show the gap: a student should see at a glance which units and topics they have not practised.
3. Topic first, paper second: every view starts from the specification, and the paper location is one tap away.
4. Honest about the source: AI-written notes and missing papers are labelled, never hidden.
5. Works on the bus: everything a student does on a PC also works one-handed on a phone.

## Accessibility & Inclusion

WCAG 2.1 AA contrast for all text, full keyboard use (the bank adds keyboard shortcuts), visible focus, `prefers-reduced-motion` respected, and touch targets of at least 44px on coarse pointers.
