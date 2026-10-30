# Design: Năm tool là wrapper mỏng của SuttaCentral API, đặt tên theo endpoint

**Status:** Reviewed
**Created:** 2026-10-24
**Spec slug:** tools-api-passthrough
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/search-api-passthrough/` (tiền lệ wrapper mỏng). Spec này thay thế hành vi hiện hành của `non-segmented-translation-guard`, `bilara-lang-param`, `segment-id-in-get-sutta`, `get-sutta-unknown-uid` và bảng `DIVISIONS`. Artifact của các spec đó giữ nguyên làm lịch sử.

## Context Recap

Requirements (Status: Reviewed) biến bốn tool còn lại thành wrapper mỏng của bốn endpoint SuttaCentral, đặt tên theo endpoint: `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu`. `search_topic` đổi tên thành `search_instant`, chỉ thêm một câu cảnh báo kích thước vào mô tả tool (FR-1, FR-6). Tham số của tool là tham số của API. Mỗi lời gọi phát đúng một GET, chỉ với tham số caller truyền (FR-2..FR-4). Một hàm thuần dựng URL, và handler dùng nguyên URL đó cho `fetch` và cho dòng nguồn (FR-5). `json` trả body nguyên văn (FR-7). `text` in mọi key và phần tử ở mọi độ sâu, theo thứ tự body, bằng một bộ hiển thị đệ quy chung (FR-8..FR-12, C1 (A)). Mọi logic tự chế bị bỏ (FR-15). Requirements cũng yêu cầu unit test offline có giá trị phân biệt (FR-17, FR-18), sửa tài liệu (FR-19..FR-21), và sửa `AGENTS.md` cuối cùng rồi cập nhật contract khi người dùng authorize (FR-22).

Tài liệu này chốt những gì requirements để lại cho design:

1. Module thuần mới `src/passthrough.ts`: bốn hàm dựng URL, bộ hiển thị chung, chữ của nhãn cấu trúc (FR-10 để design chốt). Nguyên văn toàn file, khối P1.
2. `src/index.ts` nguyên văn toàn file (khối I1), gồm mọi `describe()` theo FR-14 và câu cảnh báo của `search_instant` theo FR-6. Ba sửa một dòng ở `src/search.ts`, `test/search.test.ts`, `package.json` (SE-1, SE-2, TS-1, PK-1).
3. Output `json` được dựng trong module thuần, nên dòng FR-7 của bảng FR-17 **áp dụng**.
4. Test mới `test/passthrough.test.ts` nguyên văn (T2). Bốn fixture mới, cách ghi và cách cắt (F1..F3).
5. Lệnh đột biến FR-18 (V1), harness live và bộ kiểm AC (V3..V5).
6. Các khối sửa tài liệu và thứ tự áp dụng, gồm bước cập nhật contract cho `AGENTS.md`.
7. Bảng verify từ mỗi AC tới lệnh.

Mọi số đo và kết quả trong tài liệu này được đo ngày **2026-10-24**, trên một bản dựng thử trong thư mục `mktemp -d` ngoài repo (đã xóa):

- `git archive 7dc2299` (`src`, `test`, `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md`), `node_modules` symlink về repo. Node v22.17.0, `@modelcontextprotocol/sdk` 1.29.0, zod 3.25.76.
- P1, I1, T2 và các sửa một dòng được ghi vào bản dựng thử đúng như trong tài liệu này. `npx tsc -p .` thoát 0; `dist/` có `index.js`, `passthrough.js`, `search.js`.
- Bốn fixture ghi live bằng F2 (4 dòng `OK … 200`), cắt bằng F3. `npm test`: `# pass 20`, `# fail 0`, cả khi `globalThis.fetch` bị preload làm ném lỗi.
- Sáu đột biến (V1): cả sáu làm `npm test` thoát 1. Harness live V3..V5 trên bản build thử và bản build `7dc2299`: 51/51 mệnh đề `PASS` (AC-1..AC-11).
- 33 request `curl` (body và header) tới bốn endpoint mới và `search/instant` để đo lại mọi literal của tài liệu này. Mọi request HTTP 200, không lỗi truyền tải.
- Mô phỏng mọi khối tài liệu trên bản sao của `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md` tại `7dc2299`.

## High-Level Design

```
get_<tool>({ format, ...params })                            src/index.ts (I1), bốn handler cùng hình
  ├─ url = build<Endpoint>Url(params)                          src/passthrough.ts — đúng 1 lần, 1 biến
  ├─ res = await fetch(url)                                    src/index.ts — đúng 1 request
  ├─ !res.ok → throw `SuttaCentral API error: ${status}`
  └─ content = renderBody(url, await res.text(), format)      src/passthrough.ts
        ├─ json → [ body nguyên văn, dòng nguồn(url) ]
        └─ text → dòng nguồn(url), rồi render(JSON.parse(body)) — đệ quy, thứ tự body

search_instant({ format, ...params })                         src/index.ts — khối search_topic cũ, đổi tên
  └─ buildSearchUrl / renderSearch                             src/search.ts — thân hàm không đổi

test/passthrough.test.ts ──import──▶ src/passthrough.ts ◀──import── src/index.ts ──import──▶ src/search.ts ◀── test/search.test.ts
        └─ readFileSync(test/fixtures/*.json)            (không mạng, không đụng globalThis.fetch)
```

Năm quyết định trung tâm:

1. **Một module thuần mới `src/passthrough.ts` cho bốn tool; `src/search.ts` chỉ bỏ `formatCitation()`.** FR-5 đòi hàm dựng URL nằm trong module không import gì. Module mới không import `src/search.ts`, nên nó có `sourceLine()` riêng, cùng chữ với `search.ts` (FR-9; test FR-9 của T2 ghim literal `Nguồn: SuttaCentral — `). NFR-3 cho phép tối đa một file mới trong `src/`; NFR-2 cho phép đúng một file `.js` mới trong `dist/`.
2. **Bốn hàm dựng URL dùng chung một hàm private `apiUrl(path, key, value)`.** Mỗi endpoint có đúng một tham số query (requirements §Hình dạng API), nên `apiUrl` nhận đúng một cặp key/giá trị. Phần path `undefined` bị bỏ, nên `author_uid` và `submenu_id` vắng thì không có segment. Path mã hóa bằng `encodeURIComponent`, query bằng `URLSearchParams` như `buildSearchUrl()`.
3. **Bộ hiển thị chung là một hàm đệ quy `render()` và một hàm `head()`.** Mỗi giá trị một dòng `{nhãn}: {head}`, con thụt thêm hai dấu cách. `head()` của object/mảng là nhãn có chữ (`{object, 19 key}`, `[mảng, 43 phần tử]`, `{object rỗng}`, `[mảng rỗng, 0 phần tử]`), không phải `{}`/`[]` trần: đo được 68 giá trị chuỗi `"{}"` trong `html_text` của `bilarasuttas/mn10` (193 ở `dn22`, 621 ở `dn16`), nên `{}` trần sẽ trùng với chuỗi đó.
4. **Handler gọi `fetch(url)` trực tiếp; ba helper `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels` bị xóa.** Như vậy AC-13 kiểm được bằng mắt ở từng handler: đối số của `fetch` là chính biến `url`, viết trần (cùng lý do với quyết định 2 của tiền lệ). `grep -c 'fetch(' src/index.ts` = 5 (một mỗi tool).
5. **Fixture mang `tool` và `params`.** Mỗi fixture có dạng `{ url, recorded, tool, params, body }`. Test kiểm `build<Endpoint>Url(params) === url` (FR-5), nên fixture được ràng buộc với đúng request tool phát. Script ghi (F2) dựng URL bằng chính các hàm đó.

### Đọc tối thiểu để implement

Các khối ràng buộc được đánh dấu **[NORMATIVE]** tại chỗ. Mỗi khối có một dòng neo `<!-- block: TÊN -->` ngay trước code fence, để trích bằng máy (hàm `blk` ở §Lắp ráp):

1. §P1: `src/passthrough.ts`, nguyên văn toàn file.
2. §I1: `src/index.ts`, nguyên văn toàn file.
3. §Sửa một dòng: SE-1, SE-2 (`src/search.ts`), TS-1 (`test/search.test.ts`), PK-1 (`package.json`).
4. §T2: `test/passthrough.test.ts`, nguyên văn toàn file.
5. §Fixture: F1 (danh sách), F2 (ghi), F3 (cắt), bảng số đo.
6. §Khối sửa tài liệu: R-1, R-2, M-1..M-13, A-1..A-4, và §Thứ tự áp dụng.
7. §Testability: V1 (đột biến), V3..V5 (harness live), bảng verify.

### Câu hỏi mở

Không câu nào chặn task. Mỗi câu có default của design; tài liệu được viết theo default.

- **Q1 — uid là `.` hoặc `..`.** `encodeURIComponent` giữ nguyên dấu chấm, và trình phân tích URL của `fetch` chuẩn hóa dot-segment: `…/suttaplex/..` thành `https://suttacentral.net/api/`, `…/bilarasuttas/mn10/%2E%2E` thành `…/api/bilarasuttas/` (đo bằng `new URL()` trên Node v22.17.0). Khi đó request thật khác URL in ở dòng nguồn. Requirements (C5) chỉ chốt `min(1)`. **Default:** không thêm kiểm, ghi ở Risks. Cách khác: thêm `.refine((s) => s !== "." && s !== "..")` cho ba tham số path; đổi I1 và `inputSchema`, không đổi P1.
- **Q2 — chuỗi trông như literal JSON.** Theo C1/C2, chuỗi in nguyên văn và chỉ chuỗi rỗng in là `""`. Vì vậy trong `text`, chuỗi `"2019"` và số `2019` in giống nhau, cũng như chuỗi `"null"` và `null`. Đo: `translations[].publication_date` là chuỗi năm (`suttaplex/mn10`: 29 trong 43 mục `translations`; `suttaplex/mn`: 2,821 trong 4,442). FR-10 không đòi phân biệt hai trường hợp này; `json` phân biệt được. **Default:** giữ nguyên văn. Cách khác ở §Alternative C.
- **Q3 — `scripts.test` liệt kê file hay dùng glob.** **Default:** liệt kê hai file (PK-1). Glob không trích dẫn (`test/*.test.ts`) chỉ được shell POSIX mở rộng; glob trích dẫn chỉ được `node --test` mở rộng từ Node 21, trong khi `engines` là `>=18`. Hệ quả: file test thứ ba sau này phải thêm vào PK-1.

### Vùng được bảo vệ

- **`buildSearchUrl()`, `renderSearch()` và các hàm private của `src/search.ts` không đổi từng byte.** Lệnh `SEARCH-OK` ở §Lắp ráp tái dựng `src/search.ts` từ `7dc2299` chỉ với SE-1, SE-2 và việc xóa `:151-167`.
- **Khối tool search trong I1 trùng `7dc2299:src/index.ts:99-157`**, trừ tên tool ở hai dòng và câu `S` nối vào cuối mô tả tool (FR-6). Lệnh `SEARCH-INSTANT-OK` kiểm điều này. AC-10 kiểm thêm ở mức output và `inputSchema`.
- **Case và fixture của `test/search.test.ts` không đổi**, trừ comment dòng 1 (TS-1, C11).

## Data Model

Không có entity lưu trữ. Các kiểu export từ P1:

| Kiểu | Hình dạng | Ràng buộc |
|---|---|---|
| `BilarasuttasParams` | `{ uid: string; author_uid?: string; lang?: string }` | Trùng kiểu suy ra từ zod schema của `get_bilarasuttas` sau khi bỏ `format` (compile trên bản dựng thử). Key vắng hoặc `undefined`: không gửi |
| `SuttaplexParams`, `ParallelsParams` | `{ uid: string; language?: string }` | Như trên |
| `MenuParams` | `{ submenu_id?: string; language?: string }` | Như trên; `{}` hợp lệ |
| `Format` | `"text" \| "json"` | Trùng `z.enum(["text","json"])` |
| `TextContent` | `{ type: "text"; text: string }` | Kiểu phần tử content mà callback của `server.tool()` chấp nhận |

`Format` và `TextContent` trùng hình với `SearchFormat`/`TextContent` của `src/search.ts`. Chúng được khai báo lại vì module thuần không import gì (FR-5).

**Body response** không có kiểu tĩnh. `renderBody()` nhận chuỗi; nhánh `text` parse thành `unknown`. `render()` chỉ phân nhánh bằng `Array.isArray`, `typeof … === "object"` và `!== null`, nên mọi giá trị JSON đều hiển thị được (case FR-12 của T2).

**Hệ quả của `JSON.parse` (C12, đã chấp nhận):** key dạng chỉ số mảng (`"0"`, `"1"`…) bị đưa lên đầu object theo thứ tự tăng dần; số được in lại qua `JSON.stringify` của số thực JS (ví dụ `1.0` thành `1`, số nguyên lớn hơn 2^53 mất chính xác). Đo trên 27 body của tài liệu này: 0 key dạng chỉ số, 0 số không nguyên, 0 số nguyên vượt `Number.MAX_SAFE_INTEGER`, 0 chuỗi chứa xuống dòng, độ sâu tối đa 6. `json` không bị ảnh hưởng vì không parse.

**Fixture** (`test/fixtures/<tên>.json`), xem §Fixture:

```json
{
  "url": "https://suttacentral.net/api/…",
  "recorded": "YYYY-MM-DD",
  "tool": "get_bilarasuttas | get_suttaplex | get_parallels | get_menu",
  "params": { "uid": "…" },
  "body": …
}
```

## API / Interface Contracts

**Interface ra ngoài** (`tools/list`, đo trên bản dựng thử, AC-11):

| Tool | `properties` (thứ tự) | `required` | `default` |
|---|---|---|---|
| `search_instant` | trùng byte `search_topic` của `7dc2299` | `["query"]` | `format: "text"` |
| `get_bilarasuttas` | `uid`, `author_uid`, `lang`, `format` | `["uid"]` | chỉ `format: "text"` |
| `get_suttaplex` | `uid`, `language`, `format` | `["uid"]` | chỉ `format: "text"` |
| `get_parallels` | `uid`, `language`, `format` | `["uid"]` | chỉ `format: "text"` |
| `get_menu` | `submenu_id`, `language`, `format` | không có key `required` | chỉ `format: "text"` |

`uid`, `author_uid`, `submenu_id` có `"minLength": 1`. Thứ tự tên trong `tools/list`: `search_instant`, `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu`.

**Export của `src/passthrough.ts`:**

| Export | Chữ ký | FR |
|---|---|---|
| `buildBilarasuttasUrl` | `(p: BilarasuttasParams) => string` | FR-3, FR-4, FR-5 |
| `buildSuttaplexUrl` | `(p: SuttaplexParams) => string` | FR-3, FR-4, FR-5 |
| `buildParallelsUrl` | `(p: ParallelsParams) => string` | FR-3, FR-4, FR-5 |
| `buildMenuUrl` | `(p: MenuParams) => string` | FR-3, FR-4, FR-5 |
| `renderBody` | `(url: string, raw: string, format: Format) => TextContent[]` | FR-7..FR-12 |
| các kiểu ở §Data Model | kiểu | — |

Các hàm private: `apiUrl`, `sourceLine`, `render`, `head`. Module-scope chỉ có khai báo `type` và `function`; `grep -c -E '^(let|var|const) ' src/passthrough.ts` = 0 (FR-16).

**URL** (FR-3, FR-4; case FR-3, FR-4 của T2):

| Input | URL |
|---|---|
| `get_bilarasuttas {uid:"mn10"}` | `https://suttacentral.net/api/bilarasuttas/mn10` |
| `{uid:"mn10",author_uid:"sujato",lang:"vi"}` | `…/api/bilarasuttas/mn10/sujato?lang=vi` |
| `get_suttaplex {uid:"mn10",language:"vi"}` | `…/api/suttaplex/mn10?language=vi` |
| `get_parallels {uid:"mn10"}` | `…/api/parallels/mn10` |
| `get_menu {}` / `{submenu_id:"long",language:"vi"}` | `…/api/menu` / `…/api/menu/long?language=vi` |
| `get_menu {language:""}` | `…/api/menu?language=` (caller đã truyền, nên gửi) |
| `uid:"a b?c#d"` / `author_uid:"x/y"` | `a%20b%3Fc%23d` / `x%2Fy`; server giải mã `%2F` (C5), tool không bù |

### Bố cục output `text`

P1 là nguồn ràng buộc; phần này chỉ tóm tắt. Các dòng nối bằng `"\n"`, không có newline ở cuối.

1. Dòng 1: `Nguồn: SuttaCentral — {url}`, với `{url}` là chính chuỗi hàm dựng trả. Dòng này cũng là item thứ hai của `json` (FR-9).
2. Dòng 2: `head(body)`, không nhãn.
3. Sau đó, theo thứ tự trước của body: mỗi key của object hoặc phần tử của mảng là một dòng `{thụt}{nhãn}: {head(giá trị)}`. Nhãn là key nguyên văn, hoặc `[i]` cho phần tử mảng. Con của giá trị top-level không thụt; mỗi cấp sâu hơn thụt thêm hai dấu cách.

