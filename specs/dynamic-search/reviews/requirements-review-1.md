# Requirements Review 1: dynamic-search

**Reviewed artifact:** `specs/dynamic-search/requirements.md` (Draft, 2026-10-18)
**Gate:** phase-review, scope `artifact/requirements`, series `requirements-review`, report 1
**Contract sha256:** `5148c63967787c7f3d1cf01e678543fd412d43e1984cf5eb4b30e78cf87a4e0f`
**Inputs:** `specs/sutta-mcp-requirements.md` (roadmap item 1, Tool 1, Constraints), `src/index.ts` @ `40846bb`, `AGENTS.md`, template `requirements.md.tmpl`
**Out of scope by dispatch:** the recorded user decision (2026-10-18) to map Vietnamese keys to Pali/English and always call the search API with no `TOPIC_INDEX` fallback.

## Verification performed (2026-10-18)

- **Live API** (`curl -G .../api/search/instant`, `limit=10`): 21 candidate terms × `en`/`vi`, plus `mindfulness`, `nibbana`, `anatta`, `satipatthana`, `xyzzyqq`, `foo:bar`, the raw `vô ngã`/`niết bàn`/`chánh niệm`/`khổ`, and `paticca-samuppada`/`paticcasamuppada`. I applied the FR-7 filter and the FR-6 merge myself.
  - Every `suttaplex`/`hits-after-FR-7` pair in the §Ánh xạ table (lines 76-89) matches exactly, for example `four noble truths` 12/7 and 0/7, `satipatthana` 3/4 and 3/9, `mindfulness` 32/8 and 0/9, `refuge` 2/7 and 0/7.
  - `chánh niệm` → `satipatthana` puts `mn10` 2nd with both `language` values.
  - `mindfulness`/`en` returns 32 suttaplex + 8 hits, `total` 1461. `xyzzyqq` returns `total` 0. `foo:bar` returns `error.message` = `Unknown filter: "foo:"`.
  - Raw `khổ`/`en` returns `total` 3758. `vô ngã`/`vi` returns 21 suttaplex, `niết bàn` 20, and `chánh niệm` 2 (`sn47.2`, `sa610`).
  - `paticca-samuppada` gives 0 sutta results after filtering. `paticcasamuppada` gives 1/3.
  - Every `suttaplex` element has `type: "leaf"`. Normal hits never carry `category`. The dictionary hit has exactly the keys `category, heading, highlight, url`.
  - AC-7 literals hold: `MN 10`, `The Discourse on Mindfulness Meditation`, `difficulty` 2, `parallel_count` 16, a blurb beginning `Here the Buddha details the seventh factor`, and `an8.19` in `hits`.
- **GET vs POST:** POST with body `[]` gives 1471, POST with `["en"]` gives 1461, and POST with no body gives HTTP 415. The upstream `view.py` (fetched from `main`) matches every citation:
  - `:12` is `@cache.cached(timeout=600…)`.
  - `:18` sets the `limit` default to 10.
  - `:28` is `default_languages = '["en", "pli"]'`.
  - `:65` is `selected_languages = request.get_json()`.
  - The latest commits are `11b6dba` (committed 2026-08-31) and `f205bd3` for `instant_search.py` (committed 2026-02-26).
  - Every cited `instant_search.py` anchor resolves: `:254`, `:348`, `:376`, `:956`, `:963`, `:1675`/`:1678`, `:1727`, `:1795`. `get_lang_condition_for_aql` returns `''` for a non-list or empty list, so the stated mechanism is correct.
- **Code:** `TOPIC_INDEX` spans `:35-97` with 38 keys (24 English/Pali + 14 Vietnamese), and the largest UID array has 3 entries, so the "up to 3 sequential requests" claim holds. `searchByTopic` is at `:99-108` and `formatCitation` at `:142-155`. The NFR-7 baselines are 3 / 3 / 0 at `40846bb`. The third AC-3 input (line 167) really is NFD in the file (`unicodedata.is_normalized('NFC', …)` returns False).

## Critical Findings

None

## Warnings

**W1 — FR-9 has no rule for hits whose `name` is empty, a class measured live.** FR-9 (line 117) prints `**{acronym}** — {name}` and gives a fallback only for `acronym`. Live, Āgama hits by `analayo` and `huyenvi-boinwebb-pasadika` come back with `name: ''` and a non-empty `root_name`:
- `dukkha`/`en`: all 10 of `sa1`…`sa12` (`root_name` `無常`, `無知`, …).
- `metta`/`en`: `sa264`.
- `dependent origination`/`en` and `vi`: `ea21.7`.
- `three jewels`/`en` and `vi`: `sa107`.

`metta` and `three jewels` are FR-2 candidates (lines 82, 88). With the FR-6 merge, `sa264` is the 9th result for `metta`/`en` and `sa107` falls inside the 7 results for `three jewels`. A conforming implementation would therefore print a dangling `**SA 264** — ` line, and no AC pins this. It does not produce a broken link, so NFR-6 still holds, but it is an unspecified output for a case the spec's own measurements reach. Fix: specify a fallback for empty `name`, either `root_name` or omitting ` — `. Then add a pinned case, for example `{"topic":"metta"}` expecting the `SA 264` line, or record the empty title as accepted under Assumptions.

