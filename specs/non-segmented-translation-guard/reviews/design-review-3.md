# Review: design — Non-segmented translation guard cho `get_sutta`

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [design.md](../design.md)
**Verdict:** Approve with changes

Round 3. Project has no `.claude/rules/`, no `.claude/spec-templates/`, no `.claude/steering/` — conventions taken from `CLAUDE.md` and the existing spec artifacts.

## Round-2 Warning Closure

| Round-2 warning | Status | Evidence |
|---|---|---|
| **W1** — aliasing variant (`const raw = ...; Object.values(raw ?? {}).length > 0`) passed all four mechanical checks and reproduced the round-1 failure | **Closed** | N1 (`design.md:79-97`) makes the 19-line body normative character-for-character, checked by diff. A diff catches the aliasing variant by construction. Independently measured this round: the variant is *also* caught by N2 row 3 — see W1 below, which is a defect in the design's description of N2, not in the closure. |
| **W2** — `out.push(text)` without `.trim()` satisfied the predicate rule verbatim and would alter all 194 success-path lines | **Closed** | `design.md:137` puts `.trim()` on both the condition and the pushed value inside the normative block, and `design.md:135-136` carries the rationale as a code comment that ships into `src/index.ts`. Verified live: 194/194 non-empty `mn10`/`sujato` segments satisfy `raw !== raw.trim()`, so the design's stated blast radius is exact. |
| **W3** — `noUncheckedIndexedAccess` rejected citing a file-wide error explosion that does not exist | **Closed** | `design.md:358-366` replaces the forecast with a measured 3-row table (current file 0 errors, new code 0 errors, drift TS2322) and explicitly retracts the earlier claim. The rejection now rests on a single ground — scope (`design.md:367`) — which is legitimate: `tsconfig.json` is outside NFR-2/AC-10's stated surface. `design.md:368` records the transition condition. |

## Critical Findings

None. I attacked the freedom left at `design.md:97` (call site, `formatUnavailable()`, `describe()`) looking for a compliant-but-wrong implementation. The sharpest one I could build is W2 below — it obeys N1 byte-for-byte, compiles clean, and passes every N2 grep, but it is caught loudly by AC-1/AC-4/AC-5 because `root_text` is non-empty in all three harness cases. Nothing I constructed survives the harness.

## Warnings

### W1: N2's self-assessment is measurably wrong — the N1 drift variant does **not** pass all four greps

- **Where:** `design.md:83`, `design.md:112` (contradicting `design.md:105`)
- **Evidence:** `design.md:83` — "biến thể dưới đây compile sạch … và **qua toàn bộ** các lệnh grep ở N2 — 0 `Object.keys`, 0 `!`, **đúng 1 ` as `**, đúng 1 `translation_text`". `design.md:112` — "**N2 qua sạch trên biến thể drift ở N1.**" But `design.md:105` states N2's own post-change expectation for that row: "`grep -c ' as ' src/index.ts` | 1 | **2** — thêm đúng cast trong `asNonEmpty`".
- **Issue:** The drift variant at `design.md:86-91` does not use `asNonEmpty`, so it introduces no cast. I built it and measured it against the repo's real flags and the real file: `tsc --noEmit` exit 0 (compile claim holds), `translation_text` = 1, `Object.keys` = 2, **` as ` = 1**. N2 expects 2. Row 3 flags it. The design contradicts itself 22 lines apart, and the contradiction is load-bearing: this variant is the sole example offered for "N2 is not sufficient".
  The error is in the safe direction (it understates N2, never overstates it), and the *conclusion* survives — the second variant named one sentence later at `design.md:93` (drop `.trim()` from the `push` side, keep everything else) really does pass all four rows, because it keeps `asNonEmpty` and therefore keeps ` as ` at 2. But a document whose entire authority rests on measured claims cannot carry a false measured claim, and this one is stated twice in bold.
- **Recommendation:** Attach the "passes all of N2" claim to the `.trim()`-drop variant, which is the one that actually does. For the aliasing variant, state what is true: it defeats the compiler and three of four greps, and is caught only by row 3 — which is itself fragile, since any drift that keeps `asNonEmpty` restores the count. Then `design.md:112` becomes "N2 catches the alias variant by accident, not by design; the net is N1" — a stronger sentence than the current one and an accurate one.

### W2: An implementer can obey N1 character-for-character and still ship the original bug, via the call-site branch condition

