# Requirements: Segment ID trong output của `get_sutta`

**Status:** Reviewed
**Created:** 2026-10-02
**Spec slug:** segment-id-in-get-sutta
**Tiền nhiệm (ràng buộc hình dạng diff):** `specs/non-segmented-translation-guard/` (khối N1), `specs/bilara-lang-param/` (khối N3).

## Context & Goal

### Yêu cầu gốc

Roadmap mục 5 (`specs/sutta-mcp-requirements.md:308`): *"Segment ID trong `get_sutta` output — Bilara API trả về segment ID dạng `mn10:1.1` làm key. Production nên include segment ID trong output để hỗ trợ deep-link đến `suttacentral.net/{uid}#{segment_id}`."* Constraints của master spec (`:278`): *"Production: mọi trích dẫn kèm **segment ID** (ví dụ `mn1:2.3`) liên kết trực tiếp đến SC. Prototype: citation ở mức sutta UID + link."*

Mục tiêu: Claude (caller của tool) nhận được, cho **mỗi đoạn văn** mà `get_sutta` trả về, segment ID gốc của SuttaCentral và một dạng URL deep-link **thực sự cuộn tới đoạn đó** trên website — để câu trả lời trích dẫn được ở mức đoạn, không chỉ mức kinh.

### Hiện trạng (đọc code, `src/index.ts` tại `fc5c002`)

- `extractText()` (`src/index.ts:119-137`) duyệt `Object.values(translation_text)` — **bỏ key**, chỉ giữ chuỗi đã `.trim()` và không rỗng. Segment ID bị mất ngay tại đây; không có đường nào khác trong handler đọc lại key.
- Handler `get_sutta` (`:246-299`) cắt `lines.slice(0, max_segments)` và in mỗi đoạn một dòng trần, không tiền tố. Header có `URL: https://suttacentral.net/{uid}` từ `formatCitation()` (`:145`) và dòng `Translator: ...` (`:288`). Tail là `[... văn bản bị cắt sau N đoạn. Tổng: M đoạn. ...]` hoặc `[Hết văn bản — M đoạn]` (`:294-295`).
- Nhánh guard (`:267-276`) trả `formatUnavailable()` — không có thân văn bản.
- Lang thực sự phục vụ bản dịch: lời gọi đầu không truyền `lang` (upstream mặc định `en` — `lang = request.args.get('lang', 'en')`, `views.py:1058`, theo spec `bilara-lang-param`); nếu miss thì gọi lại với `retryLang` (`:260-265`). Handler hiện **không giữ** giá trị lang nào ra ngoài khối retry.
- Hai khối code là **normative nguyên văn** ở spec trước: thân `extractText()` (N1-A, `specs/non-segmented-translation-guard/design.md` §`extractText()`) và khối retry (N3-B, `specs/bilara-lang-param/design.md:108`). Emit segment ID gần như chắc chắn buộc đụng ít nhất N1-A, vì đó là nơi duy nhất đọc `translation_text` và hiện vứt key.

### Hình dạng API (đo live 2026-10-02)

| Lời gọi | Key `translation_text` | Đoạn không rỗng sau `.trim()` | Đoạn 1 | Đoạn 50 |
|---|---|---|---|---|
| `mn10/sujato?lang=en` | 235 | 194 | `mn10:0.1` → `Middle Discourses 10` | `mn10:13.1` → `And so they meditate observing an aspect of the body internally …` |
| `dhp1-20/phantuananh?lang=vi` | 108 | 108 | `dhp1:0.1` → `Tiểu Bộ Kinh` | `dhp9:0` → `Chuyện Devadatta (Đề-bà-đạt-đa)` |
| `mn10/sabbamitta?lang=de` | 235 | 200 | `mn10:0.1` → `Mittlere Lehrreden 10` | `mn10:12.0` → `1.5. Den Geist auf die Elemente richten` |
| `mn10/trush?lang=gu` | — | 230 | `mn10:0.1` → `મજ્જ઼િમ નિકાય ૧૦` | — |

Sự kiện rút ra:

