# Design: `search_topic` là wrapper mỏng của `GET /api/search/instant`

**Status:** Reviewed
**Created:** 2026-10-23
**Spec slug:** search-api-passthrough
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/dynamic-search/` và `specs/search-unit-tests/`. Hành vi gốc là hành vi của `d972fa6`. Phần logic tự chế của hai spec đó (ánh xạ tiếng Việt, `match`/`page`, lọc, khử trùng, cắt trang, footer) bị thay hoàn toàn. `formatCitation()` và mọi dòng khác của `src/index.ts` giữ nguyên, xem §Vùng được bảo vệ.

## Context Recap

Requirements (Status: Reviewed) biến `search_topic` thành wrapper mỏng của `GET https://suttacentral.net/api/search/instant`. Tool có bảy tham số API cùng tên với API, cộng `format` (`text`/`json`). Mỗi lời gọi phát đúng một GET, chỉ với các tham số caller truyền (FR-1, FR-2, FR-3). Một hàm thuần trong `src/search.ts` dựng URL, và handler dùng nguyên URL đó cho `fetch` và cho dòng nguồn (FR-2a). `json` trả body nguyên văn (FR-5). `text` in mọi phần tử theo thứ tự API, không lọc (FR-6..FR-12). Lỗi đi theo đường cũ (FR-13). Bốn tool còn lại không đổi từng byte (FR-16). Requirements cũng yêu cầu viết lại unit test và fixture (FR-17, FR-18, NFR-4) và sửa tài liệu (FR-19..FR-21). `AGENTS.md` được sửa cuối cùng, rồi cập nhật contract khi người dùng authorize.

Tài liệu này chốt các điểm requirements để lại cho design:

1. `src/search.ts`: hàm dựng URL, hàm dựng output, chữ và nhãn của output `text` (FR-6 để design chốt). Nguyên văn toàn file, khối M1.
2. Dòng import và khối Tool 1 trong `src/index.ts`, gồm `describe()` theo FR-14. Khối I1, H1, cùng lệnh §Lắp ráp.
3. Output `json` được dựng trong `src/search.ts`, nên dòng FR-5 của bảng FR-17 **áp dụng** (AC-13).
4. Test `test/search.test.ts` nguyên văn (khối T1). Ba fixture mới, cách ghi, cách cắt, cách kiểm thô so với đã cắt (F1..F4). Chín fixture cũ bị xóa.
5. Lệnh đột biến FR-18 (V1), harness stdio (V2), A/B với `d972fa6` cho AC-12 (V3, V4).
6. Các khối sửa tài liệu và thứ tự áp dụng, gồm bước cập nhật contract cho `AGENTS.md`.
7. Bảng verify từ mỗi AC tới lệnh.

Mọi số đo và kết quả trong tài liệu này được đo ngày **2026-10-23**, trên một bản dựng thử trong thư mục tạm ngoài repo (`mktemp -d /tmp/sap-design.XXXXXX`, đã xóa):

- `git archive d972fa6` (`src`, `test`, `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md`), `node_modules` symlink về repo. Node v22.17.0, tsx 4.21.0, typescript 5.9.3, `@modelcontextprotocol/sdk` 1.29.0, zod 3.25.76.
- M1, T1 và `src/index.ts` lắp từ I1, H1 được ghi vào bản dựng thử đúng như trong tài liệu này. `npx tsc -p .` thoát 0.
- Ba fixture ghi live bằng F2, cắt bằng F3, kiểm bằng F4 (`EQUIV-OK`). `npm test`: `# pass 11`, `# fail 0`.
- Bốn đột biến (V1), harness live cho AC-1..AC-6, AC-9, AC-11, A/B 6 input với bản build `d972fa6` (AC-12), và mô phỏng mọi khối tài liệu.

## High-Level Design

```
search_topic({ format, ...params })                         src/index.ts (H1)
  ├─ url = buildSearchUrl(params)                             src/search.ts — đúng 1 lần, 1 biến
  ├─ res = await fetch(url)                                   src/index.ts — đúng 1 request
  ├─ !res.ok → throw `SuttaCentral API error: ${status}`      như ba helper fetch khác
  └─ content = renderSearch(url, await res.text(), format)    src/search.ts
        ├─ json → [ body nguyên văn, dòng nguồn(url) ]
        └─ text → JSON.parse(body) → dòng nguồn(url), suttaplex, hits, total, fuzzy_dictionary, error

test/search.test.ts ──import──▶ src/search.ts ◀──import── src/index.ts (buildSearchUrl, renderSearch, formatCitation)
        └─ readFileSync(test/fixtures/*.json)          (không mạng, không đụng globalThis.fetch)
```

Năm quyết định trung tâm:

1. **`src/search.ts` giữ toàn bộ logic. `src/index.ts` chỉ còn I/O.** Có hai hàm export. `buildSearchUrl(params)` là hàm FR-2a. `renderSearch(url, raw, format)` nhận đúng thứ `fetch` cho (`res.text()`) và trả mảng content của tool, cho cả hai format. Handler có bốn dòng: dựng URL, fetch, kiểm `ok`, trả `renderSearch`. Vì output `json` cũng được dựng ở `src/search.ts`, FR-5 có case unit test (dòng FR-5 của bảng FR-17 áp dụng). AC-4 còn kiểm thêm FR-5 trên dữ liệu live.
2. **Không còn helper `fetchSearch()`. Handler gọi `fetch(url)` trực tiếp.** Như vậy NFR-5/AC-14 kiểm được bằng mắt trên một chỗ: đối số của `fetch` search chính là biến `url`, viết trần. Số lời gọi `fetch(` trong `src/index.ts` vẫn là 4. Hệ quả: dòng `:28` của `AGENTS.md` (liệt kê `fetchSearch()`) phải sửa, xem Q1.
3. **Output `text` là chuỗi khối cách nhau một dòng trống.** Mỗi phần tử mảng là một khối, mở đầu bằng nhãn chỉ số theo JSON (`suttaplex[0]`, `hits[3]`). Nhờ nhãn này, số mục đếm được bằng máy, và caller đối chiếu được với `format=json` mà không phải đoán. Mục `fuzzy_dictionary` là JSON một dòng, nằm liền sau tiêu đề của phần (AC-16).
4. **Chuỗi gửi đi và chuỗi in ra là nguyên văn.** `query` chỉ đi qua mã hóa của `URLSearchParams`. Field chuỗi của body được in như API trả, kể cả khoảng trắng cuối (`Not-Self `). "Vắng hoặc rỗng" nghĩa là không phải chuỗi, hoặc là chuỗi `""`. Không có `trim`.
5. **Fixture mang luôn `params`, tức input của tool.** Mỗi fixture có dạng `{ url, recorded, params, body }`. Test kiểm `buildSearchUrl(params) === url`, nên fixture được ràng buộc với đúng request tool phát. Script ghi (F2) cũng dựng URL bằng chính `buildSearchUrl()`.

### Đọc tối thiểu để implement

Các khối ràng buộc được đánh dấu **[NORMATIVE]** tại chỗ. Mỗi khối có một dòng neo `<!-- block: TÊN -->` ngay trước code fence, để trích bằng máy (hàm `blk` ở §Lắp ráp):

1. §M1: `src/search.ts`, nguyên văn toàn file.
2. §I1, §H1, §Lắp ráp: `src/index.ts`, kiểm bằng một lệnh `diff` cho toàn file.
3. §T1: `test/search.test.ts`, nguyên văn toàn file.
4. §Fixture: F1 (danh sách), F2 (ghi), F3 (cắt), F4 (kiểm), bảng số đo, danh sách fixture cũ phải xóa.
5. §Khối sửa tài liệu: R-1, R-2, M-1..M-5, A-1, A-2, và §Thứ tự áp dụng.
6. §Testability: V1 (đột biến), V2 (harness), V3/V4 (A/B), bảng verify.

### Câu hỏi mở

- **Q1 — đã trả lời 2026-10-24: người dùng chọn default (sửa cả ba dòng `:26`, `:28`, `:30` theo khối A-1).** **Q1 (cần người dùng xác nhận trước task `AGENTS.md`, không chặn các task khác).** FR-21 liệt kê các dòng `AGENTS.md` cần sửa (`:24`, `:29`, `:31`, `:41`, `:43-45`) và ghi "Không đổi gì khác". Nhưng các sửa bắt buộc đó kéo theo ba dòng ngoài danh sách. Nếu không sửa, ba dòng này sẽ sai:
  - `:26` `**Three layers:**`: sau khi bỏ lớp 2 (`:29`) chỉ còn hai lớp.
  - `:28` liệt kê `fetchSearch()`: hàm này bị xóa (quyết định 2).
  - `:30` `3. **MCP tool definitions**`: thành lớp thứ hai.

  **Default của design:** sửa cả ba dòng như khối A-1 (`Two layers`; bỏ `fetchSearch()` khỏi `:28` và thêm một câu nói handler fetch URL của `buildSearchUrl()`; đánh số lại `2.`). Không đổi gì khác. Nếu người dùng chọn giữ nguyên ba dòng, chỉ khối A-1 và lệnh tái dựng `AGENTS-OK` đổi. Code không đổi. Cách khác là giữ một helper `fetchSearch(url)` trong `src/index.ts` để `:28` vẫn đúng. Design không chọn cách này, xem §Alternative B.

### Vùng được bảo vệ

- **Mọi dòng của `src/index.ts` ngoài dòng import `:5`, `fetchSearch()` (`:33-40`) và khối Tool 1 (`:107-147`) trùng `d972fa6`.** Lệnh §Lắp ráp kiểm điều này cho toàn file. Vì vậy các khối normative của `non-segmented-translation-guard` (N1, N5-T), `bilara-lang-param` (N3), `get-sutta-unknown-uid` (U1) và bốn tool còn lại không bị đụng (FR-16 ở mức code). A/B (AC-12) kiểm thêm ở mức output.
- **`formatCitation()` trùng từng byte với `d972fa6:src/search.ts`** (lệnh `CITATION-OK` ở §Lắp ráp). Nó vẫn nằm trong `src/search.ts` và vẫn được export, vì `get_sutta` và `get_sutta_meta` import nó từ đây.
- **Artifact của `dynamic-search` và `search-unit-tests` không sửa** (Out of Scope). Lệnh §Lắp ráp của hai spec đó không còn in `ASSEMBLY-OK`/`SEARCH-OK`/`TEST-OK` sau spec này. Đó là bước verify có ngày của các spec kia, không phải bất biến chạy tiếp. Việc thay thế được ghi ở master spec (khối M-3).

## Data Model

Không có entity lưu trữ. Các kiểu export từ M1:

| Kiểu | Hình dạng | Ràng buộc |
|---|---|---|
| `SearchParams` | `{ query: string; language?; limit?; offset?; selectedLanguages?: string[]; restrict?; matchpartial?: boolean }` | Trùng kiểu suy ra từ zod schema của H1, sau khi bỏ `format`. Handler truyền `params` của `({ format, ...params })` thẳng vào `buildSearchUrl()` (compile trên bản dựng thử). Key vắng hoặc `undefined` nghĩa là không gửi |
| `SearchFormat` | `"text" \| "json"` | Trùng `z.enum(["text","json"])` |
| `TextContent` | `{ type: "text"; text: string }` | Kiểu phần tử content mà callback của `server.tool()` chấp nhận |

**Body response** không có kiểu tĩnh. `renderSearch()` nhận chuỗi, và nhánh `text` parse thành `unknown`. Mọi lần đọc field đều qua `str()` (chuỗi khác `""`), `Array.isArray`, `Object.hasOwn`, hoặc kiểm `!== undefined && !== null`. Vì vậy body sai kiểu không làm hàm ném (case FR-12 của T1).

**Fixture** (`test/fixtures/<tên>.json`), xem §Fixture:

```json
{
  "url": "https://suttacentral.net/api/search/instant?query=…[&language=…][&selectedLanguages=…]",
  "recorded": "YYYY-MM-DD",
  "params": { "query": "…", "language": "…" },
  "body": { "total": …, "hits": [ … ], "suttaplex": [ … ], "fuzzy_dictionary": [ … ], "error": { … } }
}
```

`body` giữ đúng các key cấp cao mà body thô có, trong năm key code đọc, theo thứ tự của danh sách `TOP` trong F3 (`total`, `hits`, `suttaplex`, `fuzzy_dictionary`, `error`). Đo 2026-10-23, thứ tự key của cả ba body thô trùng thứ tự này. Code không phụ thuộc thứ tự key. Phần tử `suttaplex` giữ `uid`, `acronym`, `translated_title`, `original_title`, `difficulty`, `blurb`. Phần tử `hits` giữ `url`, `acronym`, `name`, `root_name`, `uid`, `author`, `author_uid`, `lang`, `category`, `is_article`. Field nào phần tử thô không có thì fixture cũng không có. Không có `highlight` hay `translations` (NFR-4).

## API / Interface Contracts

**Interface ra ngoài** (`tools/list`, đo trên bản dựng thử): `inputSchema` của `search_topic` có đúng tám property `query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`, `format`. `required` là `["query"]`. Chỉ `format` có `default` (`"text"`). `selectedLanguages` có `"type":"array"`. `limit` và `offset` có `{"type":"integer","minimum":0}`. Phần tử `tools/list` của bốn tool kia trùng byte với `d972fa6` (A/B).

**Export của `src/search.ts`:**

| Export | Chữ ký | FR |
|---|---|---|
| `buildSearchUrl` | `(p: SearchParams) => string` | FR-2, FR-2a, FR-3 |
| `renderSearch` | `(url: string, raw: string, format: SearchFormat) => TextContent[]` | FR-5..FR-12 |
| `formatCitation` | `(suttaplex: any) => string`, không đổi | FR-16 |
| `SearchParams`, `SearchFormat`, `TextContent` | kiểu | — |

Các hàm private: `sourceLine`, `str`, `rawValue`, `formatSearchText`, `arraySection`, `heading`, `formatSuttaplexItem`, `formatHit`, `fuzzySection`, `formatError`. Module-scope chỉ có khai báo `type` và `function`. Không có `let`, `var` hay `const` (FR-15).

