# Requirements: `search_topic` dùng search API của SuttaCentral (dynamic search)

**Status:** Reviewed
**Created:** 2026-10-18
**Spec slug:** dynamic-search
**Nguồn:** roadmap mục 1 "Dynamic search" (`specs/sutta-mcp-requirements.md:290-297`), Tool 1 `search_topic` (`:143-158`), luồng mẫu (`:252-269`), Constraints (`:272-284`).
**Quyết định stakeholder đã chốt (2026-10-18, không mở lại):**
- Từ khóa tiếng Việt được ánh xạ sang thuật ngữ Pali/Anh, sau đó **luôn** gọi search API — không giữ `TOPIC_INDEX` làm fallback, không gửi thẳng tiếng Việt khi đã có ánh xạ.
- `search_topic` có thêm (1) tham số `match` chọn khớp tiêu đề, khớp nội dung, hoặc cả hai, và (2) cơ chế phân trang. Quyết định này giải quyết Q1 cũ (số lượng/thứ tự kết quả): **giữ thứ tự API, mỗi nguồn một trang N = 10 kết quả**; caller muốn xem thêm thì lật trang (FR-16..FR-19).

## Context & Goal

### Yêu cầu gốc

Roadmap mục 1: thay `TOPIC_INDEX` tĩnh bằng `GET /api/search/instant?query=&language=&limit=`. Roadmap ghi bốn phát hiện đã đo (2026-10-17, 2026-10-18) cần giải quyết trong requirements: (1) truy vấn tiếng Việt gần như không có kết quả, (2) hit không phải sutta (dictionary, không `uid`), (3) hit theo bản dịch, cần gộp theo `uid`, (4) GET và POST lệch `total`.

Mục tiêu: `search_topic` trả danh sách sutta động từ SuttaCentral cho cả truy vấn tiếng Anh/Pali lẫn các chủ đề tiếng Việt đang hỗ trợ, theo trang, tách được khớp tiêu đề và khớp nội dung; mỗi kết quả có link `https://suttacentral.net/{uid}` hợp lệ; mỗi lời gọi tool tốn **tối đa một** request SC (0 khi `topic` rỗng hoặc tham số không hợp lệ); server không giữ trạng thái giữa các lời gọi.

### Hiện trạng (đọc code `src/index.ts` tại `40846bb`)

