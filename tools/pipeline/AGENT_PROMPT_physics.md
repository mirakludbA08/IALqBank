# Task: classify Physics IAL questions and write study notes

You are one of several parallel workers building a topic-organised question bank for Pearson Edexcel
International A Level (IAL) Physics. You get a list of paper IDs. For each paper:

1. Read the input file `D:\IAL-drive-papers\bank\physics\_in\<paper_id>.txt`.
   It lists every question (`## <question id> | <marks> marks`), its stem, each part (`PART a | id=...`)
   and then the full mark scheme text. Questions without parts appear as `(no parts) id=...`.
   Text can be imperfect: some lines are "decoded" text with spaces and numbers lost; read through it.
   For multiple-choice questions the mark scheme gives the correct letter.
2. Read the spec topic list once: `D:\IAL-drive-papers\spec\physics-taxonomy.txt`.
   Codes are `S<number>` (spec point). Practical papers (units WPH03/13 and WPH06/16) use
   `P3.planning`, `P3.implementation`, `P3.results`, `P6.planning`, `P6.implementation`, `P6.analysis`
   (use P3 for WPH03/WPH13, P6 for WPH06/WPH16) as the primary code, with any S-number it tests in `also`.
   Older papers (units WPH01-WPH07) follow the older 2013 spec: map each to the closest 2018 spec point.
   Use `G` (general skills: SI units and prefixes, significant figures, graph skills, measurement and
   uncertainty not tied to one spec point) when no S-number fits. Use `OFF` only when the content is
   genuinely not on the 2018 spec (say why in `how_asked`).
3. Write `D:\IAL-drive-papers\bank\physics\_cls\<paper_id>.json` (create the folder if needed) as valid JSON:

```json
{
  "paper_id": "WPH11_Oct2019",
  "items": [
    {
      "id": "WPH11_Oct2019-Q13-a",
      "name": "Projectile range, golf shot",
      "topic": "S7",
      "also": ["S5", "S1"],
      "marks": 5,
      "how_asked": "One sentence: format, command word (Calculate/Deduce/Explain/Show that...), and what is given.",
      "ms_expectation": "One or two sentences: the marking points (method, substitution, answer with unit), accepted alternatives, typical mark split.",
      "depends_on": [
        {"id": "WPH11_Oct2019-Q13-a", "name": "Projectile range, golf shot", "why": "hence"}
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
- `depends_on`: earlier parts or questions in the SAME paper that must be done first: a "hence" or "use your answer to (a)" part, an "otherwise" question, a part that reuses a value or graph from an earlier part. Each entry has the earlier item's `id`, its `name` (copy it from that item), and `why` (`hence`, `uses result`, `same data`, `otherwise`). Empty list if none. Do not list items that are merely in the same question with no real dependency.
- `hence`: true only when the wording explicitly builds on a previous part (the word "hence", "otherwise", "use your answer/value/result/graph from ...").
- Do not invent content not supported by the paper or its mark scheme. If a mark scheme cannot be found for a part, say so in `ms_expectation`.
- Do not edit any other files. Do not run scripts. Only Read the two inputs and Write the output JSON.
- When all your papers are written, reply with one line per paper: paper id, number of items. Nothing else.
