# Design: Non-segmented translation guard cho `get_sutta`

**Status:** Reviewed
**Created:** 2026-08-09
**Spec slug:** non-segmented-translation-guard
**Requirements:** [requirements.md](./requirements.md)

## Context Recap

`extractText()` chọn nguồn văn bản bằng `Object.keys(translation).length > 0 ? translation : root` (`src/index.ts:116`) rồi trả về một chuỗi. Khi bilara trả HTTP 200 mà không có `translation_text`, hàm rơi im lặng sang `root_text` và `get_sutta` in văn bản Pali dưới dòng `Translator: <tên dịch giả được yêu cầu>`. Thiết kế này thay hợp đồng của `extractText()` bằng một kiểu trả về mang theo nguồn đã dùng, để `get_sutta` rẽ nhánh sang một thông báo tường minh thay vì phát ra văn bản sai attribution. Toàn bộ *hành vi* đã chốt ở `requirements.md`; tài liệu này chỉ chốt *hình dạng code*.

## High-Level Design

Kiến trúc không đổi: một file, hai fetch song song, 5 tool. **Mọi thay đổi code nằm trong `src/index.ts`** — không file mới (NFR-2), không dependency mới (NFR-1), mọi string mới hướng người dùng viết tiếng Việt (NFR-5). Thay đổi tập trung ở **ranh giới giữa `extractText()` và `get_sutta`**.

```
get_sutta(uid, translator, max_segments)
  │
  ├─ Promise.all([ fetchSuttaplex(uid), fetchBilaraText(uid, translator) ])   ← không đổi (NFR-4)
  ├─ citation = formatCitation(suttaplex)                                     ← không đổi
  │
  ├─ extracted = extractText(bilaraData)   →  ExtractedText
  │                                            ├─ { source: "translation", lines: [string, ...string[]] }
  │                                            └─ { source: "root",        lines: string[] }
  │
  └─ if (extracted.source !== "translation")
        └─→ formatUnavailable(...)   ← nhánh guard, KHÔNG phát đoạn văn nào
     else
        └─→ tra translatorName, rồi đường hiện tại dùng extracted.lines       ← FR-6
```

**Nguyên tắc trung tâm — predicate biến mất, không phải được nhân đôi.** FR-2 cấm hai biểu thức song song. Cách chắc chắn nhất để không có biểu thức thứ hai là làm cho biểu thức thứ nhất **không tồn tại dưới dạng một cờ boolean có thể sao chép**: `extractText()` không *kiểm tra* xem có bản dịch không rồi gắn nhãn, nó **thử dựng danh sách dòng từ `translation_text` trước**, và `source` là hệ quả của việc danh sách đó rỗng hay không. Không có `hasTranslation` nào để rò rỉ ra ngoài, và `get_sutta` không có gì để kiểm tra lại ngoài `extracted.source`.

Nguyên tắc này được thi hành bằng **N1 ở §Luật thi hành** — hai khối code normative nguyên văn — không phải bằng compiler. Xem §Data Model để biết chính xác compiler làm được gì và không làm được gì.

### Đọc tối thiểu để implement

Sáu khối dưới đây là toàn bộ nội dung ràng buộc, mỗi khối đánh dấu **[NORMATIVE]** tại chỗ. Ai chỉ đọc sáu khối này vẫn ship đúng feature. Phần còn lại của tài liệu là lý do và bằng chứng — đọc khi cần quyết định một tình huống không có trong sáu khối, không cần để viết code.

1. §`extractText()` — khối **N1-A**, nguyên văn từng ký tự.
2. §Call site trong `get_sutta` — dòng điều kiện **N1-B**, nguyên văn; phần còn lại của khối đó là minh họa.
3. §Template thông báo guard — chuỗi output của nhánh guard.
4. §Bảng đối chiếu ràng buộc FR-3 — cái gì phải và không được xuất hiện.
5. §FR-7 — chuỗi `describe()`.
6. §Thay đổi tài liệu — vị trí cho FR-8/FR-9/FR-10.

## Data Model

Một kiểu mới ở module scope, trong `src/index.ts`:

```ts
// Non-empty tuple mã hóa FR-1: source="translation" thì có ít nhất một dòng sau lọc.
// Rào chắn MỘT PHẦN — thân hàm là normative nguyên văn, xem N1 trong
// specs/non-segmented-translation-guard/design.md
type ExtractedText =
  | { source: "translation"; lines: [string, ...string[]] }
  | { source: "root"; lines: string[] };
```

### Compiler và grep bắt được gì — và không bắt được gì

