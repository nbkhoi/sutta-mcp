# Review: design — Truyền query param `lang` vào `/api/bilarasuttas` cho `get_sutta`

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [design.md](../design.md)
**Verdict:** Approve with changes

Review against `requirements.md` (Status Reviewed; review-2 verdict AwC with two open low-severity findings), the predecessor spec `specs/non-segmented-translation-guard/`, and `src/index.ts` at `71d238b` (working tree clean; only `specs/bilara-lang-param/` untracked). Per dispatch standard, every self-declared measurement was re-executed this session (2026-08-09) rather than trusted: the predicted `src/index.ts` was **constructed from the two N3 blocks and diffed for real**, compiled with the repo's actual `tsconfig.json`, all eight FR-7/FR-8 text blocks were **applied to copies** of both spec files and every AC-7/AC-8 matcher run on baseline and patched versions, and the tie-break was exercised against the live API twice.

**Re-measurement results — the design's self-declarations all reproduce:**

- **Diff shape (claim §High-Level Design):** predicted file = current `src/index.ts` + N3-A (replacing `:18-23`) + N3-B (replacing `:253-254`). `git diff --no-index`: **exactly 2 hunks** — hunk 1: 2 modified lines in `fetchBilaraText`; hunk 2: 1 modified + 11 inserted lines, ending above the gate, **gate line appears only as context**. No hunk overlaps `extractText()`.
- **N1 intact:** `awk '/^function extractText/,/^}$/'` extracts 19/19 lines from both current and predicted file; `diff` against predecessor `design.md` empty in both. Gate string 1 hit in both. Predecessor `design.md` untouched — FR-6 exception correctly not triggered.
- **Compile (claim §N3):** predicted file under the repo's real `tsconfig.json` (strict, Node16, no `noUncheckedIndexedAccess`): `tsc --noEmit` exit 0, 0 errors. The `const`→`let` narrowing claim holds — no "compiler enforces" claims are made anywhere (design.md:71 explicitly disclaims), consistent with this repo's history.
- **N3 awk vehicles:** N3-A vehicle extracts exactly 6 lines, diff with the block empty; N3-B vehicle extracts exactly 12 lines, diff with the block (minus `const citation`) empty.
- **N4 invariants on predicted file:** gate 1, `translation_text` 1, `segmented` 3, `sujato` 3 (`:18/:237/:239` on baseline), translator-ID regex 0, `Object.keys` 2, ` as ` 2 — all seven match the table.
- **Tie-break (NORMATIVE rule, design.md:77-85):** `/api/suttaplex/mn10` fetched twice — 43 entries, identical order both times; `trush` at **index 14 (`gu`) and 15 (`hi`)** exactly as declared; the `find` predicate picks `gu` on both fetches. `?lang=gu` → **230/230** non-empty after trim-filter (AC-2b's pinned tail `Tổng: 230 đoạn` is correct), `?lang=hi` → 232/232, `dhp1-20/phantuananh?lang=vi` → 108/108. The `lang !== "en"` exclusion is covered by the rule's no-candidate arm (en-only translator → `find` returns nothing → guard) and its justification (first call *is* the `lang=en` call, measured byte-identical) is sound.
- **Doc blocks (§Thay đổi tài liệu):** all 8 blocks extracted byte-exact from the design and applied to copies. Baselines on the unmodified files reproduce every number the design re-declares (forbidden strings @196/250, @258, @375; heading @7; `NFR-4` @156+@304 only, both after heading; slice 16 lines; four negation clusters exactly 1 hit each; master @298/@300/@304×2; `?lang=` 0; `bilara-lang-param` 0 in both files). Post-patch, **every AC-7 and AC-8 matcher passes**: 3 predecessor forbidden strings → 0; `bilara-lang-param` 9 hits, first @7 < heading (now @18); `NFR-4` @14, before heading — FR-7.5 correctly activated and the errata block carries the literal token per review-2's S1; slice clusters 4×1 → 4×0 with in-slice `bilara-lang-param` present; master: 4 forbidden → 0, `?lang=` 3 hits, `bilara-lang-param` present, and all AC-8 content anchors (108/63, `dhp` gộp, the quoted `lang = request.args.get('lang', 'en')` line ×2, bảo lưu mẫu nhỏ, guard khóa vào response) sit in blocks (a)-(d). Block (3)'s "AC-1 và AC-4" claim is accurate (predecessor AC-4 is the `indacanda` `segmented=false` guard case). Block (d) fits the 2-column endpoint table.
- **Inherited review-2 findings:** W1 (AC-6 fetch-endpoint clause mis-scoped) — the design runs the clause in the correctly scoped form and says so with the exact rationale (design.md:272); S1 (FR-7.5/`NFR-4` token) — applied and measured. Both handled as declared.

## Critical Findings

None.

## Warnings

### W1: Tie-break candidate set silently includes `is_root` entries — an unmeasured path class behind the "cả 8 đường đi" coverage claim

- **Where:** §Luật tie-break (design.md:77), N3-B `find` predicate (design.md:117-119), §Performance table (design.md:249-260), coverage claim design.md:91
- **Evidence:** The rule admits any entry satisfying "`author_uid === translator`, `lang` truthy, `lang !== "en"`" — no `is_root` condition. The design's own Data Model (design.md:67) lists `is_root` among the entry fields it measured. Live `/api/suttaplex/mn10` lists `{author_uid: "ms", lang: "pli", is_root: true}` at index 0 — it satisfies all three conditions when a caller requests `translator: "ms"`. The design claims "hành vi đã chạy thật trên live API cho cả 8 đường đi" (design.md:91), but no root-author path appears in the Performance table or Risks.
- **Issue:** The class "requested translator is a root-edition author" changes behavior under this design: previously 2 requests → guard; now a retry with the root language fires first. Measured this session: `mn10/ms` (no lang) → no `translation_text`; `mn10/ms?lang=pli` → also no `translation_text` → outcome is guard after 1 wasted request (3 total, within NFR-6). So the live outcome is **safe** — but the design asserts complete path coverage while its candidate predicate admits a class it never names. House precedent treats root entries as non-candidates for translation serving: `formatUnavailable()` filters `is_root !== true` (src/index.ts:162) and `get_sutta_meta` filters `!t.is_root` (src/index.ts:309); N3-B departs from that precedent without stating it, the same way Alternative E explicitly states the `segmented` non-filter decision.
- **Recommendation:** One sentence in §Luật tie-break or §Error Handling naming the class and its measured outcome (root-author request → one wasted retry → guard, within the NFR-6 cap), mirroring the existing Alternative E treatment of the `segmented` non-filter. Alternatively add `&& t.is_root !== true` to the `find` — but that amends N3-B and forces re-verification, while the measured behavior difference is one wasted request on an exotic path; documenting is cheaper and sufficient.

### W2: Annotation miscount — "khối (2) chứa 3" is wrong; the block contains 4 `bilara-lang-param` hits

- **Where:** design.md:273 (AC-7 vehicle row)
- **Evidence:** "lát cắt AC-5: `bilara-lang-param` ≥ 1 (khối (2) chứa 3)". Measured on the block at design.md:187-193: `grep -c -F 'bilara-lang-param'` = **4** (heading line, Maps-to line, "Sau fix của `bilara-lang-param`", "Bản chuẩn hiện hành: AC-1 của `specs/bilara-lang-param/requirements.md`").
- **Issue:** Cannot flip the matcher (threshold is ≥ 1) — but it is a false measurement in an artifact whose entire method is exact self-measured literals. An implementer re-verifying gets 4 and must stop to decide whether the block drifted or the annotation is wrong. Secondary, same row: the post-insert heading position is predicted "~dòng 17"; measured 18 (11 lines inserted above line 7) — tilde-hedged, so noted here rather than counted as a separate defect.
- **Recommendation:** 3 → 4; optionally ~17 → 18.

## Suggestions

### S1: `git diff -U0` makes the AC-5 hunk clause mechanical and retires the "chạm" interpretation paragraph

- **Where:** design.md:55 (the "chạm = dòng `+`/`-`" reading), design.md:271 (AC-5 vehicle row)
- The design spends a paragraph defending a reading of AC-5's "không có hunk nào chạm" because with default context the gate line does appear in hunk 2 — as context (verified). Running the check as `git diff -U0 -- src/index.ts` emits no context lines, so "no hunk overlaps `extractText()` or the gate block" becomes a plain mechanical check with no interpretation to defend. One flag; the paragraph shrinks to a sentence.

## Strengths

- Every load-bearing self-declaration survived independent reconstruction: 2-hunk diff shape exactly as predicted, N1 byte-intact, 0 compile errors under the repo's real flags, all seven N4 invariants, all ~20 AC-7/AC-8 matcher outcomes on actually-patched copies, and the tie-break's `gu`/230 result with deterministic ordering across two live fetches. Third artifact in this lineage with zero literal drift on re-measurement.
- Pre-written verbatim doc blocks checked against every matcher remove the implementer's transcription risk entirely — the FR-7/FR-8 work reduces to copy-paste plus mechanical verification.
- Alternatives are honest: A concedes it is the only option making `trush`/`hi` reachable and records forward-compatibility; E names the real price of not filtering by `segmented`. Rejection costs are argued from measured data, not forecasts.
- Both inherited review-2 findings are handled explicitly in the artifact (scoped AC-6 run documented with rationale; `NFR-4` token present and positioned correctly), rather than silently absorbed.

## Summary

Approve with changes. The design's normative core — both N3 blocks, the tie-break rule, the 2-hunk diff prediction, and all eight doc blocks — verified end-to-end against the real repo, real compiler, and live API with zero drift. Two fixes before phase advance: document (or filter) the `is_root` candidate class that the tie-break `find` admits but the "8 paths" coverage claim omits (measured safe: guard after one wasted request), and correct the in-slice hit-count annotation (3 → 4).
