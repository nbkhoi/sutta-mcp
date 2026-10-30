# Design Review 1: tools-api-passthrough

**Artifact:** `specs/tools-api-passthrough/design.md` (1,675 lines, Status: Draft)
**Upstream:** `requirements.md` (Reviewed, 3 rounds), `clarifications.md` (C1/C3/C4 answered by the user; C2, C5–C12 defaults)
**Dispatch:** `.claude/spec-evidence/tools-api-passthrough/dispatch/env-dr1.md` (sha256 `5bfea8eb…c994`)
**Date:** 2026-10-24
**Baseline:** HEAD = `7dc2299b4223ebc9b3e093a18deb2db0fd37572c`

## Method

I did not rely on the author's prototype report. I reproduced it independently in a fresh `mktemp -d` copy of HEAD, and deleted the copy afterwards.

1. **Applied the code blocks with the design's own `blk` extractor.**
   - Blocks: P1, I1, T2, SE-1, SE-2, the `:151-167` deletion, TS-1, PK-1.
   - Ran the §Lắp ráp script verbatim. It printed all 7 `*-OK` lines.
   - `tsc` exits 0. `dist/` contains exactly `index.js`, `passthrough.js`, `search.js`.
   - `wc -l`: 220 / 150 / 77.
   - SE-2 keeps 79 characters.
2. **Recorded the fixtures live with F1–F3.**
   - 4 × `OK … 200`.
   - Trimmed bytes: 2,804 / 1,295 / 11,410 / 7,711 = **23,220 B**.
   - Whole `test/fixtures/`: 7 files, **38,443 B**. The `highlight|translations` grep is empty.
   - The step-5 re-trim `cmp` printed nothing.
3. **Ran `npm test`.**
   - Normal run: exit 0, `# pass 20`, `# fail 0`.
   - With the `globalThis.fetch`-throwing preload: same result.
   - All 8 `tools-api-passthrough FR-n:` prefixes are present.
   - `grep -rn -E 'fetch|src/index' test/` returns nothing.
4. **Ran the V1 mutations.** All six give `changed=1`, `exit=1`, and fail in the cases the table names. The restored copy exits 0. I also tried five alternative spellings that are not in V1:
   - (a) dropping `""` only at nested depth;
   - (a) printing `""` as nothing in `head()`;
   - (c) `Object.keys(v).sort()`;
   - (d) slicing arrays only;
   - (e) a `JSON.parse` reviver that drops `translations`.

   All five are caught.
5. **Ran the live harness end to end** (V2 from `search-api-passthrough`, plus V3/V4/V5).
   - **51/51 PASS**, covering AC-1..AC-11.
   - Six runs were invalid (`fetch failed`, rc=3): `ac5b` ×1, `ac6a` ×2, `ac8b` ×1, `ac10b-new` ×2. Each was rerun under the transport-only rule.
   - No valid run mismatched.
6. **Applied the doc blocks** (R-1, R-2, M-1..M-13, A-1..A-4) through the design's reconstruction pipeline.
   - The AC-14 grep gives: README 0, AGENTS.md 0, master spec 6 lines (`:296`, `:298`, `:302`, `:351`, `:360`, `:361`). All 6 are historical and marked as replaced or renamed.
   - The repo-wide stale-name grep (`search_topic|get_sutta|translator|sujato|formatCitation|list_divisions|DIVISIONS`) over README and AGENTS.md returns nothing.
   - FR-15 grep = 0. Symbol grep = 0. `segmented` = 0. The invariant grep table matches: `sujato` 2, `fetch(` 5, `server.tool(` 5, `^(let|var|const) ` 4→2.
7. **Re-measured the premises live and in upstream source.**
   - Upstream `a9aeaa8` is still `main`. `views.py:1061` is `lang = request.args.get('lang', 'en')` inside `SegmentedSutta.get` (`:1057`). `config.py:34` is `DEFAULT_LANGUAGE = 'en'`.
   - The live checks are in the table below.

| Pinned premise | Measured 2026-10-24 |
|---|---|
| `bilarasuttas/mn10/sujato?lang=vi` 73,700 B, no `translation_text` | 73,700 B; keys `comment_text,html_text,root_text,variant_text,reference_text,keys_order` |
| `author_uid` without that sutta's translation = root-only, byte-identical | `mn10/brahmali` and `mn10/xyzzy` are both 53,498 B, `cmp`-identical to `bilarasuttas/mn10` |
| `"{}"` string values in `html_text`: 68 / 193 / 621 | 68 (`mn10`), 193 (`dn22`), 621 (`dn16`) |
| `publication_date` strings: 29/43 and 2,821/4,442 | exact |
| Body sizes: `dn22/sujato`, `dn16/sujato`, `suttaplex/mn10`, `suttaplex/mn`, `menu/sutta`, `parallels/mn10`, `search mindfulness/en` | 158,090 / 633,489 / 12,962 / 1,343,704 / 2,863 / 53,731 / 140,685 B: all exact |
| Search: `translations` share of `suttaplex`+`hits` (100,243 of 125,074 chars) | 125,074 exact; `translations` 100,276 when the arrays are stringified as one array. This is a method difference, and the "phần lớn" claim holds |
| M-4: `niệm xứ`/`vi` gives 9 title matches incl. `mn10`, `dn22`, `sn43.5`, `ma98`; `parallels/mn10` anchor `mn10` = `dn22, ea12.1, ma98, sht-sutta11, ma31, ma81, mn119, t32` | exact |
| Q1: `new URL()` normalises `..` / `%2E%2E` | confirmed on Node v22.17.0 (`…/suttaplex/..` → `…/api/`, `…/mn10/%2E%2E` → `…/bilarasuttas/`) |