Kiểu này **không** khiến implementation sai không compile được. `tsconfig.json` của repo **không** bật `noUncheckedIndexedAccess` (0 lần xuất hiện, kiểm 2026-08-09). Thiếu cờ đó, mọi index access cho `string` chứ không phải `string | undefined`, nên một phép kiểm kiểu `first !== undefined` sau destructuring là **rỗng nghĩa với type checker**, và tuple dựng tay được từ `[arr[0], ...arr.slice(1)]`. Tuple vẫn đáng có — nó chặn dạng sai dễ xảy ra nhất và tốn 0 dòng — nhưng nó **không** là cơ chế thi hành.

Sáu dạng drift, đo bằng `tsc` với đúng flag của repo và bằng bốn lệnh grep ở N2:

| Dạng | Compile? | N2 bắt? | Hậu quả nếu lọt |
|---|---|---|---|
| `{ source: "translation", lines: <biến kiểu string[]> }` | **Bị chặn** (TS2322) | — | — |
| Gate key-count, `lines` lấy từ `asNonEmpty()` | **Bị chặn** (TS2322) | — | — |
| Không gate, `asNonEmpty(...)!` | Sạch | Không (`!` không grep được) | `lines` có thể rỗng |
| Alias `const raw = ...`, gate `Object.values(raw ?? {}).length`, tuple dựng tay | Sạch | **Tình cờ** — ` as ` còn 1 thay vì 2, vì bỏ luôn `asNonEmpty` | `lines=[undefined]`, `[Hết văn bản — 1 đoạn]` |
| `collect()` đẩy `text` thay vì `text.trim()` | Sạch | **Không** | **194/194** đoạn `mn10`/`sujato` thừa khoảng trắng cuối (`"Middle Discourses 10 "`…) → AC-3 vỡ |
| Call site rẽ nhánh bằng `extracted.lines.length === 0` | Sạch | **Không** — qua cả 4 mệnh đề AC-7 | `source="root"` mang **235** dòng Pali cho `mn10` → **đúng bug gốc**; chỉ AC-1/AC-4/AC-5 bắt |

Bốn dòng cuối là lý do §Luật thi hành không phải một danh sách cấm. Hai dòng cuối đáng đọc kỹ: dòng alias bị bắt **do tình cờ** (bất kỳ drift nào giữ `asNonEmpty` đều khôi phục số đếm và đi qua), còn dòng cuối — `extracted.lines.length === 0` — là cách đọc sai **tự nhiên** của nguyên tắc ở §High-Level Design, không phải hành vi cố ý như alias.

## Luật thi hành (N1–N2)

### N1 — hai khối code normative nguyên văn

- **N1-A — thân `extractText()`** (§`extractText()`): 19 dòng, comment tính là một phần của luật.
- **N1-B — dòng điều kiện rẽ nhánh** (§Call site): `if (extracted.source !== "translation") {` cùng dấu `}` đóng khối guard.

Hai khối này là đặc tả, không phải minh họa. Code phải khớp **từng ký tự**; sai lệch là vi phạm spec, không phải lựa chọn kỹ thuật của implementer. Vehicle kiểm là **diff**: chép khối trong tài liệu này ra file rồi so với `src/index.ts`.

Vì sao nguyên văn thay vì liệt kê điều cấm: một danh sách cấm là phép **liệt kê các implementation sai**, mà tập đó vô hạn — luôn có một cách viết chưa nằm trong danh sách, và bốn dòng cuối của bảng trên là bốn cách viết như vậy đã đo được. N1 đóng cả bốn bằng một luật: không có gì để lách vì không có gì để diễn giải. Đây là vehicle của **AC-7 mệnh đề 2**.

Ngoài N1-A và N1-B, phần còn lại — `formatUnavailable()`, phần còn lại của call site, `describe()` — **không** nguyên văn; chúng bị ràng buộc bởi FR-3/FR-4/FR-6/FR-7 và các bảng đối chiếu ở dưới.

### N2 — bốn lệnh grep toàn file, kiểm nhanh, **không đủ một mình**

| Lệnh | Baseline hôm nay | Kỳ vọng sau thay đổi |
|---|---|---|
| `grep -c 'translation_text' src/index.ts` | 1 | **1**, nằm trong `extractText()` |
| `grep -c 'Object\.keys' src/index.ts` | 3 | **2**, không dòng nào trong `extractText()` |
| `grep -c ' as ' src/index.ts` | 1 | **2** — thêm đúng cast trong `asNonEmpty` |
| `grep -c 'segmented' src/index.ts` | 0 | **3** — bộ lọc FR-4, `describe()` FR-7, và comment của khối `ExtractedText` (slug `non-segmented-…` chứa `segmented` như substring; đo khi implement T-2-2 — con số 2 trước đó chưa từng được chạy trên chính comment mà N1 bắt buộc) |

