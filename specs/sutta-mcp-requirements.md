# Sutta MCP — Requirements

## Tổng quan

**Sutta MCP** là một MCP (Model Context Protocol) server kết nối Claude với SuttaCentral API, giúp trả lời câu hỏi Phật pháp có trích dẫn nguồn kinh điển chính xác.

**Mục tiêu:** Thay vì Claude trả lời từ training data mà không có nguồn, mọi câu trả lời về Phật pháp đều được tra cứu trực tiếp từ SuttaCentral và kèm citation chuẩn.

**Đối tượng:** Cộng đồng Phật tử và người học Phật pháp — cả tiếng Việt lẫn tiếng Anh — sử dụng qua Claude.ai (Claude Desktop).

**Ngôn ngữ:** TypeScript  
**Runtime:** Node.js  
**Transport:** stdio (chuẩn MCP)

---

## Kiến thức nền về SuttaCentral

### Data model

SuttaCentral tổ chức kinh điển theo phân cấp:

```
Pitaka (Tạng)
└── Division (Bộ)
    └── Subdivision (Phần, tùy collection)
        └── Vagga (Phẩm, ~10 kinh)
            └── Sutta / UID (Kinh — đơn vị nhỏ nhất)
```

Ngoài phân cấp dọc, SC còn có **parallels** — quan hệ ngang giữa các kinh thuộc các truyền thống khác nhau (ví dụ: `mn10` Pali ↔ `ma98` Hán tạng).

### Pitaka — 3 tạng (bất biến)

| Pitaka | Mô tả |
|--------|-------|
| `sutta` | Kinh tạng |
| `vinaya` | Luật tạng |
| `abhidhamma` | Luận tạng |

### Divisions — các bộ chính

Divisions là cấp cao nhất trong API của SuttaCentral. Số lượng gần như bất biến (biến động cực kỳ hiếm, vài năm một lần).

**Sutta Pitaka:**

| UID | Tên | Truyền thống | Ngôn ngữ gốc |
|-----|-----|-------------|-------------|
| `dn` | Dīgha Nikāya | Theravada | Pali (`pli`) |
| `mn` | Majjhima Nikāya | Theravada | Pali (`pli`) |
| `sn` | Saṃyutta Nikāya | Theravada | Pali (`pli`) |
| `an` | Aṅguttara Nikāya | Theravada | Pali (`pli`) |
| `kn` | Khuddaka Nikāya | Theravada | Pali (`pli`) |
| `da` | Dīrghāgama 長阿含經 | Dharmaguptaka | Chinese (`lzh`) |
| `ma` | Madhyamāgama 中阿含經 | Sarvāstivāda | Chinese (`lzh`) |
| `sa` | Saṃyuktāgama 雜阿含經 | Sarvāstivāda | Chinese (`lzh`) |
| `sa-2` | Saṃyuktāgama 2 別譯雜阿含經 | Unknown | Chinese (`lzh`) |
| `ea` | Ekottarikāgama 增壹阿含經 | Mahāsāṃghika | Chinese (`lzh`) |
| `ea-2` | Ekottarikāgama 2 | Unknown | Chinese (`lzh`) |

**Vinaya Pitaka:**

UID dưới đây là **node duyệt**, không phải prefix của UID kinh văn — xem ngoại lệ ở §"UID format".

| UID | Tên | Truyền thống | Ngôn ngữ gốc |
|-----|-----|-------------|-------------|
| `pli-tv-vi` | Theravāda Vinayapiṭaka | Theravada | Pali (`pli`) |
| `lzh-mg-vi` | Mahāsaṅghika Vinaya | Mahāsaṅghika | Chinese (`lzh`) |
| `san-mg-vi` | Mahāsaṅghika Vinaya | Mahāsaṅghika | Sanskrit (`san`) |
| `san-lo-vi` | Lokuttaravāda Vinaya | Lokuttaravāda | Sanskrit (`san`) |
| `lzh-mi-vi` | Mahīśāsaka Vinaya | Mahīśāsaka | Chinese (`lzh`) |
| `lzh-dg-vi` | Dharmaguptaka Vinaya | Dharmaguptaka | Chinese (`lzh`) |
| `pgd-dg-vi` | Dharmaguptaka Vinaya | Dharmaguptaka | Gāndhārī (`pgd`) |
| `lzh-sarv-vi` | Sarvāstivāda Vinaya | Sarvāstivāda | Chinese (`lzh`) |
| `san-sarv-vi` | Sarvāstivāda Vinaya | Sarvāstivāda | Sanskrit (`san`) |
| `lzh-mu-vi` | Mūlasarvāstivāda Vinaya | Mūlasarvāstivāda | Chinese (`lzh`) |
| `san-mu-vi` | Mūlasarvāstivāda Vinaya | Mūlasarvāstivāda | Sanskrit (`san`) |
| `xct-mu-vi` | Mūlasarvāstivāda Vinaya | Mūlasarvāstivāda | Tibetan (`xct`) |

