# Requirements Review 1: segment-id-in-get-sutta

**Artifact:** `specs/segment-id-in-get-sutta/requirements.md`
**Gate:** phase-review, scope artifact/requirements
**Contract sha256:** ba1ed234114061d5296ae8847b9d5b17bae80938dbc3cc892205b75c53967249
**Reviewed:** 2026-10-02, against `src/index.ts` at `fc5c002`, live SuttaCentral API, and SC client source at `suttacentral/suttacentral@34391d1`
**Stakeholder decisions D1–D3:** treated as fixed. Requirements were checked for consistency with them and none were found inconsistent.

## Critical Findings

None.

## Warnings

### W1: No AC tells "lang actually served" apart from "the translator's listed lang", so the most likely wrong implementation of FR-4 passes every AC

FR-4 (`requirements.md:70`) says `{lang}` is "**lang thực sự đã phục vụ** `translation_text`": `en` when the first call returns content, otherwise `retryLang`. The handler does not keep any lang value today (`:21`). A natural shortcut is to read the lang from the translator's suttaplex entry, for example `translations.find(t => t.author_uid === translator)?.lang`. This shortcut gives the right answer in every AC case:

| AC case | First suttaplex entry for translator | Served lang | Shortcut result |
|---|---|---|---|
| AC-1 `mn10/sujato` | index 6, `en` | `en` | same |
| AC-2 `dhp1-20/phantuananh` | `vi` | `vi` | same |
| AC-3 `mn10/sabbamitta` | `de` | `de` | same |
| AC-3 `mn10/trush` | index 14, `gu` | `gu` (tie-break) | same |

I checked live (2026-10-02) for a case where the two differ. **`snp1.8` + `piyadassi`** is one:
- `/api/suttaplex/snp1.8` lists `piyadassi` at index 11 as `lang: "en"`, `segmented: false`, and at index 27 as `lang: "lt"`, `segmented: true`.
- `/api/bilarasuttas/snp1.8/piyadassi` (no `lang`) has no `translation_text`. `?lang=en` also has none. `?lang=lt` returns `translation_text` with 42 non-empty segments, and the first is `snp1.8:0.1` → `Suttų rinkinukas 1.8`.
- The current retry `find` (`src/index.ts:261-263`) picks `lt`, so content is served and FR-4 requires `https://suttacentral.net/snp1.8/lt/piyadassi#`. The shortcut would give `…/snp1.8/en/piyadassi#`, which points to the non-segmented English page. That page has no `<span class="segment" id=…>` elements to scroll to, and it names the wrong language.

This is the predicate-cardinality gap recorded for this project (one `author_uid` can map to several langs on one uid). The FR wording is correct, so this is a Warning, not a Critical. But no AC can catch the divergence.

**Fix:** Add an AC, or a clause in AC-3, for `{"uid":"snp1.8","translator":"piyadassi"}`:
- body line 1 is `[snp1.8:0.1] Suttų rinkinukas 1.8`
- output contains `https://suttacentral.net/snp1.8/lt/piyadassi#` and does not contain `https://suttacentral.net/snp1.8/en/piyadassi`
- the output ends with exactly `[Hết văn bản — 42 đoạn]`

Re-fetch these before pinning them.

### W2: The byte-identical text check in FR-2 / AC-4 has no step that captures the baseline

FR-2 (`:63`) requires the text after the ID prefix to "trùng từng byte với dòng mà phiên bản hiện tại in ra". AC-4's last clause (`:142`) checks this against "194 dòng thân do bản trước thay đổi in ra cho cùng lời gọi". The harness always runs a freshly rebuilt `dist/` (harness rule 1, `:102`). Once the change exists, there is no "previous version" output left to compare with, and no AC says when to save it or where. This is the "byte-identical to before with no baseline-capture step" anti-pattern.

**Fix:** Do one of these:
- (a) Before any code change, build HEAD, run `get_sutta '{"uid":"mn10","translator":"sujato","max_segments":500}'`, save the decoded body lines to a named temp file outside the repo (delete it at the end, as NFR-2 requires), and diff against it.
- (b) Use a reference that is independent of the code version: derive the 194 lines from live `/api/bilarasuttas/mn10/sujato` as the `.trim()`-ed non-empty string values in key order. I checked that this gives 194 lines, `mn10:0.1` first and `mn10:47.4` last.

Name the chosen vehicle in AC-4.

## Suggestions

### S1: Segment IDs can contain hyphens, and §Hình dạng API doesn't record this

Fact 3 (`:37`) notes that IDs do not always contain a dot (`dhp9:0`). Live data also has **hyphenated** IDs:
- `mn10/sujato`, `mn10/sabbamitta` and `mn10/trush` all contain `mn10:18-23.1`, `mn10:18-23.2`, `mn10:18-23.3` and `mn10:26-28.1`.
- On `sujato` these values are non-empty. The first one is body line 63 under `max_segments: 500`.

AC-1's regex `^\[mn10:[0-9][0-9.]*\] \S` (`:112`) only applies to the first 50 lines, so it still passes. If anyone extends it to the full 194-line run of AC-4, it fails. FR-1 already says IDs are printed verbatim, so behaviour is not at risk.