| Giá trị | `head()` | FR |
|---|---|---|
| chuỗi khác rỗng | nguyên văn: không trim, không bỏ HTML, không cắt | FR-10.4 |
| chuỗi rỗng | `""` | FR-10.5, C2 |
| số, boolean, `null` | `JSON.stringify(v)`: `2`, `true`, `null` | FR-10.5 |
| mảng | `[mảng, {length} phần tử]`; rỗng: `[mảng rỗng, 0 phần tử]` | FR-10.2, FR-10.5 |
| object | `{object, {số key} key}`; rỗng: `{object rỗng}` | FR-10.3, FR-10.5 |

Key vắng thì không có dòng, nên phân biệt được với chuỗi rỗng, `null`, object rỗng, mảng rỗng. Body top-level `{}` cho `{object rỗng}`, `[]` cho `[mảng rỗng, 0 phần tử]` (đoạn cuối FR-10). Ngoài dòng nguồn và các nhãn cấu trúc trên, output không có chữ nào không có trong body (FR-10.6).

Ví dụ cắt từ output thật của `get_parallels {"uid":"mn10"}` (đo 2026-10-24, dòng `volpages` rút gọn ở đây):

```text
Nguồn: SuttaCentral — https://suttacentral.net/api/parallels/mn10
{object, 4 key}
mn10: [mảng, 8 phần tử]
  [0]: {object, 5 key}
    enumber: 10
    to: {object, 13 key}
      to: dn22
      volpages: PTS DN 2.290, PTS 2.291, …
      alt_volpages: null
      acronym: DN 22
      …
      translations: [mảng, 31 phần tử]
        [0]: {object, 8 key}
          lang: pli
```

### P1 — `src/passthrough.ts` — **[NORMATIVE]**

File mới, nguyên văn.

<!-- block: P1 -->
```ts
// Logic thuần của bốn tool get_bilarasuttas, get_suttaplex, get_parallels, get_menu (spec
// tools-api-passthrough): dựng URL request của từng endpoint và dựng output từ body response.
// Không lọc, không gộp, không sắp lại, không cắt. Module không import gì, không I/O, không giữ
// trạng thái. src/index.ts gọi API; test/ import thẳng module này.

// Tham số API của từng tool, cùng tên với API. Tham số vắng thì không gửi.
export type BilarasuttasParams = { uid: string; author_uid?: string; lang?: string };
export type SuttaplexParams = { uid: string; language?: string };
export type ParallelsParams = { uid: string; language?: string };
export type MenuParams = { submenu_id?: string; language?: string };
export type Format = "text" | "json";
export type TextContent = { type: "text"; text: string };

// URL request duy nhất của một lời gọi. Handler truyền nguyên chuỗi này cho fetch và cho
// renderBody(); không nơi nào khác dựng hay sửa URL của bốn endpoint này.
export function buildBilarasuttasUrl(p: BilarasuttasParams): string {
  return apiUrl(["bilarasuttas", p.uid, p.author_uid], "lang", p.lang);
}

export function buildSuttaplexUrl(p: SuttaplexParams): string {
  return apiUrl(["suttaplex", p.uid], "language", p.language);
}

export function buildParallelsUrl(p: ParallelsParams): string {
  return apiUrl(["parallels", p.uid], "language", p.language);
}

export function buildMenuUrl(p: MenuParams): string {
  return apiUrl(["menu", p.submenu_id], "language", p.language);
}

// Mỗi phần path khác undefined được mã hóa như một path segment; phần undefined bị bỏ. Mỗi endpoint
// có đúng một tham số query, chỉ gửi khi khác undefined. Không có giá trị mặc định nào.
function apiUrl(path: (string | undefined)[], key: string, value: string | undefined): string {
  const segments = path.filter((s): s is string => s !== undefined).map((s) => encodeURIComponent(s));
  const query = value === undefined ? "" : `?${new URLSearchParams({ [key]: value })}`;
  return `https://suttacentral.net/api/${segments.join("/")}${query}`;
}

// `raw`: body response đọc bằng res.text(). json: body nguyên văn rồi dòng nguồn. text: dòng nguồn
// rồi body theo render(); body phải parse được JSON, nếu không JSON.parse ném lỗi và SDK dựng isError.
export function renderBody(url: string, raw: string, format: Format): TextContent[] {
  if (format === "json") return [{ type: "text", text: raw }, { type: "text", text: sourceLine(url) }];
  const lines = [sourceLine(url)];
  render(lines, "", undefined, JSON.parse(raw));
  return [{ type: "text", text: lines.join("\n") }];
}

function sourceLine(url: string): string {
  return `Nguồn: SuttaCentral — ${url}`;
}

// Mỗi giá trị một dòng `{nhãn}: {head}`; nhãn là key của object hoặc `[i]` của mảng, giá trị
// top-level không có nhãn. Con của object/mảng in ngay sau nó, theo thứ tự body, thụt thêm hai dấu
// cách (con của giá trị top-level không thụt). Không bỏ, không gộp, không sắp lại, không cắt.
function render(lines: string[], indent: string, label: string | undefined, v: unknown): void {
  lines.push(label === undefined ? indent + head(v) : `${indent}${label}: ${head(v)}`);
  const inner = label === undefined ? indent : indent + "  ";
  const children: [string, unknown][] = Array.isArray(v)
    ? v.map((e, i) => [`[${i}]`, e])
    : v !== null && typeof v === "object"
      ? Object.entries(v)
      : [];
  for (const [k, e] of children) render(lines, inner, k, e);
}

// Chuỗi: nguyên văn, chuỗi rỗng là `""`. Số, boolean, null: literal JSON. Mảng, object: kiểu kèm
// số phần tử hoặc số key; nội dung nằm ở các dòng con.
function head(v: unknown): string {
  if (typeof v === "string") return v === "" ? '""' : v;
  if (Array.isArray(v)) return v.length === 0 ? "[mảng rỗng, 0 phần tử]" : `[mảng, ${v.length} phần tử]`;
  if (v !== null && typeof v === "object") {
    const n = Object.keys(v).length;
    return n === 0 ? "{object rỗng}" : `{object, ${n} key}`;
  }
  return JSON.stringify(v);
}
```

Tính chất (đo trên bản dựng thử):

- Không có `import`. `URLSearchParams` và `encodeURIComponent` là global. Không có `try`/`catch`.
- `apiUrl` bỏ phần path `undefined` bằng type predicate, nên `p.author_uid`/`p.submenu_id` vắng không sinh segment `undefined`. Chuỗi rỗng không bao giờ tới đây cho tham số path, vì zod `min(1)` từ chối trước handler (AC-9). `lang`/`language` rỗng vẫn được gửi (`?language=`), vì caller đã truyền.
- Không có giá trị mặc định nào cho tham số API: không `?? "en"`, không `?? "sujato"`. Đột biến (b), (f) của V1 thêm đúng hai mặc định đó và bị test bắt.
- Mọi con của object/mảng đi qua một dòng `for (const [k, e] of children)`. Đột biến (a), (d), (e) sửa dòng này; (c) sửa dòng `Object.entries(v)`.
- `renderBody(…, "text")` gọi `JSON.parse`; body 2xx không phải JSON ném `SyntaxError`, SDK dựng `isError: true` (FR-12). Nhánh `json` không parse.
- `wc -l` = 77.

### I1 — `src/index.ts` — **[NORMATIVE]**

Toàn file, nguyên văn. Thay toàn bộ `src/index.ts` của `7dc2299`. Dòng 21–79 là khối `search_topic` của `7dc2299:99-157`: dòng 21 và 23 đổi tên, dòng 24 nối thêm `" " + S` trước `",` cuối dòng. Câu `S` là đoạn từ `Output có thể rất lớn` tới hết câu trên dòng 24; nó chỉ có ở khối này.

<!-- block: I1 -->
```ts
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildBilarasuttasUrl,
  buildMenuUrl,
  buildParallelsUrl,
  buildSuttaplexUrl,
  renderBody,
} from "./passthrough.js";
import { buildSearchUrl, renderSearch } from "./search.js";

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "sutta-mcp",
  version: "0.1.0",
});

// Tool 1: search_instant
server.tool(
  "search_instant",
  "Wrapper mỏng của search SuttaCentral (GET https://suttacentral.net/api/search/instant): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên kết quả theo thứ tự SuttaCentral, không lọc, không khử trùng, không sắp lại. Body có hai mảng. `suttaplex` là khớp tiêu đề: với truy vấn thường, API trả nguyên mảng ở mọi trang; với truy vấn bắt đầu bằng `title:`, `suttaplex` theo `limit`/`offset` như `hits`; với truy vấn là một uid (ví dụ `mn10`), `suttaplex` chỉ có sutta đó. Vì vậy khớp tiêu đề lặp lại ở mọi `offset`, trừ khi truy vấn bắt đầu bằng `title:`. `hits` là khớp nội dung, gồm cả mục dictionary, bài viết và mỗi bản dịch một mục, phân trang bằng `limit`/`offset`. API bỏ khỏi `hits` các sutta đã có trong `suttaplex`, nên một trang có thể có ít hơn `limit` hit trong khi vẫn còn kết quả. `total` là số đếm xấp xỉ của SuttaCentral: nó phụ thuộc `limit`, bị trừ đi các hit bị bỏ ở trang hiện tại, và khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề. Vì vậy `total` không phải tín hiệu tin được để biết còn trang sau. Muốn biết còn kết quả hay không: gọi lại với `offset` lớn hơn và xem có mục mới không. Tìm bằng tiếng Việt: truyền `language` = `vi` để khớp tiêu đề tiếng Việt, và `selectedLanguages` có `vi` để có bản dịch tiếng Việt trong `hits`. Output có thể rất lớn, vì tool không lọc và `json` trả nguyên body: ví dụ `mindfulness` với `language` = `en` cho body 140,685 B, phần lớn là `translations` của các mục `suttaplex`; `limit`/`offset` chỉ phân trang `hits`, còn với truy vấn thường thì `suttaplex` (khớp tiêu đề) được trả nguyên mảng; muốn thu hẹp, dùng truy vấn bắt đầu bằng `title:` (khi đó `suttaplex` theo `limit`/`offset`) hoặc một truy vấn cụ thể hơn.",
  {
    query: z
      .string()
      .describe(
        "Chuỗi tìm kiếm, gửi nguyên văn: không chuẩn hóa, không trim, không đổi hoa/thường. Nhận cả lệnh lọc của SuttaCentral, ví dụ 'title:mindfulness', 'list authors'. Ví dụ: 'mindfulness', 'satipatthana', 'niệm xứ' (kèm language='vi')."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Mã ngôn ngữ gửi tới API, ví dụ 'en', 'vi'. Quyết định ngôn ngữ của tiêu đề được khớp và trả về. Bỏ trống thì không gửi, và kết quả khác với 'en'. Tìm bằng tiếng Việt: truyền 'vi' để khớp tiêu đề tiếng Việt."
      ),
    limit: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Số hit tối đa của trang `hits`, gửi nguyên tới API. Bỏ trống: API dùng mặc định 10."),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Vị trí bắt đầu của trang `hits`, gửi nguyên tới API. Bỏ trống: API dùng mặc định 0."),
    selectedLanguages: z
      .array(z.string())
      .optional()
      .describe(
        'Ngôn ngữ của các bản văn trong `hits`, gửi tới API dạng chuỗi JSON. Bỏ trống: API dùng mặc định ["en","pli"]. Muốn có bản dịch tiếng Việt trong `hits`, truyền mảng có "vi", ví dụ ["vi","pli"].'
      ),
    restrict: z
      .string()
      .optional()
      .describe(
        "Giới hạn loại kết quả, gửi nguyên tới API. 'all' coi như không giới hạn. 'dictionaries' làm API trả body null. Bỏ trống: không gửi."
      ),
    matchpartial: z
      .boolean()
      .optional()
      .describe("Bật khớp một phần, gửi tới API dạng 'true'/'false'. Bỏ trống: API mặc định tắt."),
    format: z
      .enum(["text", "json"])
      .default("text")
      .describe(
        "'text' (mặc định): dòng nguồn kèm URL request, rồi mọi phần tử của `suttaplex` và `hits` theo thứ tự API (mỗi mục kèm link SuttaCentral khi có), `total`, `fuzzy_dictionary`, và `error` nếu có. 'json': item thứ nhất là body response nguyên văn, item thứ hai là dòng nguồn kèm URL request."
      ),
  },
  async ({ format, ...params }) => {
    // Wrapper mỏng (spec search-api-passthrough): một URL, dùng nguyên cho fetch và cho output.
    const url = buildSearchUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderSearch(url, await res.text(), format) };
  }
);

// ─── Bốn tool passthrough (spec tools-api-passthrough) ──────────────────────
// Mỗi handler: dựng URL đúng một lần vào một biến, fetch đúng biến đó, kiểm `ok`, rồi trả
// renderBody() với cùng biến. Không retry, không fallback, không request nào khác.

// Tham số `format` chung của bốn tool. Không gửi tới API.
const formatParam = z
  .enum(["text", "json"])
  .default("text")
  .describe(
    "'text' (mặc định): dòng nguồn kèm URL request, rồi body theo đúng thứ tự SuttaCentral: mỗi giá trị một dòng `key: giá trị`, phần tử mảng có nhãn `[i]`; object ghi số key và mảng ghi số phần tử, rồi in các con ở các dòng sau, thụt thêm hai dấu cách. Chuỗi in nguyên văn, chuỗi rỗng in `\"\"`; số, boolean và null in dạng JSON. 'json': item thứ nhất là body response nguyên văn, item thứ hai là dòng nguồn kèm URL request."
  );

