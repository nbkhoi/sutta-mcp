# Review: design — Non-segmented translation guard cho `get_sutta`

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [design.md](../design.md)
**Verdict:** Block

Upstream/context read: `requirements.md` (Status: Reviewed, treated as settled), `src/index.ts:100-260`, `tsconfig.json`, `package.json`, `specs/sutta-mcp-requirements.md:288-300`, `CLAUDE.md`. No `.claude/rules/`, no `.claude/spec-templates/`, no `.claude/steering/` in this repo, so no template-conformance check was possible.

Every literal the design asserts was re-verified today against the live API and the real files; the type-level claim was re-verified by compiling four candidate implementations with the repo's compiler settings. Transcripts are cited per finding.

## Verification performed

| Claim (design.md) | Method | Result |
|---|---|---|
| `mn10`/`sujato`: 233 keys → 194 post-filter (line 272) | live fetch + design's own `collect()` | **Holds** — 233 / 194 |
| `mn10`/`sujato`: **no segment contains a newline** (line 272) | scanned all 233 raw values for `\n` and `\r` | **Holds** — 0 and 0. Old pipeline `join("\n").split("\n").filter(Boolean)` = 194, new `collect().length` = 194. Dropping the round-trip is safe for AC-3 |
| `dhp1-20`/`phantuananh`: filter leaves **5**, `phantuananh` absent (line 274) | live `/api/suttaplex/dhp1-20`, design's three-conjunct filter | **Holds** — 33 translations → 5: `sabbamitta/de`, `sujato/en`, `suddhaso/en`, `thitanana/et`, `luka/ka`. `phantuananh` is the only `vi` entry and is removed by condition 1 alone |
| `requestedLang`/`rank` ordering for `dhp1-20` (lines 116-118) | applied to live data | `sujato, suddhaso, sabbamitta, thitanana, luka` — `requestedLang="vi"`, tier 0 empty, `en` first, as designed |
| No `lang_name`/`author` contains a banned string (line 313) | scanned the 5 `dhp1-20` entries | **Holds** — 0 hits for `segmented` / `Translator: ` |
| `src/index.ts` line references `:116`, `:120`, `:200`, `:214-216`, `:217-218`, `:258` | read | All correct |
| Baseline `grep -n 'segmented' src/index.ts` = 0 hits; `translation_text` = 1 hit (`:113`) | grep | **Holds** |
| FR-8/FR-9 target: `specs/sutta-mcp-requirements.md` §"Hướng nâng cấp" item 2, "một đoạn ba câu", line ~291 (lines 216, 219) | read | **Holds** — line 291 exactly, and it is a three-sentence paragraph |

The design's factual base is sound. The problem is the inference it draws from it.

## Critical Findings

### C1: The compiler does not enforce FR-1/FR-2 — four drifting implementations compile clean, including one that produces `source: "translation"` on input FR-1 defines as absent

