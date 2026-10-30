# Clarifications: tools-api-passthrough

**Spec slug:** tools-api-passthrough
**Created:** 2026-10-24
**Trạng thái:** đã giải quyết 2026-10-24, không còn câu nào chặn design. Người dùng chọn default cho C1 và C4, chấp nhận C3 kèm yêu cầu cảnh báo trong `describe()`. C2, C5–C12 không được trả lời nên dùng default.

Năm quyết định ngày 2026-10-24 đã chốt và không mở lại:

1. Một spec cho cả bốn tool.
2. Đặt tên tool theo endpoint, và đổi `search_topic` thành `search_instant`.
3. Tham số của tool là tham số của API.
4. Mọi tool có `format` `text`/`json`.
5. `get_bilarasuttas` bỏ mọi logic tự chế và không cắt văn bản. `get_menu` thay `DIVISIONS`.

Các câu dưới đây chỉ hỏi những chi tiết mà năm quyết định chưa nói. Số đo trong file này lấy bằng `curl` ngày 2026-10-24. Body chỉ được phân tích trong thư mục `mktemp -d` rồi xóa, không lưu lại.

---

## C1 — `text` hiển thị object lồng nhau và map segment ra sao (đã giải quyết; từng chặn design)

**Người dùng trả lời (2026-10-24):** chọn default (A), một bộ hiển thị chung, đệ quy, cho cả bốn tool.

Theo quyết định 4, `text` in mọi field theo thứ tự API, không lọc, không gộp, không sắp lại. Tiền lệ `search_topic` không trả lời được câu này: `formatSuttaplexItem()`/`formatHit()` trong `src/search.ts` chọn từng field và bỏ `translations`, nghĩa là có lọc. Bốn body cần hiển thị có hình dạng như sau:

| Endpoint | Hình dạng đo được |
|---|---|
| `/api/suttaplex/mn10` | mảng 1 phần tử, 19 key. Có object lồng (`difficulty: {name, level}`, `previous`/`next: {name, uid}`) và mảng object (`translations`, 43 mục, mỗi mục 12 key) |
| `/api/suttaplex/mn` | mảng phẳng 171 phần tử, cây duỗi theo thứ tự trước (mỗi `branch` đứng trước các phần tử con của nó, `branch` và `leaf` xen kẽ), 4442 mục `translations`, 1,343,704 B |
| `/api/parallels/mn10` | object có key là anchor nguồn (`mn10`, `mn10#44.1`, `mn10#47.1`, `mn10#10.1`), mỗi key trỏ tới một mảng entry `{enumber, to: {…, translations}, type, remark, resembling}` |
| `/api/bilarasuttas/mn10/sujato` | 7 key: `comment_text`, `html_text`, `root_text`, `translation_text`, `variant_text`, `reference_text`, `keys_order`. Mỗi map có 235 key segment. Nhiều giá trị là chuỗi rỗng, ví dụ `comment_text` chỉ có 48/235 giá trị khác rỗng |
| `/api/menu/long` | mảng 1 node, có `children` một cấp (`dn`, `da`, `da-ot`). Node con có `has_children`, không có `children` |

- **Default (A):** một bộ hiển thị chung, đệ quy, dùng cho cả bốn tool.
  - Object in từng key theo đúng thứ tự trong body, mỗi key một dòng `key: giá trị`. Giá trị là object hoặc mảng thì in ở các dòng sau, thụt vào thêm một bậc.
  - Mảng in tiêu đề kèm số phần tử, rồi từng phần tử kèm chỉ số `[i]`.
  - Chuỗi in nguyên văn: không trim, không bỏ HTML, không cắt.
  - Số, boolean và `null` in dạng literal JSON.
  - Map segment của bilara chỉ là object, nên in thành các dòng `mn10:1.1: …`, lần lượt từng map theo thứ tự key.
- **Lý do:** cách này đáp ứng "mọi field, thứ tự API" một cách cơ học. Chỉ cần một hàm, test một lần, và không có logic chọn field riêng cho từng endpoint.
- **Cách khác (B):** mỗi tool có bố cục riêng, ví dụ bilara in mỗi segment một dòng `[id] root | translation`. Cách này dễ đọc hơn, nhưng nó gộp các map lại, mà quyết định 4 cấm gộp. Nó cũng cần bốn hàm và bốn bộ test.
- **Cách khác (C):** `text` là JSON pretty-print, tức `JSON.stringify(body, null, 2)`. Cách này đơn giản nhất, nhưng thực chất trùng với `json`.

