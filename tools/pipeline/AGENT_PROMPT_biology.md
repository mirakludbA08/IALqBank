# Task: classify Biology IAL questions and write study notes

You are one of several parallel workers building a topic-organised question bank for Pearson Edexcel
International A Level (IAL) Biology. You get a list of paper IDs. For each paper:

1. Read the input file `D:\IAL-drive-papers\bank\biology\_in\<paper_id>.txt`.
   It lists every question (`## <question id> | <marks> marks`), its stem, each part (`PART a | id=...`)
   and then the full mark scheme text. Questions without parts appear as `(no parts) id=...`.
   Text can be imperfect: some lines are "decoded" text with spaces and numbers lost; read through it.
   For multiple-choice questions the mark scheme gives the correct letter. Biology mark schemes often
   list accepted answers separated by "/" or "(accept ...)" and use "ignore" and "do not accept".
2. Read the spec topic list once: `D:\IAL-drive-papers\spec\biology-taxonomy.txt`.
   Codes are `B<topic>.<point>` (for example `B3.4`). Practical papers (units WBI03/WBI13 and WBI06/WBI16)
   use `P3.planning`, `P3.implementation`, `P3.results`, `P6.planning`, `P6.implementation`,
   `P6.analysis` (P3 for WBI03/WBI13, P6 for WBI06/WBI16) as the primary code, with any B-code it tests
   in `also`. Older papers (units WBI01-WBI06) follow the older 2013 spec: map each to the closest 2018
   spec point. Use `G` (general skills: units, calculations, graph and data skills, statistics, not tied to
   one spec point) when no B-code fits. Use `OFF` only when the content is genuinely not on the 2018 spec
   (say why in `how_asked`).
3. Write `D:\IAL-drive-papers\bank\biology\_cls\<paper_id>.json` (create the folder if needed) as valid JSON:

```json
{
  "paper_id": "WBI12_Jun2021",
  "items": [
    {
      "id": "WBI12_Jun2021-Q17-a",
      "name": "Explain stomatal opening",
      "topic": "B4.5",
      "also": ["B4.4"],
      "marks": 4,
      "how_asked": "One sentence: format, command word (Describe/Explain/Calculate/Suggest/Evaluate...), and what is given (diagram, data table, graph, scientific article).",
      "ms_expectation": "One or two sentences: the marking points (named terms, linked steps, calculation method and unit), accepted alternatives, typical mark split, and whether the question is a level-of-response or QWC item.",
      "depends_on": [
        {"id": "WBI12_Jun2021-Q17-a", "name": "Explain stomatal opening", "why": "hence"}
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
- `how_asked` and `ms_expectation`: short and concrete, no padding. For multiple choice give the correct letter and the idea tested.
- `depends_on`: earlier parts or questions in the SAME paper that must be done first: a "hence" or "use your answer to (a)" part, an "otherwise" question, a part that reuses a table, graph, diagram or data from an earlier part. Each entry has the earlier item's `id`, its `name` (copy it from that item), and `why` (`hence`, `uses result`, `same data`, `otherwise`). Empty list if none. Do not list items that are merely in the same question with no real dependency.
- `hence`: true only when the wording explicitly builds on a previous part (the word "hence", "otherwise", "use your answer/value/result/graph from ...").
- If the mark scheme in the input clearly belongs to a different paper or is missing, say so in `ms_expectation` and give only what the question wording supports. Do not invent marking points.
- Do not edit any other files, and do not use Edit on your own output (write the whole file once). Do not run scripts. Only Read the inputs and Write the output JSON.
- When all your papers are written, reply with one line per paper: paper id, number of items. Nothing else.
