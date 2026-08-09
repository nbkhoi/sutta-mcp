# Review: requirements — Truyền query param `lang` vào `/api/bilarasuttas` cho `get_sutta`

**Date:** 2026-08-09
**Reviewer:** reviewer (Claude Code subagent)
**Artifact:** [requirements.md](../requirements.md)
**Verdict:** Block

Upstream context read: `specs/bilara-lang-param/clarifications.md`, `specs/non-segmented-translation-guard/requirements.md` and `design.md` (N1 blocks), `specs/sutta-mcp-requirements.md`, `src/index.ts`, `CLAUDE.md`. No `.claude/rules/`, `.claude/spec-templates/`, or `.claude/steering/` exist in this repo.

**Verification note.** Per the dispatch standard, I re-ran the artifact's measurements rather than trusting them. Every pinned literal, count, baseline, and line reference I checked **reproduced exactly** (2026-08-09, this review session):

- Live API: `dhp1-20/phantuananh?lang=vi` 108/108, segments 1/3/41/50 all byte-match (incl. trailing space on `"Tiểu Bộ Kinh "`); `dhp21-32` 63; `mn10/sabbamitta?lang=de` 204 keys / 200 non-empty, segments 1/3/50 match; `mn10/sujato` 233/194 and `?lang=en` body byte-identical; `minh_chau`/`indacanda` still no `translation_text` with `?lang=vi`; `mn10/xyzzy` 200 + 235 root; `mn10/sujato?lang=xx` no `translation_text`; `dhp/{phantuananh,sujato}` msg-only body; `/api/suttaplex/dhp` does not list `phantuananh`; suttaplex authors/langs (`Bhikkhu Thích Minh Châu`/vi, `Sabbamitta`/de) match.
- Upstream source (raw GitHub, `main`): `class SegmentedSutta` at `views.py:1054`, `@cache.cached` at `:1055`, `lang = request.args.get('lang', 'en')` at `:1058`; AQL filter at `queries.py:1092`. All correct.
- Local baselines: predecessor-spec greps (`nhưng không được phục vụ` 2 hits @196/250; `đi vào **cùng nhánh guard** như AC-1` 1 @258; `Trả lời được có thể mở khóa` 1 @375; `bilara-lang-param` 0; heading @7; heredoc fences @170/@186), master-spec greps (`vẫn không trả` 1 @298; `không dự đoán được` 1 @300; `Câu hỏi mở (chưa điều tra)` and `Trả lời được có thể mở khóa` 1 each @304; `?lang=` 0; `bilara-lang-param` 0; endpoint row @121; Tool-2 input table @166–172), `grep -c 'segmented' src/index.ts` = 3 (@114/162/239), gate string 1 hit @256, N1-A awk extraction 19/19 lines with empty diff, N1-B at design.md:230/:239, mn10/minh_chau suggestion list recomputed = 10 entries, `en/sujato` first.

The one Critical below is a case class the artifact never measured, not an error in what it did measure.

## Critical Findings

### C1: A translator with two segmented languages on one UID breaks FR-2/FR-3's quantifiers and the requirements/design boundary — live case `mn10`/`trush`, visible in the spec's own quoted data

