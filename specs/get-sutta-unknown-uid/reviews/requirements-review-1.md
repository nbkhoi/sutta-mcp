# Requirements Review 1: get-sutta-unknown-uid

**Artifact:** `specs/get-sutta-unknown-uid/requirements.md`
**Gate:** phase-review, scope artifact/requirements
**Contract sha256:** 6cdfe79e455ca6ecbf6ffc454f48bbd2555db643d5627ee399b40690a6e3daeb
**Reviewed:** 2026-10-17, against `src/index.ts` at `249bb97` (working tree clean for `src/`), the live SuttaCentral API, GitHub issue nbkhoi/sutta-mcp#10, and the predecessor specs `non-segmented-translation-guard`, `bilara-lang-param`, `segment-id-in-get-sutta`.

## Re-measurement summary

Every factual literal in the artifact was re-measured. All of them match.

- **API table (`:44-58`), live curl on 2026-10-17.** `mn9999`, `mn9999?language=vi`, `MN10`, `%20mn10`, `mn10%20`, `dhp1` and `xyz-abc` all return HTTP 200 with a 1-element array and `uid: null`, `translations: []`. `dhp1-20` returns `uid "dhp1-20"`, `leaf`, 33 translations. `mn` returns 171 elements, with `[0]` being `mn`/`branch`/0 translations. `dhp` returns 27 elements, with `[0]` being `dhp`/`branch`/0 translations. `ma98` returns `leaf` with 4 translations. Bilara returns `{"msg"}` only for `mn9999/sujato` (with and without `?lang=vi`), `dhp1/sujato` and `dhp/sujato`. `ma98/sujato` and `mn10/xyzzy` return `root_text` but no `translation_text`; `mn10/xyzzy` has 235 root keys. `/api/suttaplex/?language=en` returns 404.
- **Harness output on `dist/` built from `249bb97`.** `get_sutta` gives the quoted `**?**` + guard output for `mn9999`, `MN10`, `" mn10"` and `dhp1`. `get_sutta_meta("mn9999")` gives `Không tìm thấy sutta với UID: mn9999` with no `isError`. The guard output for `mn10/xyzzy`, `mn10/minh_chau`, `ma98`, `mn` and `dhp` contains the cited `URL:` lines. Both `mn10/xyzzy` and `mn10/minh_chau` list `• English — Bhikkhu Sujato (sujato)` first. `{"uid":""}` gives `isError: true` with `SuttaCentral API error: 404`. `mn10/sujato` body line 3 is `[mn10:1.1] So I have heard.`
- **Code citations.** `fetchSuttaplex :10-16`, `fetchBilaraText :18-23`, handler `:249-309`, `Promise.all :251-254`, `extractText :121-140`, `formatCitation :142-155`, retry `:266-274`, gate `:276`, `formatUnavailable :157-182`, `get_sutta_meta` not-found branch `:323-327`, `TOPIC_INDEX` `"nibbana"` at `:78`: all exact.
- **Counts.** `segmented` 3, `sujato` 3, translator-ID regex 0, `Không tìm thấy sutta với UID` 1, gate string 1.
- **Normative blocks.** The N1-A awk extract (20 lines) diffs empty against `specs/non-segmented-translation-guard/design.md`. N3-A (6 lines) and N3-B (18 lines) diff empty against `specs/bilara-lang-param/design.md`.
- **Out-of-scope `search_topic` claim.** `TOPIC_INDEX` has 33 unique UIDs. Exactly one, `sn43.14`, returns `uid: null`, so 32/33 is correct. `search_topic("nibbana")` prints `**?** — ` / `URL: https://suttacentral.net/?` for it.
- **UNVERIFIED assumption (`:174`).** The assumption is that no `uid: null` suttaplex has a bilara body that serves content. I extended the sample with `sn43.14`, `an1.1`, `dhp21` and `mn10.1`. All four have suttaplex `uid: null` and bilara `{"msg"}`. No counter-example was found. The opposite direction (truthy `uid` but bilara `{"msg"}`) was observed only for branch UIDs (`mn`, `dhp`), and FR-5 already routes those to the guard.

**Not-found boundary.** The FR-1 signal is `!sp?.uid` on the first array element. On every measured case it separates three classes correctly:

- Non-existent UIDs (typo, upper case, whitespace, verse inside a range, nonsense) return `null`.
- Branch UIDs `mn` and `dhp` return a truthy `uid`, so they stay on the guard path as `segment-id-in-get-sutta` FR-6 pins.
- Valid-UID/wrong-translator cases (`mn10/xyzzy`, `mn10/minh_chau`, `ma98/sujato`) return a truthy `uid`, so they stay on the guard path.

The boundary is sound.

## Critical Findings

None.

## Warnings

### W1: FR-7 and AC-7 omit normative block N3-A (`fetchBilaraText()`), even though a natural fix shape touches it

FR-7 (`:89`) lists only N1-A, N1-B and N3-B. AC-7 (`:159-160`) mechanises only those three. `specs/bilara-lang-param/design.md:102-117` declares **two** normative blocks: N3-A (`fetchBilaraText()`, "code phải khớp **từng ký tự**", with an amend-in-same-change sync obligation) and N3-B. The direct predecessor `specs/segment-id-in-get-sutta/design.md:70` tracks N3-A explicitly in its "Khối normative bị đụng" table ("**N3-A** (`fetchBilaraText()`) | **Không**"). NFR-5 (`:97`) does not list `fetchBilaraText()` or `fetchSuttaplex()` either. So no requirement in this spec protects N3-A or requires the sync.