1. **Key chính là segment ID đầy đủ**, dạng `{text_uid}:{số}` — không cần tái tạo. Thứ tự key trong object trùng thứ tự `keys_order` (lọc theo key có mặt) trên cả ba response đo.
2. **Với UID khoảng (range), tiền tố segment ID khác UID yêu cầu**: `dhp1-20` cho key `dhp1:0.1` … `dhp20:7`. Segment ID phải lấy nguyên từ key, không được ghép từ `uid` của request.
3. **Segment ID không luôn có dấu chấm**: `dhp9:0`.
4. **Có đoạn rỗng ở bản dịch nhưng không rỗng ở root**: `mn10:3.6`, `mn10:4.9`, `mn10:4.10`… (41 key rỗng trên `mn10/sujato`; ví dụ `mn10:3.6` dịch `''`, root `Uddeso niṭṭhito. `). Các đoạn này hiện bị lọc; ID của chúng do đó vắng mặt trong output — dãy ID sẽ có "lỗ".
5. **Giá trị không duy nhất**: `mn10/sujato` có 194 đoạn không rỗng nhưng chỉ 167 giá trị khác nhau — không thể tra ngược ID từ text; ID phải được ghép cặp ngay lúc đọc key.
6. **Số key `mn10/sujato` đã trôi**: 235 (đo 2026-10-02) so với 233 (đo 2026-08-09); số đoạn không rỗng vẫn 194. Body nay có thêm key `comment_text`. Không ảnh hưởng tail đã pin (đếm sau lọc).

### Dạng deep-link — roadmap ghi sai dạng

Đọc source client SuttaCentral (`suttacentral/suttacentral`, nhánh `main`, commit `34391d1`, 2026-09-29):

- Route (`client/elements/sc-page-selector.js:303-311`): `'/:suttaId/:langIsoCode/:authorUid'` → trang **văn bản** (`sutta`); `'/:categoryId'` → `<sc-suttaplex-list />` (trang **thẻ suttaplex**, không render thân văn bản). Tức `suttacentral.net/mn10` là trang tổng quan, **không có phần tử đoạn nào để cuộn tới**.
- Trang văn bản gắn mỗi đoạn một `<span class="segment" id="${key}">` với `key` là segment ID đầy đủ (`client/elements/text/sc-text-page-selector.js:518-520`).
- Handler hash (`client/elements/text/sc-text-bilara.js:88-91`, `:477-492`): lấy `location.hash.slice(1).split('--')[0]`, `querySelector('#' + CSS.escape(hash))`, `scrollIntoView()` và gắn class `refFocused`. Handler được gọi lại sau khi render (`:327`, `:1135`).
- Website còn sinh anchor tham chiếu ngắn `#1.1` (`_addSCReferenceAnchor`, `:1063-1077`) — nhưng với UID khoảng không thỏa `checkIfMultiSutta` (`:209-228`, đòi có dấu `.`; `dhp1-20` không có), anchor ngắn là phần **sau** dấu `:` (`0.1`), trùng nhau giữa `dhp1`…`dhp20`. Dạng ID đầy đủ không có va chạm này.

Kết luận: dạng deep-link hoạt động là **`https://suttacentral.net/{uid}/{lang}/{translator}#{segment_id}`** (ví dụ `https://suttacentral.net/mn10/en/sujato#mn10:1.1`), không phải `suttacentral.net/{uid}#{segment_id}` như roadmap ghi. Dấu `:` hợp lệ trong fragment URI (RFC 3986 §3.5: `fragment = *( pchar / "/" / "?" )`, `pchar` gồm `":"`) — không cần percent-encode. Kết luận này dựa trên đọc source; chưa mở trong trình duyệt (xem Assumptions, AC-7 kiểm thủ công).

## Stakeholders

- **Primary users:** Claude, caller của `get_sutta` — cần ID đoạn để trích dẫn chính xác và dựng link tới đúng đoạn.
- **Secondary users:** người dùng cuối (Việt/Anh) đọc câu trả lời của Claude — bấm link là tới đúng đoạn được trích, kiểm chứng được nguồn.
- **Operators / maintainers:** tác giả spec — giữ đồng bộ các khối normative N1/N3 của hai spec trước và sửa mô tả sai dạng deep-link trong master spec.

