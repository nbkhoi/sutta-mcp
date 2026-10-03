# Design: Truyền query param `lang` vào `/api/bilarasuttas` cho `get_sutta`

**Status:** Reviewed
**Created:** 2026-08-09
**Spec slug:** bilara-lang-param
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/non-segmented-translation-guard/` — khối N1 của nó ràng buộc hình dạng diff (FR-6)

> **Cập nhật (2026-10-02 — spec `segment-id-in-get-sutta`):** khối N3-B ở §N3 đã được thay bằng
> bản giữ lại lang đã phục vụ bản dịch: thêm `let servedLang = "en";` (kèm comment) và gán
> `servedLang = retryLang` khi retry, để `get_sutta` dựng dòng `Deep link:`. Luật tie-break,
> điều kiện retry và số request không đổi. Khối code đó là bản hiện hành, khớp từng byte với
> `src/index.ts`. Sơ đồ và các con số "11 dòng"/"12 dòng" phía dưới là hồ sơ thời điểm. Lý do:
> `specs/segment-id-in-get-sutta/design.md`.
> Đính chính (design-review-1 S2): ở §Vùng giữ nguyên byte-for-byte / vùng đổi, dòng bảng
> "Thân `extractText()` — N1-A tiền nhiệm (19 dòng) | Giữ nguyên từng byte." và câu "không khối
> N1 nào bị đụng" đúng với thay đổi của spec này, nhưng là hồ sơ thời điểm: N1-A đã được thay bởi
> spec `segment-id-in-get-sutta`.

## Context Recap

Nguyên nhân đã xác lập ở requirements: `fetchBilaraText()` không truyền query param `lang`, upstream mặc định `'en'` khi thiếu (`lang = request.args.get('lang', 'en')`, `views.py:1058`), nên mọi bản dịch segmented không phải tiếng Anh về đến nơi đều thiếu `translation_text` và guard tiền nhiệm chặn oan. Ba mảnh deliverable: (1) code — truyền `lang` xuống endpoint, kèm đường suy `lang` server-side; (2) sửa `specs/non-segmented-translation-guard/requirements.md`; (3) sửa `specs/sutta-mcp-requirements.md`. Toàn bộ *hành vi* đã chốt ở requirements (FR-1..FR-8, NFR-1..6); tài liệu này chốt bốn thứ requirements ủy quyền: **phương án lấy `lang`**, **luật tie-break cho case một-nhiều**, **hình dạng code**, và **nội dung nguyên văn các khối sửa spec**.

Mọi con số và thứ tự trích trong tài liệu này được **đo lại trong phiên soạn design (2026-08-09)** — live API, grep baseline trên working tree sạch của nhánh `feature/bilara-lang-param`, diff N1 — không kế thừa số của requirements dù nó đã Reviewed. Tất cả khớp: `dhp1-20/phantuananh?lang=vi` 108/108; `dhp21-32` 63; `mn10/sabbamitta?lang=de` 204 key/200 đoạn; `mn10/sujato` 233/194, `?lang=en` giống hệt từng byte; `mn10/trush?lang=gu` 230, `?lang=hi` 232, entry `gu` đứng trước `hi` trong mảng `translations` (index 14/15, hai lần fetch cùng thứ tự); `minh_chau`/`indacanda` vẫn thiếu key kể cả với `?lang=vi`; `mn10` index 0 = `ms`/`pli`/`is_root=true`, `mn10/ms` và `?lang=pli` đều thiếu key (đường retry phí, §Luật tie-break); `dhp/sujato?lang=en` body chỉ có `msg`; N1-A 19/19 dòng diff rỗng; gate string 1 hit; `sujato` 3 hit (`:18`/`:237`/`:239`); `segmented` 3; translator-ID 0; `translation_text` 1.

## High-Level Design

**Phương án chọn: retry-on-miss** — phương án 3 trong bảng §Ranh giới requirements/design.

```
get_sutta(uid, translator, max_segments)
  │
  ├─ Promise.all([ fetchSuttaplex(uid), fetchBilaraText(uid, translator) ])   ← giữ nguyên song song
  │        (lời gọi bilara đầu KHÔNG truyền lang — upstream mặc định 'en')
  │
  ├─ extracted = extractText(bilaraData)          ← N1-A tiền nhiệm, không đụng
  │
  ├─ if (extracted.source === "root")             ← khối retry MỚI (N3-B)
  │     retryLang = entry ĐẦU TIÊN trong suttaplex.translations có
  │                 author_uid === translator && lang && lang !== "en"   ← luật tie-break
  │     if (retryLang)
  │        extracted = extractText(await fetchBilaraText(uid, translator, retryLang))
  │                                                ← request thứ 3, tuần tự, tối đa 1 lần
  │
  ├─ if (extracted.source !== "translation")      ← gate N1-B tiền nhiệm, không đụng
  │     └─→ formatUnavailable(...)                ← guard nguyên vẹn (FR-5)
  └─ else → đường bình thường hiện tại            ← FR-2/FR-6 tiền nhiệm
