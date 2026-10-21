# Requirements: unit test offline cho logic thuần của `search_topic`

**Status:** Reviewed
**Created:** 2026-10-19
**Spec slug:** search-unit-tests
**Nguồn:** hành vi cần giữ là FR-1..FR-20 của `specs/dynamic-search/requirements.md` và ba khối normative S1–S3 của `specs/dynamic-search/design.md`, đã có trong `src/index.ts` tại `5459d5a`. Constraints của `specs/sutta-mcp-requirements.md:274-284`.
**Quyết định stakeholder đã chốt (MVS, 2026-10-19, không mở lại):**
1. Tách logic thuần của `search_topic` sang module mới `src/search.ts`, **không đổi hành vi**. Handler trong `src/index.ts` giữ lời gọi `fetchSearch()` duy nhất và chỉ nối các hàm thuần.
2. Test dùng `node:test` có sẵn của Node, chạy qua devDependency `tsx` đã có. Không thêm dependency npm. Thêm script `npm test`.
3. Fixture là vài response `/api/search/instant` ghi live. Test chạy offline: không mạng, không mock `fetch` toàn cục.
4. Ngoài phạm vi: end-to-end test, linter, CI, công cụ coverage, refactor các tool khác.
5. Tài liệu: `AGENTS.md` và README (nếu README liệt kê lệnh). `AGENTS.md` là dependency được pin (`context:agents`). Người dùng mở rộng ngày 2026-10-19: thêm hai đường dẫn `VI_TOPIC_TERMS` trong `specs/sutta-mcp-requirements.md`, chỉ đổi `src/index.ts` → `src/search.ts` (FR-17).
6. Luật verify: lần chạy harness live chỉ được chạy lại khi **không hợp lệ** (fetch failed, API error, frame hỏng). Một mismatch trên lần chạy hợp lệ thì dừng.

## Context & Goal

### Vấn đề

`search_topic` là tool có nhiều nhánh nhất của server: chuẩn hóa key, ánh xạ tiếng Việt, lọc phần tử không phải sutta, khử trùng trong trang, luật trang sau (dynamic-search FR-18) với hai trường hợp biên, hai formatter, và bốn dạng output (có kết quả, không kết quả ở trang 1, trang sau trống, `topic` rỗng). Hiện tại cách duy nhất để kiểm các nhánh này là harness JSON-RPC stdio chạy live trên SuttaCentral. Harness đó chậm (một request search mất 0.7–5.0 s, đo 2026-10-19), phụ thuộc chỉ mục SC đang trôi, và không với tới được các trường hợp biên một cách ổn định. Ví dụ trường hợp `h = 0` với `total = len(suttaplex)` cần đúng một truy vấn cụ thể (`vô ngã tướng`/`vi`).

### Mục tiêu

Mục tiêu là có một bộ unit test offline, tất định, chạy bằng `npm test`, khóa hành vi hiện tại của logic thuần trong `search_topic` theo đúng các FR của dynamic-search. Không thêm dependency, không đổi output của bất kỳ tool nào.

### Hiện trạng (đọc code `src/index.ts` tại `5459d5a`, 2026-10-19)

- `src/` chỉ có `index.ts`, dài 584 dòng. `git diff --quiet 5459d5a -- src package.json tsconfig.json` sạch.
- Logic search nằm ở hai chỗ:
  - **Section search ở cấp module (`:40-93`):** `SEARCH_PAGE_SIZE`, `VI_TOPIC_TERMS` (14 key), `DIFFICULTY_NAMES`, `formatTitleMatch()`, `formatContentMatch()`.
  - **Handler `search_topic` (`:176-295`):** gồm chuẩn hóa key và tra bảng, `noResults()`, chặn `query === ""`, tính `offset`, chuẩn hóa `data` (`suttaplex`/`hits` không phải mảng thì thành `[]`, `total` không phải số thì thành 0), `hasCategory`/`isSutta`/`takeNew`, cắt trang tiêu đề, khử trùng nội dung theo `uid` của trang tiêu đề, luật `more`/footer, và lắp `lines`.
- `formatTitleMatch()` gọi `formatCitation()` (`:127`). `formatCitation()` cũng được `get_sutta` (`:329`) và `get_sutta_meta` (`:408`) dùng.
- `fetchSearch()` (`:32-38`) đọc `SEARCH_PAGE_SIZE`.
- `src/index.ts` có side effect khi import: tạo `McpServer`, đăng ký tool, gọi `main()` để kết nối stdio. Vì vậy test không thể import `src/index.ts`.
- Bất biến đếm tại `5459d5a`:
  - `grep -c 'segmented' src/index.ts` = 3
  - `grep -c -F 'sujato' src/index.ts` = 3
  - `grep -c -F 'search/instant?' src/index.ts` = 1
  - `grep -c 'fetch(' src/index.ts` = 4
- `package.json` có scripts `build` (`tsc`), `dev` (`tsx src/index.ts`) và `start`. devDependencies: `@types/node` ^20, `tsx` ^4.7.0, `typescript` ^5.3.3. Bản đã cài: `tsx` 4.21.0, `typescript` 5.9.3, `@types/node` 20.19.39. Runtime đo: Node v22.17.0. `engines.node` là `>=18`.
- `tsconfig.json` có `rootDir: ./src`, `outDir: ./dist`, `include: ["src/**/*"]`. `dist/` và `node_modules/` nằm trong `.gitignore`.
- `AGENTS.md` có các dòng sẽ trở nên sai sau thay đổi:
  - dòng 19: `No test runner or linter is configured yet.`
  - dòng 23: `Single-file server: src/index.ts (~585 lines). Everything lives here.`
  - dòng 44: `VI_TOPIC_TERMS in src/index.ts`
