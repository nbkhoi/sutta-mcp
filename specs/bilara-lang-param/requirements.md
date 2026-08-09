# Requirements: Truyền query param `lang` vào `/api/bilarasuttas` cho `get_sutta`

**Status:** Reviewed
**Created:** 2026-08-09
**Spec slug:** bilara-lang-param
**Tiền nhiệm:** `specs/non-segmented-translation-guard/` — spec này giải chính câu hỏi Q1 mà spec đó để mở.

## Context & Goal

### Nguyên nhân — nay đã được xác lập

Spec tiền nhiệm có hẳn một section tên *"Không có nguyên nhân nào đã được xác lập"*. Nguyên nhân nay đã xác lập, bằng đọc source upstream và đo live (2026-08-09, toàn bộ tự thực hiện lại trong phiên soạn spec này):

**Phía upstream** (repo `suttacentral/suttacentral`, nhánh `main`):

- Route `/bilarasuttas/<uid>/<author_uid>` do `class SegmentedSutta` xử lý — `server/src/api/views/views.py:1054`. Dòng `:1058`: `lang = request.args.get('lang', 'en')` — thiếu query param `lang` thì server mặc định `'en'`.
- AQL `SEGMENTED_SUTTA_VIEW` (`server/src/common/queries.py`, filter ở `:1092`) chỉ nhận doc translation khi khớp cả hai điều kiện: `FILTER 'translation' NOT IN doc.muids OR (@author_uid IN doc.muids AND @lang IN doc.muids)`.
- Doc translation không khớp `lang` → bị lọc → response HTTP 200 **thiếu key `translation_text`** nhưng vẫn đủ `root_text`, `html_text`... — đúng từng chi tiết hiện tượng spec tiền nhiệm chụp được. (Khi không doc nào khớp `uid` cả — như UID gộp `dhp` — `views.py` trả `{'msg': 'Not Found'}` với HTTP 200.)

**Phía chúng ta:** `fetchBilaraText()` (`src/index.ts:18-23`) không truyền `lang`. Hệ quả: **mọi** bản dịch segmented không phải tiếng Anh — mọi ngôn ngữ, không riêng tiếng Việt — nhận response thiếu `translation_text`, và guard của spec tiền nhiệm chặn lại. Guard làm đúng chức năng (không nói dối, không gán nhầm); nó chỉ đang chặn oan những bản dịch lẽ ra phục vụ được.

Bảng đo live (2026-08-09):

| Lời gọi | Không `lang` | Có `lang` đúng |
|---|---|---|
| `dhp1-20/phantuananh` | 200, không `translation_text` | `?lang=vi`: **108 key, 108 đoạn sau lọc** (đoạn 1: `Tiểu Bộ Kinh`) |
| `dhp21-32/phantuananh` | (tiền nhiệm đo: không có) | `?lang=vi`: **63 đoạn sau lọc** |
| `mn10/sabbamitta` | 200, không `translation_text` | `?lang=de`: **204 key, 200 đoạn sau lọc** (`Mittlere Lehrreden 10`) |
| `mn10/sujato` | 233 key, 194 đoạn sau lọc | `?lang=en`: body **giống hệt từng byte** (`JSON.stringify` hai response bằng nhau) |
| `mn10/trush` (translator có **hai** entry suttaplex: `lang: "gu"` và `lang: "hi"`, đều `segmented=true`, `is_root=false`) | 200, không `translation_text` | `?lang=gu`: **230 đoạn sau lọc**; `?lang=hi`: **232 đoạn sau lọc** — một `author_uid`, hai lang, **cả hai** phục vụ được |
| `mn10/minh_chau` | 200, không `translation_text` | `?lang=vi`: **vẫn không** |
| `thag1.1/indacanda` | 200, không `translation_text` | `?lang=vi`: **vẫn không** |
| `dhp/phantuananh` (UID gộp) | không | `?lang=vi`: vẫn không — và `dhp/sujato?lang=en` cũng không (body chỉ có key `msg`): `dhp` không phải đơn vị phục vụ của endpoint với **bất kỳ** dịch giả nào; `/api/suttaplex/dhp` cũng không liệt kê `phantuananh` |

Hệ quả cho bức tranh cũ:

- **Phản ví dụ `phantuananh` tan.** Nó chưa bao giờ là "segmented=true nhưng không phục vụ được" — nó là "segmented=true nhưng bị hỏi bằng lang sai". AC-5 của spec tiền nhiệm pin `dhp1-20`/`phantuananh` là case guard **bắn**; sau fix này AC đó sẽ **fail thật** khi chạy harness, nên phải được viết lại (FR-7), không phải dọn dẹp tùy hứng.
- **Guard vẫn cần nguyên vẹn.** `minh_chau`, `indacanda` (legacy, không nằm trong collection `sc_bilara_texts`) không được phục vụ kể cả khi truyền đúng `lang=vi`. Nguyên tắc của spec tiền nhiệm — guard khóa vào **response thực tế**, không khóa vào cờ metadata — vẫn đúng và không được gỡ.
- **Hai edge đo thêm, đều rơi về guard chứ không vỡ:** translator gõ sai (`mn10/xyzzy`, có/không `lang` → 200, không `translation_text`, `root_text` 235 đoạn) và lang không tồn tại (`mn10/sujato?lang=xx` → 200, không `translation_text`). Tức trên các đường **input không hợp lệ hoặc tra cứu miss**, kết cục xấu nhất là guard bắn — không crash, không gán nhầm. Bao đóng này chỉ phủ các đường đó; nó **không** phủ case một-nhiều ngay dưới.
- **Một edge không rơi về guard: `author_uid → lang` là quan hệ một-nhiều trên dữ liệu sống.** `mn10`/`trush` (bảng trên): tra suttaplex ra **hai** ứng viên lang, cả hai phục vụ được — không có "suy sai" nào để guard chặn, guard không bắn và không nên bắn. Phục vụ lang nào là hành vi quan sát được từ ngoài, nên phải được chốt ở mức requirements (FR-2, mệnh đề một-nhiều) chứ không thả nổi cho cơ chế design chọn. Kết cục xấu nhất của các phương án tra-server-side: một bản dịch được `get_sutta_meta` quảng cáo không với tới được qua tool — chấp nhận cho prototype, xem §Ranh giới.