```

Vì sao retry-on-miss thắng hai phương án kia (chi tiết ở §Alternatives):

- **Đường mặc định không đổi một RTT nào.** `sujato`/tiếng Anh vẫn đúng 2 request song song, lời gọi bilara đầu giống hệt hiện tại — mệnh đề biện-luận của NFR-6 ("nếu tăng round-trip tuần tự cho đường mặc định...") không kích hoạt. Phương án serialize (tra suttaplex trước) trả +1 RTT trên *mọi* lời gọi để mua zero khác biệt hành vi.
- **Không đổi schema tool.** FR-8 mục (e) không kích hoạt; caller không phải biết lang của translator. Phương án tool-param vẫn phải chứa nguyên đường suy server-side này (AC-1/AC-2b gọi không param), tức nó là thiết kế này *cộng thêm* bề mặt schema.
- **Chi phí thật:** +1 request tuần tự chỉ trên đường trước đây bị guard chặn (được phục vụ hoặc legacy) — trong trần 3 request của NFR-6. Hệ quả: **FR-7 mục 5 kích hoạt** — errata note của spec tiền nhiệm phải ghi dòng NFR-4 bị thay thế (khối chữ ở §Thay đổi tài liệu).

### Vùng giữ nguyên byte-for-byte / vùng đổi (FR-6)

| Vùng | Trạng thái |
|---|---|
| Thân `extractText()` — N1-A tiền nhiệm (19 dòng) | **Giữ nguyên từng byte.** Kiểm bằng diff (AC-5), không grep |
| Gate + khối guard `if (extracted.source !== "translation") { … }` — N1-B và phần minh họa | **Giữ nguyên từng byte.** Chuỗi gate vẫn xuất hiện đúng 1 lần |
| `formatUnavailable()`, `formatCitation()`, `describe()` của `translator`, 4 tool còn lại, schema `get_sutta` | Không đụng (NFR-5; Q2 default giữ `describe()`) |
| `fetchBilaraText()` (`src/index.ts:18-23`) | **Đổi** — thêm tham số `lang?`, phát query param (N3-A) |
| Handler `get_sutta`: dòng `const extracted` (`:254`) + chèn khối retry trước gate | **Đổi** — `const` → `let`, chèn 11 dòng (N3-B) |

**Ngoại lệ FR-6 KHÔNG kích hoạt**: không khối N1 nào bị đụng, nên `specs/non-segmented-translation-guard/design.md` không sửa (mệnh đề git-diff-rỗng của AC-7 áp nguyên cho nó). Diff dự kiến trong `src/index.ts` là **đúng 2 hunk** — hunk 1 ở `fetchBilaraText` (2 dòng sửa), hunk 2 trong `get_sutta` (1 dòng sửa + 11 dòng chèn, kết thúc ngay *trên* dòng gate; với context mặc định, dòng gate chỉ xuất hiện làm context). Mệnh đề "không hunk nào **chạm**" của AC-5 chạy cơ giới bằng `git diff -U0 -- src/index.ts`: `-U0` không phát dòng context nào, hunk chỉ còn dòng `+`/`-` — đo trên file dự kiến (2026-08-09): vẫn đúng **2 hunk**, và chuỗi gate lẫn thân `extractText()` xuất hiện **0** lần trong toàn bộ output diff. Không còn cách đọc nào phải biện hộ.

### Đọc tối thiểu để implement

1. §N3-A — `fetchBilaraText()` nguyên văn.
2. §N3-B — khối retry nguyên văn, chứa luật tie-break dạng code.
3. §Luật tie-break — phát biểu thành văn + hệ quả AC-2b (`Tổng: 230 đoạn`).
4. §Thay đổi tài liệu — 4 khối chữ cho spec tiền nhiệm, 4 khối cho master spec, chép nguyên văn.
5. §Testability & Verification — vehicle theo từng AC, gồm hai lưu ý kế thừa từ review round 2.

## Data Model

**Không có kiểu mới, không entity mới.** `ExtractedText` giữ nguyên như spec tiền nhiệm định nghĩa. Giá trị `lang` là một `string` tạm trong scope handler, sinh từ đúng một nguồn: field `lang` của `suttaplex.translations[]` (mỗi entry mang `author_uid`, `author`, `lang`, `lang_name`, `segmented`, `is_root` — đo 2026-08-09). Đây là mệnh đề provenance mà AC-6 kiểm bằng đọc code: trên đường suy `lang` không có map literal khóa theo translator-ID, không có string literal translator-ID nào.

Literal `"en"` duy nhất trên đường suy (`t.lang !== "en"`) **không phải** tri thức về translator — nó là hằng transport phản chiếu default của upstream (`request.args.get('lang', 'en')`): lời gọi đầu không truyền `lang` đã *chính là* lời gọi `lang=en`, nên candidate `en` trên đường retry được chứng minh vô ích chứ không phải bị ưu tiên/kỳ thị. Không vi phạm lệnh cấm hardcode của FR-3.

Về compiler: không có bảo đảm kiểu mới nào được thêm và không mệnh đề nào ở đây dựa vào "compiler enforces". Một điều đã kiểm bằng `tsc` thật (xem §N3): đổi `const extracted` thành `let` không phá narrowing — sau gate, `extracted` vẫn narrow về nhánh `"translation"` vì không có reassignment nào giữa gate và chỗ dùng. Repo vẫn không bật `noUncheckedIndexedAccess`; mọi giới hạn của kiểu `ExtractedText` mà design tiền nhiệm liệt kê còn nguyên hiệu lực.

## Luật thi hành (N3–N4)

### Luật tie-break cho case một-nhiều — **[NORMATIVE]** (FR-2, AC-2b)

> Giá trị `lang` cho retry là field `lang` của **entry đầu tiên** trong mảng `suttaplex.translations` — theo đúng thứ tự API trả về, quét bằng `Array.prototype.find` — thỏa cả ba điều kiện: `author_uid === translator`, `lang` truthy, `lang !== "en"`. Không entry nào thỏa → không retry → gate xử lý như hiện tại (guard). Chỉ retry **một lần**, với **một** lang.

Hệ quả trên case sống `mn10`/`trush`: mảng liệt kê entry `gu` (index 14) trước `hi` (index 15) — đo 2026-08-09, hai lần fetch liên tiếp cùng thứ tự — nên `find` chọn **`gu`**, phục vụ 230 đoạn. **Chuỗi khớp của AC-2b là:**

```
[... văn bản bị cắt sau 50 đoạn. Tổng: 230 đoạn. Tăng max_segments để xem thêm.]
```

Tính deterministic (FR-2): hai lời gọi giống nhau cho cùng kết quả, vì luật chỉ phụ thuộc nội dung response suttaplex — đã chạy hai lần liên tiếp trên logic thật, cùng ra `gu`/230. Nếu upstream đổi thứ tự mảng, lang được chọn đổi theo — cùng class trôi-literal như mọi số pin khác, xử lý theo luật vận hành 3 của harness (fetch lại đối chiếu trước khi kết luận regression); luật tie-break *tự nó* không hardcode `gu`.

Giới hạn chấp nhận (Q1 requirements đã ghi nhận): `trush`/`hi` được `get_sutta_meta` quảng cáo nhưng không với tới được qua tool. Retry candidate thứ hai bị NFR-6 cấm (sẽ là request thứ 4).

**Lớp candidate `is_root` — quyết định thành văn: không lọc, chấp nhận 1 retry phí.** Luật trên không có điều kiện `is_root`, nên khi caller yêu cầu chính tác giả bản gốc, entry root cũng lọt predicate — case sống: `mn10`/`ms`, entry **index 0** của `translations` là `{author_uid: "ms", lang: "pli", is_root: true}`, thỏa cả ba điều kiện → `find` chọn `pli`, retry bắn. Đo 2026-08-09: cả `mn10/ms` lẫn `mn10/ms?lang=pli` đều thiếu `translation_text` → kết cục **guard sau 1 request phí** (3 request tổng — trong trần NFR-6; hàng `ms` ở bảng §Performance). Đây là chỗ cố ý lệch tiền lệ lọc `is_root` của hai nhánh *liệt kê* (`formatUnavailable()` lọc `is_root !== true`, `src/index.ts:162`; `get_sutta_meta` lọc `!t.is_root`, `:309`): hai chỗ đó chọn cái *hiển thị* cho người dùng, còn ở đây thêm `&& t.is_root !== true` chỉ tiết kiệm đúng 1 request trên một đường ngoại lệ mà kết cục quan sát được không đổi (vẫn guard) — không đáng giá việc amend khối N3-B đã verify, cùng loại cân nhắc với Alternative E (không đưa thêm cờ metadata vào bộ lọc retry).

### N3 — hai khối code normative nguyên văn

Cả hai khối dưới là đặc tả, không phải minh họa — code phải khớp **từng ký tự**, comment tính là một phần của luật. Toàn bộ file `src/index.ts` dự kiến (bản hiện tại + đúng hai thay đổi này) đã được compile thật bằng `tsc --noEmit` với chính `tsconfig.json` của repo (strict, Node16): **0 lỗi**, và hành vi đã chạy thật trên live API cho cả 8 đường đi trong bảng §Performance (đếm hàng legacy là hai cặp; gồm đường root-author `ms` — xem §Luật tie-break). **Nghĩa vụ đồng bộ:** nếu khi implement buộc phải lệch một ký tự khỏi N3, tài liệu này phải được amend trong cùng thay đổi — như luật N1 của spec tiền nhiệm.

**N3-A — `fetchBilaraText()`** (thay nguyên hàm ở `src/index.ts:18-23`). Vehicle kiểm: `awk '/^async function fetchBilaraText/,/^}$/' src/index.ts` (6 dòng) diff với khối này.

```ts
async function fetchBilaraText(uid: string, translator = "sujato", lang?: string) {
  const url = `${SC_BASE}/bilarasuttas/${uid}/${translator}${lang ? `?lang=${lang}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
  return res.json();
}
```

Tham số thứ ba optional: mọi call site cũ (`:250`) compile nguyên trạng, và lời gọi đầu của `get_sutta` **cố ý** không truyền `lang` (đường mặc định giữ nguyên — FR-4, đã đo `?lang=en` giống hệt từng byte). Không encode `lang`: nhất quán với `uid`/`translator` trên cùng template string, và giá trị chỉ đến từ dữ liệu SC (mã lang ASCII ngắn).

**N3-B — khối retry trong `get_sutta`** (thay dòng `const extracted = extractText(bilaraData);` hiện tại ở `:254`; kết thúc ngay trước dòng trống + gate N1-B). Vehicle kiểm: `awk '/^    let extracted = extractText/,/^    }$/' src/index.ts` (12 dòng) diff với khối này (bỏ dòng `const citation` — dòng đó không đổi).

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

Ba lựa chọn bên trong khối, và lý do:

- **Điều kiện retry là `extracted.source === "root"`, không phải chuỗi gate.** Nó *tiêu thụ* cùng một `source` do `extractText()` sinh (đúng nguyên tắc một-predicate của FR-2 tiền nhiệm — không đọc lại `translation_text`, không đếm key), nhưng không lặp lại chuỗi `extracted.source !== "translation"` — AC-5 pin chuỗi đó đúng 1 hit. Trên union hai nhánh hiện tại, hai biểu thức tương đương; nếu tương lai thêm member thứ ba, `=== "root"` giữ đúng nghĩa hẹp "đã rơi về root" — đúng ý định của khối này.
- **Không lọc candidate bằng `t.segmented`.** Giữ nguyên tắc tiền nhiệm (metadata không bao giờ làm predicate phục vụ), giữ `grep -c 'segmented'` = 3 (AC-4), và không chặn đường phục vụ của một bản `segmented=false` giả định nào đó thực ra lấy được (chiều đủ của cờ là UNVERIFIED). Giá phải trả: đường legacy-guard tốn 1 request vô ích — xem §Performance.
- **Reassignment nằm trọn trước gate.** `let` chỉ đổi tại đúng một chỗ, trong khối retry; sau gate không có reassignment nên narrowing của TS hoạt động nguyên như cũ (kiểm bằng compile thật).

### N4 — grep bất biến, kiểm nhanh, không đủ một mình

Tất cả là **bất biến "giữ nguyên"** — đo trên file dự kiến sau thay đổi, khớp baseline trước thay đổi:

| Lệnh | Trước | Sau (đo trên file dự kiến) | Của AC nào |
|---|---|---|---|
| `grep -c -F 'extracted.source !== "translation"' src/index.ts` | 1 | **1** | AC-5 |
| `grep -c 'translation_text' src/index.ts` | 1 | **1** — vẫn chỉ trong `extractText()` | N2 tiền nhiệm |
| `grep -c 'segmented' src/index.ts` | 3 | **3** — comment N3-B không chứa từ này | AC-4 |
| `grep -c -F 'sujato' src/index.ts` | 3 | **3** — `:18` default param (dòng N3-A giữ), schema, `describe()` | AC-6 |
| `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush' src/index.ts` | 0 | **0** | AC-6 |
| `grep -c 'Object\.keys' src/index.ts` | 2 | **2** | N2 tiền nhiệm |
| `grep -c ' as ' src/index.ts` | 2 | **2** | N2 tiền nhiệm |

