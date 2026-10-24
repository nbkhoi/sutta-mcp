# Requirements: `search_topic` là wrapper mỏng của `GET /api/search/instant`

**Status:** Reviewed
**Created:** 2026-10-23
**Spec slug:** search-api-passthrough
**Nguồn:**
- Quyết định của người dùng ngày 2026-10-23.
- `specs/dynamic-search/requirements.md`, phần đo tiếng Việt thô (`:45`) và `selectedLanguages` (`:79`, `:365`).
- `specs/search-unit-tests/requirements.md`, ràng buộc fixture và test.
- Master spec `specs/sutta-mcp-requirements.md`: Tool 1 (`:143-160`), luồng mẫu (`:255-269`), Constraints (`:272-284`), roadmap mục 1 (`:292-299`), bảng issue (`:368-380`).

**Quyết định stakeholder đã chốt (2026-10-23, không mở lại):**
1. Tham số của tool là tham số của API, cùng tên và cùng nghĩa: `query` (bắt buộc), `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`.
   - Bỏ `match`, `page`, `topic`.
   - Bỏ mọi logic tự chế: ánh xạ tiếng Việt, cắt trang cục bộ, lọc, khử trùng, suy luận trang sau.
   - Tham số caller không truyền thì không gửi. API dùng mặc định của chính nó.
2. Output có một tham số chọn `text` hoặc `json`.
   - `json` là body response của API, nguyên văn.
   - `text` là dạng dễ đọc, **không** lọc, không khử trùng, không đổi thứ tự. In `suttaplex`, `hits` (kể cả mục dictionary, bài viết, mỗi bản dịch một mục), `total`, `fuzzy_dictionary`, và `error` nếu có, theo thứ tự API.
3. Phạm vi chỉ có `search_topic`. Bốn tool còn lại không đổi. Tên tool vẫn là `search_topic`.

Các chi tiết quyết định 1–2 chưa nói (tên tham số output, kiểu của `selectedLanguages`/`matchpartial`, kiểm `limit`/`offset`, liên kết nguồn, đường lỗi, `highlight`, field `suttaplex`) được hỏi trong `clarifications.md` (C1–C11). Người dùng đã trả lời ngày 2026-10-23: chọn đúng default cho C1, C2, C5; C3, C4, C6–C11 dùng default. FR dưới đây ghi rõ câu tương ứng.

## Context & Goal

### Vấn đề

Spec `dynamic-search` đặt vấn đề tiếng Việt sai. Nó coi vấn đề là "search của SuttaCentral không hiểu tiếng Việt", rồi luôn ánh xạ 14 key tiếng Việt sang thuật ngữ Pali/Anh (`VI_TOPIC_TERMS`). Nhưng chính số đo của spec đó đã cho thấy điều ngược lại:

- Với `language=vi`, truy vấn tiếng Việt thô có khớp tiêu đề tiếng Việt (`specs/dynamic-search/requirements.md:45`: `vô ngã` 21, `niết bàn` 20).
- `hits` rỗng chỉ vì tool không bao giờ gửi `selectedLanguages`, nên API dùng mặc định `["en","pli"]` (`:79`, `:365`).

Logic tự chế (lọc, khử trùng, cắt trang, footer) che mất những gì SC thật sự trả về. Nó cũng là nguồn của issue #18 (thuật ngữ ánh xạ bỏ sót kinh tiêu biểu).

### Mục tiêu

`search_topic` phản chiếu đúng `GET https://suttacentral.net/api/search/instant`:

- cùng tham số;
- một request mỗi lời gọi;
- output `json` là body nguyên văn;
- output `text` in mọi thứ API trả về, đúng thứ tự, kèm link về SuttaCentral.

Caller (Claude) tự chọn `language` và `selectedLanguages` để tìm bằng tiếng Việt.

### Hiện trạng (đọc code tại `d972fa6`, 2026-10-23)

**Handler và helper trong `src/index.ts`:**
- Handler `search_topic` (`:108-147`) có tham số `topic`, `language` (mặc định `"en"`), `match`, `page`. Nó gọi `resolveTopic()`. Khi `query` rỗng, nó trả `formatNoResults()` mà không fetch. Nếu không, nó gọi `fetchSearch(query, language, searchOffset(match, page))` rồi `formatSearchResult()`.
- `fetchSearch()` (`:33-39`) luôn gửi `query`, `language`, `limit=10`, và gửi `offset` khi > 0. Không `!res.ok` thì ném `SuttaCentral API error: {status}`. Không có try/catch trong handler. Ba helper fetch khác cùng kiểu.

**`src/search.ts` (212 dòng, không import, không I/O):**
- `SEARCH_PAGE_SIZE`, `VI_TOPIC_TERMS` (14 key), `DIFFICULTY_NAMES`
- `formatTitleMatch()`, `formatContentMatch()`
- `resolveTopic()`, `searchOffset()`, `normalizeSearchResponse()`
- `isSutta()`, `takeNew()`, `selectPage()`, `hasMore()`
- `formatFooter()`, `termLines()`, `formatNoResults()`, `formatSearchResult()`
- `formatCitation()`, mà `src/index.ts` import và dùng ở `get_sutta` (`:181`) và `get_sutta_meta` (`:260`)

**Test và fixture:**
- `test/search.test.ts` có 16 case. Mỗi case mang tiền tố FR của dynamic-search và import các hàm trên.
- `test/fixtures/` có 9 file, tổng 52,333 byte (`cat | wc -c`), đã cắt bỏ `highlight`/`translations`/`fuzzy_dictionary`.
- `package.json` script `test` là `tsx --test test/search.test.ts`.

**Bất biến đếm trên `src/index.ts`:**

| Lệnh | Giá trị |
|---|---|
| `grep -c 'segmented'` | 3 |
| `grep -c -F 'sujato'` | 3 |
| `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush'` | 0 |
| `grep -c -F 'search/instant?'` | 1 |
| `grep -c 'fetch('` | 4 |

Cả năm lệnh cho 0 trên `src/search.ts`.

**Tài liệu mô tả hành vi cũ:**
- README: bảng Tools, "Chủ đề có sẵn", "Mở rộng".
- AGENTS.md: `:24`, `:29`, `:31`, `:41`, `:43-45`.
- Master spec: Tool 1 `:143-160`, luồng mẫu `:259-261`, roadmap mục 1 `:292-299`, issue #18/#19/#20 `:376-380`.

**Phiên bản:** SDK `@modelcontextprotocol/sdk` 1.29.0, zod 3.25.76.