- README có lệnh ở hai mục: `## Cài đặt` (`:19`, khối bash có `npm run build`) và `## Chạy thử (dev mode)` (`:28`, `npm run dev`). README có hai dòng trỏ `VI_TOPIC_TERMS` trong `src/index.ts` (`:76`, `:80`).
- `specs/sutta-mcp-requirements.md` tại master `148b8c0` (380 dòng) có đúng hai lần `src/index.ts`, cả hai là vị trí `VI_TOPIC_TERMS`: `:160` ("bảng tĩnh trong `src/index.ts`") và `:293` ("bảng `VI_TOPIC_TERMS` trong `src/index.ts`"). File này có một lần `src/search.ts` (`:380`, mục "Việc mở đã ghi nhận"). `148b8c0` chỉ khác `5459d5a` ở 14 dòng thêm vào cuối file này; `src`, `package.json`, `tsconfig.json` không đổi.

### Thử nghiệm toolchain (2026-10-19, trong thư mục tạm ngoài repo, đã xóa)

Dựng `src/search.ts` và `test/search.test.ts` trong thư mục tạm, với `package.json`/`tsconfig.json` chép từ repo và `node_modules` symlink về repo. Test import `../src/search.js` và đọc fixture JSON qua `readFileSync(new URL("./fixtures/a.json", import.meta.url))`. Kết quả:

- `tsx --test test/*.test.ts` → output TAP, 2 pass, mã thoát 0.
- `tsc -p .` với `tsconfig.json` **không sửa** → mã thoát 0, `dist/` chỉ có `search.js`.

Kết luận dùng cho FR-8/FR-9: đặt test ở `test/` ngoài `rootDir` thì build không đưa test vào `dist/` mà không cần sửa `tsconfig.json`. Specifier `.js` theo `moduleResolution: Node16` cũng resolve được về file `.ts` qua `tsx`.

### Response search đã đo (live, `curl -G`, `limit=10`, 2026-10-19)

Mỗi response thô có các key `total`, `hits`, `suttaplex`, `fuzzy_dictionary`, cộng `error` khi lệnh lọc sai. Kích thước thô 49 B – 151 KB. Phần lớn dung lượng là mảng `translations` của phần tử `suttaplex` và field `highlight` (đoạn trích văn bản) của hit, và code không đọc cả hai.

| Truy vấn | `total` | `suttaplex` | `hits` | Đặc điểm dùng cho test | Thô |
|---|---|---|---|---|---|
| `nibbana`/`en`/offset 0 | 456 | 16 (đầu `an4.179`) | 9, hit đầu `category: "dictionary"`, `uid: null` | lọc dictionary (FR-7) | 83 KB |
| `anatta`/`en`/0 | 145 | 6 (đầu `an6.100`) | 10: 1 dictionary + 4 `is_article: true` (`general-guide-sujato`, `sn-guide-sujato`, `subjects`, `terminology`) | lọc bài viết; `h` đếm cả bài viết | 38 KB |
| `metta`/`en`/0 | 88 | 8 | 8: 1 dictionary; `sa264` (`name: ""`, `root_name` `小土塼`, `author` `Bhikkhu Anālayo`, `lang` `en`); `cnd8` (`acronym: null`, `author: null`, `name` có khoảng trắng thừa) | FR-9 thiếu `name`/`acronym`/`author` | 67 KB |
| `xyzzyqq`/`en`/0 | 0 | 0 | 0 | trang 1 rỗng (FR-11) | 65 B |
| `foo:bar`/`en`/0 | 0 | 0 | 0, có `error.message` `Unknown filter: "foo:"` | FR-11 kèm lỗi SC | 309 B |
| `mindfulness`/`en`/0 | 1461 | 32 (đầu `an1.575-615`; `dn22`, `mn10` ở vị trí 11, 12; cuối `uvs15`, `vb7`) | 8 (`an1.296-305` … `an3.33`) | trang tiêu đề 1–5 (`match=title` luôn gửi offset 0), trang 1 `all`/`content` | 141 KB |
| `mindfulness`/`en`/1450 | 1461 | 32 | 9 (`vb10` … `ya10.1.2`) | trang 146: `1450 + 9 < 1461`, báo "còn" dù trang sau rỗng (FR-18) | 151 KB |
| `mindfulness`/`en`/1460 | 1460 | 32 | 0 | trang 147: `h = 0`, FR-20 + `Hết kết quả.` | 132 KB |
| `vô ngã tướng`/`vi`/0 | 1 | 1 (`sn22.59`) | 0 | `total` rơi về `len(suttaplex)`; điều kiện `h > 0` chặn footer sai (FR-18) | 11 KB |

Sau khi giữ đủ mọi phần tử theo đúng thứ tự, chỉ giữ các field mà code đọc, và in JSON thụt lề 2 dấu cách, tổng của 9 response trên khoảng 48 KB. Các số trên trùng với số đo của dynamic-search ngày 2026-10-18 (`total` 1461/1460, 32 `suttaplex`, cùng `uid` biên). Lệnh ghi lần đầu cho `vô ngã tướng` trả `000` (lỗi mạng) và lần chạy lại trả 200.

