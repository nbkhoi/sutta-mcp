# Review: requirements — Non-segmented translation guard cho `get_sutta` (round 2)

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [requirements.md](../requirements.md)
**Verdict:** Approve with changes

Upstream/context read: `src/index.ts` (full), `claudedocs/specs-review.md:165-234` and `:285-295`, `specs/sutta-mcp-requirements.md:275-305`, `.gitignore`, `CLAUDE.md`. No `.claude/rules/`, no `.claude/spec-templates/`, no `.claude/steering/` in this repo, so no template conformance check was possible.

Every literal in the Acceptance Criteria was re-checked against the live API and the real files today. The harness in §Acceptance Criteria was reconstructed verbatim from the artifact and executed. Verification transcript is summarised under Strengths and cited per finding.

## Convergence on Round-1 Criticals

### C1 — FR-4's filter had no self-exclusion term: **RESOLVED**

FR-4 now states three conjuncts (requirements.md:104-107), with condition 1 — `author_uid !== <translator được yêu cầu>` — declared *"độc lập và bắt buộc, không được để nó phát sinh như hệ quả phụ của điều kiện 2"*. AC-5 gained the missing clause (requirements.md:249) and AC-2's `minh_chau` clause was restated as testing the self-exclusion rather than a side effect (requirements.md:208).

The fix is load-bearing, not cosmetic. Verified live today: `/api/suttaplex/dhp1-20?language=en` lists `phantuananh` with `segmented=true, is_root=false`, so it passes conditions 2 and 3; only condition 1 removes it. The filter's surviving set for `dhp1-20` is `[sabbamitta, sujato, suddhaso, thitanana, luka, phantuananh]` before self-exclusion. AC-5's clause can therefore actually fail on a wrong implementation.

### C2 — falsified `segmented` premise surviving in `claudedocs/specs-review.md`: **RESOLVED**, with one defective literal

FR-10 now enumerates six locations, including all three the challenger identified as fully escaping. Verified byte-exact in the current file:

- `:192` `- The bilara API (\`/api/bilarasuttas/{uid}/{translator}\`) **only serves segmented texts**` — named as FR-10 item 1, asserted by AC-12 (requirements.md:312).
- `:195-197` `Waiting for SC to publish segmented Vietnamese translations` — named as FR-10 item 3, asserted by AC-12 (requirements.md:314).
- `:294` the Combined Verdict Summary `| F-04 | … | **UPSTREAM** | …` row — named as FR-10 item 5, and AC-12's `UPSTREAM` clause (requirements.md:316) explicitly extends the Given to the whole file, closing the scoping hole Round 1 found.

The residue at `:218-221` is named by FR-10 item 4 but its AC-12 clause is unexecutable as written — see W1. That is a Warning, not a repeat Critical: the location is named in the FR, and AC-12's verdict clause (requirements.md:317) still reaches the `### Verdict Recommendation` block.

### C3 — AC-3's byte-identity clause: **RESOLVED**

The byte clause is gone. AC-3 now carries four structural assertions and an explicit paragraph explaining why byte-identity was rejected (requirements.md:225), naming the drift path `src/index.ts:213` → `:131-133` → `:138` — all three references correct.

All four assertions verified today by running the artifact's own harness against `dist/index.js`:

| AC-3 clause | Observed |
|---|---|
| `Translator: Bhikkhu Sujato (sujato)` | exact match, output line 4 |
| body line 1 = `Middle Discourses 10` | exact match |
| body line 50 = `And so they meditate observing an aspect of the body internally …` | exact match, including the literal `…` character |
| ends with `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]` | exact match, final line |

`translation_text` for `mn10`/`sujato` has 233 keys and 194 post-filter lines. The artifact's `194` is right and Round-1 W8's recommended `233` was wrong; the artifact correctly did not follow it.

**No Round-1 Critical survives in any form.**

## Critical Findings

None.

## Warnings

### W1: AC-12's fourth string literal does not exist in the target file — the clause passes today, before any edit

- **Where:** requirements.md:315
- **Evidence:** *"**And** không còn chuỗi `waiting for segmented Vietnamese editions` (khối 218-221)"*. The actual text in `claudedocs/specs-review.md:220-221` is line-wrapped inside a fenced block:
  ```
       Requires either a fallback to the legacy text API or waiting for
       segmented Vietnamese editions."
  ```
