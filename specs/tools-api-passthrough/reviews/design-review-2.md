# Design Review 2: tools-api-passthrough

**Artifact:** `specs/tools-api-passthrough/design.md` (1,688 lines, Status: Draft)
**Upstream:** `requirements.md`; prior review `reviews/design-review-1.md` (Approve with changes: W1, S1, S2)
**Dispatch:** `.claude/spec-evidence/tools-api-passthrough/dispatch/env-dr2.md` (sha256 `152937b0…7c8b67`)
**Date:** 2026-10-24
**Baseline:** HEAD = `7dc2299`

## Method

I worked in a fresh `mktemp -d` clone of the repo at `7dc2299` and deleted it afterwards, along with both harness directories.

1. **Assembly.**
   - Wrote P1, I1, T2, SE-1/SE-2, TS-1 and PK-1 with the design's `blk`.
   - Recorded fixtures live with F1–F3: 4 × `OK … 200`, trimmed to 2,804 / 1,295 / 11,410 / 7,711 B, and `test/fixtures/` totals 38,443 B.
   - Ran the §Lắp ráp script as extracted from the design. It printed all 7 `*-OK` lines.
   - `tsc` exits 0. `dist/` contains `index.js`, `passthrough.js`, `search.js`.
   - `npm test`: `# pass 20`, `# fail 0`.
2. **Harness, success path.** I extracted the §Harness invocation and V3/V4/V5 from the design and ran them unchanged, except that I print the exit codes.
   - On the first full run the cap was reached naturally. `ac8b` was valid on its second try and `ac10b-new` on its third. `ac10a-new` (`search_instant` `vô ngã`/`vi`) gave `fetch failed` three times, so V3 printed `INCONCLUSIVE (network) ac10a-new` and ran the remaining rows. `run.sh` then exited **3**, and V5 did not run.
   - Under the transport-only rule I reran only that row. It was valid on try 1. V5 then printed **51/51 PASS** with exit 0. No valid run mismatched.
3. **Harness, forced network failure.** Same pipeline, with the preload `globalThis.fetch = async () => { throw new TypeError("fetch failed"); }` passed through `NODE_OPTIONS`.
   - V3 printed 20 `INCONCLUSIVE (network)` lines and 11 `VALID` lines (`ac1.curl`, `ac6.curl`, `ac8.curl`, `ac9a`–`ac9f`, `list-base`, `list-new`), then exited 3. V5 did not run. This matches line 1389 exactly.
   - Running V5 on its own in that directory printed `INCONCLUSIVE (network) ac1.json ac2.json …` and exited 3, with no stack trace.
   - On the passing directory I truncated `ac7b.json`: V5 printed `INCONCLUSIVE (network) ac7b.json` and exited 3. With `ac6.curl` removed it printed `INCONCLUSIVE (network) ac6.curl` and exited 3. After I restored both, it exited 0.
4. **S1 re-measurement.** I fetched each body with `curl` and rendered it with the assembled `dist/passthrough.js` `renderBody(url, raw, "text")`, using the real request URL.
5. **S2 re-measurement.** For 8 endpoints I diffed the `?language=vi` response against the default response field by field: `suttaplex/mn10`, `suttaplex/dn`, `suttaplex/dhp1-20`, `parallels/mn10`, `parallels/dn22`, `menu`, `menu/sutta`, `menu/long`.

## Critical Findings

None.

## Warnings

None.

## Suggestions

### S1 (new, optional): one of V5's two inconclusive triggers is not a network condition

**Where:** line 1372 ("V5 cũng tự kiểm: output thiếu hoặc rỗng thì in `INCONCLUSIVE (network)`"), and V5 lines 1457-1463.

In the normative pipeline `"$H/run.sh" "$H" && (… node check.cjs)`, V5 runs only after every row was valid. A valid `tools/call` row always has a non-empty `.json`, because V2 writes stdout only when it exits 0. So when V5 is reached through `&&`, it can find an empty file only for a `.curl` row where curl exited 0 with a non-000 status and an empty body. That is a valid run with an unexpected result, which NFR-5 says to halt on. V5 would label it "inconclusive (network)" instead.

Both labels halt and report, so nothing passes wrongly. The case is also unlikely for the three pinned URLs. If you want the label to be exact, change the prose to say the empty-file branch is for running V5 on its own after `run.sh` exited 3, and that an empty `.curl` body after `run.sh` exited 0 is a mismatch.

## Re-review boundary

**Candidates in scope:**
- Earlier findings W1, S1 and S2.
- Changed text:
  - the rule prose at lines 895, 1372 and 1383;
  - the new "Đường quá trần" paragraph at line 1389;
  - V3 lines 1393-1416;
  - V5 lines 1455-1463;
  - Risks row 1681;
  - Performance header and table at lines 1340-1358;
  - the I1 `language` text at lines 419, 431, 446, 458, 473 and 486.
