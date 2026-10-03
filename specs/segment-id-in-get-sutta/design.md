# Design: Segment ID trong output của `get_sutta`

**Status:** Reviewed
**Created:** 2026-10-02
**Spec slug:** segment-id-in-get-sutta
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/non-segmented-translation-guard/` (khối N1-A, kiểu `ExtractedText`), `specs/bilara-lang-param/` (khối N3-B). Spec này đụng cả hai khối, xem §Khối normative bị đụng.

## Context Recap

`extractText()` hiện duyệt `Object.values(translation_text)`, nên segment ID (key của bilara) bị vứt ngay tại nơi duy nhất đọc bản dịch. Handler cũng không giữ lang nào ra ngoài khối retry. Spec này làm hai việc. Thứ nhất, mỗi dòng thân của `get_sutta` mang segment ID nguyên văn của nó, dạng `[mn10:1.1] So I have heard.` (D1). Thứ hai, header có thêm đúng một dòng chứa tiền tố deep-link `https://suttacentral.net/{uid}/{lang}/{translator}#`, với `{lang}` là lang thực sự đã phục vụ bản dịch (D2). Tính năng luôn bật, schema không đổi (D3). Kèm theo đó: sửa master spec cho đúng dạng deep-link (FR-8) và đồng bộ các khối normative của hai spec tiền nhiệm (FR-7). Hành vi đã chốt ở requirements, và không còn câu hỏi nào cần stakeholder quyết. Tài liệu này chốt hình dạng code, chữ chính xác của dòng `Deep link:`, nội dung nguyên văn các khối sửa tài liệu, và vehicle kiểm cho từng AC.

Mọi literal trong tài liệu này được **đo lại trong phiên soạn design (2026-10-02)** trên live API và trên một bản dựng thử của chính code dưới đây (bản sao `src/` ngoài repo, compile bằng `tsconfig.json` của repo, chạy qua harness stdio). Kết quả khớp requirements từng số: `mn10/sujato` 235 key / 194 đoạn, đoạn 1/3/50/cuối đúng chữ; `dhp1-20/phantuananh?lang=vi` 108, đoạn 50 `dhp9:0`; `mn10/sabbamitta?lang=de` 200; `mn10/trush?lang=gu` 230; suttaplex `mn10` có `trush` ở index 14 (`gu`) và 15 (`hi`); thứ tự key trùng `keys_order` đã lọc trên mọi response; 0 đoạn chứa `\n`/`\r` trên mọi response đo.

## High-Level Design

Kiến trúc không đổi: một file, cùng số request, cùng 5 tool. Mọi thay đổi code nằm trong `src/index.ts`, ở ba chỗ:

```
type Segment = { id, text }                         ← MỚI (N5-T)
type ExtractedText.lines : Segment[]                ← đổi kiểu phần tử (N5-T)

extractText(bilaraData)                             ← N1-A bản mới
  collect(): Object.entries → push { id: key, text: value.trim() }
  (điều kiện lọc, .trim(), asNonEmpty, gate theo source: không đổi ngữ nghĩa)

get_sutta(uid, translator, max_segments)
  ├─ Promise.all([suttaplex, bilara không lang])    ← không đổi
  ├─ let extracted = extractText(bilaraData)
  ├─ let servedLang = "en"                          ← MỚI, trong N3-B bản mới
  ├─ if (extracted.source === "root")               ← retry, luật tie-break không đổi
  │     if (retryLang) { extracted = …retry…; servedLang = retryLang; }
  ├─ if (extracted.source !== "translation") → formatUnavailable(...)   ← N1-B, không đổi
  └─ output:
       ────
       {citation}                                   ← không đổi (3 dòng, có URL: …/{uid})
       Translator: {name} ({translator})            ← không đổi
       Deep link: https://suttacentral.net/{uid}/{servedLang}/{translator}#<segment_id> (…)  ← MỚI (N5-R)
       ────
       (dòng trống)
       [{id}] {text}  × min(max_segments, M)        ← MỚI tiền tố (N5-R)
       (dòng trống)
       tail                                         ← không đổi từng byte
```

Hai quyết định trung tâm:

1. **ID được ghép cặp với text ngay tại chỗ đọc key, trong `collect()`.** Đây là nơi duy nhất thấy cả key lẫn value. Mọi chỗ khác chỉ nhận cặp đã ghép, nên không có đường nào suy ID từ `uid` request (sai với UID khoảng: `dhp1-20` → `dhp9:0`) hay tra ngược từ text (sai vì 194 đoạn chỉ có 167 giá trị khác nhau). Phần trình bày (`[id] text`) nằm ở handler, như mọi phần trình bày khác.
2. **Lang đã phục vụ được ghi lại tại đúng chỗ quyết định retry.** Lời gọi bilara đầu không truyền `lang`, mà upstream mặc định `'en'` và AQL đòi `@lang IN doc.muids`. Vì vậy nội dung đến từ lời gọi đầu là nội dung `en`. Nội dung đến từ retry là nội dung `retryLang`. `servedLang` bắt đầu bằng `"en"` và chỉ đổi cùng một câu lệnh với phép gán `extracted` của retry. Nó **không** được suy lại từ metadata suttaplex sau gate, vì `author_uid → lang` là một-nhiều (xem §Kiểm bổ sung ngoài AC, case `snp1.8`/`piyadassi`).

Header không chứa dòng trống nào. Dòng trống đầu tiên của output là dòng kết thúc header, nên luật đếm "dòng thân thứ k" của requirements áp nguyên. Dòng `Deep link:` đứng **sau** `Translator:`, nên năm dòng đầu của header giữ nguyên vị trí và chỉ dòng kẻ thứ hai dời xuống một dòng.

### Đọc tối thiểu để implement

Năm khối dưới đây là toàn bộ nội dung ràng buộc, mỗi khối đánh dấu **[NORMATIVE]** tại chỗ:

1. §N5-T: kiểu `Segment` và `ExtractedText` kèm comment, nguyên văn.
2. §N1-A bản mới: thân `extractText()`, nguyên văn.
3. §N3-B bản mới: khối retry giữ `servedLang`, nguyên văn.
4. §N5-R: hai dòng mới trong mảng `output`, nguyên văn.
5. §Thay đổi tài liệu: bốn khối chữ cho ba file spec, cùng vị trí chèn.