Như tiền nhiệm đã chứng minh: grep là bộ lọc thô, lưới thật là diff nguyên văn N3 + đọc code (mệnh đề provenance AC-6).

## API / Interface Contracts & Component Boundaries

| Component | Status | Trách nhiệm |
|---|---|---|
| `fetchBilaraText()` | modified (N3-A) | Điểm sửa transport duy nhất — phát `?lang=` khi được truyền (FR-1) |
| `get_sutta` handler | modified (N3-B) | Suy `retryLang` theo luật tie-break, retry tối đa 1 lần; phần từ gate trở xuống nguyên vẹn |
| Schema tool `get_sutta` | **không đổi** | Không tham số mới → FR-8(e) không kích hoạt, bảng Input Tool 2 của master spec không đụng |
| `extractText()`, gate + guard, `formatUnavailable()`, `formatCitation()`, 4 tool còn lại | không đổi | N1 tiền nhiệm + NFR-5 |

Không hàm module-scope mới nào được thêm — hạn ngạch "tối đa một" của NFR-5 không dùng đến. `fetchSuttaplex()`/`fetchParallels()` không đổi (FR-1).

## Integration Points

- **Upstream:** vẫn đúng hai endpoint `/suttaplex/` và `/bilarasuttas/` (NFR-6). Request thứ ba (nếu có) đi vào cùng `fetchBilaraText()`, cùng xử lý lỗi.
- **Downstream:** MCP client (Claude) — không thay đổi hợp đồng: cùng cấu trúc output đường bình thường (FR-2 yêu cầu "không thêm chế độ output mới"), cùng guard message nguyên văn cho cặp không phục vụ được (FR-5).
- **Harness:** tái dùng nguyên heredoc tiền nhiệm (`specs/non-segmented-translation-guard/requirements.md:170-186`). `sleep 20` vẫn đủ ngân sách: đường nhiều request nhất thêm đúng một fetch tuần tự (~1-2s trên phép đo phiên này).
- **Giả định upstream mang theo (UNVERIFIED, kế thừa từ requirements):** `@cache.cached` của upstream phân biệt query param trong cache key. Mọi phép đo hai phiên (requirements + design) nhất quán với giả định; nếu sai, triệu chứng là AC-1/AC-2b fail chập chờn — xem Risks.