// Tool 2: get_bilarasuttas
server.tool(
  "get_bilarasuttas",
  'Wrapper mỏng của GET https://suttacentral.net/api/bilarasuttas/{uid}/{author_uid}?lang={lang} (không có `author_uid` thì là GET https://suttacentral.net/api/bilarasuttas/{uid}): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body là object gồm các map `comment_text`, `html_text`, `root_text`, `translation_text`, `variant_text`, `reference_text` (map nào SuttaCentral không có thì không có key) và mảng `keys_order`. Key của mỗi map là segment ID (ví dụ `mn10:1.1`); `keys_order` là thứ tự đọc. Bỏ `author_uid` thì body chỉ có văn bản gốc: không có `translation_text` và `comment_text`; `author_uid` không có bản dịch của sutta này cũng cho đúng body đó. Bản dịch không phải tiếng Anh cần `lang` của bản dịch đó, lấy từ `translations[].lang` của `get_suttaplex`, ví dụ `dhp1-20` với `author_uid` = `phantuananh` và `lang` = `vi`. `lang` không khớp bản dịch của `author_uid` thì body không có `translation_text`, ví dụ `mn10` với `sujato` và `lang` = `vi`. Không tìm thấy (uid sai, kể cả sai hoa/thường như `MN10`, hoặc uid của một bộ như `dn`): SuttaCentral trả HTTP 200 với body `{"msg": "Not Found"}`. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Kích thước theo chính sutta, và không có tham số nào thu nhỏ: `dn22` với `sujato` khoảng 158 KB, `dn16` với `sujato` khoảng 633 KB. Bỏ `author_uid` thì body không có `translation_text` và `comment_text` (`dn16`: khoảng 345 KB), nhưng đó là đổi nội dung, không phải thu hẹp.',
  {
    uid: z
      .string()
      .min(1)
      .describe(
        "UID của sutta, ví dụ 'mn10', 'sn56.11', 'dhp1-20'. Gửi nguyên văn như một path segment: không trim, không đổi hoa/thường."
      ),
    author_uid: z
      .string()
      .min(1)
      .optional()
      .describe(
        "ID dịch giả, ví dụ 'sujato' (tiếng Anh) hoặc 'phantuananh' (tiếng Việt, cần lang 'vi'); lấy từ `translations[].author_uid` của `get_suttaplex`. Gửi như path segment thứ hai. Bỏ trống thì không gửi segment này, và body chỉ có văn bản gốc."
      ),
    lang: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của bản dịch, gửi dạng query `lang`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Phải khớp `translations[].lang` của bản dịch trong `get_suttaplex`; không khớp thì body không có `translation_text`. Không thu nhỏ output."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildBilarasuttasUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// Tool 3: get_suttaplex
server.tool(
  "get_suttaplex",
  "Wrapper mỏng của GET https://suttacentral.net/api/suttaplex/{uid}?language={language}: mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body luôn là mảng. Với uid của một sutta, mảng có một phần tử là metadata của sutta (`acronym`, `uid`, `blurb`, `difficulty`, `original_title`, `translated_title`, `translations`, `parallel_count`, `previous`, `next`, …). `translations` liệt kê mọi bản dịch, kể cả văn bản gốc (`is_root`); `author_uid` và `lang` của mỗi mục dùng làm tham số của `get_bilarasuttas`. Với uid của division hay vagga, mảng có mọi sutta bên dưới, là cây được duỗi theo thứ tự trước (ví dụ `mn`: 171 phần tử), nên output rất lớn. `language` đổi các field phụ thuộc ngôn ngữ: `translated_title`, tên trong `previous`/`next`, `translations[].title` và `priority_author_uid` (`mn10` với `vi`: `null`); `blurb` có thể vẫn là tiếng Anh, và số mục `translations` không đổi. Không tìm thấy: SuttaCentral trả HTTP 200 với mảng một phần tử có `uid` là `null` và `translations` rỗng. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Muốn thu hẹp, truyền uid của một sutta (ví dụ `mn10`, khoảng 13 KB) thay vì uid của division (`mn`: 171 phần tử, khoảng 1.3 MB).",
  {
    uid: z
      .string()
      .min(1)
      .describe(
        "UID của sutta (ví dụ 'mn10', 'dn22'), hoặc của division hay vagga (ví dụ 'mn': mọi sutta bên dưới, output rất lớn). Gửi nguyên văn như một path segment: không trim, không đổi hoa/thường."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của các field phụ thuộc ngôn ngữ, gửi dạng query `language`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Đổi `translated_title`, `previous`/`next` `name`, `translations[].title` và `priority_author_uid` (`mn10` với 'vi': `null`); `blurb` có thể vẫn là tiếng Anh."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildSuttaplexUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// Tool 4: get_parallels
server.tool(
  "get_parallels",
  "Wrapper mỏng của GET https://suttacentral.net/api/parallels/{uid}?language={language}: mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body là object. Mỗi key là anchor của sutta nguồn, có thể kèm `#segment` (ví dụ `mn10`, `mn10#44.1`), theo thứ tự SuttaCentral sắp. Giá trị là mảng parallel `{enumber, to, type, remark, resembling}`; target nằm trong `to` (`to.uid`, `to.acronym`, `to.translated_title`, `to.translations`, …). `type` là loại parallel, ví dụ `full`, `mention`; `resembling` là `true` khi parallel chỉ tương đồng một phần. `language` đổi `to.translated_title` và `to.translations[].title`. Không tìm thấy: SuttaCentral trả HTTP 200 với body `{}`; uid của division (ví dụ `mn`) cũng trả `{}`. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Kích thước theo chính sutta, và không có tham số nào thu nhỏ: `dn16` có 43 anchor, 162 parallel, khoảng 321 KB; `dn22` khoảng 78 KB.",
  {
    uid: z
      .string()
      .min(1)
      .describe(
        "UID của sutta nguồn, ví dụ 'mn10', 'dn22'. Gửi nguyên văn như một path segment: không trim, không đổi hoa/thường."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của tiêu đề target, gửi dạng query `language`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Đổi `to.translated_title` và `to.translations[].title`; không phải cách thu nhỏ output."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildParallelsUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// Tool 5: get_menu
server.tool(
  "get_menu",
  "Wrapper mỏng của GET https://suttacentral.net/api/menu/{submenu_id}?language={language} (không có `submenu_id` thì là GET https://suttacentral.net/api/menu): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body là mảng node (`uid`, `root_name`, `translated_name`, `blurb`, `node_type`, …). Mỗi lần gọi trả một cấp con: node con có `has_children` nhưng không có `children`; gọi tiếp với `uid` của node con để xuống cấp sau. Không có `submenu_id` thì trả mọi node gốc, gồm ba tạng `sutta`, `vinaya`, `abhidhamma` (chỉ ba node này có `children` khác rỗng) và nhiều node rời có `children` rỗng. Muốn duyệt theo tạng thì truyền `submenu_id` là `sutta`, `vinaya` hoặc `abhidhamma`, rồi gọi tiếp với uid con, ví dụ `long` cho `dn`, `da`, `da-ot`. `language` đổi `translated_name` (ví dụ `sutta` với `vi`: `Kinh tạng`) và `yellow_brick_road`/`yellow_brick_road_count`. Không tìm thấy: SuttaCentral trả HTTP 200 với mảng một node có `uid` là `null` và `children` rỗng. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Muốn thu hẹp, truyền `submenu_id` thay vì gọi không tham số (`/api/menu`: 464 node, khoảng 168 KB; `/api/menu/sutta` khoảng 3 KB).",
  {
    submenu_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        "uid của node cần mở, ví dụ 'sutta', 'vinaya', 'abhidhamma', 'long', 'dn'. Gửi nguyên văn như một path segment. Bỏ trống thì gọi /api/menu: mọi node gốc, output lớn."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của tên node, gửi dạng query `language`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Đổi `translated_name`, `yellow_brick_road` và `yellow_brick_road_count`."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildMenuUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// ─── Start server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sutta MCP server running (stdio)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

Tính chất:

- Bốn handler cùng hình: đúng một biến `url` nhận kết quả hàm dựng; đối số của `fetch` là `url`, viết trần; `renderBody` nhận cùng `url` (FR-5, AC-13). `format` được tách bằng destructuring, nên không tới hàm dựng. Key lạ bị zod bỏ im lặng trước handler (FR-2).
- `!res.ok` ném đúng chuỗi `SuttaCentral API error: ${res.status}` ở cả hai format. Không `try`/`catch`, retry hay fallback (FR-13).
- Module-scope có đúng hai `const`: `server` (như cũ) và `formatParam`. `formatParam` là schema zod, không giữ response hay tham số của lời gọi nào (FR-16); bốn tool dùng chung nó để chuỗi `describe()` của `format` chỉ có một chỗ.
- Mô tả cấp tool theo FR-14: endpoint chính xác; một request, chỉ tham số caller truyền; nguyên body, thứ tự SC, không lọc, không cắt; dạng body "không tìm thấy"; dòng "Kích thước" với số đo. `describe()` của mỗi tham số query nói bỏ trống thì không gửi và API dùng mặc định `en`.
- `lang` của `get_bilarasuttas` không được mô tả là "chỉ đổi ngôn ngữ": `lang` không khớp bản dịch của `author_uid` thì body mất `translation_text`. Đo: `bilarasuttas/mn10/sujato?lang=vi` → 73,700 B, key `comment_text, html_text, root_text, variant_text, reference_text, keys_order`; `dn16/sujato?lang=vi` → 475,208 B, cùng tập key. Mô tả lấy `mn10` làm ví dụ vì body nhỏ hơn.
- Câu "`author_uid` không có bản dịch của sutta này cũng cho đúng body đó": `bilarasuttas/mn10/brahmali` và `bilarasuttas/mn10/xyzzy` đều trả 53,498 B, trùng từng byte `bilarasuttas/mn10` (đo bằng `cmp`).
- Mọi con số trong mô tả là số đo ngày 2026-10-24, xem bảng §Performance. Không mô tả nào có `max_segments`, `Deep link`, `hardcode`, `tradition`, hay `sujato` ở dạng mặc định (grep của V5, AC-11).
- `grep -c 'fetch(' src/index.ts` = 5. `wc -l` = 220.

### Sửa một dòng — **[NORMATIVE]**

**SE-1**, `src/search.ts`, thay dòng `:1`:

<!-- block: SE-1 -->
```ts
// Logic thuần của tool search_instant (spec search-api-passthrough): dựng URL request của
```

**SE-2**, `src/search.ts`, thay dòng `:6` (độ dài ký tự giữ nguyên 79: bỏ hai `─` cuối):

<!-- block: SE-2 -->
```ts
// ─── search_instant: wrapper mỏng của /api/search/instant ───────────────────
```

Xóa `src/search.ts:151-167` (dòng trống, tiêu đề `// ─── Citation dùng chung…`, dòng trống, `formatCitation()`). File mới có 150 dòng và kết thúc bằng `}` của `formatError()`.

**TS-1**, `test/search.test.ts`, thay dòng `:1`:

<!-- block: TS-1 -->
```ts
// Unit test offline cho logic thuần của search_instant (spec search-api-passthrough). Mỗi case mang
```

**PK-1**, `package.json`, thay dòng `:15` (`scripts.test`), Q3:

<!-- block: PK-1 -->
```text
    "test": "tsx --test test/search.test.ts test/passthrough.test.ts"
```

### Lắp ráp — **[NORMATIVE]**

Mỗi file đích phải trùng từng byte với file dựng từ khối của tài liệu này (và từ `7dc2299` cho phần không đổi). Hàm `blk` trích nội dung code fence ngay sau dòng neo `<!-- block: TÊN -->`:

```sh
REPO=$(git rev-parse --show-toplevel); D="$REPO/specs/tools-api-passthrough/design.md"
blk() { awk -v id="<!-- block: $1 -->" '$0==id{f=1;next} f&&/^```/{if(o)exit;o=1;next} f&&o{print}' "$D"; }
diff <(blk P1) "$REPO/src/passthrough.ts" && echo PASSTHROUGH-OK
diff <(blk I1) "$REPO/src/index.ts" && echo INDEX-OK
diff <(blk T2) "$REPO/test/passthrough.test.ts" && echo TEST-OK
O=$(mktemp); git -C "$REPO" show 7dc2299:src/search.ts > "$O"
{ blk SE-1; sed -n '2,5p' "$O"; blk SE-2; sed -n '7,150p' "$O"; } | diff - "$REPO/src/search.ts" && echo SEARCH-OK
git -C "$REPO" show 7dc2299:test/search.test.ts > "$O"
{ blk TS-1; sed -n '2,$p' "$O"; } | diff - "$REPO/test/search.test.ts" && echo SEARCHTEST-OK
git -C "$REPO" show 7dc2299:package.json > "$O"
{ sed -n '1,14p' "$O"; blk PK-1; sed -n '16,$p' "$O"; } | diff - "$REPO/package.json" && echo PACKAGE-OK
git -C "$REPO" show 7dc2299:src/index.ts | sed -n '99,157p' > "$O"
node -e 'const fs=require("fs");const b=fs.readFileSync(process.argv[1],"utf8").split("\n");const n=fs.readFileSync(process.argv[2],"utf8").split("\n").slice(20,79);
const exp=b.slice(0,59).map((l,i)=>i===0||i===2?l.replace("search_topic","search_instant"):l);
const ok=n.every((l,i)=>i===3?l.startsWith(exp[3].slice(0,-2)+" Output có thể rất lớn")&&l.endsWith(".\","):l===exp[i]);
console.log(ok?"SEARCH-INSTANT-OK":"SEARCH-INSTANT-MISMATCH");process.exit(ok?0:1)' "$O" "$REPO/src/index.ts"
rm -f "$O"
```

Đã chạy trên bản dựng thử: in đủ `PASSTHROUGH-OK`, `INDEX-OK`, `TEST-OK`, `SEARCH-OK`, `SEARCHTEST-OK`, `PACKAGE-OK`, `SEARCH-INSTANT-OK`.

### T2 — `test/passthrough.test.ts` — **[NORMATIVE]**

9 case. Tên mỗi case bắt đầu bằng `tools-api-passthrough FR-{n}:` (FR-17, AC-12). Expected value là literal, dựng từ bố cục ở §Bố cục output và giá trị của bốn fixture ở bảng §Fixture. Test có hàm `labels()` riêng, tính tiền tố mong đợi của từng dòng từ body của fixture theo thứ tự trước; nó không gọi code của P1.

| Case | Phủ dòng FR-17 | Nội dung chính |
|---|---|---|
| `FR-3:` | FR-3 | URL literal của cả bốn tool; không tham số tùy chọn thì không có `?`; `lang: "en"` caller truyền vẫn gửi; `language: ""` gửi `?language=`; `format` không vào URL |
| `FR-4:` | FR-4 | khoảng trắng, `?`, `#`, `/` được mã hóa trong một segment; `MN10` giữ hoa; NFD (dựng bằng `.normalize("NFD")`, kiểm `nfd !== nfc`) → `a%CC%84`, NFC → `%C4%81` |
| `FR-5:` | FR-5 | `BUILD[tool](params) === url` cho cả bốn fixture; bốn URL literal |
| `FR-7:` | FR-7 | item 1 trùng chuỗi body đưa vào (có khoảng trắng lạ); item 2 là dòng nguồn; `{}`, `null`, `<html>` trả nguyên |
| `FR-9:` | FR-9 | dòng 1 của `text` từng fixture là `Nguồn: SuttaCentral — {url}`; `text` có đúng một item |
| `FR-10:` (fixture) | FR-10 | mọi dòng sau dòng 2 khớp tiền tố của `labels()` và đúng số dòng, cho cả bốn fixture; literal: `suttaplex` 18 key, `difficulty`, `translated_title` có khoảng trắng cuối, `verseNo: ""`; `parallels` 4 anchor 8/2/3/3, phần tử đầu `to: dn22`, `type: full`, `resembling: false`; `menu` 4 node, 2 `children` rỗng, 6 con của `sutta` |
| `FR-10:` (literal) | FR-10 | output nguyên văn của một body có `""`, `null`, `{}`, `[]`, mảng lồng, chuỗi có HTML và khoảng trắng hai đầu, `translations` hai phần tử; map 60 segment và mảng 60 phần tử in đủ (bắt đột biến (d)) |
| `FR-11:` | FR-11 | fixture bilara: mỗi map in đúng mọi key của `keys_order` theo thứ tự; dòng `dn22:22.27` và `dn22:22.28: ""` của `translation_text`; `keys_order` 5 phần tử |
| `FR-12:` | FR-12 | `{"msg":"Not Found"}`, `{}`, `[]`, `null`, `"abc"`, `42` cho output không rỗng và không ném; `<html>` ném `SyntaxError` |

<!-- block: T2 -->
```ts
// Unit test offline cho logic thuần của get_bilarasuttas, get_suttaplex, get_parallels, get_menu
// (spec tools-api-passthrough). Mỗi case mang tiền tố `tools-api-passthrough FR-{n}:` theo
// specs/tools-api-passthrough/requirements.md. Fixture: response ghi live rồi cắt (test/fixtures/,
// xem design §Fixture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBilarasuttasUrl,
  buildMenuUrl,
  buildParallelsUrl,
  buildSuttaplexUrl,
  renderBody,
  type SuttaplexParams,
} from "../src/passthrough.js";

type Fixture = { url: string; recorded: string; tool: string; params: any; body: any };

function load(name: string): Fixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

const FIXTURES = ["bilarasuttas-dn22-sujato", "suttaplex-mn10", "parallels-mn10", "menu"];
const BUILD: Record<string, (p: any) => string> = {
  get_bilarasuttas: buildBilarasuttasUrl,
  get_suttaplex: buildSuttaplexUrl,
  get_parallels: buildParallelsUrl,
  get_menu: buildMenuUrl,
};
const API = "https://suttacentral.net/api";
const U = `${API}/suttaplex/x`;
const SRC = `Nguồn: SuttaCentral — ${U}`;

// Output text cho một body (đi qua JSON.stringify như body đọc bằng res.text()).
function text(body: unknown, url = U): string {
  const content = renderBody(url, JSON.stringify(body), "text");
  assert.equal(content.length, 1);
  return content[0].text;
}
function fixtureText(name: string): string {
  const f = load(name);
  return text(f.body, f.url);
}
// Các dòng của một key top-level: dòng `key: …` và các dòng con thụt lề ngay sau nó.
function section(t: string, key: string): string[] {
  const lines = t.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`${key}: `));
  assert.ok(start > 0, key);
  const end = lines.findIndex((l, i) => i > start && !l.startsWith(" "));
  return lines.slice(start, end === -1 ? undefined : end);
}
// Tiền tố mong đợi của từng dòng con, theo thứ tự trước của body: thụt lề theo độ sâu, rồi nhãn.
function labels(v: unknown, depth: number, out: string[]): string[] {
  const kids: [string, unknown][] = Array.isArray(v)
    ? v.map((e, i) => [`[${i}]`, e])
    : v !== null && typeof v === "object"
      ? Object.entries(v)
      : [];
  for (const [k, e] of kids) {
    out.push(`${"  ".repeat(depth)}${k}: `);
    labels(e, depth + 1, out);
  }
  return out;
}

test("tools-api-passthrough FR-3: đúng URL của từng tool, chỉ tham số caller truyền, không giá trị mặc định", () => {
  assert.equal(buildBilarasuttasUrl({ uid: "mn10" }), `${API}/bilarasuttas/mn10`);
  assert.equal(buildBilarasuttasUrl({ uid: "mn10", author_uid: "sujato" }), `${API}/bilarasuttas/mn10/sujato`);
  assert.equal(
    buildBilarasuttasUrl({ uid: "mn10", author_uid: "sujato", lang: "vi" }),
    `${API}/bilarasuttas/mn10/sujato?lang=vi`
  );
  assert.equal(buildBilarasuttasUrl({ uid: "mn10", lang: "en" }), `${API}/bilarasuttas/mn10?lang=en`);
  assert.equal(buildSuttaplexUrl({ uid: "mn10" }), `${API}/suttaplex/mn10`);
  assert.equal(buildSuttaplexUrl({ uid: "mn10", language: "vi" }), `${API}/suttaplex/mn10?language=vi`);
  assert.equal(buildParallelsUrl({ uid: "mn10" }), `${API}/parallels/mn10`);
  assert.equal(buildParallelsUrl({ uid: "mn10", language: "vi" }), `${API}/parallels/mn10?language=vi`);
  assert.equal(buildMenuUrl({}), `${API}/menu`);
  assert.equal(buildMenuUrl({ submenu_id: "long" }), `${API}/menu/long`);
  assert.equal(buildMenuUrl({ submenu_id: "long", language: "vi" }), `${API}/menu/long?language=vi`);
  assert.equal(buildMenuUrl({ language: "" }), `${API}/menu?language=`);
  const withFormat = { uid: "mn10", format: "json" } as SuttaplexParams;
  assert.equal(buildSuttaplexUrl(withFormat), `${API}/suttaplex/mn10`);
});

test("tools-api-passthrough FR-4: tham số path mã hóa như một path segment, không trim, không đổi hoa/thường", () => {
  assert.equal(buildSuttaplexUrl({ uid: "a b?c#d" }), `${API}/suttaplex/a%20b%3Fc%23d`);
  assert.equal(buildBilarasuttasUrl({ uid: "MN10", author_uid: "x/y" }), `${API}/bilarasuttas/MN10/x%2Fy`);
  assert.equal(buildMenuUrl({ submenu_id: " long " }), `${API}/menu/%20long%20`);
  assert.equal(buildParallelsUrl({ uid: "mn10", language: "a b&c=d" }), `${API}/parallels/mn10?language=a+b%26c%3Dd`);
  const nfc = "ā".normalize("NFC");
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfd, nfc);
  assert.equal(buildSuttaplexUrl({ uid: nfd }), `${API}/suttaplex/a%CC%84`);
  assert.equal(buildSuttaplexUrl({ uid: nfc }), `${API}/suttaplex/%C4%81`);
});

test("tools-api-passthrough FR-5: URL của fixture là URL hàm dựng phát cho params đã ghi", () => {
  for (const name of FIXTURES) {
    const f = load(name);
    assert.equal(BUILD[f.tool](f.params), f.url, name);
  }
  assert.deepEqual(
    FIXTURES.map((n) => load(n).url),
    [`${API}/bilarasuttas/dn22/sujato`, `${API}/suttaplex/mn10`, `${API}/parallels/mn10`, `${API}/menu`]
  );
});

test("tools-api-passthrough FR-7: format json trả body nguyên văn rồi dòng nguồn", () => {
  const raw = '{"msg":  "Not Found"}';
  assert.deepEqual(renderBody(U, raw, "json"), [
    { type: "text", text: raw },
    { type: "text", text: SRC },
  ]);
  assert.equal(renderBody(U, "{}", "json")[0].text, "{}");
  assert.equal(renderBody(U, "null", "json")[0].text, "null");
  assert.equal(renderBody(U, "<html>", "json")[0].text, "<html>");
});

test("tools-api-passthrough FR-9: dòng đầu của text là dòng nguồn với URL request", () => {
  for (const name of FIXTURES) {
    const f = load(name);
    assert.equal(fixtureText(name).split("\n")[0], `Nguồn: SuttaCentral — ${f.url}`, name);
  }
  assert.equal(renderBody(U, "{}", "text").length, 1);
});

test("tools-api-passthrough FR-10: mọi key và phần tử của fixture, ở mọi độ sâu, theo đúng thứ tự body", () => {
  for (const name of FIXTURES) {
    const lines = fixtureText(name).split("\n").slice(2);
    const expected = labels(load(name).body, 0, []);
    assert.equal(lines.length, expected.length, name);
    lines.forEach((l, i) => assert.ok(l.startsWith(expected[i]), `${name} dòng ${i + 3}: ${l}`));
  }
  const sp = fixtureText("suttaplex-mn10").split("\n");
  assert.deepEqual(sp.slice(1, 4), ["[mảng, 1 phần tử]", "[0]: {object, 18 key}", "  acronym: MN 10"]);
  const d = sp.indexOf("  difficulty: {object, 2 key}");
  assert.deepEqual(sp.slice(d, d + 3), ["  difficulty: {object, 2 key}", "    name: intermediate", "    level: 2"]);
  assert.ok(sp.includes("  translated_title: The Discourse on Mindfulness Meditation "));
  assert.ok(sp.includes('  verseNo: ""'));
  assert.ok(sp.includes("  alt_acronym: null"));
  const par = fixtureText("parallels-mn10");
  assert.deepEqual(
    par.split("\n").filter((l) => /^\S/.test(l)).slice(1),
    ["{object, 4 key}", "mn10: [mảng, 8 phần tử]", "mn10#44.1: [mảng, 2 phần tử]", "mn10#47.1: [mảng, 3 phần tử]", "mn10#10.1: [mảng, 3 phần tử]"]
  );
  const mn10 = section(par, "mn10");
  assert.deepEqual(mn10.slice(0, 5), [
    "mn10: [mảng, 8 phần tử]",
    "  [0]: {object, 5 key}",
    "    enumber: 10",
    "    to: {object, 12 key}",
    "      to: dn22",
  ]);
  const first = mn10.slice(1, mn10.indexOf("  [1]: {object, 5 key}"));
  assert.deepEqual(first.slice(-3), ["    type: full", "    remark: null", "    resembling: false"]);
  assert.ok(first.includes("      uid: dn22"));
  const menu = fixtureText("menu").split("\n");
  assert.equal(menu[1], "[mảng, 4 phần tử]");
  assert.deepEqual(
    menu.filter((l) => /^ {2}uid: /.test(l)),
    ["  uid: abhidhamma", "  uid: cnd-khaggavisanasuttaniddesa", "  uid: g2dhp1", "  uid: sutta"]
  );
  assert.equal(menu.filter((l) => l === "  children: [mảng rỗng, 0 phần tử]").length, 2);
  assert.deepEqual(
    menu.filter((l) => /^ {6}uid: /.test(l)).slice(4),
    ["long", "middle", "linked", "numbered", "minor", "other-group"].map((u) => `      uid: ${u}`)
  );
});

test("tools-api-passthrough FR-10: literal: chuỗi rỗng, null, object và mảng rỗng, mảng lồng, translations, nguyên văn", () => {
  const body = {
    a: "",
    b: null,
    c: {},
    d: [],
    e: [[1, "x"], []],
    f: { g: true, h: 1.5, i: " <b>x</b> " },
    translations: [
      { lang: "vi", author_uid: "phantuananh" },
      { lang: "en", author_uid: "sujato" },
    ],
    "mn10:1.1": "So I have heard. ",
  };
  assert.equal(
    text(body),
    [
      SRC,
      "{object, 8 key}",
      'a: ""',
      "b: null",
      "c: {object rỗng}",
      "d: [mảng rỗng, 0 phần tử]",
      "e: [mảng, 2 phần tử]",
      "  [0]: [mảng, 2 phần tử]",
      "    [0]: 1",
      "    [1]: x",
      "  [1]: [mảng rỗng, 0 phần tử]",
      "f: {object, 3 key}",
      "  g: true",
      "  h: 1.5",
      "  i:  <b>x</b> ",
      "translations: [mảng, 2 phần tử]",
      "  [0]: {object, 2 key}",
      "    lang: vi",
      "    author_uid: phantuananh",
      "  [1]: {object, 2 key}",
      "    lang: en",
      "    author_uid: sujato",
      "mn10:1.1: So I have heard. ",
    ].join("\n")
  );
  const ids = Array.from({ length: 60 }, (_, i) => `mn10:${i + 1}.1`);
  const map = Object.fromEntries(ids.map((id, i) => [id, `s${i + 1}`]));
  assert.equal(
    text({ translation_text: map, keys_order: ids }),
    [
      SRC,
      "{object, 2 key}",
      "translation_text: {object, 60 key}",
      ...ids.map((id, i) => `  ${id}: s${i + 1}`),
      "keys_order: [mảng, 60 phần tử]",
      ...ids.map((id, i) => `  [${i}]: ${id}`),
    ].join("\n")
  );
});

test("tools-api-passthrough FR-11: fixture bilara: mọi key của keys_order có ở mọi map, kể cả key cuối có giá trị rỗng", () => {
  const f = load("bilarasuttas-dn22-sujato");
  const t = fixtureText("bilarasuttas-dn22-sujato");
  const maps = ["comment_text", "html_text", "root_text", "translation_text", "variant_text", "reference_text"];
  assert.deepEqual(Object.keys(f.body), [...maps, "keys_order"]);
  for (const m of maps) {
    assert.deepEqual(
      section(t, m).slice(1).map((l) => l.slice(2, l.indexOf(": "))),
      f.body.keys_order,
      m
    );
  }
  assert.deepEqual(section(t, "translation_text").slice(-2), [
    "  dn22:22.27: Satisfied, the mendicants approved what the Buddha said. ",
    '  dn22:22.28: ""',
  ]);
  assert.deepEqual(section(t, "keys_order"), [
    "keys_order: [mảng, 5 phần tử]",
    "  [0]: dn22:0.1",
    "  [1]: dn22:0.2",
    "  [2]: dn22:1.1",
    "  [3]: dn22:22.27",
    "  [4]: dn22:22.28",
  ]);
});

test("tools-api-passthrough FR-12: body không tìm thấy, rỗng, null, scalar không ném; body không phải JSON thì ném", () => {
  assert.equal(text({ msg: "Not Found" }), `${SRC}\n{object, 1 key}\nmsg: Not Found`);
  assert.equal(text({}), `${SRC}\n{object rỗng}`);
  assert.equal(text([]), `${SRC}\n[mảng rỗng, 0 phần tử]`);
  assert.equal(renderBody(U, "null", "text")[0].text, `${SRC}\nnull`);
  assert.equal(text("abc"), `${SRC}\nabc`);
  assert.equal(text(42), `${SRC}\n42`);
  assert.throws(() => renderBody(U, "<html>", "text"), SyntaxError);
});
```

## Fixture

### Định dạng và quy tắc

- Một file JSON cho mỗi response, trong `test/fixtures/`. Năm key theo thứ tự `url`, `recorded`, `tool`, `params`, `body`. JSON thụt lề 2 dấu cách, có newline cuối file. Đây là đầu ra của F3, không viết tay.
- `url` là URL mà hàm dựng của `tool` trả cho `params`, cũng là URL `curl` đã gọi (F2). `recorded` là ngày ghi (`date +%F`).
- Ba fixture search hiện có giữ nguyên (C11). Tổng sau spec: 7 file.
- Mọi key `translations` bị bỏ ở mọi độ sâu (NFR-4). `translations` được test bằng input literal (case `FR-10:` literal) và bằng AC-6 live.
- Body `{"msg": "Not Found"}`, `{}`, `[]`, `null` và map 60 segment được test bằng literal, không có fixture.
- Chỉ ghi lại một fixture khi một thay đổi code cần dạng response mới. Script ghi chỉ nằm ở thư mục tạm.

### Số đo của 4 fixture (2026-10-24)

Cả bốn HTTP 200 ở lần ghi đầu. Byte là kích thước file fixture với `recorded` = `2026-10-24`.

| File | URL (sau `https://suttacentral.net/api/`) | Body thô | Phép cắt (F3) | Body đã cắt | Case T2 dùng | Byte |
|---|---|---|---|---|---|---|
| `bilarasuttas-dn22-sujato.json` | `bilarasuttas/dn22/sujato` | 158,090 B; 7 key, mỗi map 454 segment | giữ 3 segment đầu và 2 segment cuối của `keys_order` ở mọi map và ở `keys_order` | `dn22:0.1`, `dn22:0.2`, `dn22:1.1`, `dn22:22.27`, `dn22:22.28`; `translation_text` của `dn22:22.28` là `""` | FR-5, FR-9, FR-10, FR-11 | 2,804 |
| `suttaplex-mn10.json` | `suttaplex/mn10` | 12,962 B; 1 phần tử, 19 key, 43 `translations` | bỏ `translations` | 1 phần tử, 18 key; `difficulty` `{name: intermediate, level: 2}`; `translated_title` `The Discourse on Mindfulness Meditation ` | FR-5, FR-9, FR-10 | 1,295 |
| `parallels-mn10.json` | `parallels/mn10` | 53,731 B; 4 anchor, 16 parallel | bỏ `translations` | `mn10` (8), `mn10#44.1` (2), `mn10#47.1` (3), `mn10#10.1` (3); `to` còn 12 key | FR-5, FR-9, FR-10 | 11,410 |
| `menu.json` | `menu` | 168,235 B; 464 node gốc | giữ 4 node `abhidhamma`, `cnd-khaggavisanasuttaniddesa`, `g2dhp1`, `sutta`, theo thứ tự body | 2 node có `children` (4 và 6 con), 2 node `children: []` | FR-5, FR-9, FR-10 | 7,711 |

Tổng 4 file mới là 23,220 B. Toàn bộ `test/fixtures/`: **7 file, 38,443 B** theo `cat test/fixtures/* | wc -c` (trần 10 file, 65536 B). `grep -l -E '"(highlight|translations)"' test/fixtures/*` rỗng.

**Khi fixture ghi lúc implement khác bảng này** (chỉ SC trôi): đó không phải lần chạy không hợp lệ, nên không ghi lại để tìm lần trùng. Implementer dừng và báo, kèm số đo mới có ngày. Bảng này và các literal phụ thuộc trong T2 được sửa cùng nhau qua một lần sửa design.

### Quy trình ghi và cắt (một lần, lúc implement)

Chạy trong thư mục tạm ngoài repo và xóa sau khi xong (NFR-4, NFR-5). Body thô nằm ở một thư mục riêng, script ở thư mục khác.

1. `npm install` đã chạy. P1 đã có trong `src/passthrough.ts`, vì F2 import nó.
2. `W=$(mktemp -d); mkdir "$W/raw" "$W/bin"`. Trích các khối: `blk F1 > "$W/bin/fixtures.list"`, `blk F2 > "$W/bin/record.sh"` (rồi `chmod +x`), `blk F3 > "$W/bin/trim.mjs"`.
3. Ghi, chạy từ gốc repo: `"$W/bin/record.sh" "$PWD/src/passthrough.ts" "$W/bin/fixtures.list" "$W/raw"`. Mỗi dòng phải là `OK <tên> 200 <url>`. `INVALID` chỉ có khi lỗi truyền tải (`curl` thoát khác 0, gồm timeout 60 s, hoặc HTTP 000): ghi lại riêng dòng đó; mỗi dòng chạy tối đa 3 lần (lần đầu và 2 lần chạy lại); hết 3 lần thì báo "inconclusive (network)" và orchestrator quyết định. `UNEXPECTED` (HTTP khác 200, hoặc body không parse được JSON) là lần chạy hợp lệ có kết quả lệch: dừng và báo, không ghi lại.
4. Cắt: `node "$W/bin/trim.mjs" "$W/raw" test/fixtures "$(date +%F)" "$W/bin/fixtures.list"`. Lệnh in tên và số byte của từng fixture; đối chiếu với bảng trên.
5. Kiểm lại phép cắt (AC-12): `mkdir "$W/re" && node "$W/bin/trim.mjs" "$W/raw" "$W/re" "$(date +%F)" "$W/bin/fixtures.list" > /dev/null && for f in "$W"/re/*.json; do cmp "$f" "test/fixtures/$(basename "$f")" || echo "FIXTURE-MISMATCH $f"; done`. Không dòng nào được in.
6. `rm -r "$W"`.

Trên bản dựng thử: bước 3 cho 4 dòng `OK … 200`; bước 4 in đúng các số byte của bảng.

<!-- F1: tên|tool|params JSON -->
<!-- block: F1 -->
```text
bilarasuttas-dn22-sujato|get_bilarasuttas|{"uid":"dn22","author_uid":"sujato"}
suttaplex-mn10|get_suttaplex|{"uid":"mn10"}
parallels-mn10|get_parallels|{"uid":"mn10"}
menu|get_menu|{}
```

<!-- block: F2 -->
```sh
#!/bin/sh
# record.sh <src/passthrough.ts tuyệt đối> <file danh sách tên|tool|params> <thư mục body thô>
# URL dựng bằng chính hàm của src/passthrough.ts; ghi <tên>.json (body thô) và <tên>.url. In OK / INVALID / UNEXPECTED.
while IFS="|" read -r name tool params; do
  url=$(node --import tsx -e 'const [s,t,p]=process.argv.slice(1);const f={get_bilarasuttas:"buildBilarasuttasUrl",get_suttaplex:"buildSuttaplexUrl",get_parallels:"buildParallelsUrl",get_menu:"buildMenuUrl"}[t];import(require("node:url").pathToFileURL(s).href).then(m=>process.stdout.write(m[f](JSON.parse(p))))' "$1" "$tool" "$params")
  code=$(curl -sS --max-time 60 -o "$3/$name.json" -w '%{http_code}' "$url"); rc=$?
  if [ $rc -ne 0 ] || [ "$code" = 000 ]; then
    echo "INVALID $name $code (curl $rc)"        # lỗi truyền tải: chạy lại được
  elif [ "$code" = 200 ] && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$3/$name.json" 2>/dev/null; then
    printf '%s' "$url" > "$3/$name.url"; echo "OK $name $code $url"
  else
    echo "UNEXPECTED $name $code"                # hợp lệ nhưng lệch: dừng và báo
  fi
done < "$2"
```

<!-- block: F3 -->
```js
// node trim.mjs <thư mục body thô> <thư mục fixture đích> <ngày ghi YYYY-MM-DD> <file danh sách>
// Cắt body thô theo luật của từng tool; giữ thứ tự key và hình dạng lồng nhau. Bỏ mọi key
// `translations` ở mọi độ sâu (NFR-4). In tên, số byte của fixture.
import { readFileSync, writeFileSync } from "node:fs";
const [rawDir, outDir, recorded, list] = process.argv.slice(2);
const MENU_UIDS = ["abhidhamma", "cnd-khaggavisanasuttaniddesa", "g2dhp1", "sutta"];
const dropTranslations = (v) =>
  Array.isArray(v) ? v.map(dropTranslations)
  : v !== null && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "translations").map(([k, e]) => [k, dropTranslations(e)]))
    : v;
const TRIM = {
  // Ba segment đầu và hai segment cuối của keys_order, ở mọi map và ở keys_order.
  get_bilarasuttas: (b) => {
    const keep = new Set([...b.keys_order.slice(0, 3), ...b.keys_order.slice(-2)]);
    return Object.fromEntries(Object.entries(b).map(([k, v]) => [k,
      Array.isArray(v) ? v.filter((s) => keep.has(s)) : Object.fromEntries(Object.entries(v).filter(([s]) => keep.has(s)))]));
  },
  get_suttaplex: dropTranslations,
  get_parallels: dropTranslations,
  // Bốn node gốc theo thứ tự body: hai node có children khác rỗng, hai node có children rỗng.
  get_menu: (b) => dropTranslations(b.filter((n) => MENU_UIDS.includes(n.uid))),
};
for (const row of readFileSync(list, "utf8").trim().split("\n")) {
  const [name, tool, params] = row.split("|");
  const raw = JSON.parse(readFileSync(`${rawDir}/${name}.json`, "utf8"));
  const url = readFileSync(`${rawDir}/${name}.url`, "utf8");
  const text = JSON.stringify({ url, recorded, tool, params: JSON.parse(params), body: TRIM[tool](raw) }, null, 2) + "\n";
  writeFileSync(`${outDir}/${name}.json`, text);
  console.log(name, Buffer.byteLength(text));
}
```

## Component Boundaries

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `src/passthrough.ts` | new (P1) | Bốn hàm dựng URL (FR-3..FR-5), `renderBody()` cho `text` và `json` (FR-7..FR-12). Không import, không I/O, không trạng thái |
| `src/index.ts` | modified (I1, viết lại) | Năm `server.tool()`: schema zod và `describe()` (FR-1, FR-2, FR-6, FR-14); bốn handler dựng URL một lần, fetch một lần, kiểm `ok`, trả `renderBody` |
| `fetchSuttaplex`, `fetchBilaraText`, `fetchParallels`, `extractText`, `formatUnavailable`, `DIVISIONS`, `PITAKA_LABELS`, `formatDivisions`, `SC_BASE` | **removed** | — |
| `src/search.ts` | modified (SE-1, SE-2, bỏ `formatCitation()`) | `buildSearchUrl()`, `renderSearch()` không đổi |
| `test/passthrough.test.ts` | new (T2) | 9 case `node:test` |
| `test/search.test.ts` | modified (TS-1) | comment dòng 1 |
| `test/fixtures/` | 4 file mới | Response đã cắt, có `url`, `recorded`, `tool`, `params` |
| `package.json` | modified (PK-1) | chỉ `scripts.test` (NFR-1) |
| `README.md`, `specs/sutta-mcp-requirements.md`, `AGENTS.md` | modified | R-1, R-2, M-1..M-13, A-1..A-4 |
| `package-lock.json`, `tsconfig.json` | không đổi | NFR-1, NFR-2 |

## Integration Points

- **Upstream SuttaCentral.** Một GET mỗi lời gọi. `get_bilarasuttas` không còn lời gọi suttaplex song song và lời gọi retry (trước đây 2–3 request). Request khác ở chỗ: không còn `?language=en` mặc định ở suttaplex, không còn `sujato` mặc định ở bilara; có thêm `language` cho parallels và menu. `npm test` không gọi mạng. Lần ghi fixture phát 4 request, một lần, lúc implement.
- **Downstream (Claude).** Bốn tool cũ biến mất khỏi `tools/list` và `search_topic` đổi tên. Đây là thay đổi phá vỡ có chủ đích (quyết định 1, 2): cấu hình hay prompt gọi tên cũ nhận lỗi tool không tồn tại. Output của bốn tool đổi hoàn toàn: không còn citation, `Deep link`, ký hiệu parallels hay bảng `tradition`.
- **Build và runtime.** `dist/index.js` import `./passthrough.js` và `./search.js`. `rm -rf dist && npm run build` cho đúng ba file `index.js`, `passthrough.js`, `search.js` (NFR-2).
- **Workflow contract.** Sửa `AGENTS.md` đổi sha256 của `context:agents`, xem §Thứ tự áp dụng.

### Khối sửa tài liệu — **[NORMATIVE]**

Literal của mỗi đích chỉ có ở khối của nó. Số dòng trong ngoặc là số đo tại `7dc2299`; lệnh tái dựng ở §Testability dùng chúng, vì commit đó bất biến. Đã mô phỏng mọi khối: grep của AC-14 cho README 0 dòng, AGENTS.md 0 dòng, master spec 6 dòng (`:296`, `:298`, `:302`, `:351`, `:360`, `:361`), cả sáu đều ở ngữ cảnh lịch sử và nói rõ đã bị thay thế hoặc đổi tên.

**R-1**, `README.md`. Thay năm dòng bảng Tools (`:13-17`).

<!-- block: R-1 -->
```text
| `search_instant` | Wrapper mỏng của search SuttaCentral (`GET /api/search/instant`): tham số API `query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial` được gửi nguyên, tham số không truyền thì không gửi; `format` chọn `text` (mặc định: mọi kết quả theo thứ tự SC, kèm link) hoặc `json` (body response nguyên văn) |
| `get_bilarasuttas` | Văn bản segmented của một sutta (`GET /api/bilarasuttas/{uid}/{author_uid}?lang=`): tham số API `uid`, `author_uid` (bỏ trống thì chỉ có văn bản gốc), `lang` (bản dịch không phải tiếng Anh cần `lang` của bản dịch); mọi map (`root_text`, `translation_text`, `comment_text`, …) và `keys_order`, key là segment ID, không cắt; `format` `text` (mặc định) hoặc `json` |
| `get_suttaplex` | Metadata (`GET /api/suttaplex/{uid}?language=`): tham số API `uid`, `language`; nguyên mảng suttaplex, gồm mọi bản dịch trong `translations`; `format` `text` (mặc định) hoặc `json` |
| `get_parallels` | Parallels giữa các truyền thống (`GET /api/parallels/{uid}?language=`): tham số API `uid`, `language`; parallels theo anchor của sutta nguồn; `format` `text` (mặc định) hoặc `json` |
| `get_menu` | Cây duyệt của SuttaCentral (`GET /api/menu`, `GET /api/menu/{submenu_id}`, `?language=`): tham số API `submenu_id`, `language`; mỗi lời gọi trả một cấp con; `format` `text` (mặc định) hoặc `json` |
```

**R-2**, `README.md`. Thay đoạn của `## Tìm bằng tiếng Việt` (`:70-74`). Năm dòng đầu chỉ đổi tên ở dòng đầu; hai dòng cuối là câu thêm của FR-19. Ví dụ đo live 2026-10-24 (AC-3).

<!-- block: R-2 -->
```text
`search_instant` gửi truy vấn nguyên văn tới search của SuttaCentral, không ánh xạ hay dịch.
Để khớp tiêu đề tiếng Việt, truyền `language` = `vi`, ví dụ `{"query": "vô ngã", "language": "vi"}`.
Để có cả bản dịch tiếng Việt trong phần khớp nội dung (`hits`), thêm `selectedLanguages` có `vi`, ví dụ
`{"query": "vô ngã", "language": "vi", "selectedLanguages": ["vi", "pli"]}`. Khi bỏ trống `selectedLanguages`,
SuttaCentral dùng mặc định `["en", "pli"]`.
Để lấy toàn văn bản dịch tiếng Việt, dùng `get_bilarasuttas` với `author_uid` của bản dịch và `lang` = `vi`, ví dụ
`{"uid": "dhp1-20", "author_uid": "phantuananh", "lang": "vi"}`.
```

**M-1**, `specs/sutta-mcp-requirements.md`, bảng endpoint. Thay `:118-122` (từ `| Endpoint | Mô tả |` tới dòng `parallels`). Dòng trống `:123` và dòng `**Translator IDs thông dụng:**` giữ nguyên. Dẫn chứng `config.py:34`, `views.py:1061` theo requirements §Hình dạng API (upstream `a9aeaa8`).

<!-- block: M-1 -->
```text
| Endpoint | Mô tả |
|----------|-------|
| `GET /api/suttaplex/{uid}?language={lang}` | Metadata của một sutta, hoặc của mọi sutta trong một division/vagga (mảng phẳng). Thiếu `language` → upstream mặc định `en` (`DEFAULT_LANGUAGE = 'en'`, `config.py:34`) |
| `GET /api/bilarasuttas/{uid}/{author_uid}?lang={lang}`, `GET /api/bilarasuttas/{uid}?lang={lang}` | Văn bản segmented; không có `author_uid` → chỉ văn bản gốc. Thiếu `lang` → upstream mặc định `en` (`request.args.get('lang', 'en')`, `views.py:1061`) |
| `GET /api/parallels/{uid}?language={lang}` | Parallels, key là anchor của sutta nguồn. Thiếu `language` → mặc định `en` (`config.py:34`) |
| `GET /api/menu?language={lang}`, `GET /api/menu/{submenu_id}?language={lang}` | Cây duyệt, mỗi lời gọi một cấp con. Thiếu `language` → mặc định `en` (`config.py:34`) |
| `GET /api/search/instant?query={q}&…` | Search; tham số xem Tool 1 |
```

**M-2**, master spec, bảng Parallel types. Thay `:130-137` (câu `API trả về 2 field` tới dòng `retelling`): bỏ cột "Ký hiệu" và ghi rằng không tool nào gán ký hiệu.

<!-- block: M-2 -->
```text
API trả về 2 field: `type` (string) và `resembling` (boolean). `get_parallels` in nguyên hai field này; không tool nào gán ký hiệu cho chúng (spec `tools-api-passthrough`).

| `type` | `resembling` | Mô tả |
|--------|-------------|-------|
| `full` | `false` | Full parallel — cùng nguồn gốc, nội dung tương đương |
| `full` | `true` | Resembling parallel — tương đồng một phần |
| `mention` | `false` | Văn bản này nhắc đến văn bản kia |
| `retelling` | `false` | Cùng sự kiện, kể lại khác nhau |
```

**M-3**, master spec, mục Tools. Thay `:143-254`, từ `` ### Tool 1: `search_topic` `` tới dòng ```` ``` ```` đóng ví dụ output của Tool 5. Dòng trống `:255` và `---` giữ nguyên. Tool 1 giữ nguyên chữ cũ, trừ tên và một câu thêm ở **Lưu ý**; Tool 2–5 viết lại theo FR-1, FR-2, FR-6..FR-14, với một mục quy ước chung để không lặp.

<!-- block: M-3 -->
```text
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
```

**M-4**, master spec, luồng mẫu. Thay `:261-273` (bên trong code fence; hai dòng ```` ``` ```` `:260`, `:274` giữ nguyên). Kết quả trong luồng đo live 2026-10-24: `{"query":"niệm xứ","language":"vi"}` cho 9 khớp tiêu đề gồm `mn10` (`Kinh Niệm xứ`), `dn22`, `sn43.5`, `ma98`; `suttaplex/mn10` có 43 `translations`, trong đó `sujato`/`en`; `parallels/mn10` có anchor `mn10` gồm `dn22`, `ea12.1`, `ma98`, `sht-sutta11`, `ma31`, `ma81`, `mn119`, `t32`, và ba anchor đoạn.

<!-- block: M-4 -->
```text
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

**M-5**, master spec, Constraints. Thay `:283-284` (hai gạch đầu dòng dưới `**Chain đến nguồn được đảm bảo bằng:**`), theo C4.

<!-- block: M-5 -->
```text
- Mọi response đều kèm **URL request SuttaCentral** (dòng `Nguồn: SuttaCentral — {URL}`). `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu` không dựng link website; Claude tự dựng link `suttacentral.net/…` từ `uid`, `lang`, `author_uid` và segment ID trong body. `search_instant` còn in link `https://suttacentral.net/…` cho từng mục (spec `tools-api-passthrough`).
- Production: mọi trích dẫn kèm **segment ID** (ví dụ `mn1:2.3`) liên kết trực tiếp đến SC. Hiện trạng: `get_bilarasuttas` trả segment ID là key của mọi map trong body (mục 5 của "Hướng nâng cấp").
```

**M-6**, master spec, Constraints. Thay dòng `**Attribution:**` (`:290`).

<!-- block: M-6 -->
```text
- **Attribution:** Mọi output đều có nguồn (dòng nguồn với URL request SuttaCentral). Dịch giả và UID có trong output khi body của SuttaCentral có chúng; ví dụ output của `get_menu`, hay của `get_bilarasuttas` không có `author_uid`, không có dịch giả.
```

**M-7**, master spec, roadmap mục 1–3. Thay `:296-300` (mục 1, dòng trống, mục 2, dòng trống, mục 3). Mục 4 (`:301`) giữ nguyên.

<!-- block: M-7 -->
```text
1. **Dynamic search** — **đã thực hiện** (spec `dynamic-search`), rồi thay bằng wrapper mỏng (spec `search-api-passthrough`), rồi đổi tên `search_topic` thành `search_instant` (spec `tools-api-passthrough`). `search_instant` nhận đúng tham số của `GET /api/search/instant` cộng `format` (`text`/`json`) và in response theo thứ tự SC, không lọc. Lý do và số đo: `specs/search-api-passthrough/`.

2. **Tiếng Việt** — **đã thực hiện phần lấy bản dịch** (spec `non-segmented-translation-guard`, `bilara-lang-param`), **rồi bị spec `tools-api-passthrough` thay thế.** Cơ chế cũ của `get_sutta` (tự gọi lại kèm `?lang=` lấy từ `translations[]`, báo rõ và liệt kê bản dịch khác khi không có `translation_text`) không còn. `get_bilarasuttas` nhận `lang` của caller và trả nguyên body; caller lấy `lang` từ `translations[].lang` của `get_suttaplex`. Ví dụ `dhp1-20`, `phantuananh`, `lang` = `vi` cho `translation_text` tiếng Việt (đo 2026-10-24).

3. **Cross-tradition search** — **đã bỏ (2026-10-24).** Tự fetch parallels cho kết quả tìm kiếm trái chủ trương `search_instant` khớp đúng API và trái Constraints "Mỗi tool call chỉ fetch đúng những gì cần". Claude đã ghép được `search_instant` với `get_parallels`.
```

**M-8**, master spec, roadmap mục 5. Thay `:302`.

<!-- block: M-8 -->
```text
5. **Segment ID trong `get_sutta` output** — **đã thực hiện (2026-10-02, spec `segment-id-in-get-sutta`), rồi bị spec `tools-api-passthrough` thay thế.** Cơ chế cũ (`get_sutta` in segment ID trước mỗi đoạn và một dòng `Deep link:`) không còn. `get_bilarasuttas` trả segment ID là key của mọi map trong body (ví dụ `mn10:1.1`), và `keys_order` là thứ tự đọc.
```

**M-9**, master spec, roadmap mục 6. Thay dòng `| Divisions list |` của bảng cache (`:321`, thụt 3 dấu cách như các dòng khác của bảng). Header đo lại 2026-10-24: `/api/menu/sutta` và `/api/parallels/mn10` trả `etag: W/"…"` và `cache-control: max-age=172800, must-revalidate, proxy-revalidate`.

<!-- block: M-9 -->
```text
   | Divisions list (`get_menu`) | ETag + max-age như trên — `/api/menu/{submenu_id}` trả cùng `ETag` (weak) + `Cache-Control: max-age=172800` (đo `/api/menu/sutta` 2026-10-24) |
```

**M-10**, master spec, roadmap mục 7. Thay `:327-331` (dòng mục 7 tới gạch `**Không có field tradition.**`). Bằng chứng drift `:333-349` giữ nguyên làm lịch sử.

<!-- block: M-10 -->
```text
7. **Dynamic divisions list** — **đã thực hiện bằng `get_menu` (spec `tools-api-passthrough`).** `DIVISIONS` hardcode đã bỏ. `get_menu` là wrapper mỏng của `GET /api/menu` và `GET /api/menu/{submenu_id}`, có cùng `ETag` + `Cache-Control: max-age=172800` như các endpoint khác.

   **Hai đặc điểm của API, nay để caller xử lý:**
   - **Cây phân cấp lười (lazy tree), không phẳng.** `/api/menu` chỉ trả 1 cấp con: với pitaka `sutta`, cấp con là nhóm UI (`long`, `middle`, `linked`, `numbered`, `minor`, `other-group`), không phải UID division thật (`dn`, `mn`, `sn`...). Caller gọi tiếp `get_menu` với uid con (ví dụ `long` → `dn`, `da`, `da-ot`).
   - **Không có field `tradition`.** API trả `uid`, `root_name`, `translated_name`, `root_lang_iso`, `root_lang_name`, `blurb` — cột `tradition` cũ là domain knowledge tự thêm tay, nên đã bỏ cùng `DIVISIONS`; không có bảng tra `uid → tradition`.
```

**M-11**, master spec, roadmap mục 7. Thay `:351`.

<!-- block: M-11 -->
```text
   Tức "biến động cực kỳ hiếm" (dòng ~43) đúng với UID kinh/luận chính (`dn`, `mn`, `ds`...) nhưng không đúng với vinaya — SC đã tái cấu trúc UID vinaya (hậu tố `-vi`). Đây là lý do `list_divisions` hardcode đã được thay bằng `get_menu`, đọc thẳng từ API.
```

**M-12**, master spec, bảng issue. Thay ba dòng #16, #19, #20 (`:359-361`). Câu cũ của mỗi issue giữ nguyên văn; thêm nhãn "bị thay thế" và lý do theo FR-20.

<!-- block: M-12 -->
```text
| [#16](https://github.com/nbkhoi/sutta-mcp/issues/16) (bug) — **bị spec `tools-api-passthrough` thay thế** | `get_parallels` | Vòng lặp `Object.values(data)` bỏ mất anchor nguồn (`dn22`, `dn22#18.1`, …) nên parallels toàn bài và từng đoạn bị trộn thành một danh sách, trông như trùng lặp hoặc mâu thuẫn. Bị thay thế: `get_parallels` in nguyên body theo anchor nguồn, mỗi anchor kèm mảng parallel của nó; `dn22` cho đủ 7 anchor, 27 mục (đo 2026-10-24). | — |
| [#19](https://github.com/nbkhoi/sutta-mcp/issues/19) (enhancement) — **bị spec `tools-api-passthrough` thay thế** | `get_suttaplex` (trước là `get_sutta_meta`) | Với `language=vi`, SC trả tiêu đề tiếng Việt nhưng blurb tiếng Anh; output không nói rõ. Bị thay thế: `get_suttaplex` in nguyên `blurb` và `translated_title` như SC trả, và `describe()` nói `blurb` có thể vẫn là tiếng Anh. | mục 2 |
| [#20](https://github.com/nbkhoi/sutta-mcp/issues/20) (enhancement) — **bị spec `tools-api-passthrough` thay thế** | `get_suttaplex` (trước là `get_sutta_meta`, `formatCitation()`) | Bản dịch legacy trông như trùng (cùng `author_uid`) và không cho biết `get_sutta` không lấy được nó; `Difficulty: unknown` in khi SC không có difficulty. Bị thay thế: `get_suttaplex` in nguyên `translations` (mỗi mục kèm `author_uid`, `lang`, `segmented`, `is_root`), và không tool nào còn in citation `Difficulty:`. | — |
```

**M-13**, master spec. Thay `:363-369` (từ `**Thứ tự ưu tiên.**` tới hết file).

<!-- block: M-13 -->
```text
**Thứ tự ưu tiên.** Tiêu chí: thiếu nó thì Claude hiểu sai kinh văn, trích dẫn sai, hoặc không biết một giới hạn có thật.

1. Mục 4 cùng mục 6 — mở rộng phạm vi người dùng, không phải điều kiện để trả lời đúng. Cần transport HTTP và store bền.

#16, #19, #20 và mục 7 đã bị spec `tools-api-passthrough` thay thế hoặc thực hiện (bảng trên, mục 7).
```

**A-1**, `AGENTS.md`. Thay `:17`. `AGENTS.md` viết bằng tiếng Anh, nên các khối A bằng tiếng Anh.

<!-- block: A-1 -->
```text
npm test         # node:test via tsx — offline unit tests for the pure modules src/search.ts and src/passthrough.ts (test/)
```

**A-2**, `AGENTS.md`. Thay `:24-34` (đoạn `Two source files.` tới dòng `list_divisions`). `:25`, `:27` trống và `:26` `**Two layers:**` như cũ; dòng `search_instant` là dòng `:30` cũ, chỉ đổi tên. Số dòng `~220`, `~150`, `~75` lấy từ file lắp ráp (220, 150, 77).

<!-- block: A-2 -->
```text
Three source files. `src/index.ts` (~220 lines) holds the MCP server with every tool's zod schema and handler, and `main()`. `src/search.ts` (~150 lines) holds the pure logic of `search_instant` — building the `/api/search/instant` request URL from the caller's parameters and rendering the response body as `text` or `json`, with no filtering, deduplication, reordering or paging logic. `src/passthrough.ts` (~75 lines) holds the pure logic of the other four tools — one URL builder per endpoint and one shared renderer: `json` returns the response body verbatim, `text` prints every key and array element at every depth in body order, with nothing filtered, merged, reordered or truncated. Neither pure module has imports or I/O. Unit tests live in `test/` and read recorded, trimmed SuttaCentral responses from `test/fixtures/`; they never call the network. Fixtures are small snapshots, not a corpus: re-record one only when a code change needs a new response shape.

**Two layers:**

1. **Request/response logic** — `src/search.ts` and `src/passthrough.ts`. Every request URL comes from one `build*Url()` function there; each handler builds it once and passes it unchanged to `fetch` and to the `Nguồn: SuttaCentral — {URL}` source line. There are no other fetch helpers.
2. **MCP tool definitions** — five tools registered via `server.tool()`, each a thin wrapper of one SuttaCentral endpoint: the API's own parameters plus `format` (`text`/`json`), one GET per call carrying only the parameters the caller passed:
   - `search_instant` — thin wrapper of `GET /api/search/instant`: the API's own parameters (`query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`) plus `format` (`text`/`json`); one request per call carrying only the parameters the caller passed; `text` prints every `suttaplex` and `hits` entry in the order the API returns, unfiltered, with `total`, `fuzzy_dictionary` and `error`; `json` returns the response body verbatim
   - `get_bilarasuttas` — `uid`, `author_uid`, `lang`: segmented text with every map and `keys_order`, keyed by segment ID, never truncated
   - `get_suttaplex` — `uid`, `language`: the suttaplex metadata array, including every `translations` entry
   - `get_parallels` — `uid`, `language`: parallels keyed by source anchor
   - `get_menu` — `submenu_id`, `language`: the navigation tree, one level per call
```

**A-3**, `AGENTS.md`. Thay `:37-40` (bốn dòng endpoint) bằng năm dòng; dòng search cuối giữ nguyên chữ của `:40`.

<!-- block: A-3 -->
```text
- `GET /api/bilarasuttas/{uid}/{author_uid}?lang={lang}`, or `GET /api/bilarasuttas/{uid}` without `author_uid` (root text only) — segmented text; `lang` defaults to `en` upstream, so a non-English translation needs its own `lang`
- `GET /api/suttaplex/{uid}?language={lang}` — metadata; `language` defaults to `en` upstream
- `GET /api/parallels/{uid}?language={lang}` — parallels, keyed by source anchor
- `GET /api/menu?language={lang}` and `GET /api/menu/{submenu_id}?language={lang}` — navigation tree, one level per call
- `GET /api/search/instant?query={q}` plus whichever of `language`, `limit`, `offset`, `selectedLanguages` (JSON string), `restrict`, `matchpartial` the caller passed — search; GET only, not cached
```

**A-4**, `AGENTS.md`. Thay `:46`: bỏ mệnh đề "translator ID defaults to `sujato`", không đổi gì khác.

<!-- block: A-4 -->
```text
- **Bilara** — SuttaCentral's segmented translation format
```

#### Thứ tự áp dụng — ràng buộc cho task planner

`AGENTS.md` được pin trong `specs/tools-api-passthrough/workflow-contract.json` là dependency `context:agents`, sha256 `4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b` (đo lại 2026-10-24 bằng `shasum -a 256 AGENTS.md`). FR-22 bắt buộc áp A-1..A-4, nên hash đó chắc chắn đổi, và workflow coi đó là drift. Vì vậy:

1. **A-1..A-4 là task build cuối cùng, một task riêng, chỉ sửa `AGENTS.md`.** Mọi task sửa `src/`, `test/`, `package.json`, `README.md` (R-1, R-2) và master spec (M-1..M-13) phải xong trước nó.
2. **Ngay sau task đó, trước code review on-completion**, orchestrator chạy đường cập nhật contract:
   - `preview_contract_update`: thay đổi duy nhất được chờ là `dependencies.context:agents` (sha256 mới của `AGENTS.md`). Có thay đổi nào khác thì dừng và báo người dùng.
   - Trình preview cho người dùng, kèm danh sách gate bị ảnh hưởng. Scope là `{"type":"contract","id":"dependencies.context:agents"}`; scope này không mở lại requirements, design hay tasks.
   - `authorize_contract_update`: **chỉ khi người dùng đồng ý rõ ràng tại đúng thời điểm này**. Không agent nào authorize thay người dùng.
   - `write_contract_atomic`, `finish_contract_update`, rồi `settle_contract_invalidation`.
3. **Code review on-completion chỉ được dispatch sau bước 2.**
4. **Nếu người dùng không authorize**, workflow dừng ở trạng thái drift. Agent không tự khôi phục `AGENTS.md`.

Các task code chia theo ý task planner, với hai ràng buộc. P1, I1, SE-1, SE-2 và việc xóa `formatCitation()` phải vào cùng một commit build được: `src/index.ts` của `7dc2299` import `formatCitation`, còn I1 import `./passthrough.js`. T2, bốn fixture và PK-1 vào cùng lúc hoặc sau đó trong cùng task, nếu không `npm test` của commit đó fail (thiếu file test hoặc fixture). Việc ghi fixture cần P1 đã có.

**FR-21.** Mô tả PR nêu #16, #19, #20 bị spec này thay thế, kèm lý do của M-12. Không dùng `Closes #…`/`Fixes #…`, và không đóng issue, trừ khi người dùng đồng ý rõ ràng lúc merge.

## Cross-Cutting Concerns

### Authentication & Authorization

Không áp dụng. API SuttaCentral là API công khai, server chạy stdio cục bộ, test không gọi mạng. Host của URL là hằng trong P1. Tham số path qua `encodeURIComponent`, nên `/`, `?`, `#` không đổi được endpoint hay chèn query; tham số query qua `URLSearchParams`, nên `&`, `=` không chèn được tham số khác. Ngoại lệ đã biết: dot-segment `.`/`..` (Q1).

### Error Handling

| Tình huống | Hành vi | Nơi |
|---|---|---|
| Input sai schema (thiếu `uid`, `uid`/`author_uid`/`submenu_id` rỗng, `uid` không phải chuỗi, `format` lạ) | SDK trả `isError: true`, text `MCP error -32602: Input validation error: Invalid arguments for tool {tên}…`. Handler không chạy, không có request | zod (I1); đo AC-9 6/6 |
| HTTP không 2xx | ném `SuttaCentral API error: {status}` ở cả hai format; SDK dựng `isError: true` | I1 (FR-13) |
| Lỗi mạng | `fetch` reject, lỗi gốc lan lên SDK | I1 |
| 2xx, `text`, body không phải JSON | `JSON.parse` ném `SyntaxError`, SDK dựng `isError: true` | P1 (FR-12) |
| 2xx, `json`, body bất kỳ | trả nguyên văn, không parse | P1 (FR-7) |
| Body "không tìm thấy" HTTP 200 (`{"msg": "Not Found"}`, `{}`, mảng có `uid` `null`) | in như mọi body; không `isError` | P1 (FR-12, C7); đo AC-5 |
| Body `null` hoặc scalar | dòng nguồn + literal | P1 (FR-12) |

Không retry, timeout phía client hay kết quả một phần (Out of Scope).

### Logging & Observability

Không áp dụng. Không thêm log. Server vẫn chỉ in `Sutta MCP server running (stdio)` ra stderr khi khởi động. Dòng nguồn (URL request đầy đủ) cho caller tái tạo đúng request bằng `curl`; AC-1, AC-6, AC-8 dùng nó đúng như vậy.

### Performance & Scalability

- **Request.** Một GET mỗi lời gọi (NFR-6). Trong phiên đo, mỗi GET mất 0.23–5.87 s (`bilarasuttas/dn22/sujato` 5.87 s); review 3 đo tới 8.79 s (`parallels/dn16`). Harness (V2 của tiền lệ) chờ dòng `"id":2` tối đa 90 s, hơn mười lần số đo lớn nhất, và trên mức tối thiểu 30 s của NFR-6.
- **Kích thước output** (đo 2026-10-24: `Buffer.byteLength` của body thô và của `content[0].text` do `renderBody(url, body, "text")` của P1 dựng, với `url` là URL request thật, nên số byte gồm cả dòng nguồn):

  | Request | Body / `json` (B) | `text` (B) | Dòng `text` |
  |---|---|---|---|
  | `bilarasuttas/mn10/sujato` | 97,200 | 95,699 | 1,654 |
  | `bilarasuttas/mn10` | 53,498 | 52,916 | 1,182 |
  | `bilarasuttas/mn10/sujato?lang=vi` | 73,700 | 72,816 | 1,418 |
  | `bilarasuttas/dn22/sujato` | 158,090 | 155,233 | 3,187 |
  | `bilarasuttas/dn16/sujato` | 633,489 | 622,975 | 11,657 |
  | `bilarasuttas/dn16` | 344,559 | 341,082 | 8,327 |
  | `bilarasuttas/dhp1-20/phantuananh?lang=vi` | 21,522 | 21,027 | 656 |
  | `suttaplex/mn10` | 12,962 | 15,027 | 558 |
  | `suttaplex/mn` | 1,343,704 | 1,551,762 | 58,868 |
  | `suttaplex/dn` | 260,840 | 299,744 | 11,004 |
  | `parallels/mn10` | 53,731 | 71,477 | 2,360 |
  | `parallels/dn22` | 77,799 | 102,903 | 3,381 |
  | `parallels/dn16` | 321,012 | 419,188 | 13,707 |
  | `menu` | 168,235 | 182,917 | 6,333 |
  | `menu/sutta` | 2,863 | 3,259 | 93 |
  | `search/instant?query=mindfulness&language=en` | 140,685 | — | — |

  `text` của bilara gần bằng `json` (key segment thay cho dấu ngoặc và dấu nháy); `text` của suttaplex, parallels, menu lớn hơn `json` 9–33% vì thụt lề. Đây là hệ quả đã chấp nhận của C1 (A) và C3 (NFR-7). Phần lớn body search là `translations` của `suttaplex`: 100,243 trong 125,074 ký tự khi serialize lại `suttaplex` và `hits`.
- **Xử lý.** Một lượt đệ quy tuyến tính qua body; độ sâu tối đa đo được là 6. `npm test` (20 case, không mạng) chạy khoảng 0.1 s trên bản dựng thử.

### Testability & Verification

Có bốn vehicle: unit test (`npm test`), lệnh trên repo (diff, grep, build), harness stdio trên bản build mới, và so với bản build `7dc2299` (AC-10). Chỉ harness và bước ghi fixture dùng mạng.

#### Harness và luật hợp lệ (NFR-5)

Client stdio là khối **V2 của `specs/search-api-passthrough/design.md`**, dùng nguyên văn (trích bằng `blk` trỏ vào tài liệu đó). Nó chạy `node ./dist/index.js` trong thư mục bản build, gửi `initialize`, `notifications/initialized`, rồi frame id 2, chờ dòng `"id":2` tối đa 90 s, và in JSON của `result`. Thoát 0 = hợp lệ; 2 = số dòng `"id":2` khác 1 hoặc timeout; 3 = text có `fetch failed`. Trước mỗi đợt chạy, chạy `npm run build`.

V3 chạy tuần tự mọi dòng của V4; dòng `curl` lấy body đối chiếu ngay sau lời gọi tool tương ứng. **Luật hợp lệ:** chỉ lỗi truyền tải là không hợp lệ (V2 thoát 2/3; `curl` thoát khác 0 hoặc HTTP 000), được chạy lại; mỗi input chạy tối đa 3 lần (lần đầu và 2 lần chạy lại). Input hết 3 lần mà vẫn không hợp lệ thì V3 in `INCONCLUSIVE (network) <id>`, chạy tiếp các dòng còn lại, rồi thoát 3. Thoát 3 nghĩa là "inconclusive (network)": không phải pass, không phải lỗi code; V5 không chạy, implementer báo kèm `stderr.log`, và orchestrator quyết định. V5 cũng tự kiểm: output thiếu hoặc rỗng thì in `INCONCLUSIVE (network) …` và thoát 3 trước mọi phép so, không ném lỗi. Chỉ dòng `FAIL` của V5 (thoát 1) là phát hiện về code. Mọi kết quả khác, kể cả `isError`, `SuttaCentral API error:` hay text không như AC chờ, là lần chạy hợp lệ: so với AC (V5); lệch thì dừng và báo, không chạy lại. Trước khi báo, `curl` lại đúng URL của dòng nguồn để phân biệt SC trôi với regression.

```sh
REPO=$(git rev-parse --show-toplevel)   # blk như ở §Lắp ráp
H=$(mktemp -d); mkdir "$H/ac" "$H/base"; ln -s "$REPO" "$H/work"
git -C "$REPO" archive 7dc2299 src package.json tsconfig.json | tar -x -C "$H/base"
ln -s "$REPO/node_modules" "$H/base/node_modules"; (cd "$H/base" && npx tsc -p .); (cd "$REPO" && npm run build)
awk -v id="<!-- block: V2 -->" '$0==id{f=1;next} f&&/^```/{if(o)exit;o=1;next} f&&o{print}' \
  "$REPO/specs/search-api-passthrough/design.md" > "$H/mcp-call.mjs"
blk V3 > "$H/run.sh"; chmod +x "$H/run.sh"; blk V4 > "$H/ac/inputs.list"; blk V5 > "$H/ac/check.cjs"
"$H/run.sh" "$H" && (cd "$H/ac" && node check.cjs)    # đạt: 51 dòng PASS, thoát 0
# run.sh thoát 3 = inconclusive (network): V5 không chạy; báo kèm "$H/ac/stderr.log" trước khi xóa $H.
rm -r "$H"
```

Trên bản dựng thử, ba lượt chạy đầy đủ cùng ngày, mỗi lượt có vài input không hợp lệ (`fetch failed`) được chạy lại và hợp lệ ở lần hai hoặc lần ba (lượt cuối: `ac5a`, `ac7b` ×2, `ac10b-new`). Cả ba lượt: `run.sh` thoát 0, V5 in 51/51 `PASS` và thoát 0. Không lần chạy hợp lệ nào lệch AC.

**Đường quá trần, đã chạy thử:** cùng V3..V5, với preload `globalThis.fetch = async () => { throw new TypeError("fetch failed"); }` qua `NODE_OPTIONS` (áp cho cả bản build mới lẫn `7dc2299`; `curl` không bị ảnh hưởng). V3 in 20 dòng `INCONCLUSIVE (network)` (mọi lời gọi tool cần mạng), 11 dòng `VALID` (3 `curl`, 6 input AC-9, 2 `tools/list`), và thoát 3, nên `&&` không chạy V5. Chạy V5 riêng trên thư mục đó: in `INCONCLUSIVE (network) ac1.json ac2.json …` và thoát 3, không ném lỗi.

<!-- block: V3 -->
```sh
#!/bin/sh
# run.sh <thư mục gốc H> : chạy tuần tự mọi dòng của $H/ac/inputs.list (id|bản build|tool|arguments).
# Bản build là thư mục con của H (work = bản mới, base = 7dc2299). tool = curl: arguments là URL,
# body ghi vào $H/ac/<id>. Lần chạy không hợp lệ (mcp-call thoát 2/3; curl lỗi hoặc HTTP 000) được
# chạy lại; mỗi dòng chạy tối đa 3 lần (lần đầu và 2 lần chạy lại). Dòng hết 3 lần: in INCONCLUSIVE
# (network), chạy tiếp các dòng sau, rồi thoát 3. Lần chạy hợp lệ không bao giờ chạy lại.
# Thoát 0: mọi dòng hợp lệ. Thoát 3: inconclusive (network), không phải pass, không phải lỗi code.
H=$1; inc=
while IFS="|" read -r id dir tool args; do
  try=1
  while :; do
    if [ "$tool" = curl ]; then
      code=$(curl -sS --max-time 60 -o "$H/ac/$id" -w '%{http_code}' "$args" 2>>"$H/ac/stderr.log"); rc=$?
      [ $rc = 0 ] && [ "$code" != 000 ] && rc=0 || rc=2
    else
      node "$H/mcp-call.mjs" "$H/$dir" "$tool" "$args" > "$H/ac/$id.json" 2>>"$H/ac/stderr.log"; rc=$?
    fi
    [ $rc = 0 ] && { echo "VALID $id try=$try"; break; }
    echo "INVALID $id try=$try rc=$rc"; try=$((try+1))
    [ $try -le 3 ] || { echo "INCONCLUSIVE (network) $id"; inc=1; break; }
  done
done < "$H/ac/inputs.list"
[ -z "$inc" ] || exit 3
```

<!-- block: V4 -->
```text
ac1|work|get_bilarasuttas|{"uid":"mn10","author_uid":"sujato","format":"json"}
ac1.curl|-|curl|https://suttacentral.net/api/bilarasuttas/mn10/sujato
ac2|work|get_bilarasuttas|{"uid":"dn22","author_uid":"sujato"}
ac3|work|get_bilarasuttas|{"uid":"dhp1-20","author_uid":"phantuananh","lang":"vi"}
ac4|work|get_bilarasuttas|{"uid":"mn10"}
ac5a|work|get_bilarasuttas|{"uid":"mn9999","author_uid":"sujato"}
ac5b|work|get_suttaplex|{"uid":"mn9999"}
ac5c|work|get_parallels|{"uid":"mn9999"}
ac5d|work|get_menu|{"submenu_id":"xyzzy"}
ac6a|work|get_suttaplex|{"uid":"mn10"}
ac6.curl|-|curl|https://suttacentral.net/api/suttaplex/mn10
ac6b|work|get_suttaplex|{"uid":"mn10","language":"vi"}
ac7a|work|get_parallels|{"uid":"mn10"}
ac7b|work|get_parallels|{"uid":"mn10","language":"vi"}
ac7c|work|get_parallels|{"uid":"dn22"}
ac8a|work|get_menu|{"submenu_id":"long"}
ac8b|work|get_menu|{}
ac8.curl|-|curl|https://suttacentral.net/api/menu
ac8c|work|get_menu|{"submenu_id":"sutta","language":"vi"}
ac9a|work|get_bilarasuttas|{}
ac9b|work|get_bilarasuttas|{"uid":""}
ac9c|work|get_bilarasuttas|{"uid":"mn10","author_uid":""}
ac9d|work|get_suttaplex|{"uid":"mn10","format":"xml"}
ac9e|work|get_parallels|{"uid":42}
ac9f|work|get_menu|{"submenu_id":""}
ac10a-base|base|search_topic|{"query":"vô ngã","language":"vi"}
ac10a-new|work|search_instant|{"query":"vô ngã","language":"vi"}
ac10b-base|base|search_topic|{"query":"foo:bar","language":"en","format":"json"}
ac10b-new|work|search_instant|{"query":"foo:bar","language":"en","format":"json"}
list-base|base|tools/list|{}
list-new|work|tools/list|{}
```

<!-- block: V5 -->
```js
// node check.cjs (chạy trong $H/ac): đọc output của run.sh, in PASS/FAIL cho từng mệnh đề AC.
// Thoát 0: mọi mệnh đề PASS. Thoát 1: có FAIL (phát hiện về code). Thoát 3: thiếu output, xem dưới.
const fs = require("fs");
// Output thiếu hoặc rỗng (V2 thoát 2/3 không ghi stdout) là của một lần chạy không hợp lệ: báo
// inconclusive (network) và thoát 3 trước mọi phép so; không phải FAIL, không phải lỗi code.
const missing = fs.readFileSync("inputs.list", "utf8").trim().split("\n").map((r) => r.split("|")[0])
  .map((id) => (id.endsWith(".curl") ? id : id + ".json"))
  .filter((f) => !fs.existsSync(f) || fs.statSync(f).size === 0);
if (missing.length) { console.log("INCONCLUSIVE (network) " + missing.join(" ")); process.exit(3); }
const R = (id) => JSON.parse(fs.readFileSync(id + ".json", "utf8"));
const T = (id) => R(id).content.map((c) => c.text).join("\n");
const L = (id) => T(id).split("\n");
let fails = 0;
const ok = (name, cond) => { if (!cond) fails++; console.log((cond ? "PASS " : "FAIL ") + name); };
const sec = (lines, key) => { const s = lines.findIndex((l) => l.startsWith(key + ": ")); const e = lines.findIndex((l, i) => i > s && !l.startsWith(" ")); return lines.slice(s, e === -1 ? undefined : e); };
// AC-1
const a1 = R("ac1");
ok("AC-1 body===curl", a1.content[0].text === fs.readFileSync("ac1.curl", "utf8"));
ok("AC-1 src", a1.content[1].text === "Nguồn: SuttaCentral — https://suttacentral.net/api/bilarasuttas/mn10/sujato" && a1.content.length === 2 && !a1.isError);
// AC-2
const l2 = L("ac2");
ok("AC-2 top keys", JSON.stringify(l2.filter((l) => /^\S/.test(l)).slice(2).map((l) => l.split(": ")[0])) === JSON.stringify(["comment_text","html_text","root_text","translation_text","variant_text","reference_text","keys_order"]));
const tt = sec(l2, "translation_text");
ok("AC-2 22.27/22.28", tt.includes("  dn22:22.27: Satisfied, the mendicants approved what the Buddha said. ") && tt.includes('  dn22:22.28: ""'));
ok("AC-2 keys_order 454", l2.includes("keys_order: [mảng, 454 phần tử]"));
ok("AC-2 negatives", !/max_segments|Deep link|\[\.\.\. văn bản bị cắt|Translator:/.test(T("ac2")));
// AC-3
const l3 = L("ac3");
ok("AC-3 src", l3[0] === "Nguồn: SuttaCentral — https://suttacentral.net/api/bilarasuttas/dhp1-20/phantuananh?lang=vi");
const t3 = sec(l3, "translation_text");
ok("AC-3 dhp", t3.includes("  dhp1:0.1: Tiểu Bộ Kinh ") && t3.includes("  dhp1:0.2: Kinh Pháp Cú "));
// AC-4
const l4 = L("ac4");
ok("AC-4 src", l4[0] === "Nguồn: SuttaCentral — https://suttacentral.net/api/bilarasuttas/mn10");
ok("AC-4 root", sec(l4, "root_text").includes("  mn10:0.1: Majjhima Nikāya 10 ") && !l4.some((l) => /^(translation_text|comment_text): /.test(l)));
// AC-5
for (const id of ["ac5a","ac5b","ac5c","ac5d"]) ok("AC-5 noerr " + id, !R(id).isError && !T(id).includes("Không tìm thấy sutta"));
ok("AC-5a", L("ac5a").includes("msg: Not Found"));
ok("AC-5b", L("ac5b")[1] === "[mảng, 1 phần tử]" && L("ac5b").includes("  uid: null") && L("ac5b").includes("  translations: [mảng rỗng, 0 phần tử]"));
ok("AC-5c", L("ac5c")[1] === "{object rỗng}");
ok("AC-5d", L("ac5d").includes("  children: [mảng rỗng, 0 phần tử]"));
// AC-6
const l6 = L("ac6a"); const c6 = JSON.parse(fs.readFileSync("ac6.curl", "utf8"));
ok("AC-6 src", l6[0] === "Nguồn: SuttaCentral — https://suttacentral.net/api/suttaplex/mn10");
ok("AC-6 19 keys order", l6[2] === "[0]: {object, 19 key}" && JSON.stringify(l6.filter((l) => /^  \S/.test(l)).map((l) => l.trim().split(": ")[0])) === JSON.stringify(["acronym","alt_acronym","volpages","alt_volpages","uid","blurb","difficulty","original_title","root_lang","root_lang_name","type","translated_title","translations","parallel_count","biblio","priority_author_uid","verseNo","previous","next"]));
ok("AC-6 translations len " + c6[0].translations.length, l6.includes(`  translations: [mảng, ${c6[0].translations.length} phần tử]`) && l6.includes("      author_uid: ms"));
const di = l6.indexOf("  difficulty: {object, 2 key}"); ok("AC-6 difficulty", l6[di+1] === "    name: intermediate" && l6[di+2] === "    level: 2");
ok("AC-6 vi", L("ac6b")[0].endsWith("/suttaplex/mn10?language=vi") && L("ac6b").includes("  translated_title: Kinh Niệm xứ"));
// AC-7
const l7 = L("ac7a"); const tops = l7.filter((l) => /^\S/.test(l)).slice(2);
ok("AC-7 anchors", JSON.stringify(tops) === JSON.stringify(["mn10: [mảng, 8 phần tử]","mn10#44.1: [mảng, 2 phần tử]","mn10#47.1: [mảng, 3 phần tử]","mn10#10.1: [mảng, 3 phần tử]"]));
const m10 = sec(l7, "mn10"); const f0 = m10.slice(1, m10.indexOf("  [1]: {object, 5 key}"));
ok("AC-7 first", f0.includes("      uid: dn22") && f0.includes("    type: full") && f0.includes("    resembling: false"));
ok("AC-7 neg", !/[≡≈↺]|parallels tổng cộng/.test(T("ac7a")));
const v7 = L("ac7b"); const vm = sec(v7, "mn10"); const vf = vm.slice(1, vm.indexOf("  [1]: {object, 5 key}"));
ok("AC-7 vi", v7[0].endsWith("?language=vi") && vf.includes("      uid: dn22") && vf.includes("      translated_title: Kinh Ðại Niệm xứ"));
const t7c = L("ac7c").filter((l) => /^\S/.test(l)).slice(2);
ok("AC-7 dn22 " + t7c.length, t7c.length === 7 && t7c[0].startsWith("dn22: ") && t7c.reduce((a, l) => a + Number(l.match(/(\d+) phần tử/)[1]), 0) === 27);
// AC-8
const l8 = L("ac8a");
ok("AC-8 long", l8[0] === "Nguồn: SuttaCentral — https://suttacentral.net/api/menu/long" && l8[1] === "[mảng, 1 phần tử]" && l8.includes("  uid: long") && JSON.stringify(l8.filter((l) => /^ {6}uid: /.test(l))) === JSON.stringify(["      uid: dn","      uid: da","      uid: da-ot"]));
const l8b = L("ac8b"); const c8 = JSON.parse(fs.readFileSync("ac8.curl", "utf8"));
ok("AC-8 menu " + c8.length, l8b[0] === "Nguồn: SuttaCentral — https://suttacentral.net/api/menu" && l8b[1] === `[mảng, ${c8.length} phần tử]`);
const si = l8b.indexOf("  uid: sutta"); const after = l8b.slice(si); const ce = after.findIndex((l) => /^\[/.test(l));
ok("AC-8 sutta children", JSON.stringify(after.slice(0, ce).filter((l) => /^ {6}uid: /.test(l)).map((l) => l.trim().slice(5))) === JSON.stringify(["long","middle","linked","numbered","minor","other-group"]));
ok("AC-8 vi", L("ac8c").includes("  translated_name: Kinh tạng"));
// AC-9
const tool9 = { ac9a: "get_bilarasuttas", ac9b: "get_bilarasuttas", ac9c: "get_bilarasuttas", ac9d: "get_suttaplex", ac9e: "get_parallels", ac9f: "get_menu" };
for (const [id, tool] of Object.entries(tool9)) ok("AC-9 " + id, R(id).isError === true && T(id).startsWith(`MCP error -32602: Input validation error: Invalid arguments for tool ${tool}`));
// AC-10
ok("AC-10 a byte", fs.readFileSync("ac10a-base.json", "utf8") === fs.readFileSync("ac10a-new.json", "utf8"));
ok("AC-10 b byte", fs.readFileSync("ac10b-base.json", "utf8") === fs.readFileSync("ac10b-new.json", "utf8"));
const lb = R("list-base").tools, ln = R("list-new").tools;
const sb = lb.find((t) => t.name === "search_topic"), sn = ln.find((t) => t.name === "search_instant");
ok("AC-10 schema", JSON.stringify(sb.inputSchema) === JSON.stringify(sn.inputSchema));
const S = sn.description.slice(sb.description.length + 1);
ok("AC-10 desc", sn.description === sb.description + " " + S && S.includes("140,685") && S.includes("`limit`/`offset` chỉ phân trang `hits`") && S.includes("`title:`") && S.includes("cụ thể hơn") && !S.includes(". ", 0) );
ok("AC-10 names", JSON.stringify(ln.map((t) => t.name)) === JSON.stringify(["search_instant","get_bilarasuttas","get_suttaplex","get_parallels","get_menu"]));
// AC-11
const props = { get_bilarasuttas: ["uid","author_uid","lang","format"], get_suttaplex: ["uid","language","format"], get_parallels: ["uid","language","format"], get_menu: ["submenu_id","language","format"] };
for (const [n, ps] of Object.entries(props)) {
  const t = ln.find((x) => x.name === n); const s = t.inputSchema;
  const defs = Object.entries(s.properties).filter(([, v]) => "default" in v).map(([k, v]) => k + "=" + v.default);
  ok("AC-11 " + n, JSON.stringify(Object.keys(s.properties)) === JSON.stringify(ps) && JSON.stringify(defs) === '["format=text"]' && (n === "get_menu" ? (s.required === undefined || s.required.length === 0) : JSON.stringify(s.required) === '["uid"]'));
  const all = t.description + " " + Object.values(s.properties).map((p) => p.description).join(" ");
  ok("AC-11 neg " + n, !/max_segments|Deep link|hardcode|tradition|mặc định `?sujato/.test(all));
}
process.exitCode = fails ? 1 : 0;
```

#### Đột biến (FR-18, AC-12)

Chạy trên một bản sao cây làm việc **ngoài repo** (`rsync` không kèm `.git`, `node_modules`, `dist`; `node_modules` là symlink về repo). Mỗi lần, V1 áp đúng một đột biến lên `src/passthrough.ts` và kiểm nó đổi đúng 1 dòng; `changed` khác 1 nghĩa là pattern không khớp P1 và lần chạy đó không có giá trị. Sau đó V1 chạy `npm test` rồi hoàn nguyên.

```sh
C=$(mktemp -d); rsync -a --exclude .git --exclude node_modules --exclude dist "$REPO"/ "$C"/; ln -s "$REPO/node_modules" "$C/node_modules"
blk V1 > "$C.sh"; chmod +x "$C.sh"
for m in a b c d e f; do "$C.sh" "$C" "$m"; done; (cd "$C" && npm test > /dev/null 2>&1; echo "restored exit=$?")
rm -r "$C" "$C.sh"
```

Trên bản dựng thử:

| Đột biến (FR-18) | Thay đổi trong P1 | `changed` | Mã thoát | Case fail |
|---|---|---|---|---|
| (a) bỏ giá trị chuỗi rỗng khỏi `text` | `children.filter(([, x]) => x !== "")` | 1 | 1 | **FR-10**, FR-11 |
| (b) gửi `lang=en`/`language=en` khi caller không truyền | `value === undefined ? "?" + key + "=en"` | 1 | 1 | **FR-3**, FR-4, FR-5 |
| (c) sắp key theo bảng chữ cái | `Object.entries(v).sort()` | 1 | 1 | **FR-10** |
| (d) chỉ 50 phần tử đầu | `children.slice(0, 50)` | 1 | 1 | **FR-10** |
| (e) bỏ key `translations` | `children.filter(([x]) => x !== "translations")` | 1 | 1 | **FR-10** |
| (f) luôn thêm `author_uid` `sujato` | `p.author_uid ?? "sujato"` | 1 | 1 | **FR-3** |

Sau sáu lần, `npm test` trên bản sao thoát 0 (đã hoàn nguyên).

<!-- block: V1 -->
```sh
#!/bin/sh
# mutate.sh <bản sao cây làm việc, ngoài repo> <a|b|c|d|e|f>: áp MỘT đột biến FR-18, chạy npm test, hoàn nguyên.
cd "$1" || exit 2
cp src/passthrough.ts .passthrough.ts.orig
case "$2" in
  a) perl -pi -e 's/for \(const \[k, e\] of children\) render/for (const [k, e] of children.filter(([, x]) => x !== "")) render/' src/passthrough.ts ;;
  b) perl -pi -e 's/const query = value === undefined \? "" :/const query = value === undefined ? "?" + key + "=en" :/' src/passthrough.ts ;;
  c) perl -pi -e 's/\? Object\.entries\(v\)$/? Object.entries(v).sort()/' src/passthrough.ts ;;
  d) perl -pi -e 's/for \(const \[k, e\] of children\) render/for (const [k, e] of children.slice(0, 50)) render/' src/passthrough.ts ;;
  e) perl -pi -e 's/for \(const \[k, e\] of children\) render/for (const [k, e] of children.filter(([x]) => x !== "translations")) render/' src/passthrough.ts ;;
  f) perl -pi -e 's/p\.uid, p\.author_uid\]/p.uid, p.author_uid ?? "sujato"]/' src/passthrough.ts ;;
esac
changed=$(diff .passthrough.ts.orig src/passthrough.ts | grep -c '^>')
npm test > .mutant.log 2>&1; code=$?
echo "mutation $2: changed=$changed exit=$code failed: $(grep '^not ok' .mutant.log | sed 's/^not ok [0-9]* - //' | cut -d: -f1 | sort -u | tr '\n' ' ')"
mv .passthrough.ts.orig src/passthrough.ts; rm -f .mutant.log
```

#### Vehicle theo AC

Cột cuối là kết quả trên bản dựng thử ngày 2026-10-24. "V5" nghĩa là các dòng `PASS`/`FAIL` có tên AC tương ứng.

| AC | Lệnh / vehicle | Kết quả trên bản dựng thử |
|---|---|---|
| AC-1 | V4 `ac1`, `ac1.curl`; V5 so `content[0].text === ac1.curl` bằng `===`, item 2 là dòng nguồn không `?` | Đạt: trùng byte (97,200 B) |
| AC-2 | V4 `ac2`; V5: bảy key top-level theo thứ tự, dòng `dn22:22.27`/`dn22:22.28: ""` trong `translation_text`, `keys_order: [mảng, 454 phần tử]`, không `max_segments`/`Deep link`/`[... văn bản bị cắt`/`Translator:` | Đạt |
| AC-3 | V4 `ac3`; dòng nguồn `…/dhp1-20/phantuananh?lang=vi`; `dhp1:0.1: Tiểu Bộ Kinh `, `dhp1:0.2: Kinh Pháp Cú ` | Đạt |
| AC-4 | V4 `ac4`; dòng nguồn `…/bilarasuttas/mn10`; `mn10:0.1: Majjhima Nikāya 10 ` trong `root_text`; không key top-level `translation_text`/`comment_text`. Mệnh đề "không request tới `/api/suttaplex/`": đọc handler `get_bilarasuttas` của I1 (một `fetch`, đối số `url`) | Đạt |
| AC-5 | V4 `ac5a`..`ac5d`; không `isError`; `msg: Not Found`; `[mảng, 1 phần tử]` + `  uid: null` + `  translations: [mảng rỗng, 0 phần tử]`; dòng 2 `{object rỗng}`; `  children: [mảng rỗng, 0 phần tử]`; không `Không tìm thấy sutta` | Đạt |
| AC-6 | V4 `ac6a`, `ac6.curl`, `ac6b`; 19 key theo thứ tự; `translations` có `length` của body `curl` (43) và mục `ms`; `difficulty` `intermediate`/`2`; `language=vi` → `Kinh Niệm xứ` | Đạt |
| AC-7 | V4 `ac7a`..`ac7c`; bốn anchor 8/2/3/3; phần tử đầu `to.uid` `dn22`, `type: full`, `resembling: false`; không `≡≈↺`, không `parallels tổng cộng`; `vi` → `Kinh Ðại Niệm xứ`; `dn22`: 7 anchor, tổng 27 | Đạt |
| AC-8 | V4 `ac8a`, `ac8b`, `ac8.curl`, `ac8c`; `long` → `dn`, `da`, `da-ot`; `[mảng, {length của curl} phần tử]` (464); con của `sutta`; `Kinh tạng`. Mệnh đề `describe()`: V5 AC-11 và đọc I1 (`sutta`, `vinaya`, `abhidhamma`) | Đạt |
| AC-9 | V4 `ac9a`..`ac9f`; `isError === true`, text bắt đầu `MCP error -32602: Input validation error: Invalid arguments for tool {tên}` | Đạt 6/6 |
| AC-10 | V4 `ac10*`, `list-*`; content trùng byte với baseline `7dc2299` (2 input); `inputSchema` trùng byte; `description === desc_base + " " + S`, `S` có `140,685`, `` `limit`/`offset` chỉ phân trang `hits` ``, `` `title:` ``, `cụ thể hơn`, và không có `". "` bên trong (một câu); thứ tự năm tên | Đạt |
| AC-11 | V4 `list-new`; V5: property, `required`, chỉ `format` có `default`; không `max_segments`/`Deep link`/`hardcode`/`tradition`/`sujato` dạng mặc định. Các ý FR-14 còn lại (dòng "Kích thước" của bốn tool, không mô tả nào nói uid của division làm output parallels/bilara lớn): đọc I1 | Đạt |
| AC-12 | `npm test > "$L/t1.log" 2>&1; echo $?`; preload: `P=$(mktemp -d); printf 'globalThis.fetch = () => { throw new Error("network disabled"); };\n' > "$P/nofetch.mjs"; NODE_OPTIONS="--import $P/nofetch.mjs" npm test > "$L/t2.log" 2>&1; echo $?; rm -r "$P"`; `grep -E '^ok' "$L/t1.log"` có tiền tố `tools-api-passthrough FR-3:`, `FR-4:`, `FR-5:`, `FR-7:`, `FR-9:`, `FR-10:`, `FR-11:`, `FR-12:`; §Đột biến; `ls test/fixtures \| wc -l`; `cat test/fixtures/* \| wc -c`; `grep -l -E '"(highlight\|translations)"' test/fixtures/*`; bước 5 của §Quy trình | Đạt: hai lần thoát 0, `# pass 20`, `# fail 0`; đủ 8 tiền tố (FR-10 có 2 case); 6/6 đột biến; 7 file, 38,443 B, grep rỗng; `grep -rn -E 'fetch\|src/index' test/` không có dòng nào |
| AC-13 | `rm -rf dist && npm run build && find dist -type f \| sort`; `git diff 7dc2299 --stat`; `git diff 7dc2299 -- package-lock.json tsconfig.json` (rỗng); `git diff 7dc2299 -- package.json` (chỉ `scripts.test`); grep FR-15 và bảng grep dưới; §Lắp ráp; đọc I1 theo §I1 Tính chất | Đạt trên bản dựng thử |
| AC-14 | grep của AC-14; đọc bảng endpoint, Parallel types, Tool 1–5, luồng mẫu, Constraints, roadmap 1/2/3/5/6/7, bảng issue; lệnh tái dựng dưới; sau task A và bước contract: `shasum -a 256 AGENTS.md` bằng sha256 `context:agents` mới | Trên bản sao đã áp mọi khối: README 0, AGENTS.md 0, master spec 6 dòng lịch sử (§Khối sửa tài liệu). Mệnh đề contract và PR kiểm lúc build |

`L` là một thư mục tạm cho log (`L=$(mktemp -d)`), xóa khi xong.

**Lệnh tái dựng tài liệu (AC-14).** Mỗi file đích phải trùng từng byte với file tái dựng từ `7dc2299` và các khối:

```sh
REPO=$(git rev-parse --show-toplevel)   # blk như ở §Lắp ráp
R=$(mktemp); git -C "$REPO" show 7dc2299:README.md > "$R"
{ sed -n '1,12p' "$R"; blk R-1; sed -n '18,69p' "$R"; blk R-2; sed -n '75,$p' "$R"; } \
  | diff - "$REPO/README.md" && echo README-OK
S=$(mktemp); git -C "$REPO" show 7dc2299:specs/sutta-mcp-requirements.md > "$S"
{ sed -n '1,117p' "$S"; blk M-1; sed -n '123,129p' "$S"; blk M-2; sed -n '138,142p' "$S"; blk M-3; sed -n '255,260p' "$S"
  blk M-4; sed -n '274,282p' "$S"; blk M-5; sed -n '285,289p' "$S"; blk M-6; sed -n '291,295p' "$S"; blk M-7; sed -n '301p' "$S"
  blk M-8; sed -n '303,320p' "$S"; blk M-9; sed -n '322,326p' "$S"; blk M-10; sed -n '332,350p' "$S"; blk M-11
  sed -n '352,358p' "$S"; blk M-12; sed -n '362p' "$S"; blk M-13; } | diff - "$REPO/specs/sutta-mcp-requirements.md" && echo MASTER-OK
A=$(mktemp); git -C "$REPO" show 7dc2299:AGENTS.md > "$A"
{ sed -n '1,16p' "$A"; blk A-1; sed -n '18,23p' "$A"; blk A-2; sed -n '35,36p' "$A"; blk A-3; sed -n '41,45p' "$A"; blk A-4; sed -n '47,$p' "$A"; } \
  | diff - "$REPO/AGENTS.md" && echo AGENTS-OK
rm -f "$R" "$S" "$A"
```

`README-OK` và `MASTER-OK` chạy được sau task tài liệu; `AGENTS-OK` chỉ sau task A. Đã chạy cả ba trên bản sao đã áp mọi khối, với tài liệu này làm `D`.

**Bảng grep bất biến (FR-15, NFR-2).** Bộ lọc nhanh, không đủ một mình; lưới thật là §Lắp ráp.

| Lệnh | `src/index.ts` trước (`7dc2299`) | `src/index.ts` sau | `src/search.ts` sau | `src/passthrough.ts` |
|---|---|---|---|---|
| `grep -c -F 'segmented'` | 3 | **0** | 0 | 0 |
| `grep -c -F 'sujato'` | 3 | **2** (ví dụ trong `describe()` của `get_bilarasuttas`) | 0 | 0 |
| `grep -c -F 'fetch('` | 4 | **5** | 0 | 0 |
| `grep -c -F 'server.tool('` | 5 | **5** | 0 | 0 |
| `grep -c -F 'formatCitation'` | 3 | **0** | **0** | 0 |
| `grep -c -E '^(let\|var\|const) '` | 4 | **2** (`server`, `formatParam`) | 0 | 0 |
| `cat src/*.ts \| grep -c -E` với pattern của FR-15 | — | **0** (cả `src/`) | | |
| `grep -c -E '≡\|≈\|↺\|→'` | — | **0** | 0 | 0 |
| `wc -l <` | 446 | **220** | **150** | **77** |

Dọn dẹp khi xong: mọi thư mục `mktemp` ở trên (NFR-5).

## Alternatives Considered

### Alternative A: Đặt logic bốn tool vào `src/search.ts`

- **Description:** Thêm bốn hàm dựng URL và bộ hiển thị vào `src/search.ts`, dùng chung `sourceLine()` có sẵn; không có file mới, `scripts.test` có thể giữ nguyên nếu test cũng vào `test/search.test.ts`.
- **Why not chosen:** Module tên `search` sẽ chứa logic của bốn endpoint không phải search, và đầu file phải viết lại (nó nói module chỉ có logic của search). Test mới phải trộn vào file mà mọi case đang mang tiền tố FR của spec khác. Đổi lại, cách được chọn lặp một hàm một dòng (`sourceLine`) và hai kiểu; test FR-9 của cả hai file ghim cùng literal, nên lệch sẽ bị bắt.

### Alternative B: Một handler chung `passthrough(build)` cho bốn tool

- **Description:** Một hàm `async function handle(url, format)` hoặc một factory trả handler, để bốn `server.tool()` không lặp bốn dòng.
- **Why not chosen:** AC-13 kiểm bằng đọc code rằng trong mỗi handler, kết quả hàm dựng được gán vào đúng một biến và biến đó là đối số trần của `fetch` và của dòng nguồn. Qua hàm trung gian, đối số của `fetch` là tham số của hàm khác; người đọc phải lần qua hai hàm. Bốn dòng lặp là cái giá nhỏ, cùng lý do với Alternative B của tiền lệ.

### Alternative C: Chuỗi trông như literal JSON in có dấu nháy

- **Description:** Chuỗi khác rỗng nhưng trùng dạng `null`/`true`/`false`/số in bằng `JSON.stringify` (ví dụ `publication_date: "2019"`), để `text` phân biệt chuỗi với số (Q2).
- **Why not chosen:** C1 (A) và C2 chốt "chuỗi in nguyên văn", chỉ chuỗi rỗng in `""`; FR-10 chỉ đòi phân biệt chuỗi rỗng, `null`, `{}`, `[]` và key vắng. Quy tắc này thêm một nhánh regex vào `head()`, và caller cần kiểu chính xác có `json`. Có thể thêm sau mà không đổi phần còn lại của P1.

### Alternative D: Object/mảng in là `{}`/`[]` trần hoặc JSON một dòng

- **Description:** `head()` của object rỗng là `{}`, mảng rỗng `[]`; hoặc mỗi object lá in dạng `JSON.stringify` trên một dòng.
- **Why not chosen:** `{}` trần trùng với chuỗi `"{}"` rất phổ biến trong `html_text` (đo: 68 giá trị ở `mn10`), nên `{object rỗng}`/`[mảng rỗng, 0 phần tử]` cần chữ. JSON một dòng trộn chuỗi có escape (`\"`) vào output, trái "chuỗi in nguyên văn", và gần như trùng `json` (C1 cách C).

### Alternative E: Fixture `bilarasuttas/mn10/sujato` và `menu/sutta`

- **Description:** Ghi body nhỏ hơn thay cho `dn22` và `/api/menu`.
- **Why not chosen:** `dn22/sujato` có sẵn segment cuối với `translation_text` rỗng mà FR-11 cần, và trùng request của AC-2. `/menu/sutta` không có node `children: []` nào, trong khi requirements (§Hình dạng API, dòng `menu`) yêu cầu fixture `get_menu` giữ các node đó. Cả hai fixture sau khi cắt chỉ 2,804 B và 7,711 B.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Dữ liệu SC trôi giữa ngày soạn design và ngày ghi fixture hoặc chạy harness, làm literal của T2/AC sai (ví dụ số node menu, số `translations`) | M (menu và `translations` là dữ liệu sống) | M: test hoặc AC fail, phải sửa design | AC-6, AC-8 so với `length` của body `curl` lấy ngay sau đó, không so với hằng; quy tắc §Fixture: dừng và báo kèm số đo có ngày, không ghi lại để tìm lần trùng |
| Implementer chép sai P1/I1/T2 (thêm mặc định, `trim`, lọc chuỗi rỗng, bỏ `export`) | M | M | §Lắp ráp so toàn file bằng `diff`; V1 chứng minh test bắt sáu lỗi của FR-18 |
| Lỗi mạng thoáng qua trong harness hoặc lúc ghi fixture | **H** (đo: 11 lần `fetch failed` trong ba lượt harness ngày 2026-10-24) | L | Luật hợp lệ NFR-5: chỉ lỗi truyền tải được chạy lại, tối đa 3 lần chạy mỗi input (2 lần chạy lại); V3 thoát 3 khi quá trần, là "inconclusive (network)" |
| Output `text` vượt giới hạn output MCP của client (`suttaplex/mn` 1.55 MB `text`; Claude Code mặc định 25,000 token, lưu ra file khi hơn 50,000 ký tự) | M | M: caller nhận output bị lưu ra file hoặc bị cắt phía client | Đã chấp nhận (C3, NFR-7). `describe()` của cả năm tool cảnh báo và nêu cách thu hẹp khi API có |
| uid `.`/`..` bị `fetch` chuẩn hóa thành URL khác dòng nguồn (Q1) | L (caller không có lý do gửi) | L: request tới `/api/` hoặc `/api/{endpoint}/`, lỗi HTTP hoặc body lạ; dòng nguồn không phản ánh request thật | Ghi ở Q1; cách sửa (`refine`) chỉ đổi I1 |
| Chuỗi `"2019"` và số `2019` in giống nhau trong `text` (Q2) | H (`publication_date`) | L: chỉ mất thông tin kiểu | `json` phân biệt được; Alternative C nếu cần |
| Chuỗi chứa xuống dòng phá thụt lề của `text` | L (0 chuỗi trong 27 body đo) | L: độ lồng khó đọc ở dòng đó | `json` cho cấu trúc chính xác; requirements cấm sửa chuỗi |
| Caller cũ gọi `search_topic`, `get_sutta`, `get_sutta_meta`, `list_divisions` | M | M: lời gọi thất bại | Có chủ đích (quyết định 1, 2); README, master spec, AGENTS.md mô tả tên mới |
| Sửa `AGENTS.md` gây drift contract | **H** (bắt buộc sửa) | **H**: chặn mọi dispatch và code review | §Thứ tự áp dụng: task cuối, riêng; cập nhật contract do người dùng authorize ngay sau đó |
| Commit trung gian không build hoặc `npm test` fail | M | L | §Thứ tự áp dụng: P1, I1, SE-1, SE-2 cùng commit; T2, fixture, PK-1 cùng task |
