# Review: requirements — Non-segmented translation guard cho `get_sutta`

**Date:** 2026-08-08
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [requirements.md](../requirements.md)
**Verdict:** Block

Upstream context read: `src/index.ts`, `specs/sutta-mcp-requirements.md`, `claudedocs/specs-review.md`, `CLAUDE.md`, `specs/non-segmented-translation-guard/clarifications.md`. No `.claude/rules/`, no `.claude/spec-templates/`, no `.claude/steering/` exist in this repo, so no template conformance check was possible.

## Critical Findings

### C1: FR-4's filter will list the requested translator back to the user — on the spec's own decisive case

- **Where:** requirements.md:78-85 (FR-4), requirements.md:164-174 (AC-5)
- **Evidence:** FR-4 specifies exactly one filter — *"**Bộ lọc: giữ `segmented === true` và `is_root !== true`**"* — and justifies it with *"Bỏ bộ lọc sẽ khiến danh sách gợi ý bao gồm luôn `minh_chau` — đúng dịch giả mà ta vừa báo là không lấy được. Gợi ý người dùng thử lại thứ ta vừa có bằng chứng trực tiếp là thất bại thì tệ hơn là không gợi ý gì."*
- **Issue:** That filter excludes `minh_chau` only because `minh_chau` happens to be `segmented=false`. `phantuananh` is `segmented=true` (requirements.md:28 states this, and it is verified live). So for AC-5 — `get_sutta({ uid: "dhp1-20", translator: "phantuananh" })` — the guard fires, states that no translation content was received for `phantuananh`, and then the alternatives list built by FR-4's filter includes `phantuananh` itself. The message contradicts itself on precisely the case class the spec calls *"Case class quyết định"*. The failure mode FR-4's own rationale names as *"tệ hơn là không gợi ý gì"* is reintroduced by the filter that was chosen to prevent it.
  The phrase *"các bản dịch **khác** của chính sutta đó"* (line 78) hints at excluding the requested translator, but the filter spec that follows is explicit and mentions no such exclusion; an implementer coding the stated filter produces the broken output. No acceptance criterion catches it: AC-2 checks only *"không liệt kê chính `minh_chau`"* and is bound to the mn10 call, and AC-5 has no clause about the alternatives list at all.
- **Recommendation:** Make the exclusion explicit and independent of `segmented` in FR-4: filter is `segmented === true && is_root !== true && author_uid !== <requested translator>`. Add a clause to AC-5: *"output không liệt kê `phantuananh` trong danh sách gợi ý"*. Restate AC-2's `minh_chau` clause as testing the explicit self-exclusion rather than a side effect of the `segmented` filter.

### C2: FR-10 leaves the falsified premise standing in `claudedocs/specs-review.md`, and AC-10 passes anyway

- **Where:** requirements.md:101-105 (FR-10), requirements.md:213-222 (AC-10)
- **Evidence:** FR-10 enumerates *"Bốn chỗ"* and item 1 targets only *"Dòng 193 — *"will fail or return empty `translation_text`"*"*. AC-10's only string assertion is *"không còn chuỗi `will fail or return empty`"*.
- **Issue:** The falsified causal claim lives in four places FR-10 does not list. Verified against the current file:
  - `claudedocs/specs-review.md:192` — `- The bilara API (\`/api/bilarasuttas/{uid}/{translator}\`) **only serves segmented texts**` — this *is* the exact hypothesis requirements.md:21 says was *"bác bỏ bằng phản ví dụ live"*. It sits on the line immediately above the one FR-10 does correct, so a literal implementation yields a document that denies its own next sentence.
  - `claudedocs/specs-review.md:195-197` — `It requires either: ... Waiting for SC to publish segmented Vietnamese translations` — the claim FR-9 explicitly kills in the other document (*"**Mệnh đề đó nay sai.**"*, requirements.md:95) survives untouched here.
  - `claudedocs/specs-review.md:218-221` — the verdict body: `"SC Vietnamese translations (e.g. minh_chau) are non-segmented. Bilara API cannot serve them. Requires either a fallback to the legacy text API or waiting for segmented Vietnamese editions."` FR-10 item 2 cites only *"dòng 214-216"*, so the recommendation block below it is out of the stated edit range.
  - `claudedocs/specs-review.md:294` — the Combined Verdict Summary row: `| F-04 | Gap | Vietnamese translator path broken | **UPSTREAM** | Document SC non-segmented constraint in roadmap |`. AC-10's Given is *"phần `## Finding: F-04`"* (lines 170-224), which scopes line 294 out. The verdict FR-10 calls *"sai/thiếu"* stays stamped in the document's summary table.
