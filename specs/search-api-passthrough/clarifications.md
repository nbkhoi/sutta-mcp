# Clarifications: search-api-passthrough

**Spec slug:** search-api-passthrough
**Created:** 2026-10-23
**Trạng thái:** đã giải quyết 2026-10-23. Người dùng chọn đúng default cho C1, C2, C5 (ba câu chặn design). C3, C4, C6–C11 dùng default.

Ba quyết định ngày 2026-10-23 (tham số trùng API, output `text`/`json`, phạm vi chỉ `search_topic`) đã chốt. Các câu dưới đây không mở lại chúng, chỉ hỏi những chi tiết mà quyết định đó chưa nói.

---

## C1 — Tham số chọn output (đã giải quyết; từng chặn design)

**Người dùng trả lời (2026-10-23):** chọn default.

Quyết định 2 có một tham số chọn `text` hay `json`, nhưng chưa chốt tên, giá trị và mặc định.

- **Default:** tên `format`, enum `"text" | "json"`, mặc định `"text"`. Tham số này không gửi tới SC.
- **Lý do:** API không có tham số nào tên `format` (đọc `view.py` class `InstantSearch`, upstream `c755a43`), nên tên này không va với tham số API. Default `text` vì caller chính là Claude đọc kết quả.
- **Cách khác:** `output`, `response_format`. Hoặc mặc định `json`, để lời gọi không truyền tham số nào ngoài API trả đúng body của API.

## C2 — Kiểu của `selectedLanguages` trong schema (đã giải quyết; từng chặn design)

**Người dùng trả lời (2026-10-23):** chọn default.

API đọc `selectedLanguages` là **chuỗi JSON**, mặc định `'["en", "pli"]'`. Chuỗi không parse được thì server âm thầm quay về mặc định (`view.py`: `except json.JSONDecodeError` rồi `json.loads(default_languages)`). Đo 2026-10-23: `selectedLanguages=notjson` cho HTTP 200 và cùng `total` 1461 như mặc định, không báo lỗi gì.

- **Default:** schema là mảng chuỗi (`z.array(z.string())`). Khi gửi, tool đổi mảng thành chuỗi JSON bằng `JSON.stringify`, ví dụ `["vi","pli"]`. Tên tham số giữ nguyên `selectedLanguages`.
- **Lý do:** giá trị gửi đi luôn là JSON hợp lệ, nên server không bao giờ âm thầm quay về `["en","pli"]`. Caller cũng thấy kiểu thật trong `inputSchema`.
- **Cách khác:** schema là chuỗi, gửi nguyên văn. Cách này giống API từng ký tự, nhưng một chuỗi sai sẽ cho kết quả của mặc định mà không có dấu hiệu nào.
- **Cần hỏi thêm:** mảng rỗng `[]` có được nhận không? Với GET, `[]` là JSON hợp lệ. Theo phân tích POST trong `specs/dynamic-search/requirements.md:79`, danh sách rỗng làm server bỏ điều kiện ngôn ngữ. Default: nhận `[]` và gửi `[]`, vì API cũng nhận.

## C3 — Kiểu của `matchpartial`

**Người dùng trả lời (2026-10-23):** dùng default.

API đọc `matchpartial` là chuỗi, mặc định `'false'`, và chỉ coi là bật khi giá trị **bằng đúng** `'true'` (`instant_search.py` `process_search_results`: `if matchpartial == 'true'`). `True` hay `1` đều bị coi là tắt.

- **Default:** schema `z.boolean()`. Gửi `true`/`false` (chữ thường) khi caller truyền, không gửi gì khi caller không truyền.
- **Cách khác:** `z.enum(["true","false"])` hoặc chuỗi tự do gửi nguyên văn.

## C4 — Kiểm tra `limit`, `offset`, và `query` rỗng

**Người dùng trả lời (2026-10-23):** dùng default.

API không kiểm tra `limit`/`offset`. Đo 2026-10-23:

- `offset=-5` → HTTP 500, body `{"message": …}`
- `limit=abc` → HTTP 500
- `limit=0` → HTTP 200, 0 hit, vẫn có 32 `suttaplex` (`mindfulness`/`en`)

