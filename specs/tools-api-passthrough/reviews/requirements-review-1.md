# Requirements review 1: tools-api-passthrough

**Artifact:** `specs/tools-api-passthrough/requirements.md` (Draft, 2026-10-24)
**Upstream checked:** `clarifications.md`, `specs/search-api-passthrough/requirements.md` (precedent), `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts`, `test/fixtures/`, `package.json`, README.md, AGENTS.md, `specs/INDEX.md`, template `requirements.md.tmpl`
**Reviewed:** 2026-10-24
**Scope:** first review of the requirements artifact. The five stakeholder decisions and the user's answers to C1, C3 and C4 are fixed and are not reviewed. The C2 and C5–C12 defaults are reviewed only for consistency with the FRs.

## How premises were checked

- **Upstream code.** `git ls-remote` of `suttacentral/suttacentral` `main` gives `a9aeaa8`, the cited commit. Read `server/src/sc_flask/app.py`, `server/src/sc_flask/config.py` and `server/src/api/views/views.py` from `raw.githubusercontent.com` into a `mktemp -d` directory, since deleted. Confirmed:
  - routes at `app.py:91,93,96,116-117`;
  - `DEFAULT_LANGUAGE = 'en'` at `config.py:34`;
  - `Menu` `:224`, `SuttaplexList` `:307`, `Parallels` `:701`, `SegmentedSutta` `:1057`;
  - `SegmentedSutta.get` reads `lang` at `:1061`, defaulting to `'en'`;
  - `request.args` in the four handlers reads only `language`/`lang`;
  - `{'msg': 'Not Found'}` at `:1068`;
  - `keys_order = list(html_text.keys())`;
  - `illustrations` is optional;
  - `SortedDict(sort_parallels_key)`;
  - `flat_tree`;
  - `JSON_SORT_KEYS = False` (`app.py:75`), so body key order is the server's order.
- **Live API.** Sent 30 GET requests to `https://suttacentral.net/api` on 2026-10-24. All were valid, with no transport failures and no reruns. Bodies were analysed in the temp directory and deleted. These literals match the requirements:
  - **Default parameters.** Omitting `language`/`lang` gives a byte-identical body to sending `en` for 5 of 5 endpoints. `mn10%2Fsujato` gives a body byte-identical to `mn10/sujato`.
  - **suttaplex.** `suttaplex/mn10` has 1 element with the 19 keys in the stated order, `difficulty` `{intermediate, 2}`, and 43 `translations`, including the `is_root` entry `author_uid` `ms`. With `language=vi`, `translated_title` is `Kinh Niệm xứ` and `blurb` is unchanged. `mn` has 171 elements, 1,343,704 B, 4,442 translations and no `children` key. `dn` has 38 elements, 260,840 B.
  - **parallels.** `parallels/mn10` has the anchors 8/2/3/3 = 16. The entry and `to` keys are as stated. The first entry is `dn22`/`full`/`false`, with the vi title `Kinh Ðại Niệm xứ`. `dn22` has 7 keys, 27 entries, 77,799 B.
  - **bilarasuttas.** `mn10/sujato` has the 7 keys in the stated order, 235 keys per map in `keys_order` order, and non-empty counts 48/194/9/75. `dn22/sujato` has 454 segments and 158,090 B. `dn22:22.27` matches the AC-2 literal, and `dn22:22.28` is `""`. `mn10` without `author_uid` has 5 keys and `root_text` starts `Majjhima Nikāya 10 `. `dhp1-20/phantuananh?lang=vi` has 108 segments, `Tiểu Bộ Kinh `, `Kinh Pháp Cú `.
  - **menu.** `/menu` has 464 nodes, 168,235 B, all `node_type: "root"`. `/menu/sutta`, `/menu/long` and `/menu/dn` have the stated children. With vi, `translated_name` is `Kinh tạng`.
  - **"Not found" and errors.** All four "not found" bodies match AC-5. `/menu/` and `/bilarasuttas/mn10/sujato/extra` return 404. `/api/spec` has 18 paths and declares only `uid` for `parallels`. No tool-endpoint body has an array-index-like key or a string containing a newline.
- **SDK.** With the existing `dist/` and SDK 1.29.0, `get_sutta {}` and `get_sutta_meta {"uid":…,"bogus":1,"language":42}` both return `isError` text that starts with `MCP error -32602: Input validation error: Invalid arguments for tool {name}:`, matching FR-2/AC-9. The unknown key was not rejected. SDK 1.29.0 and zod 3.25.76 confirmed from `node_modules`.
- **Repo.** Every row of the §Hiện trạng count table reproduces at `7dc2299`: 3/0, 3/0, 4/0, 5/0, 3/1, 2/0.
  - `src/index.ts` has 446 lines and `src/search.ts` 167.
  - There are 11 test cases and 3 fixtures (15,223 B).
  - `scripts.test` matches.
  - `gh issue list` shows #16, #19 and #20 open.
  - The master-spec line ranges (`:116-122`, `:143-254`, `:258-274`, `:278-290`, `:298-351`, `:353-369`) all land on the cited sections.
  - The FR-15 greps give 0 on `src/search.ts` at baseline except for `formatCitation`, which this spec removes. The arrow-symbol grep hits only `src/index.ts:315-321`, plus `:422` in `list_divisions`, which is removed.
  - The AC-12 fixture grep is empty at baseline.

