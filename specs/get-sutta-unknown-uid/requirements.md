# Requirements: `get_sutta` báo đúng "không tìm thấy" cho UID không tồn tại

**Status:** Reviewed
**Created:** 2026-10-17
**Spec slug:** get-sutta-unknown-uid
**Nguồn:** GitHub issue nbkhoi/sutta-mcp#10 (label `bug`).
**Tiền nhiệm (ràng buộc hình dạng diff):** `specs/non-segmented-translation-guard/` (khối N1), `specs/bilara-lang-param/` (khối N3), `specs/segment-id-in-get-sutta/` (output có segment ID và dòng `Deep link:`).

## Context & Goal

### Yêu cầu gốc

Issue #10: gọi `get_sutta({ uid: "mn9999" })` — UID không có trên SuttaCentral — trả về citation hỏng và câu đổ lỗi cho dịch giả. Kỳ vọng: cùng kết cục not-found như `get_sutta_meta`, vốn đã xử lý case này: `Không tìm thấy sutta với UID: mn9999`.

Mục tiêu: khi UID không tồn tại, Claude (caller của tool) nhận được thông báo đúng nguyên nhân (UID), không có link `suttacentral.net` hỏng, và mọi hành vi của `get_sutta` với UID hợp lệ giữ nguyên.

### Hiện trạng (đọc code `src/index.ts` tại `249bb97`, chạy harness 2026-10-17)

Output hiện tại cho `{"uid":"mn9999"}` (harness, `npm run build` tại `249bb97`):

```
────────────────────────────────────────────────────────────
**?** — 
Difficulty: unknown | Parallels: 0
URL: https://suttacentral.net/?
────────────────────────────────────────────────────────────

API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả sujato (sujato).

Server cố ý không thay bằng văn bản gốc Pali, để không gán nhầm văn bản cho dịch giả được yêu cầu.

  (không tìm thấy bản dịch nào khác cho kinh này)
```

Chuỗi nguyên nhân trong code:

- `fetchSuttaplex()` (`src/index.ts:10-16`) và `fetchBilaraText()` (`:18-23`) chỉ ném lỗi khi `!res.ok`. SC trả HTTP 200 cho UID không tồn tại (bảng dưới), nên không có gì ném.
- `get_sutta` (`:249-309`) không kiểm `suttaplex.uid`. `formatCitation()` (`:142-155`) fallback `uid ?? "?"` → `**?**` và `URL: https://suttacentral.net/?`.
- `extractText()` (`:121-140`) không thấy `translation_text` → `source: "root"`, `lines: []`. Khối retry (`:266-274`) tìm `retryLang` trong `suttaplex.translations` — mảng rỗng → không retry. Gate `extracted.source !== "translation"` (`:276`) đưa vào `formatUnavailable()` (`:157-182`), câu thông báo nói về dịch giả.
- `get_sutta_meta` (`:323-327`) đã có `if (!sp?.uid)` trả `Không tìm thấy sutta với UID: ${uid}`. Harness xác nhận: `get_sutta_meta({"uid":"mn9999"})` → `{"result":{"content":[{"type":"text","text":"Không tìm thấy sutta với UID: mn9999"}]},...}` (không có `isError`).

### Hình dạng API (đo live bằng `curl`, 2026-10-17)

