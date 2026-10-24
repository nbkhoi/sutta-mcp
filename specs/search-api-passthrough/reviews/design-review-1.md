# Design Review 1: search-api-passthrough

**Artifact:** `specs/search-api-passthrough/design.md` (Status: Draft, 1268 lines)
**Upstream:** `requirements.md` (Reviewed, 5 rounds), `clarifications.md` (C1–C11 resolved)
**Reviewed:** 2026-10-23
**Scope:** full design, first review. No re-review boundary applies.

## Method

All checks ran in a temporary `git worktree --detach` at `d972fa6` under `mktemp -d`. The worktree and every temp file were removed afterwards, and no raw response was kept.

- **Assembly.** Extracted M1, I1, H1 and T1 with the design's own `blk` function and assembled `src/index.ts` using the §Lắp ráp recipe. Results: 446 / 167 / 231 lines, `tsc -p .` exit 0, and `dist/` contains only `index.js` and `search.js`.
- **Grep invariants.** On `src/index.ts`, NFR-5 gives 3 / 3 / 0 / 4, and the URL-construction grep gives 0. On `src/search.ts`, all of them give 0. The FR-4 grep over `src/*.ts` gives 0, and `^(let|var|const) ` gives 0 in `src/search.ts`.
- **Fixtures.** Ran F2 live, then F3, then F4.
  - F2 gave 3 × `OK … 200`.
  - Raw bodies were 38,333 / 309 / 128,843 B.
  - Trimmed fixtures were 4591 / 580 / 10052 B, 15,223 B in total.
  - F4 printed `EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch`.
  - Every literal in the §Fixture table matched byte for byte.
- **Unit tests.** `npm test` gave `# pass 11`, `# fail 0`. It gave the same result with the AC-13 `NODE_OPTIONS` no-fetch preload. A probe test confirmed that the preload reaches the test process (`fetch("x")` throws `network disabled`). `grep -rn -E 'fetch|src/index' test/` exits 1.
- **Mutations (V1).** All four reproduce the design's table exactly:
  - (a) FR-6, FR-8
  - (b) FR-2, FR-2a, FR-3
  - (c) FR-2, FR-2a
  - (d) FR-3

  Each one has `changed=1` and exit 1, and the restored copy exits 0. I also reasoned through the natural alternative wrong spellings: filtering before `arraySection`, `language` defaulting to `en`, parse-then-reserialise in `json`, sorting, and deduplication. Each one breaks a literal in FR-2, FR-5 or FR-6.
- **Live harness (V2) on the assembled build.**
  - AC-1: 21 `suttaplex`, SN 22.59, `hits: 0`, `total` 21, keys `query,language`.
  - AC-2: 10 hits, `hits[0]` is `an1.378-393/vi/minh_chau` by Thích Minh Châu, `total` 185, `["vi","pli"]`.
  - AC-3: the exact 10-URL order, and `suttaplex[0]` is AN 6.100.
  - AC-4: `content[0].text === curl` body.
  - AC-5: the `error` block with 3 suggestions.
  - AC-6: `null` in both formats.
  - AC-9: 7/7 `-32602`.
  - AC-11: the schema and every required and forbidden description string.
  - Two AC runs were invalid (`fetch failed`) and passed when rerun.
- **A/B (V3, V4).** The final run gave `AB-OK 6/6`, with the same payload sizes as the design (2509 / 6790 / 56 / 2715 / 463 / 2243 B). Three earlier attempts ended in `STOP` (see W1).
- **Documentation blocks.** Applied every block with the AC-15 rebuild recipe.
  - The AC-15 grep matches 0 lines in README and AGENTS.md. In the master spec it matches exactly 2 lines (`:296`, `:376`), both of which give the history.
  - No stale `topic` / `match` / `page` / `search_topic("…")` text remains in the three files.
  - The M-2 claim holds live: `niệm xứ`/`vi` returns 9 `suttaplex` (`an5.122`, `an6.25`, `an6.9`, `dn22`, `mn10` "Kinh Niệm xứ", `sn43.5`, `ma98`, `sa605`, `sa606`) and 0 hits.
- **Upstream.** Read `server/src/search/view.py` `InstantSearch.get` and `instant_search.py` from `suttacentral/suttacentral` through `gh api`. The following match the design's claims about the API:
  - `query.replace('+', ' ')` comes after Flask decoding, then `strip()`.
  - `matchpartial == 'true'`.
  - `selectedLanguages` goes through `json.loads`, with a fallback to the default.
  - `restrict == 'all'` becomes `None`.
  - Responses are cached with `@cache.cached(timeout=600)`.

  Live search results carry a numeric `difficulty` (`mindfulness`/`en`: `[3,2,2]`), so the `Difficulty: 2` literal in T1 FR-7 has a realistic shape.
- **Workflow contract.** `shasum -a 256 AGENTS.md` = `efea3016…7f08`, which equals the pinned `context:agents`. The five contract-update functions named in §Thứ tự áp dụng exist in `lib/workflow_contracts.py` (`:133`, `:189`, `:244`, `:279`, `:323`).

## Critical Findings

None.

## Warnings

### W1. The harness rule for invalid runs is broader than NFR-6, and its retry cap has no defined outcome

**Requirement.** NFR-6 (requirements `:330-333`) lists the invalid runs exactly: "`fetch failed`, timeout, thiếu/thừa dòng `"id":2`, HTTP 000". It also says "Mismatch trên một lần chạy **hợp lệ** thì dừng và báo, không chạy lại." It sets no retry cap.

**Design, part (a): classification.** Design `:1024` and V2 `:1060` also classify two other results as invalid:

- any tool result whose text starts with `SuttaCentral API error:`, which is a well-formed non-2xx HTTP response;
- an empty text.

`if (t === "" || t.includes("fetch failed") || t.startsWith("SuttaCentral API error:"))` → `process.exit(3)`.

A non-2xx status is a valid response under NFR-6. It is the exact symptom of a URL-construction regression. For example, a drift that sends `limit=undefined` or a negative `offset` gets HTTP 500 from SC (requirements `:91`). Under V2, such a run is rerun as "invalid" instead of being halted and reported as a mismatch. An empty text is likewise a regression symptom, not a transport failure.

The design does not acknowledge that it departs from NFR-6.

**Design, part (b): cap.** The design adds a cap: "chạy lại, tối đa 3 lần" (`:1024`), and V3 `:1108` reads `STOP: 3 cặp không hợp lệ liên tiếp`. Neither place says what an implementer does after the cap is reached. Is it a failed AC, a halt-and-report, or a fresh attempt? NFR-6 has no cap.

This path is not hypothetical. In this review, three of four full V3 runs ended in `STOP` at input 2 (`get_sutta mn10`). In every pair, exactly one side failed with `fetch failed`. The fourth run printed `AB-OK 6/6`. The design reports a single invalid pair on its own run (`:1087`), which understates how often the cap is reached.

**Fix.**

- Make V2's invalid set exactly NFR-6's list: no `id:2` line or a duplicate one, a timeout, or `fetch failed`. Treat `SuttaCentral API error:` and empty text as valid results, which are then compared against the AC and halt on mismatch.
- Either drop the cap, or state what `STOP` means. For example: "STOP is not a result. Rerun `ab.sh` after a pause. Only `MISMATCH` halts."

## Suggestions

### S1. "Theo thứ tự thô" is neither implemented nor checked

Data Model `:102` says the fixture `body` keeps the top-level keys "theo thứ tự thô", and F4's comment at `:732` says "cùng key cấp cao và cùng thứ tự". In practice:

- F3 (`:771`, `pick`) emits keys in the order of its `TOP` list.
- F4 builds `expected` with the same `TOP` order (`:806`).
- So the check `Object.keys(fx.body)` vs `Object.keys(expected)` at `:812` compares TOP order with TOP order.

The raw order happens to be the same today (`total, hits, suttaplex, fuzzy_dictionary[, error]`, measured on all three raw bodies), so nothing breaks. Either say "in `TOP` order", or compare with `Object.keys(raw)` filtered to `TOP`.

### S2. The `text` sizes in the Performance table were not measured on the real source line

Table `:1006-1011` gives `anatta`/`en` 4,217 B, `vô ngã`/`vi` 4,331 B, and `vô ngã`/`vi`/`["vi","pli"]` 10,709 B. The harness on the assembled build measured 4,284 / 4,408 / 10,831 B (`Buffer.byteLength` of `content[0].text`).

Each difference equals the request URL's length minus 1 (68, 78 and 123 characters). So the design's figures were taken with a one-character placeholder URL. This does not affect any decision, but these are unhedged measurements.

### S3. Wrong evidence cited for the silent drop of an unknown key

§I1, H1 Tính chất (`:413`) says "Key lạ như `topic` đã bị zod bỏ trước handler (FR-1, đo AC-9.7)". AC-9.7 is `{"topic":"x"}` without `query`, which is a *rejection*. The silent-drop evidence is the input `{"query":"m","topic":"x"}` from review 1, quoted in FR-1 (`:135`). Cite FR-1 instead.

## Strengths

- **Literals reproduced exactly.** Every self-reported measurement I could reproduce did reproduce:
  - fixture bytes and contents;
  - `EQUIV-OK 21`;
  - `# pass 11`;
  - the mutation table, including which cases fail;
  - line counts 436 / 446 / 167 / 231;
  - A/B payload sizes;
  - the M-2 live result.
- **The verbatim normative blocks can be checked by machine.** The `blk` + `diff` recipes for code (§Lắp ráp) and documents (README-OK / MASTER-OK / AGENTS-OK) turn conformance into a diff. The FR-2a seam (`url` passed bare to `fetch` and to `renderSearch`) is visible in a four-line handler.
- **No home-made logic.** M1 decides only presentation: the absent-or-empty rule from FR-7/FR-8, and the `/` prefix test from C5. Every array element is printed, in API order. `json` is `raw` without parsing. FR-15 holds structurally, because module scope has only `type` and `function`.
- **The fixture design ties each fixture to its request.** `params` is stored with each fixture, and `buildSearchUrl(params) === url` is asserted in T1 and F4. The equivalence check removes highlights by substring rather than by line, which is justified by measured multi-line highlights. It caught a deliberate `author_uid` deletion, according to the design.
- **The AGENTS.md drift sequencing in §Thứ tự áp dụng matches FR-21.** The contract hash and the function names are correct. Q1, which proposes changes to `:26`, `:28` and `:30` beyond FR-21's list, is raised openly as a question for the user and is not decided silently.

## Summary

I checked the design against every FR and AC. The code blocks assemble, compile and pass the tests. The four FR-18 mutants are caught. The live ACs (1–6, 9, 11, 12) pass on the assembled build. The upstream API claims hold against `view.py` and `instant_search.py`, and no home-made logic is reintroduced.

There is one Warning. The live-harness rule for invalid runs (V2/V3) treats non-2xx results and empty text as invalid, which goes beyond NFR-6. Its 3-try cap ends in a `STOP` with no defined outcome, and I hit that cap in 3 of 4 A/B attempts. There are three minor Suggestions about wording and measurements. Q1 is still open for the user at the design pause.

**Verdict:** Approve with changes