- `TOPIC_INDEX` (`:35-97`) có 38 key: 24 key tiếng Anh/Pali và 14 key tiếng Việt (`tứ diệu đế`, `khổ`, `bát chánh đạo`, `vô ngã`, `chánh niệm`, `vô thường`, `từ bi`, `duyên khởi`, `ngũ uẩn`, `niết bàn`, `nghiệp`, `thiền`, `tam bảo`, `quy y`). Mọi key đều ở dạng NFC (kiểm bằng `unicodedata.normalize`, 2026-10-18).
- `searchByTopic()` (`:99-108`): `toLowerCase().trim()`, khớp chính xác, rồi khớp chứa hai chiều (`key.includes(q) || q.includes(key)`), trả mảng UID đầu tiên khớp.
- Handler `search_topic` (`:192-229`): tham số `topic` (`z.string()`), `language` (`z.string().default("en")`). Không khớp → `Không tìm thấy sutta nào cho chủ đề "{topic}".` kèm danh sách mọi key; khớp → header `Tìm thấy {n} sutta cho chủ đề "{topic}":`, rồi **tuần tự** gọi `fetchSuttaplex(uid, language)` cho từng UID (tối đa 3 request), in `formatCitation(sp)` và `→ {blurb}`; lỗi fetch từng UID bị nuốt thành `{UID} — (không thể tải metadata)`.
- `formatCitation()` (`:142-155`) dùng chung với `get_sutta` và `get_sutta_meta`; đọc `difficulty?.name`, fallback `uid ?? "?"`.
- Các helper fetch (`:10-30`) ném `SuttaCentral API error: {status}` khi `!res.ok`; không có timeout phía client.
- SDK `@modelcontextprotocol/sdk` 1.29.0 (đã cài): tham số tool không qua được schema zod → handler **không chạy**, SDK trả result `isError: true` với text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:` (`node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:178` `validateToolInput` ném `McpError(ErrorCode.InvalidParams, "Input validation error: …")`; constructor `McpError` thêm tiền tố `MCP error ${code}: ` (`dist/esm/types.js`), `InvalidParams` = `-32602`; catch tại `mcp.js:141` đưa `error.message` vào `createToolError`; đọc 2026-10-18).

### Hình dạng search API (đo live bằng `curl`, 2026-10-18)

Response GET là object `{ total, hits, suttaplex, fuzzy_dictionary }`, HTTP 200, có `ETag` (weak) và `Cache-Control: max-age=172800, must-revalidate, proxy-revalidate`.

| Quan sát | Bằng chứng |
|---|---|
| **`hits` ≤ `limit` và đã gộp theo `uid` trong một response.** `mindfulness`/`en`: `limit` 5 → 4 hit, 10 → 8, 20 → 12; `limit=1500` → 1033 hit, 1033 `uid` khác nhau. Mỗi hit vẫn mang `uid` + `lang` + `author_uid` + `author` của *một* bản dịch. | upstream `simplify_results()` (`server/src/search/instant_search.py:254`) gộp theo `uid` **sau** khi cắt trang, ưu tiên bản bilara |
| **`hits` và `suttaplex` không giao nhau.** `mindfulness`/`en`, `limit=1500`: 32 suttaplex, giao với hits = 0. | upstream `remove_hits_if_uid_in_suttaplexs()` (`:376`) |
| **`suttaplex` = các sutta có tiêu đề khớp truy vấn**, không bị `limit`/`offset` giới hạn: cùng 32 phần tử, cùng thứ tự với `limit` 5/10/20 và `offset` 0/5/10/1460/5000/10⁹. Sắp `an`/`dn`/`mn`/`sn` trước rồi theo chuỗi `uid`: `mindfulness`/`en` có `dn22` ở vị trí 11, `mn10` ở vị trí 12, hai phần tử cuối `uvs15`, `vb7`. Phần tử có `uid`, `acronym`, `translated_title`, `original_title`, `blurb`, `parallel_count`, `difficulty`, `translations`. | `try_to_fetch_suttaplex()` (`:1023`) → `fetch_suttaplexs_by_name()` (`:1727`), `custom_sort()` (`:1795`); không dùng `hits` trừ lệnh `title:` |
| **Truy vấn trùng đúng một UID** (`mn10`) → `suttaplex` chỉ gồm sutta đó. | `try_to_fetch_suttaplex()` nhánh `fetch_suttaplex(db, lang, query)` |
| **`difficulty` trong `suttaplex` của search là số** (`mn10`: `2`), còn `/api/suttaplex/mn10` trả `{"name": "intermediate", "level": 2}`. Upstream ánh xạ `{1: beginner, 2: intermediate, 3: advanced}` (`server/src/api/views/views.py`, `client/elements/sc-page-search.js`). `formatCitation()` hiện đọc `difficulty?.name` → sẽ in `unknown` cho mọi kết quả search. | đo `mn10`, `dn1` (3), `mn21` (1) |
| **`hits` sắp theo thứ tự kinh điển, không theo độ liên quan**: `lang == language` trước, rồi EBT, bilara, rồi theo prefix và số của `uid`. `mindfulness`/`en`: hit đầu là `an1.296-305`, `an1.394-574`, … | `get_sort_part_for_aql()` (`:963`) |
| **Hit không phải sutta loại 1 — dictionary:** `{"category": "dictionary", "url": "/define/nibbana"}`, `uid: null`, chèn ở đầu `hits` **trên mọi trang** (`nibbana` `offset` 0 và 10). Gặp với `nibbana`, `anatta`, `anicca`, `dukkha`, `metta`, `kamma`, `jhana`, `khandha`, `paticca-samuppada`. | `lookup_dictionary()` (`:1675`, `hits.insert(0, …)`), gọi sau `calculate_total` |
| **Hit không phải sutta loại 2 — bài viết:** `is_article: true`, có `uid` (`subjects`, `terminology`, `sn-guide-sujato`, `general-guide-sujato`, `mn-guide-sujato`, `an-introduction-bodhi`, `discourses`, `methodology`, `numbering`), `acronym: null`. `/api/suttaplex/numbering` trả `uid: null`. Gặp với `anatta`, `anicca`, `satipatthana`, `triple gem`, `khandha`, `paticca-samuppada`. | đo 12 truy vấn, `limit=30` |
| **Hit có `name` rỗng:** bản Āgama của `Bhikkhu Anālayo` trả `name: ''`, `root_name` khác rỗng: `metta`/`en` → `sa264` (`root_name` `小土塼`, `author` `Bhikkhu Anālayo`, `lang` `en`); `three jewels`/`en` và `vi` → `sa107` (`root_name` `長者`). Review 1 đo thêm `sa1`…`sa12` (`dukkha`/`en`), `ea21.7` (`dependent origination`). | đo 2026-10-18 |
| **Hit thiếu `acronym`/`author`:** `metta`/`en` → `cnd8`: `acronym: null`, `author: null`, `name` `'Exposition of the Questions of the Student  Mettagū '` (có khoảng trắng thừa). Hit bản gốc Pali: `an8.19` → `name` `Pahārādasutta`, `author` `Mahāsaṅgīti Tipiṭaka Buddhavasse 2500`, `lang` `pli`. | đo 2026-10-18 |
| **`total` không phải số sutta.** Upstream: `total = R − (g − h)` khi `R > limit`, với `R` = số document (theo bản dịch) khớp, `g` = số hit sau gộp `uid` của trang này, `h` = số hit còn lại sau khi bỏ `uid` trùng `suttaplex`; khi `R ≤ limit` thì `total = g`; nếu kết quả là 0 thì `total = len(suttaplex)`. Đo: `mindfulness`/`en` → 1461 (`offset` 0), 1462 (`offset` 5, 10, 20, 30), 1460 (`offset` 1460), 1065 (`limit=1500`); `vô ngã`/`vi` → 21 = số `suttaplex`, `hits` rỗng. | `calculate_total()` (`:348`), `process_search_results()` (`:190`) |
| **Tiếng Việt thô:** `language=en` → `total` 0 cho 13/14 key (riêng `khổ` → `total` 3758, hit đầu `an1.1-10`; chưa rõ khớp theo cơ chế nào). `language=vi` → `hits` rỗng, chỉ có `suttaplex` khớp tiêu đề tiếng Việt: `vô ngã` 21, `niết bàn` 20, `chánh niệm` 2 (`sn47.2`, `sa610`), `tứ diệu đế`/`bát chánh đạo`/`ngũ uẩn`/`quy y` 0. | đo 14 key × 2 language |
| **`language` ảnh hưởng khớp tiêu đề:** với `language=vi`, thuật ngữ tiếng Anh (`mindfulness`, `not-self`, `dependent origination`, …) cho `suttaplex` rỗng, chỉ còn `hits`; thuật ngữ Pali (`nibbana`, `dukkha`, `anatta`, `metta`, `kamma`, `satipatthana`) vẫn có `suttaplex` (khớp `original_title`). `language=vi` trả `translated_title` tiếng Việt (`an4.179` → `Niết Bàn`), blurb phần lớn vẫn tiếng Anh. | đo 20 thuật ngữ × 2 language |
| **Truy vấn rỗng:** `query=` hoặc `query=%20` → 200, `total` 62710, mất 22–28 s. Thiếu hẳn `query` → 422. | đo |
| **Cú pháp lọc của SC:** `foo:bar` → 200, `total` 0, kèm `error: {type: "unknown_filter", message: "Unknown filter: \"foo:\"", …}`. `by:sujato`, `nibbana OR kamma` được SC hiểu là lệnh lọc/toán tử. | đo; `validate_filter_commands` trong `instant_search_query()` |
| **Độ trễ** một request GET không trùng cache: 1.7–5.8 s (2026-10-18, 6 truy vấn + `nibbana OR kamma`); một lần đo `mindfulness`/`limit=5`/`offset=0` mất 13.2 s. Request trùng cache: 0.4–0.9 s. | `curl -w %{time_total}` |

### Phân trang và tách tiêu đề/nội dung (đo live 2026-10-18)

| Quan sát | Bằng chứng |
|---|---|
| **`offset` hoạt động cùng `limit` trên GET; `page`, `from` bị bỏ qua** (cho đúng trang `offset=0`). | `view.py:19` đọc `offset`; `get_limit_part_for_aql()` (`instant_search.py:948`) = `LIMIT {offset}, {limit}` |
| **`offset` đếm document theo bản dịch, gộp `uid` xảy ra sau khi cắt** → kích thước trang thay đổi và trang kề có thể lặp `uid`. `mindfulness`/`en`/`limit=5`: `offset` 0 → `an1.296-305, an1.394-574, an1.616-627, an2.11-20`; 5 → `an2.42-51, an2.163-179, an3.30, an3.33`; 10 → `an3.33, an3.40, an3.58`. Với `limit=10`: `offset` 0 → 8 hit (`an1.296-305` … `an3.33`), 10 → 5 (`an3.33` … `an3.62`), 20 → 8 (`an3.62` … `an3.128`), 30 → 6. | đo |
| **Cuối danh sách:** `mindfulness`/`en`/`limit=10`: `offset` 1450 → 9 hit (`vb10` … `ya10.1.2`), `total` 1461; `offset` 1460 → 0 hit, `total` 1460; `offset` 5000, 100000, 10⁹ → 200, 0 hit. `offset=-5` và `offset=abc` → **HTTP 500**. | đo |
| **`restrict=title`/`suttaplex`/`texts` không có tác dụng quan sát được** (cùng hits, cùng `total` 1461). Code upstream chỉ xét `restrict == 'dictionaries'`. `matchpartial=true` đổi cách khớp (`total` 3591), không tách tiêu đề/nội dung. | đo; `instant_search_query()` (`:110`) |
| **Hai mảng luôn có mặt**: `suttaplex` = khớp tiêu đề (không phân trang phía API), `hits` = khớp nội dung theo bản dịch (phân trang bằng `offset`). Thứ tự cả hai là kinh điển, không theo độ liên quan — vì vậy `mn10`/`dn22` (vị trí 12/11 trong 32 khớp tiêu đề) nằm ngoài 10 kết quả đầu. | các dòng trên |

Hệ quả cho thiết kế phân trang không trạng thái:

- **Trang tiêu đề** cắt cục bộ từ `suttaplex` — mảng đầy đủ có trong mọi response, không phụ thuộc `offset`, nên trang `p` tính được từ một response bất kỳ.
- **Trang nội dung** dùng `offset` của API. Không có cách nào, trong một request và không trạng thái, để biết trang trước đã in `uid` nào → không thể khử trùng giữa các trang; kích thước trang 0–10.
- **Điều kiện "còn trang nội dung"** (FR-18) suy từ công thức `total` ở trên: gọi `h` = số phần tử `hits` không có field `category`. Khi `R > limit`, `offset + h < total` ⟺ `offset + g < R`; vì `g ≤ limit`, điều kiện này không bao giờ bỏ sót document còn lại, nhưng có thể báo "còn" khi trang sau rỗng (tối đa một trang rỗng ở cuối: trang đó có `h = 0`). Khi `R ≤ limit`, `total = g` và `h ≤ g`: điều kiện chỉ báo "còn" sai khi một phần hit của trang bị loại vì trùng `suttaplex` (`h < g`), và trang sau rỗng với `h = 0` — vẫn trong giới hạn một trang rỗng ở cuối. Thêm điều kiện `h > 0` để loại trường hợp `total` rơi về `len(suttaplex)` (ví dụ `vô ngã`/`vi`: `hits` rỗng, `total` 21). Cái giá: một trang giữa danh sách mà mọi document đều thuộc sutta khớp tiêu đề (`h = 0`) sẽ bị coi là hết — hiếm, caller vẫn gọi được trang sau thủ công. Không in `total`.

### Giải thích GET và POST lệch `total` (phát hiện 4)

Đã giải thích được, đo lại 2026-10-18 với `query=mindfulness&language=en&limit=10`:

| Request | `total` |
|---|---|
| GET (mặc định) | 1461 |
| GET + `selectedLanguages=["en","pli"]` | 1461 |
| POST, body JSON `["en","pli"]` hoặc `["en"]` | 1461 |
| POST, body JSON `[]`, `null` hoặc `{}` | 1471 |
| POST, không có body JSON | HTTP 415 |

Nguyên nhân (upstream `suttacentral/suttacentral`, nhánh `main`, `server/src/search/view.py`, commit gần nhất `11b6dba` 2026-08-31): GET lấy `selectedLanguages` từ query string, mặc định `'["en", "pli"]'` (`view.py:28`); POST lấy **body JSON** làm `selected_languages` (`view.py:65`). Body không phải danh sách khác rỗng → `get_lang_condition_for_aql()` (`instant_search.py:956`) bỏ điều kiện ngôn ngữ → nhiều document khớp hơn. Chênh 1472 (roadmap, 2026-10-17) và 1471 (hôm nay) chưa rõ body đã dùng hôm đó; khả năng là chỉ mục SC trôi một document — không ảnh hưởng quyết định. Ngoài ra GET có cache phía server 600 s (`@cache.cached`, `view.py:12`), POST thì không.

Quyết định (FR-1): dùng **GET**, không gửi `selectedLanguages`. Lý do: (a) GET mặc định lọc `en` + `pli`, đúng hai ngôn ngữ mà các thuật ngữ ánh xạ và `formatCitation` phục vụ; (b) GET idempotent, có `ETag` + `Cache-Control` và cache server — tương thích với chiến lược cache khóa theo URL đầy đủ của roadmap mục 6; (c) POST cần body JSON, thiếu là 415, thêm một nguồn sai mà không thêm giá trị.

### Chọn nguồn kết quả (phát hiện 3) và mặc định `match`

`match` mặc định là **`all`** — in cả hai nguồn, khớp tiêu đề trước (FR-6). Lý do đo được:

- `suttaplex` là khớp tiêu đề — tín hiệu liên quan mạnh nhất trong response — và đủ field cho citation đầy đủ (kể cả blurb), nên không cần fetch suttaplex riêng cho từng kết quả. Luồng mẫu của master spec (`chánh niệm` → `mn10`) đi qua khớp tiêu đề: `satipatthana` cho `suttaplex` `an4.274, mn10, sn43.5`, còn `mn10` không bao giờ có trong `hits` (upstream loại `uid` trùng `suttaplex`). Mặc định `content` sẽ làm mất `mn10`.
- `suttaplex` rỗng với nhiều truy vấn hợp lệ (`loving-kindness`, `five aggregates`, `triple gem`, `three jewels`, và gần như mọi thuật ngữ tiếng Anh khi `language=vi`); mặc định `title` sẽ trả 0 kết quả cho các truy vấn này dù có hit.
- `all` giữ đúng hành vi của bản draft trước (cả hai mảng, tiêu đề trước).
- Hit chỉ có `uid`, `acronym`, `name`, `root_name`, `lang`, `author`, `author_uid`, `url`, `highlight` — không có blurb, difficulty, parallel_count. Fetch `/api/suttaplex/` cho từng hit sẽ nhân số request (trái Constraints "Mỗi tool call chỉ fetch đúng những gì cần"), nên hit được in ở dạng citation rút gọn kèm tên bản văn (FR-9).

### Ánh xạ tiếng Việt — ứng viên đã đo (phát hiện 1)

Mỗi cặp số là `suttaplex`/`hits sau lọc FR-7`, `limit=10`, `offset` 0, đo 2026-10-18. Cột ứng viên là thuật ngữ cùng nhóm trong `TOPIC_INDEX` hiện tại hoặc thuật ngữ Pali đã đo; **design chốt thuật ngữ** theo FR-2.

| Key tiếng Việt | Ứng viên | `language=en` | `language=vi` |
|---|---|---|---|
| `tứ diệu đế` | `four noble truths` | 12/7 | 0/7 |
| `khổ` | `dukkha` | 11/10 | 12/10 |
| `bát chánh đạo` | `eightfold path` | 2/5 | 0/5 |
| `vô ngã` | `anatta` · `not-self` | 6/5 · 32/6 | 8/9 · 0/6 |
| `chánh niệm` | `satipatthana` · `mindfulness` | 3/4 (`mn10` thứ 2) · 32/8 (`mn10` thứ 12 → trang tiêu đề 2) | 3/9 (`mn10` thứ 2) · 0/9 |
| `vô thường` | `anicca` · `impermanence` | 8/6 · 26/8 | 8/9 · 0/8 |
| `từ bi` | `metta` · `loving-kindness` | 8/7 · 0/9 | 7/9 · 0/9 |
| `duyên khởi` | `dependent origination` | 5/10 | 0/10 |
| `ngũ uẩn` | `khandha` · `aggregates` | 8/5 · 13/5 | 7/8 · 0/6 |
| `niết bàn` | `nibbana` | 16/8 | 11/9 |
| `nghiệp` | `kamma` | 3/10 | 3/10 |
| `thiền` | `jhana` | 9/10 | 2/10 |
| `tam bảo` | `three jewels` · `triple gem` | 0/7 · 0/3 | 0/7 · 0/3 |
| `quy y` | `going for refuge` · `refuge` | 0/9 · 2/7 | 0/9 · 0/7 |

Mọi ứng viên trên cho ít nhất 1 kết quả sutta ở trang 1, `match=all`, cả hai `language`.

## Stakeholders

- **Primary users:** Claude (caller MCP) — cần danh sách UID sutta có link hợp lệ để gọi tiếp `get_sutta`/`get_parallels`; cần chọn khớp tiêu đề hay nội dung, biết cách lấy trang tiếp và khi nào hết; cần biết khi nào nên thử lại bằng thuật ngữ Anh/Pali.
- **Secondary users:** người dùng cuối hỏi Dhamma bằng tiếng Việt hoặc tiếng Anh qua Claude — chủ đề tiếng Việt đang hỗ trợ không được mất kết quả; không nhận link `suttacentral.net/?`; biết bản văn nào cho tiêu đề đã in.
- **Operators / maintainers:** người bảo trì `src/index.ts` — bảng ánh xạ tiếng Việt là dữ liệu tự quản; SuttaCentral — không bị gọi thừa (Constraints rate limiting), không bị tích lũy dữ liệu.

## Functional Requirements

- **FR-1: Một request search, GET.** Với `topic` không rỗng sau `trim()` và tham số hợp lệ, `search_topic` phát **đúng một** request tới SC: `GET https://suttacentral.net/api/search/instant` với query param `query` (thuật ngữ theo FR-3/FR-4, URL-encode), `language` (giá trị tham số `language` của tool), `limit=10`, và `offset=(page − 1) × 10` **chỉ khi** `match` ∈ {`content`, `all`} và `page > 1` (FR-17). Không gửi `selectedLanguages`, `restrict`, `matchpartial`, `page`, `from`; không dùng POST. Không request `/api/suttaplex/` hay endpoint nào khác.