### Khối normative bị đụng (FR-7)

| Khối | Đụng? | Lý do |
|---|---|---|
| **N1-A** (thân `extractText()`) | **Có** | Là nơi duy nhất đọc `translation_text` và hiện vứt key bằng `Object.values`. Không có cách lấy ID mà không đụng nó, trừ khi đọc `translation_text` lần thứ hai ở handler. Cách đó phá luật một-nơi-đọc (`grep -c translation_text` = 1), và với đường retry thì body thứ hai không còn được giữ ở handler (§Alternative C). |
| **N1-B** (dòng gate) | **Không** | Gate vẫn rẽ bằng `extracted.source`. Dòng `if (extracted.source !== "translation") {` và dấu `}` đóng không đổi byte nào. |
| **N3-B** (khối retry) | **Có** | `retryLang` là biến `const` trong scope khối `if`. Muốn biết lang đã phục vụ thì phải ghi lại ngay trong khối đó (§Alternative E). Luật tie-break, điều kiện retry và số request không đổi. |
| **N3-A** (`fetchBilaraText()`) | **Không** | |
| Kiểu `ExtractedText` và comment trên nó | **Có** (khối minh họa ở spec tiền nhiệm) | Kiểu phần tử của `lines` đổi từ `string` sang `Segment`. Bản sao kiểu này ở `specs/non-segmented-translation-guard/design.md` §Data Model được thay cùng thay đổi để N1-A ở đó không tham chiếu một kiểu không tồn tại (§Thay đổi tài liệu, khối G-1). |

Ngữ nghĩa gate giữ nguyên đúng như FR-7 đòi hỏi. Điều kiện lọc `typeof text === "string" && text.trim()` không đổi ký tự nào, nên `source` vẫn quyết định bằng việc còn ít nhất một giá trị không rỗng sau `.trim()`, không bằng số key. `Object.entries` và `Object.values` duyệt cùng thứ tự (cùng thuật toán `EnumerableOwnProperties` của ECMAScript), nên tập đoạn và thứ tự của chúng không đổi (FR-2).

## Data Model

### N5-T — kiểu `Segment` và `ExtractedText` — **[NORMATIVE]**

Thay khối comment + kiểu ở `src/index.ts:112-117`. Chép đúng từng ký tự. Vehicle kiểm: `awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/'` trên `src/index.ts` và trên `specs/non-segmented-translation-guard/design.md`, rồi `diff` hai kết quả, phải rỗng.

```ts
// Non-empty tuple mã hóa FR-1: source="translation" thì có ít nhất một dòng sau lọc.
// Rào chắn MỘT PHẦN — thân hàm là normative nguyên văn, xem N1 trong
// specs/non-segmented-translation-guard/design.md
// Segment.id là key nguyên văn của bilara (segment ID) — spec segment-id-in-get-sutta.
type Segment = { id: string; text: string };
type ExtractedText =
  | { source: "translation"; lines: [Segment, ...Segment[]] }
  | { source: "root"; lines: Segment[] };
```

- **`id` là key nguyên văn** của object bilara, không kiểm, không chuẩn hóa. Key có hình dạng lạ vẫn được in đúng như API trả (requirements, assumption UNVERIFIED về dạng key). Các lớp ID đã đo đều đi qua không biến đổi: có chấm (`mn10:1.1`), không chấm (`dhp9:0`), có gạch nối (`mn10:18-23.1`), và có tiền tố khác UID request (`dhp1:0.1` dưới `dhp1-20`).
- **Giữ tên field `lines`.** Đổi tên thành `segments` làm diff dài thêm mà không mua được bảo vệ nào: implementer vẫn có thể viết `const lines = extracted.segments` rồi giữ nguyên `truncated.join("\n")` (xem dòng dưới).
- **Compiler bắt được gì.** Không nhiều hơn tiền nhiệm. Đã đo bằng `tsc` với `tsconfig.json` của repo: bỏ quên phần render và giữ `truncated.join("\n")` trên `Segment[]` **compile sạch** (`Array.prototype.join` nhận mảng phần tử bất kỳ) và in ra `[object Object]` trên mọi dòng. Chỉ harness bắt được dạng này (AC-1 dòng thân 1). Không câu nào trong tài liệu này dựa vào "compiler thi hành".
- Code dự kiến cũng compile sạch khi thêm `--noUncheckedIndexedAccess` (đo 2026-10-02), nhưng cờ đó vẫn ngoài phạm vi, giống như ở spec tiền nhiệm.
- Tên `Segment` không chứa chuỗi `segmented` (NFR-7). Comment không chứa `translation_text`, nên `grep -c 'translation_text'` vẫn = 1.

Không entity nào khác. `servedLang` là một `string` tạm trong scope handler.

## API / Interface Contracts

Interface ra ngoài là chuỗi text của `get_sutta`. Schema input không đổi (D3, NFR-5).

### N1-A bản mới — thân `extractText()` — **[NORMATIVE]**

Thay toàn bộ hàm ở `src/index.ts:119-137`. Chép đúng từng ký tự, comment tính là một phần của luật. Vehicle kiểm: AC-6, tức `awk '/^function extractText/,/^}$/'` trên `src/index.ts` và trên `specs/non-segmented-translation-guard/design.md` rồi `diff`, phải rỗng (20/20 dòng).

```ts
function extractText(bilaraData: any): ExtractedText {
  const collect = (segments: any): Segment[] => {
    const out: Segment[] = [];
    for (const [id, text] of Object.entries(segments ?? {})) {
      // .trim() ở CẢ điều kiện lẫn giá trị đẩy vào — khớp src/index.ts:120-121.
      // Bỏ .trim() ở vế push vẫn compile và đổi mọi dòng của đường FR-6.
      // id là key nguyên văn, ghép cặp ngay lúc đọc — không suy từ uid request.
      if (typeof text === "string" && text.trim()) out.push({ id, text: text.trim() });
    }
    return out;
  };
  // Cast duy nhất được phép trong hàm này. Nghĩa vụ chứng minh: a.length > 0 ⟹ có phần tử
  // tại index 0; a luôn là mảng dựng bằng push trong collect(), không bao giờ sparse.
  const asNonEmpty = (a: Segment[]): [Segment, ...Segment[]] | undefined =>
    a.length > 0 ? (a as [Segment, ...Segment[]]) : undefined;

  const translated = asNonEmpty(collect(bilaraData?.translation_text));
  if (translated) return { source: "translation", lines: translated };
  return { source: "root", lines: collect(bilaraData?.root_text) };
}
```

