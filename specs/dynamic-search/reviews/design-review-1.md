# Design Review 1: dynamic-search

**Reviewed artifact:** `specs/dynamic-search/design.md` (Draft, 2026-10-18, 736 lines)
**Gate:** phase-review, scope `artifact/design`, series `design-review`, report 1
**Contract sha256:** `5148c63967787c7f3d1cf01e678543fd412d43e1984cf5eb4b30e78cf87a4e0f`
**Upstream:** `specs/dynamic-search/requirements.md` (Status: Reviewed; reviews 1–3), template `templates/design.md.tmpl`, `src/index.ts` at `40846bb`, live `https://suttacentral.net/api/search/instant`
**Recorded user decisions (not findings):** Vietnamese keys are mapped to an English/Pali term and the API is always called. `search_topic` gets `match` and `page`. Q2 (partial matching) is still open with the user; the design uses the exact-match default from the requirements, which is correct.

## Verification performed (2026-10-18)

All checks ran in a `mktemp -d` directory outside the repo, which was deleted afterwards. No repo file other than this report was written.

- **Assembly and compile.** I extracted `src/`, `package.json` and `tsconfig.json` from `40846bb` with `git archive` and symlinked `node_modules`. I then assembled `src/index.ts` with the exact §Lắp ráp pipeline (design.md:449-456). Each awk pattern matches exactly one line in design.md. S1 is 7 lines, S2 54 and S3 120, and the assembled file is 584 lines. `npx tsc -p .` with the repo tsconfig exits 0.
- **Diff scope.** Every `diff 40846bb:src/index.ts` hunk falls inside old lines 32–107 or 194–228. `formatCitation()` (old :142-155), the three fetch helpers (:1-30), `get_sutta` including the U1 not-found block, and lines 231–519 are byte-identical. That supports the "untouched" claims and FR-14 at the code level.
- **Invariants on the trial build.**
  - `segmented` 3, `sujato` 3, translator regex 0, `extracted.source !== "translation"` 1, `TOPIC_INDEX` 0 (4 before), `fetch(` 4, `wc -l` 584. All match the design.
  - `search/instant` is **2**, not 1 (see W2).
- **Stdio runs.** I used a Node JSON-RPC client that waits for the `"id":2` response. It retries only on `fetch failed`, which happened about 13 times in one 28-run batch, the same transient network failures the design describes.
  - **AC-2:** all 28 key × language runs give exactly the n values in the §Bảng ánh xạ table (17/7, 20/20, 7/5, 11/17, 7/12, 14/17, 15/16, 15/10, 13/15, 18/19, 13/13, 19/12, 7/7, 9/9).
  - **FR-2 `chánh niệm`:** `mn10` is present for `en`/`vi` × `all`/`title`. `title` gives n = 3/3.
  - **Rejected candidates re-measured:** `refuge` 9/7 (titles 2/0), `nirvana` vi 10, `noble eightfold path` 6/5, `not-self` vi 6, `five aggregates` vi 9, `paticca-samuppada` en 0. All match design.md:112-123.
  - **AC-3:** the four `URL:` lists have the same md5 and line 2 is `"anatta"` in all four.
  - **AC-4:** all three inputs fall to FR-11, with 0 `anatta|jhana`.
  - **AC-5:** `an4.179` and `an6.100` each appear once. The forbidden-pattern grep gives 0, and n = 18/11/9.
  - **AC-6:** 18 `URL:` lines, the first is `an1.575-615`, no duplicates, no `mn10|dn22|1461|1462`, footer `page=2`.
  - **AC-7:** the `MN 10` block (`Difficulty: intermediate | Parallels: 16`) and the `AN 8.19` / `Text: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (pli)` block are both exact.
  - **AC-8 and AC-9:** as the design states. Empty and blank topics give 4 lines with no footer. `foo:bar` gives `SuttaCentral báo lỗi truy vấn: Unknown filter: "foo:"`.
  - **AC-15:** the `SA 264`, `CND8` and `SA 107` blocks are exact, and ` — $|Text: (null|undefined)` gives 0.
  - **AC-16:** `URL:` counts are 10/10/10/2/0, page 2 has `dn22` and `mn10`, page 4 has `uvs15` and `vb7`, page 5 is FR-20, and the 32 uids are distinct.
  - **AC-17:** 8 (`an1.296-305` … `an3.33`), then 5 starting at `an3.33`. Pages 147 and 148 are FR-20 plus `Hết kết quả.`. `vô ngã tướng`/vi/content gives FR-11, with the `match` hint and `Hết kết quả.`.
  - **AC-18:** page 4 is 2 title results plus 6 content results, and the content list is `diff`-identical to `content` page 4. Page 5 has no `Khớp tiêu đề:`.
  - **AC-19:** 7/7 return `isError` with the required prefix.
  - **AC-14 schema:** `tools/list` gives `match` `{"type":"string","enum":["title","content","all"],"default":"all"}`, `page` `{"type":"integer","minimum":1,"maximum":10000,"default":1}` and `required:["topic"]`. All six required words are present.