### Hình dạng API (đọc upstream `suttacentral/suttacentral` `c755a43`; đo live 2026-10-23)

| Quan sát | Bằng chứng |
|---|---|
| Endpoint không có trong Swagger công bố, nhưng có route `api.add_resource(InstantSearch, '/search/instant')`. Trang search của website gọi nó với `limit` 50. | `server/src/sc_flask/app.py:89`; `client/elements/sc-page-search.js:1239` (orchestrator đọc) |
| Tham số GET: `query`, `language`, `limit` (mặc định 10), `offset` (mặc định 0), `restrict` (`all` coi như không có), `matchpartial` (chuỗi, mặc định `'false'`, so với `'true'`), `selectedLanguages` (chuỗi JSON, mặc định `'["en", "pli"]'`, JSON sai thì quay về mặc định). `query` có `+` bị thay bằng dấu cách, rồi bị `strip()`. Không kiểm `limit`/`offset`. GET có cache server 600 s. | `view.py` class `InstantSearch.get`; `instant_search.py` `instant_search_query()` (đọc 2026-10-23) |
| Thiếu `query` → HTTP 422. Body là **chuỗi** JSON `"{\"error\": \"'query' param is required\"}"`. | đo |
| `offset=-5`, `limit=abc` → HTTP 500, body `{"message": …}`. `limit=0` → 200, 0 hit, 32 `suttaplex`. `selectedLanguages=notjson` → 200, `total` 1461 (= mặc định). | đo (`mindfulness`/`en`) |
| Body thường có `total`, `hits`, `suttaplex`, `fuzzy_dictionary`. Lệnh lọc sai cho thêm `error: {type, message, suggestions}`. Ví dụ `foo:bar`: `unknown_filter`, `Unknown filter: "foo:"`, 3 suggestion. | đo |
| `restrict=dictionaries` → HTTP 200, body là `null`. Nguyên nhân: `instant_search_query()` chỉ `return` trong nhánh `restrict != 'dictionaries'`. | đo `nibbana`, `metta`, `dukkha`; đọc code |
| `fuzzy_dictionary` chỉ có thể khác rỗng khi `matchpartial == 'true'`. Chưa quan sát được phần tử khác rỗng (`nibana` + `matchpartial=true` → `[]`). | `process_search_results()` |
| `hits` có nhiều dạng phần tử: (1) bản văn: `uid`, `acronym`, `name`, `root_name`, `author`, `author_uid`, `lang`, `url` (ví dụ `/an1.378-393/vi/minh_chau`), `highlight`, `heading`…; (2) dictionary: `category: "dictionary"`, `url: "/define/nibbana"`, `heading`, `highlight`, không có `uid`; (3) bài viết: `is_article: true`, `uid` ví dụ `subjects`, `url: "/subjects"`; (4) truy vấn `list authors`: 72 mục chỉ có `uid: ""`, `author`, `author_uid`, `author_short`, `content`, `param_lang`. | đo `vô ngã`/`vi`, `nibbana`, `anatta`, `list authors` |
| `highlight` là object `{ content: [chuỗi HTML] }`. Kích thước JSON mỗi hit: văn bản tối đa khoảng 1.2 KB, dictionary 521 B – 2.3 KB. | đo 5 truy vấn |
| `suttaplex` là khớp tiêu đề. Với truy vấn thường, API trả nguyên mảng, không theo `limit`/`offset` (`mindfulness`/`en`: 32 phần tử ở mọi `offset`). Có hai ngoại lệ. Truy vấn là một uid (`mn10`) → `suttaplex` chỉ có sutta đó. Truy vấn `title:` → `suttaplex` dựng từ `hits` của trang hiện tại, nên **theo** `limit`/`offset`: `title:mindfulness`/`en` cho 7 phần tử ở `offset` 0 (`an1.575-615`, `an6.20`, …; `total` 38) và 9 phần tử khác ở `offset` 10 (`an8.74`, `an8.81`, `dn22`, …; `total` 36). | `try_to_fetch_suttaplex()`; đo (review 1, đo lại 2026-10-23) |
| API bỏ khỏi `hits` các hit có `uid` đã có trong `suttaplex` của chính response, **trước** khi tính `total`. Vì vậy một trang có thể ít hơn `limit` hit trong khi vẫn còn trang sau: `mindfulness`/`en`, `limit` 10 → 8 hit (`total` 1461); `offset=10` → 5 hit (`total` 1462). | `remove_hits_if_uid_in_suttaplexs()`, `calculate_total()`; đo |
| `total` là số đếm xấp xỉ, tính trong `calculate_total()` qua ba nhánh. (1) Nếu số document khớp trong chỉ mục ≤ `limit`: `total` = số hit của trang **trước** khi bỏ hit trùng `suttaplex`, nên phụ thuộc `limit`. (2) Nếu không: `total` = số document khớp − số hit bị bỏ ở **trang này**. (3) Sau đó, nếu `total` = 0 thì `total` = số phần tử `suttaplex`. Hệ quả đo được: `mn10`/`en` → `total` 10 với `limit` 10, nhưng `total` 5 với `limit` 50, cả hai lần 4 hit. `title:mindfulness`/`en` → `offset` 30: 5 `suttaplex`, `total` 40; `offset` 40 vẫn có 4 `suttaplex` (`t1670b2.62`, `vb7`, …), `total` 41; `offset` 50: 0. `vô ngã`/`language=vi` → `offset` 0, 10, 30 đều cho cùng 21 `suttaplex`, 0 hit, `total` 21. Vì vậy `total` không phải tín hiệu tin được để biết còn trang sau. | `calculate_total()` (`instant_search.py:348-355`, đọc tại `c755a43`); đo (review 2, 3; đo lại 2026-10-23) |
| Mỗi phần tử `suttaplex` có `translations` (khoảng 14 mục). `mindfulness`/`en`: body 140,685 B. Serialize lại `suttaplex` bằng Python (`json.dumps`, separator mặc định, `ensure_ascii=False`) được 132,394 B; bỏ `translations` thì còn 18,131 B. `highlight` khoảng 4 KB. | đo (review 1) |
| Analyzer không phân biệt dấu: `vo nga` khớp như `vô ngã`. | orchestrator đọc upstream |
| **Tiếng Việt:** `vô ngã`/`language=vi` → 21 `suttaplex`, 0 hit, `total` 21. Thêm `selectedLanguages=["vi","pli"]` → 21 `suttaplex`, 10 hit, `total` 185. Các hit là bản dịch tiếng Việt, ví dụ `an1.378-393`, `vi`, `minh_chau`. | đo 2026-10-23 |
| **Bỏ `language`:** `mindfulness` → 3 `suttaplex` (đầu `t1670b2.12`), 7 hit, `total` 1459. Với `language=en`: 32 `suttaplex`, 8 hit, `total` 1461. `vô ngã` không có `language` → 0/0. | đo 2026-10-23 |