## Critical Findings

None.

## Warnings

### W1: AC-12's FR-prefix coverage check passes for 6 of 7 rows before any test is written

FR-17 (line 279) requires new cases to start with "id FR của **spec này**". It also requires existing search cases to keep "tiền tố FR của spec `search-api-passthrough`" (line 280). Both specs number their FRs from FR-1, so the two namespaces collide.

AC-12 (line 496) checks only that "mỗi id FR của dòng đó là tiền tố của ít nhest một case pass" with a trailing `:`. The existing `test/search.test.ts` already has passing cases named:
- `FR-3:` (`:67`)
- `FR-5:` (`:81`)
- `FR-7:` (`:129`)
- `FR-9:` (`:185`)
- `FR-10:` (`:191`)
- `FR-11:` (`:198`)
- `FR-12:` (`:215`)

That covers every FR-17 row (FR-3/FR-5, FR-7, FR-9, FR-10, FR-11, FR-12) except FR-4. So the coverage clause is satisfied on the unmodified repo for 6 of 7 rows, and it cannot show that the new tools have the required literal-expected cases. The FR-18 mutants still give some protection. However, mutants (a), (c), (d) and (e) target the renderer only, and nothing pins which input each mutant must be caught on.

**Fix:** make the new cases distinguishable. Two options:
- scope the AC-12 clause to the new test file (C10 lets design choose a new file, so make that choice binding when this check depends on it); or
- require a spec-qualified prefix for new cases, for example `tools-api-passthrough FR-3:`, and check for that string.

### W2: Two rows of §Hình dạng API, which §Assumptions marks VERIFIED, misstate the measured shape

- **Line 130 (`menu`): "Chỉ `abhidhamma`, `sutta`, `vinaya` có `children` (một cấp)".** Measured on `/api/menu`: all 464 root nodes have a `children` key. 461 of them have `children: []` and only those three are non-empty. `Menu`'s own swagger lists `children` as a property of every `MenuItem` (`views.py:265-268`). The same wording appears in clarifications C8 (line 135). The AC-5 literal `menu/xyzzy` → `children: []` is correct.

  This matters downstream. Design will trim the `/api/menu` fixture and write the `get_menu` `describe()` (FR-14: "nhiều node rời") from this row. A fixture that drops the empty `children` arrays would violate NFR-4's "giữ … hình dạng lồng nhau". It would also leave FR-10.5's `[]` case unexercised on real data.

  **Fix:** "cả 464 node có `children`; chỉ … có `children` khác rỗng (một cấp); 461 node có `children: []`".
- **Line 126 (`suttaplex`): "`mn` → 171 phần tử (`branch` trước, rồi `leaf`…)".** Measured, the array is a pre-order flattening. Branches and leaves alternate: `branch`×3 (`mn`, `mn-mulapannasa`, `mn-mulapariyayavagga`), `leaf`×10, `branch`×1, `leaf`×10, `branch`×1, and so on. It is not all branches followed by all leaves. No AC depends on this, but FR-14 asks `describe()` to explain the division-uid case, and this row is its premise. The same wording is in clarifications C1 (line 28).

  **Fix:** "duỗi cây theo thứ tự trước (mỗi `branch` đứng trước các `leaf` của nó)".
- Minor, same row class: line 135 and NFR-6 give latency as "0.26–2.6 s". In this review's 30 requests the maximum was 4.09 s (`suttaplex/mn10`). The 30 s harness wait is unaffected. State the range as observed-so-far or widen it.

### W3: FR-20 does not cover roadmap items 1 and 3, but AC-14 requires them to change

AC-14 (line 522) requires every master-spec match of `search_topic|get_sutta\b|get_sutta_meta|list_divisions|max_segments|Deep link` to be "ngữ cảnh lịch sử, nói rõ là đã bị thay thế". Two matches are present-tense statements about the current tool, and FR-20's list (lines 316-319) covers only roadmap items 2, 5, 6 and 7:

- `:296` (item 1): "`search_topic` nhận đúng tham số của `GET /api/search/instant` cộng `format`…";
- `:300` (item 3): "Claude đã ghép được `search_topic` với `get_parallels`."

FR-20's **Nguồn** range `:298-351` also starts after `:296`. As written, the implementer must either edit lines that no FR names or fail AC-14. Item 1 is about `search_instant`'s own lineage, which FR-6 is careful to preserve.

**Fix:** add roadmap items 1 and 3 to FR-20, renaming to `search_instant` or adding a note, and widen the cited range to `:296-351`.

### W4: The C3 answer covers "mọi tool", but FR-14 and FR-6 implement it for four tools and do not say why

