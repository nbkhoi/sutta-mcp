# Code Review (final, 1): segment-id-in-get-sutta

**Purpose:** on-completion
**Gate / series:** final-review, `code-review-final`, suffix 1
**Scope:** feature `segment-id-in-get-sutta`. The code change is in `src/index.ts`. The doc changes are in `specs/non-segmented-translation-guard/design.md`, `specs/bilara-lang-param/design.md`, `specs/sutta-mcp-requirements.md`, plus checkboxes and Results in `specs/segment-id-in-get-sutta/tasks.md`. `workflow-state.json` belongs to the orchestrator and is not reviewed.
**Contract sha256:** ba1ed234114061d5296ae8847b9d5b17bae80938dbc3cc892205b75c53967249
**Baseline:** base = head = `ff02cf7a3224a6df7b1929924e6c976487c2a94b` (branch `feat/segment-id-in-get-sutta`). All changes are uncommitted.
**Spec:** `requirements.md` (Reviewed), `design.md` (Reviewed), `tasks.md` (15/15 checked), `reviews/requirements-review-1.md`, `reviews/design-review-1.md`. Context: `AGENTS.md`.
**Reviewed:** 2026-10-03.

## Method

- **Review input.** I reviewed the capture `.claude/spec-evidence/segment-id-in-get-sutta/T-4-8-diff-30.bin` (format `SPEC-WORKFLOW-DIFF-V1`, tracked section 67,898 bytes, no untracked entries). I cross-checked it against `git diff --binary ff02cf7 --`. The two are byte-identical except inside `specs/segment-id-in-get-sutta/workflow-state.json`, which the orchestrator changed after the capture (capture-evidence and gate-opened events). That file is out of scope. No reviewed path drifted.
- **Static re-checks I ran myself (read-only):**
  - Every `[NORMATIVE]` awk/diff vehicle, both relative (against the predecessor designs) and absolute (against this design).
  - `grep -x -F` on the two N5-R lines and on M-1 and M-2.
  - The NFR-7 and invariant grep table.
  - `git diff ff02cf7 -U0 --numstat -- src/index.ts`.
  - `git diff --exit-code` on `package.json`, `package-lock.json` and `tsconfig.json`.
  - `npx tsc --noEmit -p tsconfig.json`, which runs diagnostics only, writes nothing and exits 0.
  - `dist/index.js` build currency, checked by mtime and token grep.
- **Not re-run, per role:** `npm run build` and the live stdio harness. For live behaviour I relied on the orchestrator's `T-*-verify-1.log` files and cross-checked their claims against the code paths that would produce them.

## Spec Conformance

**Code: conforms. Docs: conform except for one deviation from a Reviewed normative block (W1). Overall: not fully conformant until W1 is reconciled.**

| Item | Status | Evidence |
|---|---|---|
| N5-T (`Segment`, `ExtractedText`) | Verbatim | awk/diff empty against `design.md` and against `non-segmented-translation-guard/design.md` (8/8) |
| N1-A new `extractText()` | Verbatim | awk/diff empty, 20/20 lines, against both designs |
| N3-B new retry block with `servedLang` | Verbatim | awk/diff empty, 18/18 lines, against both `design.md` and `bilara-lang-param/design.md` |
| N5-R `Deep link:` line and `truncated.map(...)` line | Verbatim | `grep -c -x -F` of `design.md:172` and `:178` = 1 each; `truncated.join` = 0 |
| FR-1 / D1 `[id] text` | Met | `src/index.ts:301`, `truncated.map((s) => \`[${s.id}] ${s.text}\`)`. The ID comes from the key in `collect()` (`:120`). AC-1, AC-2 and AC-3 are in the T-4-3 and T-4-4 logs |
| FR-2 same set, order and text | Met | Filter predicate unchanged. The T-4-5 log has the live baseline diff `EMPTY` with IDs and without, 194/194 |
| FR-3 `max_segments` and tails | Met | Tail strings are not in any hunk. The T-4-5 log covers `s3` and `s500` |
| FR-4 / D2 served-lang deep link | Met | `servedLang` is assigned only at `:260` and `:272` (inside `if (retryLang)`) and read only at `:298`. The T-4-6 `snp1.8/piyadassi` log shows `lt` = 1 and `en` = 0, the only distinguishing case |
| FR-5 citation and Translator lines | Met | Both lines are context-only in the diff. AC-1 in the T-4-3 log |
| FR-6 guard unchanged | Met | No hunk touches the gate or `formatUnavailable()`. The T-4-7 log has `formatUnavailable unchanged: EMPTY` and 0 hits for every forbidden string, including `Deep link` |
| FR-7 normative sync | Met for code blocks. See W1 for the E-2 text | Diffs above, plus E-1 `diff` empty |
| FR-8 master spec | Met | M-1 and M-2 match the design `-x -F` exactly once each. Old form = 0 hits. Constraints `:278` is untouched |
| NFR-1..NFR-5, NFR-7 | Met | `package.json`, `package-lock.json` and `tsconfig.json` are unchanged. No new `src/` file. Diff is 9 hunks, +20/−10, as the design predicts. `segmented` 3, `sujato` 3, translator-ID literals (including `piyadassi`) 0, gate 1, `translation_text` 1, `Object.keys` 2, `' as '` 2. Still 3 `fetch(` call sites and at most 3 requests per `get_sutta` |
| NFR-6 language | Met | `Deep link` stays in English. The instruction in parentheses is Vietnamese |
| AC-7 manual browser check | Met. The record is below, as AC-7 requires | T-4-8 Result |

