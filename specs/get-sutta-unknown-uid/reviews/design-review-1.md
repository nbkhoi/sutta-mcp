# Design Review 1: get-sutta-unknown-uid

**Artifact:** `specs/get-sutta-unknown-uid/design.md` (293 lines, Status Draft)
**Gate:** phase-review, scope artifact/design, series `design-review`, suffix 1
**Contract sha256:** 6cdfe79e455ca6ecbf6ffc454f48bbd2555db643d5627ee399b40690a6e3daeb
**Reviewed:** 2026-10-17. Checked against `requirements.md` (Reviewed), `reviews/requirements-review-1.md`, `src/index.ts` (working tree identical to `249bb97` for `src/`), the three predecessor designs, the design template, AGENTS.md, and the live SuttaCentral API.

## Re-measurement summary

I re-ran every check the design says it ran. I worked only in a scratch directory outside the repo and left the repo untouched (`git status` still shows only `?? specs/get-sutta-unknown-uid/`).

- **U1 compiles and is placed correctly.** I extracted `src/` from `249bb97` with `git archive` and replaced the 6-line region with the design's U1 fence, taken by the design's own awk range. `npx tsc --noEmit -p .` and `npx tsc -p .` both exit 0 with the repo's `tsconfig.json`. `diff -U0` gives exactly 1 hunk, `@@ -254,0 +255,8 @@`, +8/−0, matching `:80` and `:127`.
- **The 14-line pinned-region check (`:101-106`) works in both directions.** It prints nothing on the patched copy, and both sides extract 14 lines. In the design file the start pattern matches only the U1 fence. On the unmodified `src/index.ts` the range extracts 6 lines and the diff is non-empty, so the check fails before the change is made and passes after it.
- **The not-found message matches `get_sutta_meta` exactly.** In the patched file `grep -F 'Không tìm thấy sutta với UID' | sort | uniq -c` gives one distinct line with a count of 2: the two lines are character-for-character identical. `src/index.ts:325` is the correct pre-change location.
- **Predecessor awk checks (`:48-54`).** On both the unmodified file and the patched copy, N5-T (8 lines), N1-A (20), N3-A (6) and N3-B (18) all give an empty diff against their design files. The gate string count is 1. The other predecessor invariants also still hold on the patched copy: `Object.keys` 2, `' as '` 2, `servedLang` 3, `truncated.join` 0, and both N5-R lines (`segment-id-in-get-sutta/design.md:172`, `:178`) each match exactly once with `grep -c -x -F`.
- **Invariant grep table (`:233-241`).** Before / after: `segmented` 3/3, `sujato` 3/3, translator-ID regex 0/0, not-found literal 1/2, gate string 1/1, `translation_text` 1/1, `fetch(` 3/3. All exact.
- **AC-7 hunk grep (`:229`).** I committed the unmodified file in a scratch git repo and applied U1. With the alternation written as plain `|`, `git diff -U0 -- src/index.ts | grep -c -E …` gives 0. The hunk header's function context (`server.tool(`) matches none of the listed names.
- **Predecessor line and verbatim claims (`:56-58`).** All of these are correct:
  - The N3-B fence in `bilara-lang-param/design.md:122` starts at `const citation`.
  - `segment-id-in-get-sutta/design.md:137` cites `:253-265`, and `const citation` is currently at `:256`.
  - No predecessor matcher depends on `src/index.ts` line numbers. I searched every `specs/*/*.md` for `sed -n 'Np' src` and `awk 'NR`: no hits.
  - The `non-segmented-translation-guard/design.md:239` fence is marked illustrative except for N1-B.
  The one exception is the line reference `:194` (S1).
- **Live API, curl 2026-10-17.** Every value the design pins matches:
  - `mn9999`, `MN10`, `%20mn10` and `dhp1` each return 200, a 1-element array, `uid: null` and 0 translations.
  - `mn` returns 171 elements with `[0]` `mn`/branch. `dhp` returns 27 elements with `[0]` `dhp`/branch.
  - `ma98` is a leaf with 4 translations, `mn10` 43, `dhp1-20` 33.
  - Bilara returns `{"msg": "Not Found"}` for `mn9999`, `dhp1`, `dhp` and `mn` (all `/sujato`). `mn10/xyzzy` and `ma98/sujato` return `html_text`.
  - `/api/suttaplex/?language=en` returns 404.