## C2 — Chuỗi rỗng, `null` và key vắng

**Người dùng (2026-10-24):** không trả lời, dùng default.

Theo C1 (A), một map bilara in đủ 235 dòng, kể cả dòng có giá trị rỗng.

- **Default:** in mọi giá trị, kể cả chuỗi rỗng và `null`. Nhìn vào output phải phân biệt được chuỗi rỗng, `null` và key không có trong body. Ví dụ, chuỗi rỗng in là `""`.
- **Lý do:** quyết định 4 cấm lọc. Bỏ dòng rỗng cũng là lọc.
- **Cách khác:** bỏ giá trị là chuỗi rỗng. Output ngắn hơn, nhưng trái quyết định 4.

## C3 — Kích thước output khi không cắt (đã giải quyết)

**Người dùng trả lời (2026-10-24):** chấp nhận. Thêm yêu cầu: `describe()` của **mọi** tool cảnh báo output có thể rất lớn, và nói cách thu hẹp, ví dụ `get_menu` với `submenu_id`, `get_suttaplex` với uid của một sutta thay vì uid của division.

**Cách áp dụng trong requirements:** cảnh báo có ở cả năm tool. Bốn tool mới theo FR-14. `search_instant` theo FR-6: thêm đúng một câu vào cuối mô tả tool, sau một dấu cách. Câu này nói output có thể lớn (`json` của `mindfulness`/`en` là 140,685 B), `limit`/`offset` chỉ phân trang `hits`, và cách thu hẹp: truy vấn `title:` hoặc truy vấn cụ thể hơn.

Theo quyết định 5, `get_bilarasuttas` không cắt văn bản. Theo quyết định 4, `text` không lọc. Đây là kích thước body đo được:

| Request | Body |
|---|---|
| `/api/bilarasuttas/dn22/sujato` | 158,090 B (454 segment; riêng `comment_text` 31,828 B) |
| `/api/bilarasuttas/mn10/sujato` | 97,200 B |
| `/api/suttaplex/mn` | 1,343,704 B |
| `/api/suttaplex/dn` | 260,840 B |
| `/api/menu` | 168,235 B |
| `/api/bilarasuttas/dn16/sujato` | 633,489 B (không `author_uid`: 344,559 B) |
| `/api/parallels/dn16` | 321,012 B (43 anchor, 162 entry) |

uid của division không làm `parallels`/`bilarasuttas` lớn: `parallels/mn` → `{}`, `bilarasuttas/dn/sujato` → `{"msg": "Not Found"}`. Hai endpoint này không có tham số nào thu nhỏ body; kích thước theo chính sutta (đo 2026-10-24, sau review 2).

Theo tài liệu Claude Code (`code.claude.com/docs/en/mcp`, đọc 2026-10-24):

- Claude Code cảnh báo khi output của tool MCP vượt 10,000 token.
- Mặc định, output bị giới hạn ở 25,000 token (`MAX_MCP_OUTPUT_TOKENS`).
- Kết quả text dài hơn 50,000 ký tự được lưu ra file.

Chưa đo giới hạn của Claude Desktop. Các body trên đều vượt 50,000 ký tự.

- **Đã chốt:** giữ đúng quyết định 4 và 5, không có tham số giới hạn hay cắt. `describe()` của mọi tool cảnh báo output lớn. Nó nêu cách thu hẹp khi API có (`get_menu`: `submenu_id`; `get_suttaplex`: uid của sutta; `search_instant`: truy vấn `title:` hoặc cụ thể hơn). Với `get_bilarasuttas` và `get_parallels`, nó nói rõ là không có tham số nào thu nhỏ output (FR-14).

## C4 — Link về SuttaCentral trong `text` (đã giải quyết)

**Người dùng trả lời (2026-10-24):** chọn default: chỉ dòng nguồn kèm URL request, không link website. Dòng Constraints của master spec được viết lại như đề xuất.

Hiện tại, `get_sutta` in dòng `Deep link:` và citation `URL: https://suttacentral.net/{uid}`. Quyết định 5 bỏ dòng `Deep link`. Master spec Constraints (`specs/sutta-mcp-requirements.md:283`) ghi "Mọi response đều kèm link `suttacentral.net/{uid}`".

