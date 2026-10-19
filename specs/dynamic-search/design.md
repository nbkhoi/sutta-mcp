# Design: `search_topic` dùng search API của SuttaCentral (dynamic search)

**Status:** Reviewed
**Created:** 2026-10-18
**Spec slug:** dynamic-search
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/non-segmented-translation-guard/` (N1-A, N1-B, N5-T), `specs/bilara-lang-param/` (N3-A, N3-B), `specs/segment-id-in-get-sutta/`, `specs/get-sutta-unknown-uid/` (U1). Spec này không đụng khối normative nào của các spec đó, xem §Vùng được bảo vệ.

## Context Recap

`search_topic` hiện tra `TOPIC_INDEX` tĩnh (38 key → UID hardcode) rồi gọi tuần tự tối đa 3 request `/api/suttaplex/`. Requirements (Status: Reviewed) thay cơ chế này bằng **đúng một** `GET /api/search/instant` mỗi lời gọi (FR-1, NFR-4). 14 key tiếng Việt được ánh xạ sang một thuật ngữ Anh/Pali, khớp chính xác sau chuẩn hóa (FR-2, FR-3). Mọi topic khác gửi thẳng sau NFC + trim (FR-4). Tool có thêm `match` (`title`/`content`/`all`) và `page` (1..10000) (FR-13, FR-16, FR-17). Phần tử không phải sutta bị lọc (FR-7). Khớp tiêu đề in citation đầy đủ (FR-8), khớp nội dung in citation rút gọn kèm `Text: {author} ({lang})` (FR-9). Output có header, dòng nhóm, footer còn/hết trang (FR-10, FR-18, FR-19), và câu không có kết quả (FR-11, FR-20). Bốn tool còn lại phải giữ nguyên từng byte (FR-14), không thêm dependency hay test runner (NFR-1), và code chỉ đổi trong `src/index.ts` (NFR-2).

Tài liệu này chốt các điểm requirements để lại cho design:

1. Thuật ngữ ánh xạ cho 14 key, kèm số đo live ngày 2026-10-18 (FR-2).
2. Chữ nguyên văn của dòng header nêu thuật ngữ (FR-10), của gợi ý FR-11 và của câu SC báo lỗi.
3. Hình dạng code: một helper fetch, một section search, handler mới. Cả ba là khối normative.
4. Những gì bị xóa và những gì giữ nguyên.
5. Sáu khối sửa tài liệu cho FR-15.
6. Bảng verify từ mỗi AC tới một lệnh hoặc lần chạy harness cụ thể.

Mọi literal và số đo trong tài liệu này được **đo trong phiên soạn design (2026-10-18)** từ ba nguồn:

- **`fetch` live** tới `https://suttacentral.net/api/search/instant` (Node 22, `limit=10`).
- **Bản dựng thử.** `src/` lấy từ `40846bb` bằng `git archive` vào thư mục tạm ngoài repo, rồi lắp ba khối S1, S2, S3 đúng như §Lắp ráp. `npx tsc -p .` thoát 0 với `tsconfig.json` của repo.
- **Stdio.** Bản dựng thử được chạy qua stdio cho mọi input của AC-1..AC-19, và chạy A/B với bản dựng `40846bb` cho AC-12.

## High-Level Design

```
search_topic(topic, language="en", match="all", page=1)        ← zod chặn match/page sai (FR-16/17)
  ├─ key   = NFC → toLowerCase → trim → gộp \s+                  (FR-3)
  ├─ term  = VI_TOPIC_TERMS.get(key)                             (FR-2; Map, khớp chính xác)
  ├─ query = term ?? NFC(topic).trim()                           (FR-4)
  ├─ query === "" → câu FR-11, KHÔNG request, không footer
  ├─ offset = match==="title" ? 0 : (page−1)·10
  ├─ data = fetchSearch(query, language, offset)                  ← request DUY NHẤT (FR-1)
  │     GET /api/search/instant?query=…&language=…&limit=10[&offset=…]   (offset chỉ khi > 0)
  │     !res.ok → throw "SuttaCentral API error: {status}" → SDK isError (FR-12)
  ├─ T = suttaplex → lọc FR-7 → khử trùng uid                     (FR-6)
  ├─ titlePage   = match==="content" ? [] : T[(p−1)·10 … p·10)
  ├─ contentPage = match==="title"   ? [] : hits → lọc FR-7 → khử trùng, bỏ uid đã ở titlePage
  ├─ footer theo FR-18 (|T|, h, total của chính response này)
  └─ n>0 → header [+ dòng thuật ngữ] + "Khớp tiêu đề:" + "Khớp nội dung:" + footer
     n=0, page=1 → câu FR-11 + footer;  n=0, page>1 → câu FR-20 + footer
```

Năm quyết định trung tâm:

1. **Bảng ánh xạ là `Map`, không phải object literal.** `Map.get()` có kiểu `string | undefined` kể cả khi `noUncheckedIndexedAccess` tắt (tsconfig của repo tắt cờ này). `Map.get()` cũng không đọc prototype. Với object literal, `TABLE["constructor"]` trả về hàm `Object`, và `searchByTopic()` hiện tại có đúng lỗi này. Xem §Alternative C.
2. **Khớp tiêu đề tái dùng `formatCitation()` trên một bản sao đã đổi `difficulty`.** `suttaplex` của search mang `difficulty` dạng số, còn `formatCitation()` đọc `difficulty.name`. Hàm `formatTitleMatch()` truyền `{ ...sp, difficulty: { name: DIFFICULTY_NAMES.get(sp.difficulty) } }`. Nhờ vậy `formatCitation()` không đổi một ký tự nào (FR-14), và hình dạng citation của FR-8 đúng theo định nghĩa. Xem §Alternative B.
3. **Khớp nội dung có formatter riêng (`formatContentMatch()`).** Hit thiếu blurb, difficulty và parallels (FR-9 cấm bịa các dòng này), có thể có `name` rỗng, `acronym` hoặc `author` là `null` (AC-15). Đưa hit qua `formatCitation()` sẽ in `Difficulty: unknown | Parallels: 0`.
4. **Footer chỉ suy từ response của lời gọi hiện tại.** Không cache, không biến module nào giữ `uid` (NFR-5). Công thức FR-18 được viết nguyên trong handler.
5. **Header nêu thuật ngữ ở một dòng riêng, ngay sau dòng `Tìm thấy …:`.** Dòng đầu giữ đúng literal của AC-1. Dòng thứ hai có dạng `Thuật ngữ đã dùng để tìm trên SuttaCentral: "{term}"` và chỉ xuất hiện khi FR-3 khớp. Dòng này cũng có trong câu FR-11, vì caller cần biết thuật ngữ nào đã cho 0 kết quả trước khi thử lại. Dòng này **không** có trong câu FR-20: FR-20 viết "bắt đầu bằng …, rồi footer".

### Đọc tối thiểu để implement

Các khối ràng buộc, đánh dấu **[NORMATIVE]** tại chỗ:

1. §S1: `fetchSearch()`, nguyên văn.
2. §S2: section search (hằng, bảng ánh xạ, hai formatter), nguyên văn.
3. §S3: đăng ký tool `search_topic` (schema + handler), nguyên văn.
4. §Lắp ráp: vị trí của S1, S2, S3 trong file, kiểm bằng một lệnh `diff` cho toàn file.
5. §Khối sửa tài liệu: R-1, R-2, A-1, M-1, M-2, M-3, nguyên văn, kèm neo thay thế, và thứ tự áp dụng bắt buộc (A-1 cuối cùng, kèm cập nhật contract do người dùng authorize).

### Câu hỏi mở

- **Q2 (của requirements, còn mở với người dùng):** có giữ khớp một phần theo ranh giới từ cho key tiếng Việt không (để `thiền định` hay `quy y tam bảo` vẫn ánh xạ), hay chỉ khớp chính xác? Design này theo default đã ghi của requirements, tức **chỉ khớp chính xác** (FR-3). Nếu người dùng chọn khớp một phần, thay đổi gói gọn trong dòng `const term = VI_TOPIC_TERMS.get(key);` của S3 và trong AC-4. Không khối nào khác phụ thuộc vào cách khớp.

### Vùng được bảo vệ

S1, S2, S3 chỉ thay hai đoạn của `src/index.ts` tại `40846bb`: dòng 32–108 (`TOPIC_INDEX`, `searchByTopic()`) và dòng 191–230 (Tool 1). Mọi vùng mà matcher của spec tiền nhiệm trích ra đều nằm ngoài hai đoạn đó. Đo trên bản dựng thử, mỗi `diff` dưới đây rỗng:

| Khối | Matcher | Kết quả trên bản dựng thử |
|---|---|---|
| **N5-T** (kiểu `Segment`/`ExtractedText`) | `awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/'` so với `specs/non-segmented-translation-guard/design.md` | diff rỗng (8 dòng) |
| **N1-A** (`extractText()`) | `awk '/^function extractText/,/^}$/'` so với `specs/non-segmented-translation-guard/design.md` | diff rỗng (20 dòng) |
| **N1-B** (dòng gate) | `grep -c -F 'extracted.source !== "translation"'` = 1 | 1 |
| **N3-A** (`fetchBilaraText()`) | `awk '/^async function fetchBilaraText/,/^}$/'` so với `specs/bilara-lang-param/design.md` | diff rỗng (6 dòng) |
| **N3-B** (khối retry) | `awk '/^    let extracted = extractText/,/^    }$/'` so với `specs/bilara-lang-param/design.md` | diff rỗng (18 dòng) |
| **U1** (not-found trong `get_sutta`) | `awk '/^    const \[suttaplex, bilaraData\] = await Promise.all\(\[/,/^    const citation = formatCitation\(suttaplex\);$/'` so với `specs/get-sutta-unknown-uid/design.md` | diff rỗng (14 dòng) |

Mạnh hơn các matcher trên là lệnh lắp ráp ở §Lắp ráp. Lệnh đó khóa **toàn bộ** phần còn lại của file vào `40846bb`: dòng 1–31 (ba helper fetch), dòng 109–190 (`extractText()`, `formatCitation()`, `formatUnavailable()`, `server`) và dòng 231–519 (bốn tool còn lại, `DIVISIONS`, `main()`).

