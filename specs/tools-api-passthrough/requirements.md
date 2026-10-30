# Requirements: Năm tool là wrapper mỏng của SuttaCentral API, đặt tên theo endpoint

**Status:** Reviewed
**Created:** 2026-10-24
**Spec slug:** tools-api-passthrough
**Nguồn:**
- Quyết định của người dùng ngày 2026-10-24.
- Tiền lệ đã merge (PR #25): `specs/search-api-passthrough/` (requirements, clarifications), `src/search.ts`, `test/search.test.ts`, `test/fixtures/`.
- Master spec `specs/sutta-mcp-requirements.md`, đọc ở `7dc2299`:
  - Bảng endpoint `:116-122`
  - Tool 1–5 `:143-254`
  - Luồng mẫu `:258-274`
  - Constraints `:278-290`
  - Roadmap mục 1–3, 5, 6, 7 `:296-351`
  - Bảng issue và thứ tự ưu tiên `:353-369`
- Upstream `suttacentral/suttacentral`, nhánh `main` tại `a9aeaa8` (đọc 2026-10-24).

**Quyết định stakeholder đã chốt (2026-10-24, không mở lại):**
1. Một spec cho cả bốn tool `get_sutta`, `get_sutta_meta`, `get_parallels`, `list_divisions`.
2. Đặt tên tool theo endpoint:
   - `get_bilarasuttas`: `GET /api/bilarasuttas/{uid}/{author_uid}?lang`. Upstream không bắt buộc segment `author_uid`.
   - `get_suttaplex`: `GET /api/suttaplex/{uid}?language`.
   - `get_parallels`: `GET /api/parallels/{uid}?language`.
   - `get_menu`: `GET /api/menu` và `GET /api/menu/{submenu_id}`, cả hai nhận `?language`.
   - `search_topic` đổi tên thành `search_instant`. Chỉ đổi tên và mô tả; logic giữ nguyên.
3. Tham số của tool là tham số của API, cùng tên và cùng nghĩa. Tham số caller không truyền thì không gửi, để API dùng mặc định của chính nó.
4. Mọi tool có `format` `text`/`json`, mặc định `text`, giống `search_topic`:
   - `json` là body response nguyên văn, kèm một dòng nguồn riêng.
   - `text` in mọi field theo thứ tự API. Không lọc, không gộp, không sắp lại.
5. Bỏ logic tự chế:
   - `get_bilarasuttas` bỏ toàn bộ: lời gọi suttaplex song song, retry `?lang`, guard bản dịch non-segmented, gợi ý dịch giả, `max_segments`, dòng `Deep link`. Tool không cắt văn bản dài.
   - `get_menu` thay `DIVISIONS` hardcode. Cột `tradition` bỏ, vì API không có.

Các chi tiết năm quyết định chưa nói được hỏi trong `clarifications.md` (C1–C12). Người dùng trả lời ngày 2026-10-24:
- **C1:** chọn default (A), một bộ hiển thị chung, đệ quy, cho cả bốn tool.
- **C3:** chấp nhận output lớn. `describe()` của **cả năm** tool cảnh báo điều này và nói cách thu hẹp: bốn tool mới theo FR-14, `search_instant` bằng đúng một câu thêm vào cuối mô tả tool (FR-6). Câu này là hệ quả của C3, không phải một phần của quyết định 2.
- **C4:** chọn default: bốn tool mới chỉ có dòng nguồn kèm URL request, không link website. Dòng Constraints của master spec được viết lại. `search_instant` giữ link như cũ (FR-6).
- **C2, C5–C12:** không trả lời, dùng default.

FR dưới đây ghi rõ câu tương ứng.

## Context & Goal

### Vấn đề

`search_topic` đã thành wrapper mỏng (spec `search-api-passthrough`). Bốn tool còn lại vẫn chứa logic tự chế, che mất những gì SuttaCentral thật sự trả về.

**`get_sutta`:**
- Gọi thêm `/api/suttaplex/` song song.
- Mặc định dịch giả `sujato`.
- Tự gọi lại kèm `?lang=` lấy từ `translations[]`.
- Thay văn bản bằng thông báo "không lấy được" kèm gợi ý dịch giả.
- Cắt ở 50 đoạn.
- Bỏ các segment rỗng.
- Không in `comment_text`, `variant_text`, `reference_text`, `html_text`.

**`get_sutta_meta`:** chỉ in vài field. Nó bỏ bản dịch gốc và chỉ lấy phần tử đầu của mảng suttaplex.

**`get_parallels`:**
- Trộn mọi anchor nguồn thành một danh sách (issue #16).
- Tự gán ký hiệu (`≡ ≈ → ↺`).
- Không bao giờ gửi `language`, dù API có đọc tham số này.

**`list_divisions`:** dữ liệu hardcode, đã từng lệch với SC (master spec `:333-351`). Cột `tradition` là dữ liệu tự thêm, không có trong API.

### Mục tiêu

Năm tool phản chiếu đúng năm endpoint của SuttaCentral:
- Tên tool theo endpoint.
- Tham số trùng tên với tham số của API.
- Một request GET mỗi lời gọi.
- `json` là body nguyên văn.
- `text` in mọi field theo thứ tự API, kèm dòng nguồn trỏ về SC.

Caller (Claude) tự chọn `author_uid`, `lang`, `language`, `submenu_id`. Caller tự ghép các tool với nhau, ví dụ đọc `translations[].lang` từ `get_suttaplex` rồi truyền vào `get_bilarasuttas`.

### Hiện trạng (đọc code tại `7dc2299`, 2026-10-24)

**`src/index.ts` (446 dòng):**
- **Helper fetch:**
  - `fetchSuttaplex()` luôn gửi `?language=` (mặc định `en`) và chỉ trả phần tử `[0]`.
  - `fetchBilaraText()` gửi `?lang=` khi có.
  - `fetchParallels()` không gửi query.
  - Cả ba ném `SuttaCentral API error: {status}` khi `!res.ok`.
- **Logic render và dữ liệu:** `extractText()`, `formatUnavailable()`, `DIVISIONS` (30 mục, có `tradition`), `PITAKA_LABELS`, `formatDivisions()`.
- **Năm `server.tool(`** tại `:100`, `:160`, `:248`, `:288`, `:415`, đăng ký lần lượt `search_topic`, `get_sutta`, `get_sutta_meta`, `get_parallels`, `list_divisions`.
- `get_sutta` và `get_sutta_meta` in "Không tìm thấy sutta với UID" khi `!suttaplex?.uid` (spec `get-sutta-unknown-uid`).

**Bất biến đếm:**

| Lệnh | `src/index.ts` | `src/search.ts` |
|---|---|---|
| `grep -c -F 'segmented'` | 3 | 0 |
| `grep -c -F 'sujato'` | 3 | 0 |
| `grep -c -F 'fetch('` | 4 | 0 |
| `grep -c -F 'server.tool('` | 5 | 0 |
| `grep -c -F 'formatCitation'` | 3 | 1 |
| `grep -c -F 'DIVISIONS'` | 2 | 0 |

**`src/search.ts` (167 dòng):**
- `buildSearchUrl()`, `renderSearch()`, `sourceLine()`, và các hàm render search.
- `formatCitation()`: chỉ `get_sutta` và `get_sutta_meta` dùng.

**Test:**
- `test/search.test.ts` có 11 case.
- `test/fixtures/` có 3 file, tổng 15,223 B.
- `package.json` `scripts.test` = `tsx --test test/search.test.ts`.

**Tài liệu mô tả hành vi cũ:**
- **README:** bảng Tools `:13-17`, mục "Tìm bằng tiếng Việt" `:70`.
- **AGENTS.md:** `:17`, `:24`, `:28-34`, `:37-40`, `:46`.
- **Master spec:** các dòng đã liệt kê ở **Nguồn**.

**Issue mở:** #16 (`get_parallels` trộn anchor), #19 (blurb tiếng Anh dưới `language=vi`), #20 (bản dịch legacy trông như trùng, `Difficulty: unknown`). Kiểm bằng `gh issue list` ngày 2026-10-24.

**Phiên bản:** SDK `@modelcontextprotocol/sdk` 1.29.0, zod 3.25.76.

### Hình dạng API (đọc upstream `a9aeaa8`; đo live 2026-10-24)

| Quan sát | Bằng chứng |
|---|---|
| **Route.** `Menu` nhận `'/menu'` và `'/menu/<path:submenu_id>'`. `SuttaplexList` nhận `'/suttaplex/<path:uid>'`. `Parallels` nhận `'/parallels/<path:uid>'`. `SegmentedSutta` nhận `'/bilarasuttas/<string:uid>/<string:author_uid>'` và `'/bilarasuttas/<string:uid>'`. | `server/src/sc_flask/app.py:91,93,96,116-117` |
| **Tham số query.** `Menu.get` (`:271`), `SuttaplexList.get` (`:362`) và `Parallels.get` (`:754`) chỉ đọc `request.args` `language`, mặc định `DEFAULT_LANGUAGE`. `SegmentedSutta.get` (`:1061`) chỉ đọc `lang`, mặc định `'en'`. Bốn handler không đọc tham số query nào khác. | `server/src/api/views/views.py` (đã grep `request.args` trong cả bốn handler) |
| **Giá trị mặc định.** `DEFAULT_LANGUAGE = 'en'`. Đo: không gửi `language` cho body trùng từng byte với `language=en`, ở `/suttaplex/mn10`, `/parallels/mn10` và `/menu/sutta`. Không gửi `lang` cho body trùng với `lang=en`, ở `/bilarasuttas/mn10/sujato` và `/bilarasuttas/mn10`. | `server/src/sc_flask/config.py:34`; đo |
| **Swagger thiếu.** `/api/spec` có 18 path. Không có `bilarasuttas`. `parallels/{uid}` chỉ khai tham số `uid`. | đo |
| **`suttaplex` luôn là mảng phẳng.** `mn10` → 1 phần tử, 19 key theo thứ tự: `acronym`, `alt_acronym`, `volpages`, `alt_volpages`, `uid`, `blurb`, `difficulty` (`{name, level}`), `original_title`, `root_lang`, `root_lang_name`, `type`, `translated_title`, `translations` (43 mục), `parallel_count`, `biblio`, `priority_author_uid`, `verseNo`, `previous`, `next`. `mn` → 171 phần tử, là cây được duỗi theo thứ tự trước: mỗi `branch` đứng ngay trước các phần tử con của nó, nên `branch` và `leaf` xen kẽ (`branch`×3 `mn`, `mn-mulapannasa`, `mn-mulapariyayavagga`, rồi `leaf`×10, `branch`×1, `leaf`×10, …). Không có key `children`, 1,343,704 B. `dn` → 38 phần tử, 260,840 B. | đo; `views.py:405` (`flat_tree`) |
| **`language` ở `suttaplex`.** `language=vi` đổi `translated_title` (`mn10`: `Kinh Niệm xứ`), nhưng `blurb` vẫn là tiếng Anh, trùng với `en`. | đo |
| **`parallels` là object, key là anchor nguồn, theo thứ tự upstream sắp (`SortedDict(sort_parallels_key)`).** `mn10` → key `mn10` (8), `mn10#44.1` (2), `mn10#47.1` (3), `mn10#10.1` (3), tổng 16 entry. `dn22` → 7 key, 27 entry, 77,799 B. Entry có dạng `{enumber, to: {to, volpages, alt_volpages, acronym, alt_acronym, uid, root_lang, original_title, translated_title, type, from, biblio, translations}, type, remark, resembling}`. `language=vi` đổi `to.translated_title`, ví dụ `parallels/mn10`, entry đầu (`to.uid` `dn22`, `type` `full`, `resembling` `false`): `Kinh Ðại Niệm xứ`. | `views.py:701-791`; đo |
| **`bilarasuttas`.** `mn10/sujato` có key theo thứ tự `comment_text`, `html_text`, `root_text`, `translation_text`, `variant_text`, `reference_text`, `keys_order`. Mỗi map có 235 key segment, cùng thứ tự với `keys_order`. Số giá trị khác rỗng: `comment_text` 48, `translation_text` 194, `variant_text` 9, `reference_text` 75. `dn22/sujato`: 454 segment, 158,090 B, key cuối `dn22:22.28` có `translation_text` là `""`. Không có `author_uid` (`/bilarasuttas/mn10`): chỉ còn `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order`. `dhp1-20/phantuananh?lang=vi`: 108 segment, `translation_text` mở đầu `Tiểu Bộ Kinh `. Key `illustrations` là tùy chọn và chưa gặp. | `views.py:1057-1080`; đo |
| **`menu`.** `/menu` → mảng 464 node, cả 464 có `node_type: "root"`. Cả 464 node có key `children`. Chỉ `abhidhamma`, `sutta`, `vinaya` có `children` khác rỗng (một cấp). 461 node còn lại có `children: []`, là node rời, ví dụ `g2dhp1`, `lzh-mi-bu-pm-2-as1`. Fixture `get_menu` phải giữ các `children: []` này (NFR-4). Body 168,235 B. `/menu/sutta` → mảng 1 node, `children`: `long`, `middle`, `linked`, `numbered`, `minor`, `other-group`. `/menu/long` → `dn`, `da`, `da-ot`. `/menu/dn` → `dn-silakkhandhavagga`, `dn-mahavagga`, `dn-pathikavagga`. Node con có `has_children`, không có `children`. `language=vi` đổi `translated_name`, ví dụ `sutta`: `Kinh tạng`. | `views.py:224-284`; đo |
| **Kích thước theo sutta, uid của division không làm output lớn ở parallels/bilarasuttas.** `parallels/mn`, `parallels/dn` → `{}` (2 B). `bilarasuttas/dn/sujato` → `{"msg": "Not Found"}`. Kích thước phụ thuộc chính sutta: `parallels/dn16` → 43 anchor, 162 entry, 321,012 B; `parallels/dn22` 77,799 B; `parallels/sn56.11` 26,145 B; `parallels/mn1` 3,949 B. `bilarasuttas/dn16/sujato` → 633,489 B; `bilarasuttas/dn16` (không `author_uid`) → 344,559 B; `mn10`: 97,200 B có `author_uid`, 53,498 B không có. Hai endpoint này không có tham số nào thu nhỏ body (`language`/`lang` chỉ đổi ngôn ngữ). | đo 2026-10-24 (review 2 phát hiện; spec đo lại) |
| **Body "không tìm thấy" có HTTP 200.** `bilarasuttas/mn9999/sujato` và `MN10/sujato` → `{"msg": "Not Found"}`. `suttaplex/mn9999` → mảng 1 phần tử, mọi field `null`. `parallels/mn9999` → `{}`. `menu/xyzzy` → mảng 1 node, mọi field `null`. | `views.py:1068`; đo |
| **Lỗi 404.** `/menu/` (segment rỗng) và `/bilarasuttas/mn10/sujato/extra` → HTTP 404, body HTML. Server giải mã `%2F`: `/bilarasuttas/mn10%2Fsujato` cho đúng body của `/mn10/sujato`. | đo |
| **Header cache.** GET trả `ETag` (weak) và `Cache-Control: max-age=172800, must-revalidate, proxy-revalidate`. | đo `/menu/sutta` |
| **Không có key dạng chỉ số mảng, không có chuỗi chứa xuống dòng** trong 22 body đã đo (C12). | đo |
| **Độ trễ.** 0.26–4.09 s mỗi GET tới bốn endpoint mới, quan sát đến nay; `search/instant` chậm hơn, tới 7.60 s (`mindfulness`/`en`). | đo 22 request của spec (tối đa 2.6 s), 30 request của review 1 (tối đa 4.09 s, `suttaplex/mn10`), review 2 (`search/instant` 7.60 s) |

## Stakeholders

- **Primary users:** Claude, caller của MCP.
  - Cần đủ tham số của API, đặc biệt `lang`/`language` cho tiếng Việt.
  - Cần thấy mọi field SC trả về: comment, variant, reference, parallels theo anchor, toàn bộ cây menu.
  - Cần tên tool chỉ thẳng tới endpoint.
- **Secondary users:** người dùng cuối hỏi Dhamma bằng tiếng Việt hoặc tiếng Anh. Trích dẫn có nguồn SC, đủ văn bản, không bị cắt.
- **Operators / maintainers:**
  - Ít logic tự chế hơn.
  - Không còn bảng `DIVISIONS` phải đồng bộ tay.
  - Bốn spec cũ không còn là hành vi hiện hành.
- **SuttaCentral:** mỗi lời gọi đúng một GET, không tích lũy dữ liệu, mọi output trỏ về SC.

## Functional Requirements

### Bộ tool và tham số

- **FR-1: Đúng năm tool.** `tools/list` trả đúng năm tên `search_instant`, `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu`. Không còn tên `search_topic`, `get_sutta`, `get_sutta_meta`, `list_divisions`.

- **FR-2: Schema của bốn tool mới.** Mỗi tool khai báo đúng các tham số dưới đây, không tham số nào khác. Chỉ `format` có `.default()`.

  | Tool | Tham số | Kiểu | Bắt buộc | Vị trí trong request | Theo |
  |---|---|---|---|---|---|
  | `get_bilarasuttas` | `uid` | `z.string().min(1)` | có | path segment 1 | C5 |
  | | `author_uid` | `z.string().min(1)` | không | path segment 2, chỉ khi được truyền | C5, C9 |
  | | `lang` | `z.string()` | không | query `lang` | C9 |
  | `get_suttaplex` | `uid` | `z.string().min(1)` | có | path | C5 |
  | | `language` | `z.string()` | không | query `language` | — |
  | `get_parallels` | `uid` | `z.string().min(1)` | có | path | C5 |
  | | `language` | `z.string()` | không | query `language` | — |
  | `get_menu` | `submenu_id` | `z.string().min(1)` | không | path, chỉ khi được truyền | C5, C8 |
  | | `language` | `z.string()` | không | query `language` | — |
  | cả bốn | `format` | `z.enum(["text","json"])` | không, mặc định `"text"` | không gửi | quyết định 4 |

  Không có `translator`, `max_segments`, `pitaka`. Input sai schema thì SDK trả `isError: true`, với text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool {tên}:`. Khi đó handler không chạy và không có request. Key lạ không bị từ chối; SDK 1.29.0 bỏ nó im lặng (theo FR-1 của tiền lệ).

- **FR-3: Đúng một GET, chỉ gửi tham số được truyền.** Mỗi lời gọi hợp lệ phát **đúng một** request GET:

  | Tool | URL |
  |---|---|
  | `get_bilarasuttas` | `https://suttacentral.net/api/bilarasuttas/{uid}` nếu không có `author_uid`; `…/bilarasuttas/{uid}/{author_uid}` nếu có |
  | `get_suttaplex` | `https://suttacentral.net/api/suttaplex/{uid}` |
  | `get_parallels` | `https://suttacentral.net/api/parallels/{uid}` |
  | `get_menu` | `https://suttacentral.net/api/menu` nếu không có `submenu_id`; `…/menu/{submenu_id}` nếu có |

  - Query string có `lang` hoặc `language` **khi và chỉ khi** caller truyền nó. Không có tham số nào thì URL không có `?`.
  - Giá trị query gửi nguyên văn, chỉ URL-encode.
  - `format` không bao giờ được gửi.
  - Không gửi giá trị mặc định nào, kể cả `language=en`, `lang=en` hay `author_uid=sujato`.
  - Không request endpoint nào khác. Riêng `get_bilarasuttas` không gọi `/api/suttaplex/`.

- **FR-4: Tham số path nguyên văn (C5).** Mỗi tham số path được mã hóa như một path segment, tương đương `encodeURIComponent`. Ngoài mã hóa đó, tool không trim, không đổi hoa/thường, không chuẩn hóa. Việc server giải mã `%2F` thành `/` là hành vi của SC; tool không chặn, không bù.

- **FR-5: Một hàm dựng URL cho mỗi tool, dùng chung cho fetch và dòng nguồn.** Mở rộng FR-2a của tiền lệ cho bốn tool mới:
  - URL request được dựng bởi hàm thuần. Hàm được export từ một module không I/O, không import gì, để test import được mà không cần mạng và không cần `src/index.ts`. Mọi hành vi của FR-3 và FR-4 nằm trong các hàm này.
  - Mỗi lời gọi, handler gọi hàm dựng URL đúng một lần và lưu kết quả vào một biến.
  - Handler truyền **chính biến đó, không sửa**, cho `fetch` và cho phần dựng dòng nguồn.
  - Handler không nối, sửa hay thêm gì vào URL.

- **FR-6: `search_instant` là `search_topic` đổi tên (C11).**
  - Với cùng input và cùng response upstream, content của `search_instant` trùng từng byte với content của `search_topic` ở bản build `7dc2299`.
  - `inputSchema` trùng từng byte.
  - `describe()` của các tham số trùng từng byte với baseline.
  - Mô tả cấp tool (`description`) của `search_instant` bằng mô tả của `search_topic` ở `7dc2299`, cộng **đúng một câu** cảnh báo output lớn (C3), nối vào cuối sau đúng **một dấu cách** (`desc_new === desc_base + " " + S`). Mô tả baseline không nhắc tên tool, nên ngoài câu đó không có chỗ nào khác được đổi. Câu cảnh báo `S` nêu:
    - output có thể rất lớn, vì tool không lọc và `json` trả nguyên body; ví dụ `mindfulness`/`en` là `140,685` B (literal này phải có trong `S`), phần lớn là `translations` của `suttaplex`;
    - `limit`/`offset` chỉ phân trang `hits`, còn `suttaplex` (khớp tiêu đề) trả nguyên mảng;
    - cách thu hẹp: dùng truy vấn bắt đầu bằng `title:` (khi đó `suttaplex` theo `limit`/`offset`), hoặc truy vấn cụ thể hơn.
  - `buildSearchUrl()`, `renderSearch()` và các hàm render search không đổi thân hàm.

### Output

- **FR-7: `format=json`.**
  - Item thứ nhất có `type: "text"`. Text của nó trùng từng byte với body đọc bằng `res.text()`.
  - Item thứ hai là dòng nguồn (FR-9).

  Body `{"msg": "Not Found"}`, `{}` hay mảng toàn `null` cũng trả nguyên văn như vậy.

- **FR-8: `format=text`, bố cục chung.** Output là **một** content item text: dòng nguồn (FR-9), rồi body hiển thị theo FR-10.

- **FR-9: Dòng nguồn (C4).** Có cùng dạng với `search_instant`: `Nguồn: SuttaCentral — {URL request đầy đủ}`, dùng đúng biến URL của FR-5. Bốn tool mới không dựng thêm link website nào: không có `Deep link`, không có `https://suttacentral.net/{uid}`. `search_instant` giữ các dòng link của nó (`src/search.ts:98`, `:108`) theo FR-6.

- **FR-10: Hiển thị body (C1 (A), C2).** Cả bốn tool dùng chung một bộ hiển thị. Bộ hiển thị in **mọi** key của mọi object và **mọi** phần tử của mọi mảng, ở mọi độ sâu:
  1. **Thứ tự.** Key in theo thứ tự trong body. Phần tử mảng in theo thứ tự trong body. Không key hay phần tử nào bị bỏ, gộp, in hai lần, hay đổi chỗ (xem C12 về key dạng chỉ số mảng).
  2. **Mảng.** In số phần tử (`length`, kể cả 0), và mỗi phần tử kèm chỉ số của nó.
  3. **Cấu trúc.** Từ output đọc được key hay phần tử nào nằm trong object hay mảng nào, tức độ lồng nhìn thấy được.
  4. **Chuỗi.** In nguyên văn: không trim, không bỏ thẻ HTML, không cắt.
  5. **Số, boolean, `null`.** In dạng literal JSON. Chuỗi rỗng, `null`, object rỗng `{}` và mảng rỗng `[]` đều phân biệt được với nhau, và với key vắng (C2).
  6. **Không thêm gì.** Ngoài dòng nguồn và nhãn cấu trúc (tên key, chỉ số, số phần tử), output không có nội dung nào không có trong body: không citation, không ký hiệu parallels, không nhãn tiếng Việt tự đặt cho field, không thông báo "không tìm thấy".

  Body top-level là `{}` hoặc `[]` thì output nói rõ là object rỗng hoặc mảng rỗng, không chỉ còn dòng nguồn. Chữ cụ thể của nhãn do design chốt.

- **FR-11: Không cắt văn bản (quyết định 5).** Tool không có tham số hay hằng số nào giới hạn số segment, số phần tử hay số byte. Với `get_bilarasuttas dn22/sujato`, output `text` chứa mọi key trong `keys_order` của body, ở mọi map có trong body (C3).

- **FR-12: Body 2xx bất thường (C7).**
  - Body "không tìm thấy" của FR-7 được hiển thị như mọi body khác, không có `isError`.
  - Body JSON `null` hoặc là scalar thì in literal của nó sau dòng nguồn, không có `isError`.
  - Body 2xx không parse được JSON thì ném lỗi, và SDK dựng `isError: true`. Điều này chỉ áp dụng cho `format=text`; `json` trả nguyên văn.

- **FR-13: Non-2xx và lỗi mạng (C6).** Ở cả hai format, status không 2xx dẫn tới ném `SuttaCentral API error: {status}`. Lỗi mạng giữ nguyên lỗi gốc. Handler không bắt lỗi, SDK dựng `isError: true`. Không retry, không trả kết quả một phần.

- **FR-14: Mô tả tool và tham số.** `describe()` của mỗi tool mới nêu những điều sau. Cảnh báo output lớn của `search_instant` theo FR-6, không theo FR này:
  - **Chung cho cả bốn tool:**
    - endpoint chính xác;
    - tool trả nguyên body, theo thứ tự SC, không lọc, không cắt;
    - ý nghĩa của `text` và `json`;
    - mỗi tham số query: bỏ trống thì không gửi, và API dùng mặc định `en`;
    - dạng body "không tìm thấy" của endpoint (C7);
    - cảnh báo output có thể rất lớn vì tool không lọc, không cắt, theo dòng "Kích thước" của từng tool dưới đây (C3). Dòng đó nêu cách thu hẹp khi API có cách; khi không có, nó nói rõ là không có tham số nào thu nhỏ output. Mọi con số trong dòng đó phải là số đã đo.
  - **`get_bilarasuttas` (C9):**
    - bỏ `author_uid` thì body chỉ có văn bản gốc, không có `translation_text`;
    - bản dịch không phải tiếng Anh cần `lang` của bản dịch, lấy từ `translations[].lang` của `get_suttaplex`;
    - segment ID là key của các map, và `keys_order` là thứ tự đọc;
    - **Kích thước:** kích thước theo chính sutta, và không có tham số nào thu nhỏ: `dn22/sujato` khoảng 158 KB, `dn16/sujato` khoảng 633 KB. Bỏ `author_uid` thì body không có `translation_text` và `comment_text` (`dn16`: khoảng 345 KB), nhưng đó là đổi nội dung, không phải thu hẹp. uid của bộ (ví dụ `dn`) trả `{"msg": "Not Found"}`, không trả văn bản.
  - **`get_suttaplex`:**
    - body là mảng;
    - uid của division hay vagga trả mọi sutta bên dưới (ví dụ `mn`: 171 phần tử), nên output rất lớn;
    - `language` dịch tiêu đề nhưng `blurb` có thể vẫn là tiếng Anh;
    - **Kích thước / thu hẹp:** truyền uid của một sutta (ví dụ `mn10`, khoảng 13 KB) thay vì uid của division (`mn`: 171 phần tử, khoảng 1.3 MB).
  - **`get_parallels`:**
    - key là anchor của sutta nguồn, có thể kèm `#segment`;
    - target nằm trong `to`;
    - `language` dịch `to.translated_title`;
    - **Kích thước:** kích thước theo chính sutta, và không có tham số nào thu nhỏ: `dn16` có 43 anchor, 162 entry, khoảng 321 KB; `dn22` khoảng 78 KB. uid của division (ví dụ `mn`) trả `{}`.
  - **`get_menu` (C8):**
    - không có `submenu_id` thì trả mọi node gốc, gồm ba tạng và nhiều node rời;
    - muốn duyệt theo tạng thì truyền `sutta`, `vinaya` hoặc `abhidhamma`, rồi gọi tiếp với uid con;
    - mỗi lần gọi trả một cấp con;
    - **Kích thước / thu hẹp:** truyền `submenu_id` thay vì gọi không tham số (`/api/menu`: 464 node, khoảng 168 KB; `/api/menu/sutta` khoảng 3 KB).

  Không mô tả nào còn nhắc `max_segments`, `Deep link`, gợi ý dịch giả, mặc định `sujato` hay dữ liệu hardcode.

### Logic tự chế bị bỏ

- **FR-15: Bỏ logic tự chế và mã không còn dùng.**
  - `cat src/*.ts | grep -c -E 'extractText|formatUnavailable|formatCitation|formatDivisions|DIVISIONS|PITAKA_LABELS|max_segments|Deep link|retryLang|servedLang|Không tìm thấy sutta|tradition'` = 0.
  - `fetchSuttaplex`, `fetchBilaraText`, `fetchParallels` không còn, hoặc nếu design giữ helper thì mỗi helper chỉ fetch đúng URL của FR-5.
  - Không còn ký hiệu `≡`, `≈`, `↺`, `→` trong `src/`.
  - `grep -c -F 'segmented' src/*.ts` = 0 ở mỗi file.

- **FR-16: Không trạng thái.** Không cache. Không biến cấp module hay file nào giữ response hoặc tham số giữa các lời gọi. Output chỉ phụ thuộc input và một response.

### Test

- **FR-17: Unit test offline (C10).**
  - Chạy bằng `npm test`, runner `node:test` qua `tsx`.
  - Không mạng, không gán hay stub `globalThis.fetch`, không import `src/index.ts`.
  - Tên mỗi case mới bắt đầu bằng tiền tố `tools-api-passthrough FR-{n}:`, ví dụ `tools-api-passthrough FR-3:`. Tiền tố này phân biệt case mới với case search, vì hai spec cùng đánh số FR từ FR-1.
  - Các case search hiện có vẫn pass, và giữ tiền tố FR của spec `search-api-passthrough`.

  Mỗi dòng dưới đây có ít nhất một case với expected value là literal:

  | FR | Nội dung tối thiểu |
  |---|---|
  | FR-3, FR-5 | Với mỗi tool: không truyền tham số tùy chọn nào thì URL không có `?`. `get_bilarasuttas {uid:"mn10"}` → `…/bilarasuttas/mn10`. `{uid:"mn10",author_uid:"sujato",lang:"vi"}` → `…/bilarasuttas/mn10/sujato?lang=vi`. `get_menu {}` → `…/api/menu`. `get_menu {submenu_id:"long",language:"vi"}` → `…/api/menu/long?language=vi`. `format` không vào URL. |
  | FR-4 | Một `uid` có ký tự cần mã hóa (khoảng trắng, `?`, `#`) được mã hóa thành một path segment. `uid` có chữ hoa giữ nguyên. |
  | FR-7 | Chỉ khi design đặt việc dựng output `json` trong module thuần: item thứ nhất trùng chuỗi body đưa vào; item thứ hai là dòng nguồn. |
  | FR-9 | Dòng đầu của `text` là `Nguồn: SuttaCentral — {url}`, với `url` của fixture. |
  | FR-10 | Fixture của từng tool: mọi key, ở mọi độ sâu của body, xuất hiện trong output theo đúng thứ tự body. Input literal có chuỗi rỗng, `null`, `{}`, `[]`, mảng lồng, và `translations` hai phần tử, cho các dòng phân biệt được và đúng thứ tự. Một input literal có object hoặc mảng hơn 50 phần tử, ví dụ map 60 segment, in đủ mọi phần tử; đây là input bắt đột biến FR-18 (d). |
  | FR-11 | Fixture bilara: mọi key của `keys_order` có trong output, kể cả key cuối có giá trị `""`. |
  | FR-12 | Body `{"msg":"Not Found"}`, `{}`, `[]` và `null` cho output không rỗng, và không ném lỗi. |

- **FR-18: Test có giá trị phân biệt.** `npm test` thoát khác 0 với từng đột biến sau, áp riêng lẻ trên bản sao module thuần:
  - (a) bỏ các giá trị chuỗi rỗng khỏi `text`;
  - (b) gửi một tham số caller không truyền, ví dụ `lang=en` hoặc `language=en`;
  - (c) sắp xếp key theo bảng chữ cái trước khi hiển thị;
  - (d) chỉ hiển thị 50 phần tử đầu của mỗi object hoặc mảng;
  - (e) bỏ key `translations` khỏi `text`;
  - (f) luôn thêm segment `author_uid` (ví dụ mặc định `sujato`) khi caller không truyền.

### Tài liệu và quy trình

- **FR-19: README.**
  - Bảng Tools liệt kê đúng năm tool của FR-1. Mỗi dòng nêu endpoint, tham số API và `format`.
  - Mục "Tìm bằng tiếng Việt" đổi `search_topic` thành `search_instant`, và thêm một câu: lấy bản dịch tiếng Việt thì dùng `get_bilarasuttas` với `author_uid` và `lang=vi`.
  - `grep -c -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions' README.md` = 0.

- **FR-20: Master spec.** Trong `specs/sutta-mcp-requirements.md`:
  - **Bảng endpoint (`:116-122`):** liệt kê đủ năm endpoint của FR-3, kèm tham số query thật (`language` cho suttaplex, parallels và menu; `lang` cho bilarasuttas). Mặc định `en` có dẫn chứng `config.py:34` và `views.py:1061`.
  - **Tool 1–5:** viết lại theo FR-1, FR-2 và FR-6–FR-14. Tool 5 là `get_menu`, không còn bảng `tradition` hay ví dụ output hardcode.
  - **Luồng mẫu (`:258-274`):** dùng tên mới và tham số mới. Kết quả nêu trong luồng phải đo live được.
  - **Constraints (`:282-290`):**
    - Dòng "Mọi response đều kèm link `suttacentral.net/{uid}`" sửa theo C4: mọi response kèm URL request SuttaCentral. Bốn tool mới không dựng link website. `search_instant` còn in link `https://suttacentral.net/…` cho từng mục. Câu mới phải đúng cho cả năm tool.
    - Dòng "Attribution" (`:290`, "ghi rõ nguồn …, dịch giả, và UID") sửa cho đúng với output thật: nguồn luôn có (dòng nguồn); dịch giả và UID chỉ có khi body của SC có (ví dụ `get_menu`, hay `get_bilarasuttas` không có `author_uid`, không có dịch giả).
    - Dòng segment ID / `Deep link` sửa cho hợp: `get_bilarasuttas` trả segment ID là key, không còn dòng `Deep link`.
  - **Roadmap:**
    - Mục 1 (`:296`): đổi `search_topic` thành `search_instant`, hoặc ghi chú đổi tên, theo spec `tools-api-passthrough`. Giữ dòng dõi `dynamic-search` → `search-api-passthrough`.
    - Mục 3 (`:300`): mọi chỗ nhắc `search_topic` đổi theo tên mới. Có hai chỗ: "trái chủ trương `search_topic` khớp đúng API" và "Claude đã ghép được `search_topic` với `get_parallels`".
    - Mục 2 và mục 5: ghi rằng cơ chế của spec `non-segmented-translation-guard`, `bilara-lang-param`, `segment-id-in-get-sutta` đã bị spec `tools-api-passthrough` thay thế.
    - Mục 6: sửa dòng "Divisions list" của bảng cache.
    - Mục 7: ghi rằng đã thực hiện bằng `get_menu`, cột `tradition` bỏ.
  - **Bảng issue (`:353-369`):**
    - #16, #19, #20 ghi là bị spec này thay thế. Lý do: `get_parallels` in theo anchor; `get_suttaplex` in nguyên `blurb` và `translations`; không còn citation `Difficulty`.
    - Sửa "Thứ tự ưu tiên" cho hợp.
  - **Bảng Parallel types (`:128-137`):** bỏ cột "Ký hiệu", hoặc ghi một dòng rằng không tool nào in các ký hiệu này; `get_parallels` in nguyên `type`/`resembling`.
  - Spec `get-sutta-unknown-uid` cũng được ghi là bị thay thế (C7).
  - Artifact của các spec cũ giữ nguyên làm lịch sử.

- **FR-21: Issue #16, #19, #20.** Mô tả PR nêu ba issue bị spec này thay thế, kèm lý do ở FR-20. Đóng issue chỉ khi người dùng đồng ý rõ ràng lúc merge. Agent không tự đóng, và không dùng từ khóa tự đóng (`Closes #…`, `Fixes #…`) trong commit hay PR nếu người dùng chưa đồng ý.

- **FR-22: AGENTS.md, sửa cuối cùng.**
  - **Nội dung:**
    - `:17`: test không còn chỉ cho `search_topic`.
    - `:24`: mô tả file nguồn, bỏ `formatCitation()`.
    - `:28-34`: helper và năm tool theo FR-1.
    - `:37-40`: năm endpoint và tham số thật.
    - `:46`: bỏ câu "translator ID defaults to `sujato`".
    - Không đổi gì khác.
  - **Thứ tự:** `AGENTS.md` là dependency được pin `context:agents` trong `specs/tools-api-passthrough/workflow-contract.json`.
    1. Task sửa `AGENTS.md` là **task build cuối cùng**, riêng một task, chỉ sửa file này.
    2. Ngay sau đó, trước code review on-completion, chạy đường cập nhật contract. Bước `authorize` chỉ thực hiện khi người dùng đồng ý rõ ràng tại thời điểm đó.
    3. Người dùng không authorize thì workflow dừng ở trạng thái drift. Agent không tự khôi phục `AGENTS.md`.

## Non-Functional Requirements

- **NFR-1 (không dependency mới):**
  - `dependencies` và `devDependencies` không đổi, và `package-lock.json` không đổi.
  - Trong `package.json`, chỉ `scripts.test` được đổi, và chỉ khi test mới nằm ở file mới (C10).
  - Không runner, assertion hay mock library ngoài `node:test` và `node:assert`.
- **NFR-2 (build):** `npm run build` (tsc strict) thoát mã 0 với `tsconfig.json` không đổi. Sau `rm -rf dist && npm run build`, `dist/` chỉ có `index.js`, `search.js`, và tối đa một file `.js` ứng với module mới của NFR-3.
- **NFR-3 (phạm vi file):** chỉ đổi các file sau:
  - `src/index.ts`, `src/search.ts`, và tối đa một file mới trong `src/`
  - `test/**`
  - `package.json` (theo NFR-1)
  - `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md`
  - artifact của spec này
  - `specs/INDEX.md`, chỉ dòng của spec này, do orchestrator viết khi hoàn tất
- **NFR-4 (fixture, Constraints "không tích lũy"; C10):** áp cho toàn bộ `test/fixtures/`:
  - Tối đa 10 file, tổng ≤ 65536 B (`cat test/fixtures/* | wc -c`).
  - Mỗi file có URL request và ngày ghi.
  - Ghi live bằng `curl` đúng URL mà hàm của FR-5 phát.
  - Body được cắt cho nhỏ nhưng giữ thứ tự key và hình dạng lồng nhau. Ví dụ, mỗi map bilara còn vài segment, gồm cả một giá trị `""`.
  - Không có key `translations` hay `highlight`.
  - Body thô không lưu vào repo hay bất kỳ đâu.
  - Không script tải hàng loạt.
- **NFR-5 (luật verify live):** harness JSON-RPC stdio theo `specs/dynamic-search/design.md` §Harness.
  - Lần chạy **không hợp lệ** được chạy lại: `fetch failed`, timeout, thiếu/thừa dòng `"id":2`, HTTP 000.
  - Mismatch trên một lần chạy **hợp lệ** thì dừng và báo, không chạy lại.
  - Script, log và baseline nằm ngoài repo, xóa sau khi dùng. Không lưu response thô.
- **NFR-6 (độ trễ):** mỗi lời gọi đúng một request, không thêm request nào. Đo 2026-10-24, mỗi GET tới bốn endpoint mới mất 0.26–4.09 s, và `search/instant` tới 7.60 s, quan sát đến nay. `get_bilarasuttas` mất đi lời gọi suttaplex song song và lời gọi retry. Harness live chừa thời gian chờ ít nhất 30 s mỗi lời gọi.
- **NFR-7 (kích thước output; C3, người dùng chấp nhận 2026-10-24):** không giới hạn, không cắt. Cảnh báo cho caller nằm trong `describe()` (FR-14). `text` của body lớn (ví dụ `suttaplex/mn`, 1.3 MB) có thể vượt giới hạn output MCP của client. Đây là hệ quả đã biết của quyết định 4 và 5, không phải lỗi phải sửa trong spec này.

## Acceptance Criteria

### Harness

Harness theo NFR-5. Chạy `npm run build` trước mỗi đợt chạy. Literal dưới đây đo live ngày 2026-10-24. Nếu một literal lệch trên lần chạy hợp lệ, fetch lại endpoint bằng `curl` cùng URL để phân biệt dữ liệu SC trôi với regression, rồi dừng và báo.

**Baseline cho AC-10:** trước khi sửa code, chạy harness ở `7dc2299` cho các input `search_topic` của AC-10, rồi lưu output ngoài repo. Xóa sau khi xong.

### AC-1: `get_bilarasuttas` trả body nguyên văn

- **Maps to:** FR-3, FR-5, FR-7, FR-9
- **When** gọi `get_bilarasuttas {"uid":"mn10","author_uid":"sujato","format":"json"}`, rồi `curl -s https://suttacentral.net/api/bilarasuttas/mn10/sujato` ngay sau đó
- **Then** text của item thứ nhất trùng từng byte với body của `curl`
- **And** item thứ hai là `Nguồn: SuttaCentral — https://suttacentral.net/api/bilarasuttas/mn10/sujato`, URL không có `?`

### AC-2: Không cắt, in mọi map và giá trị rỗng

- **Maps to:** FR-8, FR-10, FR-11
- **When** gọi `get_bilarasuttas {"uid":"dn22","author_uid":"sujato"}`
- **Then** output `text` có các key top-level `comment_text`, `html_text`, `root_text`, `translation_text`, `variant_text`, `reference_text`, `keys_order`, theo đúng thứ tự đó
- **And** `translation_text` có dòng của `dn22:22.27` với `Satisfied, the mendicants approved what the Buddha said. `, và dòng của `dn22:22.28` với giá trị chuỗi rỗng, phân biệt được với `null`
- **And** `keys_order` có số phần tử 454
- **And** output không có `max_segments`, `Deep link`, `[... văn bản bị cắt`, `Translator:`

### AC-3: Bản dịch tiếng Việt cần `lang`

- **Maps to:** FR-3, FR-10
- **When** gọi `get_bilarasuttas {"uid":"dhp1-20","author_uid":"phantuananh","lang":"vi"}`
- **Then** dòng nguồn có URL `https://suttacentral.net/api/bilarasuttas/dhp1-20/phantuananh?lang=vi`
- **And** `translation_text` có `dhp1:0.1` với `Tiểu Bộ Kinh ` và `dhp1:0.2` với `Kinh Pháp Cú `

### AC-4: Bỏ `author_uid` thì chỉ có văn bản gốc

- **Maps to:** FR-2, FR-3, FR-10
- **When** gọi `get_bilarasuttas {"uid":"mn10"}`
- **Then** dòng nguồn có URL `https://suttacentral.net/api/bilarasuttas/mn10`
- **And** output có `root_text` với `Majjhima Nikāya 10 `, và không có key `translation_text` hay `comment_text`
- **And** không có request nào tới `/api/suttaplex/` (đọc code)

### AC-5: Body "không tìm thấy" in nguyên văn

- **Maps to:** FR-7, FR-10, FR-12
- **When** lần lượt gọi:
  - `get_bilarasuttas {"uid":"mn9999","author_uid":"sujato"}`
  - `get_suttaplex {"uid":"mn9999"}`
  - `get_parallels {"uid":"mn9999"}`
  - `get_menu {"submenu_id":"xyzzy"}`
- **Then** không result nào có `isError`
- **And** output thứ nhất có `msg` và `Not Found`
- **And** output thứ hai là mảng 1 phần tử, có `uid` là `null` và `translations` là mảng rỗng
- **And** output thứ ba nói rõ body là object rỗng
- **And** output thứ tư có `children` là mảng rỗng
- **And** không output nào có `Không tìm thấy sutta`

### AC-6: `get_suttaplex` in mọi field, kể cả `translations`

- **Maps to:** FR-2, FR-3, FR-10, FR-15
- **When** gọi `get_suttaplex {"uid":"mn10"}`, rồi `curl -s https://suttacentral.net/api/suttaplex/mn10`
- **Then** dòng nguồn có URL `https://suttacentral.net/api/suttaplex/mn10`, không có `language`
- **And** output là mảng 1 phần tử. Phần tử có 19 key theo thứ tự `acronym`, `alt_acronym`, `volpages`, `alt_volpages`, `uid`, `blurb`, `difficulty`, `original_title`, `root_lang`, `root_lang_name`, `type`, `translated_title`, `translations`, `parallel_count`, `biblio`, `priority_author_uid`, `verseNo`, `previous`, `next`
- **And** `translations` có số phần tử bằng `length` của mảng đó trong body `curl`, kể cả mục `is_root` (`ms`)
- **And** `difficulty` hiển thị `name` `intermediate` và `level` `2`
- **When** gọi thêm với `"language":"vi"`
- **Then** dòng nguồn có `?language=vi`, và `translated_title` là `Kinh Niệm xứ`

### AC-7: `get_parallels` giữ anchor nguồn

- **Maps to:** FR-3, FR-10, FR-15
- **When** gọi `get_parallels {"uid":"mn10"}`
- **Then** output có bốn key top-level theo thứ tự `mn10`, `mn10#44.1`, `mn10#47.1`, `mn10#10.1`, với số phần tử 8, 2, 3, 3
- **And** phần tử đầu của `mn10` có `to` với `uid` `dn22`, `type` `full`, `resembling` `false`
- **And** output không có ký hiệu `≡`, `≈`, `↺` và không có `parallels tổng cộng`
- **When** gọi `get_parallels {"uid":"mn10","language":"vi"}`
- **Then** dòng nguồn có `?language=vi`, và `to` của phần tử đầu (`uid` `dn22`) có `translated_title` `Kinh Ðại Niệm xứ`
- **When** gọi `get_parallels {"uid":"dn22"}`
- **Then** output có 7 key top-level, mở đầu bằng `dn22`, tổng 27 phần tử

### AC-8: `get_menu` thay `list_divisions`

- **Maps to:** FR-2, FR-3, FR-10, FR-14, FR-15
- **When** gọi `get_menu {"submenu_id":"long"}`
- **Then** dòng nguồn có URL `https://suttacentral.net/api/menu/long`
- **And** output là mảng 1 node `long`, có `children` gồm `dn`, `da`, `da-ot` theo thứ tự đó
- **When** gọi `get_menu {}`, rồi `curl -s https://suttacentral.net/api/menu`
- **Then** dòng nguồn có URL `https://suttacentral.net/api/menu`, và số phần tử top-level bằng `length` của body `curl` (464 lúc đo)
- **And** có node `sutta` với `children` `long`, `middle`, `linked`, `numbered`, `minor`, `other-group`
- **When** gọi `get_menu {"submenu_id":"sutta","language":"vi"}`
- **Then** `translated_name` của `sutta` là `Kinh tạng`
- **And** `describe()` của `get_menu` nêu các `submenu_id` `sutta`, `vinaya`, `abhidhamma`

### AC-9: Tham số không hợp lệ

- **Maps to:** FR-2
- **When** gọi lần lượt:
  - `get_bilarasuttas {}`
  - `get_bilarasuttas {"uid":""}`
  - `get_bilarasuttas {"uid":"mn10","author_uid":""}`
  - `get_suttaplex {"uid":"mn10","format":"xml"}`
  - `get_parallels {"uid":42}`
  - `get_menu {"submenu_id":""}`
- **Then** mỗi result có `isError: true`, với text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool ` theo sau là tên tool tương ứng

### AC-10: `search_instant` là `search_topic` đổi tên

- **Maps to:** FR-1, FR-6
- **When** chạy với bản build mới:
  - `search_instant {"query":"vô ngã","language":"vi"}`
  - `search_instant {"query":"foo:bar","language":"en","format":"json"}`
  - `tools/list`
- **Then** content của hai lời gọi trùng từng byte với baseline `search_topic` cùng input ở `7dc2299`
- **And** `inputSchema` của `search_instant` trùng từng byte với `inputSchema` của `search_topic` trong baseline
- **And** `description` của `search_instant` bằng `desc_base + " " + S`, với `desc_base` là `description` của `search_topic` trong baseline (so từng byte). Chỉ trên `S`: có `140,685`, có `limit`/`offset` kèm ý chúng chỉ phân trang `hits`, có `title:`, và có ý dùng truy vấn cụ thể hơn.
- **And** `tools/list` có đúng năm tên của FR-1

### AC-11: `tools/list` của bốn tool mới, và cảnh báo của cả năm tool

- **Maps to:** FR-2, FR-14
- **When** chạy harness `tools/list`
- **Then** `inputSchema` của mỗi tool có đúng các property của FR-2. `required` của `get_bilarasuttas`, `get_suttaplex`, `get_parallels` là `["uid"]`; của `get_menu` không có `required`, hoặc là mảng rỗng.
- **And** chỉ `format` có `default` (`"text"`)
- **And** text mô tả của từng tool có endpoint và các ý của FR-14, kể cả dòng "Kích thước" của FR-14 cho cả bốn tool:
  - `get_menu` nhắc `submenu_id`;
  - `get_suttaplex` nhắc uid của sutta thay vì uid của division;
  - `get_bilarasuttas` nói không có tham số nào thu nhỏ output, và nhắc `dn22` hoặc `dn16` làm ví dụ kinh dài;
  - `get_parallels` nói không có tham số nào thu nhỏ output, và nói uid của division trả `{}`;
  - không mô tả nào nói `get_parallels` hay `get_bilarasuttas` cho output lớn khi truyền uid của division. Cùng với AC-10, cả năm tool đều có cảnh báo output lớn. Không mô tả nào có `max_segments`, `Deep link`, `sujato` dưới dạng mặc định, `hardcode`, `tradition`.

### AC-12: Unit test, đột biến, fixture

- **Maps to:** FR-17, FR-18, NFR-1, NFR-4
- **When** chạy `npm test`, rồi chạy lần thứ hai với preload ngoài repo làm `globalThis.fetch` ném lỗi. Áp từng đột biến (a)–(f) của FR-18 trên một bản sao ngoài repo. Liệt kê `test/fixtures/`.
- **Then** hai lần chạy đầu thoát mã 0, TAP có `# fail 0`
- **And** với mỗi dòng áp dụng của bảng FR-17, với mỗi id FR của dòng đó, chuỗi `tools-api-passthrough FR-{n}:` là tiền tố của ít nhất một case pass. Ví dụ, `tools-api-passthrough FR-3:` không tính cho FR-30. Trên repo chưa sửa (`7dc2299`), phép kiểm này cho 0 case.
- **And** cả sáu đột biến làm `npm test` thoát khác 0
- **And** fixture: ≤ 10 file; `cat test/fixtures/* | wc -c` ≤ 65536; `grep -l -E '"(highlight|translations)"' test/fixtures/*` rỗng; mỗi file có URL và ngày ghi
- **And** bản sao ngoài repo bị xóa

### AC-13: Logic tự chế đã bỏ, phạm vi, không trạng thái

- **Maps to:** FR-5, FR-13, FR-15, FR-16, NFR-2, NFR-3
- **When** chạy:
  - `rm -rf dist && npm run build && find dist -type f | sort`
  - `git diff 7dc2299 --stat`
  - `git diff 7dc2299 -- package-lock.json tsconfig.json`
  - các grep của FR-15
- **Then** tsc thoát mã 0, và `dist/` đúng NFR-2
- **And** mọi file thay đổi thuộc NFR-3. Diff của `package-lock.json` và `tsconfig.json` rỗng. Diff của `package.json`, nếu có, chỉ ở `scripts.test`.
- **And** mọi grep của FR-15 cho 0
- **And** đọc code:
  - mỗi handler gán kết quả hàm dựng URL vào đúng một biến, rồi truyền biến đó, viết trần, cho `fetch` và cho dòng nguồn;
  - `!res.ok` dẫn tới `throw new Error(\`SuttaCentral API error: ${res.status}\`)` ở cả hai format;
  - không có try/catch, retry hay fallback;
  - không biến cấp module nào giữ response.

### AC-14: Tài liệu

- **Maps to:** FR-19, FR-20, FR-21, FR-22
- **When** chạy `grep -n -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions|max_segments|Deep link' README.md AGENTS.md specs/sutta-mcp-requirements.md`, rồi đọc bảng endpoint, bảng Parallel types, Tool 1–5, luồng mẫu, Constraints, roadmap mục 1/2/3/5/6/7 và bảng issue
- **Then** README và AGENTS.md không có dòng nào khớp. Master spec chỉ có các dòng ở ngữ cảnh lịch sử, nói rõ là đã bị thay thế.
- **And** bảng endpoint có đủ năm endpoint, kèm `language`/`lang`
- **And** #16, #19, #20 ghi là bị spec `tools-api-passthrough` thay thế. Mô tả PR nêu ba issue và không có từ khóa tự đóng, trừ khi người dùng đã đồng ý.
- **And** task sửa `AGENTS.md` là task build cuối. Contract update cho `context:agents` được người dùng authorize. `shasum -a 256 AGENTS.md` bằng sha256 mới trong `workflow-contract.json`.

## Assumptions

- **VERIFIED (đọc/đo 2026-10-24):**
  - **Hiện trạng.** Mọi dòng của §Hiện trạng: đọc `src/index.ts`, `src/search.ts`, `test/`, `package.json`, README, AGENTS.md, master spec tại `7dc2299`; chạy `grep`/`wc`; chạy `gh issue list`.
  - **Upstream.** Đọc `app.py`, `views.py`, `config.py` qua `raw.githubusercontent.com` (nhánh `main`, `git ls-remote` → `a9aeaa8`) vào thư mục `mktemp -d`, đã xóa. Đã grep `request.args` trong cả bốn handler. `DEFAULT_LANGUAGE = 'en'`.
  - **Live.** Mọi dòng của §Hình dạng API có nhãn "đo": 22 request `curl` cho cả bốn endpoint, cùng các đường lỗi và đường "không tìm thấy". Body chỉ phân tích trong thư mục tạm, đã xóa. Không có lần chạy không hợp lệ.
  - **SDK.** SDK 1.29.0 từ chối input sai schema bằng `MCP error -32602` mà không gọi handler, theo tiền lệ `search-api-passthrough` (review 1 đã đo).
  - **Câu trả lời của người dùng (2026-10-24):** C1 = (A), C3 = chấp nhận kèm cảnh báo trong `describe()`, C4 = default; C2, C5–C12 dùng default (`clarifications.md`).
  - **Giới hạn Claude Code.** Claude Code giới hạn output MCP ở 25,000 token theo mặc định, và lưu kết quả text dài hơn 50,000 ký tự ra file (`code.claude.com/docs/en/mcp`, đọc 2026-10-24).
- **UNVERIFIED (default stated):**
  - **Thứ tự key (C12):** body chưa đo có thể có key dạng chỉ số mảng, và `JSON.parse` sẽ đưa các key đó lên đầu. Default: chấp nhận, và design ghi hệ quả.
  - **Key `illustrations`** của bilara chưa gặp. Default: hiển thị như mọi key khác.
  - **Kích thước output (C3):** chưa đo giới hạn của Claude Desktop. Người dùng đã chấp nhận output lớn; FR-14 chỉ cảnh báo.
  - **Tham số path (C5):** default `min(1)`, mã hóa như một path segment.
  - **`text` bị parse lỗi** chỉ xảy ra khi body 2xx không phải JSON. Chưa gặp ở bốn endpoint này.
  - **AC-10 so từng byte** phụ thuộc vào việc upstream trả cùng response ở hai lần gọi (cache server). Nếu lệch trên lần chạy hợp lệ thì dừng theo NFR-5.

## Open Questions

Không còn câu hỏi mở.

- **Q1 (đã giải quyết 2026-10-24):** C1. Người dùng chọn (A), một bộ hiển thị chung, đệ quy, cho cả bốn tool.
- **Q2 (đã giải quyết 2026-10-24):** C3 được chấp nhận kèm cảnh báo trong `describe()` (FR-14). C4 dùng default. C2, C5–C12 không được trả lời nên dùng default.

## Out of Scope

- Endpoint khác: `range_suttaplex`, `parallels_lite`, `tipitaka_menu`, `suttas/{uid}/{author}` (bản legacy, không segmented), POST search.
- Mọi logic tự chế dưới bất kỳ dạng nào:
  - suy `lang` từ `translations[]`, mặc định dịch giả;
  - cắt hay phân trang văn bản;
  - lọc segment rỗng;
  - gộp các map bilara theo segment;
  - nhóm hay gắn ký hiệu cho parallels;
  - bảng `tradition`;
  - dựng link website;
  - nhận diện body "không tìm thấy".
- Cache response (roadmap mục 6), retry, timeout phía client, đổi chữ lỗi HTTP.
- Thay đổi logic, output hay test của `search_instant`, ngoài việc đổi tên và câu cảnh báo (FR-6).
- Sửa artifact của các spec cũ, hoặc dòng `specs/INDEX.md` của spec khác. Việc thay thế được ghi ở master spec (FR-20).
- Phần kiến thức nền của master spec (`:17-137`, gồm bảng Divisions có cột `tradition`), trừ bảng endpoint `:116-122` và cột "Ký hiệu" của bảng Parallel types `:128-137` (FR-20).
- Tự đóng issue #16, #19, #20 khi người dùng chưa đồng ý (FR-21).
- Linter, CI, test end-to-end, mock `fetch` toàn cục.
