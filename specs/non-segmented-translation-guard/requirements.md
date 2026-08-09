# Requirements: Non-segmented translation guard cho `get_sutta`

**Status:** Reviewed
**Created:** 2026-08-08
**Spec slug:** non-segmented-translation-guard

## Context & Goal

`get_sutta` đang trả về **văn bản gốc Pali dưới tên của dịch giả được yêu cầu**, không kèm bất kỳ cảnh báo nào.

Hiện tượng quan sát được, xác minh live trên SuttaCentral API (2026-08-08, chạy lại 2026-08-09):

- `GET /api/bilarasuttas/mn10/minh_chau` trả **HTTP 200**. Key trong response đúng là: `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order` — **không có** `translation_text`.
- `extractText()` (`src/index.ts:112-126`) chọn nguồn bằng `Object.keys(translation).length > 0 ? translation : root`, nên rơi im lặng sang `root_text` — 235 đoạn Pali cho `mn10`.
- `get_sutta` (`src/index.ts:192-237`) in header `Translator: Thích Minh Châu (minh_chau)` phía trên 235 đoạn Pali đó.

Output thật của bug, chụp qua harness ở §Acceptance Criteria ngày 2026-08-09:

```
**MN 10** — The Discourse on Mindfulness Meditation
Difficulty: intermediate | Parallels: 16
URL: https://suttacentral.net/mn10
Translator: Thích Minh Châu (minh_chau)
────────────────────────────────────────────────────────────

Majjhima Nikāya 10
Satipaṭṭhānasutta
Evaṁ me sutaṁ—
...
[... văn bản bị cắt sau 50 đoạn. Tổng: 235 đoạn. Tăng max_segments để xem thêm.]
```

Lỗi này **hỏng im lặng chứ không nổ**. Người dùng hỏi bản dịch tiếng Việt nhận về tiếng Pali kèm khẳng định rằng đó là công trình của Thích Minh Châu. Nó vi phạm trực tiếp ràng buộc đã ghi trong `specs/sutta-mcp-requirements.md` §Constraints: *"Attribution: Mọi nội dung đều ghi rõ nguồn (SuttaCentral), dịch giả, và UID"*.

### Không có nguyên nhân nào đã được xác lập

Giả thuyết ban đầu — "bilara chỉ phục vụ bản dịch có `segmented=true`" — **đã bị bác bỏ bằng phản ví dụ live**:

| Dịch giả | `segmented` | Trạng thái xuất bản | `/api/bilarasuttas/` trả `translation_text`? |
|---|---|---|---|
| `sujato` | true | published | **Có** |
| `minh_chau` | false | legacy | Không |
| `indacanda` | false | legacy | Không |
| `phantuananh` | **true** | **published** (scpub43, `is_published: true`, có source trong `bilara-data/translation/vi/phantuananh/sutta/kn`) | **Không** |

Chi tiết phản ví dụ: `/api/suttaplex/dhp1-20` liệt kê `phantuananh` với `segmented=true`; cả ba lời gọi `/api/bilarasuttas/dhp/phantuananh`, `/api/bilarasuttas/dhp1-20/phantuananh`, `/api/bilarasuttas/dhp21-32/phantuananh` đều trả HTTP 200 với đúng bộ key `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order` — không có `translation_text`. Trong khi đó `suttacentral.net/dhp1-20/vi/phantuananh` render HTTP 200 bình thường, tức website phục vụ bản dịch này qua một đường khác với endpoint mà server này dùng.

Hệ quả bắt buộc cho thiết kế: **`segmented` không dự đoán được `get_sutta` sẽ nhận về gì.** Một bản dịch có thể `segmented=true`, đã xuất bản, đọc được trên web — và vẫn cho ra zero `translation_text` từ endpoint của chúng ta. Guard phải khóa vào **response thực tế**, không khóa vào bất kỳ cờ metadata nào, và **không được phát biểu nguyên nhân** trong thông báo cho người dùng, vì nguyên nhân hiện chưa biết.

**Mục tiêu:** `get_sutta` không bao giờ phát ra văn bản dưới một attribution sai, và nói rõ *điều quan sát được* khi không phục vụ được — không suy diễn lý do.

### Quyết định hành vi

Khi response bilara không mang nội dung bản dịch, `get_sutta` **trả về thông báo tường minh và không trả đoạn văn nào** (phương án (a) trong dispatch).

Lý do chọn (a):

- Giữ nguyên hợp đồng của tool — header của `get_sutta` là một khẳng định về quyền tác giả; không phát văn bản nào ra thì không thể gán sai. Phản ví dụ `phantuananh` càng củng cố: tập các cặp `(uid, translator)` bị ảnh hưởng rộng hơn và khó đoán trước hơn ta tưởng, nên phòng vệ phải nằm ở đường ra chứ không ở việc dự đoán đầu vào.
- Biến ngõ cụt thành đường đi tiếp: danh sách dịch giả khác cho phép caller (Claude) thử lại, không phải đoán.
- Thay đổi tối thiểu: dữ liệu cần cho thông báo đã nằm sẵn trong `suttaplex` mà `get_sutta` fetch song song, không thêm request nào.

Phương án bị loại — **(b) vẫn trả root text nhưng đổi nhãn header thành "văn bản gốc Pali"**:

- Vẫn nhét tới `max_segments` (mặc định 50) đoạn Pali vào context của một caller đang hỏi bản dịch tiếng Việt. Consumer ở đây là một LLM: có root text trong context thì khả năng cao nó trích luôn Pali làm câu trả lời — cùng một thất bại, chỉ tinh vi hơn và khó phát hiện hơn.
- Thêm một chế độ output thứ hai cho `get_sutta` (translation-mode vs root-mode) — rộng hơn một cái guard, mâu thuẫn với ràng buộc "giữ thay đổi tối thiểu, đây là prototype".
- Nhãn "root Pali" là thứ chưa ai yêu cầu; nếu sau này cần đọc root text thì đó là một tính năng opt-in riêng, không phải hệ quả phụ của việc gọi trúng một cặp `(uid, translator)` không được phục vụ.

Cũng bị loại: **tự động fallback sang `sujato`** — thay thầm lặng một dịch giả khác chính là lặp lại đúng lỗi gốc (trả về thứ caller không yêu cầu mà caller không nhận ra).

## Stakeholders