Hai dòng `Object.keys` sống sót nhận diện **bằng ngữ cảnh, không bằng số dòng**: một ở nhánh rỗng của `search_topic` (`Object.keys(TOPIC_INDEX)`), một ở đầu `get_parallels`. Số dòng hiện tại là `:168` và `:289` nhưng thay đổi này chèn ~30 dòng phía trên chúng, nên cả hai sẽ dịch xuống. Dòng thứ ba của baseline là `:116` — chính bộ chọn phải chết.

Dòng `segmented` đếm được **2** là kiểm luôn FR-3 mục cấm 4: một chuỗi `segmented` rò vào output của guard sẽ thành hit thứ ba.

Không có lệnh grep cho non-null assertion: `grep -c '!' src/index.ts` trả về **10** hôm nay (`!res.ok`, `!==`, `!data`, `!t.is_root`…), nên `!` chỉ kiểm được bằng N1.

**Hai trong ba biến thể ở bảng trên đi qua sạch N2.** Nó là bộ lọc nhanh cho các sai lệch thô, không phải lưới an toàn. Lưới là N1.

## API / Interface Contracts & Component Boundaries

| Component | Status | Trách nhiệm |
|---|---|---|
| `type ExtractedText` | new (type, không tính vào hạn ngạch hàm) | Hợp đồng giữa hai component dưới; chặn một dạng sai |
| `extractText()` | modified | Nơi **duy nhất** đọc `translation_text`; thân hàm normative nguyên văn (N1) |
| `formatUnavailable()` | new — **hàm module-scope mới duy nhất** (NFR-6/AC-10) | Dựng toàn bộ chuỗi 4 phần FR-3 + danh sách FR-4 |
| `get_sutta` handler | modified | Rẽ nhánh theo `extracted.source`; đường FR-6 giữ nguyên |
| `translator` describe | modified | FR-7 |

`collect` và `asNonEmpty` là closure **bên trong** `extractText()`, `rank` là closure trong `formatUnavailable()` — không cái nào là hàm module scope, nên hạn ngạch AC-10 vẫn còn nguyên cho `formatUnavailable()`. Bốn tool còn lại, `TOPIC_INDEX`, `DIVISIONS`, ba hàm `fetch*` và `formatCitation()` không sửa.

### `extractText()` — **[NORMATIVE]** khối N1-A

**Chép đúng từng ký tự, comment tính là một phần của luật.**

```ts
function extractText(bilaraData: any): ExtractedText {
  const collect = (segments: any): string[] => {
    const out: string[] = [];
    for (const text of Object.values(segments ?? {})) {
      // .trim() ở CẢ điều kiện lẫn giá trị đẩy vào — khớp src/index.ts:120-121.
      // Bỏ .trim() ở vế push vẫn compile và đổi mọi dòng của đường FR-6.
      if (typeof text === "string" && text.trim()) out.push(text.trim());
    }
    return out;
  };
  // Cast duy nhất được phép trong hàm này. Nghĩa vụ chứng minh: a.length > 0 ⟹ có phần tử
  // tại index 0; a luôn là mảng dựng bằng push trong collect(), không bao giờ sparse.
  const asNonEmpty = (a: string[]): [string, ...string[]] | undefined =>
    a.length > 0 ? (a as [string, ...string[]]) : undefined;

  const translated = asNonEmpty(collect(bilaraData?.translation_text));
  if (translated) return { source: "translation", lines: translated };
  return { source: "root", lines: collect(bilaraData?.root_text) };
}
```

`if (translated)` là **narrowing thật** (union với `undefined`), không phụ thuộc `noUncheckedIndexedAccess`, và làm cách viết đúng thành cách viết ngắn nhất. Nó **không** buộc drift phải để lại dấu vết `!` — tuple dựng tay được từ index access, nên ràng buộc gate nằm ở N1, không ở kiểu. Lý do đầy đủ ở §Alternatives mục E.

Ghi chú khác: `source: "root"` không hàm ý root có nội dung — nó chỉ nói "không dựng được dòng nào từ bản dịch"; nhánh guard không đọc `lines` của nó. `bilaraData` là `null`/`undefined` → cả hai `collect` trả `[]` → `source: "root"` → vào guard, không cần nhánh riêng.

Kiểm hành vi đã chạy thật với cả ba case "vắng mặt" của FR-1 (2026-08-09):

| Input | Kết quả |
|---|---|
| `translation_text` thiếu hẳn | `source: "root"` → guard |
| `translation_text: {}` | `source: "root"` → guard |
| `translation_text` toàn khoảng trắng | `source: "root"` → guard |
| `translation_text` có nội dung | `source: "translation"` → FR-6 |

### `formatUnavailable()` — helper module-scope duy nhất

