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

**Mục đích:** Tìm các sutta liên quan đến một chủ đề Phật pháp. Entry point chính của người dùng.

**Input:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `topic` | string | Có | Chủ đề cần tìm, tiếng Anh hoặc tiếng Việt |
| `language` | string | Không | Ngôn ngữ cho blurb. Mặc định: `en` |

**Output:** Danh sách sutta kèm citation chuẩn, blurb, link SuttaCentral.

**Nguồn dữ liệu:** Topic index tĩnh (hardcode) trong prototype. Nâng cấp sau bằng dynamic search.

**Lưu ý:** Topic index cần hỗ trợ cả tiếng Anh lẫn tiếng Việt.

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

**Nguồn dữ liệu:** `GET /api/bilarasuttas/{uid}/{translator}`

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
Claude gọi search_topic("chánh niệm")
     ↓
Trả về: mn10, sn47.1, dn22 + blurb
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
- Production: mọi trích dẫn kèm **segment ID** (ví dụ `mn1:2.3`) liên kết trực tiếp đến SC. Prototype: citation ở mức sutta UID + link.

- **Không dùng data để train** — Sutta MCP không phải training pipeline
- **Không scrape hoặc tích lũy** nội dung SC thành dataset phục vụ training AI hoặc xây dựng corpus độc lập không có chain đến nguồn
- **Rate limiting:** Mỗi tool call chỉ fetch đúng những gì cần
- **Ngôn ngữ:** Output hỗ trợ cả tiếng Anh và tiếng Việt
- **Attribution:** Mọi nội dung đều ghi rõ nguồn (SuttaCentral), dịch giả, và UID

---

## Hướng nâng cấp (sau prototype)

1. **Dynamic search** — thay `TOPIC_INDEX` tĩnh bằng Elasticsearch của SuttaCentral
2. **Tiếng Việt** — tích hợp bản dịch tiếng Việt khi có trên SC, fallback sang tiếng Anh.

   **Cơ chế thật (đã xác minh):** với dịch giả tiếng Việt, `/api/bilarasuttas/{uid}/{translator}` trả **HTTP 200** với body chứa `html_text`, `root_text`, `variant_text`, `reference_text`, `keys_order` — và **không có** `translation_text`. Lời gọi API không hỏng; thất bại trước đây nằm ở phía Sutta MCP: `extractText()` fallback im lặng sang `root_text` khi thiếu `translation_text`, khiến `get_sutta` in văn bản Pali dưới tên dịch giả Việt. Lỗi này đã được guard trong spec `non-segmented-translation-guard` — khi thiếu `translation_text`, tool báo rõ và liệt kê dịch giả thay thế thay vì thay thân văn bản.

   **Hiện trạng ba dịch giả tiếng Việt trên SC:**
   - `minh_chau` — legacy, `segmented=false`, `/api/bilarasuttas/` không trả `translation_text`.
   - `indacanda` — legacy, `segmented=false`, tương tự.
   - `phantuananh` — Dhammapada (`text_uid: dhp`), **`segmented=true` và đã xuất bản** (scpub43, `is_published: true`), có source trong `bilara-data/translation/vi/phantuananh/sutta/kn`. `/api/bilarasuttas/` **có trả** `translation_text` khi truyền đúng `?lang=vi` — `dhp1-20`: 108 đoạn, `dhp21-32`: 63 đoạn (đo 2026-08-09); thiếu `?lang=vi` thì thiếu key. Riêng UID gộp `dhp` không phải đơn vị phục vụ của endpoint với **bất kỳ** dịch giả nào (kể cả `sujato` — body chỉ có key `msg`), không phải chuyện riêng của `phantuananh`.

   Khi truyền đúng `lang`, mọi case đã đo khớp với cờ `segmented`: `segmented=true` → phục vụ (`sujato`, `phantuananh`, `sabbamitta`); `segmented=false` → không (`minh_chau`, `indacanda`). Mẫu 5 dịch giả — bảo lưu mẫu nhỏ, chưa phải bảo đảm hai chiều; guard của `get_sutta` vẫn khóa vào response thực tế, không khóa vào cờ.

   **Ghi chú phân biệt:** `minh_chau` (legacy, non-segmented) và `phantuananh` (segmented) là **hai `author_uid` khác nhau cùng ghi công Thích Minh Châu** — đúng chỗ dễ nhầm mà output của bug cũ tạo ra (`Translator: Bhikkhu Thích Minh Châu (phantuananh)` in trên văn bản Pali).

   **Đã có lời giải (2026-08-09, spec `bilara-lang-param`):** website render `dhp1-20/vi/phantuananh` được vì nó truyền `lang` cho backend; `/api/bilarasuttas/` mặc định tiếng Anh khi thiếu query param — `lang = request.args.get('lang', 'en')` (`server/src/api/views/views.py:1058`; câu code là neo chính, số dòng upstream có thể trôi). Fix phía Sutta MCP: `fetchBilaraText()` truyền `?lang=` lấy từ `suttaplex.translations[].lang` — xem `specs/bilara-lang-param/`.

3. **Cross-tradition search** — khi tìm một chủ đề, tự động fetch parallels và trả về kết quả từ nhiều truyền thống
4. **Public hosting** — deploy lên Cloudflare Workers hoặc Railway để cộng đồng dùng không cần cài đặt
5. **Segment ID trong `get_sutta` output** — **đã thực hiện (2026-10-02, spec `segment-id-in-get-sutta`).** Bilara API trả về segment ID dạng `mn10:1.1` làm key; `get_sutta` in mỗi đoạn kèm ID nguyên văn (`[mn10:1.1] So I have heard.`) và thêm một dòng header `Deep link:`. Dạng deep-link cuộn tới đúng đoạn là `suttacentral.net/{uid}/{lang}/{translator}#{segment_id}`, ví dụ `https://suttacentral.net/mn10/en/sujato#mn10:1.1`, với `{lang}` là lang thực sự đã phục vụ bản dịch. Trang cấp sutta `suttacentral.net/{uid}` là trang thẻ suttaplex, không có phần tử đoạn nào để cuộn tới.
6. **Cache strategy** — dựa trên HTTP caching header mà chính SuttaCentral API đã trả về (xác nhận bằng live request tới `bilarasuttas` và `suttaplex`): `ETag` (weak) + `Cache-Control: max-age=172800, must-revalidate, proxy-revalidate`. Không cần tự tính checksum hay đồng bộ với bilara-data repo — SC đã tự làm việc này, tự chế thêm là trùng lặp và dễ lệch khi cấu trúc repo đổi.

   **Cache entry:** `{ uid, translator, data, etag, cachedAt }`

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
   | Search results | TTL vài giờ (không có endpoint SC tương ứng để lấy ETag) |
   | Divisions list | Không áp dụng ở dạng hardcode hiện tại (không qua API nên không có ETag). Có đường chuyển sang API-backed — xem mục 7. |

   **Phụ thuộc:** stdio hiện tại là 1 process/1 user nên in-memory Map chạy đúng, nhưng chỉ có ích cục bộ. Cloudflare Workers không giữ biến JS giữa các request — cần Workers KV. Giá trị thật của store bền ở mục 4 là **chia sẻ cache giữa nhiều user đồng thời** (ví dụ nhiều người cùng hỏi `mn10` chỉ fetch 1 lần), không phải để sống sót qua restart.

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