The SC hash handler splits on `--` (`sc-text-bilara.js:89`), and a single `-` is not affected. So deep links to these IDs should work, but nothing has checked this.

Consider:
- adding the hyphen class as fact 3a
- adding one hyphenated URL to AC-7, for example `https://suttacentral.net/mn10/en/sujato#mn10:18-23.1`

### S2: How body lines are counted depends on how design words the header

The rule "Dòng thân thứ k đếm từ dòng đầu sau dòng trống kết thúc header" (`:102`) assumes the header has no blank line inside it. FR-4 (`:71`) leaves the exact deep-link text, including the "chỉ dẫn nối segment ID vào sau", to design. That could reasonably become a URL line plus an explanation separated by a blank line, and then every "dòng thân k" literal in AC-1..AC-4 would be off by some lines. Consider adding a constraint to FR-4 or the harness paragraph that the header has no blank lines. Alternatively, define the body as the lines between the blank line after the second `─`×60 rule and the blank line before the tail.

### S3: FR-7 lists N1-A, N1-B and N3-B, but carrying IDs will most likely change `type ExtractedText`

The likely way to carry IDs is to change `ExtractedText` (`src/index.ts:115-117`) and the comment above it, "Non-empty tuple mã hóa FR-1" (`:112`). Both are outside the N1-A `awk` range. The predecessor design shows this type at `specs/non-segmented-translation-guard/design.md:55` and marks it non-normative (`:88`). Neither FR-7 nor AC-6 would flag that illustration going stale. You could add a line to FR-7 saying that design.md also records changes to the type and its comment, even though no byte-diff is needed.

## Re-review Boundary

Not applicable. This is the first review in the `requirements-review` series.

## Strengths

Every claim I could check independently held up:

- **API shapes and literals (live, 2026-10-02):**
  - `mn10/sujato`: 235 keys / 194 non-empty / 167 distinct; 41 empty keys starting `mn10:3.6`, `mn10:4.9`, `mn10:4.10`; segments 1/3/50 and the last one (`mn10:47.4` → `Satisfied, the mendicants approved what the Buddha said.`) are exact; the body includes `comment_text`.
  - `dhp1-20/phantuananh?lang=vi`: 108 / 108, segments 1/3/50 exact (`dhp9:0`), last `dhp20:7`; no `translation_text` without `lang`.
  - `mn10/sabbamitta?lang=de`: 200, and segment 50 is `mn10:12.0` → `1.5. Den Geist auf die Elemente richten`.
  - `mn10/trush?lang=gu`: 230, segment 1 exact.
  - Key order matches the filtered `keys_order` in all of these.
  - Suttaplex: `trush` at index 14 `gu` and 15 `hi`; `dhp1-20` returns uid `dhp1-20`.
  - Guard cases: `mn10/minh_chau` with and without `?lang=vi`, and `thag1.1/indacanda` with and without `?lang=vi`, still have no `translation_text`.
- **Client source citations at `34391d1`:** I fetched all of them and they match exactly: route table `sc-page-selector.js:303-311`, segment span `sc-text-page-selector.js:518-520`, hash handler `sc-text-bilara.js:88-91` / `:477-492`, re-invocations `:327` / `:1135`, `checkIfMultiSutta` `:209-228`, `_addSCReferenceAnchor` `:1063-1077`. The argument that the roadmap's deep-link form is wrong is well supported and correctly attributed to source reading. AC-7 is the right stop-check for the part that is still unverified.
- **Code and spec baselines:**
  - NFR-7 counts are 3 / 3 / 0.
  - The N1-A `awk` byte-diff between `src/index.ts` and the predecessor design is empty today (19/19 lines), so AC-6 holds at baseline.
  - The gate string appears exactly once.
  - The heredoc is at `non-segmented-translation-guard/requirements.md:180-196`.
  - Master spec line refs `:174`, `:278`, `:308` are correct, and AC-8 baselines are 1 / 0 / 0.
- **Spec construction:**
  - The mechanised clauses I ran against the unmodified repo don't fail there: AC-5's negations, the AC-6 diff, and the AC-8 baseline counts.
  - Every negation-heavy AC has a positive anchor, and the `"id":2` presence rule is inherited.
  - NFR-4's request count (2, or 3 on retry) matches `src/index.ts:250-265`.
  - Range-UID IDs (`dhp1-20` → `dhp1:…`), dot-less IDs, empty-translation gaps and duplicate values all have a requirement and an AC.

## Summary

The requirements are well researched. Every pinned literal, line reference and upstream source citation I re-measured is correct, and the D1–D3 decisions are applied consistently in FR-1, FR-4, NFR-5 and the ACs. There are two Warnings:
- **W1:** the AC set never runs a case where the served lang differs from the translator's first listed lang. `snp1.8/piyadassi` (listed `en`, served `lt`) is a live example and should become an AC.
- **W2:** the "byte-identical to the previous output" check in AC-4 has no step that captures the baseline.

The three Suggestions are about hyphenated segment IDs, a body-line counting rule that depends on how design words the header, and the non-normative `ExtractedText` type that FR-7 does not cover.

**Verdict:** Approve with changes
