# Code Review: get-sutta-unknown-uid (final)

**Purpose:** on-completion
**Scope:** feature `get-sutta-unknown-uid` (all tasks T-1-1..T-3-5)
**Series / suffix:** code-review-final / 1
**Contract sha256:** 6cdfe79e455ca6ecbf6ffc454f48bbd2555db643d5627ee399b40690a6e3daeb
**Baseline / head:** `249bb97f04185a7bac358645d504649b354f259d` / same commit; all changes uncommitted on branch `fix/get-sutta-unknown-uid`
**Reviewed capture:** `.claude/spec-evidence/get-sutta-unknown-uid/T-3-5-diff-14.bin`
**Date:** 2026-10-17

## Method

Static review only. I did not rerun the live A/B harness or `npm run build`. Checks performed:

- **Capture vs. working tree.** I parsed the capture (`SPEC-WORKFLOW-DIFF-V1`). The TRACKED section (783 bytes) is byte-identical to `git diff --binary 249bb97 --`. The untracked `requirements.md`, `design.md`, `tasks.md`, both `reviews/*.md` and `workflow-contract.json` are byte-identical to the working tree. Only `workflow-state.json` differs. It is orchestrator-owned and out of review scope, so the review target is the code as it stands.
- **Diff.** One hunk, `@@ -255,0 +256,8 @@ server.tool(`, 8 lines added and 0 removed, in `src/index.ts` only. `git status` shows ` M src/index.ts` and `?? specs/get-sutta-unknown-uid/` and nothing else. `package.json` is unchanged against `249bb97`.
- **Normative diffs**, re-run by me:
  - U1 against `design.md` §U1: empty, 14/14 lines.
  - N5-T, N1-A (`specs/non-segmented-translation-guard/design.md`): empty.
  - N3-A, N3-B (`specs/bilara-lang-param/design.md`): empty.
- **Invariant greps** on `src/index.ts`:
  - `segmented`: 3
  - `sujato`: 3
  - translator IDs: 0
  - `Không tìm thấy sutta với UID`: 2
  - gate `extracted.source !== "translation"`: 1
  - `translation_text`: 1
  - `fetch(`: 3
- **Protected-name grep.** `git diff -U0 -- src/index.ts | grep -c -E 'formatCitation|formatUnavailable|search_topic|get_sutta_meta|get_parallels|list_divisions|TOPIC_INDEX|DIVISIONS|z\.|extracted\.source|fetchSuttaplex|fetchBilaraText|Promise'` gives 0. I wrote it with real `|` alternation, which avoids the escaping trap in design-review W1.
- **Diagnostics.** `npx tsc --noEmit -p tsconfig.json` exits 0.
- **Build currency.** `dist/index.js` (mtime 12:45) is newer than `src/index.ts` (12:24) and contains the not-found literal 2 times. So the recorded harness runs were made against the fixed build.
- **Evidence logs read:** `T-*.log` and `T-*-verify-*.log`.

## Spec Conformance

**Conformant.** No missing or extra spec behavior.

| Req | Evidence | Status |
|---|---|---|
| FR-1 | `src/index.ts:258` `if (!suttaplex?.uid)`. `fetchSuttaplex` (`:10-16`) returns `data[0]` for arrays, so `null`, a missing field and an empty array all reach the not-found path. The check does not read `bilaraData`. | Met |
| FR-2 | `:259-261` returns one text item whose template literal is identical to `get_sutta_meta`'s, with `uid` verbatim and no `isError`. T-3-3-verify-1 shows a fresh run where `get_sutta == get_sutta_meta`, plus an exact match for all 5 inputs, including the case with two spaces before `mn10`. | Met |
| FR-3 | The early return comes before `formatCitation`, guard, retry and body. T-3-3-verify-1 shows `neg-hits=0`. | Met |
| FR-4 / AC-3 | The `return` (`:259`) precedes `if (retryLang)` (`:278`), so the not-found path makes 2 fetches (`Promise.all`, `:251-254`). | Met (structural) |
| FR-5 / AC-4, AC-5 | T-3-4-verify-2: for all 9 pairs, old==new and fresh==old, with anchors=1. A guard is skipped only when `uid` is truthy, so valid-UID paths run the same code as at `249bb97`. | Met |
| FR-6 / AC-6 | `ac6-empty`: old and new are both `isError=true`, and fresh==old. The new code adds no try/catch. | Met |
| FR-7 | N1-A, N1-B and N3-B are unchanged (empty diffs, gate count 1). U1 sits before `const citation`, so the N3-B fence stays contiguous. | Met |
| NFR-1..NFR-7 | See Method. Comment text avoids `get_sutta_meta`, `segmented`, `sujato` and `translation_text`. | Met |

