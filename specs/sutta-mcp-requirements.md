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
| `GET /api/suttaplex/{uid}?language={lang}` | Metadata của một sutta hoặc toàn bộ một division |
| `GET /api/bilarasuttas/{uid}/{translator}?lang={lang}` | Toàn văn sutta (segmented). Thiếu `lang` → upstream mặc định `en` (`lang = request.args.get('lang', 'en')`, `views.py:1058`) |
| `GET /api/parallels/{uid}` | Danh sách parallels |

**Translator IDs thông dụng:** `sujato` (Pali, tiếng Anh), `brahmali` (Vinaya, tiếng Anh)

**Language codes:** `en`, `vi`, `pli`, `lzh`...

### Parallel types

API trả về 2 field: `type` (string) và `resembling` (boolean).

| `type` | `resembling` | Ký hiệu | Mô tả |
|--------|-------------|---------|-------|
| `full` | `false` | `≡` | Full parallel — cùng nguồn gốc, nội dung tương đương |
| `full` | `true` | `≈` | Resembling parallel — tương đồng một phần |
| `mention` | `false` | `→` | Văn bản này nhắc đến văn bản kia |
| `retelling` | `false` | `↺` | Cùng sự kiện, kể lại khác nhau |

---

## Tools

### Tool 1: `search_topic`

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

**Lưu ý:** Tìm bằng tiếng Việt: truyền `language` = `vi` để khớp tiêu đề tiếng Việt, và `selectedLanguages` có `vi` để có bản dịch tiếng Việt trong `hits`. `total` là số đếm xấp xỉ của SC, không phải tín hiệu còn trang sau; muốn biết còn kết quả thì gọi lại với `offset` lớn hơn và xem có mục mới không.

---

### Tool 2: `get_sutta`

**Mục đích:** Lấy toàn văn một sutta theo UID để Claude đọc và trích dẫn.

**Input:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `uid` | string | Có | UID của sutta, ví dụ `mn10`, `sn56.11` |
| `translator` | string | Không | ID dịch giả. Mặc định: `sujato` |
| `max_segments` | number | Không | Giới hạn số đoạn trả về. Mặc định: `50` |

**Output:** Toàn văn sutta kèm citation header và link. Mỗi đoạn in kèm segment ID nguyên văn từ key của Bilara, dạng `[mn10:1.1] So I have heard.`. Header có thêm một dòng `Deep link: https://suttacentral.net/{uid}/{lang}/{translator}#<segment_id>`, trong đó `{lang}` là lang thực sự đã phục vụ bản dịch; nối segment ID vào sau `#` để được link cuộn tới đúng đoạn (spec `segment-id-in-get-sutta`).

**Nguồn dữ liệu:** `GET /api/bilarasuttas/{uid}/{translator}`, gọi lại một lần kèm `?lang=` khi bản dịch không phải tiếng Anh (spec `bilara-lang-param`)

---

### Tool 3: `get_sutta_meta`

**Mục đích:** Lấy metadata của một sutta — dùng khi chỉ cần thông tin tổng quan, không cần toàn văn.

**Input:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `uid` | string | Có | UID của sutta |
| `language` | string | Không | Ngôn ngữ cho blurb và tiêu đề. Mặc định: `en` |

**Output:** Tên, blurb, độ khó, ngôn ngữ gốc, số parallels, danh sách bản dịch có sẵn, link.

**Nguồn dữ liệu:** `GET /api/suttaplex/{uid}?language={lang}`

---

### Tool 4: `get_parallels`

**Mục đích:** Lấy danh sách parallels của một sutta — cho thấy cùng một giáo lý xuất hiện nhất quán qua nhiều truyền thống.

**Input:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `uid` | string | Có | UID của sutta gốc |

**Output:** Danh sách parallels kèm loại (full/resembling/mention/retelling), UID, link.

**Nguồn dữ liệu:** `GET /api/parallels/{uid}`

---

### Tool 5: `list_divisions`

**Mục đích:** Liệt kê các divisions (bộ kinh) trên SuttaCentral, có thể lọc theo pitaka. Cho phép Claude và người dùng biết có những bộ kinh nào mà không cần đoán.

**Input:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `pitaka` | `"sutta" \| "vinaya" \| "abhidhamma"` | Không | Lọc theo tạng. Nếu bỏ trống → trả về tất cả |

**Output:** Danh sách divisions, nhóm theo pitaka, mỗi division gồm: `uid`, `name`, `pitaka`, `tradition`, `language`.

**Nguồn dữ liệu:** Hardcode trong MCP — không gọi API. Data gần như bất biến.

**Behavior:**
- Có `pitaka` → chỉ trả về divisions thuộc tạng đó
- Không có `pitaka` → trả về tất cả, nhóm theo pitaka

