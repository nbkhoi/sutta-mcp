# Requirements review 4: search-api-passthrough

**Artifact:** `specs/search-api-passthrough/requirements.md` (Draft, 2026-10-23, revised after review 3)
**Upstream checked:** `clarifications.md`, `reviews/requirements-review-3.md`, `specs/dynamic-search/requirements.md`, `specs/search-unit-tests/requirements.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`, AGENTS.md, template `requirements.md.tmpl`
**Reviewed:** 2026-10-23
**Scope:** re-review after reopen. Review 3's W1 is checked, and the whole artifact is read again. The user decisions dated 2026-10-23, the answers to C1–C11, and the directed shape of the W1 fix (no stopping rule; `total` described as approximate; probe with a larger `offset`) are not reviewed.

## How premises were checked

- **Upstream code.** Read `server/src/search/instant_search.py` on `main` through `raw.githubusercontent.com`. Read `instant_search_query`, `process_search_results`, `calculate_total` (`:348-355`), `remove_hits_if_uid_in_suttaplexs` and `try_to_fetch_suttaplex`. The temporary copy was deleted.
- **Live API.** Sent 12 GET requests to `/api/search/instant` on 2026-10-23. One run (`title:mindfulness`, `offset=40`) returned HTTP 000. It was invalid, so it was rerun once and the rerun was valid. The bodies were parsed in `mktemp` files and deleted. Nothing was stored.

| Request (`language` as shown) | `suttaplex` | hits | `total` |
|---|---|---|---|
| `mn10`/`en`, `offset` 10 | 1 (`mn10`) | 0 | 10 |
| `mn10`/`en`, `limit` 10 | 1 | 4 | 10 |
| `mn10`/`en`, `limit` 50 | 1 | 4 | 5 |
| `title:mindfulness`/`en`, `offset` 0 | 7 (`an1.575-615`, `an6.20`, …) | 0 | 38 |
| `title:mindfulness`/`en`, `offset` 10 | 9 (`an8.74`, `an8.81`, `dn22`, …) | 0 | 36 |
| `title:mindfulness`/`en`, `offset` 30 | 5 | 0 | 40 |
| `title:mindfulness`/`en`, `offset` 40 | 4 (`t1670b2.62`, `vb7`, …) | 0 | 41 |
| `mindfulness`/`en`, `offset` 0 / 10 | 32 / 32 | 8 / 5 | 1461 / 1462 |
| `vô ngã`/`vi`, `offset` 0 / 30 | 21 / 21 | 0 / 0 | 21 / 21 |

Every literal in line 97, line 99 and AC-11 lines 439-444 matches these runs.

## Re-review boundary

Admissible candidates:
- the status of review 3's W1;
- the new text: the §Hình dạng API `total` row (line 99), FR-14 lines 216-221, AC-11 lines 439-446, and Assumptions line 517;
- issues that the fix made visible;
- remaining defects anywhere in the artifact.

### Status of review 3 findings

| Finding | Status | Evidence |
|---|---|---|
| W1 (`offset + limit < total` stops too early; line 99 omits the `total <= limit` branch) | **Fixed in the directed way.** FR-14 line 221 says the description states no stopping rule based on `total`, `limit` or the hit count. AC-11 line 446 checks that the description has no comparison between `offset`, `limit` and `total`. Line 220 and AC-11 line 445 give the probe: call again with a larger `offset` and look for new entries. Line 99 now lists all three branches of `calculate_total` and quotes the `mn10` `limit` 10/50 figures. The branch descriptions match `calculate_total:349-354`. | upstream code; live runs above |

The fix compressed the three branches into one sentence for the tool description. That compression makes branch (3) false; see W1 below.

### Candidates considered and discarded

- **The probe "call again with a larger `offset` and look for new entries" as a hidden stopping rule.** For a normal query, a page whose hits all have a `uid` already in `suttaplex` would show no new entries even though later pages might still have hits. No such page was observed: `mindfulness`/`en` drops 2 and then 5 hits per page. The probe's shape was also directed by the orchestrator. Not raised.
- **Upper-case filter (`Title:`).** `normalize_filter_commands` lowercases filter commands before `try_to_fetch_suttaplex`, so "starts with `title:`" (line 214, line 219) is slightly narrower than upstream. A caller who types `Title:` gets the paged behaviour anyway. Too minor to raise.
- **`process_search_results` sets `total = len(hits)` when the index count is 0, before `calculate_total`.** Line 99 does not mention this, but it does not change any claim the spec makes. Not raised.

## Critical Findings

None.

## Warnings

### W1: FR-14 and AC-11 require the description to say that `total` falls back to the title-match count "when there are no hits". The spec's own measurements contradict this.

**Where.**
- FR-14 line 218: "khi không có hit thì rơi về số khớp tiêu đề."
- AC-11 line 444 requires this as one of the three reasons: "rơi về số khớp tiêu đề khi không có hit".

**What upstream does.** `calculate_total:353-354` sets `total = len(suttaplexs)` only when the computed `total` is 0. It does not test whether `hits` is empty. Line 99 states the condition correctly: "nếu `total` = 0". FR-14 and AC-11 replace that condition with "không có hit".

**Counterexamples measured on 2026-10-23.** Each of these has 0 hits, but `total` is not the title-match count:
- `mn10`/`en`, `offset` 10: 1 `suttaplex`, 0 hits, `total` 10.
- `title:mindfulness`/`en`, `offset` 30: 5 `suttaplex`, 0 hits, `total` 40. Line 99 and AC-11 line 443 use this same request.
- `title:mindfulness`/`en`, `offset` 0: 7 `suttaplex`, 0 hits, `total` 38.

**Why it matters.** FR-14 is the requirement for text shipped to the caller. The orchestrator's direction is that the description states only what the API does. As written, AC-11 passes only if the description contains a false statement. The conclusion in line 218 ("`total` is not a reliable signal") is still true, so this cannot cause the caller to lose results. That is why this is a Warning and not a Critical.

**Fix.** In FR-14 line 218 and AC-11 line 444, use the condition from line 99. For example: "khi phép tính cho 0 thì `total` lấy số khớp tiêu đề". Or weaken the claim: "khi không có hit, `total` có thể chỉ là số khớp tiêu đề". The `vô ngã`/`vi` example in AC-11 line 444 still fits either wording. Do not add any other rule.

## Suggestions

None.

## Strengths

- **The W1 fix removes the class of defect, not just one instance.** Reviews 2 and 3 each found a new exact paging formula. FR-14 line 221 and AC-11 line 446 now forbid the description from stating any comparison or stopping rule. That makes the tool description less likely to drift into a new home-made formula.
- **Line 99 matches the upstream code branch by branch.** It cites `calculate_total:348-355`, and each of the three branches has a measured example that was reproduced this round.
- **The AC-11 counterexamples can be checked.** Each reason in lines 442-444 names a request and the numbers it gives, and all of them reproduced exactly.

## Summary

Review 3's W1 is fixed as directed. The description has no stopping rule, AC-11 forbids any comparison between `offset`, `limit` and `total`, and line 99 now describes all three branches of `calculate_total` correctly. One defect remains, and the fix introduced it. When FR-14 and AC-11 condense branch (3) for the description, they say that `total` falls back to the title-match count "when there are no hits". Upstream applies the fallback only when the computed `total` is 0. `mn10` at `offset` 10 (0 hits, `total` 10) and `title:mindfulness` at `offset` 30 (0 hits, `total` 40) contradict the condensed wording. Fixing it means changing one clause in two places to match line 99. Nothing blocks design.

**Verdict:** Approve with changes
