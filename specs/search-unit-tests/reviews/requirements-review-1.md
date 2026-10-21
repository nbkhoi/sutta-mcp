# Requirements review 1: search-unit-tests

**Artifact:** `specs/search-unit-tests/requirements.md` (Draft, 2026-10-19)
**Scope:** artifact/requirements, series `requirements-review`, suffix 1 (first review; no re-review boundary)
**Inputs checked:** `src/index.ts` (master `148b8c0`; `git diff --quiet 5459d5a -- src package.json tsconfig.json` = 0), `package.json`, `tsconfig.json`, `AGENTS.md`, `README.md`, `specs/dynamic-search/requirements.md`, `specs/sutta-mcp-requirements.md`, the requirements template.
**Recorded user decisions (2026-10-19):** treated as fixed, not as findings.

## Measurements performed for this review (2026-10-19, temp dir outside the repo, now deleted)

- **Live fixtures:** re-fetched all 9 requests with `curl -G` (`limit=10`, plus `offset` when it is non-zero). All returned HTTP 200. Every `total`, `suttaplex` count, `hits` count and boundary `uid` matches the §Response search đã đo table: 456/16/9, 145/6/10, 88/8/8, 0/0/0, 0/0/0 + `error`, 1461/32/8, 1461/32/9, 1460/32/0, 1/1/0. `dn22` and `mn10` sit at 0-based index 10 and 11, which is position 11 and 12. All 32 `mindfulness` `suttaplex` entries are distinct suttas, which gives the 10/10/10/2 split.
- **Trimming:** I applied the FR-11 field list and wrapped each body with a `url` and a date. I then ran a copy of the `5459d5a` handler logic (`src/index.ts:43-93`, `:127-140`, `:209-293`) on the raw body and on the trimmed body for 16 (`match`, `page`) pairs across all 9 fixtures. All 16 outputs were byte-identical, so the field list is complete. Total size is 52,423 bytes, under the 64 KiB cap.
- **Mutation kill paths:**
  - (a) `vô ngã tướng`/`vi`/`content`: `h = 0`, `total = 1`. The baseline footer is `Hết kết quả.`. Removing `h > 0` gives `0 + 0 < 1`, so the footer becomes `Còn kết quả…`.
  - (b) The four `anatta` articles carry `is_article: true` and have **no** `category` key, so only the `is_article` clause filters them out.
  - (c) The `cnd8` `name` is `"Exposition of the Questions of the Student  Mettagū "`, with a trailing space.
  - (d) An NFD key misses the NFC map.
  All four mutations have a fixture or literal that kills them.
- **Toolchain:** tested on Node v22.17.0 with tsx 4.21.0 (`engines.node >=18.0.0`), using an unmodified `tsconfig.json` and the script `"test": "tsx --test test/*.test.ts"`.
  - `npm test` exits 0 and the TAP output has `# fail 0`.
  - `NODE_OPTIONS="--import <preload>"` reaches the test process: a probe printed the stubbed `globalThis.fetch`.
  - `tsc -p .` emits only `dist/search.js`.
  - `node --import tsx -e 'import("./src/search.ts")'` exits 0 and prints nothing.

## Critical Findings

### C1: The FR-2 / AC-2 literal grep cannot reach 0, because the line FR-2 keeps contains one of the literals

FR-2 (requirements.md:97) requires `grep -c -E 'Tìm thấy|Hết kết quả|Còn kết quả|Khớp tiêu đề|Khớp nội dung|Không có kết quả sutta|Không tìm thấy sutta nào' src/index.ts` = 0. AC-2 (:218) inherits this check. The same FR-2 also requires that "schema zod và chuỗi `describe()` của tool" stay in `src/index.ts`, and FR-4 requires `tools/list` to be byte-identical. The `page` describe string at `src/index.ts:203` contains the literal:

```
"Trang kết quả, bắt đầu từ 1. Khi output kết thúc bằng 'Còn kết quả', gọi lại với page kế tiếp, giữ nguyên topic, language, match."
```

On a correct implementation the grep returns at least 1, so the check fails on every conforming implementation. You can see this before any change: the baseline grep hits `:72, :79, :203, :215, :267, :268, :279, :281, :283, :287`. Of these, `:203` is the only line that FR-2 keeps in place. (This is anti-pattern 18: running the clause on the baseline would have shown it.)

**Fix:** narrow the pattern so the describe string does not match. For example, use `Còn kết quả:` with the colon; `:203` has `'Còn kết quả',`, which then no longer matches. Alternatively, pin the expected count to 1 and name the `:203` describe line as the exception. Apply the same change in FR-2 and AC-2.

## Warnings

### W1: AC-8 measures disk blocks (`du -k`), and the spec's own fixture format fails that check

NFR-4 (:198) caps total fixture size ("tổng dung lượng") at 64 KiB, and the Assumptions (:313) size the fixtures at about 48 KB in 2-space JSON. AC-8 (:278) instead checks `tổng du -k ≤ 64 KiB`. On APFS, `du -k` rounds each file up to 4 KiB blocks.

The FR-10/FR-11 fixtures I measured (2-space indent, with URL and date) total 52,423 bytes, which is within NFR-4. Their per-file `du -k` values are 8+4+8+12+16+12+8+4+4 = **76** KiB, which fails AC-8. Small files such as `xyzzyqq` (208 B) and `foo:bar` (512 B) each count as 4 KiB.

