# Design: unit test offline cho logic thuần của `search_topic`

**Status:** Reviewed
**Created:** 2026-10-19
**Spec slug:** search-unit-tests
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/dynamic-search/` (S1, S2, S3). Hành vi cần giữ là hành vi của `src/index.ts` tại `5459d5a`. Các khối normative của `non-segmented-translation-guard`, `bilara-lang-param`, `get-sutta-unknown-uid` không bị đụng, xem §Vùng được bảo vệ.

## Context Recap

Requirements (Status: Reviewed) tách logic thuần của `search_topic` từ `src/index.ts` sang module mới `src/search.ts`, không đổi hành vi (FR-1..FR-5), rồi khóa hành vi đó bằng unit test `node:test` chạy offline qua `tsx` bằng `npm test` (FR-6..FR-13). Input của test là literal hoặc 9 response `/api/search/instant` ghi live và cắt bớt (FR-10, FR-11). Không thêm dependency, không mock `fetch`, không đổi output của năm tool hay `tools/list` (FR-4, NFR-1). Tài liệu đổi theo FR-14, FR-15, FR-17; `AGENTS.md` sửa cuối cùng rồi cập nhật contract khi người dùng authorize (FR-16).

Tài liệu này chốt các điểm requirements để lại cho design:

1. Module `src/search.ts`: export, chữ ký, cách chia hàm, vị trí `formatCitation()`. Nguyên văn, khối M1.
2. Handler `search_topic` sau khi tách, và vị trí của nó trong `src/index.ts`. Khối I1, H1 và §Lắp ráp.
3. Script `test` trong `package.json`. Khối P1.
4. File test `test/search.test.ts`, nguyên văn. Khối T1.
5. Định dạng fixture, danh sách 9 fixture, cách ghi, cách cắt, và bước kiểm thô so với đã cắt. Khối F1..F4.
6. Lệnh đột biến của FR-13 (khối V1) và A/B trùng byte với `5459d5a` (khối V2, V3).
7. Các khối sửa tài liệu và thứ tự áp dụng.
8. Bảng verify từ mỗi AC tới lệnh.
9. Gợi ý S1 của requirements review 2 (output `5459d5a` lưu kèm fixture): design **không lưu** output nào của `5459d5a`. Xem §Fixture, mục "Không lưu output `5459d5a`".

Mọi số đo và kết quả trong tài liệu này được đo trong phiên soạn design, **2026-10-19**, trên một bản dựng thử trong thư mục tạm ngoài repo (`/tmp/sut-design.*`):

- `git archive 148b8c0` (`src`, `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md`), `node_modules` symlink về repo. Node v22.17.0, tsx 4.21.0, typescript 5.9.3.
- Các khối M1, I1, H1, P1, T1 được ghi vào bản dựng thử đúng như trong tài liệu này. `npx tsc -p .` thoát 0.
- 9 fixture được ghi live lúc 2026-10-19T14:41Z bằng khối F2, cắt bằng F3, kiểm bằng F4. `npm test` thoát 0, `# pass 16`, `# fail 0`.
- Bốn đột biến (V1), build sạch, A/B 18 input với bản build `5459d5a` (V2), và mô phỏng các khối tài liệu.

## High-Level Design

```
search_topic(topic, language, match, page)                     src/index.ts (schema zod không đổi)
  ├─ { term, query } = resolveTopic(topic)                       src/search.ts  FR-1(a)
  ├─ query === "" → formatNoResults(topic, match, term)          src/search.ts  FR-1(g); KHÔNG gọi API
  ├─ data = await fetchSearch(query, language, searchOffset(match, page))   src/index.ts, đúng 1 lần
  └─ text = formatSearchResult({ topic, match, page }, term, data)          src/search.ts
        ├─ normalizeSearchResponse(data)       FR-1(b)  suttaplex/hits → [], total → 0, error.message
        ├─ selectPage(res, match, page)        FR-1(c)(d)  isSutta, khử trùng, cắt trang tiêu đề
        ├─ hasMore(res, match, page, titleCount) → footer   FR-1(e)
        └─ formatTitleMatch / formatContentMatch / formatNoResults / câu FR-20   FR-1(f)(g)

test/search.test.ts ──import──▶ src/search.ts ◀──import── src/index.ts
        │                         (không import gì)
        └─ readFileSync(test/fixtures/*.json)       (không mạng, không đụng globalThis.fetch)
```

Sáu quyết định trung tâm:

1. **`formatCitation()` chuyển sang `src/search.ts`, được export, và `src/index.ts` import lại.** `formatTitleMatch()` cần nó, mà `src/search.ts` không được import `src/index.ts` (FR-3). Thân hàm được chuyển nguyên văn, chỉ thêm `export`, nên output của `get_sutta`/`get_sutta_meta` không đổi (FR-4, kiểm bằng diff ở §Lắp ráp). Truyền `formatCitation` vào như tham số thì test phải tự viết lại một bản citation, tức test kiểm một bản sao chứ không kiểm code thật. Xem §Alternative A.
2. **Mỗi mục FR-1 (a)–(g) có ít nhất một hàm export; một hàm `formatSearchResult()` ghép tất cả.** Các closure của handler cũ (`hasCategory`, `takeNew`, footer, dòng thuật ngữ) trở thành hàm module-private. Test gọi được từng bước, ví dụ `hasMore()` với literal, `normalizeSearchResponse()` với body sai kiểu, và cũng gọi được toàn bộ đường đi qua `formatSearchResult()`. Bảng ở §API ánh xạ từng export tới mục FR-1.
3. **Handler giữ đúng ba lời gọi thuần và một lời gọi API.** `query === ""` vẫn là kiểm của handler (FR-2 bước 2), nên trong `src/index.ts` có thể đọc thấy ngay là nhánh rỗng return trước `await fetchSearch(`.
4. **Input của trang là một object `SearchInput = { topic, match, page }`.** Issue #19 (gắn nhãn blurb tiếng Anh khi `language=vi`) sẽ cần `language` ở formatter. Khi đó chỉ cần thêm một field vào `SearchInput` và vào chỗ gọi trong handler, không phải đổi thứ tự tham số. Spec này **không** thêm `language` (không có hành vi nào dùng nó).
5. **Fixture là một file JSON cho mỗi response: `{ url, recorded, body }`.** Không có file phụ, không lưu output `5459d5a`. 9 file, 52,333 byte đo ngày 2026-10-19.
6. **`npm test` = `tsx --test test/search.test.ts`, liệt kê file tường minh.** Không dựa vào glob của shell. Spec này chỉ có một file test.

Các issue #17, #18, #19, #20 chỉ là bối cảnh. Mỗi issue sẽ đổi output, và khi đó đổi đúng một chỗ trong `src/search.ts` cùng test tương ứng: #17 ở `selectPage()`, #18 ở `VI_TOPIC_TERMS`, #19 ở `formatTitleMatch()` cộng `SearchInput`, #20 ở `formatCitation()`. Spec này không làm issue nào.

### Đọc tối thiểu để implement

Các khối ràng buộc, đánh dấu **[NORMATIVE]** tại chỗ. Mỗi khối có một dòng neo `<!-- block: TÊN -->` ngay trước code fence, để trích bằng máy (§Lắp ráp, hàm `blk`):

1. §M1: `src/search.ts`, nguyên văn toàn file.
2. §I1, §H1 và §Lắp ráp: dòng import và handler trong `src/index.ts`, kiểm bằng một lệnh `diff` cho toàn file.
3. §P1: khối `scripts` của `package.json`.
4. §T1: `test/search.test.ts`, nguyên văn toàn file.
5. §Fixture: F1 (danh sách), F2 (ghi), F3 (cắt), F4 (kiểm thô so với đã cắt), bảng số đo.
6. §Khối sửa tài liệu: R-1, R-2, R-3, M-1, M-2, A-1a..A-1d, và §Thứ tự áp dụng.
7. §Testability: V1 (đột biến), V2/V3 (A/B), bảng verify.

### Câu hỏi mở

- **Q2 (của requirements, không chặn):** có type-check file test không? Design theo default của requirements: **không** thêm bước type-check vào `npm test`. Để biết khối T1 có lỗi kiểu không, đã chạy một lần trên bản dựng thử: `npx tsc --noEmit --strict --target ES2022 --module Node16 --moduleResolution Node16 --skipLibCheck --types node test/search.test.ts` thoát 0. Lệnh này không phải một bước của workflow. Nếu người dùng chọn có type-check, thay đổi gói gọn trong P1 (và có thể một `tsconfig` riêng cho `test/`), không khối nào khác phụ thuộc.

### Vùng được bảo vệ

Khối normative của spec tiền nhiệm vẫn nằm nguyên trong `src/index.ts`. Đo trên bản dựng thử, mỗi `diff` dưới đây rỗng (matcher lấy nguyên từ `specs/dynamic-search/design.md` §Vùng được bảo vệ):

| Khối | Matcher (so với design của spec đó) | Bản dựng thử |
|---|---|---|
| N5-T (kiểu `Segment`/`ExtractedText`) | `awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/'` | diff rỗng (8 dòng) |
| N1-A (`extractText()`) | `awk '/^function extractText/,/^}$/'` | diff rỗng (20 dòng) |
| N1-B (dòng gate) | `grep -c -F 'extracted.source !== "translation"'` = 1 | 1 |
| N3-A (`fetchBilaraText()`) | `awk '/^async function fetchBilaraText/,/^}$/'` | diff rỗng (6 dòng) |
| N3-B (khối retry) | `awk '/^    let extracted = extractText/,/^    }$/'` | diff rỗng (18 dòng) |
| U1 (not-found trong `get_sutta`) | `awk '/^    const \[suttaplex, bilaraData\] = await Promise.all\(\[/,/^    const citation = formatCitation\(suttaplex\);$/'` | diff rỗng (14 dòng) |
| dynamic-search S1 (`fetchSearch()`) | `awk '/^async function fetchSearch/,/^}$/'` | diff rỗng (7 dòng) |
| dynamic-search S3, phần schema | `awk '/^\/\/ Tool 1: search_topic$/,/^  async \(\{ topic, language, match, page \}\) => \{$/'` | diff rỗng (31 dòng) |

Mạnh hơn các matcher này là §Lắp ráp: lệnh đó khóa mọi dòng còn lại của `src/index.ts` vào `5459d5a`.

**S2 và S3 của dynamic-search đổi chỗ, không đổi nghĩa.**

- Toàn bộ S2 (hằng, bảng, hai formatter) nằm liên tục trong `src/search.ts`, chỉ thêm `export` ở `SEARCH_PAGE_SIZE`, `formatTitleMatch`, `formatContentMatch`. Lệnh đo (in `S2-PROVENANCE-OK` trên bản dựng thử):

  ```sh
  S2='/^\/\/ ─── Search: chủ đề/{f=1} f{print} f&&/^}$/{if(++n==2)exit}'
  diff <(awk "$S2" specs/dynamic-search/design.md \
         | sed -e 's/^const SEARCH_PAGE_SIZE/export const SEARCH_PAGE_SIZE/' -e 's/^function format/export function format/') \
       <(awk "$S2" src/search.ts) && echo S2-PROVENANCE-OK
  ```

- Thân handler S3 được thay bằng H1. Logic của nó chuyển vào M1, theo bảng §Ánh xạ handler cũ → M1.
- Lệnh §Lắp ráp của `specs/dynamic-search/design.md` không còn in `ASSEMBLY-OK` sau spec này. Đó là bước verify có ngày của spec kia, không phải bất biến chạy tiếp. Bất biến chạy tiếp là FR-5 (bảng grep ở §Testability).
- Văn xuôi và số dòng `src/index.ts:NNN` trong các spec tiền nhiệm là số đo có ngày, không sửa.

## Data Model

Không có entity lưu trữ. Các kiểu mới đều nằm trong M1:

| Kiểu | Hình dạng | Ràng buộc |
|---|---|---|
| `SearchMatch` | `"title" \| "content" \| "all"` | Trùng kiểu suy ra từ `z.enum(["title", "content", "all"])` của schema; handler truyền thẳng `match` (đã compile trên bản dựng thử) |
| `SearchInput` | `{ topic, match, page }` | `topic` là chuỗi caller gửi (chưa chuẩn hóa), vì header và câu FR-11/FR-20 in lại nguyên văn |
| `ResolvedTopic` | `{ term: string \| undefined; query: string }` | `term` có khi key khớp `VI_TOPIC_TERMS`; `query === ""` nghĩa là không gọi API |
| `SearchResponse` | `{ suttaplex: any[]; hits: any[]; total: number; errorMessage: string \| undefined }` | Kết quả của `normalizeSearchResponse()`; không bao giờ có mảng thiếu hay `total` không phải số |
| `SearchPage` | `{ titleCount; titlePage; contentPage }` | `titleCount` là số phần tử khớp tiêu đề sau lọc và khử trùng trên **mọi** trang, cần cho FR-18 |

