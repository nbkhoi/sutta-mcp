# Design Review 1: segment-id-in-get-sutta

**Artifact:** `specs/segment-id-in-get-sutta/design.md` (Status: Draft, 452 lines)
**Gate:** phase-review, scope artifact/design, series `design-review`, suffix 1
**Contract sha256:** ba1ed234114061d5296ae8847b9d5b17bae80938dbc3cc892205b75c53967249
**Reviewed:** 2026-10-02. I checked it against `requirements.md` (Reviewed; D1–D3 fixed), `reviews/requirements-review-1.md`, `src/index.ts` at `fc5c002`, the two predecessor designs, `specs/sutta-mcp-requirements.md`, the design template, the live SuttaCentral API, and the live SuttaCentral website.

**How I checked it.** I made a scratch copy outside the repo and applied every normative block exactly as written: N5-T, N1-A, N3-B, both N5-R lines, and G-1, G-2, G-3, L-1, L-2, M-1 and M-2 to copies of the three spec files. I extracted each block by its line range in `design.md`. I compiled the result with the repo's `tsconfig.json`. I ran it, and an unmodified HEAD build, through the stdio harness. Every one of the 12 runs had exactly one `"id":2` line. I deleted the scratch copy afterwards.

## Critical Findings

None.

## Warnings

### W1: The mitigation claimed for the `{lang}` shortcut is wrong. The AC-6 diff for N3-B passes on that shortcut, so the only check that catches it is the non-AC `snp1.8` check

**Where the design claims it.** The risk table (`design.md:443`) gives the mitigation for "`{lang}` lấy từ metadata thay vì từ điểm retry" as "N3-B nguyên văn (diff AC-6) và kiểm bổ sung `snp1.8`/`piyadassi`". §Testability then describes the AC-6 row as the net for the normative blocks: "Lưới thật là các diff nguyên văn ở trên" (`:344`).

**Why that net misses it.** The AC-6 vehicle for N3-B (`:137`, `:340`) is `awk '/^    let extracted = extractText/,/^    }$/'`. It runs on `src/index.ts` and on `specs/bilara-lang-param/design.md`, and then diffs the two results. That diff is **relative**: it only proves the two files agree with each other. It never compares either file with the N3-B text in *this* design.

Alternative D (`:424-427`) leaves N3-B untouched and computes the lang after the gate. That leaves both files in their HEAD state, so they still agree:

- AC-6 in requirements allows this case explicitly (`requirements.md:158`: "nếu không thay đổi, `git diff` không chạm khối đó ở cả hai phía").
- I built this drift: HEAD N3-B, plus `const servedLang = (suttaplex?.translations ?? []).find((t: any) => t.author_uid === translator)?.lang ?? "en";` placed before `const lines`. Everything else was as the design specifies.
- `tsc` exits 0.
- The N3-B awk diff is **empty**.
- `mn10`/`trush` still prints `…/mn10/gu/trush#`, so AC-3 passes. AC-1 and AC-2 pass too, because the first entry for each translator has the served lang (requirements-review-1 W1 table).
- Only `snp1.8`/`piyadassi` exposes it. That run printed `Deep link: https://suttacentral.net/snp1.8/en/piyadassi#…`.

So the shortcut is caught only by "Kiểm bổ sung ngoài AC" item 1 (`:378-383`). The AC-6 diff the design names does not catch it. N1-A and N5-T have the same relative-diff limit. It matters less there, because skipping N1-A entirely removes the IDs and AC-1 fails.

**Why it should be fixed.** A task planner who reads the risk table will think the requirements-level AC-6 diff already covers this shortcut. The `snp1.8` check could then be treated as redundant and dropped. That check is exactly what closes requirements-review-1 W1.