**Mục tiêu** — ba mảnh của cùng một thay đổi:

1. **Code**: `get_sutta` phục vụ được bản dịch segmented không phải tiếng Anh (truyền `lang` xuống `/api/bilarasuttas`), giữ nguyên hành vi đường tiếng Anh và guard.
2. **Spec tiền nhiệm**: `specs/non-segmented-translation-guard/requirements.md` — AC-5 không còn pin điều nay đã sai, Q1 của nó được đóng, các đoạn "nguyên nhân chưa biết" mang errata note.
3. **Master spec**: `specs/sutta-mcp-requirements.md` — đóng câu hỏi mở về đường render, sửa mục roadmap tiếng Việt: `phantuananh` nay phục vụ được.

### Ranh giới requirements / design

**Cách lấy giá trị `lang` cho một lời gọi `get_sutta` là quyết định của design**, không phải của tài liệu này (chốt sẵn trong dispatch). Ba phương án đã thấy — chúng **không** tương đương hành vi ở case một-nhiều (`mn10`/`trush`), nên bảng có hai cột: trade-off tài nguyên/trách nhiệm, và hành vi với case đó:

| Phương án | Trade-off phải cân | Hành vi với case một-nhiều (`trush`) |
|---|---|---|
| Thêm tham số tool cho caller | Đẩy trách nhiệm sang caller (Claude) — caller phải biết lang của translator; schema tool đổi → FR-8 mục (e) kích hoạt | Caller địa chỉ được **từng** lang (`gu` lẫn `hi`) — mơ hồ tan; nhưng khi caller không truyền param, vẫn cần đường suy server-side (AC-1/AC-2b gọi không param) → rơi về cùng tie-break hai hàng dưới |
| Tra `suttaplex.translations[].lang` của translator được yêu cầu | Dữ liệu có sẵn trong suttaplex — nhưng `get_sutta` hiện fetch suttaplex và bilara **song song** (`Promise.all`, `src/index.ts:248-251`); dùng suttaplex làm nguồn buộc hoặc serialize (thêm ~1 RTT mọi lời gọi) hoặc kết hợp retry | Tra ra **hai** entry — cần luật tie-break ghi thành văn trong `design.md` (FR-2); lang không được chọn không với tới được qua tool |
| Retry-on-miss (gọi không `lang`, miss thì tra lang rồi gọi lại) | Thêm tối đa 1 request bilara cho đường miss; đường en mặc định giữ nguyên latency | Bước tra-lang-sau-miss gặp đúng mơ hồ trên — cần cùng luật tie-break, cùng hệ quả |

Tài liệu này đặt ràng buộc **hành vi quan sát được từ ngoài** (FR-2..FR-5) và biên tài nguyên (NFR-6). Với case một-nhiều, *lang nào được phục vụ* chính là hành vi quan sát được — nên phần requirements của quyết định nằm ở FR-2 (phục vụ bất-kỳ-một là thỏa, tie-break deterministic, ghi thành văn); phần design là **nội dung** luật tie-break: chọn phương án, chọn luật, ghi cả hai vào `design.md`.

## Stakeholders

- **Primary users:** người dùng tiếng Việt — và mọi ngôn ngữ không phải tiếng Anh — nhóm mà guard hiện chặn oan toàn bộ bản dịch segmented của họ. `phantuananh` (Dhammapada tiếng Việt) là bản đầu tiên được mở khóa.
- **Secondary users:** Claude, caller của tool — thay vì nhận guard message và phải chọn lại dịch giả, nay nhận thẳng nội dung khi bản dịch thực sự tồn tại.
- **Operators / maintainers:** tác giả spec — hai tài liệu đang mang câu hỏi mở đã có lời giải; để nguyên là dẫn hướng sai cho công việc tiếp theo, đúng loại lỗi mà FR-8/FR-9 của spec tiền nhiệm từng đi sửa.

## Functional Requirements

- **FR-1: `fetchBilaraText` truyền được `lang`.** `fetchBilaraText()` nhận thêm ngôn ngữ đích và phát query param trên URL: `/api/bilarasuttas/{uid}/{translator}?lang={lang}`. Đây là điểm sửa transport duy nhất — không endpoint mới, không đổi `fetchSuttaplex()` / `fetchParallels()`.

- **FR-2: Bản dịch segmented không phải tiếng Anh được phục vụ.** Với cặp `(uid, translator)` mà endpoint có **ít nhất một** doc khớp `(author_uid, lang)` — case chuẩn `dhp1-20` + `phantuananh` — `get_sutta` phải trả nội dung bản dịch trên **đường bình thường** (đường FR-6 của spec tiền nhiệm): citation, dòng `Translator: ...`, các đoạn dịch, thông báo cắt/hết theo `max_segments`. Không thêm chế độ output mới.
  **Mệnh đề một-nhiều:** khi translator được yêu cầu có **nhiều** doc khớp với các `lang` khác nhau trên cùng uid (case sống: `mn10`/`trush` — `gu` 230 đoạn, `hi` 232 đoạn, đều `segmented=true`; đo 2026-08-09), phục vụ **bất kỳ một** doc khớp trên đường bình thường là thỏa FR-2. Luật tie-break (chọn lang nào) là của design, phải **deterministic** (hai lời gọi giống nhau → cùng lang) và **ghi thành văn trong `design.md`**. Hệ quả chấp nhận cho prototype: nếu design không cho caller địa chỉ lang, các bản dịch không được chọn không với tới được qua tool dù `get_sutta_meta` vẫn quảng cáo chúng (Q1 ghi nhận độ vênh này).