So với bản hiện hành, có đúng sáu dòng đổi và một dòng comment mới. Sáu dòng đổi là: chữ ký `collect`, khai báo `out`, vòng `for` (`Object.values` → `Object.entries` có destructuring), vế `push`, và hai dòng của `asNonEmpty`. Comment `khớp src/index.ts:120-121` trỏ về code của trước spec tiền nhiệm. Nó được giữ nguyên chữ để diff nhỏ nhất, và nó vẫn đúng như một ghi chú lịch sử.

`root_text` cũng đi qua `collect()` nên cũng thành `Segment[]`. Nhánh guard không đọc `lines` của nhánh root (N1-B tiền nhiệm), nên không có output nào đổi theo.

### N3-B bản mới — khối retry giữ `servedLang` — **[NORMATIVE]**

Thay khối ở `src/index.ts:253-265`, tính từ dòng `const citation` tới dấu `}` đóng khối retry, ngay trước dòng trống và gate N1-B. Chép đúng từng ký tự. Vehicle kiểm: `awk '/^    let extracted = extractText/,/^    }$/'` trên `src/index.ts` và trên `specs/bilara-lang-param/design.md` rồi `diff`, phải rỗng (18/18 dòng). Pattern kết thúc `^    }$` (4 dấu cách) vẫn khớp đúng dấu `}` của khối ngoài, vì `}` của khối `if (retryLang)` mới thụt 6 dấu cách (đã chạy trên file dự kiến).

```ts
    const citation = formatCitation(suttaplex);
    let extracted = extractText(bilaraData);
    // Lang thực sự phục vụ bản dịch, cho dòng Deep link (spec segment-id-in-get-sutta): lời gọi
    // đầu không truyền lang nên là 'en' theo mặc định upstream; thành retryLang khi retry.
    let servedLang = "en";

    // Retry-on-miss (spec bilara-lang-param): upstream mặc định lang='en' khi thiếu query
    // param (views.py:1058), nên bản dịch khác tiếng Anh cần gọi lại kèm ?lang=. Lang lấy từ
    // suttaplex đã fetch sẵn — entry ĐẦU TIÊN theo thứ tự API của translator có lang khác
    // 'en' (luật tie-break, xem specs/bilara-lang-param/design.md) — và chỉ gọi lại một lần.
    if (extracted.source === "root") {
      const retryLang = (suttaplex?.translations ?? []).find(
        (t: any) => t.author_uid === translator && t.lang && t.lang !== "en"
      )?.lang;
      if (retryLang) {
        extracted = extractText(await fetchBilaraText(uid, translator, retryLang));
        servedLang = retryLang;
      }
    }
```

- **`servedLang` được gán khi retry *được bắn*, không phải khi retry *thành công*.** Nếu retry vẫn miss thì `extracted.source` vẫn là `"root"`, gate rẽ vào guard, và `servedLang` không bao giờ được đọc. Trên đường bình thường, `servedLang` luôn là lang của đúng body mà `extracted` đã đọc. Một nhánh `if (extracted.source === "translation")` lồng thêm vào đây sẽ chỉ là điều kiện chết.
- Literal `"en"` mới có cùng bản chất với `t.lang !== "en"` sẵn có: nó phản chiếu default transport của upstream, không phải tri thức về translator. Không có map hay literal translator-ID nào được thêm (NFR-7).
- `let` thứ hai chỉ được gán bên trong khối retry, trước gate. Sau gate không có phép gán nào, nên narrowing của `extracted` không bị ảnh hưởng (đã compile thật).

### N5-R — hai dòng mới trong mảng `output` — **[NORMATIVE]**

Trong `const output = [ … ]` của `get_sutta` (`src/index.ts:285-296`), có đúng hai thay đổi:

1. Chèn ngay sau dòng `` `Translator: ${translatorName} (${translator})`, ``:

```ts
      `Deep link: https://suttacentral.net/${uid}/${servedLang}/${translator}#<segment_id> (thay <segment_id> bằng ID trong ngoặc vuông ở đầu mỗi đoạn)`,
```

2. Thay dòng `      truncated.join("\n"),` bằng:

```ts
      truncated.map((s) => `[${s.id}] ${s.text}`).join("\n"),
```

Vehicle kiểm: `grep -c -F` từng dòng trên `src/index.ts` = 1, và `grep -c -F 'truncated.join' src/index.ts` = 0. Mọi dòng khác của mảng `output` giữ nguyên từng byte, kể cả hai chuỗi tail (FR-3).

Chữ của dòng `Deep link:`, ví dụ trên `mn10`/`sujato`:

```
Deep link: https://suttacentral.net/mn10/en/sujato#<segment_id> (thay <segment_id> bằng ID trong ngoặc vuông ở đầu mỗi đoạn)
```

- Tiền tố `https://suttacentral.net/{uid}/{lang}/{translator}#` xuất hiện đúng một lần trong output (FR-4, AC-1). Dòng thân không chứa `https://`.
- `{uid}` là UID request (FR-4), không phải `suttaplex.uid`. Hai giá trị trùng nhau trên mọi case đo. UID sai chữ hoa/thường rơi vào guard trước khi tới dòng này.
- `<segment_id>` lấy đúng placeholder trong ví dụ của stakeholder (D2). Chỉ dẫn trong ngoặc là tiếng Việt, còn `Deep link` giữ tiếng Anh (NFR-6). Cụm "ID trong ngoặc vuông ở đầu mỗi đoạn" trỏ thẳng vào định dạng D1, để caller không phải đoán ID nằm ở đâu.
- Dấu `:` trong fragment không cần percent-encode (RFC 3986 §3.5, đã nêu ở requirements). Dạng URL ghép bằng chuỗi, không encode, nhất quán với `formatCitation()` và `fetchBilaraText()`.

Output đầy đủ của đường bình thường (`mn10`/`sujato`, `max_segments: 3`, chạy trên bản dựng thử 2026-10-02):