- **FR-2: Bảng ánh xạ tiếng Việt.** Code định nghĩa một bảng ánh xạ từ key tiếng Việt sang **đúng một** thuật ngữ tìm kiếm tiếng Anh hoặc Pali. Phạm vi tối thiểu: 14 key tiếng Việt của `TOPIC_INDEX` hiện tại (liệt kê ở §Hiện trạng). Mỗi thuật ngữ được chọn phải cho ít nhất 1 kết quả sutta ở trang 1 với `match=all`, cả `language=en` lẫn `language=vi` (đo live khi design/implement; bảng ứng viên ở §Ánh xạ là bằng chứng hiện có). Riêng `chánh niệm` phải cho `mn10` ở trang 1 với `match=all` và `match=title`, cả hai `language` — đây là luồng mẫu của master spec (`specs/sutta-mcp-requirements.md:257-259`). Key lưu ở dạng NFC, chữ thường. **SSOT là code:** như `TOPIC_INDEX`, bảng này không có nguồn ngoài; README/AGENTS.md chỉ mô tả và trỏ về code.

- **FR-3: Cách khớp key.** Chuẩn hóa `topic`: Unicode NFC → chữ thường → `trim()` → gộp mọi chuỗi khoảng trắng liên tiếp thành một dấu cách. Khớp khi chuỗi chuẩn hóa **bằng đúng** một key. Không bỏ dấu tiếng Việt khi so (`thiền` ≠ `thiện`, `khổ` ≠ `kho`). Không khớp chứa/khớp một phần (xem Q2). Khi khớp, `query` gửi đi là thuật ngữ đã ánh xạ.

