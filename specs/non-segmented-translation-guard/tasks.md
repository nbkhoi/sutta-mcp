# Tasks: Non-segmented translation guard cho `get_sutta`

**Status:** In Progress
**Created:** 2026-08-09
**Spec slug:** non-segmented-translation-guard
**Design:** [design.md](./design.md)
**Requirements:** [requirements.md](./requirements.md)

## Conventions

- Task ID theo mẫu `T-<phase>-<n>`.
- Mỗi task là một thay đổi logic, commit được độc lập; test/verify là task riêng, không nhét vào task implement.
- **Đọc tối thiểu để implement:** sáu khối `[NORMATIVE]` liệt kê ở `design.md:36-45`. Phần còn lại của `design.md` là lý do và bằng chứng — đọc khi gặp tình huống không có trong sáu khối, không cần để viết code.
- **N1 là đặc tả nguyên văn, không phải minh họa** (`design.md:79-88`). Hai khối N1-A và N1-B phải khớp **từng ký tự**, comment tính là một phần của luật. Vehicle kiểm là **`diff`**, không phải `grep`, không phải đọc lướt. Các task dưới đây **cố ý không chép lại code của N1** — chép từ `design.md` theo đúng dải dòng được chỉ, đừng chép từ file này và đừng diễn đạt lại.
- **Nhóm ghép commit G-1 = {T-1-2, T-2-1}.** `npm run build` xanh là tiêu chí **của cả nhóm**, không của từng thành viên: T-1-2 đổi kiểu trả về của `extractText()` nên build đỏ cho tới khi T-2-1 sửa call site. Tiêu chí build nằm ở T-3-1.
- Build/test command: `npm run build` (tsc, strict). Repo **không có** test runner và **không có** linter, và spec cấm thêm (`requirements.md:388`). Mọi kiểm hành vi đi qua harness JSON-RPC ở `requirements.md:162-194`.

## Phase 1: Foundation

- [x] **T-1-1:** Thêm helper module-scope `formatUnavailable()`
  - **Files:** `src/index.ts` (module scope, đặt cạnh `formatCitation()` ~`:128-141`)
  - **Acceptance:**
    - Có **đúng một** hàm module-scope mới trong toàn bộ feature này, và đó là `formatUnavailable()`; `collect`, `asNonEmpty`, `rank` đều là closure, không được nâng lên module scope (`design.md:117`, NFR-6).
    - Chữ ký và thân khung theo `design.md:160-174`: ba tham số `(citation, translations, translator)`, **một** `find`, `translatorName = requested?.author ?? translator` (FR-3 mục 2).
    - Bộ lọc viết thành **ba mệnh đề riêng, `author_uid !== translator` đứng đầu** (`design.md:169`, `design.md:178`) — điều kiện tự-loại-trừ phải độc lập, không được phái sinh từ `segmented`. Không cắt bớt danh sách.
    - `rank` theo `design.md:165-166`: tier 0 = `lang` của dịch giả được yêu cầu, tier 1 = `en`, tier 2 = phần còn lại; `sort` ổn định giữ thứ tự API trong cùng tier. **Không** viết thành "en trước tiên" — đó là drift được mô tả ở `design.md:328`, và T-3-4 tồn tại để bắt nó.
    - Chuỗi output dựng đúng template `[NORMATIVE]` ở `design.md:185-196`; nhánh danh sách rỗng in đúng một dòng ở `design.md:201` và **bỏ luôn dòng tiêu đề in đậm** (`design.md:204`).
    - Không string literal nào của helper chứa chuỗi `segmented`, kể cả nhánh rỗng (FR-3 mục cấm 4); không chứa `Translator: `, `[Hết văn bản`, `[... văn bản bị cắt`. Đối chiếu bảng `[NORMATIVE]` `design.md:206-219`.
    - Toàn bộ văn xuôi tiếng Việt (NFR-5).
  - **Test:** Hàm chưa được gọi ở task này (call site là T-2-1) — `tsconfig.json` không bật `noUnusedLocals` nên `npm run build` vẫn xanh sau task này, đó là tiêu chí kiểm nhanh tại chỗ. Kiểm hành vi: T-3-3 (nội dung thông báo) và T-3-4 (thứ tự danh sách).
  - **Depends on:** —
  - **Result:** Thêm `formatUnavailable()` ngay sau `formatCitation()` trong `src/index.ts` theo đúng khung `design.md:160-174` và template `design.md:185-204`; `npm run build` xanh, `grep segmented` chỉ hit biểu thức lọc.