- **FR-3: Tổng quát theo ngôn ngữ — không riêng `vi`.** Cơ chế suy `lang` phải đúng cho mọi ngôn ngữ là **lang duy nhất** của translator trên uid đó (case kiểm: `mn10` + `sabbamitta` — tiếng Đức, 200 đoạn sau lọc); khi translator có nhiều entry khác lang trên cùng uid, mệnh đề một-nhiều của FR-2 điều chỉnh. **Cấm** hardcode map `translator → lang` hay nhánh riêng cho tiếng Việt (vehicle kiểm: AC-6, mệnh đề đọc-code). Nguồn lang hợp lệ đã biết: dữ liệu SC (field `lang` trong `suttaplex.translations[]` — đo 2026-08-09: entry `phantuananh` mang `lang: "vi"`, `sabbamitta` mang `lang: "de"`; **lưu ý tra cứu này là một-nhiều**: `trush` mang hai entry `gu`/`hi` trên `mn10`) hoặc caller cung cấp — design chọn.

- **FR-4: Hành vi đường tiếng Anh không đổi.** `mn10` + `sujato` giữ nguyên output như trước fix: cùng cấu trúc, cùng số đoạn. Cơ sở đã đo: `?lang=en` cho body giống hệt từng byte lời gọi không param, nên mọi phương án design đều thỏa được — nhưng vẫn phải kiểm bằng AC-3 vì đường suy lang là code mới.

- **FR-5: Guard giữ nguyên cho cặp không được phục vụ.**
  - `minh_chau` (`mn10`), `indacanda` (`thag1.1`) — kể cả khi `lang=vi` đã được truyền — vẫn nhận nguyên guard message của spec tiền nhiệm: cùng câu phát biểu quan sát, cùng danh sách gợi ý, cùng các lệnh cấm (không `Translator: `, không root text, không chuỗi cắt/hết văn bản, **không chuỗi `segmented`**).
  - **Không sửa `formatUnavailable()`** và các string nhánh guard — template [NORMATIVE] trong `design.md` tiền nhiệm.
  - Câu phát biểu quan sát ("API SuttaCentral không trả về nội dung bản dịch nào...") **vẫn đúng nghĩa đen sau fix** — với request đã truyền đúng lang mà vẫn không có nội dung. Không cần đổi chữ.
  - Translator gõ sai và lang suy sai đều rơi về guard (đã đo là hành vi endpoint) — không được thêm nhánh ném lỗi mới cho hai trường hợp này.

- **FR-6: Đồng bộ khối N1 với spec tiền nhiệm.** Thân `extractText()` và gate call-site là normative nguyên văn (N1-A `design.md:124-142`, N1-B `design.md:230`/`:239` của spec tiền nhiệm). Kỳ vọng của spec này: fix **không cần đụng** hai khối đó — điểm sửa nằm ở `fetchBilaraText()` và đường lấy lang, chạy **trước** `extractText()`. Nếu design chứng minh buộc phải đụng: cập nhật **đồng bộ cả hai phía** (`design.md` tiền nhiệm + `src/index.ts`), kiểm bằng `diff` từng byte — **không grep** (string wrap qua nhiều dòng làm `grep -F` câm lặng pass).

- **FR-7: Cập nhật `specs/non-segmented-translation-guard/requirements.md`.** Bốn việc, chỉ trên file đó:
  1. **Errata note ở đầu file**, đặt **trước** heading `## Context & Goal` (hiện ở dòng 7): ghi ngày, nói nguyên nhân đã được xác lập (thiếu query param `lang`; upstream mặc định `en` — trích nguyên văn `lang = request.args.get('lang', 'en')`, kèm con trỏ `views.py:1058`; câu code là neo chính, số dòng upstream có thể trôi), trỏ `specs/bilara-lang-param/`. Note là ô cửa đọc lịch sử: các đoạn tường thuật cũ (§"Không có nguyên nhân nào đã được xác lập", assumption "chưa biết"...) giữ nguyên như hồ sơ thời điểm, dưới ô cửa đó.
  2. **AC-5 viết lại thành case trả nội dung:** mọi mệnh đề yêu cầu guard bắn cho `dhp1-20`/`phantuananh` phải biến mất — chúng sẽ fail thật khi chạy harness sau fix; danh sách đầy đủ các mệnh đề phải gỡ nằm ở AC-7 (matcher toàn-file **và** matcher lát-cắt AC-5). Bản thay thế khẳng định nội dung tiếng Việt được trả và trỏ AC-1 của spec này làm bản chuẩn — con trỏ chứa slug `bilara-lang-param` và nằm **trong chính section AC-5** (AC-7 kiểm bằng lát cắt).
  3. **Đoạn "Vai trò các case class"** (hiện dòng 196) sửa tương ứng — AC-5 không còn là case guard.
  4. **Q1 đóng:** thay diễn đạt "Chưa điều tra" bằng lời giải + con trỏ sang spec này.
  5. **Có điều kiện** (đối xứng FR-8 mục (e)): nếu design chọn phương án phát request thứ ba (retry-on-miss), NFR-4 của spec tiền nhiệm ("vẫn đúng 2 request song song" — hiện dòng 156 của nó) trở thành phát biểu sai về hiện trạng, cùng loại mệnh đề trôi mà mục 2 tồn tại để gỡ. Khi đó errata note ở mục 1 ghi thêm một dòng: NFR-6 của `bilara-lang-param` thay thế biên 2-request (tối đa 3). Nếu design giữ 2 request: không đụng, không ghi gì.

  **Không đụng** `design.md`, `tasks.md`, `clarifications.md`, `reviews/` của spec đó — hồ sơ thi hành. Ngoại lệ duy nhất: khối N1 trong `design.md` nếu FR-6 kích hoạt.