## Functional Requirements

- **FR-1: Mỗi dòng thân văn bản mang segment ID của nó.** Trên đường bình thường (sau gate `extracted.source !== "translation"`), mỗi đoạn được in kèm segment ID **nguyên văn từ key** của `translation_text` ứng với đúng giá trị đó. Định dạng (quyết định D1): `[{segment_id}] {text}` — ngoặc vuông, một dấu cách, rồi text — ví dụ `[mn10:1.1] So I have heard.`. Không suy ID từ `uid` request, không đánh số lại, không tra ngược từ text.

- **FR-2: Tập đoạn và thứ tự không đổi.** Tập đoạn được in và thứ tự của chúng giữ y như hiện nay: chỉ các giá trị chuỗi không rỗng sau `.trim()`, theo thứ tự duyệt key của `translation_text`, giá trị in ra đã `.trim()`. Đoạn rỗng bị lọc thì ID của nó cũng không xuất hiện. Phần text sau tiền tố ID phải trùng từng byte với dòng mà phiên bản hiện tại in ra.

- **FR-3: Tương tác với `max_segments`.** `max_segments` vẫn đếm **đoạn được in** (sau lọc), không đếm key. Output chứa đúng `min(max_segments, tổng)` dòng thân, mỗi dòng có ID; tổng `M` trong tail vẫn là số đoạn sau lọc. Hai chuỗi tail (`[... văn bản bị cắt sau ...]`, `[Hết văn bản — M đoạn]`) giữ nguyên từng byte — không thêm ID đoạn cuối hay đoạn tiếp theo vào tail.

- **FR-4: Dạng deep-link trong header.** Header của đường bình thường có thêm thông tin đủ để dựng deep-link cho mọi đoạn theo dạng `https://suttacentral.net/{uid}/{lang}/{translator}#{segment_id}`, trong đó:
  - `{uid}` là UID request (cũng là UID trong dòng `URL:` của citation với mọi case đo);
  - `{translator}` là tham số `translator` của lời gọi;
  - `{lang}` là **lang thực sự đã phục vụ** `translation_text` được in: `en` khi lời gọi bilara đầu (không `lang`) trả nội dung — theo mặc định upstream; `retryLang` khi nội dung đến từ lời gọi retry (với `mn10`/`trush` là `gu` theo luật tie-break của `specs/bilara-lang-param/design.md`).
  Theo quyết định D2: header có **đúng một** dòng chứa tiền tố URL `https://suttacentral.net/{uid}/{lang}/{translator}#`, kèm chỉ dẫn nối segment ID vào sau. Dòng thân **không** chứa URL. Design chốt chữ chính xác của dòng này. Ví dụ stakeholder đưa ra: `Deep link: https://suttacentral.net/mn10/en/sujato#<segment_id>`.

- **FR-5: Giữ dòng citation hiện có.** Dòng `URL: https://suttacentral.net/{uid}` (từ `formatCitation()`) và dòng `Translator: {name} ({translator})` vẫn có mặt, không đổi chữ. Dạng deep-link của FR-4 là bổ sung, không thay thế.

- **FR-6: Nhánh guard không đổi.** Khi `get_sutta` đi vào nhánh `formatUnavailable()` (legacy `minh_chau`, `indacanda`; UID không phục vụ như `dhp`; translator sai), output giữ nguyên từng byte như hiện nay: không segment ID, không dòng deep-link (không có văn bản nào để link tới), không root text. `formatUnavailable()` không sửa.

