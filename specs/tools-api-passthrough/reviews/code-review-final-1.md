# Code Review: tools-api-passthrough (final, on-completion)

**Purpose:** on-completion (`code_review` policy `on-completion`), dispatched via `.claude/spec-evidence/tools-api-passthrough/dispatch/env-final.md` (sha256 `a7f1dc54…c758`).
**Scope:** feature `tools-api-passthrough`, T-1-1..T-5-1 (13 tasks, all `[x]`). The full working-tree change against baseline `7dc2299`, uncommitted. Tracked: `AGENTS.md`, `README.md`, `package.json`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`. Untracked: `src/passthrough.ts`, `test/passthrough.test.ts`, 4 fixtures in `test/fixtures/`, and the spec artifacts.
**Spec inputs:** `specs/tools-api-passthrough/requirements.md`, `design.md`, `tasks.md`. Project rules: `AGENTS.md` (sha256 `2e23154c…5cdf`, matches the re-pinned `context:agents` in `workflow-contract.json:119`).
**Reviewed:** 2026-10-30.

## Method

Static review of the supplied diff and evidence, as the pinned code-reviewer role requires ("Do not rerun build or tests; name a required rerun as a finding when the supplied evidence is missing or inadequate").

The dispatch asked me to rerun `npm run build`, `npm test` and live tool calls against suttacentral.net. I did not run them, because the role forbids it and `npm run build` would rewrite `dist/`. The recorded evidence covers each of those checks: see the next paragraphs and the conformance table. No finding is raised for missing reruns.

Checks I ran myself, all read-only:

1. **Persisted diff evidence git-26.** I decoded `T-5-1-diff-26.bin` (`SPEC-WORKFLOW-DIFF-V1`). The `TRACKED` record is byte-identical to the current `git diff --binary 7dc2299`. Every `UNTRACKED` record is byte-identical to the file on disk, except `workflow-state.json`, which is expected to change after the snapshot.
2. **Design assembly (§Lắp ráp, `design.md:555-577`).** I ran it in a `mktemp -d /tmp/rev-XXXXXX` directory, now removed. It printed all seven of `PASSTHROUGH-OK`, `INDEX-OK`, `TEST-OK`, `SEARCH-OK`, `SEARCHTEST-OK`, `PACKAGE-OK`, `SEARCH-INSTANT-OK`, with no diff lines. Every code file matches its `[NORMATIVE]` block byte for byte.
3. **Hash match against task Results.** The current sha256 of each file below equals the value recorded in its task Result: `src/passthrough.ts` `f83a4d32…` (T-1-1), `src/index.ts` `8e97bd60…` (T-1-2), `src/search.ts` `f75e5ee5…` (T-1-3), the 4 fixtures (T-2-1), `test/passthrough.test.ts` `3f394c91…`, `test/search.test.ts` `a4b6da8b…`, `package.json` `c424e626…` (T-2-2), `README.md` `cf6ada54…` (T-4-1), master spec `4da0da67…` (T-4-2), `AGENTS.md` `2e23154c…` (T-5-1). So the recorded `npm test` runs (`# tests 20`, `# pass 20`, `# fail 0`, also run with `fetch` blocked, T-3-2), the six mutations (T-3-3) and the builds were all produced against the reviewed bytes.
4. **Build currency.** The live harness ran at 12:51–12:53 UTC, which is 19:51 local (+0700), and rebuilt `dist/` first. Source mtimes are 19:41–19:43 and have not changed since. `dist/` contains exactly `index.js`, `passthrough.js` and `search.js`, built at 19:58, and the new tokens are present. The live results in T-3-4 therefore come from the current source.
5. **Greps.** FR-15 pattern: 0. `≡|≈|↺|→`: 0 in all three `src/` files. `segmented`: 0 in all three. `fetch(` in `src/index.ts`: 5. Module-scope bindings: only `server` (`src/index.ts:16`) and `formatParam` (`:86`). `try|catch|retry`: only the comment at `:83` and `main().catch` at `:217`. Fixtures: 7 files, 38,443 B; grep for `highlight|translations` is empty; each new fixture has `url`, `recorded` (2026-10-30), `tool` and `params`. `package-lock.json` and `tsconfig.json` are unchanged against `7dc2299`. No changed path falls outside NFR-3.
6. **Code and doc reading.** I read `src/passthrough.ts`, `src/index.ts`, `test/passthrough.test.ts`, and the diffs of `src/search.ts`, `README.md` and `AGENTS.md`. I also read the rewritten sections of the master spec: endpoint table, Parallel types, Tools 1–5, sample flow, Constraints, roadmap items 1–7, and the issue table.

