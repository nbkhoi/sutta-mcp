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

| UID | Tên | Truyền thống | Ngôn ngữ gốc |
|-----|-----|-------------|-------------|
| `pli-tv` | Theravāda Vinaya | Theravada | Pali (`pli`) |
| `lzh-mg` | Mahāsāṃghika Vinaya | Mahāsāṃghika | Chinese (`lzh`) |
| `lzh-ms` | Mūlasarvāstivāda Vinaya | Mūlasarvāstivāda | Chinese (`lzh`) |
| `lzh-dg` | Dharmaguptaka Vinaya | Dharmaguptaka | Chinese (`lzh`) |
| `lzh-sv` | Sarvāstivāda Vinaya | Sarvāstivāda | Chinese (`lzh`) |
| `lzh-ks` | Mahīśāsaka Vinaya | Mahīśāsaka | Chinese (`lzh`) |

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

### SuttaCentral API endpoints

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/suttaplex/{uid}?language={lang}` | Metadata của một sutta hoặc toàn bộ một division |
| `GET /api/bilarasuttas/{uid}/{translator}` | Toàn văn sutta (segmented) |
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

**Output:** Toàn văn sutta kèm citation header và link.

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
  • pli-tv — Theravāda Vinaya   (Pali, Theravada)
  • lzh-dg — Dharmaguptaka Vinaya (Chinese, Dharmaguptaka)
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

### Cache

Cache tối đa được khuyến khích — vì tính đúng đắn nội dung không đến từ việc "có fetch API hay không", mà đến từ kiến trúc đảm bảo chain đến nguồn luôn hiện diện trong mọi response.

**Prototype:** In-memory Map đơn giản — cache kết quả suttaplex và bilara text trong bộ nhớ process. Không cần TTL, invalidation, hay external storage. Cache tồn tại trong vòng đời của process, mất khi restart.

**Production:**

| Loại data | Chiến lược cache | Lý do |
|-----------|-----------------|-------|
| Root text Pali (Mahāsaṅgīti) | Vĩnh viễn | Bất biến theo học thuật |
| Divisions list | Vĩnh viễn (hardcode) | Biến động cực kỳ hiếm |
| Bilara segments (nội dung sutta) | Dài hạn + checksum | Hiếm thay đổi, cần validate |
| SuttaPlex metadata (blurb, parallels) | TTL vài ngày | Có thể cập nhật |
| Search results | TTL vài giờ | Thay đổi thường xuyên hơn |

Cache production được validate bằng **checksum** đồng bộ với bilara-data repo khi cần.

**Chain đến nguồn được đảm bảo bằng:**
- Mọi response đều kèm **link `suttacentral.net/{uid}`** — dù data đến từ cache hay API
- Production: mọi trích dẫn kèm **segment ID** (ví dụ `mn1:2.3`) liên kết trực tiếp đến SC. Prototype: citation ở mức sutta UID + link.

**Giới hạn:** Không scrape hoặc tích lũy nội dung SC thành dataset phục vụ training AI hoặc xây dựng corpus độc lập không có chain đến nguồn.

### Các constraints khác

- **Không dùng data để train** — Sutta MCP không phải training pipeline
- **Rate limiting:** Mỗi tool call chỉ fetch đúng những gì cần, ưu tiên đọc từ cache trước
- **Ngôn ngữ:** Output hỗ trợ cả tiếng Anh và tiếng Việt
- **Attribution:** Mọi nội dung đều ghi rõ nguồn (SuttaCentral), dịch giả, và UID

---

## Hướng nâng cấp (sau prototype)

1. **Dynamic search** — thay `TOPIC_INDEX` tĩnh bằng Elasticsearch của SuttaCentral
2. **Tiếng Việt** — tích hợp bản dịch tiếng Việt khi có trên SC, fallback sang tiếng Anh. **Lưu ý:** Bản dịch tiếng Việt hiện tại trên SC (ví dụ `minh_chau`) là non-segmented — bilara API (`/api/bilarasuttas`) không phục vụ được. Cần dùng API endpoint khác cho legacy text hoặc chờ SC xuất bản bản dịch segmented tiếng Việt.
3. **Cross-tradition search** — khi tìm một chủ đề, tự động fetch parallels và trả về kết quả từ nhiều truyền thống
4. **Public hosting** — deploy lên Cloudflare Workers hoặc Railway để cộng đồng dùng không cần cài đặt
5. **Segment ID trong `get_sutta` output** — Bilara API trả về segment ID dạng `mn10:1.1` làm key. Production nên include segment ID trong output để hỗ trợ deep-link đến `suttacentral.net/{uid}#{segment_id}`.
