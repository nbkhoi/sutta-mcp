# Review: design — Non-segmented translation guard cho `get_sutta` (round 2)

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [design.md](../design.md)
**Verdict:** Approve with changes

Upstream/context read: `requirements.md` (Status: Reviewed, treated as settled), `design-review-1.md`, `src/index.ts`, `tsconfig.json`, `package.json`, `specs/sutta-mcp-requirements.md:286-296`, `CLAUDE.md`. No `.claude/rules/`, `.claude/spec-templates/` or `.claude/steering/` in this repo, so no template-conformance check was possible. This review judges the current version on its own merits; it does not review `design-review-1.md`.

## C1 status: **RESOLVED**

Round 1 blocked on the claim that the non-empty tuple made a wrong `extractText()` fail to compile. That claim is gone and is replaced by an explicit retraction in the artifact itself:

- design.md:52 — *"**Bản thiết kế trước tuyên bố sai rằng kiểu này khiến implementation sai không compile được. Nó không.**"* — with the missing flag named and the drift reproduced verbatim (design.md:54-61).
- design.md:63-71 replaces the claim with a measured table of which shapes compile and which do not.
- design.md:274 reduces the Compiler row to *"Chỉ AC-9"*; design.md:283 reassigns AC-7 clause 2 to `N3.1` grep + N1/N2 reading. **No AC is orphaned** — I checked all twelve: AC-1..5 and AC-8 → harness; AC-9 → compiler; AC-6, AC-7 (all four clauses), AC-10, AC-11, AC-12 → grep/reading.
- design.md:223 states the residual honestly: *"Đây là hệ quả của N1, **không** phải bảo đảm của kiểu — nếu N1 bị vi phạm, kiểu vẫn hợp lệ còn `lines` vẫn có thể chứa `undefined`."*

The defect is not repeated in this layer. Everything below is Warning or lower.

## Verification performed

Re-measured today; the dispatch's pre-verified items are not repeated.

| Claim (design.md) | Method | Result |
|---|---|---|
| Behaviour table for the four `translation_text` cases (design.md:130-134) | ran the design's exact `extractText()` body | **Holds** — missing / `{}` / all-whitespace → `root`; content → `translation`. Also ran `bilaraData: null` (design.md:125) → `{source:"root", lines:[]}` |
| Intended implementation compiles under repo flags | `tsc --strict --target ES2022 --module Node16 --moduleResolution Node16 --noEmit` | exit 0 |
| `mn10`/`sujato`: 233 keys → 194 post-filter, 0 newlines (design.md:289) | live fetch | **Holds** — 233 / 194 / 0 |
| `mn10`/`minh_chau`: 10 entries, `sujato` first, `requestedLang="vi"` (design.md:290) | live suttaplex + the design's exact filter/rank/sort | **Holds** — 43 → 10, first line `sujato` |
| `dhp1-20`/`phantuananh`: 5 entries, `phantuananh` absent (design.md:291) | same | **Holds** — 33 → 5, removed by condition 1 |
| No `lang_name`/`author` contains `segmented` or `Translator: ` (design.md:340) | scanned `mn10`, `dhp1-20`, `thag1.1` result sets | **Holds** — 0 hits |
| `Object.keys` at `:116`, `:168`, `:289`; `translation_text` 1 hit at `:113`; `segmented` 0 hits; ` as ` 1 hit at `:300` | grep | **Holds** |
| Sort stability rests on `package.json engines` (design.md:157) | read | **Holds** — `"node": ">=18"` |
| `tsconfig.json` lacks `noUncheckedIndexedAccess` (design.md:52) | read | **Holds** |

One correction to the dispatch premise, not to the artifact: the document is **340 lines / 248 non-blank**, not 292. Against round 1's 315 it *grew* by ~25 lines. The growth is content — §"Compiler làm được gì" (design.md:50-71), §"Luật thi hành" (design.md:73-84), and the rewritten Alternatives E/F — and the two purely restating risk rows round 1 flagged (S1) are gone. Nothing traceable to a requirement was lost; the proportionality concern is satisfied even though the direction is the opposite of what the dispatch stated.

## Critical Findings

None.

## Warnings

### W1: "gate drift forces `translated!`" is false — a drift compiles clean, passes **all four** of the design's mechanical checks, and reproduces the round-1 runtime failure