```
────────────────────────────────────────────────────────────
**MN 10** — The Discourse on Mindfulness Meditation 
Difficulty: intermediate | Parallels: 16
URL: https://suttacentral.net/mn10
Translator: Bhikkhu Sujato (sujato)
Deep link: https://suttacentral.net/mn10/en/sujato#<segment_id> (thay <segment_id> bằng ID trong ngoặc vuông ở đầu mỗi đoạn)
────────────────────────────────────────────────────────────

[mn10:0.1] Middle Discourses 10
[mn10:0.2] Mindfulness Meditation
[mn10:1.1] So I have heard.

[... văn bản bị cắt sau 3 đoạn. Tổng: 194 đoạn. Tăng max_segments để xem thêm.]
```

(Dấu cách cuối dòng tiêu đề đến từ `translated_title` của upstream và có sẵn từ trước, không do thay đổi này.)

## Component Boundaries

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `type Segment` | new (kiểu, không tính vào hạn ngạch hàm) | Cặp `{ id, text }`: ID nguyên văn từ key, text đã `.trim()` |
| `type ExtractedText` | modified (N5-T) | Kiểu phần tử của `lines` thành `Segment`; union và tuple non-empty giữ nguyên |
| `extractText()` | modified (N1-A bản mới) | Vẫn là nơi duy nhất đọc `translation_text`; nay ghép cặp key với value |
| `get_sutta` handler | modified (N3-B bản mới, N5-R) | Ghi `servedLang`; render tiền tố `[id] ` và dòng `Deep link:` |
| N1-B (gate), `formatUnavailable()`, `formatCitation()`, `fetch*()`, schema `get_sutta`, 4 tool còn lại, `TOPIC_INDEX`, `DIVISIONS` | không đổi | NFR-5, FR-5, FR-6 |

Không hàm module-scope mới nào. Closure render `(s) => …` nằm trong biểu thức `map`.

Hình dạng diff dự kiến trên `src/index.ts`, đo bằng `diff -U0` trên file dự kiến: **9 hunk, +20 / −10 dòng**, tất cả nằm trong khối kiểu, thân `extractText()`, khối retry và mảng `output`. Output `-U0` chứa **0** lần các chuỗi `formatCitation`, `formatUnavailable`, `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`, `z.` và chuỗi gate (AC-6).

## Integration Points

- **Upstream:** không đổi. Vẫn là `/suttaplex/` và `/bilarasuttas/`, 2 request trên đường thường và 3 khi retry (NFR-4). Segment ID lấy từ body đã fetch, lang lấy từ biến đã có.
- **Downstream:** MCP client (Claude). Cấu trúc output không đổi ngoài hai điểm: thêm một dòng header, và thêm tiền tố trên dòng thân. Nhánh guard giữ nguyên từng byte (FR-6). Điều này đã đo: output của `mn10`/`minh_chau` và `thag1.1`/`indacanda` trên bản dựng thử giống hệt output của bản dựng HEAD `fc5c002`.
- **Website SuttaCentral:** dòng `Deep link:` phụ thuộc route `/:suttaId/:langIsoCode/:authorUid` và `<span class="segment" id="{segment_id}">` của client SC. Kết quả kiểm trên trình duyệt ở §Testability, AC-7.

### Thay đổi tài liệu (FR-7, FR-8) — **[NORMATIVE]**

Mỗi khối dưới đây là chữ chép nguyên văn vào đúng một vị trí. Các khối code N5-T, N1-A và N3-B **không** chép lại ở đây. Vị trí đích của chúng trong spec tiền nhiệm được trỏ bằng anchor. Toàn bộ thay đổi đã được áp thử trên bản sao của ba file, và mọi matcher của AC-6/AC-8 đã chạy trên kết quả (§Testability).

| ID | File | Vị trí (đo 2026-10-02) | Thao tác |
|---|---|---|---|
| G-1 | `specs/non-segmented-translation-guard/design.md` | Code fence `ts` của §Data Model, dòng 51-58 (nội dung 52-57) | Thay nội dung fence bằng khối **N5-T** |
| G-2 | cùng file | Code fence `ts` của §`extractText()`, dòng 123-143 (nội dung 124-142) | Thay nội dung fence bằng khối **N1-A bản mới** |
| G-3 | cùng file | Sau dòng `**Requirements:** …` (dòng 6), trước dòng trống + `## Context Recap` | Chèn một dòng trống rồi khối **E-1** |
| L-1 | `specs/bilara-lang-param/design.md` | Code fence `ts` của §N3, khối N3-B, dòng 110-124 (nội dung 111-123) | Thay nội dung fence bằng khối **N3-B bản mới** (gồm dòng `const citation`, như fence cũ) |
| L-2 | cùng file | Sau dòng `**Tiền nhiệm:** …` (dòng 7), trước dòng trống + `## Context Recap` | Chèn một dòng trống rồi khối **E-2** |
| M-1 | `specs/sutta-mcp-requirements.md` | Roadmap mục 5, dòng 308, bắt đầu `5. **Segment ID trong` | Thay nguyên dòng bằng khối **M-1** |
| M-2 | cùng file | Mục Tool 2, dòng 174, bắt đầu `**Output:** Toàn văn sutta` | Thay nguyên dòng bằng khối **M-2** |

Áp G-1 trước G-2 hoặc ngược lại đều được, miễn mỗi thao tác định vị theo fence chứ không theo số dòng đã dịch. Không đụng gì khác trong ba file đó. Văn xuôi, sơ đồ và bảng của hai design tiền nhiệm còn nhắc dạng cũ (`[string, ...string[]]`, `Object.values`, "19 dòng", "12 dòng") được giữ làm hồ sơ thời điểm dưới errata E-1/E-2. Cách này theo tiền lệ errata của `bilara-lang-param`. Dòng Constraints `:278` của master spec không sửa (FR-8).

**E-1** (G-3):