| Request | HTTP | Body | `get_sutta` hiện tại |
|---|---|---|---|
| `/api/suttaplex/mn9999` | 200 | mảng 1 phần tử, `uid: null`, `acronym: null`, `translations: []`, `parallel_count: 0` | — |
| `/api/suttaplex/mn9999?language=vi` | 200 | như trên, `uid: null` | — |
| `/api/bilarasuttas/mn9999/sujato` (có/không `?lang=vi`) | 200 | `{"msg": "Not Found"}` | `**?**` + guard |
| `/api/suttaplex/MN10` | 200 | `uid: null` (khác `mn10`) | `**?**` + guard |
| `/api/suttaplex/%20mn10`, `/api/suttaplex/mn10%20` | 200 | `uid: null` | `" mn10"` → `**?**` + guard |
| `/api/suttaplex/dhp1` (bài kệ nằm trong khoảng `dhp1-20`) | 200 | `uid: null`; bilara `{"msg":"Not Found"}` | `**?**` + guard |
| `/api/suttaplex/xyz-abc` | 200 | `uid: null` | — |
| `/api/suttaplex/dhp1-20` | 200 | mảng 1 phần tử, `uid: "dhp1-20"`, `type: leaf`, 33 bản dịch | đường bình thường |
| `/api/suttaplex/mn` | 200 | mảng 171 phần tử; `[0].uid: "mn"`, `type: branch`, `translations: []` | `**MN** — Middle Discourses Collection`, `URL: https://suttacentral.net/mn` + guard |
| `/api/suttaplex/dhp` | 200 | mảng 27 phần tử; `[0].uid: "dhp"`, `type: branch`, `translations: []`; bilara `dhp/sujato` → `{"msg":"Not Found"}` | `**Dhp** — Sayings of the Dhamma`, `URL: https://suttacentral.net/dhp` + guard |
| `/api/suttaplex/ma98` + `/api/bilarasuttas/ma98/sujato` | 200 / 200 | `uid: "ma98"`, 4 bản dịch / có `html_text`, `root_text`, không `translation_text` | `**MA 98**…` + guard |
| `/api/bilarasuttas/mn10/xyzzy` (translator không tồn tại) | 200 | `root_text` 235 key, không `translation_text`; suttaplex `mn10` bình thường | citation `mn10` + guard "dịch giả xyzzy" + danh sách thay thế |
| `/api/suttaplex/?language=en` (UID rỗng) | **404** | HTML | tool error `SuttaCentral API error: 404` (`isError: true`) |

Rút ra:

- **Tín hiệu "UID không tồn tại" là `suttaplex.uid` rỗng**, không phải HTTP status. Mọi UID không tồn tại đã đo (sai số, chữ hoa, khoảng trắng, bài kệ trong khoảng) đều cho `uid: null`. Đây cũng là tín hiệu `get_sutta_meta` dùng.
- **UID nhánh (`mn`, `dhp`) không phải UID không tồn tại.** Suttaplex trả `uid` thật và link `https://suttacentral.net/mn` hợp lệ; chỉ là endpoint bilara không phục vụ đơn vị đó. Spec `segment-id-in-get-sutta` FR-6 đã chốt nhánh guard cho "UID không phục vụ như `dhp`" phải giữ nguyên từng byte.
- **Translator sai trên UID hợp lệ vẫn là chuyện dịch giả** (`mn10/xyzzy`, `ma98/sujato`) — guard đúng nguyên nhân, không được đổi thành not-found.
- **Retry hiện không bắn cho UID không tồn tại:** `translations: []` nên `retryLang` là `undefined`. Hiện tại UID không tồn tại tốn đúng 2 request (suttaplex + bilara song song qua `Promise.all`, `:251-254`), không có request thứ ba.

## Stakeholders

- **Primary users:** Claude (caller MCP) — cần biết UID sai để tự sửa (tra lại bằng `search_topic`/`get_sutta_meta`) thay vì đổi dịch giả vô ích.
- **Secondary users:** người dùng cuối hỏi Dhamma qua Claude — không nhận link `suttacentral.net/?` hỏng.
- **Operators / maintainers:** người bảo trì `src/index.ts` — fix không được phá các khối normative N1/N3 và các bất biến đếm của spec tiền nhiệm.

## Functional Requirements

- **FR-1: Phát hiện UID không tồn tại.** `get_sutta` coi UID là không tồn tại khi suttaplex đã fetch (`fetchSuttaplex(uid)`, phần tử đầu nếu là mảng) không có `uid` truthy — gồm `uid: null` (case đo được), thiếu field, và mảng rỗng (phần tử đầu `undefined`). Cùng tiêu chí với `get_sutta_meta` (`!sp?.uid`). Kết luận này không phụ thuộc vào nội dung response bilara.