**Số dòng và văn xuôi của spec tiền nhiệm: không sửa.** Các tham chiếu `src/index.ts:NNN` trong design tiền nhiệm là số đo có ngày. Không matcher nào khóa theo số dòng. Có một số đo có ngày sẽ lệch: `specs/get-sutta-unknown-uid/design.md` ghi `grep -c 'fetch(' src/index.ts` = 3. Sau spec này con số đó là **4**, vì có thêm `fetchSearch()`. Đó là số đo trước/sau của spec kia, không phải bất biến chạy tiếp. Danh sách bất biến chạy tiếp là NFR-7, và NFR-7 không gồm chỉ số này.

## Data Model

Không có kiểu mới. `data` (body JSON của search) có kiểu `any`, giống ba helper fetch hiện có. Ba hằng module-scope mới nằm trong S2:

| Hằng | Kiểu | Ràng buộc |
|---|---|---|
| `SEARCH_PAGE_SIZE` | `number` = `10` | Vừa là `limit` gửi API, vừa là kích thước cắt trang tiêu đề và bước `offset`. FR-1 và FR-17 cố định N = 10, nên không phải tham số. |
| `VI_TOPIC_TERMS` | `Map<string, string>`, 14 cặp | Key ở dạng NFC, chữ thường, các từ cách nhau một dấu cách. Mỗi key ánh xạ sang đúng một thuật ngữ. Không chứa UID (FR-5). Đây là SSOT (FR-2). Thứ tự chèn là thứ tự in trong câu FR-11 (b). |
| `DIFFICULTY_NAMES` | `Map<unknown, string>` | `1` → `beginner`, `2` → `intermediate`, `3` → `advanced`. So sánh bằng SameValueZero nên `"2"` không khớp. Giá trị khác (đo được: `null`) cho `undefined`, và `formatCitation()` in `unknown` như hiện nay (FR-8). |

### Bảng ánh xạ đã chốt (FR-2)

**Luật chọn.**

- **Tập ứng viên** của mỗi key là hợp của hai nguồn: các key Anh/Pali cùng nhóm trong `TOPIC_INDEX` hiện tại, và các ứng viên ở §Ánh xạ của requirements.
- **Bước 1:** loại ứng viên không đạt FR-2, tức không có ≥ 1 kết quả ở trang 1 với `match=all` cho cả `en` lẫn `vi`. Riêng `chánh niệm` còn phải có `mn10` ở trang 1 với `match=title`, cả hai `language`.
- **Bước 2:** chọn ứng viên có **min(n_en, n_vi)** lớn nhất, với n là số kết quả in ở trang 1 `match=all`. Luật này ưu tiên thuật ngữ cho kết quả tốt ở **cả hai** language. Thuật ngữ Pali thường thắng ở bước này vì khớp `original_title` bất kể `language`.
- **Bước 3 (khi hòa):** chọn ứng viên có n_en lớn hơn.

Số đo ngày 2026-10-18, `limit=10`, `offset` 0, đếm sau lọc FR-7 và khử trùng FR-6. Ký hiệu: `tiêu đề/nội dung (n)`. Cột n của thuật ngữ được chọn trùng với số `Tìm thấy {n}` mà bản dựng thử in ra qua stdio cho cả 28 lần chạy.

| Key | Thuật ngữ | `language=en` | `language=vi` | Ứng viên bị loại: min(n_en, n_vi) hoặc lý do |
|---|---|---|---|---|
| `tứ diệu đế` | `four noble truths` | 10/7 (17) | 0/7 (7) | (không có ứng viên khác trong nhóm) |
| `khổ` | `dukkha` | 10/10 (20) | 10/10 (20) | (không có ứng viên khác trong nhóm) |
| `bát chánh đạo` | `eightfold path` | 2/5 (7) | 0/5 (5) | `noble eightfold path` 1/5 (6) · 0/5 (5): hòa min 5, thua ở bước 3 |
| `vô ngã` | `anatta` | 6/5 (11) | 8/9 (17) | `not-self` 10/6 (16) · 0/6 (6): min 6 |
| `chánh niệm` | `satipatthana` | 3/4 (7), `mn10` thứ 2 trong tiêu đề | 3/9 (12), `mn10` thứ 2 trong tiêu đề | `mindfulness`: `en` có `mn10` ở vị trí tiêu đề thứ 12 (trang 2), `vi` có 0 kết quả tiêu đề → trượt FR-2 |
| `vô thường` | `anicca` | 8/6 (14) | 8/9 (17) | `impermanence` 10/8 (18) · 0/8 (8): min 8 |
| `từ bi` | `metta` | 8/7 (15) | 7/9 (16) | `loving-kindness` 0/9 (9) · 0/9 (9): min 9 |
| `duyên khởi` | `dependent origination` | 5/10 (15) | 0/10 (10) | `paticca-samuppada`: 0 kết quả (requirements §Assumptions) → trượt FR-2 |
| `ngũ uẩn` | `khandha` | 8/5 (13) | 7/8 (15) | `aggregates` 10/5 (15) · 0/6 (6): min 6; `five aggregates` 0/9 · 0/9: min 9 |
| `niết bàn` | `nibbana` | 10/8 (18) | 10/9 (19) | `nirvana` 10/10 (20) · 0/10 (10): min 10 |
| `nghiệp` | `kamma` | 3/10 (13) | 3/10 (13) | `karma` 10/10 (20) · 0/10 (10): min 10 |
| `thiền` | `jhana` | 9/10 (19) | 2/10 (12) | `meditation` 10/10 (20) · 0/10 (10): min 10 |
| `tam bảo` | `three jewels` | 0/7 (7) | 0/7 (7) | `triple gem` 0/3 · 0/3: min 3 |
| `quy y` | `going for refuge` | 0/9 (9) | 0/9 (9) | `refuge` 2/7 (9) · 0/7 (7): min 7 |

Ghi chú về bảng:

- **Khớp với requirements.** Mười bốn thuật ngữ được chọn đều là ứng viên đầu tiên của dòng tương ứng trong bảng §Ánh xạ của requirements. Mọi số tiêu đề/nội dung của chúng khớp số requirements đã ghi, trừ chỗ trang 1 cắt tiêu đề ở 10: requirements ghi tổng `suttaplex` (ví dụ `nibbana` 16), còn bảng này ghi số in ở trang 1 (10).
- **Thuật ngữ Pali ngoài nhóm cũng đã đo nhưng không được xét**, vì nằm ngoài tập ứng viên: `ariyasacca` 0/1 · 0/1; `sacca` 1/2 · 1/4; `paticcasamuppada` 1/3 · 1/3; `atthangika` 2/5 · 2/5; `saranagamana` 0/1 · 0/1; `tisarana` 0/1 · 0/1. Có một trường hợp, nếu đưa vào tập ứng viên, sẽ thắng ở bước 2: `atthangika` (min 7) hơn `eightfold path` (min 5). Nhưng toàn chỉ mục chỉ có 8 document khớp `atthangika`, so với 415 của `eightfold path`, nên `atthangika` hết kết quả ngay trang 1. Xem §Alternative F.
- **Hành vi khi thay đổi bảng.** Đổi một thuật ngữ chỉ đổi một dòng trong S2. AC-2 là lưới kiểm cho cả 14 key.

### Field của response được đọc

| Field | Dùng ở | Xử lý khi vắng hoặc sai kiểu |
|---|---|---|
| `suttaplex` | T (FR-6) | không phải mảng → `[]` (FR-12) |
| `hits` | C (FR-6), `h` (FR-18) | không phải mảng → `[]` (FR-12) |
| `total` | FR-18 | không phải số → `0` (FR-12) |
| `error.message` | FR-11, chỉ khi trang 1 rỗng | không phải chuỗi → không in |
| phần tử: `category`, `uid`, `is_article` | lọc FR-7 | xem `isSutta` trong S3 |
| `suttaplex[i]`: `uid`, `acronym`, `translated_title`, `original_title`, `parallel_count`, `difficulty`, `blurb` | `formatTitleMatch()` → `formatCitation()` | fallback sẵn có của `formatCitation()`: `difficulty` qua `DIFFICULTY_NAMES` |
| `hits[i]`: `uid`, `acronym`, `name`, `root_name`, `author`, `lang` | `formatContentMatch()` | FR-9: `acronym` vắng/rỗng → `uid` in hoa; `name` → `root_name` → không có ` — `; `author` vắng/rỗng → bỏ dòng `Text:`; `lang` vắng → bỏ ` ({lang})` |

Code mới không đọc `highlight`, `is_segmented`, `segmented_uid`, `fuzzy_dictionary` (FR-9, NFR-7).

## API / Interface Contracts

Interface ra ngoài gồm `inputSchema` và chuỗi text của `search_topic`. Ba khối dưới đây là **đoạn liên tục** của `src/index.ts` sau thay đổi. Chép đúng từng ký tự, comment tính là một phần của luật. Vehicle kiểm là `diff`, không phải `grep` (§Lắp ráp).

### S1 — `fetchSearch()` — **[NORMATIVE]**

Đặt ngay sau `fetchParallels()`, cách một dòng trống, trong section "SuttaCentral API helpers". Cùng khuôn với ba helper hiện có: một `fetch`, ném `SuttaCentral API error: {status}` khi `!res.ok`, không bắt lỗi, không retry, không timeout (FR-12).

```ts
async function fetchSearch(query: string, language: string, offset: number) {
  const params = new URLSearchParams({ query, language, limit: String(SEARCH_PAGE_SIZE) });
  if (offset > 0) params.set("offset", String(offset));
  const res = await fetch(`${SC_BASE}/search/instant?${params}`);
  if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
  return res.json();
}
```

Tính chất:

- **`offset` chỉ có mặt khi > 0.** Handler truyền `offset = 0` cho `match=title` và cho trang 1, nên query string chỉ có `offset` khi `match` ∈ {`content`, `all`} và `page > 1`. Đây đúng là điều kiện của FR-1. Không có `selectedLanguages`, `restrict`, `matchpartial`, `page`, `from`. Method là GET mặc định.
- **Encode.** `URLSearchParams` encode dấu cách thành `+`, đo trên bản dựng thử: `query=four+noble+truths`. Upstream giải `+` thành dấu cách, nên cho cùng kết quả với `%20`. Dấu `+` có thật trong topic được encode `%2B`, và upstream vẫn đổi nó thành dấu cách. Requirements ghi đây là hành vi của SC và không bù.
- `SEARCH_PAGE_SIZE` được khai báo trong S2, tức sau S1 trong file. Hằng chỉ được đọc khi hàm chạy, lúc module đã khởi tạo xong, nên không có lỗi TDZ. Không lần gọi nào trên bản dựng thử gặp lỗi này.

