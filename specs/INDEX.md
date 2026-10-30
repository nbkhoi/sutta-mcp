# Specs Index

| Slug | Title | Phase | Last updated |
|------|-------|-------|--------------|
| [bilara-lang-param](./bilara-lang-param/) | Truyền query param `lang` vào `/api/bilarasuttas` cho `get_sutta` | tasks | 2026-08-09 |
| [non-segmented-translation-guard](./non-segmented-translation-guard/) | Non-segmented translation guard cho `get_sutta` | tasks | 2026-08-09 |
| [segment-id-in-get-sutta](./segment-id-in-get-sutta/) | Segment ID trong output của `get_sutta` | complete | 2026-10-03 |
| [get-sutta-unknown-uid](./get-sutta-unknown-uid/) | `get_sutta` báo đúng "không tìm thấy" cho UID không tồn tại | complete | 2026-10-17 |
| [dynamic-search](./dynamic-search/) | `search_topic` dùng search API của SuttaCentral (ánh xạ tiếng Việt, `match`, `page`) | complete | 2026-10-19 |
| [search-unit-tests](./search-unit-tests/) | Unit test offline cho logic `search_topic` (`src/search.ts`, `npm test`) | complete | 2026-10-20 |
| [search-api-passthrough](./search-api-passthrough/) | `search_topic` là wrapper mỏng của `GET /api/search/instant` (tham số API, `format` text/json) | complete | 2026-10-24 |
| [tools-api-passthrough](./tools-api-passthrough/) | Năm tool là wrapper mỏng của SuttaCentral API, đặt tên theo endpoint (`search_instant`, `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu`) | complete | 2026-10-30 |
