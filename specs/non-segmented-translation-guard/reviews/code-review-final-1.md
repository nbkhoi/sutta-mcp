# Code Review: on-completion — Non-segmented translation guard cho `get_sutta` (full feature)

**Date:** 2026-08-09
**Reviewer:** code-reviewer (Claude Code subagent)
**Purpose:** on-completion
**Scope:** full feature — working-tree diff on `fix/non-segmented-translation-guard` (`src/index.ts` +68/−16, `specs/sutta-mcp-requirements.md` +16/−2)
**Verdict:** Approve
**Spec conformance:** ✅ — every in-scope design element and all 12 acceptance criteria are implemented; nothing beyond the spec was added.

## Critical Findings

None.

## Warnings

None.

## Suggestions

### S1: N1-B cannot be satisfied "từng ký tự" as written — the design snippet is unindented

- **Where:** `specs/non-segmented-translation-guard/design.md:230` vs `src/index.ts:256`
- **Evidence:** design — `if (extracted.source !== "translation") {   // [NORMATIVE] N1-B — nguyên văn, kể cả dấu } đóng`; code — `    if (extracted.source !== "translation") {` (4-space handler indentation).
- **Issue:** N1-A is a whole function body written at column 0, so it diffs byte-for-byte against the file. N1-B is a *fragment* that lands inside an `async` handler, so leading whitespace can never match, and the design's own `[NORMATIVE]` marker is an inline comment that must be stripped. The implementer handled both correctly and recorded it (`tasks.md:91`), but the rule as written has two silent exceptions a less careful implementer could widen.
- **Recommendation:** For future N1-style rules, either write the fragment at its real indentation or state "modulo leading whitespace and the `[NORMATIVE]` marker" in §Luật thi hành. No code change.
- **Spec ref:** design.md §N1 (`:79-88`), AC-7 mệnh đề 2.

### S2: `dịch giả {X} ({X})` on the unknown-translator path

- **Where:** `src/index.ts:171`
- **Evidence:** `` `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả ${translatorName} (${translator}).` `` with `const translatorName = requested?.author ?? translator;` (`:156`).
- **Issue:** When the requested `author_uid` is not present in `suttaplex.translations` (the typo case listed UNVERIFIED at `requirements.md:365`), `translatorName` falls back to `translator` and the sentence renders `với dịch giả xyz (xyz)`.
- **Recommendation:** Leave the code alone — this is exactly what FR-3.2 and design.md:214 pin (`fallback requested?.author ?? translator`) and the template applies `({translator})` unconditionally. If the duplication is unwanted, it is a spec change (drop the parenthetical when `requested` is undefined), not an implementer decision.
- **Spec ref:** FR-3 mục 2; design.md §Template (`:190`), §bảng FR-3 (`:214`).

### S3: `rank` is re-created per `formatUnavailable()` call and evaluated twice per comparison

- **Where:** `src/index.ts:158-163`
- **Evidence:** `.sort((a: any, b: any) => rank(a) - rank(b))` over a list capped at 43 entries.
- **Issue:** None functionally; noted only because a Schwartzian transform is the usual reflex here.
- **Recommendation:** No change. The design pins this shape (`design.md:165-170`) and the input is bounded; a rewrite would break the design-conformance diff for zero measurable gain.

## Verification performed (independent, static)