- **FR-8: Cập nhật `specs/sutta-mcp-requirements.md`.** Trong mục 2 §"Hướng nâng cấp" và bảng endpoint:
  - (a) **Đóng khối "Câu hỏi mở (chưa điều tra)"** (hiện dòng 304): website render được vì nó truyền `lang`; endpoint mặc định `en` khi thiếu — trích nguyên văn `lang = request.args.get('lang', 'en')`, kèm con trỏ `views.py:1058` (câu code là neo chính, số dòng có thể trôi); fix phía Sutta MCP là truyền `?lang=` — trỏ spec slug `bilara-lang-param`.
  - (b) **Sửa dòng `phantuananh`** (hiện dòng 298): bỏ "**vẫn không trả** `translation_text`" — mô tả đúng: không trả khi thiếu `?lang=vi`; **có trả** khi truyền đúng (`dhp1-20`: 108 đoạn, `dhp21-32`: 63 đoạn — đo 2026-08-09). Riêng UID gộp `dhp` không phải đơn vị phục vụ của endpoint với bất kỳ dịch giả nào (kể cả `sujato` — body chỉ có key `msg`), không phải chuyện riêng của `phantuananh`.
  - (c) **Thay câu "cột `segmented` trong metadata không dự đoán được..."** (hiện dòng 300): mệnh đề đó dựa trên phản ví dụ nay đã tan. Bản thay: khi truyền đúng `lang`, mọi case đã đo khớp với cờ (`segmented=true` → phục vụ: `sujato`, `phantuananh`, `sabbamitta`; `segmented=false` → không: `minh_chau`, `indacanda`) — **kèm bảo lưu mẫu nhỏ, chưa phải bảo đảm**; guard vẫn khóa vào response.
  - (d) **Bảng endpoint** (hiện dòng 121): ghi query param — `GET /api/bilarasuttas/{uid}/{translator}?lang={lang}` — kèm ghi chú upstream mặc định `en` khi thiếu.
  - (e) **Có điều kiện:** nếu design thêm tham số tool mới cho `get_sutta`, bảng Input của Tool 2 (hiện dòng 166-172) cập nhật theo; nếu không, không đụng bảng đó.

## Non-Functional Requirements

- **NFR-1:** Không thêm dependency npm; `dependencies`/`devDependencies` trong `package.json` không đổi.
- **NFR-2:** Toàn bộ thay đổi code nằm trong `src/index.ts`; không file mới trong `src/`; script verify tạm nằm **ngoài** repo.
- **NFR-3:** `npm run build` (tsc, strict) thoát mã 0, không lỗi.
- **NFR-4:** Mọi string hướng người dùng bằng tiếng Việt; mọi response tool giữ link `suttacentral.net/{uid}` + tên dịch giả; nội dung SC không dùng train AI (ràng buộc dự án, không đổi).
- **NFR-5:** Không đụng bốn tool còn lại, `TOPIC_INDEX`, `DIVISIONS`, `formatCitation()`, `formatUnavailable()`. Thay đổi giới hạn trong `fetchBilaraText()`, tool `get_sutta` (handler, và schema nếu design chọn tool param), cộng **tối đa một helper module-scope mới** nếu design cần.
- **NFR-6: Biên request.** Spec tiền nhiệm pin "đúng 2 request song song" (NFR-4 của nó) — spec này **nới có kiểm soát**: mỗi lời gọi `get_sutta` phát tối đa **3** request tới SC, chỉ tới hai endpoint đang dùng (`/suttaplex/`, `/bilarasuttas/`). Request thứ ba chỉ được tồn tại nếu design chọn retry-on-miss. Nếu phương án được chọn tăng số round-trip **tuần tự** cho đường mặc định (`sujato`, tiếng Anh), `design.md` phải nêu rõ và biện luận.

## Acceptance Criteria

### Harness — cách chạy các tiêu chí hành vi

Tái dùng nguyên harness của spec tiền nhiệm: dựng lại `/tmp/mcp-call.sh` từ heredoc tại `specs/non-segmented-translation-guard/requirements.md:170-186` (heredoc là bản gốc; vị trí `/tmp` chỉ là chỗ đặt — không commit, xóa `/tmp/mcp-call.sh` và `/tmp/mcp-stderr.log` sau khi xong). Ba luật vận hành giữ nguyên:

1. `npm run build` **trước mọi lần chạy** — harness chạy `dist/`, không phải `src/`.
2. **Mọi lần chạy phải có đúng 1 dòng chứa `"id":2`** (`grep -c '"id":2'` = 1). Thiếu là lần chạy hỏng, không phải pass — mọi mệnh đề phủ định được thỏa bởi output rỗng. Khi thiếu: đọc `/tmp/mcp-stderr.log`, sửa nguyên nhân, chạy lại.
3. Mọi literal và con số pin dưới đây chụp live 2026-08-09, tự đo khi soạn spec. Upstream có thể trôi — nếu một literal không khớp, fetch lại endpoint đối chiếu trước khi kết luận là regression.

### AC-1: `dhp1-20` + `phantuananh` trả nội dung tiếng Việt

- **Maps to:** FR-1, FR-2, NFR-4
- **Given** `/api/bilarasuttas/dhp1-20/phantuananh?lang=vi` trả `translation_text` với 108 giá trị không rỗng sau lọc (đo 2026-08-09; không có `lang` → thiếu key)
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"dhp1-20","translator":"phantuananh"}'` và xác nhận có dòng `"id":2`
- **Then** output chứa đúng dòng `Translator: Bhikkhu Thích Minh Châu (phantuananh)`
- **And** chứa `URL: https://suttacentral.net/dhp1-20`
- **And** dòng đầu của phần thân là `Tiểu Bộ Kinh` (đoạn 1 sau lọc — giá trị thô `"Tiểu Bộ Kinh "` có space cuối, `.trim()` bỏ); chứa `Phẩm Song Yếu` (đoạn 3) và `biếng nhác, chẳng tinh cần.` (đoạn 41); dòng thân thứ 50 — dòng cuối trước tail — là `Chuyện Devadatta (Đề-bà-đạt-đa)`
- **And** kết thúc bằng đúng chuỗi `[... văn bản bị cắt sau 50 đoạn. Tổng: 108 đoạn. Tăng max_segments để xem thêm.]`
- **And** **không** chứa `API SuttaCentral không trả về nội dung bản dịch nào` (câu guard) và **không** chứa `manoseṭṭhā manomayā;` (neo root Pali đoạn 6/13 của spec tiền nhiệm — bản dịch hiển thị thì root không được phát)
- **And** trong envelope JSON-RPC, `result.isError` vắng mặt hoặc `false`

