# Design Review 2: dynamic-search

**Reviewed artifact:** `specs/dynamic-search/design.md` (751 lines, after the narrow fix for review 1)
**Gate:** phase-review, scope `artifact/design`, series `design-review`, report 2 (re-review)
**Contract sha256:** `5148c63967787c7f3d1cf01e678543fd412d43e1984cf5eb4b30e78cf87a4e0f`
**Previous report:** `specs/dynamic-search/reviews/design-review-1.md` (Approve with changes: W1–W4, S1–S2)
**Mechanics checked against:** `~/.claude/spec-workflow/lib/workflow_contracts.py:117-383`, `lib/workflow_state.py:1388-1416`, `lib/spec_workflow.py:436-438, 1085-1086`, `workflow.md:10-12`, `protocol.md:55-78, 358-388, 418-424`

## Verification performed (2026-10-19)

All checks ran in a `mktemp -d` directory outside the repo, which I deleted afterwards. The only repo file written is this report.

- **Assembly and compile.** I extracted `src/`, `package.json` and `tsconfig.json` from `40846bb` with `git archive` and symlinked `node_modules`. I assembled `src/index.ts` with the §Lắp ráp pipeline (design.md:448-456).
  - S1 is 7 lines, S2 54 and S3 120, and the file is 584 lines. These match the comment on design.md:456.
  - `npx tsc -p .` exits 0.
- **Invariant grep table (design.md:690-699), re-run on the assembled file.**
  - Trial file: `segmented` 3, `sujato` 3, translator regex 0, `TOPIC_INDEX` 0, `grep -c -F 'search/instant?'` **1**, `fetch(` 4, `extracted.source !== "translation"` 1, `wc -l` 584.
  - Old file: `search/instant?` is 0 on `40846bb`.
  - Every pinned value matches.
- **Unicode scan of design.md.** No line differs from its NFC form; review 1 found two. The AC-3 command on line 658 is pure ASCII.
- **Live stdio runs on the trial build.**
  - `tools/list` returns `result.tools` with names `search_topic, get_sutta, get_sutta_meta, get_parallels, list_divisions`, so it meets validity rule 5.
  - `search_topic '{"topic":"vô ngã"}'` returns line 1 `Tìm thấy 11 sutta cho chủ đề "…" (trang 1):` and line 2 `Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"`. This matches the claim on design.md:658.
- **Contract mechanics.** `context:agents` is hashed over the raw file bytes (`file_sha256`, `spec_workflow.py:436-438`), so the `shasum -a 256 AGENTS.md` check in AC-14 (design.md:681) is the right comparison. `shasum -a 256 AGENTS.md` currently gives `ecd1fdd6…5afd15`, which equals the pin quoted on design.md:499.

## Resolution of review 1 findings

### W1: resolved

Section §Thứ tự áp dụng (design.md:497-509) and the risk row (design.md:749) now match the shared mechanics.

- **Risk row.** It now reads likelihood **H** and impact **H**, and it names the blocking mechanism: task dispatch, the on-completion review and `complete_workflow()`. This matches `workflow.md:11-12` and `workflow_state.py:1401-1402`.
- **Sequencing.**
  - A-1 is the last build task, isolated, and edits only `AGENTS.md` (design.md:501).
  - The contract update comes right after it and before the on-completion review (design.md:502-508).
  - The function sequence on design.md:503-507 exists, in that order, in `workflow_contracts.py`: `preview_contract_update`, then `authorize_contract_update`, then `write_contract_atomic`, then `finish_contract_update`, then `settle_contract_invalidation`.
- **Affected scope.** The claim on design.md:504 is correct. The preview subject is `dependencies.context:agents`, and it carries no template identity. `_affected_scope` (`:117-130`) therefore returns `{"type":"contract","id":"dependencies.context:agents"}`. `settle_contract_invalidation` accepts exactly that scope type with reason `contract-update` (`:342-346`), so no artifact is reopened.
- **User approval.** Design.md:505 requires explicit user approval at that exact point and forbids agent authorization. This matches `protocol.md:369-371`.
- **Refusal path.** Design.md:509 correctly sends refusal to restoring `AGENTS.md`, which needs a requirements revision.
- **`complete_workflow` can succeed.** After `finish_contract_update`, `pending_gate` is the reconciliation for the contract scope. After `settle`, that invalidation is `resolved`, and with none remaining, `pending_gate` is `None` and `next_action` is the supplied `after_action` (`:370-372`). Once the final review is processed, the remaining `complete_workflow` inputs can all hold: the dependencies match the new pin, there is no pending gate, and there is no pending invalidation.

### W2: resolved