### Bố cục output `text`

M1 là nguồn ràng buộc. Bảng dưới chỉ tóm tắt. Các khối nối nhau bằng `"\n\n"`. Trong một khối, các dòng nối bằng `"\n"`. Không có newline ở cuối output.

| Khối | Nội dung | FR |
|---|---|---|
| nguồn | `Nguồn: SuttaCentral — {url}`, với `{url}` là chính chuỗi `buildSearchUrl()` trả. Dòng này cũng là item thứ hai của `json` | FR-5, FR-6, C5 |
| body `null` | `SuttaCentral trả body \`null\` cho request này.`, rồi hết | FR-12, C10 |
| body không phải object | `SuttaCentral trả body không phải object JSON: {JSON}`, rồi hết | FR-12 |
| tiêu đề `suttaplex` | `Khớp tiêu đề (suttaplex): {length}`, hoặc `…: body không có key \`suttaplex\``, hoặc `…: \`suttaplex\` không phải mảng: {JSON}` | FR-6, FR-12 |
| mỗi `suttaplex[i]` | dòng 1 `suttaplex[i] **{acronym ∨ uid}** — {translated_title ∨ original_title}` (phần nào vắng thì bỏ); `UID: …`, `URL: https://suttacentral.net/{uid}` khi `uid` khác rỗng; `Difficulty: {thô}` khi khác `null`/vắng; `Blurb: …` khi khác rỗng. Không in `translations` | FR-7, C8 |
| tiêu đề `hits` | `Khớp nội dung (hits): {length}`, hai biến thể lỗi như trên | FR-6, FR-12 |
| mỗi `hits[i]` | dòng 1 `hits[i] **{acronym}** — {name ∨ root_name}`; `URL: https://suttacentral.net{url}` khi `url` bắt đầu bằng `/`; `UID: …`; `Tác giả: {author} ({author_uid})` (hoặc chỉ một trong hai); `Ngôn ngữ: {lang}`; `Category: …`; `Bài viết (is_article)` khi `is_article === true`; một dòng `Highlight: {chuỗi}` cho mỗi chuỗi của `highlight.content`, nguyên văn | FR-8, C5, C7 |
| `total` | `total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): {thô}`, hoặc `total: body không có key \`total\`` | FR-9 |
| `fuzzy_dictionary` | `fuzzy_dictionary: {length}`, rồi mỗi phần tử một dòng `JSON.stringify(e)` liền sau, cùng khối | FR-10 |
| `error` (khi body có key) | `Lỗi truy vấn do SuttaCentral báo (error):`, rồi `type: …`, `message: …`, một dòng `suggestion: …` cho mỗi chuỗi | FR-11 |

FR-8 ghi "`author` kèm `author_uid` và `lang`". Design in `author` và `author_uid` trên một dòng `Tác giả:`, còn `lang` trên dòng `Ngôn ngữ:` riêng, trong cùng mục. Lý do: bài viết có `lang` nhưng không có `author` (đo `anatta`: `general-guide-sujato`, `subjects`…). Nếu gộp, dòng đó sẽ thành `Tác giả: [en]`.

Một ví dụ cắt từ output thật của AC-3 (`anatta`/`en`, đo 2026-10-23):

```text
Khớp nội dung (hits): 10

hits[0]
URL: https://suttacentral.net/define/anatta
Category: dictionary

hits[1] — general-guide-sujato
URL: https://suttacentral.net/general-guide-sujato
UID: general-guide-sujato
Ngôn ngữ: en
Bài viết (is_article)
```

### M1 — `src/search.ts` — **[NORMATIVE]**

Toàn file, nguyên văn. Thay toàn bộ `src/search.ts` của `d972fa6`. Đoạn `formatCitation()` được chép từ `d972fa6`, không sửa.

<!-- block: M1 -->
```ts
// Logic thuần của tool search_topic (spec search-api-passthrough): dựng URL request của
// GET /api/search/instant và dựng output từ body response. Không lọc, không khử trùng, không
// đổi thứ tự. Module không import gì, không I/O, không giữ trạng thái. src/index.ts gọi API;
// test/ import thẳng module này.

// ─── search_topic: wrapper mỏng của /api/search/instant ─────────────────────

// Tham số API của tool, cùng tên với API. Tham số vắng thì không gửi.
export type SearchParams = {
  query: string;
  language?: string;
  limit?: number;
  offset?: number;
  selectedLanguages?: string[];
  restrict?: string;
  matchpartial?: boolean;
};
export type SearchFormat = "text" | "json";
export type TextContent = { type: "text"; text: string };

// URL request duy nhất của một lời gọi. Handler truyền nguyên chuỗi này cho fetch và cho
// renderSearch(); không nơi nào khác dựng hay sửa URL search.
export function buildSearchUrl(p: SearchParams): string {
  const q = new URLSearchParams({ query: p.query });
  if (p.language !== undefined) q.set("language", p.language);
  if (p.limit !== undefined) q.set("limit", String(p.limit));
  if (p.offset !== undefined) q.set("offset", String(p.offset));
  if (p.selectedLanguages !== undefined) q.set("selectedLanguages", JSON.stringify(p.selectedLanguages));
  if (p.restrict !== undefined) q.set("restrict", p.restrict);
  if (p.matchpartial !== undefined) q.set("matchpartial", String(p.matchpartial));
  return `https://suttacentral.net/api/search/instant?${q}`;
}

// `raw`: body response đọc bằng res.text(). json: body nguyên văn rồi dòng nguồn. text: body
// phải parse được JSON, nếu không JSON.parse ném lỗi và SDK dựng isError.
export function renderSearch(url: string, raw: string, format: SearchFormat): TextContent[] {
  if (format === "json") return [{ type: "text", text: raw }, { type: "text", text: sourceLine(url) }];
  return [{ type: "text", text: formatSearchText(url, JSON.parse(raw)) }];
}

function sourceLine(url: string): string {
  return `Nguồn: SuttaCentral — ${url}`;
}

// Chuỗi khác rỗng thì trả nguyên văn; mọi giá trị khác coi như vắng.
function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

