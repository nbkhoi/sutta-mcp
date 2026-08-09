# Code Review: on-completion — bilara-lang-param (full feature)

**Date:** 2026-08-09
**Reviewer:** code-reviewer (Claude Code subagent)
**Purpose:** on-completion
**Scope:** full feature — `git diff` vs base `master @ 71d238b` on branch `feature/bilara-lang-param`
**Verdict:** Approve
**Spec conformance:** ✅ — every in-scope design element and AC maps to code/text that exists; nothing beyond the spec was added

## Verification method (read this before the findings)

Static verification only. I did **not** re-run the live JSON-RPC harness, and I did not run
`npm run build`. Reasons, in order of authority:

1. My operating rules for this role forbid re-running the build or test suite at review time —
   the implementer already ran it, and a re-run is to be *recommended*, not executed.
2. Project memory (`.claude/agent-memory/code-reviewer/project_review-verification-protocol.md`)
   records the same protocol for this repo specifically: the harness makes real network calls to
   `suttacentral.net` with a `sleep 20` per case, so review evidence comes from verbatim `diff`
   against `[NORMATIVE]` blocks, the grep-invariant table, `tsc --noEmit`, and `git diff` scope.

What I did instead, to avoid simply trusting the `Result:` fields in `tasks.md`:

- **Byte-exact `diff`** (not grep) of all four normative code/text surfaces, plus the two
  predecessor N1 blocks against *both* the predecessor `design.md` and the `master` baseline.
- **`npx tsc --noEmit -p tsconfig.json` → exit 0.** Read-only; does not write `dist/`.
- **Build-currency check** rather than a rebuild: `dist/index.js` (mtime `Aug 9 22:43`) is newer
  than `src/index.ts` (`22:04`) and contains the compiled retry block at `dist/index.js:210-212`
  plus the `?lang=` template at `:16`. The harness runs `dist/`, so the recorded harness results
  were produced against this fix, not a stale build. This is the single most load-bearing thing a
  reader would want re-verified, and it holds without a network call.
- **Every "= 0" clause proven non-vacuous** against `git show master:<path>` (or another file
  known to contain the string), and every matcher run through `grep -F -f <pattern-file>` built
  from a `<<'EOF'` heredoc — never a quoted string inline. Both quoting traps named in the
  dispatch were avoided by construction.
- **Cross-checked the `Result:` numbers against the code path that would produce them** rather
  than re-measuring: `find` over `translations` with `gu` at index 14 before `hi` at 15 ⇒ `gu`
  ⇒ 230 segments (T-3-4); `xyzzy` has no `author_uid` match ⇒ `find` returns `undefined` ⇒ the
  `if (retryLang)` branch is dead ⇒ 2 requests (T-3-6); `sujato`'s first call returns
  `translation_text` ⇒ `source === "translation"` ⇒ retry block not entered (T-3-5). All three
  are consistent. T-3-4 additionally records independent, non-numeric evidence that the `gu`
  branch was taken (Gujarati script in the body, not Devanagari) — that is not a number that
  could be transcribed wrongly and still look right.

**Recommendation, not a finding:** if you want independent live confirmation of AC-1/AC-2/AC-2b/
AC-3/AC-4, re-run the harness yourself. The static evidence establishes that the code implements
the specified rule and that `dist/` is current; it cannot re-observe upstream.

### Static results

