# IAL Prep

A topic-sorted bank of Pearson Edexcel **International AS and A Level** past-paper questions for Physics, Chemistry, Biology and Maths. Published at <https://ialprep.com/> (hosted on Cloudflare Pages; the old GitHub Pages address forwards there).

Every item is one question part, saved as a screenshot cropped from the paper (only the pages with some of the question on them: blank pages and pages of lines or empty graph paper to write on are left out), with its **real mark scheme**: the rows of the Pearson mark scheme for that part, cut out of the mark scheme PDF. The AI practice questions, and the few past-paper questions whose mark scheme could not be found, show a mark scheme written for the site in the same table layout, marked as such. Each item also has:

- its **topic**: Unit > Topic > specification point, following the 2018 Pearson specification (Maths: Pure, Further Pure, Mechanics, Statistics and Decision units, then topic and point);
- the **paper ID** and **paper location** (question paper, mark scheme and pages);
- a note on **how the question is asked** and what the **mark scheme rewards**;
- the **earlier questions that must be done first** (id and name), for example "hence" and "otherwise" parts.

Where a part says "hence" (or otherwise builds on the part before it), that part is saved **together with** the part it builds on as one item, and the two separate entries are removed from the list.

Current-specification papers only. The question bank has sessions 2019 to 2026 for Physics, Chemistry and Biology and 2014 to 2026 for Maths (January 2025 to January/June 2026 included; a paper such as `WPH11A_Jan2026` is the "A" version of Unit 1 for that session and is marked "paper A" on its card; the answer book copies and data sheets that follow each question paper are left out); the past papers page has every current-specification paper up to 2026. Papers from the previous specification (WPH01-WPH07, WCH01-WCH07, WBI01-WBI06, WMA01, WMA02, WDM01) are left out, and `tools/pipeline/export_site.py` and `tools/papers/build-manifest.mjs` skip them.

This is the `topic-bank` branch. The earlier per-paper question bank (questions with worked answers and their page images) was removed on this branch and replaced by the topic bank. The revision notes (`pages/`, `notes/` and their scripts and assets) come from `main`, with three changes on this branch: each page's interactive diagrams are collected in one "Interactive diagrams" section at the end of the page, each page has a downloadable PDF, and the pages are fixed up for iPhone and iPad.

## Downloads

- **Notes:** every notes page has a *Download PDF* link to `pdf/<subject>/<page>.pdf`. The PDFs are the page's print version: no sidebar, no interactive diagrams, every worked solution open, quick-check answers shown. Rebuild them with `tools/notes/build-pdfs.mjs` after changing a notes page. Printing a page from the browser (or *Save as PDF*) gives the same result.
- **Questions:** on the question bank, *Select for download* on any questions, then *Download QP* (the question screenshots) or *Download MS* (the mark schemes of the same questions, numbered the same: the real Pearson rows for past-paper questions, a table written for the site for the AI practice questions, with a link to the full mark scheme). The PDF is made in the browser with jsPDF, loaded from cdnjs when first needed. The selection is saved in the browser.
- **Past papers:** `papers.html?s=<subject>` lists every International A Level paper and mark scheme for Physics, Chemistry, Biology and Maths. The PDFs are assets on the repository's GitHub releases (one release per subject, tag `papers-<subject>`), because together they are too large for GitHub Pages. Downloading a question paper puts it in the done list; *Mark done* does it by hand. The done list is saved in the browser.

## Getting around and studying

- **Navigation bar:** every page has the same bar along the top. Each subject's menu opens a panel with the question bank's Units, the notes Unit by Unit, the past papers and the study report. On a phone the bar has a *Menu* button that opens the subjects as a full-screen list. The menus come from `js/sitemap.js`, which is also where the notes pages are listed.
- **Progress:** the question bank's topic tree shows how many questions are done in every Unit, topic and spec point (with a bar under each Unit); the landing page and the menus show it per subject and per Unit. The *Show* filter lists all questions, the ones not done yet, the done ones, the review-later list or the ones selected for download.
- **Keyboard shortcuts** (question bank): `J` / `K` next and previous question, `D` done, `R` review later, `S` select for download, `M` mark-scheme notes, `/` search, `?` the list.
- **Continue where you left off:** the question bank saves the topic and question you were on. *Continue* in the bar, the landing page and the bank itself take you back. The topic is also in the address (`?t=`), so reloading, sharing or pressing Back keeps it; menu links open a Unit with `?unit=`.
- **Topic filters:** any number of Units, topics and spec points can be chosen together: tick them in the sidebar tree (clicking a name chooses just that one), or in the *Unit*, *Topic* and *Spec point* menus over the questions, which narrow each other (ticking topics keeps only those topics of their Unit) and stay in step with the tree. The address keeps one `?t=` per choice. *Paper* filters by the paper a question came from (its paper code), which is not always the same as its topic's Unit.