## Thay đổi tài liệu (FR-7, FR-8) — **[NORMATIVE]**

Các khối dưới đây là nội dung chép nguyên văn. Từng khối đã được đối chiếu **trước** với mọi matcher pin trong AC-7/AC-8 (chuỗi phải-biến-mất không xuất hiện, token phải-có có mặt) — người implement không cần tự soạn lại chữ. Baseline mọi matcher đo lại phiên này trên hai file chưa sửa: khớp từng số với requirements (196/250/258/375; heading @7; NFR-4 @156+@304 đều sau heading; lát cắt AC-5→AC-6 16 dòng, bốn cụm phủ định 1 hit mỗi cụm @260-263; master 298/300/304×2; `?lang=` 0; `bilara-lang-param` 0 cả hai file).

### FR-7 — `specs/non-segmented-translation-guard/requirements.md` (4 khối)

**(1) Errata note** — chèn giữa dòng metadata cuối (`**Spec slug:** …`, dòng 5) và heading `## Context & Goal` (dòng 7), cách trên dưới một dòng trống. FR-7.5 **kích hoạt** (design chọn retry-on-miss) nên note chứa dòng NFR-4 — chữ viết theo khuyến nghị S1 của review round 2 (nêu đích danh token `NFR-4`, thứ AC-7 grep, thay vì chép nguyên câu FR-7.5 vốn thiếu token):