- **Where:** §Ranh giới requirements/design (lines 48–56), FR-2 (line 68), FR-3 (line 70), line 38, line 239; AC-4 (line 160) quotes the list containing the counter-case
- **Evidence:** FR-3: "Nguồn lang hợp lệ đã biết: dữ liệu SC (field `lang` trong `suttaplex.translations[]` — đo 2026-08-09: entry `phantuananh` mang `lang: "vi"`, `sabbamitta` mang `lang: "de"`)". Options table (line 53): "Tra `suttaplex.translations[].lang` của translator được yêu cầu". Line 38: "với mọi cách design chọn để suy `lang`, kết cục xấu nhất khi suy sai là guard bắn". Line 239: "Mọi đường suy-lang-sai đều rơi về guard (đã đo) — design không cần nhánh lỗi mới."
- **Issue:** Measured this session (2026-08-09): `/api/suttaplex/mn10` lists `trush` **twice** — `lang: "gu"` and `lang: "hi"`, both `segmented=true`, `is_root=false`. Both are servable: `/api/bilarasuttas/mn10/trush?lang=gu` → 230 non-empty segments; `?lang=hi` → 232; without `lang` → no `translation_text`. So `author_uid → lang` is **one-to-many** on live data, and the spec's assumption that the suttaplex lookup yields *the* lang of the requested translator is false. Consequences, in order of severity:
  1. The document's own boundary contract (line 56: "Tài liệu này chỉ đặt ràng buộc **hành vi quan sát được từ ngoài**") is not met for this input: for `get_sutta {"uid":"mn10","translator":"trush"}`, FR-2's quantifier ("cặp `(uid, translator)` mà endpoint có doc khớp `(author_uid, lang)`") matches **two** docs, and nothing in FR-2..FR-5 determines which content the tool must serve.
  2. The three design options are **not behaviourally interchangeable** for this class, contra the table's framing (trade-offs of responsibility/latency only): option 1 (tool param) lets the caller address `hi`; options 2/3 force a server-side tie-break that makes one advertised translation permanently unreachable through the tool. The mechanism choice changes externally observable behaviour — exactly what the boundary section says is *not* delegated to design.
  3. The safety envelope of lines 38/239 does not cover this class: no "suy sai" occurs, the guard does **not** fire, and the outcome is silently serving one language while `get_sutta_meta` advertises both. The claim was measured only for invalid inputs (typo translator, `lang=xx`); design is explicitly told it "không cần nhánh lỗi mới" on the strength of it.
  4. FR-3's "Cơ chế suy `lang` phải đúng cho mọi ngôn ngữ có bản dịch segmented" is unevaluable for `hi`-under-`trush` in any lookup-based design.
  The case was in reach: `trush/gu` and `trush/hi` sit inside the 10-entry suggestion list that the predecessor spec enumerates (its FR-4 rationale, line 117) and that this artifact re-pins in AC-4.
- **Recommendation:** Pin the behaviour at requirements level; the fix is small. Suggested shape: (a) add a VERIFIED assumption recording `mn10`/`trush` (gu 230 / hi 232, both `segmented=true`); (b) add to FR-2 or FR-3: when the requested translator has multiple segmented entries with distinct `lang` on the same uid, serving **any one** matching doc satisfies FR-2; the tie-break rule is design's to choose and must be documented in `design.md`; (c) rescope lines 38/239 so the "worst case is guard" claim covers only invalid/lookup-miss paths, and name the multi-lang class's actual worst case (one advertised translation unreachable via options 2/3 — accepted for the prototype); (d) add the correctness dimension to the options table (option 1 dissolves the ambiguity; options 2/3 need the tie-break). No AC strictly required if the decision is "serve any one", but an UNVERIFIED-style note in AC-2's vicinity would keep the class visible.

## Warnings

### W1: FR-3's hardcode ban has no verification vehicle — a two-entry map passes every AC

- **Where:** FR-3 (line 70), AC-2 rationale (line 140), AC-6 (lines 181–189)
- **Evidence:** "**cấm** hardcode map `translator → lang` hay nhánh riêng cho tiếng Việt" (line 70); "Tiêu chí này tồn tại để giết implementation hardcode `vi`: một nhánh riêng ... pass AC-1 nhưng trượt AC-2" (line 140).
- **Issue:** AC-2 kills a single-language hardcode, but the literal map `{phantuananh: "vi", sabbamitta: "de"}` passes AC-1 **and** AC-2 while violating FR-3's ban outright. No AC reads the code for this; AC-6 checks only file/function/request scope. This project's own precedent pins code-shape bans with code-reading ACs (predecessor AC-6/AC-7).
- **Recommendation:** Add a code-reading clause to AC-6 (or AC-2): the `lang` value sent to `/bilarasuttas/` must originate from suttaplex response data or tool input; no object/map literal keyed by translator IDs and no translator-ID string literals on the lang-derivation path.

### W2: AC-7 only partially mechanises FR-7 mục 2 — a partial edit of predecessor AC-5 passes all three 0-hit matchers