**Abhidhamma Pitaka:**

| UID | Tên | Truyền thống | Ngôn ngữ gốc |
|-----|-----|-------------|-------------|
| `ds` | Dhammasaṅgaṇī | Theravada | Pali (`pli`) |
| `vb` | Vibhaṅga | Theravada | Pali (`pli`) |
| `dt` | Dhātukathā | Theravada | Pali (`pli`) |
| `pp` | Puggalapaññatti | Theravada | Pali (`pli`) |
| `kv` | Kathāvatthu | Theravada | Pali (`pli`) |
| `ya` | Yamaka | Theravada | Pali (`pli`) |
| `patthana` | Paṭṭhāna | Theravada | Pali (`pli`) |

**Tibetan & Sanskrit:**

| UID | Tên | Ngôn ngữ gốc |
|-----|-----|-------------|
| `up` | Upāyika | Tibetan (`bod`) |
| `lzh-up` | Upāyika (Chinese) | Chinese (`lzh`) |
| `skt` | Sanskrit fragments | Sanskrit (`san`) |

### UID format

Phần prefix chữ cái của UID = division. Ví dụ:
- `mn10` → division `mn`
- `sn56.11` → division `sn`
- `ma98` → division `ma`

**Ngoại lệ — Vinaya.** Sutta và abhidhamma dùng chung một giá trị cho hai vai trò: `dn` vừa là node duyệt vừa là prefix của `dn1`. Vinaya tách đôi:

- **UID node** (bảng Vinaya ở trên, ví dụ `pli-tv-vi`) — dùng để gọi `/api/suttaplex/` và tạo link `suttacentral.net/{uid}`
- **Prefix kinh văn** (`pli-tv`) — dùng để suy division từ UID kinh, ví dụ `pli-tv-bu-vb-pj1` → `pli-tv`

Chuyển đổi: **prefix = UID node bỏ hậu tố `-vi`**. Đúng 12/12 node vinaya (đối chiếu con của `/api/menu/{uid}`, 2026-08-08).

Prefix vinaya **không** phải UID — `/api/suttaplex/pli-tv` trả rỗng. Không dùng prefix để tạo link.