**Fix (pick one):**
- **(a)** Add an absolute diff to the AC-6 vehicle for each normative block. Extract each block from *this* `design.md` by its fence (for example, N3-B is the `ts` fence under `### N3-B bản mới`) and diff it against the same `awk` range in `src/index.ts`. A drift that touches neither side can then no longer pass.
- **(b)** Correct the risk-table row and the `:344` sentence to say that the `snp1.8` check is the **only** mechanical net for this risk. Also state that tasks must carry that check as a named verification step.

Option (a) costs three short commands and also catches an Alternative-A-style drift that the implementer copies consistently into both files.

## Suggestions

### S1: No FR/NFR coverage map, and NFR-1 is never mentioned

Each FR and NFR can be traced by reading the prose:
- FR-1 and FR-2 → N1-A, N5-R
- FR-3 → N5-R ("hai chuỗi tail")
- FR-4 → N3-B, N5-R
- FR-5 → `:222`
- FR-6 → AC-5 row
- FR-7 → the table at `:63-71` and G/L
- FR-8 → M-1, M-2
- NFR-2 → `:317`
- NFR-4 → `:230`
- NFR-5 → `:222`
- NFR-6 → `:191`
- NFR-7 → the grep table

NFR-1 ("`package.json` không đổi") never appears, and the AC-6 row (`:340`) leaves out the `package.json` clause of requirements AC-6. The change does not touch `package.json`, so nothing is at risk. A small table mapping each FR/NFR to its block or section would make the coverage checkable without reading the full 452 lines.

### S2: E-2 does not cover `bilara-lang-param/design.md:49` and `:55`, which say N1-A was not touched

E-2 (`:265-272`) calls the "11 dòng"/"12 dòng" figures and the diagram historical. It does not mention two other statements in that file:
- `:49`: "Thân `extractText()` — N1-A tiền nhiệm (19 dòng) | **Giữ nguyên từng byte.**"
- `:55`: "không khối N1 nào bị đụng"

Both are true for that spec's own change, but a reader could take them as the current state. One extra clause in E-2 would fix this, for example "…và các câu nói N1-A không đổi (19 dòng)…".

### S3: Fold the `snp1.8` case into requirements AC-3 the next time requirements are opened

The design handles requirements-review-1 W1 at the design level, because requirements are Reviewed and `warn_default=continue`. That is acceptable. For the record, every literal in that check is correct today:
- suttaplex `piyadassi` at index 11 (`en`, `segmented: false`) and index 27 (`lt`, `segmented: true`)
- no `translation_text` with no `lang` or with `?lang=en`
- `?lang=lt` gives 43 keys / 42 segments
- body line 1 is `[snp1.8:0.1] Suttų rinkinukas 1.8`
- tail is `[Hết văn bản — 42 đoạn]`

Moving the case into AC-3 later would let W1 above go back to a plain AC check.

## Re-review Boundary

Not applicable. This is the first report in the `design-review` series.

## Strengths

Every literal and self-assessment I re-measured was correct:

- **Code blocks compile and behave as claimed.**
  - N5-T, N1-A, N3-B and N5-R as written compile with `tsc` using the repo's `tsconfig.json`. They also compile with `--noUncheckedIndexedAccess` added, as `:95` says.
  - Diff shape on `src/index.ts`: 9 hunks, +20 / −10, as `:226` says.
  - The `-U0` output has 0 hits for `formatCitation|formatUnavailable|search_topic|get_sutta_meta|get_parallels|list_divisions|TOPIC_INDEX|DIVISIONS|z\.` or for the gate string.
- **The `[object Object]` risk the author raised is real and is mitigated.**
  - I put `truncated.join("\n")` back on `Segment[]`. It compiles clean, which confirms `:94`.
  - That drift is caught by the N5-R checks: `grep -c -F` of the `truncated.map(…)` line drops from 1 to 0, and `grep -c -F 'truncated.join'` rises from 0 to 1.
  - It would also be caught by the body-line-1 literal in AC-1.