- **Issue:** `grep -F 'waiting for segmented Vietnamese editions' claudedocs/specs-review.md` returns nothing right now, with the file unmodified — verified. The clause is vacuously satisfied and cannot detect the residue it exists to detect. This is the same class of defect as Round 1's C1/W8 (a pinned literal that does not match reality), inverted: last round produced a guaranteed false failure, this one produces a guaranteed false pass. It is the only AC-12 clause targeting the `218-221` falsified proposition; the block is otherwise covered only by the softer verdict clause at requirements.md:317.
- **Recommendation:** Replace with a literal that exists on one line, e.g. *"không còn chuỗi `segmented Vietnamese editions`"* (matches `:221` alone), or assert the whole falsified sentence's distinctive fragment *"Bilara API cannot serve them"* (matches `:219` on one line). Verify any replacement with `grep -F` against the current file before pinning it.

### W2: AC-5 has no positive string anchor, and the harness discards stderr — an empty run passes it entirely

- **Where:** requirements.md:239-250 (AC-5), requirements.md:173 (harness `2>/dev/null`)
- **Evidence:** AC-5's five observable clauses are *"không chứa `manoseṭṭhā manomayā;`"*, *"không chứa chuỗi `Translator: `"*, *"không chứa `[Hết văn bản` cũng như `[... văn bản bị cắt`"*, *"`phantuananh` không xuất hiện trong danh sách gợi ý"*, *"không chứa chuỗi `segmented`"*. Every one is a negation. The only non-negative clause is *"đi vào **cùng nhánh guard** như AC-1"*, which names no observable string. The harness pipes the server with `} | node ./dist/index.js 2>/dev/null`.
- **Issue:** If the run produces no tool output — stale `dist/`, network slower than the fixed `sleep 20`, a throw inside `get_sutta` — stdout carries no `id:2` result text and all five clauses are satisfied by an empty string. Stderr, which is where `console.error` and any crash trace would land, is suppressed. AC-1 and AC-4 are protected by positive clauses (*"chứa `minh_chau`"* + *"chứa `https://suttacentral.net/mn10`"*; *"nêu `indacanda`"*); AC-5 — the case class the artifact itself calls *"quyết định"* — is not.
- **Recommendation:** Add positive anchors to AC-5: *"chứa `phantuananh`"* and *"chứa `https://suttacentral.net/dhp1-20`"*. Verified safe: `/api/suttaplex/dhp1-20` returns `uid: "dhp1-20"`, so `formatCitation()` emits exactly that URL. Separately, either drop `2>/dev/null` from the harness or add a line telling the verifier to confirm a JSON line with `"id":2` was received before evaluating any negative clause.

### W3: AC-7 explicitly permits the key-count selector inside `extractText()`, leaving FR-1's third case unenforced

- **Where:** requirements.md:268 (AC-7), requirements.md:77-86 (FR-1, FR-2), `src/index.ts:116`
- **Evidence:** FR-1 defines absence as post-filter line count zero and says it *"bao trùm cả ba trường hợp: thiếu hẳn key `translation_text`; có key nhưng object rỗng; có key với các giá trị đều rỗng hoặc chỉ khoảng trắng"*. AC-7's third clause: *"không tồn tại biểu thức thứ hai kiểu `Object.keys(bilaraData?.translation_text ?? {}).length` **ở ngoài** `extractText()`"*.
- **Issue:** The prohibition is scoped to *outside* `extractText()`. An implementer who keeps `src/index.ts:116` (`Object.keys(translation).length > 0 ? translation : root`) as the source selector, adds `source` to the return value, and branches on it in `get_sutta`, satisfies FR-2 bullets 1 and 2 and every AC-7 clause — and then, for a `translation_text` whose values are all whitespace, returns `{ source: "translation", lines: [] }`, so the guard does not fire and the output is `Translator: <name>` above zero segments plus `[Hết văn bản — 0 đoạn]`. That is exactly the failure FR-1 case 3 exists to prevent. FR-2 bullet 3 does pin the predicate to post-filter, so the requirement text is coherent; the gap is that no criterion can fail on the incoherent implementation, and this is the same "two textually plausible predicates" shape that AC-7 was created for.
- **Recommendation:** Add one clause to AC-7: *"`source` phải được suy ra từ số dòng còn lại **sau** bộ lọc `text.trim()` (`lines.length > 0`), không từ `Object.keys(translation).length` — kể cả bên trong `extractText()`."* Checkable by reading the function, no live input needed.

