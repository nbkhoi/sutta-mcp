# Code review (on-completion) 1: search-api-passthrough

**Purpose:** on-completion
**Scope:** feature `search-api-passthrough` (all 12 tasks, T-1-1 … T-4-1)
**Series / suffix:** `code-review-final`, 1
**Baseline:** `d972fa6` (HEAD; the work is uncommitted in the working tree)
**Bound snapshot:** git evidence `git-26`, `.claude/spec-evidence/search-api-passthrough/T-4-1-diff-26.bin`
**Binding inputs:** `requirements.md` (Reviewed), `design.md` (Reviewed), `tasks.md` (12/12 `[x]` with Results), pinned `AGENTS.md` sha256 `4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b`. I re-measured it, and it matches the re-pinned `context:agents` in `workflow-contract.json:119` and the envelope.
**Recorded user decisions (not findings):** `search_topic` is a thin wrapper of `GET /api/search/instant` with no home-made logic; output `format` is `text`|`json`; only `search_topic` changes; Q1 default (A-1 also edits `AGENTS.md:26/28/30`); the `context:agents` contract update authorized on 2026-10-24.

## Method

This was a static review. I did not rerun `npm run build`, `npm test`, the stdio harness or the A/B. The role rule forbids reruns, and the supplied evidence is enough:

- `T-4-1-verify-1.log` on the final tree records `BUILD-TEST-OK`.
- `T-3-3.log` records `build exit=0`, `# pass 11`, `# fail 0`.
- `T-2-2.log` records two `npm test` runs at 11/11: one plain, and one with a preload that makes `globalThis.fetch` throw.
- After those runs, the sha256 of `src/index.ts`, `src/search.ts`, `test/search.test.ts` and the three fixtures were recorded (`T-1-1.log`, `T-1-2.log`, `T-1-3.log`, `T-2-1.log`). I re-measured all six and they are identical, so the recorded results apply to the reviewed bytes.
- `dist/index.js` and `dist/search.js` are dated 10:12, after the last `src/*.ts` edit at 09:50. `dist/index.js` references `buildSearchUrl`.

I ran these checks read-only during the review:

- **Snapshot binding:** I parsed `T-4-1-diff-26.bin`.
  - Its tracked section (128,277 B) is byte-identical to `git diff --binary d972fa6`.
  - All 16 untracked payloads are byte-identical to the working tree, except `workflow-state.json`, which is orchestrator-owned and rewritten after the snapshot. The identical payloads include the 3 fixtures, `design.md`, `requirements.md`, `tasks.md` and the contract.
- **Design §Lắp ráp (`design.md:422-433`), run verbatim, with `mktemp` under `/tmp` deleted afterwards:** it printed `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK` and `CITATION-OK`.
  - `src/index.ts` (446 lines) is `d972fa6` with exactly three changes: the I1 import, H1 in place of `:107-147`, and `fetchSearch()` removed.
  - `src/search.ts` equals M1, and `test/search.test.ts` equals T1.
  - `formatCitation()` is byte-identical to `d972fa6`.
- **Type check:** `npx tsc --noEmit -p tsconfig.json` exits 0.
- **Scope:**
  - `git status` and `git diff d972fa6 --stat` touch only NFR-3 paths: `src/index.ts`, `src/search.ts`, `test/search.test.ts`, `test/fixtures/**` (9 deleted, 3 added), `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md`, plus spec artifacts.
  - `git diff d972fa6 -- package.json package-lock.json tsconfig.json` is 0 bytes.
- **Fixtures:**
  - 3 files, 15,223 B in total.
  - `grep -l -E '"(highlight|translations)"'` over `test/fixtures/` returns nothing. The same grep over the repo excluding `node_modules`, `.claude/spec-evidence/` included, also returns nothing.
  - Each file has `url` and `recorded` = `2026-10-24`.
