# Requirements review 3: tools-api-passthrough

**Artifact:** `specs/tools-api-passthrough/requirements.md` (Draft, revised after review 2)
**Upstream checked:** `clarifications.md`, `reviews/requirements-review-2.md`, `specs/sutta-mcp-requirements.md` (`:300`), `src/index.ts` (`:102`)
**Reviewed:** 2026-10-24
**Scope:** re-review 3 (see §Re-review boundary). The five stakeholder decisions and the user's answers to C1, C3 and C4 are fixed and are not reviewed.

## How premises were checked

- **Repo.** Branch `feat/tools-api-passthrough` at `7dc2299`. Only `specs/tools-api-passthrough/` is untracked.
  - `sed -n 300p specs/sutta-mcp-requirements.md | grep -o search_topic | wc -l` gives 2. Both quoted phrases in requirements line 324 occur on that line.
  - `src/index.ts:102` (baseline description) contains neither `search_topic` nor `search_instant`. That confirms line 201's statement that "Mô tả baseline không nhắc tên tool".
- **Live API.** 17 GET requests were sent to `https://suttacentral.net/api` on 2026-10-24, plus one `suttaplex/dn16` lookup. All returned HTTP 200 with no transport failures, so no run was invalid and nothing was rerun. Bodies went into a fresh `mktemp -d` directory, which was deleted afterwards.

| Request | Spec literal | Measured |
|---|---|---|
| `parallels/dn16` | 43 anchors, 162 entries, 321,012 B (line 131), "khoảng 321 KB" (line 260) | 43 keys, 162 entries, 321,012 B |
| `parallels/dn22` | 7 keys, 27 entries, 77,799 B, "khoảng 78 KB" | 7 / 27 / 77,799 B |
| `parallels/sn56.11` | 26,145 B | 26,145 B |
| `parallels/mn1` | 3,949 B | 3,949 B |
| `parallels/mn` | `{}` (2 B) | 2 B |
| `parallels/dn16?language=vi` | `language` does not shrink the body | 321,285 B (larger) |
| `bilarasuttas/dn16/sujato` | 633,489 B, "khoảng 633 KB" | 633,489 B, 7 keys × 1664 |
| `bilarasuttas/dn16` | 344,559 B, no `translation_text`/`comment_text`, "khoảng 345 KB" | 344,559 B; keys `html_text, root_text, variant_text, reference_text, keys_order` |
| `bilarasuttas/mn10/sujato`, `bilarasuttas/mn10` | 97,200 B / 53,498 B | 97,200 / 53,498 B |
| `bilarasuttas/dn22/sujato` | "khoảng 158 KB" | 158,090 B |
| `bilarasuttas/dn/sujato` | `{"msg": "Not Found"}` | 20 B |
| `bilarasuttas/dn16/sujato?lang=vi` | (`lang` "chỉ đổi ngôn ngữ", line 131) | **475,208 B, `translation_text` absent.** See S1. |
| `suttaplex/mn10` | "khoảng 13 KB" | 12,962 B |
| `menu/sutta` | "khoảng 3 KB" | 2,863 B |
| `menu` | 168,235 B | 168,235 B |
| `search/instant?query=mindfulness&language=en` | `140,685` (FR-6, AC-10) | 140,685 B |

Every literal the revision added reproduces exactly.

**Latency this round:** `parallels/dn16` 8.79 s, `menu` 6.00 s, `bilarasuttas/mn10` 5.25 s, `search/instant` 1.13 s. See S2.

## Critical Findings

None.

## Warnings

None.

## Suggestions

### S1: Line 131's parenthetical "`lang` chỉ đổi ngôn ngữ" is false for a `lang` the translator lacks

Line 131 ends: "Hai endpoint này không có tham số nào thu nhỏ body (`language`/`lang` chỉ đổi ngôn ngữ)."

For `language` on `parallels` this holds: `dn16?language=vi` comes back slightly larger, at 321,285 B. For `lang` on `bilarasuttas` it does not hold.

- `suttaplex/dn16` lists `sujato` only with `lang` `en`.
- `bilarasuttas/dn16/sujato?lang=vi` returns 475,208 B, against 633,489 B without `lang`.
- The body keeps `comment_text, html_text, root_text, variant_text, reference_text, keys_order` and drops `translation_text`.

So a mismatched `lang` drops `translation_text` silently. That is the same kind of change as omitting `author_uid`. FR-14 line 250 already classes that case as "đổi nội dung, không phải thu hẹp".

This does not make FR-14's guidance wrong. "Không có tham số nào thu nhỏ" is still the right advice, because dropping the translation is not narrowing. That is why this is a Suggestion and not a Warning. The evidence row is still inaccurate, though, and the design author will read it.