- **Where:** design.md:48, :62, :194, :266, :308 (the claim); design.md:80-83 (the sketch)
- **Evidence:** design.md:48 — *"**Hệ quả: implementation sai theo FR-2 không compile được.**"* design.md:266 assigns **AC-7 clause 2** to the Compiler row: *"Kiểu tuple làm implementation sai không compile"*. design.md:194 — *"`[Hết văn bản — 0 đoạn]` trở thành trạng thái bất khả biểu diễn."* design.md:308 makes the tuple the primary mitigation for the feature's #1 risk: *"Kiểu tuple làm dạng nguy hiểm nhất không compile được"*.
- **Issue:** `tsconfig.json` does not set `noUncheckedIndexedAccess`. Under the repo's actual settings, `const [first, ...rest] = someStringArray` types `first` as `string`, **not** `string | undefined`. The guard `first !== undefined` is therefore a runtime-only check that TypeScript treats as vacuously true — it contributes nothing to the type. What the tuple actually rejects is exactly one spelling: assigning a *variable already typed `string[]`* into `lines`. It does not verify non-emptiness, and it does not bind `source` to the post-filter line count.

  Compiled with the repo's own flags (`--strict --target ES2022 --module Node16 --moduleResolution Node16`, `node_modules/.bin/tsc --noEmit`), **all four of the following exit 0**:

  ```ts
  // Hatch 1 — the key-count predicate survives; minimal mutation of the design's own sketch
  const [first, ...rest] = collect(bilaraData?.translation_text);
  if (Object.keys(bilaraData?.translation_text ?? {}).length > 0) {
    return { source: "translation", lines: [first, ...rest] };   // compiles
  }

  // Hatch 2 — index access instead of destructuring, same wrong gate
  const lines = collect(bilaraData?.translation_text);
  if (Object.keys(bilaraData?.translation_text ?? {}).length > 0) {
    return { source: "translation", lines: [lines[0], ...lines.slice(1)] };   // compiles
  }

  // Hatch 3 — no predicate at all
  const [first, ...rest] = collect(bilaraData?.translation_text);
  return { source: "translation", lines: [first, ...rest] };   // compiles

  // Hatch 4 — collect()'s filter drifts from src/index.ts:120 (trim dropped from the predicate)
  if (typeof text === "string") out.push(text);   // compiles; whitespace segments survive
  ```

  Neither an `as` cast nor a `!` assertion is needed — design.md:90 forbids the cast and closes a door that was never the shortest route. Hatch 1 is the *minimal edit* to the design's own sketch: keep `src/index.ts:116`'s selector, still destructure. That is precisely the implementation requirements.md:86 and AC-7 clause 2 exist to forbid.

  Runtime consequence of Hatch 1 on FR-1 case 3 (`translation_text` present, all values whitespace), executed:

  ```
  source: translation | lines: [undefined]
  body join -> ""
  footer -> [Hết văn bản — 1 đoạn]
  ```

  The guard never fires. `get_sutta` emits the `Translator: <tên>` header over an empty body. design.md:194's claim is technically satisfied — the count is `1`, not `0` — and operationally worthless: this is the same misattribution the feature exists to prevent, with `undefined` silently coerced to `""` by `Array.prototype.join`.

  Hatch 4 is the second live instance the dispatch asked about: a `collect()` whose filter differs from `src/index.ts:120` yields `lines: ["   "]`, a genuinely non-empty tuple, `source: "translation"`, and a blank-but-present segment. Compiles clean.

  The consequence for the design is structural, not cosmetic: with C1 unfixed, **AC-7 clause 2 has no assigned verification vehicle at all.** design.md:266 assigns it to the compiler; the compiler does not check it. design.md:268 assigns AC-7 clauses 1/3/4 to grep and code reading, so clause 2 falls through the table. The risk-table mitigation at design.md:308 collapses to its second half ("AC-7 + hai lệnh `grep`") — i.e. back to unaided human code reading in a repo with no linter and no test runner, which is the exact situation Alternative A was rejected for (design.md:281).
- **Recommendation:** Keep the tuple — it is still worth having, it kills the single most likely wrong shape, and it costs nothing. But stop treating it as the enforcement mechanism, and fix the design in both directions:
  1. **Correct the claim.** Replace design.md:48's "implementation sai theo FR-2 không compile được" with what is true: the tuple rejects `{ source: "translation", lines: <string[]-typed variable> }` and nothing more. Restate design.md:194 as "unrepresentable *given the pinned narrowing shape*", and drop AC-7 clause 2 from the Compiler row at design.md:266, moving it to the code-reading row where requirements.md:284 already put it.
  2. **Pin the narrowing shape normatively.** design.md:80-83 currently presents `const [first, ...rest] = collect(...)` + `if (first !== undefined)` as a technique; make it a *constraint*: the `"translation"` return may be gated by no condition other than the emptiness of the array just collected from `translation_text`, and `collect`'s predicate must be `typeof text === "string" && text.trim()` verbatim. Add both to the AC-7 code-reading checklist as named grep targets (`Object.keys` must not appear inside `extractText()` at all — a stronger and mechanically checkable form of AC-7 clause 4).
  3. **Optional, if a machine check is wanted:** a single audited coercion `const asNonEmpty = (a: string[]): [string, ...string[]] | undefined => (a.length > 0 ? (a as [string, ...string[]]) : undefined);` as a closure inside `extractText()` concentrates the unsoundness in one reviewable line instead of scattering it across every future edit of the guard condition. This contradicts design.md:90's blanket no-cast rule, so if it is rejected, say so explicitly and on these grounds — one located cast versus an unlocated hole — rather than on the current rationale, which assumes the hole does not exist.

  Do **not** solve this by enabling `noUncheckedIndexedAccess` in `tsconfig.json`. It is outside the diff AC-10 scopes, and it would force unrelated changes across the rest of `src/index.ts`.

