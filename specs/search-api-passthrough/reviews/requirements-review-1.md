# Requirements review 1: search-api-passthrough

**Artifact:** `specs/search-api-passthrough/requirements.md` (Draft, 2026-10-23)
**Upstream checked:** `clarifications.md`, `specs/dynamic-search/requirements.md`, `specs/search-unit-tests/requirements.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`, AGENTS.md, template `requirements.md.tmpl`
**Reviewed:** 2026-10-23
**Scope:** first review of the requirements artifact. The user decisions dated 2026-10-23 and the answers to C1–C11 are not reviewed.

## How premises were checked

- **Upstream code.** Read `server/src/search/view.py` (`InstantSearch.get`) and `server/src/search/instant_search.py` (`instant_search_query`, `process_search_results`, `try_to_fetch_suttaplex`, `calculate_total`, `remove_hits_if_uid_in_suttaplexs`) on `main` (`a9aeaa8`). `gh api .../compare/c755a43...main` shows one commit since the cited `c755a43`, and it touches only `client/` files. The cited server code is therefore current.
- **Live API.** Sent about 20 GET requests to `https://suttacentral.net/api/search/instant` on 2026-10-23. Every run was valid: no fetch failures, no timeouts. The bodies were analysed in memory and not stored.
- **SDK.** Built the FR-1 schema with the repo's `@modelcontextprotocol/sdk` 1.29.0 and zod 3.25.76, using an in-memory client in the scratchpad (since deleted). Read `tools/list` and sent the AC-9 inputs.
- **Repo.** Checked every §Hiện trạng count and line reference with `grep`/`wc`/`awk` at `d972fa6`.

## Critical Findings

None.

## Warnings

### W1: FR-14 and §Hình dạng API state two paging facts that live responses contradict

There are two problems.

**1. `suttaplex` is paged for `title:` queries.**
- Line 97 says `suttaplex` "trả nguyên mảng, không phân trang".
- FR-14 (line 200) requires `describe()` to say "`suttaplex` là khớp tiêu đề và không phân trang".
- Upstream `try_to_fetch_suttaplex()` builds `suttaplex` from the current page's `hits` when the query starts with `title:` (`if original_query.startswith(constant.CMD_TITLE): suttaplexs.extend(fetch_suttaplexs(db, lang, hits))`). It returns a single uid match when the query is a uid (`fetch_suttaplex`). Only otherwise does it match by name.
- Measured: `title:mindfulness`/`en` gives 7 `suttaplex` (`an1.575-615`, `an6.20`, …), 0 hits, `total` 38. Adding `offset=10` gives 9 different ones (`an8.74`, `an8.81`, `dn22`, …), `total` 36. `mn10`/`en` gives exactly `suttaplex` `["mn10"]`.
- §Assumptions line 475 says filters such as `title:` are passed through, so this case is in scope.
- Effect: with the FR-14 wording, Claude would read page 1 of a `title:` search and never ask for page 2.

**2. Fewer `hits` than `limit` does not mean the last page.**
- The API removes content hits whose `uid` is already in `suttaplex` (`remove_hits_if_uid_in_suttaplexs`, called before `calculate_total`).
- Measured, `mindfulness`/`en`: `limit` 10 returns 8 hits with `total` 1461. `offset=10` returns 5 hits with `total` 1462.
- The spec removes the old "suy luận trang sau" logic, so the caller must now judge paging alone. FR-14 says nothing about this.

**Fix.**
- Correct line 97 and FR-14: `suttaplex` is not paged for ordinary queries, but it follows `limit`/`offset` for `title:`, and it is a single uid match when the query is a uid.
- Add to FR-14 that the API drops hits already shown in `suttaplex`. A page can therefore have fewer than `limit` hits while later pages still exist. Paging continues against `total`.
- Add one literal for each point to AC-11.

### W2: FR-2 is checked only on the URL builder, not on the URL actually fetched

FR-2 requires that the request contains only the parameters the caller passed. FR-5 and FR-6 print "URL request đầy đủ đã gửi". Here is how each is checked:
- FR-17 (line 225) bans importing `src/index.ts` and stubbing `fetch`. So the FR-2 and FR-3 cases (FR-17 table, AC-8) can only test a pure URL builder in `src/search.ts`. FR-18 (b)–(d) mutate only "bản sao `src/search.ts`". The requirements therefore force the builder into `src/search.ts`, but never say so.
- No FR or AC requires `src/index.ts` to pass that builder's output to `fetch`, or to print the same value in the source line.
- Example drift: the handler appends `&limit=10` to the builder's result before calling `fetch`, but prints the builder's string. All of AC-1, AC-8, AC-13 and FR-18(b) still pass. AC-1 reads only the source line. Its counts (21 `suttaplex`, 0 hits, `total` 21) do not change with `limit=10`.
- NFR-5 line 306 ("đúng một lời gọi `fetch` tới `/api/search/instant`, kiểm bằng đọc code") is the only check on `src/index.ts`, and it does not cover this.