- The header restates the user's C3 answer as "`describe()` của **mọi** tool cảnh báo điều này và nói cách thu hẹp" (line 36). Clarifications C3 (line 55) has the same "**mọi** tool".
- FR-14 (line 233) applies the large-output warning only to "mỗi tool mới".
- FR-6 (line 199), from the C11 default, allows `search_instant`'s `describe()` to differ from `search_topic`'s only "ở chỗ nhắc tên tool". So it forbids adding the warning to the fifth tool.
- `search_instant` can also return large unfiltered output: `limit` is passed through with no cap, and its `describe()` (`src/index.ts:102`) has no size warning.

The requirements may be right to read C3 as covering only the four tools: the C3 question was framed around decision 5 and the four new bodies. However, that reading narrows a recorded user answer, and the text does not say so.

**Fix:** either state in FR-14 or FR-6 that the C3 warning is out of scope for `search_instant`, with the reason, so the exclusion is visible to the user at the design pause, or let FR-6 allow the one added warning sentence. If you take the second option, AC-10's `describe()` comparison does not need to change, but its `inputSchema` byte check is unaffected only if the parameter descriptions stay the same.

## Suggestions

### S1: Scope FR-9's "no website link" rule and the rewritten Constraints line to the four new tools

FR-9 (line 212) says "Tool không dựng thêm link website nào", and C4 rewrites the master-spec Constraints line to "Caller tự dựng link website" (clarifications line 84). However, `search_instant` keeps building `URL: https://suttacentral.net/{uid}` lines (`src/search.ts:98`, `:108`), and FR-6 requires it to. Word FR-9 and the FR-20 Constraints rewrite so that they stay true for `search_instant`.

The Constraints "Attribution" line (`:290`: "ghi rõ … dịch giả, và UID") is not in FR-20's Constraints list (`:282-284`). It is also not obviously true for `get_menu` or for `get_bilarasuttas` without `author_uid`. Consider adding it to FR-20.

### S2: Off-by-one line references in §Hiện trạng

Line 86 cites the five `server.tool(` calls at `:101`, `:161`, `:249`, `:289`, `:416`. `server.tool(` is at `:100`, `:160`, `:248`, `:288`, `:415`; the cited lines hold the tool-name string. Either cite the `server.tool(` lines or say "tên tool tại".

### S3: Master-spec background "Parallel types" keeps a "Ký hiệu" column for symbols no tool emits

Out of Scope (line 566) excludes the background `:17-137`, which includes the table at `:128-137` mapping `type`/`resembling` to `≡ ≈ → ↺`. After FR-15 no tool prints these symbols, and the AC-14 grep does not catch the column. A one-line note, or dropping the column, would stop a reader from expecting them in `get_parallels` output. This is optional, because the user put background sections out of scope.

### S4: Name the mutant-killing inputs for FR-18 (d) in the FR-17 table

Mutant (d), "chỉ 50 phần tử đầu", is caught only by an input with more than 50 keys or elements. NFR-4 trims each bilara map to "vài segment", and no FR-17 row requires a literal input that large. FR-18 still forces one through AC-12, but adding "một object/mảng > 50 phần tử" to the FR-10 row would make that obligation visible at task planning.

## Strengths

- Every measured literal in the ACs and in §Hình dạng API reproduced exactly, except the two shape descriptions in W2. That includes byte sizes (158,090; 1,343,704; 260,840; 77,799; 168,235; 97,200; 53,498), counts (19 keys, 43 translations, 8/2/3/3, 27, 235, 454, 108, 464, 171, 38), trailing-space strings (`Majjhima Nikāya 10 `, `Tiểu Bộ Kinh `, `Satisfied, … said. `), and upstream line numbers including the updated `views.py:1061`, where the master spec's `:1058` is stale.
- The precedent's behaviour is preserved for `search_instant`. There is a captured baseline at `7dc2299`, a byte-identical content and `inputSchema` check, and unchanged function bodies. AC-10 names the baseline-capture step before code changes, which closes the "byte-identical to before" gap seen in earlier specs.
- The lessons from earlier specs are applied:
  - NFR-3 includes `specs/INDEX.md`;
  - NFR-5 limits invalid runs to transport failures;
  - the AC-12 grep and the FR-15 greps pass correctly at baseline;
  - AC-5 and AC-7 pair negations with positive anchors.
- The documentation consequences are mostly complete:
  - README and AGENTS.md line items are listed;
  - AGENTS.md is the last build task, with an explicit user-authorized contract update;
  - #16, #19 and #20 and the four predecessor specs are recorded as superseded;
  - auto-closing keywords are forbidden without consent.

## Summary

There are no Critical findings. The premises hold against upstream `a9aeaa8` and 30 live requests, apart from two misdescribed shapes (W2). The main defects are:
- a test-coverage AC that is nearly vacuous because the FR namespaces collide (W1);
- an FR-20 omission that leaves AC-14 unreachable without editing unlisted lines (W3);
- an unstated narrowing of the user's C3 "mọi tool" answer (W4).

All four Warnings can be fixed with local text edits.

**Verdict:** Approve with changes
