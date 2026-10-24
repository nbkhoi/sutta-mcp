# Requirements review 3: search-api-passthrough

**Artifact:** `specs/search-api-passthrough/requirements.md` (Draft, 2026-10-23, revised after review 2)
**Upstream checked:** `clarifications.md`, `reviews/requirements-review-2.md`, `specs/dynamic-search/requirements.md`, `specs/search-unit-tests/requirements.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`, AGENTS.md, template `requirements.md.tmpl`
**Reviewed:** 2026-10-23
**Scope:** re-review after reopen. Review 2's W1 and S1–S3 are checked, and the whole artifact is read again. The user decisions dated 2026-10-23 and the answers to C1–C11 are not reviewed.

## How premises were checked

- **Upstream code.** Read `server/src/search/instant_search.py` on `main` (`a9aeaa8`). The spec cites `c755a43`. `a9aeaa8` is one commit ahead of it and changes only `client/` files, so the server line numbers are the same. Functions read: `instant_search_query` (`:110-187`), `process_search_results` (`:190-225`), `calculate_total` (`:348-355`), `remove_hits_if_uid_in_suttaplexs` (`:376-380`), `try_to_fetch_suttaplex` (`:1023-1036`), and `lookup_dictionary` (`:1675-1678`).
- **Live API.** Sent 13 GET requests to `/api/search/instant` on 2026-10-23. One run (`nibbana`, `language=vi`, `selectedLanguages=["vi"]`) returned HTTP 000. That query was exploratory and is not used as evidence, so it was not rerun. All 12 other runs were valid. The bodies were analysed in a temporary file and then deleted. Nothing was stored.
- **Repo.** At `d972fa6`, ran the new AC-14 grep and recounted the §Hiện trạng numbers: `grep` 3 / 3 / 4 / 1, `src/search.ts` 212 lines, 16 cases, 9 fixtures, 52,333 bytes. All match.

## Re-review boundary

Admissible candidates:
- the status of review 2's W1 and S1–S3;
- the new text: the §Hình dạng API `total` row (line 99), FR-14 lines 216-219, AC-11 lines 437-439, the AC-14 grep and its explanation (lines 470, 474), AC-13 line 457, and Out of Scope line 533;
- issues that the fixes made visible;
- remaining defects anywhere in the artifact.

### Status of review 2 findings

| Finding | Status | Evidence |
|---|---|---|
| W1 (`total` falls back to the number of `suttaplex`) | **Partly fixed.** The fallback is now described correctly at line 99, FR-14 line 218 and AC-11 line 439. The live re-measurement agrees: `vô ngã`/`vi` gives 21 / 0 / 21. The other half of the fix, the rule "`offset + limit < total`" (FR-14 line 217, AC-11 line 438), is wrong for `title:` queries (see W1 below). | `calculate_total:353-354`; live data |
| S1 (Out of Scope wording) | Fixed | Line 533 no longer contains "trừ khi C7/C8 chọn khác". |
| S2 (AC-14 grep caught `describe()`) | Fixed | Line 470 now greps `URLSearchParams\|searchParams\|new URL\(\|SC_BASE\}/search`. At `d972fa6` this matches only `src/index.ts:34` and `:36`, both inside `fetchSearch()`, which the change replaces. The other three tools do not match. Bare string concatenation is left to the code-reading clause (line 474), and the spec says so. |
| S3 (AC-13 prefix rule) | Fixed | Line 457 requires `FR-n:` with a colon, excludes `FR-2a:` from counting as `FR-2`, and applies the FR-5 row only when it applies. |

### Candidates considered and discarded

- **`mn10` at `offset=10`.** Line 99 says only "0 hit". Measured: 0 hits, `total` 10, `suttaplex` `["mn10"]`. FR-14 line 217 gives `10 + 10 < 10`, which is false, so the rule stops correctly. Line 218 does not apply because 10 ≠ 1. No finding.
- **Fallback while `hits` holds a dictionary entry.** `lookup_dictionary` (`:1678`) inserts the dictionary hit after `calculate_total` (`:217`). So a page with no content hits and a dictionary match would have `hits.length` 1 and `total` = `len(suttaplex)`, and line 218's "`hits` rỗng" test would miss it. No live case was found: `nibbana`, `dukkha`, `metta` with `selectedLanguages=["vi"]` and `anatta`/`vi`/`["vi"]` all had content hits. Not raised, because it was not observed.
- **AC-14 bypass by string concatenation.** `"https://suttacentral.net/api/search/instant?" + …` passes the grep. Line 474 says this is caught by the FR-2a code reading, and line 477 forbids it explicitly. Covered.
- **Upstream commit drift.** See "How premises were checked". The server code is the same.