## Critical Findings

None.

## Warnings

### W1: Hitting the 3-try cap in the harness makes `check.cjs` crash instead of reporting "inconclusive (network)"

**Where:**
- V3 block, lines 1388-1410.
- The invocation line 1382: `"$H/run.sh" "$H" && (cd "$H/ac" && node check.cjs)`.
- The rule prose at line 1372.

**What happens when a row hits the cap:**
1. V3 prints `INCONCLUSIVE (network) <id>` and moves on to the next row.
2. The `while` loop then ends on a `break`, so `run.sh` always exits 0, and the `&&` always runs `check.cjs`.
3. For a `tools/call` row, V2 exits 3 *before* writing stdout, so `$H/ac/<id>.json` is empty.
4. `R(id)` → `JSON.parse("")` throws, and `check.cjs` dies with a stack trace. The AC lines after it are never printed.

I simulated both halves. A V2 stub that always exits 3 gives three `INVALID` lines, then `INCONCLUSIVE (network) x`, then `run_exit=0`. Truncating one `.json` file makes `check.cjs` exit with a `SyntaxError`.

**Why it matters:** line 1372 says the cap outcome is "inconclusive (network), không phải pass, không phải lỗi code, orchestrator quyết định". The mechanical outcome is different: the check exits non-zero, which reads as a failed AC run. This is the harness-rule boundary that the user's memory rule protects ("rerun only invalid runs; a valid mismatch halts"). The precedent closed exactly this gap: `specs/search-api-passthrough/design.md:1028` has "V3 in `INCONCLUSIVE (network)` và thoát 3 … Chỉ `MISMATCH` (thoát 1) là phát hiện về code". This design's V3 drops that exit code.

The design also measured that the cap is not hypothetical: `ac6a` and `ac10b-new` each needed their third try in my run.

**Related wording drift:** line 1372 says the run is "chạy lại tối đa 3 lần", and Risks (line 1668) says "chạy lại, tối đa 3 lần". V3's code (`try -le 3`) makes 3 attempts in total, which is 2 reruns. Pick one meaning and use it in all three places.

**Fix (small):**
- In V3, remember any inconclusive row and `exit 3` at the end. For example, set `inc=1` in the cap branch, then add `[ -z "$inc" ] || exit 3` after `done`.
- Keep the `&&`, so `check.cjs` runs only when every row is valid.
- State at line 1382/1372 that run exit 3 means "inconclusive (network): report it with stderr, do not run V5, do not treat it as a code failure".
- Align "tối đa 3 lần" with the code.

## Suggestions

### S1: The `text (B)` column of the §Performance table was measured with a placeholder URL

**Where:** lines 1342-1358.

Re-measured with P1's `renderBody` and the real request URL:

| Request | Design | Measured |
|---|---|---|
| `bilarasuttas/mn10/sujato` | 95,676 | 95,699 |
| `bilarasuttas/mn10` | 52,900 | 52,916 |
| `suttaplex/mn10` | 15,014 | 15,027 |
| `menu` | 182,914 | 182,917 |
| `menu/sutta` | 3,250 | 3,259 |

Each gap is exactly (length of the path after `/api/`) − 1. That pattern means the source line was built with a one-character placeholder instead of the request URL. Every "Dòng" count matches exactly, and no FR, AC or `describe()` number depends on this column. The column header says "`content[0].text` dựng bởi P1", so either re-measure with the real URL or say the source line is excluded.

### S2: `language` changes more than the descriptions say

**Where:** I1 lines 431, 458, 486.

Measured diffs between `language=vi` and the default:
- `suttaplex/mn10`: `translated_title`, 4 × `translations[].title`, `previous.name`/`next.name`, and `priority_author_uid` (`sujato` → `null`).
- `parallels/mn10`: `to.translated_title` and 27 × `to.translations[].title`.
- `menu/sutta`: `translated_name` and `yellow_brick_road*`.

The descriptions say "Dịch `translated_title`" / "Dịch `to.translated_title`" / "Dịch `translated_name`". They do not say "only", so this is not false, and FR-14 requires only what is there. One point may still matter to a caller who picks a translator from `priority_author_uid`: under `language=vi` that field becomes `null` for `mn10`. Optionally add one clause to the `get_suttaplex` `language` describe.

## Open questions: assessment

All three are reasonable defaults. None needs a user decision.