Everything above is saved in the browser only (localStorage).

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `js/landing.js` | Landing page, with "Pick up where you left off" and each subject's progress. |
| `js/nav.js`, `css/nav.css`, `js/sitemap.js` | The navigation bar on every page, and the site map it is built from. |
| `questions.html`, `js/topicbank.js`, `css/topicbank.css` | The topic bank page: topic tree, search, filters, question cards, and the QP / MS download of selected questions. |
| `papers.html`, `js/papers.js`, `css/papers.css` | The past papers page: every paper by session, downloads and the done list. |
| `data/<subject>.json` | One file per subject: the specification topic list and every item with its notes, prerequisites and paper location. |
| `data/ms-<subject>.json`, `img/ms/<subject>/<paper>-<k>.webp` | Real mark schemes. Each question's whole mark scheme from the Pearson PDF (all its parts, in order, as one tall image) is packed with the paper's other questions into a few pictures per paper (the host allows only 20,000 files, so not one file per question). The data file says, for every item that has one, which slice of which picture is the item's part: `[top, height, width, header top, header height, whole, k]` in pixels, `k` being the picture number (`whole` is 1 when the item shows the whole question: a question with no parts, a part that could not be told apart, and every Maths question, because Maths schemes keep the notes for all the parts after the table). The bank crops the picture with CSS, so a paper's questions share a few files. An item with no entry shows a written mark scheme instead. Built by `tools/pipeline/build_ms_crops.py`. |
| `data/ai-<subject>.json` | Practice questions written by AI in the Edexcel style (1,102 parts), each filed under one spec point. The bank shows them as text cards with their answer and mark scheme, and its *Questions* filter shows past papers and AI practice together, past papers only, or AI practice only. |
| `data/bank-pdfs-<subject>.json`, `functions/paper-pdf/` | Ready-made PDFs of every topic and of every whole Unit in the question bank (its questions, and their mark schemes), made by `tools/notes/build-bank-pdfs.mjs` with the bank's own PDF code and kept on the GitHub releases `bank-<subject>`. Each PDF opens with a contents list, and each spec point starts on a new page under a banner (a Unit's PDF also has a bigger banner for each topic), so the subtopics are easy to tell apart. `PREVIEW=1 node build-bank-pdfs.mjs` also copies them to `bank-pdfs-preview/` (git-ignored), which the question bank reads on 127.0.0.1 / localhost so they can be looked at before they are uploaded. The bank links to them from a download icon beside each topic and from the count line when one topic is chosen. `functions/paper-pdf` (a Cloudflare Pages Function) serves these and the past papers so they open in the browser's PDF viewer on ialprep.com. Rebuild and re-upload them after the bank data changes. |
| `<subject>/index.html`, `<subject>/unit-<n>.html`, `maths/<p1…d1>.html`, `css/units.css` | Subject and unit pages for search engines and visitors from search: plain HTML (no data loaded by script) naming each unit by its paper code (WPH11, WMA11…), with its topics and spec points (headings taken from the notes, each linked to its notes section), how many past-paper questions test each one, the latest questions on each topic, and every past paper and mark scheme. The home page's *Browse by unit* list links to them. Written by `python tools/build-unit-pages.py`: rerun it after the question bank, past papers or notes change. Do not edit the pages by hand. |
| `sitemap.xml`, `robots.txt` | For search engines: every page's address on ialprep.com (without .html, as Cloudflare serves them). Rebuild with `python tools/build-sitemap.py` after adding or renaming pages. Each static page also has a description and a canonical link; the question bank, past papers and report pages set theirs per subject in their scripts. `robots.txt` keeps search engines off `/paper-pdf/` so the unit and papers pages come up in search rather than the PDFs. |
| `assets/og-image.png`, `tools/seo_head.py`, `tools/make-og-image.py` | Link previews: `python tools/seo_head.py` writes Open Graph tags (title, description, address, picture) into every page from its own title and description, so links shared on WhatsApp, Discord or Reddit show a card. Rerun it after adding a page. |
| `404.html` | Shown, with status 404, for any address that has no page (without it Cloudflare would send the home page with status 200). |
| `tools/serve.py` | Local preview that serves addresses the way Cloudflare Pages does (`/questions`, `/pages/Motion`, redirects from `.html`, the 404 page). Links on the site leave out `.html`, so use this rather than `python -m http.server`: `python tools/serve.py 8782`. |
| `privacy.html` | The privacy notice: what the site keeps on the device and which outside services it loads. The site has no adverts; Google AdSense was removed on 8 November 2026. |
| `data/papers-<subject>.json` | One file per subject: every paper, its unit and the names of its question paper, mark scheme and extras on the subject's GitHub release. |
| `data/mock-<subject>.json` | What the mock paper maker works from: each Unit's marks and time, the study report's topic shares, the real papers as lists of slots, and every whole question that can go in a mock. Built by `tools/pipeline/build_mock_data.py`. |
| `js/mock-pick.js`, `js/mock.js` | The mock paper maker on the past papers page. `mock-pick.js` chooses the questions (no page work, so `tools/pipeline/check_mocks.cjs` can run it in Node); `mock.js` makes the paper and mark scheme PDFs in the browser and keeps them until Delete is pressed (the list in `localStorage`, the PDFs in IndexedDB). |
| `img/<subject>/<item id>.webp` | The screenshot for each item. |
| `pdf/<subject>/<page>.pdf`, `pdf/<subject>/unit-<n>.pdf` | The downloadable PDF of each notes page, and of each whole unit (its topic PDFs joined, so also without the interactive diagrams). The download icon beside each unit in the notes sidebar and on the notes home page links to the unit PDF. |
| `reports/<Subject> - Exam Study Report.md` | Each subject's study report, as Markdown: the share of the marks in each unit, each unit's topics as a share of that unit, and the spec points worth the most marks. Built by `python tools/reports/build-reports.py` from `data/<subject>.json`, with short spec-point names from `tools/reports/names.json`. |
| `report.html`, `js/report.js`, `css/report.css` | The study report page (`report.html?s=<subject>`): the report in the site's style, with a contents list that follows the section being read, and spec codes linked to their questions (`questions.html?s=<subject>&code=<code>`). |
| `js/sim.js`, `js/topics/*.js` | The interactive diagrams on the notes pages. Each `Sim.create` call gives a `title`, an `about` sentence saying what the diagram shows, and its controls; a control marked `more: true` is folded under *More settings* so only the main one to three controls show. The instruction under each diagram is the `<figcaption>` in the page. |
| `pages/*.html`, `notes/<subject>/*.html`, `js/notes-*.js`, `js/topics/`, `js/sim.js`, `js/script.js` | The revision notes (Physics in `pages/`, Chemistry and Biology in `notes/`). Their page lists are in `js/sitemap.js`. |
| `docs/design-notes-mosbyfiles.md` | Notes on the mosbyfiles.com design, kept for a possible later restyle. |
| `css/styles.css`, `css/bank.css`, `js/theme.js`, `js/motion.js` | Shared site styles, light and dark mode, print styles. |
| `tools/pipeline/` | The scripts that built the bank from the paper PDFs (see below). |
| `tools/notes/` | `build-pdfs.mjs`: makes `pdf/` from the notes pages with headless Chrome, then joins each unit's PDFs into one (`npm install` there first; `node build-pdfs.mjs --units` rebuilds only the unit PDFs). |
| `tools/papers/` | `build-manifest.mjs`: finds the question papers and mark schemes in the paper folders, writes `data/papers-<subject>.json` and stages the files for the GitHub releases. |