## Warnings

### W1: `formatUnavailable()`'s four-parameter rationale is false, and the shape it forces commits the exact duplication used to reject Alternative D

- **Where:** design.md:104-111 (rationale table), :116 (helper body), :173 (call site), :297 (Alternative D)
- **Evidence:** design.md:104 — *"Bốn tham số, không tham số nào tự tra lại được từ tham số khác"*. design.md:111 justifies the `translatorName` parameter as: *"đã tra ở `src/index.ts:214-216`; tra lại trong helper là nhân đôi một biểu thức lookup"*. design.md:297 rejects Alternative D because *"Helper sẽ chứa bản sao thứ hai của lookup `translations.find(t => t.author_uid === translator)?.author ?? translator`"*.

  But the helper body at design.md:116 is:

  ```ts
  const requestedLang = translations.find((t: any) => t.author_uid === translator)?.lang;
  ```

  and the call site at design.md:173 is:

  ```ts
  (suttaplex?.translations ?? []).find((t: any) => t.author_uid === translator)?.author ?? translator;
  ```

  Same predicate, same array, two locations — the duplicate lookup the design says it is avoiding. It also falsifies the table's premise: `translatorName` **is** derivable from `translations` + `translator`, and the helper already performs the `find` that would derive it.
- **Issue:** The fourth parameter buys nothing. It does not avoid a second `find` (the helper runs one regardless for `lang`); it only avoids a `?.author`. Meanwhile design.md:171-174 computes `translatorName` unconditionally *before* the branch, so on the guard path the lookup is evaluated twice while `Translator:` is never printed.
- **Recommendation:** Either (a) drop `translatorName`, give `formatUnavailable(citation, translations, translator)` a single `const requested = translations.find(...)` and derive both `requested?.lang` and `requested?.author ?? translator` from it, and move the call site's `translatorName` computation into the `else` branch where FR-6 actually needs it — one `find` per path, three parameters, strictly less duplication than the current sketch; or (b) keep four parameters and rewrite design.md:104 and :111 to state the real trade-off, which is call-site symmetry, not lookup avoidance. Option (a) is the one consistent with the design's own stated principle.

## Suggestions

### S1: ~30 lines of the design restate settled upstream decisions rather than making design ones

- **Where:** design.md:221-231, :242-244, :299-302, :314, :315
- **Evidence:** §Component Boundaries (design.md:221-231) contains no decision not already stated in §High-Level Design or §API/Interface Contracts; the rows `formatCitation() | unchanged` and `4 tool còn lại, TOPIC_INDEX, DIVISIONS | untouched` restate NFR-6 verbatim. Risk row design.md:314 (*"Danh sách 10 dòng ngôn ngữ lạ làm nhiễu"*) has the mitigation *"Đã cân nhắc và bác ở FR-4 … Không mở lại ở tầng thiết kế"* — a risk the design explicitly declines to treat is not a design risk. Risk row design.md:315 restates FR-10's own scope note. §Authentication (design.md:242-244) is boilerplate for a local stdio process. Alternative E (design.md:299-302) spends four lines justifying a six-line closure.
- **Issue:** The design is 315 lines governing roughly 60 lines of code. The substantive content justifies most of that length, but the sections above are pure restatement and dilute the parts an implementer must read carefully — including the narrowing shape that C1 shows is load-bearing.
- **Recommendation:** Delete §Component Boundaries (fold the two non-obvious rows — `type ExtractedText` and `formatUnavailable` as the sole module-scope helper — into §API/Interface Contracts), delete the two restating risk rows, and compress Alternative E into one line under the `collect` implementation note at design.md:88 where it already belongs.

### S2: NFR-1, NFR-2 and NFR-5 appear nowhere in the design; NFR-2 has a small real hole