- **Block sync (FR-7) checked on the applied copies.**
  - The awk diffs are empty at 20/20 (N1-A), 18/18 (N3-B) and 8/8 (N5-T).
  - The predecessor fences are where the G/L table says: G-1 at 51-58, G-2 at 123-143, L-1 at 110-124. The `**Requirements:**` line is at 6 and `**Tiền nhiệm:**` at 7.
  - M-1 and M-2 replace the lines at 308 and 174.
  - After the edits, AC-8 gives 0 / 1 / 2, as `:342` says.
- **Grep invariants after the change.** These match the table at `:346-354`:
  - `segmented` = 3
  - `sujato` = 3
  - translator-ID matcher (with `piyadassi`) = 0
  - gate = 1
  - `translation_text` = 1
  - `Object\.keys` = 2
  - ` as ` = 2
- **Harness literals (live, 2026-10-02) all match.**
  - AC-1: body lines 1/3/50, 50 lines, exactly 1 deep-link line, 0 `https://` in the body, 0 lines failing the regex, tail correct.
  - AC-2: `[dhp9:0] Chuyện Devadatta (Đề-bà-đạt-đa)`, `…/dhp1-20/vi/phantuananh#`, 0 hits for `[dhp1-20:` and for `dhp1-20/en/`.
  - AC-3: `de` with 200 segments, and `gu` with 230 segments and 0 hits for `/mn10/hi/trush`.
  - AC-4: 3 lines and 194 lines, last line `[mn10:47.4] …`, 0 lines starting with an empty-segment ID.
  - Extra check 2: body line 63 is `[mn10:18-23.1] …`; the widened regex gives 0 misses and the original regex gives 4.
  - Output sizes: +565 characters over 50 lines, and the header line is 124 characters (139 bytes).
  - The `max_segments: 3` sample output at `:196-210` matches byte for byte.
- **FR-2 baseline vehicle (closes requirements-review-1 W2).**
  - The live reference matches the new build including IDs.
  - After stripping the prefix it matches the new build again.
  - The new build with the prefix stripped matches the HEAD `fc5c002` build byte for byte, which confirms the bridge claim at `:371`.
- **FR-6.** The `minh_chau` and `indacanda` guard outputs are byte-identical between HEAD and the new build (`cmp`), and contain 0 of the forbidden strings, including `Deep link`.
- **AC-7.** I re-ran it with the same Chrome 154.0.8037.93, headless, using CDP and a 20-second wait. The table at `:394-401` reproduced exactly:
  - top 119/120/120/120
  - scrollY 2721/2010/3186/414
  - `refFocused` present on all four positive URLs
  - 0 `.segment` elements on `snp1.8/en/piyadassi`
  - the old roadmap form `mn10#mn10:13.1` drops its fragment
  - This reproduction is also headless, so the design's request for a manual check in a browser with a visible window (`:405`) still stands.
- **Requirements-review-1 Suggestions are closed as claimed.**
  - S1, hyphenated IDs: extra check 2 and the AC-7 row.
  - S2, no blank line in the header: `:51` and Alternative F.
  - S3, the `ExtractedText` type: N5-T with G-1 and its awk vehicle.
- **Design choices.** The alternatives are argued on measured grounds, and the Alternative D counter-example is real. `servedLang` is recorded at the one point where the served lang is known. The §"Đọc tối thiểu để implement" list keeps the five normative blocks easy to find.

## Summary

The design is correct and complete for every FR, NFR and AC. All four verbatim code blocks compile and produce exactly the outputs the design pins. The `[object Object]` drift compiles, as the design says, and is caught by the N5-R greps and by AC-1. The predecessor-spec and master-spec edits apply cleanly at the stated locations and satisfy AC-6 and AC-8. Every live literal I checked holds, including the full AC-7 browser table.

There is one Warning. The risk table credits the AC-6 N3-B diff with catching the "lang from metadata" shortcut. That diff only compares two files with each other, and a drift that leaves both at HEAD passes it. The `snp1.8` extra check is the only real net for this risk. Either make the block diffs absolute against this design, or say plainly that the `snp1.8` check is the only net and must become a named verification step in tasks.

**Verdict:** Approve with changes