### W4: AC-6's third clause is file-scoped and collides with FR-7 / AC-8

- **Where:** requirements.md:259 (AC-6), requirements.md:119 (FR-7), requirements.md:279 (AC-8)
- **Evidence:** AC-6's scope sentence is guard-scoped — *"chuỗi ký tự `segmented` không xuất hiện trong bất kỳ string literal hướng người dùng nào của **nhánh guard**"* — but its third clause is not: *"`grep -n 'segmented' src/index.ts` chỉ trả về các dòng thuộc logic lọc, không dòng nào nằm trong string xuất ra cho người dùng"*. AC-8 permits the word in the parameter description, forbidding only the strong claim: *"không khẳng định `segmented` là điều kiện đủ"*.
- **Issue:** A `describe()` string is a string emitted to the caller (it ships in the `tools/list` schema). A perfectly FR-7-compliant description such as *"`segmented=true` trong metadata không bảo đảm lấy được toàn văn"* satisfies AC-8 and fails AC-6's third clause. Verified baseline: `grep -n segmented src/index.ts` currently returns nothing, so after the change every hit is new and the ambiguity bites on the first run. The verifier is then forced to reinterpret a criterion mid-verification, which is what the artifact's own preamble is trying to avoid.
- **Recommendation:** Scope clause 3 to the guard branch — *"…không dòng nào nằm trong string do nhánh guard xuất ra"* — or, if the word is to be banned everywhere including the schema, say so in FR-7 and delete AC-8's *"không khẳng định là điều kiện đủ"* clause, which presupposes the word may appear.

### W5: AC-1's ordinal for `Evaṁ me sutaṁ` is wrong, and the live segment carries a trailing em dash

- **Where:** requirements.md:193
- **Evidence:** *"**Then** `result.content[0].text` **không** chứa `Evaṁ me sutaṁ` (đoạn root thứ 5 hiện đang bị phát ra)"*. Verified live against `/api/bilarasuttas/mn10/minh_chau`, applying the `src/index.ts:120` filter: the post-filter root segments are `[1] Majjhima Nikāya 10`, `[2] Satipaṭṭhānasutta`, `[3] Evaṁ me sutaṁ—`, `[4] ekaṁ samayaṁ bhagavā…`, `[5] Tatra kho bhagavā bhikkhū āmantesi:`.
- **Issue:** The string is segment **3**, not 5; segment 5 is a different line entirely. The assertion itself still works — `Evaṁ me sutaṁ` is a prefix of `Evaṁ me sutaṁ—`, the segment is inside the default 50 emitted, so the negative clause is non-vacuous — but the parenthetical is a false verified-live claim in a document whose stated value this round is literal accuracy, and a verifier who checks the annotation first will conclude the spec is stale and may skip the clause. The second anchor is correct: `Iriyāpathapabbaṁ niṭṭhitaṁ.` is post-filter segment 41.
- **Recommendation:** Change to *"(đoạn root thứ 3 — trong response API là `Evaṁ me sutaṁ—`, kiểm bằng substring)"*.

## Suggestions

### S1: FR-4's alternatives list is unbounded and unordered, and for `mn10` contains no Vietnamese entry

- **Where:** requirements.md:102-111 (FR-4), requirements.md:203-212 (AC-2)
- **Evidence:** FR-4 pins the filter but says nothing about count or order. Verified live on `/api/suttaplex/mn10?language=en`: 43 translations, of which 10 pass all three conditions for a `minh_chau` request — `sabbamitta/de, sujato/en, trush/gu, trush/hi, giovannizappa/it, piyadassi/lt, hardao/pl, sv/ru, o/ru, brankokovacevic/sr`. AC-2 constrains only membership of `sujato` and non-membership of `minh_chau`.
- **Issue:** The Vietnamese reader named as primary stakeholder (requirements.md:71) gets a ten-line list in which the only practically usable entry is `sujato`. This does not break any requirement — the LLM caller can still act on it — but the output shape is unconstrained and untested.
- **Recommendation:** Consider ordering the list (requested language first, then `en`, then the rest) or capping it, and adding a count/order clause to AC-2. Optional; the current behaviour is defensible for a prototype.

### S2: FR-10 is the largest FR by edit surface and, by the spec's own statement, produces nothing that leaves the author's machine