### SuttaCentral API endpoints

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/suttaplex/{uid}?language={lang}` | Metadata của một sutta, hoặc của mọi sutta trong một division/vagga (mảng phẳng). Thiếu `language` → upstream mặc định `en` (`DEFAULT_LANGUAGE = 'en'`, `config.py:34`) |
| `GET /api/bilarasuttas/{uid}/{author_uid}?lang={lang}`, `GET /api/bilarasuttas/{uid}?lang={lang}` | Văn bản segmented; không có `author_uid` → chỉ văn bản gốc. Thiếu `lang` → upstream mặc định `en` (`request.args.get('lang', 'en')`, `views.py:1061`) |
| `GET /api/parallels/{uid}?language={lang}` | Parallels, key là anchor của sutta nguồn. Thiếu `language` → mặc định `en` (`config.py:34`) |
| `GET /api/menu?language={lang}`, `GET /api/menu/{submenu_id}?language={lang}` | Cây duyệt, mỗi lời gọi một cấp con. Thiếu `language` → mặc định `en` (`config.py:34`) |
| `GET /api/search/instant?query={q}&…` | Search; tham số xem Tool 1 |

**Translator IDs thông dụng:** `sujato` (Pali, tiếng Anh), `brahmali` (Vinaya, tiếng Anh)

**Language codes:** `en`, `vi`, `pli`, `lzh`...

### Parallel types

API trả về 2 field: `type` (string) và `resembling` (boolean). `get_parallels` in nguyên hai field này; không tool nào gán ký hiệu cho chúng (spec `tools-api-passthrough`).

| `type` | `resembling` | Mô tả |
|--------|-------------|-------|
| `full` | `false` | Full parallel — cùng nguồn gốc, nội dung tương đương |
| `full` | `true` | Resembling parallel — tương đồng một phần |
| `mention` | `false` | Văn bản này nhắc đến văn bản kia |
| `retelling` | `false` | Cùng sự kiện, kể lại khác nhau |

---

## Tools

### Tool 1: `search_instant`

**Mục đích:** Tìm sutta theo chủ đề Phật pháp bằng search của SuttaCentral. Entry point chính của người dùng. Tool là wrapper mỏng của API: cùng tham số, một request mỗi lời gọi, không có logic tự chế (spec `search-api-passthrough`).

**Input:** tham số cùng tên và cùng nghĩa với tham số của `GET /api/search/instant`, cộng `format`. Tham số không truyền thì không gửi; API dùng mặc định của chính nó.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `query` | string | Có | Chuỗi tìm kiếm, gửi nguyên văn, kể cả lệnh lọc của SC như `title:` |
| `language` | string | Không | Ngôn ngữ của tiêu đề được khớp và trả về, ví dụ `en`, `vi`. Tool không có mặc định |
| `limit` | integer ≥ 0 | Không | Số hit tối đa của trang `hits`. Mặc định phía API: 10 |
| `offset` | integer ≥ 0 | Không | Vị trí bắt đầu của trang `hits`. Mặc định phía API: 0 |
| `selectedLanguages` | mảng string | Không | Ngôn ngữ của bản văn trong `hits`, gửi dạng chuỗi JSON. Mặc định phía API: `["en","pli"]` |
| `restrict` | string | Không | Giới hạn loại kết quả; `dictionaries` làm API trả body `null` |
| `matchpartial` | boolean | Không | Khớp một phần, gửi `true`/`false`. Mặc định phía API: tắt |
| `format` | `text` / `json` | Không | Dạng output, không gửi tới API. Mặc định: `text` |

**Output:** `text`: dòng nguồn kèm URL request, rồi mọi phần tử của `suttaplex` (khớp tiêu đề) và `hits` (khớp nội dung, gồm cả mục dictionary, bài viết, mỗi bản dịch một mục) theo đúng thứ tự SC trả về, mỗi mục kèm link SuttaCentral khi có; sau đó `total`, `fuzzy_dictionary`, và `error` khi SC báo lỗi truy vấn. Không lọc, không khử trùng, không sắp lại. `json`: body response nguyên văn, kèm một dòng nguồn.

**Nguồn dữ liệu:** Search API của SuttaCentral, `GET /api/search/instant`, đúng một request mỗi lời gọi.

**Lưu ý:** Tìm bằng tiếng Việt: truyền `language` = `vi` để khớp tiêu đề tiếng Việt, và `selectedLanguages` có `vi` để có bản dịch tiếng Việt trong `hits`. `total` là số đếm xấp xỉ của SC, không phải tín hiệu còn trang sau; muốn biết còn kết quả thì gọi lại với `offset` lớn hơn và xem có mục mới không. Output `json` có thể rất lớn (`mindfulness`/`en`: 140,685 B, phần lớn là `translations` của `suttaplex`); `limit`/`offset` chỉ phân trang `hits`, nên muốn thu hẹp thì dùng truy vấn `title:` hoặc truy vấn cụ thể hơn.

---

### Bốn tool passthrough: quy ước chung (Tool 2–5)

Spec `tools-api-passthrough`. Mỗi tool là wrapper mỏng của một endpoint, tên theo endpoint:

- **Input:** tham số cùng tên và cùng nghĩa với tham số của API, cộng `format` (`text`/`json`, mặc định `text`, không gửi tới API). Tham số không truyền thì không gửi; API dùng mặc định của chính nó (`en` cho `language`/`lang`). Tham số path là chuỗi không rỗng, mã hóa như một path segment, không trim, không đổi hoa/thường.
- **Request:** đúng một GET mỗi lời gọi, không request nào khác, không retry. HTTP không 2xx → lỗi `SuttaCentral API error: {status}`.
- **Output `json`:** body response nguyên văn, kèm một dòng nguồn `Nguồn: SuttaCentral — {URL request}`.
- **Output `text`:** dòng nguồn, rồi body hiển thị đệ quy: mỗi giá trị một dòng `key: giá trị` theo đúng thứ tự body, phần tử mảng có nhãn `[i]`, object ghi số key và mảng ghi số phần tử, con thụt thêm hai dấu cách. Chuỗi in nguyên văn (chuỗi rỗng là `""`); số, boolean, `null` in dạng JSON. Không lọc, không gộp, không sắp lại, không cắt; không link website, không citation, không nhãn tự đặt.
- **Body "không tìm thấy"** (HTTP 200: `{"msg": "Not Found"}`, `{}`, hoặc mảng có `uid` `null`) được in như mọi body khác, không `isError`. Câu "Không tìm thấy sutta với UID" của spec `get-sutta-unknown-uid` không còn (bị spec `tools-api-passthrough` thay thế).
- **Kích thước:** không giới hạn, không cắt; `describe()` của mỗi tool cảnh báo output lớn và nêu cách thu hẹp khi API có.

### Tool 2: `get_bilarasuttas`

**Mục đích:** Lấy văn bản segmented của một sutta (gốc, bản dịch, chú thích, dị bản, tham chiếu) để Claude đọc và trích dẫn theo segment ID.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `uid` | string, không rỗng | Có | UID của sutta, ví dụ `mn10`; path segment thứ nhất |
| `author_uid` | string, không rỗng | Không | ID dịch giả, ví dụ `sujato`, `phantuananh`; path segment thứ hai. Bỏ trống → body chỉ có văn bản gốc |
| `lang` | string | Không | Ngôn ngữ của bản dịch, query `lang`. Mặc định phía API: `en`. Bản dịch không phải tiếng Anh cần `lang` của nó (`translations[].lang` của `get_suttaplex`); `lang` không khớp → body không có `translation_text` |
| `format` | `text` / `json` | Không | Mặc định: `text` |

**Output:** mọi map của body (`comment_text`, `html_text`, `root_text`, `translation_text`, `variant_text`, `reference_text`, map nào SC có), mỗi map in mọi segment ID kể cả giá trị rỗng, rồi `keys_order` (thứ tự đọc). Không gộp các map, không cắt. Không tìm thấy (uid sai, hoặc uid của bộ như `dn`): `{"msg": "Not Found"}`.

**Nguồn dữ liệu:** `GET /api/bilarasuttas/{uid}/{author_uid}?lang={lang}`, hoặc `GET /api/bilarasuttas/{uid}` khi không có `author_uid`.

**Kích thước (đo 2026-10-24):** theo chính sutta, không tham số nào thu nhỏ: `dn22`/`sujato` 158,090 B, `dn16`/`sujato` 633,489 B.

---

### Tool 3: `get_suttaplex`

**Mục đích:** Lấy metadata của một sutta, hoặc của mọi sutta trong một division/vagga: tiêu đề, blurb, độ khó, mọi bản dịch (`translations`, kèm `author_uid`, `lang` để gọi `get_bilarasuttas`), số parallels.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `uid` | string, không rỗng | Có | UID của sutta (`mn10`), hoặc của division/vagga (`mn`) |
| `language` | string | Không | Ngôn ngữ của các field phụ thuộc ngôn ngữ, query `language`. Mặc định phía API: `en`. Đổi `translated_title`, `translations[].title`, `priority_author_uid`…; `blurb` có thể vẫn là tiếng Anh |
| `format` | `text` / `json` | Không | Mặc định: `text` |

**Output:** mảng suttaplex nguyên văn, gồm mọi mục `translations` kể cả văn bản gốc (`is_root`). Không tìm thấy: mảng một phần tử có `uid` `null`, `translations` rỗng.

**Nguồn dữ liệu:** `GET /api/suttaplex/{uid}?language={lang}`.

**Kích thước (đo 2026-10-24):** `mn10` 12,962 B; `mn` 171 phần tử, 1,343,704 B. Thu hẹp bằng uid của sutta.

---

### Tool 4: `get_parallels`

**Mục đích:** Lấy parallels của một sutta — cho thấy cùng một giáo lý xuất hiện qua nhiều truyền thống.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `uid` | string, không rỗng | Có | UID của sutta nguồn |
| `language` | string | Không | Ngôn ngữ của `to.translated_title` và `to.translations[].title`, query `language`. Mặc định phía API: `en` |
| `format` | `text` / `json` | Không | Mặc định: `text` |

**Output:** object có key là anchor của sutta nguồn (`mn10`, `mn10#44.1`, …) theo thứ tự SC; mỗi anchor là mảng parallel `{enumber, to, type, remark, resembling}`. Không tìm thấy, hoặc uid của division: `{}`.