| Check | Result |
|---|---|
| N3-A `fetchBilaraText()` vs `design.md:98-103` | `diff` empty, exit 0, 6/6 lines |
| N3-B retry block vs `design.md:112-123` | `diff` empty, exit 0, 12/12 lines |
| N1-A `extractText()` body vs predecessor `design.md` | `diff` empty, exit 0, 19/19 lines |
| N1-A vs `master:src/index.ts` | `diff` empty, exit 0 — byte-unchanged |
| N1-B gate block vs `master:src/index.ts` | `diff` empty, exit 0, 10/10 lines |
| Gate string `extracted.source !== "translation"` | 1 hit (baseline 1) |
| `git diff -U0 -- src/index.ts` | exactly 2 hunks; gate string 0 hits, `extractText` body tokens 0 hits — both proven non-vacuous (same pattern files give 1 and 3 hits on `src/index.ts`) |
| `tsc --noEmit` | exit 0 |
| N4 invariants: `segmented` / `translation_text` / `Object.keys` / ` as ` / `sujato` | 3 / 1 / 2 / 2 / 3 — identical to `master` baseline |
| Translator-ID regex (`phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush`) | 0 hits now, 0 on `master`; non-vacuous (52 hits on this spec's `requirements.md`) |
| Module-scope function list vs `master` | identical except `fetchBilaraText`'s signature — no new function, NFR-5's "≤ 1 new helper" quota unused |
| `fetch(` call sites | 3, unchanged; endpoints still only `/suttaplex/`, `/bilarasuttas/`, `/parallels/` (the last is `fetchParallels()`, another tool — the baseline carve-out from requirements-review-2 W1) |
| `package.json` / `package-lock.json` diff | empty (NFR-1) |
| New files under `src/` | none (NFR-2) |
| AC-7 whole-file matchers | `nhưng không được phục vụ` 0 (baseline 2 @196,250); `đi vào **cùng nhánh guard** như AC-1` 0 (baseline 1 @258); `Trả lời được có thể mở khóa` 0 (baseline 1 @375); `bilara-lang-param` 9 (baseline 0), first hit line 7 < heading line 17 |
| AC-7 AC-5 slice | 8 lines (baseline 16); `bilara-lang-param` 4 (baseline 0); all four negative clauses 0 (baseline 1 each) |
| AC-7 conditional NFR-4 clause | `NFR-4` @14 < heading @17 — errata supersede line present (FR-7.5 correctly activated by retry-on-miss) |
| AC-7 predecessor file scope | only `requirements.md` modified; `design.md`/`tasks.md`/`clarifications.md`/`reviews/` diff empty |
| AC-8 master-spec matchers | `vẫn không trả` 0, `Câu hỏi mở (chưa điều tra)` 0, `không dự đoán được` 0, `Trả lời được có thể mở khóa` 0 (each baseline 1); `?lang=` 3 (baseline 0) @121,298,304; `bilara-lang-param` 1 (baseline 0) |
| All 8 normative text blocks vs `design.md` | `diff` empty for each: predecessor (1) errata `175-183`→`7-15`, (2) AC-5 `189-194`→`260-265`, (3) `200`→`206`, (4) `206`→`377`; master (a) `216`→`304`, (b) `222`→`298`, (c) `228`→`300`, (d) `234`→`121` |
| Doc diff shapes | predecessor 4 hunks (`+7,10` / `196→206` / `250,14→260,6` / `375→377`); master 4 one-for-one line hunks (121, 298, 300, 304); `INDEX.md` 1 added row |

## Critical Findings

None.

## Warnings

None.

## Suggestions

### S1: The tie-break's determinism argument omits its dependency on the suttaplex `?language=en` call

- **Where:** `src/index.ts:249` (`fetchSuttaplex(uid)`) → `src/index.ts:11`
  (`?language=${language}`, default `"en"`); rule text at `design.md:77`, determinism argument at
  `design.md:85`.
- **Evidence:** `design.md:85` — "Tính deterministic (FR-2): hai lời gọi giống nhau cho cùng kết
  quả, vì luật chỉ phụ thuộc **nội dung response suttaplex**". The rule is "entry đầu tiên …
  theo đúng thứ tự API trả về", and that array arrives from a call that always pins
  `?language=en`.
- **Issue:** The claim is true today but is conditioned on an input the rule never names. `lang`
  order in `translations[]` is a property of *that particular* suttaplex request. If anyone later
  threads a language through `get_sutta`'s suttaplex fetch (the master spec already lists a
  metadata-language direction, and requirements §Out of Scope explicitly parks it), the tie-break
  outcome — and AC-2b's pinned `Tổng: 230 đoạn` — could move without a single line of the retry
  block changing. The Risks table has a row for *upstream* reordering but not for *our own*
  request parameter changing the order.
- **Recommendation:** One clause in the `[NORMATIVE]` tie-break rule at `design.md:77` naming the
  precondition — "thứ tự API của lời gọi `fetchSuttaplex(uid)` với `?language=en`". No code
  change; this is a durability fix for the spec text so a future language change trips a spec
  obligation instead of silently moving AC-2b.
- **Spec ref:** FR-2 (mệnh đề một-nhiều, deterministic + ghi thành văn), AC-2b.

### S2: After a retry, the displayed translator name is looked up independently of the lang actually served

- **Where:** `src/index.ts:261-263` (retry picks first entry with `author_uid === translator &&
  t.lang !== "en"`) vs `src/index.ts:278-280` (name picks first entry with `author_uid ===
  translator`, no lang predicate).
- **Evidence:**
  ```ts
  const retryLang = (suttaplex?.translations ?? []).find(
    (t: any) => t.author_uid === translator && t.lang && t.lang !== "en"
  )?.lang;
  ...
  const translatorName =
    (suttaplex?.translations ?? []).find((t: any) => t.author_uid === translator)
      ?.author ?? translator;
  ```