**AC-7 record (requirements AC-7: "ghi kết quả (ngày, trình duyệt) vào `design.md` hoặc review report").** T-4-8 deliberately did not edit `design.md`, so this report is where the record lives:

- **Who and when:** the user, 2026-10-03, Safari 26.6.2 (with GUI). The user's verbatim report was "Safari 26.6.2 - cả 2 đúng".
- **Pages checked:** both `https://suttacentral.net/mn10/en/sujato#mn10:13.1` and `https://suttacentral.net/dhp1-20/vi/phantuananh#dhp9:0` passed.
- **Corroboration:** the headless CDP measurement in `design.md:394-401` found `refFocused` set on the target segment for both URLs.

## Critical Findings

None.

## Warnings

### W1: The E-2 errata in `bilara-lang-param/design.md` is no longer verbatim, and `design.md` was not amended to match

**What changed.** `specs/bilara-lang-param/design.md:15-18` (capture hunk `@@ -6,6 +6,17 @@`) appends four lines to the E-2 blockquote that are not in this spec's normative E-2 (`design.md:266-271`):

> `> Đính chính (design-review-1 S2): ở §Vùng giữ nguyên byte-for-byte / vùng đổi, dòng bảng` … `> spec \`segment-id-in-get-sutta\`.`

`diff <(sed -n 266,271p design.md) <(grep -A9 -F '> **Cập nhật (2026-10-02' …)` returns `6a7,10`.

**Why it matters.** `design.md` §Thay đổi tài liệu is `[NORMATIVE]`. It says each block is "chữ chép nguyên văn vào đúng một vị trí" (`:236`) and "Không đụng gì khác trong ba file đó" (`:248`). The Reviewed design therefore no longer describes what shipped.

**What mitigates it.**

- The deviation was planned and recorded. T-3-2 acceptance in `tasks.md` authorizes "một mệnh đề/câu bổ sung trong khối E-2", and its Result quotes the exact text and gives the reason.
- The clause implements design-review-1 S2 (`reviews/design-review-1.md:61-67`).
- The clause is accurate. I checked `bilara-lang-param/design.md:56`, the heading `### Vùng giữ nguyên byte-for-byte / vùng đổi (FR-6)`, plus the table row at `:60` and the sentence "không khối N1 nào bị đụng" at `:66`. All three match `git show ff02cf7:` `:49` and `:55` byte-for-byte.
- All six original E-2 lines are intact, and the N3-B fence diff is empty.

**What is still open.** T-3-2 left the decision to the orchestrator ("không amend … design.md (để orchestrator quyết)"), and nobody has made it yet.

**Required change.** Either amend `design.md` E-2 (`:265-272`) to include the four lines, which brings the normative block back in line with the file, or record an explicit acceptance of the deviation in the spec. Without one of these, a future absolute-diff check of E-2 will report drift.

## Suggestions

### S1: Predecessor requirements still pin body-line literals without the `[id] ` prefix

**Where.** Re-running these ACs literally against the current build would now fail:

- `specs/bilara-lang-param/requirements.md:127`: "dòng đầu của phần thân là `Tiểu Bộ Kinh`".
- `specs/bilara-lang-param/requirements.md:165`: "dòng đầu của phần thân là `Middle Discourses 10`".
- `specs/non-segmented-translation-guard/requirements.md:240`: same.
- `specs/non-segmented-translation-guard/requirements.md:264` names bilara-lang-param AC-1 as "Bản chuẩn hiện hành", so it points at an AC that is now stale.