- **FR-4: Truy vấn không có trong bảng.** Mọi `topic` không khớp FR-3 — tiếng Anh, Pali, hay tiếng Việt ngoài 14 key — được gửi làm `query` sau Unicode NFC và `trim()`, không đổi chữ hoa/thường, không gộp khoảng trắng; vẫn đúng một request (FR-1). Không có nhánh nào tra danh sách UID tĩnh.

- **FR-5: Bỏ `TOPIC_INDEX`.** `TOPIC_INDEX` và `searchByTopic()` bị xóa; bảng FR-2 là cấu trúc tĩnh duy nhất của `search_topic` và chỉ chứa ánh xạ từ khóa → thuật ngữ, không chứa UID. `grep -c 'TOPIC_INDEX' src/index.ts` = 0.

- **FR-6: Danh sách theo `match`, khử trùng trong trang.** Gọi `T` = các phần tử `suttaplex` theo thứ tự API sau lọc FR-7 và khử trùng `uid` (giữ lần đầu); `C` = các phần tử `hits` của response theo thứ tự API sau lọc FR-7. Với trang `p`:
  - `match=title`: kết quả = `T[(p−1)·10 … p·10)`.
  - `match=content`: kết quả = `C`, khử trùng `uid` (giữ lần đầu).
  - `match=all`: kết quả = phần tiêu đề của `match=title` trang `p`, rồi phần nội dung của `match=content` trang `p`, bỏ phần tử nội dung có `uid` đã có trong phần tiêu đề của trang. Một trang `all` có tối đa 20 kết quả (10 + 10).
  Không xếp hạng lại; giữ thứ tự API. Việc khử trùng `uid` không dựa vào việc upstream đã gộp.

- **FR-7: Lọc phần tử không phải sutta.** Loại mọi phần tử (cả `suttaplex` lẫn `hits`) có `category` (bất kỳ giá trị nào), không có `uid` là chuỗi khác rỗng, hoặc có `is_article === true`.

- **FR-8: Hiển thị kết quả khớp tiêu đề.** Mỗi kết quả in khối citation cùng hình dạng `formatCitation()` hiện tại — `**{acronym}** — {title}`, `Difficulty: {name} | Parallels: {parallel_count}`, `URL: https://suttacentral.net/{uid}` — trong đó `{name}` ánh xạ từ số `difficulty` (`1` → `beginner`, `2` → `intermediate`, `3` → `advanced`; vắng/khác → `unknown`, như hiện tại). Nếu `blurb` không rỗng, thêm dòng `→ {blurb}`. Kết thúc bằng một dòng trống.

- **FR-9: Hiển thị kết quả khớp nội dung.** Mỗi kết quả in, theo thứ tự:
  1. `**{acronym}** — {title}`; `acronym` vắng/rỗng → `uid` in hoa; `{title}` = `name` sau `trim()`, nếu rỗng thì `root_name` sau `trim()`; nếu cả hai rỗng/vắng thì dòng chỉ là `**{acronym}**` (không có ` — `).
  2. `Text: {author} ({lang})` khi `author` là chuỗi khác rỗng (`lang` vắng → bỏ ` ({lang})`); không có dòng này khi `author` vắng/rỗng.
  3. `URL: https://suttacentral.net/{uid}`, rồi một dòng trống.
  Không in dòng `Difficulty`/`Parallels` hay blurb (API không cung cấp; không bịa giá trị `unknown`/`0`). Không in `highlight`.

- **FR-10: Header và nhóm.** Dòng đầu: `Tìm thấy {n} sutta cho chủ đề "{topic}" (trang {p}):` với `{n}` là số kết quả thực in ở trang này, `{p}` là `page`, `{topic}` là giá trị caller gửi. Khi FR-3 khớp, header nêu thêm thuật ngữ đã dùng để tìm trên SuttaCentral (chữ cụ thể do design chốt, phải chứa thuật ngữ nguyên văn). Kết quả khớp tiêu đề đứng dưới dòng `Khớp tiêu đề:`, kết quả khớp nội dung dưới dòng `Khớp nội dung:`; dòng nhóm chỉ in khi nhóm đó có ít nhất một kết quả. Output không in `total` của API, không in số trang tổng.

- **FR-11: Không có kết quả ở trang 1.** Khi `topic` rỗng sau `trim()` (không gửi request), hoặc trang `page=1` không có kết quả nào sau FR-6, tool trả một content item text, không `isError`, bắt đầu bằng `Không tìm thấy sutta nào cho chủ đề "{topic}".`, kèm: (a) gợi ý thử lại bằng thuật ngữ tiếng Anh hoặc Pali, (b) danh sách các key tiếng Việt của bảng FR-2, (c) khi `match` ≠ `all`, gợi ý thử `match` khác. Nếu response có object `error` (lệnh lọc sai cú pháp), thêm `error.message` của SC nguyên văn. Output này không chứa `https://suttacentral.net`. Khi có request, output kết thúc bằng dòng footer FR-19.