- **Recommendation:** Extend FR-10 to name lines 192, 195-197, 218-223 and 294 explicitly, with the same quoted-string precision used for line 193. Extend AC-10's Given to the whole file, and add string assertions: *"không còn chuỗi `only serves segmented texts`"*, *"không còn chuỗi `waiting for segmented`/`Waiting for SC`"*, and *"dòng F-04 trong Combined Verdict Summary không còn verdict `UPSTREAM`"*.

### C3: AC-3's byte-identity clause is unverifiable as written, and it is the only regression guard for FR-6

- **Where:** requirements.md:145-153 (AC-3), specifically line 153
- **Evidence:** *"**And** output khớp từng byte với output của cùng lời gọi trước khi thay đổi"*. The AC's own Given is *"`sujato` có bản dịch lấy được cho `mn10`"* and the preamble (line 118) states the verification vehicle is *"verify thủ công qua `npm run dev`"*.
- **Issue:** Nothing in the document instructs anyone to capture the pre-change output. By the time AC-3 is evaluated the change is applied and the baseline is gone; the criterion cannot fail loudly, it can only be skipped or asserted without evidence. Two further problems make it non-deterministic even with a baseline: `get_sutta` renders `formatCitation()` from a live `fetchSuttaplex` response (`src/index.ts:213`), so `Parallels: N`, `Difficulty:` and `translated_title` can drift upstream between capture and re-run; and byte-identity would then fail for reasons unrelated to the change. FR-6 is the requirement that protects the working path — leaving it with an unexecutable check means the working path is effectively unguarded.
- **Recommendation:** Either (a) add an explicit pre-change step to the AC — *"Trước khi sửa code: chạy lời gọi này, lưu output vào `/tmp/ac3-baseline.txt`; sau khi sửa: `diff` với output mới, phải rỗng"* — or (b) replace the byte clause with enumerated structural assertions that are stable under upstream drift: exact `Translator: Bhikkhu Sujato (sujato)` line present, first emitted segment equals the known first segment string, emitted segment count equals 50, and the truncation line matches the full literal from `src/index.ts:231`.

## Warnings

### W1: "Verify thủ công qua `npm run dev`" is not an executable procedure — `npm run dev` cannot invoke a tool

- **Where:** requirements.md:118, and every AC that depends on it
- **Evidence:** *"Không có test runner trong repo — verify thủ công qua `npm run dev` là cách duy nhất hiện có, và các tiêu chí dưới đây được viết ở dạng kiểm tra chuỗi để làm thủ công không mơ hồ."*
- **Issue:** `npm run dev` runs `tsx src/index.ts`, which connects a `StdioServerTransport` and blocks (`src/index.ts:429-433`). It produces no tool output on its own. Invoking `get_sutta` requires a client: Claude Desktop with an MCP config entry, MCP Inspector, or hand-written JSON-RPC frames piped to stdin. The document never says which, so the string assertions — which are otherwise well-formed — have no defined way to be produced. Two ACs are hit hardest: AC-1's *"response là content text bình thường, không có cờ lỗi"* requires seeing the raw response envelope (`isError`), which a chat client does not show verbatim; and AC-6's *"đọc schema tool `get_sutta` mà MCP công bố"* requires a `tools/list` round-trip.
- **Recommendation:** Name the harness in the AC preamble — e.g. `npx @modelcontextprotocol/inspector node dist/index.js` (no dependency added; satisfies NFR-1) or a documented `echo '<jsonrpc frame>' | npm run dev` invocation. For AC-6, if the harness is not available, state the fallback vehicle explicitly (read the `describe()` string at `src/index.ts:197-200`).