```ts
function formatUnavailable(citation: string, translations: any[], translator: string): string {
  const requested = translations.find((t: any) => t.author_uid === translator);
  const translatorName = requested?.author ?? translator;
  const requestedLang = requested?.lang;
  const rank = (t: any) =>
    requestedLang && t.lang === requestedLang ? 0 : t.lang === "en" ? 1 : 2;

  const alternatives = translations
    .filter((t: any) => t.author_uid !== translator && t.segmented === true && t.is_root !== true)
    .sort((a: any, b: any) => rank(a) - rank(b))
    .map((t: any) => `  • ${t.lang_name} — ${t.author} (${t.author_uid})`);
  // ... dựng chuỗi theo template dưới
}
```

**Ba tham số, một `find`.** Helper cần `requested` để lấy `lang` (thứ tự FR-4) nên nó *đã* thực hiện lookup; lấy luôn `author` từ cùng object là miễn phí. Truyền thêm `translatorName` sẽ khiến lookup chạy hai lần trên đúng nhánh mà `Translator:` không bao giờ được in. Vì vậy `get_sutta` **chỉ tính `translatorName` trong nhánh `else`**, nơi FR-6 thực sự cần — một `find` cho mỗi đường đi.

- Ba điều kiện của bộ lọc viết **thành ba mệnh đề riêng, `author_uid !== translator` đứng đầu** — FR-4 yêu cầu điều kiện tự-loại-trừ là độc lập, không phái sinh từ `segmented`.
- `Array.prototype.sort` ổn định theo ES2019 trở đi (Node ≥ 18 theo `package.json engines`), nên trong cùng tier thứ tự API được giữ nguyên; không cần index tie-breaker.
- Định dạng dòng sao chép nguyên từ `get_sutta_meta` (`src/index.ts:258`).
- `requestedLang` là `undefined` khi `translator` là typo không có trong `translations`; tier 0 rỗng, `en` lên đầu. Không cần nhánh riêng.

### Template thông báo guard — **[NORMATIVE]**

```
────────────────────────────────────────────────────────────
{citation}
────────────────────────────────────────────────────────────

API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả {translatorName} ({translator}).

Server cố ý không thay bằng văn bản gốc Pali, để không gán nhầm văn bản cho dịch giả được yêu cầu.

**Các bản dịch khác của kinh này, có thể lấy được (không bảo đảm):**
{alternatives, mỗi dòng "  • {lang_name} — {author} ({author_uid})"}
```

Nhánh danh sách rỗng thay khối `{alternatives}` bằng đúng một dòng, chuỗi pin ở FR-4:

```
  (không tìm thấy bản dịch nào khác cho kinh này)
```

**Dòng tiêu đề in đậm phía trên bị bỏ luôn ở nhánh rỗng** — giữ lại sẽ thành "đây là danh sách các bản dịch khác" rồi ngay dòng sau nói không có bản nào, tự mâu thuẫn trong hai dòng liền nhau. FR không bắt buộc chiều nào; đây là quyết định của thiết kế.

**[NORMATIVE]** bảng đối chiếu ràng buộc FR-3:

| Ràng buộc | Thỏa bằng |
|---|---|
| FR-3.1 citation | `{citation}` do `formatCitation()` sinh, kèm `URL: https://suttacentral.net/{uid}` — cũng là "đường thoát cuối" của FR-4/AC-2 |
| FR-3.2 tên + uid dịch giả | `{translatorName} ({translator})`, fallback `requested?.author ?? translator` |
| FR-3.3 thuần quan sát | câu nói *API không trả về gì*, không nói *vì sao* |
| FR-3.4 cố ý không thay bằng Pali | câu thứ hai |
| FR-3 cấm 1 (`Translator: `) | chuỗi này không xuất hiện; dạng câu là "với dịch giả X (uid)" |
| FR-3 cấm 2 (root text) | nhánh guard không đọc `extracted.lines` |
| FR-3 cấm 3 (`[Hết văn bản` / `[... văn bản bị cắt`) | hai chuỗi đó chỉ tồn tại ở nhánh còn lại |
| FR-3 cấm 4 (`segmented`) | không string literal nào của helper chứa chuỗi này, kể cả nhánh rỗng |
| FR-4 "có thể" | "có thể lấy được (không bảo đảm)" |

Hai dấu `─".repeat(60)` không do FR nào bắt buộc; giữ để guard trông cùng một tool với đường bình thường.

### Call site trong `get_sutta`

Chỉ **dòng `if` và dấu `}` đóng** là normative (khối **N1-B**); phần còn lại của khối này là minh họa, ràng buộc thật nằm ở FR-3/FR-4/FR-6 và AC-1/AC-4/AC-5.