- **Where:** `design.md:97`, `design.md:233-253` (call-site block), `design.md:32`
- **Evidence:** `design.md:97` — "`formatUnavailable()`, call site và `describe()` **không** nguyên văn". `design.md:32` states the central principle as "`source` là hệ quả của việc danh sách đó rỗng hay không", which invites the call site to test the same thing directly.
- **Issue:** Substituting `if (extracted.lines.length === 0)` for `if (extracted.source !== "translation")` at the call site is the natural misreading of `design.md:32`, and it reproduces the original defect exactly. Measured with the correct N1 body in place: `tsc --noEmit` clean (`lines.length === 0` performs no narrowing, and none is needed), `translation_text` = 1, `Object.keys` = 2, ` as ` = 2 — **all four N2 rows pass**, and all four AC-7 clauses pass (one `translation_text` read, inside `extractText()`; `source` derived post-filter; no `translation_text` in the `get_sutta` body; no second key-count expression — `lines.length === 0` is not one). On `mn10`/`minh_chau` the guard never fires, because `source: "root"` carries 235 non-empty root lines, and the output is `Translator: Thích Minh Châu (minh_chau)` over 50 Pali segments.
  This is caught — AC-1, AC-4 and AC-5 all fail on it, immediately and on the headline case. So it does not block. But note the proportion: the design spends roughly 60 lines closing the alias variant, which requires an implementer to deliberately write `Object.values(raw ?? {}).length`, while the more probable drift is left to the harness alone. The design is honest about the scope boundary at `design.md:97`; it just drew the boundary two lines too early.
- **Recommendation:** Extend N1's verbatim scope by exactly two lines — the `if (extracted.source !== "translation") {` line and its closing brace — or add a fifth N2 row: `grep -c 'extracted.source' src/index.ts` → **1**. Either costs one line of spec and converts the most likely remaining drift from harness-caught to statically caught. If neither, say explicitly in §Testability that the branch condition is verified only by AC-1/AC-4/AC-5, so a task planner does not treat those ACs as optional.

### W3: FR-4's requested-language ordering tier is exercised by no acceptance criterion — measured, both harness cases

- **Where:** `design.md:178-179`, `design.md:322-326`
- **Evidence:** `design.md:178-179` — `const rank = (t: any) => requestedLang && t.lang === requestedLang ? 0 : t.lang === "en" ? 1 : 2;`. `design.md:325` — "`mn10`/`minh_chau`: … `requestedLang = "vi"`, tier `vi` rỗng nên **`sujato` đứng đầu**".
- **Issue:** The design notes the `vi` tier is empty for `mn10` but does not draw the consequence. I fetched both harness cases live today: `mn10` — 43 translations, 10 pass the three-condition filter (`sabbamitta/de`, `sujato/en`, `trush/gu`, `trush/hi`, `giovannizappa/it`, `piyadassi/lt`, `hardao/pl`, `sv/ru`, `o/ru`, `brankokovacevic/sr`), requested lang `vi`, **zero `vi` entries**; `dhp1-20` — 33 translations, 5 pass (`sabbamitta/de`, `sujato/en`, `suddhaso/en`, `thitanana/et`, `luka/ka`), requested lang `vi`, **zero `vi` entries**. Tier 0 is dead in both. AC-2 exercises only the `en`-before-rest rule; AC-5 pins no order at all. So the FR-4 clause "ngôn ngữ của bản dịch được yêu cầu trước" has no verification vehicle anywhere in the AC set, and the failure it guards against lands on the primary stakeholder group (`requirements.md:72`, Vietnamese readers) in exactly the case that matters — a sutta with a second Vietnamese translation.
- **Recommendation:** The design cannot add ACs, but it can name the gap. Add a line to §Testability & Verification stating that tier 0 of `rank` is unexercised by AC-2 and AC-5 (with the measured entry lists above as evidence) and that it is verified by code reading only. Flag it for the task planner so the `rank` expression gets a dedicated read-check task rather than riding on AC-2.

### W4: The document has absorbed its own review history, and the same claim is restated eight times

- **Where:** throughout; concentrated at `design.md:51-75`, `design.md:79-97`, `design.md:152-158`, `design.md:255`, `design.md:333`, `design.md:347-353`, `design.md:366`
- **Evidence:** "the type does not enforce FR-1/FR-2; N1 does" appears at `:34`, `:53`, `:64`, `:158`, `:258`, `:309`, `:353`, `:382`. Explicit review-artifact references leak into the design: `:255` — "đây là cái giá đã biết của **W1**"; `:333` — "Lưu ý sau hai vòng review"; `:347` — "**Bản trước** của thiết kế này"; `:352` — "**Bản trước** cấm mọi `as`"; `:366` — "**Bản trước** của tài liệu này viết rằng…". Growth: 315 → 340 → **386** lines (280 non-blank) governing roughly 60 lines of code.
- **Issue:** An implementer reading this has never seen W1 and does not have the previous version. Those five sentences are addressed to a reader who does not exist at implementation time. Separately, two near-identical drift demonstrations occupy `:55-62` and `:86-93`: the first (key-count gate + hand-built tuple) is strictly subsumed by the second (same, plus aliasing), and both end with the same runtime narration — `:62` "`source="translation"`, `lines=[undefined]`, thân rỗng, footer `[Hết văn bản — 1 đoạn]`" and `:93` "`source="translation"`, `lines=[undefined]`, thân rỗng, `[Hết văn bản — 1 đoạn]`". Length is not automatically virtuous, and each round's growth was locally justified, which is precisely how a document stops being read.
  To be fair and specific: the document **is** executable. The normative content is concentrated and mechanical — the N1 block (`:131-149`), the guard template (`:198-215`), the constraint table (`:217-227`), the call-site sketch (`:233-253`), the `describe()` string (`:265-268`), and the doc-change table (`:277-282`). An implementer who reads only those six blocks can ship the feature correctly. The problem is that they are interleaved with ~80 lines of rebuttal prose with no signal marking which is which.