## Stakeholders

- **Primary users:** Claude, caller của MCP.
  - Cần đủ tham số của API để tìm bằng tiếng Việt (`language=vi`, `selectedLanguages` có `vi`), phân trang bằng `limit`/`offset`, và dùng lệnh lọc của SC.
  - Cần thấy đúng những gì SC trả về, không bị lọc ngầm.
  - Cần mỗi mục có link để gọi tiếp `get_sutta`/`get_parallels`.
- **Secondary users:** người dùng cuối hỏi Dhamma bằng tiếng Việt hoặc tiếng Anh. Câu trả lời có nguồn SuttaCentral, gồm cả bản dịch tiếng Việt khi SC có.
- **Operators / maintainers:**
  - Người bảo trì `src/search.ts`/`src/index.ts`: ít logic tự chế hơn, không còn bảng thuật ngữ phải đo và bảo trì.
  - SuttaCentral: mỗi lời gọi đúng một GET, không tích lũy dữ liệu, mọi output trỏ về SC.

## Functional Requirements

### Tham số và request

- **FR-1: Schema của tool.** `search_topic` khai báo đúng tám tham số, không tham số nào khác (`topic`, `match`, `page` không còn):

  | Tham số | Kiểu | Bắt buộc | Có `.default()`? | Theo |
  |---|---|---|---|---|
  | `query` | `z.string()` | có | — | C4 |
  | `language` | `z.string()` | không | không | — |
  | `limit` | `z.number().int().min(0)` | không | không | C4 |
  | `offset` | `z.number().int().min(0)` | không | không | C4 |
  | `selectedLanguages` | `z.array(z.string())` | không | không | C2 |
  | `restrict` | `z.string()` | không | không | — |
  | `matchpartial` | `z.boolean()` | không | không | C3 |
  | `format` | `z.enum(["text","json"])` | không | `"text"` | C1 |

  Bảy tham số API không có `.default()`. Giá trị không qua schema thì SDK trả `isError: true` với text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`. Khi đó handler không chạy và không có request.

  Key lạ không bị từ chối. Đo với SDK 1.29.0 (review 1): `{"query":"m","topic":"x"}` được nhận và `topic` bị bỏ im lặng, dù `inputSchema` có `"additionalProperties":false`. Chỉ input thiếu `query` (ví dụ `{"topic":"x"}`) mới bị từ chối. Requirements không đòi tool từ chối key lạ.

- **FR-2: Đúng một request GET, chỉ gửi tham số được truyền.** Mỗi lời gọi hợp lệ phát **đúng một** request `GET https://suttacentral.net/api/search/instant`.
  - Query string luôn có `query`.
  - Mỗi tham số API khác có mặt **khi và chỉ khi** caller truyền nó.
  - Cách mã hóa giá trị:
    - chuỗi: nguyên văn, chỉ URL-encode;
    - số nguyên: dạng thập phân;
    - `selectedLanguages`: `JSON.stringify(mảng)` (C2);
    - `matchpartial`: `true` hoặc `false` (C3).
  - `format` không bao giờ được gửi.
  - Không gửi tham số nào caller không truyền, kể cả `limit=10` hay `language=en`.
  - Không dùng POST. Không request `/api/suttaplex/` hay endpoint nào khác.

- **FR-2a: Một hàm dựng URL, dùng chung cho fetch và dòng nguồn.**
  - URL request được dựng bởi đúng một hàm thuần, export từ `src/search.ts`. Hàm nhận các tham số của tool và trả URL đầy đủ dạng chuỗi. Mọi hành vi của FR-2 và FR-3 nằm trong hàm này, và unit test FR-2/FR-3 kiểm hàm này.
  - Mỗi lời gọi, handler trong `src/index.ts` gọi hàm đó đúng một lần và lưu kết quả vào một biến.
  - Handler truyền **chính biến đó, không sửa**, cho cả `fetch` lẫn phần dựng dòng nguồn (FR-5, FR-6).
  - Handler không nối, sửa hay thêm tham số vào URL.

- **FR-3: `query` nguyên văn.** `query` được gửi đúng như caller truyền. Tool không chuẩn hóa NFC, không trim, không đổi chữ hoa/thường, không gộp khoảng trắng, không ánh xạ, không chặn chuỗi rỗng (C4). Việc thay `+` thành dấu cách và `strip()` là hành vi của SC, tool không bù.

- **FR-4: Bỏ logic tự chế.** Sau thay đổi, `src/` không còn bảng ánh xạ, chuẩn hóa topic, lọc phần tử, khử trùng `uid`, cắt trang cục bộ hay suy luận trang sau. Cụ thể:
  - `cat src/*.ts | grep -c -E 'VI_TOPIC_TERMS|SEARCH_PAGE_SIZE|resolveTopic|searchOffset|selectPage|hasMore|isSutta|takeNew|formatNoResults|Còn kết quả|Hết kết quả'` = 0.
  - `formatCitation()` giữ nguyên chữ ký và thân hàm (FR-16).

### Output

- **FR-5: `format=json`.**
  - Content item thứ nhất có `type: "text"`. Text của nó **trùng từng byte** với body response đọc bằng `res.text()`: không parse rồi serialize lại, không lọc, không đổi thứ tự, không thêm bớt.
  - Content item thứ hai là một dòng nêu nguồn SuttaCentral kèm URL request đầy đủ đã gửi (C5).
  - Body `null` (C10) cho text `null`.

- **FR-6: `format=text`, bố cục chung.** Output là một content item text:
  1. Dòng đầu nêu nguồn là SuttaCentral, kèm URL request đầy đủ đã gửi (C5).
  2. Sau đó, theo thứ tự (C11): phần `suttaplex`, phần `hits`, dòng `total`, phần `fuzzy_dictionary`, và phần `error` khi body có key `error`.

  Mỗi phần mảng có tiêu đề kèm số phần tử của mảng (`length` của API, kể cả 0). Phần tử trong mỗi mảng được in theo đúng thứ tự API, mỗi phần tử đúng một mục. Không phần tử nào bị bỏ, gộp, in hai lần, hay đổi chỗ. Chữ cụ thể của tiêu đề và nhãn do design chốt.

