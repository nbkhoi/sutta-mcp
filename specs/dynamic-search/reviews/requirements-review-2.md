# Requirements Review 2: dynamic-search

**Reviewed artifact:** `specs/dynamic-search/requirements.md` (Draft, 2026-10-18, reopened after review 1)
**Gate:** phase-review, scope `artifact/requirements`, series `requirements-review`, report 2
**Contract sha256:** `5148c63967787c7f3d1cf01e678543fd412d43e1984cf5eb4b30e78cf87a4e0f`
**Inputs:** `specs/dynamic-search/reviews/requirements-review-1.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts` @ `40846bb`, `AGENTS.md`, template `requirements.md.tmpl`, installed `node_modules/@modelcontextprotocol/sdk` 1.29.0 and `zod` 3.25.76
**Recorded user decisions (not findings):** Vietnamese keys are mapped to Pali/English terms and the search API is always called; `search_topic` gets a `match` parameter and pagination. The parameter names, defaults and semantics were reviewed.

## Verification performed (2026-10-18)

- **SDK behaviour, run rather than read.** I registered the proposed schema (`match: z.enum(["title","content","all"]).default("all")`, `page: z.number().int().min(1).max(10000).default(1)`) on a throwaway `McpServer` from the installed SDK and drove it over stdio:
  - `tools/list` emits `"match":{"type":"string","enum":["title","content","all"],"default":"all"}` and `"page":{"type":"integer","minimum":1,"maximum":10000,"default":1}`. The AC-14 literals hold.
  - The handler never ran for `match` `both`/`Title` or for `page` `0`, `-1`, `1.5`, `10001`, `"2"`, `1e21`. It ran for `{}` (defaults `all`/`1`) and for `2.0`.
  - Every rejected call returned `isError: true` with text that starts with **`MCP error -32602: Input validation error: Invalid arguments for tool search_topic: [`** (see W1).
- **Upstream** `instant_search.py` (`main`): `calculate_total` is at `:348-355`, exactly as line 44 describes. `process_search_results` (`:190`) computes `current_page_total` *before* `remove_hits_if_uid_in_suttaplexs` and calls `lookup_dictionary` *after* `calculate_total`. `R` comes from `fetch_record_count` (`:432`), which takes no offset. `view.py:19` reads `offset` and `view.py:22` does the `+` replacement.
- **FR-18 checked algebraically and live.** When `R > limit`, `off + h < total` ⟺ `off + g < R`. Because `g ≤ limit`, this never misses a remaining document, and the next page then has zero documents and `h = 0`, so the rule produces at most one false "còn". When `R ≤ limit`, `total = g` and `h ≤ g`. A false "còn" happens only if some of the page's hits were removed, and the next page is empty with `h = 0` (see S1). `total = len(suttaplex)` arises only when `g = 0`, so the `h > 0` guard catches exactly that case. Live, with `mindfulness`/`en`:
  - `offset` 1450: `h` 9, `total` 1461, so 1459 < 1461 and the rule reports "còn".
  - `offset` 1460: `h` 0, `total` 1460, so the page follows FR-20 and the rule reports "Hết".
  - `offset` 1470 and 99990: `h` 0, HTTP 200. `offset` 99990 took 4.1 s.
- **Live literals re-measured** (`limit=10`, with my own FR-6/FR-7 implementation):
  - `mindfulness`/`en`: `|T|` 32, with `T[0]` `an1.575-615`, `dn22`/`mn10` at 11/12, and `uvs15`/`vb7` last. `offset` 0 gives 8 hits (`an1.296-305` … `an3.33`). `offset` 10 gives 5 hits starting at `an3.33`. `offset` 30 gives 6 hits.
  - `satipatthana`/`en`: `T` = `an4.274, mn10, sn43.5`, and `an8.19` is `Pahārādasutta` / `Mahāsaṅgīti Tipiṭaka Buddhavasse 2500` / `pli`.
  - `metta`/`en`: `sa264` `小土塼` `Bhikkhu Anālayo` `en`, and `cnd8` with `acronym`/`author` null and the name `Exposition of the Questions of the Student  Mettagū` after trim.
  - `three jewels`/`en`: `sa107` `長者` `Bhikkhu Anālayo`.
  - `nibbana`: `T[0]` is `an4.179`, with the dictionary hit at the top on `offset` 0 and 10.
  - `anatta`: `T[0]` is `an6.100`.
  - `xyzzyqq`: `total` 0. `foo:bar`: `Unknown filter: "foo:"`.
  - `vô ngã`/`vi`: 21/0, `total` 21.
