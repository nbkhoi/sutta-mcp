# Design Review 2: search-api-passthrough

**Artifact:** `specs/search-api-passthrough/design.md` (Status: Draft, 1274 lines)
**Upstream:** `requirements.md` (Reviewed), `clarifications.md`, `reviews/design-review-1.md`
**Reviewed:** 2026-10-23
**Scope:** re-review after reopen (see §Re-review boundary).

## Method

All checks ran in a temporary `git worktree add --detach` at `d972fa6` under `mktemp -d /tmp/sap-rv2.XXXXXX`. Afterwards the worktree was removed with `git worktree remove`, the directory was deleted, and `git worktree list` shows only the main worktree. No raw response was kept.

- **Assembly (regression check only).** Ran the §Lắp ráp recipe (`:418-432`) with the current design as `D`. Line counts were 446 / 167 / 231, and `tsc -p .` exited 0.
- **F2 (changed).** Ran it live on F1 and got 3 × `OK … 200`. Then ran F3, F4 and the tests:
  - The fixtures are 4591 / 580 / 10052 B, 15,223 B in total.
  - F4 printed `EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch`.
  - `npm test` gave `# pass 11`, `# fail 0`.
- **F2 negative paths (changed).**
  - `{"query":"anatta","language":"en","offset":-1}` gives `UNEXPECTED neg 500`, which is correct.
  - `curl` sent through a dead proxy (`https_proxy=http://127.0.0.1:9`) gives `INVALID anatta-en 000 (curl 7)`, which is correct.
  - A params row that `buildSearchUrl` cannot use gives `INVALID bad  (curl 2)`. See S1.
- **V2 (changed).** Ran it on three builds:
  - A build with `SC_BASE` changed to `https://127.0.0.1:9/api` gives `INVALID text="fetch failed"` and exit 3.
  - A mutant of the assembled build whose path is `search/instantX` gives exit 0 with `{"content":[{"type":"text","text":"SuttaCentral API error: 404"}],"isError":true}`. That run also hit one real `fetch failed` (exit 3) before the valid run.
  - The assembled build gives exit 0 for `anatta`/`en`, `vô ngã`/`vi` and `vô ngã`/`vi`/`["vi","pli"]`.
- **V3 (changed).** Ran it on three builds:
  - Against the host-broken build: `MATCH 1`, then `INVALID-PAIR 2 try=1..3`, then `INCONCLUSIVE (network) 2 get_sutta …` with exit 3.
  - Against a build with `SC_BASE` changed to `…/apiXX`: `MATCH 1`, then `MISMATCH 2 get_sutta {"uid":"mn10"}` with exit 1. This is valid non-JSON output, halted and not rerun.
  - Against the assembled build:
    - Run 1 ended in `INCONCLUSIVE (network)` at `get_sutta mn9999`. All three pairs were `fetch failed`, on the old side or on both sides.
    - Run 2 gave `AB-OK 6/6` with payloads 2509 / 6790 / 56 / 2715 / 463 / 2243 B, the same as the design (`:1092`).
- **Earlier S2.** Re-measured `Buffer.byteLength(content[0].text)` on the assembled build. The results were 4284 / 4408 / 10831, which match the table at `:1010-1012`.

## Re-review boundary

Admissible candidates:

- the earlier findings W1 and S1–S3;
- the new and changed text: §Harness và luật hợp lệ (`:1022-1030`), V2 header and body (`:1034-1074`), the A/B run report (`:1092`), V3 (`:1096-1124`), F2 (`:746-760`), §Fixture step 3 (`:722`), F4 description (`:732`), Data Model (`:102`), §I1, H1 Tính chất (`:413`), the Performance table (`:1007-1013`) and Risks rows `:1267` and `:1269`;
- regressions in the assembled code, the fixtures, the tests or the unchanged A/B inputs.

I considered these candidates and discarded them as out of scope:

- **Q1, the three extra AGENTS.md lines.** This is the user's decision at the design pause, per the dispatch. It is not a defect.
- **V2 detects `fetch failed` as a substring of the whole result text.** In principle, a valid result that contains that phrase would be misclassified. The rule is NFR-6's own literal (requirements `:331`), and this text did not change in this round. It is not a new issue.
- **The code blocks M1, I1, H1 and T1, and the documentation blocks.** They did not change in this round. Assembly, build, fixtures and tests reproduce the review 1 results, so there is no regression to report.

## Resolution of review 1 findings

- **W1: fixed.**
  - The invalid set in prose (`:1026`) and in V2 (`:1036-1038`, `:1065`) is now exactly NFR-6's list. That list is: the `"id":2` count is not 1, a timeout, `fetch failed`, or HTTP 000 at AC-4.
  - `SuttaCentral API error:` and empty text exit 0. I measured this on the 404 mutant.
  - The cap now has a defined outcome in prose (`:1028`), in V3 (`:1099-1101`, `:1114`), in F2 step 3 (`:722`) and in Risks (`:1269`). That outcome is "inconclusive (network)": not a pass, the orchestrator decides, and only `MISMATCH` is a code finding.
  - F2 now separates `INVALID` (transport) from `UNEXPECTED` (a valid result that differs, so halt), and both branches behave as described.
- **S1: fixed.**
  - Data Model `:102` and F4 description `:732` now say "theo thứ tự của danh sách `TOP`". This matches what F3 and F4 actually do.
  - `:102` also records that the raw key order matched on 2026-10-23.