- **Where:** design.md — zero occurrences of `NFR-1`, `NFR-2`, `NFR-5`
- **Evidence:** NFR-3, NFR-4 and NFR-6 are each cited explicitly (design.md:19, :88, :235, :266). NFR-1 (no new npm dependency), NFR-2 (no new file under `src/`) and NFR-5 (Vietnamese user-facing strings) are not.
- **Issue:** NFR-1 and NFR-5 are satisfied in substance — nothing in the design adds a dependency, and the template at design.md:134-149 is Vietnamese. NFR-2 is the one with an actual gap: the design says `type ExtractedText` is *"Một kiểu mới ở module scope"* (design.md:38) and `formatUnavailable()` is a module-scope helper, but never names the file. A task planner reading only this document could reasonably place `formatUnavailable()` in a new `src/format.ts`, which NFR-2 forbids. AC-9's `git status` clause would catch it after the fact, but that is late.
- **Recommendation:** One line in §High-Level Design: all code changes land in `src/index.ts`; no new dependency; all new user-facing strings in Vietnamese (NFR-1, NFR-2, NFR-5).

### S3: The FR-8/FR-9 handoff is sufficient; FR-10's is thinner but correctly so

- **Where:** design.md:210-219
- **Evidence:** design.md:216 pins the target to `specs/sutta-mcp-requirements.md` §"Hướng nâng cấp" item 2, *"một đoạn văn, dòng ~291"*, and design.md:219 names the three things the replacement must state. Verified: line 291 is exactly that item, and it is exactly a three-sentence paragraph. FR-10 gets one table row (design.md:217) pointing back at the six positions FR-10 already enumerates with line numbers and `grep -F` strings.
- **Issue:** None blocking. Judged against "sufficient handoff for a task planner", both are adequate — the doc-only requirements carry their own content, and duplicating it here would only create a second copy to drift. The one thing design.md:217 could add is that FR-10's six positions are one task, not six, since they must move together (requirements.md:146 flags position 5 as the one outside the F-04 section that gets missed).
- **Recommendation:** Optional. Add "một task duy nhất, sáu vị trí phải đổi cùng lúc" to the FR-10 row.

## Strengths

- **The literals hold.** Every number, ordering and location the design asserts was independently re-verified today and none were wrong — including the newline claim, which licenses a behavioural change (dropping `split("\n").filter(Boolean)`) and was the easiest thing in the document to get wrong. 0 of 233 `mn10`/`sujato` segments contain `\n` or `\r`, and both the old and new pipelines yield 194.
- **The guard is correctly locked to the response, not to metadata.** design.md:238 goes further and states what happens if Q1 is ever answered — a new union member, with the compiler enumerating the call sites. That is the right shape for an open question the requirements deliberately left unresolved.
- **Alternatives A and C are the right two to have written down.** Both are the failure modes requirements.md:86 and :90 named as the #1 risk, and design.md:292 is honest that C is *"đường đi nhỏ nhất về mặt diff và sẽ hấp dẫn lúc implement"*. Recording the tempting-but-wrong path is more useful than recording a plausible-but-irrelevant one.
- **The FR-3 constraint cross-reference table (design.md:152-165) is real traceability**, not decoration — each prohibition is mapped to the structural reason it cannot occur, and the `─".repeat(60)` separators are flagged as unrequired rather than smuggled in.

## Summary

The design's factual base is solid — every pinned literal, line reference and grep baseline re-verified clean, including the newline claim that licenses removing the `split("\n")` round-trip. But its central promise does not hold: because `noUncheckedIndexedAccess` is off, the non-empty tuple does not make a wrong `extractText()` fail to compile. Four drifting implementations compile clean under the repo's own flags, one of them the minimal mutation of the design's own sketch, and it returns `source: "translation"` with `lines: [undefined]` on exactly the whitespace-only input FR-1 case 3 defines as absent — leaving AC-7 clause 2 with no verification vehicle at all. Fix the claim and pin the narrowing shape as a normative constraint (C1); the tuple stays, it just stops being the enforcement story. W1 is secondary but concrete: `formatUnavailable()`'s fourth parameter is justified by a rule the helper body then breaks.