- **FR-7: Đồng bộ khối normative.** Nếu thay đổi buộc đụng thân `extractText()` (N1-A), dòng gate (N1-B) hoặc khối retry (N3-B):
  - ngữ nghĩa gate giữ nguyên: `source` quyết định bằng việc `translation_text` có ít nhất một giá trị không rỗng sau `.trim()`; không chuyển sang đếm key; gate vẫn rẽ bằng `extracted.source`;
  - khối normative tương ứng trong `specs/non-segmented-translation-guard/design.md` và/hoặc `specs/bilara-lang-param/design.md` phải được cập nhật **trong cùng thay đổi**, khớp từng byte với `src/index.ts`, kiểm bằng `diff` (không bằng grep);
  - `design.md` của spec này ghi khối nào bị đụng và lý do.
  Khối nào không cần đụng thì giữ nguyên từng byte.

- **FR-8: Sửa master spec cho đúng sự thật.** Trong `specs/sutta-mcp-requirements.md`:
  - (a) roadmap mục 5 (`:308`): thay dạng `suttacentral.net/{uid}#{segment_id}` bằng dạng đã xác lập `suttacentral.net/{uid}/{lang}/{translator}#{segment_id}`, ghi đã thực hiện và trỏ slug `segment-id-in-get-sutta`;
  - (b) mục **Output** của Tool 2 (`:174`): nêu mỗi đoạn kèm segment ID và header kèm dạng deep-link.
  Không sửa dòng Constraints `:278` (nó mô tả mục tiêu production, nay được thỏa ở `get_sutta`).

## Non-Functional Requirements

- **NFR-1:** Không thêm dependency npm; `package.json` không đổi.
- **NFR-2:** Thay đổi code chỉ trong `src/index.ts`; không file mới trong `src/`; script verify tạm nằm ngoài repo và được xóa sau khi dùng.
- **NFR-3:** `npm run build` (tsc strict) thoát mã 0.
- **NFR-4: Không thêm request.** Số request tới SC mỗi lời gọi `get_sutta` không đổi so với hiện nay (2 trên đường thường, tối đa 3 khi retry), chỉ tới `/suttaplex/` và `/bilarasuttas/`. Segment ID và lang lấy từ dữ liệu đã fetch.
- **NFR-5:** Không đụng bốn tool còn lại, `TOPIC_INDEX`, `DIVISIONS`, `formatCitation()`, `formatUnavailable()`, schema input của `get_sutta`: không thêm tham số, segment ID luôn bật (quyết định D3).
- **NFR-6:** Chuỗi mới hướng người dùng theo quy ước tiếng Việt của dự án. Thuật ngữ kỹ thuật như `Deep link` được giữ tiếng Anh, như ví dụ của D2; ràng buộc dự án giữ nguyên (link `suttacentral.net`, tên dịch giả, không dùng nội dung SC để train).
- **NFR-7:** Các bất biến đếm của spec trước giữ nguyên: `grep -c 'segmented' src/index.ts` = 3; `grep -c -F 'sujato' src/index.ts` = 3; `grep -n -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/index.ts` = 0 hit (baseline đo 2026-10-02: 3 / 3 / 0). Định danh mới không được chứa chuỗi `segmented` (ví dụ `segmentId` thì được).

## Acceptance Criteria

### Harness

Tái dùng harness `/tmp/mcp-call.sh`, dựng lại từ heredoc tại `specs/non-segmented-translation-guard/requirements.md:180-196`, cùng ba luật vận hành của `specs/bilara-lang-param/requirements.md` §Harness: `npm run build` trước mỗi lần chạy; mỗi lần chạy phải có đúng 1 dòng chứa `"id":2` (thiếu là chạy hỏng, không phải pass); literal pin dưới đây đo live 2026-10-02 — nếu lệch, fetch lại endpoint trước khi kết luận regression. Xóa `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log` sau khi xong. "Dòng thân thứ k" đếm từ dòng đầu sau dòng trống kết thúc header.

Các literal dòng thân dưới đây dùng định dạng `[{id}] {text}` đã chốt (D1).

### AC-1: `mn10` + `sujato` — ID trên từng dòng, deep-link `en`