// Giá trị thô của API: chuỗi in nguyên văn, kiểu khác in dạng JSON.
function rawValue(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

function formatSearchText(url: string, body: unknown): string {
  const blocks = [sourceLine(url)];
  if (body === null) {
    blocks.push("SuttaCentral trả body `null` cho request này.");
    return blocks.join("\n\n");
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    blocks.push(`SuttaCentral trả body không phải object JSON: ${JSON.stringify(body)}`);
    return blocks.join("\n\n");
  }
  const b = body as Record<string, unknown>;
  blocks.push(...arraySection(b, "suttaplex", "Khớp tiêu đề (suttaplex)", formatSuttaplexItem));
  blocks.push(...arraySection(b, "hits", "Khớp nội dung (hits)", formatHit));
  blocks.push(
    Object.hasOwn(b, "total")
      ? `total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): ${rawValue(b.total)}`
      : "total: body không có key `total`"
  );
  blocks.push(fuzzySection(b));
  if (Object.hasOwn(b, "error")) blocks.push(formatError(b.error));
  return blocks.join("\n\n");
}

// Tiêu đề kèm `length` của mảng, rồi mỗi phần tử một khối, đúng thứ tự API.
function arraySection(
  b: Record<string, unknown>,
  key: string,
  title: string,
  item: (label: string, e: any) => string
): string[] {
  if (!Object.hasOwn(b, key)) return [`${title}: body không có key \`${key}\``];
  const arr = b[key];
  if (!Array.isArray(arr)) return [`${title}: \`${key}\` không phải mảng: ${JSON.stringify(arr)}`];
  return [`${title}: ${arr.length}`, ...arr.map((e, i) => item(`${key}[${i}]`, e))];
}

function heading(label: string, acronym: string | undefined, title: string | undefined): string {
  return [label, acronym && `**${acronym}**`, title && `— ${title}`].filter(Boolean).join(" ");
}

function formatSuttaplexItem(label: string, sp: any): string {
  const uid = str(sp?.uid);
  const lines = [heading(label, str(sp?.acronym) ?? uid, str(sp?.translated_title) ?? str(sp?.original_title))];
  if (uid) lines.push(`UID: ${uid}`, `URL: https://suttacentral.net/${uid}`);
  if (sp?.difficulty !== undefined && sp?.difficulty !== null) lines.push(`Difficulty: ${rawValue(sp.difficulty)}`);
  const blurb = str(sp?.blurb);
  if (blurb) lines.push(`Blurb: ${blurb}`);
  return lines.join("\n");
}

function formatHit(label: string, hit: any): string {
  const lines = [heading(label, str(hit?.acronym), str(hit?.name) ?? str(hit?.root_name))];
  const url = str(hit?.url);
  if (url?.startsWith("/")) lines.push(`URL: https://suttacentral.net${url}`);
  const uid = str(hit?.uid);
  if (uid) lines.push(`UID: ${uid}`);
  const author = str(hit?.author);
  const authorUid = str(hit?.author_uid);
  if (author) lines.push(authorUid ? `Tác giả: ${author} (${authorUid})` : `Tác giả: ${author}`);
  else if (authorUid) lines.push(`Tác giả: ${authorUid}`);
  const lang = str(hit?.lang);
  if (lang) lines.push(`Ngôn ngữ: ${lang}`);
  const category = str(hit?.category);
  if (category) lines.push(`Category: ${category}`);
  if (hit?.is_article === true) lines.push("Bài viết (is_article)");
  const highlight = hit?.highlight?.content;
  if (Array.isArray(highlight)) {
    for (const h of highlight) if (typeof h === "string") lines.push(`Highlight: ${h}`);
  }
  return lines.join("\n");
}

// Dạng phần tử chưa quan sát được: mỗi phần tử là JSON một dòng, liền sau tiêu đề.
function fuzzySection(b: Record<string, unknown>): string {
  const title = "fuzzy_dictionary";
  if (!Object.hasOwn(b, "fuzzy_dictionary")) return `${title}: body không có key \`fuzzy_dictionary\``;
  const arr = b.fuzzy_dictionary;
  if (!Array.isArray(arr)) return `${title}: \`fuzzy_dictionary\` không phải mảng: ${JSON.stringify(arr)}`;
  return [`${title}: ${arr.length}`, ...arr.map((e) => JSON.stringify(e))].join("\n");
}

function formatError(error: any): string {
  const lines = ["Lỗi truy vấn do SuttaCentral báo (error):"];
  if (typeof error !== "object" || error === null) {
    lines.push(rawValue(error));
    return lines.join("\n");
  }
  const type = str(error.type);
  if (type) lines.push(`type: ${type}`);
  const message = str(error.message);
  if (message) lines.push(`message: ${message}`);
  if (Array.isArray(error.suggestions)) {
    for (const s of error.suggestions) if (typeof s === "string") lines.push(`suggestion: ${s}`);
  }
  return lines.join("\n");
}

// ─── Citation dùng chung: get_sutta, get_sutta_meta (import từ đây) ──────────

export function formatCitation(suttaplex: any): string {
  const uid = suttaplex?.uid ?? "?";
  const acronym = suttaplex?.acronym ?? uid.toUpperCase();
  const title = suttaplex?.translated_title ?? suttaplex?.original_title ?? "";
  const parallels = suttaplex?.parallel_count ?? 0;
  const difficulty = suttaplex?.difficulty?.name ?? "unknown";
  const url = `https://suttacentral.net/${uid}`;

  return [
    `**${acronym}** — ${title}`,
    `Difficulty: ${difficulty} | Parallels: ${parallels}`,
    `URL: ${url}`,
  ].join("\n");
}
```

Tính chất (đo trên bản dựng thử):

- Không có `import`. `grep -c -E '^(let|var|const) ' src/search.ts` = 0. Bốn grep NFR-5 cho 0.
- `URLSearchParams` là global của Node, nên không cần import. Tham số được set theo thứ tự cố định `query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`, nên URL là hàm tất định của input. Giá trị `0` của `limit`/`offset` vẫn được gửi, vì kiểm là `!== undefined`.
- `URLSearchParams` mã hóa dấu cách thành `+` và `+` thành `%2B`. SC thay `+` (đã giải mã) bằng dấu cách. FR-3 cấm bù hành vi này, nên tool không xử lý gì thêm (case FR-3: `a+b` → `query=a%2Bb`). Ký tự `&`, `=` trong `query` được mã hóa, nên không chèn được tham số khác vào URL.
- `renderSearch(…, "text")` gọi `JSON.parse`. Body 2xx không parse được sẽ ném `SyntaxError`, và SDK dựng `isError: true` (FR-12). Nhánh `json` không parse gì, nên trả nguyên cả body không phải JSON.

### I1, H1 — `src/index.ts` — **[NORMATIVE]**

Dòng import, thay dòng `:5` của `d972fa6`:

<!-- block: I1 -->
```ts
import { buildSearchUrl, formatCitation, renderSearch } from "./search.js";
```

Khối Tool 1, thay `:107-147` của `d972fa6` (từ `// Tool 1: search_topic` tới dòng `);` đóng `server.tool(`). Hàm `fetchSearch()` (`:33-39`) và dòng trống sau nó (`:40`) bị xóa:

<!-- block: H1 -->
```ts
// Tool 1: search_topic
server.tool(
  "search_topic",
  "Wrapper mỏng của search SuttaCentral (GET https://suttacentral.net/api/search/instant): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên kết quả theo thứ tự SuttaCentral, không lọc, không khử trùng, không sắp lại. Body có hai mảng. `suttaplex` là khớp tiêu đề: với truy vấn thường, API trả nguyên mảng ở mọi trang; với truy vấn bắt đầu bằng `title:`, `suttaplex` theo `limit`/`offset` như `hits`; với truy vấn là một uid (ví dụ `mn10`), `suttaplex` chỉ có sutta đó. Vì vậy khớp tiêu đề lặp lại ở mọi `offset`, trừ khi truy vấn bắt đầu bằng `title:`. `hits` là khớp nội dung, gồm cả mục dictionary, bài viết và mỗi bản dịch một mục, phân trang bằng `limit`/`offset`. API bỏ khỏi `hits` các sutta đã có trong `suttaplex`, nên một trang có thể có ít hơn `limit` hit trong khi vẫn còn kết quả. `total` là số đếm xấp xỉ của SuttaCentral: nó phụ thuộc `limit`, bị trừ đi các hit bị bỏ ở trang hiện tại, và khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề. Vì vậy `total` không phải tín hiệu tin được để biết còn trang sau. Muốn biết còn kết quả hay không: gọi lại với `offset` lớn hơn và xem có mục mới không. Tìm bằng tiếng Việt: truyền `language` = `vi` để khớp tiêu đề tiếng Việt, và `selectedLanguages` có `vi` để có bản dịch tiếng Việt trong `hits`.",
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
```

Tính chất:

- Đúng một biến `url` nhận kết quả `buildSearchUrl(params)`. Đối số của `fetch` là `url`, viết trần, và `renderSearch` nhận cùng `url` (FR-2a, AC-14).
- `format` được tách khỏi `params` bằng destructuring, nên không bao giờ tới `buildSearchUrl()`. Kiểu của `params` khớp `SearchParams`. Key lạ đi kèm `query`, ví dụ `{"query":"m","topic":"x"}`, bị zod bỏ im lặng trước handler (FR-1, số đo của requirements review 1). Thiếu `query` thì bị từ chối (AC-9.7).
- `!res.ok` ném đúng chuỗi của ba helper khác. Không có `try`/`catch`, retry hay fallback (FR-13, AC-10). Lỗi mạng của `fetch` giữ nguyên lỗi gốc.
- Chuỗi `describe()` phủ mọi ý của FR-14 (kiểm ở AC-11). Chúng không có phép so nào giữa `offset`, `limit` và `total`, không có luật dừng, và không có câu nào nói `suttaplex` không bao giờ phân trang. Câu "ít hơn `limit` hit" là câu FR-14 bắt buộc.
- Đo trên bản dựng thử: `grep -c 'fetch(' src/index.ts` = 4 (ba helper và handler). `grep -c -E 'URLSearchParams|searchParams|new URL\(|SC_BASE\}/search' src/index.ts` = 0.

### Lắp ráp — **[NORMATIVE]**

`src/index.ts` sau thay đổi phải **trùng từng byte** với file lắp từ `d972fa6` và I1, H1. `src/search.ts` và `test/search.test.ts` phải trùng M1 và T1. Hàm `blk` trích nội dung code fence ngay sau dòng neo `<!-- block: TÊN -->` của tài liệu này:

```sh
REPO=$(git rev-parse --show-toplevel); D="$REPO/specs/search-api-passthrough/design.md"
blk() { awk -v id="<!-- block: $1 -->" '$0==id{f=1;next} f&&/^```/{if(o)exit;o=1;next} f&&o{print}' "$D"; }
OLD=$(mktemp); git -C "$REPO" show d972fa6:src/index.ts > "$OLD"
{ sed -n '1,4p' "$OLD"; blk I1; sed -n '6,32p' "$OLD"; sed -n '41,106p' "$OLD"; blk H1; sed -n '148,$p' "$OLD"; } \
  | diff - "$REPO/src/index.ts" && echo ASSEMBLY-OK
diff <(blk M1) "$REPO/src/search.ts" && echo SEARCH-OK
diff <(blk T1) "$REPO/test/search.test.ts" && echo TEST-OK
diff <(git -C "$REPO" show d972fa6:src/search.ts | awk '/^export function formatCitation/,/^}$/') \
     <(awk '/^export function formatCitation/,/^}$/' "$REPO/src/search.ts") && echo CITATION-OK
rm -f "$OLD"     # d972fa6: 436 dòng; src/index.ts mới: 446 dòng; src/search.ts: 167 dòng; test: 231 dòng
```

Đã chạy lệnh này trên bản dựng thử, với tài liệu này làm `D`: in đủ `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `CITATION-OK`.

### T1 — `test/search.test.ts` — **[NORMATIVE]**

11 case. Tên mỗi case bắt đầu bằng id FR của spec này, theo sau là `:` (FR-17, AC-13). Expected value là literal, dựng từ quyết định của requirements (C1–C11), bố cục ở §Bố cục output, và giá trị của ba fixture ở bảng §Fixture.

Bảng phủ FR-17:

| Case | Phủ dòng FR-17 | Nội dung chính |
|---|---|---|
| `FR-2:` | FR-2, FR-2a | `{query}` → chỉ `query=`; đủ bảy tham số → URL literal; `selectedLanguages` → `["vi","pli"]`; `matchpartial` → `true`/`false`; `limit: 0` vẫn gửi; `[]` gửi `[]`; `format` không vào query string |
| `FR-2a:` | FR-2a | `buildSearchUrl(fixture.params) === fixture.url` cho cả ba fixture; dòng 1 của output là `Nguồn: SuttaCentral — {fixture.url}` |
| `FR-3:` | FR-3 | khoảng trắng đầu/cuối và chữ hoa giữ nguyên; NFD (dựng bằng `.normalize("NFD")`, có kiểm `nfd !== nfc`) → `vo%CC%82+nga%CC%83`; `""` gửi `query=`; `+` → `%2B` |
| `FR-5:` | FR-5 | item 1 trùng chuỗi body đưa vào (có khoảng trắng lạ); item 2 là dòng nguồn; `null` → `null`; body không phải JSON vẫn trả nguyên |
| `FR-6:` | FR-6 | `anatta-en`: thứ tự bốn tiêu đề phần; 6 mục `suttaplex` và 10 mục `hits` theo đúng thứ tự `uid`/`url` của fixture; phần tử trùng `uid` vẫn in đủ, không khử trùng |
| `FR-7:` | FR-7 | literal: tiêu đề rơi về `original_title`, link, `Difficulty: 2`, `Blurb:`; `difficulty: null` và `blurb: ""` bỏ dòng; `{}` chỉ có nhãn; fixture `vo-nga-vi-pli`: mục `suttaplex[12]` (SN 22.59) |
| `FR-8:` | FR-8 | `anatta-en`: mục dictionary, bài viết, bản Pali; không có `null`/`undefined`; `vo-nga-vi-pli`: mục `hits[0]` tiếng Việt; literal `list authors` (AC-7); literal `highlight` nguyên văn, có thẻ HTML; `url` không bắt đầu bằng `/` không có dòng link |
| `FR-9:` | FR-9 | `total` 185 của fixture; giá trị chuỗi in thô; thiếu key thì nói rõ |
| `FR-10:` | FR-10 | literal AC-16: hai phần tử đúng thứ tự; mảng rỗng chỉ có tiêu đề |
| `FR-11:` | FR-11 | `foo-bar-en`: khối `error` đủ `type`, `message`, ba `suggestion`; content không có key `isError` |
| `FR-12:` | FR-12 | `null`; `{}` (mọi phần báo thiếu key); mảng không phải mảng; body là mảng/chuỗi JSON; `<html>` ném `SyntaxError` |

<!-- block: T1 -->
```ts
// Unit test offline cho logic thuần của search_topic (spec search-api-passthrough). Mỗi case mang
// tiền tố id FR của specs/search-api-passthrough/requirements.md. Fixture: response
// /api/search/instant ghi live rồi cắt (test/fixtures/, xem design §Fixture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSearchUrl, renderSearch, type SearchParams } from "../src/search.js";

type Fixture = { url: string; recorded: string; params: SearchParams; body: any };

function load(name: string): Fixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

const BASE = "https://suttacentral.net/api/search/instant?";
const U = `${BASE}query=x`;

// Output text cho một body (đi qua JSON.stringify như body đọc bằng res.text()).
function text(body: unknown, url = U): string {
  const content = renderSearch(url, JSON.stringify(body), "text");
  assert.equal(content.length, 1);
  return content[0].text;
}
function fixtureText(name: string): string {
  const f = load(name);
  return text(f.body, f.url);
}
const blocks = (t: string) => t.split("\n\n");
const items = (t: string, key: string) => blocks(t).filter((b) => b.startsWith(`${key}[`));

test("FR-2: chỉ tham số caller truyền mới vào query string, đúng cách mã hóa", () => {
  assert.equal(buildSearchUrl({ query: "mindfulness" }), `${BASE}query=mindfulness`);
  assert.equal(
    buildSearchUrl({
      query: "mindfulness",
      language: "vi",
      limit: 0,
      offset: 20,
      selectedLanguages: ["vi", "pli"],
      restrict: "all",
      matchpartial: false,
    }),
    `${BASE}query=mindfulness&language=vi&limit=0&offset=20&selectedLanguages=%5B%22vi%22%2C%22pli%22%5D&restrict=all&matchpartial=false`
  );
  const sp = new URL(buildSearchUrl({ query: "m", selectedLanguages: ["vi", "pli"], matchpartial: true })).searchParams;
  assert.equal(sp.get("selectedLanguages"), '["vi","pli"]');
  assert.equal(sp.get("matchpartial"), "true");
  assert.deepEqual([...sp.keys()], ["query", "selectedLanguages", "matchpartial"]);
  assert.equal(buildSearchUrl({ query: "m", selectedLanguages: [] }), `${BASE}query=m&selectedLanguages=%5B%5D`);
  assert.equal(buildSearchUrl({ query: "m", offset: 5 }), `${BASE}query=m&offset=5`);
  const withFormat = { query: "m", format: "json" } as SearchParams;
  assert.equal(buildSearchUrl(withFormat), `${BASE}query=m`);
});

test("FR-2a: URL của fixture là đúng URL hàm dựng phát cho params đã ghi, và là URL trong dòng nguồn", () => {
  for (const name of ["anatta-en", "foo-bar-en", "vo-nga-vi-pli"]) {
    const f = load(name);
    assert.equal(buildSearchUrl(f.params), f.url, name);
    assert.equal(fixtureText(name).split("\n")[0], `Nguồn: SuttaCentral — ${f.url}`, name);
  }
  assert.equal(
    load("vo-nga-vi-pli").url,
    `${BASE}query=v%C3%B4+ng%C3%A3&language=vi&selectedLanguages=%5B%22vi%22%2C%22pli%22%5D`
  );
});

test("FR-3: query gửi nguyên văn: khoảng trắng, chữ hoa, dạng NFD, dấu +", () => {
  const url = buildSearchUrl({ query: "  Vô Ngã " });
  assert.equal(url, `${BASE}query=++V%C3%B4+Ng%C3%A3+`);
  assert.equal(new URL(url).searchParams.get("query"), "  Vô Ngã ");
  const nfc = "vô ngã".normalize("NFC");
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfd, nfc);
  const nfdUrl = buildSearchUrl({ query: nfd });
  assert.equal(nfdUrl, `${BASE}query=vo%CC%82+nga%CC%83`);
  assert.equal(new URL(nfdUrl).searchParams.get("query"), nfd);
  assert.equal(buildSearchUrl({ query: "" }), `${BASE}query=`);
  assert.equal(buildSearchUrl({ query: "a+b" }), `${BASE}query=a%2Bb`);
});

test("FR-5: format json trả body nguyên văn rồi dòng nguồn", () => {
  const raw = '{"total": 0,  "hits": [], "suttaplex": [], "fuzzy_dictionary": []}';
  assert.deepEqual(renderSearch(U, raw, "json"), [
    { type: "text", text: raw },
    { type: "text", text: `Nguồn: SuttaCentral — ${U}` },
  ]);
  assert.equal(renderSearch(U, "null", "json")[0].text, "null");
  assert.equal(renderSearch(U, "<html>", "json")[0].text, "<html>");
});

test("FR-6: mỗi phần có tiêu đề kèm length, mỗi phần tử một mục, đúng thứ tự API", () => {
  const t = fixtureText("anatta-en");
  const b = blocks(t);
  const order = [
    "Khớp tiêu đề (suttaplex): 6",
    "Khớp nội dung (hits): 10",
    "total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): 145",
    "fuzzy_dictionary: 0",
  ].map((h) => b.indexOf(h));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), String(order));
  assert.deepEqual(
    items(t, "suttaplex").map((e) => e.split("\n")[1]),
    ["an6.100", "sn22.14", "sn22.143", "sn22.68", "sn23.17", "sn46.73"].map((u) => `UID: ${u}`)
  );
  assert.deepEqual(
    items(t, "hits").map((e) => e.split("\n")[1]),
    [
      "/define/anatta",
      "/general-guide-sujato",
      "/sn-guide-sujato",
      "/subjects",
      "/terminology",
      "/thi-ap4/en/walters",
      "/an3.136/pli/ms",
      "/an7.18/pli/ms",
      "/an7.20/pli/ms",
      "/an10.60/pli/ms",
    ].map((p) => `URL: https://suttacentral.net${p}`)
  );
  assert.deepEqual(
    items(t, "hits").map((e) => e.split("\n")[0].split(" ")[0]),
    ["hits[0]", "hits[1]", "hits[2]", "hits[3]", "hits[4]", "hits[5]", "hits[6]", "hits[7]", "hits[8]", "hits[9]"]
  );
  const dup = text({ suttaplex: [{ uid: "a" }, { uid: "a" }], hits: [{ uid: "a" }, { uid: "b" }, { uid: "a" }] });
  assert.equal(items(dup, "suttaplex").length, 2);
  assert.deepEqual(items(dup, "hits").map((e) => e.split("\n")[1]), ["UID: a", "UID: b", "UID: a"]);
});