- **FR-12: Lỗi API.** Status không 2xx hoặc lỗi mạng → tool kết thúc như các tool khác hiện nay: ném lỗi `SuttaCentral API error: {status}` (hoặc lỗi mạng gốc), SDK dựng response `isError: true`. Không trả kết quả một phần, không fallback sang danh sách tĩnh, không retry. Body 2xx thiếu `hits`/`suttaplex` hoặc không phải mảng được coi như mảng rỗng; `total` không phải số được coi như 0.

- **FR-13: Tham số của tool.** `search_topic` có bốn tham số:
  - `topic`: `z.string()`, giữ nguyên.
  - `language`: tên, kiểu (`z.string()`), mặc định `"en"` giữ nguyên; truyền thẳng làm `language` của API.
  - `match`: enum `"title" | "content" | "all"`, mặc định `"all"` (FR-16).
  - `page`: số nguyên, 1 ≤ `page` ≤ 10000, mặc định `1` (FR-17).
  `describe()` của tool và của từng tham số mô tả đúng hành vi mới: kết quả đến từ search của SuttaCentral, theo thứ tự kinh điển; `language` quyết định ngôn ngữ tiêu đề/blurb (khi SC có) và ảnh hưởng việc khớp tiêu đề; chủ đề tiếng Việt ngoài danh sách nên được dịch sang Anh/Pali; ý nghĩa ba giá trị `match`; `page` bắt đầu từ 1 và cách lấy trang tiếp theo footer.

- **FR-14: Các tool khác không đổi.** Output của `get_sutta`, `get_sutta_meta`, `get_parallels`, `list_divisions` trùng từng byte với `40846bb` cho cùng input và response upstream. `formatCitation()` nếu được tái dùng thì output của nó cho input dạng `/api/suttaplex/` không đổi.

- **FR-15: Tài liệu.** Cập nhật cùng thay đổi: README (bảng Tools gồm `match`, `page`; "Chủ đề có sẵn" → danh sách key tiếng Việt được ánh xạ + nói rõ tiếng Anh/Pali đi thẳng qua search SC; "Mở rộng" → sửa bảng ánh xạ trong `src/index.ts`); AGENTS.md (lớp "Topic index", mục "Extending the Topic Index", mô tả tool `search_topic`); master spec Tool 1 (bảng Input thêm `match`, `page`; "Nguồn dữ liệu", "Lưu ý"), **luồng mẫu** `specs/sutta-mcp-requirements.md:259` (`Trả về: mn10, sn47.1, dn22 + blurb` → kết quả thật của thuật ngữ ánh xạ cho `chánh niệm`, có `mn10`), và roadmap mục 1 (đánh dấu đã thực hiện, trỏ `specs/dynamic-search/`, ghi cách giải quyết bốn phát hiện và cơ chế phân trang). Không nơi nào còn mô tả `TOPIC_INDEX` như hiện trạng.

- **FR-16: Tham số `match`.** `title` → chỉ khớp tiêu đề (`suttaplex`); `content` → chỉ khớp nội dung (`hits`), **không gồm** sutta đã khớp tiêu đề (upstream loại chúng khỏi `hits`, nên `content` không phải "mọi sutta chứa từ khóa"); `all` (mặc định) → cả hai theo FR-6. Giá trị khác ba giá trị trên (kể cả khác chữ hoa/thường, ví dụ `Title`, `both`) bị schema từ chối: SDK trả `isError: true` với `Input validation error`, handler không chạy, không request.

- **FR-17: Tham số `page`.** Số nguyên, gốc 1, mặc định 1, `1 ≤ page ≤ 10000`; ngoài khoảng hoặc không phải số nguyên (`0`, `-1`, `1.5`, `10001`, chuỗi `"2"`) bị schema từ chối như FR-16 — không request. Trang tiêu đề `p` = `T[(p−1)·10 … p·10)` (cắt cục bộ, không gửi `offset`); trang nội dung `p` = response với `offset=(p−1)·10`, `limit=10`. Với `all`, trang `p` dùng cả hai cách trên trong cùng một request. Sau khi trang tiêu đề cạn, trang `all` chỉ còn phần nội dung.

- **FR-18: Còn trang sau hay không.** Tính chỉ từ input và response của lời gọi hiện tại:
  - còn tiêu đề ⟺ `p · 10 < |T|`;
  - còn nội dung ⟺ `h > 0` và `(p−1)·10 + h < total`, với `h` = số phần tử `hits` **không** có field `category` (đếm trước lọc FR-7) và `total` của chính response này;
  - `title` → còn tiêu đề; `content` → còn nội dung; `all` → còn tiêu đề hoặc còn nội dung.

- **FR-19: Footer.** Mọi output có request (kể cả FR-11 và FR-20) kết thúc bằng đúng một trong hai dòng:
  - còn trang sau (FR-18): `Còn kết quả: gọi lại search_topic với page={p+1} (giữ nguyên topic, language, match).`
  - hết: `Hết kết quả.`
  Footer không chứa `total` hay số trang tổng.

- **FR-20: Trang sau trống.** Khi `page > 1` và trang không có kết quả nào sau FR-6: một content item text, không `isError`, bắt đầu bằng `Không có kết quả sutta ở trang {p} cho chủ đề "{topic}".`, rồi footer FR-19. Không chứa `https://suttacentral.net`.

## Non-Functional Requirements

- **NFR-1:** Không thêm dependency npm, không thêm test runner; `package.json` không đổi. Verify bằng harness JSON-RPC stdio sẵn có (đủ cho mọi AC, kể cả input NFD và tham số không hợp lệ).
- **NFR-2:** Code chỉ đổi trong `src/index.ts`; không file mới trong `src/`. Script verify tạm nằm ngoài repo, xóa sau khi dùng.
- **NFR-3:** `npm run build` (tsc strict) thoát mã 0.
- **NFR-4 (Constraints — fetch đúng cái cần):** mỗi lời gọi `search_topic` phát tối đa **1** request tới SC với mọi `match` và `page` (0 khi `topic` rỗng hoặc tham số bị schema từ chối). Không lời gọi `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels` trong đường `search_topic`; không gọi thêm request để lấp đầy trang, khử trùng giữa trang, hay kiểm tra trang sau.
- **NFR-5 (Constraints — không tích lũy, không trạng thái):** không cache, không lưu response search hay danh sách `uid` đã in ra ngoài phạm vi lời gọi (không biến module, không file). Output của một lời gọi chỉ phụ thuộc input của nó và một response. Cache là roadmap mục 6.
- **NFR-6 (Constraints — chain đến nguồn):** mọi kết quả in ra có dòng `URL: https://suttacentral.net/{uid}` với `uid` khác rỗng lấy từ chính phần tử đó. Output không bao giờ chứa `**?**`, `suttacentral.net/?`, `suttacentral.net/undefined`, `suttacentral.net/null`, `/define/`.
- **NFR-7:** Bất biến đếm của các spec trước giữ nguyên: `grep -c 'segmented' src/index.ts` = 3; `grep -c -F 'sujato' src/index.ts` = 3; `grep -c -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/index.ts` = 0 (đo 2026-10-18 tại `40846bb`: 3 / 3 / 0). Code mới không đọc field `is_segmented`/`segmented_uid` và không chứa các chuỗi trên.
- **NFR-8:** Không thêm độ trễ ngoài một request: độ trễ `search_topic` ≈ độ trễ một GET search (đo 0.4–13.2 s), không request tuần tự nào khác.

