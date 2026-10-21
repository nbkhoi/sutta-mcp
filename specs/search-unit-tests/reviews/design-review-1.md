# Design review 1: search-unit-tests

**Artifact:** `specs/search-unit-tests/design.md` (Status: Draft, 2026-10-19; sha256 `02803c48250c1cd6500b0713cc797d52b81ecc7d6cd00d496de6ebba352d24e5` at review time)
**Scope:** artifact/design, series `design-review`, suffix 1 (first design review; no re-review boundary applies)
**Binding upstream:** `specs/search-unit-tests/requirements.md` (Status: Reviewed), `reviews/requirements-review-2.md`, `specs/dynamic-search/design.md`, `src/index.ts` at `5459d5a`, template `templates/design.md.tmpl`, pinned `AGENTS.md` (sha256 `bcd1feed…dee28`, re-measured unchanged).
**Recorded user decisions (treated as fixed, not findings):** pure `search_topic` logic moves to `src/search.ts` with no behaviour change; `node:test` via `tsx` with `npm test` and no new dependency; offline recorded fixtures and no global `fetch` mock; no e2e/linter/CI; the FR-17 two-path master-spec edit; `AGENTS.md` last, with a contract update the user authorises; live-harness reruns only for invalid runs. Q2 (type-checking tests) stays open with default "no". The design follows that default.

## Measurements performed for this review (2026-10-20)

All checks ran on a trial copy outside the repo: `git archive 148b8c0` plus a `node_modules` symlink. Node v22.17.0, `@modelcontextprotocol/sdk` 1.29.0. Blocks were extracted with the design's own `blk` function from a copy of `design.md`.

- **Base check:** `git diff --quiet 5459d5a 148b8c0 -- src package.json tsconfig.json package-lock.json` exits 0. The only difference is +14 lines in `specs/sutta-mcp-requirements.md`.
- **Assembly (§Lắp ráp):**
  - I assembled `src/index.ts` from `5459d5a` ranges `1-4`, I1, `5-39`, `95-126`, `142-205`, H1, `295-$`. I checked the range boundaries by hand: `:40` starts the search section, `:94` is blank, `:127` is `function formatCitation`, `:141` is blank, `:206` is `async ({ topic, … })`, and `:294`/`:295` are `}` and `);`.
  - The result is 436 lines. `src/search.ts` is 212 lines, which matches the design's table at `:1257`.
  - `SCRIPTS-OK` and `CITATION-OK` both printed. `S2-PROVENANCE-OK` printed against both `specs/dynamic-search/design.md` and `5459d5a:src/index.ts`.
- **Build:** `rm -rf dist && npx tsc -p .` exits 0. `find dist -type f | sort` lists exactly `dist/index.js` and `dist/search.js`.
- **Protected regions (§Vùng được bảo vệ):** all 7 awk matchers give an empty diff against `5459d5a`, with line counts 8/20/6/18/14/7/31. The `extracted.source !== "translation"` count is 1. The tool blocks of `get_sutta` (85 lines), `get_sutta_meta` (37), `get_parallels` (54) and `list_divisions` (18) are byte-identical to `5459d5a`. `formatCitation()` moved verbatim except for the added `export`.
- **FR-5 / FR-2 greps:**
  - On `src/index.ts`: 3 / 3 / 0 / 1 / 4.
  - On `src/search.ts`: 0 for all five.
  - FR-2 literal grep = 0; `'Còn kết quả',` = 1; `await fetchSearch(` = 1.
  - `src/search.ts` has no top-level `import`, `let` or `var`.
  - `node --import tsx -e 'import("./src/search.ts")'` printed nothing and exited 0.
  - `grep -rn -E 'fetch|src/index' test/` returned no lines (exit 1).