## Stakeholders

- **Primary users:** người bảo trì `src/index.ts`/`src/search.ts`. Họ cần một lệnh offline, nhanh, tất định để biết thay đổi có phá FR của dynamic-search không, và cần tên test chỉ ra FR nào bị phá.
- **Secondary users:**
  - Claude (caller MCP): output của năm tool phải giữ nguyên từng byte.
  - Agent implement/review của spec workflow: có thêm một vehicle verify ngoài harness live.
- **Operators / maintainers:** SuttaCentral. Test không gọi API, và fixture không thành corpus (Constraints "không tích lũy").

## Functional Requirements

### Tách module

- **FR-1: Module `src/search.ts`.** Tạo file mới `src/search.ts`. File này chứa toàn bộ logic thuần của `search_topic`:
  - (a) chuẩn hóa key (NFC, chữ thường, trim, gộp khoảng trắng), tra `VI_TOPIC_TERMS` và tính `query` (dynamic-search FR-3, FR-4), kể cả việc nhận biết `query` rỗng để không fetch (FR-11);
  - (b) chuẩn hóa body response: `suttaplex`/`hits` không phải mảng thì thành `[]`, `total` không phải số thì thành 0 (FR-12);
  - (c) lọc phần tử không phải sutta (FR-7);
  - (d) chọn trang và khử trùng `uid` trong trang theo `match` (FR-6, FR-17);
  - (e) luật trang sau (FR-18) và footer (FR-19);
  - (f) `formatTitleMatch()`/`formatContentMatch()` (FR-8, FR-9);
  - (g) lắp text output: header kèm dòng thuật ngữ, dòng nhóm, kết quả, footer, text không kết quả kèm lỗi SC, text trang sau trống (FR-10, FR-11, FR-20).

  Các hằng `SEARCH_PAGE_SIZE`, `VI_TOPIC_TERMS`, `DIFFICULTY_NAMES` chuyển sang `src/search.ts`. Tên hàm, cách chia hàm và chữ ký do design chốt.

- **FR-2: Handler chỉ nối.** Sau khi tách, handler `search_topic` trong `src/index.ts` chỉ làm bốn việc: (1) gọi hàm thuần để có `query`; (2) với `query` rỗng, trả text không kết quả mà không fetch; (3) gọi `fetchSearch(query, language, offset)` **đúng một lần**; (4) đưa input và response vào hàm thuần rồi trả `{ content: [{ type: "text", text }] }`. Hai phần sau giữ nguyên trong `src/index.ts`: schema zod và chuỗi `describe()` của tool; `fetchSearch()` cùng ba helper fetch khác. `src/index.ts` không còn chứa literal output của search: `grep -c -E 'Tìm thấy|Hết kết quả|Còn kết quả:|Khớp tiêu đề:|Khớp nội dung:|Không có kết quả sutta|Không tìm thấy sutta nào' src/index.ts` = 0. Dấu `:` sau `Còn kết quả` là có chủ ý: chuỗi `describe()` của `page` (`src/index.ts:203`, `'Còn kết quả',`) ở lại `src/index.ts` theo FR-2/FR-4 và không khớp pattern này. Hai comment `// Khớp tiêu đề:` (`:72`) và `// Khớp nội dung:` (`:79`) mô tả hai formatter và chuyển sang `src/search.ts` cùng hàm của chúng. Tại `5459d5a` grep này cho 9 (`:72, :79, :215, :267, :268, :279, :281, :283, :287`); trên một bản tách thử (bỏ `:40-93`, thay thân handler bằng lời gọi hàm thuần, giữ schema) nó cho 0 trong khi dòng `describe()` của `page` vẫn còn.

- **FR-3: Module thuần, import không có side effect.** `src/search.ts` không import `src/index.ts`, `@modelcontextprotocol/sdk`, `zod`, hay module I/O của Node (`node:fs`, `node:http`, `node:https`, `node:net`); không gọi `fetch`; không có lệnh cấp module nào ngoài khai báo hằng/hàm/kiểu. Import `src/search.ts` không khởi động server, không đọc stdin, không ghi stdout/stderr.

- **FR-4: Output không đổi.** Với cùng input và cùng response upstream, output của cả năm tool trùng từng byte với bản build tại `5459d5a`, và `tools/list` cũng vậy (tên, description, `inputSchema`). Nếu `formatCitation()` được chuyển hay export lại để `formatTitleMatch()` dùng, output của nó cho mọi input không đổi.

- **FR-5: Bất biến đếm của các spec trước.** Sau thay đổi, các lệnh đếm sau trên `src/index.ts` cho cùng kết quả như tại `5459d5a`:

  | Lệnh | Giá trị |
  |---|---|
  | `grep -c 'segmented'` | 3 |
  | `grep -c -F 'sujato'` | 3 |
  | `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush'` | 0 |
  | `grep -c -F 'search/instant?'` | 1 |
  | `grep -c 'fetch('` | 4 |

  Trên `src/search.ts`, cả năm lệnh trên đều cho 0.

### Test

- **FR-6: Lệnh `npm test`.** `package.json` có thêm đúng một script `test`. Script này chạy các file test của FR-8 bằng runner `node:test` qua binary `tsx` đã có, theo dạng đã thử là `tsx --test <file test>`. Không đổi dependency, devDependency, `engines` hay script nào khác.