**Nguồn dữ liệu:** `GET /api/parallels/{uid}?language={lang}`.

**Kích thước (đo 2026-10-24):** theo chính sutta, không tham số nào thu nhỏ: `dn16` 43 anchor, 162 parallel, 321,012 B; `dn22` 77,799 B.

---

### Tool 5: `get_menu`

**Mục đích:** Duyệt cây phân cấp của SuttaCentral (tạng → nhóm → bộ → …) từ API, thay bảng `DIVISIONS` hardcode trước đây.

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `submenu_id` | string, không rỗng | Không | uid của node cần mở, ví dụ `sutta`, `long`, `dn`. Bỏ trống → mọi node gốc |
| `language` | string | Không | Ngôn ngữ của `translated_name` (đổi cả `yellow_brick_road`, `yellow_brick_road_count`), query `language`. Mặc định phía API: `en` |
| `format` | `text` / `json` | Không | Mặc định: `text` |

**Output:** mảng node nguyên văn; mỗi lời gọi trả một cấp con (node con có `has_children`, không có `children`). Không có `submenu_id`: 464 node gốc (đo 2026-10-24), chỉ `sutta`, `vinaya`, `abhidhamma` có `children` khác rỗng. Không tìm thấy: mảng một node có `uid` `null`, `children` rỗng. Không có cột `tradition`, vì API không có field này.

