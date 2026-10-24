# Requirements review 2: search-api-passthrough

**Artifact:** `specs/search-api-passthrough/requirements.md` (Draft, 2026-10-23, revised after review 1)
**Upstream checked:** `clarifications.md`, `reviews/requirements-review-1.md`, `specs/dynamic-search/requirements.md`, `specs/search-unit-tests/requirements.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`, AGENTS.md, template `requirements.md.tmpl`
**Reviewed:** 2026-10-23
**Scope:** re-review after reopen. Every review 1 finding (W1–W5, S1–S5) is checked, and the whole artifact is read again. The user decisions dated 2026-10-23 and the answers to C1–C11 are not reviewed.

## How premises were checked

- **Upstream code.** Read `server/src/search/instant_search.py` on `main` (`a9aeaa8`, the same head review 1 read). Functions read: `instant_search_query` (`:110-187`), `process_search_results` (`:190-225`), `calculate_total` (`:348-355`), `remove_hits_if_uid_in_suttaplexs` (`:376-380`), `try_to_fetch_suttaplex` (`:1023-1036`), and `lookup_dictionary` (`:1675-1678`).
- **Live API.** Sent 13 GET requests to `https://suttacentral.net/api/search/instant` on 2026-10-23. Every run was valid: no fetch failures, no timeouts. The bodies were analysed in memory and not stored. The temporary scripts were deleted.
- **Repo.** Ran `grep` on `src/index.ts` for the fetch and `search/instant` call sites.

## Re-review boundary

The orchestrator asked for a review of the whole artifact. Admissible candidates are:
- the status of W1–W5 and S1–S5;
- the new text: FR-2a, FR-14 paging bullets, the FR-10 row, AC-14 FR-2a clauses, AC-11 paging clauses, AC-16, NFR-3/NFR-5/NFR-7 edits, and Out of Scope;
- issues that the fixes made visible;
- remaining defects anywhere in the artifact.

### Status of review 1 findings

| Finding | Status | Evidence |
|---|---|---|
| W1 (paging) | **Partly fixed.** Both facts that review 1 asked for are now correct. The new paging rule they introduced is wrong for the main Vietnamese case (see W1 below). | Line 97 and FR-14 lines 211-214 match live data: `title:mindfulness`/`en` gives 7 / 9 / 4 `suttaplex` at `offset` 0 / 10 / 40, and `mn10` gives `["mn10"]` at `offset` 0 and 10. Line 98 and FR-14 line 215 (hits dropped before `total`) match `process_search_results:215-217`. |
| W2 (fetched URL vs builder) | Fixed | FR-2a lines 148-152, NFR-5 line 324, and AC-14 lines 466, 470-475. |
| W3 (FR-10 untested) | Fixed | FR-17 table line 254 and AC-16. `JSON.stringify({"entry":"nibbāna"})` gives `{"entry":"nibbāna"}` without escaping, so the AC-16 literal can be met. |
| W4 (`specs/INDEX.md`) | Fixed | NFR-3 line 303, AC-14 line 468, and Out of Scope line 531. |
| W5 (open questions) | Fixed, with one leftover phrase (S1 below) | Line 22, line 505, and lines 517-521. `clarifications.md:5` agrees. |
| S1 (size figures) | Fixed | Line 99 and `clarifications.md:113`. |
| S2 (unknown keys) | Fixed | FR-1 line 134. |
| S3 (grep output) | Fixed | FR-4 line 157 uses `cat src/*.ts \| grep -c`. |
| S4 (decoded URL) | Fixed | AC-2 line 353. |
| S5 (latency) | Fixed | NFR-7 line 329. |

### Candidates considered and discarded

- **`total` differs between pages for `title:` queries** (38 / 36 / 41 at `offset` 0 / 10 / 40). `calculate_total` subtracts only the hits removed from the current page. FR-14 does not claim that `total` stays fixed, so this is not a finding. The main problem with `total` is W1.
- **`remove_hits_if_uid_in_suttaplexs` also drops elements that have a `category` key.** `lookup_dictionary` then inserts the dictionary hit afterwards (`:1678`), on every page. This does not contradict FR-8 or AC-3: live `anatta` still shows `/define/anatta` first. The spec makes no claim about it.
- **`sanitize_quoted_query` runs in addition to `strip()`.** FR-3 line 154 lists only `+` and `strip()` as server behaviour. This is informational. The tool does not compensate for any of it, so FR-3 holds.
- **NFR-5 `grep -c 'fetch('` = 4.** The baseline has 4 call sites (`src/index.ts:13,21,28,36`). The count stays 4 whether design keeps a `fetchSearch(url)` helper or inlines `fetch` in the handler, so the invariant holds.
- **Re-verified literals:** AC-1 (21 / 0 / 21), AC-2 (10 hits, `/an1.378-393/vi/minh_chau`, `Thích Minh Châu`, `total` 185), and AC-3 (exact 10-hit order, `suttaplex[0]` `an6.100`). All match live data.

## Critical Findings

None.

## Warnings

### W1: The new FR-14 paging rule "compare `offset` with `total`" is wrong when a query has no content hits. AC-1 is such a case.

FR-14 line 215 tells Claude: "Còn trang sau hay không thì so `offset` với `total` mà SC trả về". AC-11 line 435 adds "cách biết còn trang sau là so với `total`".