**Ví dụ output:**
```
Sutta Pitaka:
  • dn  — Dīgha Nikāya          (Pali, Theravada)
  • mn  — Majjhima Nikāya       (Pali, Theravada)
  • sn  — Saṃyutta Nikāya       (Pali, Theravada)
  • an  — Aṅguttara Nikāya      (Pali, Theravada)
  • kn  — Khuddaka Nikāya       (Pali, Theravada)
  • da  — Dīrghāgama            (Chinese, Dharmaguptaka)
  • ma  — Madhyamāgama          (Chinese, Sarvāstivāda)
  • sa  — Saṃyuktāgama          (Chinese, Sarvāstivāda)
  • ea  — Ekottarikāgama        (Chinese, Mahāsāṃghika)

Vinaya Pitaka:
  • pli-tv-vi — Theravāda Vinayapiṭaka   (Pali, Theravada)
  • lzh-dg-vi — Dharmaguptaka Vinaya     (Chinese, Dharmaguptaka)
  ...
```

---

## Luồng hoạt động điển hình

```
Người dùng: "Đức Phật dạy gì về chánh niệm?"
     ↓
Claude gọi search_topic({"query": "niệm xứ", "language": "vi"})
     ↓
Trả về: các sutta khớp tiêu đề tiếng Việt, trong đó mn10 (Kinh Niệm xứ), dn22, sn43.5, ma98, mỗi mục kèm link SuttaCentral
     ↓
Claude gọi get_sutta("mn10", "sujato")
     ↓
Claude gọi get_parallels("mn10")
     ↓
Trả về: ma98 (Hán tạng), D 248 (Tạng ngữ)
     ↓
Claude trả lời có trích dẫn + link suttacentral.net/mn10
```

---

## Constraints

**Cache:** Prototype không cache — mọi API call đều real-time, fetch trực tiếp mỗi lần gọi tool. Chiến lược cache cho production xem mục "Hướng nâng cấp".

**Chain đến nguồn được đảm bảo bằng:**
- Mọi response đều kèm **link `suttacentral.net/{uid}`**
- Production: mọi trích dẫn kèm **segment ID** (ví dụ `mn1:2.3`) liên kết trực tiếp đến SC. Hiện trạng: `get_sutta` in segment ID cho từng đoạn kèm dòng `Deep link:` (mục 5 của "Hướng nâng cấp"); các tool khác vẫn citation ở mức sutta UID + link.

- **Không dùng data để train** — Sutta MCP không phải training pipeline
- **Không scrape hoặc tích lũy** nội dung SC thành dataset phục vụ training AI hoặc xây dựng corpus độc lập không có chain đến nguồn
- **Rate limiting:** Mỗi tool call chỉ fetch đúng những gì cần
- **Ngôn ngữ:** Output hỗ trợ cả tiếng Anh và tiếng Việt
- **Attribution:** Mọi nội dung đều ghi rõ nguồn (SuttaCentral), dịch giả, và UID

---

## Hướng nâng cấp (sau prototype)

1. **Dynamic search** — **đã thực hiện** (spec `dynamic-search`), rồi thay bằng wrapper mỏng (spec `search-api-passthrough`). `search_topic` nhận đúng tham số của `GET /api/search/instant` cộng `format` (`text`/`json`) và in response theo thứ tự SC, không lọc. Lý do và số đo: `specs/search-api-passthrough/`.

2. **Tiếng Việt** — **đã thực hiện phần lấy bản dịch** (spec `non-segmented-translation-guard`, `bilara-lang-param`). `get_sutta` truyền `?lang=` cho `/api/bilarasuttas/`; khi bản dịch được yêu cầu không có `translation_text` (ví dụ bản legacy `minh_chau`, `indacanda`), tool báo rõ và liệt kê bản dịch khác, không tự chuyển sang tiếng Anh hay Pali. Cơ chế và số đo: hai spec trên.

3. **Cross-tradition search** — **đã bỏ (2026-10-24).** Tự fetch parallels cho kết quả tìm kiếm trái chủ trương `search_topic` khớp đúng API và trái Constraints "Mỗi tool call chỉ fetch đúng những gì cần". Claude đã ghép được `search_topic` với `get_parallels`.
4. **Public hosting** — deploy lên Cloudflare Workers hoặc Railway để cộng đồng dùng không cần cài đặt. **Điều kiện:** server hiện chỉ có transport stdio (`StdioServerTransport`), tức chạy như tiến trình con của client; host công khai cần thêm một transport HTTP của MCP. Làm cùng mục 6: cache dùng chung giữa nhiều user cần store bền.
5. **Segment ID trong `get_sutta` output** — **đã thực hiện (2026-10-02, spec `segment-id-in-get-sutta`).** `get_sutta` in segment ID trước mỗi đoạn (`[mn10:1.1] So I have heard.`) và một dòng `Deep link:` dạng `suttacentral.net/{uid}/{lang}/{translator}#{segment_id}`.
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
   | Divisions list | Không áp dụng ở dạng hardcode hiện tại (không qua API nên không có ETag). Có đường chuyển sang API-backed — xem mục 7. |

   **Phụ thuộc:** stdio hiện tại là 1 process/1 user nên in-memory Map chạy đúng, nhưng chỉ có ích cục bộ. Cloudflare Workers không giữ biến JS giữa các request — cần Workers KV. Giá trị thật của store bền ở mục 4 là **chia sẻ cache giữa nhiều user đồng thời** (ví dụ nhiều người cùng hỏi `mn10` chỉ fetch 1 lần), không phải để sống sót qua restart.

   **Giới hạn (theo Constraints "không tích lũy nội dung SC"):** cache chỉ là bản sao tạm thời của response để tránh gọi lặp lại, không phải kho nội dung. Store phải có giới hạn dung lượng (đẩy mục cũ ra khi đầy) và thời hạn tồn tại tối đa cho mỗi mục; chỉ ghi khi có tool call của người dùng, không prefetch hay làm ấm cache hàng loạt; không có đường nào liệt kê, xuất hay tái dùng nội dung cache ngoài việc trả lời chính lời gọi đó.