**Nguồn dữ liệu:** `GET /api/menu?language={lang}` hoặc `GET /api/menu/{submenu_id}?language={lang}`.

**Kích thước (đo 2026-10-24):** `/api/menu` 168,235 B; `/api/menu/sutta` 2,863 B. Thu hẹp bằng `submenu_id`.

---

## Luồng hoạt động điển hình

```
Người dùng: "Đức Phật dạy gì về chánh niệm?"
     ↓
Claude gọi search_instant({"query": "niệm xứ", "language": "vi"})
     ↓
Trả về: các sutta khớp tiêu đề tiếng Việt, trong đó mn10 (Kinh Niệm xứ), dn22, sn43.5, ma98, mỗi mục kèm link SuttaCentral
     ↓
Claude gọi get_suttaplex({"uid": "mn10"})
     ↓
Trả về: metadata của mn10, translations có 43 mục, trong đó sujato (lang en)
     ↓
Claude gọi get_bilarasuttas({"uid": "mn10", "author_uid": "sujato"})
     ↓
Claude gọi get_parallels({"uid": "mn10"})
     ↓
Trả về: anchor mn10 gồm dn22, ea12.1, ma98, …; anchor mn10#44.1, mn10#47.1, mn10#10.1 cho parallels của từng đoạn
     ↓
Claude trả lời có trích dẫn segment ID + link suttacentral.net/mn10
```

---

## Constraints

**Cache:** Prototype không cache — mọi API call đều real-time, fetch trực tiếp mỗi lần gọi tool. Chiến lược cache cho production xem mục "Hướng nâng cấp".

**Chain đến nguồn được đảm bảo bằng:**
- Mọi response đều kèm **URL request SuttaCentral** (dòng `Nguồn: SuttaCentral — {URL}`). `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu` không dựng link website; Claude tự dựng link `suttacentral.net/…` từ `uid`, `lang`, `author_uid` và segment ID trong body. `search_instant` còn in link `https://suttacentral.net/…` cho từng mục (spec `tools-api-passthrough`).
- Production: mọi trích dẫn kèm **segment ID** (ví dụ `mn1:2.3`) liên kết trực tiếp đến SC. Hiện trạng: `get_bilarasuttas` trả segment ID là key của mọi map trong body (mục 5 của "Hướng nâng cấp").