```markdown
> **Cập nhật (2026-10-02 — spec `segment-id-in-get-sutta`):** khối kiểu ở §Data Model và khối
> N1-A ở §`extractText()` đã được thay bằng bản mang segment ID: phần tử của `lines` là
> `Segment = { id: string; text: string }`, và `collect()` duyệt `Object.entries` thay cho
> `Object.values` để giữ key. Ngữ nghĩa gate không đổi: `source` vẫn quyết định bằng việc còn
> ít nhất một giá trị không rỗng sau `.trim()`. Hai khối code đó là bản hiện hành, khớp từng
> byte với `src/index.ts`. Văn xuôi, sơ đồ và bảng phía dưới còn nhắc `[string, ...string[]]`,
> `Object.values` hay "19 dòng" là hồ sơ thời điểm. Lý do và phép đo:
> `specs/segment-id-in-get-sutta/design.md`.
```

**E-2** (L-2):

```markdown
> **Cập nhật (2026-10-02 — spec `segment-id-in-get-sutta`):** khối N3-B ở §N3 đã được thay bằng
> bản giữ lại lang đã phục vụ bản dịch: thêm `let servedLang = "en";` (kèm comment) và gán
> `servedLang = retryLang` khi retry, để `get_sutta` dựng dòng `Deep link:`. Luật tie-break,
> điều kiện retry và số request không đổi. Khối code đó là bản hiện hành, khớp từng byte với
> `src/index.ts`. Sơ đồ và các con số "11 dòng"/"12 dòng" phía dưới là hồ sơ thời điểm. Lý do:
> `specs/segment-id-in-get-sutta/design.md`.
```

**M-1** (roadmap mục 5, FR-8a):

```markdown
5. **Segment ID trong `get_sutta` output** — **đã thực hiện (2026-10-02, spec `segment-id-in-get-sutta`).** Bilara API trả về segment ID dạng `mn10:1.1` làm key; `get_sutta` in mỗi đoạn kèm ID nguyên văn (`[mn10:1.1] So I have heard.`) và thêm một dòng header `Deep link:`. Dạng deep-link cuộn tới đúng đoạn là `suttacentral.net/{uid}/{lang}/{translator}#{segment_id}`, ví dụ `https://suttacentral.net/mn10/en/sujato#mn10:1.1`, với `{lang}` là lang thực sự đã phục vụ bản dịch. Trang cấp sutta `suttacentral.net/{uid}` là trang thẻ suttaplex, không có phần tử đoạn nào để cuộn tới.
```

**M-2** (Output của Tool 2, FR-8b):

```markdown
**Output:** Toàn văn sutta kèm citation header và link. Mỗi đoạn in kèm segment ID nguyên văn từ key của Bilara, dạng `[mn10:1.1] So I have heard.`. Header có thêm một dòng `Deep link: https://suttacentral.net/{uid}/{lang}/{translator}#<segment_id>`, trong đó `{lang}` là lang thực sự đã phục vụ bản dịch; nối segment ID vào sau `#` để được link cuộn tới đúng đoạn (spec `segment-id-in-get-sutta`).
```

## Cross-Cutting Concerns

### Authentication & Authorization

Không áp dụng. API SuttaCentral công khai, và MCP stdio chạy cục bộ dưới quyền người dùng (nguyên trạng).

### Error Handling

Không có nhánh lỗi mới. Mọi đầu vào xấu đã đo đều rơi về đường sẵn có:
- body thiếu `translation_text`, `{}` hoặc toàn khoảng trắng → `source: "root"` → guard, không dòng `Deep link:`;
- `bilaraData` là `null` → `Object.entries(null ?? {})` → `[]` → guard;
- giá trị không phải chuỗi bị lọc như trước.

`Object.entries` nhận cùng miền đầu vào với `Object.values`, nên không có lỗi runtime mới. Lỗi mạng và `!res.ok` vẫn ném như hiện tại.

### Logging & Observability

Không áp dụng. Không thêm log, và stderr giữ vai trò kênh chẩn đoán của stdio transport.

### Performance & Scalability

- **Request:** không đổi. Đường thường 2, retry 3 (NFR-4). Đã đo trên bản dựng thử: `snp1.8`/`piyadassi` là 3 (retry `lt`).
- **Kích thước output:** mỗi dòng thân thêm `len(id) + 3` ký tự (`[mn10:13.1] ` = 12), tức 565 ký tự cho 50 đoạn đầu của `mn10`/`sujato` (đo). Header thêm một dòng 124 ký tự với `mn10`/`sujato` (đo). Stakeholder đã chấp nhận chi phí token này (D3).
- **CPU:** `collect()` cấp phát một object nhỏ mỗi đoạn thay cho một chuỗi, ≤ vài trăm đoạn mỗi lời gọi. Không đáng kể so với hai round-trip mạng.

### Testability & Verification

Không có test framework (ràng buộc dự án). Có bốn vehicle: compiler, harness stdio, diff/grep/đọc code trên repo, và trình duyệt cho AC-7.

#### Harness và các bước giải mã

Dựng lại `/tmp/mcp-call.sh` từ heredoc tại `specs/non-segmented-translation-guard/requirements.md:180-196`, giữ ba luật vận hành của requirements (§Harness): `npm run build` trước mỗi lần chạy; đúng 1 dòng `"id":2`; literal lệch thì fetch lại endpoint trước khi kết luận regression. Hai bước phụ dưới đây biến output JSON-RPC thành văn bản và tách phần thân. Cả hai là lệnh shell tạm ngoài repo, xóa cùng `/tmp/mcp-call.sh` khi xong (NFR-2):

```sh
# Giải mã: in result.content[0].text của dòng "id":2; báo hỏng nếu không có đúng 1 dòng như vậy.
decode() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const L=d.split("\n").filter(l=>l.includes("\"id\":2"));if(L.length!==1){console.log("BROKEN RUN",L.length);process.exit(1)}process.stdout.write(JSON.parse(L[0]).result.content[0].text+"\n")})'; }
# Thân: các dòng sau dòng trống đầu tiên (kết thúc header), tới trước dòng trống kế tiếp (trước tail).
body() { awk 'f==1 && /^$/ {exit} f==1 {print} /^$/ && f==0 {f=1}' "$1"; }