test("FR-7: mục suttaplex: link, tiêu đề rơi về original_title, field vắng thì bỏ dòng", () => {
  const sp = {
    uid: "mn10",
    acronym: "MN 10",
    translated_title: "",
    original_title: "Satipaṭṭhānasutta",
    difficulty: 2,
    blurb: "Blurb.",
    translations: [{ lang: "en" }],
  };
  assert.deepEqual(items(text({ suttaplex: [sp] }), "suttaplex"), [
    "suttaplex[0] **MN 10** — Satipaṭṭhānasutta\nUID: mn10\nURL: https://suttacentral.net/mn10\nDifficulty: 2\nBlurb: Blurb.",
  ]);
  assert.deepEqual(
    items(text({ suttaplex: [{ uid: "sn1.1", difficulty: null, blurb: "" }, {}] }), "suttaplex"),
    ["suttaplex[0] **sn1.1**\nUID: sn1.1\nURL: https://suttacentral.net/sn1.1", "suttaplex[1]"]
  );
  const vi = items(fixtureText("vo-nga-vi-pli"), "suttaplex");
  assert.equal(vi.length, 21);
  assert.equal(
    vi[12],
    "suttaplex[12] **SN 22.59** — Năm Vị (Vô ngã tưởng)\nUID: sn22.59\nURL: https://suttacentral.net/sn22.59\nBlurb: In the Deer Park at Varanasi the Buddha teaches the famous second discourse, on not-self with regard to the aggregates, to the group of five monks. At the conclusion, they become perfected ones."
  );
});

test("FR-8: mục hits: dictionary, bài viết, bản dịch tiếng Việt, mục không có url, highlight nguyên văn", () => {
  const t = fixtureText("anatta-en");
  const h = items(t, "hits");
  assert.equal(h[0], "hits[0]\nURL: https://suttacentral.net/define/anatta\nCategory: dictionary");
  assert.equal(
    h[3],
    "hits[3] — subjects\nURL: https://suttacentral.net/subjects\nUID: subjects\nNgôn ngữ: en\nBài viết (is_article)"
  );
  assert.equal(
    h[6],
    "hits[6] **AN 3.136** — Uppādāsutta\nURL: https://suttacentral.net/an3.136/pli/ms\nUID: an3.136\nTác giả: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (ms)\nNgôn ngữ: pli"
  );
  assert.ok(!/null|undefined/.test(t));
  assert.equal(
    items(fixtureText("vo-nga-vi-pli"), "hits")[0],
    "hits[0] **AN 1.378–393** — Thật Sự Là Vậy\nURL: https://suttacentral.net/an1.378-393/vi/minh_chau\nUID: an1.378-393\nTác giả: Thích Minh Châu (minh_chau)\nNgôn ngữ: vi"
  );
  const author = items(text({ hits: [{ uid: "", author: "Bhikkhu Anālayo", author_uid: "analayo" }] }), "hits");
  assert.deepEqual(author, ["hits[0]\nTác giả: Bhikkhu Anālayo (analayo)"]);
  const lit = text({
    hits: [
      { uid: "x", name: "", root_name: "Root", url: "x/no-slash", highlight: { content: ['<a href="/x#1.1">a</a>', "<b>b</b>"] } },
      { url: null, acronym: null, name: null, author: null, author_uid: null, lang: null, category: null, is_article: false },
    ],
  });
  assert.deepEqual(items(lit, "hits"), [
    'hits[0] — Root\nUID: x\nHighlight: <a href="/x#1.1">a</a>\nHighlight: <b>b</b>',
    "hits[1]",
  ]);
});

test("FR-9: total in nguyên văn với nhãn của SuttaCentral; thiếu total thì nói rõ", () => {
  assert.ok(blocks(fixtureText("vo-nga-vi-pli")).includes("total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): 185"));
  assert.ok(blocks(text({ total: "9" })).includes("total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): 9"));
  assert.ok(blocks(text({})).includes("total: body không có key `total`"));
});

test("FR-10: fuzzy_dictionary: mỗi phần tử JSON một dòng, đúng thứ tự; mảng rỗng chỉ có tiêu đề", () => {
  const two = text({ total: 0, hits: [], suttaplex: [], fuzzy_dictionary: [{ entry: "nibbāna" }, { entry: "nibbuta" }] });
  assert.ok(blocks(two).includes('fuzzy_dictionary: 2\n{"entry":"nibbāna"}\n{"entry":"nibbuta"}'), two);
  const zero = text({ total: 0, hits: [], suttaplex: [], fuzzy_dictionary: [] });
  assert.equal(blocks(zero).at(-1), "fuzzy_dictionary: 0");
});

test("FR-11: error của SuttaCentral in type, message và mọi suggestion", () => {
  const content = renderSearch(load("foo-bar-en").url, JSON.stringify(load("foo-bar-en").body), "text");
  assert.deepEqual(Object.keys(content[0]), ["type", "text"]);
  assert.equal(
    blocks(content[0].text).at(-1),
    [
      "Lỗi truy vấn do SuttaCentral báo (error):",
      "type: unknown_filter",
      'message: Unknown filter: "foo:"',
      "suggestion: Supported filters are：volpage:, author:, by:, title:, lang:, ref:, in:",
      "suggestion: Please check the filter name",
      "suggestion: Please check if the spelling is correct",
    ].join("\n")
  );
  assert.ok(!blocks(fixtureText("anatta-en")).some((b) => b.startsWith("Lỗi truy vấn")));
});

test("FR-12: body null, thiếu key, không phải object, không parse được", () => {
  assert.equal(renderSearch(U, "null", "text")[0].text, `Nguồn: SuttaCentral — ${U}\n\nSuttaCentral trả body \`null\` cho request này.`);
  assert.deepEqual(blocks(text({})), [
    `Nguồn: SuttaCentral — ${U}`,
    "Khớp tiêu đề (suttaplex): body không có key `suttaplex`",
    "Khớp nội dung (hits): body không có key `hits`",
    "total: body không có key `total`",
    "fuzzy_dictionary: body không có key `fuzzy_dictionary`",
  ]);
  assert.deepEqual(blocks(text({ suttaplex: {}, hits: "x", total: 3, fuzzy_dictionary: null })).slice(1, 3), [
    "Khớp tiêu đề (suttaplex): `suttaplex` không phải mảng: {}",
    'Khớp nội dung (hits): `hits` không phải mảng: "x"',
  ]);
  assert.equal(blocks(text([1, 2]))[1], "SuttaCentral trả body không phải object JSON: [1,2]");
  assert.equal(blocks(text("abc"))[1], 'SuttaCentral trả body không phải object JSON: "abc"');
  assert.throws(() => renderSearch(U, "<html>", "text"), SyntaxError);
});
```

## Fixture

### Định dạng và quy tắc

- Một file JSON cho mỗi response, trong `test/fixtures/`. Tên là `<slug>.json`. Bốn key theo thứ tự `url`, `recorded`, `params`, `body` (§Data Model). JSON thụt lề 2 dấu cách, có newline cuối file. Đây là đầu ra của F3, không viết tay.
- `url` là URL mà `buildSearchUrl(params)` trả, cũng là URL `curl -G` đã gọi (F2). `recorded` là ngày ghi (`date +%F`).
- **Xóa cả chín fixture cũ:** `anatta-en-0.json`, `foo-bar-en-0.json`, `metta-en-0.json`, `mindfulness-en-0.json`, `mindfulness-en-1450.json`, `mindfulness-en-1460.json`, `nibbana-en-0.json`, `vo-nga-tuong-vi-0.json`, `xyzzyqq-en-0.json`. URL của chúng có `limit=10` mà tool mới không gửi. Hit của chúng cũng thiếu `url` và `author_uid` mà code mới đọc. Không file nào còn được test dùng (NFR-4).
- Body `null`, mục `list authors`, `highlight` và `fuzzy_dictionary` khác rỗng được test bằng literal, không có fixture. `null` là literal 4 byte. Ba trường hợp còn lại cần field mà NFR-4 cấm (`highlight`), hoặc dạng chưa từng quan sát được (`fuzzy_dictionary`), hoặc response dài 18 s với 72 mục (`list authors`). Nhờ vậy có 3 file thay vì 10.
- Chỉ ghi lại một fixture khi một thay đổi code cần dạng response mới. Không ghi lại theo lịch. Script ghi chỉ nằm ở thư mục tạm.

### Số đo của 3 fixture (2026-10-23)

Cả ba đều HTTP 200 ở lần ghi đầu. Query string là phần sau `https://suttacentral.net/api/search/instant?`.

| File | Query string | `total` | `suttaplex` | `hits` | Case T1 dùng | Byte |
|---|---|---|---|---|---|---|
| `anatta-en.json` | `query=anatta&language=en` | 145 | 6 (`an6.100`, `sn22.14`, `sn22.143`, `sn22.68`, `sn23.17`, `sn46.73`) | 10: dictionary `/define/anatta` (không có `uid`); 4 bài viết `general-guide-sujato`, `sn-guide-sujato`, `subjects`, `terminology` (`acronym`/`author` `null`, `lang` `en`); `thi-ap4` (walters), `an3.136`, `an7.18`, `an7.20`, `an10.60` (`ms`, `pli`) | FR-2a, FR-6, FR-8 | 4591 |
| `foo-bar-en.json` | `query=foo%3Abar&language=en` | 0 | 0 | 0; `error` = `unknown_filter`, `Unknown filter: "foo:"`, 3 suggestion (đầu: `Supported filters are：volpage:, …` với dấu `：` toàn độ rộng của upstream) | FR-2a, FR-11 | 580 |
| `vo-nga-vi-pli.json` | `query=v%C3%B4+ng%C3%A3&language=vi&selectedLanguages=%5B%22vi%22%2C%22pli%22%5D` | 185 | 21 (`suttaplex[12]` = `sn22.59`, `Năm Vị (Vô ngã tưởng)`, `difficulty` `null`) | 10, đều `vi`/`minh_chau`; `hits[0]` = `/an1.378-393/vi/minh_chau`, `AN 1.378–393`, `Thật Sự Là Vậy` | FR-2a, FR-7, FR-8, FR-9 | 10052 |

Tổng 3 file, **15,223 byte** theo `cat test/fixtures/* | wc -c` (trần 65536). `grep -l -E '"(highlight|translations)"' test/fixtures/*` rỗng. Mọi `fuzzy_dictionary` là `[]`. Body thô của ba response là 38,333, 309 và 128,843 byte, chỉ nằm trong thư mục tạm.

**Khi fixture ghi lúc implement khác bảng này** (chỉ mục SC trôi): đó không phải lần chạy không hợp lệ, nên không ghi lại để tìm lần trùng. Implementer dừng và báo, kèm số đo mới có ngày. Bảng này và các literal phụ thuộc trong T1 được sửa cùng nhau qua một lần sửa design.

### Quy trình ghi, cắt và kiểm (một lần, lúc implement)

Chạy trong thư mục tạm ngoài repo và xóa sau khi xong (NFR-4, NFR-6). Body thô nằm ở một thư mục riêng, script ở thư mục khác. Thứ tự:

1. `npm install` đã chạy. M1 đã có trong `src/search.ts`, vì F2 và F4 import nó.
2. `W=$(mktemp -d /tmp/sap-fx.XXXXXX); mkdir "$W/raw" "$W/bin"`. Trích các khối ra file: `blk F1 > "$W/bin/fixtures.list"`, `blk F2 > "$W/bin/record.sh"` (rồi `chmod +x`), `blk F3 > "$W/bin/trim.mjs"`, `blk F4 > "$W/bin/equiv.mts"`.
3. Ghi, chạy từ gốc repo: `"$W/bin/record.sh" "$PWD/src/search.ts" "$W/bin/fixtures.list" "$W/raw"`. Mỗi dòng phải là `OK <tên> 200`. Dòng `INVALID` chỉ có khi lỗi truyền tải (`curl` thoát khác 0, gồm timeout, hoặc HTTP 000), và đó là lần chạy không hợp lệ: ghi lại riêng dòng đó bằng một file danh sách chỉ chứa dòng ấy, tối đa 3 lần; quá 3 lần thì báo "inconclusive (network)" và orchestrator quyết định. Dòng `UNEXPECTED` (HTTP khác 200 hoặc body không parse được JSON) là lần chạy hợp lệ có kết quả lệch: dừng và báo, không ghi lại.
4. Xóa chín fixture cũ, rồi cắt: `rm test/fixtures/*-0.json test/fixtures/mindfulness-en-14[56]0.json && node "$W/bin/trim.mjs" "$W/raw" test/fixtures "$(date +%F)" "$W/bin/fixtures.list"`.
5. Kiểm (NFR-4): `node --import tsx "$W/bin/equiv.mts" "$PWD/src/search.ts" "$W/raw" "$PWD/test/fixtures" "$W/bin/fixtures.list"`. Lệnh phải in `EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch` và thoát 0. Ghi dòng này cùng ngày vào `tasks.md`.
6. Đối chiếu số đo với bảng trên (lệnh ở bảng verify, AC-13).
7. `rm -rf "$W"`.

Trên bản dựng thử: bước 3 cho 3 dòng `OK … 200`, bước 5 in `EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch`.

**F4 kiểm hai việc.**

1. Cấu trúc: fixture có đúng bốn key; `url` = URL đã ghi = `buildSearchUrl(params)`; `body` bằng đúng phép cắt của body thô (cùng tập key cấp cao, theo thứ tự `TOP`; mọi phần tử theo thứ tự; đúng các field có mặt).
2. Output: lấy output `text` của body thô, bỏ đúng chuỗi `"\nHighlight: " + s` của từng chuỗi `s` trong `highlight.content` của từng hit, theo thứ tự. Kết quả phải trùng từng byte output `text` của body đã cắt. Đây là phép kiểm "trừ các dòng của field đã cắt" của NFR-4.

Bước 2 bỏ theo chuỗi con, không lọc theo dòng, vì một chuỗi `highlight` có thể chứa newline (đo `chánh niệm`/`vi`/`["vi","pli"]`: 3 trong 10 hit). `translations` không cần bước này, vì M1 không in nó. Nếu M1 đọc một field mà fixture đã cắt mất, thì cả (1) lẫn (2) đều lệch. Đo trên bản dựng thử: xóa `author_uid` khỏi `anatta-en.json` cho `STRUCT-MISMATCH anatta-en` và `MISMATCH anatta-en`.