## Acceptance Criteria

### Harness

Tái dùng harness `/tmp/mcp-call.sh`, dựng lại từ heredoc tại `specs/non-segmented-translation-guard/requirements.md` §Harness, với ba luật của `specs/bilara-lang-param/requirements.md` §Harness: `npm run build` trước mỗi lần chạy; mỗi lần chạy phải có đúng 1 dòng chứa `"id":2` (thiếu là chạy hỏng, không phải pass); literal dưới đây đo live 2026-10-18 — nếu lệch, fetch lại endpoint (cùng `query`, `language`, `limit=10`, `offset`) trước khi kết luận regression. `sleep 20` của harness đủ cho độ trễ đã đo (≤ 13.2 s); nếu một lần chạy thiếu dòng `"id":2`, chạy lại trước khi kết luận. Xóa file harness và log sau khi xong.

**Baseline:** trước khi sửa code, chạy harness tại `40846bb` cho các input của AC-12 và lưu text output ngoài repo để so từng byte. Xóa sau khi xong.

Trừ khi ghi khác, AC dùng `match` và `page` mặc định (`all`, 1).

### AC-1: Chủ đề tiếng Việt cốt lõi không mất kết quả

- **Maps to:** FR-2, FR-3, FR-6, FR-10, FR-16
- **When** chạy `search_topic` với `{"topic":"vô ngã"}`, `{"topic":"niết bàn"}`, `{"topic":"chánh niệm"}`, mỗi cái với `language` `en` và `vi`
- **Then** mỗi output bắt đầu bằng `Tìm thấy {n} sutta cho chủ đề "{topic}" (trang 1):` với 1 ≤ n ≤ 20, và header chứa thuật ngữ đã ánh xạ
- **And** số dòng `URL: https://suttacentral.net/` đúng bằng n
- **And** output của `chánh niệm` (cả `en` lẫn `vi`, cả `match` `all` lẫn `title`) chứa `URL: https://suttacentral.net/mn10`

### AC-2: Đủ 14 key tiếng Việt, cả hai language

- **Maps to:** FR-2
- **When** lặp `search_topic` qua 14 key tiếng Việt × `language` ∈ {`en`, `vi`}
- **Then** cả 28 output đều có n ≥ 1 và không output nào bắt đầu bằng `Không tìm thấy sutta nào`

### AC-3: Chuẩn hóa input

- **Maps to:** FR-3, FR-4
- **When** chạy `search_topic` với `{"topic":"Vô Ngã"}`, `{"topic":"  vô   ngã  "}`, và dạng NFD viết bằng escape JSON `{"topic":"vo\u0302 nga\u0303"}` (truyền nguyên văn vào harness; UTF-8 sau khi parse: `76 6f cc 82 20 6e 67 61 cc 83`, khác dạng NFC `vô ngã` = `76 c3 b4 20 6e 67 c3 a3` — `ô`/`ã` tách thành `o`/`a` + dấu kết hợp U+0302/U+0303)
- **Then** danh sách dòng `URL:` của cả ba trùng với của `{"topic":"vô ngã"}` (cùng `language`, chạy liền nhau), và header của cả ba chứa cùng thuật ngữ đã ánh xạ
- **And** đọc code: `query` của nhánh FR-4 được chuẩn hóa NFC trước khi gửi

### AC-4: Không bỏ dấu, không khớp một phần

- **Maps to:** FR-3, FR-4
- **When** chạy `search_topic` với `{"topic":"vo nga"}`, `{"topic":"thiện"}`, `{"topic":"thiền định"}`
- **Then** header (nếu có kết quả) không chứa thuật ngữ đã ánh xạ của `vô ngã` hay `thiền`; nếu không có kết quả thì output theo FR-11
- **And** đọc code: `query` gửi đi cho ba input này là chính `topic` sau NFC và `trim()`

### AC-5: Lọc dictionary và bài viết, có kết quả thật

- **Maps to:** FR-7, NFR-6
- **Given** `/api/search/instant?query=nibbana&language=en&limit=10` có hit đầu `category: "dictionary"` và `suttaplex[0].uid` = `an4.179`; `query=anatta` có hit `is_article: true` (`general-guide-sujato`, `sn-guide-sujato`, `subjects`, `terminology`) và `suttaplex[0].uid` = `an6.100`
- **When** chạy `search_topic` với `{"topic":"nibbana"}`, `{"topic":"anatta"}`, và `{"topic":"nibbana","match":"content","page":2}`
- **Then** không `result` nào có `isError: true`; mỗi output bắt đầu bằng `Tìm thấy`
- **And** output `nibbana` chứa `URL: https://suttacentral.net/an4.179`; output `anatta` chứa `URL: https://suttacentral.net/an6.100`
- **And** không output nào chứa `**?**`, `suttacentral.net/?`, `/define/`, `suttacentral.net/subjects`, `suttacentral.net/terminology`, `suttacentral.net/sn-guide-sujato`, `suttacentral.net/general-guide-sujato`

### AC-6: Trang 1 mặc định, khử trùng trong trang

- **Maps to:** FR-6, FR-10, FR-18, FR-19
- **When** chạy `search_topic` với `{"topic":"mindfulness"}` (API: 32 `suttaplex`, 8 hits ở `offset` 0)
- **Then** output có đúng 18 dòng `URL:` (10 dưới `Khớp tiêu đề:`, 8 dưới `Khớp nội dung:`), không dòng `URL:` nào lặp lại, dòng `URL:` đầu tiên là `an1.575-615`, và output không chứa `mn10`, `dn22`
- **And** dòng cuối là `Còn kết quả: gọi lại search_topic với page=2 (giữ nguyên topic, language, match).`
- **And** output không chứa `1461`, `1462`

### AC-7: Tiếng Anh/Pali đi thẳng, citation đúng

- **Maps to:** FR-4, FR-8, FR-9, FR-10
- **When** chạy `search_topic` với `{"topic":"satipatthana","language":"en"}`
- **Then** header không nêu thuật ngữ ánh xạ (không khớp bảng); output chứa khối `**MN 10** — The Discourse on Mindfulness Meditation`, `Difficulty: intermediate | Parallels: 16`, `URL: https://suttacentral.net/mn10` và một dòng bắt đầu `→ Here the Buddha details the seventh factor`
- **And** chứa liên tiếp `**AN 8.19** — Pahārādasutta`, `Text: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (pli)`, `URL: https://suttacentral.net/an8.19`
- **And** không output nào trong AC-1..AC-7 chứa `Difficulty: unknown` cho `mn10`

### AC-8: Không có kết quả

- **Maps to:** FR-11, FR-19, NFR-4
- **When** chạy `search_topic` với `{"topic":"xyzzyqq"}` (API: `total` 0), `{"topic":""}`, `{"topic":"   "}`
- **Then** mỗi output bắt đầu bằng `Không tìm thấy sutta nào cho chủ đề "{topic}".`, chứa gợi ý thử bằng tiếng Anh/Pali và đủ 14 key tiếng Việt, không chứa `https://suttacentral.net`, và `result` không có `isError: true`
- **And** output `xyzzyqq` kết thúc bằng `Hết kết quả.`
- **And** đọc code: với `topic` rỗng sau `trim()` không có lời gọi `fetch`

### AC-9: Lệnh lọc sai cú pháp

- **Maps to:** FR-11
- **When** chạy `search_topic` với `{"topic":"foo:bar"}`
- **Then** output theo FR-11 và chứa `Unknown filter: "foo:"`