### S2 — section search — **[NORMATIVE]**

Thay toàn bộ section cũ, từ dòng `// ─── Topic → UID index (tĩnh, đủ cho prototype) ───…` tới hết `searchByTopic()`. Section mới có bảng ánh xạ, hai hằng và hai formatter. `formatTitleMatch()` gọi `formatCitation()`, một hàm khai báo phía dưới. Function declaration được hoist, nên lời gọi hợp lệ.

```ts
// ─── Search: chủ đề → /api/search/instant (spec dynamic-search) ──────────────

// Mỗi trang: tối đa 10 kết quả khớp tiêu đề + 10 kết quả khớp nội dung; cũng là `limit` gửi API.
const SEARCH_PAGE_SIZE = 10;

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
function formatTitleMatch(sp: any): string {
  const citation = formatCitation({ ...sp, difficulty: { name: DIFFICULTY_NAMES.get(sp.difficulty) } });
  return sp.blurb ? `${citation}\n→ ${sp.blurb}` : citation;
}

// Khớp nội dung: hit là MỘT bản văn (dịch hoặc gốc), không có blurb/difficulty/parallels —
// không bịa các dòng đó. `name` rỗng (bản Āgama) → `root_name`; thiếu `author` → bỏ dòng Text.
function formatContentMatch(hit: any): string {
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
```

Tính chất cần giữ, vì compiler không bắt được:

- **`formatTitleMatch()` không sửa `sp`.** Spread tạo bản sao nông, chỉ ghi đè `difficulty`. Các field khác `formatCitation()` đọc (`uid`, `acronym`, `translated_title`, `original_title`, `parallel_count`) đi qua nguyên vẹn. Kiểm trên bản dựng thử: `mn10` của `satipatthana` cho `Difficulty: intermediate | Parallels: 16` (AC-7).
- **`formatContentMatch()` có `hit.uid.toUpperCase()` không cần `?.`**, vì chỉ được gọi với phần tử đã qua `isSutta`, tức `uid` là chuỗi khác rỗng. Các fallback dùng `typeof … === "string" &&` và `||`, nên `null`, `""` và chuỗi toàn khoảng trắng đều rơi xuống fallback kế tiếp. Không có nhánh nào in ra `null` hay `undefined` (AC-15).
- **Chuỗi trong S2 và S3 không chứa** `sujato`, `segmented`, `TOPIC_INDEX`, hay tên dịch giả nào của NFR-7. Đo trên bản dựng thử: 3 / 3 / 0, `TOPIC_INDEX` 0.

### S3 — tool `search_topic` — **[NORMATIVE]**

Thay toàn bộ đăng ký tool cũ, từ dòng `// Tool 1: search_topic` tới dòng `);` đóng `server.tool(`. Schema giữ `topic` và `language` (tên, kiểu, mặc định), thêm `match` và `page` (FR-13). `describe()` được viết lại theo FR-13.

```ts
// Tool 1: search_topic
server.tool(
  "search_topic",
  "Tìm sutta theo chủ đề bằng search của SuttaCentral. Kết quả theo thứ tự kinh điển (không theo độ liên quan), mỗi trang tối đa 10 sutta khớp tiêu đề + 10 sutta khớp nội dung, mỗi kết quả có UID và link SuttaCentral. Chủ đề tiếng Việt chỉ hỗ trợ các key có sẵn (được ánh xạ sang thuật ngữ Anh/Pali); chủ đề tiếng Việt khác nên dịch sang thuật ngữ Anh/Pali trước khi gọi.",
  {
    topic: z.string().describe(
      "Chủ đề cần tìm, ví dụ: 'mindfulness', 'satipatthana', 'four noble truths', 'vô ngã'. Thuật ngữ Anh/Pali được gửi thẳng tới search của SuttaCentral."
    ),
    language: z
      .string()
      .default("en")
      .describe(
        "Ngôn ngữ của tiêu đề và blurb khi SuttaCentral có, ví dụ 'en' hoặc 'vi'. Cũng ảnh hưởng việc khớp tiêu đề: với 'vi', thuật ngữ tiếng Anh thường không khớp tiêu đề nào."
      ),
    match: z
      .enum(["title", "content", "all"])
      .default("all")
      .describe(
        "'title': chỉ sutta có tiêu đề khớp; 'content': chỉ sutta khớp trong nội dung, không gồm sutta đã khớp tiêu đề; 'all' (mặc định): cả hai, khớp tiêu đề trước."
      ),
    page: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .default(1)
      .describe(
        "Trang kết quả, bắt đầu từ 1. Khi output kết thúc bằng 'Còn kết quả', gọi lại với page kế tiếp, giữ nguyên topic, language, match."
      ),
  },
  async ({ topic, language, match, page }) => {
    // Key bảng: NFC → chữ thường → trim → gộp khoảng trắng, khớp CHÍNH XÁC. Không khớp: gửi
    // topic chỉ qua NFC + trim (giữ hoa/thường, khoảng trắng bên trong).
    const key = topic.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ");
    const term = VI_TOPIC_TERMS.get(key);
    const query = term ?? topic.normalize("NFC").trim();
    const termLine = term ? [`Thuật ngữ đã dùng để tìm trên SuttaCentral: "${term}"`] : [];

    const noResults = (scError: string[]) => [
      `Không tìm thấy sutta nào cho chủ đề "${topic}".`,
      ...termLine,
      ...scError,
      "",
      `Gợi ý: search của SuttaCentral hiểu thuật ngữ tiếng Anh hoặc Pali — thử lại với thuật ngữ tương ứng (ví dụ "satipatthana", "dependent origination").`,
      ...(match !== "all"
        ? [`Đang dùng match="${match}" — thử match="all" để xem cả khớp tiêu đề lẫn khớp nội dung.`]
        : []),
      `Chủ đề tiếng Việt có sẵn: ${[...VI_TOPIC_TERMS.keys()].join(", ")}`,
    ];

    if (query === "") {
      return { content: [{ type: "text", text: noResults([]).join("\n") }] };
    }

    // Trang tiêu đề cắt cục bộ (không cần offset); trang nội dung dùng offset của API.
    const offset = match === "title" ? 0 : (page - 1) * SEARCH_PAGE_SIZE;
    const data = await fetchSearch(query, language, offset);
    const suttaplex: any[] = Array.isArray(data?.suttaplex) ? data.suttaplex : [];
    const hits: any[] = Array.isArray(data?.hits) ? data.hits : [];
    const total = typeof data?.total === "number" ? data.total : 0;

    // Loại dictionary (`category`), phần tử không có uid, bài viết (`is_article`).
    const hasCategory = (e: any) => typeof e === "object" && e !== null && "category" in e;
    const isSutta = (e: any) =>
      !hasCategory(e) && typeof e?.uid === "string" && e.uid !== "" && e.is_article !== true;
    // Giữ phần tử đầu tiên của mỗi uid; `seen` truyền vào để khử trùng xuyên nhóm trong trang.
    const takeNew = (items: any[], seen: Set<string>) =>
      items.filter((e) => {
        if (seen.has(e.uid)) return false;
        seen.add(e.uid);
        return true;
      });

    const titles = takeNew(suttaplex.filter(isSutta), new Set());
    const titlePage =
      match === "content"
        ? []
        : titles.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE);
    const contentPage =
      match === "title"
        ? []
        : takeNew(hits.filter(isSutta), new Set(titlePage.map((e) => e.uid)));

    // Còn trang sau: chỉ suy từ response này. h đếm hit không có `category`, TRƯỚC khi lọc bài
    // viết/uid; h > 0 chặn trường hợp upstream trả total = số suttaplex khi hits rỗng.
    const h = hits.filter((e) => !hasCategory(e)).length;
    const moreTitles = page * SEARCH_PAGE_SIZE < titles.length;
    const moreContent = h > 0 && offset + h < total;
    const more =
      match === "title" ? moreTitles : match === "content" ? moreContent : moreTitles || moreContent;
    const footer = more
      ? `Còn kết quả: gọi lại search_topic với page=${page + 1} (giữ nguyên topic, language, match).`
      : "Hết kết quả.";

    const n = titlePage.length + contentPage.length;
    let lines: string[];
    if (n === 0 && page === 1) {
      const scError =
        typeof data?.error?.message === "string"
          ? [`SuttaCentral báo lỗi truy vấn: ${data.error.message}`]
          : [];
      lines = [...noResults(scError), "", footer];
    } else if (n === 0) {
      lines = [`Không có kết quả sutta ở trang ${page} cho chủ đề "${topic}".`, "", footer];
    } else {
      lines = [`Tìm thấy ${n} sutta cho chủ đề "${topic}" (trang ${page}):`, ...termLine, ""];
      if (titlePage.length > 0) {
        lines.push("Khớp tiêu đề:", "");
        for (const sp of titlePage) lines.push(formatTitleMatch(sp), "");
      }
      if (contentPage.length > 0) {
        lines.push("Khớp nội dung:", "");
        for (const hit of contentPage) lines.push(formatContentMatch(hit), "");
      }
      lines.push(footer);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);
```

Ánh xạ requirement vào S3:

| Requirement | Chỗ trong S3 |
|---|---|
| FR-3, FR-4, AC-3, AC-4 | ba dòng `key` / `term` / `query`. NFC đứng trước mọi bước khác, nên input NFD khớp key (đo: dạng escape JSON `vo\u0302 nga\u0303` của AC-3 → `anatta`) |
| FR-10 (dòng thuật ngữ) | `termLine` |
| FR-11 (a)(b)(c) + lỗi SC | `noResults()` và `scError`. (c) chỉ in khi `match !== "all"`. Với `topic` rỗng, hàm cũng chạy theo đúng luật này. |
| FR-11, nhánh không request | `if (query === "")`. `query` rỗng khi và chỉ khi `NFC(topic).trim()` rỗng, vì `term` không bao giờ rỗng |
| FR-1, FR-17 (offset) | `const offset = …` cùng nhánh `offset > 0` của S1 |
| FR-12 | ba dòng `Array.isArray`/`typeof`. `await fetchSearch()` không nằm trong `try` |
| FR-7 | `hasCategory`, `isSutta` |
| FR-6 | `titles`, `titlePage`, `contentPage` (tập `seen` của nội dung khởi đầu bằng `uid` của `titlePage`) |
| FR-18, FR-19 | `h`, `moreTitles`, `moreContent`, `more`, `footer` |
| FR-10, FR-11, FR-20 (bố cục) | khối `if (n === 0 && page === 1) … else if (n === 0) … else …` |