- **Temp hygiene:** none of the 15 paths in `tmp-dirs.txt` exist, and `ls -d /tmp/sap-*` matches nothing.
- **Docs:** I read the diffs of `README.md`, `AGENTS.md` and `specs/sutta-mcp-requirements.md`. I ran the AC-15 grep. I grepped for `match`/`page`/`topic`/`limit=10`/`fetchSearch` leftovers.
- **One optional live check (valid run, HTTP 200):** `curl -sG …/api/search/instant --data-urlencode 'query=niệm xứ' --data-urlencode language=vi`. I parsed the body in memory without storing it. It gave 9 `suttaplex`, 0 hits and `total` 9, including `mn10` "Kinh Niệm xứ", `dn22`, `sn43.5` and `ma98`. This matches the new master-spec sample flow (`specs/sutta-mcp-requirements.md:263-265`) and the design's figure (`design.md:907`).

## Spec conformance

**Conformant: yes.** No requirement is missing, and the feature adds no extra behaviour.

- **FR-1, AC-8, AC-9, AC-11:**
  - The H1 schema (`src/index.ts:99-157`) has exactly 8 keys. Only `format` has `.default("text")`, and the other 6 optional keys use `.optional()` (count 6, `T-2-1.log`).
  - `limit`/`offset` are `.int().min(0)`.
  - The harness `tools/list` and all 7 invalid inputs passed (`T-2-4.log`).