## Spec Conformance

**Conformant: yes.** I found no missing and no extra spec behaviour.

| Requirement | Evidence | Status |
|---|---|---|
| FR-1 five tool names | `src/index.ts:22,98,147,180,207`; AC-10 `names` PASS (T-3-4) | Met |
| FR-2 schemas, only `format` has a default | I1 byte-match; AC-9 (6 cases) and AC-11 PASS | Met |
| FR-3/FR-4 one GET, only the caller's params, path-segment encoding | `apiUrl()` `src/passthrough.ts:34-38`: `undefined` segments and query values are dropped, with no default anywhere; T2 FR-3/FR-4 literals; mutations (b) and (f) are killed | Met |
| FR-5 one URL variable, used bare in `fetch` and the source line | each handler: `const url = build…Url(params); fetch(url); … renderBody(url, …)` (`src/index.ts:136-141,169-174,202-207,235-240`); T2 FR-5 binds fixtures to their builders | Met |
| FR-6 `search_instant` is the rename | `SEARCH-INSTANT-OK`, `SEARCH-OK`; AC-10 `a byte`, `b byte`, `schema`, `desc` PASS | Met |
| FR-7 json body verbatim | `renderBody` returns `raw` from `res.text()` untouched (`src/passthrough.ts:43`); AC-1 `body===curl` PASS | Met |
| FR-8/FR-9/FR-10 text layout, every key and element in body order | `render()`/`head()` `src/passthrough.ts:56-77`; T2 FR-10 checks every label of every fixture at every depth; mutations (a), (c), (d), (e) are killed | Met |
| FR-11 no truncation | no limit constant or parameter in `src/`; AC-2 `keys_order 454` PASS | Met |
| FR-12/FR-13 not-found bodies with 200, non-2xx, non-JSON | `if (!res.ok) throw new Error(\`SuttaCentral API error: ${res.status}\`)` in all four handlers, before `renderBody`; `JSON.parse` throws only for `text`; T2 FR-12; AC-5 PASS | Met |
| FR-14 descriptions | measured claims are traced to `design.md:512-521` and review 1 (`priority_author_uid` becomes `null`, `yellow_brick_road*`, `mn10/sujato?lang=vi` has no `translation_text`, `mn10/brahmali` equals the root-only body); AC-11 PASS, including 4 `neg` checks | Met |
| FR-15/FR-16 custom logic removed, no state | greps above; `formatCitation` removed from `src/search.ts` | Met |
| FR-17/FR-18 tests | 20/20 pass, 8 FR prefixes; 6/6 mutations killed (T-3-2, T-3-3) | Met |
| FR-19/FR-20/FR-22 docs | `README-OK`, `MASTER-OK`, `AGENTS-OK`; my reading agrees with them (see Strengths) | Met |
| FR-21 issues | 0 commits in `7dc2299..HEAD`, so no auto-close keyword exists (T-4-3). The PR description is still to be written. | Met so far |
| NFR-1..NFR-4 | `package.json` changes only `scripts.test`; lock file and tsconfig unchanged; `dist/` has 3 files; fixtures within limits | Met |
| NFR-5 live verify | 31 V4 lines VALID; 5 transport `INVALID` runs retried within the cap; 51 PASS, 0 FAIL | Met |

## Critical Findings

None.

## Warnings

None.

## Suggestions