An implementer who follows the spec's own sizing would fail a valid verify run, and NFR-6 then stops the run. The only way to pass is to minify the JSON, which no requirement asks for.

**Fix:** measure apparent bytes instead, e.g. `cat test/fixtures/* | wc -c` ≤ 65536, and state that the unit is bytes in both NFR-4 and AC-8.

### W2: Q1's default goes against locked decision 5, and NFR-3's Q1 clause is inverted

Locked decision 5 (:12, "không mở lại") limits the documentation work to `AGENTS.md` and README. Q1's default (:319) edits `specs/sutta-mcp-requirements.md:160` and `:293`. Both line references are correct: each says `src/index.ts`. Q1 is a legitimate question for the user, but a non-blocking default should not widen a closed decision. Under this default, design would go ahead on a scope the user explicitly closed.

NFR-3 (:197) also admits "các file được nêu ở Q1 **nếu Q1 được chốt khác**", meaning only if Q1 is decided differently from the default. Since the default is the edit, the master spec would change under the default while staying outside the NFR-3 allow-list, and AC-7's first bullet would then fail.

No FR or AC carries the master-spec edit. FR-14 and FR-15 do not mention it, and AC-9 does not check it.

**Fix:** pick one of two options:

- Make the default "no edit" so it is consistent with decision 5, and keep the NFR-3 clause conditional on the user choosing the edit.
- Keep the edit as the default, but then:
  - list `specs/sutta-mcp-requirements.md` in NFR-3 unconditionally;
  - add an FR clause scoped to the two path tokens;
  - add an AC-9 grep for it.

## Suggestions

- **S1: Name where the expected values for fixture-based assertions come from (FR-12, :160).** FR-12 rules out copying output from the new code. However, the `5459d5a` build cannot be imported (`src/index.ts` side effects, :33), so "output của bản build `5459d5a`" for a fixture body is only available from a live harness run at capture time. Most rows can be pinned from the dynamic-search wording: S2/S3 output lines, FR-8/FR-9 block shapes, and the measured counts. Say that explicitly. If whole-output literals are wanted, require that they come from a `5459d5a` harness run made in the same capture window as the fixture, and recorded with it.
- **S2: FR-12, FR-9 row (:152) mislabels AC-15.** dynamic-search AC-15's three blocks are `SA 264`, `CND8` and `SA 107` from `three jewels` (dynamic-search requirements:306-308). `three jewels` is not in the fixture set, and the row replaces the third block with an acronym-only fallback. The row also writes `**CND8** — …`, eliding the literal that kills mutation (c). Pin the full line, `**CND8** — Exposition of the Questions of the Student  Mettagū`, with the double space inside and no trailing space.
- **S3: FR-1(d) cites FR-17, but Out of Scope (:329) excludes "FR-17 (schema zod)".** dynamic-search FR-17 also defines the pure title-page slicing `T[(p−1)·10 … p·10)`. Either drop FR-17 from the Out of Scope list or qualify it as "phần schema của FR-17".
- **S4: FR-14 (:170) refers to README's "Mục lệnh", but README has no section with that name.** The commands sit under `## Cài đặt` (README:19) and `## Chạy thử (dev mode)` (README:28). Name the section that should receive `npm test`.
- **S5: The FR-12, FR-10 row "output không chứa `total`" is a pure negation.** It passes on any output. Pin a token, such as `1461` being absent from `mindfulness` page 1, and pair it with that case's positive header literal.

## Strengths

- Every self-reported literal I re-measured is correct:
  - line references: `:32-38`, `:40-93`, `:127`, `:176-295`, `:329`, `:408`, AGENTS.md 19/23/44, README 76/80, master spec 160/293;
  - grep baselines: 3/3/0/1/4, and 584 lines;
  - all 9 live response shapes.
- The module boundary in FR-3 is feasible. `formatCitation()` (`:127-140`) is pure, and the Assumptions name both ways to place it (move and export, or pass it in) under FR-4/FR-5.
- The FR-13 mutations are well chosen. Each one targets a branch that fixtures can actually reach, which I confirmed with live data. In particular, articles lack `category`, so mutation (b) is not masked by `hasCategory`.
- AC-5 covers all five tools plus `tools/list`, including the paths that share `formatCitation()` (`get_sutta`, `get_sutta_meta`), a `get_sutta` error path, and a zod rejection (`page: 0`).
- The fixture rules fit the no-accumulation constraint (`specs/sutta-mcp-requirements.md:282-283`):
  - fields are trimmed, so no `highlight` or `translations` are kept;
  - each fixture keeps its request URL and `uid`;
  - no refresh script is added;
  - raw bodies are not stored in the repo.
- Q2 belongs to the user, and its default fits locked decision 2. Running Node 18 is honestly marked UNVERIFIED with a stated default.

## Summary

The requirements are well grounded: the measurements, mutation design, toolchain claims and fixture rules all held up when re-run. One mechanical check is broken in a way no implementation can satisfy: FR-2/AC-2 forbid `Còn kết quả` in `src/index.ts` while requiring the `page` describe string that contains it (`:203`) to stay there. AC-8's `du -k` check fails on the spec's own measured fixture format. Q1's default conflicts with locked decision 5, and NFR-3's clause for it is inverted. Five optional clarity fixes are listed above.

**Verdict:** Block