### W2: FR-2 has no acceptance criterion that can fail on its most likely violation

- **Where:** requirements.md:64 (FR-2), requirements.md:246
- **Evidence:** FR-2: *"Điều kiện phát hiện của guard phải chính là điều kiện đang quyết định chọn `translation_text` hay `root_text` trong `extractText()` — không được viết một điều kiện thứ hai song song."*
- **Issue:** FR-2 forbids two things: a `segmented`-based predicate, and a duplicated predicate. AC-5 catches the first — that is good design. Nothing catches the second. An implementer who writes `const hasTranslation = Object.keys(bilaraData?.translation_text ?? {}).length > 0;` inline in `get_sutta` while leaving `extractText()` untouched has produced two textually identical but independently maintained conditions; every AC passes, and the drift risk FR-2 exists to prevent is fully present. The document acknowledges this is the top risk (line 246: *"Rủi ro chính là FR-2"*) but hands the mitigation to `design.md` with no verifiable criterion attached.
- **Recommendation:** Add a code-inspection AC that is mechanically checkable: *"`grep -c 'translation_text' src/index.ts` trả về đúng N; chỉ một biểu thức duy nhất kiểm tra sự hiện diện của `translation_text`, và `get_sutta` tiêu thụ kết quả của biểu thức đó chứ không tự tính lại."* Alternatively pin the shape in FR-2 itself (e.g. `extractText()` returns `{ source: "translation" | "root", text: string }`) rather than deferring the whole thing to design.

### W3: FR-1's "rỗng" is undefined and contradicts FR-2's pin to `extractText()`

- **Where:** requirements.md:62 (FR-1), requirements.md:64 (FR-2), `src/index.ts:113-125`
- **Evidence:** FR-1: *"phát hiện khi response bilara không có key `translation_text`, hoặc có nhưng rỗng"*. FR-2 requires the guard predicate to be *"chính là điều kiện đang quyết định chọn `translation_text` hay `root_text` trong `extractText()`"* — which is `Object.keys(translation).length > 0` (`src/index.ts:116`).
- **Issue:** These are different predicates for one input class. `translation_text` present with keys whose values are all empty or whitespace passes `extractText()`'s key-count test but yields zero lines after the filter at `src/index.ts:120`. Under FR-2 the guard does not fire; under FR-1 ("có nhưng rỗng") it should. The result would be a header asserting `Translator: <name>` above zero segments and `[Hết văn bản — 0 đoạn]`. Whether this input exists live is unverified, but the spec must not be ambiguous about which predicate wins.
- **Recommendation:** Define "rỗng" once, in FR-1, as *"không sinh ra đoạn văn bản không rỗng nào sau khi lọc"* (post-filter line count === 0), and have FR-2 pin the guard to that same post-filter result — which is also the formulation that makes `extractText()` naturally return both the source and the lines.

### W4: FR-4's empty-alternatives branch has no AC, and the wording carried from `clarifications.md` would violate FR-3