**Bố cục output** (đo trên bản dựng thử). Literal nằm ở S3; ví dụ dưới đây chỉ minh họa, không phải nguồn literal. Mỗi kết quả kết thúc bằng một dòng trống. Dòng nhóm có một dòng trống theo sau. Footer là dòng cuối, không có newline sau nó.

`{"topic":"chánh niệm"}` (rút gọn ở `…`):

```
Tìm thấy 7 sutta cho chủ đề "chánh niệm" (trang 1):
Thuật ngữ đã dùng để tìm trên SuttaCentral: "satipatthana"

Khớp tiêu đề:

**AN 4.274** — Mindfulness Meditation 
Difficulty: unknown | Parallels: 0
URL: https://suttacentral.net/an4.274
→ Develop insight into greed through the four kinds of mindfulness meditation.

**MN 10** — The Discourse on Mindfulness Meditation 
Difficulty: intermediate | Parallels: 16
URL: https://suttacentral.net/mn10
→ Here the Buddha details the seventh factor of the noble eightfold path, mindfulness meditation. …

**SN 43.5** — Mindfulness Meditation 
Difficulty: unknown | Parallels: 0
URL: https://suttacentral.net/sn43.5

Khớp nội dung:

**Mil 5.3.7** — Adoration Of Relics
Text: T.W. Rhys Davids (en)
URL: https://suttacentral.net/mil5.3.7

**AN 8.19** — Pahārādasutta
Text: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (pli)
URL: https://suttacentral.net/an8.19

…

Còn kết quả: gọi lại search_topic với page=2 (giữ nguyên topic, language, match).
```

Có hai điều quan sát được nằm ngoài kiểm soát của code:

- **Khoảng trắng cuối dòng.** `translated_title` của SC có khoảng trắng cuối, ví dụ `"Mindfulness Meditation "`. `/api/suttaplex/an4.154` cũng trả `"The Power of Mindfulness "`, nên `get_sutta_meta` in y như vậy. Design giữ nguyên để citation của khớp tiêu đề có cùng hình dạng `formatCitation()` (FR-8). Hệ quả cho verify: kiểm dòng tiêu đề bằng chuỗi con (`grep -F`), không bằng khớp cả dòng (`grep -x`).
- **`Difficulty: unknown` phổ biến.** Phần lớn phần tử `suttaplex` của search có `difficulty: null`, đo trên 28 response của bảng ánh xạ. Chỉ một số sutta có số, ví dụ `mn10` → `2`. `unknown` là fallback hiện có của `formatCitation()`, không phải lỗi ánh xạ.

`{"topic":"vô ngã tướng","language":"vi","match":"content"}` (FR-11, có request, `match` ≠ `all`):

```
Không tìm thấy sutta nào cho chủ đề "vô ngã tướng".

Gợi ý: search của SuttaCentral hiểu thuật ngữ tiếng Anh hoặc Pali — thử lại với thuật ngữ tương ứng (ví dụ "satipatthana", "dependent origination").
Đang dùng match="content" — thử match="all" để xem cả khớp tiêu đề lẫn khớp nội dung.
Chủ đề tiếng Việt có sẵn: tứ diệu đế, khổ, bát chánh đạo, vô ngã, chánh niệm, vô thường, từ bi, duyên khởi, ngũ uẩn, niết bàn, nghiệp, thiền, tam bảo, quy y

Hết kết quả.
```

`{"topic":"foo:bar"}` có thêm dòng thứ hai `SuttaCentral báo lỗi truy vấn: Unknown filter: "foo:"`. `{"topic":""}` cho bốn dòng (câu không tìm thấy, dòng trống, dòng gợi ý, dòng danh sách key), **không** có dòng trống cuối, **không** footer (không có request). `{"topic":"mindfulness","match":"title","page":5}` (FR-20):

```
Không có kết quả sutta ở trang 5 cho chủ đề "mindfulness".

Hết kết quả.
```

**`inputSchema`** do SDK 1.29.0 sinh từ zod 3.25.76, đo bằng `tools/list` trên bản dựng thử (bỏ `description`): `"match":{"type":"string","enum":["title","content","all"],"default":"all"}`, `"page":{"type":"integer","minimum":1,"maximum":10000,"default":1}`, `"required":["topic"]`. Khớp AC-14.

### Lắp ráp — vị trí ba khối trong file — **[NORMATIVE]**

`src/index.ts` sau thay đổi phải **trùng từng byte** với file lắp từ `40846bb` và ba khối của design này:

```sh
REPO=$(git rev-parse --show-toplevel); DS="$REPO/specs/dynamic-search/design.md"
OLD=$(mktemp); git -C "$REPO" show 40846bb:src/index.ts > "$OLD"
S1='/^async function fetchSearch/,/^}$/'
S2='/^\/\/ ─── Search: chủ đề/{f=1} f{print} f&&/^}$/{if(++n==2)exit}'
S3='/^\/\/ Tool 1: search_topic$/,/^\);$/'
{ sed -n '1,31p' "$OLD"; awk "$S1" "$DS"; echo; awk "$S2" "$DS"; sed -n '109,190p' "$OLD"; awk "$S3" "$DS"; sed -n '231,$p' "$OLD"; } \
  | diff - "$REPO/src/index.ts" && echo ASSEMBLY-OK
wc -l < "$OLD"; rm -f "$OLD"     # 40846bb có 519 dòng; S1 7, S2 54, S3 120 dòng; file mới 584 dòng
```

Đã chạy lệnh này giữa chính file design này và `src/index.ts` của bản dựng thử: in `ASSEMBLY-OK`. Mỗi pattern awk chỉ khớp **một** code fence trong design này, vì ba dòng mở đầu chỉ xuất hiện ở đầu dòng trong fence của chúng. Lệnh này khóa đồng thời:

- (a) nội dung S1, S2, S3;
- (b) vị trí của chúng: S1 ngay sau `fetchParallels()`, rồi một dòng trống, rồi S2 thay dòng 32–108, rồi S3 thay dòng 191–230;
- (c) mọi dòng còn lại trùng `40846bb`. Nhờ đó có FR-14 ở mức code, và mọi vùng ở §Vùng được bảo vệ được giữ nguyên;
- (d) FR-5: `TOPIC_INDEX` và `searchByTopic()` không còn.

Số dòng `40846bb` trong lệnh (31, 109–190, 231) trỏ vào một commit bất biến, nên không trôi.

## Component Boundaries

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `fetchSearch()` | new (S1) | Một GET `/api/search/instant`, ném lỗi HTTP như các helper khác |
| `SEARCH_PAGE_SIZE`, `VI_TOPIC_TERMS`, `DIFFICULTY_NAMES` | new (S2) | Kích thước trang; bảng ánh xạ SSOT (FR-2); ánh xạ độ khó (FR-8) |
| `formatTitleMatch()` | new (S2) | Citation khớp tiêu đề qua `formatCitation()` + blurb (FR-8) |
| `formatContentMatch()` | new (S2) | Citation rút gọn khớp nội dung (FR-9) |
| Tool `search_topic` (schema + handler) | modified (S3, viết lại) | FR-1, FR-3, FR-4, FR-6, FR-7, FR-10, FR-11, FR-13, FR-16..FR-20 |
| `TOPIC_INDEX`, `searchByTopic()` | **removed** | FR-5 |
| `fetchSuttaplex()`, `fetchBilaraText()` (N3-A), `fetchParallels()`, kiểu `Segment`/`ExtractedText` (N5-T), `extractText()` (N1-A), `formatCitation()`, `formatUnavailable()`, `server`, handler `get_sutta` (U1, khối retry N3-B, gate N1-B), `get_sutta_meta`, `get_parallels`, `DIVISIONS`, `PITAKA_LABELS`, `formatDivisions()`, `list_divisions`, `main()` | không đổi | FR-14; khóa bằng §Lắp ráp |

Có 3 hàm module-scope mới (`fetchSearch`, `formatTitleMatch`, `formatContentMatch`) và 3 hằng mới. Có 2 định nghĩa bị xóa (`TOPIC_INDEX`, `searchByTopic`). `hasCategory`, `isSutta`, `takeNew`, `noResults` là closure trong handler: chúng chỉ phục vụ một lời gọi và đọc `match`, `termLine`.

## Integration Points

- **Upstream SuttaCentral.** Thêm một endpoint, `GET /api/search/instant`. `search_topic` không còn gọi `/api/suttaplex/`. Số request mỗi lời gọi `search_topic` giảm từ tối đa 3 (tuần tự) xuống 1, hoặc 0 khi `topic` rỗng hay schema từ chối (NFR-4). Request của bốn tool còn lại không đổi.
- **Downstream (Claude).**
  - `inputSchema` có thêm hai tham số tùy chọn, có mặc định. Lời gọi cũ `{topic, language}` vẫn hợp lệ và nhận trang 1 `match=all`.
  - Chữ output đổi: header có `(trang N)`, có dòng nhóm, có footer.
  - Caller nối tiếp bằng `get_sutta`/`get_parallels` với `uid` lấy từ dòng `URL:`. UID của hit (ví dụ `an1.296-305`) phục vụ được qua `/api/suttaplex/` (requirements §Assumptions).
- **Tài liệu (FR-15).** Sáu khối dưới đây. A-1 áp cuối cùng và kéo theo một lần cập nhật `workflow-contract.json`, xem §Thứ tự áp dụng.

### Khối sửa tài liệu — **[NORMATIVE]**