- **Code and master-spec anchors.** These all resolve: `src/index.ts` `:10`, `:30`, `:35-97`, `:99-108`, `:142-155`, `:192-229`, `:217-226`, and `specs/sutta-mcp-requirements.md` `:143`, `:252-259`, `:272`, `:284`, `:290-297`. `grep -c 'sn47.1, dn22'` currently gives 1, so the AC-14 clause that expects 0 is not vacuous.

## Re-review boundary

The candidates in scope are:
- Review 1's W1–W3 and S1–S5.
- New FR-16..FR-20, AC-15..AC-19, and the changed FR-1, FR-6, FR-9, FR-10, FR-11, FR-13, FR-18, NFR-4 and NFR-5.
- The new §Phân trang section and its "Hệ quả" derivation (lines 51-65).
- Assumptions (lines 343-367).
- Regressions in ACs that were already there.

Status of review 1's findings:
- **W1 (empty `name`)** is resolved. FR-9.1 (line 144) adds a `name` → `root_name` → bare `**{acronym}**` fallback, and AC-15 pins the `sa264`, `sa107` and `cnd8` lines, all re-measured.
- **W2 (attribution)** is resolved. FR-9.2 adds the `Text: {author} ({lang})` line. The Attribution assumption (line 360) says why the label is `Text` (Pali hits carry an edition, not a translator) and why title matches stay sutta-level citations. AC-7 and AC-15 pin it.
- **W3 (AC-5 negation-only)** is resolved. AC-5 (lines 236-237) now requires no `isError`, a `Tìm thấy` prefix, and the `an4.179`/`an6.100` URLs.
- **S1–S5** are all applied: line 17, FR-15 together with AC-14's `sn47.1, dn22` count, the AC-14 substrings, the FR-4 NFC step, and the line 352 note.

Considered and discarded as out of scope:
- The decision to map and always call the API. This is a recorded user decision.
- Whether `match`/pagination should exist at all. Also a recorded user decision.
- Q2 as a product choice. It is still correctly an open, user-owned question with a stated default (lines 361 and 371).

## Critical Findings

None

## Warnings

**W1: AC-19, line 26 and line 351 state the wrong prefix for the SDK validation error, so AC-19 fails for every conforming implementation.**
- AC-19 (line 340) requires the text to "bắt đầu `Input validation error: Invalid arguments for tool search_topic`".
- Line 26 asserts the same prefix, and line 351 lists it under VERIFIED.
- In the installed SDK, `validateToolInput` throws `new McpError(ErrorCode.InvalidParams, \`Input validation error: …\`)` (`node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:178`). The `McpError` constructor prepends `MCP error ${code}: ` (`dist/esm/types.js:2031`). The catch block at `mcp.js:141` passes `error.message` to `createToolError`.
- Measured: all 7 AC-19 inputs return `MCP error -32602: Input validation error: Invalid arguments for tool search_topic: [ …`.

FR-16 (line 166) is unaffected because it only says "với `Input validation error`". Fix: in AC-19 and line 26, say "starts with `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`" or "contains `Input validation error: Invalid arguments for tool search_topic`", and correct line 351 to match.

**W2: The last clause of AC-17 uses a topic that FR-3 maps, so it can never reach FR-11.**
- AC-17 (line 327) expects `{"topic":"vô ngã","language":"vi","match":"content"}` to follow FR-11 and end with `Hết kết quả.`. That assumes the raw `vô ngã` is sent, which is the 21/0 response described on line 65.
- But `vô ngã` is one of the 14 FR-2 keys, so FR-3 sends the mapped term instead.
- Both candidates in the mapping table (line 101) have content hits with `language=vi`. Re-measured: `anatta`/`vi` gives `h` 9 and `|C|` 9, and `not-self`/`vi` gives `h` 6 and `|C|` 6. With either one the output starts with `Tìm thấy`, and the clause fails.
- The clause is meant to test the `h > 0` guard (`total` falls back to `len(suttaplex)` while `hits` is empty), and that guard is otherwise unexercised.

Fix: use an unmapped topic that matches titles only. Measured: `{"topic":"vô ngã tướng","language":"vi"}` gives `suttaplex` `[sn22.59]`, `hits` empty and `total` 1. That is exactly the fallback case: without the guard, `0 + 0 < 1` would print "còn". With `match=content` it then follows FR-11 and ends with `Hết kết quả.`. With the default `match=all` it would be a good positive case for the guard: 1 `URL:` line (`sn22.59`) and `Hết kết quả.`.

**W3 (regression): the NFD case in AC-3 is no longer NFD, so it passes trivially.**
- AC-3 (line 220) lists "dạng NFD `{"topic":"vô ngã"}`". Review 1 confirmed that literal was really NFD in the earlier draft.
- In the current file, `unicodedata.is_normalized('NFC', …)` returns True for all three AC-3 topics, and **no line in the file is non-NFC**. The edit round normalised it.
- The "NFD" input is now byte-identical to the reference `{"topic":"vô ngã"}`, so the FR-3 NFC step has no runtime check. The code-read clause on line 222 covers only the FR-4 branch.
- NFR-1 (line 184) still claims the harness covers "input NFD".