**W2 — The Constraints "Attribution … dịch giả" clause is not addressed for hit citations.** Constraints (`specs/sutta-mcp-requirements.md:284`) require naming the source, the translator, and the UID. NFR-6 turns only the link half of Constraints into a requirement. There is no NFR or assumption for attribution. FR-9 prints a hit's `name`, which is the title from *one specific translation*: for example `Hatthaka` from `/an3.35/en/bodhi`, or `Pahārādasutta` from `/an8.19/pli/ms`. Line 31 itself says every hit carries the `author_uid` of a single translation, and live hits also carry `author`/`author_short` at no extra request cost. Today's `search_topic` also prints titles without a translator, so this is not a regression. But the dispatch asks whether the shorter hit citation keeps Constraints, and the spec is silent on it. Fix: either require the translator in the FR-9 line (`author` when present), or add an explicit UNVERIFIED/default entry saying that a sutta-level citation plus a `suttacentral.net/{uid}` link satisfies attribution for search listings, and why.

**W3 — AC-5, the main AC for the non-sutta filter, has no positive check, so it passes when the tool errors.** AC-5 (lines 177-182) is made only of "không chứa" clauses. The harness rule (one `"id":2` line) is still met by an `isError: true` result, and an error text contains none of the banned strings. The most likely defect for this AC is code that dereferences the dictionary hit's `uid: null` (for example `uid.toUpperCase()` for the FR-9 acronym fallback). That defect throws, and AC-5 then passes. AC-1 and AC-2 would probably catch it only indirectly, and only if `niết bàn` is mapped to `nibbana`. Fix: add a positive check to AC-5. For example, require the `nibbana` output to start with `Tìm thấy` and contain `URL: https://suttacentral.net/an4.179`, require the `anatta` output to contain `URL: https://suttacentral.net/an6.100`, and require that neither result has `isError: true`. Both literals were measured today as the first suttaplex entries.

## Suggestions

- **S1 — The goal statement and NFR-4 disagree.** Line 15 says each tool call costs "đúng một request SC". NFR-4 (line 136) and FR-11 allow 0 requests when the topic is empty. Change line 15 to "tối đa một".
- **S2 — FR-15 misses the sample flow in the master spec.** FR-2 relies on `specs/sutta-mcp-requirements.md:257-259`. Line 259 (`Trả về: mn10, sn47.1, dn22 + blurb`) will be wrong after the change. Measured with `satipatthana`, the results are `an4.274, mn10, sn43.5, …`. AC-14's `TOPIC_INDEX` grep cannot catch this because the line does not contain that token. Add line 259 to FR-15.
- **S3 — The `describe()` part of AC-14 needs a reviewer's judgement.** "mô tả hành vi FR-13" (line 240) has no string to check. FR-13 lists three facts. Pin a small set of substrings (for example `SuttaCentral`, `Anh/Pali`) so the check becomes a grep.
- **S4 — FR-4 sends unmatched queries without NFC normalisation.** An NFD Vietnamese topic outside the 14 keys is sent as NFD, while FR-3 normalises only for key matching. This is probably harmless, but state it, or apply NFC to the outgoing `query` too.
- **S5 — Upstream `view.py:22` runs `query.replace('+', ' ')`.** A literal `+` in a topic therefore becomes a space even when encoded as `%2B`. Note it under Assumptions next to the filter-syntax entry (line 259) so the design does not treat it as a client encoding bug.

## Strengths

- Every live literal I re-measured matched: 21 terms × 2 languages for the mapping table, the AC-6/AC-7/AC-8/AC-9 anchors, and the NFR-7 baselines. The upstream source citations, including line numbers and commit dates, also resolve exactly.
- All four roadmap item-1 findings are resolved with ACs:
  - Vietnamese queries: FR-2/FR-3 with AC-1/AC-2/AC-3.
  - Non-sutta hits: FR-7 with AC-5 (see W3).
  - Per-translation hits: FR-6 with AC-6.
  - GET vs POST: explained with evidence and decided in FR-1, checked by AC-11.
- The GET vs POST explanation is correct and reproduced: 1461 vs 1471, and HTTP 415 with no body. The 1471/1472 drift is honestly left unresolved, with the reason it does not matter.
- The request bound is correct. NFR-4 requires at most 1 request and 0 for an empty topic. FR-12 forbids retries and fallbacks, and AC-11 checks for exactly one `fetch` call. Today's maximum of 3 sequential requests is measured.
- Choosing to print hits as a shorter citation, rather than fetching `/api/suttaplex/` for each hit, follows from the Constraints rate-limit clause.
- The numeric `difficulty` mismatch with `formatCitation()` was caught before design and is pinned by AC-7.
- Q1 and Q2 are product choices the user owns: result count/relevance ordering, and the regression for compound Vietnamese phrases. Their defaults are stated along with measured consequences (`mn10`/`dn22` fall outside the first 10 for `mindfulness`). The FR-2 requirement that `chánh niệm` include `mn10` works around the Q1 cost for the master-spec flow.
- The claim that no test runner is needed holds up. Every AC has a named way to run it: the stdio harness, a code read, grep, or a byte diff against a recorded baseline. The NFD case runs through the harness unchanged.

## Summary

The requirements are factually accurate and complete with respect to the roadmap, and every measured claim I checked reproduced. There are no blocking defects. Three Warnings should be fixed before merge:
- W1: a measured hit class, empty `name`, has no output rule.
- W2: the attribution part of Constraints is not addressed for hit citations.
- W3: the main AC for the non-sutta filter passes when the tool errors.

All three are local edits to FR-9, Assumptions, and AC-5.

**Verdict:** Approve with changes