- **Issue:** The two `find` calls can resolve to *different* entries — whenever the translator has
  an `en` entry ordered before a non-`en` entry, and the `en` doc is advertised but not served
  (exactly the `minh_chau` class). The retry then serves the non-`en` translation while
  `Translator:` renders the `en` entry's `author` string. `mn10`/`trush` does not expose this
  because both entries carry the same `author` ("Trushant Majmudar") — which is precisely why AC-2b
  calls that anchor "không phụ thuộc tie-break". So no measured case exercises the divergence, and
  no AC would catch it.
- **Recommendation:** Leave the code alone — `:278-280` is untouched pre-existing code, changing it
  would widen the diff past the design's 2-hunk shape for a cosmetic label on an unobserved path.
  Worth one line in the design's Q1/limitations note so the coupling is on record.
- **Spec ref:** FR-2 (đường bình thường output shape), AC-2b anchor rationale.

### S3: The retry makes the legacy guard path network-fragile, and that residual risk is absent from the Risks table

- **Where:** `src/index.ts:264` — `if (retryLang) extracted = extractText(await fetchBilaraText(uid, translator, retryLang));` with `src/index.ts:21` — `if (!res.ok) throw new Error(...)`.
- **Evidence:** `design.md:247` acknowledges the mechanism — "Request retry đi qua chính
  `fetchBilaraText()` — network error / `!res.ok` ném ồn ào như hiện tại" — but the Risks table
  (`design.md:310-319`) has no row for it; the closest row only prices the extra request as
  latency ("Đường guard-có-candidate … tốn 3 request thay 2 … Tác động: L").
- **Issue:** Before this change, `mn10`/`minh_chau` and `thag1.1`/`indacanda` reached the gate with
  both responses already in hand, so the guard message was guaranteed once the handler got that
  far. Now those two pairs issue a third request (they *do* have a `vi` candidate, so they always
  retry), and a 5xx or transport failure on it turns a well-formed guard response into a raw
  thrown `SuttaCentral API error: …`. That is a real behavioural narrowing of FR-5's guarantee
  under a failure mode, not just added latency.
- **Recommendation:** Do not add a catch — FR-5 forbids new error branches and swallowing here
  would be worse. Add the row to the Risks table (likelihood L, impact M, mitigation: none by
  design, guard is best-effort under transport failure) so the trade-off is recorded rather than
  discovered.
- **Spec ref:** FR-5, design §Error Handling / §Risks & Mitigations.

## Strengths

- The two code hunks are byte-identical to the `[NORMATIVE]` N3-A/N3-B blocks, comments included,
  and both predecessor N1 blocks diff to zero bytes against *both* the predecessor design and the
  `master` baseline. The `git diff -U0` mechanisation from design-review-1 S1 does its job: the
  gate string and `extractText` body appear 0 times in the entire diff output, so AC-5's "không
  hunk nào chạm" is settled mechanically rather than by interpretation.
- The hardcode ban (FR-3) holds under the read-code test, not just the cheap matcher: `retryLang`
  is sourced solely from `suttaplex.translations`, there is no translator-keyed map or literal
  anywhere on the inference path, and the one `"en"` literal is a transport constant mirroring
  `request.args.get('lang', 'en')` — argued in `design.md:69` and correct as written.
- Request budget verified by reading the path, not by trusting a number: `Promise.all` (2) plus at
  most one `await` inside a single non-looping `if` — 3 is a hard ceiling, and only the two allowed
  endpoints are reachable from `get_sutta` (NFR-6).
- All eight documentation blocks were applied verbatim from the design rather than re-drafted, so
  the AC-7/AC-8 matchers verify the text that was actually reviewed. Both counting errors the
  planning rounds caught (design-review-1 W2's "3 vs 4" hits, design-review-2 W1's line-17 heading)
  are reflected correctly in the applied result: 4 slice hits, heading at 17, 10 lines inserted.
- The retry consumes `extracted.source` and never re-reads `translation_text`, preserving the
  predecessor's single-predicate invariant — `grep -c 'translation_text'` is still 1, confined to
  `extractText()`.

## Summary

The implementation matches the design byte-for-byte on both normative code blocks and all eight
normative text blocks, leaves the predecessor's `extractText()` and guard gate byte-unchanged
against the `master` baseline, type-checks clean, and stays inside every scope and resource bound
the requirements set. No Critical or Warning findings: the three suggestions are documentation
durability items on the design (an unnamed precondition in the tie-break rule, a name/lang lookup
divergence with no live case, and an unlisted residual risk now that the legacy guard path issues a
third request). Note that this review is static by protocol — the live harness was not re-run; the
strongest substitute evidence is that `dist/index.js` post-dates `src/index.ts` and contains the
compiled retry block, so the recorded harness results were produced against this fix.