- **Primary users:** Phật tử / người học Phật pháp dùng Claude Desktop, đặc biệt người dùng tiếng Việt — nhóm gặp lỗi này trong thực tế vì cả ba dịch giả tiếng Việt đã kiểm tra đều không lấy được toàn văn qua endpoint hiện dùng.
- **Secondary users:** Claude với vai trò caller của tool — cần tín hiệu máy đọc được để chọn lại dịch giả thay vì trích nhầm Pali.
- **Operators / maintainers:** Tác giả spec — hai tài liệu hiện mô tả sai cơ chế và đang dẫn hướng sai cho công việc tiếp theo.

## Functional Requirements

- **FR-1: Phát hiện bản dịch vắng mặt — định nghĩa theo kết quả sau lọc.** `get_sutta` phải phát hiện khi response bilara **không sinh ra đoạn văn bản không rỗng nào từ `translation_text`**, và khi đó **không** được phát ra bất kỳ đoạn văn bản nào của sutta.

  "Không sinh ra đoạn nào" là định nghĩa duy nhất của "vắng mặt", và nó bao trùm cả ba trường hợp: thiếu hẳn key `translation_text`; có key nhưng object rỗng; có key với các giá trị đều rỗng hoặc chỉ khoảng trắng. Đây là **số dòng sau bộ lọc `text.trim()` ở `src/index.ts:120`**, không phải số key.

  Sự phân biệt này có thật, không phải giả định: `mn10`/`sujato` có **233 key** trong `translation_text` nhưng chỉ **194 dòng không rỗng** sau lọc (xác minh 2026-08-09). Đếm key và đếm dòng sau lọc là hai con số khác nhau trên chính đường đi bình thường, nên spec không được để mơ hồ cái nào quyết định.

- **FR-2: Một predicate duy nhất, khóa vào response, tiêu thụ chứ không tính lại.** Guard và `extractText()` phải dùng **chung một biểu thức** quyết định "có nội dung bản dịch hay không". Cụ thể:
  - `extractText()` phải trả về cả nguồn đã dùng lẫn các dòng đã lọc — ví dụ `{ source: "translation" | "root", lines: string[] }` — thay vì chỉ trả chuỗi.
  - `source` phải được suy ra **sau** bộ lọc `text.trim()`, tức từ số dòng còn lại (`lines.length > 0`), **không** từ `Object.keys(translation).length`. Ràng buộc này áp dụng cả **bên trong** `extractText()`: giữ nguyên bộ chọn theo số key ở `src/index.ts:116` rồi chỉ gắn thêm `source` sẽ cho ra `{ source: "translation", lines: [] }` với một `translation_text` toàn khoảng trắng — guard không nổ, và output là `Translator: <tên>` trên zero đoạn kèm `[Hết văn bản — 0 đoạn]`. Đó đúng là trường hợp thứ ba mà FR-1 tồn tại để chặn.
  - `get_sutta` phải **tiêu thụ** `source` đó để rẽ nhánh. Nó **không được** tự kiểm tra `bilaraData.translation_text` lần nữa, dù bằng biểu thức giống hệt.
  - Predicate **tuyệt đối không được** là `segmented`, hay bất kỳ cờ metadata nào khác từ suttaplex — phản ví dụ `phantuananh` chứng minh cờ đó cho false positive.

  Hai biểu thức song song, dù hôm nay giống hệt nhau về mặt chữ, là hai thứ được bảo trì độc lập và sẽ lệch nhau. Đây là rủi ro số một của feature này, nên nó được pin ở đây chứ không đẩy sang `design.md`, và có AC-7 kiểm bằng đọc code.

- **FR-3: Nội dung thông báo — chỉ nêu quan sát, không nêu nguyên nhân.** Output của nhánh guard **phải chứa**:
  1. Khối citation như hiện tại (acronym, tiêu đề, difficulty, parallels, link `https://suttacentral.net/{uid}`) — do `formatCitation()` sinh, giữ nguyên attribution nguồn.
  2. `author_uid` được yêu cầu, kèm tên đầy đủ dịch giả nếu tra được từ `suttaplex.translations` (fallback về chính `author_uid` nếu không tra được — như logic hiện có ở `src/index.ts:214-216`).
  3. Phát biểu **thuần quan sát**: API bilara không trả về nội dung bản dịch nào cho UID này với dịch giả này. Không giải thích vì sao.
  4. Câu nói rõ rằng server **cố ý không** thay thế bằng văn bản gốc Pali.

  Và **không được chứa**:
  1. Bất kỳ dòng nào gán văn bản cho dịch giả được yêu cầu (dòng dạng `Translator: <tên> (<author_uid>)`).
  2. Bất kỳ đoạn nào của `root_text`.
  3. Dòng thông báo cắt/hết văn bản (`[... văn bản bị cắt sau N đoạn...]`, `[Hết văn bản — N đoạn]`) — không có văn bản thì không có gì để đếm.
  4. **Bất kỳ mệnh đề nhân quả nào**, đặc biệt là mọi cách diễn đạt kiểu "bản dịch này không ở dạng segmented nên bilara không phục vụ được". Mệnh đề đó **sai** với `dhp1-20` + `phantuananh`. Cụ thể: chuỗi `segmented` không được xuất hiện trong bất kỳ string nào **do nhánh guard xuất ra**, kể cả nhánh danh sách gợi ý rỗng (xem FR-4). Lệnh cấm này giới hạn ở output của guard — nó **không** áp cho mô tả tham số ở FR-7, nơi từ này có thể xuất hiện hợp lệ.