- **Không dùng data để train** — Sutta MCP không phải training pipeline
- **Không scrape hoặc tích lũy** nội dung SC thành dataset phục vụ training AI hoặc xây dựng corpus độc lập không có chain đến nguồn
- **Rate limiting:** Mỗi tool call chỉ fetch đúng những gì cần
- **Ngôn ngữ:** Output hỗ trợ cả tiếng Anh và tiếng Việt
- **Attribution:** Mọi output đều có nguồn (dòng nguồn với URL request SuttaCentral). Dịch giả và UID có trong output khi body của SuttaCentral có chúng; ví dụ output của `get_menu`, hay của `get_bilarasuttas` không có `author_uid`, không có dịch giả.

---

## Hướng nâng cấp (sau prototype)

1. **Dynamic search** — **đã thực hiện** (spec `dynamic-search`), rồi thay bằng wrapper mỏng (spec `search-api-passthrough`), rồi đổi tên `search_topic` thành `search_instant` (spec `tools-api-passthrough`). `search_instant` nhận đúng tham số của `GET /api/search/instant` cộng `format` (`text`/`json`) và in response theo thứ tự SC, không lọc. Lý do và số đo: `specs/search-api-passthrough/`.

2. **Tiếng Việt** — **đã thực hiện phần lấy bản dịch** (spec `non-segmented-translation-guard`, `bilara-lang-param`), **rồi bị spec `tools-api-passthrough` thay thế.** Cơ chế cũ của `get_sutta` (tự gọi lại kèm `?lang=` lấy từ `translations[]`, báo rõ và liệt kê bản dịch khác khi không có `translation_text`) không còn. `get_bilarasuttas` nhận `lang` của caller và trả nguyên body; caller lấy `lang` từ `translations[].lang` của `get_suttaplex`. Ví dụ `dhp1-20`, `phantuananh`, `lang` = `vi` cho `translation_text` tiếng Việt (đo 2026-10-24).