- **Fix.** Design.md:678 (AC-11) and 696 (invariant table) now use `grep -c -F 'search/instant?'` = 1.
- **Explanation.** Line 678 explains why the unanchored form gives 2.
- **Measurement.** I measured 1 with `?` and 2 without. The `?` form excludes the S2 header comment and matches only the S1 `fetch` line.

### W3: resolved

- **Command.** Design.md:658 gives `/tmp/mcp-call.sh search_topic '{"topic":"vô ngã"}'` in ASCII.
- **Explanation.** The text now quotes `̂`/`̃` as escapes again and warns against pasting raw NFD.
- **Line 367.** It now uses the escape form as well.
- **File-wide.** No line in the file is non-NFC.

### W4: resolved

The validity rules on design.md:648-654 are now scoped per run type.

- **Rule 3** applies only to `search_topic`. AC-19 runs are `search_topic` runs and are covered by the rule's own AC-19 alternative.
- **Rule 4 (AC-12)** requires non-empty text and rule 2 on both old and new outputs before `cmp`. This keeps the guard against two identical `fetch failed` outputs.
- **Rule 5 (AC-14 `tools/list`)** checks `result.tools` contains `name` = `search_topic`. It exempts rules 2–3, which need `result.content`.
- **Run check.** The AC-12 row (design.md:679) states its runs met rules 1, 2 and 4. My `tools/list` run meets rule 5.

### S1: adopted

The AC-4 vehicle (design.md:671) is now `head -2 | grep -c -E 'anatta|jhana'` = 0, with the reason stated.

### S2: adopted

Design.md:679 records 6776/42/2701/449/2229 bytes, states the decoder dependence, and names `cmp` as the only criterion.

## Critical Findings

None.

## Warnings

None.

## Suggestions

### S3: Name where the A-1 task result and `after_action` fit in the contract-update sequence

- **Where:** design.md:501-508.
- **What is missing:** The section does not say whether A-1's own task result is persisted before or after the update.
  - The A-1 implementer changes `AGENTS.md` mid-dispatch, so step 7 of the mutation boundary (`protocol.md:71-73`) persists that result when the file no longer matches the pin.
  - `authorize_contract_update` overwrites `next_action` with `apply-contract-update` (`workflow_contracts.py:228-231`).
  - `finish_contract_update` and `settle_contract_invalidation` both require an explicit `after_action`, and `settle` rejects `reconcile`/`apply-contract-update` (`:358-362`).
- **Suggested text:** One sentence would remove an orchestrator judgment call. For example: "persist the A-1 task result (checked, with evidence) first, then preview. The `after_action` for `finish`/`settle` is the reserve + `dispatch-review` of the on-completion final review."
- **Also worth noting:** `authorize_contract_update` needs the preview persisted at a project path (`preview_path`, `:196-213`) as decision evidence.
- **Severity:** None of this blocks the plan. A conforming orchestrator reaches the same result, so this is a Suggestion.

## Re-review boundary

**Admissible candidates considered.**

- W1–W4 and S1–S2 from review 1.
- New text: design.md:64, 367, 489, 497-509, 648-654, 658, 671, 678-681, 696, 749.
- Possible regressions in S1–S3, the assembly pipeline and the invariant table, checked by re-assembly, `tsc` and the full grep table.

**Discarded as out of scope.**

- Content of the mapping table, the FR-1..FR-20 implementation, and the doc blocks R-1..M-3. Review 1 settled these, and the fix did not edit them; the assembly still reproduces 584 lines byte-for-byte from the same anchors.
- Q2 (partial matching) and the recorded user decisions (Vietnamese mapping with the API always called; `match`/`page`). These are user decisions, not findings.
- Whether a `context:agents` change warrants re-review beyond the contract scope. The design surfaces the affected-gate list to the user before authorization (design.md:504), and `protocol.md:366-367` leaves that judgment to the preview step. It is not a design defect.

## Strengths

- §Thứ tự áp dụng names the real shared functions in their real order. It ties the gate-impact claim to `_affected_scope`, and it states the refusal outcome instead of leaving it implicit.
- The grep fix explains why the unanchored count is 2. That prevents a future "correction" back to the wrong matcher.
- Per-run-type validity rules keep the vacuous-`cmp` guard for AC-12 while removing the false reruns.

## Summary

All four Warnings from review 1 are resolved, and both Suggestions were adopted.

- The assembly still reproduces a 584-line file that compiles cleanly.
- Every pinned grep literal re-measures.
- design.md has no non-NFC lines.
- I found no regressions.

One optional Suggestion remains (S3). It asks for a sentence naming where the A-1 task result and the `after_action` fit in the contract-update sequence.

**Verdict:** Approve