- **Default:** dòng đầu của `text`, và item thứ hai của `json`, là dòng nguồn có cùng dạng với `search_instant`: `Nguồn: SuttaCentral — {URL request}`. Bốn tool mới không dựng thêm link website nào. `search_instant` giữ link của nó (FR-6).
- Constraints trong master spec được sửa thành: mọi response kèm URL request SuttaCentral. Caller tự dựng link website từ `uid`, `lang`, `author_uid`, segment ID.
- **Lý do:** dựng link website từ field của body là thêm nội dung không có trong body. Dòng nguồn đã nối mọi output về SC.
- **Cách khác:** thêm `https://suttacentral.net/{uid}` sau dòng nguồn khi request có `uid`.

## C5 — Tham số path: rỗng, ký tự đặc biệt

**Người dùng (2026-10-24):** không trả lời, dùng default.

Đo 2026-10-24:

- `/api/menu/` → HTTP 404, body HTML.
- `/api/bilarasuttas/mn10/sujato/extra` → 404.
- `/api/bilarasuttas/mn10%2Fsujato` → server giải mã `%2F` thành `/`, rồi trả đúng body của `/mn10/sujato` (97,200 B).
- `/api/suttaplex/sn56.11%2F` → 200 với `sn56.11`, vì upstream thay `/` bằng `-` rồi `strip('-')`.

- **Default:**
  - `uid`, `author_uid`, `submenu_id` là `z.string().min(1)`.
  - Mỗi tham số path được mã hóa như một path segment (tương đương `encodeURIComponent`). Ngoài việc mã hóa đó, giá trị giữ nguyên văn: không trim, không đổi hoa/thường.
  - Nếu giá trị chứa `/`, server giải mã thành `/`. Tool chấp nhận điều này như hành vi của SC, không chặn.
- **Lý do:** chuỗi rỗng không phải một giá trị tham số mà là một URL khác (404). `min(1)` chặn trường hợp này trước khi gửi request, cùng tinh thần với `min(0)` của `limit`/`offset` trong tiền lệ.
- **Cách khác:** không kiểm gì, để caller nhận lỗi 404.

## C6 — Non-2xx và lỗi mạng

**Người dùng (2026-10-24):** không trả lời, dùng default.

- **Default:** giống `search_instant` (C6 của tiền lệ). Ở cả hai format, status không 2xx dẫn tới ném `SuttaCentral API error: {status}`, và SDK dựng `isError: true`. Lỗi mạng giữ nguyên lỗi gốc. Không retry.
- **Cách khác:** với `json`, trả body lỗi nguyên văn kèm `isError`.

## C7 — Body "không tìm thấy" trả HTTP 200

**Người dùng (2026-10-24):** không trả lời, dùng default.

Đo 2026-10-24:

| Request | HTTP | Body |
|---|---|---|
| `/api/bilarasuttas/mn9999/sujato`, `/api/bilarasuttas/MN10/sujato` | 200 | `{"msg": "Not Found"}` (`views.py`, `SegmentedSutta.get`) |
| `/api/suttaplex/mn9999`, `/api/suttaplex/xyzzy` | 200 | mảng 1 phần tử, mọi field `null`, `translations: []`, `previous`/`next` có `uid: ""` |
| `/api/parallels/mn9999`, `/api/parallels/xyzzy` | 200 | `{}` |
| `/api/menu/xyzzy` | 200 | mảng 1 node, mọi field `null`, `children: []` |

- **Default:** in body như mọi body khác. Không có `isError`, và không có câu "Không tìm thấy sutta" tự chế. Câu đó là hành vi của spec `get-sutta-unknown-uid`, nay bị thay thế. `describe()` của từng tool nêu dạng body "không tìm thấy" của endpoint.
- **Cách khác:** nhận diện các body trên và báo `isError`. Đó là logic tự chế.

## C8 — `get_menu` không có `submenu_id` trả 464 node gốc (thông tin)

**Người dùng (2026-10-24):** không trả lời, dùng default.

`/api/menu` trả mảng 464 phần tử, cả 464 đều có `node_type: "root"`:

- Cả 464 phần tử có key `children`. Chỉ ba phần tử có `children` khác rỗng: `abhidhamma` (4 con), `sutta` (6 con: `long`, `middle`, `linked`, `numbered`, `minor`, `other-group`), `vinaya` (13 con, kể cả `other-vi`).
- 461 phần tử còn lại có `children: []`, là node rời, ví dụ `g2dhp1`, `lzh-mi-bu-pm-2-as`…, `pli-tv-bi-vb-pj1`.