- [x] **T-1-2:** Thêm `type ExtractedText` và viết lại thân `extractText()` theo **N1-A nguyên văn**
  - **Files:** `src/index.ts:110-126`
  - **Acceptance:**
    - Type `ExtractedText` ở module scope khớp `design.md:52-57` (gồm cả ba dòng comment trỏ về N1).
    - Thân `extractText()` khớp **từng ký tự** với khối N1-A ở `design.md:124-142` (19 dòng, comment là một phần của luật). Vehicle: trích khối đó ra file scratch rồi `diff` với vùng tương ứng trong `src/index.ts` — **không** kiểm bằng đọc code, **không** kiểm bằng grep.
    - Bộ chọn theo số key ở `src/index.ts:116` (`Object.keys(translation).length > 0 ? translation : root`) biến mất hoàn toàn; không còn biểu thức key-count nào trong hàm (FR-2, AC-7 mệnh đề 2).
    - Không đổi `tsconfig.json`. `noUncheckedIndexedAccess` đã bị từ chối **vì phạm vi** và quyết định đó được ghi ở `design.md:361-374` — task này không mở lại nó.
  - **Test:** `diff` nguyên văn với `design.md:124-142` (lặp lại như một mệnh đề của T-3-2). **`npm run build` đỏ sau task này là đúng dự kiến** — call site vẫn coi giá trị trả về là `string`; tiêu chí build thuộc nhóm G-1, kiểm ở T-3-1.
  - **Depends on:** —
  - **Result:** Chép nguyên văn type `ExtractedText` (`design.md:52-57`) và thân N1-A (`design.md:124-142`) vào `src/index.ts`, `diff` với cả hai khối rỗng, `Object.keys` còn đúng 2 hit ngoài `extractText()`; `npm run build` đỏ đúng dự kiến với một lỗi TS2339 duy nhất tại call site `get_sutta` (`src/index.ts:256`), chờ T-2-1 đóng nhóm G-1.

## Phase 2: Core Implementation

- [x] **T-2-1:** Rẽ nhánh guard tại call site trong `get_sutta` (**N1-B nguyên văn**) và chuyển đường FR-6 sang `extracted.lines`
  - **Files:** `src/index.ts:206-237` (thân handler `get_sutta`)
  - **Acceptance:**
    - Dòng điều kiện rẽ nhánh khớp **từng ký tự** với N1-B ở `design.md:230` (phần chú thích `// [NORMATIVE] N1-B …` là dấu đánh trong tài liệu, không phải nội dung phải chép), và khối guard đóng bằng dấu `}` ở `design.md:239`.
    - **Cấm tuyệt đối** rẽ nhánh bằng `extracted.lines.length === 0`. Biến thể đó compile sạch, đi qua **cả bốn** lệnh grep N2 và **cả bốn** mệnh đề AC-7, rồi in lại đúng 235 dòng Pali cho `mn10`/`minh_chau` — tức tái lập nguyên vẹn bug gốc (`design.md:73`, `design.md:250`, `design.md:384`). Chỉ `diff` với N1-B và T-3-3 bắt được nó.
    - Nhánh guard trả `content: [{ type: "text", text: formatUnavailable(citation, suttaplex?.translations ?? [], translator) }]`, **không** cờ `isError` (FR-5), và **không** đọc `extracted.lines`.
    - Lookup `translatorName` (`src/index.ts:214-216`) **di chuyển xuống dưới** guard, chỉ chạy ở nhánh `else` (`design.md:241-242`, `design.md:176`).
    - `const fullText = extractText(...)` + `fullText.split("\n").filter(Boolean)` (`src/index.ts:217-218`) biến mất; `lines` lấy thẳng từ `extracted.lines` (`design.md:243`).
    - Thân `get_sutta` **không** chứa chuỗi `translation_text` (AC-7 mệnh đề 3).
    - Phần còn lại của đường FR-6 (`truncated`, `isTruncated`, khối `output`) giữ nguyên.
    - Không thêm lời gọi `fetch` nào; vẫn đúng hai request trong `Promise.all` (NFR-4).
  - **Test:** `diff` N1-B với `design.md:230` và `:239`; kiểm hành vi ở T-3-3 (nhánh guard) và T-3-5 (đối chứng FR-6). Task này đóng nhóm G-1, nên `npm run build` phải xanh trở lại — xác nhận ở T-3-1.
  - **Depends on:** T-1-1, T-1-2
  - **Result:** Chèn guard N1-B sau `const extracted = extractText(bilaraData)` trong `get_sutta`; dòng `if` byte-identical với `design.md:230` (bỏ marker `[NORMATIVE]`), rẽ nhánh bằng `extracted.source`, không phải `lines.length`. `translatorName` chuyển xuống nhánh thành công; `fullText` + `split("\n")` xóa, `lines` lấy từ `extracted.lines`. `npm run build` exit 0 — nhóm G-1 đóng; `grep -c translation_text` = 1, không fetch mới.

