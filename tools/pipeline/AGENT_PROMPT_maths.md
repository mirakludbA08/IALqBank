# Task: classify Maths IAL questions and write study notes

You are one of several parallel workers building a topic-organised question bank for Pearson Edexcel
International A Level (IAL) Mathematics (Pure, Further Pure, Mechanics, Statistics and Decision units).
You get a list of paper IDs. For each paper:

1. Read the input file `D:\IAL-drive-papers\bank\maths\_in\<paper_id>.txt`.
   It lists every question (`## <question id> | <marks> marks`), its stem, each part (`PART a | id=...`)
   and then the full mark scheme text. Questions without parts appear as `(no parts) id=...`.
   Maths text is often imperfect: fractions, powers, roots, integrals and Greek letters can be missing or
   scrambled, and some lines are "decoded" text with spaces and numbers lost. Reconstruct the question
   from what is there plus the mark scheme; do not guess numbers you cannot see.
2. Read the spec topic list once: `D:\IAL-drive-papers\spec\maths-taxonomy.txt`.
   Codes are `<unit>.<topic>.<point>` such as `P1.4.2` (Pure 1, topic 4 Differentiation, point 2) or
   `FP2.5.1`. The unit comes from the paper code: WMA11/WMA01 = P1, WMA12/WMA02 = P2, WMA13 = P3,
   WMA14 = P4, WFM01 = FP1, WFM02 = FP2, WFM03 = FP3, WME01 = M1, WME02 = M2, WME03 = M3, WST01 = S1,
   WST02 = S2, WST03 = S3, WDM11/WDM01 = D1. Normally use a code from that paper's own unit, but a part may
   test content from an earlier unit (for example integration in a Mechanics question): then use the
   code that best names the skill, wherever it sits, and put the unit's own topic in `also` if useful.
   Older papers (WMA01, WMA02, WDM01 and others from before 2018) follow the previous spec: map each to the
   closest point of the current list. Use `G` (general skills: arithmetic, algebra, units, calculator use,
   exact answers) only when no code fits. Use `OFF` only when the content is genuinely not on the 2018
   spec (say why in `how_asked`).
3. Write `D:\IAL-drive-papers\bank\maths\_cls\<paper_id>.json` (create the folder if needed) as valid JSON:

```json
{
  "paper_id": "WMA12_Jun2021",
  "items": [
    {
      "id": "WMA12_Jun2021-Q7-b",
      "name": "Sum to infinity of geometric series",
      "topic": "P2.4.5",
      "also": ["P2.4.4"],
      "marks": 3,
      "how_asked": "One sentence: format, command word (Find/Show that/Prove/Hence find/Solve/Sketch...), and what is given.",
      "ms_expectation": "One or two sentences: the mark scheme pattern, using the scheme's own notation (M1 method, A1 accuracy, B1 independent mark, dM1 dependent method, ft follow-through, awrt, cso), the key step each mark needs, and common ways marks are lost.",
      "depends_on": [
        {"id": "WMA12_Jun2021-Q7-a", "name": "Common ratio of a geometric series", "why": "hence"}
      ],
      "hence": true
    }
  ]
}
```

Rules:
- Exactly one item per id in the input: every PART id, or the question id for `(no parts)` questions. Use the ids exactly.
- `name`: at most 8 words, descriptive, distinct within the paper.
- `topic`: one primary code. `also`: 0-3 secondary codes. `marks`: marks for that part if you can see them (brackets at the right, e.g. `(5)`), else the question's marks for a single-part question, else null.
- `how_asked` and `ms_expectation`: short and concrete, no padding.
- `depends_on`: earlier parts or questions in the SAME paper that must be done first: a "Hence" or "use your answer to (a)" part, an "Otherwise" question, a part that reuses a function, curve, vector, diagram or result from an earlier part. Each entry has the earlier item's `id`, its `name` (copy it from that item), and `why` (`hence`, `uses result`, `same data`, `otherwise`). Empty list if none. Do not list items that are merely in the same question with no real dependency. Maths papers have many "hence" chains: check each part for them.
- `hence`: true only when the wording explicitly builds on a previous part (the word "hence", "otherwise", "use your answer/value/result from ...", "using your answer to part (a)").
- If the mark scheme in the input clearly belongs to a different paper or is missing, say so in `ms_expectation` and give only what the question wording supports. Do not invent marking points.
- Do not edit any other files, and do not use Edit on your own output (write the whole file once). Do not run scripts. Only Read the inputs and Write the output JSON.
- When all your papers are written, reply with one line per paper: paper id, number of items. Nothing else.
