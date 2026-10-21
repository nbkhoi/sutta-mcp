# Requirements review 2: search-unit-tests

**Artifact:** `specs/search-unit-tests/requirements.md` (Draft, 2026-10-19, revised after review 1)
**Scope:** artifact/requirements, series `requirements-review`, suffix 2 (re-review after the user chose Fix for review 1's Block)
**Inputs checked:** `src/index.ts` (HEAD = master = `148b8c0`; `git diff --quiet 5459d5a -- src package.json tsconfig.json` = 0), `specs/sutta-mcp-requirements.md` at `148b8c0`, `README.md`, `AGENTS.md`, `specs/dynamic-search/requirements.md`, `reviews/requirements-review-1.md`.
**Recorded user decisions (2026-10-19), including the FR-17 master-spec edit:** treated as fixed, not as findings.

## Re-review boundary

Admissible candidates: review 1's C1, W1, W2, S1–S5; the new or changed text that fixes them (FR-2, AC-2, NFR-3, NFR-4, AC-8, FR-12 expected-value sources and FR-9/FR-10 rows, FR-14, FR-17, AC-9, decision 5, §Hiện trạng master-spec bullet, Assumptions fixture size, Open Questions, Out of Scope); and anything those edits newly affect.

Considered and discarded as out of scope:
- Assumptions `:313` cites `src/index.ts:238-240` for the filter fields; the code sits at `:237-239`. The off-by-one is in unchanged text that review 1 accepted, and it does not affect any check.
- Q2's default (no type-check of tests) and the Node 18 UNVERIFIED default. Both are unchanged and review 1 accepted them.

## Measurements performed for this review (2026-10-19, `mktemp -d` under `/tmp`, deleted)

- **FR-2 / AC-2 grep on today's `src/index.ts`:** returns **9**, at `:72, :79, :215, :267, :268, :279, :281, :283, :287`. This matches FR-2's stated baseline exactly. `grep -c -F "'Còn kết quả'," src/index.ts` returns 1, at `:203`.
- **Is 0 reachable?** I built a split copy of `src/index.ts`:
  - dropped `:40-93`;
  - added one import from `./search.js`;
  - kept `:94-208`, which includes the full zod schema and all `describe()` strings;
  - replaced the handler body `:209-293` with a resolve-query call, an empty-query early return, one `await fetchSearch(query, language, offset)` and a render call;
  - kept `:296-` unchanged.

  On that copy:
  - the FR-2 grep returns **0**;
  - `'Còn kết quả',` still returns **1**;
  - the FR-5 counts are 3 / 3 / 1 / 4 (`segmented` / `sujato` / `search/instant?` / `fetch(`).

  The check can therefore be satisfied by a conforming implementation.
- **FR-17 / AC-9 on the real master spec:**
  - At `148b8c0`, `grep -c -F 'src/index.ts'` returns 2 (`:160`, `:293`) and `src/search.ts` returns 1 (`:380`). The file has 380 lines. `git diff --stat 5459d5a 148b8c0` shows only this file with +14. All of this matches §Hiện trạng `:46`.
  - I simulated the FR-17 edit by substituting only on lines 160 and 293. The counts became **0** and **3**, and AC-9's `diff <(git show 148b8c0:… | sed 's#src/index\.ts#src/search.ts#g') …` was **empty**.
  - Negative control: one extra character on line 1 makes the `diff` non-empty (exit 1). The AC therefore catches edits beyond the two tokens.
- **README sections:** `## Cài đặt` is at `:19`, with a bash block containing `npm run build`. `## Chạy thử (dev mode)` is at `:28`. `:76` and `:80` both say `VI_TOPIC_TERMS` … `src/index.ts`. FR-14 cites all of these correctly.
- **dynamic-search AC-15** (`specs/dynamic-search/requirements.md:302-310`): the `metta` blocks are `SA 264` and `CND8`, with the exact CND8 line `**CND8** — Exposition of the Questions of the Student  Mettagū`. This matches the revised FR-12 FR-9 row. The behaviour also matches `formatContentMatch()` (`src/index.ts:81-93`): `.trim()` is applied to `name`, and the `**{acronym}**` fallback is used when `name` and `root_name` are both empty.

## Resolution of review 1 findings

| Review 1 | Status | Evidence |
|---|---|---|
| C1 (FR-2/AC-2 grep cannot reach 0) | Resolved | The pattern now uses `Còn kết quả:`, `Khớp tiêu đề:` and `Khớp nội dung:` (FR-2 `:98`, AC-2 `:224`). It gives 9 on the baseline and 0 on the split copy. AC-2 adds a positive check (`'Còn kết quả',` = 1), so the check cannot pass just because the describe string was deleted. |
| W1 (`du -k` vs bytes) | Resolved | NFR-4 `:204` and AC-8 `:284` both use `cat test/fixtures/* \| wc -c` ≤ 65536 bytes and explicitly exclude `du`. Assumptions `:321` records 52,531 bytes against 76 KiB from `du -k`. |
| W2 (Q1 default vs decision 5; NFR-3 inverted) | Resolved | The user decided the edit (decision 5 `:12`, Open Questions `:326`). FR-17 `:191` scopes it to the two tokens. NFR-3 `:202` lists the master spec, limited to FR-17. AC-9 `:292,298` checks it with the counts 0 and 3 plus the `diff`. FR-17 orders the edit before the AGENTS.md task, which is consistent with FR-16. |
| S1 (source of expected values) | Resolved, with one new inconsistency (see Suggestion S1 below) | FR-12 `:161-164` names the default source and the capture-window rule for whole-output literals. |
| S2 (AC-15 label, elided CND8 line) | Resolved | The FR-9 row `:153` now says "hai khối `metta` của AC-15" and pins the full CND8 line, with the double space and no trailing space. |
| S3 (FR-17 in Out of Scope) | Resolved | `:337` now excludes only "phần schema zod của FR-17" and assigns title-page slicing to FR-1(d). |
| S4 (README "Mục lệnh") | Resolved | FR-14 `:174` and AC-9 `:297` name `## Cài đặt`. |
| S5 (pure negation) | Resolved | The FR-10 row `:154` pairs the exact line-1 header with `1461` being absent. |

## Critical Findings

None.

## Warnings

None.

## Suggestions

- **S1: The FR-12 "file cạnh" option conflicts with the NFR-4 file cap.**
  - FR-12 `:163` lets the stored `5459d5a` output live "cùng file hoặc file cạnh, tính vào trần NFR-4".
  - NFR-4 `:204` and AC-8 `:284` cap `test/fixtures/` at 10 files, and FR-10 already needs 9.
  - So sidecar files are possible for at most one fixture. A design that picks sidecars for two or more fails AC-8. If the sidecars are placed outside `test/fixtures/`, `cat test/fixtures/* | wc -c` no longer counts them.
  - The byte headroom is also small: about 13 KB over 52,531 bytes. That is unlikely to fit whole outputs for the larger fixtures, such as `mindfulness` page 1 with up to 18 citation blocks.
  - Suggested fix: allow only "cùng file", or state that the 10-file cap does not count output sidecars and that `wc -c` covers them. This is optional because the default source (`:162`) needs no stored output.

## Strengths

- The C1 fix was checked both ways:
  - on the baseline (9, with every hit line listed);
  - on a split that keeps the schema (0).

  AC-2 adds the complementary positive check, which closes the loophole of passing by deleting the describe string.
- FR-17 / AC-9 is mechanically tight: two exact counts plus a whole-file `diff` against a substitution of `148b8c0`. It rejects any edit beyond the two tokens, which I confirmed with a negative control. The edit is also placed ahead of the AGENTS.md task, so FR-16's drift ordering is preserved.
- The byte-based cap gives its unit, its command and the reason (the `du -k` measurement of 76 KiB). Every master-spec literal in §Hiện trạng `:46` held up when re-measured.
- No regressions:
  - FR-5 counts on the split copy match the baseline;
  - the NFR-3 allow-list now matches every file that an FR edits;
  - decision 5, FR-17, NFR-3, AC-7 (base `148b8c0`) and AC-9 agree with each other.

## Summary

All of review 1's findings are resolved:
- C1: the corrected FR-2/AC-2 grep gives 9 today and 0 on a split that keeps the schema;
- W1: the cap is now measured in bytes;
- W2: the master-spec edit is carried by FR-17, NFR-3 and AC-9, and checked against the real file;
- S1–S5 are addressed.

One optional inconsistency was introduced: FR-12's "file cạnh" storage option clashes with NFR-4's 10-file cap.

**Verdict:** Approve