Theo `specs/dynamic-search/requirements.md` (đo 2026-10-18), `offset=abc` cũng cho 500, còn `offset` 5000 và 10⁹ cho 200 với 0 hit.

- **Default `limit`/`offset`:** `z.number().int().min(0)`, không có trần. Hai đường đã đo cho 500 (số âm, không phải số nguyên) bị schema chặn trước khi gửi request. Mọi giá trị khác gửi nguyên. Hạn chế: một số nguyên rất lớn mà JavaScript in dạng `1e+21` sẽ thành 500 từ SC. Lỗi đó đi theo đường lỗi C6.
- **Cách khác:** không kiểm gì (giống API nhất, caller tự nhận 500), hoặc thêm trần.
- **`query` rỗng:** API nhận `query=` (`if query:` chỉ bỏ qua bước thay `+`). Theo đo 2026-10-18 trong dynamic-search, truy vấn rỗng mất 22–28 s và trả `total` 62710. Thiếu hẳn `query` thì 422, nhưng tham số đã bắt buộc nên không xảy ra. **Default:** `z.string()` không có `min(1)`, gửi nguyên như API. **Cách khác:** `min(1)`, để chặn một lời gọi chậm.

## C5 — Liên kết về SuttaCentral trong output (đã giải quyết; từng chặn design)

**Người dùng trả lời (2026-10-23):** chọn default.

AGENTS.md yêu cầu mọi response liên kết về SuttaCentral, và master spec Constraints ghi: "Mọi response đều kèm link `suttacentral.net/{uid}`". Trong output passthrough:

- **Phần tử trong response.** Mỗi hit có field `url` là đường dẫn tương đối của site. Đo 2026-10-23:
  - bản dịch: `/an1.378-393/vi/minh_chau`
  - bài viết: `/subjects`
  - dictionary: `/define/nibbana`
  - mục của lệnh `list authors`: không có `url`, `uid` là `""`

  Phần tử `suttaplex` không có `url` nhưng có `uid`.
- **Default cho `text`:**
  - Hit có `url` là chuỗi bắt đầu bằng `/` được in `https://suttacentral.net{url}`.
  - Phần tử `suttaplex` có `uid` khác rỗng được in `https://suttacentral.net/{uid}`.
  - Phần tử không có cả hai không có dòng link, nhưng vẫn được in (không lọc).
  - Dòng đầu output nêu nguồn là SuttaCentral, kèm URL request đầy đủ đã gửi (`https://suttacentral.net/api/search/instant?...`).
- **Default cho `json`:** content item thứ nhất là body nguyên văn. Content item thứ hai là một dòng text nêu nguồn SuttaCentral kèm URL request. Body không bị sửa.
- **Cách khác cho `json`:**
  - (a) chỉ trả body, coi các field `url` trong body là đủ chain về nguồn;
  - (b) bọc body trong một object có thêm field nguồn. Cách này trái với "body nguyên văn".
- **Cách khác cho dòng nguồn:** link trang search của website, `https://suttacentral.net/search?query=…`. Chưa xác minh trang đó đọc tham số `query` từ URL. Trang trả 200 cho mọi đường dẫn (SPA), nên mã 200 không chứng minh được gì.

## C6 — Khi SC trả non-2xx

**Người dùng trả lời (2026-10-23):** dùng default.

Đo 2026-10-23:

- 422: body là **chuỗi** JSON `"{\"error\": \"'query' param is required\"}"`
- 500: `{"message": …}`

- **Default:** như các tool khác hiện nay, ném `SuttaCentral API error: {status}` ở **cả hai** format. SDK dựng result `isError: true`. Không retry, không trả body lỗi.
- **Cách khác:** với `json`, trả body lỗi nguyên văn kèm `isError: true`, để caller thấy `message` của SC.

## C7 — `text` có cắt hay bỏ HTML trong `highlight` không

**Người dùng trả lời (2026-10-23):** dùng default.

`highlight` của hit là object `{ content: [chuỗi HTML, …] }`. Đo 2026-10-23, mỗi chuỗi có thể chứa thẻ `<a href="/an1.296-305/en/sujato#1.3">`, `<span>`, hoặc `<dl>`/`<ol>` ở mục dictionary. Kích thước JSON của `highlight` mỗi hit (5 truy vấn, `limit=10`):