- **FR-2: Output not-found.** Khi FR-1 xảy ra, `get_sutta` trả đúng một content item `type: "text"` có text **trùng từng byte** với output của `get_sutta_meta` cho cùng UID: `Không tìm thấy sutta với UID: {uid}`, với `{uid}` là giá trị tham số `uid` nguyên văn như caller gửi (không trim, không đổi hoa/thường). Response không đặt `isError` (giống `get_sutta_meta`).

- **FR-3: Không có thành phần của các nhánh khác trong output not-found.** Output của FR-2 không chứa: citation (`**?**`, `Difficulty:`, `URL:`), bất kỳ chuỗi `https://suttacentral.net`, câu guard `API SuttaCentral không trả về nội dung bản dịch nào`, danh sách bản dịch thay thế, `Translator:`, `Deep link:`, thân văn bản hay tail đếm đoạn.

- **FR-4: Không tốn request cho lang retry.** Với UID không tồn tại, `get_sutta` không phát request `/api/bilarasuttas/...?lang=...` (retry-on-miss của `bilara-lang-param`). Tổng số request tới SC cho lời gọi đó ≤ 2. (Hiện trạng đã thỏa — FR này chốt để fix không làm hỏng; có giữ hay bỏ request bilara song song là việc của design, xem Q1.)

- **FR-5: UID hợp lệ giữ nguyên hành vi.** Khi suttaplex có `uid` truthy, output của `get_sutta` trùng từng byte với output tại `249bb97` cho cùng input và cùng response upstream, trên mọi nhánh:
  - đường bình thường có segment ID và dòng `Deep link:` (spec `segment-id-in-get-sutta`), kể cả khi nội dung đến từ lời gọi retry `?lang=`;
  - nhánh guard `formatUnavailable()` cho dịch giả legacy (`minh_chau`), translator không tồn tại (`xyzzy`), văn bản không có bản dịch của dịch giả được yêu cầu (`ma98`/`sujato`), và UID nhánh không phục vụ (`mn`, `dhp`).

- **FR-6: Lỗi HTTP giữ nguyên.** Khi `fetchSuttaplex()` hoặc `fetchBilaraText()` ném (status không 2xx, lỗi mạng — ví dụ `uid: ""` → 404), `get_sutta` vẫn kết thúc như hiện tại (tool error do SDK dựng, `isError: true`); fix này không bắt hay đổi chữ lỗi đó.

- **FR-7: Đồng bộ khối normative.** Fix không được sửa thân `extractText()` (N1-A), dòng gate `if (extracted.source !== "translation") {` cùng `}` đóng (N1-B), hay khối retry (N3-B). Nếu design buộc phải sửa một trong các khối này, khối tương ứng trong `specs/non-segmented-translation-guard/design.md` / `specs/bilara-lang-param/design.md` được cập nhật cùng thay đổi và `diff` giữa code và khối spec rỗng (cùng quy tắc FR-7 của `segment-id-in-get-sutta`).

## Non-Functional Requirements