/tmp/mcp-call.sh get_sutta '{"uid":"mn10","translator":"sujato"}' | decode > /tmp/out-sujato.txt
body /tmp/out-sujato.txt | sed -n '1p;3p;50p'
```

Luật "dòng thân" của `body()` trùng luật của requirements chỉ vì header không chứa dòng trống nào. Đây là ràng buộc của N5-R: dòng `Deep link:` là **một** dòng, đứng trên dòng kẻ thứ hai. Giữa các dòng thân cũng không có dòng trống, vì đoạn rỗng bị lọc và 0 đoạn chứa `\n` trên mọi response đo.

#### Vehicle theo AC

| AC | Vehicle | Kết quả trên bản dựng thử (2026-10-02) |
|---|---|---|
| AC-1 | Harness + `body()`; `grep -c 'https://suttacentral.net/mn10/en/sujato#'` = 1, nằm trong header; `body … \| grep -c 'https://'` = 0; regex trên 50 dòng thân | Đạt: dòng 1/3/50 đúng chữ, 0 dòng trượt regex, đúng 1 dòng deep-link, tail đúng |
| AC-2 | Harness + `body()`; `grep -c '\[dhp1-20:'` = 0; `grep -c 'dhp1-20/en/'` = 0 | Đạt: `[dhp1:0.1] Tiểu Bộ Kinh`, `[dhp1:0.3] Phẩm Song Yếu`, `[dhp9:0] Chuyện Devadatta (Đề-bà-đạt-đa)`; deep-link `…/dhp1-20/vi/phantuananh#`; `Tổng: 108 đoạn` |
| AC-3 | Harness, hai lời gọi | Đạt: `[mn10:12.0] 1.5. Den Geist auf die Elemente richten`, `…/mn10/de/sabbamitta#`, `Tổng: 200`; `[mn10:0.1] મજ્જ઼િમ નિકાય ૧૦`, `…/mn10/gu/trush#`, 0 hit `/mn10/hi/trush`, `Tổng: 230` |
| AC-4 | Harness (`max_segments` 3 và 500) + vehicle baseline ở §Baseline cho FR-2 | Đạt: 3 dòng đúng chữ và tail; 194 dòng, dòng cuối `[mn10:47.4] …`, `[Hết văn bản — 194 đoạn]`; 0 dòng bắt đầu `[mn10:3.6]`/`[mn10:4.9]`/`[mn10:4.10]`; khớp baseline |
| AC-5 | Harness; `git diff -U0 -- src/index.ts` không chứa `formatUnavailable` | Đạt: cả hai output chứa câu guard, 0 hit mọi chuỗi cấm (kể cả `Deep link`). Mạnh hơn AC: output guard giống hệt từng byte bản dựng HEAD |
| AC-6 | `npm run build`; awk-diff N1-A (§N1-A bản mới) và N3-B (§N3-B bản mới) giữa `src/index.ts` và hai design tiền nhiệm **sau khi áp G-2 và L-1**; awk-diff N5-T sau G-1; `git diff -U0`; bảng grep dưới | Đạt trên bản sao đã áp G/L: cả ba diff rỗng (20, 18, 8 dòng). Mệnh đề "nếu khối retry thay đổi" của AC-6 **kích hoạt**, nên `specs/bilara-lang-param/design.md` phải có trong cùng thay đổi |
| AC-7 | Trình duyệt, xem §AC-7 dưới | Đạt (headless, có điều kiện, xem dưới) |
| AC-8 | `grep -c -F` trên master spec sau khi áp M-1 và M-2 | Đạt trên bản sao: `suttacentral.net/{uid}#{segment_id}` = 0, `{uid}/{lang}/{translator}#{segment_id}` = 1, `segment-id-in-get-sutta` = 2 |

Bảng grep bất biến, đo trên file dự kiến. Đây là bộ lọc nhanh, không đủ một mình. Lưới thật là các diff nguyên văn ở trên.

| Lệnh | Trước | Sau |
|---|---|---|
| `grep -c 'segmented' src/index.ts` | 3 | **3** |
| `grep -c -F 'sujato' src/index.ts` | 3 | **3** |
| `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush\|piyadassi' src/index.ts` | 0 | **0** |
| `grep -c -F 'extracted.source !== "translation"' src/index.ts` | 1 | **1** |
| `grep -c 'translation_text' src/index.ts` | 1 | **1** |
| `grep -c 'Object\.keys' src/index.ts` | 2 | **2** |
| `grep -c ' as ' src/index.ts` | 2 | **2** |

Bộ ba đầu là NFR-7. Bộ ba đầu cũng thêm `piyadassi` vào danh sách translator-ID cấm, vì case kiểm bổ sung dưới đây không được rò thành literal trong code.

#### Baseline cho FR-2 (AC-4, mệnh đề trùng-từng-byte)

**Vehicle: tham chiếu độc lập với phiên bản code, dựng từ live API.** Ngay trước hoặc sau lần chạy harness `max_segments: 500`, trong cùng phiên:

```sh
node -e 'fetch("https://suttacentral.net/api/bilarasuttas/mn10/sujato").then(r=>r.json()).then(d=>{for(const[k,v]of Object.entries(d.translation_text))if(typeof v==="string"&&v.trim())console.log(`[${k}] ${v.trim()}`)})' > /tmp/ref-mn10-sujato.txt
body /tmp/out-s500.txt | diff - /tmp/ref-mn10-sujato.txt                              # cả ID lẫn text, phải rỗng
body /tmp/out-s500.txt | sed -E 's/^\[[^]]*\] //' | diff - <(sed -E 's/^\[[^]]*\] //' /tmp/ref-mn10-sujato.txt)   # FR-2 theo chữ
```

Xóa `/tmp/ref-mn10-sujato.txt` và `/tmp/out-*.txt` sau khi xong.

- **Vì sao chọn vehicle này.** Nó không cần bắt baseline *trước* khi sửa code, nên chạy được ở bất kỳ thời điểm nào, kể cả khi verify lại sau này. Diff lần đầu kiểm nhiều hơn mệnh đề FR-2: kiểm luôn cả cặp ID–text (FR-1) trên toàn 194 dòng.
- **Giới hạn, nói thẳng.** Tham chiếu tái hiện cùng thuật toán lọc (`typeof string`, `.trim()`, thứ tự key) mà FR-2 mô tả, nên nó kiểm "output = luật FR-2 áp trên dữ liệu live", chứ không trực tiếp kiểm "output = bản HEAD". Cầu nối đã được đo một lần trong phiên soạn design. Bản dựng HEAD `fc5c002` với `max_segments: 500` cho 194 dòng thân, và chúng trùng từng byte với tham chiếu sau khi bỏ tiền tố. Bản dựng thử cũng trùng tham chiếu cả khi còn ID.
- **Phương án dự phòng:** build HEAD trước khi sửa code và lưu body ra `/tmp`. Không chọn làm vehicle chính vì nó buộc thứ tự task, và nếu bỏ lỡ bước đó thì không tái tạo lại được.