| Check | Result |
|---|---|
| N1-A verbatim (`design.md:124-142` vs `src/index.ts:119-137`) | `diff` empty, exit 0 — **byte-identical**, comments included |
| `ExtractedText` block (`design.md:52-57` vs `src/index.ts:112-117`) | `diff` empty, exit 0 — byte-identical |
| N1-B condition + closing `}` | `src/index.ts:256` / `:265` match `design.md:230` / `:239` modulo indentation and the `[NORMATIVE]` marker (see S1) |
| N2 `grep -c 'translation_text'` | **1** — `:134`, inside `extractText()` |
| N2 `grep -c 'Object\.keys'` | **2** — `:206` (`search_topic` empty branch), `:341` (`get_parallels`); neither in `extractText()`, no second key-count predicate anywhere |
| N2 `grep -c ' as '` | **2** — `:132` (`asNonEmpty` cast), `:352` (pre-existing `data as Record<...>`) |
| N2 `grep -c 'segmented'` | **3** — `:114` (N1 comment containing the slug), `:162` (FR-4 filter expression), `:239` (FR-7 describe) — matches the amended count |
| Type diagnostics | `npx tsc --noEmit -p tsconfig.json` → exit 0, zero errors. Read-only check used in place of `get_diagnostics_for_file` (unavailable in this toolset); `npm run build` was **not** re-run |
| Diff scope | 4 hunks (`-U0`: 6), all inside `ExtractedText`+`extractText()`, the new `formatUnavailable()`, and `get_sutta` (describe string + handler). No hunk touches `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS` |
| `package.json` / `tsconfig.json` | `git diff` empty for both — `noUncheckedIndexedAccess` still absent (Alternative F stays deferred as decided) |
| New module-scope functions | Exactly one: `formatUnavailable()`. `collect`, `asNonEmpty`, `rank` are closures. `ExtractedText` is a type |
| New `fetch` calls | None — 3 call sites, all pre-existing in `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels`; `get_sutta` still 2 requests in one `Promise.all` |
| Workspace hygiene | `/tmp/mcp-call.sh` and `/tmp/mcp-stderr.log` deleted; `git status` shows no new file under `src/` |

### The three known drift variants — read out of the code, not the Result fields

1. **Alias + `Object.values(raw ?? {}).length` gate** — absent. The gate is `const translated = asNonEmpty(collect(bilaraData?.translation_text)); if (translated)` (`:134-135`). No alias, no key/value count, no `!`.
2. **`.trim()` dropped on the push side** — absent. `:125` reads `if (typeof text === "string" && text.trim()) out.push(text.trim());` — `.trim()` on **both** the predicate and the pushed value.
3. **Call site gated on `extracted.lines.length === 0`** — absent. `:256` gates on `extracted.source !== "translation"`; `extracted.source` has exactly one occurrence in the file and `lines.length` appears only in the success-path truncation math (`:272`, `:283-284`).

### `formatUnavailable()` — the non-verbatim surface, checked clause by clause

- **Filter (`:162`)** — three separate clauses, self-exclusion first: `t.author_uid !== translator && t.segmented === true && t.is_root !== true`. Matches FR-4 conditions 1/2/3 and `design.md:169,178`. No `.slice()` — list is not truncated (FR-4 "Không cắt bớt").
- **Rank (`:158-159`)** — `requestedLang && t.lang === requestedLang ? 0 : t.lang === "en" ? 1 : 2`. Tier 0 is the requested translator's language, not `en`; the "en first" drift (`design.md:328`) is not present. `Array.prototype.sort` is stable on Node ≥ 18, so intra-tier API order survives. `requestedLang === undefined` (translator not in `translations`) degrades to tier 1 = `en`, as designed.
- **Template (`:166-178`)** — byte-compared against `design.md:186-202`: both `─".repeat(60)` separators are 60 × U+2500; the two Vietnamese sentences and the bold header string are byte-identical to the design; alternative lines use `  • ${t.lang_name} — ${t.author} (${t.author_uid})`, identical to `get_sutta_meta` (`:310`).
- **Empty branch (`:175-177`)** — emits exactly `  (không tìm thấy bản dịch nào khác cho kinh này)` (two leading spaces, matching `design.md:201`) and **drops** the bold header, per `design.md:204`.
- **FR-3 prohibitions** — no `Translator: ` (that literal exists only at `:277`, success path); no `[Hết văn bản` / `[... văn bản bị cắt` (only `:283-284`, success path); the guard reads no `extracted.lines`; `segmented` appears in the helper only as the filter *expression*, never inside a string literal, including the empty branch; the two prose sentences are observational and intent-stating — no causal clause.

### Success path and error path

- **Success path byte-preservation:** the diff replaces only `const fullText = extractText(...)` + `fullText.split("\n").filter(Boolean)` with `const lines = extracted.lines;`. `translatorName`, `truncated`, `isTruncated` and the whole `output` array are unmodified context lines in the diff. The `translatorName` lookup now runs only after the guard returns, so exactly one `find` per path (FR-6, `design.md:176`).
- **Behavioural delta from dropping `split("\n")`:** a translation segment containing an internal newline now counts as one line instead of several. This is the accepted risk at `design.md:389` (0/233 segments contain a newline for `mn10`/`sujato`), not a regression.
- **Error path unchanged:** `fetchBilaraText` still throws on `!res.ok` (`:21`) and the guard sits *after* `await Promise.all` with no `try`/`catch` added anywhere. A real 404 or network failure propagates exactly as before; the guard only handles 200-with-no-content. No `isError` anywhere in the file (FR-5).