<!-- block: F1 -->
```text
anatta-en|{"query":"anatta","language":"en"}
foo-bar-en|{"query":"foo:bar","language":"en"}
vo-nga-vi-pli|{"query":"vô ngã","language":"vi","selectedLanguages":["vi","pli"]}
```

<!-- block: F2 -->
```sh
#!/bin/sh
# record.sh <src/search.ts tuyệt đối> <file danh sách tên|params> <thư mục body thô>
# URL dựng bằng chính buildSearchUrl(); ghi <tên>.json (body thô) và <tên>.url. In OK / INVALID / UNEXPECTED.
while IFS="|" read -r name params; do
  url=$(node --import tsx -e 'const [s,p]=process.argv.slice(1);import(require("node:url").pathToFileURL(s).href).then(m=>process.stdout.write(m.buildSearchUrl(JSON.parse(p))))' "$1" "$params")
  code=$(curl -sS -G --max-time 60 -o "$3/$name.json" -w '%{http_code}' "$url"); rc=$?
  if [ $rc -ne 0 ] || [ "$code" = 000 ]; then
    echo "INVALID $name $code (curl $rc)"        # lỗi truyền tải: chạy lại được
  elif [ "$code" = 200 ] && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$3/$name.json" 2>/dev/null; then
    printf '%s' "$url" > "$3/$name.url"; echo "OK $name $code"
  else
    echo "UNEXPECTED $name $code"                # hợp lệ nhưng lệch: dừng và báo
  fi
done < "$2"
```

<!-- block: F3 -->
```js
// node trim.mjs <thư mục body thô> <thư mục fixture đích> <ngày ghi YYYY-MM-DD> <file danh sách>
// Giữ đúng các key code đọc; bỏ highlight, translations và mọi field khác. Key vắng vẫn vắng.
import { readFileSync, writeFileSync } from "node:fs";
const [rawDir, outDir, recorded, list] = process.argv.slice(2);
const TOP = ["total", "hits", "suttaplex", "fuzzy_dictionary", "error"];
const SP = ["uid", "acronym", "translated_title", "original_title", "difficulty", "blurb"];
const HIT = ["url", "acronym", "name", "root_name", "uid", "author", "author_uid", "lang", "category", "is_article"];
const pick = (fields, e) => {
  if (typeof e !== "object" || e === null || Array.isArray(e)) throw new Error("phần tử không phải object");
  return Object.fromEntries(fields.filter((k) => Object.hasOwn(e, k)).map((k) => [k, e[k]]));
};
for (const row of readFileSync(list, "utf8").trim().split("\n")) {
  const i = row.indexOf("|");
  const name = row.slice(0, i);
  const params = JSON.parse(row.slice(i + 1));
  const raw = JSON.parse(readFileSync(`${rawDir}/${name}.json`, "utf8"));
  const url = readFileSync(`${rawDir}/${name}.url`, "utf8");
  const body = pick(TOP, raw);
  if (Array.isArray(body.suttaplex)) body.suttaplex = body.suttaplex.map((e) => pick(SP, e));
  if (Array.isArray(body.hits)) body.hits = body.hits.map((e) => pick(HIT, e));
  writeFileSync(`${outDir}/${name}.json`, JSON.stringify({ url, recorded, params, body }, null, 2) + "\n");
}
```

<!-- block: F4 -->
```ts
// node --import tsx equiv.mts <src/search.ts tuyệt đối> <thư mục thô> <thư mục fixture> <file danh sách>
// (1) cấu trúc: fixture có đúng 4 key; url = buildSearchUrl(params) = URL đã ghi; body = phép cắt của body thô.
// (2) output: text của body thô, bỏ đúng các dòng Highlight của từng hit, trùng từng byte text của body đã cắt.
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
const [searchTs, rawDir, fixDir, list] = process.argv.slice(2);
const { buildSearchUrl, renderSearch } = await import(pathToFileURL(searchTs).href);
const TOP = ["total", "hits", "suttaplex", "fuzzy_dictionary", "error"];
const SP = ["uid", "acronym", "translated_title", "original_title", "difficulty", "blurb"];
const HIT = ["url", "acronym", "name", "root_name", "uid", "author", "author_uid", "lang", "category", "is_article"];
const keep = (fields: string[], e: any) => Object.fromEntries(fields.filter((k) => Object.hasOwn(e, k)).map((k) => [k, e[k]]));
let bad = 0, removed = 0;
for (const row of readFileSync(list, "utf8").trim().split("\n")) {
  const name = row.slice(0, row.indexOf("|"));
  const rawText = readFileSync(`${rawDir}/${name}.json`, "utf8");
  const raw = JSON.parse(rawText);
  const fx = JSON.parse(readFileSync(`${fixDir}/${name}.json`, "utf8"));
  const expected: any = keep(TOP, raw);
  expected.suttaplex = raw.suttaplex.map((e: any) => keep(SP, e));
  expected.hits = raw.hits.map((e: any) => keep(HIT, e));
  const url = readFileSync(`${rawDir}/${name}.url`, "utf8");
  if (!isDeepStrictEqual(Object.keys(fx), ["url", "recorded", "params", "body"]) || fx.url !== url ||
      buildSearchUrl(fx.params) !== url || !isDeepStrictEqual(fx.body, expected) ||
      !isDeepStrictEqual(Object.keys(fx.body), Object.keys(expected))) {
    bad++; console.log(`STRUCT-MISMATCH ${name}`);
  }
  let a: string = renderSearch(url, rawText, "text")[0].text;
  for (const hit of raw.hits) {
    for (const h of hit.highlight?.content ?? []) {
      const line = `\nHighlight: ${h}`;
      if (!a.includes(line)) { bad++; console.log(`HIGHLIGHT-MISSING ${name}`); }
      a = a.replace(line, ""); removed++;
    }
  }
  const b: string = renderSearch(url, JSON.stringify(fx.body), "text")[0].text;
  if (a !== b) { bad++; console.log(`MISMATCH ${name}`); }
}
console.log(`${bad === 0 ? "EQUIV-OK" : "EQUIV-FAIL"} ${removed} dòng Highlight đã bỏ, ${bad} lệch`);
process.exit(bad === 0 ? 0 : 1);
```

## Component Boundaries

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `src/search.ts` | modified (M1, viết lại) | `buildSearchUrl()` (FR-2/2a/3), `renderSearch()` cho cả `text` lẫn `json` (FR-5..FR-12), `formatCitation()` không đổi. Không import, không I/O, không trạng thái |
| Khối Tool 1 trong `src/index.ts` | modified (H1) | Schema zod tám tham số và `describe()` (FR-1, FR-14). Handler: dựng URL một lần, fetch một lần, kiểm `ok`, trả `renderSearch` |
| Dòng import trong `src/index.ts` | modified (I1) | `buildSearchUrl`, `formatCitation`, `renderSearch` |
| `fetchSearch()` trong `src/index.ts` | **removed** | — |
| Mọi dòng khác của `src/index.ts` | không đổi | Khóa bằng §Lắp ráp |
| `test/search.test.ts` | modified (T1, viết lại) | 11 case `node:test` |
| `test/fixtures/` | 9 file xóa, 3 file mới | Response đã cắt, có `url`, `recorded`, `params` |
| `README.md`, `specs/sutta-mcp-requirements.md`, `AGENTS.md` | modified | R-1, R-2, M-1..M-5, A-1, A-2 |
| `package.json`, `package-lock.json`, `tsconfig.json` | không đổi | NFR-1, NFR-2 |

## Integration Points

- **Upstream SuttaCentral.** Cùng endpoint, một GET mỗi lời gọi (trước đây cũng một). Request khác ở chỗ tham số: không còn `limit=10` và `language=en` khi caller không truyền, và có thêm `selectedLanguages`, `restrict`, `matchpartial` khi caller truyền. `npm test` không gọi mạng. Lần ghi fixture phát 3 request, một lần, lúc implement.
- **Downstream (Claude).** `search_topic` đổi cả schema lẫn output. Đây là thay đổi phá vỡ có chủ đích: caller cũ gửi `{"topic": …}` sẽ bị từ chối vì thiếu `query` (AC-9.7). Bốn tool còn lại không đổi từng byte (A/B).
- **Build và runtime.** `dist/index.js` import `./search.js` như cũ. `rm -rf dist && npm run build` cho đúng `dist/index.js`, `dist/search.js`.
- **Workflow contract.** Sửa `AGENTS.md` đổi sha256 của `context:agents`, xem §Thứ tự áp dụng.

### Khối sửa tài liệu — **[NORMATIVE]**

Literal của mỗi đích chỉ có ở khối của nó. Neo khớp theo nội dung. Số dòng trong ngoặc là số đo tại `d972fa6`, và lệnh tái dựng ở §Testability dùng chúng, vì commit đó bất biến.

**R-1**, `README.md`. Thay dòng bảng Tools bắt đầu bằng `` | `search_topic` | `` (`:13`).

<!-- block: R-1 -->
```text
| `search_topic` | Wrapper mỏng của search SuttaCentral (`GET /api/search/instant`): tham số API `query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial` được gửi nguyên, tham số không truyền thì không gửi; `format` chọn `text` (mặc định: mọi kết quả theo thứ tự SC, kèm link) hoặc `json` (body response nguyên văn) |
```

**R-2**, `README.md`. Thay từ dòng `## Chủ đề có sẵn` (`:68`) tới hết đoạn của `## Mở rộng` (`:84`, dòng bắt đầu bằng `` 1 kết quả sutta ở trang 1 ``). Dòng trống `:85` và `## Lưu ý` giữ nguyên.

<!-- block: R-2 -->
```text
## Tìm bằng tiếng Việt

`search_topic` gửi truy vấn nguyên văn tới search của SuttaCentral, không ánh xạ hay dịch.
Để khớp tiêu đề tiếng Việt, truyền `language` = `vi`, ví dụ `{"query": "vô ngã", "language": "vi"}`.
Để có cả bản dịch tiếng Việt trong phần khớp nội dung (`hits`), thêm `selectedLanguages` có `vi`, ví dụ
`{"query": "vô ngã", "language": "vi", "selectedLanguages": ["vi", "pli"]}`. Khi bỏ trống `selectedLanguages`,
SuttaCentral dùng mặc định `["en", "pli"]`.
```

Ví dụ trong R-2 là hai lời gọi của AC-1 và AC-2, đo live 2026-10-23.

**M-1**, `specs/sutta-mcp-requirements.md`. Thay mục Tool 1, từ `` ### Tool 1: `search_topic` `` (`:143`) tới hết dòng `**Lưu ý:**` (`:160`). Dòng trống `:161` và `---` giữ nguyên.

<!-- block: M-1 -->
```text
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
```

**M-2**, master spec, luồng mẫu. Thay ba dòng từ `Claude gọi search_topic("chánh niệm")` (`:259`) tới `Trả về (tìm bằng "satipatthana")…` (`:261`). Kết quả này đo live 2026-10-23: `{"query":"niệm xứ","language":"vi"}` cho 9 khớp tiêu đề, gồm `mn10` (`Kinh Niệm xứ`), `dn22`, `sn43.5`, `ma98`, cùng `an5.122`, `an6.25`, `an6.9`, `sa605`, `sa606`, và 0 hit. Phần sau của luồng (`get_sutta("mn10")`, `get_parallels("mn10")` → `ma98`) không đổi và vẫn khớp.

<!-- block: M-2 -->
```text
Claude gọi search_topic({"query": "niệm xứ", "language": "vi"})
     ↓
Trả về: các sutta khớp tiêu đề tiếng Việt, trong đó mn10 (Kinh Niệm xứ), dn22, sn43.5, ma98, mỗi mục kèm link SuttaCentral
```

**M-3**, master spec, roadmap mục 1. Thay `:292-298`, từ dòng bắt đầu bằng `1. **Dynamic search**` tới hết đoạn `**Phân trang:**`. Dòng trống `:299` và mục 2 giữ nguyên. Số liệu của khối là số đo của AC-1 và AC-2.

<!-- block: M-3 -->
```text
1. **Dynamic search** — **đã thực hiện (spec `dynamic-search`), rồi thay bằng wrapper mỏng (spec `search-api-passthrough`).** Spec `dynamic-search` bỏ `TOPIC_INDEX` tĩnh (topic → UID hardcode) và cho `search_topic` gọi `GET /api/search/instant`. Phần logic tự chế của spec đó đã bị spec `search-api-passthrough` (`specs/search-api-passthrough/`) thay thế: bảng ánh xạ tiếng Việt `VI_TOPIC_TERMS` (đã bỏ), tham số `match`/`page`, lọc phần tử không phải sutta, khử trùng `uid`, cắt trang cục bộ và dòng "còn trang sau".
   - **Lý do (đo 2026-10-23):** search của SC khớp được tiêu đề tiếng Việt khi nhận `language=vi` (`vô ngã` → 21 khớp tiêu đề, trong đó SN 22.59), và trả bản dịch tiếng Việt trong `hits` khi nhận `selectedLanguages` có `vi` (`["vi","pli"]` → 10 hit ở trang đầu, ví dụ `an1.378-393` của Thích Minh Châu; `total` 185). Trước đó `hits` rỗng chỉ vì tool không gửi `selectedLanguages`, nên API dùng mặc định `["en","pli"]`.
   - **Hiện trạng:** `search_topic` nhận đúng tham số của API (`query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`) cộng `format` (`text`/`json`), gửi đúng một GET chỉ với các tham số caller truyền, và in mọi thứ API trả về theo thứ tự SC, không lọc. Phân trang bằng `limit`/`offset` của API; tool không suy luận trang sau.
```

**M-4**, master spec, bảng issue. Thay ba dòng #18, #19, #20 (`:376-378`). Cột tóm tắt của #19 và #20 giữ nguyên văn câu cũ, chỉ thêm một câu ở cuối.

