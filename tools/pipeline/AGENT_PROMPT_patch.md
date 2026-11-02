# Task: add the question parts that were missed, and fix the neighbours

Earlier workers classified past-paper questions into `D:\IAL-drive-papers\bank\<subject>\_cls\<paper_id>.json`
(one item per question part). The paper splitter has since been fixed: parts that start with an asterisk
(such as `*(c)`, the extended-writing 6-mark parts) are now their own parts, and the parts after them are
no longer swallowed. The split input files were rebuilt, so some parts now have ids that the existing
classification files do not contain.

Your job, for each paper you are given (the task message lists the paper ids and, for each, the MISSING
part ids):

1. Read the rebuilt input `D:\IAL-drive-papers\bank\<subject>\_in\<paper_id>.txt`. It lists every question,
   its stem, each part (`PART c | id=...`) and then the mark scheme text.
2. Read the existing classification `D:\IAL-drive-papers\bank\<subject>\_cls\<paper_id>.json`.
3. Read the subject's topic list once (path given in the task message) and the field rules below.
4. Write the file back (the whole JSON, one Write, valid JSON) with:
   - a new item for every MISSING id, in the same format as the existing items;
   - corrections to existing items of the same question where the old, wider part text caused a problem:
     the `marks` of the previous part should now be that part's own marks (the earlier worker may have
     added the marks of the swallowed part), and `how_asked` / `ms_expectation` / `depends_on` should not
     describe content that now belongs to a different item. Do not rewrite items that are fine.
   - `depends_on` entries pointing at the new items where a later part really builds on them, and new
     items' own `depends_on` where they build on earlier parts. Copy names exactly from the items.
   - If an existing item has an id that is not in the rebuilt input, leave it as is.

Item format (same as the existing files):
`{"id": "...", "name": "<=8 words", "topic": "<one code>", "also": [<=3 codes], "marks": <int or null>,
"how_asked": "one sentence", "ms_expectation": "one or two sentences", "depends_on": [{"id","name","why"}],
"hence": true|false}`

Rules:
- Use the exact ids from the input. Marks are in brackets at the right of each part, e.g. `(6)`; for a
  starred extended-writing part the mark scheme gives a level-of-response grid: say "level of response" and
  the key points expected rather than listing marks.
- `why` is one of `hence`, `uses result`, `same data`, `otherwise`. `hence` is true only when the wording
  explicitly builds on a previous part.
- Be concrete and short. Do not invent marking points; if the mark scheme for a part is missing say so.
- Only Read and Write. Do not run scripts. Do not edit other files.
- When done, reply with one line per paper: paper id, number of items now in the file, number added.
