# Requirements review 5: search-api-passthrough

**Artifact:** `specs/search-api-passthrough/requirements.md` (Draft, 2026-10-23, revised after review 4)
**Upstream checked:** `clarifications.md`, `reviews/requirements-review-4.md`, `specs/dynamic-search/requirements.md`, `specs/search-unit-tests/requirements.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`, AGENTS.md, template `requirements.md.tmpl`
**Reviewed:** 2026-10-23
**Scope:** re-review after reopen. Review 4's W1 is checked, and the whole artifact is read again. The user decisions dated 2026-10-23 and the answers to C1–C11 are not reviewed.

## How premises were checked

- No live request was sent. Review 4 measured every literal involved in the changed text on the same day. The change is a single wording fix, and it introduces no new measured value.
- Upstream code was not read again. The new wording is compared with the artifact's own §Hình dạng API line 99, which review 4 checked against `calculate_total` (`instant_search.py:348-355`, `c755a43`).

## Re-review boundary

Admissible candidates:
- the status of review 4's W1;
- the new text: FR-14 line 218 and AC-11 line 444;
- issues that the fix made visible;
- regressions anywhere else in the artifact.

### Status of review 4 findings

| Finding | Status | Evidence |
|---|---|---|
| W1 (FR-14/AC-11 say `total` falls back to the title-match count "khi không có hit"; upstream applies the fallback only when the computed `total` is 0) | **Fixed.** Line 218 now reads "khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề". Line 444 reads "khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề". Both match line 99, branch (3): "Sau đó, nếu `total` = 0 thì `total` = số phần tử `suttaplex`". Review 4's counterexamples no longer contradict the text: `mn10` at `offset` 10 (`total` 10) and `title:mindfulness` at `offset` 30 (`total` 40) have a non-zero computed `total`, so the fallback does not apply. | lines 99, 218, 444; review 4 measurements |

### Candidates considered and discarded

- **The AC-11 line 444 example still fits.** `vô ngã`/`language=vi` gives 0 hits and `total` 21, which equals its 21 `suttaplex` (line 102). This is consistent with a computed `total` of 0 that falls back to the title-match count. The example cannot tell the fallback apart from a computed `total` that happens to equal 21. However, AC-11 checks only that the description contains the reason, not that the example proves it. Not raised.
- **"Nó phụ thuộc `limit`" (line 218) is stated without qualification, but it holds only for branch (1).** This text is unchanged since review 4, which accepted it. It reads as a reason why `total` is unreliable, not as a rule, and it is not false. Out of scope as unchanged text with no new evidence.
- **Regression check.** The line numbers of FR-14 (209-231) and AC-11 (427-446) are the same as the ones review 4 cites, and the surrounding bullets (lines 217, 219-221, 440-443, 445-446) are textually the same as before. No other section cites the changed clause. No regression was found.

## Critical Findings

None.

## Warnings

None.

## Suggestions

None.

## Strengths

- **The fix is minimal and uses the condition the spec already verified.** Both places now copy the condition from line 99 ("`total` tính ra bằng 0"), instead of adding a new paraphrase. FR-14, AC-11 and §Hình dạng API now describe the fallback the same way.
- **Nothing else changed.** The ban on a stopping rule (line 221, line 446) and the `offset` probe (line 220, line 445) are unchanged. The fix did not add a new paging formula.

## Summary

Review 4's only Warning is fixed. FR-14 line 218 and AC-11 line 444 now say that `total` falls back to the title-match count when the computed `total` is 0. This matches line 99 and upstream `calculate_total`, and it is no longer contradicted by the `mn10` `offset` 10 and `title:mindfulness` `offset` 30 measurements. No regression or new defect was found.

**Verdict:** Approve