**Fix.**
- State in FR-2 (or a new FR) that one exported pure function in `src/search.ts` builds the request URL.
- Require `src/index.ts` to call `fetch` with exactly that function's return value and to pass the same value to the source line.
- Add the matching code-reading clause to AC-14.

### W3: FR-10 (`fuzzy_dictionary`) has no test

- FR-10 is not a row in the FR-17 table (lines 230–240), and no AC lists it under "Maps to".
- §Assumptions line 473 says "FR-10 chỉ được test bằng input literal", but nothing requires that test.
- The non-empty case has never been seen live. Measured `nibana` + `matchpartial=true` returns `fuzzy_dictionary: []`. So a literal unit test is the only way to check it.

**Fix.** Add an FR-10 row to the FR-17 table. Use a literal non-empty array with two elements: the output must contain each element as one-line JSON, in order. An empty array must print only the heading with 0.

### W4: The file-scope check will fail when the orchestrator updates `specs/INDEX.md`

- NFR-3 (lines 281–287) does not list `specs/INDEX.md`.
- Out of Scope line 493 rules out "Sửa `specs/INDEX.md`".
- AC-14 requires every file in `git diff d972fa6 --stat` to belong to NFR-3.
- But the workflow says "Only the orchestrator writes … `INDEX.md`" and refreshes it as a navigation summary (`workflow.md` lines 13–14, 67). Every earlier spec commit touched it (`git log -- specs/INDEX.md`: `78262b3`, `cb3c436`, `962138a`, `17d4756`).
- So AC-14 fails as soon as this spec gets its INDEX row, even with no defect in the work (anti-pattern 18).

**Fix.**
- Add `specs/INDEX.md` to NFR-3, limited to the row for this spec, which the orchestrator writes.
- Reword Out of Scope to "không sửa dòng INDEX hay artifact của `dynamic-search`/`search-unit-tests`".

### W5: Open Questions and Assumptions still treat answered clarifications as open

- `clarifications.md` line 5: "đã giải quyết 2026-10-23. Người dùng chọn đúng default cho C1, C2, C5". C3, C4 and C6–C11 use their defaults.
- The artifact still says the following:
  - line 22: "FR dưới đây viết theo **default**";
  - line 471: "UNVERIFIED … Default của C1–C11 … Nếu người dùng chọn khác, các FR/AC đó đổi theo trước pha design";
  - line 481: "**Q1 (chặn design):** C1, C2, C5".
- As written, the artifact says design is blocked.

**Fix.**
- Record the answers and their date.
- Move "Default của C1–C11" to a decided or VERIFIED entry.
- Close Q1 and Q2.

## Suggestions

- **S1 (line 97; `clarifications.md` C8 line 103):** "body 140,685 B, trong đó `suttaplex` 141 KB" makes a part larger than the whole. Re-serialising `suttaplex` of `mindfulness`/`en` with Python's default separators and `ensure_ascii=False` gives 132,394 B. Without `translations` it is 18,131 B. Name the serialisation used, or use the smaller figure. The 140,685 B body total is correct.
- **S2 (FR-1 line 117, "không tham số nào khác"):** Measured with SDK 1.29.0: `{"query":"m","topic":"x"}` is accepted and `topic` is silently dropped. This happens even though `inputSchema` advertises `"additionalProperties":false`. Only `{"topic":"x"}` without `query` is rejected, which is what AC-9 tests. Add one sentence so design does not promise that legacy `topic` is always rejected.
- **S3 (FR-4 line 147):** `grep -c -E '…' src/*.ts` prints one `file:N` line per file, not a single `0`. Write "mỗi file cho 0" or `cat src/*.ts | grep -c -E '…'` = 0.
- **S4 (AC-2 line 335):** The source line holds the encoded URL (`selectedLanguages=%5B%22vi%22%2C%22pli%22%5D`). Say that the check decodes it (for example `new URL(…).searchParams.get("selectedLanguages") === '["vi","pli"]'`), as AC-4 does for `foo:bar`.
- **S5 (NFR-7 line 311):** This review measured 4.4–10.5 s per request (`anatta`/`en` 10.5 s, `vô ngã`/`vi` 6.7 s). The spec says 1.5–5.4 s. NFR-7 is only informational. Either widen the range or drop the numbers. If the harness keeps the fixed `sleep 20` from `specs/dynamic-search/design.md`, `list authors` at 18 s leaves little margin. That input is used only in a unit test (AC-7), so this matters only for any later live run.