Mỗi khối thay một đoạn liên tục của file đích. Đoạn đó được xác định bằng **dòng neo đầu** và **dòng neo cuối** (cả hai tính vào, khớp theo nội dung, không theo số dòng). Chép đúng từng ký tự. Literal của mỗi đích chỉ có ở khối của nó; văn xuôi ở chỗ khác chỉ trỏ tới tên khối.

Đã mô phỏng cả sáu khối trên bản sao của `README.md`, `AGENTS.md` và `specs/sutta-mcp-requirements.md` (thay theo neo bằng script), rồi chạy matcher của AC-14 trên kết quả, xem §Testability.

#### Thứ tự áp dụng — ràng buộc cho task planner

`AGENTS.md` được pin trong `workflow-contract.json` là dependency `context:agents` (sha256 `ecd1fdd6c81ca2ced6d7633f5b424d828839cc9988ded3c173514d5af94afd15`). Áp A-1 chắc chắn đổi hash đó (FR-15 bắt buộc sửa), và workflow coi đó là drift. Orchestrator không có quyền tự bỏ qua: drift chặn mọi lần ghi cho tới khi một lần cập nhật contract hoặc reconciliation settle nó (`workflow.md` §Invariants), và `complete_workflow()` từ chối hoàn tất khi còn dependency drift. Hoãn A-1 ra sau khi workflow hoàn tất cũng không hợp lệ: FR-15 đòi cập nhật cùng thay đổi, và mệnh đề AGENTS.md của AC-14 khi đó không được verify hay code review. Vì vậy:

1. **A-1 là task build cuối cùng, một task riêng, chỉ sửa `AGENTS.md`.** Mọi task sửa `src/index.ts` (S1–S3), `README.md` (R-1, R-2) và `specs/sutta-mcp-requirements.md` (M-1..M-3) xong trước nó. Như vậy không lần dispatch task nào sau A-1 gặp drift, và một lần cập nhật contract là đủ.
2. **Ngay sau task A-1, trước code review on-completion**, orchestrator chạy đường cập nhật contract dùng chung của `~/.claude/spec-workflow/lib/workflow_contracts.py` (xem `workflow.md`):
   - `preview_contract_update`: thay đổi duy nhất mong đợi là `dependencies.context:agents` (sha256 mới của `AGENTS.md`). Có thay đổi nào khác thì dừng và báo người dùng.
   - Trình preview cho người dùng, gồm danh sách gate bị ảnh hưởng. Theo `_affected_scope`, dependency này cho scope `{"type":"contract","id":"dependencies.context:agents"}`, không phải scope artifact, nên không mở lại requirements, design hay tasks.
   - `authorize_contract_update`: **chỉ khi người dùng đồng ý rõ ràng tại đúng thời điểm này**. Đây là một điểm dừng chờ người dùng có chủ đích trong pha build; không agent nào authorize thay người dùng.
   - `write_contract_atomic` rồi `finish_contract_update`.
   - `settle_contract_invalidation`: invalidation scope `contract` được settle bằng chính quyết định contract-update.
3. **Code review on-completion chỉ được dispatch sau bước 2.** Khi đó `AGENTS.md` mới là context đã pin, và review bao gồm cả A-1 (mệnh đề AGENTS.md của AC-14).
4. **Nếu người dùng không authorize**, workflow dừng ở trạng thái drift. Lựa chọn còn lại theo protocol là khôi phục `AGENTS.md`, tức bỏ A-1. Việc đó trái FR-15 và cần một lần sửa requirements, design này không tự quyết.

**R-1**, `README.md`. Neo đầu = neo cuối = dòng bắt đầu bằng `` | `search_topic` | `` (bảng Tools).

```markdown
| `search_topic` | Tìm sutta theo chủ đề qua search của SuttaCentral; `match` chọn khớp tiêu đề/nội dung/cả hai (`title`/`content`/`all`), `page` lật trang (mỗi trang tối đa 10 + 10 kết quả) |
```

**R-2**, `README.md`. Neo đầu `## Chủ đề có sẵn`, neo cuối là dòng bắt đầu bằng `Đây là prototype — bước tiếp theo`. Đoạn này gồm hai section "Chủ đề có sẵn" và "Mở rộng"; dòng trống trước `## Lưu ý` giữ nguyên.

```markdown
## Chủ đề có sẵn

Thuật ngữ tiếng Anh hoặc Pali (`mindfulness`, `satipatthana`, `four noble truths`, `anatta`...) được gửi thẳng
tới search của SuttaCentral. Search đó không hiểu tiếng Việt, nên 14 chủ đề tiếng Việt sau được ánh xạ sang
một thuật ngữ Anh/Pali trước khi tìm:

`tứ diệu đế`, `khổ`, `bát chánh đạo`, `vô ngã`, `chánh niệm`, `vô thường`, `từ bi`,
`duyên khởi`, `ngũ uẩn`, `niết bàn`, `nghiệp`, `thiền`, `tam bảo`, `quy y`

Chủ đề tiếng Việt khác cần được dịch sang thuật ngữ Anh/Pali trước khi gọi `search_topic`.
Nguồn chính của danh sách này là bảng `VI_TOPIC_TERMS` trong `src/index.ts`.

## Mở rộng

Để thêm chủ đề tiếng Việt, thêm một cặp `[key, thuật ngữ]` vào `VI_TOPIC_TERMS` trong `src/index.ts`
(key: chữ thường, dạng NFC; thuật ngữ: một thuật ngữ Anh/Pali). Đo trước khi thêm: thuật ngữ phải cho ít nhất
1 kết quả sutta ở trang 1 với `match=all`, cả `language=en` lẫn `language=vi`.
```

**A-1**, `AGENTS.md`. Neo đầu là dòng bắt đầu bằng `Single-file server:`, neo cuối là dòng bắt đầu bằng ``To add new topics, add entries to the `TOPIC_INDEX` ``. Đoạn này gồm phần thân section "Architecture" và section "Extending the Topic Index" (heading được đổi tên). Các dòng `get_sutta`…`list_divisions` và ba dòng endpoint cũ được chép lại không đổi. AGENTS.md viết bằng tiếng Anh, nên khối này bằng tiếng Anh. Số `~585` lấy từ file lắp ráp (584 dòng).

```markdown
Single-file server: `src/index.ts` (~585 lines). Everything lives here.

**Three layers:**

1. **SuttaCentral API helpers** — `fetchSuttaplex()`, `fetchBilaraText()`, `fetchParallels()`, `fetchSearch()` wrapping `https://suttacentral.net/api`.
2. **Vietnamese topic mapping** — `VI_TOPIC_TERMS` is a static `Map` from 14 Vietnamese topic keys to one English/Pali search term each, because SuttaCentral's search API (`/api/search/instant`) does not handle Vietnamese queries. A topic matches a key only exactly, after NFC, lowercasing, trimming and collapsing whitespace; every other topic is sent to the search API unchanged (NFC + trim).
3. **MCP tool definitions** — five tools registered via `server.tool()`:
   - `search_topic` — one `/api/search/instant` request per call; title matches (`suttaplex`) then content matches (`hits`), canonical order, non-sutta entries filtered out, selected by `match` (`title`/`content`/`all`) and paged by `page` (up to 10 + 10 results per page)
   - `get_sutta` — full sutta text via Bilara API, each segment prefixed with its segment ID plus a `Deep link:` header (with `max_segments` truncation)
   - `get_sutta_meta` — metadata only (blurb, difficulty, translations list)
   - `get_parallels` — cross-tradition parallel texts for a given sutta
   - `list_divisions` — hardcoded division listing filtered by pitaka (sutta/vinaya/abhidhamma); no API call

**Key SuttaCentral API endpoints used:**
- `GET /api/suttaplex/{uid}?language={lang}` — metadata
- `GET /api/bilarasuttas/{uid}/{translator}?lang={lang}` — segmented text; `lang` defaults to `en` upstream, so non-English translations are retried once with `?lang=`
- `GET /api/parallels/{uid}` — parallels
- `GET /api/search/instant?query={q}&language={lang}&limit=10` (plus `offset` for content pages) — search; GET only, not cached

## Extending the Vietnamese Topic Mapping

To support another Vietnamese topic, add a `[key, term]` pair to `VI_TOPIC_TERMS` in `src/index.ts`. The key is lowercase NFC Vietnamese with single spaces; the term is one English or Pali search term. Measure before adding: the term must return at least one sutta on page 1 with `match=all` for both `language=en` and `language=vi`. English and Pali topics need no entry — they go to the search API directly.
```

**M-1**, `specs/sutta-mcp-requirements.md`. Tìm **sau** dòng ``### Tool 1: `search_topic` ``. Neo đầu là dòng bảng `| Tham số | Kiểu | Bắt buộc | Mô tả |` đầu tiên sau dòng đó (Tool 2..5 có cùng dòng header, nên bắt buộc phải tìm sau Tool 1). Neo cuối là dòng bắt đầu bằng `**Lưu ý:** Topic index cần hỗ trợ`.

```markdown
| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `topic` | string | Có | Chủ đề cần tìm: thuật ngữ tiếng Anh/Pali, hoặc một trong các chủ đề tiếng Việt được ánh xạ |
| `language` | string | Không | Ngôn ngữ của tiêu đề và blurb (khi SC có); ảnh hưởng cả việc khớp tiêu đề. Mặc định: `en` |
| `match` | `title` / `content` / `all` | Không | Khớp tiêu đề, khớp nội dung (không gồm sutta đã khớp tiêu đề), hay cả hai. Mặc định: `all` |
| `page` | integer, 1–10000 | Không | Trang kết quả; mỗi trang tối đa 10 kết quả khớp tiêu đề + 10 kết quả khớp nội dung. Mặc định: `1` |

**Output:** Danh sách sutta của một trang, theo thứ tự kinh điển của SC: khớp tiêu đề (citation chuẩn, blurb, link SuttaCentral), rồi khớp nội dung (citation rút gọn, bản văn khớp, link SuttaCentral). Dòng cuối cho biết còn trang sau hay không.

**Nguồn dữ liệu:** Search API của SuttaCentral, `GET /api/search/instant`, đúng một request mỗi lời gọi (spec `dynamic-search`).