- **FR-2, FR-2a, FR-3** (the user's first independent check):
  - The handler body is `src/index.ts:152-155`. `const url = buildSearchUrl(params);` is the only binding. `fetch(url)` takes that bare variable, and `renderSearch(url, …)` receives the same variable.
  - `format` is split off by destructuring at `:150` and never reaches `buildSearchUrl`.
  - `grep -c -E 'URLSearchParams|searchParams|new URL\(|SC_BASE\}/search' src/index.ts` = 0.
  - `buildSearchUrl` (`src/search.ts:23-32`) sets each optional key only when `!== undefined`. It does not trim or normalize `query`.
  - The `sourceLine(url)` output in both formats is built from the same string (`src/search.ts:37-38, 41-43, 56`).
- **FR-4, FR-15** (second independent check, no filter/dedupe/reorder):
  - `renderSearch` and `formatSearchText` map every array with `arr.map((e, i) => …)` (`src/search.ts:88, 133`). They have no `filter`, `sort`, `Set` or index skipping. `.filter(Boolean)` at `:92` only drops empty heading parts inside one item.
  - The `json` branch returns `raw` untouched (`:37`).
  - The FR-4 grep = 0.
  - The module scope has only `type`/`function` declarations (`^(let|var|const) ` = 0).
  - Test `FR-6` (`test/search.test.ts:124-126`) checks that duplicate `uid`s are preserved in order.
- **FR-5..FR-12:** M1 implements the §Bố cục output table literally. Every FR row of FR-17 has a passing case with a literal expected value, and the FR-5 row applies because `json` is built in `src/search.ts`.
  - Live AC-1..AC-6 passed in one valid run each, with no reruns (`T-2-5.log`).
  - AC-7 is covered by `test/search.test.ts:171-172`, and AC-16 by `:191-196`.
- **FR-13, AC-10:** `src/index.ts:154` throws ``SuttaCentral API error: ${res.status}``. Tool 1 has no `try`/`catch`/retry (`T-2-1.log`).
- **FR-14:** the description covers every required point, verified in `T-2-4.log`. The read-check for comparison operators and stop words gives 0. See S1 for one inexact phrase.
- **FR-16, AC-12** (third independent check, other four tools untouched):
  - Proven at code level by `ASSEMBLY-OK`: every line outside I1, H1 and the removed `fetchSearch()` matches `d972fa6`.
  - Proven at output level by `AB-OK 6/6` against the `d972fa6` build: payloads 2509/6790/56/2715/463/2243 B, 0 `fetch failed` (`T-2-6.log`).
- **FR-17, FR-18, AC-13:**
  - All 11 cases carry FR-prefixed names.
  - All four mutations fail `npm test`: (a) fails FR-6/FR-8, (b) FR-2/FR-2a/FR-3, (c) FR-2/FR-2a, (d) FR-3. The repo bytes were unchanged before and after (`T-2-3.log`).
- **FR-19..FR-21, AC-15** (fourth independent check, docs truthful with no paging stop-rule):
  - The README and AGENTS.md greps are empty.
  - The master spec matches only 2 lines (`:296`, `:376`), both explicitly historical ("đã bỏ", "không còn áp dụng").
  - The Tool 1 Input table has the 8 FR-1 parameters (`:151-158`).
  - The roadmap points to `specs/search-api-passthrough/`.
  - #18 is marked not applicable, and #19/#20 say "cần kiểm lại".
  - No doc states a stop rule. The only paging guidance, in the master spec `:164` and the tool description, is the FR-14 wording: `total` is not a next-page signal, so call again with a larger `offset`.
  - `AGENTS.md` changed only at the FR-21 lines plus the Q1-authorized `:26/:28/:30`. T-4-1 was the last build task.
- **NFR-1..NFR-5:**
  - Dependencies are unchanged.
  - `dist/` holds only `index.js` and `search.js`.
  - The NFR-5 counts on `src/index.ts` are 3/3/0/4, and 0 on `src/search.ts`.
  - The fixture limits are met.
  - No raw SuttaCentral responses are stored: fixtures are trimmed, and the evidence logs contain only byte counts and verdict lines.

## Critical Findings

None.

## Warnings

None.

## Suggestions

- **S1: the tool description says "Body có hai mảng".**
  - The description (`src/index.ts:102`, normative H1 text) says the body has two arrays, then describes `suttaplex` and `hits`. The body actually has a third array, `fuzzy_dictionary`, which `requirements.md:92` lists and the `format` description at `:147` mentions.
  - The phrase is a small inaccuracy in text that Claude reads. It does not affect behaviour.
  - Rewording it ("Body có hai mảng kết quả chính") would need a design amendment, because H1 is verbatim.
- **S2: `formatError` can silently drop an `error` of unobserved shape.**
  - When `error` is an object without string `type`/`message`/`suggestions`, or is an array (`typeof [] === "object"`), the block prints only the header `Lỗi truy vấn do SuttaCentral báo (error):` (`src/search.ts:136-150`). The content is lost from `text`.
  - FR-12 asks for unexpected shapes to be stated rather than hidden. That rule is written for top-level keys, so this is not a conformance gap.
  - Only `{type, message, suggestions}` has been observed, and `format=json` still shows the full body.
  - A one-line `JSON.stringify(error)` fallback, as in `fuzzySection`, would close the gap if it is ever wanted.
- **S3: very large integers are not sent in decimal form.**
  - `z.number().int()` accepts values such as `1e21`. `String(1e21)` sends `limit=1e+21` (`src/search.ts:26-27`), which is not the "dạng thập phân" encoding FR-2 describes.
  - In practice this has no effect, because SC returns HTTP 500 for non-numeric `limit` either way (`requirements.md:91`).
  - It is recorded only for completeness. No change is recommended under MVS.

## Strengths

- The three central guarantees can be checked mechanically rather than argued. Byte-verbatim assembly proves that the other four tools and `formatCitation()` are untouched. The single-binding handler (`src/index.ts:152-155`) makes "fetch URL = source-line URL" readable at a glance. `buildSearchUrl(f.params) === f.url` in test `FR-2a` ties each fixture to the exact request the tool emits.
- The mutation evidence shows the tests can tell correct code from broken code: each FR-18 mutation is caught by a named case.
- The handling of mid-build probe defects in T-2-1 and T-2-2 was disciplined. Both runs halted on a verification-probe mismatch rather than a code mismatch, and the Results record the cause (`tasks.md:294`, `:346`). The corrected T-2-1 probe is stricter: it is scoped to Tool 1 and asserts exactly one `fetch(`. Each block was rerun in full.
- The docs are accurate to the code, and the new sample flow in the master spec still matches live SuttaCentral data (re-measured during this review).

## Summary

The working tree matches the reviewed design byte for byte for all three code files, and the bound `git-26` snapshot equals the reviewed tree. The handler passes the `buildSearchUrl()` result unchanged to both `fetch` and the source line. Nothing filters, dedupes or reorders API data. Build and `npm test` (11/11) are recorded on bytes identical to the reviewed ones. The other four tools are unchanged at both code and output level. README, AGENTS.md and the master spec describe the new behaviour accurately and give no paging stop-rule. No raw responses are stored outside the trimmed fixtures. Three low-severity suggestions remain, and none blocks completion.

**Verdict:** Approve