```ts
const citation = formatCitation(suttaplex);
const extracted = extractText(bilaraData);

if (extracted.source !== "translation") {   // [NORMATIVE] N1-B — nguyên văn, kể cả dấu } đóng
  return {
    content: [
      {
        type: "text",
        text: formatUnavailable(citation, suttaplex?.translations ?? [], translator),
      },
    ],
  };
}

const translatorName =
  (suttaplex?.translations ?? []).find((t: any) => t.author_uid === translator)?.author ?? translator;
const lines = extracted.lines;
const truncated = lines.slice(0, max_segments);
// ... phần còn lại giữ nguyên
```

- `src/index.ts:214-216` (lookup `translatorName`) **di chuyển xuống dưới guard**, đổi lấy một `find` cho mỗi đường đi. Diff vì thế không chỉ là chèn một khối `if`.
- `src/index.ts:217-218` cũ (`const fullText = extractText(...)` + `fullText.split("\n").filter(Boolean)`) biến mất; `lines` lấy thẳng từ `extracted.lines`.
- **Rẽ nhánh bằng `extracted.source`, không bằng `extracted.lines.length`.** Hai biểu thức đó khác nhau: trên `mn10`/`minh_chau`, `source` là `"root"` còn `lines.length` là **235**, nên `lines.length === 0` để lọt đúng bug gốc. Đây là lý do dòng `if` nằm trong N1. Thân `get_sutta` cũng **không** chứa `translation_text` (AC-7 mệnh đề 3).
- Sau `if`, TS narrow `extracted` về nhánh `"translation"`. **Với N1 được tuân thủ**, `lines` là non-empty thật, nên `[Hết văn bản — 0 đoạn]` không xảy ra. Đây là hệ quả của N1, **không** phải bảo đảm của kiểu — nếu N1 bị vi phạm, kiểu vẫn hợp lệ còn `lines` vẫn có thể chứa `undefined`.

### FR-7: mô tả tham số `translator` — **[NORMATIVE]**

Thay `describe()` ở `src/index.ts:200`:

```
ID dịch giả: 'sujato' (mặc định, tiếng Anh), 'brahmali' (Vinaya). Không phải dịch giả nào có
trong metadata cũng lấy được toàn văn qua API — kể cả khi metadata ghi segmented=true. Dùng
get_sutta_meta để xem danh sách bản dịch của một kinh; nếu dịch giả được yêu cầu không lấy
được, tool sẽ báo rõ và gợi ý dịch giả khác.
```

Đây là **một trong hai** vị trí duy nhất được phép chứa chuỗi `segmented` (AC-6); vị trí kia là biểu thức lọc `t.segmented === true` trong `formatUnavailable()`.

### Thay đổi tài liệu (FR-8, FR-9, FR-10) — **[NORMATIVE]**

Không có quyết định thiết kế nào ở đây — nội dung đã được FR pin từng câu. Chỉ chốt vị trí và phân rã task:

| Yêu cầu | File | Vị trí |
|---|---|---|
| FR-8, FR-9 | `specs/sutta-mcp-requirements.md` | §"Hướng nâng cấp (sau prototype)" mục **2. Tiếng Việt** — đúng dòng 291, hiện là một đoạn ba câu |
| FR-10 | `claudedocs/specs-review.md` | 6 vị trí liệt kê trong FR-10 — **một task duy nhất, sáu vị trí phải đổi cùng lúc** (vị trí 5 nằm ngoài section F-04 nên hay bị bỏ sót, và sửa lẻ sẽ để lại tài liệu tự phủ định). **Gitignored, không commit** |

Bản thay mục 2 phải nêu đủ **bốn** thứ FR-9 pin: cơ chế thật (HTTP 200 + thiếu key + fallback im lặng phía ta); ba dịch giả `minh_chau`/`indacanda`/`phantuananh` với cột `segmented` không dự đoán được kết quả; ghi chú rằng `minh_chau` và `phantuananh` là **hai `author_uid` khác nhau cùng ghi công Thích Minh Châu** — đúng chỗ gây nhầm mà output hiện tại của bug tạo ra (`Translator: Bhikkhu Thích Minh Châu (phantuananh)`); và Q1 viết dưới dạng câu hỏi mở. Nó sẽ dài hơn các mục anh em trong danh sách — chấp nhận được, đây là mục duy nhất có phản ví dụ đã xác minh.

## Integration Points

- **Upstream:** `fetchSuttaplex` + `fetchBilaraText` giữ nguyên `Promise.all` — 2 request, không thêm (NFR-4). Guard chỉ tiêu thụ dữ liệu đã có.
- **Downstream:** MCP client (Claude). Guard trả `content: [{ type: "text", ... }]` không cờ lỗi, khớp ba nhánh "không tìm thấy" hiện có (FR-5).
- **Caller duy nhất của `extractText()`** là `get_sutta` (`src/index.ts:217`), nên đổi kiểu trả về không lan sang đâu.
- **Không** phụ thuộc Q1 (đường render của website SC). Nếu Q1 được trả lời và có thêm một nguồn text, nó vào như một nhánh mới *trước* guard và `ExtractedText` thêm một member union — compiler chỉ ra đủ call site phải sửa.