- **Where:** requirements.md:85 (FR-4), requirements.md:240 (UNVERIFIED), clarifications.md:62
- **Evidence:** FR-4: *"Nếu không có bản nào qua bộ lọc, in một dòng nói rõ là không có, thay vì danh sách rỗng."* The Assumptions section states the decision not to cover it: *"chưa tìm được UID live để minh chứng. Default: FR-4 vẫn phải xử lý nhánh này; không viết AC gắn UID cụ thể cho nó."* `clarifications.md:62` proposes the concrete string: *"in `(không có bản dịch segmented nào)`"*.
- **Issue:** This is the one code path with zero acceptance coverage, and it is also the path where FR-3 item 4's absolute ban is most likely to be broken: *"chuỗi `segmented` không được xuất hiện ở bất kỳ đâu trong output của nhánh guard"*. The obvious implementation is the string already drafted in `clarifications.md`, which contains `segmented`. AC-1's `segmented`-absence check runs against `mn10`/`minh_chau`, whose alternatives list is non-empty, so it never exercises this branch. `clarifications.md:7` says no downstream phase reads that file, but the wording is the natural one an implementer would reach for regardless.
- **Recommendation:** Pin the empty-branch wording in FR-4 (a phrasing with no occurrence of `segmented`), and add a UID-free AC: *"Với mọi nhánh guard, kể cả nhánh danh sách rỗng, output không chứa chuỗi `segmented` — kiểm tra bằng đọc code của nhánh."*

### W5: NFR-6 contradicts AC-8 and forbids the natural implementation shape

- **Where:** requirements.md:114 (NFR-6), requirements.md:199 (AC-8)
- **Evidence:** NFR-6: *"diff trong `src/index.ts` chỉ được chạm vùng `extractText()` và tool `get_sutta`."* AC-8: *"trong `src/index.ts` không có hunk nào chạm `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX` hay `DIVISIONS`."*
- **Issue:** The two do not describe the same constraint. AC-8 permits a new module-level function next to `formatCitation()`; NFR-6's letter forbids it. FR-3 specifies a four-part message plus FR-4's filtered list — inlining all of it inside the `get_sutta` handler to satisfy NFR-6 produces a worse diff than a `formatUnavailable(suttaplex, translator)` helper. The requirement as written pushes the implementer toward the worse shape, and AC-8 will not detect either choice.
- **Recommendation:** Reword NFR-6 to match what AC-8 actually enforces: *"không đụng bốn tool còn lại, `TOPIC_INDEX`, `DIVISIONS`; thay đổi giới hạn trong `extractText()`, `get_sutta`, và tối đa một helper mới ở module scope."*

### W6: FR-10 edits a file that is gitignored and untracked

- **Where:** requirements.md:101-105 (FR-10), requirements.md:213-222 (AC-10)
- **Evidence:** `git check-ignore -v claudedocs/specs-review.md` → `.gitignore:4:claudedocs/`. `git ls-files claudedocs/` → empty. `CLAUDE.md` (global) directs Claude-generated reports to `claudedocs/`, and commit `84d6706` added that directory to `.gitignore`.
- **Issue:** FR-10 is four non-trivial documentation edits (plus a fifth and sixth per C2) to a file no one else will ever receive. The correction is local-machine-only; a fresh clone still contains no F-04 at all. AC-8's `git diff -- src/index.ts package.json` will not show it, AC-10 can only be checked by the person who made the edit, and the review that FR-10 corrects is not part of the project record. The spec does not acknowledge this anywhere. It is also the largest single block of work in the spec measured by edit surface, spent on a non-versioned artifact — a scope-discipline question, given the dispatch constraint of minimal change.
- **Recommendation:** Either state explicitly in FR-10 that the file is intentionally local-only and the correction is for the author's own working copy, or move the corrected F-04 statement to a versioned location (e.g. an "API Validation" note in `specs/sutta-mcp-requirements.md`, which `claudedocs/specs-review.md:283` already recommends) and reduce FR-10 to the local file's minimum. Decide before design; do not leave it implicit.

### W7: All live evidence was gathered at `?language=vi`, but `get_sutta` fetches suttaplex at `?language=en`

