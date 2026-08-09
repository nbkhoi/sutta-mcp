# Review: design — Truyền query param `lang` vào `/api/bilarasuttas` cho `get_sutta` (round 2)

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [design.md](../design.md)
**Verdict:** Approve with changes

Round 2, after fixes for review-1 (verdict AwC: W1 `is_root` candidate class, W2 hit-count annotation, S1 `-U0` mechanization). Per dispatch, every self-declared number was re-measured this session rather than trusted: the predicted `src/index.ts` was reconstructed from the two N3 blocks, diffed (`-U0` and default context) and compiled with the repo's real `tsconfig.json`; all 8 FR-7/FR-8 doc blocks were applied to copies of both spec files and every AC-7/AC-8 matcher run on baseline and patched versions; the new root-author path was exercised on the live API, including two suttaplex fetches for ordering.

**Finding closure — all three review-1 findings are genuinely closed:**

- **W1 (`is_root` candidate class) — closed via the documentation path.** The written decision exists at design.md:89 ("**Lớp candidate `is_root` — quyết định thành văn: không lọc, chấp nhận 1 retry phí**") and is propagated consistently to all companion sites: coverage claim design.md:93 ("gồm đường root-author `ms`"), Performance table row design.md:260, narrative design.md:263, Risks row design.md:317. All five tell the same story (retry `pli` fires, wasted, → guard, 3 requests, within NFR-6). Live re-measurement confirms every factual claim in the paragraph: `/api/suttaplex/mn10` entry index 0 is `{author_uid: "ms", lang: "pli", is_root: true}`; the N3-B `find` predicate run on the live array returns `pli` for `translator: "ms"`; both `mn10/ms` and `mn10/ms?lang=pli` lack `translation_text` → guard after 1 wasted request. The cited precedent sites are byte-accurate: `formatUnavailable()` filters `t.is_root !== true` at `src/index.ts:162`; `get_sutta_meta` filters `!t.is_root` at `:309`.
- **"Cả 8 đường đi" arithmetic now closes.** The Performance table has 7 rows; with the newly explicit counting rule (design.md:93: "đếm hàng legacy là hai cặp") the count is 1+1+1+1+2+1+1 = **8**, including the new `ms` row. The claim is arithmetically consistent as written.
- **W2 primary — closed.** design.md:276 now reads "khối (2) chứa **4**"; measured on the extracted block (design.md:189–194): `grep -c -F 'bilara-lang-param'` = **4**. Correct. (Secondary annotation in the same row: see W1 below — the fix introduced a new error there.)
- **S1 — applied and verified.** design.md:55 replaces the "chạm" interpretation paragraph with the mechanical `git diff -U0 -- src/index.ts` check; design.md:274 carries it in the AC-5 vehicle row. Measured on the reconstructed file: `-U0` output has **exactly 2 hunks** (`@@ -18,2 +18,2 @@`, `@@ -254 +254,12 @@` — i.e., 2 modified lines; 1 modified + 11 inserted), gate string **0** hits in the entire diff output, and neither hunk range intersects `extractText()` (lines 119–137). Claim holds exactly as written.

**N3 byte-stability across rounds (dispatch item 3):** the round-1 file is not recoverable (untracked, no backup), so direct byte comparison is impossible. Proxy used: every observable review-1 recorded for the N3 blocks reproduces identically on the current blocks — N3-A awk vehicle extracts 6 lines, diff with the block empty; N3-B vehicle extracts 12 lines, diff empty (and the `const citation` line is byte-identical to `src/index.ts:253`); diff shape `-254 +254,12`; N1-A 19/19 lines, diff against predecessor `design.md` empty; all seven N4 invariants (gate 1, `translation_text` 1, `segmented` 3, `sujato` 3, translator-ID regex 0, `Object.keys` 2, ` as ` 2); `tsc --noEmit` under the repo's real tsconfig: exit 0, 0 errors. Line-number drift of the blocks (+2) matches exactly the two lines the `is_root` paragraph added above them. No evidence of any undeclared change.

**Doc matchers (re-run on mechanically patched copies):** all baselines on the unmodified files reproduce design.md:168's ledger (forbidden strings @196/250, @258, @375; heading @7; `NFR-4` @156+@304 both after heading; slice 16 lines; four negation clusters 1 hit each; master @298/@300/@304×2; `?lang=` 0; `bilara-lang-param` 0 in both). Post-patch: AC-7 — 3 forbidden strings → 0; `bilara-lang-param` 9 hits, first @7, before heading; `NFR-4` @14, before heading; slice negation clusters 4×0, in-slice `bilara-lang-param` = 4. AC-8 — 4 forbidden strings → 0; `?lang=` = 3; `bilara-lang-param` present; all content anchors (108/63, `dhp` gộp, `lang = request.args.get('lang', 'en')` ×2, bảo lưu mẫu nhỏ, khóa vào response) sit in blocks (a)–(d). Every matcher passes.

