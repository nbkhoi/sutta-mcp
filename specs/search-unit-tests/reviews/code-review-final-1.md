# Code review (on-completion) 1: search-unit-tests

**Purpose:** on-completion
**Scope:** feature `search-unit-tests` (all 16 tasks, T-1-1 … T-7-1)
**Series / suffix:** `code-review-final`, 1
**Baseline:** `148b8c0` (branch base; `src`, `package.json`, `package-lock.json`, `tsconfig.json` identical to `5459d5a`)
**Bound snapshot:** git evidence `git-32`, `.claude/spec-evidence/search-unit-tests/T-7-1-diff-32.bin` (working tree vs `148b8c0`, including untracked bytes)
**Binding inputs:** `requirements.md` (Reviewed), `design.md` (Reviewed), `tasks.md` (16/16 `[x]` with Results), pinned `AGENTS.md` sha256 `8acd68cd7cdd9a4021fd7245f243baed23663208943edfc79cb3d15a943ddc20` (re-measured: matches the re-pinned contract)
**Recorded user decisions (not findings):** the MVS split into `src/search.ts`; `node:test` via `tsx`; offline fixtures with no `fetch` mock; no e2e, linter or CI; FR-17; Q2 (tests are not type-checked); the authorized `AGENTS.md` contract update.

## Method

This was a static review. I did not rerun `npm run build`, `npm test` or the live A/B harness. The role rule forbids reruns, and the supplied evidence is adequate: `T-7-1-verify-1.log` on the final tree records `build: got='0'` and `npm-test: got='# pass 16 # fail 0'`. `dist/index.js` and `dist/search.js` are dated 2026-10-20 19:15, after every source edit (`src/*.ts` 07:04–07:05). `dist/index.js` imports `search.js`.

These checks were run read-only during the review:

- **Snapshot binding:** I parsed `T-7-1-diff-32.bin`. Its tracked section (16,583 B) is byte-identical to `git diff 148b8c0`. All 19 untracked payloads are byte-identical to the working tree: 6 spec files, the contract, `src/search.ts`, `test/search.test.ts` and 9 fixtures. The only difference is `workflow-state.json`, which is orchestrator-owned and was rewritten after the snapshot (expected).
- **Design §Lắp ráp:** I ran the design's own `blk` commands in a private `mktemp -d` under `/tmp`, which I deleted afterwards. All six checks printed OK: `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `SCRIPTS-OK`, `CITATION-OK`, `S2-PROVENANCE-OK`.
  - `src/index.ts` is byte-identical to `5459d5a` ranges + I1 + H1.
  - `src/search.ts` is byte-identical to M1.
  - `test/search.test.ts` is byte-identical to T1.
  - The `scripts` block of `package.json` is byte-identical to P1.
- **FR-5 greps:**
  - On `src/index.ts`: `segmented` 3, `sujato` 3, translator names 0, `search/instant?` 1, `fetch(` 4.
  - On `src/search.ts`: 0 for all five.
- **FR-2 greps:** the literal pattern gives 0; `'Còn kết quả',` gives 1; `await fetchSearch(` gives 1. In H1, `query === ""` returns at `src/index.ts:140-141`, before `await fetchSearch(` at `:143`.
- **FR-3:** `src/search.ts` has no `import` lines. `grep -rn -E 'fetch|src/index' test/` returns nothing.
- **Dependencies:** `git diff 5459d5a -- package.json` shows exactly `-"start"…`, `+"start"…,` and `+"test": "tsx --test test/search.test.ts"`. `package-lock.json` and `tsconfig.json` are unchanged.
- **Fixtures:**
  - 9 files, 52,333 bytes in total.
  - Each file's keys are exactly `url, recorded, body`, and every file has `recorded` = `2026-10-20`.
  - Query strings and `total`/`suttaplex`/`hits` counts match design §Fixture for all 9 files. Example: `mindfulness-en-1460` gives 1460/32/0, and `vo-nga-tuong-vi-0` gives 1/1/0.
  - Element fields are a subset of the FR-11 allowlist, in FR-11 order, for every element.
  - The `highlight|translations|fuzzy_dictionary` grep is empty.
- **Docs:**
  - `git diff 148b8c0` of `README.md` is +4/−2: R-1 after `npm run build`, plus R-2 and R-3.
  - `AGENTS.md` is +4/−3: A-1a..A-1d.
  - `specs/sutta-mcp-requirements.md` is +2/−2: exactly the two `src/index.ts`→`src/search.ts` tokens at `:160` and `:293`.
- **Leftover temp directories:** `ls -d /tmp/sut-*`.

## Spec conformance

**Conformant.** No missing or extra behavior was found against the requirements or the design.