- **Where:** requirements.md:30, requirements.md:167 (AC-5 Given), `src/index.ts:209-211`, `src/index.ts:10-11`
- **Evidence:** The counter-example is documented as *"`/api/suttaplex/dhp1-20?language=vi` liệt kê `phantuananh` với `segmented=true`"* and AC-5's Given restates it. The code path under change calls `fetchSuttaplex(uid)` with the default `language = "en"` — i.e. `/api/suttaplex/dhp1-20?language=en`.
- **Issue:** FR-3 item 2 (full translator name), FR-4 (the entire alternatives list and its `segmented` filter), AC-2 and AC-5 all read `suttaplex.translations` from the **en** response, while every piece of recorded evidence about `translations[].segmented` comes from the **vi** response. Whether `language` filters or reorders `translations` is nowhere stated — it is not in VERIFIED and not in UNVERIFIED. If the en response omits or differs on `vi` entries, FR-4 degrades silently for exactly the Vietnamese users named as primary stakeholders (line 56). Partial counter-evidence exists: the observed buggy header *"`Translator: Thích Minh Châu (minh_chau)`"* (line 15) proves the en response for `mn10` does contain `minh_chau` with an `author` field, so at least for `mn10` the list is not language-filtered. That does not generalize to `dhp1-20`/`phantuananh`.
- **Recommendation:** Verify `/api/suttaplex/dhp1-20?language=en` and record the result under VERIFIED (or under UNVERIFIED with a stated default) before design. If translations turn out to be language-dependent, FR-4 needs to say which language parameter the guard path uses.

### W8: AC-3's truncation assertion does not match the string the code emits

- **Where:** requirements.md:152, `src/index.ts:231`
- **Evidence:** AC-3: *"**And** output kết bằng `[... văn bản bị cắt sau 50 đoạn.`"*. The code emits `` `[... văn bản bị cắt sau ${max_segments} đoạn. Tổng: ${lines.length} đoạn. Tăng max_segments để xem thêm.]` ``.
- **Issue:** The quoted fragment is a prefix of the final line, not the ending. Anyone executing the criterion literally ("ends with") gets a false failure; anyone who notices and silently reinterprets it as "contains" has weakened a criterion in an artifact whose stated purpose (line 118) is *"để làm thủ công không mơ hồ"*.
- **Recommendation:** State it as containment of the full literal, with the concrete total for `mn10`/`sujato` (233 segments verified live): *"output chứa `[... văn bản bị cắt sau 50 đoạn. Tổng: 233 đoạn. Tăng max_segments để xem thêm.]`"*.

### W9: AC-4 and AC-5 abandon the string-check method exactly where it matters most

- **Where:** requirements.md:160 (AC-4), requirements.md:173 (AC-5)
- **Evidence:** AC-4: *"**Then** output không chứa đoạn Pali nào của `thag1.1`"*. AC-5: *"**And** output không chứa bất kỳ đoạn nào của `root_text` Pali cho `dhp1-20`"*.
- **Issue:** These are the ACs enforcing the spec's central invariant — no Pali emitted — and they are the two that give no string to check, unlike AC-1 which names `Evaṁ me sutaṁ`. "Contains no Pali segment" is not something a person can verify without fetching and diffing 24 (`thag1.1`) or an entire vagga's worth (`dhp1-20`) of root segments, which is exactly the ambiguity line 118 claims to have eliminated.
- **Recommendation:** Name one concrete anchor string per AC, taken from the verified `root_text` of each UID (both are already fetched, so the strings are available at spec-writing time), the way AC-1 does.

## Suggestions

### S1: Line 120 misstates AC-3's role

- **Where:** requirements.md:120
- **Evidence:** *"Ba case class phải cùng đi qua một nhánh guard: `segmented=false` (AC-1), `segmented=true` nhưng không được phục vụ (AC-5), và đường bình thường không đổi (AC-3)."*
- **Issue:** AC-3 is the path that must **not** enter the guard. The sentence asserts the opposite of FR-6. Two case classes go through the guard; the third is the control.
- **Recommendation:** *"Hai case class phải cùng đi qua một nhánh guard (AC-1, AC-5); AC-3 là đối chứng — đường bình thường không được chạm guard."*

