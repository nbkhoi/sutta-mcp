# Requirements Review 3: dynamic-search

**Reviewed artifact:** `specs/dynamic-search/requirements.md` (Draft, 2026-10-18, narrow fix after review 2)
**Gate:** phase-review, scope `artifact/requirements`, series `requirements-review`, report 3
**Contract sha256:** `5148c63967787c7f3d1cf01e678543fd412d43e1984cf5eb4b30e78cf87a4e0f`
**Inputs:** `specs/dynamic-search/reviews/requirements-review-2.md`, installed `node_modules/@modelcontextprotocol/sdk` 1.29.0, live `https://suttacentral.net/api/search/instant`
**Recorded user decisions (not findings):** Vietnamese keys are mapped to Pali/English terms and the API is always called; `search_topic` gets `match` and `page`.

## Verification performed (2026-10-18)

- **SDK prefix, read from the installed package:**
  - `dist/esm/server/mcp.js:178` throws ``new McpError(ErrorCode.InvalidParams, `Input validation error: Invalid arguments for tool ${toolName}: ${errorMessage}`)``.
  - `dist/esm/types.js:2031` has `super(\`MCP error ${code}: ${message}\`)`.
  - `types.js:167` sets `InvalidParams = -32602`.
  - The catch at `mcp.js:135-142` returns `createToolError(error.message)`.
  - The resulting prefix is `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`, which also matches what review 2 observed over stdio.
- **Live re-measure:** `query=vô ngã tướng&language=vi&limit=10&offset=0` returned HTTP 200, `suttaplex` `['sn22.59']`, `hits` `[]`, `total` 1.
- **`vô ngã tướng` is unmapped.** `grep -n 'tướng'` finds it only at line 327, so it is neither an FR-2 key nor in the §Ánh xạ table. FR-3 matches exact strings only (line 127), so the topic goes to FR-4 and is sent as-is.
- **NFD bytes:** `"vô ngã"` parses to `76 6f cc 82 20 6e 67 61 cc 83`, and NFC of that equals `vô ngã` = `76 c3 b4 20 6e 67 c3 a3`. Both byte strings on line 220 are correct. A per-line `unicodedata.is_normalized('NFC', …)` scan still finds no non-NFC line, as expected now that the NFD form is written as an ASCII escape.

## Re-review boundary

Admissible candidates for this pass:
- Review 2's W1–W3.
- The edited text at lines 26, 220, 327, 340 and 351.
- The new `R ≤ limit` sentence at line 65.
- Statements that depend on these edits: FR-16 (line 166), NFR-1 (line 184), FR-11/FR-18/FR-19 as exercised by AC-17, and the Assumptions footer item (line 357).

Status of review 2's findings:
- **W1 is resolved.**
  - AC-19 (line 340), line 26 and line 351 now all state the prefix `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:` (`grep -c 'MCP error -32602'` = 3).
  - No old `bắt đầu \`Input validation` phrasing remains.
  - FR-16 (line 166) still says "với `Input validation error`", which is a substring of the real text and therefore consistent.
  - Line 26 cites `types.js` without a line number. That is acceptable because the constructor is named.
- **W2 is resolved.**
  - AC-17's last clause (line 327) uses `{"topic":"vô ngã tướng","language":"vi","match":"content"}`, and its measurement note matches the live response exactly.
  - With `match=content`, page 1 has no results, so FR-11 applies, and FR-11(c) adds the "try another `match`" hint.
  - FR-18 content gives `h = 0`, so the footer is `Hết kết quả.`
  - Without the `h > 0` guard, `0 + 0 < 1` would print `Còn kết quả`, so the clause now really tests the guard.
- **W3 is resolved.** The NFD input on line 220 is an escaped JSON string, which no editor can normalise. The instruction "truyền nguyên văn vào harness" is explicit, and both byte strings and the decomposition note are correct. NFR-1's "input NFD" claim (line 184) is true again.
- **Line 65 addition (review 2 S1).** The `R ≤ limit` branch is correct:
  - `total = g` and `h ≤ g`.
  - On page 1, a false "còn" happens exactly when `h < g`, and the next page has `offset ≥ R`, so it is empty with `h = 0`.
  - This agrees with the "một trang rỗng cuối cùng" limit at line 357.
  - No regression.

Considered and discarded as out of scope:
- Review 2's S2–S5 (latency range, FR-11/FR-20 followed by a "còn" footer, line 44 index drift, vacuous AC-14 substrings). These were optional suggestions, are not part of this narrow fix, and were not touched by it.
- Line 44 and line 65 use `vô ngã`/`vi` (raw API, `total` 21) as an illustration even though `vô ngã` is mapped by FR-3. These lines describe raw API behaviour, not the tool path, and the text was settled in review 2.
- The Vietnamese mapping and the `match`/`page` design. These are recorded user decisions.

## Critical Findings

None

## Warnings

None

## Suggestions

- **S1: AC-17's `Maps to` (line 322) omits FR-11.** The edited last clause (line 327) checks the FR-11 output ("theo FR-11, gợi ý thử `match` khác") and FR-11(c). Adding FR-11 to the `Maps to` list keeps the traceability exact. This is optional: the omission predates this round, and the clause itself is now correct.

## Strengths

- Each fix replaced a wrong or vacuous literal with one that reproduces exactly from the installed SDK and the live API.
- The AC-17 clause now targets the single upstream branch (`total = len(suttaplex)` with empty `hits`) that the `h > 0` guard exists to handle, and records the measurement next to the expectation.
- The NFD fix removes the failure mode instead of restoring the literal. The escaped form cannot be normalised by an editor round, and the byte annotation lets a reader check it without tooling.
- The edits were local. No other requirement, AC or assumption changed meaning.

## Summary

All three Warnings from review 2 are resolved, and the replacement literals were re-verified against `@modelcontextprotocol/sdk` 1.29.0 and the live search API. The added `R ≤ limit` sentence is algebraically correct and consistent with the stated footer limits. No regression was found. One optional traceability suggestion remains.

**Verdict:** Approve