- **Where:** requirements.md:131-143 (FR-10), requirements.md:307-320 (AC-12)
- **Evidence:** FR-10's own scope note: *"Bản sửa dưới đây **chỉ có giá trị cho working copy của tác giả**; nó không vào commit, không tới clone khác, và **không được tính là kênh phát hành**"*. Confirmed: `.gitignore:4` = `claudedocs/`, `git ls-files claudedocs/` empty.
- **Issue:** Six documentation edits plus a nine-clause acceptance criterion are gated on an artifact the spec says has no distribution value, against a dispatch constraint of minimal change. The self-awareness is a genuine improvement over Round 1, but the work was expanded (four locations → six) rather than reduced.
- **Recommendation:** Consider marking AC-12 as non-blocking for phase advance (the durable corrections are FR-8/FR-9, covered by AC-11), or dropping the FR-10 items whose content is already carried by FR-8/FR-9.

### S3: AC-8's fallback vehicle cites a line range that this change itself will move

- **Where:** requirements.md:276, requirements.md:180
- **Evidence:** *"(hoặc đọc `src/index.ts:197-200` nếu không chạy được harness)"*. `197-200` is the current `translator` `describe()` block — correct today — but FR-7 rewrites that description, and any length change shifts the range for the post-change read.
- **Recommendation:** Refer to it by name (*"chuỗi `describe()` của tham số `translator` trong `get_sutta`"*) rather than by line range, for the post-change vehicle. FR-7's own use of `197-200` as the edit target is fine and should stay.

## Strengths

- **The harness is genuinely self-contained and genuinely works.** I reconstructed the heredoc at requirements.md:165-178 verbatim into a fresh path and ran it against `dist/index.js`: it returned a full JSON-RPC envelope on the `id:2` line, `result.isError` absent, `result.content[0].text` matching all four AC-3 literals. Round 1's W1 — "no stated harness can actually invoke a tool" — is fully closed, and the spec does not merely point at `/tmp/mcp-call.sh`, it contains the script that creates it, plus the cleanup step (requirements.md:182).
- **Literal accuracy is high and independently checked.** Every code reference (`src/index.ts:112-126`, `:116`, `:120`, `:131-133`, `:138`, `:163-172`, `:192-237`, `:197-200`, `:208-216`, `:213`, `:250-254`, `:289-293`, `:429-433`), every `claudedocs/specs-review.md` line reference (192, 193, 195-197, 201, 203-207, 211-224, 214-216, 218-221, 294), `specs/sutta-mcp-requirements.md:291`, and `.gitignore:4` check out. Live counts confirmed: `mn10` 233 keys / 194 filtered, `root_text` 235/235; `thag1.1` 24 root; `dhp1-20` 108 root; `mn10` suttaplex 43 entries identical for `en` and `vi`. The three Pali anchors in AC-4 and AC-5 are correct to the ordinal.
- **The 233-vs-194 discovery was handled correctly and propagated.** The distinction is stated in FR-1, re-stated in AC-3 with a drift-immune fallback check (*"`N` … phải bằng số giá trị không rỗng của `translation_text` trong chính response lấy cùng lúc"*), and recorded in Assumptions. The artifact rejected a wrong recommendation from its own Round-1 review rather than following it — that is the right instinct.
- **AC-7 exists at all.** A code-inspection criterion for "two parallel predicates that both pass every behavioural test" is the correct shape for the risk FR-2 names, and the artifact states plainly why it exists (requirements.md:270). W3 narrows its scope; it does not question the design.
- **Scope did not widen where it counts.** NFR-6's rewording matches AC-10 clause-for-clause, and the "one module-scope helper" allowance is bounded by an AC that can fail on a second one. `extractText()` has exactly one caller (`src/index.ts:217`, inside `get_sutta`), so FR-2's return-type change cannot ripple into the other four tools.

## Summary

Approve with changes. All three Round-1 Criticals are resolved, and I could not find a new one: FR-4's self-exclusion is explicit and provably load-bearing on `dhp1-20`/`phantuananh`, FR-10 reaches all three previously-escaping residue locations with matching AC clauses, and AC-3's four replacement literals are byte-exact against a live run of the spec's own harness. The remaining Warnings are all narrow and cheap: one pinned string that does not exist in the target file so its clause passes unmodified (W1), one decisive AC composed entirely of negations behind a stderr-suppressing harness (W2), and one enforcement gap that lets the old key-count selector survive inside `extractText()` and defeat FR-1's whitespace case (W3). None blocks design; all three should be fixed before merge.