#### Kiểm bổ sung ngoài AC (bắt buộc khi verify)

Hai case dưới đây phủ hai khoảng trống mà AC set không chạy qua. Literal đo live 2026-10-02 và đã chạy trên bản dựng thử.

1. **Lang đã phục vụ khác lang đầu tiên của translator trong suttaplex: `snp1.8` + `piyadassi`.** `/api/suttaplex/snp1.8` liệt kê `piyadassi` ở index 11 (`en`, `segmented: false`) và index 27 (`lt`, `segmented: true`). Bilara không `lang` và `?lang=en` đều thiếu `translation_text`, còn `?lang=lt` trả 43 key / 42 đoạn. Ở mọi case AC-1..AC-3, "lang đã phục vụ" và "lang của entry đầu tiên của translator" trùng nhau. Cách viết tắt `translations.find(t => t.author_uid === translator)?.lang` vì thế qua được toàn bộ AC, nhưng sai ở case này. Kỳ vọng với `{"uid":"snp1.8","translator":"piyadassi"}`:
   - dòng thân 1 là `[snp1.8:0.1] Suttų rinkinukas 1.8`;
   - output chứa `https://suttacentral.net/snp1.8/lt/piyadassi#` và **không** chứa `https://suttacentral.net/snp1.8/en/piyadassi`;
   - kết thúc bằng đúng `[Hết văn bản — 42 đoạn]`.

   Hệ quả của cách viết tắt, đo trên trình duyệt: trang `snp1.8/en/piyadassi` có **0** phần tử `.segment`, tức link không cuộn được và còn chỉ sai ngôn ngữ.
2. **Segment ID có gạch nối, trên toàn bộ 194 dòng.** Regex của AC-1 chỉ áp cho 50 dòng đầu. Trên lần chạy `max_segments: 500`:
   - dòng thân 63 là `[mn10:18-23.1] Furthermore, suppose they were to see a corpse discarded in a charnel ground, a skeleton with flesh and blood, held together by sinews …`;
   - `body /tmp/out-s500.txt | grep -vcE '^\[mn10:[0-9][0-9.-]*\] \S'` = **0**. Đây là dạng mở rộng của regex AC-1, thêm `-` vào lớp ký tự.

   Các ID gạch nối khác trên `sujato`: `mn10:18-23.2`, `mn10:18-23.3`, `mn10:26-28.1`. Diff baseline ở trên cũng phủ lớp này.

#### AC-7 — deep-link trên trình duyệt

Đã chạy 2026-10-02 bằng **Google Chrome 154.0.8037.93**, chế độ `--headless=new`, điều khiển qua Chrome DevTools Protocol, cửa sổ 1200×900. Mỗi URL được mở, chờ 20 giây, rồi duyệt cả shadow DOM để tìm phần tử có `id` bằng fragment. Ghi lại vị trí của phần tử đó so với viewport và lớp `refFocused`, tức lớp mà handler hash của client SC gắn để tô nổi bật đoạn.

| URL | Phần tử tìm thấy | `top` trong viewport (px) | `scrollY` | `refFocused` | Text đầu đoạn |
|---|---|---|---|---|---|
| `https://suttacentral.net/mn10/en/sujato#mn10:13.1` | có | 119 | 2721 | `mn10:13.1` | `And so they meditate observing an as…` |
| `https://suttacentral.net/dhp1-20/vi/phantuananh#dhp9:0` | có | 120 | 2010 | `dhp9:0` | `Chuyện Devadatta (Đề-bà-đạt-đa)` |
| `https://suttacentral.net/mn10/en/sujato#mn10:18-23.1` (ID gạch nối) | có | 120 | 3186 | `mn10:18-23.1` | `Furthermore, suppose they were to see a …` |
| `https://suttacentral.net/snp1.8/lt/piyadassi#snp1.8:3.1` | có | 120 | 414 | `snp1.8:3.1` | `Jis turėtų vengti bet…` |
| Đối chứng: `https://suttacentral.net/mn10#mn10:13.1` (dạng roadmap cũ) | trang bỏ fragment | — | 0 | không | trang thẻ suttaplex |
| Đối chứng: `https://suttacentral.net/snp1.8/en/piyadassi#snp1.8:3.1` | không (0 phần tử `.segment`) | — | — | không | — |

Text đầu đoạn gồm cả số tham chiếu mà trang chèn vào trước (ví dụ `13.1ms9M_323…`). Bảng trên chỉ chép phần văn bản dịch.

Kết luận: dạng `https://suttacentral.net/{uid}/{lang}/{translator}#{segment_id}` cuộn tới đúng đoạn và đoạn đó nhận lớp tô nổi bật, kể cả với UID khoảng và ID gạch nối. Hai dạng đối chứng không cuộn. **Điều kiện còn lại:** phép đo này là tự động và headless, kiểm vị trí cuộn và lớp CSS chứ không nhìn bằng mắt. Người verify nên mở hai URL đầu của AC-7 trên một trình duyệt có giao diện và ghi ngày cùng trình duyệt vào review report. Nếu kết quả trái với bảng trên, dừng lại và đưa lại requirements, như AC-7 quy định.

## Alternatives Considered

### Alternative A: Định dạng `[id] text` ngay trong `collect()`, `lines` vẫn là `string[]`

- **Description:** `collect()` đẩy `` `[${id}] ${text.trim()}` ``. Kiểu `ExtractedText` và call site giữ nguyên, chỉ thêm dòng `Deep link:`. Diff nhỏ nhất: không đổi kiểu, không có dòng `map`.
- **Why not chosen:** Trộn phần trình bày vào hàm trích xuất, và root text cũng bị định dạng theo dù không ai dùng. Lý do chính là tương thích với hướng đi đã ghi trong requirements (Out of Scope: đọc tiếp theo segment ID, kiểu `from_segment`). Tính năng đó cần ID ở dạng dữ liệu. Với phương án này, nó sẽ phải parse ngược chuỗi đã định dạng, tức là gỡ lại chính thiết kế này. Phần chênh diff giữa hai phương án là khoảng 6 dòng.