<!-- block: M-4 -->
```text
| [#18](https://github.com/nbkhoi/sutta-mcp/issues/18) (bug) — **không còn áp dụng** | `search_topic` | Thuật ngữ trong `VI_TOPIC_TERMS` bỏ sót kinh tiêu biểu (`vô ngã` → `anatta` không có SN 22.59). Không còn áp dụng: `VI_TOPIC_TERMS` đã bỏ (spec `search-api-passthrough`), và `vô ngã` với `language=vi` khớp thẳng SN 22.59 (đo 2026-10-23). | mục 1 |
| [#19](https://github.com/nbkhoi/sutta-mcp/issues/19) (enhancement) | `get_sutta_meta`, `search_topic` | Với `language=vi`, SC trả tiêu đề tiếng Việt nhưng blurb tiếng Anh; output không nói rõ. Cần gắn nhãn blurb tiếng Anh. Phần `search_topic` cần kiểm lại trên output mới của spec `search-api-passthrough`. | mục 2 |
| [#20](https://github.com/nbkhoi/sutta-mcp/issues/20) (enhancement) | `get_sutta_meta`, `formatCitation()` | Bản dịch legacy trông như trùng (cùng `author_uid`); `Difficulty: unknown` in khi SC không có difficulty; tiêu đề upstream có khoảng trắng cuối. Phần `search_topic` cần kiểm lại trên output mới của spec `search-api-passthrough`, vì `search_topic` không còn dùng `formatCitation()`. | — |
```

**M-5**, master spec. Thay dòng `**Thứ tự đề xuất:**` (`:380`).

<!-- block: M-5 -->
```text
**Thứ tự đề xuất:** #18 không còn áp dụng. Phần `search_topic` của #19, #20 cần kiểm lại trên output của spec `search-api-passthrough` trước khi làm; mỗi thay đổi output của `search_topic` đi kèm unit test trong `npm test`. #16 độc lập với `search_topic`.
```

**A-1**, `AGENTS.md`. Thay `:24-31`, từ dòng `Two source files.` tới dòng mô tả `search_topic` của lớp tool. Kết quả: `:24` viết lại; `:25`, `:27` trống như cũ; `:26`, `:28`, `:30` sửa theo Q1; dòng `:29` (lớp ánh xạ tiếng Việt) bị bỏ; `:31` viết lại. Bốn dòng `get_sutta`…`list_divisions` sau đó giữ nguyên. Số dòng `~445` và `~165` lấy từ file lắp ráp (446 và 167 dòng). `AGENTS.md` viết bằng tiếng Anh, nên khối này bằng tiếng Anh.

<!-- block: A-1 -->
```text
Two source files. `src/index.ts` (~445 lines) holds the SuttaCentral API helpers, the MCP server with every tool's zod schema and handler, and `main()`. `src/search.ts` (~165 lines) holds the pure logic of `search_topic` — building the `/api/search/instant` request URL from the caller's parameters and rendering the response body as `text` or `json`, with no filtering, deduplication, reordering or paging logic — plus `formatCitation()`, which `get_sutta` and `get_sutta_meta` import from it. `src/search.ts` has no imports and no I/O. Unit tests live in `test/` and read recorded, trimmed `/api/search/instant` responses from `test/fixtures/`; they never call the network. Fixtures are small snapshots, not a corpus: re-record one only when a code change needs a new response shape.

**Two layers:**

1. **SuttaCentral API helpers** — `fetchSuttaplex()`, `fetchBilaraText()`, `fetchParallels()` wrapping `https://suttacentral.net/api`. The `search_topic` handler fetches the URL built by `buildSearchUrl()` in `src/search.ts` directly.
2. **MCP tool definitions** — five tools registered via `server.tool()`:
   - `search_topic` — thin wrapper of `GET /api/search/instant`: the API's own parameters (`query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`) plus `format` (`text`/`json`); one request per call carrying only the parameters the caller passed; `text` prints every `suttaplex` and `hits` entry in the order the API returns, unfiltered, with `total`, `fuzzy_dictionary` and `error`; `json` returns the response body verbatim
```

**A-2**, `AGENTS.md`. Thay dòng endpoint search (`:41`, bắt đầu bằng `` - `GET /api/search/instant ``). Sau đó xóa `:43-46`: tiêu đề `## Extending the Vietnamese Topic Mapping`, dòng trống, đoạn hướng dẫn và dòng trống sau đoạn. Dòng trống `:42` và `## SuttaCentral Domain Concepts` giữ nguyên.

<!-- block: A-2 -->
```text
- `GET /api/search/instant?query={q}` plus whichever of `language`, `limit`, `offset`, `selectedLanguages` (JSON string), `restrict`, `matchpartial` the caller passed — search; GET only, not cached
```

#### Thứ tự áp dụng — ràng buộc cho task planner

`AGENTS.md` được pin trong `specs/search-api-passthrough/workflow-contract.json` là dependency `context:agents`, sha256 `efea3016c0d6ebc2b89af3adba0061e49e1fa1dbb9823438508dfb8f65937f08` (đo lại 2026-10-23 bằng `shasum -a 256 AGENTS.md`). FR-21 bắt buộc áp A-1 và A-2, nên hash đó chắc chắn đổi, và workflow coi đó là drift. Drift chặn mọi lần ghi cho tới khi một lần cập nhật contract hoặc reconciliation settle nó (`workflow.md` §Invariants). Vì vậy (FR-21):

1. **A-1, A-2 là task build cuối cùng, một task riêng, chỉ sửa `AGENTS.md`.** Mọi task sửa `src/`, `test/`, `README.md` (R-1, R-2) và `specs/sutta-mcp-requirements.md` (M-1..M-5) phải xong trước nó. Như vậy không lần dispatch nào sau đó gặp drift, và một lần cập nhật contract là đủ. Trước khi dispatch task này, orchestrator hỏi người dùng Q1. Nếu người dùng không chọn default, khối A-1 được sửa qua một lần sửa design trước.
2. **Ngay sau task đó, trước code review on-completion**, orchestrator chạy đường cập nhật contract của `lib/workflow_contracts.py`:
   - `preview_contract_update`: thay đổi duy nhất được chờ là `dependencies.context:agents` (sha256 mới của `AGENTS.md`). Nếu có thay đổi nào khác thì dừng và báo người dùng.
   - Trình preview cho người dùng, kèm danh sách gate bị ảnh hưởng. Scope là `{"type":"contract","id":"dependencies.context:agents"}`. Scope này không mở lại requirements, design hay tasks.
   - `authorize_contract_update`: **chỉ khi người dùng đồng ý rõ ràng tại đúng thời điểm này**. Không agent nào authorize thay người dùng.
   - `write_contract_atomic`, rồi `finish_contract_update`.
   - `settle_contract_invalidation`: invalidation scope `contract` được settle bằng chính quyết định contract-update.
3. **Code review on-completion chỉ được dispatch sau bước 2.** Khi đó `AGENTS.md` mới là context đã pin, và review bao gồm cả A-1, A-2.
4. **Nếu người dùng không authorize**, workflow dừng ở trạng thái drift. Agent không tự khôi phục `AGENTS.md`.

Các task code có thể chia theo ý task planner. Có hai ràng buộc. M1, I1, H1 phải vào cùng một commit build được, vì `src/index.ts` của `d972fa6` import các hàm mà M1 đã bỏ. Việc ghi fixture (§Quy trình) cần M1 đã có. T1 và fixture phải vào cùng lúc với M1, nếu không thì `npm test` của commit đó fail.

## Cross-Cutting Concerns

### Authentication & Authorization

Không áp dụng. API SuttaCentral là API công khai, server chạy stdio cục bộ, và test không gọi mạng. `query` và mọi tham số chuỗi đi qua `URLSearchParams`, nên caller không chèn được tham số hay đường dẫn khác vào request. Host của URL là hằng trong M1.

### Error Handling

| Tình huống | Hành vi | Nơi |
|---|---|---|
| Input sai schema (`offset` âm, `limit` không nguyên hoặc là chuỗi, `selectedLanguages` là chuỗi, `matchpartial` là chuỗi, `format` lạ, thiếu `query`) | SDK trả `isError: true`, text `MCP error -32602: Input validation error: …`. Handler không chạy, không có request | zod (H1); đo AC-9 7/7 |
| HTTP không 2xx (422, 500…) | ném `SuttaCentral API error: {status}` ở cả hai format; SDK dựng `isError: true` | H1 (C6) |
| Lỗi mạng | `fetch` reject, lỗi gốc lan lên SDK | H1 |
| 2xx, `format=text`, body không phải JSON | `JSON.parse` ném `SyntaxError`, SDK dựng `isError: true` | `renderSearch` (FR-12) |
| 2xx, `format=json`, body bất kỳ | trả nguyên văn, không parse | `renderSearch` (FR-5) |
| Body `null` | `text`: dòng nguồn + câu body `null`; `json`: `null`. Không `isError` | M1 (C10) |
| Body JSON không phải object | dòng nguồn + một dòng nêu rõ | M1 (FR-12) |
| Thiếu key, hoặc key không phải mảng | dòng của phần đó nêu rõ, không coi là mảng rỗng | M1 (FR-12) |
| SC báo `error` với HTTP 200 | khối `error`, không `isError` | M1 (FR-11) |

Không có retry, timeout phía client hay kết quả một phần (Out of Scope). Mọi hàm private của M1 chịu được mọi giá trị JSON. Case FR-12 thử `{}`, `null`, mảng, chuỗi, và các field sai kiểu. Case FR-8 thử phần tử mà mọi field đều `null`.

### Logging & Observability

Không áp dụng. Không thêm log. Server vẫn chỉ in một dòng `Sutta MCP server running (stdio)` ra stderr khi khởi động. Dòng nguồn trong output (URL request đầy đủ) cho caller tái tạo đúng request bằng `curl`, và AC-4 dùng nó đúng như vậy.

### Performance & Scalability

- **Request.** Một GET mỗi lời gọi, như trước (NFR-7). Phiên đo 2026-10-23 mất từ 0 đến 11 s một lời gọi qua harness (cache 600 s của SC làm lần lặp nhanh hơn). Harness V2 chờ dòng `"id":2` tối đa 90 s thay cho một `sleep` cố định, nên vẫn chừa đủ cho `list authors` (18 s, theo số đo của requirements).
- **Kích thước output** (đo 2026-10-23: `Buffer.byteLength` của `content[0].text`, gồm cả dòng nguồn với URL request thật):

  | Truy vấn | `json` (byte) | `text` (byte) |
  |---|---|---|
  | `anatta`/`en` | 38,333 | 4,284 |
  | `vô ngã`/`vi` | 117,933 | 4,408 |
  | `vô ngã`/`vi`/`["vi","pli"]` | 128,843 | 10,831 |
  | `chánh niệm`/`vi`/`["vi","pli"]` | 17,507 | 6,721 |

  `json` lớn chủ yếu vì `translations` của `suttaplex`. Requirements đã chấp nhận điều này, và caller không giảm được nó bằng `limit` (§Assumptions của requirements).
- **Xử lý.** Một lượt tuyến tính qua mỗi mảng. `npm test` (11 case, không mạng) chạy trong khoảng 0.2 s thời gian thực trên bản dựng thử.

### Testability & Verification

Có bốn vehicle: unit test (`npm test`), lệnh trên repo (diff, grep, build), harness stdio trên bản build mới (V2), và A/B với `d972fa6` (V3, V4). Chỉ harness, A/B và bước ghi fixture dùng mạng.

#### Harness và luật hợp lệ (NFR-6)

V2 là một client stdio bằng Node, chạy ngoài repo. Nó chạy `node ./dist/index.js` trong thư mục bản build được chỉ định, gửi `initialize`, `notifications/initialized`, rồi frame id 2 (`tools/call` hoặc `tools/list`). Nó đợi dòng `"id":2` thay cho một `sleep` cố định, rồi in JSON của `result`. V2 giữ nguyên luật của `specs/dynamic-search/design.md` §Harness: `npm run build` trước khi chạy, chạy tuần tự, và đúng một dòng `"id":2`. Nó chỉ thay heredoc bằng một script Node để khỏi phải đoán thời gian chờ. Trước mỗi đợt chạy, chạy `npm run build`, vì V2 chạy `dist/`, không chạy `src/`.

**Luật hợp lệ (đúng danh sách của NFR-6).** Một lần chạy là **không hợp lệ** chỉ khi lỗi nằm ở đường truyền: không có dòng `"id":2` hoặc có nhiều hơn một (gồm cả timeout 90 s, V2 thoát 2), hoặc text của `tools/call` chứa `fetch failed` (V2 thoát 3). HTTP 000 của `curl` ở AC-4 cũng là lỗi truyền tải. Mọi kết quả khác là lần chạy **hợp lệ** (V2 thoát 0), kể cả text bắt đầu bằng `SuttaCentral API error:` (SC trả non-2xx thật, ví dụ khi URL bị dựng sai), text rỗng, hay một result không như AC chờ. Lần chạy hợp lệ được so với AC. Lệch thì đó là một phát hiện: dừng và báo, không chạy lại. Trước khi báo, `curl -sG` lại đúng URL trong dòng nguồn để phân biệt chỉ mục SC trôi với regression. Mệnh đề phủ định chỉ được đánh giá trên lần chạy hợp lệ.

**Chạy lại và trần.** Chỉ lần chạy không hợp lệ được chạy lại, tối đa 3 lần cho mỗi input. Quá trần thì AC đó là **"inconclusive (network)"**: không phải pass, không phải lỗi code. Implementer báo kết quả này kèm stderr, và orchestrator quyết định (chạy lại sau, hoặc dừng). V3 in `INCONCLUSIVE (network)` và thoát 3 trong trường hợp này. Chỉ `MISMATCH` (thoát 1) là phát hiện về code.

Trên bản dựng thử: lần chạy AC-1 đầu tiên không hợp lệ (`fetch failed`, thoát 3) và đạt ở lần chạy lại. Mọi lần chạy khác hợp lệ ngay lần đầu. Không lần chạy hợp lệ nào lệch AC.