- **Baseline procedure (`:179-186`).** It runs as written: archive, then symlink `node_modules`, then `npx tsc -p .`. It writes nothing into the repo or into `.git`. Node resolves the SDK through the symlink, and the baseline server answers.
- **Full A/B (all 15 inputs of AC-1..AC-6, old and new build).**
  - New build: AC-1 and AC-2 give exactly `Không tìm thấy sutta với UID: {uid}`, 1 item, no `isError`. The `" mn10"` case has two spaces (checked with `od -c`). The `get_sutta` text matches the `get_sutta_meta` text byte for byte.
  - Old build: AC-1 and AC-2 carry the `URL: https://suttacentral.net/?` anchor.
  - AC-4 5/5, AC-5 3/3 and AC-6 pairs are byte-identical under `cmp`.
  - All positive anchors in `:203-208` are present, including `  • English — Bhikkhu Sujato (sujato)` and `[mn10:1.1] So I have heard.`.
  - The design's `check()` decoder (`:216`) works, and exits 1 with `BROKEN RUN 0` on empty input.
- **Transient-error rate.** Five of about 40 runs returned `isError: true` / `fetch failed`. Two of these came from sequential re-runs, the rest from pairs run 2 at a time. This independently confirms that the validity rule (`:194-199`) and the re-run-the-pair rule are needed. Without them, `mn10/sujato` would have been recorded as a false regression twice.

## Closure of requirements-review-1

- **W1 (N3-A not protected).** Closed at the design level: N3-A is in the predecessor-block table (`:53`) and in Component Boundaries (`:125`), and its awk diff is part of the AC-7 vehicle. `requirements.md` FR-7 (`:89`) still lists only N1-A/N1-B/N3-B. That is a requirements-text residue the design cannot fix, and it is harmless because the design carries the check.
- **W2 (baseline validity and drift).** Closed. There is a four-condition validity rule that applies to the old build too, and condition 3 explicitly rejects `fetch failed`, which the `"id":2` rule alone did not. Old and new runs are paired back to back, the old build comes from `249bb97` via `git archive`, and any mismatch triggers a re-run of the whole pair. The live measurements above confirm the rule is necessary.
- **S1 (AC-6 not in the baseline set).** Closed: AC-6 is in the baseline set (`:210`).
- **S2 (Q1 already decided).** Closed: central decision 3 (`:34`) derives the answer from NFR-4.
- **S3 (FR-6 vs FR-2 precedence).** Closed: `:145` gives the precedence with the `Promise.all` reasoning and an observed instance.

## Critical Findings

None.

## Warnings

### W1: The AC-7 vehicle for NFR-5 ("no hunk touches the protected components") can pass without checking anything

AC-7's hunk-scope clause is the only mechanical check for NFR-5 outside the 14-line U1 region. U1 and the awk diffs only cover their own extracted ranges. A change to `formatCitation()`, `search_topic` or `get_sutta_meta` elsewhere in the file would reach the grep at `:229` and nothing else. The vehicle as written has two independent ways to pass on any change:

1. **The diff is not anchored.** `git diff -U0 -- src/index.ts` (`:229`) compares the working tree with HEAD. Once the implementer commits, which is the normal state when on-completion code review runs, the diff is empty and `grep -c` gives 0 no matter what changed. The same applies to the `git status` check for "`package.json` unchanged".
2. **`\|` is copied literally from the markdown table.** Inside the table cell, the alternation is written `\|` (markdown pipe escaping). Copied verbatim from the raw `.md`, `grep -E 'formatCitation\|formatUnavailable\|…'` treats `\|` as a literal pipe on both `/usr/bin/grep` (BSD) and the `grep` in this environment (ugrep 7.8.4). I measured it: `printf 'formatCitation(x)\n' | grep -c -E 'formatCitation\|formatUnavailable'` gives 0. Every listed check whose expected value is 0 then passes regardless of input. This covers AC-7 `:229` and the AC-1 negation grep at `:223`. AC-1 is still covered by its exact-equality anchor, so only AC-7 depends on this.

The design already has the strongest possible check: its own measured diff shape, "1 hunk, +8 / −0" (`:127`). It reports this as a measurement, not as a vehicle.

**Fix:** In the AC-7 row, replace the hunk grep with commands in a fenced block (not a table cell), anchored to the baseline commit:

```sh
git diff --numstat 249bb97 -- src/index.ts        # must print exactly: 8	0	src/index.ts
git diff --quiet 249bb97 -- package.json          # exit 0
git diff --name-only 249bb97 -- src | wc -l       # 1
```

Together with the U1 diff, `8 0` pins the whole change: 8 added lines, all inside U1, and nothing else. The NFR-5 name grep can stay as a quick filter if it is also anchored (`git diff -U0 249bb97 -- src/index.ts | grep -c -E 'a|b|…'`) and written outside a table.

## Suggestions

### S1: Wrong line reference for the "rơi vào guard" sentence

`:58` and `:292` cite `specs/segment-id-in-get-sutta/design.md:194`. The sentence "UID sai chữ hoa/thường rơi vào guard trước khi tới dòng này" is at **`:190`** (`grep -n 'rơi vào guard'`). Line 194 is the "Output đầy đủ của đường bình thường" paragraph. The design's conclusion about that sentence is correct; only the number is wrong.

### S2: The diff-shape numbers depend on the diff tool; say which one they come from

`@@ -254,0 +255,8 @@` (`:127`) is what `diff -U0` prints. For the same change, `git diff -U0` prints `@@ -255,0 +256,8 @@ server.tool(`, because git places the inserted blank line after the block instead of before it. Both show +8/−0. Since AC-7 runs `git diff`, either quote git's header or drop the line numbers and keep "1 hunk, +8/−0" (or `numstat 8 0`, see W1).

### S3: The baseline guard prints a warning but does not stop the procedure

`:181` (`… || echo "STOP: …"   # phải im lặng`) prints and continues, while `:189` says "Dòng kiểm đầu tiên dừng lại". If the block is pasted as a script, the remaining lines still run. Use `|| { echo "STOP: …"; exit 1; }`, or say the line is a manual gate. Impact is low because `git archive 249bb97` builds the correct baseline either way. The guard only protects against an unrelated `src/` change being folded into the A/B result.

### S4: Data Model array-size notation

`:71` gives `mn` as "`[{"uid": "mn", …}, …170 phần tử]`" and `dhp` as "27 phần tử". The first reads as 170 total, while requirements `:54` and the live API give 171. Write "171 phần tử" so the two match.

## Re-review boundary

Not applicable (first design review).

## Strengths

- **Every value is re-measured, and all of them hold.** Live API values, all awk and grep counts, the 14/14 U1 extract, the +8/−0 diff shape, the build result, and the A/B results on all 15 inputs reproduced exactly. The only exception is one predecessor line number (S1).
- **The normative block covers its placement context, not just the `if` body.** The 14-line U1 region checks the guard and its position together. The design explains why the N3-B matcher alone would miss a misplacement (`:56`, `:290`) and why the missing-`?.` variant compiles but is caught by the diff (`:112`). This closes the call-site drift class (anti-pattern 13) instead of leaving it to code reading.
- **The not-found signal is chosen on observed data.** Alternative B is rejected because `mn/sujato` and `dhp/sujato` return the same bilara body, so a bilara-based signal would misclassify both branch UIDs. Both are measured, and AC-4 pins them byte for byte.
- **The A/B validity rule addresses a real failure mode.** `fetch failed` occurred repeatedly during this review, and the rule handles it correctly. Using `git archive` for the baseline leaves no worktree or stash behind.
- **The scope is minimal and the reasoning matches it.** The change is one `if` with an early `return`. Each alternative is rejected with a concrete NFR, a measurement, or a structural reason. FR-3 and FR-4 hold by construction (early return) rather than depending on upstream returning `translations: []`.
- **Template conformance.** Every template section is present, in order. Sections that do not apply say so.

## Summary

The design is correct, minimal and accurately measured. U1 compiles, sits in the right place, matches `get_sutta_meta`'s message character for character, and leaves every predecessor normative block and invariant unchanged. The baseline procedure runs as written and writes nothing into the repo. The live A/B reproduces every claimed outcome. All five items from requirements-review-1 are closed. The one Warning is about AC-7's check for NFR-5 (no hunk touching protected components). As written it compares against HEAD rather than `249bb97` and carries markdown-escaped `\|`, so either problem alone makes it report 0 for any change. Anchoring it to `249bb97` and pinning `numstat 8 0` fixes this mechanically. The suggestions are a line reference, a diff-tool note, a non-halting guard line, and an array-size notation.

**Verdict:** Approve with changes