- **Maps to:** FR-1, FR-2, FR-4, FR-5
- **Given** `/api/bilarasuttas/mn10/sujato` trả 235 key / 194 đoạn không rỗng; đoạn 1 `mn10:0.1`, đoạn 3 `mn10:1.1`, đoạn 50 `mn10:13.1`
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"sujato"}'`
- **Then** dòng thân 1 là `[mn10:0.1] Middle Discourses 10`; dòng thân 3 là `[mn10:1.1] So I have heard.`; dòng thân 50 là `[mn10:13.1] And so they meditate observing an aspect of the body internally …`
- **And** mọi dòng thân (50 dòng) khớp regex `^\[mn10:[0-9][0-9.]*\] \S`
- **And** đúng **1** dòng output chứa `https://suttacentral.net/mn10/en/sujato#`, nằm trong header (trước dòng thân 1); không dòng thân nào chứa `https://` (D2)
- **And** vẫn chứa `URL: https://suttacentral.net/mn10` và `Translator: Bhikkhu Sujato (sujato)`
- **And** kết thúc bằng đúng `[... văn bản bị cắt sau 50 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`

### AC-2: UID khoảng — `dhp1-20` + `phantuananh`, ID khác tiền tố UID, lang `vi`

- **Maps to:** FR-1, FR-4
- **Given** `/api/bilarasuttas/dhp1-20/phantuananh?lang=vi` có key `dhp1:0.1` … `dhp20:7` (108 đoạn); không `lang` → thiếu `translation_text`, nên nội dung đến từ lời gọi retry với `vi`
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"dhp1-20","translator":"phantuananh"}'`
- **Then** dòng thân 1 là `[dhp1:0.1] Tiểu Bộ Kinh`; dòng thân 3 là `[dhp1:0.3] Phẩm Song Yếu`; dòng thân 50 là `[dhp9:0] Chuyện Devadatta (Đề-bà-đạt-đa)`
- **And** output **không** chứa `[dhp1-20:` (ID không được ghép từ UID request)
- **And** output chứa `https://suttacentral.net/dhp1-20/vi/phantuananh#`, **không** chứa `https://suttacentral.net/dhp1-20/en/`
- **And** kết thúc bằng đúng `[... văn bản bị cắt sau 50 đoạn. Tổng: 108 đoạn. Tăng max_segments để xem thêm.]`

### AC-3: Lang không phải `vi` qua retry — `sabbamitta` (`de`) và `trush` (`gu`)

- **Maps to:** FR-1, FR-4
- **When** chạy `get_sutta` với `{"uid":"mn10","translator":"sabbamitta"}` rồi `{"uid":"mn10","translator":"trush"}`
- **Then** (sabbamitta) dòng thân 50 là `[mn10:12.0] 1.5. Den Geist auf die Elemente richten`; output chứa `https://suttacentral.net/mn10/de/sabbamitta#`; tail `Tổng: 200 đoạn`
- **And** (trush) dòng thân 1 là `[mn10:0.1] મજ્જ઼િમ નિકાય ૧૦`; output chứa `https://suttacentral.net/mn10/gu/trush#` (lang trùng luật tie-break đã ghi của `bilara-lang-param`), không chứa `/mn10/hi/trush`; tail `Tổng: 230 đoạn`

### AC-4: `max_segments` và đoạn rỗng

- **Maps to:** FR-2, FR-3
- **When** chạy `{"uid":"mn10","translator":"sujato","max_segments":3}`
- **Then** đúng 3 dòng thân: `[mn10:0.1] Middle Discourses 10`, `[mn10:0.2] Mindfulness Meditation`, `[mn10:1.1] So I have heard.`; kết thúc bằng đúng `[... văn bản bị cắt sau 3 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]`
- **When** chạy `{"uid":"mn10","translator":"sujato","max_segments":500}`
- **Then** đúng 194 dòng thân; dòng cuối là `[mn10:47.4] Satisfied, the mendicants approved what the Buddha said.`; kết thúc bằng đúng `[Hết văn bản — 194 đoạn]`
- **And** không dòng nào bắt đầu bằng `[mn10:3.6]`, `[mn10:4.9]` hay `[mn10:4.10]` (key có giá trị dịch rỗng)
- **And** bỏ tiền tố `[{id}] ` khỏi 194 dòng thì được danh sách trùng từng byte với 194 dòng thân do bản trước thay đổi in ra cho cùng lời gọi (FR-2)