### Documentation ACs

- **AC-11** (`specs/sutta-mcp-requirements.md:291-306`): `grep -c 'không phục vụ được'` → **0**; `grep -n 'chờ'` → **no hits** (the "chờ SC xuất bản" framing is gone); HTTP 200 + missing `translation_text` + our own silent `root_text` fallback are stated at `:293`; all three translators covered at `:296-298` with the explicit "cột `segmented` không dự đoán được" conclusion; the two-`author_uid` note is present; Q1 is written as `**Câu hỏi mở (chưa điều tra):**`. All five clauses pass. The added blank line before item `3.` is a CommonMark necessity, not scope creep.
- **AC-12** (`claudedocs/specs-review.md`, gitignored/untracked, non-blocking): all five pinned `grep -F` strings → **0** hits; `grep -n 'UPSTREAM'` → **0** lines file-wide; the verdict now names the `extractText()` defect on the Sutta MCP side plus an unexplained upstream endpoint behaviour (`:201`, `:217-224`); translator table has `indacanda` (No/No) and `phantuananh` (**Yes**/**No**) plus the "`Segmented` does not imply `Bilara API works?`" note (`:208-211`); slug referenced 4×. File remains untracked — correctly outside any commit.

### What I did not re-verify

AC-1..AC-5 and AC-8 depend on live SuttaCentral responses. Per dispatch I did not re-run the harness; the pinned literals (194 lines, 10 alternatives with `sujato` first, 9 with `o` first for `mn10`+`sv`, `phantuananh` self-excluded) come from the T-3-3/T-3-4/T-3-5/T-3-6 Result fields. What I *can* confirm statically is that the code paths producing those numbers are the ones the design specifies — in particular the tier-0 branch of `rank` that only the supplementary `mn10`+`sv` run exercises, and the self-exclusion clause that only `dhp1-20`+`phantuananh` separates from the `segmented` clause. Nothing in the code contradicts any of the 12 Result fields.

### Note on the mid-build spec amendment

T-2-2 amended the N2 `segmented` count from 2 → 3 (`design.md:97`) and AC-6 from two positions → three (`requirements.md:272`) after discovering that the mandatory N1 comment contains the slug `non-segmented-translation-guard`. I checked whether this loosened the guarantee: it does not. The property AC-6 protects — no `segmented` in any string the guard emits — is still fully checkable, and the third hit is a comment inside a block N1 forbids editing. Amending the count was the only move that did not violate N1. Because `specs/non-segmented-translation-guard/` is untracked, this amendment leaves no git diff; the record lives in `tasks.md:67`.

## Strengths

- The verbatim-block mechanism did its job: N1-A and the `ExtractedText` block diff to zero bytes against `design.md`, and all three documented drift variants — the ones that pass `tsc` and the greps — are demonstrably absent from the code, not merely absent from the Result fields.
- The riskiest hand-written surface, `formatUnavailable()`, is correct on every clause the design constrains: three-clause filter with self-exclusion first, tier-0-before-`en` ranking, template byte-identical to the pinned strings, and the empty branch dropping the bold header as designed.
- The success path is genuinely untouched — `translatorName`, `truncated`, `isTruncated` and the `output` array appear as context lines in the diff, so FR-6 could not have regressed through an accidental reformat.
- Scope is tight: 4 hunks, one new module-scope function, zero new fetch calls, `package.json` and `tsconfig.json` untouched, and the deliberately deferred `noUncheckedIndexedAccess` decision was not quietly reopened.

## Summary

The implementation matches the spec on every axis I could check statically: the two normative code blocks are byte-identical to `design.md`, all four N2 counts land at their amended values, `tsc --noEmit` is clean, and the diff stays inside `extractText()` / `formatUnavailable()` / `get_sutta`. None of the three documented drift variants is present in the code, and the non-verbatim `formatUnavailable()` — the one place an error could have survived the diff checks — is correct on its filter, its rank tiers, its template strings and every FR-3 prohibition. Approve; the three suggestions are optional and two of them are spec-hygiene notes for future work rather than code changes.