- **AC-12 A/B.** The `40846bb` build and the trial build gave byte-identical output (`cmp`) for all 5 inputs.
- **FR-15 docs.** I applied R-1, R-2, A-1, M-1, M-2 and M-3 by their content anchors to copies of `README.md`, `AGENTS.md` and `specs/sutta-mcp-requirements.md`.
  - Every anchor resolves uniquely. The M-1 header line occurs 5 times in the file, so it resolves only with the "after Tool 1" rule the design gives.
  - Results: `TOPIC_INDEX` remains on exactly 1 line (M-3, historical wording), `sn47.1, dn22` 0, 14/14 keys in README, `VI_TOPIC_TERMS` 2 in README and 2 in AGENTS.md. No other stale "topic index" description remains in the three files.
  - The blocks are consistent with S1–S3: the endpoint line, the `~585 lines` count, `match`/`page` semantics and the 14 keys.
- **Workflow mechanics read:** `spec-workflow/protocol.md:55-78, 358-386, 424`, `workflow.md:10-12`, `lib/workflow_state.py:1388-1410`, `lib/workflow_contracts.py:325-360`. Current `shasum -a 256 AGENTS.md` is `ecd1fdd6…5afd15`, equal to the contract pin.

## Critical Findings

None.

## Warnings

### W1: The AGENTS.md edit (A-1) will stop the shared workflow, and the design's mitigation is wrong

- **Where:** design.md:733 (risk row), design.md:525-550 (block A-1). The pin is in `workflow-contract.json` as dependency `context:agents` with sha256 `ecd1fdd6c81ca2ced6d7633f5b424d828839cc9988ded3c173514d5af94afd15`.
- **What the design says:** Likelihood "M", Impact "L", and the mitigation "Orchestrator cần biết trước để không đọc thay đổi hash như drift ngoài ý muốn".
- **What the workflow actually does:**
  - The orchestrator has no discretion here. `workflow.md:10-12`: "Drift blocks writes until an explicit contract update or reconciliation settles it."
  - `protocol.md:61-63`: on drift, the orchestrator must "expose a precise read-only difference and set no new workflow action; the user must restore the pinned resource or start contract update."
  - Completion is refused outright: `complete_workflow()` adds `"dependency drift"` to its failure reasons (`lib/workflow_state.py:1401-1402`).
  - FR-15 requires the edit, so the likelihood is certain (H), not M. The impact is that every later task dispatch, the on-completion code review (`code_review: on-completion` in the effective policy) and completion all halt until the user acts.
- **Deferring the edit is not a valid fix.** Doing A-1 after the workflow completes would take the change outside the workflow. FR-15 says "Cập nhật cùng thay đổi", and the AGENTS.md clause of AC-14 would then never be verified or code-reviewed. That would amount to changing a requirement without a requirements revision.
- **Required change to the design:**
  1. Correct the risk row: likelihood H, a blocking impact, and the real mechanism.
  2. Add a sequencing constraint for the task planner. Apply A-1 as the **last** code-phase edit, in its own task, after all `src/index.ts`, README and master-spec work. Immediately after it, run the protocol.md:358-386 contract-update path, which the user must authorize: `preview-contract-update` → `contract-update` decision → `apply-contract-update`. The resulting `contract`-scope invalidation settles through the decision (`settle_contract_invalidation`, `lib/workflow_contracts.py:325-360`). Only then dispatch the on-completion code review. Putting A-1 last means one contract update is enough and no intermediate task dispatch hits drift.
  3. Have the preview state which processed gates it marks as affected. Protocol step 2 tells the orchestrator to judge re-review conservatively, so the user should see that cost before authorizing.
- **Severity:** Warning, not Critical. The design itself is implementable and a documented recovery path exists. But as written, the plan walks the build into a stop the design claims will not happen.

### W2: The pinned literal `grep -c 'search/instant' src/index.ts` = 1 is wrong (measured 2)

- **Where:** design.md:662 (AC-11 row, "Đạt: 1, 4") and design.md:680 (invariant table, **1**).
- **Measured on the assembled trial file:** 2.
  - Line 35: ``const res = await fetch(`${SC_BASE}/search/instant?${params}`);`` (S1)
  - Line 40: `// ─── Search: chủ đề → /api/search/instant (spec dynamic-search) ───…` (the first line of S2, which the §Lắp ráp awk pattern itself anchors on)
- The design's "measured" result is therefore false, and the implementer gets a guaranteed false failure on AC-11/AC-13.
- **Fix:** pin 2, or change the matcher so it counts the call, for example ``grep -c -F 'fetch(`${SC_BASE}/search/instant' src/index.ts`` = 1. Then re-measure the row.

### W3: The AC-3 NFD command contains raw NFD bytes instead of the ASCII JSON escape the AC specifies