- **FR-4: Gợi ý dịch giả thay thế — có bảo lưu, không cam kết.** Thông báo phải liệt kê các bản dịch khác của chính sutta đó lấy từ `suttaplex.translations` đã fetch sẵn, mỗi dòng gồm ngôn ngữ, tên dịch giả và `author_uid`. Danh sách phải được diễn đạt là **có thể** lấy được, không phải chắc chắn lấy được.

  **Bộ lọc gồm đúng ba điều kiện, hội đủ cả ba:**
  1. `author_uid !== <translator được yêu cầu>` — **loại chính dịch giả vừa báo là không lấy được**. Điều kiện này là độc lập và bắt buộc, không được để nó phát sinh như hệ quả phụ của điều kiện 2. Nếu chỉ dựa vào `segmented`, thì với `dhp1-20` + `phantuananh` (`segmented=true`) danh sách sẽ gợi ý lại đúng `phantuananh` trong chính thông báo vừa nói `phantuananh` không trả về gì — tự mâu thuẫn, trên đúng case class mà spec này gọi là quyết định.
  2. `segmented === true`
  3. `is_root !== true`

  Lý do giữ điều kiện 2 (phương án (ii) trong chỉ đạo) thay vì bỏ hẳn bộ lọc:
  - Bằng chứng hiện có cho thấy `segmented` là **điều kiện cần nhưng không đủ**: mọi trường hợp `segmented=false` đã kiểm tra (`minh_chau`, `indacanda`) đều không được phục vụ; chiều ngược lại mới là chiều có false positive (`phantuananh`). Nên nó vẫn có giá trị như một **bộ loại trừ cái đã biết là hỏng**, dù không có giá trị như một bảo đảm.
  - Bù lại cho phần over-promise còn sót: diễn đạt phải là "có thể", và luôn kèm link SC cấp sutta như đường thoát cuối cùng.

  **Thứ tự danh sách:** ngôn ngữ của bản dịch được yêu cầu trước (tra `lang` của entry có `author_uid` trùng translator được yêu cầu), rồi `en`, rồi phần còn lại giữ nguyên thứ tự API trả về. **Không cắt bớt danh sách.**

  Lý do: bộ lọc ba điều kiện cho `mn10` + `minh_chau` để lại **10 entry** (xác minh 2026-08-09: `sabbamitta/de`, `sujato/en`, `trush/gu`, `trush/hi`, `giovannizappa/it`, `piyadassi/lt`, `hardao/pl`, `sv/ru`, `o/ru`, `brankokovacevic/sr`), trong đó với một người đọc tiếng Việt chỉ `sujato` là dùng được thật. Sắp xếp đẩy thứ dùng được lên đầu mà không giấu gì. Cắt bớt thì cần một con số ngưỡng tùy tiện và có rủi ro giấu mất đúng entry dùng được, nên không cắt.

  **Nhánh danh sách rỗng:** nếu không bản nào qua đủ ba điều kiện, in đúng một dòng `(không tìm thấy bản dịch nào khác cho kinh này)`. Chuỗi này được pin ở đây vì cách diễn đạt tự nhiên nhất — "không có bản dịch segmented nào" — vi phạm FR-3 mục 4.

- **FR-5: Dạng response.** Guard trả về content text bình thường của MCP, không dùng cờ lỗi — khớp với ba nhánh "không tìm thấy" hiện có (`src/index.ts:163-172`, `250-254`, `289-293`).

- **FR-6: Không đổi hành vi đường có bản dịch.** Với dịch giả mà response có nội dung bản dịch, output phải giữ nguyên cấu trúc hiện tại: citation, dòng `Translator: ...`, các đoạn dịch, và thông báo cắt/hết văn bản theo `max_segments`.

- **FR-7: Mô tả tham số `translator`.** Cập nhật `describe()` của tham số `translator` trong `get_sutta` (`src/index.ts:197-200`) để nói rõ không phải dịch giả nào có trong metadata cũng lấy được toàn văn, và rằng có thể tra danh sách qua `get_sutta_meta`. Không được viết mô tả theo kiểu "chỉ bản dịch segmented mới lấy được" — đó chính là mệnh đề đã bị bác bỏ. Từ `segmented` **được phép** xuất hiện ở đây (ví dụ "`segmented=true` trong metadata không bảo đảm lấy được toàn văn"); lệnh cấm ở FR-3 mục 4 chỉ áp cho output của nhánh guard.

- **FR-8: Sửa mô tả cơ chế trong `specs/sutta-mcp-requirements.md`.** Mục 2 §"Hướng nâng cấp" (dòng ~291) hiện viết bilara API *"không phục vụ được"* theo kiểu gọi là hỏng. Phải sửa thành mô tả đúng: endpoint trả **HTTP 200** với body chứa `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order` và **không có** `translation_text`; thất bại nằm ở phía chúng ta — `extractText()` fallback im lặng sang `root_text`.

- **FR-9: Sửa lại bức tranh bản dịch tiếng Việt trong cùng mục.** Mục 2 hiện chỉ nêu `minh_chau` và kết luận rằng phải "chờ SC xuất bản bản dịch segmented tiếng Việt". **Mệnh đề đó nay sai.** Bản sửa phải nêu đủ:
  - `minh_chau` và `indacanda` — `segmented=false`, không lấy được.
  - `phantuananh` — Dhammapada (`text_uid: dhp`), ghi công *"Bhikkhu Thích Minh Châu"*, **`segmented=true` và đã xuất bản** (scpub43, `is_published: true`), có source trong `bilara-data/translation/vi/phantuananh/sutta/kn`, `suttacentral.net/dhp1-20/vi/phantuananh` render bình thường — **nhưng `/api/bilarasuttas/` vẫn không trả `translation_text`** cho `dhp`, `dhp1-20` lẫn `dhp21-32`.
  - Ghi chú phân biệt: `minh_chau` (legacy, non-segmented) và `phantuananh` (segmented, cũng ghi công Thích Minh Châu) là hai `author_uid` khác nhau — dễ nhầm. Header hiện tại của `get_sutta` cho `dhp1-20`/`phantuananh` in ra `Translator: Bhikkhu Thích Minh Châu (phantuananh)`, đúng kiểu gây nhầm đó.
  - Bỏ khung "chờ SC xuất bản": blocker hẹp hơn và khác với mô tả cũ. Không phải "SC chưa có bản dịch segmented tiếng Việt" — đã có.

  **Cách viết hướng đi tiếp:** phải ghi ở dạng **câu hỏi điều tra còn mở kèm bằng chứng**, không phải kế hoạch đã chốt. Ví dụ: *"Câu hỏi mở: website render `dhp1-20/vi/phantuananh` (HTTP 200) bằng đường nào, khi `/api/bilarasuttas/` không trả `translation_text`? Chưa điều tra. Không kết luận gì thêm cho tới khi có câu trả lời."* Lý do: spec này cấm phát biểu nguyên nhân chưa biết trong output (FR-3 mục 4); viết một hướng đi dựa trên cùng cái chưa biết đó vào roadmap dưới dạng khẳng định sẽ tạo ra đúng loại tiền đề sai mà cả tài liệu này đang đi sửa.

