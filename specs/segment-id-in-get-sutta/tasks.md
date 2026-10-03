# Tasks: Segment ID trong output của `get_sutta`

**Status:** Complete
**Created:** 2026-10-03
**Spec slug:** segment-id-in-get-sutta
**Design:** [design.md](./design.md)
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/non-segmented-translation-guard/` (N1-A, kiểu `ExtractedText`), `specs/bilara-lang-param/` (N3-B). Spec này đụng cả hai (`design.md:63-73`).

## Conventions

- Task ID theo mẫu `T-<phase>-<n>`. Mỗi task là một thay đổi logic, commit được độc lập; verify là task riêng, không nhét vào task implement.
- **Đọc tối thiểu để implement:** năm mục ở `design.md:55-61`. Phần còn lại của `design.md` là lý do và bằng chứng.
- **Khối [NORMATIVE] là chép nguyên văn, không phải minh họa.** N5-T (`design.md:82-89`), N1-A bản mới (`design.md:109-128`), N3-B bản mới (`design.md:140-158`), N5-R (`design.md:172`, `:178`) và các khối chữ E-1, E-2, M-1, M-2 (`design.md:253-260`, `:266-271`, `:277`, `:283`) phải khớp **từng ký tự**, comment tính là một phần của luật. Các task dưới đây **cố ý không chép lại code hay chữ** — chép từ `design.md` theo dải dòng được chỉ, đừng chép từ file này, đừng diễn đạt lại. Số dòng của `design.md` là của bản Reviewed; không task nào sửa `design.md` của spec này.
- **Không có nhóm build đỏ giữa chừng.** N5-T và N1-A gộp thành một task (T-1-1) vì đổi kiểu một mình làm `extractText()` không compile. Sau mỗi task, `npm run build` phải thoát mã 0. `tsconfig.json` không bật `noUnusedLocals`, nên `servedLang` chưa được đọc sau T-2-1 vẫn build xanh. Build đỏ sau bất kỳ task nào là lỗi, không phải dự kiến.
- **Build xanh không chứng minh output đúng.** Sau T-1-1, `truncated.join("\n")` trên `Segment[]` **compile sạch** và in `[object Object]` trên mọi dòng thân (`design.md:94`). Trạng thái này kéo dài tới khi T-2-2 xong. Đừng chạy harness để đánh giá AC trước T-2-2.
- **Grep là bộ tiền lọc, một mình không kết luận được** (`design.md:344`). Lưới thật cho chép nguyên văn là `diff`. Lưới duy nhất cho luật served-lang của FR-4 là **T-4-6** (xem dưới).
- **T-4-6 là bắt buộc, không được gộp, không được bỏ.** Mọi `diff` khối (tương đối lẫn tuyệt đối) và mọi case AC-1..AC-3 đều pass trên cách viết tắt lấy `{lang}` từ metadata translator (design-review-1 W1; `design.md:424-427`). Chỉ case `snp1.8`/`piyadassi` phân biệt được. T-4-6 có Result riêng.
- **Cấm sửa số/literal đã pin trong spec artifact để làm mệnh đề pass.** Nếu số đo lệch spec: fetch lại endpoint đối chiếu (luật vận hành 3, `requirements.md:102`), rồi **halt và báo cáo**. Không tự đính chính `requirements.md`/`design.md` trong cùng task.
- **Harness** (`design.md:317-327`): dựng lại `/tmp/mcp-call.sh` từ heredoc `specs/non-segmented-translation-guard/requirements.md:180-196` (lệnh `cat` ở `:183`, `EOF` ở `:192`). Ba luật: `npm run build` trước mỗi lần chạy (harness chạy `dist/`); mỗi lần chạy phải có đúng 1 dòng `"id":2` — thiếu là chạy hỏng, đọc `/tmp/mcp-stderr.log`, sửa nguyên nhân, chạy lại (mọi mệnh đề "không chứa X" đều pass trên output rỗng); literal lệch thì fetch lại endpoint trước khi kết luận regression. Hai hàm `decode()` và `body()` chép từ `design.md:321-323`. "Dòng thân thứ k" là dòng thứ k của `body()`.
- **Matcher chuỗi** chứa `[`, `{`, `#`, ký tự Unicode: dùng `grep -F` (hoặc `-F -f <pattern file>`), không nhúng vào ngữ cảnh shell có escape — escape bị nuốt cho 0 hit giả, tức pass giả cho mệnh đề phủ định.
- **Vehicle `git diff`:** nhánh `feat/segment-id-in-get-sutta` đang đúng bằng `master` (kiểm 2026-10-03: `git log master..HEAD` rỗng). Nếu công việc đã commit, dùng `git diff master -- <path>` thay cho `git diff -- <path>`.
- **File tạm** (NFR-2): mọi file trong `/tmp` do task tạo (`/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, `/tmp/out-*.txt`, `/tmp/ref-*.txt`, file awk/diff trung gian) nằm ngoài repo và bị xóa ở T-4-9. Task nào tạo file trung gian chỉ dùng riêng cho nó thì tự xóa và ghi vào Result.
- Build command: `npm run build` (tsc, strict, Node16). Repo **không có** test runner và **không có** linter; spec loại trừ việc thêm (`requirements.md:211`).

## Phase 1: Foundation

- [x] **T-1-1:** Đổi kiểu sang `Segment` và viết lại thân `extractText()` (**N5-T + N1-A bản mới, nguyên văn**)
  - **Files:** `src/index.ts:112-137` (khối comment + kiểu `:112-117`, thân hàm `:119-137`)
  - **Acceptance:**
    - Thay `:112-117` bằng khối N5-T ở `design.md:82-89` (8 dòng) và thay toàn bộ hàm `:119-137` bằng khối N1-A ở `design.md:109-128` (20 dòng), khớp **từng ký tự**.
    - Giữ tên field `lines` (không đổi thành `segments`, `design.md:93`). Điều kiện lọc `typeof text === "string" && text.trim()` không đổi ký tự nào; `.trim()` có ở cả điều kiện lẫn giá trị push (FR-2, FR-7).
    - `id` là key nguyên văn từ `Object.entries`: không kiểm, không chuẩn hóa, không suy từ `uid`, không đánh số lại (FR-1).
    - Không sửa comment `khớp src/index.ts:120-121` (giữ chữ có chủ đích, `design.md:131`). Không đọc `translation_text` ở đâu khác.
    - Không đụng handler `get_sutta` ở task này.
  - **Test:**
    - `npm run build` thoát mã 0.
    - `diff <(awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/' src/index.ts) <(awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/' specs/segment-id-in-get-sutta/design.md)` rỗng (8/8 dòng).
    - `diff <(awk '/^function extractText/,/^}$/' src/index.ts) <(awk '/^function extractText/,/^}$/' specs/segment-id-in-get-sutta/design.md)` rỗng (20/20 dòng).
    - `grep -c 'translation_text' src/index.ts` = 1; `grep -c 'segmented' src/index.ts` = 3; `grep -c ' as ' src/index.ts` = 2.
    - Kiểm hành vi: T-4-3..T-4-7 (sau T-2-2).
  - **Depends on:** —
  - **Result:** Khối N5-T (`design.md:82-89`) và N1-A (`design.md:109-128`) chép byte-for-byte bằng script vào `src/index.ts:112-139` (trước đây `:112-137`; dòng trống giữa hai khối giữ nguyên); handler `get_sutta` không đụng. `npm run build` thoát 0; diff N5-T rỗng (8/8 dòng); diff N1-A rỗng (20/20 dòng); `grep -c 'translation_text'` = 1, `grep -c 'segmented'` = 3, `grep -c ' as '` = 2. `git diff -U0 -- src/index.ts`: 5 hunk, +11/−8. Không chạy harness (theo §Conventions); không tạo file tạm.

## Phase 2: Core Implementation

- [x] **T-2-1:** Ghi lại lang đã phục vụ trong khối retry (**N3-B bản mới, nguyên văn**)
  - **Files:** `src/index.ts:253-265` (từ dòng `const citation` tới `}` đóng khối retry, ngay trước dòng trống + gate N1-B)
  - **Acceptance:**
    - Thay `:253-265` bằng khối N3-B bản mới ở `design.md:140-158` (19 dòng, gồm dòng neo `const citation` không đổi), khớp **từng ký tự**.
    - `servedLang` khởi tạo `"en"` và **chỉ** được gán `retryLang` trong khối `if (retryLang) { … }`, cùng chỗ với phép gán `extracted` của retry. Không có phép gán `servedLang` nào khác ở bất kỳ đâu, kể cả sau gate (FR-4; `design.md:49`, `:161`).
    - **Cấm** suy `{lang}` từ `suttaplex.translations` ở bất kỳ chỗ nào khác (Alternative D, `design.md:424-427`). Cấm thêm nhánh `if (extracted.source === "translation")` lồng vào khối retry (điều kiện chết, `design.md:161`).
    - Predicate `find`, điều kiện retry `extracted.source === "root"`, retry đúng một lần: không đổi (NFR-4). Không literal translator-ID nào mới (NFR-7).
    - Gate N1-B, khối guard, `formatUnavailable()`: không đụng một byte.
  - **Test:**
    - `npm run build` thoát mã 0.
    - `diff <(awk '/^    let extracted = extractText/,/^    }$/' src/index.ts) <(awk '/^    let extracted = extractText/,/^    }$/' specs/segment-id-in-get-sutta/design.md)` rỗng (18/18 dòng).
    - `grep -c 'servedLang' src/index.ts` = 2 sau task này (`let servedLang = "en";` và `servedLang = retryLang;`). Đọc code: không có phép gán `servedLang` thứ ba.
    - `grep -c -F 'extracted.source !== "translation"' src/index.ts` = 1.
    - Kiểm hành vi của luật served-lang: **T-4-6** (duy nhất).
  - **Depends on:** T-1-1
  - **Result:** Khối N3-B bản mới (`design.md:140-158`, 19 dòng) chép byte-for-byte bằng script, thay `src/index.ts:256-268` (dải `:253-265` của task dịch +3 dòng do T-1-1; định vị bằng dòng neo `const citation` duy nhất và dòng trống + gate N1-B ngay sau), nay ở `:256-274`. `npm run build` thoát 0; diff `let extracted … }` rỗng (18/18 dòng); `grep -c 'servedLang'` = 2 (`:260` `let servedLang = "en";`, `:272` `servedLang = retryLang;` trong `if (retryLang) { … }`), không có phép gán thứ ba; `grep -c -F 'extracted.source !== "translation"'` = 1. Hunk của task: +3 (comment 2 dòng + `let servedLang`) và −1/+4 (dòng `if (retryLang)` thành khối); predicate `find`, gate, guard không đổi. Không chạy harness; không tạo file tạm.

- [x] **T-2-2:** Render tiền tố `[id] ` và dòng `Deep link:` trong mảng `output` (**N5-R, nguyên văn**)
  - **Files:** `src/index.ts`, mảng `const output = [ … ]` của `get_sutta` (`:285-296` trước T-2-1; định vị theo nội dung)
  - **Acceptance:**
    - Chèn dòng `design.md:172` ngay sau dòng `` `Translator: ${translatorName} (${translator})`, ``.
    - Thay dòng `      truncated.join("\n"),` bằng dòng `design.md:178`.
    - Mọi dòng khác của mảng `output` giữ nguyên từng byte, kể cả hai chuỗi tail (FR-3) và dòng `citation` (FR-5). Dòng `Deep link:` là **một** dòng, không kèm dòng trống (`design.md:51`, Alternative F).
    - `{uid}` là tham số `uid` của request, không phải `suttaplex.uid`; `{lang}` là `servedLang` (không biểu thức nào khác).
  - **Test:**
    - `npm run build` thoát mã 0.
    - `sed -n '172p' specs/segment-id-in-get-sutta/design.md > /tmp/n5r-1.txt; sed -n '178p' specs/segment-id-in-get-sutta/design.md > /tmp/n5r-2.txt; grep -c -x -F -f /tmp/n5r-1.txt src/index.ts` = 1 và tương tự với `/tmp/n5r-2.txt` = 1. Xóa hai file sau khi kiểm.
    - `grep -c -F 'truncated.join' src/index.ts` = 0 (chặn dạng `[object Object]` compile sạch).
    - `grep -c 'servedLang' src/index.ts` = 3 (thêm đúng một lần đọc, trong dòng `Deep link:`).
  - **Depends on:** T-2-1
  - **Result:** Hai dòng N5-R chép byte-for-byte bằng script từ `design.md:172` (chèn ngay sau dòng `Translator:`, nay `src/index.ts:298`) và `design.md:178` (thay dòng `truncated.join("\n"),` duy nhất, nay `:301`); mọi dòng khác của mảng `output` không đổi (diff 2 hunk: +1, −1/+1). `npm run build` thoát 0; `grep -c -x -F -f /tmp/n5r-1.txt` = 1, `-f /tmp/n5r-2.txt` = 1, hai file đã xóa; `grep -c -F 'truncated.join'` = 0; `grep -c 'servedLang'` = 3. Smoke một lần (`mn10`/`sujato`, `max_segments: 3`, file tạm trong scratchpad ngoài repo, đã xóa): `"id":2` = 1, dòng `Deep link: https://suttacentral.net/mn10/en/sujato#<segment_id> …` sau `Translator:`, thân `[mn10:0.1] Middle Discourses 10` / `[mn10:0.2] Mindfulness Meditation` / `[mn10:1.1] So I have heard.`, không có `[object Object]`; đây không phải kiểm AC (T-4-x).

## Phase 3: Đồng bộ tài liệu (FR-7, FR-8)

Mỗi file spec là **một** task. Áp các thao tác theo nội dung (fence, dòng neo), không theo số dòng đã dịch; nếu theo số dòng thì áp từ dưới lên. `design.md:248`: không đụng gì khác trong ba file ngoài các thao tác được liệt kê (và ngoại lệ có chủ đích ở T-3-2).

- [x] **T-3-1:** Áp G-1, G-2, G-3 vào `specs/non-segmented-translation-guard/design.md`
  - **Files:** `specs/non-segmented-translation-guard/design.md` (fence `:51-58`, fence `:123-143`, sau dòng `:6`)
  - **Acceptance:**
    - G-1: thay nội dung fence `ts` của §Data Model (nội dung `:52-57`) bằng khối N5-T (`design.md:82-89`).
    - G-2: thay nội dung fence `ts` của §`extractText()` (nội dung `:124-142`) bằng khối N1-A bản mới (`design.md:109-128`).
    - G-3: sau dòng `**Requirements:** …` (`:6`), chèn một dòng trống rồi khối E-1 (`design.md:253-260`), trước dòng trống + `## Context Recap`.
    - Văn xuôi, sơ đồ, bảng còn nhắc dạng cũ: giữ nguyên làm hồ sơ thời điểm.
  - **Test:**
    - `diff <(awk '/^function extractText/,/^}$/' src/index.ts) <(awk '/^function extractText/,/^}$/' specs/non-segmented-translation-guard/design.md)` rỗng (20/20).
    - `diff <(awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/' src/index.ts) <(awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/' specs/non-segmented-translation-guard/design.md)` rỗng (8/8).
    - `diff <(sed -n '253,260p' specs/segment-id-in-get-sutta/design.md) <(grep -A7 -F '> **Cập nhật (2026-10-02 — spec `segment-id-in-get-sutta`)' specs/non-segmented-translation-guard/design.md)` rỗng.
    - `git diff --stat -- specs/non-segmented-translation-guard/design.md` chỉ chạm ba vùng trên (đọc `git diff`).
  - **Depends on:** T-1-1
  - **Result:** Áp bằng script, định vị theo nội dung (fence `ts` duy nhất mở bằng `// Non-empty tuple` ở `:51-58`, fence `ts` duy nhất mở bằng `function extractText` ở `:123-143`, dòng `**Requirements:**` + dòng trống + `## Context Recap`), áp từ dưới lên: G-2 thay nội dung fence bằng `design.md:109-128`, G-1 bằng `design.md:82-89`, G-3 chèn dòng trống + E-1 (`design.md:253-260`) sau dòng trống sẵn có sau `:6`. Diff N1-A `src/index.ts` ↔ file rỗng (20/20); diff N5-T rỗng (8/8); diff E-1 (`sed -n '253,260p'` ↔ `grep -A7 -F` neo, neo xuất hiện 1 lần) rỗng. `git diff --stat`: +20/−8, đúng 3 hunk (E-1 +9 tại `@@ -5,6`, fence kiểu +4/−2 tại `@@ -52,9`, fence N1-A +7/−6 tại `@@ -122,19`); văn xuôi, sơ đồ, bảng không đổi. `src/index.ts` không đụng; không tạo file tạm.

- [x] **T-3-2:** Áp L-1, L-2 vào `specs/bilara-lang-param/design.md`, kèm đính chính `:49` và `:55` (design-review-1 S2)
  - **Files:** `specs/bilara-lang-param/design.md` (fence `:110-124`, sau dòng `:7`; câu ở `:49` và `:55`)
  - **Acceptance:**
    - L-1: thay nội dung fence `ts` của khối N3-B (nội dung `:111-123`) bằng khối N3-B bản mới (`design.md:140-158`, gồm dòng `const citation` như fence cũ).
    - L-2: sau dòng `**Tiền nhiệm:** …` (`:7`), chèn một dòng trống rồi khối E-2 (`design.md:266-271`).
    - **Đính chính `:49`/`:55` (ngoài chữ nguyên văn của design, được dispatch cho phép):** `:49` ("Thân `extractText()` — N1-A tiền nhiệm (19 dòng) | **Giữ nguyên từng byte.**") và `:55` ("không khối N1 nào bị đụng") đúng với thay đổi của chính spec đó nhưng đọc như trạng thái hiện hành. E-2 nguyên văn không phủ hai câu này. Implementer thêm **đính chính nhất quán tối thiểu, theo đúng ý định errata của design** (`design.md:248`: văn xuôi cũ là hồ sơ thời điểm, không viết lại): một mệnh đề/câu bổ sung trong khối E-2, ví dụ nói rằng các câu nói N1-A không đổi (19 dòng) và "không khối N1 nào bị đụng" ở §Vùng giữ nguyên là hồ sơ thời điểm, vì N1-A đã được thay bởi spec `segment-id-in-get-sutta`. **Không** sửa chữ của dòng `:49`/`:55`. Không thêm gì khác.
    - Ghi trong Result: chữ chính xác đã thêm, vị trí, và lý do (design-review-1 S2). Đây là lệch có chủ đích khỏi E-2 nguyên văn; không amend `specs/segment-id-in-get-sutta/design.md` (để orchestrator quyết).
  - **Test:**
    - `diff <(awk '/^    let extracted = extractText/,/^    }$/' src/index.ts) <(awk '/^    let extracted = extractText/,/^    }$/' specs/bilara-lang-param/design.md)` rỗng (18/18).
    - Khối E-2 đã chèn so với `sed -n '266,271p' specs/segment-id-in-get-sutta/design.md`: `diff` chỉ hiện các dòng đính chính thêm vào (mọi dòng nguyên văn của E-2 còn nguyên).
    - `git diff -- specs/bilara-lang-param/design.md`: chỉ chạm fence N3-B và khối E-2; dòng `:49`/`:55` cũ không có trong hunk nào dạng `-`.
  - **Depends on:** T-2-1
  - **Result:** Áp bằng script, định vị theo nội dung: L-1 thay nội dung fence `ts` duy nhất mở bằng `    const citation = formatCitation(suttaplex);` (`:110-124`) bằng `design.md:140-158` (19 dòng); L-2 chèn dòng trống + E-2 (`design.md:266-271`) sau dòng `**Tiền nhiệm:**` (`:7`), trước dòng trống + `## Context Recap`. **Đính chính S2 (lệch có chủ đích khỏi E-2 nguyên văn):** 4 dòng nối ngay sau dòng cuối của E-2, trong cùng blockquote: `> Đính chính (design-review-1 S2): ở §Vùng giữ nguyên byte-for-byte / vùng đổi, dòng bảng` / `> "Thân `extractText()` — N1-A tiền nhiệm (19 dòng) | Giữ nguyên từng byte." và câu "không khối` / `> N1 nào bị đụng" đúng với thay đổi của spec này, nhưng là hồ sơ thời điểm: N1-A đã được thay bởi` / `> spec `segment-id-in-get-sutta`.` — lý do: E-2 nguyên văn chỉ phủ N3-B và "11/12 dòng", không phủ dòng bảng `:49` và câu `:55` vốn đọc như trạng thái hiện hành sau khi N1-A bị thay (design-review-1 S2; `design.md:248`: văn xuôi cũ là hồ sơ thời điểm). Không amend `specs/segment-id-in-get-sutta/design.md`. Test: diff N3-B `src/index.ts` ↔ file rỗng (18/18); diff `sed -n '266,271p'` ↔ `grep -A9 -F` neo E-2 chỉ có `6a7,10` (4 dòng đính chính thêm), 6 dòng E-2 nguyên vẹn; `git diff`: +18/−1, 3 hunk (E-2 + đính chính +11, fence N3-B +3 và −1/+4), dòng `-` duy nhất là `if (retryLang) extracted = …` cũ trong fence; dòng `:49`/`:55` cũ không đổi một byte (nay `:60`/`:66`, đối chiếu với `git show HEAD:`). Không tạo file tạm.

- [x] **T-3-3:** Áp M-1, M-2 vào `specs/sutta-mcp-requirements.md` (FR-8, AC-8)
  - **Files:** `specs/sutta-mcp-requirements.md:174`, `:308`
  - **Acceptance:**
    - M-1: thay nguyên dòng `:308` (bắt đầu `5. **Segment ID trong`) bằng `design.md:277`.
    - M-2: thay nguyên dòng `:174` (bắt đầu `**Output:** Toàn văn sutta`) bằng `design.md:283`.
    - Không sửa dòng Constraints `:278` hay bất kỳ dòng nào khác.
  - **Test:** (AC-8, `grep -c -F`; halt-and-report nếu lệch)
    - `suttacentral.net/{uid}#{segment_id}` = **0**.
    - `{uid}/{lang}/{translator}#{segment_id}` = **1**.
    - `segment-id-in-get-sutta` = **2**.
    - `git diff --numstat -- specs/sutta-mcp-requirements.md` = `2	2`.
    - Đọc mục Output của Tool 2: nêu segment ID theo đoạn và dạng deep-link.
  - **Depends on:** —
  - **Result:** Thay nguyên dòng bằng script, định vị theo neo đầu dòng (mỗi neo đúng 1 hit): M-1 `:308` (`5. **Segment ID trong`) ← `design.md:277`; M-2 `:174` (`**Output:** Toàn văn sutta`) ← `design.md:283`. AC-8 (`grep -c -F`, pattern trong heredoc có trích dẫn): `suttacentral.net/{uid}#{segment_id}` = 0; `{uid}/{lang}/{translator}#{segment_id}` = 1; `segment-id-in-get-sutta` = 2. `git diff --numstat` = `2	2`; `git diff -U0` chỉ 2 hunk `@@ -174 +174 @@`, `@@ -308 +308 @@` (dòng Constraints `:278` không đổi). Đọc mục Output của Tool 2: nêu segment ID nguyên văn theo đoạn (`[mn10:1.1] So I have heard.`) và dòng `Deep link: https://suttacentral.net/{uid}/{lang}/{translator}#<segment_id>`. File script tạm trong scratchpad đã xóa.

## Phase 4: Verification

- [x] **T-4-1:** Build sạch, phạm vi diff, `package.json` không đổi, bất biến grep (AC-6 phần phạm vi; NFR-1..NFR-5, NFR-7)
  - **Files:** — (chỉ kiểm)
  - **Acceptance:**
    - `npm run build` thoát mã 0 (NFR-3).
    - **`package.json` không đổi (NFR-1):** `git diff --exit-code -- package.json package-lock.json` thoát mã 0 (rỗng) và `git status --short -- package.json package-lock.json` rỗng. Ghi cả hai kết quả vào Result.
    - `git status --short` và `git ls-files --others --exclude-standard -- src/`: không file mới trong `src/` (NFR-2). `tsconfig.json` diff rỗng.
    - `git diff -U0 -- src/index.ts`: **9 hunk, +20 / −10** (`design.md:226`); 0 lần các chuỗi `formatCitation`, `formatUnavailable`, `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`, `z.`, và chuỗi gate (AC-5, AC-6, NFR-5).
    - Bảng bất biến `design.md:346-354`: `segmented` 3; `sujato` 3; `phantuananh|sabbamitta|minh_chau|indacanda|trush|piyadassi` 0; gate 1; `translation_text` 1; `Object\.keys` 2; `' as '` 2.
    - Đọc code: không lời gọi `fetch` mới; đường nhiều request nhất của `get_sutta` vẫn ≤ 3, chỉ `/suttaplex/` và `/bilarasuttas/` (NFR-4). Schema input `get_sutta` không đổi (D3).
    - Số đo lệch (hunk, +/−): halt và báo cáo, không sửa `design.md`.
  - **Test:** các lệnh trên; ghi số đo thực.
  - **Depends on:** T-2-2
  - **Result:** Mọi số đo khớp, chạy bằng script heredoc có trích dẫn (đã xóa, cùng file diff tạm `/tmp/t41-diff.txt`). `npm run build` thoát 0. NFR-1: `git diff --exit-code -- package.json package-lock.json` thoát 0; `git status --short -- package.json package-lock.json` rỗng. NFR-2: `git ls-files --others --exclude-standard -- src/` rỗng; `git status --short` chỉ ` M` 6 file (`src/index.ts`, 3 design/master spec, `tasks.md`, `workflow-state.json`), không file mới; `git diff --exit-code -- tsconfig.json` thoát 0. `git diff -U0 -- src/index.ts`: 9 hunk, +20/−10 (numstat `20	10`); 0 lần mỗi chuỗi `formatCitation`, `formatUnavailable`, `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`, `z.`, gate (chống-vacuous: cùng file diff có `servedLang` 3, `Segment` 8). Bảng bất biến: `segmented` 3; `sujato` 3; `phantuananh|sabbamitta|minh_chau|indacanda|trush|piyadassi` 0; gate 1; `translation_text` 1; `Object\.keys` 2; `' as '` 2. Đọc code: không lời gọi `fetch(` mới (vẫn 3, trong 3 helper); `get_sutta` gọi `fetchSuttaplex` + `fetchBilaraText` song song (`:252-253`) và tối đa một `fetchBilaraText` retry (`:271`) → ≤ 3 request, chỉ `/suttaplex/` và `/bilarasuttas/` (NFR-4); schema `get_sutta` (`:236-248`) ngoài mọi hunk (D3).

- [x] **T-4-2:** Kiểm tĩnh đồng bộ khối normative: diff tương đối (AC-6) và tuyệt đối
  - **Files:** — (chỉ kiểm)
  - **Acceptance:**
    - **Tương đối (AC-6, FR-7):** ba diff rỗng giữa `src/index.ts` và design tiền nhiệm — N1-A với `specs/non-segmented-translation-guard/design.md` (20 dòng), N5-T với cùng file (8 dòng), N3-B với `specs/bilara-lang-param/design.md` (18 dòng). Awk pattern như T-1-1/T-2-1.
    - **Tuyệt đối (design-review-1 W1 phương án a):** cùng ba awk chạy trên `specs/segment-id-in-get-sutta/design.md`, `diff` với `src/index.ts` rỗng. Bắt được drift chép nhất quán sai vào cả hai phía.
    - N5-R: hai dòng `design.md:172`, `:178` mỗi dòng có đúng 1 lần trong `src/index.ts` (`grep -c -x -F`); `truncated.join` 0.
    - Ghi rõ trong Result: **các diff này không bắt được việc lấy `{lang}` từ metadata translator** — một phép gán lại `servedLang` sau gate giữ N3-B nguyên văn và qua mọi diff. Lưới duy nhất là T-4-6.
  - **Test:** sáu lệnh `diff` + hai `grep`; ghi số dòng mỗi phía. Xóa file trung gian.
  - **Depends on:** T-3-1, T-3-2
  - **Result:** Sáu `diff` đều rỗng (exit 0), số dòng `src/index.ts`/design: tương đối — N1-A ↔ `specs/non-segmented-translation-guard/design.md` 20/20, N5-T ↔ cùng file 8/8, N3-B ↔ `specs/bilara-lang-param/design.md` 18/18; tuyệt đối ↔ `specs/segment-id-in-get-sutta/design.md` — N1-A 20/20, N5-T 8/8, N3-B 18/18. N5-R: `grep -c -x -F -f` dòng `design.md:172` (pattern 169 byte) = 1, dòng `:178` (62 byte) = 1; `grep -c -F 'truncated.join'` = 0. **Các diff này không bắt được việc lấy `{lang}` từ metadata translator** — một phép gán lại `servedLang` sau gate (vd. `translations.find(t => t.author_uid === translator)?.lang`) giữ N3-B nguyên văn và qua mọi diff trên; lưới duy nhất là T-4-6. Script tạm và `/tmp/n5r-1.txt`, `/tmp/n5r-2.txt` đã xóa.

- [x] **T-4-3:** Harness — AC-1 (`mn10`/`sujato`) và AC-2 (`dhp1-20`/`phantuananh`)
  - **Files:** — (harness ngoài repo)
  - **Acceptance:**
    - Dựng `/tmp/mcp-call.sh`, `decode()`, `body()` theo §Conventions. `npm run build` trước. Mỗi lần chạy: `grep -c '"id":2'` = 1.
    - **AC-1** (`requirements.md:106-115`): dòng thân 1/3/50 đúng literal; 50 dòng thân đều khớp `^\[mn10:[0-9][0-9.]*\] \S`; đúng **1** dòng output chứa `https://suttacentral.net/mn10/en/sujato#`, nằm trước dòng thân 1; `body | grep -c 'https://'` = 0; còn `URL: https://suttacentral.net/mn10` và `Translator: Bhikkhu Sujato (sujato)`; tail đúng `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`.
    - Dòng `Deep link:` khớp nguyên văn ví dụ `design.md:186`.
    - **AC-2** (`requirements.md:117-125`): dòng thân 1/3/50 đúng literal (`[dhp9:0] …` ở dòng 50); `grep -c -F '[dhp1-20:'` = 0; chứa `https://suttacentral.net/dhp1-20/vi/phantuananh#`, không chứa `https://suttacentral.net/dhp1-20/en/`; tail `Tổng: 108 đoạn` đúng chuỗi.
    - Literal lệch: fetch lại endpoint, halt và báo cáo.
  - **Test:** như trên. Giữ `/tmp/mcp-call.sh` cho T-4-4..T-4-7.
  - **Depends on:** T-4-1
  - **Result:** Harness dựng bằng chính lệnh `cat` heredoc ở `non-segmented-translation-guard/requirements.md:183-192` (nội dung `/tmp/mcp-call.sh` diff rỗng với `:184-191`); `decode()`/`body()` chép từ `design.md:321-323`. `npm run build` thoát 0 trước khi chạy. `"id":2` = 1 ở cả hai lần chạy, decode thoát 0; stderr chỉ `Sutta MCP server running (stdio)`. **AC-1** (`mn10`/`sujato`, `/tmp/out-sujato.txt`): 50 dòng thân; thân 1 `[mn10:0.1] Middle Discourses 10`, thân 3 `[mn10:1.1] So I have heard.`, thân 50 `[mn10:13.1] And so they meditate observing an aspect of the body internally …` — khớp; 50/50 dòng khớp `^\[mn10:[0-9][0-9.]*\] \S`; `https://suttacentral.net/mn10/en/sujato#` đúng 1 dòng (dòng 6, trước thân 1 ở dòng 9); `body | grep -c 'https://'` = 0; có `URL: https://suttacentral.net/mn10` và `Translator: Bhikkhu Sujato (sujato)` (khớp `-x`); dòng cuối đúng `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`; dòng `Deep link:` khớp `-x -F` với `design.md:186` (pattern 140 byte) = 1. **AC-2** (`dhp1-20`/`phantuananh`, `/tmp/out-phantuananh.txt`): 50 dòng thân; thân 1 `[dhp1:0.1] Tiểu Bộ Kinh`, thân 3 `[dhp1:0.3] Phẩm Song Yếu`, thân 50 `[dhp9:0] Chuyện Devadatta (Đề-bà-đạt-đa)` — khớp; `grep -c -F '[dhp1-20:'` = 0; `https://suttacentral.net/dhp1-20/vi/phantuananh#` = 1; `https://suttacentral.net/dhp1-20/en/` = 0; dòng cuối đúng `[... văn bản bị cắt sau 50 đoạn. Tổng: 108 đoạn. Tăng max_segments để xem thêm.]`. Không literal nào lệch nên không cần fetch lại. Giữ `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, `/tmp/out-{sujato,phantuananh,mn10-raw,dhp-raw}.txt` (thuộc glob của T-4-9); script kiểm tạm trong scratchpad đã xóa.

- [x] **T-4-4:** Harness — AC-3 (`mn10`/`sabbamitta` → `de`, `mn10`/`trush` → `gu`)
  - **Files:** — (harness ngoài repo)
  - **Acceptance:**
    - `"id":2` = 1 mỗi lần chạy.
    - sabbamitta (`requirements.md:131`): dòng thân 50 `[mn10:12.0] 1.5. Den Geist auf die Elemente richten`; chứa `https://suttacentral.net/mn10/de/sabbamitta#`; tail `Tổng: 200 đoạn`.
    - trush (`requirements.md:132`): dòng thân 1 `[mn10:0.1] મજ્જ઼િમ નિકાય ૧૦`; chứa `https://suttacentral.net/mn10/gu/trush#`; `grep -c -F '/mn10/hi/trush'` = 0; tail `Tổng: 230 đoạn`.
    - Literal lệch: fetch lại endpoint, halt và báo cáo.
  - **Test:** như trên.
  - **Depends on:** T-4-1
  - **Result:** `npm run build` thoát 0 rồi chạy `/tmp/mcp-call.sh` tuần tự; `"id":2` = 1 ở cả hai lần, decode thoát 0, stderr chỉ `Sutta MCP server running (stdio)`. **sabbamitta** (`/tmp/out-sabbamitta.txt`): 50 dòng thân; thân 50 đúng `[mn10:12.0] 1.5. Den Geist auf die Elemente richten`; `https://suttacentral.net/mn10/de/sabbamitta#` = 1 (`/mn10/en/sabbamitta` = 0); dòng cuối `[... văn bản bị cắt sau 50 đoạn. Tổng: 200 đoạn. Tăng max_segments để xem thêm.]`. **trush** (`/tmp/out-trush.txt`): 50 dòng thân; thân 1 đúng `[mn10:0.1] મજ્જ઼િમ નિકાય ૧૦`; `https://suttacentral.net/mn10/gu/trush#` = 1; `grep -c -F '/mn10/hi/trush'` = 0; dòng cuối `[... văn bản bị cắt sau 50 đoạn. Tổng: 230 đoạn. Tăng max_segments để xem thêm.]`. Matcher đều `grep -F`/so chuỗi trong script heredoc có trích dẫn (đã xóa). Không literal nào lệch, không cần fetch lại. File `/tmp/out-{sabbamitta,trush}{,-raw}.txt` giữ lại, thuộc glob T-4-9.

- [x] **T-4-5:** Harness — AC-4 (`max_segments` 3 và 500), baseline FR-2, ID gạch nối trên toàn 194 dòng
  - **Files:** — (harness ngoài repo)
  - **Acceptance:**
    - `"id":2` = 1 mỗi lần chạy.
    - `max_segments: 3`: đúng 3 dòng thân như `requirements.md:138`; tail đúng chuỗi `Tổng: 194 đoạn`. Toàn output khớp mẫu `design.md:197-209` (dấu cách cuối dòng tiêu đề là của upstream).
    - `max_segments: 500` → `/tmp/out-s500.txt`: đúng 194 dòng thân; dòng cuối `[mn10:47.4] Satisfied, the mendicants approved what the Buddha said.`; tail `[Hết văn bản — 194 đoạn]`; 0 dòng bắt đầu `[mn10:3.6]`, `[mn10:4.9]`, `[mn10:4.10]`.
    - **Baseline FR-2** (`design.md:362-366`), trong cùng phiên: dựng `/tmp/ref-mn10-sujato.txt` từ live API; `body /tmp/out-s500.txt | diff - /tmp/ref-mn10-sujato.txt` rỗng (ID + text); diff sau khi bỏ tiền tố cũng rỗng.
    - **Kiểm bổ sung 2** (`design.md:384-388`): dòng thân 63 là `[mn10:18-23.1] Furthermore, suppose they were to see a corpse discarded in a charnel ground, a skeleton with flesh and blood, held together by sinews …`; `body /tmp/out-s500.txt | grep -vcE '^\[mn10:[0-9][0-9.-]*\] \S'` = 0.
    - Literal lệch: fetch lại endpoint, halt và báo cáo.
  - **Test:** như trên.
  - **Depends on:** T-4-1
  - **Result:** `npm run build` thoát 0; `"id":2` = 1 ở cả hai lần chạy, decode thoát 0, stderr chỉ dòng khởi động. **`max_segments: 3`** (`/tmp/out-s3.txt`): đúng 3 dòng thân `[mn10:0.1] Middle Discourses 10` / `[mn10:0.2] Mindfulness Meditation` / `[mn10:1.1] So I have heard.`; dòng cuối đúng `[... văn bản bị cắt sau 3 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`; toàn output `diff` với `design.md:197-209` rỗng (13/13 dòng, gồm dấu cách cuối dòng tiêu đề). **`max_segments: 500`** (`/tmp/out-s500.txt`): 194 dòng thân; dòng thân cuối đúng `[mn10:47.4] Satisfied, the mendicants approved what the Buddha said.`; dòng cuối `[Hết văn bản — 194 đoạn]`; `grep -c -F` `[mn10:3.6]`/`[mn10:4.9]`/`[mn10:4.10]` = 0 (chống-vacuous: `[mn10:3.5]` = 1). **Baseline FR-2** (cùng phiên, `/tmp/ref-mn10-sujato.txt` dựng bằng lệnh `node -e` ở `design.md:363`, 194 dòng): `body | diff - ref` rỗng (ID + text); diff sau khi bỏ tiền tố cả hai phía rỗng (194/194). **Kiểm bổ sung 2:** dòng thân 63 đúng `[mn10:18-23.1] Furthermore, suppose they were to see a corpse discarded in a charnel ground, a skeleton with flesh and blood, held together by sinews …`; `grep -vcE '^\[mn10:[0-9][0-9.-]*\] \S'` = 0 (chống-vacuous: `grep -cE` = 194). Không literal nào lệch. Script kiểm (scratchpad) đã xóa; `/tmp/out-s3{,-raw}.txt`, `/tmp/out-s500{,-raw}.txt`, `/tmp/ref-mn10-sujato.txt` giữ lại cho T-4-9.

- [x] **T-4-6:** Harness — **lang đã phục vụ ≠ lang đầu tiên của translator: `snp1.8`/`piyadassi` (BẮT BUỘC; lưới duy nhất của luật served-lang FR-4)**
  - **Files:** — (harness ngoài repo)
  - **Acceptance:**
    - Đây là **lưới duy nhất** cho luật "`{lang}` là lang thực sự đã phục vụ" của FR-4 (design-review-1 W1; `design.md:378-383`, `:443`). Không AC nào và không diff khối nào bắt được cách viết tắt `translations.find(t => t.author_uid === translator)?.lang`. Không được bỏ qua, gộp vào task khác, hay thay bằng đọc code.
    - **Fetch lại giá trị ngay khi chạy, trước harness:** `/api/suttaplex/snp1.8` vẫn liệt kê `piyadassi` với `lang: "en"` trước một entry `lang: "lt"` (design đo: index 11 `en`, index 27 `lt`); `/api/bilarasuttas/snp1.8/piyadassi` (không `lang`) thiếu `translation_text`; `?lang=lt` có `translation_text`, đếm số đoạn không rỗng sau `.trim()` (design đo: 42) và đoạn đầu (`snp1.8:0.1` → `Suttų rinkinukas 1.8`). Ghi số đo vào Result. Nếu upstream không còn phân biệt được hai cách (ví dụ entry `en` biến mất), **halt và báo cáo** — case mất giá trị phân biệt, không coi là pass.
    - `get_sutta '{"uid":"snp1.8","translator":"piyadassi"}'`, `"id":2` = 1:
      - dòng thân 1 là `[snp1.8:0.1] Suttų rinkinukas 1.8`;
      - output chứa `https://suttacentral.net/snp1.8/lt/piyadassi#`;
      - output **không** chứa `https://suttacentral.net/snp1.8/en/piyadassi`;
      - kết thúc bằng đúng `[Hết văn bản — 42 đoạn]`.
    - Literal lệch so với giá trị vừa fetch lại: halt và báo cáo; không sửa spec.
  - **Test:** như trên, matcher bằng `grep -F`.
  - **Depends on:** T-4-1
  - **Result:** **Fetch lại trước harness (2026-10-03):** `/api/suttaplex/snp1.8` liệt kê `piyadassi` ở index 11 (`lang: "en"`, `segmented: false`) và index 27 (`lang: "lt"`, `segmented: true`) — entry đầu tiên của translator là `en`, entry khác-`en` đầu tiên là `lt`, nên case vẫn phân biệt được cách viết tắt. `/api/bilarasuttas/snp1.8/piyadassi` không `lang`: không có `translation_text` (0 key); `?lang=en`: cũng không; `?lang=lt`: có, 43 key / 42 đoạn không rỗng sau `.trim()`, đoạn đầu `snp1.8:0.1` → `Suttų rinkinukas 1.8` — khớp số design đo. **Harness:** `npm run build` thoát 0; `get_sutta '{"uid":"snp1.8","translator":"piyadassi"}'`: `"id":2` = 1, decode thoát 0, stderr chỉ dòng khởi động; dòng thân 1 khớp `grep -x -F '[snp1.8:0.1] Suttų rinkinukas 1.8'`; `grep -c -F 'https://suttacentral.net/snp1.8/lt/piyadassi#'` = 1; `grep -c -F 'https://suttacentral.net/snp1.8/en/piyadassi'` = 0; dòng cuối khớp `grep -x -F '[Hết văn bản — 42 đoạn]'`; 42 dòng thân. Luật served-lang FR-4 đứng vững trên case phân biệt duy nhất. Script kiểm (scratchpad) đã xóa; `/tmp/out-snp18{,-raw}.txt` giữ lại cho T-4-9.

- [x] **T-4-7:** Harness — AC-5 nhánh guard không đổi (`mn10`/`minh_chau`, `thag1.1`/`indacanda`)
  - **Files:** — (harness ngoài repo)
  - **Acceptance:**
    - `"id":2` = 1 mỗi lần chạy (điều kiện tiên quyết cho mọi mệnh đề phủ định dưới).
    - Cả hai output chứa `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả`; các neo AC-4 của `specs/bilara-lang-param/requirements.md` vẫn đúng.
    - Không output nào chứa `[mn10:`, `[thag1.1:`, `https://suttacentral.net/mn10/`, `https://suttacentral.net/thag1.1/`, `Translator: `, `[Hết văn bản`, `[... văn bản bị cắt`, `Deep link`.
    - `git diff -U0 -- src/index.ts` không chạm thân `formatUnavailable()` (đã kiểm ở T-4-1; ghi lại tham chiếu).
  - **Test:** như trên.
  - **Depends on:** T-4-1
  - **Result:** `npm run build` thoát 0; hai lần chạy tuần tự, `"id":2` = 1 mỗi lần, decode thoát 0, stderr chỉ dòng khởi động. Cả hai output (`/tmp/out-minhchau.txt`, `/tmp/out-indacanda.txt`) chứa `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả` (1 lần) và 0 lần mỗi chuỗi `[mn10:`, `[thag1.1:`, `https://suttacentral.net/mn10/`, `https://suttacentral.net/thag1.1/`, `Translator: `, `[Hết văn bản`, `[... văn bản bị cắt`, `Deep link` (`grep -c -F`). Neo AC-4 của `specs/bilara-lang-param/requirements.md`: minh_chau chứa đúng câu `… với dịch giả Thích Minh Châu (minh_chau).`, danh sách gợi ý 10 entry, dòng đầu `English — Bhikkhu Sujato (sujato)`; indacanda chứa `(indacanda)` và `https://suttacentral.net/thag1.1`, không chứa `Sīhānaṁva nadantānaṁ,`; cả hai không chứa `Evaṁ me sutaṁ` và `segmented`; `grep -c 'segmented' src/index.ts` = 3. `formatUnavailable()`: tham chiếu T-4-1 (`formatUnavailable` 0 lần trong `git diff -U0`), kiểm lại lúc này vẫn 0, và thân hàm (26 dòng) `diff` với `git show HEAD:src/index.ts` rỗng. Script kiểm (scratchpad) đã xóa; `/tmp/out-{minhchau,indacanda}{,-raw}.txt` giữ lại cho T-4-9.

- [x] **T-4-8:** AC-7 — mở hai deep-link trên trình duyệt có giao diện (kiểm thủ công)
  - **Files:** — (không ghi file nào trong repo; không sửa `design.md`)
  - **Acceptance:**
    - Mở **một lần** trên trình duyệt thường (có giao diện, không headless): `https://suttacentral.net/mn10/en/sujato#mn10:13.1` và `https://suttacentral.net/dhp1-20/vi/phantuananh#dhp9:0`.
    - Mỗi trang hiển thị văn bản, cuộn tới đúng đoạn (`And so they meditate observing an aspect of the body internally …`; `Chuyện Devadatta (Đề-bà-đạt-đa)`), đoạn được tô nổi bật.
    - **Result phải ghi tên người đã thực hiện** (ví dụ user, hoặc agent nào), ngày, trình duyệt và phiên bản, kết quả từng URL. Kết quả này được đưa vào code review report (AC-7 cho phép design.md hoặc review report; task này không sửa `design.md`).
    - Nếu implementer không mở được trình duyệt có giao diện: **không** thay bằng một lần chạy headless khác (design đã có lần headless, `design.md:392-405`). Ghi Result "Chưa thực hiện — mục thủ công còn mở cho user", để checkbox trống, và báo trong phản hồi cuối. Task này không chặn T-4-9.
    - Nếu trang không cuộn tới đúng đoạn: halt, đưa lại requirements (AC-7, FR-4).
  - **Test:** quan sát trực tiếp trên trình duyệt.
  - **Depends on:** —
  - **Result:** Người thực hiện: user (báo trong phiên orchestrator, nguyên văn "Safari 26.6.2 - cả 2 đúng"); ngày 2026-10-03; trình duyệt Safari 26.6.2 (có giao diện). `https://suttacentral.net/mn10/en/sujato#mn10:13.1`: đạt — trang hiển thị văn bản, cuộn tới đúng đoạn `And so they meditate observing an aspect of the body internally …`, đoạn được tô nổi bật. `https://suttacentral.net/dhp1-20/vi/phantuananh#dhp9:0`: đạt — trang hiển thị văn bản, cuộn tới đúng đoạn `Chuyện Devadatta (Đề-bà-đạt-đa)`, đoạn được tô nổi bật. Implementer không mở trình duyệt; ghi lại theo báo cáo của user do orchestrator chuyển.

- [x] **T-4-9:** Dọn file tạm (NFR-2)
  - **Files:** — (`/tmp`, ngoài repo)
  - **Acceptance:**
    - Xóa `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, `/tmp/out-*.txt`, `/tmp/ref-mn10-sujato.txt`, `/tmp/n5r-*.txt` và mọi file trung gian còn lại do T-1-1..T-4-7 tạo.
    - `git status --short` chỉ còn các file thuộc phạm vi spec: `src/index.ts`, `specs/non-segmented-translation-guard/design.md`, `specs/bilara-lang-param/design.md`, `specs/sutta-mcp-requirements.md`, và `specs/segment-id-in-get-sutta/` (cùng tệp workflow/INDEX do orchestrator quản lý, nếu có). Không file debug/log nào trong repo.
  - **Test:** `ls /tmp/mcp-call.sh /tmp/mcp-stderr.log /tmp/out-*.txt /tmp/ref-*.txt /tmp/n5r-*.txt 2>&1` báo không tồn tại; `git status --short`.
  - **Depends on:** T-4-2, T-4-3, T-4-4, T-4-5, T-4-6, T-4-7
  - **Result:** Xóa theo tên 21 file do T-4-3..T-4-7 tạo (liệt kê trước khi xóa, không file lạ nào khớp glob): `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, `/tmp/ref-mn10-sujato.txt`, 18 file `/tmp/out-*.txt` (`sujato`, `phantuananh`, `mn10-raw`, `dhp-raw`, `sabbamitta{,-raw}`, `trush{,-raw}`, `s3{,-raw}`, `s500{,-raw}`, `snp18{,-raw}`, `minhchau{,-raw}`, `indacanda{,-raw}`). `/tmp/n5r-*.txt` và `/tmp/t41-diff.txt` đã xóa ngay trong T-2-2/T-4-1/T-4-2; script kiểm trong scratchpad đã xóa trong từng task. Test: `ls /tmp/mcp-call.sh /tmp/mcp-stderr.log /tmp/out-*.txt /tmp/ref-*.txt /tmp/n5r-*.txt` (bash) báo `No such file or directory` cho cả năm. `git status --short`: chỉ ` M` `src/index.ts`, `specs/non-segmented-translation-guard/design.md`, `specs/bilara-lang-param/design.md`, `specs/sutta-mcp-requirements.md`, `specs/segment-id-in-get-sutta/tasks.md`, `specs/segment-id-in-get-sutta/workflow-state.json` (orchestrator); không file untracked, không file debug/log trong repo (`dist/`, `node_modules/`, `.claude/`, `claudedocs/` là ignored sẵn có). T-4-8 không đụng.

## AC coverage

| AC / mục | Task |
|---|---|
| AC-1, AC-2 | T-4-3 |
| AC-3 | T-4-4 |
| AC-4 (+ baseline FR-2, kiểm bổ sung 2 ID gạch nối) | T-4-5 |
| Kiểm bổ sung 1 `snp1.8`/`piyadassi` — lưới duy nhất của served-lang FR-4 | T-4-6 |
| AC-5 | T-4-7 (+ phần `git diff` ở T-4-1) |
| AC-6 (build, phạm vi, NFR-1 `package.json`, NFR-7) | T-4-1 |
| AC-6 (diff khối normative, FR-7) | T-4-2 (+ diff tại chỗ ở T-1-1, T-2-1, T-3-1, T-3-2) |
| AC-7 | T-4-8 (thủ công; người thực hiện ghi trong Result) |
| AC-8 | T-3-3 |
| design-review-1 S2 (`bilara-lang-param/design.md:49`, `:55`) | T-3-2 |

## Notes

- **Ràng buộc phạm vi áp cho mọi task:** không thêm dependency npm; code chỉ trong `src/index.ts`, không file mới trong `src/`; không hàm module-scope mới; không thêm test framework hay linter; `tsconfig.json` không đổi; không đụng `formatCitation()`, `formatUnavailable()`, gate N1-B, schema `get_sutta`, bốn tool còn lại, `TOPIC_INDEX`, `DIVISIONS`, `describe()`, README.
- **Commit:** code (T-1-1, T-2-1, T-2-2) và đồng bộ tài liệu (T-3-1..T-3-3) là hai concern; FR-7 đòi tài liệu tiền nhiệm cập nhật **trong cùng thay đổi** (cùng nhánh/PR), nên AC-6 chỉ được đánh giá ở T-4-2 sau khi cả hai nhóm đã áp.
- **Kế thừa từ review, đã đưa vào task:** design-review-1 W1 → T-4-6 (bắt buộc, Result riêng) và mệnh đề "không bắt được" ở T-4-2; S1 (NFR-1) → T-4-1; S2 → T-3-2; S3 (đưa `snp1.8` vào AC-3 của requirements) để lại cho lần mở requirements kế tiếp, ngoài phạm vi tasks này.