- **FR-7: Mục `suttaplex`.** Theo C8, mỗi phần tử in các thông tin sau, field nào vắng hoặc rỗng thì bỏ dòng tương ứng:
  - `acronym` (vắng/rỗng thì `uid`)
  - tiêu đề: `translated_title`, nếu vắng/rỗng thì `original_title`
  - `uid`
  - link `https://suttacentral.net/{uid}` khi `uid` là chuỗi khác rỗng (C5)
  - `difficulty` khi khác `null`/vắng, in giá trị thô của API
  - `blurb` khi khác rỗng

  Không in `translations`.

- **FR-8: Mục `hits`.** Mỗi phần tử, kể cả mục dictionary, bài viết và mục của lệnh `list authors`, là một mục. Mục in các field sau khi có mặt và khác `null`/rỗng:
  - link `https://suttacentral.net{url}` khi `url` là chuỗi bắt đầu bằng `/` (C5)
  - `acronym`
  - `name`, nếu rỗng thì `root_name`
  - `uid`
  - `author` kèm `author_uid` và `lang`
  - `category`
  - dấu hiệu bài viết khi `is_article === true`
  - mọi chuỗi trong `highlight.content`, nguyên văn, không cắt, không bỏ thẻ HTML (C7)

  Không mục nào chứa chữ `null` hay `undefined` sinh ra từ field vắng.

- **FR-9: `total`.** In giá trị `total` của body, nguyên văn. Nhãn nói rõ đây là `total` do SuttaCentral báo, không phải số sutta. Body không có `total` thì dòng nói rõ là không có.

- **FR-10: `fuzzy_dictionary`.** In mỗi phần tử theo thứ tự API, mỗi phần tử một mục. Dạng phần tử chưa quan sát được, nên mỗi mục là JSON một dòng của phần tử đó. Mảng rỗng chỉ in tiêu đề với số 0.

- **FR-11: `error`.** Khi body có `error`, in `type`, `message` và mọi chuỗi trong `suggestions`, nguyên văn. Result không có `isError` (HTTP 200).

- **FR-12: Body 2xx bất thường.** Với `format=text`:
  - Body `null` (C10) → dòng nguồn, rồi một dòng nói SC trả body `null`. Không ném lỗi, không `isError`.
  - Body là JSON nhưng không phải object, hoặc thiếu key → in phần có được. Key thiếu hay không phải mảng được nêu rõ, không coi im lặng là mảng rỗng.
  - Body 2xx không parse được JSON → ném lỗi, SDK dựng `isError: true`.

- **FR-13: Non-2xx và lỗi mạng.** Ở cả hai format, status không 2xx dẫn tới ném `SuttaCentral API error: {status}`, và lỗi mạng giữ nguyên lỗi gốc (C6). Handler không bắt lỗi. SDK dựng `isError: true`. Không retry, không kết quả một phần.

- **FR-14: Mô tả tool và tham số.** `describe()` của tool và của từng tham số nêu:
  - Tool trả nguyên kết quả search của SuttaCentral, theo thứ tự SC, không lọc.
  - `hits` là khớp nội dung, phân trang bằng `limit`/`offset`.
  - `suttaplex` là khớp tiêu đề:
    - truy vấn thường: trả nguyên mảng ở mọi trang;
    - truy vấn `title:`: theo `limit`/`offset` như `hits`;
    - truy vấn là một uid: chỉ có sutta đó.
  - `limit` và `offset` được gửi tới API nguyên như caller truyền.
  - API bỏ khỏi `hits` các sutta đã có trong `suttaplex`, nên một trang có thể có ít hơn `limit` hit trong khi vẫn còn kết quả.
  - `total` là số đếm xấp xỉ của SuttaCentral. Nó phụ thuộc `limit`, bị trừ đi các hit bị bỏ ở trang hiện tại, và khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề. Vì vậy `total` không phải tín hiệu tin được để biết còn trang sau.
  - Khớp tiêu đề lặp lại ở mọi `offset`, trừ khi truy vấn bắt đầu bằng `title:`.
  - Muốn biết còn kết quả hay không: gọi lại với `offset` lớn hơn và xem có mục mới không.
  - Mô tả không nêu luật dừng nào dựa trên `total`, `limit` hay số hit. Tool không tự suy luận trang sau (FR-4).
  - Ý nghĩa và mặc định phía API của từng tham số khi bỏ trống:
    - `language`: bỏ trống cho kết quả khác `en`, xem C9; tiếng Việt dùng `vi` để khớp tiêu đề tiếng Việt.
    - `selectedLanguages`: mặc định `["en","pli"]`; muốn có bản dịch tiếng Việt trong `hits` thì truyền mảng có `vi`.
    - `limit`: mặc định 10.
    - `offset`: mặc định 0.
    - `restrict`: `all`, `dictionaries` (trả `null`).
    - `matchpartial`: mặc định tắt.
  - `format`: ý nghĩa của `text` và `json`.

  Không còn câu nào nói search của SC "không hiểu tiếng Việt" hay nhắc chủ đề tiếng Việt có sẵn.

### Không đổi

- **FR-15: Một request, không trạng thái.** Không cache, không biến cấp module hay file nào giữ response hoặc tham số giữa các lời gọi. Output chỉ phụ thuộc input và một response.

- **FR-16: Các tool khác không đổi.** Với cùng input và cùng response upstream:
  - Output của `get_sutta`, `get_sutta_meta`, `get_parallels`, `list_divisions` trùng từng byte với bản build `d972fa6`.
  - Phần `tools/list` của bốn tool đó cũng trùng từng byte.
  - Thân `formatCitation()` không đổi.

### Test