### AC-5: Nhánh guard không đổi

- **Maps to:** FR-6
- **When** chạy `{"uid":"mn10","translator":"minh_chau"}` và `{"uid":"thag1.1","translator":"indacanda"}`
- **Then** cả hai output vẫn chứa câu `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả` và các neo của `specs/bilara-lang-param/requirements.md` AC-4 vẫn đúng
- **And** không output nào chứa `[mn10:`, `[thag1.1:`, `https://suttacentral.net/mn10/`, `https://suttacentral.net/thag1.1/`, `Translator: `, `[Hết văn bản`, `[... văn bản bị cắt`
- **And** `git diff -- src/index.ts` không có hunk nào chạm thân `formatUnavailable()`

### AC-6: Khối normative đồng bộ, phạm vi diff đúng

- **Maps to:** FR-7, NFR-1..NFR-5, NFR-7
- **When** chạy `npm run build`, `git status`, `git diff -- src/index.ts package.json specs/`
- **Then** tsc thoát mã 0; không file mới trong `src/`; `package.json` không đổi
- **And** `awk '/^function extractText/,/^}$/'` trên `src/index.ts` và trên `specs/non-segmented-translation-guard/design.md` cho hai khối mà `diff` rỗng; dòng gate `extracted.source !== "translation"` xuất hiện đúng 1 lần trong `src/index.ts`
- **And** nếu khối retry thay đổi: khối tương ứng trong `specs/bilara-lang-param/design.md` (N3-B) được cập nhật cùng thay đổi và `diff` với đoạn code rỗng; nếu không thay đổi, `git diff` không chạm khối đó ở cả hai phía
- **And** không hunk nào chạm `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`, `formatCitation()`, `formatUnavailable()`, hay schema input của `get_sutta`
- **And** đọc code: không lời gọi `fetch` mới; đường nhiều request nhất của `get_sutta` vẫn ≤ 3
- **And** ba bất biến đếm của NFR-7 giữ nguyên (3 / 3 / 0)

### AC-7: Deep-link cuộn tới đúng đoạn (kiểm thủ công)

- **Maps to:** FR-4
- **Given** dạng deep-link xác lập bằng đọc source client SC (§Context — dạng deep-link)
- **When** mở trong trình duyệt `https://suttacentral.net/mn10/en/sujato#mn10:13.1` và `https://suttacentral.net/dhp1-20/vi/phantuananh#dhp9:0`
- **Then** mỗi trang hiển thị văn bản và cuộn tới đúng đoạn (`And so they meditate observing an aspect of the body internally …`; `Chuyện Devadatta (Đề-bà-đạt-đa)`), đoạn được tô nổi bật
- **And** ghi kết quả (ngày, trình duyệt) vào `design.md` hoặc review report. Nếu không cuộn được, dừng và đưa lại requirements — FR-4 dựa trên dạng này

### AC-8: Master spec mô tả đúng

- **Maps to:** FR-8
- **When** chạy `grep -n -F` trên `specs/sutta-mcp-requirements.md`
- **Then** `suttacentral.net/{uid}#{segment_id}` — **0** hit (baseline 2026-10-02: 1, dòng 308)
- **And** `{uid}/{lang}/{translator}#{segment_id}` — **≥ 1** hit (baseline: 0)
- **And** `segment-id-in-get-sutta` — **≥ 1** hit (baseline: 0)
- **And** đọc mục Output của Tool 2: nêu segment ID theo đoạn và dạng deep-link

## Assumptions