| Requirement | Evidence |
|---|---|
| FR-1 (a)–(g), FR-3 | `src/search.ts` == M1. 11 exported functions cover (a)–(g) per the design §API table. No imports. Module level is declarations only (T-4-2: `^(import\|let\|var)` = 0; import with `node --import tsx` exits 0 and prints 0 bytes) |
| FR-2 | H1 verbatim. One fetch call. The empty-query branch returns first. FR-2 literal grep = 0 |
| FR-4, NFR-6 | ASSEMBLY-OK locks every non-search line of `src/index.ts` to `5459d5a`, and CITATION-OK shows `formatCitation()` moved verbatim. T-4-6 A/B: 18/18 `MATCH`, 0 `INVALID-PAIR`, 0 reruns, including `tools/list`, all four other tools and the `page:0` `isError` case |
| FR-5 | Grep table reproduced (above) |
| FR-6, NFR-1 | P1 verbatim. No dependency or lockfile change |
| FR-7, NFR-2 | Tests import only `../src/search.js` and read fixtures via `import.meta.url`. T-4-3 reran under a preload that makes `fetch` throw: still 16/16/0 |
| FR-8, FR-9, NFR-5 | `test/` is outside `rootDir`. `tsconfig.json` is unchanged. T-4-1: `dist/` = `index.js`, `search.js` |
| FR-10, FR-11, NFR-4 | Fixture checks above. T-3-1: `EQUIV-OK 141 cặp output, 0 lệch` (structural + output equivalence of raw vs trimmed) |
| FR-12 | 16 cases. Every required FR id is a name prefix (FR-3, -4, -6, -7, -8, -9, -10, -11, -12, -18, -19, -20). Each "minimum content" row has a literal assertion (for example `test/search.test.ts:173` for the CND8 double space, `:258-285` for all five FR-18 conditions). Expected values come from dynamic-search literals and fixture measurements, not from the new code's output |
| FR-13 | T-4-5: mutations a/b/c/d each make `npm test` exit 1. The failing cases carry FR-18 (a), FR-7 (b), FR-9 (c) and FR-3 (d). The copy was reverted and deleted, and the repo is unchanged |
| FR-14, FR-15, FR-17 | Doc diffs above. Every remaining `VI_TOPIC_TERMS` location points to `src/search.ts` |
| FR-16 | T-7-1 was the last build task and touched only `AGENTS.md`. The contract was re-pinned to `8acd68cd…` with user authorization before this review |
| NFR-3 | Changed or new paths are exactly `src/index.ts`, `src/search.ts`, `test/**` (10 files), `package.json`, `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md` and the spec artifacts |
| NFR-6 | Met for every task-tracked temp directory (T-6-1 deleted all 8). **Not met** for one design-phase directory; see W-1 |

There were no mid-build spec amendments. `requirements.md` (2026-10-19 21:35) and `design.md` (2026-10-20 01:50) were last written before T-1-1 (07:03). Every task Result records "No divergence" or 0 reruns.

## Critical Findings

None.

## Warnings

**W-1: A design-phase temp directory still holds raw SuttaCentral responses and full tool outputs, against NFR-6.**

- **The directory:** `/tmp/sut-design.KSPa0V` (1.4 MB) still exists.
  - It is the trial build referenced at `design.md:25` ("bản dựng thử trong thư mục tạm ngoài repo (`/tmp/sut-design.*`)").
  - It contains `raw/`: 9 untrimmed `/api/search/instant` bodies, 625,877 bytes, with `highlight` and `translations`.
  - It contains `abw/old.N` and `abw/new.N`: full A/B tool outputs, including `get_sutta mn10` text.
  - It also holds scripts and logs: `abw/mcp-call.sh`, `scripts/`, `ab.log`, `t3.log`.
- **Requirements it breaks:**
  - NFR-6 (`requirements.md:206`): "Script và log tạm nằm ngoài repo và bị xóa sau khi dùng."
  - Design §Fixture step 7 (`design.md:842`, `rm -rf "$W"`) applies the same rule to raw bodies.
  - The spirit of NFR-4 / Constraints "không tích lũy": raw bodies must not persist as a corpus.
- **Why it is still there:** T-6-1 saw the directory but deliberately did not delete it. `T-6-1.log:47` reads "Not deleted (not listed in tmp-dirs.txt, outside dispatch): /tmp/sut-design.KSPa0V". It is the only `/tmp/sut-*` path left.
- **Fix:** delete `/tmp/sut-design.KSPa0V` after the user confirms it is no longer needed. No code or spec change is required.

## Suggestions

- **S-1:** For whitespace-only `topic`, the FR-11 case only asserts the first line of `formatNoResults("   ", "title", undefined)` (`test/search.test.ts:220-223`). The full-output path is already covered by the `""` case at `:219` and by A/B input `{"topic":""}`. This is optional tightening, not a coverage gap against the FR-12 table.

## Strengths

- Every byte of code and test is traceable. `src/index.ts`, `src/search.ts`, `test/search.test.ts` and the `package.json` scripts each reproduce from the design's normative blocks with one `diff`, and every non-search line of `src/index.ts` is locked to `5459d5a`. This makes the "behaviour unchanged" claim checkable without the network, and A/B 18/18 confirms it live.
- `src/search.ts` has no imports. `formatCitation()` moved verbatim, so `get_sutta` and `get_sutta_meta` use one shared implementation and the tests exercise the real citation code, not a copy.
- The fixture pipeline checks both structure (exact FR-11 projection) and output equivalence (141 pairs). Design `:846` documents why output equivalence alone would miss a dropped `category`.
- The tests have proven discriminating power. Each FR-13 mutation fails a case named for the FR it breaks, and boundary cases (`h = 0` with `total = len(suttaplex)`, offset 1450 vs 1460, title page 4 vs 5) are pinned by recorded fixtures rather than by the drifting live index.

## Summary

The implementation matches the design byte for byte and meets every functional requirement. Behaviour is unchanged against `5459d5a` (static assembly lock plus live A/B 18/18). Tests are offline, deterministic and discriminating. Fixtures are within size and field limits and have recorded provenance. The docs and the master spec changed exactly as specified. The one open item, W-1, is hygiene rather than code: delete the design-phase temp directory that still holds raw SuttaCentral bodies and tool outputs, which NFR-6 requires.

**Verdict:** Approve with changes