## Cross-Cutting Concerns

**Authentication & Authorization:** không áp dụng — API SuttaCentral công khai, MCP stdio chạy cục bộ dưới quyền người dùng.

**Logging & Observability:** không áp dụng — repo không log gì ngoài một dòng khởi động; stderr là kênh chẩn đoán của stdio transport, không thêm nhiễu vào đó.

**Performance & Scalability:** không đổi đáng kể. Guard chạy trên dữ liệu đã fetch: một `find` + một `filter`/`sort` trên mảng ≤ 43 phần tử. `collect()` có thể duyệt hai object thay vì một, chỉ khi bản dịch vắng mặt.

### Error Handling

Không đổi. `fetchSuttaplex`/`fetchBilaraText` vẫn ném khi `!res.ok`; guard chỉ xử lý trường hợp **200 nhưng thiếu nội dung**. Nếu `author_uid` typo thực ra trả 404 (chưa xác minh, ghi ở Assumptions), lỗi vẫn nổ ồn ào như hiện nay — chấp nhận được, vì thất bại kiểu đó không gán sai attribution. Guard **không** dùng `isError` (FR-5).

### Testability & Verification

Không có test framework (ràng buộc dispatch). Ba cơ chế kiểm:

| Cơ chế | Che phủ | Ghi chú |
|---|---|---|
| **Compiler** (`npm run build`) | AC-9 | Chỉ AC-9. Tuple chặn được một dạng sai nhưng **không** là vehicle của AC-7 — xem §Data Model |
| **Harness JSON-RPC qua stdio** | AC-1..AC-5, AC-8 | Bắt buộc `npm run build` trước; bắt buộc kiểm có dòng `"id":2` trước khi tin bất kỳ mệnh đề phủ định nào |
| **Diff nguyên văn (N1) + grep (N2) + đọc code** | AC-6, AC-7 (cả 4 mệnh đề), AC-10, AC-11, AC-12 | Bảng dưới |

AC-7 tách theo vehicle:

| Mệnh đề AC-7 | Vehicle |
|---|---|
| 1 — chỉ một nơi đọc `translation_text`, nằm trong `extractText()` | N2: `grep -c 'translation_text' src/index.ts` → **1**, trong `extractText()` |
| 2 — `source` suy từ số dòng sau lọc, không từ `Object.keys(...).length` | **N1**: diff thân hàm với khối nguyên văn ở §`extractText()`. N2 (`Object.keys` → 2) là kiểm nhanh **không đủ** — biến thể drift ở §N1 qua sạch nó |
| 3 — thân `get_sutta` không chứa `translation_text` | cùng lệnh grep ở mệnh đề 1 |
| 4 — không có biểu thức key-count thứ hai | **N1** (thân hàm nguyên văn thì không có chỗ cho biểu thức thứ hai); N2 bắt các cách viết thô |

Ba con số/thứ tự mà harness sẽ đối chiếu đã được xác minh trước bằng chính logic của thiết kế này, chạy trên response live 2026-08-09:

- `mn10`/`sujato`: 233 key → **194** dòng sau lọc; **0/233** segment chứa `\n` hay `\r`, nên bỏ vòng `split("\n").filter(Boolean)` cho ra **đúng cùng 194** mà AC-3 pin.
- `mn10`/`minh_chau`: bộ lọc ba điều kiện để lại **10** entry, `requestedLang = "vi"`, tier `vi` rỗng nên **`sujato` đứng đầu** — khớp AC-2.
- `dhp1-20`/`phantuananh`: còn **5** entry, `phantuananh` vắng mặt, bị loại bởi **điều kiện 1** chứ không phải bởi `segmented` — khớp AC-5.

#### Lỗ hổng đã biết: tier 0 của `rank` không được AC nào chạy qua

FR-4 xếp **ngôn ngữ của bản dịch được yêu cầu lên đầu**, rồi `en`, rồi thứ tự API. Cả hai case harness đều có `requestedLang = "vi"` và **không entry `vi` nào** qua bộ lọc — `mn10` lọc còn 10 entry (0 `vi`), `dhp1-20` còn 5 (0 `vi`). Nên AC-2 chỉ chạy quy tắc *`en` trước phần còn lại*; AC-5 không pin thứ tự nào. **Tier 0 chết trong toàn bộ AC set**, và nó lại đúng là quy tắc phục vụ nhóm người dùng chính (`requirements.md:72`).

Cặp `(uid, translator)` chạy được tier 0, xác minh live 2026-08-09 — **`mn10` + `sv`**:

- `/api/bilarasuttas/mn10/sv` trả HTTP 200, không `translation_text`, 235 dòng root → **guard nổ**, cùng nhánh AC-1.
- `requestedLang = "ru"`, bộ lọc để lại **9** entry, và **dòng đầu là `Русский — o Dhamma.gift (o)`**, đứng trên `sujato` — đúng thứ tự tier 0 → tier `en`. Nếu `rank` bị viết sai thành "en trước tiên", `sujato` sẽ nhảy lên đầu và khác biệt nhìn thấy ngay ở dòng đầu danh sách.

Thiết kế không được thêm AC, nên đây là **chuyển tiếp cho task planner**: hoặc chạy thêm cặp này như một kiểm bổ sung khi verify AC-2, hoặc gắn một task đọc code riêng cho biểu thức `rank`. Không được coi AC-2 là đã phủ quy tắc thứ tự của FR-4 — nó chỉ phủ một nửa.

Ghi chú phụ, cùng lần đo: `sv`, `o`, `trush`, `sabbamitta` đều `segmented=true` mà `/api/bilarasuttas/` không trả `translation_text`. Danh sách gợi ý của FR-4 vì thế thực sự có thể đề xuất những dịch giả rồi cũng không lấy được — đúng lý do FR-4 bắt buộc diễn đạt "có thể" và luôn kèm link SC cấp sutta.

## Alternatives Considered

### Alternative A: `{ source: "translation" | "root"; lines: string[] }` — union phẳng

- **Mô tả:** Đúng chữ của FR-2, đơn giản nhất, không kiểu tuple.
- **Vì sao không chọn:** `{ source: "translation", lines: [] }` biểu diễn được, và tuple chặn được đúng dạng đó với chi phí 0 dòng. Khoảng cách giữa A và thiết kế này **hẹp**: cả hai đều dựa vào N1 để thi hành FR-2; tuple chỉ thu hẹp mặt tấn công, không đóng nó.

### Alternative B: `extractText()` trả `string | null`

- **Mô tả:** Bề mặt nhỏ nhất; `get_sutta` rẽ nhánh bằng `=== null`.
- **Vì sao không chọn:** Vẫn phải `split("\n")` lại ở call site để đếm đoạn — tái lập đúng round-trip mà thiết kế này gỡ bỏ, làm số đoạn phụ thuộc việc segment có chứa newline hay không. Cũng vứt mất `source`.

### Alternative C: Guard nằm trong `get_sutta`, `extractText()` giữ nguyên chữ ký

- **Mô tả:** `get_sutta` tự kiểm `Object.keys(bilaraData?.translation_text ?? {}).length === 0` trước khi gọi `extractText()`.
- **Vì sao không chọn:** Đây đúng là hai-predicate-song-song mà FR-2 gọi là rủi ro số một; AC-7 cấm thẳng. Ghi lại vì nó là đường đi nhỏ nhất về mặt diff và sẽ hấp dẫn lúc implement.

### Alternative D: `formatUnavailable(citation, translations, translator, translatorName)` — bốn tham số

- **Mô tả:** Call site tính `translatorName` một lần rồi truyền vào.
- **Vì sao không chọn:** Nó không tránh được lần `find` thứ hai — helper vẫn phải chạy `find` để lấy `lang`, nên tham số thứ tư chỉ tránh được một `?.author`, đổi lại là hai lần `find` trên nhánh guard, nơi `translatorName` không bao giờ được in. Ba tham số + một `find` trong helper + tính `translatorName` trong nhánh `else` là ít trùng lặp hơn về mọi mặt.

### Alternative E: no-cast tuyệt đối (`const [first, ...rest]` + `if (first !== undefined)`)

- **Mô tả:** Cấm mọi `as`, narrow bằng `const [first, ...rest]` + `if (first !== undefined)`.
- **Vì sao không chọn:** Lệnh cấm đó dựa trên tiền đề rằng phép kiểm `first !== undefined` có giá trị với type checker. Không có `noUncheckedIndexedAccess` thì nó **rỗng nghĩa** — construct trông như đang kiểm nhưng không kiểm, tức đánh lừa người đọc chứ không bảo vệ họ. Đánh đổi thật là: **một cast có vị trí xác định, nghĩa vụ chứng minh viết ngay cạnh nó** (`asNonEmpty`) so với **một lỗ hổng không có vị trí**, rải ra mọi lần sửa guard tương lai. Chọn cái thứ nhất; N1 giới hạn nó ở đúng một chỗ và N2 đếm được (` as ` → 2).

### Alternative F: bật `noUncheckedIndexedAccess` trong `tsconfig.json`