3. **Cross-tradition search** — **đã bỏ (2026-10-24).** Tự fetch parallels cho kết quả tìm kiếm trái chủ trương `search_instant` khớp đúng API và trái Constraints "Mỗi tool call chỉ fetch đúng những gì cần". Claude đã ghép được `search_instant` với `get_parallels`.
4. **Public hosting** — deploy lên Cloudflare Workers hoặc Railway để cộng đồng dùng không cần cài đặt. **Điều kiện:** server hiện chỉ có transport stdio (`StdioServerTransport`), tức chạy như tiến trình con của client; host công khai cần thêm một transport HTTP của MCP. Làm cùng mục 6: cache dùng chung giữa nhiều user cần store bền.
5. **Segment ID trong `get_sutta` output** — **đã thực hiện (2026-10-02, spec `segment-id-in-get-sutta`), rồi bị spec `tools-api-passthrough` thay thế.** Cơ chế cũ (`get_sutta` in segment ID trước mỗi đoạn và một dòng `Deep link:`) không còn. `get_bilarasuttas` trả segment ID là key của mọi map trong body (ví dụ `mn10:1.1`), và `keys_order` là thứ tự đọc.
6. **Cache strategy** — **làm cùng mục 4, không làm riêng** (xem **Phụ thuộc** bên dưới). Dựa trên HTTP caching header mà chính SuttaCentral API đã trả về (xác nhận bằng live request tới `bilarasuttas` và `suttaplex`): `ETag` (weak) + `Cache-Control: max-age=172800, must-revalidate, proxy-revalidate`. Không cần tự tính checksum hay đồng bộ với bilara-data repo — SC đã tự làm việc này, tự chế thêm là trùng lặp và dễ lệch khi cấu trúc repo đổi.

   **Cache entry:** `{ url, data, etag, cachedAt }`, khóa theo **URL request đầy đủ, gồm cả query** (`?lang=`, `?language=`). Không khóa theo `{ uid, translator }`: cùng `uid` + `translator`, `/api/bilarasuttas/` trả nội dung khác nhau tùy `?lang=` (ví dụ `phantuananh` thiếu `translation_text` khi không truyền `lang`, có khi truyền `?lang=vi` — spec `bilara-lang-param`), nên khóa thiếu `lang` sẽ trộn hai response.

   **Đọc cache (áp dụng cho Root text Pali và Bilara segments):**
   - `now - cachedAt < max-age` (lấy từ header response, không hardcode) → trả thẳng từ cache, không gọi API.
   - Hết hạn → gọi lại kèm `If-None-Match: <etag lưu>`:
     - `304 Not Modified` → nội dung vẫn đúng, chỉ reset `cachedAt`.
     - `200 OK` → nội dung đã đổi, ghi đè `data` + `etag` mới.

   Revalidate đồng bộ ngay tại thời điểm đọc — không cần cron job riêng vì response `304` gần như không tốn chi phí.

   | Loại data | Chiến lược cache |
   |-----------|-----------------|
   | Root text Pali (Mahāsaṅgīti) | ETag + max-age như trên |
   | Bilara segments (nội dung sutta) | ETag + max-age như trên |
   | SuttaPlex metadata (blurb, parallels) | ETag + max-age như trên |
   | Search results | ETag + max-age như trên — `/api/search/instant` trả cùng `ETag` (weak) + `Cache-Control: max-age=172800` (đo 2026-10-17) |
   | Divisions list (`get_menu`) | ETag + max-age như trên — `/api/menu/{submenu_id}` trả cùng `ETag` (weak) + `Cache-Control: max-age=172800` (đo `/api/menu/sutta` 2026-10-24) |

   **Phụ thuộc:** stdio hiện tại là 1 process/1 user nên in-memory Map chạy đúng, nhưng chỉ có ích cục bộ. Cloudflare Workers không giữ biến JS giữa các request — cần Workers KV. Giá trị thật của store bền ở mục 4 là **chia sẻ cache giữa nhiều user đồng thời** (ví dụ nhiều người cùng hỏi `mn10` chỉ fetch 1 lần), không phải để sống sót qua restart.

   **Giới hạn (theo Constraints "không tích lũy nội dung SC"):** cache chỉ là bản sao tạm thời của response để tránh gọi lặp lại, không phải kho nội dung. Store phải có giới hạn dung lượng (đẩy mục cũ ra khi đầy) và thời hạn tồn tại tối đa cho mỗi mục; chỉ ghi khi có tool call của người dùng, không prefetch hay làm ấm cache hàng loạt; không có đường nào liệt kê, xuất hay tái dùng nội dung cache ngoài việc trả lời chính lời gọi đó.

7. **Dynamic divisions list** — **đã thực hiện bằng `get_menu` (spec `tools-api-passthrough`).** `DIVISIONS` hardcode đã bỏ. `get_menu` là wrapper mỏng của `GET /api/menu` và `GET /api/menu/{submenu_id}`, có cùng `ETag` + `Cache-Control: max-age=172800` như các endpoint khác.

   **Hai đặc điểm của API, nay để caller xử lý:**
   - **Cây phân cấp lười (lazy tree), không phẳng.** `/api/menu` chỉ trả 1 cấp con: với pitaka `sutta`, cấp con là nhóm UI (`long`, `middle`, `linked`, `numbered`, `minor`, `other-group`), không phải UID division thật (`dn`, `mn`, `sn`...). Caller gọi tiếp `get_menu` với uid con (ví dụ `long` → `dn`, `da`, `da-ot`).
   - **Không có field `tradition`.** API trả `uid`, `root_name`, `translated_name`, `root_lang_iso`, `root_lang_name`, `blurb` — cột `tradition` cũ là domain knowledge tự thêm tay, nên đã bỏ cùng `DIVISIONS`; không có bảng tra `uid → tradition`.

   **Bằng chứng drift đã xảy ra** (phát hiện 2026-07-05 khi so `DIVISIONS.vinaya` với `/api/menu/vinaya` live; hardcode đã được resync ngay sau đó):

   | Hardcode cũ | SC hiện có |
   |---|---|
   | `lzh-mg` | `lzh-mg-vi` (UID đổi) |
   | `lzh-ms` "Mūlasarvāstivāda" | `lzh-mu-vi` (UID đổi) — cộng `san-mu-vi`, `xct-mu-vi` chưa có trong hardcode |
   | `lzh-ks` "Mahīśāsaka" | `lzh-mi-vi` (UID đổi) |
   | — | `san-lo-vi` Lokuttaravāda Vinaya — thiếu hoàn toàn |
   | — | `pgd-dg-vi` Gāndhārī Dharmaguptaka Vinaya — thiếu hoàn toàn |

   **Kết quả verify toàn bộ `DIVISIONS`** (2026-07-05, đối chiếu `/api/menu/{group}` live):

   | Phần | Kết quả |
   |---|---|
   | `sutta` | 11/11 UID hợp lệ. Live có thêm 14 nhóm (`da-ot`, `sa-3`, fragments `gf`/`kf`/`pf`/`tf`/`uf`, `dharmapadas`...) — hardcode là tập con có chủ đích (chỉ bộ chính), không phải drift |
   | `vinaya` | Đã drift như bảng trên — đã resync theo live, bỏ `other-vi` (catch-all) |
   | `abhidhamma` | 7/7 khớp tuyệt đối children của `pli-tv-ab` (cả UID lẫn tên) |

   Tức "biến động cực kỳ hiếm" (dòng ~43) đúng với UID kinh/luận chính (`dn`, `mn`, `ds`...) nhưng không đúng với vinaya — SC đã tái cấu trúc UID vinaya (hậu tố `-vi`). Đây là lý do `list_divisions` hardcode đã được thay bằng `get_menu`, đọc thẳng từ API.