<!-- block: V2 -->
```js
// node mcp-call.mjs <thư mục bản build> <tên tool | tools/list> <arguments JSON>
// Chạy <thư mục>/dist/index.js qua stdio, gửi initialize, initialized, rồi frame id 2; đợi đúng dòng
// "id":2 (tối đa 90 s) rồi đóng stdin. In ra JSON của `result`. Exit 0 = hợp lệ (mọi result, kể cả
// isError, text rỗng, "SuttaCentral API error:"); 2 = số dòng "id":2 khác 1 hoặc timeout; 3 = fetch failed.
// Chỉ 2 và 3 là lần chạy không hợp lệ (NFR-6).
import { spawn } from "node:child_process";
const [dir, tool, args] = process.argv.slice(2);
const child = spawn("node", ["./dist/index.js"], { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
const frames = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ac", version: "1" } } },
  { jsonrpc: "2.0", method: "notifications/initialized" },
  tool === "tools/list"
    ? { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }
    : { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: tool, arguments: JSON.parse(args) } },
];
for (const f of frames) child.stdin.write(JSON.stringify(f) + "\n");
let out = "", stderr = "";
child.stderr.on("data", (c) => (stderr += c));
const timer = setTimeout(() => finish(), 90000);
child.stdout.on("data", (c) => {
  out += c;
  if (out.split("\n").some((l) => l.includes('"id":2'))) setTimeout(finish, 200);
});
let done = false;
function finish() {
  if (done) return; done = true; clearTimeout(timer); child.stdin.end(); child.kill();
  const lines = out.split("\n").filter((l) => l.includes('"id":2'));
  if (lines.length !== 1) { console.error(`INVALID id:2 lines=${lines.length} stderr=${stderr.slice(0, 200)}`); process.exit(2); }
  const result = JSON.parse(lines[0]).result;
  if (tool !== "tools/list") {
    const t = (result?.content ?? []).map((c) => c.text).join("\n");
    if (t.includes("fetch failed")) {
      console.error("INVALID text=" + JSON.stringify(t.slice(0, 120))); process.exit(3);
    }
  }
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}
```

Cách gọi: `node "$W/mcp-call.mjs" "$REPO" search_topic '{"query":"vô ngã","language":"vi"}' > "$W/ac1.json"`. Đối số JSON đi nguyên qua `argv`, nên không qua bước diễn giải escape nào của shell.

#### A/B với `d972fa6` (AC-12)

Requirements yêu cầu baseline ở `d972fa6`. V3 dựng baseline từ `git archive d972fa6`, không phụ thuộc trạng thái của cây làm việc. Nó chạy bản cũ rồi bản mới liền nhau cho mỗi input, nên giảm rủi ro chỉ mục SC đổi giữa hai lần chạy. Payload của `tools/list` là mảng `tools` đã bỏ phần tử `search_topic`. Payload của một tool là `isError=<bool>`, xuống dòng, rồi text. Output nằm trong thư mục tạm và bị xóa khi xong.

```sh
REPO=$(git rev-parse --show-toplevel)   # blk như ở §Lắp ráp
AB=$(mktemp -d /tmp/sap-ab.XXXXXX); mkdir "$AB/base" "$AB/work"
git -C "$REPO" archive d972fa6 src package.json tsconfig.json | tar -x -C "$AB/base"
ln -s "$REPO/node_modules" "$AB/base/node_modules"
(cd "$AB/base" && npx tsc -p .)
(cd "$REPO" && npm run build)
blk V2 > "$AB/mcp-call.mjs"; blk V3 > "$AB/ab.sh"; chmod +x "$AB/ab.sh"; blk V4 > "$AB/inputs.list"
"$AB/ab.sh" "$AB/base" "$REPO" "$AB/inputs.list" "$AB/work" "$AB/mcp-call.mjs"     # in AB-OK 6/6 khi đạt
rm -rf "$AB"
```

Trên bản dựng thử: `AB-OK 6/6`. Cặp `get_parallels` không hợp lệ ở lần đầu (bản mới `fetch failed`) và đạt ở lần chạy lại thứ nhất. Chạy lại với V2/V3 hiện tại (cùng ngày): lượt 1 và lượt 2 in `INCONCLUSIVE (network)` (ở `get_sutta mn9999` và `get_sutta mn10`; mọi lần chạy hỏng đều là `fetch failed`, và cùng lúc đó một lệnh `fetch` trần tới SuttaCentral, không qua code dự án, cũng gặp `ETIMEDOUT` và `ECONNRESET`). Lượt 3, sau một phút nghỉ, in `AB-OK 6/6` với cùng payload. Một lượt đo độc lập khác cùng ngày gặp trần ở 3 trong 4 lượt. Lỗi mạng thoáng qua xảy ra thường, nên trần dẫn tới `INCONCLUSIVE (network)`, không dẫn tới kết luận về code. Payload lần lượt là 2509, 6790, 56, 2715, 463 và 2243 byte.

<!-- block: V3 -->
```sh
#!/bin/sh
# ab.sh <bản d972fa6 đã build> <bản mới đã build> <file input: tool|arguments> <thư mục tạm> <mcp-call.mjs>
# Mỗi input: chạy bản cũ rồi bản mới, tuần tự. Payload: tools/list → mảng tools bỏ search_topic;
# tool → "isError=<bool>" rồi text. Cặp có lần chạy không hợp lệ (V2 thoát 2/3) thì chạy lại cả cặp, tối đa 3 lần;
# quá trần: INCONCLUSIVE (network), thoát 3 — không phải pass, không phải lỗi code. Cặp hợp lệ mà lệch: MISMATCH,
# thoát 1, dừng ngay, không chạy lại (NFR-6).
BASE=$1; NEW=$2; INPUTS=$3; W=$4; CALL=$5
payload() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d);
  if(process.argv[1]==="tools/list"){process.stdout.write(JSON.stringify(r.tools.filter(t=>t.name!=="search_topic")));return}
  process.stdout.write("isError="+(r.isError===true)+"\n"+(r.content??[]).map(c=>c.text).join("\n"))})' "$1"; }
i=0
while IFS="|" read -r tool args; do
  i=$((i+1)); try=1
  while :; do
    node "$CALL" "$BASE" "$tool" "$args" > "$W/old.$i.raw" 2>>"$W/stderr.log"; o=$?
    node "$CALL" "$NEW" "$tool" "$args" > "$W/new.$i.raw" 2>>"$W/stderr.log"; n=$?
    if [ $o = 0 ] && [ $n = 0 ]; then break; fi
    echo "INVALID-PAIR $i try=$try $tool $args (old=$o new=$n)"
    try=$((try+1)); [ $try -le 3 ] || { echo "INCONCLUSIVE (network) $i $tool $args: 3 cặp không hợp lệ, không phải pass, không phải lỗi code; orchestrator quyết định"; exit 3; }
  done
  payload "$tool" < "$W/old.$i.raw" > "$W/old.$i"; payload "$tool" < "$W/new.$i.raw" > "$W/new.$i"
  if cmp -s "$W/old.$i" "$W/new.$i"; then
    echo "MATCH $i $tool $args ($(wc -c < "$W/new.$i" | tr -d ' ') byte)"
  else
    echo "MISMATCH $i $tool $args — dừng, xem diff $W/old.$i $W/new.$i"; exit 1
  fi
done < "$INPUTS"
echo "AB-OK $i/$i"
```

<!-- block: V4 -->
```text
tools/list|{}
get_sutta|{"uid":"mn10"}
get_sutta|{"uid":"mn9999"}
get_sutta_meta|{"uid":"mn10"}
get_parallels|{"uid":"mn10"}
list_divisions|{}
```

#### Đột biến (FR-18, AC-13)

Chạy trên một bản sao cây làm việc **ngoài repo** (`rsync` cây làm việc, không kèm `.git`, `node_modules`, `dist`; `node_modules` là symlink về repo). Mỗi lần, V1 áp đúng một đột biến và kiểm nó đổi đúng 1 dòng. Nếu `changed` khác 1, pattern đã không khớp M1 và lần chạy đó không có giá trị. Sau đó V1 chạy `npm test` rồi hoàn nguyên. Xóa bản sao khi xong.

```sh
C=$(mktemp -d /tmp/sap-mut.XXXXXX); rsync -a --exclude .git --exclude node_modules --exclude dist "$REPO"/ "$C"/; ln -s "$REPO/node_modules" "$C/node_modules"
blk V1 > "$C.sh"; chmod +x "$C.sh"
for m in a b c d; do "$C.sh" "$C" "$m"; done; (cd "$C" && npm test > /dev/null 2>&1; echo "restored exit=$?")
rm -rf "$C" "$C.sh"
```

Trên bản dựng thử:

| Đột biến (FR-18) | Thay đổi trong M1 | `changed` | Mã thoát | Case fail |
|---|---|---|---|---|
| (a) bỏ phần tử có `category` khỏi `hits` | `...arr.filter((e) => !e?.category).map(…)` trong `arraySection` | 1 | 1 | **FR-6**, FR-8 |
| (b) gửi `limit=10` khi caller không truyền | `q.set("limit", String(p.limit ?? 10));` | 1 | 1 | **FR-2**, FR-2a, FR-3 |
| (c) `selectedLanguages` không qua `JSON.stringify` | `String(p.selectedLanguages)` | 1 | 1 | **FR-2**, FR-2a |
| (d) trim `query` | `{ query: p.query.trim() }` | 1 | 1 | **FR-3** |

Sau bốn lần, `npm test` trên bản sao thoát 0 (đã hoàn nguyên). Đột biến (a) chạm cả `suttaplex`, vì `arraySection` dùng chung cho hai mảng. Phần tử `suttaplex` không có `category`, nên chỉ `hits` bị ảnh hưởng, đúng như FR-18 (a) mô tả.

<!-- block: V1 -->
```sh
#!/bin/sh
# mutate.sh <bản sao cây làm việc, ngoài repo> <a|b|c|d>: áp MỘT đột biến FR-18, chạy npm test, hoàn nguyên.
cd "$1" || exit 2
cp src/search.ts .search.ts.orig
case "$2" in
  a) perl -pi -e 's/\.\.\.arr\.map\(\(e, i\) => item\(/...arr.filter((e) => !e?.category).map((e, i) => item(/' src/search.ts ;;
  b) perl -pi -e 's/if \(p\.limit !== undefined\) q\.set\("limit", String\(p\.limit\)\);/q.set("limit", String(p.limit ?? 10));/' src/search.ts ;;
  c) perl -pi -e 's/JSON\.stringify\(p\.selectedLanguages\)/String(p.selectedLanguages)/' src/search.ts ;;
  d) perl -pi -e 's/new URLSearchParams\(\{ query: p\.query \}\)/new URLSearchParams({ query: p.query.trim() })/' src/search.ts ;;
esac
changed=$(diff .search.ts.orig src/search.ts | grep -c '^>')
npm test > .mutant.log 2>&1; code=$?
echo "mutation $2: changed=$changed exit=$code failed: $(grep '^not ok' .mutant.log | sed 's/^not ok [0-9]* - //' | cut -d: -f1 | sort -u | tr '\n' ' ')"
mv .search.ts.orig src/search.ts; rm -f .mutant.log
```

#### Vehicle theo AC

Cột cuối là kết quả trên bản dựng thử ngày 2026-10-23. "Mục `k`" nghĩa là khối của output bắt đầu bằng `k[`. Output được tách theo `"\n\n"`.