Đây là phép đảo của AC-5 spec tiền nhiệm: cùng một lời gọi, trước fix phải vào guard, sau fix phải ra nội dung. Hai spec vì thế không thể cùng đúng — FR-7 mục 2 là bắt buộc.

### AC-2: Tổng quát ngôn ngữ — `mn10` + `sabbamitta` (tiếng Đức)

- **Maps to:** FR-3
- **Given** `/api/bilarasuttas/mn10/sabbamitta?lang=de` trả 204 key / 200 giá trị không rỗng sau lọc (đo 2026-08-09; không có `lang` → thiếu key); entry suttaplex của `sabbamitta` mang `lang: "de"`, `segmented=true`, `is_root=false`
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"sabbamitta"}'` và xác nhận có dòng `"id":2`
- **Then** chứa đúng dòng `Translator: Sabbamitta (sabbamitta)`
- **And** chứa `URL: https://suttacentral.net/mn10`
- **And** dòng đầu của phần thân là `Mittlere Lehrreden 10`; chứa `So habe ich es gehört:` (đoạn 3); dòng thân thứ 50 là `1.5. Den Geist auf die Elemente richten`
- **And** kết thúc bằng đúng chuỗi `[... văn bản bị cắt sau 50 đoạn. Tổng: 200 đoạn. Tăng max_segments để xem thêm.]`
- **And** không chứa câu guard

Tiêu chí này tồn tại để giết implementation hardcode `vi`: một nhánh riêng "translator tiếng Việt thì thêm `?lang=vi`" pass AC-1 nhưng trượt AC-2. (Cái nó **không** giết được — map literal hai entry — bị mệnh đề đọc-code của AC-6 giết.)

### AC-2b: Case một-nhiều — `mn10` + `trush` được phục vụ, một trong hai lang

- **Maps to:** FR-2 (mệnh đề một-nhiều), FR-3
- **Given** `/api/suttaplex/mn10` liệt kê `trush` **hai lần** — `lang: "gu"` và `lang: "hi"`, cùng `author: "Trushant Majmudar"`, `segmented=true`, `is_root=false`; `?lang=gu` → 230 đoạn không rỗng sau lọc, `?lang=hi` → 232, không `lang` → thiếu `translation_text` (đo 2026-08-09)
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"trush"}'` và xác nhận có dòng `"id":2`
- **Then** chứa đúng dòng `Translator: Trushant Majmudar (trush)` (hai entry suttaplex cùng tên tác giả — đo 2026-08-09 — nên neo này không phụ thuộc tie-break)
- **And** chứa `URL: https://suttacentral.net/mn10`
- **And** kết thúc bằng đúng **một trong hai** chuỗi: `[... văn bản bị cắt sau 50 đoạn. Tổng: 230 đoạn. Tăng max_segments để xem thêm.]` (design chọn `gu`) hoặc `[... văn bản bị cắt sau 50 đoạn. Tổng: 232 đoạn. Tăng max_segments để xem thêm.]` (design chọn `hi`) — chuỗi khớp phải **trùng với luật tie-break ghi trong `design.md`**, và lặp lại y nguyên khi chạy lần hai (FR-2: deterministic)
- **And** không chứa câu guard

Tiêu chí cố ý lỏng đúng **một** bậc tự do — lang nào — vì đó là quyết định design chưa chốt khi soạn spec; mọi bậc còn lại pin chặt. Nó chạy được với mọi phương án trong bảng §Ranh giới: phương án nào pass AC-1 (gọi không param) đều phải có đường suy server-side, và đường đó gặp tie-break ở đây.

### AC-3: Đối chứng — `mn10` + `sujato` không đổi hành vi

- **Maps to:** FR-4
- **Given** `?lang=en` cho body giống hệt từng byte lời gọi không param (đo 2026-08-09), nên "không đổi" là khả thi với mọi phương án design
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"sujato"}'` và xác nhận có dòng `"id":2`
- **Then** chứa đúng dòng `Translator: Bhikkhu Sujato (sujato)`
- **And** dòng đầu của phần thân là `Middle Discourses 10`; dòng thân thứ 50 là `And so they meditate observing an aspect of the body internally …`
- **And** kết thúc bằng đúng chuỗi `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]` (233 key / 194 đoạn sau lọc — đo lại 2026-08-09, khớp số của spec tiền nhiệm)
- **And** không chứa chuỗi nào của guard message

**Không** so khớp từng byte với output cũ: `formatCitation()` render `translated_title`, `difficulty`, `parallel_count` từ response live — cùng caveat AC-3 của spec tiền nhiệm.

### AC-4: Guard vẫn bắn cho legacy — `mn10`+`minh_chau`, `thag1.1`+`indacanda`

- **Maps to:** FR-5, NFR-4
- **Given** cả hai cặp vẫn không có `translation_text` kể cả khi `?lang=vi` được truyền (đo 2026-08-09)
- **When** chạy hai lời gọi harness (`{"uid":"mn10","translator":"minh_chau"}` và `{"uid":"thag1.1","translator":"indacanda"}`), mỗi lần xác nhận có dòng `"id":2`
- **Then** (minh_chau) chứa đúng câu `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả Thích Minh Châu (minh_chau).`
- **And** (minh_chau) danh sách gợi ý vẫn **10 entry**, dòng đầu là `sujato` (đo lại 2026-08-09: 43 translations, 10 qua bộ lọc ba điều kiện; tier `vi` rỗng nên `en` lên đầu)
- **And** (indacanda) chứa `(indacanda)` trong câu phát biểu và chứa `https://suttacentral.net/thag1.1`; **không** chứa `Sīhānaṁva nadantānaṁ,`
- **And** cả hai output: không chứa `Translator: `, không chứa `Evaṁ me sutaṁ` (neo root `mn10`), không chứa `[Hết văn bản` cũng như `[... văn bản bị cắt`, không chứa chuỗi `segmented`
- **And** `grep -c 'segmented' src/index.ts` vẫn trả về **3** — đúng ba vị trí spec tiền nhiệm cho phép (bộ lọc FR-4 của nó, `describe()` FR-7 của nó, comment khối N1; baseline đo 2026-08-09: 3). Fix này không thêm hit mới; nếu design có lý do thêm, hit mới phải nằm ngoài string do guard xuất ra và được ghi trong `design.md`

