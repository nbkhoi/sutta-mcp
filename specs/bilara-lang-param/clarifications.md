# Stakeholder Clarification: Truyền query param `lang` vào `/api/bilarasuttas`

**Date**: 2026-08-09
**Source**: Dispatch `spec-create` cho slug `bilara-lang-param` (kèm facts đã verify 2026-08-09); spec tiền nhiệm `specs/non-segmented-translation-guard/`
**Status**: RESOLVED

## Critical Questions (Blocking)

Không có. Điểm duy nhất có thể gây mơ hồ chặn đường — "cách lấy giá trị `lang` cho một lời gọi `get_sutta` thuộc requirements hay design?" — đã được dispatch chốt trước: **là quyết định DESIGN** (tool param vs tra suttaplex vs retry-on-miss); requirements chỉ đặt ràng buộc hành vi quan sát được. Mọi fact nền (upstream source, hành vi endpoint theo từng cặp uid/translator/lang) đã được tự đo lại trong phiên soạn spec — bảng đầy đủ nằm ở `requirements.md` §Context & Goal và §Assumptions.

## High Priority Questions

Không có. Theo chế độ "blocking ambiguities only" của dispatch, các quyết định không chặn dưới đây được ghi default thay vì hỏi.

## Assumptions (Verified)

Toàn bộ danh sách VERIFIED kèm số đo nằm trong `requirements.md` §Assumptions. Ba điểm nền tảng:

- Nguyên nhân guard chặn oan đã xác lập: upstream `views.py:1058` mặc định `lang='en'` khi thiếu query param; AQL đòi `@lang IN doc.muids` (`queries.py:1092`). Đọc source trực tiếp (nhánh `main`) + đo live 2026-08-09.
- `dhp1-20/phantuananh?lang=vi` → 108 đoạn sau lọc; `mn10/sabbamitta?lang=de` → 200 đoạn; `mn10/sujato?lang=en` → body giống hệt từng byte lời gọi không param.
- `minh_chau`/`indacanda` vẫn không được phục vụ kể cả với `?lang=vi` — guard tiền nhiệm vẫn cần nguyên vẹn.

## Assumptions (Unverified — Defaults Stated)

- **MEDIUM — Biên request khi suy `lang`.** Dispatch không nói giữ hay nới ràng buộc "đúng 2 request song song" của spec tiền nhiệm. Default: nới có kiểm soát thành trần **3 request / 2 endpoint** (NFR-6) để cả ba phương án design đều khả thi. Nếu stakeholder muốn giữ cứng 2 request, phương án retry-on-miss bị loại — cần nói trước khi sang pha design.
- **MEDIUM — Phạm vi sửa spec tiền nhiệm.** Dispatch chỉ nêu đích danh AC-5. Default: sửa tối thiểu + errata note ở đầu file (FR-7); `design.md`/`tasks.md`/`reviews/` giữ nguyên làm hồ sơ thi hành; không viết lại tường thuật lịch sử.
- **LOW — `describe()` của tham số `translator`.** Hedge "kể cả khi metadata ghi segmented=true" mất phản ví dụ sống sau fix nhưng không sai. Default: giữ nguyên chuỗi (Q2 trong `requirements.md`).
- **LOW — `claudedocs/specs-review.md`.** Mục F-04 của bản nháp cục bộ này lại lệch (ghi "open upstream question" đã có lời giải). Default: không sửa — gitignored, không phát hành, ngoài scope.