- hit văn bản: tối đa khoảng 1.2 KB
- mục dictionary: 521 B – 2.3 KB (`nibbana` 2301 B)

- **Default:** `text` in **mọi** chuỗi trong `highlight.content` của mỗi hit, nguyên văn, không bỏ thẻ HTML, không cắt.
- **Lý do:** bỏ thẻ hay cắt là logic tự chế, có thể làm mất link segment nằm trong thẻ `<a>`. Kích thước đo được nhỏ.
- **Cách khác:**
  - (a) bỏ `highlight` khỏi `text` (caller cần thì dùng `json`);
  - (b) bỏ thẻ HTML;
  - (c) cắt theo số ký tự.

## C8 — Field nào của phần tử `suttaplex` xuất hiện trong `text`

**Người dùng trả lời (2026-10-23):** dùng default.

Mỗi phần tử `suttaplex` có mảng `translations`, khoảng 14 mục mỗi phần tử. Đo 2026-10-23: body của `mindfulness`/`en` là 140,685 B, gồm 32 phần tử `suttaplex`. Review 1 serialize lại riêng `suttaplex` bằng Python (`json.dumps`, separator mặc định, `ensure_ascii=False`) được 132,394 B, và 18,131 B khi bỏ `translations`. Toàn bộ `highlight` chỉ khoảng 4 KB.

- **Default:** mỗi phần tử in `acronym` (vắng thì `uid`), tiêu đề (`translated_title`, vắng/rỗng thì `original_title`), `uid`, link (C5), `difficulty` nếu có (giá trị thô của API), và `blurb` nếu khác rỗng. **Không** in `translations`. Mỗi phần tử vẫn được in, chỉ bớt field. Caller cần danh sách bản dịch thì dùng `get_sutta_meta` hoặc `format=json`.
- **Cách khác:** in thêm số bản dịch, hoặc in mỗi bản dịch một dòng.

## C9 — Bỏ mặc định `language` (thông tin, không chặn)

**Người dùng (2026-10-23):** giữ quyết định 1, không có mặc định.

Quyết định 1: tham số không truyền thì không gửi. `search_topic` hiện có `language` mặc định `"en"`. Đo 2026-10-23, `mindfulness`:

| `language` | `total` | `suttaplex` | `suttaplex[0]` |
|---|---|---|---|
| không gửi | 1459 | 3 | `t1670b2.12` |
| `en` | 1461 | 32 | `an1.575-615` |

`vô ngã` khi không gửi `language`: 0 `suttaplex`, 0 hit.

- **Default:** theo đúng quyết định 1, không có mặc định. `describe()` của `language` nói rõ rằng bỏ trống cho kết quả khác `en`, và muốn khớp tiêu đề tiếng Việt thì truyền `vi`.
- Ghi ở đây để người dùng thấy hệ quả, không phải để mở lại quyết định.

## C10 — `restrict=dictionaries` trả body `null`

**Người dùng trả lời (2026-10-23):** dùng default.

Đo 2026-10-23 (`nibbana`, `metta`, `dukkha`): HTTP 200, body đúng 4 byte `null`. Đọc code upstream thấy lý do: `instant_search_query()` chỉ `return` bên trong nhánh `if restrict != 'dictionaries'`, nên nhánh còn lại rơi xuống cuối hàm và trả `None`.

- **Default:**
  - `json` trả `null` nguyên văn.
  - `text` trả một dòng nói SC trả body `null` cho request này, kèm dòng nguồn (C5). Không có `isError`, không ném lỗi.
- **Cách khác:** coi là lỗi (`isError`).

## C11 — Thứ tự các phần trong `text`

**Người dùng trả lời (2026-10-23):** dùng default.

Quyết định 2 liệt kê: `suttaplex`, `hits`, `total`, `fuzzy_dictionary`, `error`. Thứ tự key trong body API là `total`, `hits`, `suttaplex`, `fuzzy_dictionary` (`error` cuối, nếu có).

- **Default:** phần tử **bên trong** mỗi mảng giữ đúng thứ tự API. Các phần theo thứ tự người dùng đã liệt kê: `suttaplex`, `hits`, `total`, `fuzzy_dictionary`, `error`.
- **Cách khác:** theo thứ tự key của body.