### AC-5: Khối N1 không trôi

- **Maps to:** FR-6
- **When** chạy:

  ```sh
  awk '/^function extractText/,/^}$/' src/index.ts > /tmp/n1a-src.txt
  awk '/^function extractText/,/^}$/' specs/non-segmented-translation-guard/design.md > /tmp/n1a-design.txt
  diff /tmp/n1a-src.txt /tmp/n1a-design.txt
  ```

- **Then** `diff` rỗng, exit 0 (baseline trước fix: rỗng, 19 dòng mỗi phía — chạy thật 2026-08-09)
- **And** dòng gate `extracted.source !== "translation"` xuất hiện đúng **1** lần trong `src/index.ts` (baseline: 1), và `git diff` của nhánh không có hunk nào chạm thân `extractText()` hay khối `if` gate
- **And** nếu ngoại lệ FR-6 kích hoạt (design buộc đụng N1): hai mệnh đề trên chạy trên khối **mới** — diff vẫn phải rỗng ở cả hai phía, và `design.md` của spec này ghi rõ lý do
- Xóa hai file `/tmp/n1a-*.txt` sau khi kiểm.

### AC-6: Build sạch, diff đúng phạm vi

- **Maps to:** NFR-1, NFR-2, NFR-3, NFR-5, NFR-6
- **When** chạy `npm run build`, `git status`, `git diff -- src/index.ts package.json`
- **Then** tsc thoát mã 0; `git status` không hiện file mới trong `src/`
- **And** `package.json` không có thay đổi
- **And** trong `src/index.ts` không có hunk nào chạm `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`, `formatCitation()`, `formatUnavailable()`
- **And** ngoài `fetchBilaraText()` và `get_sutta`, có tối đa một hàm mới ở module scope
- **And** không có lời gọi `fetch` nào tới endpoint ngoài `/suttaplex/` và `/bilarasuttas/`; đường đi nhiều request nhất của `get_sutta` (đọc code) không vượt 3 request
- **And** (đọc code — vehicle cho lệnh cấm hardcode của FR-3; tồn tại vì map literal `{phantuananh: "vi", sabbamitta: "de"}` pass cả AC-1 lẫn AC-2) giá trị `lang` phát lên `/bilarasuttas/` chỉ được bắt nguồn từ **dữ liệu response suttaplex** hoặc **input tool**; trên đường suy `lang` không có object/map literal khóa theo translator-ID và không có string literal translator-ID nào
- **And** matcher hỗ trợ: `grep -n -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/index.ts` — **0** hit (baseline trước fix: 0, đo 2026-08-09 — matcher là bất biến "giữ 0", cùng kiểu `segmented`=3 của AC-4); `grep -c -F 'sujato' src/index.ts` vẫn **3** — đúng ba hit default-translator sẵn có (`:18` default param, `:237` schema, `:239` `describe()`; baseline 3, đo 2026-08-09), không hit `sujato` mới trên đường suy lang. Matcher không thay được mệnh đề đọc-code phía trên (map có thể dùng ID khác); nó chỉ chặn rẻ các ID mà AC pin

### AC-7: Spec tiền nhiệm được sửa đúng và đủ