Ba hằng của dynamic-search S2 chuyển sang M1 không đổi giá trị. `SEARCH_PAGE_SIZE` được export vì `fetchSearch()` trong `src/index.ts` đọc nó. `VI_TOPIC_TERMS` và `DIFFICULTY_NAMES` không export: không có nơi nào ngoài M1 cần chúng, và test quan sát bảng qua `resolveTopic()` và dòng `Chủ đề tiếng Việt có sẵn:`.

**Fixture** (`test/fixtures/<tên>.json`), xem §Fixture:

```json
{
  "url": "https://suttacentral.net/api/search/instant?query=…&language=…&limit=10[&offset=…]",
  "recorded": "YYYY-MM-DD",
  "body": { "total": …, "error": { … }, "suttaplex": [ … ], "hits": [ … ] }
}
```

`error` chỉ có khi response thô có nó. Mỗi phần tử chỉ giữ các field của FR-11 mà phần tử thô có, theo thứ tự của danh sách FR-11.

## API / Interface Contracts

Interface ra ngoài (`inputSchema` và text của năm tool) không đổi (FR-4). Interface mới là các export của `src/search.ts`:

| Export | Chữ ký | FR-1 | Thay cho (5459d5a) |
|---|---|---|---|
| `SEARCH_PAGE_SIZE` | `10` | — | `:43` |
| `resolveTopic` | `(topic: string) => ResolvedTopic` | (a) | `:209-212` (`key`, `term`, `query`) |
| `searchOffset` | `(match, page) => number` | (d) | `:231` |
| `normalizeSearchResponse` | `(data: any) => SearchResponse` | (b) | `:233-235`, cộng `error.message` của `:273-276` |
| `isSutta` | `(e: any) => boolean` | (c) | `:238-240` (`hasCategory` thành hàm private) |
| `selectPage` | `(res, match, page) => SearchPage` | (d) | `:242-257` (`takeNew` thành hàm private) |
| `hasMore` | `(res, match, page, titleCount) => boolean` | (e) | `:261-265` |
| `formatTitleMatch`, `formatContentMatch` | `(sp: any) => string`, `(hit: any) => string` | (f) | `:74-93`, nguyên văn |
| `formatCitation` | `(suttaplex: any) => string` | (f), dùng chung | `:127-140`, nguyên văn |
| `formatNoResults` | `(topic, match, term, errorMessage?) => string` | (g) | `:214-224` (`noResults`) |
| `formatSearchResult` | `(input: SearchInput, term, data: any) => string` | (b)–(g) ghép | `:266-291` |

Hàm private: `hasCategory`, `takeNew`, `formatFooter` (`:266-268`), `termLines` (`:212`).

### M1 — `src/search.ts` — **[NORMATIVE]**

File mới, nguyên văn từng ký tự, comment tính là một phần của luật. Không có lệnh `import`. Cấp module chỉ có khai báo (`const`, `function`, `type`), đúng FR-3.

<!-- block: M1 -->
```ts
// Logic thuần của tool search_topic (spec search-unit-tests): chuẩn hóa topic và response,
// lọc, phân trang, format. Module không import gì, không I/O, không giữ trạng thái ngoài các
// hằng khai báo ở đây. src/index.ts gọi API rồi đưa body vào; test/ import thẳng module này.

// ─── Search: chủ đề → /api/search/instant (spec dynamic-search) ──────────────

// Mỗi trang: tối đa 10 kết quả khớp tiêu đề + 10 kết quả khớp nội dung; cũng là `limit` gửi API.
export const SEARCH_PAGE_SIZE = 10;

// Chủ đề tiếng Việt → MỘT thuật ngữ tìm kiếm Anh/Pali. SSOT là bảng này; README/AGENTS.md chỉ
// trỏ về đây. Key: NFC, chữ thường, các từ cách nhau một dấu cách. Thuật ngữ mới phải cho ít
// nhất 1 kết quả sutta ở trang 1 (match=all) với cả language=en lẫn vi — đo trước khi thêm.
const VI_TOPIC_TERMS = new Map<string, string>([
  ["tứ diệu đế", "four noble truths"],
  ["khổ", "dukkha"],
  ["bát chánh đạo", "eightfold path"],
  ["vô ngã", "anatta"],
  ["chánh niệm", "satipatthana"],
  ["vô thường", "anicca"],
  ["từ bi", "metta"],
  ["duyên khởi", "dependent origination"],
  ["ngũ uẩn", "khandha"],
  ["niết bàn", "nibbana"],
  ["nghiệp", "kamma"],
  ["thiền", "jhana"],
  ["tam bảo", "three jewels"],
  ["quy y", "going for refuge"],
]);

// `suttaplex` của search mang `difficulty` dạng số; /api/suttaplex mang { name, level }.
const DIFFICULTY_NAMES = new Map<unknown, string>([
  [1, "beginner"],
  [2, "intermediate"],
  [3, "advanced"],
]);

// Khớp tiêu đề: citation đầy đủ qua formatCitation() trên BẢN SAO có difficulty đã đổi sang
// dạng { name } — formatCitation() giữ nguyên cho input /api/suttaplex.
export function formatTitleMatch(sp: any): string {
  const citation = formatCitation({ ...sp, difficulty: { name: DIFFICULTY_NAMES.get(sp.difficulty) } });
  return sp.blurb ? `${citation}\n→ ${sp.blurb}` : citation;
}

// Khớp nội dung: hit là MỘT bản văn (dịch hoặc gốc), không có blurb/difficulty/parallels —
// không bịa các dòng đó. `name` rỗng (bản Āgama) → `root_name`; thiếu `author` → bỏ dòng Text.
export function formatContentMatch(hit: any): string {
  const acronym = (typeof hit.acronym === "string" && hit.acronym) || hit.uid.toUpperCase();
  const title =
    (typeof hit.name === "string" && hit.name.trim()) ||
    (typeof hit.root_name === "string" && hit.root_name.trim()) ||
    "";
  const lines = [title ? `**${acronym}** — ${title}` : `**${acronym}**`];
  if (typeof hit.author === "string" && hit.author !== "") {
    lines.push(hit.lang ? `Text: ${hit.author} (${hit.lang})` : `Text: ${hit.author}`);
  }
  lines.push(`URL: https://suttacentral.net/${hit.uid}`);
  return lines.join("\n");
}

// ─── Citation dùng chung: get_sutta, get_sutta_meta (import từ đây) và khớp tiêu đề ───────

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

// ─── search_topic: từ topic và body response tới text output ─────────────────

export type SearchMatch = "title" | "content" | "all";
export type SearchInput = { topic: string; match: SearchMatch; page: number };
// `term`: thuật ngữ của VI_TOPIC_TERMS khi key khớp. `query`: chuỗi gửi API; "" thì không gọi API.
export type ResolvedTopic = { term: string | undefined; query: string };
// Body của /api/search/instant sau khi chuẩn hóa kiểu (dynamic-search FR-12).
export type SearchResponse = {
  suttaplex: any[];
  hits: any[];
  total: number;
  errorMessage: string | undefined;
};
// `titleCount`: số phần tử khớp tiêu đề sau lọc và khử trùng, trên mọi trang (cho FR-18).
export type SearchPage = { titleCount: number; titlePage: any[]; contentPage: any[] };

export function resolveTopic(topic: string): ResolvedTopic {
  // Key bảng: NFC → chữ thường → trim → gộp khoảng trắng, khớp CHÍNH XÁC. Không khớp: gửi
  // topic chỉ qua NFC + trim (giữ hoa/thường, khoảng trắng bên trong).
  const key = topic.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ");
  const term = VI_TOPIC_TERMS.get(key);
  return { term, query: term ?? topic.normalize("NFC").trim() };
}

// Trang tiêu đề cắt cục bộ (không cần offset); trang nội dung dùng offset của API.
export function searchOffset(match: SearchMatch, page: number): number {
  return match === "title" ? 0 : (page - 1) * SEARCH_PAGE_SIZE;
}

export function normalizeSearchResponse(data: any): SearchResponse {
  return {
    suttaplex: Array.isArray(data?.suttaplex) ? data.suttaplex : [],
    hits: Array.isArray(data?.hits) ? data.hits : [],
    total: typeof data?.total === "number" ? data.total : 0,
    errorMessage: typeof data?.error?.message === "string" ? data.error.message : undefined,
  };
}

// Loại dictionary (`category`), phần tử không có uid, bài viết (`is_article`).
function hasCategory(e: any): boolean {
  return typeof e === "object" && e !== null && "category" in e;
}

export function isSutta(e: any): boolean {
  return !hasCategory(e) && typeof e?.uid === "string" && e.uid !== "" && e.is_article !== true;
}

// Giữ phần tử đầu tiên của mỗi uid; `seen` truyền vào để khử trùng xuyên nhóm trong trang.
function takeNew(items: any[], seen: Set<string>): any[] {
  return items.filter((e) => {
    if (seen.has(e.uid)) return false;
    seen.add(e.uid);
    return true;
  });
}

export function selectPage(res: SearchResponse, match: SearchMatch, page: number): SearchPage {
  const titles = takeNew(res.suttaplex.filter(isSutta), new Set());
  const titlePage =
    match === "content"
      ? []
      : titles.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE);
  const contentPage =
    match === "title"
      ? []
      : takeNew(res.hits.filter(isSutta), new Set(titlePage.map((e) => e.uid)));
  return { titleCount: titles.length, titlePage, contentPage };
}

// Còn trang sau: chỉ suy từ response này. h đếm hit không có `category`, TRƯỚC khi lọc bài
// viết/uid; h > 0 chặn trường hợp upstream trả total = số suttaplex khi hits rỗng.
export function hasMore(res: SearchResponse, match: SearchMatch, page: number, titleCount: number): boolean {
  const offset = searchOffset(match, page);
  const h = res.hits.filter((e) => !hasCategory(e)).length;
  const moreTitles = page * SEARCH_PAGE_SIZE < titleCount;
  const moreContent = h > 0 && offset + h < res.total;
  return match === "title" ? moreTitles : match === "content" ? moreContent : moreTitles || moreContent;
}

function formatFooter(more: boolean, page: number): string {
  return more
    ? `Còn kết quả: gọi lại search_topic với page=${page + 1} (giữ nguyên topic, language, match).`
    : "Hết kết quả.";
}

function termLines(term: string | undefined): string[] {
  return term ? [`Thuật ngữ đã dùng để tìm trên SuttaCentral: "${term}"`] : [];
}

// Câu không có kết quả (FR-11): `topic` rỗng (không gọi API, không footer) hoặc trang 1 rỗng.
// `errorMessage`: lỗi truy vấn SC báo trong body, nếu có.
export function formatNoResults(
  topic: string,
  match: SearchMatch,
  term: string | undefined,
  errorMessage?: string
): string {
  return [
    `Không tìm thấy sutta nào cho chủ đề "${topic}".`,
    ...termLines(term),
    ...(errorMessage !== undefined ? [`SuttaCentral báo lỗi truy vấn: ${errorMessage}`] : []),
    "",
    `Gợi ý: search của SuttaCentral hiểu thuật ngữ tiếng Anh hoặc Pali — thử lại với thuật ngữ tương ứng (ví dụ "satipatthana", "dependent origination").`,
    ...(match !== "all"
      ? [`Đang dùng match="${match}" — thử match="all" để xem cả khớp tiêu đề lẫn khớp nội dung.`]
      : []),
    `Chủ đề tiếng Việt có sẵn: ${[...VI_TOPIC_TERMS.keys()].join(", ")}`,
  ].join("\n");
}