**Fix:** reword the parenthetical to something like "`language` chỉ đổi ngôn ngữ; `lang` không khớp bản dịch của `author_uid` thì body mất `translation_text` (`dn16/sujato?lang=vi`: 475,208 B), là đổi nội dung, không phải thu hẹp". Optionally, add the same clause next to the `author_uid` sentence in line 250.

### S2: The latency range for the four new endpoints is exceeded again

Line 136 and NFR-6 (line 376) give "0.26–4.09 s mỗi GET tới bốn endpoint mới, quan sát đến nay". This round measured three GETs to those endpoints above that range:

- `parallels/dn16`: 8.79 s;
- `menu`: 6.00 s;
- `bilarasuttas/mn10`: 5.25 s.

The range is hedged, and the 30 s harness wait still covers every observation, so nothing downstream changes. It is the second round in a row that has had to widen the range, though. A hedged ceiling ("thường dưới 10 s; tối đa đo được 8.79 s, `parallels/dn16`") would stop the row from needing another edit.

## Re-review boundary

Admissible candidates for this round:
- review 2's W1, W2 and S1–S3;
- the text changed to fix them: line 25, line 36, line 131, line 136, FR-6 line 201, FR-14 lines 245/250/255/260/265, FR-20 line 324, NFR-6, AC-10 line 490, AC-11 lines 499-504, and clarifications lines 55/57/81/185;
- the new live literals.

| Review 2 item | Status | Evidence |
|---|---|---|
| W1: false division-uid narrowing for `get_parallels`/`get_bilarasuttas` | **Resolved** | Line 250 and line 260 now say size depends on the sutta and that no parameter shrinks output. They give measured examples, and they state that a division uid gives `{"msg": "Not Found"}` / `{}`. The general bullet (line 245) no longer promises a narrowing parameter for every tool, and it requires every number to be measured. Line 131 adds the evidence row. AC-11 lines 502-504 check the two tools positively and also check the negative: no description claims large output for a division uid. Clarifications line 81 matches. All numbers reproduce (table above). |
| W2: second `search_topic` on master-spec `:300` | **Resolved** | FR-20 line 324 names both phrases ("trái chủ trương `search_topic` khớp đúng API" and "Claude đã ghép được `search_topic` với `get_parallels`"). `:300` has exactly 2 matches. |
| S1: AC-10 mechanical | **Applied** | FR-6 line 201 pins `desc_new === desc_base + " " + S`, drops the tool-name exemption with a stated reason (verified at `src/index.ts:102`), and requires the literal `140,685` in `S`. AC-10 line 490 applies the content checks to `S` only. |
| S2: locked-decision block | **Applied** | Line 25 is back to the bare rename. The size sentence moved to the C3 bullet (line 36) with "không phải một phần của quyết định 2". Clarifications line 10 matches. |
| S3: latency range | **Applied** | Line 136 and NFR-6 add `search/instant` up to 7.60 s. New data exceeds the four-endpoint range; see S2 of this report. |

**Regressions:** none found. FR-14's `get_suttaplex` and `get_menu` lines keep the user's C3 examples and gained measured sizes: 12,962 B ≈ 13 KB and 2,863 B ≈ 3 KB. AC-11 still checks both. The FR-14 restructuring left no residual "uid của sutta, không phải uid của division" wording for `get_parallels` or `get_bilarasuttas` in either file (grep for `không phải uid` gives 0 matches).

**Considered and discarded as out of scope or not defects:**
- **Whether AC-10 should also check that `S` says `suttaplex` is returned whole.** FR-6 requires it. AC-10 checks the `hits`-only paging point, which carries the same information, and review 2's S1 asked only for the `140,685` anchor.
- **Whether AC-11's negative clause (line 504) is mechanical.** It is a read check, like the rest of AC-11's description checks, and that structure was settled in review 2.
- **The five decisions, the C1/C3/C4 answers, and the parts of review 1 and review 2 that were already accepted** (shape rows, FR prefix, FR-20 ranges). These are unchanged by this revision.

## Strengths

- All 16 measured literals in this revision reproduce byte-exact or within the stated rounding. That includes the new `dn16` anchor/entry counts (43/162) and the `dn16` body without `author_uid`, with its exact key set.
- The W1 fix replaces the wrong advice instead of hedging it. It separates "content change" (omitting `author_uid`) from "narrowing", which is the distinction S1 extends to `lang`.
- AC-11 now has a negative check aimed at the exact defect review 2 found. That closes the gap that let the false hint through.

## Summary

Review 2's two Warnings and three Suggestions are resolved or applied. The fixes introduced no regressions, and every new live literal reproduces.

Two optional accuracy edits remain:
- **S1:** the evidence row says `lang` only changes language, but a `lang` the translator lacks drops `translation_text`.
- **S2:** the four-endpoint latency range was exceeded again, by up to 8.79 s.

Neither affects an FR or AC outcome.

**Verdict:** Approve
