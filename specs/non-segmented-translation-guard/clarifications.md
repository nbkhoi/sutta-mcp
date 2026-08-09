# Stakeholder Clarification: Non-segmented translation guard cho `get_sutta`

**Date**: 2026-08-08
**Source**: Bug report xác minh live trên SuttaCentral API 2026-08-08; `src/index.ts:112-126`, `src/index.ts:192-237`
**Status**: RESOLVED (không có câu hỏi blocking — mọi quyết định đã chốt bằng convention sẵn có trong repo hoặc bằng lập luận ghi lại dưới đây)

Đây là **artifact tạm của pha DISCOVER**. Nội dung đã chốt được chuyển sang `requirements.md`; không pha nào phía sau đọc file này.

> **Đính chính 2026-08-08 (sau khi soạn file này).** Giả thuyết "bilara chỉ phục vụ bản dịch `segmented=true`" đã bị bác bỏ bằng phản ví dụ live: `phantuananh` (Dhammapada) là `segmented=true`, đã xuất bản, web render được — nhưng `/api/bilarasuttas/` vẫn không trả `translation_text`. Mọi lập luận dưới đây viện tới `segmented` như *nguyên nhân* đều đã lỗi thời; kết luận hành vi (phương án (a)) thì không đổi. `requirements.md` là bản đúng.

---

## Critical Questions (Blocking)

Không có. Lựa chọn hành vi (a) vs (b) được dispatch giao lại cho phân tích; các câu hỏi còn lại đều có convention sẵn trong repo để trả lời. Không gọi `AskUserQuestion`.

---

## High Priority Questions (đã tự giải quyết bằng bằng chứng trong repo)

### Q1: Khi bản dịch không segmented, `get_sutta` làm gì thay thế?

- **Context**: Đây là quyết định hành vi duy nhất của feature. Hai ứng viên do dispatch nêu.
- **Options**:
  - **(a) Thông báo tường minh** — nêu tên dịch giả, nói rõ không nhận được nội dung bản dịch, liệt kê các dịch giả khác lấy từ `suttaplex.translations`. Không trả về đoạn văn nào. *(Bản gốc của mục này còn kèm lý do "vì không segmented"; đã bỏ theo đính chính đầu file — thông báo không được nêu nguyên nhân.)*
  - **(b) Vẫn trả root text nhưng đổi nhãn header** thành "văn bản gốc Pali", không gán cho dịch giả.
- **Resolution**: Chọn **(a)**.
  - (a) giữ nguyên hợp đồng của tool: header khẳng định quyền tác giả, nên không có văn bản nào được phát ra dưới attribution sai.
  - (b) vẫn nhét ~50 đoạn Pali (mặc định `max_segments`) vào context của một caller đang hỏi bản dịch tiếng Việt. Consumer là LLM: có root text trong context thì khả năng cao nó trích luôn Pali làm câu trả lời — cùng một thất bại, chỉ tinh vi hơn.
  - (b) còn thêm một chế độ output thứ hai cho `get_sutta` (translation-mode vs root-mode), rộng hơn phạm vi "guard" và mâu thuẫn với ràng buộc "giữ thay đổi tối thiểu".
  - (a) biến ngõ cụt thành đường đi tiếp: danh sách `author_uid` segmented cho phép caller gọi lại ngay.

### Q2: Guard trả về MCP error (`isError`) hay text content bình thường?

- **Resolution**: Text content bình thường. **Evidence**: cả ba nhánh "không tìm thấy" hiện có trong repo đều trả text thường, không dùng `isError` — `src/index.ts:163-172` (`search_topic` rỗng), `src/index.ts:250-254` (`get_sutta_meta` sai UID), `src/index.ts:289-293` (`get_parallels` rỗng).

### Q3: Có tự động fallback sang `sujato` không?

- **Resolution**: Không. Thay thầm lặng một dịch giả khác chính là lặp lại đúng lỗi gốc — trả về thứ caller không yêu cầu mà caller không nhận ra. Ghi vào Out of Scope.

### Q4: Có gọi thêm API để lấy danh sách dịch giả segmented không?

- **Resolution**: Không cần. `get_sutta` đã fetch `suttaplex` song song với bilara (`src/index.ts:208-211`), `translations[]` nằm sẵn trong đó. Liệt kê alternatives tốn 0 request thêm. (Cách dùng cờ `segmented` trong danh sách này đã đổi — xem FR-4 trong `requirements.md`: bộ loại trừ, không phải bảo đảm.)

### Q5: Ngôn ngữ của thông báo?

- **Resolution**: Tiếng Việt. **Evidence**: 100% string hướng người dùng trong `src/index.ts` là tiếng Việt.

---

## Assumptions (Verified)

- Bilara trả HTTP 200 kèm `root_text` mà không có `translation_text` cho một số cặp `(uid, translator)` — xác minh live 2026-08-08 với `mn10`/`minh_chau` (46937 bytes).
- `minh_chau` và `indacanda` đều `segmented=false` trên suttaplex. **Nhưng cờ này không phải nguyên nhân** — xem đính chính đầu file: `phantuananh` `segmented=true` cũng không được phục vụ.
- `extractText()` fallback sang `root_text` khi `Object.keys(translation_text).length === 0` — `src/index.ts:113-116`.
- `get_sutta` đã có sẵn `suttaplex` trong scope tại thời điểm render header — `src/index.ts:208-216`.
- Repo không có test runner, không có linter (`CLAUDE.md`, `package.json`).

## Assumptions (Unverified — Defaults Stated)

- **`author_uid` sai/không tồn tại (typo) cũng trả 200 + `root_text`** — chưa gọi live để xác nhận. Default: guard kích hoạt dựa trên *sự vắng mặt của `translation_text`*, không dựa trên lý do vắng mặt, nên trường hợp typo tự động được che phủ với cùng thông báo.
- **Tồn tại sutta mà `translations` không có bản segmented nào** — chưa xác minh được UID live cụ thể. Default: guard vẫn phải xử lý, in "(không có bản dịch segmented nào)" thay vì danh sách rỗng.
- **Deep-link tới bản dịch legacy trên web SC** (dạng `suttacentral.net/{uid}/vi/{author_uid}`) — chưa xác minh dạng URL. Default: chỉ dùng link cấp sutta `https://suttacentral.net/{uid}` mà `formatCitation()` đã sinh.
- **`thag1.1` có bản dịch segmented của `sujato`** — chưa xác minh. Default: acceptance criteria cho `thag1.1`/`indacanda` chỉ khẳng định phần guard, không khẳng định nội dung danh sách alternatives.