- **FR-7: Test offline, không mock `fetch`.** Test chỉ gọi hàm export của `src/search.ts`, với input là literal trong test hoặc nội dung fixture (FR-10). Test không gọi mạng, không gán hay stub `globalThis.fetch`, không import `src/index.ts`. Test đọc fixture bằng `node:fs` theo đường dẫn tương đối với file test.

- **FR-8: Vị trí test.** File test nằm trong thư mục `test/` ở gốc repo, ngoài `rootDir` (`./src`) của `tsconfig.json`. `tsconfig.json` không đổi. Lý do là bằng chứng ở §Thử nghiệm toolchain: chỉ cần vị trí này là `dist/` không có file test. Nếu đặt test trong `src/`, phải thêm `exclude` vào `tsconfig.json` để `tsc` không biên dịch test vào `dist/`, tức thêm cấu hình mà không thêm giá trị.

- **FR-9: Build sạch.** `npm run build` thoát mã 0. Sau `rm -rf dist && npm run build`, `dist/` chỉ có `index.js` và `search.js`, không file nào từ `test/`.

- **FR-10: Fixture.** Mỗi fixture là một file JSON trong `test/fixtures/`. Mỗi file ghi lại ba thứ: URL request đầy đủ (`query`, `language`, `limit=10`, và `offset` khi khác 0), ngày ghi, và body response đã cắt. Bộ fixture tối thiểu là chín response ở §Response search đã đo:
  - `nibbana`/`en`/0
  - `anatta`/`en`/0
  - `metta`/`en`/0
  - `xyzzyqq`/`en`/0
  - `foo:bar`/`en`/0
  - `mindfulness`/`en` ở offset 0, 1450, 1460
  - `vô ngã tướng`/`vi`/0

  Fixture được ghi live bằng `curl -G` vào lúc implement, theo đúng request mà `fetchSearch()` sẽ phát cho input tương ứng. Mỗi lần ghi phải là lần chạy hợp lệ: HTTP 200 và body là JSON parse được. Lần ghi lỗi mạng thì ghi lại (NFR-6).

- **FR-11: Cắt fixture.** Body đã cắt phải giữ:
  - field `total` và `error` của response;
  - **mọi** phần tử của `suttaplex` và `hits`, đúng thứ tự;
  - với mỗi phần tử, đúng các field mà `src/search.ts` đọc: phần tử `suttaplex` giữ `uid`, `acronym`, `translated_title`, `original_title`, `blurb`, `parallel_count`, `difficulty`, `is_article`, `category`; hit giữ `uid`, `acronym`, `name`, `root_name`, `author`, `lang`, `is_article`, `category`. Field có mặt thì giữ, kể cả khi giá trị là `null` hoặc `""`, vì FR-7 của dynamic-search xét key `category` có mặt hay không.

  Body đã cắt bỏ mọi field khác, gồm `translations`, `highlight` và `fuzzy_dictionary`. Khi ghi, bước cắt được kiểm một lần: output của hàm thuần cho body thô và body đã cắt trùng từng byte, với mọi tổ hợp (`match`, `page`) mà test dùng fixture đó. Body thô không lưu vào repo.