- **FR-10: Sửa finding F-04 trong `claudedocs/specs-review.md` — bản sửa cục bộ, không ship.**

  **Ghi chú phạm vi, phải giữ khi implement:** `claudedocs/` nằm trong `.gitignore` (`.gitignore:4`) và không có file nào được track (`git ls-files claudedocs/` rỗng). Đây là lựa chọn có chủ đích của người dùng — thư mục này là bản nháp cục bộ. Bản sửa dưới đây **chỉ có giá trị cho working copy của tác giả**; nó không vào commit, không tới clone khác, và **không được tính là kênh phát hành** cho bất kỳ đính chính nào. Mọi đính chính cần tồn tại lâu dài phải đi qua FR-8/FR-9 (`specs/sutta-mcp-requirements.md`, có track). Không di chuyển file, không bỏ gitignore. Vì lý do này AC-12 được đánh dấu **không chặn** việc chuyển pha.

  **Sáu chỗ, mỗi chỗ nêu chuỗi cần biến mất:**
  1. Dòng 192 — `The bilara API (\`/api/bilarasuttas/{uid}/{translator}\`) **only serves segmented texts**`. Đây **đúng là** giả thuyết mà §"Không có nguyên nhân nào đã được xác lập" ở trên tuyên bố đã bị bác bỏ, và nó nằm ngay **phía trên** dòng 193. Sửa mỗi 193 mà bỏ 192 sẽ cho ra một tài liệu tự phủ định ở câu kế tiếp. Đây là chỗ quan trọng nhất trong FR-10.
  2. Dòng 193 — `will fail or return empty \`translation_text\``. Thay bằng mô tả 200 + thiếu key + fallback im lặng như FR-8.
  3. Dòng 195-197 — `Waiting for SC to publish segmented Vietnamese translations`. Đây chính là mệnh đề FR-9 tuyên bố là sai; nó phải chết ở cả hai tài liệu, không chỉ một.
  4. Dòng 201 (`This is an upstream data constraint, not a code issue`) và verdict `UPSTREAM` ở dòng 214-216, **cùng toàn bộ khối `### Verdict Recommendation` 211-224**, trong đó có hai câu ở dòng 219 và 221: `Bilara API cannot serve them.` và `segmented Vietnamese editions."`. Reframe thành: một defect phía mình trong `extractText()` **cộng** một hành vi endpoint upstream chưa giải thích được. Phản ví dụ `phantuananh` khiến con dấu `UPSTREAM` càng sai hơn chứ không phải bớt sai — bản dịch tồn tại, segmented, đã xuất bản, web đọc được.
  5. Dòng 294 — hàng Combined Verdict Summary `| F-04 | Gap | Vietnamese translator path broken | **UPSTREAM** | Document SC non-segmented constraint in roadmap |`. Nằm **ngoài** section `## Finding: F-04`, nên dễ bị bỏ sót; verdict `UPSTREAM` ở đây phải đổi cùng lúc với mục 4, nếu không bảng tổng kết vẫn đóng dấu sai.
  6. Bảng dịch giả dòng 203-207 — thêm `indacanda` (Vietnamese, segmented No, bilara No) và `phantuananh` (Vietnamese, segmented **Yes**, bilara **No**), cộng một dòng ghi chú rằng cột `Segmented` **không** suy ra cột `Bilara API works?`. Dòng `phantuananh` là dòng phá vỡ tương quan mà bảng gốc ngụ ý.

  Thêm tham chiếu tới spec slug `non-segmented-translation-guard` trong section.

## Non-Functional Requirements

- **NFR-1:** Không thêm dependency npm nào; `package.json` phần `dependencies`/`devDependencies` không đổi.
- **NFR-2:** Không thêm file mới trong `src/`; toàn bộ thay đổi code nằm trong `src/index.ts`. Script kiểm thử tạm thời (xem §Acceptance Criteria) phải nằm **ngoài** repo.
- **NFR-3:** `npm run build` (tsc, strict) chạy sạch, thoát mã 0, không lỗi.
- **NFR-4:** Không phát sinh HTTP request mới — vẫn đúng 2 request song song như hiện tại (`fetchSuttaplex` + `fetchBilaraText`).
- **NFR-5:** Mọi string hướng người dùng viết bằng tiếng Việt, khớp giọng văn các thông báo sẵn có trong `src/index.ts`.
- **NFR-6:** Không đụng bốn tool còn lại, `TOPIC_INDEX`, `DIVISIONS`. Thay đổi giới hạn trong `extractText()`, tool `get_sutta`, và **tối đa một helper mới ở module scope** (ví dụ `formatUnavailable(suttaplex, translator)`). Helper là hình dạng được khuyến khích: FR-3 cộng FR-4 là một khối dựng chuỗi bốn phần, nhồi hết vào thân handler cho ra diff xấu hơn.

## Acceptance Criteria

### Harness — cách chạy các tiêu chí dưới đây

`npm run dev` **không** dùng để verify được: nó chạy `tsx src/index.ts`, kết nối `StdioServerTransport` rồi block (`src/index.ts:429-433`), tự nó không gọi tool nào. Mọi AC dưới đây được chạy bằng cách bơm khung JSON-RPC vào stdio của server.

`/tmp/mcp-call.sh` dưới đây là **vị trí tạm, dựng lại từ heredoc này mỗi lần cần** — không phải artifact của repo, đừng tìm nó trong cây nguồn và đừng commit nó. Heredoc là bản gốc; đường dẫn chỉ là chỗ đặt.

Quy trình đã chạy thật và xác nhận hoạt động ngày 2026-08-09 (không thêm dependency, thỏa NFR-1; file nằm ngoài repo, thỏa NFR-2):

```sh
npm run build   # bắt buộc: harness chạy dist/, không phải src/

cat > /tmp/mcp-call.sh <<'EOF'
#!/bin/sh
# $1 = tên tool, $2 = object arguments dạng JSON
{
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"ac","version":"1"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  printf '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"%s","arguments":%s}}\n' "$1" "$2"
  sleep 20   # chờ fetch mạng xong trước khi stdin đóng
} | node ./dist/index.js 2>/tmp/mcp-stderr.log
EOF
chmod +x /tmp/mcp-call.sh

/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"minh_chau"}'
```