Fix: restore a real NFD literal and make it robust to future editor or tool normalisation. Write it as an escaped JSON string, `{"topic":"vô ngã"}`, which the harness passes through unchanged and which no editor will normalise. Alternatively, say how the NFD form is to be generated (for example `python3 -c 'import unicodedata;print(unicodedata.normalize("NFD","vô ngã"))'`).

## Suggestions

- **S1: The FR-18 derivation (line 65) covers only `R > limit`.** When `R ≤ limit`, upstream uses `total = g`. A page-1 response whose merged hits partly overlap `suttaplex` (`h < g`) then reports "còn", and page 2 is empty. The outcome stays inside the stated limit of "one empty last page" (line 357), but the text claims the derivation from the formula without that branch. Add one sentence.
- **S2: The latency range has been exceeded.** Lines 49, 191 and 197 cap the measured worst case at 13.2 s. Today `mindfulness`/`offset` 0 took 13.3 s and `offset` 1450 took 13.4 s. `sleep 20` still covers this. Widen the stated range or say "≈13 s".
- **S3: FR-11 and FR-20 can be followed by a "còn" footer.** `h` counts articles (line 172), so a page whose hits are all articles prints `Không tìm thấy sutta nào …` (FR-11) and then `Còn kết quả: … page=2`. That is correct, since later pages may hold suttas, but it reads as a contradiction to the caller. Consider stating it in FR-11, or wording FR-11 as "trang 1 không có sutta".
- **S4: Some of line 44's `total` variation is index drift, not the formula.** With `g = h = 0`, `total = R` directly. Live, `offset` 1460 gives 1460 while `offset` 1470 and 99990 give 1462, and `fetch_record_count` does not depend on offset. FR-18 reads `total` from a single response, so the rule is unaffected. However, line 44 presents 1460/1461/1462 as products of the formula. A half-sentence would stop design treating the formula as the only source of variation.
- **S5: Some AC-14 substrings are close to vacuous.** `all`, `title`, `content` and `page` (line 298) will appear in almost any wording. `Anh/Pali` and `SuttaCentral` do the real work. Consider a substring that only the `match` description would contain.

## Strengths

- All three warnings from review 1 are fixed with mechanical ACs whose literals reproduced exactly, including the internal double space in the `cnd8` name and the `(pli)` edition line for `an8.19`.
- The pagination section is built on measurement, and the measurements reproduce:
  - The title page is cut locally from `suttaplex`, which does not change with `offset`.
  - The content page uses `offset`.
  - Cross-page duplication is admitted, not hidden (`an3.33` repeats).
- FR-18 is honest about its two failure modes (line 357). Its central claim, that it never misses a remaining document within a response, holds against upstream `calculate_total`.
- Counting `h` as hits without `category` matches upstream exactly, because `lookup_dictionary` runs after `calculate_total`.
- The parameter design fits the installed SDK. The JSON schema matches AC-14 literally. `page` bounds 1–10000 and `match` case-sensitivity are enforced before the handler runs, so the claim of zero requests for invalid input holds. The 10000 cap has a stated, measured reason.
- The constraints are kept consistent:
  - NFR-4 and FR-1 agree on at most one request for every `match`/`page`.
  - NFR-5 forbids cross-call state, and FR-6/FR-18 depend only on the current response.
  - FR-10 and FR-19 never print `total`.
  - NFR-6 bans `/define/` and the `?`/`null` links.
- `match=all` is coherent: title page `p` plus content page `p`, at most 20 results, and only content once the title pages run out. The rejected 5+5 and sequential alternatives are argued (line 355). AC-16/AC-17/AC-18 pin each mode at page boundaries (title pages 4/5, content pages 146→147 and 148, all page 4/5), and the footer values are derived correctly.

## Summary

Every finding from review 1 is resolved. The new `match`/pagination requirements are consistent with each other, with the constraints of at most one request, no state, no cache and a link to the source, and with upstream behaviour. The FR-18 next-page rule is correct and its limits are stated honestly. Three Warnings remain, and each is an AC that cannot verify what it claims:
- W1: AC-19 pins an error prefix the installed SDK never produces.
- W2: the last clause of AC-17 uses a mapped topic and so can never reach FR-11.
- W3: the AC-3 NFD input was normalised to NFC during the edit round.

All three are local literal fixes, with measured replacements given above. None of them changes a requirement.

**Verdict:** Approve with changes
