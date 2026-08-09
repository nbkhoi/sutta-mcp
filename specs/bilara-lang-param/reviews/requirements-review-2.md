# Review: requirements — Truyền query param `lang` vào `/api/bilarasuttas` cho `get_sutta` (round 2)

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [requirements.md](../requirements.md)
**Verdict:** Approve with changes

Round-2 review after fixes to the six findings of [requirements-review-1.md](requirements-review-1.md) (verdict: Block). Scope of this pass: (1) verify each round-1 finding is actually closed, (2) check the fixes did not introduce new defects — with attention to the deliberately loose AC-2b, the new AC-7 slice matchers, and the new AC-6 read-code clause. Per dispatch standard, every number and matcher I doubted was re-measured this session (2026-08-09): live API, greps on the un-fixed baseline files (working tree at `71d238b`; only `specs/bilara-lang-param/` is untracked, so the predecessor and master specs in the tree **are** the baselines), and `src/index.ts`.

**Re-measurement results — everything reproduced:**

- **Live API:** `/api/suttaplex/mn10` lists `trush` exactly twice, both `author: "Trushant Majmudar"`, langs `gu`/`hi`, both `segmented=true`, `is_root=false`; `?lang=gu` → 230 keys / 230 non-empty after trim-filter; `?lang=hi` → 232/232; no `lang` → body has exactly `html_text,root_text,variant_text,reference_text,keys_order` (matches line 248 verbatim). `mn10/sujato`: 233 keys / 194 non-empty; segment 1 `Middle Discourses 10`; segment 50 byte-matches AC-3's anchor `And so they meditate observing an aspect of the body internally …` (incl. space + ellipsis); no embedded newlines in the first 50 segments, so "dòng thân thứ 50" = segment 50.
- **Predecessor spec (`non-segmented-translation-guard/requirements.md`, un-fixed):** AC-5→AC-6 awk slice = 16 lines (250–265); the four negation phrases each grep exactly **1** in-slice, at lines 260/261/262/263 as pinned; `bilara-lang-param` 0 in-slice and 0 global; `nhưng không được phục vụ` 2 hits @196/250; `đi vào **cùng nhánh guard** như AC-1` 1 hit; `NFR-4` hits only @156/304, both **after** heading `## Context & Goal` @7 (0 before); heredoc fences @170/@186.
- **Master spec (un-fixed):** `vẫn không trả` 1 @298; `không dự đoán được` 1 @300; `Câu hỏi mở (chưa điều tra)` and `Trả lời được có thể mở khóa` 1 each @304; `?lang=` 0 (line 120's `?language={lang}` does not contaminate, as the artifact notes); `bilara-lang-param` 0; endpoint row @121.
- **`src/index.ts`:** `grep -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush'` 0 hits; `grep -c -F 'sujato'` = 3 at :18/:237/:239 exactly; `segmented` = 3; N1-A awk extraction 19/19 lines, `diff` empty; gate string 1 hit; truncation tail template at :283 matches all pinned tail strings; default `max_segments` 50 at :243; Translator line renders `translations.find(t => t.author_uid === translator)?.author` (:267–269), so with both `trush` entries carrying the same `author`, AC-2b's `Translator: Trushant Majmudar (trush)` anchor is tie-break-independent, exactly as line 152 claims.

**Round-1 closure audit — all six closed:**

- **C1 (one-to-many `trush`) — closed.** All four recommended components landed and go beyond: VERIFIED assumption (line 248, re-verified exact); FR-2 mệnh đề một-nhiều with "bất kỳ một là thỏa" + deterministic, written tie-break (line 71); FR-3 requantified to "lang **duy nhất** của translator trên uid đó" with explicit deferral to FR-2 for the multi case (line 73); safety envelope rescoped — line 39 now limits the guard-worst-case claim to invalid-input/lookup-miss paths and line 40 names the class it does not cover, with the actual worst case (unreachable advertised translation) stated and accepted; options table gained the behaviour column (lines 52–56), including the correct observation that option 1 still needs the server-side tie-break because AC-1/AC-2b call without a param. AC-2b added on top of the minimum asked.
- **W1 (no vehicle for the hardcode ban) — closed.** AC-6 line 207 adds the read-code provenance clause (lang originates only from suttaplex response data or tool input; no translator-ID-keyed map literal, no translator-ID string literals on the derivation path), plus line 208's support greps with verified non-vacuous baselines, honestly labeled as not replacing the read clause.
- **W2 (partial AC-5 edit passes matchers) — closed.** AC-7's slice check (lines 218–221) covers exactly the four residual guard-demanding clauses (baseline 1 hit each @260–263, verified); combined with the global matchers (@196/250, @258) the removal list is now exhaustive — I read the full 16-line slice and found no guard-demanding clause outside the covered set. The in-slice `bilara-lang-param` ≥ 1 requirement doubles as proof the slice is non-empty and the headings didn't drift — good matcher design. The carve-out note (a rewritten AC-5 may legitimately keep `manoseṭṭhā manomayā;` as a root negation and `Translator: Bhikkhu Thích Minh Châu (phantuananh)` as a positive anchor) is accurate.
- **W3 (predecessor NFR-4 conditional) — closed.** FR-7 mục 5 (line 90) mirrors FR-8(e); AC-7 line 222 mechanises it with a verified 0-before-heading baseline. See S1 below for a token-alignment nit in this pair.
- **S1 (AC-2 URL anchor) — closed** (line 140). **S2 (quote the code line) — closed**: `lang = request.args.get('lang', 'en')` is now the primary anchor in FR-7.1, FR-8(a), and AC-8 (lines 86/95/235).

## Critical Findings

None.

## Warnings

### W1: AC-6's fetch-endpoint clause fails at baseline — `fetchParallels()` already fetches an endpoint outside the allowed pair

- **Where:** AC-6, line 206; contrast NFR-6 (line 108); `src/index.ts:25–30`
- **Evidence:** "**And** không có lời gọi `fetch` nào tới endpoint ngoài `/suttaplex/` và `/bilarasuttas/`; đường đi nhiều request nhất của `get_sutta` (đọc code) không vượt 3 request". `src/index.ts:26`: `` const url = `${SC_BASE}/parallels/${uid}`; `` inside `fetchParallels()` — a fetch call to `/parallels/`, protected from modification by this spec's own NFR-5.
- **Issue:** Read as a whole-file check — the natural reading, since every sibling AC-6 clause is whole-file (`git status`, `git diff -- src/index.ts`, the two greps, the module-scope function count) — the first half of this clause is false **before** any change is made and will remain false after a fully compliant fix. The second half of the same bullet carries the `get_sutta` scope qualifier the first half lacks, which makes the omission read as deliberate; NFR-6, which this clause exists to verify, is correctly scoped ("mỗi lời gọi `get_sutta` phát tối đa 3 request ... chỉ tới hai endpoint đang dùng"). As written, a checker must silently re-scope the clause to pass a correct implementation — the same category of matcher imprecision this spec lineage treats as a defect (a guaranteed false failure rather than a false pass, but still a mechanised clause that does not survive contact with the baseline).
- **Recommendation:** Add the scope qualifier: "trên đường đi của `get_sutta` không có lời gọi `fetch` nào tới endpoint ngoài `/suttaplex/` và `/bilarasuttas/`" (or equivalently "không có lời gọi `fetch` **mới** nào..."). One phrase; no other clause needs to move.

## Suggestions

### S1: FR-7 mục 5's prescribed errata line does not contain the token AC-7's conditional matcher greps for

- **Where:** FR-7 mục 5 (line 90) vs AC-7 conditional clause (line 222)
- **Evidence:** FR-7.5: "errata note ở mục 1 ghi thêm một dòng: NFR-6 của `bilara-lang-param` thay thế biên 2-request (tối đa 3)" — the prescribed line names NFR-6 but not NFR-4. AC-7: "chuỗi `NFR-4` xuất hiện **≥ 1** lần ở dòng **nhỏ hơn** dòng heading".
- **Issue:** An implementer transcribing FR-7.5's line verbatim writes an errata line with no `NFR-4` token and fails the matcher. Self-correcting (the AC failure points straight at the omission, and FR-7.5's own rationale sentence names NFR-4), so this is friction, not a hole — but the FR and its AC should agree on the anchor string.
- **Recommendation:** Reword FR-7.5's added line to name what is superseded, e.g. "NFR-4 tiền nhiệm (biên 2 request) bị NFR-6 của `bilara-lang-param` thay thế — tối đa 3."