**Điều kiện tiên quyết cho MỌI tiêu chí dưới đây — kiểm trước khi đánh giá bất kỳ mệnh đề phủ định nào:** output phải chứa một dòng JSON có `"id":2`. Nếu không có, lần chạy đó **thất bại**, không phải "pass". Các mệnh đề dạng "không chứa X" đều được thỏa mãn bởi một chuỗi rỗng, nên một lần chạy hỏng — `dist/` cũ chưa build lại, mạng chậm hơn `sleep 20`, exception ném trong `get_sutta` — sẽ giả vờ pass toàn bộ. Khi thiếu dòng `"id":2`: đọc `/tmp/mcp-stderr.log` (đây là lý do stderr được ghi ra file chứ không đổ vào `/dev/null`), sửa nguyên nhân, chạy lại. Kiểm nhanh: `grep -c '"id":2'` phải trả về `1`.

Text của tool nằm ở `result.content[0].text` trên chính dòng đó; envelope đầy đủ nên các mệnh đề về `isError` kiểm được trực tiếp. Với AC-8 (schema), thay frame thứ ba bằng `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}`.

Xóa `/tmp/mcp-call.sh` và `/tmp/mcp-stderr.log` sau khi verify xong.

**Về các literal đã pin:** mọi chuỗi và con số trong AC dưới đây được chụp live ngày 2026-08-09. Nội dung upstream có thể trôi. Nếu một literal không khớp, **kiểm tra bằng chứng trước khi kết luận là regression**: fetch lại endpoint tương ứng và so; chỉ khi response upstream vẫn như cũ mà output khác thì mới là lỗi của thay đổi này.

**Vai trò các case class:** hai case phải đi vào nhánh guard — `segmented=false` (AC-1) và `segmented=true` nhưng không được phục vụ (AC-5). AC-3 là **đối chứng**: đường bình thường không được chạm guard.

### AC-1: Trường hợp hỏng chuẩn — `mn10` + `minh_chau` không còn trả Pali

- **Maps to:** FR-1, FR-2, FR-3, FR-5, NFR-5
- **Given** `GET /api/bilarasuttas/mn10/minh_chau` trả HTTP 200 không kèm `translation_text`
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"minh_chau"}'` và xác nhận có dòng `"id":2`
- **Then** `result.content[0].text` chứa `minh_chau` và một phát biểu thuần quan sát rằng không nhận được nội dung bản dịch
- **And** chứa `https://suttacentral.net/mn10`
- **And** **không** chứa `Evaṁ me sutaṁ` (đoạn root thứ **3** sau lọc; giá trị thật trong response là `Evaṁ me sutaṁ—` với em dash cuối, nên kiểm bằng substring)
- **And** **không** chứa `Iriyāpathapabbaṁ niṭṭhitaṁ.` (đoạn root thứ **41** sau lọc — neo giữa vùng, vẫn nằm trong 50 đoạn mặc định, bắt được cả implementation chỉ chặn được vài đoạn đầu)
- **And** **không** chứa chuỗi `Translator: `
- **And** **không** chứa `[Hết văn bản` cũng như `[... văn bản bị cắt`
- **And** **không** chứa chuỗi `segmented` (FR-3 mục 4 — cấm mệnh đề nhân quả)
- **And** toàn bộ phần văn xuôi do guard sinh ra là tiếng Việt (NFR-5)
- **And** trong envelope JSON-RPC, `result.isError` vắng mặt hoặc `false`

### AC-2: Danh sách gợi ý tự loại mình, có thứ tự, và không cam kết

- **Maps to:** FR-4
- **Given** cùng lời gọi như AC-1
- **When** đọc output
- **Then** `minh_chau` **không** xuất hiện trong danh sách gợi ý — và điều này phải đúng **vì bộ lọc loại `author_uid` được yêu cầu**, không phải vì `minh_chau` tình cờ `segmented=false`. Kiểm chứng bằng AC-5, nơi hai lý do này tách nhau.
- **And** danh sách được diễn đạt ở dạng khả năng ("có thể"), không phải khẳng định lấy được
- **And** không có entry nào có `is_root === true`
- **And** danh sách có **10 entry** và **dòng đầu tiên là `sujato`** — `mn10` không có entry `vi` nào qua bộ lọc, nên tier `en` lên đầu theo quy tắc thứ tự của FR-4 (xác minh 2026-08-09: 43 translations, 10 qua bộ lọc ba điều kiện)
- **And** vẫn kèm link SC cấp sutta như đường thoát cuối

### AC-3: Đối chứng — `mn10` + `sujato` không chạm guard

- **Maps to:** FR-6
- **Given** `sujato` có nội dung bản dịch cho `mn10`
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"sujato"}'` và xác nhận có dòng `"id":2`
- **Then** output chứa đúng dòng `Translator: Bhikkhu Sujato (sujato)`
- **And** dòng đầu tiên của phần thân là `Middle Discourses 10`
- **And** dòng thứ 50 của phần thân là `And so they meditate observing an aspect of the body internally …`
- **And** output kết thúc bằng đúng chuỗi `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`
- **And** không chứa bất kỳ chuỗi nào của thông báo guard

Ba mệnh đề đầu pin cấu trúc; mệnh đề thứ tư pin cả `max_segments` lẫn tổng số đoạn sau lọc. **Không** dùng so khớp từng byte với output cũ: `formatCitation()` render `translated_title`, `difficulty.name` và `parallel_count` từ response live (`src/index.ts:213` → `:131-133`, phát ra ở `:138`), nên byte-identity sẽ vỡ vì upstream đổi `Parallels: 16` chứ không vì code — và không có bước nào chụp baseline trước khi sửa để mà so.

Con số `194` là **số dòng còn lại sau bộ lọc**, không phải số key: `translation_text` của `mn10`/`sujato` có 233 key nhưng chỉ 194 giá trị không rỗng (xác minh 2026-08-09). Nếu cần kiểm lại một cách miễn nhiễm với drift: `N` trong `Tổng: N đoạn` phải bằng số giá trị không rỗng của `translation_text` trong chính response lấy cùng lúc.

### AC-4: Guard độc lập với dịch giả — `thag1.1` + `indacanda`

- **Maps to:** FR-1, FR-3
- **Given** `/api/bilarasuttas/thag1.1/indacanda` trả HTTP 200 không kèm `translation_text` (24 đoạn root sau lọc)
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"thag1.1","translator":"indacanda"}'` và xác nhận có dòng `"id":2`
- **Then** output nêu `indacanda` và cùng phát biểu quan sát như AC-1
- **And** chứa `https://suttacentral.net/thag1.1`
- **And** **không** chứa `Sīhānaṁva nadantānaṁ,` (đoạn root thứ **7** sau lọc)
- **And** không chứa chuỗi `Translator: `
- **And** không chứa `[Hết văn bản` cũng như `[... văn bản bị cắt`