```markdown
> **Errata (2026-08-09 — spec `bilara-lang-param`):** Nguyên nhân của hiện tượng "HTTP 200
> nhưng thiếu `translation_text`" mà spec này để mở nay đã được xác lập: `fetchBilaraText()`
> không truyền query param `lang`, trong khi upstream mặc định tiếng Anh khi thiếu —
> `lang = request.args.get('lang', 'en')` (`server/src/api/views/views.py:1058`; câu code là
> neo chính, số dòng upstream có thể trôi). Lời giải, phép đo và fix: `specs/bilara-lang-param/`.
> Các đoạn tường thuật "nguyên nhân chưa biết" phía dưới (§"Không có nguyên nhân nào đã được
> xác lập", các assumption liên quan) giữ nguyên như hồ sơ thời điểm, đọc qua ô cửa này.
> NFR-4 của spec này (biên "đúng 2 request song song") được NFR-6 của `bilara-lang-param`
> thay thế: tối đa 3 request cho mỗi lời gọi `get_sutta` — request thứ ba là retry-on-miss.
```

**(2) AC-5 viết lại** — thay toàn bộ section `### AC-5` (hiện dòng 250-264, tức lát cắt trừ dòng heading `### AC-6`):

```markdown
### AC-5: Case class quyết định — `dhp1-20` + `phantuananh` (nay trả nội dung — xem `bilara-lang-param`)

- **Maps to:** FR-1, FR-2, FR-3, FR-4 — theo vai trò lịch sử của case; kết cục hiện hành do spec `bilara-lang-param` định nghĩa
- Bản gốc của tiêu chí này pin `dhp1-20`/`phantuananh` là case guard bắn dù `segmented=true` — đúng tại thời điểm viết, khi chưa lời gọi nào truyền `?lang=` xuống endpoint. Sau fix của `bilara-lang-param` (truyền `?lang=vi`), cùng lời gọi harness đó trả **nội dung bản dịch tiếng Việt** trên đường bình thường, nên các mệnh đề đòi guard của bản gốc sẽ fail thật khi chạy lại và đã được gỡ theo FR-7 của spec đó.
- **Bản chuẩn hiện hành: AC-1 của `specs/bilara-lang-param/requirements.md`** — output chứa `Translator: Bhikkhu Thích Minh Châu (phantuananh)`, thân bắt đầu `Tiểu Bộ Kinh`, kết thúc `[... văn bản bị cắt sau 50 đoạn. Tổng: 108 đoạn. Tăng max_segments để xem thêm.]`, và **không** chứa `manoseṭṭhā manomayā;` (neo root Pali — bản dịch hiển thị thì root không được phát).
- Điều case này vẫn chứng minh cho spec này: guard khóa vào **response thực tế** — cùng cặp `(uid, translator)`, response đổi (đúng `lang`) thì kết cục đổi mà không đụng một dòng nào của guard.
```

**(3) Đoạn "Vai trò các case class"** — thay nguyên đoạn ở dòng 196:

```markdown
**Vai trò các case class:** case guard là `segmented=false` — AC-1 và AC-4. AC-3 là **đối chứng**: đường bình thường không được chạm guard. AC-5 nguyên là case guard thứ hai (`segmented=true` mà response thiếu `translation_text`); sau spec `bilara-lang-param` nó là case trả nội dung — xem chính section AC-5.
```

**(4) Q1 đóng** — thay nguyên bullet Q1 ở dòng 375:

```markdown
- **Q1 — đã đóng (2026-08-09, spec `bilara-lang-param`):** Website render `dhp1-20/vi/phantuananh` được vì nó truyền `lang` cho backend; `/api/bilarasuttas/` mặc định tiếng Anh khi thiếu query param — `lang = request.args.get('lang', 'en')` (`views.py:1058`). Fix phía Sutta MCP: truyền `?lang=` lấy từ `suttaplex.translations[].lang` — xem `specs/bilara-lang-param/`. Guard giữ nguyên đối tượng thật: `minh_chau`, `indacanda` vẫn không được phục vụ kể cả khi truyền đúng `lang=vi` (đo 2026-08-09).
```