7. **Dynamic divisions list** — thay `DIVISIONS` hardcode bằng API thật `GET /api/menu` (root pitakas) + `GET /api/menu/{uid}` (mở rộng từng nhóm con), xác nhận sống có cùng `ETag` + `Cache-Control: max-age=172800` như các endpoint khác nên áp dụng được chiến lược cache ở mục 6.

   **Không đơn giản như các data khác — 2 rào cản:**
   - **Cây phân cấp lười (lazy tree), không phẳng.** `/api/menu` chỉ trả 1 cấp con: với pitaka `sutta`, cấp con là nhóm UI (`long`, `middle`, `linked`, `numbered`, `minor`, `other-group`), không phải UID division thật (`dn`, `mn`, `sn`...). Phải gọi tiếp `GET /api/menu/{group-uid}` (ví dụ `/api/menu/long` → trả `dn`, `da`, `da-ot`) mới ra danh sách division thật. Dựng lại đủ 1 pitaka cần nhiều lệnh gọi, không phải 1.
   - **Không có field `tradition`.** API trả `uid`, `root_name`, `translated_name`, `root_lang_iso`, `root_lang_name`, `blurb` — nhưng cột `tradition` (Theravada/Dharmaguptaka/Sarvāstivāda...) hiện tại là domain knowledge tự thêm tay, không tồn tại trong response. Chuyển sang API vẫn cần giữ một bảng tra cứu nhỏ `uid → tradition` riêng.

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

   Tức "biến động cực kỳ hiếm" (dòng ~43) đúng với UID kinh/luận chính (`dn`, `mn`, `ds`...) nhưng không đúng với vinaya — SC đã tái cấu trúc UID vinaya (hậu tố `-vi`). Rủi ro drift tập trung ở các phần SC còn tái tổ chức; đây là lý do nên coi `list_divisions` API-backed là một hạng mục nâng cấp thật, không chỉ lý thuyết.

### Việc mở đã ghi nhận (GitHub issues)

Lỗi và cải tiến tìm thấy khi chạy thử end-to-end trên `5459d5a` (2026-10-18, đo lại 2026-10-19); phạm vi thu hẹp ngày 2026-10-24. Chi tiết và số đo nằm trong từng issue; bảng này chỉ nối issue với mục roadmap liên quan. Issue đã đóng không ghi ở đây.

| Issue | Tool | Tóm tắt | Liên quan |
|---|---|---|---|
| [#16](https://github.com/nbkhoi/sutta-mcp/issues/16) (bug) | `get_parallels` | Vòng lặp `Object.values(data)` bỏ mất anchor nguồn (`dn22`, `dn22#18.1`, …) nên parallels toàn bài và từng đoạn bị trộn thành một danh sách, trông như trùng lặp hoặc mâu thuẫn. Cần nhóm theo anchor, giữ đủ 27 mục của DN 22. | — |
| [#19](https://github.com/nbkhoi/sutta-mcp/issues/19) (enhancement) | `get_sutta_meta` | Với `language=vi`, SC trả tiêu đề tiếng Việt nhưng blurb tiếng Anh; output không nói rõ. Cần gắn nhãn blurb tiếng Anh. Đo trước xem SC có blurb tiếng Việt nào không: nếu không có, chỉ cần một nhãn cố định. | mục 2 |
| [#20](https://github.com/nbkhoi/sutta-mcp/issues/20) (enhancement) | `get_sutta_meta`, `formatCitation()` | Bản dịch legacy trông như trùng (cùng `author_uid`) và không cho biết `get_sutta` không lấy được nó; `Difficulty: unknown` in khi SC không có difficulty. | — |

**Thứ tự ưu tiên.** Tiêu chí: thiếu nó thì Claude hiểu sai kinh văn, trích dẫn sai, hoặc không biết một giới hạn có thật.

1. #16 — Claude đọc sai quan hệ parallels. Độc lập.
2. #19 — vi phạm nguyên tắc "không ngụy tạo bản dịch, nói rõ giới hạn". Độc lập.
3. #20 — cho Claude biết trước bản dịch nào `get_sutta` lấy được, và bỏ nhiễu trên mọi trích dẫn. Độc lập; cùng sửa output `get_sutta_meta` với #19.
4. Mục 7 — UID division lệch với SC làm hỏng đường dẫn về nguồn. Độc lập.
5. Mục 4 cùng mục 6 — mở rộng phạm vi người dùng, không phải điều kiện để trả lời đúng. Cần transport HTTP và store bền.