### AC-5: Case class quyết định — `dhp1-20` + `phantuananh` (`segmented=true` nhưng không được phục vụ)

- **Maps to:** FR-1, FR-2, FR-3, FR-4
- **Given** `/api/suttaplex/dhp1-20` liệt kê `phantuananh` với `segmented=true`, `is_root=false`, đã xuất bản (scpub43), và `suttacentral.net/dhp1-20/vi/phantuananh` render HTTP 200
- **And** `/api/bilarasuttas/dhp1-20/phantuananh` trả HTTP 200 không kèm `translation_text` (108 đoạn root sau lọc)
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"dhp1-20","translator":"phantuananh"}'` và xác nhận có dòng `"id":2`
- **Then** output **chứa** `phantuananh` — nêu tên dịch giả được yêu cầu theo FR-3 mục 2. Đây là neo khẳng định: bốn mệnh đề phủ định phía dưới đều được thỏa mãn bởi một output rỗng, nên phải có ít nhất một mệnh đề mà lần chạy hỏng sẽ trượt.
- **And** **chứa** `https://suttacentral.net/dhp1-20` (xác minh 2026-08-09: `formatCitation()` phát ra đúng URL này)
- **And** đi vào **cùng nhánh guard** như AC-1 — chứng minh guard khóa vào response chứ không vào cờ `segmented`
- **And** **không** chứa `manoseṭṭhā manomayā;` (đoạn root thứ **6** sau lọc; chuỗi này còn lặp lại ở đoạn **13**, nên sự vắng mặt phải đúng cho cả hai lần xuất hiện)
- **And** không chứa chuỗi `Translator: ` — lưu ý output hiện tại của bug in ra `Translator: Bhikkhu Thích Minh Châu (phantuananh)`, đúng kiểu gán nhầm mà FR-3 mục cấm 1 nhắm tới
- **And** không chứa `[Hết văn bản` cũng như `[... văn bản bị cắt`
- **And** **`phantuananh` không xuất hiện trong danh sách gợi ý** (khác với mệnh đề "chứa `phantuananh`" ở trên: tên dịch giả được nêu ở phần phát biểu, nhưng không được nằm trong danh sách thay thế). Đây là mệnh đề tách bạch điều kiện 1 khỏi điều kiện 2 của bộ lọc FR-4: `phantuananh` là `segmented=true` nên bộ lọc `segmented` **không** loại nó; chỉ điều kiện tự-loại-trừ mới loại được.
- **And** không chứa chuỗi `segmented` — nếu có, thông báo đang khẳng định một điều sai về chính dịch giả này

### AC-6: Nhánh danh sách gợi ý rỗng không làm vỡ lệnh cấm `segmented`

- **Maps to:** FR-3 mục 4, FR-4
- **Given** chưa xác minh được UID live nào rơi vào nhánh này, nên đây là tiêu chí **đọc code**, không gắn UID
- **When** đọc nhánh dựng thông báo guard trong `src/index.ts`
- **Then** chuỗi ký tự `segmented` không xuất hiện trong bất kỳ string literal nào **do nhánh guard xuất ra**, kể cả nhánh danh sách rỗng
- **And** nhánh rỗng in đúng `(không tìm thấy bản dịch nào khác cho kinh này)` như FR-4 pin
- **And** các hit của `grep -n 'segmented' src/index.ts` chỉ được nằm ở **ba** vị trí: logic lọc của FR-4, chuỗi `describe()` của FR-7, và dòng comment của khối `ExtractedText` trỏ về `design.md` — slug `non-segmented-translation-guard` chứa `segmented` như substring, comment đó là một phần của khối nguyên văn N1 nên không sửa được (phát hiện khi implement T-2-2, 2026-08-09). **Không** hit nào ở string do guard xuất ra. (Baseline: trước thay đổi `grep` này trả về 0 dòng, nên mọi hit đều là mới.)

### AC-7: Chỉ tồn tại một predicate, khóa vào số dòng sau lọc

- **Maps to:** FR-2
- **Given** thay đổi đã áp dụng
- **When** chạy `grep -n 'translation_text' src/index.ts` và đọc `extractText()` cùng thân `get_sutta`
- **Then** chỉ có **một** vị trí duy nhất đọc `translation_text` để quyết định có nội dung hay không, và vị trí đó nằm trong `extractText()`
- **And** `source` được suy ra từ **số dòng còn lại sau bộ lọc `text.trim()`** (`lines.length > 0`), **không** từ `Object.keys(translation).length` — ràng buộc này áp cả bên trong `extractText()`, không chỉ bên ngoài
- **And** thân handler `get_sutta` **không** chứa `translation_text` — nó rẽ nhánh bằng giá trị `source` mà `extractText()` trả về
- **And** không tồn tại biểu thức thứ hai kiểu `Object.keys(bilaraData?.translation_text ?? {}).length` ở bất kỳ đâu

Tiêu chí này tồn tại vì AC-1..AC-5 đều **pass** với một implementation có hai biểu thức song song giống hệt nhau, và mệnh đề thứ hai tồn tại vì giữ nguyên bộ chọn theo số key ở `src/index.ts:116` rồi chỉ gắn thêm `source` cũng pass mọi tiêu chí hành vi — trong khi vẫn để lọt trường hợp `translation_text` toàn khoảng trắng (FR-1 case 3).

### AC-8: Mô tả tham số dẫn hướng caller mà không nói sai

- **Maps to:** FR-7
- **Given** đã `npm run build`
- **When** gửi frame `tools/list` qua harness — hoặc, nếu không chạy được harness, đọc chuỗi `describe()` của tham số `translator` trong tool `get_sutta` (tham chiếu theo tên, vì FR-7 sửa chính khối đó nên số dòng sẽ dịch)
- **Then** mô tả của `translator` nêu rõ không phải dịch giả nào trong metadata cũng lấy được toàn văn
- **And** trỏ tới `get_sutta_meta` như cách tra danh sách bản dịch
- **And** không khẳng định `segmented` là điều kiện đủ

### AC-9: Build sạch

- **Maps to:** NFR-2, NFR-3
- **When** chạy `npm run build`
- **Then** tsc thoát mã 0, không lỗi
- **And** `git status` không hiện file mới nào trong `src/`

### AC-10: Diff bị giới hạn đúng phạm vi