**Lưu ý:** Search của SC không hiểu tiếng Việt. Các chủ đề tiếng Việt thông dụng được ánh xạ sang một thuật ngữ Anh/Pali bằng bảng tĩnh trong `src/index.ts`; chủ đề tiếng Việt khác cần được dịch sang thuật ngữ Anh/Pali trước khi gọi.
```

**M-2**, `specs/sutta-mcp-requirements.md`, luồng mẫu. Neo đầu = neo cuối = dòng `Trả về: mn10, sn47.1, dn22 + blurb`. Ba UID lấy từ kết quả đo của `chánh niệm` → `satipatthana` (§Bố cục output). Dòng `Claude gọi search_topic("chánh niệm")` phía trên không đổi.

```markdown
Trả về (tìm bằng "satipatthana"): khớp tiêu đề an4.274, mn10, sn43.5 + blurb, rồi các sutta khớp nội dung
```

**M-3**, `specs/sutta-mcp-requirements.md`, roadmap mục 1. Neo đầu là dòng bắt đầu bằng `1. **Dynamic search**`, neo cuối là dòng bắt đầu bằng ``   - **GET và POST lệch `total`.**``. Dòng trống trước mục 2 giữ nguyên. Đây là dòng duy nhất trong ba file còn chứa `TOPIC_INDEX` sau thay đổi, và nó mô tả `TOPIC_INDEX` như lịch sử ("không còn dùng … đã xóa"), đúng AC-14.

```markdown
1. **Dynamic search** — **đã thực hiện (spec `dynamic-search`).** `search_topic` không còn dùng `TOPIC_INDEX` tĩnh (topic → UID hardcode, đã xóa); mỗi lời gọi phát đúng một `GET /api/search/instant?query=&language=&limit=10`, thêm `offset` khi lật trang nội dung. Bốn phát hiện đo ngày 2026-10-17/18 được giải quyết như sau:
   - **Truy vấn tiếng Việt gần như không có kết quả** → 14 chủ đề tiếng Việt được ánh xạ sang một thuật ngữ Anh/Pali (bảng `VI_TOPIC_TERMS` trong `src/index.ts`, khớp chính xác sau chuẩn hóa NFC, chữ thường, khoảng trắng); mọi truy vấn khác gửi thẳng. Không giữ danh sách UID tĩnh làm fallback.
   - **Hit không phải sutta** → loại mọi phần tử có `category` (dictionary), không có `uid`, hoặc có `is_article: true` trước khi in; output không còn `**?**` hay link `suttacentral.net/?`.
   - **Hit theo bản dịch** → hai nguồn tách bạch: `suttaplex` là khớp tiêu đề (citation đầy đủ kèm blurb), `hits` là khớp nội dung (citation rút gọn kèm dòng `Text: {author} ({lang})`); khử trùng `uid` trong một trang.
   - **GET và POST lệch `total`** → POST lấy danh sách ngôn ngữ từ body JSON, body không phải danh sách khác rỗng thì bỏ lọc ngôn ngữ; GET mặc định lọc `["en", "pli"]`. Chọn GET. `total` không phải số sutta nên không in ra.

   **Phân trang:** tham số `match` (`title`/`content`/`all`) và `page`. Trang tiêu đề cắt cục bộ từ `suttaplex` (API trả đủ mảng này trong mọi response); trang nội dung dùng `offset` của API. Server không giữ trạng thái giữa các lời gọi, nên hai trang nội dung kề nhau có thể lặp `uid` và kích thước trang thay đổi; dòng cuối output cho biết còn trang sau hay không.