## Candidates considered and discarded

- `format=json` output of about 140 KB, `selectedLanguages` as an array sent as a JSON string, the source line as a separate item 2, and dropping `match`/`page`/Vietnamese mapping: settled user decisions, not open for review.
- Printing `difficulty` raw (live values `2`, `3`, `null`) instead of the old `DIFFICULTY_NAMES` labels: follows C8. The raw integer is readable and adds no home-made logic.
- FR-8 does not print `heading`, `content`, `author_short` or `param_lang`: this selects fields, it does not drop elements. Live `list authors` has `content: "content"`, which carries no information.
- FR-12 makes unparseable 2xx bodies an error only for `text`. For `json` they pass through verbatim under FR-5. This is consistent, so not a finding.
- `limit=0` returns `total` 1462 against 1461 for the default (an upstream `calculate_total` quirk). The spec does not pin this `total`, so it has no effect.

## Strengths

- **Every pinned API literal matched live data:**
  - AC-1: 21 `suttaplex`, 0 hits, `total` 21, `sn22.59` "Năm Vị (Vô ngã tưởng)".
  - AC-2: 10 hits, first `/an1.378-393/vi/minh_chau` by "Thích Minh Châu", `total` 185.
  - AC-3: exact hit order (dictionary `/define/anatta`; four articles; `thi-ap4`, `an3.136`, `an7.18`, `an7.20`, `an10.60`) and `suttaplex[0]` `an6.100`.
  - AC-5: `unknown_filter`, `Unknown filter: "foo:"`, 3 suggestions, the first starting `Supported filters are`, followed by a full-width colon.
  - AC-6: HTTP 200 with a body of exactly the 4 bytes `null`, with no trailing newline, so FR-5 byte-identity and AC-6 "đúng `null`" agree.
  - The 422 body is a JSON string. `offset=-5` and `limit=abc` return 500 `{"message": "Internal Server Error"}`. `selectedLanguages=notjson` returns 200 with `total` 1461.
  - Without `language`, `mindfulness` gives 3 `suttaplex` (`t1670b2.12`), 7 hits, `total` 1459.
  - `vo nga`/`vi` matches the same 21 suttas as `vô ngã`.
  - `list authors` gives 72 entries with exactly the keys `uid`(""), `author`, `author_uid`, `author_short`, `content`, `param_lang`. The AC-7 literal is a true subset of a real entry.
- **Every upstream reading checked out:** parameter names and defaults, `+` → space, `strip()`, the 600 s cache, the `null` return path (no `return` outside `if restrict != 'dictionaries'`), and the `matchpartial == 'true'` gate.
- **The SDK claims hold:** the FR-1 schema produces `limit`/`offset` `{"type":"integer","minimum":0}`, `selectedLanguages` `"type":"array"`, `required: ["query"]`, and `default` only on `format`. All seven AC-9 inputs return `isError: true` with the exact `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:` prefix.
- **§Hiện trạng is exact:** counts 3/3/0/1/4 on `src/index.ts` and 0 on `src/search.ts`, 212 lines, 9 fixtures totalling 52,333 B, 16 cases, handler `:108-147`, `fetchSearch` `:33-39`, `formatCitation` at `:181`/`:260`, the AGENTS.md and master spec line references, and `dynamic-search` `:45`/`:79`/`:365`.
- **No home-made logic comes back.** FR-3, FR-4 and FR-6 rule out normalisation, filtering, dedup and reordering. The only remaining fallbacks are presentational: `acronym`→`uid`, `translated_title`→`original_title`, `name`→`root_name`.
- **Offline tests and the baseline are handled.** The AC-12 baseline-capture step, the FR-18 mutations, and the literal-input tests for `highlight` follow the `search-unit-tests` constraints.

## Summary

The API premises are accurate except for one: `suttaplex` paging and the meaning of a short `hits` page under `title:` queries (W1). That error would go straight into the tool description that Claude relies on to page. The other warnings are verification gaps:
- the fetched URL is not tied to the tested builder (W2);
- FR-10 has no test (W3);
- AC-14 will fail when the orchestrator updates `specs/INDEX.md` (W4);
- answered clarifications are still marked as open questions (W5).

No finding blocks the move to design once the warnings are fixed.

**Verdict:** Approve with changes