### AC-10: Lỗi API

- **Maps to:** FR-12
- **When** đọc code đường `search_topic`
- **Then** status không 2xx dẫn tới `throw new Error(\`SuttaCentral API error: ${res.status}\`)` không bị bắt trong handler; không có nhánh trả kết quả một phần, retry, hay danh sách tĩnh; `hits`/`suttaplex` không phải mảng được xử lý như mảng rỗng; `total` không phải số được xử lý như 0

### AC-11: Một request, GET, không trạng thái

- **Maps to:** FR-1, FR-17, NFR-4, NFR-5
- **When** đọc code đường `search_topic`
- **Then** có đúng một lời gọi `fetch` tới `/api/search/instant`, method mặc định (GET), query gồm `query`, `language`, `limit=10`, và `offset` chỉ khi `match` ∈ {`content`, `all`} và `page > 1`, không gì khác; không lời gọi `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels`; không biến cấp module hay file nào giữ response hay `uid` đã in

### AC-12: Các tool khác không đổi

- **Maps to:** FR-14
- **When** chạy `get_sutta {"uid":"mn10"}`, `get_sutta {"uid":"mn9999"}`, `get_sutta_meta {"uid":"mn10"}`, `get_parallels {"uid":"mn10"}`, `list_divisions {}`
- **Then** mỗi output trùng từng byte với baseline tại `40846bb`

### AC-13: Phạm vi diff, build, bất biến

- **Maps to:** FR-5, NFR-1, NFR-2, NFR-3, NFR-7
- **When** chạy `npm run build`, `git status`, `git diff -- src/index.ts package.json`
- **Then** tsc thoát mã 0; không file mới trong `src/`; `package.json` không đổi; `grep -c 'TOPIC_INDEX' src/index.ts` = 0; bất biến đếm NFR-7 là 3 / 3 / 0

### AC-14: Tài liệu và schema

- **Maps to:** FR-13, FR-15
- **When** chạy harness `tools/list`, `grep -n 'TOPIC_INDEX' README.md AGENTS.md specs/sutta-mcp-requirements.md`, và `grep -c 'sn47.1, dn22' specs/sutta-mcp-requirements.md`
- **Then** `inputSchema` của `search_topic` có `match` với `"enum":["title","content","all"]` và `"default":"all"`, `page` với `"type":"integer"`, `"minimum":1`, `"maximum":10000`, `"default":1`; text của tool `search_topic` (description + describe tham số) chứa `SuttaCentral`, `Anh/Pali`, `title`, `content`, `all`, `page`
- **And** README liệt kê 14 key tiếng Việt, `match`, `page` và trỏ về bảng ánh xạ trong `src/index.ts`; AGENTS.md mô tả bảng ánh xạ + search API; roadmap mục 1 ghi đã thực hiện và trỏ `specs/dynamic-search/`
- **And** mọi dòng còn chứa `TOPIC_INDEX` chỉ nói về lịch sử (đã bị thay), không mô tả nó như hiện trạng; `grep -c 'sn47.1, dn22'` = 0

### AC-15: Hit thiếu `name`/`acronym`/`author`

- **Maps to:** FR-9
- **When** chạy `search_topic` với `{"topic":"metta","language":"en"}` và `{"topic":"three jewels","language":"en"}`
- **Then** output `metta` chứa liên tiếp `**SA 264** — 小土塼`, `Text: Bhikkhu Anālayo (en)`, `URL: https://suttacentral.net/sa264`
- **And** output `metta` chứa dòng `**CND8** — Exposition of the Questions of the Student  Mettagū` ngay trước `URL: https://suttacentral.net/cnd8` (không có dòng `Text:` giữa hai dòng)
- **And** output `three jewels` chứa liên tiếp `**SA 107** — 長者`, `Text: Bhikkhu Anālayo (en)`, `URL: https://suttacentral.net/sa107`
- **And** không output nào chứa dòng kết thúc bằng ` — ` hoặc chứa `Text: null`, `Text: undefined`

### AC-16: Phân trang `match=title`

- **Maps to:** FR-6, FR-16, FR-17, FR-18, FR-19, FR-20
- **When** chạy `search_topic` với `{"topic":"mindfulness","match":"title"}` và `page` 1, 2, 4, 5
- **Then** trang 1 và 2 mỗi trang có 10 dòng `URL:`, không có dòng `Khớp nội dung:`, kết thúc bằng footer `page=2` / `page=3`; trang 2 chứa `URL: https://suttacentral.net/dn22` và `URL: https://suttacentral.net/mn10`
- **And** trang 4 có đúng 2 dòng `URL:` (`uvs15`, `vb7`) và kết thúc bằng `Hết kết quả.`
- **And** trang 5 bắt đầu bằng `Không có kết quả sutta ở trang 5 cho chủ đề "mindfulness".`, kết thúc bằng `Hết kết quả.`, không `isError`
- **And** trang 1..4 gộp lại có 32 `uid` khác nhau

### AC-17: Phân trang `match=content`

- **Maps to:** FR-6, FR-16, FR-17, FR-18, FR-19
- **When** chạy `search_topic` với `{"topic":"mindfulness","match":"content"}` và `page` 1, 2, 147, 148
- **Then** trang 1 có 8 dòng `URL:` (`an1.296-305` … `an3.33`), không có dòng `Khớp tiêu đề:`, footer `page=2`; trang 2 có 5 dòng `URL:` bắt đầu bằng `an3.33` (lặp với trang 1 — được phép, xem Assumptions), footer `page=3`
- **And** trang 147 (`offset` 1460) theo FR-20 và kết thúc bằng `Hết kết quả.`; trang 148 cũng vậy
- **And** không trang nào chứa `mn10`, `dn22`
- **And** `{"topic":"vô ngã tướng","language":"vi","match":"content"}` (không khớp FR-3, gửi thô theo FR-4; đo 2026-10-18: `suttaplex` `[sn22.59]`, `hits` rỗng, `total` 1 — đúng trường hợp `total` rơi về `len(suttaplex)` mà điều kiện `h > 0` của FR-18 phải chặn) theo FR-11, gợi ý thử `match` khác, kết thúc bằng `Hết kết quả.`, không có footer `Còn kết quả`

### AC-18: Phân trang `match=all`

- **Maps to:** FR-6, FR-17, FR-18
- **When** chạy `search_topic` với `{"topic":"mindfulness","page":4}` và `{"topic":"mindfulness","page":5}`
- **Then** trang 4 có 2 dòng `URL:` dưới `Khớp tiêu đề:` (`uvs15`, `vb7`), rồi các kết quả dưới `Khớp nội dung:` trùng danh sách `URL:` của `{"match":"content","page":4}`, footer `page=5`
- **And** trang 5 không có dòng `Khớp tiêu đề:`

### AC-19: Tham số không hợp lệ