- [x] **T-2-2:** Cập nhật `describe()` của tham số `translator` (FR-7)
  - **Files:** `src/index.ts:197-200`
  - **Acceptance:** Chuỗi `describe()` thay bằng khối `[NORMATIVE]` ở `design.md:257-262`. Mô tả nêu rõ không phải dịch giả nào trong metadata cũng lấy được toàn văn, trỏ tới `get_sutta_meta`, và **không** khẳng định `segmented` là điều kiện đủ. Đây là một trong đúng **ba** vị trí được phép chứa chuỗi `segmented` trong `src/index.ts` (hai vị trí kia: biểu thức lọc `t.segmented === true` ở T-1-1, và comment khối `ExtractedText` chứa slug `non-segmented-…` — phần nguyên văn N1, không sửa được; số "hai" ban đầu là con số chưa đo, đính chính 2026-08-09).
  - **Test:** T-3-6 (frame `tools/list`).
  - **Depends on:** T-2-1 (cùng khối tool, tách hunk cho gọn)
  - **Result:** `describe()` thay theo `design.md:257-262`, build xanh. Implementer phát hiện xung đột N1/N2: comment nguyên văn của `ExtractedText` chứa slug → `grep -c 'segmented'` = 3, không phải 2 như N2 ghim — con số chưa từng được đo trên chính comment N1 bắt buộc. Đã đính chính N2 (design.md:97), AC-6 (requirements.md:272) và hai mệnh đề trong tasks.md thay vì đụng khối nguyên văn; code không cần sửa.

## Phase 3: Verification & Documentation

- [x] **T-3-1:** Kiểm build sạch và phạm vi diff (AC-9, AC-10) — đóng nhóm G-1
  - **Files:** — (chỉ kiểm)
  - **Acceptance:**
    - `npm run build` thoát mã 0, không lỗi (AC-9). Đây là tiêu chí **của nhóm G-1**, không của T-1-2 riêng lẻ.
    - `git status` không hiện file mới nào trong `src/` (AC-9); `git diff -- package.json` rỗng (AC-10, NFR-1).
    - `git diff -- src/index.ts` không có hunk nào chạm `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`; ngoài `extractText()` và `get_sutta` chỉ có **một** hàm mới ở module scope; không lời gọi `fetch` mới nào (AC-10).
    - `git diff -- tsconfig.json` rỗng — hệ quả của quyết định phạm vi ở `design.md:361-374`.
  - **Test:** chính các lệnh trên; không cần harness.
  - **Depends on:** T-2-1, T-2-2
  - **Result:** `npm run build` exit 0 — nhóm G-1 đóng (AC-9). `git status --short`: chỉ `M src/index.ts`, không file mới trong `src/`; diff `package.json` và `tsconfig.json` rỗng (AC-10, NFR-1). Diff `src/index.ts` = 4 hunk (+68/−16), tất cả nằm trong `ExtractedText` + `extractText()`, `formatUnavailable()`, và `get_sutta` (describe + handler, dòng 230-291); đúng một hàm module-scope mới; không hunk nào chạm `search_topic`/`get_sutta_meta`/`get_parallels`/`list_divisions`/`TOPIC_INDEX`/`DIVISIONS` — hit grep duy nhất là chuỗi `get_sutta_meta` trong describe() FR-7, string literal chứ không phải code của tool đó; không `fetch` mới, vẫn đúng 2 request trong `Promise.all` (NFR-4).