## Critical Findings

None.

## Warnings

### W1: The FR-14 rule "a next page may exist when `offset + limit < total`" stops too early on `title:` queries, and AC-11 requires the description to state it.

**Where.** FR-14 line 217: "Khi `total` đếm hit nội dung, có thể còn trang sau khi `offset + limit < total`." AC-11 line 438 requires the description to "nêu phép so `offset + limit < total`". FR-14 line 219 says the description "chỉ nói đúng hành vi của API".

**Why the rule fails.** In the `else` branch, `calculate_total:352` sets `total = total - (current_page_total - len(hits))`. So the reported `total` is the index count minus the hits removed **on this page**. Those are hits whose `uid` is in `suttaplex` (`:376-380`). For `title:` queries, `suttaplex` is built from the page's own hits (`try_to_fetch_suttaplex:1025-1026`), so most hits on each page are removed and `total` falls short of the real count by that many. The test `offset + limit < total` then fails while results still remain.

**Measured on 2026-10-23, `title:mindfulness`, `language=en`, default `limit`:**

| `offset` | `suttaplex` | hits | `total` | Rule `offset + 10 < total` |
|---|---|---|---|---|
| 20 | 5 | 0 | 40 | 30 < 40: continue |
| 30 | 5 | 0 | 40 | 40 < 40: **stop** |
| 40 | 4 (`t1670b2.62`, `vb7`, `t1670b2.59`, …) | 0 | 41 | (not reached) |
| 50 | 0 | 0 | 45 | (end) |

- At `offset=30`, line 217 tells the caller to stop.
- At `offset=40` there are still 4 title matches.
- Line 218 does not catch this case, because `total` 40 is not equal to `suttaplex` 5.
- FR-14 line 214 itself says `title:` queries page through `suttaplex` like `hits`. This is the exact query class where the rule loses results.

**A second premise gap in line 99.** Line 99 describes `total` only as "hits counted, less those removed on this page". It leaves out the first branch, `calculate_total:349-350`: `if total <= int(limit): total = current_page_total`. In that branch `total` is the page's count **before** removal, and it depends on `limit`. Measured: `mn10`/`en` gives `total` 10 with `limit` 10 and `total` 5 with `limit` 50, with 4 hits both times. The rule in line 217 uses `limit` on both sides of the comparison, so this dependence matters for any exact formula.

**Fix.** Remove the exact comparison from FR-14 line 217 and AC-11 line 438. Replace it with a fact the API supports, and cite the measurement above:
- `total` is approximate. It is reduced by the hits removed on the current page, and when it is not above `limit` it is the page's count.
- So `offset + limit ≥ total` does not prove the last page. For example, `title:mindfulness`/`en` at `offset` 30 gives `total` 40, and `offset` 40 still returns 4 title matches.

Add a row or a sentence to §Hình dạng API for the `total <= limit` branch, with the `mn10` `limit` 10 / 50 measurement. Keep line 218 and AC-11 line 439 as they are.

## Suggestions

None.

## Strengths

- **Review 2's fallback finding is fixed with evidence.** Line 99 cites `calculate_total` and three offsets. AC-11 line 439 turns the fallback into a checkable description clause. The live re-measurement matches exactly: `vô ngã`/`vi` gives 21 `suttaplex`, 0 hits and `total` 21.
- **The AC-14 grep is correctly scoped now.** At baseline it matches only code that the change removes. It leaves `describe()` free to name the endpoint. Line 474 says which defect the grep leaves to the code-reading clause and where that clause is.
- **The AC-13 prefix rule can be applied mechanically.** It uses the colon delimiter and the conditional FR-5 row.
- **Pinned literals still hold.** The `title:mindfulness` and `mn10` figures cited in lines 97-99 agree with this round's measurements. The §Hiện trạng counts match `d972fa6`.

## Summary

S1–S3 are fixed, and the fallback half of review 2's W1 is now correct. The remaining defect is the paging rule added in the last round, "`offset + limit < total`". Upstream lowers `total` by the hits removed on each page, and for `title:` queries those are most of the page. On `title:mindfulness`/`en` the rule stops at `offset` 30, but `offset` 40 still returns 4 title matches. AC-11 currently requires the description to state that rule. Line 99 also omits the `total <= limit` branch, in which `total` depends on `limit`. The fix is to drop the exact comparison, describe `total` as approximate with the measured counterexample, and add one premise row. No finding blocks design once W1 is fixed.

**Verdict:** Approve with changes