- **FR-17: Unit test offline cập nhật.** `test/search.test.ts` và `test/fixtures/` được viết lại cho hành vi mới:
  - Chạy bằng `npm test`, runner `node:test` qua `tsx`.
  - Không mạng, không gán hay stub `globalThis.fetch`, không import `src/index.ts`.
  - Tên mỗi case bắt đầu bằng id FR của **spec này**.

  Mỗi FR sau có ít nhất một case với expected value là literal:

  | FR | Nội dung tối thiểu |
  |---|---|
  | FR-2, FR-2a | Kiểm trên hàm dựng URL của FR-2a. Chỉ tham số được truyền mới vào query string; không truyền gì ngoài `query` thì query string chỉ có `query`. `selectedLanguages` `["vi","pli"]` thành `["vi","pli"]` dạng chuỗi JSON. `matchpartial` thành `true`/`false`. `format` không vào query string. |
  | FR-3 | `query` có khoảng trắng đầu/cuối, chữ hoa và dạng NFD được giữ nguyên trong URL (chỉ khác ở mã hóa URL). |
  | FR-6 | Với một fixture, số mục mỗi phần bằng `length` của mảng tương ứng, và `uid`/`url` các mục theo đúng thứ tự fixture. |
  | FR-7 | Mục `suttaplex` có link `https://suttacentral.net/{uid}` và có tiêu đề rơi về `original_title` khi `translated_title` rỗng. |
  | FR-8 | Mục dictionary (`/define/...`), bài viết (`is_article`) và mục không có `url` (`uid: ""`) đều có mặt. `highlight.content` in nguyên văn: test với input literal, vì fixture không chứa `highlight` (NFR-4). |
  | FR-9 | Giá trị `total` của fixture xuất hiện. |
  | FR-10 | Input literal: `fuzzy_dictionary` có hai phần tử khác nhau → output có từng phần tử dạng JSON một dòng, đúng thứ tự. Mảng rỗng → chỉ có tiêu đề với số 0. |
  | FR-11 | `foo:bar` in `Unknown filter: "foo:"` và 3 suggestion. |
  | FR-12 | Body `null` và body thiếu key. |
  | FR-5 | Chỉ khi design đặt việc dựng output `json` trong `src/search.ts`: text của item thứ nhất trùng chuỗi body đưa vào. |

- **FR-18: Test có giá trị phân biệt.** `npm test` thoát khác 0 với từng đột biến sau, áp riêng lẻ trên bản sao `src/search.ts`:
  - (a) bỏ các phần tử có `category` khỏi `hits` trong `text`;
  - (b) gửi một tham số caller không truyền, ví dụ thêm `limit=10` mặc định;
  - (c) gửi `selectedLanguages` không qua `JSON.stringify`;
  - (d) trim `query` trước khi gửi.

### Tài liệu

- **FR-19: README.**
  - Bảng Tools mô tả `search_topic` là wrapper của search SC, kèm tham số API và `format`.
  - Mục "Chủ đề có sẵn" và "Mở rộng" (bảng `VI_TOPIC_TERMS`) được thay bằng hướng dẫn ngắn: tìm bằng tiếng Việt thì dùng `language=vi`, thêm `selectedLanguages` có `vi` để có bản dịch tiếng Việt trong `hits`.
  - `grep -c 'VI_TOPIC_TERMS' README.md` = 0.

- **FR-20: Master spec.** Trong `specs/sutta-mcp-requirements.md`:
  - **Tool 1:** bảng Input liệt kê tám tham số của FR-1. Sửa Output, Nguồn dữ liệu, Lưu ý cho hợp. Bỏ câu "Search của SC không hiểu tiếng Việt".
  - **Luồng mẫu (`:259-261`):** đổi thành lời gọi với tham số mới. Kết quả nêu trong luồng phải đo live được.
  - **Roadmap mục 1:** ghi rằng phần ánh xạ tiếng Việt, `match`/`page`, lọc và khử trùng của `dynamic-search` đã bị spec `search-api-passthrough` thay thế. Kèm lý do đo được (`language=vi` + `selectedLanguages`).
  - **Bảng issue:**
    - #18 ghi không còn áp dụng, vì `VI_TOPIC_TERMS` đã bỏ.
    - #19 và #20: phần `search_topic` ghi cần kiểm lại trên output mới.
    - Câu "Thứ tự đề xuất" sửa cho hợp.
  - Mọi đường dẫn `VI_TOPIC_TERMS` còn lại chỉ ở ngữ cảnh lịch sử.

- **FR-21: AGENTS.md, sửa cuối cùng.**
  - **Nội dung:**
    - Sửa `:24`, mô tả `src/search.ts`: không còn `VI_TOPIC_TERMS`, lọc, phân trang.
    - Bỏ lớp "Vietnamese topic mapping" (`:29`).
    - Sửa mô tả tool `search_topic` (`:31`) và endpoint search (`:41`).
    - Bỏ mục "Extending the Vietnamese Topic Mapping" (`:43-45`).
    - Không đổi gì khác.
  - **Thứ tự:** `AGENTS.md` là dependency được pin `context:agents` trong `specs/search-api-passthrough/workflow-contract.json`.
    1. Task sửa `AGENTS.md` là **task build cuối cùng**, riêng một task, chỉ sửa file này.
    2. Ngay sau đó, trước code review on-completion, chạy đường cập nhật contract. Bước `authorize` chỉ thực hiện khi người dùng đồng ý rõ ràng tại thời điểm đó.
    3. Người dùng không authorize thì workflow dừng ở trạng thái drift. Agent không tự khôi phục `AGENTS.md`.

## Non-Functional Requirements

- **NFR-1 (không dependency mới):** `package.json` và `package-lock.json` không đổi, script `test` vẫn trỏ `test/search.test.ts`. Không runner, assertion hay mock library ngoài `node:test` và `node:assert`.
- **NFR-2 (build):** `npm run build` (tsc strict) thoát mã 0 với `tsconfig.json` không đổi. Sau `rm -rf dist && npm run build`, `dist/` chỉ có `index.js` và `search.js`.
- **NFR-3 (phạm vi file):** chỉ đổi các file sau:
  - `src/index.ts`, `src/search.ts`
  - `test/search.test.ts`, `test/fixtures/**`
  - `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md`
  - artifact của spec này
  - `specs/INDEX.md`, chỉ dòng của spec này, do orchestrator viết khi hoàn tất

  Không file mới trong `src/` hay ở gốc repo.
- **NFR-4 (fixture, Constraints "không tích lũy"):** giữ ràng buộc của `specs/search-unit-tests/requirements.md` NFR-4/FR-10/FR-11:
  - Tối đa 10 file, tổng ≤ 65536 byte (`cat test/fixtures/* | wc -c`).
  - Mỗi file có URL request và ngày ghi.
  - Body đã cắt chỉ giữ field mà code đọc.
  - Không có `highlight` hay `translations`.
  - Ghi live bằng `curl -G` đúng request mà tool sẽ phát.
  - Kiểm một lần rằng output `text` cho body thô và body đã cắt trùng nhau, trừ các dòng của field đã cắt. Body thô không lưu vào repo hay bất kỳ đâu.
  - Fixture cũ không còn dùng thì xóa.
  - Không script tải hàng loạt.
- **NFR-5 (bất biến đếm):** trên `src/index.ts`:

  | Lệnh | Giá trị |
  |---|---|
  | `grep -c 'segmented'` | 3 |
  | `grep -c -F 'sujato'` | 3 |
  | `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush'` | 0 |
  | `grep -c 'fetch('` | 4 |

  Cũng trên `src/index.ts`: đúng một lời gọi `fetch` tới `/api/search/instant`, với đối số là biến chứa kết quả của hàm dựng URL (FR-2a), kiểm bằng đọc code. Bốn lệnh grep trên cho 0 trên `src/search.ts`. Code không đọc field `is_segmented`/`segmented_uid`, và FR-8 không in chúng.