**Không đụng gì khác trong file đó** — quyết định thành văn: AC-11 (dòng 319, đòi master spec viết "câu hỏi mở chưa điều tra") và mọi tường thuật lịch sử khác nằm ngoài bốn vị trí FR-7 liệt kê; chúng thành hồ sơ thời điểm dưới ô cửa errata, không sửa. `design.md`/`tasks.md`/`clarifications.md`/`reviews/` của spec đó: git diff rỗng (ngoại lệ N1 không kích hoạt).

### FR-8 — `specs/sutta-mcp-requirements.md` (4 khối; mục (e) không kích hoạt)

**(a) Đóng khối "Câu hỏi mở (chưa điều tra)"** — thay nguyên đoạn ở dòng 304:

```markdown
   **Đã có lời giải (2026-08-09, spec `bilara-lang-param`):** website render `dhp1-20/vi/phantuananh` được vì nó truyền `lang` cho backend; `/api/bilarasuttas/` mặc định tiếng Anh khi thiếu query param — `lang = request.args.get('lang', 'en')` (`server/src/api/views/views.py:1058`; câu code là neo chính, số dòng upstream có thể trôi). Fix phía Sutta MCP: `fetchBilaraText()` truyền `?lang=` lấy từ `suttaplex.translations[].lang` — xem `specs/bilara-lang-param/`.
```

**(b) Dòng `phantuananh`** — thay nguyên bullet ở dòng 298:

```markdown
   - `phantuananh` — Dhammapada (`text_uid: dhp`), **`segmented=true` và đã xuất bản** (scpub43, `is_published: true`), có source trong `bilara-data/translation/vi/phantuananh/sutta/kn`. `/api/bilarasuttas/` **có trả** `translation_text` khi truyền đúng `?lang=vi` — `dhp1-20`: 108 đoạn, `dhp21-32`: 63 đoạn (đo 2026-08-09); thiếu `?lang=vi` thì thiếu key. Riêng UID gộp `dhp` không phải đơn vị phục vụ của endpoint với **bất kỳ** dịch giả nào (kể cả `sujato` — body chỉ có key `msg`), không phải chuyện riêng của `phantuananh`.
```

**(c) Câu về cột `segmented`** — thay nguyên câu ở dòng 300:

```markdown
   Khi truyền đúng `lang`, mọi case đã đo khớp với cờ `segmented`: `segmented=true` → phục vụ (`sujato`, `phantuananh`, `sabbamitta`); `segmented=false` → không (`minh_chau`, `indacanda`). Mẫu 5 dịch giả — bảo lưu mẫu nhỏ, chưa phải bảo đảm hai chiều; guard của `get_sutta` vẫn khóa vào response thực tế, không khóa vào cờ.
```

**(d) Bảng endpoint** — thay hàng bilarasuttas ở dòng 121:

```markdown
| `GET /api/bilarasuttas/{uid}/{translator}?lang={lang}` | Toàn văn sutta (segmented). Thiếu `lang` → upstream mặc định `en` (`lang = request.args.get('lang', 'en')`, `views.py:1058`) |
```

**Không đụng gì khác** — quyết định thành văn: đoạn "Cơ chế thật (đã xác minh)" (dòng 293) giữ nguyên — nó mô tả lời gọi *thiếu* `lang` và guard, vẫn đúng nghĩa đen sau fix, nhất quán với vế "thiếu `?lang=vi` thì thiếu key" của khối (b); FR-8 liệt kê đủ các vị trí sửa, không nới. Bảng Input Tool 2 (dòng 166-172) không đụng (mục (e) không kích hoạt).

## Cross-Cutting Concerns

**Authentication & Authorization:** không áp dụng — API công khai, MCP stdio chạy cục bộ (nguyên trạng tiền nhiệm).

**Logging & Observability:** không áp dụng — không thêm log; stderr giữ nguyên vai trò kênh chẩn đoán stdio.

### Error Handling

Không nhánh lỗi mới (ràng buộc FR-5). Request retry đi qua chính `fetchBilaraText()` — network error / `!res.ok` ném ồn ào như hiện tại. Các đường input xấu đã đo đều **rơi về guard, không ném**: lang không tồn tại (`?lang=xx` → 200 thiếu key), translator typo (không entry suttaplex → không retry → guard, 2 request). `suttaplex` là `null`/`undefined` → `(suttaplex?.translations ?? [])` → không candidate → không retry — cùng hình dạng phòng thủ với code hiện có.

### Performance & Scalability

Số request theo đường đi — **đo bằng chạy thật logic N3 trên live API (2026-08-09)**, không phải suy diễn:

| Đường | Request | Kết cục đo được |
|---|---|---|
| `mn10`/`sujato` (mặc định, en) | **2** song song — không đổi | 194 đoạn, không retry |
| `dhp1-20`/`phantuananh` | **3** (2 song song + 1 tuần tự) | 108 đoạn, `Tiểu Bộ Kinh` |
| `mn10`/`sabbamitta` | 3 | 200 đoạn |
| `mn10`/`trush` (một-nhiều) | 3 | 230 đoạn (`gu` — tie-break), lặp lại y nguyên lần hai |
| `mn10`/`minh_chau`, `thag1.1`/`indacanda` (legacy) | 3 — retry `vi` vô ích rồi guard | guard nguyên văn |
| `mn10`/`ms` (root-author — lớp `is_root`, xem §Luật tie-break) | 3 — retry `pli` vô ích rồi guard | guard nguyên văn |
| `mn10`/`xyzzy` (typo) | 2 — không candidate | guard |