- [x] **T-3-2:** Kiểm tĩnh: `diff` N1 + grep N2 + đọc code (AC-6, AC-7)
  - **Files:** — (chỉ kiểm)
  - **Acceptance:**
    - **`diff` N1-A**: thân `extractText()` trong `src/index.ts` khớp từng ký tự với `design.md:124-142`. **`diff` N1-B**: dòng điều kiện và dấu `}` đóng khớp `design.md:230` và `:239`. Đây là vehicle **bắt buộc** của AC-7 mệnh đề 2 và 4 (`design.md:306-313`).
    - **N2 chạy như bộ tiền lọc, và một mình nó KHÔNG đủ** (`design.md:90`, `design.md:105`): `grep -c 'translation_text'` → 1 (trong `extractText()`); `grep -c 'Object\.keys'` → 2 (một ở nhánh rỗng `search_topic`, một ở đầu `get_parallels`, nhận diện bằng ngữ cảnh chứ không bằng số dòng); `grep -c ' as '` → 2; `grep -c 'segmented'` → 3 (đính chính từ 2 — hit thứ ba là comment N1 chứa slug, xem T-2-2). **N2 xanh không kết luận được task đúng** — hai trong ba biến thể drift ở `design.md:66-75` đi qua sạch N2. Kết luận chỉ được rút từ `diff` N1.
    - AC-6: các hit của `grep -n 'segmented' src/index.ts` chỉ nằm ở biểu thức lọc FR-4, chuỗi `describe()` FR-7, và comment N1 của khối `ExtractedText` (slug chứa `segmented` như substring) — không hit nào ở string do nhánh guard xuất ra; nhánh rỗng in đúng `(không tìm thấy bản dịch nào khác cho kinh này)` (baseline trước thay đổi: 0 hit).
    - AC-7 mệnh đề 1 và 3: chỉ một vị trí đọc `translation_text` và nó nằm trong `extractText()`; thân `get_sutta` không chứa chuỗi đó; không tồn tại biểu thức key-count thứ hai ở bất kỳ đâu.
  - **Test:** như trên.
  - **Depends on:** T-3-1
  - **Result:** N1-A: `sed -n '124,142p' design.md` diff với `src/index.ts:119-137` (định vị bằng `grep -n '^function extractText'`) → rỗng, exit 0. N1-B: dòng `if` tại `src/index.ts:256` khớp `design.md:230` sau khi bỏ marker `[NORMATIVE]` (diff rỗng; design snippet de-indent so với handler nên chuẩn hóa leading whitespace), guard đóng bằng `}` trần tại `:265` khớp `design.md:239`; chỉ một hit `extracted.source` toàn file — rẽ nhánh bằng `source`, không phải `lines.length`. N2: `translation_text`=1 (`:134`, trong `extractText()`), `Object.keys`=2 (`:206` nhánh rỗng `search_topic`, `:341` đầu `get_parallels` — nhận diện bằng ngữ cảnh), ` as `=2 (`:132`, `:352`), `segmented`=3 (`:114` comment N1 chứa slug, `:162` bộ lọc FR-4, `:239` describe FR-7). AC-6: ba hit `segmented` đúng ba vị trí cho phép, hit duy nhất trong `formatUnavailable()` là biểu thức lọc chứ không phải string xuất ra; chuỗi nhánh rỗng byte-identical với pin `design.md:201`. AC-7 mệnh đề 1+3: `translation_text` chỉ đọc tại `:134` trong `extractText()`, thân `get_sutta` (`:246-288`) 0 hit; census `Object.keys(...).length` = đúng một hit tại `:341` (get_parallels, có sẵn từ trước) — không biểu thức key-count thứ hai.