- **NFR-6 (luật verify live):** harness JSON-RPC stdio và luật hợp lệ theo `specs/dynamic-search/design.md` §Harness.
  - Lần chạy **không hợp lệ** được chạy lại: `fetch failed`, timeout, thiếu/thừa dòng `"id":2`, HTTP 000.
  - Mismatch trên một lần chạy **hợp lệ** thì dừng và báo, không chạy lại.
  - Script và log nằm ngoài repo, xóa sau khi dùng. Không lưu response thô.
- **NFR-7 (độ trễ):** không thêm request. Độ trễ của tool xấp xỉ một GET search: đo 2026-10-23 từ 1.5 đến 10.5 s (lượt đo của spec: 1.5–5.4 s; review 1: 4.4–10.5 s), còn `list authors` 18 s. Harness live có thời gian chờ cố định phải chừa đủ cho các số này.

## Acceptance Criteria

### Harness

Harness theo NFR-6. `npm run build` trước mỗi đợt chạy. Literal dưới đây đo live ngày 2026-10-23. Nếu lệch trên lần chạy hợp lệ, fetch lại endpoint với cùng tham số để phân biệt chỉ mục SC trôi hay regression, rồi dừng và báo.

**Baseline:** trước khi sửa code, chạy harness ở `d972fa6` cho các input của AC-12 và lưu output ngoài repo để so từng byte. Xóa baseline sau khi xong.

### AC-1: Tiếng Việt khớp tiêu đề với `language=vi`

- **Maps to:** FR-2, FR-3, FR-6, FR-7
- **When** gọi `search_topic {"query":"vô ngã","language":"vi"}`
- **Then** output `text` có phần `suttaplex` với 21 mục, trong đó có link `https://suttacentral.net/sn22.59` và tiêu đề `Năm Vị (Vô ngã tưởng)`
- **And** phần `hits` có số 0, dòng `total` có `21`
- **And** dòng nguồn chứa URL request có `language=vi`, không có `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`

### AC-2: Bản dịch tiếng Việt trong `hits` với `selectedLanguages`

- **Maps to:** FR-2, FR-8
- **When** gọi `search_topic {"query":"vô ngã","language":"vi","selectedLanguages":["vi","pli"]}`
- **Then** phần `hits` có 10 mục; mục đầu có link `https://suttacentral.net/an1.378-393/vi/minh_chau` và tác giả `Thích Minh Châu`
- **And** dòng `total` có `185`
- **And** giải mã URL request trong dòng nguồn: `new URL(…).searchParams.get("selectedLanguages")` cho đúng chuỗi `["vi","pli"]`

### AC-3: Không lọc: dictionary và bài viết có mặt

- **Maps to:** FR-6, FR-8
- **When** gọi `search_topic {"query":"anatta","language":"en"}`
- **Then** phần `hits` có 10 mục, theo thứ tự:
  1. mục dictionary với link `https://suttacentral.net/define/anatta`
  2. bốn bài viết `general-guide-sujato`, `sn-guide-sujato`, `subjects`, `terminology`
  3. `thi-ap4`, `an3.136`, `an7.18`, `an7.20`, `an10.60`
- **And** phần `suttaplex` mở đầu bằng `an6.100`

### AC-4: `format=json` là body nguyên văn

- **Maps to:** FR-5, FR-2
- **When** gọi `search_topic {"query":"foo:bar","language":"en","format":"json"}`, rồi `curl -sG` cùng URL ngay sau đó
- **Then** text của content item thứ nhất trùng từng byte với body của `curl`
- **And** content item thứ hai chứa `https://suttacentral.net/api/search/instant?` và `query=foo%3Abar` (hoặc dạng mã hóa tương đương của `foo:bar`)

### AC-5: `error` của SC

- **Maps to:** FR-11
- **When** gọi `search_topic {"query":"foo:bar","language":"en"}`
- **Then** output có `unknown_filter`, `Unknown filter: "foo:"`, và cả ba suggestion, mở đầu bằng `Supported filters are`
- **And** result không có `isError: true`

### AC-6: Body `null`

- **Maps to:** FR-12, FR-5
- **When** gọi `search_topic {"query":"nibbana","language":"en","restrict":"dictionaries"}` với `format` mặc định, rồi với `"format":"json"`
- **Then** output `text` có dòng nguồn và dòng nói SC trả body `null`, không có `isError`
- **And** item thứ nhất của output `json` có text đúng `null`

### AC-7: Mục không có `url`

- **Maps to:** FR-8
- **Given** unit test với một mục `hits` literal dạng `list authors`: `{"uid":"","author":"Bhikkhu Anālayo","author_uid":"analayo"}`
- **When** dựng output `text`
- **Then** mục đó có mặt, chứa `Bhikkhu Anālayo` và `analayo`, không có dòng link, không có `null`/`undefined`

### AC-8: Tham số không truyền thì không gửi

- **Maps to:** FR-1, FR-2, FR-2a, FR-3, FR-17
- **When** chạy `npm test`
- **Then** các case FR-2 và FR-3 pass:
  - `{query:"mindfulness"}` cho query string chỉ có `query=mindfulness`
  - `{query:"  Vô Ngã "}` giữ nguyên khoảng trắng và chữ hoa trong URL
- **And** đọc code: zod schema của bảy tham số API không có `.default()`

### AC-9: Tham số không hợp lệ

- **Maps to:** FR-1
- **When** gọi `search_topic` với `query` `mindfulness` và lần lượt:
  - `{"offset":-5}`
  - `{"limit":1.5}`
  - `{"limit":"10"}`
  - `{"selectedLanguages":"[\"vi\"]"}`
  - `{"matchpartial":"true"}`
  - `{"format":"xml"}`
  - `{"topic":"x"}` không có `query`