- **Maps to:** NFR-1, NFR-4, NFR-6
- **When** chạy `git diff -- src/index.ts package.json`
- **Then** `package.json` không có thay đổi
- **And** trong `src/index.ts` không có hunk nào chạm `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX` hay `DIVISIONS`
- **And** ngoài `extractText()` và `get_sutta`, có tối đa một hàm mới ở module scope
- **And** không có lời gọi `fetch` mới nào được thêm

### AC-11: `specs/sutta-mcp-requirements.md` mô tả đúng cơ chế và đúng hiện trạng tiếng Việt

- **Maps to:** FR-8, FR-9
- **When** đọc lại mục 2 §"Hướng nâng cấp"
- **Then** không còn khẳng định bilara API "không phục vụ được" theo nghĩa gọi là hỏng
- **And** có nêu rõ: HTTP 200, thiếu key `translation_text`, và fallback im lặng sang `root_text` ở phía chúng ta
- **And** nêu đủ `minh_chau`, `indacanda` (`segmented=false`) và `phantuananh` (`segmented=true`, đã xuất bản, vẫn không lấy được qua `/api/bilarasuttas/`)
- **And** **không** còn câu nào nói rằng phải chờ SC xuất bản bản dịch segmented tiếng Việt
- **And** phần về đường render của website được viết dưới dạng câu hỏi mở chưa điều tra, không phải kế hoạch đã chốt

### AC-12: F-04 trong `claudedocs/specs-review.md` được đính chính (cục bộ, KHÔNG chặn chuyển pha)

- **Maps to:** FR-10
- **Given** file này gitignored và untracked — tiêu chí này chỉ kiểm được trên working copy của người sửa, không phát hành đi đâu, và **không chặn** việc chuyển sang pha design. Các đính chính có giá trị lâu dài nằm ở AC-11.
- **When** chạy `grep -F` trên **toàn bộ file**, không giới hạn trong section `## Finding: F-04`
- **Then** không còn chuỗi `only serves segmented texts` (dòng 192)
- **And** không còn chuỗi `will fail or return empty` (dòng 193)
- **And** không còn chuỗi `Waiting for SC to publish segmented` (dòng 197)
- **And** không còn chuỗi `Bilara API cannot serve them` (dòng 219)
- **And** không còn chuỗi `segmented Vietnamese editions` (dòng 221)
- **And** `grep -n 'UPSTREAM' claudedocs/specs-review.md` không trả về dòng nào thuộc F-04 — **kể cả dòng 294** trong bảng Combined Verdict Summary, nằm ngoài section F-04
- **And** phần verdict nêu defect trong `extractText()` phía Sutta MCP, không quy toàn bộ nguyên nhân về upstream
- **And** bảng dịch giả có dòng `indacanda` và dòng `phantuananh` với `Segmented = Yes` nhưng `Bilara API works? = No`
- **And** có ghi chú rằng cột `Segmented` không suy ra cột `Bilara API works?`
- **And** có tham chiếu tới spec slug `non-segmented-translation-guard`

Năm chuỗi trên đều đã chạy `grep -F` trên file **chưa sửa** ngày 2026-08-09 và mỗi chuỗi trả về đúng 1 dòng — tức mọi mệnh đề đều có khả năng fail trước khi sửa và pass sau khi sửa. Chuỗi từng được đề xuất trước đó, `waiting for segmented Vietnamese editions`, **không** dùng được: nó bị ngắt dòng giữa `:220` và `:221` nên `grep -F` trả về rỗng ngay cả trên file chưa sửa, khiến mệnh đề pass một cách vô nghĩa.

## Assumptions

**VERIFIED:**

- Bilara trả HTTP 200 kèm `root_text` mà không có `translation_text` cho một số cặp `(uid, translator)` — `mn10`/`minh_chau`, `thag1.1`/`indacanda` (24 đoạn root sau lọc), `dhp1-20`/`phantuananh` (108 đoạn root sau lọc). Chạy lại 2026-08-09.
- `segmented=true` **không** kéo theo bilara phục vụ được: `phantuananh` là `segmented=true`, `is_root=false`, `is_published: true` (scpub43), có source trong `bilara-data/translation/vi/phantuananh/sutta/kn`, và `suttacentral.net/dhp1-20/vi/phantuananh` render HTTP 200 — nhưng endpoint vẫn không trả `translation_text`.
- **Tham số `language` của suttaplex không lọc danh sách `translations`.** `/api/suttaplex/mn10` trả về **cùng một mảng 43 entry** cho `?language=en` và `?language=vi`, cả hai đều chứa `('minh_chau', segmented=false)`. `language` chỉ localize blurb và title. Vậy `fetchSuttaplex(uid)` ở mặc định `en` (`src/index.ts:209`) **vẫn thấy** các entry tiếng Việt, nên FR-3 mục 2, FR-4, AC-2 và AC-5 an toàn như đang viết. Xác minh trực tiếp trên `mn10` (`sujato`: `author='Bhikkhu Sujato'`, `segmented=true`; `minh_chau`: `author='Thích Minh Châu'`, `lang_name='Tiếng Việt'`, `segmented=false`).
- **Bộ lọc ba điều kiện của FR-4 cho `mn10` + `minh_chau` để lại đúng 10 entry**, chỉ `sujato` là thực dụng với người đọc tiếng Việt — cơ sở cho quy tắc thứ tự trong FR-4 và mệnh đề đếm trong AC-2.
- **Số key ≠ số đoạn phát ra.** `mn10`/`sujato` có 233 key trong `translation_text` nhưng 194 giá trị không rỗng; `root_text` có 235 key và cả 235 đều không rỗng. Đây là lý do FR-1 định nghĩa "vắng mặt" theo kết quả sau lọc.
- **Vị trí các neo Pali sau lọc** (dùng cho AC-1, AC-4, AC-5): `mn10` — `Evaṁ me sutaṁ—` ở đoạn 3, `Iriyāpathapabbaṁ niṭṭhitaṁ.` ở đoạn 41; `thag1.1` — `Sīhānaṁva nadantānaṁ,` ở đoạn 7; `dhp1-20` — `manoseṭṭhā manomayā;` ở đoạn 6 và lặp ở đoạn 13. Tất cả đều nằm trong 50 đoạn mặc định nên các mệnh đề phủ định không vô nghĩa.
- Output thật hiện tại của `mn10`/`sujato` kết bằng `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`, header `Translator: Bhikkhu Sujato (sujato)`, thân bắt đầu bằng `Middle Discourses 10`.
- `formatCitation()` phát ra `URL: https://suttacentral.net/dhp1-20` cho `dhp1-20` và `URL: https://suttacentral.net/thag1.1` cho `thag1.1` — cơ sở cho các neo khẳng định ở AC-4 và AC-5.
- Harness JSON-RPC qua stdio (§Acceptance Criteria) chạy được, lộ đầy đủ envelope (kiểm được `isError`), và với `2>/tmp/mcp-stderr.log` thì dòng khởi động `Sutta MCP server running (stdio)` vào file log chứ không lẫn vào stdout — chạy thật 2026-08-09.
- `extractText()` fallback sang `root_text` khi `Object.keys(translation).length === 0` — `src/index.ts:113-116`.
- `get_sutta` đã có `suttaplex` trong scope tại thời điểm dựng header, nên FR-4 không cần request thêm — `src/index.ts:208-216`.
- `extractText()` chỉ có đúng một caller (`src/index.ts:217`, trong `get_sutta`), nên đổi kiểu trả về theo FR-2 không lan sang bốn tool còn lại.
- Convention "không tìm thấy → text thường, không phải cờ lỗi" — `src/index.ts:163-172`, `250-254`, `289-293`.
- `grep -n 'segmented' src/index.ts` hiện trả về 0 dòng — baseline cho AC-6.
- `claudedocs/` gitignored (`.gitignore:4`) và không track file nào (`git ls-files claudedocs/` rỗng).
- Repo không có test runner và không có linter — `CLAUDE.md`, `package.json`.