- [x] **T-3-3:** Harness — ba case vào nhánh guard: AC-1, AC-4, AC-5
  - **Files:** — (kiểm hành vi; harness nằm **ngoài** repo)
  - **Acceptance:**
    - Harness dựng lại từ **heredoc gốc ở `requirements.md:170-186`** ra `/tmp/mcp-call.sh` (đường dẫn chỉ là chỗ đặt; file này không có trong cây nguồn, không commit — NFR-2). `npm run build` trước, vì harness chạy `dist/` chứ không phải `src/`.
    - **Điều kiện tiên quyết cho mỗi lần chạy:** `grep -c '"id":2'` trả về `1`. Thiếu dòng đó thì lần chạy **thất bại**, không phải pass — mọi mệnh đề phủ định đều được thỏa mãn bởi output rỗng (`requirements.md:188`). Khi thiếu: đọc `/tmp/mcp-stderr.log`, sửa nguyên nhân, chạy lại.
    - **AC-1** (`get_sutta '{"uid":"mn10","translator":"minh_chau"}'`): đủ mười mệnh đề ở `requirements.md:198-211` — chứa `minh_chau`, phát biểu thuần quan sát, chứa `https://suttacentral.net/mn10`; **không** chứa `Evaṁ me sutaṁ`, `Iriyāpathapabbaṁ niṭṭhitaṁ.`, `Translator: `, `[Hết văn bản`, `[... văn bản bị cắt`, `segmented`; văn xuôi tiếng Việt; `result.isError` vắng mặt hoặc `false`.
    - **AC-4** (`thag1.1` + `indacanda`): theo `requirements.md:239-248`.
    - **AC-5** (`dhp1-20` + `phantuananh`): theo `requirements.md:250-263`, gồm neo khẳng định (chứa `phantuananh`, chứa `https://suttacentral.net/dhp1-20`), vắng `manoseṭṭhā manomayā;` ở **cả hai** lần xuất hiện, và **`phantuananh` không nằm trong danh sách gợi ý** — mệnh đề tách điều kiện 1 khỏi điều kiện 2 của bộ lọc FR-4.
    - Nếu một literal đã pin không khớp: fetch lại endpoint tương ứng và so trước khi kết luận regression (`requirements.md:194`).
  - **Test:** như trên. Đây là kiểm duy nhất bắt được drift `extracted.lines.length === 0` ngoài `diff` N1-B.
  - **Depends on:** T-3-1
  - **Result:** `npm run build` exit 0 trước khi chạy; harness dựng lại từ heredoc `requirements.md:170-186`; cả ba lần chạy đều có đúng 1 dòng `"id":2`. AC-1 (`mn10`/`minh_chau`): đủ 10 mệnh đề — phát biểu thuần quan sát "API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả Thích Minh Châu (minh_chau).", chứa link SC, vắng cả 6 chuỗi cấm, văn xuôi guard tiếng Việt, `isError` vắng mặt. AC-4 (`thag1.1`/`indacanda`): pass, vắng `Sīhānaṁva nadantānaṁ,`. AC-5 (`dhp1-20`/`phantuananh`): pass — `manoseṭṭhā manomayā;` xuất hiện 0 lần trên toàn output (phủ cả đoạn root 6 lẫn 13), `phantuananh` xuất hiện đúng 1 lần và chỉ trong câu phát biểu; danh sách gợi ý gồm `sujato`, `suddhaso`, `sabbamitta`, `thitanana`, `luka` — không chứa `phantuananh`, chứng minh điều kiện tự-loại-trừ độc lập với bộ lọc `segmented`. Không literal pin nào lệch, không cần fetch đối chiếu. Harness giữ nguyên cho T-3-4/T-3-5 (dọn ở T-3-6).

- [x] **T-3-4:** Harness — thứ tự và nội dung danh sách gợi ý, **cả hai tier** của `rank` (AC-2 + cặp bù `mn10`/`sv`)
  - **Files:** — (kiểm hành vi)
  - **Acceptance:**
    - **AC-2** trên chính lời gọi của AC-1 (`mn10` + `minh_chau`): `minh_chau` không xuất hiện trong danh sách; diễn đạt dạng khả năng ("có thể … không bảo đảm"); không entry nào `is_root === true`; danh sách có **10 entry** và **dòng đầu là `sujato`**; vẫn kèm link SC cấp sutta.
    - **Kiểm bù bắt buộc — tier 0.** AC-2 **chỉ phủ một nửa** quy tắc thứ tự FR-4: cả hai case harness đều `requestedLang = "vi"` và không entry `vi` nào qua bộ lọc, nên tier 0 chết trong toàn bộ AC set (`design.md:321-330`). Chạy thêm `get_sutta '{"uid":"mn10","translator":"sv"}'` — endpoint trả HTTP 200 không `translation_text` nên guard nổ như AC-1, `requestedLang = "ru"`, bộ lọc để lại **9 entry**, và **dòng đầu phải là `Русский — o Dhamma.gift (o)`**, đứng **trên** `sujato`. Nếu `sujato` nhảy lên dòng đầu thì `rank` đã bị viết thành "en trước tiên" (`design.md:328`) — task T-1-1 chưa xong.
    - Điều kiện tiên quyết `"id":2` áp cho cả hai lần chạy.
  - **Test:** như trên; harness từ `requirements.md:170-186`, dựng lại nếu đã xóa.
  - **Depends on:** T-3-1
  - **Result:** `npm run build` no-op xanh; precondition `grep -c '"id":2'` = 1 cho **cả hai** lần chạy. Run 1 (`mn10`/`minh_chau`, AC-2): `minh_chau` xuất hiện đúng 1 lần toàn output — trong câu phát biểu, vắng khỏi mọi dòng `  • `; diễn đạt "có thể lấy được (không bảo đảm)", không từ ngữ cam kết; đúng **10 entry**, dòng đầu `English — Bhikkhu Sujato (sujato)`; link `https://suttacentral.net/mn10` có mặt. Kiểm `is_root` bằng suttaplex live: `mn10` có đúng một entry `is_root===true` (`ms`/Mahāsaṅgīti, `segmented=true` — chỉ mệnh đề `is_root !== true` loại được nó), và `(ms)`/`Mahāsaṅgīti`/`Pāli` đều 0 hit trong cả hai output. Run 2 (`mn10`/`sv`, tier 0): guard nổ như AC-1, `sv.lang = "ru"` xác nhận live → `requestedLang = "ru"`; bộ lọc để lại đúng **9 entry**, dòng đầu `Русский — o Dhamma.gift (o)` đứng **trên** `sujato` — tier 0 hoạt động, không có drift "en trước tiên" (`design.md:328`); `sv` tự-loại (chỉ 1 hit `(sv)`, trong câu phát biểu); đối chiếu chéo: danh sách run 2 = run 1 trừ `sv`, với `o` thăng lên đầu. Harness giữ nguyên cho T-3-5.