### Alternative B: Thêm mảng song song `ids: string[]` vào `ExtractedText`

- **Description:** `lines` giữ `string[]` và thêm `ids` cùng độ dài.
- **Why not chosen:** Hai mảng phải luôn thẳng hàng mà không kiểu nào ràng buộc được điều đó. `slice` một mảng mà quên mảng kia sẽ cho ID lệch đoạn, compile sạch và trông hợp lý. Cặp `{ id, text }` loại bỏ cả lớp lỗi này.

### Alternative C: Giữ N1-A, đọc lại key ở handler

- **Description:** Handler tự chạy `Object.entries(bilaraData.translation_text)` để lấy ID, còn `extractText()` không đổi.
- **Why not chosen:** Có ba lý do. Nó phá luật một-nơi-đọc của tiền nhiệm (`grep -c translation_text` 1 → 2). Nó tái lập hai biểu thức lọc song song, đúng rủi ro mà N1 được dựng ra để chặn. Và trên đường retry, body thứ hai không được giữ ở handler (`extractText(await fetchBilaraText(…))` tiêu thụ ngay), nên phải sửa N3-B thêm để giữ body đó.

### Alternative D: Suy `{lang}` từ suttaplex sau gate

- **Description:** `translations.find(t => t.author_uid === translator)?.lang`, đặt cạnh lookup `translatorName`, không đụng N3-B.
- **Why not chosen:** Sai trên dữ liệu thật. `snp1.8`/`piyadassi` cho ra `en` trong khi bản được phục vụ là `lt`, và link trỏ tới trang không có đoạn nào để cuộn tới. Biến thể "lặp lại luật tie-break sau gate" cũng sai: luật đó bỏ qua `en`, nên với `mn10`/`sujato` nó trả `undefined`. Đây là lớp lỗi một-nhiều của `author_uid → lang` đã ghi nhận ở spec `bilara-lang-param`. Chỉ có điểm quyết định retry mới biết chắc lang nào đã phục vụ.

### Alternative E: Đưa lang ra bằng giá trị trả về (của `fetchBilaraText()` hoặc `extractText()`)

- **Description:** `fetchBilaraText()` trả `{ body, lang }`, hoặc `ExtractedText` mang thêm field `lang`.
- **Why not chosen:** Cách thứ nhất đụng N3-A, khối hiện không cần đụng, và đổi hợp đồng của hàm fetch. Cách thứ hai bắt `extractText()` nhận thêm một tham số mà nó không dùng, chỉ để chuyển tiếp. Cả hai đều lớn hơn ba dòng thêm vào N3-B, mà N3-B thì đằng nào cũng là nơi duy nhất biết lang.

### Alternative F: Đặt dòng `Deep link:` ở vị trí khác trong header

- **Description:** Đặt trước `Translator:`, hoặc tách thành URL và chỉ dẫn trên hai dòng, có dòng trống giữa.
- **Why not chosen:** Đặt sau `Translator:` giữ nguyên vị trí năm dòng đầu của header. Tách hai dòng không vi phạm D2 nếu chỉ một dòng chứa URL, nhưng một dòng trống trong header sẽ làm lệch luật đếm "dòng thân thứ k" của requirements và mọi literal AC-1..AC-4. Một dòng duy nhất là ràng buộc của N5-R. `formatCitation()` không được sửa (FR-5), nên dòng này không thể nằm cạnh `URL:` bên trong citation.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `{lang}` lấy từ metadata thay vì từ điểm retry, nên link chỉ sai ngôn ngữ hoặc trỏ trang không cuộn được | M | M | N3-B nguyên văn (diff AC-6) và kiểm bổ sung `snp1.8`/`piyadassi`, case duy nhất phân biệt được hai cách. Không AC nào của requirements bắt được dạng này |
| Giữ `truncated.join("\n")` trên `Segment[]`: compile sạch, mọi dòng thân thành `[object Object]` | M | H | N5-R nguyên văn; `grep -c -F 'truncated.join'` = 0; AC-1 dòng thân 1 vỡ ngay. Compiler **không** bắt (đã đo) |
| ID ghép từ `uid` request hoặc đánh số lại | L | H | N1-A nguyên văn; AC-2 (`dhp1-20` → `dhp9:0`, 0 hit `[dhp1-20:`) |
| Dòng `Deep link:` thành hai dòng hoặc kèm dòng trống, làm lệch đếm dòng thân | L | M | N5-R nguyên văn; AC-1 "đúng 1 dòng" chứa tiền tố; mọi literal "dòng thân k" vỡ |
| Văn xuôi của hai design tiền nhiệm mô tả dạng cũ của N1-A/N3-B, dễ gây hiểu nhầm | M | L | Errata E-1/E-2 ở đầu file chỉ ra khối code nào là bản hiện hành. Khối code khớp từng byte với `src/index.ts` (diff AC-6) |
| Client SC đổi route hoặc ID phần tử đoạn, làm deep-link hết cuộn | L | M | Đã ghi nhận UNVERIFIED trong requirements, không thêm cơ chế phòng hờ. Chạy lại kiểm AC-7 (§Testability) nếu nghi ngờ. Dòng `URL:` cấp sutta vẫn còn làm đường thoát (FR-5) |
| Caller giữ nguyên `<segment_id>` hoặc dán cả ngoặc vuông vào fragment | L | L | Chỉ dẫn trong dòng nói rõ phải thay bằng ID trong ngoặc vuông. Hành vi của caller nằm ngoài tầm kiểm của server |
| Upstream trôi (số key, thứ tự `translations`, nội dung) làm literal pin lệch | M | L | Luật vận hành 3 của harness. Baseline FR-2 dựng từ live API trong cùng phiên, không bị trôi tương đối |
| Key bilara có dạng lạ (không `uid:…`) | L | L | In nguyên văn theo default của requirements. ID được escape bởi `CSS.escape` phía client (đã đo với `:` và `-`) |