- **Fixtures (F1–F4):**
  - F2 recorded all 9 requests as `OK … 200` on the first attempt.
  - F3 trimmed them. F4 printed `EQUIV-OK 141 cặp output, 0 lệch` and exited 0.
  - Per-file byte sizes match the §Fixture table exactly (7041, 4087, 4708, 191, 497, 12222, 12608, 10299, 680). The total is **52,333 bytes**, within the ≤ 65536 limit. There are **9 files**, within the ≤ 10 limit.
  - The forbidden-key grep is empty. `total`/`suttaplex`/`hits` counts match the table for every file. The raw bodies total 623,992 bytes, which matches Alternative G.
- **`npm test`:** exit 0, `# tests 16`, `# pass 16`, `# fail 0`. All 12 FR ids from the FR-12 table appear as `ok` prefixes.
  - I reran with the `NODE_OPTIONS="--import …/nofetch.mjs"` preload. Result: exit 0, `# pass 16`, `# fail 0`.
  - The preload works: `fetch("x")` throws `network disabled`.
- **Mutations (V1, applied with the design's `mutate.sh`):**

  | Mutation | Lines changed | Exit | Failing cases |
  |---|---|---|---|
  | a | 1 | 1 | FR-11, FR-18 |
  | b | 1 | 1 | FR-10, FR-7 |
  | c | 1 | 1 | FR-9 |
  | d | 1 | 1 | FR-3 |

  This matches the table at `:1183-1188` exactly. Each mutation fails the FR case AC-4 names. The extra failures (FR-11 under a, FR-10 under b) are stated in the design and are allowed by AC-4.
  - After all four runs, `npm test` exits 0 and `diff <(blk M1) src/search.ts` is empty, so the mutations were reverted.
- **A/B (V2 + V3) against a `5459d5a` build:** printed `AB-OK 18/18` with no invalid pair on this run. Every input matched byte-for-byte, including `tools/list` (4240 B). Input 18 (`page:0`) matched with `isError=true` and an `MCP error -32602` text on both sides, which confirms the design's `isError=` prefix rationale (`:1076`).
- **Documentation blocks:**
  - I applied R-1..R-3, M-1/M-2 and A-1a..A-1d independently by content anchor, not by line number.
  - The design's rebuild command then printed `README-OK`, `AGENTS-OK` and `MASTER-OK`.
  - AC-9 checks:
    - the master-spec `diff` with the global `sed` substitution is empty;
    - the counts are 0 (`src/index.ts`) and 3 (`src/search.ts`);
    - `npm test` appears at README `:27` and AGENTS.md `:17`;
    - the second grep is empty;
    - `VI_TOPIC_TERMS` locations are README `:78`/`:82` and AGENTS.md `:45`, all pointing to `src/search.ts`.
  - The `#` in A-1a lines up with the column of the three lines above it.
- **Ordering of AGENTS.md and the contract (§Thứ tự áp dụng):**
  - `preview_contract_update`, `authorize_contract_update`, `write_contract_atomic`, `finish_contract_update` and `settle_contract_invalidation` all exist in `lib/workflow_contracts.py` (`:133`, `:189`, `:244`, `:279`, `:323`). `complete_workflow` is in `lib/workflow_state.py:1388`.
  - `_affected_scope` (`:117-130`) maps a context dependency to `{"type":"contract","id":<subject>}`. This matches the design's claim that the change does not reopen requirements, design or tasks.
  - `workflow.md:8-12` (Invariants) states that drift blocks writes.
  - The ordering satisfies FR-16 steps 1–3, and AC-10 is mapped to a build-time check.

## Critical Findings

None.

## Warnings

None.

## Suggestions

- **S1: the AC-8 vehicle prints a truncated URL.** At `:1223` the command is `f.url.slice(42)`. The prefix `https://suttacentral.net/api/search/instant?` is 44 characters long, so every printed line starts with `t?query=…`, for example `t?query=anatta&language=en&limit=10`. The check still works, but `f.url.slice(44)` or `new URL(f.url).search` would print the query string the §Fixture table uses.
- **S2: the design gives two different counts of invalid A/B pairs.**
  - `:1094` says "Ba cặp không hợp lệ ở lần đầu (`get_sutta mn10`, `mindfulness`, `mindfulness` `content` trang 147: `fetch failed`)", and the AC-5 row at `:1220` says "3 cặp chạy lại một lần".
  - The Risks row at `:1308` says "đo: 1 cặp `fetch failed` trong lần A/B này".

  The likelihood rating (H) holds either way. Align the evidence so the record is consistent.
- **S3: some T1 expected values have no recorded source in §Fixture.** T1 asserts these values:
  - the full 8-uid `nibbana` content list (`:558-560`);
  - the full 11-uid `anatta` `all` list, including `sn22.14`, `sn22.143`, `sn22.68` and `sn23.17` (`:570-573`);
  - the counts 7 (`metta` content), 8 and 11 (headers) and 18 (`mindfulness` `all` page 1).

  The §Fixture table (`:818-826`) records only counts and boundary uids, and FR-12 requires that expected values are "không lấy … bằng cách chạy chính code mới rồi chép lại". I derived every one of these values from the fixture bodies alone, filtering by `category`/`uid`/`is_article` without calling `src/search.ts`, and all of them match. Recording the full uid lists, or that derivation, in §Fixture would make the FR-12 provenance claim at `:470` checkable without rerunning anything.
- **S4: a cross-reference points to the wrong file.** `:1033` says to see `workflow.md` for the contract-update functions, but `workflow.md` does not name them. They are in `lib/workflow_contracts.py` (line numbers above). Citing that file directly would save the orchestrator a search.

## Strengths

- Every normative code block (M1, I1, H1, P1, T1, F1–F4, V1–V3, R-*, A-*) can be extracted by machine with `blk`. Each one has a byte-level check (`ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `SCRIPTS-OK`, `CITATION-OK`, `README-OK`, `AGENTS-OK`, `MASTER-OK`). An independent re-run reproduced every result.
- F4 adds a structural check on top of the output-equivalence check that FR-11 requires. The design shows why: the output check alone misses a dropped `category` (`:846`).
- The V1 script guards against vacuous mutations with `changed=1`.
- T1 builds the NFD test input with `.normalize("NFD")` and asserts `nfd !== nfc` first, so editor normalisation cannot make the NFD case pass vacuously.
- In T1, each case that uses a fixture first asserts the fixture data it depends on, so a case fails at the fixture that has drifted.
- The alternatives (A–H) give concrete, requirement-linked reasons for each rejection. Alternative F's reason for not storing `5459d5a` output is consistent with the NFR-4 measurements.

## Summary

Every check the dispatch asked for reproduces on an independent trial copy:

- **Build and assembly:** the assembled sources build with `tsc` exit 0, and `dist/` contains only `index.js` and `search.js`. `formatCitation()` moved verbatim, and the other four tools are unchanged.
- **Fixtures:** the live-recorded fixtures match the design's byte sizes exactly (52,333 bytes, 9 files).
- **Tests:** `npm test` passes 16 of 16, both normally and with `fetch` disabled.
- **Mutations:** each of the four fails the named FR case and is fully reverted afterwards.
- **A/B:** all 18 inputs, including `tools/list`, are byte-identical to `5459d5a`.
- **Docs:** the doc blocks rebuild exactly.
- **Ordering:** the AGENTS.md and contract-update ordering satisfies FR-16 and matches the workflow library.
- **Verification map:** it gives a runnable command for every AC except AC-10, which is correctly marked as checked at build time.

The only findings are four optional suggestions about evidence wording and one cosmetic command slice.

Temporary paths from this review that I could not delete (`rm` was denied by permissions): `/tmp/drv1.kYddtJ`, `/tmp/drv1fx.RBVjtK`, `/tmp/drv1ab.Hp0tHB`, `/tmp/drv1t1.log`, `/tmp/drv1t2.log`. They contain only trial copies, raw response bodies and logs. The `node_modules` entry in `/tmp/drv1.kYddtJ` is a symlink. The repo working tree was not modified.

**Verdict:** Approve