- **Where:** design.md:642. Line 367 has the same issue, but there it is only illustrative.
- **What the file contains:** a Unicode scan finds two non-NFC lines, 367 and 642. On line 642, the command `` `/tmp/mcp-call.sh search_topic '{"topic":"vô ngã"}'` `` holds bytes `76 6f cc 82 20 6e 67 61 cc 83`, which is decomposed text, not `vô ngã`. The explanation "server nhận chuỗi JSON có `̂`" now quotes a lone U+0302 instead of the escape it was describing.
- **Why it matters:**
  - Requirements AC-3 (requirements.md:220) fixes the input as the escape form "viết bằng escape JSON … truyền nguyên văn vào harness".
  - Requirements review 3 checked that this form is ASCII precisely so that no step can silently NFC-normalize it.
  - Copying raw NFD through an editor, terminal or chat layer that normalizes to NFC turns the NFD case into a repeat of the `vô ngã` case. AC-3's NFD clause would then pass vacuously.
  - It works today: I ran the escape form and got the same md5 as NFC. The risk is the vehicle, not the code.
- **Fix:** write the command with the literal ASCII escape `'{"topic":"vô ngã"}'`, and restore the escape in the explanatory sentence.

### W4: Run-validity rule 3 permanently invalidates the AC-12 and AC-14 `tools/list` runs

- **Where:** design.md:634-638. Rule 3 says a run counts only if the text contains "dòng đầu `Tìm thấy` / `Không tìm thấy` / `Không có kết quả`, hoặc tiền tố AC-19". Only AC-19 gets an exception (for rule 2).
- **Measured first lines of the AC-12 outputs:**

  | Input | First line |
  |---|---|
  | `get_sutta mn10` | `────…` |
  | `get_sutta_meta mn10` | `**MN 10** — …` |
  | `get_parallels mn10` | `**Parallels của MN10:**` |
  | `list_divisions` | `**Sutta Pitaka (Kinh tạng):**` |

  Only `get_sutta mn9999` (`Không tìm thấy sutta với UID: mn9999`) passes rule 3. The AC-14 `tools/list` run has no text content at all. Read literally, rule 3 says to rerun these forever.
- **The guard is still needed for AC-12.** `cmp` of two identical `fetch failed` outputs, one from the old build and one from the new, would pass vacuously, and rule 2 is the only thing that excludes that.
- **Fix:** scope rule 3 to `search_topic` runs. For AC-12, require each old and new text to be non-empty and to pass rule 2 before `cmp`. For AC-14, require a `result.tools` array containing `search_topic`.

## Suggestions

- **S1: The AC-4 vehicle is broader than AC-4.** design.md:655 greps the whole output for `anatta|jhana`. AC-4 (requirements.md:228) constrains only the header. All three inputs currently return 0 results, so it passes today. If SC starts returning hits for `thiền định`, a result line could legitimately contain these strings. The design's own "no `Thuật ngữ đã dùng` line" check is the precise vehicle. Scope the grep to lines 1–2.
- **S2: The AC-12 byte counts depend on the decoder.** design.md:663 records 6777/43/2702/450/2230 bytes. My decoder writes the text without a trailing newline and measured 6776/42/2701/449/2229. The `cmp` result is unaffected, but mark the counts as dependent on the `check` decoder so no one reads a 1-byte difference as a regression.

## Strengths

- S1–S3 compile clean, and the §Lắp ráp pipeline reproduces a 584-line file. Locking the whole file with one `diff` against an immutable commit is a mechanical net that makes the "untouched" claims (fetch helpers, `formatCitation()`, U1, N1/N3/N5 blocks) checkable rather than interpretive.
- Every mapping number re-measured exactly, across 28 runs plus 8 rejected candidates. The selection rule (min(n_en, n_vi), tie broken by n_en) is explicit and closed over a stated candidate set.
- Passing a copy of the suttaplex with a converted `difficulty` to `formatCitation()` meets FR-8 and FR-14 without touching the shared function.
- `Map` instead of an object literal removes the prototype-key bug (`constructor`) that the old `searchByTopic()` has.
- The FR-18 implementation matches the requirement formula term for term (`h` counted before the article/uid filter, the `h > 0` guard), and AC-17's `vô ngã tướng` case exercises the guard live.
- The doc blocks use content anchors, include the Tool 2..5 header-collision rule, and their AC-14 claims reproduce exactly.

## Summary

The code design is sound. It compiles, implements FR-1..FR-20 as specified, and every behavioral AC I re-ran on live SuttaCentral passed with the design's literals. There are four Warnings:

1. **W1:** editing AGENTS.md under the contract's `context:agents` pin needs an explicit, user-authorized contract-update step, sequenced after the last edit and before code review. The design's current mitigation misstates how drift is handled.
2. **W2:** one pinned grep count is wrong (2, not 1).
3. **W3:** the AC-3 NFD command lost its ASCII escape, so the test can pass vacuously.
4. **W4:** run-validity rule 3 is scoped too broadly and blocks AC-12 and AC-14.

All four are localized text fixes to design.md.

**Verdict:** Approve with changes