- **NFR-1:** Không thêm dependency npm; `package.json` không đổi.
- **NFR-2:** Thay đổi code chỉ trong `src/index.ts`; không file mới trong `src/`. Script verify tạm nằm ngoài repo và được xóa sau khi dùng.
- **NFR-3:** `npm run build` (tsc strict) thoát mã 0.
- **NFR-4: Không thêm request, không thêm độ trễ trên đường UID hợp lệ.** Số request mỗi lời gọi `get_sutta` với UID hợp lệ không đổi (2 trên đường thường, tối đa 3 khi retry), suttaplex và bilara lần đầu vẫn được gọi song song. Không lời gọi `fetch` mới.
- **NFR-5:** Không đụng `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`, `formatCitation()`, `formatUnavailable()`, schema input và `describe()` của `get_sutta`.
- **NFR-6:** Không thêm chuỗi hướng người dùng mới: thông báo not-found dùng lại đúng câu đã có trong `get_sutta_meta` (`grep -c -F 'Không tìm thấy sutta với UID' src/index.ts` đo 2026-10-17 = 1; sau fix ≤ 2, tùy design dùng chung hay lặp lại literal).
- **NFR-7:** Bất biến đếm của spec trước giữ nguyên: `grep -c 'segmented' src/index.ts` = 3; `grep -c -F 'sujato' src/index.ts` = 3; `grep -c -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/index.ts` = 0 (đo 2026-10-17 tại `249bb97`: 3 / 3 / 0). Định danh mới không chứa chuỗi `segmented` hay `sujato`.

## Acceptance Criteria

### Harness

Tái dùng harness `/tmp/mcp-call.sh`, dựng lại từ heredoc tại `specs/non-segmented-translation-guard/requirements.md` (§Harness), cùng ba luật vận hành của `specs/bilara-lang-param/requirements.md` §Harness: `npm run build` trước mỗi lần chạy; mỗi lần chạy phải có đúng 1 dòng chứa `"id":2` (thiếu là chạy hỏng, không phải pass — đã gặp một lần `fetch failed` thoáng qua khi đo 2026-10-17, chạy lại thì bình thường); literal dưới đây đo live 2026-10-17 — nếu lệch, fetch lại endpoint trước khi kết luận regression. Xóa file harness và log stderr sau khi xong.

**Baseline:** trước khi sửa code, chạy harness tại `249bb97` cho mọi input của AC-4, AC-5 và lưu text output (ngoài repo) để so sánh từng byte sau fix. Xóa sau khi xong.

### AC-1: `mn9999` trả not-found giống `get_sutta_meta`

- **Maps to:** FR-1, FR-2, FR-3
- **Given** `/api/suttaplex/mn9999` → 200, `[{"uid": null, ...}]`; `/api/bilarasuttas/mn9999/sujato` → 200, `{"msg": "Not Found"}`
- **When** chạy `/tmp/mcp-call.sh get_sutta '{"uid":"mn9999"}'` và `/tmp/mcp-call.sh get_sutta_meta '{"uid":"mn9999"}'`
- **Then** `result.content` của `get_sutta` có đúng 1 phần tử, `text` đúng bằng `Không tìm thấy sutta với UID: mn9999`, và trùng từng byte với `text` của `get_sutta_meta`
- **And** `result` không có `isError: true`
- **And** text không chứa `suttacentral.net`, `**?**`, `URL:`, `dịch giả`, `Deep link:`

### AC-2: Các dạng UID không tồn tại khác

- **Maps to:** FR-1, FR-2, FR-3
- **When** chạy `get_sutta` với lần lượt `{"uid":"mn9999","translator":"phantuananh"}`, `{"uid":"MN10"}`, `{"uid":" mn10"}`, `{"uid":"dhp1"}`
- **Then** text lần lượt đúng bằng `Không tìm thấy sutta với UID: mn9999`, `Không tìm thấy sutta với UID: MN10`, `Không tìm thấy sutta với UID:  mn10` (hai dấu cách — UID echo nguyên văn), `Không tìm thấy sutta với UID: dhp1`
- **And** không output nào chứa `suttacentral.net` hay `dịch giả`

### AC-3: Không retry cho UID không tồn tại

- **Maps to:** FR-4
- **Given** `suttaplex.translations` của `mn9999` là `[]`
- **When** đọc code `get_sutta` sau fix và lần theo đường FR-1 với `{"uid":"mn9999","translator":"phantuananh"}`
- **Then** đường đó không gọi `fetchBilaraText(uid, translator, retryLang)`; tổng số lời gọi `fetchSuttaplex`/`fetchBilaraText` trên đường đó ≤ 2