**Why it is only a Suggestion.** The design scoped errata to the two predecessor `design.md` files only (`design.md:238-248`), and the implementer correctly stayed inside that scope. So this is a gap in the design, not an implementation defect.

**Suggested follow-up.** Add a one-line errata to each predecessor `requirements.md` the next time those specs are opened, saying that body lines now carry `[segment_id] `. This would stop a future verifier from reading the old literals as a regression.

### S2: Several pinned literals are proven only by the implementer's Results, not by the orchestrator logs

**What the logs check:**

- `T-4-3-verify-1.log` checks the AC-2 body lines 1 and 50 by **prefix** only (`[dhp1:0.1] `, `[dhp9:0] `). It does not check AC-2 body line 3 (`[dhp1:0.3] Phẩm Song Yếu`) at all.
- `T-4-7-verify-1.log` does not check the `bilara-lang-param` AC-4 anchors that AC-5 requires: the suggestion list, `Sīhānaṁva nadantānaṁ,` absent, `Evaṁ me sutaṁ` absent.

The `tasks.md` Results for T-4-3 and T-4-7 claim all of these.

**Why the risk is low.**

- The text path is the same `.trim()` code that T-4-5 proved byte-equal to the live API on `mn10` (194/194).
- The guard output is statically unchanged: no hunk touches the gate, the guard block or `formatUnavailable()`.

**Suggested change.** In future runs, have the verify scripts assert full literals rather than prefixes, so the logs prove each AC on their own.

### S3: The T-4-8 Result adds detail the user's report does not contain

The user's verbatim report is "Safari 26.6.2 - cả 2 đúng". The Result goes further and states, for each URL, that the page scrolled to a specific text and that the segment was highlighted. That reading of "đúng" is reasonable, and the design's headless `refFocused` measurement supports it. A Result should still keep what the user reported separate from what the recorder inferred.

### S4: Note on the process deviations the dispatch asked about

None of these is a finding.

- **Adapter change that let the implementer write `doc_*` outputs.** The change is in `claude-dotfiles`, outside the reviewed diff, so I cannot assess it here. Its effect in this repo is the T-3-1..T-3-3 edits. Those match G-1, G-2, G-3, L-1, M-1 and M-2 byte-for-byte, and they stay inside the hunks the design lists: 3 hunks in each predecessor design, `numstat 2 2` on the master spec. The only exception is W1.
- **T-4-9 ran before T-4-8.** This is consistent with the dependencies. T-4-9 depends on T-4-2..T-4-7 only, and T-4-8 creates no files. The T-4-9 `git status` scope is still correct now (the six expected ` M` paths, no untracked files).

## Strengths

- **Code footprint matches the design exactly.** The diff is 9 hunks, +20/−10, and every hunk is inside the type block, `extractText()`, the retry block or the `output` array. The `-U0` diff contains none of `formatCitation`, `formatUnavailable`, the four other tools, `TOPIC_INDEX`, `DIVISIONS` or `z.`.
- **`servedLang` sits at the one place that knows the served lang.** It is assigned in the same statement block as the retry's `extracted` assignment and read once after the gate. The mandatory `snp1.8/piyadassi` run (T-4-6) re-fetched upstream first, which confirmed the case still distinguishes the metadata shortcut, and then passed.
- **Build evidence is current.** `dist/index.js` (08:15) is newer than `src/index.ts` (07:55) and contains `servedLang` and the `Deep link:` template, so the harness results came from the fixed build.
- **FR-2 was proven against live data, not against the spec.** The T-4-5 baseline diff came back empty both with and without IDs.
- **No residue.** Temp files are cleaned up (T-4-9 log `tmp leftovers: 0`), and there are no new dependencies, files or schema changes.
- **No new runtime risk.** `Object.entries` accepts the same inputs as `Object.values`, `uid` and `translator` are concatenated into the URL the same way the existing `formatCitation()` and `fetchBilaraText()` already do, and no new error paths, logging or resources were added.

## Summary

The code change in `src/index.ts` is a verbatim implementation of N5-T, N1-A, N3-B and N5-R. It type-checks cleanly, and the orchestrator's live evidence covers AC-1 through AC-6, the FR-2 live baseline, the hyphenated-ID check and the mandatory served-lang case. AC-8 holds on the master spec, and AC-7 was confirmed manually by the user (recorded above).

One Warning remains. The S2 errata clause added to `bilara-lang-param/design.md` is accurate and was authorized by the tasks, but it departs from the Reviewed normative E-2 text, and `design.md` has not been reconciled. Amending `design.md` E-2, or recording an explicit acceptance of the deviation, closes it.

**Verdict:** Approve with changes