- **FR-12: Phạm vi case, đặt tên theo FR.** Mỗi case test có tên bắt đầu bằng id FR của dynamic-search mà nó kiểm (ví dụ `FR-18: ...`). Mỗi FR sau có ít nhất một case với expected value là literal:

  | FR (dynamic-search) | Nội dung tối thiểu phải kiểm |
  |---|---|
  | FR-3 | `Vô Ngã`, `  vô   ngã  `, dạng NFD `vô ngã` đều ánh xạ thành `anatta`; `thiện`, `vo nga`, `thiền định` không ánh xạ |
  | FR-4 | topic không khớp được gửi đi sau NFC + trim, giữ chữ hoa/thường và khoảng trắng bên trong |
  | FR-7 | dictionary (`nibbana`, `metta`) và 4 bài viết (`anatta`) không xuất hiện; phần tử không có `uid` hoặc `uid` rỗng bị loại |
  | FR-6 | trang tiêu đề `mindfulness` 1..4 có 10/10/10/2 `uid`, hợp lại 32 `uid` khác nhau; ở `match=all`, hit trùng `uid` với trang tiêu đề bị bỏ; trong một trang không `uid` nào lặp |
  | FR-8 | khối citation của một phần tử `suttaplex` có `difficulty` số 1/2/3 cho ra `beginner`/`intermediate`/`advanced`; giá trị khác cho `unknown`; dòng `→ {blurb}` chỉ có khi blurb khác rỗng |
  | FR-9 | hai khối `metta` của AC-15 (dynamic-search): dòng `**SA 264** — 小土塼` rồi `Text: Bhikkhu Anālayo (en)`; dòng chính xác `**CND8** — Exposition of the Questions of the Student  Mettagū` (hai dấu cách trước `Mettagū`, không dấu cách cuối) ngay trước `URL: https://suttacentral.net/cnd8`, không có dòng `Text:`. Cộng một case literal: hit có `name` và `root_name` rỗng cho dòng tiêu đề đúng `**{acronym}**` |
  | FR-10 | header `Tìm thấy {n} sutta cho chủ đề "{topic}" (trang {p}):`; dòng thuật ngữ chỉ có khi key khớp; dòng nhóm chỉ in khi nhóm khác rỗng; `mindfulness` `match=title` trang 1 có dòng 1 đúng `Tìm thấy 10 sutta cho chủ đề "mindfulness" (trang 1):` và output không chứa `1461` (`total` của fixture) |
  | FR-11 | `xyzzyqq` trang 1, `topic` rỗng, `topic` chỉ có khoảng trắng; `foo:bar` kèm `SuttaCentral báo lỗi truy vấn: Unknown filter: "foo:"`; gợi ý `match` chỉ có khi `match` ≠ `all` |
  | FR-12 | body thiếu `hits`/`suttaplex` hoặc có giá trị không phải mảng, và `total` không phải số, được xử lý như rỗng/0 |
  | FR-18 | `mindfulness` offset 1450 (trang 146, `content`) cho "còn"; offset 1460 (trang 147) cho "hết"; `vô ngã tướng`/`vi`/`content` (`h = 0`, `total` 1) cho "hết"; `title` trang 3 cho "còn", trang 4 cho "hết"; `all` cho "còn" khi một trong hai nguồn còn |
  | FR-19 | footer chính xác `Còn kết quả: gọi lại search_topic với page={p+1} (giữ nguyên topic, language, match).` và `Hết kết quả.`, là dòng cuối, không có newline sau |
  | FR-20 | `mindfulness` `title` trang 5 và `content` trang 147: dòng 1 là `Không có kết quả sutta ở trang {p} cho chủ đề "mindfulness".` |

  Nguồn của expected value:
  - Mặc định: dạng dòng và literal của dynamic-search requirements/design (S2, S3, §Bố cục output, AC-15), ghép với số đo của fixture (số phần tử, `uid` biên, `total`) ở §Response search đã đo. Bảng trên chỉ cần nguồn này.
  - Nếu muốn assert nguyên output: `src/index.ts` tại `5459d5a` không import được (side effect, §Hiện trạng), nên output của bản build `5459d5a` cho một fixture chỉ có từ một lần chạy harness live của bản build đó, trong cùng đợt ghi fixture. Output đó được lưu kèm fixture (cùng file hoặc file cạnh, tính vào trần NFR-4) cùng ngày chạy.
  - Không lấy expected value bằng cách chạy chính code mới rồi chép lại.

- **FR-13: Test có giá trị phân biệt.** Bộ test fail (`npm test` thoát khác 0) với từng đột biến sau, áp riêng lẻ trên bản sao `src/search.ts`:
  - (a) bỏ điều kiện `h > 0` của luật còn nội dung;
  - (b) bỏ điều kiện `e.is_article !== true` của bộ lọc;
  - (c) bỏ `.trim()` khi lấy `name` trong formatter khớp nội dung;
  - (d) bỏ `.normalize("NFC")` khi chuẩn hóa key.

### Tài liệu

- **FR-14: README.** Mục `## Cài đặt` (khối bash có `npm run build`) có thêm `npm test` kèm một dòng mô tả: chạy unit test offline, không cần mạng. Hai dòng `:76` và `:80` trỏ `VI_TOPIC_TERMS` sang `src/search.ts`. Ngoài hai thay đổi này, README không đổi gì khác.

- **FR-15: AGENTS.md.** Các thay đổi:
  - §Commands thêm `npm test`.
  - Thay câu `No test runner or linter is configured yet.` bằng câu chỉ nói chưa có linter.
  - §Architecture không còn mô tả server một file. Phần này nêu `src/search.ts` chứa logic thuần của `search_topic` (bảng `VI_TOPIC_TERMS`, lọc, phân trang, format), `src/index.ts` giữ helper fetch, schema và handler, và test nằm ở `test/` cùng fixture ở `test/fixtures/`.
  - Dòng 44 trỏ `VI_TOPIC_TERMS` sang `src/search.ts`.

  Ngoài các thay đổi này, AGENTS.md không đổi gì khác.

- **FR-16: Thứ tự sửa AGENTS.md (ràng buộc cho task planner).** `AGENTS.md` được pin là dependency `context:agents` trong `specs/search-unit-tests/workflow-contract.json`, và sửa nó sẽ tạo drift. Vì vậy:
  1. Task sửa `AGENTS.md` là **task build cuối cùng**. Đó là một task riêng và chỉ sửa `AGENTS.md`.
  2. Ngay sau task đó, trước code review on-completion, chạy đường cập nhật contract. Bước `authorize` **chỉ được thực hiện khi người dùng đồng ý rõ ràng** tại đúng thời điểm đó.
  3. Nếu người dùng không authorize, workflow dừng ở trạng thái drift. Agent không tự khôi phục `AGENTS.md`.

  Cách làm này giống `specs/dynamic-search/design.md` §Thứ tự áp dụng.

- **FR-17: Master spec, hai đường dẫn `VI_TOPIC_TERMS`.** Trong `specs/sutta-mcp-requirements.md`, đổi đúng hai token `src/index.ts` ở `:160` và `:293` (đo tại `148b8c0`) thành `src/search.ts`. Không đổi chữ nào khác của file. Việc sửa này nằm trong một task trước task `AGENTS.md` của FR-16 (ví dụ cùng task với README).

## Non-Functional Requirements

