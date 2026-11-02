# IALqBank

A topic-sorted bank of Pearson Edexcel **International AS and A Level** past-paper questions for Physics and Chemistry. Biology and Maths are not in the bank yet: their International A Level papers have not been added. Published at <https://mirakludba08.github.io/IALqBank/>.

Every item is one question part, saved as a screenshot cropped from the paper, with:

- its **topic**: Unit > Topic > specification point, following the 2018 Pearson specification;
- the **paper ID** and **paper location** (question paper, mark scheme and pages);
- a note on **how the question is asked** and what the **mark scheme rewards**;
- the **earlier questions that must be done first** (id and name), for example "hence" and "otherwise" parts.

Where a part says "hence" (or otherwise builds on the part before it), that part is saved **together with** the part it builds on as one item, and the two separate entries are removed from the list.

Sessions 2014 to 2024 only. 2025 papers are left out. Older WPH01-WPH07 and WCH01-WCH07 papers are mapped to the closest 2018 specification point.

This is the `topic-bank` branch. The earlier per-paper question bank (questions with worked answers and their page images) was removed on this branch and replaced by the topic bank. The revision notes (`pages/`, `notes/` and their scripts and assets) are unchanged from `main`.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Landing page. |
| `questions.html`, `js/topicbank.js`, `css/topicbank.css` | The topic bank page: topic tree, search, filters, question cards. |
| `data/<subject>.json` | One file per subject: the specification topic list and every item with its notes, prerequisites and paper location. |
| `img/<subject>/<item id>.webp` | The screenshot for each item. |
| `reports/<Subject> - Exam Study Report.md` | The whole-exam study report for each subject. |
| `pages/*.html`, `notes/<subject>/*.html`, `js/notes-*.js`, `js/topics/`, `js/sim.js`, `js/script.js` | The revision notes (Physics in `pages/`, Chemistry and Biology in `notes/`), exactly as on `main`. |
| `css/styles.css`, `css/bank.css`, `js/theme.js`, `js/motion.js` | Shared site styles, light and dark mode. |
| `tools/pipeline/` | The scripts that built the bank from the paper PDFs (see below). |

## What the paper codes mean

Pearson gives every exam paper a code such as `WPH11`. `W` marks an International Advanced Level paper. `PH` is Physics and `CH` is Chemistry. The first digit is the specification: `1` is the current 2018 specification (`WPH11` to `WPH16`) and `0` is the previous 2013 specification (`WPH01` to `WPH07`). The last digit is the unit number: units 1 to 3 are the International AS, units 4 to 6 are the A2, and unit 7 (previous specification, 2017 only) was a practical examination. So `WPH11` is Physics Unit 1 on the current specification, and `WCH04` is Chemistry Unit 4 on the previous one. The question page shows this in words on every card and has a "What do paper codes like WPH11 mean?" panel.

## Item IDs

An item ID is `<unit code>_<session><year>-Q<question>[-<part>]`, for example `WPH11_Oct2019-Q13-a`. A bundled pair is `WPH01_Jan2014-Q14-a-b`. The topic folders on disk use the specification point code, for example `S7` (Physics) or `C6.5` (Chemistry). Practical-skills items use `P3.*` and `P6.*`, general skills use `G`, and content that is no longer on the 2018 specification uses `OFF`.

## How the bank was built

The scripts in `tools/pipeline/` were run in this order. They use absolute Windows paths, so edit the constants at the top of each script before re-running.

1. `build_taxonomy_physics.py` and `build_taxonomy_chemistry.py` read the Pearson specification text and write the topic lists.
2. `process_papers.py <subject>` finds each question paper and its mark scheme, splits every paper into questions and parts at the "Total for Question N" lines, and crops a screenshot per part (question stem plus the part).
3. `make_agent_inputs.py <subject>` writes one text file per paper for the classifying agents, using `AGENT_PROMPT_<subject>.md` as the instructions. The agents assigned the topic and wrote the notes and prerequisites for each part.
4. `validate_cls.py <subject>` checks the agents' files against the splitter output.
5. `build_bank.py <subject>` joins the two, bundles "hence" parts, and files the screenshots into topic folders.
6. `report_data.py <subject>` produces the statistics used for the study report.
7. `export_site.py <subject>` writes `data/<subject>.json` and the compressed screenshots used by this site.

## Known limits

- Some papers in the source files were scanned with no text layer and are not in the bank (Physics: WPH06 Jun 2014, WPH01 Jun 2019, WPH05 Jun 2019, WPH06 Jun 2019; Chemistry: WCH06 Jan 2019, WCH03 Jun 2019).
- A few mark schemes in the source files were missing, belonged to another paper, or were examiners' reports, so some mark-scheme notes are inferred from the question and say so.
- A few questions were split imperfectly where the paper's own layout is unusual.
- The topic sorting and the notes were written by AI and have not been checked by Pearson or by a teacher.

Questions and mark schemes are Pearson Edexcel material. This site is for study only.