The rule fails because of how upstream computes `total`:
- `process_search_results:202-203` and `calculate_total:349-354` compute `total` from content hits.
- `calculate_total:353-354` adds `if total == 0: total = len(suttaplexs)`. When there are no content hits, `total` becomes the number of title matches. The title matches are returned whole on every page.

Measured on 2026-10-23 with `vô ngã`/`language=vi`, the exact AC-1 input and the main Vietnamese use case in §Mục tiêu:

| `offset` | `suttaplex` | hits | `total` |
|---|---|---|---|
| 0 | 21 (same list) | 0 | 21 |
| 10 | 21 (same list) | 0 | 21 |
| 30 | 21 (same list) | 0 | 21 |

What a caller does if it follows FR-14:
- After page 1 it sees 10 < 21, so it asks for `offset=10`.
- That call returns the same 21 `suttaplex` and 0 hits. It costs another 6–9 s request (NFR-7) and adds nothing.
- The rule gives no point at which to stop, because `total` never changes.

The spec already contains the evidence: AC-1 lines 343-344 pin 21 `suttaplex`, 0 hits and `total` 21.

Where the rule does hold:
- `vô ngã` + `selectedLanguages=["vi","pli"]` at `offset=180` gives 5 hits with `total` 185.
- `mn10` gives `total` 10 with 4 hits. At `offset=10` it gives 0 hits.

So the rule is only wrong in the fallback case. That is still the case the spec's motivating example produces. It also brings back a wrong paging hint, which was the problem review 1's W1 was meant to remove.

There is a second, smaller problem: "so `offset` với `total`" never says which comparison to make. The working condition is `offset + limit < total`, using the API default of 10 for `limit` when the caller leaves it out.

**Fix.**
- Add to §Hình dạng API one row on `calculate_total`: `total` counts content hits, less those removed from this page; when that is 0, it equals `len(suttaplex)`. Cite the `vô ngã`/`vi` measurement at `offset` 0/10/30.
- Rewrite the FR-14 bullet. A next page may exist when `offset + limit < total`. When `hits` is empty and `total` equals the number of `suttaplex`, `total` counts title matches, and later pages return the same `suttaplex`.
- Add a matching clause to AC-11. For example: the description says that `total` can be the number of title matches when there are no content hits. Use the measurement as the evidence.

## Suggestions

- **S1 (Out of Scope line 529):** "(trừ khi C7 chọn khác)" and "(trừ khi C8 chọn khác)" still read as if C7 and C8 were open. Line 505 records them as decided. Drop both parentheticals.
- **S2 (AC-14 line 466/470 against FR-14):** `grep -c -E 'search/instant|URLSearchParams|searchParams' src/index.ts` must be 0. FR-14 asks for a tool description. Design could easily write "wrapper of `/api/search/instant`" in a `describe()` string in `src/index.ts`. That would fail AC-14 even though the work has no defect, the same mis-scoping trap as review 1's W4. Either limit the grep to code outside `describe()` strings, or state in FR-14 that the description must not contain the path literally.
- **S3 (AC-13 line 453 against the FR-17 table):**
  - "mỗi FR trong bảng FR-17 là tiền tố của ít nhất một case" includes the FR-5 row. Line 257 makes that row conditional ("Chỉ khi design đặt việc dựng output `json` trong `src/search.ts`"). If design builds `json` output in `src/index.ts`, AC-13 fails as written.
  - The prefix test is also loose: a case named `FR-2a …` satisfies "FR-2".
  - Fix: exclude conditional rows that do not apply, and require the id to be followed by a delimiter (for example `FR-2:` or `FR-2 `).

## Strengths

- **Review 1's paging facts are now correct.** Line 97 and FR-14 lines 211-214 match `try_to_fetch_suttaplex:1025-1030` and all 10 live paging probes in this review. Line 98 places the removal of hits before `calculate_total` correctly.
- **FR-2a fixes W2 with a check that can be run.** It names one exported pure builder in `src/search.ts`. The one variable is passed unchanged to `fetch` and to the source line. AC-14 adds a grep that keeps URL building out of `src/index.ts`, and a code-reading clause that names the `limit=10` drift explicitly. FR-18(b) now mutates the place where the defect would naturally be.
- **AC-16 tests FR-10 offline** with a literal input. Its expected lines can be met exactly.
- **No home-made logic comes back.** The new FR-14 text describes API behaviour and repeats that the tool does not infer paging (line 216). Every FR/AC can still be checked offline under the `search-unit-tests` constraints, or with a named live harness run.
- **Pinned literals still match.** AC-1, AC-2 and AC-3 were re-measured live and agree exactly.

## Summary

Review 1's W2–W5 and all five suggestions are fixed. W1 is fixed as review 1 worded it. However, the paging rule the author added ("compare `offset` with `total`") does not hold when there are no content hits. In that case upstream sets `total` to the number of `suttaplex`, and `vô ngã`/`vi`, the spec's own AC-1 case, returns the same 21 title matches and `total` 21 at every offset. The fix is a one-row premise addition, a reworded FR-14 bullet, and one AC-11 clause. Three suggestions cover leftover wording and two AC clauses that can fail when the work has no defect. No finding blocks design once W1 is fixed.

**Verdict:** Approve with changes