- **NFR-1 (không dependency mới):** `git diff 5459d5a -- package.json` chỉ có một dòng thêm vào là script `test`, cộng dấu phẩy kéo theo ở dòng script đứng trước nếu cần. `package-lock.json` không đổi. Không dùng runner, assertion library hay mock library ngoài `node:test` và `node:assert`.
- **NFR-2 (offline, tất định):** `npm test` cho cùng kết quả khi không có mạng. Test không phụ thuộc giờ hệ thống, thứ tự chạy hay biến môi trường.
- **NFR-3 (phạm vi file):** Thay đổi chỉ nằm ở các file sau. Không có file mới nào khác trong `src/` hay ở gốc repo.
  - `src/index.ts`, `src/search.ts` (mới)
  - `test/**` (mới)
  - `package.json` (NFR-1)
  - `README.md`, `AGENTS.md`
  - `specs/sutta-mcp-requirements.md`, chỉ trong giới hạn của FR-17
  - artifact của spec này
- **NFR-4 (Constraints — không tích lũy):** Fixture là dữ liệu test nhỏ, không phải corpus. Tối đa 10 file, tổng dung lượng ≤ 65536 byte, đo bằng số byte thật của nội dung (`cat test/fixtures/* | wc -c`), không đo bằng block đĩa (`du`). Không có field `highlight` (đoạn trích văn bản) hay `translations`. Mỗi fixture giữ chain đến nguồn qua URL request và `uid` của phần tử. Fixture không được làm mới tự động hay theo lịch: chỉ ghi lại khi một thay đổi code cần dạng response mới. Không có script nào trong repo tải hàng loạt response.
- **NFR-5 (build):** `npm run build` (tsc strict) thoát mã 0 với `tsconfig.json` không đổi.
- **NFR-6 (luật verify live):** Mọi harness live, gồm A/B của AC-5 và bước ghi fixture, dùng luật hợp lệ của `specs/dynamic-search/design.md` §Harness và luật hợp lệ. Lần chạy không hợp lệ được chạy lại; với A/B thì chạy lại cả cặp. Không hợp lệ nghĩa là `fetch failed`, `SuttaCentral API error:`, thiếu/thừa dòng `"id":2`, HTTP khác 200 hoặc body không parse được khi ghi fixture. Mismatch trên một lần chạy **hợp lệ** thì dừng và báo, không chạy lại để tìm lần trùng. Script và log tạm nằm ngoài repo và bị xóa sau khi dùng.

## Acceptance Criteria

### AC-1: `npm test` thoát 0, offline

- **Maps to:** FR-6, FR-7, NFR-2
- **Given** cây làm việc sau khi implement, `node_modules` đã cài
- **When** chạy `npm test`, rồi chạy lại với preload ngoài repo làm `globalThis.fetch` ném lỗi (qua `NODE_OPTIONS=--import …`)
- **Then** cả hai lần thoát mã 0, và TAP có `# fail 0`
- **And** `grep -rn -E 'fetch|src/index' test/` không có dòng nào gọi `fetch`, gán `globalThis.fetch` hay import `src/index`

### AC-2: Module thuần, handler chỉ nối

- **Maps to:** FR-1, FR-2, FR-3
- **When** đọc `src/search.ts` và handler `search_topic` trong `src/index.ts`, và chạy grep của FR-2
- **Then** `src/search.ts` chỉ import (nếu có) module thuần, theo FR-3, và export các hàm của FR-1 (a)–(g)
- **And** handler có đúng một `await fetchSearch(` và nhánh `query` rỗng return trước lời gọi đó
- **And** `grep -c -E 'Tìm thấy|Hết kết quả|Còn kết quả:|Khớp tiêu đề:|Khớp nội dung:|Không có kết quả sutta|Không tìm thấy sutta nào' src/index.ts` cho 0 (pattern của FR-2, có dấu `:`), trong khi `grep -c -F "'Còn kết quả'," src/index.ts` cho 1 (chuỗi `describe()` của `page` còn nguyên)
- **And** `node --import tsx -e 'import("./src/search.ts")'` (hoặc lệnh tương đương) kết thúc ngay, mã 0, không in gì

### AC-3: Phủ đủ FR, tên case theo FR

- **Maps to:** FR-12
- **When** chạy `npm test` và đọc tên case trong TAP
- **Then** mỗi id ở bảng FR-12 (FR-3, FR-4, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-18, FR-19, FR-20) là tiền tố của ít nhất một case pass
- **And** mỗi mục "nội dung tối thiểu" của bảng FR-12 có một assertion tương ứng, đối chiếu khi đọc file test

### AC-4: Test bắt được đột biến

- **Maps to:** FR-13
- **Given** một bản sao của cây làm việc ngoài repo
- **When** áp lần lượt từng đột biến (a)–(d) của FR-13, mỗi lần chạy `npm test` rồi hoàn nguyên
- **Then** cả bốn lần đều thoát khác 0, và case fail mang tên FR tương ứng (FR-18, FR-7, FR-9, FR-3)
- **And** bản sao bị xóa sau khi xong; cây làm việc trong repo không đổi

### AC-5: Output năm tool trùng byte với `5459d5a`