- **Maps to:** FR-13, FR-16, FR-17, NFR-4
- **When** chạy `search_topic` với `topic` `mindfulness` và lần lượt `{"match":"both"}`, `{"match":"Title"}`, `{"page":0}`, `{"page":-1}`, `{"page":1.5}`, `{"page":10001}`, `{"page":"2"}`
- **Then** mỗi `result` có `isError: true` và text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`
- **And** đọc code: handler không chạy với các input này (schema zod chặn), nên không có request

## Assumptions

- **VERIFIED (đo/đọc 2026-10-18):**
  - Mọi dòng của §Hình dạng search API, §Phân trang, bảng GET/POST, bảng ứng viên ánh xạ (đo bằng `curl`).
  - Upstream: `view.py` (`main`, commit `11b6dba`, 2026-08-31) và `instant_search.py` (commit `f205bd3`, 2026-02-26) của `suttacentral/suttacentral`; số dòng là neo phụ, tên hàm là neo chính.
  - `TOPIC_INDEX` có 14 key tiếng Việt, tất cả NFC; `search_topic` hiện tốn tối đa 3 request tuần tự (`src/index.ts:35-97`, `:217-226`).
  - `difficulty` của search là số, upstream ánh xạ 1/2/3 → beginner/intermediate/advanced; `/api/suttaplex/mn10` cho `intermediate`, `dn1` `advanced`, `mn21` `beginner`.
  - `https://suttacentral.net/an1.296-305`, `/pv36`, `/t1670b1.2` → 200 và `/api/suttaplex/` trả đúng `uid` — `uid` của hit dùng được cho link và cho `get_sutta_meta`.
  - SDK 1.29.0 trả `isError: true` + text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:` khi tham số không qua schema, không gọi handler (đọc `mcp.js:141`, `:178`, `types.js` `McpError`).
  - Upstream `view.py:22` chạy `query.replace('+', ' ')`: dấu `+` trong `topic` thành dấu cách kể cả khi đã encode `%2B`. Đây là hành vi SC, không phải lỗi encode phía client; Sutta MCP không bù.
  - Bất biến 3 / 3 / 0 tại `40846bb`.
- **UNVERIFIED (default stated):**
  - **Trang `all` tối đa 20 kết quả.** `all` trang `p` = `title` trang `p` + `content` trang `p`; giữ N = 10 cho mỗi nguồn để ba chế độ dùng cùng một cách tính trang và `limit` không đổi. Chia 5 + 5 giữ được trần 10 nhưng làm trang `all` khác trang `title`/`content`; trộn tuần tự (hết tiêu đề mới sang nội dung) cần biết `|T|` để suy ra `offset`, phức tạp hơn mà không thêm kết quả. Output trang 1 của `mindfulness` dài 18 khối citation.
  - **Không khử trùng giữa các trang nội dung, kích thước trang thay đổi (0–10).** Hệ quả của việc upstream gộp `uid` sau khi cắt theo `offset` và của NFR-5 (không trạng thái). Đã đo `an3.33`, `an3.62` lặp ở trang kề. Caller có thể tự bỏ qua `uid` đã thấy.
  - **Footer có thể sai ở hai trường hợp hiếm** (FR-18): một trang rỗng cuối cùng trước khi báo `Hết kết quả.`; và một trang giữa danh sách mà mọi document đều thuộc sutta khớp tiêu đề bị coi là hết. Caller vẫn gọi được `page` lớn hơn. Không dùng `total` làm số sutta.
  - **`page ≤ 10000`.** Toàn chỉ mục có 62710 document (truy vấn rỗng) → 6272 trang; `offset` 100000 đo được trả 200 rỗng. Trần chặn số lớn mà JavaScript in dạng `1e+21`, upstream sẽ trả 500 (đo: `offset` không phải số nguyên → 500).
  - **Thứ tự kinh điển, không theo độ liên quan; không xếp hạng lại** (Q1 cũ, đã chốt). Hệ quả: `mindfulness` cho `mn10`, `dn22` ở trang tiêu đề 2; FR-2 bù cho `chánh niệm` bằng cách chọn thuật ngữ.
  - **Attribution.** Kết quả khớp nội dung ghi bản văn qua dòng `Text: {author} ({lang})` (FR-9), vì tiêu đề in ra lấy từ một bản dịch/bản gốc cụ thể. Nhãn `Text` thay vì `Translator` vì `author` của hit bản gốc Pali là ấn bản (`Mahāsaṅgīti Tipiṭaka Buddhavasse 2500`), không phải dịch giả. Kết quả khớp tiêu đề là citation mức sutta (`suttaplex` không gắn một bản dịch), giống `get_sutta_meta` hiện nay; nguồn (`suttacentral.net/{uid}`) và UID có mặt, dịch giả được nêu khi caller gọi `get_sutta`. Hit thiếu `author` (`cnd8`) in không có dòng `Text:` thay vì bịa.
  - **Bỏ khớp một phần** (Q2). `thiền định`, `khổ đau`, `quy y tam bảo` hiện khớp nhờ `includes`, sau thay đổi sẽ đi thẳng sang API (FR-4); nếu 0 kết quả, FR-11 gợi ý caller dịch sang Anh/Pali — Claude làm được việc này.
  - **NFC cho truy vấn không khớp bảng** (FR-4): rẻ, giúp input NFD gửi cùng dạng với input NFC; chỉ mục SC chưa được đo với NFD, nên không có bằng chứng NFC làm đổi kết quả.
  - **Không thêm timeout phía client.** Ba helper hiện có cũng không có; truy vấn có thể chậm (rỗng: 28 s) đã bị chặn ở FR-11. Lỗi mạng/timeout của runtime hay client MCP đi theo FR-12. Timeout đồng bộ cho mọi helper là việc riêng.
  - **Key tiếng Anh/Pali của `TOPIC_INDEX` không giữ.** 23/24 key cho ≥ 1 kết quả qua API (đo); riêng `paticca-samuppada` (có gạch nối) cho 0 — `paticcasamuppada` cho kết quả. Default: chấp nhận, FR-11 gợi ý thử lại; không thêm alias tiếng Anh.
  - **Không gửi `selectedLanguages`**: hit tiếng Việt (nếu SC có văn bản tiếng Việt khớp) không xuất hiện; với thuật ngữ Anh/Pali điều này không đổi kết quả đáng kể.
  - **Tiêu đề hit có thể là tên Pali hoặc Hán** (`Pahārādasutta`, `小土塼` khi lấy từ `root_name`) — in nguyên.
  - **Truy vấn có toán tử/lệnh lọc SC** (`OR`, `by:`, `in:`, `title:`) được truyền nguyên văn; không quảng bá trong `describe()`. Với `title:`, upstream dựng `suttaplex` từ `hits` của trang, nên trang tiêu đề của truy vấn này phụ thuộc `offset` — chấp nhận, không xử lý riêng.

## Open Questions

- **Q2 (không chặn design; default ở Assumptions):** có giữ khớp một phần (theo ranh giới từ) cho key tiếng Việt, để `thiền định`/`quy y tam bảo` vẫn ánh xạ, hay chỉ khớp chính xác như FR-3?

## Out of Scope

- Cache response search (roadmap mục 6), kể cả dù API có `ETag`.
- Tự động fetch parallels cho kết quả (roadmap mục 3).
- In `highlight` (đoạn trích HTML) từ hit; tham số `limit`/kích thước trang cho caller; in `total` hay số trang tổng; khử trùng giữa các trang.
- `selectedLanguages`, `matchpartial`, `restrict`; tìm trực tiếp văn bản tiếng Việt trên SC.
- Xếp hạng lại kết quả theo độ liên quan.
- Alias/từ đồng nghĩa ngoài 14 key tiếng Việt (ví dụ `qui y`, `từ bi quán`), alias tiếng Anh.
- Timeout chung cho các helper fetch; đổi chữ lỗi HTTP.
- Sửa hành vi hay output của `get_sutta`, `get_sutta_meta`, `get_parallels`, `list_divisions`.
- Test framework, linter.