## Strengths

- All six round-1 findings are closed with verified mechanisation, and the C1 fix is complete across every location the flaw touched (FR-2, FR-3, lines 39–40, options table, assumptions, Q1) rather than only at the quoted lines — the exact failure mode memory item 2 warns about, avoided.
- AC-2b's single loose degree of freedom is properly caged: exactly two pinned tail strings, a cross-check against the tie-break rule design must write down, a determinism re-run, and a tie-break-independent positive anchor (verified: both suttaplex entries share `author`, and the code path at `src/index.ts:267–269` renders that field).
- The new slice matchers prove their own non-vacuity (in-slice `bilara-lang-param` ≥ 1 doubles as slice-integrity evidence), and every new baseline in line 255 reproduced exactly on re-measurement — the second consecutive artifact in this lineage with zero literal drift.
- The Given data for the new trush case is byte-accurate down to the no-lang response's key list.

## Summary

Verdict: Approve with changes. All six round-1 findings — including the blocking one-to-many case — are genuinely closed, and every re-measured literal, baseline, and anchor in the fixed artifact reproduced exactly. One new defect slipped in with the AC-6 expansion: the fetch-endpoint clause omits the `get_sutta` scope that NFR-6 has, so its literal whole-file reading fails on the untouched `fetchParallels()` at baseline — a one-phrase fix. The FR-7.5/AC-7 token mismatch is cosmetic.