- [x] **T-3-5:** Harness — đối chứng FR-6: `mn10` + `sujato` không chạm guard (AC-3)
  - **Files:** — (kiểm hành vi)
  - **Acceptance:** Theo `requirements.md:224-237`: output chứa đúng dòng `Translator: Bhikkhu Sujato (sujato)`; dòng đầu phần thân là `Middle Discourses 10`; dòng thứ 50 là `And so they meditate observing an aspect of the body internally …`; output kết bằng đúng chuỗi `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`; không chứa chuỗi nào của thông báo guard. **Không** so khớp từng byte với output cũ — `formatCitation()` render từ response live nên byte-identity vỡ vì upstream trôi chứ không vì code. Con số `194` là số dòng sau lọc, không phải số key (233); nếu lệch, đối chiếu với số giá trị không rỗng của `translation_text` trong chính response lấy cùng lúc.
  - **Test:** như trên; điều kiện tiên quyết `"id":2` áp như T-3-3.
  - **Depends on:** T-3-1
  - **Result:** `npm run build` xanh trước khi chạy; precondition `grep -c '"id":2'` = 1. Cả sáu mệnh đề pass trên `mn10`/`sujato` (mặc định `max_segments`=50): dòng `Translator: Bhikkhu Sujato (sujato)` xuất hiện đúng 1 lần; thân định vị bằng cấu trúc — mọi dòng sau dòng `Translator:` + dòng separator `────`, chỉ đếm dòng không rỗng — cho dòng 1 = `Middle Discourses 10`, dòng 50 = `And so they meditate observing an aspect of the body internally …` (ellipsis là một phần của segment); output kết đúng byte `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]` — `194` khớp pin, không cần fetch đối chiếu; cả bốn chuỗi guard (`API SuttaCentral không trả về`, `Server cố ý không thay`, `Các bản dịch khác`, `(không tìm thấy bản dịch nào khác`) 0 hit; `result.isError` vắng mặt trong envelope. Không đụng source. Harness giữ nguyên cho T-3-6.

- [x] **T-3-6:** Kiểm mô tả tham số `translator` qua `tools/list` (AC-8)
  - **Files:** — (kiểm hành vi)
  - **Acceptance:** Thay frame thứ ba của harness bằng `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}` (`requirements.md:190`). Mô tả `translator` của `get_sutta` nêu rõ không phải dịch giả nào trong metadata cũng lấy được toàn văn, trỏ tới `get_sutta_meta`, và không khẳng định `segmented` là điều kiện đủ. Nếu không chạy được harness: đọc chuỗi `describe()` theo tên tham số (số dòng đã dịch sau T-2-2).
  - **Test:** như trên.
  - **Depends on:** T-3-1
  - **Result:** `npm run build` xanh; vehicle = harness (pipe frames trực tiếp vào `node ./dist/index.js` thay vì sửa bản sao script — tools/list không cần mạng nên `sleep 3` thay 20); precondition `grep -c '"id":2'` = 1. Mô tả `translator` trong `inputSchema` của `get_sutta` khớp khối FR-7 (`design.md:257-262`): nêu "Không phải dịch giả nào có trong metadata cũng lấy được toàn văn qua API", trỏ `get_sutta_meta`, và chuỗi `segmented` xuất hiện đúng 1 lần trong mệnh đề phủ định "kể cả khi metadata ghi segmented=true" — không có khẳng định điều kiện đủ. Cả ba mệnh đề AC-8 pass. Đã xóa `/tmp/mcp-call.sh` và `/tmp/mcp-stderr.log` (`tasks.md:171`), xác nhận không còn tồn tại.