```

## Cross-Cutting Concerns

### Authentication & Authorization

Không áp dụng. API SuttaCentral là API công khai, và server MCP chạy stdio cục bộ dưới quyền người dùng (nguyên trạng).

### Error Handling

| Tình huống | Hành vi | Nguồn |
|---|---|---|
| `match`/`page` sai (`both`, `Title`, `0`, `-1`, `1.5`, `10001`, `"2"`) | zod từ chối, handler không chạy, không request. SDK trả `isError: true`, text bắt đầu bằng `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:` (đo cả 7 input) | FR-16, FR-17, AC-19 |
| `topic` rỗng sau NFC + trim | câu FR-11, không request, không footer, không `isError` | FR-11 |
| HTTP không 2xx | `fetchSearch()` ném `SuttaCentral API error: {status}`, handler không bắt, SDK trả `isError: true` | FR-12 |
| Lỗi mạng (`fetch failed`, ETIMEDOUT) | ném lỗi gốc, SDK trả `isError: true`. Không retry, không timeout phía client (requirements §Assumptions) | FR-12 |
| Body 2xx không phải JSON | `res.json()` ném, xử lý như hàng trên (cùng hành vi ba helper hiện có) | FR-12 |
| Body 2xx thiếu hoặc sai kiểu `hits`/`suttaplex`/`total` | `[]` / `[]` / `0`; thường dẫn tới FR-11 + `Hết kết quả.` | FR-12 |
| SC trả `error` (lệnh lọc sai) với HTTP 200 | trang 1 rỗng: FR-11 kèm `SuttaCentral báo lỗi truy vấn: {message}` | FR-11, AC-9 |
| Phần tử dictionary / bài viết / thiếu `uid` | bị lọc, không in | FR-7, NFR-6 |
| `page` vượt cuối | FR-20 + `Hết kết quả.` (đo: `match=title` trang 5; `match=content` trang 147, 148) | FR-20 |

Không có nhánh trả kết quả một phần, không fallback danh sách tĩnh, không `try` trong handler.

### Logging & Observability

Không áp dụng. Không thêm log. Stderr vẫn chỉ có dòng khởi động `Sutta MCP server running (stdio)`.

### Performance & Scalability

| Đường | Request trước | Request sau |
|---|---|---|
| `search_topic`, topic khớp `TOPIC_INDEX` | 3 tuần tự (`/api/suttaplex/`) | 1 (`/api/search/instant`) |
| `search_topic`, không khớp / rỗng | 0 | 1 / 0 |
| `search_topic`, schema từ chối | (không có tham số mới) | 0 |
| Bốn tool còn lại | không đổi | không đổi |

Độ trễ đo trong phiên này bằng `fetch` từ Node, khoảng 90 request: 0.28–7.3 s mỗi request. Requirements ghi tối đa 13.2 s, và review 2 đo được 13.4 s. `sleep 20` của harness vẫn đủ. Không có xử lý nào khác đáng kể: xử lý một trang là vài lượt lọc và khử trùng tuyến tính trên hai mảng của response (`hits` ≤ 10 phần tử; `suttaplex` của `mindfulness` có 32). Output trang `all` dài nhất là 20 khối citation (`dukkha`: n = 20).

**Lỗi mạng thoáng qua có thật** trong phiên đo: ít nhất 4 lần `fetch failed` (ETIMEDOUT / connect timeout tới IP Cloudflare của SC), không phải lỗi HTTP. Luật chạy lại ở §Testability là bắt buộc.

### Testability & Verification

Không có test framework (NFR-1). Có ba vehicle: compiler, harness stdio (bản dựng mới, và A/B với `40846bb` cho AC-12), và diff/grep/đọc code trên repo.

#### Harness và luật hợp lệ

Dựng lại `/tmp/mcp-call.sh` từ heredoc tại `specs/non-segmented-translation-guard/requirements.md` §Harness, giữ ba luật của `specs/bilara-lang-param/requirements.md` §Harness. Thứ nhất, `npm run build` trước khi chạy. Thứ hai, mỗi lần chạy phải có đúng 1 dòng `"id":2`. Thứ ba, literal lệch thì fetch lại endpoint trước khi kết luận. Bước giải mã tạm, in text của dòng `"id":2`, lấy từ `specs/get-sutta-unknown-uid/design.md` §Baseline A/B (hàm `check`). Heredoc chạy `node ./dist/index.js` tương đối với thư mục hiện hành, nên chạy được cả bản dựng `40846bb` chỉ bằng cách đổi `cwd`.

**Luật hợp lệ của một lần chạy.** Một lần chạy chỉ được tính khi đạt mọi điều kiện áp cho loại lần chạy đó. Thiếu điều kiện nào thì chạy lại (với AC-12: chạy lại cả cặp); không kết luận pass hay regression từ lần chạy không hợp lệ.

1. **Mọi lần chạy:** có đúng 1 dòng chứa `"id":2`.
2. **Mọi lần chạy `tools/call`:** text khác `fetch failed`, và không bắt đầu bằng `SuttaCentral API error:`. AC-19 là ngoại lệ: AC-19 đòi `isError: true` với tiền tố riêng.
3. **Chỉ lần chạy `search_topic`:** dòng 1 của text bắt đầu bằng `Tìm thấy` / `Không tìm thấy` / `Không có kết quả`, hoặc (AC-19) text bắt đầu bằng tiền tố AC-19.
4. **AC-12 (bốn tool còn lại, cả bản cũ lẫn bản mới):** text khác rỗng và đạt điều kiện 2, kiểm trước khi `cmp`. Điều kiện 3 không áp: dòng 1 của bốn tool này là `────…`, `**MN 10** — …`, `**Parallels của MN10:**`, `**Sutta Pitaka (Kinh tạng):**`. Không có điều kiện này, hai output `fetch failed` giống nhau của bản cũ và bản mới sẽ cho `cmp` pass vô nghĩa.
5. **AC-14 `tools/list`:** envelope không có `result.content`, nên không dùng `check` và không áp điều kiện 2–3. Lần chạy hợp lệ khi `result.tools` là mảng có một phần tử `name` = `search_topic`.

Các mệnh đề phủ định ("không chứa X") chỉ được đánh giá trên lần chạy hợp lệ. Chạy tuần tự, không song song. Phiên đo cho thấy chạy song song làm tăng `fetch failed`.

**Input NFD (AC-3).** Dùng đúng dạng escape JSON ASCII của requirements AC-3, truyền nguyên văn trong dấu nháy đơn: `/tmp/mcp-call.sh search_topic '{"topic":"vo\u0302 nga\u0303"}'`. Lệnh chỉ gồm ký tự ASCII, nên không bước chép, dán hay terminal nào chuẩn hóa NFC được nó; không chép dạng NFD thô vào lệnh, vì một lớp chuẩn hóa NFC sẽ biến nó thành ca `vô ngã` và mệnh đề NFD của AC-3 pass vô nghĩa. `printf` của heredoc chèn `$2` qua `%s`, không diễn giải escape trong đối số, nên server nhận nguyên chuỗi JSON có `\u0302` và `\u0303`, và JSON parser của nó giải thành NFD (`76 6f cc 82 20 6e 67 61 cc 83`). Đã chạy đúng lệnh này với heredoc gốc trên bản dựng thử: 1 dòng `"id":2`, header `Tìm thấy 11 sutta cho chủ đề "…" (trang 1):` với topic in lại đúng dạng NFD caller gửi (file này không viết lại chuỗi NFD đó), dòng 2 là thuật ngữ `"anatta"`.

**Baseline AC-12.** Dựng bản `40846bb` ngoài repo như `specs/get-sutta-unknown-uid/design.md` §Baseline A/B: `git archive 40846bb src package.json tsconfig.json`, symlink `node_modules`, `npx tsc -p .`. Thay `249bb97` bằng `40846bb` ở cả dòng kiểm `git diff --quiet` lẫn lệnh `git archive`. Với mỗi input của AC-12, chạy bản cũ rồi bản mới liền nhau, và so text bằng `cmp`.

#### Vehicle theo AC

Kết quả ở cột cuối đo trên bản dựng thử ngày 2026-10-18. Trừ khi ghi khác, mỗi dòng chạy với `match` và `page` mặc định. "Đếm `URL:`" là `grep -c '^URL: https://suttacentral.net/'` trên text.

| AC | Vehicle | Kết quả trên bản dựng thử |
|---|---|---|
| AC-1 | Harness: `vô ngã`, `niết bàn`, `chánh niệm` × `en`/`vi`; `chánh niệm` × `en`/`vi` × `"match":"title"`. Dòng 1 khớp `^Tìm thấy [0-9]+ sutta cho chủ đề "…" \(trang 1\):$` với 1 ≤ n ≤ 20; dòng 2 chứa thuật ngữ; đếm `URL:` = n; `chánh niệm` có `grep -c -x 'URL: https://suttacentral.net/mn10'` = 1 | Đạt. n = 11/17, 18/19, 7/12 (en/vi); `title`: 3/3. `mn10` có ở cả 4 lần chạy `chánh niệm` |
| AC-2 | Harness, lặp 14 key × 2 `language` (28 lần); dòng 1 bắt đầu bằng `Tìm thấy`, n ≥ 1 | Đạt 28/28, n từ 5 (`bát chánh đạo`/`vi`) tới 20 (bảng §Bảng ánh xạ đã chốt) |
| AC-3 | Harness: `Vô Ngã`, `  vô   ngã  `, NFD (lệnh ở trên), `vô ngã`, chạy liền nhau, cùng `en`. So `grep '^URL:'` của bốn output; dòng 2 cả bốn = `Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"`. Đọc S3: `query` của nhánh FR-4 là `topic.normalize("NFC").trim()` | Đạt: bốn danh sách `URL:` trùng nhau (cùng md5) |
| AC-4 | Harness: `vo nga`, `thiện`, `thiền định`; `head -2 \| grep -c -E 'anatta|jhana'` = 0 trên mỗi output (AC-4 chỉ ràng buộc header; dòng kết quả có thể chứa các chuỗi này một cách hợp lệ); không có dòng `Thuật ngữ đã dùng`. Đọc S3: ba input này không khớp key, `query` = NFC + trim | Đạt: cả ba theo FR-11 (0 kết quả), 0 hit `anatta`/`jhana` ở dòng 1–2 (và cả output), 0 dòng `Thuật ngữ đã dùng` (đo lại 2026-10-19) |
| AC-5 | Harness: `nibbana`, `anatta`, `{"topic":"nibbana","match":"content","page":2}`. Không `isError`; dòng 1 `Tìm thấy`; `grep -c -x 'URL: https://suttacentral.net/an4.179'` = 1 (nibbana), `…/an6.100` = 1 (anatta); `grep -c -E '\*\*\?\*\*|suttacentral\.net/\?|/define/|suttacentral\.net/(subjects|terminology|sn-guide-sujato|general-guide-sujato)$'` = 0 | Đạt: n = 18, 11, 9 |
| AC-6 | Harness `{"topic":"mindfulness"}`. Đếm `URL:` = 18 (10 sau `Khớp tiêu đề:`, 8 sau `Khớp nội dung:`); `grep '^URL:' \| sort \| uniq -d` rỗng; dòng `URL:` đầu là `…/an1.575-615`; `grep -c -E 'mn10|dn22'` = 0; `grep -c -E '1461|1462'` = 0; `tail -1` = footer `page=2` | Đạt |
| AC-7 | Harness `{"topic":"satipatthana","language":"en"}`. Không có dòng `Thuật ngữ đã dùng`; `grep -F -A3 '**MN 10** — The Discourse on Mindfulness Meditation'` cho `Difficulty: intermediate \| Parallels: 16`, `URL: https://suttacentral.net/mn10`, dòng bắt đầu bằng `→ Here the Buddha details the seventh factor`; `grep -x -A2 '\*\*AN 8.19\*\* — Pahārādasutta'` cho `Text: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (pli)`, `URL: https://suttacentral.net/an8.19`. Trên mọi output AC-1..AC-7: dòng ngay sau tiêu đề `**MN 10**` không phải `Difficulty: unknown` | Đạt. Dòng tiêu đề MN 10 có khoảng trắng cuối từ upstream, nên dùng `-F`, không dùng `-x` |
| AC-8 | Harness: `xyzzyqq`, `""`, `"   "`. Dòng 1 = `Không tìm thấy sutta nào cho chủ đề "{topic}".`; chứa `tiếng Anh hoặc Pali`; chứa đủ 14 key (lặp `grep -c -F`); `grep -c 'https://suttacentral.net'` = 0; không `isError`; `xyzzyqq` có `tail -1` = `Hết kết quả.`. Đọc S3: `return` của `if (query === "")` đứng trước `await fetchSearch` | Đạt. `""` và `"   "` không có footer |
| AC-9 | Harness `{"topic":"foo:bar"}`; `grep -c -F 'Unknown filter: "foo:"'` = 1 | Đạt (dòng `SuttaCentral báo lỗi truy vấn: Unknown filter: "foo:"`) |
| AC-10 | Đọc S1 + S3: `throw new Error(\`SuttaCentral API error: ${res.status}\`)` trong `fetchSearch()`; S3 không có `try`/`catch`; ba dòng `Array.isArray`/`typeof` | Đạt theo cấu trúc; khóa bằng §Lắp ráp |
| AC-11 | Đọc S1 + S3; `grep -c -F 'search/instant?' src/index.ts` = 1 (chỉ dòng `fetch` của S1; comment mở đầu S2 có `search/instant` nhưng không có `?`, nên `grep -c 'search/instant'` không có `?` cho 2); `grep -c 'fetch(' src/index.ts` = 4 (3 cũ + 1); S3 không gọi `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels`; không `let`/`const` module-scope mới ngoài 3 hằng của S2 (không hằng nào giữ response hay `uid`) | Đạt: 1, 4 |
| AC-12 | Baseline A/B (ở trên): `get_sutta {"uid":"mn10"}`, `get_sutta {"uid":"mn9999"}`, `get_sutta_meta {"uid":"mn10"}`, `get_parallels {"uid":"mn10"}`, `list_divisions {}`; `cmp` từng cặp | Đạt 5/5 trùng byte; cả 10 lần chạy đạt điều kiện 1, 2, 4. Đo lại 2026-10-19 bằng `check`: 6776, 42, 2701, 449, 2229 byte. Số byte phụ thuộc bộ giải mã (`check` không in newline cuối; bộ giải mã có newline cuối cho +1); chỉ kết quả `cmp` là tiêu chí |
| AC-13 | `npm run build`; `git status --porcelain src/` chỉ có `src/index.ts`; `git diff --quiet -- package.json`; §Lắp ráp in `ASSEMBLY-OK`; bảng grep dưới | Đạt trên bản dựng thử |
| AC-14 | Harness `tools/list` (thay frame 3 bằng `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}`): schema như §Bố cục output; text tool + describe chứa `SuttaCentral`, `Anh/Pali`, `title`, `content`, `all`, `page`. `grep -n 'TOPIC_INDEX' README.md AGENTS.md specs/sutta-mcp-requirements.md` → đúng 1 dòng, là dòng M-3; `grep -c 'sn47.1, dn22' specs/sutta-mcp-requirements.md` = 0; README chứa 14 key dạng `` `key` ``, `` `match` ``, `` `page` ``, `VI_TOPIC_TERMS`; AGENTS.md chứa `VI_TOPIC_TERMS` và `/api/search/instant`; roadmap mục 1 chứa `đã thực hiện (spec \`dynamic-search\`)`. Mệnh đề AGENTS.md kiểm sau task A-1 và sau bước cập nhật contract (§Thứ tự áp dụng): `shasum -a 256 AGENTS.md` bằng sha256 mới của `context:agents` trong `workflow-contract.json`, và code review on-completion đọc `AGENTS.md` mới | Schema: đạt (bản dựng thử). Tài liệu: đạt trên bản sao đã áp R-1..M-3 (1 dòng `TOPIC_INDEX`; 0; 14/14 key; `VI_TOPIC_TERMS` 2 hit ở README và 2 ở AGENTS.md) |
| AC-15 | Harness `metta`/`en`, `three jewels`/`en`. `grep -x -A2` cho ba khối liên tiếp `**SA 264** — 小土塼` / `Text: Bhikkhu Anālayo (en)` / `URL: …/sa264`; `**CND8** — Exposition of the Questions of the Student  Mettagū` ngay trước `URL: …/cnd8`; `**SA 107** — 長者` / `Text: Bhikkhu Anālayo (en)` / `URL: …/sa107`; `grep -c -E ' — $|Text: (null|undefined)'` = 0 | Đạt |
| AC-16 | Harness `mindfulness` + `"match":"title"`, `page` 1, 2, 3, 4, 5. Đếm `URL:` 10/10/10/2/0; 0 dòng `Khớp nội dung:`; footer `page=2`/`page=3`/…/`Hết kết quả.`; trang 2 có `…/dn22` và `…/mn10`; trang 4 = `uvs15`, `vb7`; trang 5 dòng 1 = `Không có kết quả sutta ở trang 5 cho chủ đề "mindfulness".`; hợp trang 1..4 có 32 `uid` khác nhau | Đạt. Chạy cả trang 3 để hợp đủ 32 `uid`; AC-16 chỉ nêu trang 1, 2, 4, 5, nhưng mệnh đề "trang 1..4 gộp lại" cần trang 3 |
| AC-17 | Harness `mindfulness` + `"match":"content"`, `page` 1, 2, 147, 148; `{"topic":"vô ngã tướng","language":"vi","match":"content"}`. Trang 1: 8 `URL:`, đầu `an1.296-305`, cuối `an3.33`, 0 dòng `Khớp tiêu đề:`, footer `page=2`; trang 2: 5 `URL:`, đầu `an3.33`, footer `page=3`; trang 147/148: FR-20 + `Hết kết quả.`; 0 hit `mn10\|dn22`; `vô ngã tướng`: FR-11, có dòng `Đang dùng match="content"`, `tail -1` = `Hết kết quả.`, 0 hit `Còn kết quả` | Đạt |
| AC-18 | Harness `{"topic":"mindfulness","page":4}`, `…"page":5`, và `{"topic":"mindfulness","match":"content","page":4}`. Trang 4: 2 `URL:` sau `Khớp tiêu đề:` (`uvs15`, `vb7`); danh sách `URL:` sau `Khớp nội dung:` trùng danh sách của lần chạy `content` trang 4 (chạy liền nhau); footer `page=5`. Trang 5: 0 dòng `Khớp tiêu đề:` | Đạt (2 + 6 kết quả; danh sách nội dung trùng `diff`) |
| AC-19 | Harness, 7 input; mỗi `result.isError === true` và text bắt đầu bằng `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`. Đọc S3: `z.enum` không có `.transform`/`.catch`, `z.number().int().min(1).max(10000)` không có `coerce`, nên handler không chạy | Đạt 7/7 |