- **Maps to:** FR-4, NFR-6
- **Given** bản build `5459d5a` dựng ngoài repo (`git archive 5459d5a src package.json tsconfig.json`, symlink `node_modules`, `npx tsc -p .`) và bản build mới
- **When** chạy harness stdio cho từng cặp (cũ rồi mới, liền nhau, tuần tự) với các input sau:
  - `tools/list`
  - `get_sutta {"uid":"mn10"}`, `get_sutta {"uid":"mn9999"}`, `get_sutta_meta {"uid":"mn10"}`, `get_parallels {"uid":"mn10"}`, `list_divisions {}`
  - `search_topic` với:
    - `{"topic":"vô ngã"}`
    - `{"topic":"chánh niệm","language":"vi","match":"title"}`
    - `{"topic":"mindfulness"}`
    - `{"topic":"mindfulness","match":"title","page":5}`
    - `{"topic":"mindfulness","match":"content","page":147}`
    - `{"topic":"metta"}`
    - `{"topic":"anatta"}`
    - `{"topic":"xyzzyqq"}`
    - `{"topic":""}`
    - `{"topic":"foo:bar"}`
    - `{"topic":"vô ngã tướng","language":"vi","match":"content"}`
    - `{"topic":"mindfulness","page":0}`
- **Then** với mỗi cặp hợp lệ theo NFR-6, `cmp` của text (với `tools/list` là `result.tools`) cho trùng
- **And** một mismatch trên cặp hợp lệ thì dừng và báo; chỉ cặp không hợp lệ được chạy lại

### AC-6: Build sạch, `dist/` không có test

- **Maps to:** FR-8, FR-9, NFR-5
- **When** chạy `rm -rf dist && npm run build && find dist -type f | sort`
- **Then** tsc thoát mã 0, và danh sách đúng là `dist/index.js`, `dist/search.js`
- **And** `git diff --quiet 5459d5a -- tsconfig.json` thoát 0

### AC-7: Phạm vi diff, dependency, bất biến

- **Maps to:** FR-5, FR-6, NFR-1, NFR-3
- **When** chạy `git diff 148b8c0 --stat` (base của nhánh; `src`, `package.json`, `tsconfig.json` trùng `5459d5a`), `git status --porcelain`, `git diff 5459d5a -- package.json package-lock.json`, và các lệnh grep của FR-5
- **Then** mọi file thay đổi hoặc mới đều thuộc danh sách của NFR-3
- **And** diff `package.json` chỉ thêm script `test` (NFR-1), `package-lock.json` không đổi
- **And** các lệnh grep cho 3 / 3 / 0 / 1 / 4 trên `src/index.ts` và 0 cho cả năm lệnh trên `src/search.ts`

### AC-8: Fixture nhỏ, có nguồn, đã cắt đúng

- **Maps to:** FR-10, FR-11, NFR-4
- **When** liệt kê `test/fixtures/` và đọc từng file
- **Then** có ít nhất chín fixture của FR-10 và không quá 10 file; `cat test/fixtures/* | wc -c` ≤ 65536 (byte)
- **And** mỗi file có URL request và ngày ghi; `grep -l -E '"(highlight|translations|fuzzy_dictionary)"' test/fixtures/*` rỗng
- **And** số phần tử `suttaplex`/`hits` và `total` của mỗi fixture khớp bảng §Response search đã đo, hoặc khớp số đo mới được ghi trong design/tasks kèm ngày nếu chỉ mục SC đã trôi
- **And** bước kiểm thô so với đã cắt của FR-11 được ghi lại là đạt, kèm ngày, trong tasks hoặc review

### AC-9: Tài liệu

- **Maps to:** FR-14, FR-15, FR-17
- **When** chạy `grep -n 'npm test' README.md AGENTS.md`, `grep -n -E 'No test runner|Single-file server|Everything lives here' AGENTS.md`, `grep -n 'VI_TOPIC_TERMS' README.md AGENTS.md`, và trên master spec: `grep -c -F 'src/index.ts' specs/sutta-mcp-requirements.md`, `grep -c -F 'src/search.ts' specs/sutta-mcp-requirements.md`, `diff <(git show 148b8c0:specs/sutta-mcp-requirements.md | sed 's#src/index\.ts#src/search.ts#g') specs/sutta-mcp-requirements.md`
- **Then** `npm test` có trong cả hai file
- **And** grep thứ hai trả rỗng
- **And** mọi dòng nêu vị trí `VI_TOPIC_TERMS` đều trỏ tới `src/search.ts`
- **And** AGENTS.md nêu `src/search.ts`, `test/` và `test/fixtures/`
- **And** README có `npm test` trong mục `## Cài đặt`
- **And** trên master spec, hai lệnh đếm cho 0 và 3, và `diff` rỗng (không đổi gì ngoài hai token của FR-17)

### AC-10: Thứ tự AGENTS.md và contract

- **Maps to:** FR-16
- **When** đọc `tasks.md` và lịch sử `workflow-state.json` sau pha build
- **Then** task sửa `AGENTS.md` là task build cuối, chỉ sửa file đó
- **And** contract update cho `dependencies.context:agents` được authorize bởi người dùng trước code review on-completion
- **And** `shasum -a 256 AGENTS.md` bằng sha256 mới của `context:agents` trong `workflow-contract.json`

## Assumptions