// Text output của một trang từ body response thô (`data` là JSON đã parse, chưa kiểm kiểu).
export function formatSearchResult(input: SearchInput, term: string | undefined, data: any): string {
  const { topic, match, page } = input;
  const res = normalizeSearchResponse(data);
  const { titleCount, titlePage, contentPage } = selectPage(res, match, page);
  const footer = formatFooter(hasMore(res, match, page, titleCount), page);

  const n = titlePage.length + contentPage.length;
  if (n === 0 && page === 1) {
    return [formatNoResults(topic, match, term, res.errorMessage), "", footer].join("\n");
  }
  if (n === 0) {
    return [`Không có kết quả sutta ở trang ${page} cho chủ đề "${topic}".`, "", footer].join("\n");
  }
  const lines = [`Tìm thấy ${n} sutta cho chủ đề "${topic}" (trang ${page}):`, ...termLines(term), ""];
  if (titlePage.length > 0) {
    lines.push("Khớp tiêu đề:", "");
    for (const sp of titlePage) lines.push(formatTitleMatch(sp), "");
  }
  if (contentPage.length > 0) {
    lines.push("Khớp nội dung:", "");
    for (const hit of contentPage) lines.push(formatContentMatch(hit), "");
  }
  lines.push(footer);
  return lines.join("\n");
}
```

Tính chất cần giữ, vì compiler không bắt được:

- **`formatSearchResult()` nhận body thô.** Nó tự gọi `normalizeSearchResponse()`, nên handler không cần biết hình dạng response. Bước kiểm F4 cũng dựa vào điều này: cùng một hàm chạy trên body thô và body đã cắt.
- **`hasMore()` tự tính `offset` bằng `searchOffset()`.** Handler cũng dùng `searchOffset()` để gọi API. Một định nghĩa offset duy nhất cho cả request lẫn luật FR-18.
- **`formatNoResults()` trả chuỗi, không trả mảng dòng.** Ở trang 1 rỗng, `[formatNoResults(…), "", footer].join("\n")` cho đúng chuỗi mà `[...noResults(scError), "", footer].join("\n")` của `5459d5a` cho, vì mảng của `noResults` luôn có ít nhất 3 phần tử. A/B đo trên `xyzzyqq`, `foo:bar`, `vô ngã tướng`.
- **`normalizeSearchResponse()` đọc `error.message` sớm**, còn `5459d5a` chỉ đọc nó trong nhánh trang 1 rỗng. `data` là JSON đã parse, không có getter, nên đọc sớm không đổi gì ngoài thứ tự. Chuỗi lỗi vẫn chỉ được **in** trong nhánh trang 1 rỗng.
- **Chuỗi trong M1 không chứa** `segmented`, `sujato`, tên dịch giả của FR-5, `search/instant?`, hay `fetch(`. Comment mở đầu S2 có `/api/search/instant (spec`, không có `?`. Bản dựng thử: cả năm lệnh grep của FR-5 cho 0 trên `src/search.ts`.

#### Ánh xạ handler cũ → M1

| `5459d5a` | Sau |
|---|---|
| `:209-211` `key`, `term`, `query` | `resolveTopic()`, cùng biểu thức |
| `:212` `termLine` | `termLines(term)`; gọi ở `formatNoResults()` và header, như cũ |
| `:214-224` `noResults(scError)` | `formatNoResults(topic, match, term, errorMessage?)`; `scError` (mảng 0/1 dòng) thành `errorMessage` (chuỗi hoặc `undefined`), dòng in ra dựng bên trong |
| `:226-228` nhánh `query === ""` | handler (H1), gọi `formatNoResults(topic, match, term)`; `term` luôn `undefined` khi `query === ""`, vì mọi thuật ngữ của bảng khác rỗng |
| `:231` `offset` | `searchOffset()` |
| `:233-235` ba dòng chuẩn hóa | `normalizeSearchResponse()` |
| `:238-247` `hasCategory`, `isSutta`, `takeNew` | hàm cấp module, cùng thân |
| `:249-257` `titles`, `titlePage`, `contentPage` | `selectPage()`, cùng biểu thức; `titles.length` trả ra thành `titleCount` |
| `:261-265` `h`, `moreTitles`, `moreContent`, `more` | `hasMore()`, cùng biểu thức |
| `:266-268` `footer` | `formatFooter(more, page)` |
| `:270-291` `n`, ba nhánh, `lines` | `formatSearchResult()`, cùng thứ tự dòng và cùng literal |

### I1, H1 — `src/index.ts` — **[NORMATIVE]**

Dòng import, đặt ngay sau `import { z } from "zod";`:

<!-- block: I1 -->
```ts
import { SEARCH_PAGE_SIZE, formatCitation, formatNoResults, formatSearchResult, resolveTopic, searchOffset } from "./search.js";
```

Thân handler, thay `async ({ topic, language, match, page }) => { … }` của `5459d5a` (`:206-294`). Schema zod, chuỗi `describe()` và dòng `);` đóng `server.tool(` giữ nguyên:

<!-- block: H1 -->
```ts
  async ({ topic, language, match, page }) => {
    // Logic thuần nằm ở src/search.ts (spec search-unit-tests); handler chỉ gọi API và nối.
    const { term, query } = resolveTopic(topic);
    if (query === "") {
      return { content: [{ type: "text", text: formatNoResults(topic, match, term) }] };
    }
    const data = await fetchSearch(query, language, searchOffset(match, page));
    const text = formatSearchResult({ topic, match, page }, term, data);
    return { content: [{ type: "text", text }] };
  }
```

Tính chất:

- Đúng một `await fetchSearch(`, và nhánh `query === ""` return trước nó (FR-2, AC-2).
- `src/index.ts` không còn literal output nào của search (FR-2). Chuỗi `describe()` của `page` (`'Còn kết quả',`) vẫn còn.
- Hai object `{ content: [{ type: "text", … }] }` được SDK kiểm theo kiểu callback của `server.tool()`, giống hai `return` của `5459d5a`. Compile trên bản dựng thử: thoát 0.

### Lắp ráp — **[NORMATIVE]**

`src/index.ts` sau thay đổi phải **trùng từng byte** với file lắp từ `5459d5a` và hai khối I1, H1. `src/search.ts` và `test/search.test.ts` phải trùng M1 và T1. Hàm `blk` trích nội dung code fence ngay sau dòng neo `<!-- block: TÊN -->` của tài liệu này:

```sh
REPO=$(git rev-parse --show-toplevel); D="$REPO/specs/search-unit-tests/design.md"
blk() { awk -v id="<!-- block: $1 -->" '$0==id{f=1;next} f&&/^```/{if(o)exit;o=1;next} f&&o{print}' "$D"; }
OLD=$(mktemp); git -C "$REPO" show 5459d5a:src/index.ts > "$OLD"
{ sed -n '1,4p' "$OLD"; blk I1; sed -n '5,39p' "$OLD"; sed -n '95,126p' "$OLD"; sed -n '142,205p' "$OLD"; blk H1; sed -n '295,$p' "$OLD"; } \
  | diff - "$REPO/src/index.ts" && echo ASSEMBLY-OK
diff <(blk M1) "$REPO/src/search.ts" && echo SEARCH-OK
diff <(blk T1) "$REPO/test/search.test.ts" && echo TEST-OK
diff <(blk P1) <(awk '/^  "scripts": \{$/,/^  },$/' "$REPO/package.json") && echo SCRIPTS-OK
diff <(git -C "$REPO" show 5459d5a:src/index.ts | awk '/^function formatCitation/,/^}$/' | sed 's/^function/export function/') \
     <(awk '/^export function formatCitation/,/^}$/' "$REPO/src/search.ts") && echo CITATION-OK
rm -f "$OLD"     # 5459d5a: 584 dòng; src/index.ts mới: 436 dòng; src/search.ts: 212 dòng
```

Đã chạy trên bản dựng thử: in đủ `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `SCRIPTS-OK`, `CITATION-OK`. Các đoạn của `5459d5a` mà lệnh **bỏ**: `:40-94` (section search, sang M1), `:127-141` (`formatCitation()` và dòng trống sau nó, sang M1), `:206-294` (thân handler, thay bằng H1). Mọi dòng còn lại trùng `5459d5a`, nên FR-4 ở mức code cho bốn tool kia và mọi vùng ở §Vùng được bảo vệ được giữ. Số dòng trỏ vào một commit bất biến, nên không trôi.

### P1 — `package.json` — **[NORMATIVE]**

Khối `scripts` sau thay đổi. Chỉ thêm dòng `test` và dấu phẩy ở dòng `start` (NFR-1). Dependency, devDependency, `engines` và `package-lock.json` không đổi.

<!-- block: P1 -->
```json
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "tsx --test test/search.test.ts"
  },
```

`git diff 5459d5a -- package.json` trên bản dựng thử: `-    "start": "node dist/index.js"`, `+    "start": "node dist/index.js",`, `+    "test": "tsx --test test/search.test.ts"`.

Runner in TAP khi stdout không phải TTY (mọi lệnh verify dưới đây ghi ra file), và in dạng `spec` khi chạy trong terminal. Cả hai dạng đều có tên case, và mã thoát là tiêu chí chính.

### T1 — `test/search.test.ts` — **[NORMATIVE]**

16 case. Mỗi case có tên bắt đầu bằng id FR của dynamic-search (FR-12, AC-3). Expected value là literal lấy từ hai nguồn: literal của dynamic-search (S2, S3, §Bố cục output, AC-15) và số đo của fixture ở bảng §Fixture. Không expected value nào được chép từ output của code mới (FR-12).

<!-- block: T1 -->
```ts
// Unit test offline cho logic thuần của search_topic (spec search-unit-tests). Mỗi case mang
// tiền tố id FR của specs/dynamic-search/requirements.md. Fixture: response /api/search/instant
// ghi live rồi cắt (test/fixtures/, xem specs/search-unit-tests/design.md §Fixture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatContentMatch,
  formatNoResults,
  formatSearchResult,
  formatTitleMatch,
  hasMore,
  isSutta,
  normalizeSearchResponse,
  resolveTopic,
  searchOffset,
  selectPage,
  type SearchMatch,
} from "../src/search.js";

type Fixture = { url: string; recorded: string; body: any };

function load(name: string): Fixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

function render(name: string, topic: string, match: SearchMatch, page: number): string {
  return formatSearchResult({ topic, match, page }, resolveTopic(topic).term, load(name).body);
}

const URL_PREFIX = "URL: https://suttacentral.net/";
const uidsOf = (text: string) =>
  text
    .split("\n")
    .filter((l) => l.startsWith(URL_PREFIX))
    .map((l) => l.slice(URL_PREFIX.length));
const lastLine = (text: string) => text.slice(text.lastIndexOf("\n") + 1);

const MORE = (p: number) =>
  `Còn kết quả: gọi lại search_topic với page=${p} (giữ nguyên topic, language, match).`;
const END = "Hết kết quả.";
const HINT =
  'Gợi ý: search của SuttaCentral hiểu thuật ngữ tiếng Anh hoặc Pali — thử lại với thuật ngữ tương ứng (ví dụ "satipatthana", "dependent origination").';
const KEYS =
  "Chủ đề tiếng Việt có sẵn: tứ diệu đế, khổ, bát chánh đạo, vô ngã, chánh niệm, vô thường, từ bi, duyên khởi, ngũ uẩn, niết bàn, nghiệp, thiền, tam bảo, quy y";
const EMPTY_BODY = { suttaplex: [], hits: [], total: 0, errorMessage: undefined };

test("FR-3: key tiếng Việt được chuẩn hóa NFC, chữ thường, trim, gộp khoảng trắng rồi khớp chính xác", () => {
  const nfc = "vô ngã".normalize("NFC");
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfd, nfc);
  for (const topic of ["Vô Ngã", "  vô   ngã  ", nfd, nfc]) {
    assert.deepEqual(resolveTopic(topic), { term: "anatta", query: "anatta" }, topic);
  }
});

test("FR-3: chủ đề không trùng key thì không ánh xạ", () => {
  for (const topic of ["thiện", "vo nga", "thiền định"]) {
    assert.deepEqual(resolveTopic(topic), { term: undefined, query: topic }, topic);
  }
});

test("FR-4: topic không khớp được gửi sau NFC + trim, giữ hoa/thường và khoảng trắng bên trong", () => {
  assert.deepEqual(resolveTopic("  Four  Noble Truths\t"), { term: undefined, query: "Four  Noble Truths" });
  const nfdTopic = " Thiền Định ".normalize("NFD");
  assert.notEqual(nfdTopic.trim(), "Thiền Định".normalize("NFC"));
  assert.deepEqual(resolveTopic(nfdTopic), { term: undefined, query: "Thiền Định".normalize("NFC") });
  assert.deepEqual(resolveTopic("   "), { term: undefined, query: "" });
});

test("FR-7: phần tử dictionary, bài viết, thiếu uid hoặc uid rỗng không phải sutta", () => {
  assert.equal(isSutta({ uid: "mn10" }), true);
  assert.equal(isSutta({ uid: "mn10", is_article: null }), true);
  assert.equal(isSutta({ uid: "mn10", category: "dictionary" }), false);
  assert.equal(isSutta({ uid: null, category: "dictionary" }), false);
  assert.equal(isSutta({ uid: "subjects", is_article: true }), false);
  assert.equal(isSutta({ uid: "" }), false);
  assert.equal(isSutta({}), false);
  assert.equal(isSutta(null), false);
});

test("FR-7: dictionary (nibbana, metta) và 4 bài viết (anatta) không xuất hiện trong output", () => {
  const nibbana = load("nibbana-en-0").body;
  assert.equal(nibbana.hits[0].category, "dictionary");
  assert.deepEqual(uidsOf(render("nibbana-en-0", "nibbana", "content", 1)), [
    "an3.32", "an3.35", "an3.36", "an3.39", "an3.55", "an3.57", "an3.60", "an4.1",
  ]);

  const metta = load("metta-en-0").body;
  assert.equal(metta.hits[0].category, "dictionary");
  assert.equal(uidsOf(render("metta-en-0", "metta", "content", 1)).length, 7);

  const articles = ["general-guide-sujato", "sn-guide-sujato", "subjects", "terminology"];
  const anattaHits = load("anatta-en-0").body.hits;
  assert.deepEqual(anattaHits.filter((e: any) => e.is_article === true).map((e: any) => e.uid), articles);
  const text = render("anatta-en-0", "anatta", "all", 1);
  assert.deepEqual(uidsOf(text), [
    "an6.100", "sn22.14", "sn22.143", "sn22.68", "sn23.17", "sn46.73",
    "thi-ap4", "an3.136", "an7.18", "an7.20", "an10.60",
  ]);
  for (const uid of [...articles, "null", "?"]) assert.ok(!text.includes(`suttacentral.net/${uid}\n`), uid);
  assert.ok(!text.includes("**?**"));
});

test("FR-6: trang tiêu đề mindfulness 1..4 có 10/10/10/2 uid, hợp lại 32 uid khác nhau", () => {
  const res = normalizeSearchResponse(load("mindfulness-en-0").body);
  assert.equal(res.suttaplex.length, 32);
  const pages = [1, 2, 3, 4].map((p) => selectPage(res, "title", p).titlePage.map((e) => e.uid));
  assert.deepEqual(pages.map((p) => p.length), [10, 10, 10, 2]);
  assert.equal(new Set(pages.flat()).size, 32);
  assert.equal(pages[0][0], "an1.575-615");
  assert.ok(pages[1].includes("dn22") && pages[1].includes("mn10"));
  assert.deepEqual(pages[3], ["uvs15", "vb7"]);
  assert.deepEqual(selectPage(res, "title", 1).contentPage, []);
});

test("FR-6: ở match=all hit trùng uid với trang tiêu đề bị bỏ; trong một trang không uid nào lặp", () => {
  const res = normalizeSearchResponse({
    suttaplex: [{ uid: "a" }, { uid: "b" }, { uid: "a" }],
    hits: [{ uid: "b" }, { uid: "c" }, { uid: "c" }, { uid: "d" }],
    total: 4,
  });
  const all = selectPage(res, "all", 1);
  assert.deepEqual(all.titlePage.map((e) => e.uid), ["a", "b"]);
  assert.deepEqual(all.contentPage.map((e) => e.uid), ["c", "d"]);
  assert.equal(all.titleCount, 2);
  assert.deepEqual(selectPage(res, "content", 1).titlePage, []);
  assert.deepEqual(selectPage(res, "content", 1).contentPage.map((e) => e.uid), ["b", "c", "d"]);

  for (const [name, topic] of [["mindfulness-en-0", "mindfulness"], ["anatta-en-0", "anatta"], ["metta-en-0", "metta"]]) {
    const uids = uidsOf(render(name, topic, "all", 1));
    assert.equal(new Set(uids).size, uids.length, name);
  }
});

test("FR-8: citation khớp tiêu đề: difficulty số → tên, giá trị khác → unknown, dòng blurb chỉ khi khác rỗng", () => {
  const sp = {
    uid: "mn10",
    acronym: "MN 10",
    translated_title: "Mindfulness Meditation",
    original_title: "Satipaṭṭhānasutta",
    blurb: "Blurb.",
    parallel_count: 16,
    difficulty: 2,
  };
  assert.equal(
    formatTitleMatch(sp),
    "**MN 10** — Mindfulness Meditation\nDifficulty: intermediate | Parallels: 16\nURL: https://suttacentral.net/mn10\n→ Blurb."
  );
  assert.equal(sp.difficulty, 2);
  const difficultyLine = (difficulty: unknown) =>
    formatTitleMatch({ ...sp, difficulty, blurb: "" }).split("\n")[1];
  assert.equal(difficultyLine(1), "Difficulty: beginner | Parallels: 16");
  assert.equal(difficultyLine(3), "Difficulty: advanced | Parallels: 16");
  for (const d of [null, undefined, 0, 4, "2", { name: "beginner" }]) {
    assert.equal(difficultyLine(d), "Difficulty: unknown | Parallels: 16", String(d));
  }
  assert.equal(
    formatTitleMatch({ ...sp, blurb: "" }),
    "**MN 10** — Mindfulness Meditation\nDifficulty: intermediate | Parallels: 16\nURL: https://suttacentral.net/mn10"
  );
});

test("FR-9: hai khối metta của AC-15 (SA 264, CND8)", () => {
  const lines = render("metta-en-0", "metta", "all", 1).split("\n");
  const sa = lines.indexOf("**SA 264** — 小土塼");
  assert.ok(sa >= 0);
  assert.deepEqual(lines.slice(sa, sa + 3), [
    "**SA 264** — 小土塼",
    "Text: Bhikkhu Anālayo (en)",
    "URL: https://suttacentral.net/sa264",
  ]);
  const cnd = lines.indexOf("**CND8** — Exposition of the Questions of the Student  Mettagū");
  assert.ok(cnd >= 0);
  assert.equal(lines[cnd + 1], "URL: https://suttacentral.net/cnd8");
});

test("FR-9: hit có name và root_name rỗng in dòng tiêu đề đúng **{acronym}**; name được trim", () => {
  const hit = { uid: "sa1", acronym: "SA 1", name: "", root_name: "", author: "X", lang: "en" };
  assert.equal(formatContentMatch(hit), "**SA 1**\nText: X (en)\nURL: https://suttacentral.net/sa1");
  assert.equal(
    formatContentMatch({ ...hit, name: "  Padded  ", author: null }),
    "**SA 1** — Padded\nURL: https://suttacentral.net/sa1"
  );
});

test("FR-10: header, dòng thuật ngữ chỉ khi key khớp, dòng nhóm chỉ khi nhóm khác rỗng", () => {
  const title = render("mindfulness-en-0", "mindfulness", "title", 1);
  const tl = title.split("\n");
  assert.equal(tl[0], 'Tìm thấy 10 sutta cho chủ đề "mindfulness" (trang 1):');
  assert.deepEqual(tl.slice(1, 4), ["", "Khớp tiêu đề:", ""]);
  assert.ok(!title.includes("Khớp nội dung:"));
  assert.ok(!title.includes("1461"));

  const content = render("mindfulness-en-0", "mindfulness", "content", 1);
  assert.deepEqual(content.split("\n").slice(0, 4), [
    'Tìm thấy 8 sutta cho chủ đề "mindfulness" (trang 1):',
    "",
    "Khớp nội dung:",
    "",
  ]);
  assert.ok(!content.includes("Khớp tiêu đề:"));

  const vi = render("anatta-en-0", "vô ngã", "all", 1).split("\n");
  assert.deepEqual(vi.slice(0, 4), [
    'Tìm thấy 11 sutta cho chủ đề "vô ngã" (trang 1):',
    'Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"',
    "",
    "Khớp tiêu đề:",
  ]);
  assert.ok(vi.indexOf("Khớp tiêu đề:") < vi.indexOf("Khớp nội dung:"));
});

test("FR-11: trang 1 không có kết quả, topic rỗng, lỗi truy vấn của SC, gợi ý match", () => {
  assert.equal(
    render("xyzzyqq-en-0", "xyzzyqq", "all", 1),
    ['Không tìm thấy sutta nào cho chủ đề "xyzzyqq".', "", HINT, KEYS, "", END].join("\n")
  );
  assert.equal(formatNoResults("", "all", undefined), ['Không tìm thấy sutta nào cho chủ đề "".', "", HINT, KEYS].join("\n"));
  assert.equal(
    formatNoResults("   ", "title", undefined).split("\n")[0],
    'Không tìm thấy sutta nào cho chủ đề "   ".'
  );
  assert.deepEqual(render("foo-bar-en-0", "foo:bar", "all", 1).split("\n").slice(0, 2), [
    'Không tìm thấy sutta nào cho chủ đề "foo:bar".',
    'SuttaCentral báo lỗi truy vấn: Unknown filter: "foo:"',
  ]);
  assert.equal(
    render("vo-nga-tuong-vi-0", "vô ngã tướng", "content", 1),
    [
      'Không tìm thấy sutta nào cho chủ đề "vô ngã tướng".',
      "",
      HINT,
      'Đang dùng match="content" — thử match="all" để xem cả khớp tiêu đề lẫn khớp nội dung.',
      KEYS,
      "",
      END,
    ].join("\n")
  );
  assert.ok(!render("xyzzyqq-en-0", "xyzzyqq", "all", 1).includes("Đang dùng match="));
  assert.ok(render("xyzzyqq-en-0", "xyzzyqq", "title", 1).includes('Đang dùng match="title"'));
  assert.equal(
    formatNoResults("vô ngã", "all", "anatta").split("\n")[1],
    'Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"'
  );
});

test("FR-12: body thiếu hoặc sai kiểu được xử lý như rỗng/0", () => {
  for (const data of [undefined, null, "abc", {}, { suttaplex: {}, hits: "x", total: "5", error: { message: 1 } }]) {
    assert.deepEqual(normalizeSearchResponse(data), EMPTY_BODY, JSON.stringify(data));
  }
  assert.equal(
    formatSearchResult({ topic: "x", match: "all", page: 1 }, undefined, { hits: null, total: "9" }),
    ['Không tìm thấy sutta nào cho chủ đề "x".', "", HINT, KEYS, "", END].join("\n")
  );
});

test("FR-18: luật trang sau chỉ suy từ response hiện tại", () => {
  const m1450 = load("mindfulness-en-1450");
  assert.equal(new URL(m1450.url).searchParams.get("offset"), "1450");
  assert.equal(searchOffset("content", 146), 1450);
  assert.deepEqual([m1450.body.total, m1450.body.hits.length], [1461, 9]);
  assert.equal(lastLine(render("mindfulness-en-1450", "mindfulness", "content", 146)), MORE(147));

  const m1460 = load("mindfulness-en-1460");
  assert.equal(new URL(m1460.url).searchParams.get("offset"), "1460");
  assert.equal(searchOffset("content", 147), 1460);
  assert.deepEqual([m1460.body.total, m1460.body.hits.length], [1460, 0]);
  assert.equal(lastLine(render("mindfulness-en-1460", "mindfulness", "content", 147)), END);

  const vo = load("vo-nga-tuong-vi-0").body;
  assert.deepEqual([vo.total, vo.suttaplex.length, vo.hits.length], [1, 1, 0]);
  assert.equal(hasMore(normalizeSearchResponse(vo), "content", 1, 1), false);
  assert.equal(lastLine(render("vo-nga-tuong-vi-0", "vô ngã tướng", "content", 1)), END);

  assert.equal(searchOffset("title", 3), 0);
  assert.equal(lastLine(render("mindfulness-en-0", "mindfulness", "title", 3)), MORE(4));
  assert.equal(lastLine(render("mindfulness-en-0", "mindfulness", "title", 4)), END);

  assert.equal(lastLine(render("mindfulness-en-1450", "mindfulness", "all", 146)), MORE(147));
  const one = { uid: "a" };
  assert.equal(hasMore({ ...EMPTY_BODY }, "all", 1, 11), true);
  assert.equal(hasMore({ ...EMPTY_BODY, hits: [one], total: 20 }, "all", 2, 0), true);
  assert.equal(hasMore({ ...EMPTY_BODY, hits: [one], total: 11 }, "all", 2, 10), false);
});

test("FR-19: footer chính xác là dòng cuối, không có newline sau", () => {
  const more = render("mindfulness-en-0", "mindfulness", "all", 1);
  assert.equal(uidsOf(more).length, 18);
  assert.ok(more.endsWith(`\n\n${MORE(2)}`));
  const end = render("mindfulness-en-0", "mindfulness", "title", 4);
  assert.ok(end.endsWith(`\n\n${END}`));
});

test("FR-20: trang sau trống in câu riêng rồi footer", () => {
  assert.equal(
    render("mindfulness-en-0", "mindfulness", "title", 5),
    `Không có kết quả sutta ở trang 5 cho chủ đề "mindfulness".\n\n${END}`
  );
  assert.equal(
    render("mindfulness-en-1460", "mindfulness", "content", 147),
    `Không có kết quả sutta ở trang 147 cho chủ đề "mindfulness".\n\n${END}`
  );
});
```

Ghi chú về T1:

- **Chuỗi NFD được dựng bằng `.normalize("NFD")`, không viết bằng escape hay ký tự tổ hợp trong source.** Mỗi case NFD có một `assert.notEqual(nfd, nfc)` làm điều kiện tiên quyết: nếu editor hay công cụ nào chuẩn hóa source, case fail rõ ràng thay vì pass vô nghĩa. Đây là lý do T1 không chứa ký tự tổ hợp nào.
- **Điều kiện tiên quyết về fixture nằm ngay trong case dùng nó** (`hits[0].category`, `total`, số phần tử, `offset` trong `url`). Nếu fixture ghi lại khác bảng §Fixture, case fail ở dòng đó và chỉ ra fixture nào đã trôi.
- **T1 không chứa chuỗi `fetch` hay `src/index`** (AC-1). Comment đầu file chỉ trỏ tới design này.
- Phủ FR-12 (bảng của requirements) theo case:

| FR | Case | Mục "nội dung tối thiểu" |
|---|---|---|
| FR-3 | 2 case đầu | `Vô Ngã`, `  vô   ngã  `, NFD → `anatta`; `thiện`, `vo nga`, `thiền định` không ánh xạ |
| FR-4 | 1 | NFC + trim, giữ hoa/thường và khoảng trắng bên trong; NFD không khớp key được gửi ở dạng NFC |
| FR-7 | 2 | `isSutta` với literal (thiếu `uid`, `uid` rỗng, `category`, `is_article`); dictionary của `nibbana`, `metta`; 4 bài viết của `anatta` |
| FR-6 | 2 | `mindfulness` `title` trang 1..4: 10/10/10/2, 32 `uid` khác nhau; khử trùng `all` với literal; không `uid` lặp trong output của 3 fixture |
| FR-8 | 1 | `difficulty` 1/2/3 → tên; `null`, `undefined`, 0, 4, `"2"`, object → `unknown`; dòng `→` chỉ khi blurb khác rỗng; input không bị sửa |
| FR-9 | 2 | khối `SA 264` và `CND8` của AC-15; `name`/`root_name` rỗng → `**{acronym}**`; `name` được trim |
| FR-10 | 1 | header `title` trang 1 đúng literal và không chứa `1461`; dòng thuật ngữ chỉ khi key khớp; dòng nhóm chỉ khi nhóm khác rỗng |
| FR-11 | 1 | `xyzzyqq` nguyên văn; `topic` rỗng (không footer); `topic` toàn khoảng trắng; `foo:bar` kèm lỗi SC; `vô ngã tướng` `content` nguyên văn; gợi ý `match` chỉ khi khác `all` |
| FR-12 | 1 | `undefined`, `null`, chuỗi, `{}`, mảng là object, `total` là chuỗi, `error.message` không phải chuỗi |
| FR-18 | 1 | trang 146 còn, 147 hết; `vô ngã tướng` `content` hết (`h = 0`); `title` trang 3 còn, 4 hết; `all` còn khi một nguồn còn |
| FR-19 | 1 | footer `page=2` và `Hết kết quả.` là dòng cuối, có dòng trống trước, không newline sau |
| FR-20 | 1 | `title` trang 5, `content` trang 147: câu FR-20 rồi footer, nguyên văn |

## Fixture

### Định dạng và quy tắc

- Một file JSON cho mỗi response, trong `test/fixtures/`. Tên `<query-slug>-<language>-<offset>.json`. Ba key theo thứ tự `url`, `recorded`, `body` (Data Model). JSON thụt lề 2 dấu cách, có newline cuối file. Đây là đầu ra của F3, không viết tay.
- `url` là URL đầy đủ mà `fetchSearch()` phát cho input tương ứng: dựng bằng `URLSearchParams` với `query`, `language`, `limit=10`, thêm `offset` khi > 0. `recorded` là ngày ghi (`date +%F`).
- `body` giữ field theo FR-11. Bỏ `translations`, `highlight`, `fuzzy_dictionary` và mọi field khác.
- **Không lưu output `5459d5a`.** Requirements FR-12 cho phép, nhưng bảng FR-12 chỉ cần nguồn mặc định (literal của dynamic-search cộng số đo fixture), và T1 chỉ dùng nguồn đó. Không có file phụ trong `test/fixtures/`: 9 fixture là 9 file, dưới trần 10 file của NFR-4. Nếu sau này cần lưu output, nó phải là một field nữa **trong cùng file fixture** (để `cat test/fixtures/* | wc -c` đếm nó và số file không đổi), và phải đo lại trần 65536 byte. Không đặt file output cạnh fixture hay ở thư mục khác.
- Chỉ ghi lại một fixture khi một thay đổi code cần dạng response mới (NFR-4). Không ghi lại theo lịch. Script ghi chỉ nằm ở thư mục tạm.

### Số đo của 9 fixture (2026-10-19T14:41Z)

Tất cả đều HTTP 200 ở lần ghi đầu. `query=` là phần query string sau `https://suttacentral.net/api/search/instant?`.

| File | Query string | `total` | `suttaplex` | `hits` | Đặc điểm T1 dùng | Byte |
|---|---|---|---|---|---|---|
| `nibbana-en-0.json` | `query=nibbana&language=en&limit=10` | 456 | 16 (đầu `an4.179`) | 9; `hits[0]` dictionary, `uid: null`; còn `an3.32` … `an4.1` | FR-7 | 7041 |
| `anatta-en-0.json` | `query=anatta&language=en&limit=10` | 145 | 6 (`an6.100` … `sn46.73`) | 10: 1 dictionary, 4 `is_article: true`, rồi `thi-ap4`, `an3.136`, `an7.18`, `an7.20`, `an10.60` | FR-7, FR-10 | 4087 |
| `metta-en-0.json` | `query=metta&language=en&limit=10` | 88 | 8 | 8: 1 dictionary, `sa264` (`name: ""`), …, `cnd8` (`acronym: null`, `author: null`, `name` có khoảng trắng cuối) | FR-7, FR-9 | 4708 |
| `xyzzyqq-en-0.json` | `query=xyzzyqq&language=en&limit=10` | 0 | 0 | 0 | FR-11 | 191 |
| `foo-bar-en-0.json` | `query=foo%3Abar&language=en&limit=10` | 0 | 0 | 0, `error.message` = `Unknown filter: "foo:"` | FR-11 | 497 |
| `mindfulness-en-0.json` | `query=mindfulness&language=en&limit=10` | 1461 | 32 (`an1.575-615` … `vb7`) | 8 (`an1.296-305` … `an3.33`) | FR-6, FR-10, FR-18, FR-19, FR-20 | 12222 |
| `mindfulness-en-1450.json` | `…&limit=10&offset=1450` | 1461 | 32 | 9 (`vb10` … `ya10.1.2`) | FR-18 | 12608 |
| `mindfulness-en-1460.json` | `…&limit=10&offset=1460` | 1460 | 32 | 0 | FR-18, FR-20 | 10299 |
| `vo-nga-tuong-vi-0.json` | `query=v%C3%B4+ng%C3%A3+t%C6%B0%E1%BB%9Bng&language=vi&limit=10` | 1 | 1 (`sn22.59`) | 0 | FR-11, FR-18 | 680 |

Tổng 9 file, **52,333 byte** theo `cat test/fixtures/* | wc -c`. Mọi số đếm trùng bảng §Response search đã đo của requirements. `grep -l -E '"(highlight|translations|fuzzy_dictionary)"'` rỗng. `grep -n -i fetch test/fixtures/*` rỗng.

**Khi fixture ghi lúc implement khác bảng này** (chỉ mục SC trôi): đó không phải lần chạy không hợp lệ, nên không ghi lại để tìm lần trùng. Implementer dừng và báo, kèm số đo mới có ngày. Bảng này và các literal phụ thuộc trong T1 được sửa cùng nhau qua một lần sửa design (AC-8 cho phép số đo mới có ngày).

### Quy trình ghi, cắt và kiểm (một lần, lúc implement)

Chạy trong một thư mục tạm ngoài repo, xóa sau khi xong (NFR-6). Body thô nằm ở thư mục riêng, script ở thư mục khác. Thứ tự:

1. `npm install` đã chạy; M1 đã có trong `src/search.ts` (F4 import nó).
2. `W=$(mktemp -d /tmp/sut-fx.XXXXXX); mkdir "$W/raw" "$W/bin"`. Chép F1 vào `$W/bin/fixtures.list`, F2 vào `$W/bin/record.sh` (`chmod +x`), F3 vào `$W/bin/trim.mjs`, F4 vào `$W/bin/equiv.mts`. Có thể trích bằng `blk F1 > "$W/bin/fixtures.list"`, v.v.
3. Ghi: `"$W/bin/record.sh" "$W/bin/fixtures.list" "$W/raw"`. Mỗi dòng phải là `OK <tên> 200`. Dòng `INVALID` (lỗi mạng, HTTP khác 200, body không parse được) là lần chạy không hợp lệ. Chỉ ghi lại dòng đó: tạo một file danh sách chỉ chứa dòng ấy và chạy lại F2.
4. Cắt: `mkdir -p test/fixtures && node "$W/bin/trim.mjs" "$W/raw" test/fixtures "$(date +%F)" $(cut -d'|' -f1 "$W/bin/fixtures.list")`.
5. Kiểm (FR-11): `node --import tsx "$W/bin/equiv.mts" "$PWD/src/search.ts" "$W/raw" "$PWD/test/fixtures" "$W/bin/fixtures.list"`, chạy từ gốc repo. Phải in `EQUIV-OK 141 cặp output, 0 lệch` và thoát 0. Ghi dòng này cùng ngày vào `tasks.md` (AC-8).
6. Đối chiếu số đo với bảng trên (lệnh ở bảng verify, AC-8).
7. `rm -rf "$W"`.

Trên bản dựng thử: bước 3 cho 9 dòng `OK … 200`; bước 5 in `EQUIV-OK 141 cặp output, 0 lệch`.

**Bước kiểm F4 làm hai việc.** (1) Kiểm cấu trúc: với mỗi fixture, `body` phải bằng đúng phép cắt FR-11 của body thô (cùng `total`/`error`, mọi phần tử theo thứ tự, đúng các field có mặt), và `url` phải bằng URL đã ghi. (2) Kiểm output: `formatSearchResult()` cho body thô và body đã cắt phải trùng từng byte với mọi `match` × trang {1, 2, 3, 4, 5, offset/10 + 1}, tổng cộng 141 cặp. Riêng (2) là điều FR-11 yêu cầu. Phần (1) được thêm vì (2) một mình không đủ: đo trên bản dựng thử, xóa `category` khỏi mọi hit vẫn cho 141/141 cặp output trùng, vì hit dictionary có `uid: null` nên bị loại ở `isSutta` dù có `category` hay không. Phần (1) bắt được trường hợp đó (`STRUCT-MISMATCH anatta-en-0`, `metta-en-0`). Ngược lại, xóa `name` và `error` thì phần (2) lệch 55 cặp. Không phần nào pass vô nghĩa.

<!-- block: F1 -->
```text
nibbana-en-0|nibbana|en|0
anatta-en-0|anatta|en|0
metta-en-0|metta|en|0
xyzzyqq-en-0|xyzzyqq|en|0
foo-bar-en-0|foo:bar|en|0
mindfulness-en-0|mindfulness|en|0
mindfulness-en-1450|mindfulness|en|1450
mindfulness-en-1460|mindfulness|en|1460
vo-nga-tuong-vi-0|vô ngã tướng|vi|0
```

<!-- block: F2 -->
```sh
#!/bin/sh
# $1 = file danh sách (tên|query|language|offset); $2 = thư mục body thô. Ghi $2/<tên>.json và $2/<tên>.url
while IFS="|" read -r name query lang offset; do
  url=$(node -e 'const [q,l,o]=process.argv.slice(1);const p=new URLSearchParams({query:q.normalize("NFC"),language:l,limit:"10"});if(Number(o)>0)p.set("offset",o);process.stdout.write("https://suttacentral.net/api/search/instant?"+p)' "$query" "$lang" "$offset")
  code=$(curl -sS -G -o "$2/$name.json" -w '%{http_code}' "$url")
  if [ "$code" = 200 ] && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$2/$name.json" 2>/dev/null; then
    printf '%s' "$url" > "$2/$name.url"; echo "OK $name $code"
  else
    echo "INVALID $name $code"
  fi
done < "$1"
```

<!-- block: F3 -->
```js
// node trim.mjs <thư mục body thô> <thư mục fixture đích> <ngày ghi YYYY-MM-DD> <tên>...
import { readFileSync, writeFileSync } from "node:fs";
const [rawDir, outDir, recorded, ...names] = process.argv.slice(2);
const SP = ["uid", "acronym", "translated_title", "original_title", "blurb", "parallel_count", "difficulty", "is_article", "category"];
const HIT = ["uid", "acronym", "name", "root_name", "author", "lang", "is_article", "category"];
const pick = (fields) => (e) => {
  if (typeof e !== "object" || e === null || Array.isArray(e)) throw new Error("phần tử không phải object");
  return Object.fromEntries(fields.filter((k) => Object.hasOwn(e, k)).map((k) => [k, e[k]]));
};
for (const name of names) {
  const raw = JSON.parse(readFileSync(`${rawDir}/${name}.json`, "utf8"));
  const url = readFileSync(`${rawDir}/${name}.url`, "utf8");
  if (!Array.isArray(raw.suttaplex) || !Array.isArray(raw.hits)) throw new Error(`${name}: thiếu mảng`);
  const body = { total: raw.total };
  if (Object.hasOwn(raw, "error")) body.error = raw.error;
  body.suttaplex = raw.suttaplex.map(pick(SP));
  body.hits = raw.hits.map(pick(HIT));
  writeFileSync(`${outDir}/${name}.json`, JSON.stringify({ url, recorded, body }, null, 2) + "\n");
}
```

<!-- block: F4 -->
```ts
// node --import tsx equiv.mts <src/search.ts tuyệt đối> <thư mục thô> <thư mục fixture> <file danh sách>
// (1) cấu trúc: mỗi fixture giữ đúng total/error, mọi phần tử theo thứ tự, đúng các field FR-11 có mặt;
// (2) output: formatSearchResult cho body thô và body đã cắt trùng từng byte.
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
const [searchTs, rawDir, fixDir, list] = process.argv.slice(2);
const { formatSearchResult, resolveTopic } = await import(pathToFileURL(searchTs).href);
const SP = ["uid", "acronym", "translated_title", "original_title", "blurb", "parallel_count", "difficulty", "is_article", "category"];
const HIT = ["uid", "acronym", "name", "root_name", "author", "lang", "is_article", "category"];
const keep = (fields: string[], e: any) => Object.fromEntries(fields.filter((k) => Object.hasOwn(e, k)).map((k) => [k, e[k]]));
let pairs = 0, bad = 0;
for (const row of readFileSync(list, "utf8").trim().split("\n")) {
  const [name, topic, , offset] = row.split("|");
  const raw = JSON.parse(readFileSync(`${rawDir}/${name}.json`, "utf8"));
  const fixture = JSON.parse(readFileSync(`${fixDir}/${name}.json`, "utf8"));
  const trimmed = fixture.body;
  const expected = {
    total: raw.total,
    ...(Object.hasOwn(raw, "error") ? { error: raw.error } : {}),
    suttaplex: raw.suttaplex.map((e: any) => keep(SP, e)),
    hits: raw.hits.map((e: any) => keep(HIT, e)),
  };
  const url = readFileSync(`${rawDir}/${name}.url`, "utf8");
  if (!isDeepStrictEqual(Object.keys(fixture), ["url", "recorded", "body"]) || fixture.url !== url ||
      !isDeepStrictEqual(trimmed, expected) || !isDeepStrictEqual(Object.keys(trimmed), Object.keys(expected))) {
    bad++; console.log(`STRUCT-MISMATCH ${name}`);
  }
  const { term } = resolveTopic(topic);
  for (const match of ["title", "content", "all"] as const) {
    for (const page of new Set([1, 2, 3, 4, 5, Number(offset) / 10 + 1])) {
      pairs++;
      const a = formatSearchResult({ topic, match, page }, term, raw);
      const b = formatSearchResult({ topic, match, page }, term, trimmed);
      if (a !== b) { bad++; console.log(`MISMATCH ${name} ${match} ${page}`); }
    }
  }
}
console.log(`${bad === 0 ? "EQUIV-OK" : "EQUIV-FAIL"} ${pairs} cặp output, ${bad} lệch`);
process.exit(bad === 0 ? 0 : 1);
```

## Component Boundaries

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `src/search.ts` | new (M1) | Logic thuần của `search_topic` (FR-1 a–g), ba hằng của dynamic-search S2, và `formatCitation()` dùng chung. Không import, không I/O |
| Handler `search_topic` trong `src/index.ts` | modified (H1) | Gọi `resolveTopic()`, return sớm khi `query` rỗng, gọi `fetchSearch()` một lần, trả text của `formatSearchResult()` |
| Dòng import trong `src/index.ts` | new (I1) | `SEARCH_PAGE_SIZE` cho `fetchSearch()`; `formatCitation` cho `get_sutta`/`get_sutta_meta`; bốn hàm cho handler |
| Section search và `formatCitation()` trong `src/index.ts` | **removed** (chuyển sang M1) | — |
| `fetchSearch()` và ba helper fetch, schema zod và `describe()` của `search_topic`, bốn tool còn lại, `extractText()`, `formatUnavailable()`, `DIVISIONS`, `main()` | không đổi | Khóa bằng §Lắp ráp |
| `test/search.test.ts` | new (T1) | 16 case `node:test`, import `../src/search.js`, đọc fixture qua `import.meta.url` |
| `test/fixtures/*.json` | new (9 file) | Response đã cắt, có `url` và `recorded` |
| `package.json` | modified (P1) | Script `test` |
| `README.md`, `specs/sutta-mcp-requirements.md`, `AGENTS.md` | modified | R-1..R-3, M-1, M-2, A-1a..A-1d |

`tsconfig.json` không đổi. `test/` nằm ngoài `rootDir: ./src`, nên `tsc` không biên dịch test (FR-8). Trên bản dựng thử, `rm -rf dist && npm run build && find dist -type f | sort` cho đúng `dist/index.js`, `dist/search.js`.

## Integration Points

- **Upstream SuttaCentral.** Không đổi: cùng endpoint, cùng số request mỗi lời gọi. `npm test` không gọi mạng. Lần ghi fixture phát 9 request, một lần, lúc implement.
- **Downstream (Claude).** Không đổi từng byte: `tools/list` và text của năm tool (A/B, §Testability).
- **Build và runtime.** `dist/index.js` import `./search.js`. Specifier `.js` theo `moduleResolution: Node16`; `tsc` sinh `dist/search.js` cạnh `dist/index.js`. `npm start` và cấu hình Claude Desktop (`dist/index.js`) không đổi.
- **Test.** `tsx --test` chạy `test/search.test.ts`; specifier `../src/search.js` được `tsx` resolve về `src/search.ts`. Fixture được đọc theo đường dẫn tương đối với file test, nên `npm test` chạy được từ bất kỳ `cwd` nào npm dùng.
- **Workflow contract.** Sửa `AGENTS.md` đổi sha256 của `context:agents`, xem §Thứ tự áp dụng.

### Khối sửa tài liệu — **[NORMATIVE]**

Literal của mỗi đích chỉ có ở khối của nó. Neo khớp theo nội dung; số dòng trong ngoặc là số đo tại `148b8c0` và dùng trong lệnh tái dựng ở §Testability (AC-9), vì commit đó bất biến.

**R-1**, `README.md`. Chèn hai dòng **ngay sau** dòng `npm run build` trong khối bash của `## Cài đặt` (`:25`). Dòng trống, dòng đóng fence và `## Chạy thử (dev mode)` giữ nguyên.

<!-- block: R-1 -->
```text
# Chạy unit test offline (không cần mạng):
npm test
```

**R-2**, `README.md`. Thay dòng bắt đầu bằng `Nguồn chính của danh sách này là bảng` (`:76`).

<!-- block: R-2 -->
```text
Nguồn chính của danh sách này là bảng `VI_TOPIC_TERMS` trong `src/search.ts`.
```

**R-3**, `README.md`. Thay dòng bắt đầu bằng `Để thêm chủ đề tiếng Việt, thêm một cặp` (`:80`). Hai dòng tiếp theo của đoạn giữ nguyên.

<!-- block: R-3 -->
```text
Để thêm chủ đề tiếng Việt, thêm một cặp `[key, thuật ngữ]` vào `VI_TOPIC_TERMS` trong `src/search.ts`
```

**M-1**, **M-2**, `specs/sutta-mcp-requirements.md` (FR-17). Trên đúng hai dòng sau, thay token `` `src/index.ts` `` bằng `` `src/search.ts` ``, không đổi ký tự nào khác của file:

- M-1: dòng chứa ``bằng bảng tĩnh trong `src/index.ts` `` (`:160`, mục Tool 1, `**Lưu ý:**`).
- M-2: dòng chứa ``(bảng `VI_TOPIC_TERMS` trong `src/index.ts` `` (`:293`, roadmap mục 1).

Hai khối này không có literal mới ngoài token `src/search.ts`, nên không có fence riêng. Kiểm bằng lệnh `diff` của AC-9 và lệnh tái dựng ở §Testability.

**A-1a**, `AGENTS.md`. Chèn một dòng **ngay sau** dòng `npm start        # node dist/index.js (production)` (`:16`). Ký tự `#` thẳng cột với ba dòng trên.

<!-- block: A-1a -->
```text
npm test         # node:test via tsx — offline unit tests for search_topic (test/)
```

**A-1b**, `AGENTS.md`. Thay dòng `No test runner or linter is configured yet.` (`:19`).

<!-- block: A-1b -->
```text
No linter is configured yet.
```

**A-1c**, `AGENTS.md`. Thay dòng bắt đầu bằng `Single-file server:` (`:23`). Dòng trống và `**Three layers:**` sau nó giữ nguyên. Số dòng `~435`, `~210` lấy từ file lắp ráp (436 và 212 dòng). AGENTS.md viết bằng tiếng Anh, nên khối này bằng tiếng Anh.

<!-- block: A-1c -->
```text
Two source files. `src/index.ts` (~435 lines) holds the SuttaCentral API helpers, the MCP server with every tool's zod schema and handler, and `main()`. `src/search.ts` (~210 lines) holds the pure logic of `search_topic` — the `VI_TOPIC_TERMS` table, topic and response normalization, filtering, paging and formatting — plus `formatCitation()`, which `get_sutta` and `get_sutta_meta` import from it. `src/search.ts` has no imports and no I/O. Unit tests live in `test/` and read recorded, trimmed `/api/search/instant` responses from `test/fixtures/`; they never call the network. Fixtures are small snapshots, not a corpus: re-record one only when a code change needs a new response shape.
```

**A-1d**, `AGENTS.md`. Thay dòng bắt đầu bằng ``To support another Vietnamese topic, add a `[key, term]` pair`` (`:44`). Chỉ token `src/index.ts` đổi.

<!-- block: A-1d -->
```text
To support another Vietnamese topic, add a `[key, term]` pair to `VI_TOPIC_TERMS` in `src/search.ts`. The key is lowercase NFC Vietnamese with single spaces; the term is one English or Pali search term. Measure before adding: the term must return at least one sutta on page 1 with `match=all` for both `language=en` and `language=vi`. English and Pali topics need no entry — they go to the search API directly.
```

#### Thứ tự áp dụng — ràng buộc cho task planner

`AGENTS.md` được pin trong `specs/search-unit-tests/workflow-contract.json` là dependency `context:agents` (sha256 `bcd1feed014c2b2c9d1addbf07807ab80257f930c92883a8ce133797240dee28`, đo lại 2026-10-19 bằng `shasum -a 256 AGENTS.md`). Áp A-1a..A-1d chắc chắn đổi hash đó (FR-15 bắt buộc sửa), và workflow coi đó là drift. Drift chặn mọi lần ghi cho tới khi một lần cập nhật contract hoặc reconciliation settle nó (`workflow.md` §Invariants), và `complete_workflow()` từ chối hoàn tất khi còn dependency drift. Vì vậy (FR-16):

1. **A-1a..A-1d là task build cuối cùng, một task riêng, chỉ sửa `AGENTS.md`.** Mọi task sửa `src/`, `test/`, `package.json`, `README.md` (R-1..R-3) và `specs/sutta-mcp-requirements.md` (M-1, M-2) xong trước nó. Như vậy không lần dispatch task nào sau đó gặp drift, và một lần cập nhật contract là đủ. M-1/M-2 có thể chung task với README (FR-17).
2. **Ngay sau task đó, trước code review on-completion**, orchestrator chạy đường cập nhật contract của `lib/workflow_contracts.py` (xem `workflow.md`):
   - `preview_contract_update`: thay đổi duy nhất mong đợi là `dependencies.context:agents` (sha256 mới của `AGENTS.md`). Có thay đổi nào khác thì dừng và báo người dùng.
   - Trình preview cho người dùng, gồm danh sách gate bị ảnh hưởng. Dependency này cho scope `{"type":"contract","id":"dependencies.context:agents"}`, không mở lại requirements, design hay tasks.
   - `authorize_contract_update`: **chỉ khi người dùng đồng ý rõ ràng tại đúng thời điểm này**. Không agent nào authorize thay người dùng.
   - `write_contract_atomic` rồi `finish_contract_update`.
   - `settle_contract_invalidation`: invalidation scope `contract` được settle bằng chính quyết định contract-update.
3. **Code review on-completion chỉ được dispatch sau bước 2.** Khi đó `AGENTS.md` mới là context đã pin, và review bao gồm cả A-1a..A-1d.
4. **Nếu người dùng không authorize**, workflow dừng ở trạng thái drift. Agent không tự khôi phục `AGENTS.md`.

## Cross-Cutting Concerns

### Authentication & Authorization

Không áp dụng. API SuttaCentral công khai, server chạy stdio cục bộ, test không gọi mạng.

### Error Handling

Không đổi so với `5459d5a`:

| Tình huống | Hành vi | Nơi |
|---|---|---|
| `topic` rỗng sau NFC + trim | câu FR-11, không gọi API, không footer | H1 + `formatNoResults()` |
| HTTP không 2xx, lỗi mạng, body không phải JSON | `fetchSearch()` ném, handler không bắt, SDK trả `isError: true` | `src/index.ts`, không đổi |
| Body thiếu hoặc sai kiểu | `[]` / `[]` / `0` | `normalizeSearchResponse()` |
| SC báo `error` với HTTP 200 | dòng `SuttaCentral báo lỗi truy vấn: …` ở trang 1 rỗng | `formatSearchResult()` |
| `match`/`page` sai | zod từ chối trước handler | schema, không đổi |

Hàm của M1 không ném với mọi giá trị JSON làm `data` (case FR-12 của T1 thử `undefined`, `null`, chuỗi, `{}`, các field sai kiểu). `formatContentMatch()` gọi `hit.uid.toUpperCase()` không có `?.`, vì nó chỉ được gọi với phần tử đã qua `isSutta()`. Test gọi nó trực tiếp với `uid` là chuỗi.

### Logging & Observability

Không áp dụng. Không thêm log. Import `src/search.ts` không in gì (AC-2, đo: không có output, mã 0).

### Performance & Scalability

Không đổi ở runtime: cùng số request, xử lý vẫn là vài lượt lọc tuyến tính trên mảng ≤ 32 phần tử. `npm test` trên bản dựng thử: 16 case, khoảng 0.2 s thời gian thực cho cả lệnh (`time`), không mạng.

### Testability & Verification

Ba vehicle: unit test (`npm test`), lệnh trên repo (diff, grep, build), và harness stdio cho A/B. Chỉ A/B và bước ghi fixture dùng mạng.

#### Harness và luật hợp lệ (A/B, AC-5)

V2 dựng harness stdio từ heredoc của `specs/non-segmented-translation-guard/requirements.md` §Harness. Hai thay đổi so với heredoc đó: frame 3 là `tools/list` khi tên tool là `tools/list`, và stderr ghi vào file trong thư mục tạm. Bước giải mã theo hàm `check` của `specs/get-sutta-unknown-uid/design.md` §Baseline A/B, mở rộng cho `tools/list` (payload là `JSON.stringify(result.tools)`) và cho tool (payload là `isError=<bool>`, xuống dòng, rồi text). Dòng `isError` khiến một thay đổi trạng thái lỗi cũng làm lệch `cmp`, ví dụ input `{"page":0}` mà zod từ chối ở cả hai bản.

**Luật hợp lệ (NFR-6).** Một lần chạy không hợp lệ khi: không có đúng 1 dòng `"id":2`; hoặc với `tools/call`, text rỗng, chứa `fetch failed`, hoặc bắt đầu bằng `SuttaCentral API error:`; hoặc với `tools/list`, không có mảng `result.tools`. Một cặp có lần chạy không hợp lệ thì **chạy lại cả cặp**, tối đa 3 lần; quá 3 lần thì dừng và báo. Một cặp hợp lệ mà `cmp` lệch thì **dừng ngay và báo**, không chạy lại để tìm lần trùng. Chạy tuần tự.

**Dựng bản `5459d5a`** (ngoài repo, như `specs/get-sutta-unknown-uid/design.md` §Baseline A/B):

```sh
REPO=$(git rev-parse --show-toplevel)
AB=$(mktemp -d /tmp/sut-ab.XXXXXX); mkdir "$AB/base" "$AB/work"
git -C "$REPO" archive 5459d5a src package.json tsconfig.json | tar -x -C "$AB/base"
ln -s "$REPO/node_modules" "$AB/base/node_modules"
(cd "$AB/base" && npx tsc -p .)
(cd "$REPO" && npm run build)            # harness chạy dist/, không phải src/
blk V2 > "$AB/ab.sh"; chmod +x "$AB/ab.sh"; blk V3 > "$AB/inputs.list"
"$AB/ab.sh" "$AB/base" "$REPO" "$AB/inputs.list" "$AB/work"     # in AB-OK 18/18 khi đạt
rm -rf "$AB"
```

Trên bản dựng thử (2026-10-19): `AB-OK 18/18`. Ba cặp không hợp lệ ở lần đầu (`get_sutta mn10`, `mindfulness`, `mindfulness` `content` trang 147: `fetch failed`) đạt ở lần chạy lại thứ nhất; 18/18 cặp hợp lệ trùng byte. Bản V2 dùng dấu `|` cũng được chạy lại trên 3 input (`AB-OK 3/3`).

<!-- block: V2 -->
```sh
#!/bin/sh
# ab.sh <bản 5459d5a đã build> <bản mới đã build> <file input: tool|arguments> <thư mục tạm>
# Mỗi input: chạy bản cũ rồi bản mới, tuần tự. Cặp không hợp lệ thì chạy lại (tối đa 3 lần).
# Cặp hợp lệ mà lệch thì dừng ngay (NFR-6).
BASE=$1; NEW=$2; INPUTS=$3; W=$4
cat > "$W/mcp-call.sh" <<'EOS'
#!/bin/sh
# $1 = tên tool hoặc "tools/list", $2 = object arguments dạng JSON, $3 = file stderr
{
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"ac","version":"1"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  if [ "$1" = tools/list ]; then
    printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
  else
    printf '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"%s","arguments":%s}}\n' "$1" "$2"
  fi
  sleep 20   # chờ fetch mạng xong trước khi stdin đóng
} | node ./dist/index.js 2>>"$3"
EOS
chmod +x "$W/mcp-call.sh"
# extract <mode> < stdout server > payload (tools/list: result.tools; tool: "isError=<bool>" rồi text).
# exit 0 = hợp lệ; 2 = số dòng "id":2 khác 1; 3 = text rỗng, fetch failed, SuttaCentral API error.
extract() { node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const L=d.split("\n").filter(l=>l.includes("\"id\":2"));
  if(L.length!==1){console.error("INVALID id:2 lines="+L.length);process.exit(2)}
  const r=JSON.parse(L[0]).result;
  if(process.argv[1]==="tools/list"){
    if(!Array.isArray(r?.tools)){console.error("INVALID no tools");process.exit(3)}
    process.stdout.write(JSON.stringify(r.tools));return}
  const t=(r?.content??[]).map(c=>c.text).join("\n");
  if(t===""||t.includes("fetch failed")||t.startsWith("SuttaCentral API error:")){
    console.error("INVALID text="+JSON.stringify(t.slice(0,120)));process.exit(3)}
  process.stdout.write("isError="+(r?.isError===true)+"\n"+t)})' "$1"; }
i=0
while IFS="|" read -r tool args; do
  i=$((i+1)); try=1
  while :; do
    (cd "$BASE" && "$W/mcp-call.sh" "$tool" "$args" "$W/stderr.log") | extract "$tool" > "$W/old.$i" 2>>"$W/stderr.log"; o=$?
    (cd "$NEW" && "$W/mcp-call.sh" "$tool" "$args" "$W/stderr.log") | extract "$tool" > "$W/new.$i" 2>>"$W/stderr.log"; n=$?
    if [ $o = 0 ] && [ $n = 0 ]; then break; fi
    echo "INVALID-PAIR $i try=$try $tool $args (old=$o new=$n)"
    try=$((try+1)); [ $try -le 3 ] || { echo "STOP: 3 cặp không hợp lệ liên tiếp ở input $i"; exit 2; }
  done
  if cmp -s "$W/old.$i" "$W/new.$i"; then
    echo "MATCH $i $tool $args ($(wc -c < "$W/new.$i" | tr -d ' ') byte)"
  else
    echo "MISMATCH $i $tool $args — dừng, xem diff $W/old.$i $W/new.$i"; exit 1
  fi
done < "$INPUTS"
echo "AB-OK $i/$i"
```

<!-- block: V3 -->
```text
tools/list|{}
get_sutta|{"uid":"mn10"}
get_sutta|{"uid":"mn9999"}
get_sutta_meta|{"uid":"mn10"}
get_parallels|{"uid":"mn10"}
list_divisions|{}
search_topic|{"topic":"vô ngã"}
search_topic|{"topic":"chánh niệm","language":"vi","match":"title"}
search_topic|{"topic":"mindfulness"}
search_topic|{"topic":"mindfulness","match":"title","page":5}
search_topic|{"topic":"mindfulness","match":"content","page":147}
search_topic|{"topic":"metta"}
search_topic|{"topic":"anatta"}
search_topic|{"topic":"xyzzyqq"}
search_topic|{"topic":""}
search_topic|{"topic":"foo:bar"}
search_topic|{"topic":"vô ngã tướng","language":"vi","match":"content"}
search_topic|{"topic":"mindfulness","page":0}
```

#### Đột biến (FR-13, AC-4)

Chạy trên một bản sao cây làm việc **ngoài repo** (`git archive HEAD` của nhánh sau khi commit, hoặc `cp -R` cây làm việc không kèm `.git`, `node_modules` symlink về repo). Mỗi lần V1 áp đúng một đột biến, kiểm nó đổi đúng 1 dòng (`changed=1`; khác 1 nghĩa là pattern không khớp M1 và lần chạy đó không có giá trị), chạy `npm test`, rồi hoàn nguyên. Xóa bản sao khi xong.

```sh
for m in a b c d; do ./mutate.sh "$COPY" "$m"; done
```

Trên bản dựng thử:

| Đột biến (FR-13) | `changed` | Mã thoát | Case fail |
|---|---|---|---|
| (a) bỏ `h > 0 &&` | 1 | 1 | FR-11, **FR-18** |
| (b) bỏ `&& e.is_article !== true` | 1 | 1 | FR-10, **FR-7** |
| (c) bỏ `.trim()` ở `hit.name` | 1 | 1 | **FR-9** |
| (d) bỏ `.normalize("NFC")` ở `key` | 1 | 1 | **FR-3** |

Sau bốn lần, `npm test` trên bản sao thoát 0 (đã hoàn nguyên).

<!-- block: V1 -->
```sh
#!/bin/sh
# mutate.sh <bản sao cây làm việc, ngoài repo> <a|b|c|d>: áp MỘT đột biến FR-13, chạy npm test, hoàn nguyên.
cd "$1" || exit 2
cp src/search.ts .search.ts.orig
case "$2" in
  a) perl -pi -e 's/const moreContent = h > 0 && offset/const moreContent = offset/' src/search.ts ;;
  b) perl -pi -e 's/ && e\.is_article !== true;/;/' src/search.ts ;;
  c) perl -pi -e 's/hit\.name\.trim\(\)/hit.name/' src/search.ts ;;
  d) perl -pi -e 's/const key = topic\.normalize\("NFC"\)\./const key = topic./' src/search.ts ;;
esac
changed=$(diff .search.ts.orig src/search.ts | grep -c '^>')
npm test > .mutant.log 2>&1; code=$?
echo "mutation $2: changed=$changed exit=$code failed: $(grep '^not ok' .mutant.log | sed 's/^not ok [0-9]* - //' | cut -d: -f1 | sort -u | tr '\n' ' ')"
mv .search.ts.orig src/search.ts; rm -f .mutant.log
```

#### Vehicle theo AC

`blk` là hàm ở §Lắp ráp. Cột cuối là kết quả trên bản dựng thử ngày 2026-10-19.

| AC | Lệnh / vehicle | Kết quả trên bản dựng thử |
|---|---|---|
| AC-1 | `npm test > "$L/t1.log" 2>&1; echo $?` và `grep -E '^# (pass\|fail)' "$L/t1.log"`. Rồi: `P=$(mktemp -d /tmp/sut-nofetch.XXXXXX); printf 'globalThis.fetch = () => { throw new Error("network disabled"); };\n' > "$P/nofetch.mjs"; NODE_OPTIONS="--import $P/nofetch.mjs" npm test > "$L/t2.log" 2>&1; echo $?; rm -rf "$P"`. Cuối cùng `grep -rn -E 'fetch\|src/index' test/` | Hai lần đều thoát 0, `# pass 16`, `# fail 0`. Preload có hiệu lực (kiểm riêng: `NODE_OPTIONS=… node -e 'fetch("x")'` ném `network disabled`). Grep không có dòng nào (thoát 1) |
| AC-2 | §Lắp ráp (`SEARCH-OK`, `ASSEMBLY-OK`); `grep -n -E '^(import\|export\|const\|function\|type\|let\|var)\b' src/search.ts` (không có `import`, `let`, `var`); `grep -c 'await fetchSearch(' src/index.ts` = 1; đọc H1: `return` của `query === ""` đứng trước `await fetchSearch(`; grep literal của FR-2 = 0; `grep -c -F "'Còn kết quả'," src/index.ts` = 1; `node --import tsx -e 'import("./src/search.ts")'` | Đạt: 1; 0; 1; lệnh import không in gì, mã 0 |
| AC-3 | `grep -E '^(not )?ok' "$L/t1.log"`: mỗi id FR-3, FR-4, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-18, FR-19, FR-20 là tiền tố của ít nhất một dòng `ok`. Đọc T1 theo bảng phủ ở §T1 | Đạt: 16 dòng `ok`, đủ 12 id |
| AC-4 | V1 trên bản sao ngoài repo | Đạt, bảng ở §Đột biến |
| AC-5 | V2 + V3, luật hợp lệ ở trên | Đạt: `AB-OK 18/18` (3 cặp chạy lại một lần vì `fetch failed`) |
| AC-6 | `rm -rf dist && npm run build && find dist -type f \| sort`; `git diff --quiet 5459d5a -- tsconfig.json` | Đạt: `dist/index.js`, `dist/search.js`; tsconfig trùng |
| AC-7 | `git diff 148b8c0 --stat`; `git status --porcelain` (mọi đường dẫn thuộc NFR-3); `git diff 5459d5a -- package.json package-lock.json` (chỉ P1); bảng grep FR-5 dưới | Đạt trên bản dựng thử |
| AC-8 | `ls test/fixtures \| wc -l` (9, ≤ 10); `cat test/fixtures/* \| wc -c` (≤ 65536); `grep -l -E '"(highlight\|translations\|fuzzy_dictionary)"' test/fixtures/*` (rỗng); `for f in test/fixtures/*.json; do node -e 'const f=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const b=f.body;console.log(process.argv[1],f.recorded,b.total,b.suttaplex.length,b.hits.length,f.url.slice(42))' "$f"; done`, đối chiếu bảng §Fixture; dòng `EQUIV-OK` có ngày trong `tasks.md` | Đạt: 9 file, 52,333 byte, grep rỗng, số đếm trùng bảng, `EQUIV-OK 141 cặp output, 0 lệch` |
| AC-9 | Grep của AC-9 trong requirements, cộng lệnh tái dựng tài liệu dưới đây | Đạt trên bản sao đã áp mọi khối: `npm test` có ở README `:27` và AGENTS.md `:17`; grep thứ hai rỗng; `VI_TOPIC_TERMS` trỏ `src/search.ts` ở README `:78`, `:82` và AGENTS.md `:45`; master spec 0 và 3, `diff` rỗng; `README-OK`, `AGENTS-OK`, `MASTER-OK` |
| AC-10 | Đọc `tasks.md` (task A-1 cuối, chỉ `AGENTS.md`); lịch sử `workflow-state.json` (contract update authorize trước code review); `shasum -a 256 AGENTS.md` bằng sha256 `context:agents` mới trong `workflow-contract.json` | Kiểm lúc build; không đo được trước |

`L` là một thư mục tạm cho log (`L=$(mktemp -d /tmp/sut-log.XXXXXX)`), xóa khi xong.

**Lệnh tái dựng tài liệu (AC-9).** Mỗi file đích phải trùng từng byte với file tái dựng từ `148b8c0` và các khối:

```sh
REPO=$(git rev-parse --show-toplevel)   # blk như ở §Lắp ráp
R=$(mktemp); git -C "$REPO" show 148b8c0:README.md > "$R"
{ sed -n '1,25p' "$R"; blk R-1; sed -n '26,75p' "$R"; blk R-2; sed -n '77,79p' "$R"; blk R-3; sed -n '81,$p' "$R"; } \
  | diff - "$REPO/README.md" && echo README-OK
A=$(mktemp); git -C "$REPO" show 148b8c0:AGENTS.md > "$A"
{ sed -n '1,16p' "$A"; blk A-1a; sed -n '17,18p' "$A"; blk A-1b; sed -n '20,22p' "$A"; blk A-1c; sed -n '24,43p' "$A"; blk A-1d; sed -n '45,$p' "$A"; } \
  | diff - "$REPO/AGENTS.md" && echo AGENTS-OK
git -C "$REPO" show 148b8c0:specs/sutta-mcp-requirements.md | sed -e '160s#`src/index\.ts`#`src/search.ts`#' -e '293s#`src/index\.ts`#`src/search.ts`#' \
  | diff - "$REPO/specs/sutta-mcp-requirements.md" && echo MASTER-OK
rm -f "$R" "$A"
```

Lệnh `README-OK`/`MASTER-OK` chạy được sau task README; `AGENTS-OK` chỉ sau task A-1.

**Bảng grep bất biến (FR-5).** Bộ lọc nhanh, không đủ một mình; lưới thật là §Lắp ráp.

| Lệnh | `src/index.ts` trước (`5459d5a`) | `src/index.ts` sau | `src/search.ts` |
|---|---|---|---|
| `grep -c 'segmented'` | 3 | **3** | 0 |
| `grep -c -F 'sujato'` | 3 | **3** | 0 |
| `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush'` | 0 | **0** | 0 |
| `grep -c -F 'search/instant?'` | 1 | **1** | 0 |
| `grep -c 'fetch('` | 4 | **4** | 0 |
| `grep -c -E 'Tìm thấy\|Hết kết quả\|Còn kết quả:\|Khớp tiêu đề:\|Khớp nội dung:\|Không có kết quả sutta\|Không tìm thấy sutta nào'` | 9 | **0** | — |
| `grep -c -F "'Còn kết quả',"` | 1 | **1** | — |
| `wc -l <` | 584 | **436** | 212 |

Dọn dẹp khi xong: mọi thư mục `mktemp` ở trên (`$W`, `$AB`, `$L`, bản sao đột biến) (NFR-6).

## Alternatives Considered

### Alternative A: Truyền `formatCitation` vào `src/search.ts` như tham số

- **Description:** `formatTitleMatch(sp, formatCitation)` hoặc `formatSearchResult(…, { formatCitation })`; `formatCitation()` ở lại `src/index.ts`.
- **Why not chosen:** Test không import được `src/index.ts`, nên phải tự viết một bản `formatCitation` để truyền vào. Khi đó case FR-8 kiểm bản sao trong test, không kiểm hàm mà `get_sutta` và `search_topic` thật sự dùng. Cách này cũng thêm một tham số chỉ để vòng qua giới hạn import. Chi phí của cách được chọn là `src/search.ts` chứa một hàm mà hai tool khác cũng dùng. Comment section trong M1 ghi rõ điều đó, và A-1c nêu nó trong AGENTS.md.

### Alternative B: Module thứ ba cho `formatCitation()` (ví dụ `src/citation.ts`)

- **Description:** Tách `formatCitation()` ra file riêng mà cả `src/index.ts` và `src/search.ts` import.
- **Why not chosen:** NFR-3 chỉ cho phép một file mới trong `src/` là `src/search.ts`. Về sau, nếu `formatCitation()` cần tách (ví dụ #20 đổi nó cho cả ba tool), việc chuyển hàm sang file khác không phải gỡ gì của spec này: chỉ đổi một dòng import ở mỗi bên.

### Alternative C: Chỉ export một hàm `renderSearchTopic()`

- **Description:** `src/search.ts` export đúng một hoặc hai hàm (giải topic, render toàn bộ). Các bước khác để private.
- **Why not chosen:** AC-2 đòi export các hàm của FR-1 (a)–(g). Test cũng sẽ phải dựng response đầy đủ cho mọi kiểm nhỏ: `isSutta` với `uid: ""`, `hasMore` với `total` chọn sẵn, `normalizeSearchResponse` với body sai kiểu. Chi phí của cách được chọn là tám hàm export thay vì hai, và mọi hàm đó đều là logic sẵn có của handler cũ.

### Alternative D: Đặt test trong `src/` và thêm `exclude` vào `tsconfig.json`

- **Why not chosen:** FR-8 chốt `test/` ngoài `rootDir`, `tsconfig.json` không đổi.

### Alternative E: Glob `tsx --test test/*.test.ts` trong script

- **Description:** Dạng requirements đã thử; tự nhận file test mới.
- **Why not chosen:** Glob do shell của npm mở rộng; trên Windows `cmd` thì không. Spec này có một file test. Khi có file thứ hai, thêm nó vào P1 là một thay đổi một dòng. Đổi lại, liệt kê tường minh khiến một file test thừa hay đặt sai tên không chạy lặng lẽ.

### Alternative F: Lưu output của bản build `5459d5a` cạnh fixture

- **Description:** Mỗi fixture có file `.out.txt` chứa output của `5459d5a` (FR-12, nguồn thứ hai), và test so nguyên output.
- **Why not chosen:** 9 fixture đã dùng 9 trong 10 file của trần NFR-4, nên chỉ một fixture có chỗ cho file phụ. Đặt output trong cùng file JSON thì không vướng trần file, nhưng output trang `all` của `mindfulness` có 18 khối citation, và 13 KB còn lại dưới trần 65536 byte không đủ cho vài output như vậy. Bảng FR-12 chỉ cần nguồn mặc định. Khóa trùng byte với `5459d5a` đã có A/B (AC-5), là vehicle đúng cho FR-4.

### Alternative G: Lưu body thô, hoặc fixture dạng module TS

- **Why not chosen:** Body thô của 9 response là 623,992 byte, vượt NFR-4 khoảng 10 lần, và có `translations`/`highlight` mà NFR-4 cấm. Fixture dạng `.ts` sẽ được import như code: lẫn dữ liệu với code, và mất định dạng chung để F4 đọc cả hai phía.

### Alternative H: Inject hàm fetch vào handler để test cả handler

- **Description:** `searchTopic(args, fetchFn)` trong `src/search.ts`, test truyền fetch giả.
- **Why not chosen:** Đó là mock fetch dưới tên khác; quyết định 3 của requirements và FR-7 loại nó. Phần handler còn lại sau H1 chỉ là nối dây, và đã được khóa bằng §Lắp ráp và A/B.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chỉ mục SC trôi giữa ngày soạn design và ngày ghi fixture, làm literal của T1 sai | L (số đếm 2026-10-18 và 2026-10-19 trùng nhau) | M: test fail, phải sửa design | Điều kiện tiên quyết trong T1 chỉ ra fixture nào trôi. Quy tắc: dừng và báo, sửa bảng §Fixture cùng T1 trong một lần sửa design; không ghi lại để tìm lần trùng |
| Implementer chép sai M1/H1/T1 (đổi thứ tự `trim`/`NFC`, bỏ `h > 0`, quên `export`) | M | M | §Lắp ráp so toàn file bằng `diff`; đột biến V1 chứng minh test bắt được bốn lỗi đã nêu |
| A/B lệch vì upstream đổi response giữa hai lần chạy của một cặp | L | L | Chạy liền nhau; cache GET của SC 600 s (dynamic-search). Mismatch hợp lệ thì dừng và người dùng quyết |
| Lỗi mạng thoáng qua trong A/B hoặc lúc ghi fixture | **H** (đo: 1 cặp `fetch failed` trong lần A/B này; lần ghi `vô ngã tướng` đầu tiên của requirements lỗi) | L | Luật hợp lệ, chạy lại cả cặp tối đa 3 lần; F2 báo `INVALID` theo từng dòng |
| Công cụ soạn hoặc editor chuẩn hóa NFC source test, làm case NFD pass vô nghĩa | L | M | T1 dựng NFD bằng `.normalize("NFD")` và kiểm `nfd !== nfc` trước khi dùng |
| `tsx --test` không chạy trên Node 18/20 | L | L | Ngoài phạm vi (requirements); `npm run build`/`npm start` không phụ thuộc |
| Sửa `AGENTS.md` gây drift contract | **H** (bắt buộc sửa) | **H**: chặn mọi dispatch và code review | §Thứ tự áp dụng: task cuối, riêng; cập nhật contract do người dùng authorize ngay sau đó |
| `formatCitation()` trong `src/search.ts` khó tìm với người sửa `get_sutta` | M | L | Comment section trong M1 và câu trong A-1c nói rõ `get_sutta`/`get_sutta_meta` import nó từ đây |