- **Recommendation:** Cut, roughly 40 lines with no information loss: delete `:55-62` (subsumed by `:86-93`; keep the six-row table at `:66-73`, it is compact and load-bearing); fold `:152-158` into Alternative E at `:350-353`, which makes the same argument; delete the retraction sentence at `:366` ("Bản trước của tài liệu này viết rằng…**Sai**") — the measured table above it already carries the point; strip the "W1" reference at `:255` and the "bản trước / hai vòng review" framing at `:333`, `:347`, `:352` down to the technical content. Reviews live in `reviews/`; the design should read as if it were written once.

## Suggestions

### S1: N2 row 4 is the only row without a number

- **Where:** `design.md:106`
- **Evidence:** `| grep -n 'segmented' src/index.ts | 0 | chỉ ở bộ lọc FR-4 và describe() FR-7 |` — rows 1-3 give an expected count; row 4 gives prose.
- **Recommendation:** `design.md:271` already pins exactly two permitted locations ("**một trong hai** vị trí duy nhất"). So row 4 can be `grep -c` → **2**, with the prose kept as the location constraint. Same table, one more mechanical check, and it catches a `segmented` mention leaking into a third place — including a guard output string, which is FR-3 prohibition 4.

### S2: The empty-alternatives branch does not say whether the bold header survives

- **Where:** `design.md:207-215`
- **Evidence:** `design.md:211` — "Nhánh danh sách rỗng thay khối `{alternatives}` bằng đúng một dòng". The `{alternatives}` placeholder at `:208` is the line *below* the header at `:207`.
- **Issue:** Read literally, the header `**Các bản dịch khác của kinh này, có thể lấy được (không bảo đảm):**` remains and is immediately followed by `(không tìm thấy bản dịch nào khác cho kinh này)` — announcing a list and then denying it. AC-6 only requires the pinned string to be printed, so both readings pass. No FR is violated either way; this is output quality on a branch that has no live UID (`requirements.md:366`).
- **Recommendation:** One sentence at `:211` saying whether the header is dropped or kept in the empty case.

### S3: The call site is shown as 21 lines of code and then declared non-normative

- **Where:** `design.md:233-253` vs `design.md:97`
- **Issue:** Printing a full code block is the strongest possible signal that it is normative. The document then says it is not, 136 lines earlier. An implementer will copy it regardless — which is the good outcome — but the mismatch between form and status is what left the W2 hole open.
- **Recommendation:** If W2 is taken, this resolves itself for the branch line. Otherwise, label the block explicitly ("illustrative; binding constraints are FR-3/FR-4/FR-6 plus AC-1/AC-4/AC-5") so its status is readable where it is read.

## Strengths

- **N1 is the right instrument and it is correctly executed.** Nineteen lines, machine-extractable, checked by diff instead of interpretation — it converts an unbounded set of wrong implementations into a single equality test, and the rationale comment at `:135-136` ships into `src/index.ts` so it survives the spec.
- **Every citation I checked holds.** N2 baselines measured against the real file: `translation_text` 1, `Object.keys` 3 (at `:116`, `:168`, `:289` — exactly as described, including which one must die), ` as ` 1, `segmented` 0, `!` 10. `package.json` really does declare `engines.node >= 18` (`:192`'s sort-stability claim). `src/index.ts:258` really is the `  • ${t.lang_name} — ${t.author} (${t.author_uid})` line. `specs/sutta-mcp-requirements.md:291` really is a three-sentence paragraph. Live re-fetch today confirms 233 keys / 194 non-empty, 0 segments containing newlines, 194/194 with trailing whitespace, 43 → 10 filtered for `mn10`, 33 → 5 for `dhp1-20`.
- **The three rejections that previously rested on forecasts now rest on measurements**, and Alternative F reverses its own earlier reasoning in public rather than quietly. `design.md:229` and `design.md:333` volunteer weaknesses (a design element no FR requires; the gap between this design and Alternative A being "hẹp") that a defensive document would have omitted.
- **Failure modes and scope are explicitly bounded** — `design.md:160` covers `bilaraData` null, `design.md:194` covers the typo'd `author_uid`, `design.md:289` states what happens to the union if Q1 is ever answered, `design.md:301` states what deliberately stays noisy.

## Summary

No Critical findings. The N1/N2 restructure closes all three round-2 warnings, and the remaining freedom at the call site does not admit an implementation that survives the harness — the one drift I could build (`if (extracted.lines.length === 0)`) obeys N1 verbatim, compiles clean and passes all four greps, but fails AC-1, AC-4 and AC-5 on the headline case. The two findings worth acting on before handoff are W1, where the design's claim that its own drift example "passes all of N2" is measurably false on the ` as ` row and contradicts its own table 22 lines away, and W4, where 386 lines governing 60 lines of code now include five sentences addressed to a reviewer rather than an implementer.

**Ready for a task planner.** All four findings are text edits to the design; none change the code shape, and none need to land before task decomposition begins.