- **VERIFIED (đo/đọc 2026-10-19):**
  - Mọi dòng của §Hiện trạng: đọc `src/index.ts`, `package.json`, `tsconfig.json`, `.gitignore`, `AGENTS.md`, `README.md` tại `5459d5a`, và `specs/sutta-mcp-requirements.md` tại `148b8c0`; chạy `grep`/`wc`. Grep literal của FR-2 đã chạy trên `src/index.ts` và trên một bản tách thử trong thư mục tạm (đã xóa).
  - §Thử nghiệm toolchain: `tsx --test` 4.21.0 trên Node v22.17.0 chạy `node:test`, resolve specifier `.js` về `.ts`, và đọc được fixture qua `import.meta.url`. `tsc` với `tsconfig.json` hiện tại không đưa `test/` vào `dist/`.
  - Bảng §Response search đã đo: 9 response ghi bằng `curl -G`, cùng `query`/`language`/`limit=10`/`offset` như `fetchSearch()`. Field đã cắt đọc từ response thô, và danh sách field ở FR-11 khớp các field code đọc ở `src/index.ts:74-93`, `:127-140`, `:238-240`. Thư mục tạm đã xóa.
  - Hit thường không có key `category`; chỉ dictionary hit có. Kiểm trên `anatta`: hit `thi-ap4` không có key này.
- **UNVERIFIED (default stated):**
  - **Node 18.** `engines` là `>=18`, nhưng `tsx --test` chỉ được đo trên Node 22.17.0. Default: không đo trên Node 18/20, vì không có CI và CI nằm ngoài phạm vi. Nếu `npm test` không chạy trên Node cũ thì đó là việc riêng; `npm run build`/`npm start` không bị ảnh hưởng.
  - **Test không được type-check.** `tsx` chỉ bỏ type, không kiểm; `tsc` chỉ kiểm `src/`. `src/search.ts` vẫn được kiểm strict qua `npm run build`. Xem Q2.
  - **Glob trong script.** `tsx --test test/*.test.ts` dựa vào shell POSIX của npm (`sh`) để mở rộng glob. Trên Windows `cmd`, glob không được mở rộng. Default: chấp nhận, vì repo không có tín hiệu nào hỗ trợ Windows cho lệnh dev. Design có thể chọn liệt kê file tường minh.
  - **A/B live cho `search_topic`.** Hai lần chạy của một cặp gọi SC hai lần, và byte-identical chỉ đúng khi upstream trả cùng response. Các lần đo 2026-10-18/19 cho cùng số liệu, và GET có cache server 600 s (dynamic-search §GET/POST). Default: chấp nhận rủi ro nhỏ này. Theo luật 6, mismatch hợp lệ thì dừng và người dùng quyết.
  - **Vị trí `formatCitation()`.** Hàm này được dùng chung với `get_sutta`/`get_sutta_meta`, nên `formatTitleMatch()` cần nó mà không được import `src/index.ts`. Default: design chọn giữa chuyển `formatCitation()` sang `src/search.ts` (export, `src/index.ts` import lại) và truyền nó vào như tham số. Cả hai cách đều phải giữ FR-4 và FR-5.
  - **Kích thước fixture.** Đo 2026-10-19 (ghi live lại cả 9 request, đều HTTP 200, số đếm trùng bảng): 9 file đã cắt theo FR-11, JSON thụt lề 2 dấu cách, có URL và ngày, tổng 52,531 byte theo `cat | wc -c`. Cùng 9 file đó cho tổng `du -k` là 76 trên APFS, vì mỗi file làm tròn lên block 4 KiB; đó là lý do NFR-4/AC-8 đo bằng byte. Trần 65536 byte chừa khoảng 13 KB cho trôi chỉ mục và cho output `5459d5a` lưu kèm nếu có (FR-12).
  - **Fixture là bản chụp, không phải hợp đồng với upstream.** Khi chỉ mục SC trôi, test vẫn pass vì chạy offline. Phát hiện trôi upstream là việc của harness live, không phải của unit test.

## Open Questions

Q1 (sửa hai đường dẫn `VI_TOPIC_TERMS` trong master spec) đã được người dùng chốt ngày 2026-10-19: có sửa. Xem FR-17.

- **Q2 (không chặn; default nêu dưới):** có cần type-check file test (ví dụ thêm một `tsconfig` riêng cho `test/` và chạy `tsc --noEmit` trong `npm test`) không?
  - **Default:** không. Lý do là MVS, `package.json` chỉ thêm `test`, `tsconfig.json` không đổi, và assertion runtime của `node:assert/strict` vẫn bắt sai lệch giá trị.

## Out of Scope

- Test end-to-end hoặc test qua stdio/MCP; mock `fetch` toàn cục; test cho `fetchSearch()` và ba helper fetch khác.
- Linter, CI, công cụ coverage, watch mode.
- Refactor hoặc test `get_sutta`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `extractText()`, `formatUnavailable()`, `formatDivisions()`.
- Bất kỳ thay đổi hành vi nào của `search_topic`: schema, `describe()`, literal output, bảng `VI_TOPIC_TERMS`, luật FR-18.
- Kiểm FR-1 (request), FR-2 (đo thuật ngữ live), FR-13, FR-16 và phần schema zod của FR-17 của dynamic-search (phần cắt trang tiêu đề của FR-17 thì thuộc FR-1(d) ở trên) bằng unit test: các FR này nằm ở `src/index.ts` hoặc phụ thuộc upstream, và vẫn do harness live đảm nhiệm.
- Script ghi/làm mới fixture nằm trong repo; làm mới fixture định kỳ.
- Hỗ trợ Windows cho `npm test`; đo `npm test` trên Node 18/20.