## Critical Findings

None.

## Warnings

None.

## Suggestions

### S1: T-3-4 verifier retry should be conditional on run validity, and verify-1 did not record why it failed

`T-3-4-verify-1.log` line 1 reads `ac4-xyzzy: ... old==new=1 fresh==old=0 anchors=1`, followed by `FAIL=1`. The log does not record the fresh run's `items`/`isError` or a diff, so it cannot show whether the mismatch was an invalid run or a valid run with different bytes.

**Assessment of the handling: sound for this verdict.** Three reasons:

1. The implementer's `T-3-4.log` shows `ac4-xyzzy` hit `fetch failed` (`env=items=1 isError=true`, sha `e2c73a8f…`) twice, once on each side. Transient upstream failure on this exact input is therefore documented.
2. The U1 branch is unreachable for `mn10` (`uid` truthy), so a code-caused mismatch on this input alone is not plausible.
3. `T-3-4-verify-2.log` passed 9/9 with `fresh==old=1` on the first fresh call. The pass does not depend on the newly added retry.

**Weakness:** the new rule is "log the mismatch and retry once". As stated, it would also retry a valid but byte-different fresh run, and a second run that matched would hide it.

**Fix:** retry only when the fresh run is invalid under the tasks.md §Conventions rules (`isError=true` or `fetch failed` on a non-AC-6 case, or not exactly one `"id":2` line). Treat a valid run with a byte mismatch as a failure, and always write the fresh `.env` and a `diff` to the log. This is a process improvement for future verifiers. No rerun is needed for this spec.

### S2: Out-of-scope follow-up still open

The requirements' Out of Scope section names the same defect in `search_topic("nibbana")`: `sn43.14` returns `uid: null`, which renders `**?**` / `URL: https://suttacentral.net/?`. That is correctly not fixed here. Open a separate issue, as the requirements recommend.

## Strengths

- The change is the smallest that meets the spec. It is one early return, placed exactly as pinned in design §U1, and it reuses `get_sutta_meta`'s signal and literal instead of adding a new string or changing the shared `fetchSuttaplex()`.
- `?.` guards the empty-array and `null` cases, which the compiler would not catch with `suttaplex: any`.
- The evidence chain has no gaps:
  - The capture equals the working tree.
  - All normative diffs are empty.
  - The baseline-anchored numstat (`8 0`) settles design-review W1.
  - Independent verifier logs exist for every task.
  - Temp-file cleanup is verified (`T-3-5-verify-1.log`: all four paths gone).
  - Evidence stays under the git-ignored `.claude/` (`.gitignore:3`).

## Summary

The fix adds 8 lines in `get_sutta` and matches design §U1 byte for byte. It leaves every predecessor normative block and count invariant intact, and recorded runs show byte-identical output for all valid-UID and HTTP-error inputs. The transient `ac4-xyzzy` mismatch in T-3-4 verify-1 is explained by documented upstream `fetch failed` flakes, and verify-2 passed without using the retry. Neither suggestion needs a change before merging.

**Verdict:** Approve