| AC | Lệnh / vehicle | Kết quả trên bản dựng thử |
|---|---|---|
| AC-1 | V2 `{"query":"vô ngã","language":"vi"}`. Đếm mục `suttaplex`; có dòng `URL: https://suttacentral.net/sn22.59` và chuỗi `— Năm Vị (Vô ngã tưởng)`; khối `Khớp nội dung (hits): 0`; khối `total` kết thúc bằng `: 21`; `new URL(<URL của dòng nguồn>).searchParams` chỉ có key `query`, `language` | Đạt: 21 mục; key `query,language`; không `isError` |
| AC-2 | V2 `{"query":"vô ngã","language":"vi","selectedLanguages":["vi","pli"]}`. 10 mục `hits`; `hits[0]` có `URL: https://suttacentral.net/an1.378-393/vi/minh_chau` và `Tác giả: Thích Minh Châu (minh_chau)`; `total` 185; `searchParams.get("selectedLanguages")` = `["vi","pli"]` | Đạt |
| AC-3 | V2 `{"query":"anatta","language":"en"}`. Dòng `URL:` của 10 mục `hits` theo thứ tự; dòng 1 của `suttaplex[0]` | Đạt: `/define/anatta`, 4 bài viết, `thi-ap4`, `an3.136`, `an7.18`, `an7.20`, `an10.60`; `suttaplex[0] **AN 6.100** — Not-Self ` |
| AC-4 | V2 `{"query":"foo:bar","language":"en","format":"json"}`, rồi ngay sau đó `curl -sS -G -o "$W/ac4.curl" "https://suttacentral.net/api/search/instant?query=foo%3Abar&language=en"`; so `content[0].text` với file `curl` bằng `===` trong Node; `content[1].text` | Đạt: trùng byte; item 2 = `Nguồn: SuttaCentral — https://suttacentral.net/api/search/instant?query=foo%3Abar&language=en` |
| AC-5 | V2 `{"query":"foo:bar","language":"en"}`. Có `unknown_filter`, `Unknown filter: "foo:"`, 3 dòng `suggestion:`, dòng đầu bắt đầu bằng `suggestion: Supported filters are`; `isError` không có | Đạt |
| AC-6 | V2 `{"query":"nibbana","language":"en","restrict":"dictionaries"}`, rồi thêm `"format":"json"` | Đạt: `text` = dòng nguồn + `SuttaCentral trả body \`null\` cho request này.`; `json` item 1 = `null`; không `isError` |
| AC-7 | T1 case `FR-8:` (literal `list authors`, `assert.deepEqual` với `["hits[0]\nTác giả: Bhikkhu Anālayo (analayo)"]`) | Đạt |
| AC-8 | T1 case `FR-2:` và `FR-3:`; đọc H1: bảy tham số API dùng `.optional()`, không có `.default()`; `grep -c '\.default(' ` trong khối H1 = 1 (`format`) | Đạt |
| AC-9 | V2 với 7 input của AC-9; mỗi `result.isError === true` và text bắt đầu bằng `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:` | Đạt 7/7 |
| AC-10 | Đọc H1: `if (!res.ok) throw new Error(\`SuttaCentral API error: ${res.status}\`)` đứng trước `renderSearch`, chung cho cả hai format; không có `try`/`catch` | Đạt theo cấu trúc; khóa bằng §Lắp ráp |
| AC-11 | V2 `tools/list`. Kiểm `inputSchema` như §API. Nối `description` của tool với `description` của mọi property: có `selectedLanguages`, `vi`, `["en","pli"]`, `suttaplex`, `hits`, `title:`; không có `không hiểu tiếng Việt`, `Chủ đề tiếng Việt có sẵn`, `không bao giờ`. Đọc từng mệnh đề còn lại của AC-11 trên chuỗi đó | Đạt: 8 property, `required` `["query"]`, chỉ `format` có `default`; mọi chuỗi có/không có như yêu cầu |
| AC-12 | §A/B (V3, V4) | Đạt: `AB-OK 6/6` |
| AC-13 | `npm test > "$L/t1.log" 2>&1; echo $?`; `grep -E '^# (pass\|fail)' "$L/t1.log"`; preload: `P=$(mktemp -d /tmp/sap-nofetch.XXXXXX); printf 'globalThis.fetch = () => { throw new Error("network disabled"); };\n' > "$P/nofetch.mjs"; NODE_OPTIONS="--import $P/nofetch.mjs" npm test > "$L/t2.log" 2>&1; echo $?; rm -rf "$P"`; `grep -E '^ok' "$L/t1.log"` cho tiền tố `FR-2:`, `FR-2a:`, `FR-3:`, `FR-5:`, `FR-6:`, `FR-7:`, `FR-8:`, `FR-9:`, `FR-10:`, `FR-11:`, `FR-12:`; §Đột biến; `ls test/fixtures \| wc -l`; `cat test/fixtures/* \| wc -c`; `grep -l -E '"(highlight\|translations)"' test/fixtures/*`; mỗi file có `url`, `recorded` (`node -e` in `recorded`, `url`, `total`, số phần tử, đối chiếu bảng §Fixture); dòng `EQUIV-OK` trong `tasks.md`; `grep -rn -E 'fetch\|src/index' test/` | Đạt: hai lần đều thoát 0, `# pass 11`, `# fail 0` (preload có hiệu lực: `fetch("x")` ném `network disabled`); đủ 11 tiền tố; 4/4 đột biến; 3 file, 15,223 byte, grep rỗng; grep `test/` không có dòng nào (thoát 1) |
| AC-14 | `rm -rf dist && npm run build && find dist -type f \| sort`; `git diff d972fa6 --stat`; `git diff d972fa6 -- package.json package-lock.json tsconfig.json` (rỗng); bảng grep dưới; §Lắp ráp; đọc H1 theo §I1, H1 Tính chất; `grep -c -E '^(let\|var\|const) ' src/search.ts` = 0 và đọc H1 (không biến module-scope mới trong `src/index.ts`) | Đạt trên bản dựng thử |
| AC-15 | Grep của AC-15 trong requirements; đọc Tool 1, luồng mẫu, roadmap mục 1, bảng issue; lệnh tái dựng dưới đây; sau task A và bước contract: `shasum -a 256 AGENTS.md` bằng sha256 `context:agents` mới trong `workflow-contract.json` | Trên bản sao đã áp mọi khối: README 0 dòng, AGENTS.md 0 dòng; master spec đúng 2 dòng (`:296` roadmap mục 1, `:376` issue #18), cả hai nói rõ đã bỏ/bị thay; `grep -c VI_TOPIC_TERMS README.md` = 0; Tool 1 có 8 dòng tham số; roadmap mục 1 trỏ `specs/search-api-passthrough/`; `README-OK`, `MASTER-OK`, `AGENTS-OK`. Mệnh đề contract kiểm lúc build |
| AC-16 | T1 case `FR-10:` | Đạt |

`L` là một thư mục tạm cho log (`L=$(mktemp -d /tmp/sap-log.XXXXXX)`), xóa khi xong.

**Lệnh tái dựng tài liệu (AC-15).** Mỗi file đích phải trùng từng byte với file tái dựng từ `d972fa6` và các khối:

```sh
REPO=$(git rev-parse --show-toplevel)   # blk như ở §Lắp ráp
R=$(mktemp); git -C "$REPO" show d972fa6:README.md > "$R"
{ sed -n '1,12p' "$R"; blk R-1; sed -n '14,67p' "$R"; blk R-2; sed -n '85,$p' "$R"; } \
  | diff - "$REPO/README.md" && echo README-OK
S=$(mktemp); git -C "$REPO" show d972fa6:specs/sutta-mcp-requirements.md > "$S"
{ sed -n '1,142p' "$S"; blk M-1; sed -n '161,258p' "$S"; blk M-2; sed -n '262,291p' "$S"; blk M-3; sed -n '299,375p' "$S"; blk M-4; sed -n '379p' "$S"; blk M-5; sed -n '381,$p' "$S"; } \
  | diff - "$REPO/specs/sutta-mcp-requirements.md" && echo MASTER-OK
A=$(mktemp); git -C "$REPO" show d972fa6:AGENTS.md > "$A"
{ sed -n '1,23p' "$A"; blk A-1; sed -n '32,40p' "$A"; blk A-2; sed -n '42p' "$A"; sed -n '47,$p' "$A"; } \
  | diff - "$REPO/AGENTS.md" && echo AGENTS-OK
rm -f "$R" "$S" "$A"
```

`README-OK` và `MASTER-OK` chạy được sau task tài liệu. `AGENTS-OK` chỉ chạy được sau task A. Đã chạy cả ba trên bản sao đã áp mọi khối, với tài liệu này làm `D`.

**Bảng grep bất biến (FR-4, NFR-5).** Đây là bộ lọc nhanh, không đủ một mình. Lưới thật là §Lắp ráp.

| Lệnh | `src/index.ts` trước (`d972fa6`) | `src/index.ts` sau | `src/search.ts` sau |
|---|---|---|---|
| `grep -c 'segmented'` | 3 | **3** | 0 |
| `grep -c -F 'sujato'` | 3 | **3** | 0 |
| `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush'` | 0 | **0** | 0 |
| `grep -c 'fetch('` | 4 | **4** | 0 |
| `grep -c -E 'URLSearchParams\|searchParams\|new URL\(\|SC_BASE\}/search'` | 1 | **0** | — |
| `cat src/*.ts \| grep -c -E 'VI_TOPIC_TERMS\|SEARCH_PAGE_SIZE\|resolveTopic\|searchOffset\|selectPage\|hasMore\|isSutta\|takeNew\|formatNoResults\|Còn kết quả\|Hết kết quả'` | — | **0** (cả `src/`) | — |
| `wc -l <` | 436 | **446** | 167 |

Dọn dẹp khi xong: mọi thư mục `mktemp` ở trên (`$W`, `$AB`, `$L`, bản sao đột biến) (NFR-6).

## Alternatives Considered

### Alternative A: Dựng output `json` trong handler, chỉ export formatter `text`

- **Description:** Handler tự trả `[{ text: raw }, { text: "Nguồn: …" + url }]` khi `format === "json"`. `src/search.ts` chỉ export `buildSearchUrl` và một hàm `formatSearchText(url, body)`.
- **Why not chosen:** Dòng nguồn khi đó có hai nơi dựng (handler và formatter), hoặc phải export thêm một hàm chỉ để dùng chung. FR-5 cũng chỉ còn được kiểm bằng harness live (AC-4). Cách được chọn tốn một tham số `format` trong `renderSearch`. Đổi lại, handler không còn logic nào ngoài I/O, và FR-5 có case offline.

### Alternative B: Giữ helper `fetchSearch(url)` trong `src/index.ts`

- **Description:** `async function fetchSearch(url: string) { const res = await fetch(url); if (!res.ok) throw …; return res.text(); }`, và handler gọi `fetchSearch(url)`. Dòng `:28` của `AGENTS.md` vẫn đúng, nên Q1 bớt một dòng.
- **Why not chosen:** NFR-5 và AC-14 kiểm bằng đọc code rằng đối số của lời gọi `fetch` search là chính biến chứa kết quả của hàm dựng URL. Qua helper, đối số đó là tham số của helper, không phải biến của handler. Người đọc phải lần qua hai hàm để thấy URL không bị sửa. Helper cũng chỉ có một nơi gọi. Q1 vẫn cần cho `:26` và `:30`, nên giữ helper không bỏ được câu hỏi.

### Alternative C: Mỗi mục là JSON một dòng của phần tử (bỏ field)

- **Description:** Output `text` in mỗi phần tử `suttaplex`/`hits` dưới dạng `JSON.stringify` sau khi bỏ `translations`/`highlight`, giống mục `fuzzy_dictionary`.
- **Why not chosen:** C8 và FR-7/FR-8 chốt danh sách field và link `https://suttacentral.net…` cho mỗi mục. JSON thô không có link tuyệt đối, và `format=json` đã phục vụ caller cần dữ liệu thô. Chỉ `fuzzy_dictionary` dùng JSON một dòng, vì dạng phần tử của nó chưa từng quan sát được (FR-10).

### Alternative D: Danh sách đánh số `1.`, `2.` thay cho nhãn `suttaplex[i]`/`hits[i]`

- **Why not chosen:** Số đánh từ 1 lệch một đơn vị so với chỉ số của `format=json`. Hai phần sẽ có cùng dạng `1.`, nên một dòng tách khỏi ngữ cảnh không cho biết nó thuộc mảng nào. Nhãn theo chỉ số JSON đếm được bằng máy (test FR-6), và caller tra chéo được sang `json` của cùng request.

### Alternative E: Fixture cho body `null`, `list authors` và `highlight`

- **Why not chosen:** Body `null` là 4 byte, và literal trong test rõ hơn một file. `list authors` mất khoảng 18 s mỗi lần ghi, và body có 72 mục. AC-7 chỉ cần một mục. `highlight` bị NFR-4 cấm trong fixture. Ba fixture (15 KB) đủ cho mọi dòng của bảng FR-17 cần fixture.

### Alternative F: Kiểm tương đương thô/đã cắt bằng cách lọc dòng `Highlight:`

- **Description:** So output của body thô sau khi bỏ mọi dòng bắt đầu bằng `Highlight: ` với output của body đã cắt.
- **Why not chosen:** Chuỗi `highlight` có thể chứa newline (đo: `chánh niệm`/`vi`, 3 trong 10 hit). Dòng tiếp nối không bắt đầu bằng `Highlight: `, nên lọc theo dòng sẽ báo lệch giả, hoặc phải nới quy tắc. F4 bỏ đúng chuỗi con `"\nHighlight: " + s` của từng chuỗi, theo thứ tự, và kiểm chuỗi đó có mặt.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chỉ mục SC trôi giữa ngày soạn design và ngày ghi fixture hoặc chạy harness, làm literal của T1/AC sai | L (`anatta`/`en`: cùng `total` 145 và cùng 10 hit theo cùng thứ tự ở fixture cũ ghi 2026-10-20 và lần ghi 2026-10-23) | M: test hoặc AC fail, phải sửa design | Quy tắc §Fixture và luật hợp lệ: dừng và báo kèm số đo có ngày; `curl` lại để phân biệt trôi với regression; không ghi lại để tìm lần trùng |
| Implementer chép sai M1/H1/T1 (thêm `trim`, set mặc định, đổi thứ tự tham số, bỏ `export`) | M | M | §Lắp ráp so toàn file bằng `diff`; V1 chứng minh test bắt bốn lỗi của FR-18 |
| Lỗi mạng thoáng qua trong harness, A/B hoặc lúc ghi fixture | **H** (đo: trong ngày 2026-10-23, nhiều lượt A/B chạm trần và kết thúc `INCONCLUSIVE (network)`; `fetch` trần tới SC cũng gặp `ETIMEDOUT`/`ECONNRESET`) | L | Luật hợp lệ của NFR-6: chỉ lỗi truyền tải được chạy lại, tối đa 3 lần; quá trần là "inconclusive (network)", orchestrator quyết định; F2 báo `INVALID` theo từng dòng |
| Caller cũ (cấu hình Claude, prompt) gửi `topic`/`match`/`page` | M | M: lời gọi bị từ chối (`-32602`, thiếu `query`) | Có chủ đích (quyết định 1); thông báo lỗi của SDK nêu rõ tham số sai; `describe()` và README mô tả schema mới |
| `highlight` chứa dòng trống làm một mục `hits` trông như hai khối khi tách theo `"\n\n"` | L (chưa quan sát được; đã thấy newline đơn) | L: chỉ ảnh hưởng người đọc tách khối bằng máy | Mỗi mục bắt đầu bằng nhãn `hits[i]`, nên ranh giới mục vẫn xác định được; caller cần cấu trúc chính xác dùng `format=json`. Test không dựa vào trường hợp này (fixture không có `highlight`) |
| Output `json` lớn (tới 129 KB đo được) chiếm ngữ cảnh của caller | M | L | `text` là mặc định (4.3–10.8 KB đo được); requirements đã chấp nhận kích thước `json` |
| Sửa `AGENTS.md` gây drift contract | **H** (bắt buộc sửa) | **H**: chặn mọi dispatch và code review | §Thứ tự áp dụng: task cuối, riêng; Q1 hỏi trước task; cập nhật contract do người dùng authorize ngay sau đó |
| `npm test` của một commit trung gian fail vì M1 vào trước T1/fixture | M | L | §Thứ tự áp dụng: M1, I1, H1, T1 và fixture vào cùng một task/commit |