### AC-4: UID hợp lệ, vấn đề dịch giả hoặc UID nhánh — guard không đổi

- **Maps to:** FR-5
- **When** chạy `get_sutta` với `{"uid":"mn10","translator":"xyzzy"}`, `{"uid":"mn10","translator":"minh_chau"}`, `{"uid":"ma98"}`, `{"uid":"mn"}`, `{"uid":"dhp"}`
- **Then** mỗi output trùng từng byte với baseline tại `249bb97`
- **And** mỗi output vẫn chứa câu `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả` và dòng `URL: https://suttacentral.net/{uid}` với `{uid}` là `mn10`, `mn10`, `ma98`, `mn`, `dhp` tương ứng
- **And** không output nào chứa `Không tìm thấy sutta với UID`
- **And** (`mn10`/`xyzzy`) output vẫn liệt kê `• English — Bhikkhu Sujato (sujato)` trong danh sách thay thế

### AC-5: Đường bình thường không đổi

- **Maps to:** FR-5
- **When** chạy `get_sutta` với `{"uid":"mn10","translator":"sujato"}`, `{"uid":"dhp1-20","translator":"phantuananh"}` (nội dung qua retry `vi`), `{"uid":"mn10","translator":"sabbamitta"}` (retry `de`)
- **Then** mỗi output trùng từng byte với baseline tại `249bb97`
- **And** các neo của `specs/segment-id-in-get-sutta/requirements.md` AC-1, AC-2, AC-3 vẫn đúng (ví dụ dòng thân 3 của `mn10`/`sujato` là `[mn10:1.1] So I have heard.`; output `dhp1-20` chứa `https://suttacentral.net/dhp1-20/vi/phantuananh#`)

### AC-6: Lỗi HTTP không đổi

- **Maps to:** FR-6
- **When** chạy `get_sutta` với `{"uid":""}`
- **Then** `result.isError` là `true` và `content[0].text` là `SuttaCentral API error: 404`, như baseline

### AC-7: Phạm vi diff, build, khối normative, bất biến

- **Maps to:** FR-7, NFR-1..NFR-7
- **When** chạy `npm run build`, `git status`, `git diff -- src/index.ts package.json specs/`
- **Then** tsc thoát mã 0; không file mới trong `src/`; `package.json` không đổi
- **And** `awk '/^function extractText/,/^}$/'` trên `src/index.ts` và trên `specs/non-segmented-translation-guard/design.md` cho hai khối mà `diff` rỗng; dòng gate `extracted.source !== "translation"` xuất hiện đúng 1 lần trong `src/index.ts`
- **And** `git diff` không chạm khối retry, hoặc nếu chạm thì khối N3-B trong `specs/bilara-lang-param/design.md` cập nhật cùng và `diff` rỗng
- **And** không hunk nào chạm các thành phần liệt kê ở NFR-5
- **And** đọc code: không lời gọi `fetch` mới; `fetchSuttaplex(uid)` và `fetchBilaraText(uid, translator)` vẫn được khởi chạy song song trên đường UID hợp lệ; đường nhiều request nhất vẫn ≤ 3
- **And** bất biến đếm NFR-6 và NFR-7 thỏa

## Assumptions

- **VERIFIED (đo/đọc 2026-10-17):**
  - Mọi dòng của bảng §Hình dạng API (đo bằng `curl`), và output hiện tại cho `mn9999`, `MN10`, `" mn10"`, `mn`, `dhp`, `mn10`/`xyzzy`, `""` (chạy harness trên `dist/` build từ `249bb97`).
  - Với UID không tồn tại, `suttaplex.translations` là `[]` nên retry không bắn; hiện tại đúng 2 request.
  - `get_sutta_meta` dùng `!sp?.uid` và in `Không tìm thấy sutta với UID: ${uid}`, không đặt `isError` (`src/index.ts:323-327`, harness).
  - Spec `segment-id-in-get-sutta` FR-6 chốt nhánh guard cho `dhp` (UID không phục vụ) giữ nguyên từng byte — cơ sở để UID nhánh nằm ngoài FR-1.
  - Bất biến đếm 3 / 3 / 0 và `Không tìm thấy sutta với UID` = 1 hit tại `249bb97`.