- **Where:** design.md:122 (rationale for `asNonEmpty`), design.md:333 (risk-table mitigation for the feature's #1 risk, M/H)
- **Evidence:** design.md:122 — *"Muốn drift sang gate khác thì phải viết `translated!` — vi phạm N3.2 và nhìn thấy được."* design.md:333 repeats it as mitigation: *"`asNonEmpty` khiến gate lệch phải viết `translated!`, vi phạm N3.2"*.

  The design's own Data Model table refutes it two sections earlier — design.md:69: *"Gate bằng `Object.keys(...)`, tuple dựng tay `[lines[0], ...lines.slice(1)]` | Compile sạch"*. Building the tuple by hand is a second production site for `[string, ...string[]]`, so `asNonEmpty` is not the only producer and `!` is not required to drift.

  design.md:69 assumes such a drift still contains `Object.keys` and is therefore caught by N3.1's grep. It need not. Aliasing the field removes both greppable traces. Compiled with the repo's flags (`tsc --strict --target ES2022 --module Node16 --moduleResolution Node16 --noEmit`) — **exit 0**:

  ```ts
  const raw = bilaraData?.translation_text;      // the only 'translation_text' occurrence
  const arr = collect(raw);
  if (Object.values(raw ?? {}).length > 0) {     // key-count gate — no Object.keys
    return { source: "translation", lines: [arr[0], ...arr.slice(1)] };
  }
  ```

  Scored against every mechanical check the design defines:

  | Check (design.md) | Expected | This drift | Result |
  |---|---|---|---|
  | N3.1 — `grep -n 'Object\.keys' src/index.ts` (:80) | exactly 2 | 2 | **passes** |
  | AC-7 cl. 1/3 — `grep -n 'translation_text'` (:282) | exactly 1, inside `extractText()` | 1, inside `extractText()` | **passes** |
  | N3.2 — no `!` (:81) | 0 | 0 | **passes** |
  | N3.3 — one `as`, inside `asNonEmpty` (:82) | 1 | 1 (`asNonEmpty` kept, unused as a gate) | **passes** |
  | AC-7 cl. 4 — no second `Object.keys(bilaraData?.translation_text ?? {}).length` (:285) | absent | absent (spelled `Object.values(raw ?? {}).length`) | **passes** |
  | N2 — predicate verbatim (:78) | verbatim | verbatim | **passes** |

  Executed on FR-1 case 3 (`translation_text` present, all values whitespace):

  ```
  DRIFT source: translation | lines: [undefined] | join: "" | count: 1
  ```

  Byte-for-byte the round-1 failure: `Translator: <tên>` over an empty body and `[Hết văn bản — 1 đoạn]`.
- **Issue:** Two problems, one factual and one structural. Factual: design.md:122 and :333 credit `asNonEmpty` with forcing a visible `!`, which it does not — a reader who trusts it will conclude "no `!` in the diff ⟹ the gate is `asNonEmpty`'s return" and skip the N1 read. That is the same species of defect as C1: a mechanism credited with more than it delivers, stated twice, once in a rationale and once in the risk table. Structural: the only rule that catches this drift is **N1**, read by a human, and design.md:84's rationale for the whole N3 apparatus was that *"lệnh cấm toàn phần kiểm được bằng một lệnh grep có số đếm kỳ vọng, còn lệnh cấm theo mục đích thì phải đọc và diễn giải"*. For the exact failure this feature exists to prevent, the grep-with-a-count layer contributes nothing and the design is back on interpretation. design.md:283 is honest about this (*"cộng N1/N2 đối chiếu trên ~14 dòng thân hàm"*); design.md:84's *"Đây là vehicle của AC-7 mệnh đề 2"* and :122/:333 are not.
- **Recommendation:** Delete the `translated!` sentence at design.md:122 and the corresponding clause at design.md:333; replace with what is true — `asNonEmpty` makes the *correct* spelling the shortest one, and every grep passes on the manual-tuple drift, so N1 is the sole net. Then make N1 mechanically checkable at no cost: the design already prints the complete 16-line `extractText()` body (design.md:101-116), so promote it — *"thân `extractText()` phải khớp nguyên văn khối code ở §`extractText()`"*. That converts N1 and N2 from "read ~14 lines and interpret" into one diff, and it subsumes N3 entirely. See also W3, which closes the same hole from the compiler side.

### W2: N2 pins the predicate but not the pushed value — a drift satisfying N1, N2 verbatim and N3 changes every line of the FR-6 success path

- **Where:** design.md:78 (N2), design.md:105 (the code it is drawn from)
- **Evidence:** design.md:78 — *"**N2 — predicate của `collect()`.** Phải đúng nguyên văn `typeof text === "string" && text.trim()`"*. The code at design.md:105 is `if (typeof text === "string" && text.trim()) out.push(text.trim());`. N2 quotes only the condition. This satisfies N2 as literally written and compiles clean:

  ```ts
  if (typeof text === "string" && text.trim()) out.push(text);   // predicate verbatim; pushes untrimmed
  ```

  Measured on `mn10`/`sujato` today: **194 of 194** post-filter segments have `raw !== raw.trim()` — every one carries a trailing space. First three raw values: `"Middle Discourses 10 "`, `"Mindfulness Meditation "`, `"So I have heard. "`. The existing code trims at `src/index.ts:121`, so this drift alters **every line** of the translation path, against FR-6 (*"output phải giữ nguyên cấu trúc hiện tại"*). AC-3's pinned clauses read as equality — *"dòng đầu tiên của phần thân là `Middle Discourses 10`"* and the 50th line — so a strict AC-3 run catches it and a substring-based run does not.
- **Issue:** N2 is presented as the guarantee that "dòng không rỗng" keeps one definition (*"Đây là định nghĩa duy nhất của 'dòng không rỗng' mà FR-1 dựa vào"*), and a reviewer instructed to check N2 will tick it off on this drift. The line count and the guard behaviour are unaffected — this is a fidelity defect on the success path, not an absence-definition defect — which is why it is a Warning rather than Critical.
- **Recommendation:** Extend N2 to the pushed value (`out.push(text.trim())`, matching `src/index.ts:121`), or adopt W1's verbatim-body rule, which covers both.

### W3: Alternative F is rejected on a cost claim that is measurably false — and the flag would kill W1's drift

- **Where:** design.md:323
- **Evidence:** design.md:323 — *"một cờ compiler mới sẽ làm nổ lỗi ở những chỗ không liên quan trong cả file (mọi index access vào mảng/`Record`), kéo diff ra ngoài `extractText()`/`get_sutta` và vi phạm NFR-6."*

  Measured (flag confirmed active by a control file that fails with it and passes without it):

  | Compile | Result |
  |---|---|
  | current `src/index.ts` with `tsc --noEmit --noUncheckedIndexedAccess` | **0 errors** |
  | the design's intended `extractText()` with the flag | **0 errors** (the `as [string, ...string[]]` assertion is still legal) |
  | W1's drift with the flag | **TS2322** — `Type 'string \| undefined' is not assignable to type 'string'` at `[arr[0], ...arr.slice(1)]` |

  `TOPIC_INDEX[q]` at `src/index.ts:102` — the one place the claim would most plausibly hold — narrows fine, because `q` is a `const`.
- **Issue:** The forecast cost is zero induced errors, not "lỗi ở những chỗ không liên quan trong cả file". This matters because Alternative F is the only mechanism that closes W1's hole in the compiler rather than in prose, and design.md:323 itself concedes it is *"lời giải đúng về kỹ thuật cho C1"*. Rejecting it is still defensible on the **first** ground stated — scope: no NFR or AC authorises a `tsconfig.json` change, and design must not unilaterally widen the scope requirements set. But the decision is currently carried by a false second ground, and a task planner reading design.md:323 will believe the flag is expensive when it is free today.
- **Recommendation:** Delete the "sẽ làm nổ lỗi" clause and state the measurement (`0 errors` on the current file and on the intended new code, and that it rejects the W1 drift). Then either keep the scope-based rejection explicitly on its own, or raise the flag as a one-line question back to `requirements.md` — NFR-2/AC-10 speak only about `src/`, `package.json` and new files, so a `tsconfig.json` change is unaddressed rather than forbidden.

## Suggestions

### S1: `:168` and `:289` in N3.1 are pre-change line numbers stated as a post-change expectation

- **Where:** design.md:80, repeated at design.md:283
- **Evidence:** design.md:80 — *"Sau thay đổi, `grep -n 'Object\.keys' src/index.ts` phải trả về **đúng 2 dòng**, cả hai ngoài `extractText()`: `:168` … và `:289`"*. Both numbers are correct **today** (verified). The change inserts `type ExtractedText` (~5 lines), grows `extractText()` (+~2) and adds `formatUnavailable()` (~25 lines) — all above line 168 — so both will shift by roughly +30.
- **Issue:** The count is the checkable part and survives; the numbers do not, and this project has been burned in both directions by pinned literals. The parentheticals (`TOPIC_INDEX trong search_topic`, `get_parallels`) make it self-correcting, which is why this is a Suggestion.
- **Recommendation:** Mark the two numbers as the *baseline* location and identify the survivors by context only.

### S2: "ba lệnh cấm greppable" holds for one of the three

- **Where:** design.md:79
- **Evidence:** design.md:79 — *"**N3 — ba lệnh cấm greppable**"*. Only N3.1 comes with a grep and an expected count. `grep -c '!' src/index.ts` returns **10** today (`!res.ok`, `!==`, `!data`, `!t.is_root`, …), so N3.2 is a bounded read of the function body, not a grep. N3.3 has no expected count stated.
- **Recommendation:** N3.3 can cheaply become greppable: ` as ` has exactly **1** hit today (`src/index.ts:300`, `data as Record<string, any[]>`), so the post-change expectation is `grep -c ' as ' src/index.ts` → **2**. For N3.2, say "đọc thân hàm" rather than "grep", or give the file-wide baseline of 10 so a reviewer knows what a clean result looks like.

### S3: the audited cast's comment asserts a proof obligation without stating it

- **Where:** design.md:109-111
- **Evidence:** design.md:109 — *"Cast duy nhất được phép trong hàm này; nghĩa vụ chứng minh nằm gọn trên cùng một dòng."* The obligation itself is stated only at design.md:122, in prose the implementer will not have in front of them. Judged on substance the cast is sound and the obligation *is* discharged: `asNonEmpty` is a closure with one call site, its argument is always `collect()`'s output, which is built push-only (so never sparse), and the gate `a.length > 0` is on the same line as the cast. N3.3 is checkable as written because the scope is a 16-line body.
- **Recommendation:** Put the obligation in the comment rather than a pointer to it — e.g. *"`a.length > 0` ⟹ có phần tử tại index 0; `a` luôn là mảng dựng bằng `push` trong `collect()`, không bao giờ sparse."* One line, and it survives the trip into `src/index.ts` where design.md:122 does not.

### S4: the FR-9 content checklist drops one of the four items FR-9 pins

- **Where:** design.md:247
- **Evidence:** design.md:247 lists three things the replacement for §"Hướng nâng cấp" item 2 must state: the real mechanism, the three translators with a non-predictive `segmented` column, and Q1 as an open question. `requirements.md:132` pins a fourth: the note that `minh_chau` and `phantuananh` are two different `author_uid`s that both credit Thích Minh Châu — the confusion the current bug output (`Translator: Bhikkhu Thích Minh Châu (phantuananh)`) actively produces.
- **Issue:** Minor. AC-11's *"không còn câu nào nói rằng phải chờ SC xuất bản"* is satisfied by construction since the whole item is replaced. But a partial checklist in the one place the design chose to enumerate is easier to mistake for the whole list than no checklist at all.
- **Recommendation:** Add the fourth bullet, or drop the enumeration and point at FR-9.

## Strengths

- **The retraction is in the artifact, not just the fix.** design.md:50-71 names the missing flag, reprints the drift that compiles, and gives a measured five-row table of what does and does not compile. A future reader who has the same idea round 1 had will find it already tested. That is the correct response to an overclaim.
- **Every live literal re-verified clean again.** 233→194, 0 newlines across 233 raw values, 10 entries with `sujato` first for `mn10`/`minh_chau`, 5 for `dhp1-20`/`phantuananh`, 0 banned strings across three result sets, `engines: >=18`. I found no wrong number, quote or line reference in the document.
- **The intended implementation matches its own behaviour table exactly**, including the `bilaraData: null` case at design.md:125 that the table does not list — all five inputs produced what design.md:125-134 predicts.
- **Round 1's W1/S1/S2/S3 are all discharged, and Alternative D records why the old rationale was wrong** (design.md:313) instead of quietly changing it. The document grew rather than shrank, but the growth is normative content and the pure-restatement rows are gone.
- **Diff scope holds.** Moving `src/index.ts:214-216` below the guard stays inside `get_sutta`, so AC-10's hunk restriction is untouched; the success path keeps `translatorName`, `truncated`, `isTruncated` and the output array unchanged, and `extracted.lines` (`[string, ...string[]]`) is assignment-compatible with the untouched tail. The cost is named up front at design.md:220 rather than discovered at implement time.

## Summary

C1 is resolved: the compiler overclaim is retracted in the artifact, AC-7 clause 2 has a stated vehicle again, and no AC is orphaned. What survives is smaller but the same species — design.md:122 and the risk row at :333 claim that gate drift forces a visible `translated!`, and it does not: an aliased key-count gate with a hand-built tuple compiles clean, passes N2, N3.1, N3.2, N3.3 and the `translation_text` count-1 grep, and still emits `{source:"translation", lines:[undefined]}` on whitespace-only input, leaving N1 — read by a human — as the only net (W1). N2 has the analogous gap on the pushed value, where all 194 `mn10`/`sujato` segments carry trailing whitespace (W2). Both close for free by promoting the already-printed 16-line `extractText()` body to a verbatim rule. Separately, Alternative F is rejected on a measurement that is wrong — the flag induces 0 errors on the current file and on the intended new code, and it rejects W1's drift — so the correct scope-based ground should carry that decision alone (W3).
