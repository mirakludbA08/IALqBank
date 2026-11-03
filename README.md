# IALqBank

A topic-sorted bank of Pearson Edexcel **International AS and A Level** past-paper questions for Physics, Chemistry, Biology and Maths. Published at <https://mirakludba08.github.io/IALqBank/>.

Every item is one question part, saved as a screenshot cropped from the paper, with:

- its **topic**: Unit > Topic > specification point, following the 2018 Pearson specification (Maths: Pure, Further Pure, Mechanics, Statistics and Decision units, then topic and point);
- the **paper ID** and **paper location** (question paper, mark scheme and pages);
- a note on **how the question is asked** and what the **mark scheme rewards**;
- the **earlier questions that must be done first** (id and name), for example "hence" and "otherwise" parts.

Where a part says "hence" (or otherwise builds on the part before it), that part is saved **together with** the part it builds on as one item, and the two separate entries are removed from the list.

Sessions 2014 to 2024 only. 2025 papers (and anything newer) are left out. Older papers from the previous specification (for example WPH01-WPH07, WCH01-WCH07, WBI01-WBI06) are mapped to the closest 2018 specification point.

This is the `topic-bank` branch. The earlier per-paper question bank (questions with worked answers and their page images) was removed on this branch and replaced by the topic bank. The revision notes (`pages/`, `notes/` and their scripts and assets) come from `main`, with three changes on this branch: each page's interactive diagrams are collected in one "Interactive diagrams" section at the end of the page, each page has a downloadable PDF, and the pages are fixed up for iPhone and iPad.

## Downloads

- **Notes:** every notes page has a *Download PDF* link to `pdf/<subject>/<page>.pdf`. The PDFs are the page's print version: no sidebar, no interactive diagrams, every worked solution open, quick-check answers shown. Rebuild them with `tools/notes/build-pdfs.mjs` after changing a notes page. Printing a page from the browser (or *Save as PDF*) gives the same result.
- **Questions:** on the question bank, *Select for download* on any questions, then *Download QP* (the question screenshots) or *Download MS* (the mark-scheme notes for the same questions, numbered the same, with a link to the full mark scheme). The PDF is made in the browser with jsPDF, loaded from cdnjs when first needed. The selection is saved in the browser.
- **Past papers:** `papers.html?s=<subject>` lists every International A Level paper and mark scheme for Physics, Chemistry, Biology and Maths. The PDFs are assets on the repository's GitHub releases (one release per subject, tag `papers-<subject>`), because together they are too large for GitHub Pages. Downloading a question paper puts it in the done list; *Mark done* does it by hand. The done list is saved in the browser.

## Getting around and studying

- **Navigation bar:** every page has the same bar along the top. Each subject's menu opens a panel with the question bank's Units, the notes Unit by Unit, the past papers, the study report and the paper-code guide. On a phone the bar has a *Menu* button that opens the subjects as a full-screen list. The menus come from `js/sitemap.js`, which is also where the notes pages are listed.
- **Progress:** the question bank's topic tree shows how many questions are done in every Unit, topic and spec point (with a bar under each Unit); the landing page and the menus show it per subject and per Unit. The *Show* filter lists all questions, the ones not done yet, the done ones, the review-later list or the ones selected for download.
- **Keyboard shortcuts** (question bank): `J` / `K` next and previous question, `D` done, `R` review later, `S` select for download, `M` mark-scheme notes, `/` search, `?` the list.
- **Continue where you left off:** the question bank saves the topic and question you were on. *Continue* in the bar, the landing page and the bank itself take you back. The topic is also in the address (`?t=`), so reloading, sharing or pressing Back keeps it; menu links open a Unit with `?unit=`.

Everything above is saved in the browser only (localStorage).

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `js/landing.js` | Landing page, with "Pick up where you left off" and each subject's progress. |
| `js/nav.js`, `css/nav.css`, `js/sitemap.js` | The navigation bar on every page, and the site map it is built from. |
| `questions.html`, `js/topicbank.js`, `css/topicbank.css` | The topic bank page: topic tree, search, filters, question cards, and the QP / MS download of selected questions. |
| `papers.html`, `js/papers.js`, `css/papers.css` | The past papers page: every paper by session, downloads and the done list. |
| `data/<subject>.json` | One file per subject: the specification topic list and every item with its notes, prerequisites and paper location. |
| `data/papers-<subject>.json` | One file per subject: every paper, its unit and the names of its question paper, mark scheme and extras on the subject's GitHub release. |
| `img/<subject>/<item id>.webp` | The screenshot for each item. |
| `pdf/<subject>/<page>.pdf` | The downloadable PDF of each notes page. |
| `reports/<Subject> - Exam Study Report.md` | The whole-exam study report for each subject. |
| `pages/*.html`, `notes/<subject>/*.html`, `js/notes-*.js`, `js/topics/`, `js/sim.js`, `js/script.js` | The revision notes (Physics in `pages/`, Chemistry and Biology in `notes/`). Their page lists are in `js/sitemap.js`. |
| `docs/design-notes-mosbyfiles.md` | Notes on the mosbyfiles.com design, kept for a possible later restyle. |
| `css/styles.css`, `css/bank.css`, `js/theme.js`, `js/motion.js` | Shared site styles, light and dark mode, print styles. |
| `tools/pipeline/` | The scripts that built the bank from the paper PDFs (see below). |
| `tools/notes/` | `build-pdfs.mjs`: makes `pdf/` from the notes pages with headless Chrome (`npm install` there first). |
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
7. `export_site.py <subject>` writes `data/<subject>.json` and the compressed screenshots used by this site.

## Known limits

- Some papers in the source files were scanned with no text layer and are not in the bank (Physics: WPH06 Jun 2014, WPH01 Jun 2019, WPH05 Jun 2019, WPH06 Jun 2019; Chemistry: WCH06 Jan 2019, WCH03 Jun 2019; Biology: WBI06 Jun 2014; Maths: WME01 Jun 2014, WFM02 Jun 2015, WFM03 Jun 2015, WFM02 Jun 2019, WME03 Jun 2019, WST02 Jun 2019).
- Maths: the 2018 specification has no separate code for the Normal distribution in Statistics 1, so those questions are filed under S2.3.2. Some Decision 1 questions appear twice because the answer-book pages repeat the question text.
- A few mark schemes in the source files were missing, belonged to another paper, or were examiners' reports, so some mark-scheme notes are inferred from the question and say so.
- A few questions were split imperfectly where the paper's own layout is unusual.
- The topic sorting and the notes were written by AI and have not been checked by Pearson or by a teacher.

Questions and mark schemes are Pearson Edexcel material. This site is for study only.