**UNVERIFIED (default stated):**

- **`segmented=false` có phải chỉ báo âm đáng tin không** — mới kiểm 2 dịch giả (`minh_chau`, `indacanda`), cả hai đều không lấy được; chưa gặp trường hợp `segmented=false` mà lấy được. Default: coi `segmented` **chỉ như bộ loại trừ** trong FR-4, không bao giờ như bộ dự đoán trong FR-2. Rủi ro nếu sai: danh sách gợi ý giấu mất một dịch giả thực ra dùng được — tác động thấp, vì link SC cấp sutta luôn có mặt như đường thoát.
- **Vì sao endpoint không phục vụ `phantuananh`** — chưa biết. Default: không đoán, không viết lý do vào bất cứ đâu hướng người dùng (FR-3 mục 4), và viết ở roadmap dưới dạng câu hỏi mở (FR-9). Xem Q1.
- **Có tồn tại `translation_text` mà mọi giá trị đều rỗng/khoảng trắng không** — chưa gặp live. Default: FR-1 định nghĩa theo kết quả sau lọc và AC-7 kiểm bằng đọc code, nên nhánh này được che phủ mà không cần UID.
- **`author_uid` gõ sai / không tồn tại cũng trả 200 + `root_text`** — chưa gọi live. Default: guard kích hoạt theo *sự vắng mặt của nội dung dịch*, không theo lý do vắng mặt, nên trường hợp typo tự động được che phủ. Nếu thực tế endpoint trả 404 thì `fetchBilaraText()` ném lỗi như hiện nay và đó vẫn chấp nhận được (hỏng ồn ào, không gán sai).
- **Có tồn tại sutta mà không bản dịch nào qua được cả ba điều kiện FR-4** — chưa tìm được UID live. Default: FR-4 pin sẵn chuỗi cho nhánh rỗng; AC-6 kiểm bằng đọc code thay vì gắn UID.

**Cờ khả thi / phụ thuộc (chuyển tiếp cho `design.md`):**

- Không có phụ thuộc chặn: mọi dữ liệu cần thiết đã có trong hai response đang fetch.
- Hình dạng interface của `extractText()` đã được pin trong FR-2 (`{ source, lines }`, với `source` suy từ số dòng sau lọc) thay vì để `design.md` tự quyết — vì đây là rủi ro số một và nó cần một AC bám vào (AC-7).

## Open Questions

- **Q1:** Website SC render `dhp1-20/vi/phantuananh` bằng đường nào, nếu không phải `/api/bilarasuttas/`? Chưa điều tra. Trả lời được có thể mở khóa bản dịch tiếng Việt segmented, và nó thay thế hướng "chờ SC xuất bản" đã bị bác bỏ. Không chặn spec này — guard cố tình không phụ thuộc vào câu trả lời.
- **Q2:** `get_sutta_meta` hiện liệt kê mọi bản dịch, tức nó vẫn quảng cáo cả `minh_chau` lẫn `phantuananh` cho một caller rồi sẽ bị guard chặn. Ngoài phạm vi hiện tại (không đụng tool khác), nhưng nên xử lý ngay sau. Không chặn.
- **Q3:** Có nên đưa deep-link cấp bản dịch (`suttacentral.net/{uid}/{lang}/{author_uid}`) vào thông báo guard không? Dạng URL này mới xác minh đúng **một** trường hợp (`dhp1-20/vi/phantuananh`, HTTP 200), chưa đủ để tổng quát hóa. Default hiện tại: chỉ dùng link cấp sutta mà `formatCitation()` sinh ra.

## Out of Scope

- Error handling, cache, và `TOPIC_INDEX` tĩnh của bốn tool còn lại — các gap đã biết, tách riêng.
- Điều tra và tích hợp đường phục vụ bản dịch mà website dùng (Q1) — spec này chỉ dừng ở chỗ không nói dối về nó.
- Chế độ opt-in đọc `root_text` Pali của `get_sutta` — chưa ai yêu cầu; nếu cần thì phải là tham số tường minh, không phải hệ quả phụ của guard.
- Tự động fallback sang `sujato` khi dịch giả được yêu cầu không lấy được — bị loại vì lặp lại đúng lỗi gốc.
- Cắt bớt danh sách gợi ý theo một ngưỡng số lượng — cần một con số tùy tiện và có rủi ro giấu mất entry dùng được; FR-4 giải bài toán nhiễu bằng thứ tự thay vì bằng cắt.
- Lọc / đánh dấu khả dụng trong output `get_sutta_meta` (Q2) — cùng chủ đề nhưng khác tool.
- Đưa `claudedocs/specs-review.md` ra khỏi `.gitignore`, hay chuyển nó thành artifact có track — người dùng đã chọn giữ nó cục bộ (commit `84d6706`); FR-10 tôn trọng lựa chọn đó.
- Thêm test framework hay linter — ràng buộc dispatch nói rõ không.