- **Where:** FR-7 mục 2 (line 84), AC-7 (lines 191–199)
- **Evidence:** FR-7.2: "mọi mệnh đề yêu cầu guard bắn cho `dhp1-20`/`phantuananh` phải biến mất". AC-7's matchers cover predecessor lines 196, 250, 258, 375 (baselines re-verified: all non-vacuous).
- **Issue:** Predecessor AC-5 contains further guard-demanding clauses the matchers do not reach — lines 260–263: "không chứa chuỗi `Translator: `", "không chứa `[Hết văn bản` cũng như `[... văn bản bị cắt`", "`phantuananh` không xuất hiện trong danh sách gợi ý", "không chứa chuỗi `segmented`". An edit that fixes only the matched lines leaves a rewritten AC-5 that still demands guard behaviour and fails post-fix, while AC-7 passes. No clean global 0-hit matcher exists (`Translator: ` and `[Hết văn bản` legitimately remain in AC-1/AC-4, which stay guard cases; `manoseṭṭhā manomayā;` legitimately remains at line 348 §Assumptions and could validly persist in a rewritten AC-5 as a root-anchor negation — this spec's own AC-1 uses exactly that clause).
- **Recommendation:** Scope one matcher by position: require at least one `bilara-lang-param` hit **inside the rewritten AC-5 section** (FR-7.2 already mandates the pointer to this spec's AC-1), e.g. via an awk section slice; or add an explicit read-clause "AC-5 của spec tiền nhiệm không còn mệnh đề nào đòi output guard cho `dhp1-20`/`phantuananh`".

### W3: FR-7 lacks the conditional obligation for predecessor NFR-4 that FR-8(e) models for the master spec

- **Where:** FR-7 (lines 82–88), NFR-6 (line 104)
- **Evidence:** NFR-6: "Spec tiền nhiệm pin 'đúng 2 request song song' (NFR-4 của nó) — spec này **nới có kiểm soát** ... Request thứ ba chỉ được tồn tại nếu design chọn retry-on-miss." Predecessor NFR-4 (its line 156): "Không phát sinh HTTP request mới — vẫn đúng 2 request song song như hiện tại."
- **Issue:** If design chooses retry-on-miss, the predecessor file will pin a request bound that is now false — the same category of stale assertion FR-7.2 exists to remove ("mệnh đề ... sẽ fail thật khi chạy harness sau fix" applies equally: re-counting `get_sutta`'s requests post-fix gives 3, not 2). FR-8 handles its analogous conditional case explicitly (mục (e)); FR-7 has no counterpart, so the errata note would leave a contradicted NFR standing with no pointer.
- **Recommendation:** Add a conditional item to FR-7 mirroring FR-8(e): if the chosen design emits a third request, the errata note (or a one-line annotation at predecessor NFR-4) records that NFR-6 of `bilara-lang-param` supersedes the 2-request bound. If design keeps 2 requests, no edit.

## Suggestions

### S1: AC-2 has no URL anchor

- **Where:** AC-2 (lines 130–140)
- **Evidence:** AC-1 pins "chứa `URL: https://suttacentral.net/dhp1-20`"; AC-2 pins no URL line.
- **Recommendation:** Add "chứa `URL: https://suttacentral.net/mn10`" for symmetry with AC-1 and NFR-4's link requirement. Cheap, not required — AC-2 already has strong positive anchors.

### S2: Quote the upstream code line, not just `views.py:1058`, in the errata and master-spec edits

- **Where:** FR-7 mục 1 (line 83), FR-8(a) (line 91), AC-8 (line 211)
- **Evidence:** AC-8 already allows "kèm con trỏ `views.py:1058` hoặc mô tả cơ chế tương đương có nguồn".
- **Issue:** The citation is correct today (verified against `main`), but bare upstream line numbers rot; the errata note is designed to be read long after.
- **Recommendation:** Prefer quoting `lang = request.args.get('lang', 'en')` alongside the line number in both tracked documents, making the fallback wording of AC-8 the primary form.

## Strengths

- Measurement discipline is complete for what it covers: every pinned count, string anchor (including the trailing-space detail on `"Tiểu Bộ Kinh "`), grep baseline with line numbers, N1 byte-diff, and upstream source citation reproduced exactly on re-measurement — the first spec in this lineage where nothing self-reported failed re-verification.
- The harness rules carry the hard-won lessons forward explicitly: mandatory `"id":2` presence check per run, positive anchors in every behavioural AC, byte-diff (not grep) for the N1 blocks, and non-vacuity baselines recorded beside every 0-hit matcher.
- The requirements/design boundary is drawn deliberately, with a trade-off table instead of a smuggled design choice, and conditional obligations (FR-8(e)) are modelled rather than hand-waved.
- Predecessor-spec surgery (FR-7) is location-pinned, minimal, and preserves history under an errata note instead of rewriting it.

## Summary

Verdict: Block, on one finding. All of the artifact's own measurements are sound — I re-ran them and every literal reproduced — but a live case class it never measured (`mn10`/`trush`: one `author_uid`, two segmented langs, both servable — 230/232 segments) sits inside the spec's own quoted suggestion list and breaks its central premise that the three lang-derivation mechanisms differ only in trade-offs, not observable behaviour: FR-2's quantifier matches two docs without saying which must be served, FR-3's endorsed suttaplex lookup is one-to-many, and the "worst case is guard fires" envelope (lines 38, 239) does not cover the class. The fix is a bounded requirements-level decision plus a rescoped claim; W1–W3 are cheap AC/coverage patches that should land in the same pass.