- **Mô tả:** Khôi phục bảo đảm ở mức kiểu: mọi index access thành `T | undefined`, nên tuple dựng tay từ `[arr[0], ...arr.slice(1)]` không còn compile.
- **Chi phí, đã đo (2026-08-09) — không phải ước đoán:**

  | Compile với `--noUncheckedIndexedAccess` | Kết quả |
  |---|---|
  | `src/index.ts` hiện tại | **0 lỗi** |
  | Code mới dự kiến của thiết kế này | **0 lỗi** (cast `as [string, ...string[]]` vẫn hợp lệ) |
  | Biến thể drift ở §N1 | **TS2322** — `Type 'string \| undefined' is not assignable to type 'string'` |

  `TOPIC_INDEX[q]` ở `src/index.ts:102`, chỗ dễ vỡ nhất, narrow bình thường vì `q` là `const`.
- **Vì sao vẫn không chọn — chỉ một lý do, và nó tự đứng được:** **phạm vi**. Requirements giao cho thiết kế một diff nằm trong `src/index.ts`; NFR-2/AC-10 nói về `src/`, `package.json` và file mới, tức `tsconfig.json` là thứ **chưa được nhắc tới**, không phải thứ được cho phép. Thiết kế không được tự nới phạm vi mà requirements đã đặt, kể cả khi phần nới ra là miễn phí và có lợi.
- **Chuyển tiếp:** đây là cơ chế duy nhất đóng được biến thể drift ở §N1 **bằng compiler thay vì bằng văn bản**, và nó đang bị hoãn có ý thức. Nếu chủ sở hữu requirements muốn, thêm một dòng cho phép sửa `tsconfig.json` sẽ biến N1 từ luật-đọc-diff thành ràng buộc máy kiểm; khi đó `asNonEmpty` rút lại thành destructuring và ` as ` trong N2 quay về 1.

### Alternative G: `collect()` thành hàm module scope

Loại vì ngân sách "tối đa một hàm mới ở module scope" (NFR-6/AC-10) đã dành cho `formatUnavailable()`, ứng viên xứng đáng hơn.

## Risks & Mitigations

| Rủi ro | Khả năng | Tác động | Giảm thiểu |
|---|---|---|---|
| **Call site rẽ nhánh bằng `extracted.lines.length === 0`** — cách đọc sai tự nhiên nhất, tái lập đúng bug gốc | M | H | **N1-B**; và AC-1/AC-4/AC-5 vỡ ngay trên case đầu bảng. Không có grep nào bắt được — xem dòng cuối bảng ở §Data Model |
| Gate trong `extractText()` drift sang số key (Alternative A/C), guard không nổ trên FR-1 case 3 | M | H | **N1-A** (diff nguyên văn) — rào chắn duy nhất bắt được biến thể alias; N2 chỉ bắt cách viết thô, tuple chỉ chặn dạng `string[]` |
| `collect()` mất `.trim()` — ở vế `push` thì mọi dòng FR-6 thừa khoảng trắng (194/194), ở vế điều kiện thì `lines: ["   "]` và guard không nổ | M | H | N1-A; AC-3 đối chiếu `Tổng: 194` (mất `.trim()` ở điều kiện cho 233) và so khớp đẳng thức trên `Middle Discourses 10` |
| `asNonEmpty`'s cast bị đọc là "cast ở đây được phép nói chung" rồi lan ra | M | M | N1 cố định thân hàm; N2 đếm ` as ` = 2; nghĩa vụ chứng minh viết ngay trong comment nên đi theo code vào `src/index.ts` |
| `ExtractedText` bị hiểu là bảo đảm toàn phần, rồi ai đó bỏ N1 vì "compiler lo rồi" | M | H | §Data Model nêu thẳng compiler **không** thi hành FR-1/FR-2, kèm bảng sáu dạng và bốn dạng compile sạch; comment trong code trỏ về N1 |
| Bỏ `split("\n")` làm đổi số đoạn với sutta có segment chứa newline | L | L | `mn10`/`sujato`: 0/233 segment chứa newline, cả hai cách ra 194. Nếu có sutta như vậy, số mới là **số segment** — đúng hơn số cũ |
| Di chuyển lookup `translatorName` xuống dưới guard làm diff chạm nhiều dòng hơn dự kiến ở `get_sutta` | L | L | Vẫn nằm trong `get_sutta`, không chạm tool khác; AC-10 chỉ cấm hunk ngoài `extractText()`/`get_sutta` |
| Dữ liệu upstream trôi làm literal của AC (194, 10, 5) lệch | M | L | Requirements §"Về các literal đã pin": fetch lại endpoint và so trước khi kết luận regression |
| `lang_name`/`author` của một entry chứa chuỗi cấm | L | M | Đã kiểm 10 entry của `mn10` và 5 entry của `dhp1-20`: 0 hit cho `segmented` và `Translator: ` |