Max = 3, chỉ hai endpoint — đúng trần NFR-6. Đường mặc định không thêm RTT tuần tự nào → mệnh đề biện-luận của NFR-6 không kích hoạt. Chi phí đáng nói duy nhất: các đường về-guard-sau-retry (legacy, và root-author `ms`) đắt thêm 1 request so với trước — chấp nhận, đổi lấy việc không dùng cờ metadata làm bộ lọc retry (xem N3-B, Alternative E và §Luật tie-break).

### Testability & Verification

Không test framework (ràng buộc). Ba cơ chế như tiền nhiệm — compiler, harness stdio, diff/grep/đọc-code:

| AC | Vehicle | Ghi chú thi hành |
|---|---|---|
| AC-1, AC-2, AC-3, AC-4 | Harness (`npm run build` trước; mỗi lần chạy `grep -c '"id":2'` = 1) | Kỳ vọng theo từng AC của requirements; mọi con số đã tái lập phiên này |
| AC-2b | Harness, **chạy 2 lần** | Cả hai lần phải kết đúng chuỗi `Tổng: 230 đoạn` — khớp luật tie-break §trên (design chọn `gu`) |
| AC-4 (mệnh đề grep) | `grep -c 'segmented' src/index.ts` = 3 | N4 — không hit mới |
| AC-5 | awk-diff N1-A (19/19, rỗng — đã chạy trên file dự kiến); `grep -c` chuỗi gate = 1; `git diff -U0 -- src/index.ts` | Mệnh đề "chạm" cơ giới hóa: `-U0` bỏ context, output không được chứa chuỗi gate hay thân `extractText()` (đo trên file dự kiến: 2 hunk, 0 hit); hình dạng 2-hunk kỳ vọng ở §High-Level Design |
| AC-6 | `npm run build` (đã chạy `tsc --noEmit` trên file dự kiến: 0 lỗi); `git status`/`git diff`; N4; đọc code | Hai mệnh đề đọc-code: (1) provenance — `retryLang` chỉ từ `find` trên `suttaplex.translations`, không map/literal translator-ID; (2) đường nhiều request nhất = 3 (2 trong `Promise.all` + 1 trong khối retry). **Lưu ý kế thừa review round 2 (W1):** mệnh đề fetch-endpoint ở dòng 206 requirements thiếu qualifier `get_sutta` — chạy dạng đúng phạm vi: *trên đường đi của `get_sutta`* không lời gọi `fetch` nào ngoài `/suttaplex/` và `/bilarasuttas/`; `fetchParallels()` (`src/index.ts:25-30`, gọi `/parallels/`) thuộc tool khác, là baseline không đổi, không phải vi phạm |
| AC-7 | `grep`/`awk` trên predecessor requirements **sau sửa** | Giá trị hậu-sửa kỳ vọng (đo trên bản sao đã áp đủ 4 khối, 2026-08-09): 3 chuỗi cấm toàn-file = 0; `bilara-lang-param` ≥ 2 (đo: 9, hit đầu dòng 7) — hit đầu trong errata, trước heading `## Context & Goal` (heading trôi xuống dòng **17** sau khi chèn 10 dòng: 9 dòng note + 1 dòng trống); `NFR-4` có ≥ 1 hit trước heading (câu cuối errata — hit đo được ở dòng 14; mệnh đề có-điều-kiện **áp dụng** vì design phát request thứ 3); lát cắt AC-5: `bilara-lang-param` ≥ 1 (khối (2) chứa **4**), bốn cụm phủ định = 0; git diff các file hồ sơ = rỗng |
| AC-8 | `grep` trên master spec sau sửa + đọc mục 2 | 4 chuỗi cấm = 0; `?lang=` ≥ 1 (khối (a)(b)(d) đều chứa); `bilara-lang-param` ≥ 1; nội dung 108/63/`dhp` gộp/câu code nguyên văn/bảo lưu mẫu nhỏ — tất cả nằm sẵn trong khối (a)-(d) |

Điểm mù AC đã biết, chuyển tiếp cho task planner (tiền lệ tiền nhiệm): không AC nào chạy case **typo translator sau fix** (`mn10`/`xyzzy` — kỳ vọng: guard, 2 request, không retry). Đã chạy thật phiên này trên logic N3 (kết quả đúng kỳ vọng); nên lặp lại một lần qua harness khi verify AC-4, vì đó là đường duy nhất mà "không candidate → không retry" là hành vi tải trọng.

## Alternatives Considered

### Alternative A: Thêm tham số tool `lang` cho `get_sutta`

- **Mô tả:** Schema thêm `lang: z.string().optional()`; caller địa chỉ trực tiếp từng lang; khi vắng param, server tự suy.
- **Vì sao không chọn:** AC-1/AC-2b gọi *không* param, nên đường suy server-side + luật tie-break vẫn phải tồn tại y nguyên — phương án này là thiết kế được chọn **cộng thêm** bề mặt schema, nghĩa vụ FR-8(e), và trách nhiệm biết-lang đẩy sang caller. Trade-off ghi nhận trung thực: đây là phương án **duy nhất** làm `trush`/`hi` với tới được qua tool (độ vênh Q1). Nếu độ vênh đó thành yêu cầu thật, thêm param là bước kế tự nhiên và **tương thích ngược** với thiết kế này: retry hiện tại trở thành fallback khi param vắng.