### S2: Two NFRs are unmeasurable or uncovered

- **Where:** requirements.md:111 (NFR-3), requirements.md:113 (NFR-5), requirements.md:185-191 (AC-7)
- **Evidence:** NFR-3 requires *"không lỗi và không warning mới"*, but AC-7 only asserts *"tsc thoát với mã 0, không lỗi"*. `tsc` has no warning level, so "no new warnings" has no observable meaning here. NFR-5 (*"Mọi string hướng người dùng viết bằng tiếng Việt"*) maps to no AC at all.
- **Recommendation:** Drop the warning clause from NFR-3, and add a one-line clause to AC-1 asserting the guard message is Vietnamese, so NFR-5 has coverage.

### S3: AC-1's Pali check rests on a single anchor at the very start of the text

- **Where:** requirements.md:127
- **Evidence:** *"**Then** output **không** chứa chuỗi `Evaṁ me sutaṁ`"*
- **Issue:** A partially-fixed implementation that suppresses the first segment but still emits later ones passes. `mn10`'s root has 235 segments.
- **Recommendation:** Add a second anchor drawn from the middle of `mn10`'s `root_text`.

### S4: AC-9 requires committing an unanswered investigation direction into the top-level spec

- **Where:** requirements.md:211 (AC-9), requirements.md:250 (Q1)
- **Evidence:** AC-9: *"hướng đi tiếp được nêu là tìm đường mà website dùng để render `dhp1-20/vi/phantuananh`"*, while Q1 is open: *"Website SC render `dhp1-20/vi/phantuananh` bằng đường nào, nếu không phải `/api/bilarasuttas/`?"*
- **Issue:** The spec correctly forbids stating an unknown cause in user-facing output (FR-3 item 4), then requires writing a direction based on that same unknown into the roadmap. It is defensible — a direction is not a cause — but the roadmap text should be marked as an open investigation, not a plan, or it becomes the next falsified premise.
- **Recommendation:** Have FR-9 specify the roadmap wording as an explicit open question with the evidence attached, rather than as a settled next step.

## Strengths

- Every code and document line reference in the artifact checks out against the current files: `src/index.ts:112-126`, `192-237`, `197-200`, `208-216`, `163-172`, `250-254`, `289-293`; `specs/sutta-mcp-requirements.md:291`; `claudedocs/specs-review.md:193`, `201`, `203-207`, `214-216`. No stale pointers in the FRs I checked.
- The falsified `segmented` premise is genuinely gone from requirements.md as an *explanation*: FR-2 bans it as a predicate, FR-3 item 4 bans the string from output, FR-7 bans it from the parameter description, and FR-4 re-admits it only as an exclusion filter with a stated necessary-not-sufficient justification. The residue that survives is in the downstream document (C2), not here.
- AC-5 is the right acceptance criterion: it is the one case where a `segmented`-based predicate and a response-based predicate diverge, so it mechanically enforces FR-2's most important clause instead of restating it.
- The rejected alternatives (root-text-with-relabelled-header, auto-fallback to `sujato`) are argued from the actual consumer — an LLM that will quote whatever Pali lands in its context — rather than from abstract principle, and both are recorded in Out of Scope.

## Summary

Block. Three issues would produce a wrong or unverifiable implementation: FR-4's filter suggests `phantuananh` back to a user who was just told `phantuananh` returned nothing, on the very case class the spec calls decisive (C1); FR-10 corrects one line of `claudedocs/specs-review.md` while the falsified premise stays intact on the line above it, in the requirements paragraph below it, in the verdict block, and in the summary table, with AC-10 passing regardless (C2); and AC-3's byte-identity clause — the only regression guard on the working path — cannot be executed because no baseline capture is ever instructed (C3). The warnings that matter most for the design phase are W1 (no stated harness can actually invoke a tool, so *every* AC currently lacks a means of execution) and W2 (FR-2's duplicated-predicate failure mode has no criterion that can fail on it).