1. **Dot-segment uids make the source line differ from the real request.** This is design Q1, an accepted risk. `encodeURIComponent` keeps `.` and `..`, and the WHATWG URL parser inside `fetch` normalises them: for example, `get_suttaplex {"uid":".."}` requests `https://suttacentral.net/api/`, while `Nguồn:` prints `…/api/suttaplex/..`. FR-5 is met as written, because the same variable is passed to both, but FR-9's "URL request đầy đủ" is not literally true in this case. If a follow-up is wanted, design Q1 already names the fix: `.refine((s) => s !== "." && s !== "..")` on the three path parameters, which changes I1 only.
2. **`text` cannot tell a string that looks like a literal from the literal itself.** This is design Q2 and Alternative C, both accepted. `head()` (`src/passthrough.ts:70`) prints `"2019"` and `2019` the same way, and also `"null"` and `null`. This happens in real data: `translations[].publication_date` is a string year. It is within FR-10, and `json` keeps the type. The `formatParam` description (`src/index.ts:90`) could say that `json` is the way to get exact types.
3. **The planner's trial clone is still on disk.** `/var/folders/xn/g3xfp9zs001fmzv6gtwz6j740000gn/T/tmp.ayC1uLkb2n` (4.8 MB) is outside `tmp-dirs.txt`. T-4-3 disclosed it and left it in place. It holds scripts and a repo copy; I found no SC response bodies over 20 KB outside `node_modules`/`.git`. It is outside the implementation scope, so this is not a finding against the code, but the user may want to remove it.
4. **Tool renames are a breaking change for existing MCP clients.** The design risk table lists this as intended. Mention it in the PR description next to the FR-21 issue notes. The server `version: "0.1.0"` (`src/index.ts:18`) is unchanged; NFR-1/NFR-3 keep `package.json` fixed, so leaving it unchanged is consistent with the spec.

## Strengths

- **Thin wrappers.** The four handlers are identical in shape: one URL variable, one `fetch`, one `ok` check, one render. There is no `try`, retry, fallback or second request. `get_bilarasuttas` no longer calls `/api/suttaplex/`.
- **Nothing is dropped from the text output.** `render()` is one small recursive function with no branch that drops, merges or reorders anything. The only body-dependent text is the type and count label from `head()`, which keeps `""`, `null`, `{object rỗng}` and `[mảng rỗng, 0 phần tử]` distinct, as FR-10.5 requires.
- **Tests that catch regressions.** The FR-10 fixture test compares the labels on every output line with a separate pre-order walk of the body. Together with the 60-key literal, it kills all six FR-18 mutations, including the alphabetical sort and the 50-element cap.
- **Fixtures tied to their builders.** Each fixture carries its `tool` and `params`, and T2 FR-5 checks that `build…Url(params) === url`, so a fixture cannot drift from the request the tool would actually send.
- **Measured descriptions.** Every size and behaviour claim in the `describe()` texts traces to a dated measurement. The sentence that would have been false ("a division uid makes the output large") is excluded for `get_parallels` and `get_bilarasuttas`, and the exclusion is checked mechanically (AC-11 `neg`).
- **Consistent docs.** README, AGENTS.md and the master spec all describe the five endpoints, the real query parameters with the `en` default (citing `config.py:34` and `views.py:1061`), the source line in place of website links, and the superseded specs and issues. The remaining legacy names in the master spec appear only in historical context.

## Summary

The implementation matches the design byte for byte: all seven assembly checks pass, and all recorded hashes match the reviewed files. It meets every FR and NFR in scope and holds to the user's rule that each tool mirrors its SuttaCentral endpoint exactly:

- each tool sends only its own API parameters, and leaves them out when the caller does not pass them;
- each call makes one GET;
- `json` returns the body verbatim;
- `text` prints every field in API order, with no filtering, merging or truncation.

I declined the requested reruns under the pinned role; the recorded live harness covers them (AC-1..AC-11: 51 PASS, 0 FAIL against the current source). I found no Critical or Warning issues. The four suggestions are accepted design risks or housekeeping.

**Verdict:** Approve