- Regressions to anything these changes touch: assembly, build, tests and the live ACs.

**W1: resolved.**
- V3 sets `inc=1` when a row reaches the cap and ends with `[ -z "$inc" ] || exit 3` (lines 1400, 1412, 1415).
- The invocation keeps the `&&`, so V5 runs only when every row was valid.
- Line 1383 states what exit 3 means and what to do.
- V5 checks for missing or empty outputs before parsing, so `JSON.parse` no longer crashes.
- All of this was exercised: a natural cap hit, a forced failure across 20 rows, and truncation.
- "Tối đa 3 lần" now means 3 runs (the first plus 2 reruns) in all four places: lines 895, 1372, 1397 and 1681. This matches `try -le 3`.

**S1 (round 1): resolved.** All 10 rows I re-measured match the table exactly in bytes and lines:

| Request | Body (B) | `text` (B) | Lines |
|---|---|---|---|
| `bilarasuttas/mn10/sujato` | 97,200 | 95,699 | 1,654 |
| `bilarasuttas/mn10` | 53,498 | 52,916 | 1,182 |
| `bilarasuttas/mn10/sujato?lang=vi` | 73,700 | 72,816 | 1,418 |
| `bilarasuttas/dhp1-20/phantuananh?lang=vi` | 21,522 | 21,027 | 656 |
| `suttaplex/mn10` | 12,962 | 15,027 | 558 |
| `suttaplex/dn` | 260,840 | 299,744 | 11,004 |
| `parallels/mn10` | 53,731 | 71,477 | 2,360 |
| `parallels/dn22` | 77,799 | 102,903 | 3,381 |
| `menu` | 168,235 | 182,917 | 6,333 |
| `menu/sutta` | 2,863 | 3,259 | 93 |

- The range "9–33%" holds: `menu` +8.7% and `parallels/mn10` +33.0%.
- The old literals (95,676, 52,900, 15,014, 182,914, 3,250) do not appear anywhere in `design.md` or `requirements.md`.

**S2: resolved.** Every new claim matches the live diffs:
- **`suttaplex/mn10`.** The only changes are `translated_title`, `previous.name`/`next.name` (`Right View ` → `Sammādiṭṭhisutta`), which entries carry `translations[].title` (the `vi` entry `minh_chau` gains `Kinh Niệm xứ`), and `priority_author_uid` (`sujato` → `null`).
  - `blurb` stays English.
  - `translations` has 43 entries in both responses.
  - `suttaplex/dn` (38 elements) and `suttaplex/dhp1-20` show the same field set and no other changes.
- **`parallels/mn10` and `parallels/dn22`.** Only `to.translated_title` and `to.translations[].title` change.
- **`menu`, `menu/sutta`, `menu/long`.** Only `translated_name`, `yellow_brick_road` and `yellow_brick_road_count` change, at both the node level and the `children` level. `sutta` with `vi` gives `Kinh tạng`.
- INDEX-OK pins I1 verbatim, so the build carries this text as written. The harness ACs `ac6b`, `ac7b` and `ac8c` pass.

**Discarded candidates, outside this round's scope:**
- The `hơn mười lần` latency ratio at line 1339. That text did not change.
- F2's manual per-row rerun at line 895. Only the wording of the cap changed, and it is now consistent.
- The Risks row's historical count "11 lần `fetch failed` trong ba lượt". It is a past observation and cannot be re-measured. My run alone had 7 invalid tries, so it is plausible.

## Strengths

- **The cap path matches the precedent and was tried both ways.** The design documents a forced-failure dry run (line 1389), and its counts (20 / 11 / exit 3) reproduced exactly. My unforced run then hit the cap on its own (`ac10a-new`). This shows the path is needed in practice, and that it now ends as "inconclusive" instead of as a crash that looks like a failure.
- **V5 now guards itself.** It checks for every expected output before any comparison and exits 3, so running it on its own can no longer produce a stack trace.
- **The re-measured numbers are exact.** All 10 performance rows and every `language` field claim reproduced. The header now says that the dòng nguồn is included in the byte count.

## Summary

All three round-1 findings are resolved, and I found no regressions:
- The assembly script prints all 7 OK lines, `tsc` exits 0, and `npm test` passes 20/20.
- The live ACs pass 51/51, after one transport-only rerun of the single row that reached the cap.
- Forcing every network call to fail ends in `run.sh` exit 3 and V5 exit 3, with no crash.
- The size table and the `language` descriptions match live data.

I have one optional new suggestion. When V5 runs through `&&`, its empty-file branch could only fire for a valid `.curl` row with an empty body. That is a mismatch, but V5 would label it "inconclusive (network)". Both labels halt, so this has no correctness impact.

**Verdict:** Approve