- [x] **T-3-7:** Sửa mục 2 §"Hướng nâng cấp" trong `specs/sutta-mcp-requirements.md` (FR-8 + FR-9)
  - **Files:** `specs/sutta-mcp-requirements.md:291` (mục **2. Tiếng Việt**, hiện là một đoạn ba câu)
  - **Acceptance:** Theo AC-11 (`requirements.md:311-319`) và `design.md:270-275`. Bản thay phải nêu đủ **bốn** thứ:
    1. Cơ chế thật — endpoint trả **HTTP 200** với `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order` và **không có** `translation_text`; thất bại nằm ở phía ta, `extractText()` fallback im lặng sang `root_text`. Không còn khẳng định bilara API "không phục vụ được" theo nghĩa gọi là hỏng.
    2. Đủ ba dịch giả: `minh_chau`, `indacanda` (`segmented=false`) và `phantuananh` (`segmented=true`, scpub43, `is_published: true`, có source trong `bilara-data/translation/vi/phantuananh/sutta/kn`, web render HTTP 200 — vẫn không có `translation_text` cho `dhp`, `dhp1-20`, `dhp21-32`), tức cột `segmented` không dự đoán được kết quả.
    3. Ghi chú `minh_chau` và `phantuananh` là **hai `author_uid` khác nhau cùng ghi công Thích Minh Châu** — đúng chỗ gây nhầm mà output của bug tạo ra (`Translator: Bhikkhu Thích Minh Châu (phantuananh)`).
    4. Q1 viết dưới dạng **câu hỏi điều tra còn mở kèm bằng chứng**, không phải kế hoạch đã chốt.
    - **Không** còn câu nào nói phải chờ SC xuất bản bản dịch segmented tiếng Việt — mệnh đề đó nay sai.
    - Mục này dài hơn các mục anh em là chấp nhận được (`design.md:275`).
  - **Test:** đọc lại mục 2 và đối chiếu năm mệnh đề của AC-11.
  - **Depends on:** —
  - **Result:** Mục 2 viết lại thành khối đa đoạn (nay dòng 291-306): cơ chế thật (HTTP 200 + năm key, không `translation_text`, fallback im lặng của `extractText()` phía Sutta MCP — đã guard, có trỏ spec slug); ba dịch giả `minh_chau`/`indacanda` (`segmented=false`) và `phantuananh` (`segmented=true`, scpub43, `is_published: true`, source `bilara-data/.../vi/phantuananh/sutta/kn`, web render HTTP 200, vẫn không `translation_text` cho `dhp`/`dhp1-20`/`dhp21-32`) kèm kết luận cột `segmented` không dự đoán được; ghi chú hai `author_uid` cùng ghi công Thích Minh Châu; Q1 dạng "Câu hỏi mở (chưa điều tra)". Đối chiếu năm mệnh đề AC-11: (1) grep `không phục vụ được` = 0 hit toàn file, thay bằng "Lời gọi API không hỏng"; (2) HTTP 200 + thiếu key + fallback phía ta nêu ở dòng 293; (3) ba dịch giả dòng 296-298; (4) grep `chờ` = 0 hit toàn file; (5) câu hỏi mở dòng 304, không kế hoạch chốt — cả năm pass. Ngoài dự kiến: thêm 1 dòng trống trước mục 3 vì marker `3.` không interrupt được paragraph theo CommonMark (sẽ bị nuốt thành lazy continuation).