- **UNVERIFIED (default stated):**
  - **Không có UID nào suttaplex trả `uid: null` mà bilara lại phục vụ `translation_text`.** Đã đo 5 UID không tồn tại, tất cả bilara trả `{"msg":"Not Found"}`. Default: suttaplex là nguồn quyết định (FR-1), như `get_sutta_meta`; không đọc bilara để cứu vãn.
  - **Suttaplex trả mảng rỗng** chưa quan sát được. Default: xử lý như not-found (FR-1) vì `!sp?.uid` đã phủ `undefined`.
  - **Không chuẩn hóa UID** (trim, lowercase). `MN10` và `" mn10"` sẽ đổi từ guard sai sang not-found — đúng sự thật upstream, nhưng caller vẫn phải tự sửa UID. Default: không chuẩn hóa, nhất quán với `get_sutta_meta` và `get_parallels`; chuẩn hóa là thay đổi hành vi xuyên ba tool, ghi ở Out of Scope.
  - **Output not-found không kèm link.** Constraints của master spec ("Mọi response đều kèm link `suttacentral.net/{uid}`", `specs/sutta-mcp-requirements.md` §Constraints) không áp được khi không có trang SC nào cho UID đó; link hỏng là chính bug cần sửa. Default: không link, giống `get_sutta_meta`. Không sửa master spec.
  - **Không `isError`.** Default: giống `get_sutta_meta` (FR-2).
  - **Chữ thông báo:** dùng lại nguyên câu của `get_sutta_meta` như issue #10 kỳ vọng; không hỏi lại stakeholder.

## Open Questions

- **Q1 (cho design, không chặn requirements):** có bỏ request bilara cho UID không tồn tại không? Hiện hai request chạy song song; bỏ request bilara cho case not-found đòi hỏi tuần tự hóa và làm chậm đường UID hợp lệ, trái NFR-4. Default: giữ song song, chấp nhận 1 request bilara thừa trên đường not-found (FR-4 cho phép ≤ 2).

## Out of Scope

- **Lỗi cùng dạng trong `search_topic` (follow-up, không phải requirement):** `TOPIC_INDEX` có `"nibbana": ["ud8.1", "iti43", "sn43.14"]` (`src/index.ts:78`); `/api/suttaplex/sn43.14` trả `uid: null` vì sutta nằm trong khoảng `sn43.14-43` (đo 2026-10-17). `search_topic("nibbana")` gọi `formatCitation()` trên suttaplex đó và in `**?** — ` / `URL: https://suttacentral.net/?` (đã chạy harness tại `249bb97`, 2026-10-17). 32/33 UID còn lại của `TOPIC_INDEX` trả `uid` đúng. Nên mở issue riêng.
- Thông báo riêng cho UID nhánh (`mn`, `dhp`): hiện guard nói về dịch giả dù nguyên nhân là đơn vị không phục vụ; link vẫn hợp lệ. Giữ nguyên theo FR-6 của `segment-id-in-get-sutta`.
- Chuẩn hóa UID (trim/lowercase) trong `get_sutta`, `get_sutta_meta`, `get_parallels`.
- Gợi ý UID gần đúng, link tới trang tìm kiếm SC, hoặc chuyển bài kệ (`dhp1`) sang UID khoảng chứa nó (`dhp1-20`).
- Kiểm `uid` rỗng/không hợp lệ ở schema zod; đổi cách báo lỗi HTTP (FR-6).
- Sửa `formatCitation()` (dùng chung cho các tool khác), `formatUnavailable()`, `describe()` của tool, README, master spec.
- Cache, test framework, linter.