## What the paper codes mean

Pearson gives every exam paper a code such as `WPH11`. `W` marks an International Advanced Level paper. `PH` is Physics, `CH` is Chemistry and `BI` is Biology. The first digit is the specification: `1` is the current 2018 specification (`WPH11` to `WPH16`) and `0` is the previous 2013 specification (`WPH01` to `WPH07`). The last digit is the unit number: units 1 to 3 are the International AS, units 4 to 6 are the A2, and unit 7 (previous specification, 2017 only) was a practical examination. So `WPH11` is Physics Unit 1 on the current specification, and `WCH04` is Chemistry Unit 4 on the previous one. The question page shows this in words on every card and has a "What do paper codes like WPH11 mean?" panel.

Maths papers use a strand code instead of a subject code: `WMA` is Pure Mathematics (`WMA11` to `WMA14` are P1 to P4), `WFM` is Further Pure (`WFM01` to `WFM03` are FP1 to FP3), `WME` is Mechanics (M1 to M3), `WST` is Statistics (S1 to S3) and `WDM` is Decision (`WDM11` is D1); the earlier versions of P1, P2 and D1 are `WMA01`, `WMA02` and `WDM01`. On the question page these are grouped by strand and shown as, for example, "Pure Mathematics 1 (P1)".

## Item IDs

An item ID is `<unit code>_<session><year>-Q<question>[-<part>]`, for example `WPH11_Oct2019-Q13-a`. A bundled pair is `WPH01_Jan2014-Q14-a-b`. The topic folders on disk use the specification point code, for example `S7` (Physics) or `C6.5` (Chemistry). Practical-skills items use `P3.*` and `P6.*`, general skills use `G`, and content that is no longer on the 2018 specification uses `OFF`.

## How the bank was built