`?language=vi` dịch `translated_name`, ví dụ `sutta` → `Kinh tạng`.

- **Default:** in đủ 464 phần tử (không lọc). `describe()` nói rằng muốn duyệt theo tạng thì truyền `submenu_id` `sutta`, `vinaya` hoặc `abhidhamma`, rồi gọi tiếp với uid con, ví dụ `long` → `dn`, `da`, `da-ot`. Cột `tradition` không còn (quyết định 5).

## C9 — `get_bilarasuttas` không có `author_uid` hoặc `lang` (thông tin)

**Người dùng (2026-10-24):** không trả lời, dùng default.

Đo 2026-10-24:

- `/api/bilarasuttas/mn10` (không `author_uid`) trả 53,498 B, chỉ có `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order`. Không có `translation_text` hay `comment_text`.
- Thiếu `lang`, upstream mặc định `en` (`views.py`, `SegmentedSutta.get`: `request.args.get('lang', 'en')`). `?lang=en` cho body trùng từng byte với khi không gửi `lang`.
- Bản dịch không phải tiếng Anh cần `lang` đúng, ví dụ `dhp1-20/phantuananh?lang=vi` có `translation_text` (`Tiểu Bộ Kinh `…).

Hiện tại `get_sutta` có mặc định `sujato` và tự gọi lại với `?lang=`. Theo quyết định 3 và 5, cả hai đều bỏ.

- **Default:** `author_uid` và `lang` không có `.default()`. `describe()` nói ba điều:
  - bỏ `author_uid` thì chỉ có văn bản gốc;
  - bỏ `lang` thì API dùng `en`;
  - bản dịch không phải tiếng Anh cần `lang` của bản dịch đó, xem `translations[].lang` trong `get_suttaplex`.

## C10 — Tổ chức test và `package.json`

**Người dùng (2026-10-24):** không trả lời, dùng default.

Hiện tại `scripts.test` là `tsx --test test/search.test.ts`, chỉ chạy một file.

- **Default:**
  - Thêm test cho bốn tool, ở file mới trong `test/` hoặc trong file hiện có, do design chọn.
  - Nếu thêm file, chỉ được sửa `scripts.test` để `npm test` chạy mọi file test. Không thêm dependency.
  - Ngân sách fixture giữ như tiền lệ, áp cho **toàn bộ** `test/fixtures/`: tối đa 10 file, tổng ≤ 65536 B.
  - Fixture không chứa key `translations` hay `highlight`. Cần kiểm hiển thị của `translations` thì dùng input literal.
  - Hiện có 3 file, 15,223 B.
- **Cách khác:** cho phép fixture giữ `translations` đã cắt còn 1–2 mục.

## C11 — Phạm vi đổi tên `search_topic` → `search_instant`

**Người dùng (2026-10-24):** không trả lời, dùng default.

- **Default:**
  - Với cùng input và cùng response, output của `search_instant` trùng từng byte với output của `search_topic` tại `7dc2299`.
  - `inputSchema` cũng trùng; chỉ tên tool khác. Mô tả tool không nhắc tên tool, nên nó giữ nguyên, trừ **một ngoại lệ**: một câu cảnh báo output lớn nối vào cuối sau một dấu cách, theo câu trả lời C3 của người dùng (FR-6). `describe()` của tham số không đổi.
  - Comment trong `src/search.ts` và `test/search.test.ts` nhắc `search_topic` được đổi tên theo.
  - Tên hàm `buildSearchUrl`/`renderSearch`, test case và fixture của search giữ nguyên.

## C12 — Thứ tự key khi parse JSON trong JavaScript

**Người dùng (2026-10-24):** không trả lời, dùng default.

`JSON.parse` giữ thứ tự key của body, **trừ** key dạng chỉ số mảng (`"0"`, `"1"`…). Các key đó luôn bị đưa lên đầu, theo thứ tự tăng dần. Trong 22 body đã đo không có key nào như vậy, và không có chuỗi nào chứa ký tự xuống dòng.

- **Default:** chấp nhận `JSON.parse`. Requirements ghi đây là giả định chưa kiểm cho body chưa đo. Design nêu rõ hệ quả.
- **Cách khác:** dùng parser giữ thứ tự. Cách này cần dependency mới hoặc tự viết parser, nên trái NFR-1.
