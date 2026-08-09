# Challenge: requirements-review-1 — Critical findings C1–C3

**Date:** 2026-08-09
**Challenger:** challenger (independent; did not write the review, will not fix it)
**Review under examination:** [requirements-review-1.md](requirements-review-1.md)
**Artifact under review:** [requirements.md](../requirements.md)
**Scope:** Critical findings only (C1, C2, C3). Warnings and Suggestions out of scope.

**Decision rule applied:** asymmetric — uphold unless strong, specific evidence shows the
finding is factually wrong or inapplicable. Ambiguity, judgement calls, and stylistic
disagreement resolve to UPHELD.

**Sources re-read directly (not via the report's summary):**
`specs/non-segmented-translation-guard/requirements.md` (all 262 lines),
`claudedocs/specs-review.md:165-234` and `:288-295`,
`src/index.ts:100-145` and `:190-239`,
`specs/non-segmented-translation-guard/` directory listing.

Established live-API facts supplied with the task were taken as given and not re-verified.

---

## C1 — FR-4's filter will list the requested translator back to the user

### Finding as stated

FR-4 specifies a single filter, `segmented === true && is_root !== true`. That filter excludes
`minh_chau` only incidentally (because `minh_chau` is `segmented=false`). On AC-5's call —
`get_sutta({ uid: "dhp1-20", translator: "phantuananh" })` — `phantuananh` is `segmented=true`,
so it survives the filter and gets suggested back to the user in the same message that just
told them `phantuananh` returned no translation. No acceptance criterion catches this.

### What I checked

1. FR-4's full text and whether any exclusion of the requested translator is stated anywhere in
   the requirement, not just implied.
2. Whether `phantuananh` for `dhp1-20` actually passes the stated filter.
3. AC-2's binding — is its `minh_chau` clause general or tied to AC-1's call?
4. AC-5's clause list — does it constrain the alternatives list at all?
5. Whether any other FR (e.g. FR-3's forbidden-content list) independently forbids self-listing.

### Evidence

FR-4's opening sentence and its filter, verbatim:

- `requirements.md:78` — "Thông báo phải liệt kê các bản dịch **khác** của chính sutta đó lấy từ `suttaplex.translations` đã fetch sẵn…"
- `requirements.md:80` — "**Bộ lọc: giữ `segmented === true` và `is_root !== true`** (phương án (ii) trong chỉ đạo)."
- `requirements.md:82` — "Bỏ bộ lọc sẽ khiến danh sách gợi ý bao gồm luôn `minh_chau` — đúng dịch giả mà ta vừa báo là không lấy được. Gợi ý người dùng thử lại thứ ta vừa có bằng chứng trực tiếp là thất bại thì tệ hơn là không gợi ý gì."

The report's quotations of lines 80 and 82 are byte-exact. The filter as specified names two
predicates and no third; the only textual trace of self-exclusion is the bolded word "khác" two
lines earlier, in the sentence that FR-4 then proceeds to make precise.

`phantuananh` passes that filter:

- `requirements.md:28` — table row: `| `phantuananh` | **true** | **published** (scpub43, `is_published: true`, …) | **Không** |`
- Established fact: `GET /api/suttaplex/dhp1-20?language=vi` lists `phantuananh` with `segmented=true`.
- `phantuananh` is a translation, not a root text, so `is_root !== true` holds.

Therefore both conjuncts of the stated filter are satisfied by the very translator the guard
message is about. The self-listing outcome the finding predicts is mechanical, not speculative.

Acceptance coverage, checked clause by clause:

- `requirements.md:138` — AC-2 **Given**: "cùng lời gọi như AC-1", i.e. bound to `mn10` + `minh_chau`.
- `requirements.md:141` — AC-2 **And**: "không liệt kê chính `minh_chau` trong danh sách đó" — names the literal `minh_chau`, under a Given that fixes the call. It cannot fire on `dhp1-20`/`phantuananh`.
- `requirements.md:170-174` — AC-5's four **Then/And** clauses cover the guard branch, the `Translator: ` string, the truncation strings, `root_text` Pali, and the string `segmented`. None mentions the alternatives list.

No other requirement closes the hole. FR-3's forbidden-content list
(`requirements.md:73-76`) bans a `Translator: <tên> (<author_uid>)` **header line** for the
requested translator, root-text segments, truncation lines, and causal claims — it says nothing
about the suggestion list's membership.

### Verdict

**UPHELD.**

Every factual component checks out: the filter text is exactly as quoted and contains no
self-exclusion term; `phantuananh` provably satisfies both conjuncts; AC-2's guard is
literal-`minh_chau` and Given-bound to AC-1's call; AC-5 has no alternatives-list clause.

The one contestable point is whether "các bản dịch **khác**" (line 78) already carries the
exclusion, making this a wording nit rather than a defect. Two reasons it does not defeat the
finding. First, the finding itself raises and addresses that phrase, so it is not an oversight
being exploited. Second, and decisive: even if a reader takes "khác" as normative, the
acceptance criteria still cannot detect a violation on the case class the spec's own heading
calls "Case class quyết định" (`requirements.md:164`) — the AC gap is independent of how line 78
is read. A requirement whose decisive case has no criterion that can fail on it is a Critical
regardless of the prose reading. Uphold.

Note on the recommendation: making the exclusion a third conjunct
(`author_uid !== <requested translator>`) is consistent with FR-2, which bans `segmented` only as
the **guard predicate**; FR-4 already re-admits `segmented` as an exclusion filter with a stated
necessary-not-sufficient justification (`requirements.md:81`). The proposed fix does not
conflict with FR-2.

---

## C2 — FR-10 leaves the falsified premise standing in `claudedocs/specs-review.md`, and AC-10 passes anyway

### Finding as stated

FR-10 enumerates "Bốn chỗ" but item 1 targets only line 193. The falsified causal claim survives
at four further locations: 192, 195-197, 218-221, and 294. AC-10's only string assertion is
`will fail or return empty`, and its Given scopes the Combined Verdict Summary row out entirely.

### What I checked

Each of the four cited locations in the current `claudedocs/specs-review.md`, byte-exact; the
extent of the `## Finding: F-04` section; FR-10's stated edit ranges; and every AC-10 clause
against those locations.

### Evidence

FR-10's stated targets:

- `requirements.md:101` — "**FR-10: Sửa finding F-04 trong `claudedocs/specs-review.md`.** Bốn chỗ:"
- `requirements.md:102` — item 1: "Dòng 193 — *"will fail or return empty `translation_text`"* là sai."
- `requirements.md:103` — item 2: "Kết luận *"This is an upstream data constraint, not a code issue"* (dòng 201) và verdict `UPSTREAM` (dòng 214-216) là sai/thiếu."
- `requirements.md:104-105` — items 3 and 4: the translator table at 203-207, plus a note that the two columns are not equivalent.

The residues, verbatim from the current file:

- `claudedocs/specs-review.md:192` — "- The bilara API (`/api/bilarasuttas/{uid}/{translator}`) **only serves segmented texts**"
- `claudedocs/specs-review.md:195-197` — "The roadmap item … cannot be implemented using the bilara endpoint alone. It requires either: / - A different API endpoint for non-segmented texts, or / - Waiting for SC to publish segmented Vietnamese translations"
- `claudedocs/specs-review.md:218-221` — inside the Verdict Recommendation code block: "1. Add a note to §"Hướng nâng cấp" item 2: "SC Vietnamese translations / (e.g. minh_chau) are non-segmented. Bilara API cannot serve them. / Requires either a fallback to the legacy text API or waiting for / segmented Vietnamese editions.""
- `claudedocs/specs-review.md:294` — "| F-04 | Gap | Vietnamese translator path broken | **UPSTREAM** | Document SC non-segmented constraint in roadmap |"

All four line references in the report are exact, including the sub-line boundaries. Line 192 is
indeed immediately above line 193 — the one line FR-10 item 1 does correct — so a literal
implementation produces adjacent contradictory sentences. Line 192 is also verbatim the
hypothesis `requirements.md:21` declares "**đã bị bác bỏ bằng phản ví dụ live**", and line 197 is
verbatim the proposition `requirements.md:95` declares "**Mệnh đề đó nay sai.**"

Section extent and AC-10 scope:

- `claudedocs/specs-review.md:170` — "## Finding: F-04 — …"; the next heading is `## Finding: F-05` at line 228, with the `---` separator at 226. So the F-04 section is lines 170-224/226.
- `requirements.md:216` — AC-10 **Given**: "phần `## Finding: F-04`". Line 294 sits in the Combined Verdict Summary table (`claudedocs/specs-review.md:289-295`), outside that section. The report's scoping claim is correct.
- `requirements.md:218-222` — AC-10's clauses: no-`will fail or return empty`; verdict no longer attributing everything upstream and naming the `extractText()` defect; the table rows for `indacanda` and `phantuananh`; the column-independence note; a reference to this spec slug.

Mapping the residues against those clauses: line 192 is matched by no clause; lines 195-197 by no
clause; line 294 by no clause and outside the Given. An implementation editing exactly what FR-10
names, and nothing more, satisfies all five AC-10 clauses while leaving three falsified
statements in the file. That is the finding's central claim, and it holds.

### Verdict

**UPHELD.**

One caveat, recorded because it slightly narrows the finding without defeating it: the report
says lines 218-221 are "out of the stated edit range" because FR-10 item 2 cites only 214-216.
That is true of FR-10. But AC-10's clause "phần verdict không còn quy toàn bộ nguyên nhân về
upstream" (`requirements.md:219`) plausibly reaches the whole `### Verdict Recommendation` block
(211-224), which contains 218-221. So of the four residues, one is arguably caught by AC-10 and
three are not. The finding's headline — "AC-10 passes anyway" — remains true for 192, 195-197,
and 294, and 192 is the single worst case because it restates the exact falsified hypothesis
directly above the line being corrected. The narrowing is a detail of scope, not a refutation:
per the decision rule, ambiguity resolves to uphold.

---

## C3 — AC-3's byte-identity clause is unverifiable as written

### Finding as stated

AC-3's final clause requires byte-identity against the pre-change output, but nothing in the
document instructs anyone to capture that baseline before the change is applied; and even with a
baseline the comparison is non-deterministic, because `get_sutta` renders `formatCitation()` from
a live `fetchSuttaplex` response whose `Parallels: N`, `Difficulty:` and `translated_title` can
drift upstream between capture and re-run.

### What I checked

1. The exact text of `requirements.md:153` and AC-3's Given/When.
2. Whether any baseline-capture instruction exists anywhere in `requirements.md`.
3. Whether the byte-identity clause is in fact the only regression guard for FR-6.
4. Whether the drift mechanism the finding describes is real in `src/index.ts`.

### Evidence

- `requirements.md:153` — "- **And** output khớp từng byte với output của cùng lời gọi trước khi thay đổi" — quoted exactly by the report.
- `requirements.md:148-149` — AC-3 **Given** "`sujato` có bản dịch lấy được cho `mn10`"; **When** "gọi `get_sutta({ uid: "mn10", translator: "sujato" })` với `max_segments` mặc định 50".
- `requirements.md:118` — "Không có test runner trong repo — verify thủ công qua `npm run dev` là cách duy nhất hiện có…"
- Baseline capture: `grep -n -i "baseline\|trước khi thay đổi\|trước khi sửa\|lưu output\|diff\b"` over `requirements.md` returns only lines 114, 153, 193, 197 — NFR-6's use of "diff", the clause itself, AC-8's heading, and AC-8's `git diff` command. No instruction anywhere to run the call and save its output before the code change. The finding's core claim is confirmed by absence, verified mechanically over the whole file.

The drift mechanism is real:

- `src/index.ts:208-211` — `const [suttaplex, bilaraData] = await Promise.all([ fetchSuttaplex(uid), fetchBilaraText(uid, translator) ]);` — live fetch on every call.
- `src/index.ts:213` — `const citation = formatCitation(suttaplex);`
- `src/index.ts:131-133` — `formatCitation` reads `suttaplex?.translated_title`, `suttaplex?.parallel_count`, `suttaplex?.difficulty?.name`.
- `src/index.ts:138` — emits `` `Difficulty: ${difficulty} | Parallels: ${parallels}` ``.

So all three fields the finding names are rendered into the compared output from a live upstream
response. Byte-identity would break on an upstream `parallel_count` change unrelated to the code
change. The mechanism is exactly as described, at exactly the cited line.

### Verdict

**UPHELD.**

Both factual pillars are confirmed at the cited locations: no baseline instruction exists in the
document, and the drift path through `formatCitation()` is real.

One framing overstatement, noted and not fatal. The heading says the byte clause "is the only
regression guard for FR-6". Strictly, AC-3 is the only AC mapping to FR-6
(`requirements.md:147`), but it carries four clauses, and lines 150-151 (`Translator: <tên>
(sujato)` present; English segments present) remain executable without a baseline. The correct
statement is "the only *strict* regression guard is unexecutable; the remaining structural
clauses are weak, and line 152 is itself defective per W8". That refines the impact wording; it
does not touch the claim adjudicated here, which is that the clause at line 153 cannot be
executed as written. Per the decision rule, a rewording preference is not grounds to refute.

The recommendation's option (b) is the stronger of the two offered, since it survives upstream
drift; option (a) fixes executability but leaves the non-determinism the finding itself
identified. Worth flagging to whoever fixes this: adopting (a) alone re-imports the drift
problem.

---

## Summary

| Finding | Verdict | One-line reason |
|---|---|---|
| C1 | **UPHELD** | Filter text at `requirements.md:80` contains no self-exclusion, `phantuananh` provably satisfies both conjuncts, and AC-5 has no alternatives-list clause while AC-2's is literal-`minh_chau` and bound to AC-1's call. |
| C2 | **UPHELD** | All four residue locations verified byte-exact at `claudedocs/specs-review.md:192`, `:195-197`, `:218-221`, `:294`; at least three are matched by no AC-10 clause and line 294 is outside AC-10's Given. |
| C3 | **UPHELD** | No baseline-capture instruction exists anywhere in `requirements.md` (verified by full-file grep), and `src/index.ts:213` → `:131-133` renders live upstream fields into the compared output. |

**Verdicts: C1 UPHELD, C2 UPHELD, C3 UPHELD.** The review's Block verdict stands on the
Criticals as adjudicated. Two impact framings should be tightened when the findings are actioned
(C2: one of four residues is arguably caught by AC-10's verdict clause; C3: AC-3's other three
clauses are weak rather than absent), but neither correction reduces a Critical below Critical.
