# Code Review (on-completion) 1: dynamic-search

**Purpose:** on-completion
**Scope:** feature `dynamic-search`. Gate `final-review`, series `code-review-final`, report 1.
**Baseline / snapshot:** baseline `40846bb`. Bound evidence is `git-36` at `.claude/spec-evidence/dynamic-search/T-6-1-diff-36.bin` (324787 bytes, sha256 `8b62eb72…0bf25be`).
**Contract sha256:** `3d199da86db95edeb40eb99a01754301f4fd3bce5ffc21c5f97c9a4567b2986f`. `AGENTS.md` sha256 is `bcd1feed…dee28`, which equals the pinned `context:agents`.
**Inputs:** `specs/dynamic-search/requirements.md` (Reviewed), `design.md` (Reviewed), `tasks.md` (T-1-1..T-6-1 checked, each with a Result), and `src/index.ts`, `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md`.

## Method

The review is static, as the code-reviewer role requires ("Do not rerun build or tests"). The dispatch also asked for `npm run build`, a stdio JSON-RPC call and a live `curl`. I did not run them. The live harness results are recorded per case in the T-3-3..T-3-10 Results, and I cross-checked those claims against the code paths that would produce them. I re-ran the following read-only checks myself:

- **Snapshot binding.** The tracked part of the snapshot (`README.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, without `index` lines) equals `git diff 40846bb` of the current working tree (`diff` rc 0). The `AGENTS.md` section of the snapshot shows the same hunks as the live diff. `src/index.ts` sha256 is `fb9794b0…59db53`, which is the value quoted in every T-3-x Result.
- **§Lắp ráp (design.md, `[NORMATIVE]`).** I ran the assembly pipeline in a `mktemp -d` and then deleted it. It printed `ASSEMBLY-OK`, with `40846bb` at 519 lines and the current file at 584. S1, S2 and S3 are byte-identical to design. Every other line equals `40846bb`, which locks FR-14 and all protected regions (N5-T, N1-A, N1-B, N3-A, N3-B, U1) at code level.
- **Invariant grep table** (design §Testability): `segmented` 3, `sujato` 3, translator IDs 0, `TOPIC_INDEX` 0, `search/instant?` 1, `fetch(` 4, gate 1. All match.
- **Diagnostics.** `npx tsc --noEmit -p tsconfig.json` exits 0.
- **Build currency.** `dist/index.js` (Oct 19 20:31) is newer than `src/index.ts` (Oct 19 08:06), and it contains `fetchSearch` and `VI_TOPIC_TERMS` (5 hits). The recorded harness runs therefore exercised the current source.
- **Scope.** `git status` shows only `AGENTS.md`, `README.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts` (modified) and `specs/dynamic-search/` (untracked). `package.json` and `package-lock.json` are unchanged against `40846bb`. `dist/` and `.claude/` are gitignored. `/tmp/mcp-call.sh` and `/tmp/mcp-stderr.log` are gone (T-5-1).
- **Docs.** I compared the doc diffs against design blocks R-1, R-2, A-1, M-1, M-2 and M-3; each is verbatim. I also grepped `TOPIC_INDEX|topic index|searchByTopic` in README, AGENTS.md and the master spec: one hit, `specs/sutta-mcp-requirements.md:292`, which is M-3 and historical. `grep -c 'sn47.1, dn22'` gives 0.

## Spec Conformance

**Conformant.** Every FR and NFR maps to code or docs, and I found no extra behaviour.

| Req | Evidence |
|---|---|
| FR-1, AC-11 | `fetchSearch()` (`src/index.ts:32-38`) sends GET with `query`, `language`, `limit=10`, and sends `offset` only when > 0 (`:34`). `offset` is 0 for `title` (`:231`), so `offset` appears only when `match` ∈ {content, all} and `page > 1`. The handler makes no other fetch, no POST, and sends no `selectedLanguages`/`restrict`. Parameters go through `URLSearchParams`, so `query` and `language` are encoded. |
| FR-2, FR-5 | `VI_TOPIC_TERMS` (`:48-63`) is a `Map` with 14 NFC lowercase keys and one term each, and holds no UIDs. `TOPIC_INDEX` and `searchByTopic` are removed. AC-1 and AC-2 live counts are recorded in T-3-3 and T-3-4 (28/28, n 5..20; `mn10` present in all 4 `chánh niệm` runs). |
| FR-3, FR-4, AC-3, AC-4 | `:209-211`: the key is NFC → lowercase → trim → collapse `\s+`, matched exactly with `Map.get`. The query sent is `term ?? NFC(topic).trim()`. Q2 (exact match only) is a recorded user decision. |
| FR-6, FR-7 | `hasCategory`/`isSutta` (`:238-240`) drop any `category`, any non-string or empty `uid`, and `is_article === true`. `takeNew` keeps the first element per `uid`. Titles are deduplicated (`:249`). Content items are deduplicated against the uids of this page's titles (`:254-257`). |
| FR-8 | `formatTitleMatch()` passes a shallow copy with `difficulty: { name: DIFFICULTY_NAMES.get(n) }` to the unchanged `formatCitation()`. The blurb line is printed only when the blurb is truthy. |
| FR-9, AC-15 | In `formatContentMatch()`, every fallback is guarded by `typeof … === "string"`. The title falls back from `name` to `root_name` to none (no ` — `). The `Text:` line is printed only when `author` is non-empty, and ` ({lang})` only when `lang` is present. No highlight, difficulty or parallels are printed. |
| FR-10, FR-11, FR-19, FR-20 | The layout branches are at `:272-293`. The term line is printed on match. The FR-11 hint covers (a), (b), and (c) for `match !== "all"`. `error.message` is printed only when it is a string. The no-request path (`:226-228`) returns before `await fetchSearch` and has no footer. The output never prints `total`. |
| FR-12, AC-10 | `fetchSearch` throws `SuttaCentral API error: ${res.status}`, and the handler has no `try`. Non-array `hits`/`suttaplex` become `[]`, and a non-number `total` becomes 0 (`:233-235`). |
| FR-13, FR-16, FR-17, AC-19 | `z.enum([...]).default("all")` and `z.number().int().min(1).max(10000).default(1)`, with no coerce or transform. The `describe()` texts cover every FR-13 point. T-3-9 records the schema and 7/7 rejections. |
| FR-18 | `h` counts hits without `category`, before article filtering (`:261`). `moreContent = h > 0 && offset + h < total` (`:263`) and `moreTitles = page·10 < |T|` follow the formula exactly. |
| FR-14, AC-12 | Locked by `ASSEMBLY-OK`. T-3-10 recorded 5/5 `cmp` = 0 against `40846bb`. |
| FR-15, AC-14 | README (R-1, R-2), AGENTS.md (A-1) and the master spec (M-1, M-2, M-3) are verbatim. The contract update for `context:agents` is a recorded, user-authorized decision. |
| NFR-1..NFR-8 | The diff touches only `src/index.ts` for code, and `package.json` is unchanged. `tsc` exits 0. Each call makes at most one request, holds no module state (three static consts only), and every printed result has a `URL: https://suttacentral.net/{uid}` line with a validated `uid`. The 3/3/0 invariants hold. |

## Critical Findings

None.

## Warnings

None.

## Suggestions

- **S-1 (spec-level wording, no code change required):** at `page=1`, the FR-11 text can end with `Còn kết quả: …` when every content hit on the page is an article (`is_article`) but `offset + h < total`. This follows from `src/index.ts:263` together with the `n === 0 && page === 1` branch at `:272-277`. FR-11 and FR-19 prescribe exactly this combination, so the code is conformant. However, "Không tìm thấy sutta nào" followed by "Còn kết quả" reads as contradictory to a caller. If this case is observed in practice, a follow-up spec could reword the FR-11 opener for this case.
- **S-2 (orchestrator):** `specs/INDEX.md` has no `dynamic-search` row. The other four specs are listed. This review does not edit the index, so the orchestrator should add the row at completion if the workflow expects it.
- **S-3 (accepted risk, for awareness):** the title-match citation inherits `formatCitation()`'s `??` fallbacks (`src/index.ts:129-130`). A `""` `acronym` or `translated_title` from search `suttaplex` would print `****` or a line ending in ` — `. The design records this as an accepted L/L risk ("`translated_title` rỗng (`""`) làm dòng tiêu đề kết thúc bằng ` — `"), and FR-8 requires the existing shape, so no action is needed now.

## Strengths

- The whole `src/index.ts` is locked to `40846bb` plus three verbatim normative blocks by one `diff`. That turns FR-14 and every protected-region claim into a mechanical check, and it passes.
- Using `Map` for the mapping table avoids the prototype-key lookup (`constructor`, `toString`) that the old object-literal `searchByTopic()` was exposed to.
- `fetchSearch` encodes both `query` and `language` through `URLSearchParams`. This is stricter than the existing helpers, which interpolate raw strings.
- `formatContentMatch()` guards every field by type, so null or empty `acronym`, `name` and `author` from upstream cannot produce `null`, `undefined` or a dangling ` — `. This is confirmed live in the T-3-7 Result for `sa264`, `cnd8` and `sa107`.
- The harness Results record checks that would catch a vacuous pass: NFD byte checks for AC-3, the validity rules, and `cmp` on non-empty outputs for AC-12.

## Summary

The implementation matches the Reviewed requirements and design. S1, S2, S3 and all six doc blocks are byte-verbatim, every line outside the two replaced regions equals `40846bb`, `tsc` is clean, and the invariants hold. Each call makes at most one GET with no state, and every printed result links to `suttacentral.net/{uid}`. The recorded live results for AC-1..AC-19 are consistent with the code paths and with a current `dist/`. The recorded user decisions (Vietnamese mapping with an API call always, `match` + `page`, Q2 exact match, the AGENTS.md contract update) are applied as decided. There are no Critical or Warning findings, and the three Suggestions need no change to this feature.

**Verdict:** Approve