- **Q1 (`.`/`..` uid).** The premise reproduces. No percent-encoding avoids the normalisation, because WHATWG URL treats `%2E` as a dot, so `refine` is the only fix.
  - The default stays inside FR-2, which pins `z.string().min(1)`, and inside FR-4 ("không chuẩn hóa").
  - It is recorded in Risks with the one-line alternative.
  - The case has no legitimate caller use.
- **Q2 (`"2019"` vs `2019` in `text`).** This follows directly from the user's C1 (A) answer ("chuỗi in nguyên văn") and C2. FR-10.5 requires telling `""`, `null`, `{}`, `[]` and absent keys apart, and the design does that. `json` keeps the types.
  - The same class also covers a string whose content is literally `""`, which would print like an empty string. That is unmeasured and has no practical impact.
- **Q3 (explicit test file list).** `engines` is `>=18`, and quoted globs need Node ≥ 21 `--test`. Unquoted globs depend on the shell. Listing the files is the conservative choice, and its cost is stated.

## Traceability check

- **FR-1..FR-22, NFR-1..NFR-7 and AC-1..AC-14** each map to a design element (P1 / I1 / SE / TS / PK / F / R / M / A / ordering) and to a vehicle in the §Vehicle theo AC table.
- **FR-17 rows.** All 8 applicable FR-17 rows have a literal-expectation case. The FR-7 row applies, because `json` is built in P1.
- **AC-10 / FR-6.** `description === desc_base + " " + S` is checked mechanically. `S` contains `140,685`, `` `limit`/`offset` chỉ phân trang `hits` ``, `` `title:` `` and `cụ thể hơn`, and has no `". "`. The rest of FR-6's content list is also present: `json` returns the whole body, `translations` dominate, and `suttaplex` is returned whole for plain queries.
- **AC-11 / FR-14.** I read all four tool descriptions against every FR-14 bullet. Each has:
  - the endpoint;
  - "nguyên body, thứ tự SC, không lọc, không cắt";
  - the not-found shape;
  - a measured "Kích thước" line, including "không có tham số nào thu nhỏ" for bilara and parallels, and the `submenu_id` / sutta-uid narrowing for menu and suttaplex.

  The `text`/`json` meaning is in `formatParam`. No description claims large output for a division uid on parallels or bilara. INDEX-OK pins I1 verbatim, so this one read covers the implementation.
- **Doc anchors.** Every block names both a `7dc2299` line range and its first and last text. The reconstruction script makes application mechanical, and the line numbers stay valid because `7dc2299` is immutable.
- **AC-14 / AC-15.** The requirements have no AC-15; I assume the dispatch meant AC-14 and the FR-19..FR-22 clauses. AC-14's grep and every FR-20 sub-item are covered: endpoint table, Parallel types, Tool 1–5, flow, Constraints C4 and Attribution, roadmap 1/2/3/5/6/7, issue table and priority, and `get-sutta-unknown-uid`.
- **Apply order.**
  - The A-1..A-4 task is the last build task and edits only `AGENTS.md`.
  - The contract update runs before code review, with user-only `authorize`. The operation names match `lib/workflow_contracts.py`, and so does the affected-scope id `dependencies.context:agents` (`:130`, `:157`).
  - If the user does not authorize, the workflow stops in drift and nobody restores `AGENTS.md`.
  - The contract sha256 `4c8b646d…a6ea745` matches the dispatch envelope.

## Re-review boundary

Not applicable (first design review).

## Strengths

- **Every self-reported number I re-measured reproduced exactly**, except one annotation column (S1). That includes all fixture byte counts and the 23,220 / 38,443 totals, all live body sizes, the `"{}"` counts, the root-only byte identity, the `lang=vi` key set, and both M-4 flow literals.
- **The design prints whole files verbatim and checks them with `diff`.** This closes the call-site drift class (memory items 10/13). Because I1 is diffed in full, the read-only FR-14 clauses only have to be reviewed once, against the design.
- **The tests discriminate.** The six FR-18 mutants and five independent re-spellings are all caught. `labels()` derives the expected prefixes from the body without calling P1.
- **The AC-10 baseline is built from `git archive 7dc2299` and run next to the new build.** This avoids a stale saved baseline and keeps both inside one SC cache window.
- **The harness invalid-run rule is transport-only**, as NFR-5 requires. `isError` and `SuttaCentral API error:` count as valid runs. The one gap is the cap exit path (W1).

## Summary

The design is complete and reproducible:
- code assembly, build and tests: 20/20, also with network access blocked;
- mutations: 6/6, plus 5/5 alternative spellings;
- live ACs: 51/51;
- doc reconstruction and its greps;
- every pinned premise.

One Warning remains. When a row hits the 3-try cap, `run.sh` still exits 0 and `check.cjs` crashes. So the "inconclusive (network)" outcome is not reported mechanically, which the precedent design had fixed with exit 3. The "tối đa 3 lần" wording also differs from the code. Two optional Suggestions are about accuracy: the performance `text` column was measured with a placeholder URL, and `language` changes more fields than the descriptions mention. Q1–Q3 are reasonable defaults and need no user decision.

**Verdict:** Approve with changes