- **S2: fixed.** The table now reads 4,284 / 4,408 / 10,831, and I re-measured the same values on the real source line.
- **S3: fixed.**
  - `:413` cites FR-1 and the requirements review 1 measurement for the silent drop.
  - AC-9.7 is cited only for the rejection when `query` is missing.

## Critical Findings

None.

## Warnings

None.

## Suggestions

### S1. F2 reports a URL-builder failure as `INVALID`, which contradicts "chỉ có khi lỗi truyền tải"

Step 3 (`:722`) says that an `INVALID` line "chỉ có khi lỗi truyền tải (`curl` thoát khác 0, gồm timeout, hoặc HTTP 000)". F2 (`:752-754`) checks `rc -ne 0` on `curl` without checking that `url` is non-empty.

If `node … buildSearchUrl` fails, `url` is empty and `curl` exits 2. Two cases can cause this: M1 is missing, which is step 1's precondition, or the import fails. I measured this with a params row that `buildSearchUrl` could not use. It printed `INVALID bad  (curl 2)`. Under step 3, that line would be retried 3 times and then reported as "inconclusive (network)".

This is a non-transport failure that lands in the invalid class. It is the same shape as review 1's W1, but much narrower: F1 is fixed and M1 must be in place first. That is why it is only a Suggestion.

Fix: before `curl`, add `[ -n "$url" ] || { echo "UNEXPECTED $name build-url"; continue; }`.

### S2. "Tối đa 3 lần" counts differently in different places

- §Chạy lại và trần (`:1028`) says "Chỉ lần chạy không hợp lệ được chạy lại, tối đa 3 lần cho mỗi input". This reads as up to 3 reruns, which is 4 attempts.
- V3 (`:1114`, `try` starts at 1, `[ $try -le 3 ]`) stops after **3 attempts in total**, which is 2 reruns. Its message says "3 cặp không hợp lệ".
- F2 step 3 (`:722`) says "ghi lại riêng dòng đó …, tối đa 3 lần; quá 3 lần thì báo". This again reads as 3 re-records after the first attempt.

The difference cannot change a pass or fail result. It can only change when the orchestrator is asked. Even so, the prose and V3 should state the same count.

Fix: in `:722` and `:1028`, write "tối đa 3 lần chạy cho mỗi input (lần đầu và 2 lần chạy lại)". This matches V3.

### S3. "Không phải lỗi code" overstates what an inconclusive result means

The cap outcome is labelled "không phải pass, không phải lỗi code" in `:1028`, in the V3 header `:1100` and in the V3 message `:1114`. But a deterministic code defect that always produces `fetch failed` reaches the same state.

I measured this. A build whose `SC_BASE` points to an unreachable host gives `INVALID-PAIR 2 try=1..3`, then `INCONCLUSIVE (network) … không phải lỗi code`.

NFR-6 treats `fetch failed` as invalid, so the classification is correct. Only the conclusion printed for the cap is too strong. Handing the decision to the orchestrator already limits the risk, so this is a Suggestion.

Fix: change the wording to "chưa kết luận". Also reuse the existing step at `:1026`: before reporting inconclusive, run `curl -sG` on the same URL. If `curl` succeeds while the tool failed 3 times, report a suspected code issue.

## Strengths

- **The fix is consistent across all its locations.** The narrowed invalid set and the defined cap outcome appear in the same terms in:
  - the prose (`:1026`, `:1028`);
  - the V2 header and code;
  - the V3 header, code and message;
  - F2 and step 3;
  - the Risks row `:1269`.

  No `STOP` or "empty text is invalid" wording is left. `grep -n -E 'STOP|t === ""'` on `design.md` gives nothing.
- **The new classification behaves as the prose says.** I checked it with a mutant for each class:
  - a transport failure gives exit 3 and then `INCONCLUSIVE`;
  - a non-2xx response gives exit 0 and is compared against the AC;
  - a valid non-JSON body gives `MISMATCH` with exit 1, and the script halts without rerunning;
  - an HTTP 500 at record time gives `UNEXPECTED`.
- **The run report is honest about flakiness.** `:1092` and Risks `:1269` now rate transient network failure as **H** and describe runs that hit the cap. This matches this review: 1 of 2 A/B runs against the assembled build ended in `INCONCLUSIVE (network)` because of `fetch failed` on both sides.
- **No regression.** Assembly, build, fixture bytes, `EQUIV-OK 21`, `# pass 11` and the A/B payload sizes all reproduce the review 1 results.

## Summary

W1 and S1–S3 from review 1 are fixed, and the fixes are consistent between the scripts and the prose. Under the changed V2, V3 and F2, each result class is classified as described:

- transport failures are rerun and the cap ends in "inconclusive (network)";
- non-2xx responses and other valid results are compared against the AC and halt on mismatch;
- `UNEXPECTED` halts at record time.

The unchanged parts still assemble, compile, record and test as in review 1, and the A/B run gives `AB-OK 6/6`.

There are three new minor Suggestions, all about the edges of the new rule:

- **S1:** an empty URL from the builder is reported as `INVALID`.
- **S2:** the retry count is stated differently in the prose and in V3.
- **S3:** the "không phải lỗi code" label is too strong.

Q1 is still open for the user at the design pause.

**Verdict:** Approve