### Alternative B: Serialize — tra suttaplex trước, luôn truyền `lang`

- **Mô tả:** `await fetchSuttaplex()` xong mới gọi bilara kèm lang suy được; bỏ `Promise.all`.
- **Vì sao không chọn:** +1 RTT tuần tự trên **mọi** lời gọi, kể cả đường mặc định `sujato` — đúng thứ NFR-6 bắt biện luận; đổi lại zero khác biệt hành vi trên mọi case đã đo (`?lang=en` giống hệt từng byte lời gọi không param). Trả latency phổ quát để mua sự đối xứng thẩm mỹ.

### Alternative C: Retry lần lượt mọi candidate lang

- **Mô tả:** Khi miss, thử từng entry khác-`en` của translator cho tới khi một lang phục vụ được.
- **Vì sao không chọn:** Candidate thứ hai là request thứ **4** — vượt trần NFR-6. Class "candidate đầu miss, candidate sau được phục vụ" chưa có case sống (`trush`: cả hai đều được phục vụ); nếu xuất hiện, kết cục là guard — an toàn, không gán nhầm (xem Risks).

### Alternative D: Giữ `const extracted` nguyên trạng, probe bằng lần gọi `extractText` riêng

- **Mô tả:** Suy `bilaraData` cuối cùng *trước* dòng `const extracted` (probe `extractText(firstBilara).source` rồi vứt kết quả), để dòng `:254` giữ nguyên từng byte.
- **Vì sao không chọn:** Chạy `extractText` hai lần trên **mọi** đường và vứt kết quả probe — mua sự bất biến của một dòng *không normative* (chỉ N1-A và gate là normative) bằng code khó đọc hơn. Sửa `const`→`let` là 1 ký tự trên dòng nằm ngoài mọi khối pin.

### Alternative E: Lọc candidate retry bằng `t.segmented === true`

- **Mô tả:** Tránh retry vô ích cho legacy (`minh_chau` có entry `lang: "vi"`, `segmented=false`) — tiết kiệm 1 request trên đường guard.
- **Vì sao không chọn:** Dựng lại đúng loại predicate-theo-metadata mà spec tiền nhiệm cấm làm căn cứ phục vụ; `grep 'segmented'` 3→4 buộc khai báo ngoại lệ AC-4; và nếu tồn tại bản `segmented=false` thực ra phục vụ được (chiều đủ của cờ chưa chứng minh), filter này chặn vĩnh viễn đường phục vụ nó. Một request tiết kiệm được không mua nổi ba thứ đó.

## Risks & Mitigations

| Rủi ro | Khả năng | Tác động | Giảm thiểu |
|---|---|---|---|
| Upstream đổi thứ tự mảng `translations` → tie-break chọn `hi` (232), lệch chuỗi AC-2b và luật đã ghi | L | M | Luật là "entry đầu theo thứ tự API", không hardcode `gu`; luật vận hành 3 của harness: fetch lại suttaplex đối chiếu thứ tự trước khi kết luận regression. Deterministic tại-một-thời-điểm vẫn giữ (đã chạy 2 lần) |
| `@cache.cached` upstream không phân biệt query param → retry nhận body cache của lời gọi không-lang → guard bắn oan chập chờn | L | M | UNVERIFIED kế thừa; hai phiên đo độc lập đều nhất quán có/không `lang`. Triệu chứng nếu sai: AC-1/AC-2b fail không ổn định — đối chiếu response live trực tiếp |
| Drift: điều kiện retry viết bằng chuỗi gate → `grep` gate = 2, AC-5 vỡ | M | L | N3-B nguyên văn dùng `=== "root"`; N4 đếm chuỗi gate = 1 |
| Drift: đường suy lang đọc `translation_text` trực tiếp trong handler → một-predicate của tiền nhiệm vỡ | L | H | N3-B chỉ tiêu thụ `extracted.source`; N4: `translation_text` = 1; diff N3 là lưới cuối |
| Class một-nhiều "candidate đầu không phục vụ được, candidate sau được" → bản servable không với tới, guard bắn | L | M | Chưa có case sống; NFR-6 cấm request 4 nên không sửa được trong biên này; guard message vẫn liệt kê alternatives + link SC làm đường thoát; ghi nhận tại Q1 requirements |
| Đường guard-có-candidate (legacy; root-author `ms`) tốn 3 request thay 2, harness chậm hơn ~1-2s mỗi case guard | H (by design) | L | Trong trần NFR-6 và ngân sách `sleep 20`; đã đo chạy thật (cả `ms` — §Luật tie-break) |
| Reassignment `extracted` *sau* gate trong sửa đổi tương lai — compile vẫn sạch (cả hai nhánh union đều có `lines`) nhưng phá bất biến non-empty | L | L | N3-B giới hạn reassignment trong khối retry, trước gate; nghĩa vụ đồng bộ N3 buộc amend design này trước khi lệch |
| Comment N3-B trôi (ai đó "dọn" comment) làm diff N3-B lệch | L | L | Comment là một phần của luật N3 — như tiền lệ N1-A; vehicle diff bắt ngay |