This matters here specifically. The issue's own cause analysis ("`fetchSuttaplex()` / `fetchBilaraText()` do not throw (`res.ok` is true)") invites one particular design: teach the fetch helpers to throw or flag on `{"msg":"Not Found"}` / `uid: null`. In `fetchBilaraText()` that design edits N3-A without syncing `bilara-lang-param/design.md`. It also breaks the `dhp`/`mn` guard, because their bilara body is `{"msg":"Not Found"}` too (measured). AC-4 would catch the behavioural half. The normative-sync half has no net at all.

**Fix:** add N3-A to FR-7, using the same rule as the other blocks. Add an AC-7 clause: `awk '/^async function fetchBilaraText/,/^}$/'` on `src/index.ts` and on `specs/bilara-lang-param/design.md` gives an empty `diff` (baseline today: 6 lines, empty diff). Optionally, have NFR-5 state whether `fetchSuttaplex()` (non-normative and shared by four tools) may change.

### W2: FR-5's "cùng response upstream" condition cannot be controlled with the stated baseline method

FR-5 (`:83`) requires byte-identity "cho cùng input và cùng response upstream". The Baseline paragraph (`:107`) captures `249bb97` output "trước khi sửa code" and compares it "sau fix". It says nothing about the time gap and has no validity rule for the baseline itself. Two observed failure modes follow.

1. **Live drift between capture and verify.** AC-4 outputs embed the full `formatUnavailable()` alternatives list. For `mn10` that list is built from 43 live suttaplex entries. One translation added on SC between capture and verify makes AC-4 fail with no code regression. The harness drift rule (`:105`, "nếu lệch, fetch lại endpoint") is written for pinned literals. It does not say how to re-establish a byte baseline.
2. **Transient error captured as baseline.** During this review, one of 15 concurrent harness runs (`dhp1-20/phantuananh`) returned `isError: true` / `fetch failed`. That response still carries `"id":2`, so the `"id":2` presence rule does not reject it. The parenthetical at `:105` places the `fetch failed` observation next to "thiếu là chạy hỏng", which suggests the `"id":2` rule covers it. It does not. If that run is saved as the baseline, AC-5 fails falsely after the fix.

**Fix (both in the Baseline paragraph):**

- (a) A baseline run is valid only if the response is not `isError` and contains the positive anchor its AC already names: the guard sentence plus the `URL:` line for AC-4, and the segment-ID anchors for AC-5. Otherwise re-run it.
- (b) Capture the baseline and run the post-fix comparison in the same session. Better still, run them A/B back-to-back: build `249bb97` into a temporary worktree outside the repo and run both builds per input, so "cùng response upstream" actually holds. On a mismatch, re-run both before calling it a regression.

## Suggestions

### S1: AC-6 says "như baseline", but AC-6's input is not in the baseline set

`:107` captures the baseline for "mọi input của AC-4, AC-5" only. AC-6 (`:152`) ends "như baseline". The pinned literal `SuttaCentral API error: 404` makes AC-6 checkable anyway. Either add `{"uid":""}` to the baseline set or drop the words "như baseline".

### S2: Q1 is already closed by NFR-4

Validity is unknown until suttaplex returns. Keeping suttaplex and the first bilara call parallel on the valid path (NFR-4, `:96`) therefore forces them parallel on the not-found path too, so the extra bilara request is fixed by requirements. That makes Q1 (`:183`) a recorded decision, not an open question. Moving it to Assumptions or citing NFR-4 as the reason would stop design from treating sequential-then-check as open.

### S3: FR-6 and FR-2 overlap on a hypothetical case; state the precedence

Suppose a UID is non-existent (`uid: null`) and the parallel bilara call throws (non-2xx or network error). With `Promise.all`, FR-6 (the error) wins. That is consistent with NFR-4 and S2, but no FR says so. One clause in FR-6 ("kể cả khi suttaplex cho `uid` rỗng") would remove the ambiguity. It has not been observed live, since bilara answers 200 for every measured non-existent UID, so this is optional.

## Re-review boundary

Not applicable (first review).

## Strengths

- **Measured literals.** Every literal, line reference, count and harness output I re-measured matched (see Re-measurement summary). This includes the two-space echo for `" mn10"` and the 171/27 branch array sizes.
- **The not-found signal is tied to what upstream returns, not to the HTTP status.** It is exactly `get_sutta_meta`'s existing criterion, and both negative classes (branch UIDs; valid UID with wrong translator) are named, measured and pinned by AC-4 with positive anchors. Neither is misclassified.
- **Exact-text positive anchors.** AC-1 and AC-2 pin exact equality, not just negations, so the empty or broken-run false pass (anti-pattern 7) is closed.
- **`search_topic` stays out of scope, correctly.** It is a different tool, its fix needs `formatCitation()` (shared, and protected by NFR-5), issue #10 is scoped to `get_sutta`, and the finding is preserved with measured evidence for a follow-up issue.
- **Existing behaviour pinned before any change.** FR-4 pins the current request count (≤ 2), and NFR-4/AC-7 pin parallelism and the ≤ 3 ceiling on the valid path. Both are stated as current behaviour that the fix must keep.
- **Template.** The artifact follows the template's section order and has all required sections.

## Summary

The requirements are factually accurate, and the not-found boundary is correct for every measured class, including the branch UIDs (`mn`, `dhp`) and the valid-UID/wrong-translator cases that predecessor specs pin. There are two gaps. First, the protected-block list omits N3-A (`fetchBilaraText()`), which a natural "make the fetch helper detect not-found" design would edit (W1). Second, the byte-identity baseline method has no validity rule and no control over upstream drift or transient errors (W2). Both have small, mechanical fixes. No Critical findings.

**Verdict:** Approve with changes