- **VERIFIED (đo/đọc 2026-10-02):**
  - Hình dạng response và mọi literal ở bảng §Hình dạng API, kể cả: thứ tự key trùng `keys_order` đã lọc (cả ba response); 41 key rỗng trên `mn10/sujato` (`mn10:3.6` dịch `''`); 167 giá trị khác nhau trên 194 đoạn; đoạn cuối `mn10:47.4` → `Satisfied, the mendicants approved what the Buddha said.`; đoạn cuối `dhp1-20` là `dhp20:7`.
  - `/api/suttaplex/mn10` liệt kê `trush` tại index 14 (`gu`) và 15 (`hi`) — tie-break "entry đầu không phải `en`" của code hiện tại (`src/index.ts:261-263`) chọn `gu`; `mn10/trush?lang=gu` 230 đoạn.
  - `/api/suttaplex/dhp1-20` trả `uid: "dhp1-20"` — UID trong citation trùng UID request.
  - `mn10/minh_chau?lang=vi` vẫn thiếu `translation_text` (guard vẫn bắn). `/api/bilarasuttas/MN10/sujato` (chữ hoa) trả body chỉ có `msg` → rơi vào guard, nên đường bình thường không bao giờ dựng link với UID sai chữ hoa/thường.
  - Route, ID phần tử đoạn và handler hash của client SC: như trích ở §Dạng deep-link (đọc source tại commit `34391d1`).
  - Baseline: `segmented` 3, `sujato` 3, translator-ID 0 trong `src/index.ts`; heredoc harness tại `specs/non-segmented-translation-guard/requirements.md:180-196`.
- **DECIDED (stakeholder: user, 2026-10-02):**
  - **D1 — Định dạng dòng thân:** `[mn10:1.1] So I have heard.`, tức segment ID trong ngoặc vuông. Lý do: ngoặc vuông tách ID khỏi text rõ ràng, kể cả khi text bắt đầu bằng số (`1.5. Den Geist…` ở `mn10:12.0`). Đã loại: ID trần không ngoặc; link markdown trên từng dòng.
  - **D2 — Deep-link:** một dòng header chứa tiền tố URL, ví dụ `Deep link: https://suttacentral.net/mn10/en/sujato#<segment_id>`. Design chốt chữ chính xác. Đã loại: URL đầy đủ trên từng dòng (thêm khoảng 40 ký tự mỗi dòng, khoảng 2.000 ký tự cho 50 đoạn).
  - **D3 — Luôn bật:** không thêm tham số tool, schema `get_sutta` không đổi. Đã loại: tham số `include_segment_ids`.
- **UNVERIFIED (default stated):**
  - **Deep-link chạy thật trong trình duyệt** — mới đọc source, chưa mở trang. Default: tin source; AC-7 là chốt kiểm.
  - **Dạng URL ổn định lâu dài** — client SC có thể đổi route/ID phần tử. Default: dạng hiện tại; không thêm cơ chế phòng hờ (không yêu cầu).
  - **Mọi bản dịch bilara dùng key dạng `{text_uid}:{…}`** — đo 4 bản dịch / 3 kinh. Default: in key nguyên văn, không kiểm hay chuẩn hóa dạng key; key lạ vẫn được in đúng như API trả.
  - **Chi phí token chấp nhận được** — tiền tố ID thêm khoảng 10-13 ký tự mỗi dòng thân (ví dụ `[mn10:13.1] ` = 12). Stakeholder đã chấp nhận: luôn bật (D3).

## Open Questions

- Không còn câu hỏi mở. Q1–Q3 đã được chốt thành D1–D3 (xem Assumptions, mục DECIDED).

## Out of Scope

- Segment ID hoặc deep-link trong các tool khác (`search_topic`, `get_sutta_meta`, `get_parallels`) — chúng không trả thân văn bản.
- Đổi `formatCitation()` hay dòng `URL: https://suttacentral.net/{uid}` (dùng chung cho các tool khác).
- Tra cứu/hiển thị đoạn theo segment ID (ví dụ tham số `from_segment` để đọc tiếp sau khi bị cắt) — tính năng riêng.
- In ID của đoạn có dịch rỗng, hoặc fallback root text cho đoạn đó.
- Root text Pali song song, `html_text`, `comment_text`, `variant_text`, `reference_text` (số trang PTS).
- Sửa `describe()` của tool `get_sutta` hoặc của tham số; sửa README.
- Cache, test framework, linter.