## Critical Findings

None. (Convergence: round 1 had none; no new Critical arose from the fixes.)

## Warnings

### W1: Fix-introduced annotation error — heading lands at line 17, not 18; the insertion is 10 lines, not "11 dòng: 10 dòng note + 1 dòng trống"

- **Where:** design.md:276 (AC-7 vehicle row)
- **Evidence:** "heading trôi xuống dòng **18** sau khi chèn 11 dòng: 10 dòng note + 1 dòng trống". The design's own errata block (design.md:175–183) is **9 lines**. Applied per the design's own placement instruction (design.md:172: between line 5 and line 7, "cách trên dưới một dòng trống" — the existing blank line 6 is the upper separator), the insertion is 9 note lines + 1 blank = **10 lines**, and `grep -n '^## Context & Goal'` on the patched copy returns **17**. The row's other two position annotations — first `bilara-lang-param` hit @7, `NFR-4` @14 — were re-measured correct, and they jointly *pin* this layout: with the note starting at line 7 (required for hit @7) and one blank below (required by the instruction), no application of a 9-line note can put the heading at 18. The three annotated numbers (7, 14, 18) are mutually impossible.
- **Issue:** This is a new error introduced by the W2 fix, and the source is **review-1 itself**: my round-1 report recorded "measured 18 (11 lines inserted above line 7)" — a measurement that was internally inconsistent even then (first hit @7 + 9-line note ⇒ heading @17) — and recommended "~17 → 18". The round-1 artifact's hedged "~dòng 17" was in fact correct. The fixer transcribed the reviewer's literal instead of re-measuring, in an artifact whose stated method is that every number is self-measured ("Mọi con số ... được đo lại", design.md:13). Memory item 6 in this project's review history says precisely this: "do not trust a prior review's recommended literal either." No matcher can flip — AC-7's clause is relational (first hit line < heading line; 7 < 17 passes) — so this stays a Warning, same class and severity as round-1's W2.
- **Recommendation:** design.md:276: `dòng 18` → `dòng 17`; `chèn 11 dòng: 10 dòng note + 1 dòng trống` → `chèn 10 dòng: 9 dòng note + 1 dòng trống`. No other number in the row needs touching (9 hits, @7, @14 all verified).

## Suggestions

### S1: The line-13 measurement ledger omits the `ms` measurements the fix added

- **Where:** design.md:13 vs design.md:89, :260
- design.md:13 opens "Mọi con số và thứ tự trích trong tài liệu này được **đo lại trong phiên soạn design** ... Tất cả khớp:" and enumerates the session's measurements — but the `mn10/ms` numbers added by the fix round (index 0 `ms`/`pli`/`is_root=true`; both `ms` and `ms?lang=pli` lacking `translation_text`) appear only inline at design.md:89. An implementer treating line 13 as the complete measurement ledger misses the root-author path. One clause appended to the list closes the gap. (Fix-collision residue, not a correctness defect — the inline "Đo 2026-08-09" at :89 is accurate; I re-measured it live.)

## Strengths

- All three review-1 findings closed for real, not cosmetically: the `is_root` decision is a written, live-measured, precedent-citing paragraph propagated to all five sites that mention the path, with byte-accurate source citations (`:162`, `:309`); the coverage-claim arithmetic now carries its own counting rule and adds up.
- N3 discipline held under fix pressure: both normative blocks byte-stable by every recorded observable (vehicles, diff shape, N4, compile), exactly as the fixer declared — the documentation-path fix avoided re-opening verified code.
- The S1 mechanization is genuinely mechanical: 2 hunks, 0 gate hits, no hunk touching `extractText()` — measured, not argued.
- All ~20 AC-7/AC-8 matchers pass on mechanically patched copies, with every baseline in the design's ledger reproducing exactly.

## Summary

Approve with changes. The normative core is untouched and re-verified end-to-end (N3 blocks, tie-break, 2-hunk shape, all doc blocks and matchers, live `ms` path), and all three round-1 findings are closed. The one remaining defect is fix-introduced and reviewer-sourced: review-1's own mismeasured "18" replaced the round-1 artifact's correct "~17", producing a three-number annotation at design.md:276 that contradicts the design's own 9-line errata block — a two-literal edit fixes it. No Critical in either round; the artifact is converging.
