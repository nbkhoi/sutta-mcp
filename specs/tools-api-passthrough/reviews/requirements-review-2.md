# Requirements review 2: tools-api-passthrough

**Artifact:** `specs/tools-api-passthrough/requirements.md` (Draft, revised after review 1)
**Upstream checked:** `clarifications.md`, `reviews/requirements-review-1.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`, `package.json`
**Reviewed:** 2026-10-24
**Scope:** re-review (see §Re-review boundary). The five stakeholder decisions and the user's answers to C1, C3 and C4 are fixed and are not reviewed. The orchestrator's W4 resolution (one size-warning sentence appended to `search_instant`'s tool-level description) is taken as given. This review checks only that the text applies it precisely.

## How premises were checked

- **Repo at `7dc2299`.** The working tree is clean apart from the untracked spec directory.
  - `grep -n -F 'server.tool(' src/index.ts` gives `:100`, `:160`, `:248`, `:288`, `:415`, matching line 86.
  - The `search_topic` description is at `src/index.ts:102`. It does not contain the string `search_topic`. The only mention is the name literal at `:101`. No parameter `describe()` in `:103-159` mentions it either.
  - No test name in `test/*.ts` contains `tools-api-passthrough`. The existing case names are `FR-2:`, `FR-2a:`, `FR-3:`, `FR-5:` … `FR-12:`.
  - The master-spec AC-14 grep matches lines 143, 168, 178, 180, 186, 219, 263, 267, 284, 296, 298, 300, 302, 351, 360, 361 and 367. Each line was assigned to an FR-20 bullet; see W2.
- **Live API.** 13 GET requests were sent to `https://suttacentral.net/api` on 2026-10-24. All were valid, with no transport failures and no reruns. Bodies went into a fresh `mktemp -d` directory, which was deleted afterwards.
  - **Search:** `search/instant?query=mindfulness&language=en` is **140,685 B**. It has 32 `suttaplex` entries, 8 hits and `total` 1461. `suttaplex` accounts for 117,328 B, and its `translations` for 100,276 B (71%), so "phần lớn là `translations` của `suttaplex`" holds.
    - With `limit=1` (1 hit) and with `offset=10` (5 hits), the same 32 `suttaplex` uids come back in the same order. So `limit`/`offset` page only `hits` for a plain query.
    - `title:mindfulness` gives 7 `suttaplex` entries (39,739 B). With `limit=1` it gives 1 entry (6,526 B). So `title:` does narrow `suttaplex`, as FR-6 says.
  - **`/menu`:** 464 nodes. All 464 have a `children` key and 461 have `children: []`. The non-empty ones are `abhidhamma` (4 children), `sutta` (6 children: `long, middle, linked, numbered, minor, other-group`) and `vinaya` (13 children, the last being `other-vi`). `g2dhp1` and `lzh-mi-bu-pm-2-as1` exist with `[]`. None of the 23 child nodes has a `children` key, and all 23 have `has_children`. The same holds for `/menu/long` (`dn, da, da-ot`) and `/menu/sutta`.
  - **`/suttaplex/mn`:** 171 elements, 1,343,704 B, with no `children` key. It starts `mn`, `mn-mulapannasa`, `mn-mulapariyayavagga`. Type runs are `branch×3 leaf×10 branch×1 leaf×10 branch×1 leaf×10 …`, matching line 126 and clarifications C1.
  - **Division uids on the other endpoints:** `/parallels/mn` → `{}` (2 B), `/parallels/dn` → `{}` (2 B), `/bilarasuttas/dn/sujato` → `{"msg": "Not Found"}` (20 B). See W1.
  - **Latency:** the maximum this round was 7.60 s (`search/instant` for `mindfulness`). `bilarasuttas/dn/sujato` took 4.09 s. See S3.

## Critical Findings

None.

## Warnings

### W1: FR-14's "Thu hẹp" lines for `get_parallels` and `get_bilarasuttas` rest on an unmeasured premise that is false

FR-14 requires each new tool's `describe()` to give "cách thu hẹp bằng tham số của API, theo dòng 'Thu hẹp' của từng tool" (line 244). Two of those lines imply that a division uid produces large output:

- line 259 (`get_parallels`): "**Thu hẹp:** truyền uid của một sutta, không phải uid của division."
- line 249 (`get_bilarasuttas`): "truyền uid của một sutta hoặc một range (ví dụ `dhp1-20`), không phải uid của bộ".

Measured, a division uid on these endpoints does not give large output. It gives the endpoint's "not found" shape:
- `/api/parallels/mn` and `/api/parallels/dn` both return `{}`;
- `/api/bilarasuttas/dn/sujato` returns `{"msg": "Not Found"}`.

On both endpoints, output size depends on the sutta itself, for example `parallels/dn22` at 77,799 B and `bilarasuttas/dn22/sujato` at 158,090 B. Neither endpoint has an API parameter that reduces it. The `get_suttaplex` and `get_menu` lines are correct, and they are the two examples the user gave in C3 (clarifications line 55). The other two lines were extrapolated from them without measurement.

If a `describe()` is written from these lines, it will tell Claude that `get_parallels {"uid":"mn"}` returns a large result, when SC returns an empty object. This spec exists to stop the tools from misdescribing what SC returns. AC-11 (line 498) checks only the `get_menu` and `get_suttaplex` narrowing hints, so nothing would catch the error. Review 1 did not measure this premise either.

**Fix:** reword lines 249 and 259 to match the measurements. For example:
- `get_parallels`: "uid của division trả `{}` (đo `parallels/mn`); không có tham số nào thu hẹp, kích thước theo sutta (ví dụ `dn22`: 27 entry, 77,799 B)".
- `get_bilarasuttas`: "uid của bộ (ví dụ `dn`) trả `{"msg": "Not Found"}`; không có tham số thu hẹp, kinh dài như `dn22` vẫn cho 158 KB".

Then adjust the FR-14 general bullet (line 244) so it does not promise an API narrowing parameter for every tool.

### W2: Review 1's W3 is only partly resolved. FR-20 names one of the two `search_topic` mentions on roadmap line `:300`

FR-20 now covers roadmap item 3 (line 323), but only the sentence "Claude đã ghép được `search_topic` với `get_parallels`". The same master-spec line `:300` has a second, earlier mention: "trái chủ trương **`search_topic`** khớp đúng API". An implementer who edits only the named sentence leaves `:300` matching the AC-14 grep. AC-14 (line 531) then requires that match to be "ngữ cảnh lịch sử, nói rõ là đã bị thay thế". This clause does not say that, so AC-14 fails, or passes only if the reader stretches it.

All other AC-14 matches in the master spec map to an FR-20 bullet:
- Tool 1–5: `:143-219`;
- Luồng mẫu: `:263`, `:267`;
- Constraints: `:284`;
- roadmap items 1, 2, 5 and 7: `:296`, `:298`, `:302`, `:351`;
- issue table and priority list: `:360`, `:361`, `:367`.

**Fix:** in line 323, say "mọi chỗ nhắc `search_topic` ở mục 3 (`:300`, hai chỗ) đổi theo tên mới".

## Suggestions

### S1: Make AC-10's description rule fully mechanical

The rule is precise enough to test, with three loose edges:

- **The "trừ chỗ nhắc tên tool" exemption is vacuous.** The baseline description (`src/index.ts:102`) contains no tool name, so the exemption only adds a way to read the rule loosely. Drop it from FR-6 (line 200) and AC-10 (line 489), or state that the baseline description has no tool name. The check then becomes `desc_new === desc_base + " " + S`.
- **The separator is not pinned.** It could be a space or a newline. Pin it.
- **AC-10 does not check all of FR-6's required content.** FR-6 requires S to contain the `140,685 B` example and "truy vấn cụ thể hơn". AC-10 checks only "output lớn", the `limit`/`offset` point and `title:`. The baseline already contains `title:` and `limit`/`offset`, so these checks must apply to S alone, as the wording "Câu đó" already implies. Add `140,685` as a literal anchor on S, which gives the check one exact string.

AC-10 already captures the baseline before any code change (line 384), and the `inputSchema` byte-identity clause is exact. Since `inputSchema` carries the parameter `describe()` texts, FR-6's separate parameter-description clause (line 199) is implied by it.

### S2: Keep the locked-decision block as recorded

Line 25 sits inside the "Quyết định stakeholder đã chốt … không mở lại" block. It now reads "Chỉ đổi tên và mô tả; logic giữ nguyên. Mô tả chỉ thêm đúng một câu cảnh báo output lớn theo C3 (FR-6)." Clarifications records decision 2 only as "đổi `search_topic` thành `search_instant`" (clarifications line 10). The content is correct, since it is the orchestrator's W4 resolution. However, it is a consequence of C3 and should not be attributed to decision 2. Moving the sentence to the C3 bullet (line 36) keeps the decision text as the user gave it.

### S3: Latency range

NFR-6 and line 135 give "0.26–4.09 s, quan sát đến nay". This round measured 7.60 s for `search/instant` (`mindfulness`/`en`). The range is hedged and the 30 s harness wait is unaffected. Widening it, or noting that the search endpoint was slower, would keep the row accurate.

## Re-review boundary

Admissible candidates are review 1's findings W1–W4 and S1–S4, the text changed to fix them, the orchestrator's W4 change (FR-6, AC-10, AC-11, decision 2 at line 25, clarifications C3/C11), and premises that the fixes depend on.

| Review 1 item | Status | Evidence |
|---|---|---|
| W1 FR-prefix collision | **Resolved** | FR-17 line 283 requires the prefix `tools-api-passthrough FR-{n}:`. AC-12 line 505 checks that exact string, and the `:` stops `FR-3` from matching `FR-30`. No test at `7dc2299` contains `tools-api-passthrough`, so the check gives 0 cases on the unchanged repo and cannot pass there. If a design nests cases under a `describe("tools-api-passthrough")` suite, TAP names lose the prefix. That gives a false fail, not a false pass, and FR-17 already requires the case names themselves to carry the prefix. |
| W2 shape rows | **Resolved** | Menu: line 130 and C8 line 137 match the counts 464/461/4/6/13. Suttaplex: line 126 and C1 line 28 match the measured pre-order runs. Latency was widened to 4.09 s (line 135, NFR-6). |
| W3 roadmap 1 and 3 | **Partly resolved** | Range `:296-351` (line 14) and item 1 (line 322) are fixed. Item 3 has a residue; see W2. |
| W4 C3 across all tools | **Resolved** (orchestrator's resolution) | FR-6 lines 200-203 and FR-14 line 237 split the work cleanly. AC-10 line 489 and AC-11 line 498 together check all five tools. Out of Scope line 573 and clarifications C3/C11 are consistent. The 140,685 B literal and the two paging claims reproduce. Precision notes are in S1. |
| S1 FR-9 and Constraints scope | Applied | FR-9 line 216 and FR-20 lines 318-319 (Constraints sentence and Attribution `:290`). |
| S2 line references | Applied | Line 86 cites `server.tool(` lines that match HEAD. |
| S3 Parallel-types column | Applied | FR-20 line 330, Out of Scope line 575, AC-14 line 530. |
| S4 mutant (d) input | Applied | FR-17 FR-10 row, line 294: a literal input with more than 50 elements (60-segment map). |

W1 is a new finding. The FR-14 per-tool "Thu hẹp" lines were not measured in review 1. They come into scope because the W4 resolution restructured FR-14's warning bullets (lines 237 and 244) around them. If they existed unchanged in v1, review 1 missed them.

**Considered and discarded as out of scope or not defects:**
- **README `:13`/`:70` and AGENTS.md wording.** These are unchanged requirements already covered by FR-19/FR-22 and verified in review 1.
- **FR-20 Constraints range `:282-290` versus **Nguồn** `:278-290`.** Both cover every AC-14 match in that section, at `:284` only.
- **`views.py:1061` and the other upstream line numbers.** These are unchanged since review 1, which verified them at `a9aeaa8`.
- **The five decisions and the C1/C3/C4 answers.** These are fixed by the dispatch.
- **Whether a single sentence can carry FR-6's four required points.** This is a wording choice for design.

## Strengths

- Every new or changed literal reproduced on live data:
  - `140,685 B` and the 71% `translations` share;
  - `suttaplex` staying at 32 entries under `limit=1` and `offset=10`;
  - `title:` narrowing from 7 to 1 entries;
  - the menu counts 464/461 and children 4/6/13 with `other-vi`;
  - the suttaplex/mn run pattern;
  - the `server.tool(` lines;
  - the FR-20 range.
- Review 1's recommended literals were re-measured rather than copied. The W2 corrections match this round's data, not only review 1's text.
- The W1 fix is minimal and mechanical, and the artifact states its own baseline result ("Trên repo chưa sửa … cho 0 case"), which was confirmed.
- The W4 resolution is applied consistently across all seven places that state it. The tool-level description is the only free text, and it is bounded by an exact prefix rule.

## Summary

All of review 1's findings are resolved or applied except one residue of W3: line `:300` has a second `search_topic` mention that FR-20 does not name (W2). There are no regressions in the revised text. The orchestrator's W4 change is applied precisely, its literals hold, and AC-12's new prefix check yields 0 cases on the unchanged repo.

One new premise defect came up: FR-14 tells `get_parallels` and `get_bilarasuttas` to warn against division uids for size reasons, but those uids return `{}` and `{"msg": "Not Found"}` (W1). Both Warnings are local text edits.

**Verdict:** Approve with changes