The scripts in `tools/pipeline/` were run in this order. They use absolute Windows paths, so edit the constants at the top of each script before re-running.

1. `build_taxonomy_<subject>.py` (physics, chemistry, biology, maths) reads the Pearson specification text and writes the topic list.
2. `process_papers.py <subject>` finds each question paper and its mark scheme, splits every paper into questions and parts at the "Total for Question N" lines, and crops a screenshot per part (question stem plus the part).
3. `make_agent_inputs.py <subject>` writes one text file per paper for the classifying agents, using `AGENT_PROMPT_<subject>.md` as the instructions. The agents assigned the topic and wrote the notes and prerequisites for each part.
4. `validate_cls.py <subject>` checks the agents' files against the splitter output.
5. `build_bank.py <subject>` joins the two, bundles "hence" parts, and files the screenshots into topic folders.
6. `report_data.py <subject>` produces the statistics used for the study report.
7. `export_site.py <subject>` writes `data/<subject>.json` and the compressed screenshots used by this site (only screenshots that are new or re-cut since the last export).

`recut_all.py <subject>`, `build_bank.py <subject>` and `reexport_changed.py write <subject>` (run `reexport_changed.py snapshot <subject>` first) re-cut every question screenshot with the page filter in `pagefilter.py` and write only the WebP files that changed to `img/`. The filter leaves out a page strip with none of the question on it: a blank page, the tail of the page before the question, a follow-on page of lines to write on, and a page of empty graph paper to plot on (a graph with labelled axes has text, so it stays; set `KEEP_GRAPH_PAPER = True` in `pagefilter.py` to keep the empty ones). `recut_all.py` reads `D:\IAL-drive-papersank` and `data/<subject>.json`; set `IALQ_SITE` to the repository folder if it is not `D:\IALqBank`.

`ms_index.py` finds each question's and part's rows in a mark scheme PDF (from the labels in the first column, "12(a)(ii)", "14a", "(b)"), `ms_crop.py` renders a question's rows from the PDF (PyMuPDF) as one picture, and `build_ms_crops.py <subject> [paper ...]` does it for every paper on the site, taking the mark scheme PDFs from `D:\IALqBank_D\_release\<subject>\<paper>_MS.pdf` (the staging folders `tools/papers/build-manifest.mjs` writes). It checks each part's printed marks against the item's marks and lists the ones that differ in `D:\IAL-drive-papersank\_snapshots\ms-report-<subject>.json`.

`recrop.py <subject>` re-cuts a subject's screenshots from the page images already rendered, keeping its questions and parts (so the classifications still match); run `build_bank.py` and `export_site.py` after it. It was used for two splitter fixes: Question 1 now starts at its number when a paper prints no "Answer ALL questions" line (most Maths papers and some Chemistry practicals had lost the start of Question 1), and Maths screenshots leave out the pages of ruled answer space, the page footers and the "Question N continued" headings.

`build_mock_data.py [subject ...]` writes `data/mock-<subject>.json` for the mock paper maker. Run it again after the bank, the mark scheme crops or a study report change (the shares come from the report's tables, so run `tools/reports/build-reports.py` first if the report should catch up with the bank). It needs the paper PDFs and `paper.json` files, so it runs here and not on the site. A mock is shaped on a real paper and filled with whole questions of the same marks in the same section; the parts of a question are joined from their screenshots, so it adds no image files. Run `python -E tools/pipeline/check_mock_stems.py --drop` after it: that takes out any question that would print wrongly (a stem shown twice, a page's barcode left in the middle). `node tools/pipeline/check_mocks.cjs [runs] [subject ...]` makes many mocks for every Unit and reports how closely they follow the report.

## Known limits

- Some papers in the source files were scanned with no text layer and are not in the bank (Physics: WPH06 Jun 2014, WPH01 Jun 2019, WPH05 Jun 2019, WPH06 Jun 2019; Chemistry: WCH06 Jan 2019, WCH03 Jun 2019; Biology: WBI06 Jun 2014; Maths: WME01 Jun 2014, WFM02 Jun 2015, WFM03 Jun 2015, WFM02 Jun 2019, WME03 Jun 2019, WST02 Jun 2019).
- Maths: the 2018 specification has no separate code for the Normal distribution in Statistics 1, so those questions are filed under S2.3.2. Some Decision 1 questions appear twice because the answer-book pages repeat the question text.
- A few mark schemes in the source files were missing, belonged to another paper, were scanned with no text to find the question by, or were examiners' reports, so those questions show a mark scheme written for the site (in the same table layout, and marked as written for the site) instead of a Pearson one.
- A few questions were split imperfectly where the paper's own layout is unusual.
- The topic sorting and the notes were written by AI and have not been checked by Pearson or by a teacher.

Questions and mark schemes are Pearson Edexcel material. This site is for study only.