- **Then** mỗi result có `isError: true` và text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`

### AC-10: Lỗi non-2xx

- **Maps to:** FR-13
- **When** đọc code đường `search_topic`
- **Then** `!res.ok` dẫn tới `throw new Error(\`SuttaCentral API error: ${res.status}\`)`, ở cả hai format
- **And** handler không có try/catch, retry hay fallback

### AC-11: `tools/list` và mô tả

- **Maps to:** FR-1, FR-14
- **When** chạy harness `tools/list`
- **Then** `inputSchema` của `search_topic`:
  - có đúng các property `query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`, `format`;
  - `required` là `["query"]`;
  - chỉ `format` có `default` (`"text"`);
  - `selectedLanguages` có `"type":"array"`;
  - `limit`/`offset` có `"type":"integer"` và `"minimum":0`.
- **And** text mô tả có `selectedLanguages`, `vi`, `["en","pli"]`, `suttaplex`, `hits`
- **And** text mô tả không có `không hiểu tiếng Việt` hay `Chủ đề tiếng Việt có sẵn`
- **And** text mô tả nói `suttaplex` theo `limit`/`offset` với truy vấn `title:` (đo: `title:mindfulness`/`en` cho 7 phần tử ở `offset` 0 và 9 phần tử khác ở `offset` 10). Text mô tả không có câu nào nói `suttaplex` không bao giờ phân trang.
- **And** text mô tả nói một trang có ít hơn `limit` hit chưa chắc là trang cuối (đo: `mindfulness`/`en` cho 8 hit ở `offset` 0, rồi 5 hit ở `offset` 10)
- **And** text mô tả nói `total` là số xấp xỉ, không phải tín hiệu còn trang sau, vì ba lý do sau:
  - phụ thuộc `limit` (đo: `mn10`/`en` cho `total` 10 với `limit` 10 và 5 với `limit` 50, cả hai lần 4 hit);
  - bị trừ các hit bị bỏ ở trang hiện tại (đo: `title:mindfulness`/`en` cho `total` 40 ở `offset` 30, nhưng `offset` 40 vẫn có 4 khớp tiêu đề);
  - khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề (đo: `vô ngã`/`language=vi` cho `total` 21 ở `offset` 0, 10 và 30)
- **And** text mô tả nói khớp tiêu đề lặp lại ở mọi `offset` trừ truy vấn `title:`, và cách biết còn kết quả là gọi lại với `offset` lớn hơn rồi xem có mục mới
- **And** text mô tả không có phép so nào giữa `offset`, `limit` và `total`, cũng không có luật dừng nào khác

### AC-12: Bốn tool khác không đổi

- **Maps to:** FR-16
- **When** chạy với bản build mới:
  - `get_sutta {"uid":"mn10"}`, `get_sutta {"uid":"mn9999"}`
  - `get_sutta_meta {"uid":"mn10"}`
  - `get_parallels {"uid":"mn10"}`
  - `list_divisions {}`
  - `tools/list` (chỉ phần tử của bốn tool này)
- **Then** mỗi output trùng từng byte với baseline `d972fa6`

### AC-13: Unit test, đột biến, fixture

- **Maps to:** FR-17, FR-18, NFR-1, NFR-4
- **When** chạy `npm test`, lần thứ hai với preload ngoài repo làm `globalThis.fetch` ném lỗi; áp từng đột biến (a)–(d) của FR-18 trên một bản sao ngoài repo; liệt kê `test/fixtures/`
- **Then** hai lần chạy đầu thoát mã 0, TAP có `# fail 0`
- **And** với mỗi dòng áp dụng của bảng FR-17, mỗi id FR của dòng đó, viết đúng và theo sau là dấu `:` (ví dụ `FR-2:`, nên `FR-2a:` không tính là `FR-2`), là tiền tố của ít nhất một case pass. Dòng FR-5 chỉ áp dụng khi design đặt việc dựng output `json` trong `src/search.ts`. Nếu không, phần FR-5 do AC-4 kiểm.
- **And** cả bốn đột biến làm `npm test` thoát khác 0
- **And** fixture: ≤ 10 file, `cat test/fixtures/* | wc -c` ≤ 65536, `grep -l -E '"(highlight|translations)"' test/fixtures/*` rỗng, mỗi file có URL và ngày ghi
- **And** bản sao ngoài repo bị xóa

### AC-14: Logic tự chế đã bỏ, phạm vi, bất biến

- **Maps to:** FR-2a, FR-4, FR-15, NFR-2, NFR-3, NFR-5
- **When** chạy:
  - `rm -rf dist && npm run build && find dist -type f | sort`
  - `git diff d972fa6 --stat`
  - `git diff d972fa6 -- package.json package-lock.json tsconfig.json`
  - các grep của FR-4 và NFR-5
  - `grep -c -E 'URLSearchParams|searchParams|new URL\(|SC_BASE\}/search' src/index.ts`
- **Then** tsc thoát mã 0 và `dist/` chỉ có `index.js` và `search.js`
- **And** mọi file thay đổi đều thuộc NFR-3; riêng `specs/INDEX.md` chỉ được khác ở dòng của spec này. Diff của `package.json`, `package-lock.json`, `tsconfig.json` rỗng.
- **And** grep FR-4 cho 0; NFR-5 cho 3 / 3 / 0 / 4 trên `src/index.ts`, và 0 trên `src/search.ts`
- **And** grep dựng URL ở trên cho 0 trên `src/index.ts`, tức việc dựng URL search chỉ nằm ở `src/search.ts`. Grep chỉ nhắm vào cấu trúc dựng URL, không nhắm vào đường dẫn endpoint, nên `describe()` vẫn được nhắc `/api/search/instant` nguyên văn. Việc nối chuỗi URL trần trong handler do phép kiểm đọc code FR-2a bên dưới bắt.
- **And** đọc code (FR-2a):
  - Handler `search_topic` gán kết quả của hàm dựng URL vào đúng một biến.
  - Đối số URL của lời gọi `fetch` search là chính biến đó, viết trần: không nối chuỗi, không template literal, không `new URL`.
  - Dòng nguồn được dựng từ cùng biến đó.
  - Phép kiểm này fail nếu handler thêm bất kỳ tham số nào, ví dụ `limit=10`, vào URL trước khi fetch.
- **And** đọc code: không biến cấp module hay file nào giữ response giữa các lời gọi

### AC-15: Tài liệu

- **Maps to:** FR-19, FR-20, FR-21
- **When** chạy:
  - `grep -n -E 'VI_TOPIC_TERMS|không hiểu tiếng Việt|does not handle Vietnamese' README.md AGENTS.md specs/sutta-mcp-requirements.md`
  - đọc Tool 1, luồng mẫu, roadmap mục 1, bảng issue
- **Then** README và AGENTS.md không có dòng nào khớp grep. Master spec chỉ có các dòng ở ngữ cảnh lịch sử, nói rõ là đã bị thay.
- **And** bảng Input của Tool 1 có tám tham số của FR-1
- **And** roadmap mục 1 trỏ `specs/search-api-passthrough/`
- **And** #18 ghi không còn áp dụng; #19/#20 ghi cần kiểm lại phần `search_topic`
- **And** task sửa `AGENTS.md` là task build cuối, và contract update cho `context:agents` được người dùng authorize. `shasum -a 256 AGENTS.md` bằng sha256 mới trong `workflow-contract.json`.

### AC-16: `fuzzy_dictionary` khác rỗng và rỗng

- **Maps to:** FR-10, FR-17
- **Given** unit test với body literal nhỏ tự viết, `fuzzy_dictionary` có hai phần tử: `[{"entry":"nibbāna"},{"entry":"nibbuta"}]`, còn các key khác rỗng hoặc 0
- **When** dựng output `text`
- **Then** phần `fuzzy_dictionary` có tiêu đề với số 2, rồi đúng hai dòng `{"entry":"nibbāna"}` và `{"entry":"nibbuta"}`, theo thứ tự đó
- **And** với `fuzzy_dictionary: []`, phần đó chỉ có tiêu đề với số 0, không có dòng phần tử

## Assumptions

- **VERIFIED (đọc/đo 2026-10-23):**
  - Mọi dòng của §Hiện trạng: đọc `src/index.ts`, `src/search.ts`, `test/search.test.ts`, `package.json`, README, AGENTS.md, master spec tại `d972fa6`; chạy `grep`/`wc`.
  - Mọi dòng của §Hình dạng API có nhãn "đo": đo bằng `curl` ngày 2026-10-23. Body chỉ được phân tích trong bộ nhớ hoặc file tạm `mktemp` đã xóa, không lưu. Hai lần chạy không hợp lệ (`nibbana`: body rỗng; `kamma`: HTTP 000) đã được chạy lại theo NFR-6.
  - Upstream `view.py`, `instant_search.py` (`instant_search_query()`, `process_search_results()`, `lookup_dictionary()`, `fuzzy_lookup_dictionary()`), `constant.py` tại `c755a43`: đọc qua `raw.githubusercontent.com`, file tạm đã xóa.
  - SDK 1.29.0 từ chối input sai schema bằng `MCP error -32602: Input validation error: …` mà không gọi handler (dynamic-search đã đọc `mcp.js`; review 1 đo lại với schema FR-1 và cả bảy input của AC-9). Key lạ đi kèm `query` thì bị bỏ im lặng (FR-1).
  - **C1–C11 đã chốt.** Người dùng trả lời ngày 2026-10-23: chọn đúng default cho C1, C2, C5; C3, C4, C6–C11 dùng default (`clarifications.md`). Đây là nền của FR-1, FR-2, FR-5, FR-7, FR-8, FR-12, FR-13.
  - Phân trang của `suttaplex` với `title:` và việc `hits` ngắn hơn `limit` mà vẫn còn trang sau (§Hình dạng API): review 1 đo, đo lại 2026-10-23 với `title:mindfulness` ở `offset` 0/10, cùng số liệu. Ba nhánh của `calculate_total()` (`instant_search.py:348-355`, `c755a43`) đọc lại ngày 2026-10-23. Các phản ví dụ về `total` (`title:mindfulness` ở `offset` 30/40, `mn10` với `limit` 10/50) đo lại cùng ngày và cho cùng số liệu với review 3.
- **UNVERIFIED (default stated):**
  - **Kích thước output.** `format=json` với `mindfulness`/`en` mặc định khoảng 140 KB, phần lớn là `translations` của `suttaplex`. `text` nhỏ hơn nhiều vì không in `translations` (C8). Default: chấp nhận, vì quyết định 2 yêu cầu `json` nguyên văn; caller có thể giảm `limit`, nhưng không giảm được `suttaplex`.
  - **Dạng phần tử `fuzzy_dictionary`** chưa quan sát được, nên FR-10 in JSON một dòng. Chưa có fixture cho trường hợp khác rỗng; FR-10 chỉ được test bằng input literal.
  - **`highlight` không có trong fixture** (NFR-4 của search-unit-tests). FR-8 phần `highlight` được test bằng input literal nhỏ, không phải văn bản SC.
  - **Lệnh lọc và toán tử của SC** (`by:`, `in:`, `title:`, `list authors`, `OR`) được truyền nguyên văn. Output `text` in được mọi dạng phần tử đã đo. Các dạng chưa đo đi theo luật chung của FR-8: field vắng thì bỏ.
  - **Link của hit dùng `url` của API** (đường dẫn có lang/translator), không dựng `suttacentral.net/{uid}`. Theo `reference_suttacentral-api` (2026-10-02, đọc client), route `/{uid}/{lang}/{translator}` là trang văn bản của website. Chưa mở trong trình duyệt.
  - **A/B byte-identical của AC-12** phụ thuộc upstream trả cùng response cho hai lần gọi. GET có cache server 600 s. Mismatch hợp lệ thì dừng theo NFR-6.

## Open Questions

Không còn câu hỏi mở.

- **Q1 (đã giải quyết 2026-10-23):** C1, C2, C5. Người dùng chọn default: `format` `text`/`json` mặc định `text`; `selectedLanguages` là mảng chuỗi, gửi bằng `JSON.stringify`; dòng nguồn kèm URL request trong `text` và làm item thứ hai trong `json`.
- **Q2 (đã giải quyết 2026-10-23):** C3, C4, C6, C7, C8, C10, C11 dùng default.
- **C9** chỉ là thông tin về hệ quả của quyết định 1, không phải câu hỏi mở.

## Out of Scope

- Bốn tool `get_sutta`, `get_sutta_meta`, `get_parallels`, `list_divisions`: hành vi, output, schema. Thân `formatCitation()`.
- POST `/api/search/instant` và các endpoint search khác (`immediate_search`).
- Cache response (roadmap mục 6), kể cả dù API có `ETag`.
- Bảng ánh xạ, alias hay gợi ý thuật ngữ tiếng Việt dưới bất kỳ dạng nào. Xếp hạng lại, gộp theo `uid`, suy luận trang sau.
- Bỏ thẻ HTML hay cắt `highlight`. In `translations` của `suttaplex`.
- Retry, timeout phía client, đổi chữ lỗi HTTP của các helper fetch.
- Sửa các dòng `specs/INDEX.md` của spec khác, và artifact của `dynamic-search`/`search-unit-tests`: lịch sử giữ nguyên, việc thay thế được ghi ở master spec (FR-20). Dòng INDEX của spec này do orchestrator viết khi hoàn tất (NFR-3).
- Linter, CI, test end-to-end, mock `fetch` toàn cục.