### Việc mở đã ghi nhận (GitHub issues)

Lỗi và cải tiến tìm thấy khi chạy thử end-to-end trên `5459d5a` (2026-10-18, đo lại 2026-10-19); phạm vi thu hẹp ngày 2026-10-24. Chi tiết và số đo nằm trong từng issue; bảng này chỉ nối issue với mục roadmap liên quan. Issue đã đóng không ghi ở đây.

| Issue | Tool | Tóm tắt | Liên quan |
|---|---|---|---|
| [#16](https://github.com/nbkhoi/sutta-mcp/issues/16) (bug) — **bị spec `tools-api-passthrough` thay thế** | `get_parallels` | Vòng lặp `Object.values(data)` bỏ mất anchor nguồn (`dn22`, `dn22#18.1`, …) nên parallels toàn bài và từng đoạn bị trộn thành một danh sách, trông như trùng lặp hoặc mâu thuẫn. Bị thay thế: `get_parallels` in nguyên body theo anchor nguồn, mỗi anchor kèm mảng parallel của nó; `dn22` cho đủ 7 anchor, 27 mục (đo 2026-10-24). | — |
| [#19](https://github.com/nbkhoi/sutta-mcp/issues/19) (enhancement) — **bị spec `tools-api-passthrough` thay thế** | `get_suttaplex` (trước là `get_sutta_meta`) | Với `language=vi`, SC trả tiêu đề tiếng Việt nhưng blurb tiếng Anh; output không nói rõ. Bị thay thế: `get_suttaplex` in nguyên `blurb` và `translated_title` như SC trả, và `describe()` nói `blurb` có thể vẫn là tiếng Anh. | mục 2 |
| [#20](https://github.com/nbkhoi/sutta-mcp/issues/20) (enhancement) — **bị spec `tools-api-passthrough` thay thế** | `get_suttaplex` (trước là `get_sutta_meta`, `formatCitation()`) | Bản dịch legacy trông như trùng (cùng `author_uid`) và không cho biết `get_sutta` không lấy được nó; `Difficulty: unknown` in khi SC không có difficulty. Bị thay thế: `get_suttaplex` in nguyên `translations` (mỗi mục kèm `author_uid`, `lang`, `segmented`, `is_root`), và không tool nào còn in citation `Difficulty:`. | — |

**Thứ tự ưu tiên.** Tiêu chí: thiếu nó thì Claude hiểu sai kinh văn, trích dẫn sai, hoặc không biết một giới hạn có thật.

1. Mục 4 cùng mục 6 — mở rộng phạm vi người dùng, không phải điều kiện để trả lời đúng. Cần transport HTTP và store bền.

#16, #19, #20 và mục 7 đã bị spec `tools-api-passthrough` thay thế hoặc thực hiện (bảng trên, mục 7).