Bảng grep bất biến. Đây là bộ lọc nhanh, không đủ một mình; lưới thật là §Lắp ráp.

| Lệnh | Trước (`40846bb`) | Sau (bản dựng thử) |
|---|---|---|
| `grep -c 'segmented' src/index.ts` | 3 | **3** |
| `grep -c -F 'sujato' src/index.ts` | 3 | **3** |
| `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush' src/index.ts` | 0 | **0** |
| `grep -c 'TOPIC_INDEX' src/index.ts` | 4 | **0** |
| `grep -c -F 'search/instant?' src/index.ts` | 0 | **1** |
| `grep -c 'fetch(' src/index.ts` | 3 | **4** |
| `grep -c -F 'extracted.source !== "translation"' src/index.ts` | 1 | **1** |
| `wc -l < src/index.ts` | 519 | **584** |

Dọn dẹp khi xong: `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, thư mục baseline, và mọi file output tạm (NFR-2).

## Alternatives Considered

### Alternative A: Fetch `/api/suttaplex/{uid}` cho từng hit để có citation đầy đủ

- **Description:** Mỗi hit khớp nội dung được bổ sung blurb, difficulty và parallels qua request riêng, như handler cũ làm với UID của `TOPIC_INDEX`.
- **Why not chosen:** Một trang có tới 10 hit nội dung, tức tới 11 request mỗi lời gọi. Trái FR-1, NFR-4 và Constraints "Mỗi tool call chỉ fetch đúng những gì cần". Requirements đã chốt citation rút gọn (FR-9).

### Alternative B: Sửa `formatCitation()` để hiểu `difficulty` dạng số, hoặc viết formatter tiêu đề riêng

- **Description:** (B1) Trong `formatCitation()`: `typeof d === "number" ? map[d] : d?.name`. (B2) Một hàm in ba dòng citation độc lập cho khớp tiêu đề.
- **Why not chosen:** B1 sửa một hàm dùng chung cho `get_sutta` và `get_sutta_meta`. FR-14 cho phép điều đó nếu output cho input `/api/suttaplex` không đổi, nhưng khi đó §Lắp ráp không còn khóa được vùng 109–190 nguyên khối, và phải chứng minh thêm rằng output không đổi. B2 sao chép hình dạng citation sang chỗ thứ hai: hai bản có thể trôi khác nhau, trái chữ "cùng hình dạng `formatCitation()`" của FR-8. Truyền bản sao đã đổi `difficulty` thì giữ hàm cũ nguyên vẹn và vẫn dùng đúng một định nghĩa citation.

### Alternative C: Bảng ánh xạ dạng `Record<string, string>` như `TOPIC_INDEX`

- **Description:** Giữ cú pháp object literal quen thuộc của file.
- **Why not chosen:** Với `noUncheckedIndexedAccess` tắt, `TABLE[key]` có kiểu `string` dù key không tồn tại, nên `?? fallback` trông như vô ích với người đọc. Ngoài ra `TABLE["constructor"]`, `TABLE["toString"]` trả về hàm của `Object.prototype`, nên topic `constructor` sẽ gửi đi `query` là mã nguồn một hàm. `Map` loại cả hai vấn đề mà không tốn thêm dòng. `Object.hasOwn()` cũng chặn được prototype, nhưng vẫn để lại vấn đề kiểu.

### Alternative D: Khớp một phần key tiếng Việt (Q2)

- **Description:** Giữ hành vi `includes` của `searchByTopic()`, hoặc khớp theo ranh giới từ, để `thiền định` → `jhana`.
- **Why not chosen:** Câu hỏi còn mở với người dùng, và default của requirements là chỉ khớp chính xác (FR-3, AC-4). Khớp một phần còn đổi nghĩa: `khổ hạnh` (tu khổ hạnh) chứa key `khổ` nên sẽ thành `dukkha`. Với `includes` hai chiều như `searchByTopic()` hiện tại, một chữ `t` khớp key đầu tiên có chứa `t`. Nếu Q2 được chốt khác, thay đổi gói gọn trong một dòng của S3 (§Câu hỏi mở).

### Alternative E: Dòng thuật ngữ nằm cùng dòng header

- **Description:** `Tìm thấy 7 sutta cho chủ đề "chánh niệm" (trang 1) — thuật ngữ "satipatthana":`.
- **Why not chosen:** Dòng đầu không còn kết thúc đúng bằng `(trang 1):` như literal của AC-1, và nhánh khớp/không khớp bảng không còn kiểm được bằng một dòng có tiền tố cố định. Dòng riêng `Thuật ngữ đã dùng để tìm trên SuttaCentral: "…"` vừa giữ literal vừa grep được (AC-3, AC-4, AC-7).

### Alternative F: Mở rộng tập ứng viên sang thuật ngữ Pali ngoài nhóm `TOPIC_INDEX`

- **Description:** Chọn theo số đo trên mọi thuật ngữ Pali có thể nghĩ ra, ví dụ `atthangika` cho `bát chánh đạo` (min 7 so với 5).
- **Why not chosen:** Tập ứng viên mở thì không có điểm dừng, và kết quả phụ thuộc người đo nghĩ ra từ nào. Số đo trang 1 cũng không phản ánh độ sâu: `atthangika` chỉ có 8 document trong toàn chỉ mục và hết kết quả ngay trang 1, còn `eightfold path` có 415 document. Tập ứng viên lấy từ nhóm `TOPIC_INDEX` cộng bảng của requirements là tập đã được người bảo trì và requirements duyệt.

### Alternative G: Đưa helper search sang file mới trong `src/`

- **Description:** Tách search ra `src/search.ts`.
- **Why not chosen:** NFR-2 cấm file mới trong `src/`, và AGENTS.md mô tả kiến trúc một file.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Chỉ mục SC trôi làm một thuật ngữ ánh xạ về 0 kết quả, hoặc `mn10` rời trang tiêu đề 1 của `satipatthana` | L | M | AC-1 và AC-2 kiểm cả 14 key × 2 `language` khi implement. README (R-2) và AGENTS.md (A-1) ghi luật "đo trước khi thêm". Đổi thuật ngữ chỉ là sửa một dòng trong S2 |
| Lỗi mạng thoáng qua bị đọc thành fail hoặc pass (mệnh đề phủ định trên output rỗng) | **H** (đo: ít nhất 4 lần trong phiên) | M | Luật hợp lệ ba điều kiện, chạy tuần tự, chạy lại (§Testability) |
| Upstream đổi `difficulty` của search sang `{name, level}` | L | L | `DIFFICULTY_NAMES.get(object)` → `undefined` → `unknown`. Output vẫn hợp lệ, chỉ mất thông tin. Phát hiện được qua AC-7 (`mn10` phải là `intermediate`) |
| `translated_title` rỗng (`""`) làm dòng tiêu đề kết thúc bằng ` — ` | L | L | Không quan sát được trên 28 response của bảng ánh xạ, cùng `mindfulness` và `satipatthana` (mọi phần tử `suttaplex` có `translated_title` và `acronym` khác rỗng). Đây là hình dạng sẵn có của `formatCitation()` mà FR-8 yêu cầu giữ. AC-15 kiểm ` — $` trên hai output |
| Implementer chép sai một khối (bỏ `?? topic…`, đổi thứ tự `trim`/`NFC`, quên `h > 0`) | M | M | §Lắp ráp so toàn file bằng `diff`. Compiler không bắt được các lỗi này; grep cũng không |
| Sửa `AGENTS.md` (A-1) làm đổi sha256 của dependency `context:agents` trong `workflow-contract.json` | **H** (FR-15 bắt buộc sửa) | **H**: drift chặn mọi lần dispatch task sau đó, code review on-completion và `complete_workflow()` cho tới khi người dùng hành động | A-1 là task build cuối cùng, riêng biệt; ngay sau nó là đường cập nhật contract (`preview_contract_update` → `authorize_contract_update` với sự đồng ý rõ ràng của người dùng → `write_contract_atomic`/`finish_contract_update` → `settle_contract_invalidation`), rồi mới tới code review on-completion. Xem §Thứ tự áp dụng |
| Trang nội dung kề nhau lặp `uid`, kích thước trang 0–10, footer báo "còn" trước một trang rỗng cuối | M | L | Requirements chấp nhận (§Assumptions). Đo: `an3.33` lặp ở trang 1/2 của `mindfulness` `content` |
| Output trang `all` dài (tới 20 khối citation) | M | L | Requirements chấp nhận. Caller dùng `match` để thu hẹp |