- **Maps to:** FR-7
- **When** chạy `grep -F` trên `specs/non-segmented-translation-guard/requirements.md` (mọi baseline dưới đây đã chạy trên file **chưa sửa** ngày 2026-08-09 — không mệnh đề nào vacuous)
- **Then** `nhưng không được phục vụ` — **0** hit (baseline: **2** hit, dòng 196 và 250)
- **And** `đi vào **cùng nhánh guard** như AC-1` — **0** hit (baseline: 1, dòng 258)
- **And** `Trả lời được có thể mở khóa` — **0** hit (baseline: 1, dòng 375 — câu Q1 cũ)
- **And** `bilara-lang-param` — **≥ 2** hit (baseline: 0), và hit **đầu tiên** nằm ở dòng **nhỏ hơn** dòng của heading `## Context & Goal` (baseline heading: dòng 7) — tức errata note đứng đầu file đúng như FR-7 mục 1
- **And** **lát cắt AC-5**: `awk '/^### AC-5/,/^### AC-6/' specs/non-segmented-translation-guard/requirements.md` (trên file chưa sửa: 16 dòng — đo 2026-08-09). Ba matcher toàn-file phía trên không chạm bốn mệnh đề đòi-guard còn lại của AC-5 cũ (dòng 260–263), nên kiểm thêm trong lát cắt, bằng `grep -c -F`:
  - `bilara-lang-param` — **≥ 1** hit trong lát cắt (baseline: 0) — con trỏ của FR-7 mục 2 phải nằm trong chính section AC-5; hit này đồng thời chứng minh lát cắt không rỗng/không trượt heading
  - bốn cụm **phủ định** sau — mỗi cụm **0** hit trong lát cắt (baseline từng cụm: **1**, đo trên lát cắt chưa sửa 2026-08-09): (1) `` không chứa chuỗi `Translator: ` ``, (2) `` không chứa `[Hết văn bản ``, (3) `không xuất hiện trong danh sách gợi ý`, (4) `` không chứa chuỗi `segmented` ``
  - Matcher cố ý pin **cụm phủ định**, không pin chuỗi bên trong: bản AC-5 viết lại hợp lệ vẫn được chứa `Translator: Bhikkhu Thích Minh Châu (phantuananh)` làm neo khẳng định, mệnh đề "kết thúc bằng `[... văn bản bị cắt ...`", hay negation neo root `manoseṭṭhā manomayā;` (chính AC-1 spec này dùng đúng negation đó); còn `Translator: ` / `[Hết văn bản` ở AC-1/AC-4 của spec tiền nhiệm nằm **ngoài** lát cắt — matcher không chạm
- **And** (có điều kiện — chỉ khi design phát request thứ ba, FR-7 mục 5) chuỗi `NFR-4` xuất hiện **≥ 1** lần ở dòng **nhỏ hơn** dòng heading `## Context & Goal` — tức dòng supersede nằm trong errata note (baseline file chưa sửa: **0** hit trước heading; hai hit `NFR-4` sẵn có ở dòng 156 và 304 đều nằm **sau** heading — đo 2026-08-09). Nếu design giữ 2 request: mệnh đề không áp dụng
- **And** `git diff` cho `design.md`, `tasks.md`, `clarifications.md` và `reviews/` của spec đó rỗng (trừ ngoại lệ N1 của FR-6 — khi đó chỉ `design.md`, chỉ khối N1)

### AC-8: Master spec đóng câu hỏi, mô tả đúng hiện trạng

- **Maps to:** FR-8
- **When** chạy `grep -F` trên `specs/sutta-mcp-requirements.md` và đọc lại mục 2 §"Hướng nâng cấp" (mọi baseline đã chạy trên file chưa sửa ngày 2026-08-09)
- **Then** `vẫn không trả` — **0** hit (baseline: 1, dòng 298)
- **And** `Câu hỏi mở (chưa điều tra)` — **0** hit (baseline: 1, dòng 304)
- **And** `không dự đoán được` — **0** hit (baseline: 1, dòng 300)
- **And** `Trả lời được có thể mở khóa` — **0** hit (baseline: 1, dòng 304)
- **And** `?lang=` — **≥ 1** hit (baseline: 0; lưu ý `?language={lang}` của suttaplex ở dòng 120 **không** chứa chuỗi này, nên matcher không nhiễm)
- **And** `bilara-lang-param` — **≥ 1** hit (baseline: 0)
- **And** đọc nội dung mục 2: nêu 108 đoạn (`dhp1-20`) và 63 đoạn (`dhp21-32`) khi `?lang=vi`; nêu UID gộp `dhp` không được phục vụ với bất kỳ dịch giả nào; lời giải nêu upstream mặc định `en` khi thiếu param — **trích nguyên văn** `lang = request.args.get('lang', 'en')` làm neo chính, kèm con trỏ `views.py:1058` (số dòng upstream có thể trôi, câu code thì không — errata được đọc lâu sau khi viết); mệnh đề mới về cột `segmented` mang bảo lưu mẫu nhỏ và giữ nguyên tắc guard khóa vào response

## Assumptions

**VERIFIED (tự đo 2026-08-09 trong phiên soạn spec này):**

- Upstream, đọc source trực tiếp (raw GitHub, nhánh `main` — nhánh mặc định của `suttacentral/suttacentral`): `class SegmentedSutta` ở `server/src/api/views/views.py:1054`; `lang = request.args.get('lang', 'en')` ở `:1058`; filter AQL `FILTER 'translation' NOT IN doc.muids OR (@author_uid IN doc.muids AND @lang IN doc.muids)` ở `server/src/common/queries.py:1092`; nhánh `if not result: return {'msg': 'Not Found'}, 200` ngay dưới — giải thích luôn body chỉ-có-`msg` của UID gộp `dhp`.
- `dhp1-20/phantuananh?lang=vi`: 108 key, 108 giá trị không rỗng; đoạn 1 `Tiểu Bộ Kinh` (thô có space cuối), đoạn 3 `Phẩm Song Yếu`, đoạn 41 `biếng nhác, chẳng tinh cần.`, đoạn 50 `Chuyện Devadatta (Đề-bà-đạt-đa)`. Không `lang` → thiếu key `translation_text`.
- `dhp21-32/phantuananh?lang=vi`: 63 đoạn không rỗng. `dhp/phantuananh?lang=vi` và `dhp/sujato?lang=en`: không có `translation_text` (body `dhp/sujato` chỉ có key `msg`); `/api/suttaplex/dhp` không liệt kê `phantuananh`.
- `mn10/sabbamitta?lang=de`: 204 key / 200 đoạn không rỗng; đoạn 1 `Mittlere Lehrreden 10`, đoạn 3 `So habe ich es gehört:`, đoạn 50 `1.5. Den Geist auf die Elemente richten`. Không `lang` → thiếu key.
- `mn10/sujato`: 233 key / 194 đoạn không rỗng; body `?lang=en` giống hệt từng byte body không param (`JSON.stringify` bằng nhau) — cơ sở FR-4.
- `mn10/minh_chau?lang=vi` và `thag1.1/indacanda?lang=vi`: HTTP 200, không `translation_text` — guard tiền nhiệm vẫn đúng đối tượng.
- Edge: `mn10/xyzzy` (translator không tồn tại, có/không `lang`) → 200, không `translation_text`, `root_text` 235 đoạn; `mn10/sujato?lang=xx` → 200, không `translation_text`. Các đường input-không-hợp-lệ rơi về guard. (Spec tiền nhiệm để trường hợp typo ở UNVERIFIED — nay đã VERIFIED.)
- `mn10/trush` — case một-nhiều: `/api/suttaplex/mn10` liệt kê `trush` **hai lần**: `{author: "Trushant Majmudar", lang: "gu", segmented: true, is_root: false}` và `{author: "Trushant Majmudar", lang: "hi", segmented: true, is_root: false}`. `?lang=gu`: 230 key / 230 đoạn không rỗng sau lọc; `?lang=hi`: 232 / 232; không `lang`: thiếu key `translation_text` (body còn `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order`). Quan hệ `author_uid → lang` một-nhiều trên dữ liệu sống — cơ sở của mệnh đề một-nhiều FR-2 và AC-2b; hai entry cùng tên tác giả nên neo `Translator: Trushant Majmudar (trush)` không phụ thuộc tie-break.
- Suttaplex `translations[]` mang field `lang` dùng được cho design: `phantuananh` → `{author: "Bhikkhu Thích Minh Châu", lang: "vi", segmented: true, is_root: false}`; `sabbamitta` → `{author: "Sabbamitta", lang: "de", segmented: true, is_root: false}`; `minh_chau` → `{author: "Thích Minh Châu", lang: "vi", segmented: false}`.
- Bộ lọc gợi ý cho `mn10` trừ `minh_chau`: 10 entry (đo lại; thành phần danh sách và "dòng đầu `sujato`" khớp xác minh cùng ngày của spec tiền nhiệm).
- N1-A: `awk '/^function extractText/,/^}$/'` trích được đúng 19 dòng từ cả `src/index.ts` lẫn `design.md` tiền nhiệm, `diff` rỗng (baseline trước fix). Gate `extracted.source !== "translation"`: đúng 1 hit trong `src/index.ts`.
- `grep -c 'segmented' src/index.ts` = 3 (baseline AC-4).
- Heredoc harness nằm đúng `specs/non-segmented-translation-guard/requirements.md:170-186` (dòng 170 mở ```` ```sh ````, dòng 186 đóng).
- Baseline mọi matcher của AC-7/AC-8 trên hai file chưa sửa: như ghi trong từng mệnh đề.
- Baseline các matcher mới (đo 2026-08-09, trên file/lát cắt **chưa sửa**): lát cắt `awk '/^### AC-5/,/^### AC-6/'` trên requirements tiền nhiệm = **16 dòng**; trong lát cắt: `bilara-lang-param` **0** hit, bốn cụm phủ định của AC-7 mỗi cụm **1** hit (dòng 260–263); `NFR-4` trước heading `## Context & Goal` **0** hit (hai hit sẵn có ở dòng 156 và 304, sau heading); `grep -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/index.ts` **0** hit; `grep -c -F 'sujato' src/index.ts` = **3** (`:18`, `:237`, `:239`).

**UNVERIFIED (default stated):**

- **Cache upstream** (`@cache.cached` trên `SegmentedSutta`, `views.py:1055`) phân biệt query param trong cache key hay không — chưa kiểm riêng. Default: coi mỗi URL (kể cả query) là một entry riêng; mọi lần đo hôm nay nhất quán với giả định đó (có/không `lang` cho kết quả khác nhau, lặp lại được). Nếu sai, triệu chứng sẽ là kết quả không nhất quán giữa hai lần gọi gần nhau — chưa quan sát thấy.
- **Có tồn tại cặp `(uid range, translator segmented=true, đúng lang)` nào vẫn không được phục vụ** — chưa gặp sau khi truyền lang (mẫu: 3 case phục vụ). Default: không khẳng định chiều đủ của cờ `segmented` (FR-8 mục (c) bắt bảo lưu này); nếu tồn tại thì hành vi là guard bắn — đúng thiết kế, không mất an toàn.

**Cờ khả thi / phụ thuộc (chuyển tiếp cho `design.md`):**

- Ba phương án lấy `lang` + trade-off + cột hành vi case một-nhiều ở §Ranh giới requirements/design. Không phương án nào bị chặn bởi dữ liệu: suttaplex có field `lang`; retry và serialize đều nằm trong biên NFR-6. Design chọn một, ghi trade-off **và luật tie-break cho case một-nhiều** (FR-2 — AC-2b đối chiếu chuỗi khớp với luật đã ghi).
- Các đường **input không hợp lệ / tra cứu miss** (translator sai, lang không tồn tại) đều rơi về guard (đã đo) — design không cần nhánh lỗi mới cho chúng. Bao đóng này **không** phủ case một-nhiều (`trush`): ở đó guard không bắn và không nên bắn; món design nợ là luật tie-break deterministic ghi thành văn, không phải nhánh lỗi.
- FR-8 mục (e) là nghĩa vụ treo: chỉ kích hoạt nếu design thêm tham số tool.
- FR-6 là ràng buộc hình dạng diff, không phải yêu cầu tính năng: phương án nào giữ được `extractText()` và gate nguyên vẹn thì rẻ nhất để tuân thủ.

## Open Questions

- **Q1:** `get_sutta_meta` liệt kê mọi bản dịch không phân biệt lấy được hay không (Q2 của spec tiền nhiệm, chuyển tiếp). Sau fix này độ vênh giảm — `phantuananh` được quảng cáo và nay lấy được thật — nhưng legacy vẫn được quảng cáo, và thêm một dạng vênh mới ở case một-nhiều: lang không được tie-break chọn (`trush`: `gu` hoặc `hi`) vẫn được quảng cáo mà không với tới được qua tool, trừ khi design chọn phương án tool param (FR-2 chấp nhận cho prototype). Không chặn.
- **Q2:** `describe()` của tham số `translator` hiện nói "kể cả khi metadata ghi segmented=true" — hedge này mất phản ví dụ sống sau fix (mọi case `segmented=true` đã đo đều phục vụ được khi đúng lang). Default: **giữ nguyên chuỗi** — nó vẫn không sai (mẫu 3 case chưa chứng minh chiều đủ), và đổi nó kích hoạt lại AC-8 của spec tiền nhiệm. Không chặn.

## Out of Scope

- Gỡ hay nới guard cho legacy translators (`minh_chau`, `indacanda`) — họ không nằm trong `sc_bilara_texts`, không có đường phục vụ qua endpoint này; hướng legacy (nếu có) là feature khác.
- Sửa `design.md`, `tasks.md`, `clarifications.md`, `reviews/` của spec tiền nhiệm ngoài ngoại lệ N1 — hồ sơ thi hành, không viết lại lịch sử.
- `claudedocs/specs-review.md` (bản nháp cục bộ, gitignored — tiền lệ FR-10 tiền nhiệm): mục F-04 của nó ghi "open upstream question" nay đã có lời giải, tức lại lệch. Không sửa trong scope này; ai dùng bản nháp đó tự đối chiếu spec.
- Lựa chọn ngôn ngữ cho phần metadata của output (blurb, tiêu đề dịch qua `?language=` của suttaplex) — chỉ đường bilara text nằm trong scope.
- Cache phía Sutta MCP, test framework, linter — như mọi spec trước.
- Sửa `describe()` của `translator` (Q2) — default giữ nguyên.