- [x] **T-3-8:** Đính chính F-04 trong `claudedocs/specs-review.md` — **sáu vị trí, một task, chỉ working copy** (FR-10)
  - **Files:** `claudedocs/specs-review.md` (gitignored `.gitignore:4`, untracked)
  - **Acceptance:**
    - **Phạm vi, giữ nguyên khi implement:** file này là bản nháp cục bộ theo lựa chọn có chủ đích của người dùng (commit `84d6706`). Bản sửa **không vào commit, không tới clone khác, và không được tính là kênh phát hành** cho bất kỳ đính chính nào — đính chính lâu dài nằm ở T-3-7. Không di chuyển file, không bỏ gitignore.
    - **Sáu vị trí đổi cùng lúc**, không sửa lẻ: dòng 192, 193, 195-197, 201 + khối `### Verdict Recommendation` 211-224 (gồm 219 và 221), dòng **294** trong bảng Combined Verdict Summary (nằm ngoài section F-04, hay bị bỏ sót), và bảng dịch giả 203-207. Sửa lẻ để lại tài liệu tự phủ định ở câu kế tiếp (`design.md:273`, `requirements.md:141-147`).
    - Kiểm bằng `grep -F` trên **toàn bộ file** theo AC-12 (`requirements.md:321-335`): biến mất `only serves segmented texts`, `will fail or return empty`, `Waiting for SC to publish segmented`, `Bilara API cannot serve them`, `segmented Vietnamese editions`; `grep -n 'UPSTREAM'` không trả dòng nào thuộc F-04 kể cả dòng 294; verdict nêu defect trong `extractText()` phía Sutta MCP chứ không quy toàn bộ về upstream; bảng có dòng `indacanda` và dòng `phantuananh` với `Segmented = Yes` / `Bilara API works? = No`, kèm ghi chú cột `Segmented` không suy ra cột `Bilara API works?`; có tham chiếu tới spec slug `non-segmented-translation-guard`.
    - **Không chặn chuyển pha** (AC-12 được đánh dấu như vậy ở `requirements.md:139`, `:324`).
  - **Test:** năm lệnh `grep -F` trên đều trả đúng 1 dòng trên file chưa sửa và phải trả 0 dòng sau khi sửa.
  - **Depends on:** —
  - **Result:** Sửa cả sáu vị trí trong một lượt, 4 hunk Edit. Before: cả năm chuỗi `grep -F` đều đúng 1 hit, `UPSTREAM` 2 hit (`:214` verdict, `:294` bảng tổng kết — cả hai thuộc F-04). After: năm chuỗi đều 0 hit, `grep -n 'UPSTREAM'` 0 dòng toàn file. Bullet 192-193 thay bằng cơ chế đo được (HTTP 200 + năm key, không `translation_text`, fallback im lặng của `extractText()` — đã guard); đoạn 195-197 thay mệnh đề "chờ SC xuất bản" bằng phản ví dụ `phantuananh`; Critical Assessment + verdict reframe thành defect `extractText()` phía Sutta MCP **cộng** hành vi endpoint upstream chưa giải thích; bảng thêm dòng `indacanda` (No/No) và `phantuananh` (**Yes**/**No**) kèm ghi chú cột `Segmented` không suy ra cột `Bilara API works?`; slug `non-segmented-translation-guard` xuất hiện trong section (nay `:193`, `:201`, `:222`) và hàng tổng kết (nay `:303`). **Lệch so với gợi ý ban đầu:** con dấu viết là `**FIX** (+ open upstream question)` với "upstream" thường — dấu `FIX + UPSTREAM` nguyên nghĩa sẽ tự fail mệnh đề `grep -n 'UPSTREAM'` của AC-12 vì grep phân biệt hoa thường và bắt substring; ngữ nghĩa reframe giữ nguyên. File vẫn gitignored/untracked, `git status` không liệt kê, không commit.

## AC coverage

| AC | Task |
|---|---|
| AC-1, AC-4, AC-5 | T-3-3 |
| AC-2 (+ tier 0 của `rank`, không AC nào phủ) | T-3-4 |
| AC-3 | T-3-5 |
| AC-6, AC-7 | T-3-2 |
| AC-8 | T-3-6 |
| AC-9, AC-10 | T-3-1 |
| AC-11 | T-3-7 |
| AC-12 (không chặn) | T-3-8 |

## Notes

- **Ràng buộc phạm vi áp cho mọi task:** không thêm dependency npm; không thêm file trong `src/`; không thêm test framework hay linter; đúng một hàm module-scope mới; diff giới hạn trong `extractText()` + `get_sutta` của `src/index.ts`; `tsconfig.json` không đổi (`noUncheckedIndexedAccess` đã bị từ chối vì phạm vi — `design.md:361-374`, không mở lại trong bất kỳ task nào); mọi string hướng người dùng viết tiếng Việt.
- **Hai cạm bẫy của harness** (`requirements.md:164-194`): nó chạy `dist/` chứ không phải `src/` — quên `npm run build` là verify code cũ; và mọi mệnh đề "không chứa X" đều pass trên output rỗng — luôn kiểm `grep -c '"id":2'` = 1 trước khi tin bất kỳ mệnh đề phủ định nào.
- **Dọn dẹp sau khi verify xong:** xóa `/tmp/mcp-call.sh` và `/tmp/mcp-stderr.log` (`requirements.md:192`).
- **Git:** repo đang ở `master`. Theo quy ước làm việc, tạo feature branch trước khi sửa code; T-3-8 sửa file gitignored nên không nằm trong commit nào.
