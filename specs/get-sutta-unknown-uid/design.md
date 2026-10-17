# Design: `get_sutta` báo đúng "không tìm thấy" cho UID không tồn tại

**Status:** Reviewed
**Created:** 2026-10-17
**Spec slug:** get-sutta-unknown-uid
**Requirements:** [requirements.md](./requirements.md)
**Tiền nhiệm:** `specs/non-segmented-translation-guard/` (N1-A, N1-B, N5-T), `specs/bilara-lang-param/` (N3-A, N3-B), `specs/segment-id-in-get-sutta/`. Spec này không đụng khối normative nào của ba spec đó, xem §Khối normative của spec tiền nhiệm.

## Context Recap

Với UID không có trên SuttaCentral (issue #10, `mn9999`), SC trả HTTP 200 kèm suttaplex có `uid: null`, nên `get_sutta` không ném lỗi mà đi tiếp vào nhánh guard. Kết quả là citation hỏng (`**?**`, `URL: https://suttacentral.net/?`) và câu thông báo đổ lỗi cho dịch giả. Requirements chốt tín hiệu not-found là `!suttaplex?.uid` (FR-1), cũng là tiêu chí `get_sutta_meta` đang dùng. Output phải trùng từng byte câu của `get_sutta_meta` (FR-2/FR-3), không request retry (FR-4), và mọi đường UID hợp lệ giữ nguyên từng byte (FR-5). Tài liệu này chốt bốn điểm: vị trí và chữ nguyên văn của khối kiểm (U1), quan hệ với các khối normative tiền nhiệm, quyết định giữ request bilara song song, và quy trình baseline A/B để kiểm FR-5.

Mọi literal trong tài liệu này được **đo lại trong phiên soạn design (2026-10-17)**. Có ba nguồn đo. Thứ nhất là `curl` live. Thứ hai là một bản dựng thử: `src/` lấy từ `249bb97` bằng `git archive` vào thư mục ngoài repo, chèn khối U1, `npx tsc --noEmit` và `npx tsc` đều thoát 0 với `tsconfig.json` của repo. Thứ ba là harness stdio chạy A/B giữa bản dựng thử và bản dựng `249bb97` trên toàn bộ input của AC-1..AC-6.

## High-Level Design

Kiến trúc không đổi: một file, 5 tool, cùng số request. Thay đổi duy nhất là một khối `if` có `return` sớm trong handler `get_sutta`, đặt **giữa** `Promise.all` và dòng `const citation`:

```
get_sutta(uid, translator, max_segments)
  ├─ Promise.all([fetchSuttaplex(uid), fetchBilaraText(uid, translator)])   ← không đổi
  │     (một trong hai ném → handler ném → SDK trả isError, như hiện tại; FR-6)
  ├─ if (!suttaplex?.uid) return "Không tìm thấy sutta với UID: {uid}"      ← MỚI (U1)
  ├─ const citation = formatCitation(suttaplex)                              ← không đổi
  ├─ let extracted / let servedLang / khối retry                             ← N3-B, không đổi
  ├─ if (extracted.source !== "translation") → formatUnavailable(...)        ← N1-B, không đổi
  └─ output thường (Translator, Deep link, [id] text, tail)                  ← không đổi
```

Ba quyết định trung tâm:

1. **Tín hiệu là suttaplex, đọc ở handler, không ở helper fetch.** `fetchSuttaplex()` và `fetchBilaraText()` giữ nguyên (§Alternative A, B). Body bilara `{"msg": "Not Found"}` **không phải** tín hiệu not-found. Đo lại 2026-10-17: `mn9999/sujato`, `dhp1/sujato`, `dhp/sujato` **và** `mn/sujato` đều trả đúng body đó. Hai UID nhánh `mn`, `dhp` có suttaplex `uid` thật (`"mn"`, `"dhp"`) và phải ở lại nhánh guard (FR-5, `segment-id-in-get-sutta` FR-6). Kiểm bằng bilara sẽ phân loại sai đúng hai case này.
2. **Kiểm ngay sau `Promise.all`, trước mọi thứ dùng `suttaplex`.** `return` sớm ở đây làm FR-3 và FR-4 thành tính chất cấu trúc. Đường not-found không chạm `formatCitation()`, không chạm khối retry (nên không có request `?lang=`), không chạm gate hay `formatUnavailable()`. Nó không còn phụ thuộc vào việc upstream trả `translations: []`.
3. **Giữ request bilara song song (đóng Q1 của requirements).** Phải đợi suttaplex trả về mới biết UID có tồn tại hay không. NFR-4 buộc suttaplex và bilara lần đầu chạy song song trên đường UID hợp lệ, nên chúng cũng song song trên đường not-found. Request bilara thừa trên đường not-found là hệ quả trực tiếp của NFR-4, không phải lựa chọn mở. FR-4 cho phép ≤ 2 request, và đường này dùng đúng 2 (§Performance).

### Đọc tối thiểu để implement

Chỉ một khối ràng buộc code, đánh dấu **[NORMATIVE]** tại chỗ:

1. §U1: khối kiểm not-found kèm ngữ cảnh vị trí, nguyên văn.

Không có khối sửa tài liệu nào (§Khối normative của spec tiền nhiệm).

### Khối normative của spec tiền nhiệm

Khối U1 nằm ngoài mọi vùng mà matcher của ba spec tiền nhiệm trích ra. Đo trên bản dựng thử, từng `diff` dưới đây đều rỗng:

| Khối | Matcher | Đụng? | Kết quả trên bản dựng thử |
|---|---|---|---|
| **N5-T** (kiểu `Segment`/`ExtractedText`) | `awk '/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/'` vs `specs/non-segmented-translation-guard/design.md` | Không | diff rỗng |
| **N1-A** (`extractText()`) | `awk '/^function extractText/,/^}$/'` vs `specs/non-segmented-translation-guard/design.md` | Không | diff rỗng |
| **N1-B** (dòng gate) | `grep -c -F 'extracted.source !== "translation"'` = 1 | Không | 1 |
| **N3-A** (`fetchBilaraText()`) | `awk '/^async function fetchBilaraText/,/^}$/'` vs `specs/bilara-lang-param/design.md` | Không | diff rỗng |
| **N3-B** (khối retry) | `awk '/^    let extracted = extractText/,/^    }$/'` vs `specs/bilara-lang-param/design.md` | Không | diff rỗng (18 dòng) |

Code fence N3-B trong `specs/bilara-lang-param/design.md` bắt đầu bằng dòng `const citation = formatCitation(suttaplex);` rồi tới `let extracted = …`. U1 chèn **trước** `const citation`, nên hai dòng đó vẫn liền nhau trong `src/index.ts` và fence vẫn là bản sao liền mạch của code. Nếu chèn giữa hai dòng đó, matcher awk N3-B vẫn pass (nó bắt đầu ở `let extracted`), nhưng fence không còn khớp code. Đây là lý do U1 pin cả ngữ cảnh vị trí, không chỉ thân `if`.

**Số dòng và văn xuôi của spec tiền nhiệm: không sửa.** Mọi tham chiếu `src/index.ts:NNN` trong ba design và ba requirements tiền nhiệm đều là số đo có ngày, trỏ vào code của thời điểm đó (ví dụ `:253-265` ở `segment-id-in-get-sutta/design.md` là code trước spec đó, còn hiện tại `const citation` ở `:256`). Không matcher nào khóa theo số dòng. Vì vậy không cần lệnh sửa đồng bộ nào kiểu G-*/L-*. Có một câu văn xuôi sẽ lệch một phần: `specs/segment-id-in-get-sutta/design.md:194` viết "UID sai chữ hoa/thường rơi vào guard trước khi tới dòng này". Sau thay đổi này, UID đó rơi vào nhánh not-found thay vì guard. Kết luận của câu (không bao giờ tới dòng `Deep link:`) vẫn đúng. Câu này được giữ làm hồ sơ thời điểm, theo tiền lệ errata của các spec trước, và không sửa vì nó nằm ngoài phạm vi NFR-2.

## Data Model

Không áp dụng. Không kiểu mới, không field mới, không biến mới. Khối U1 không khai báo gì, nên các dòng sau nó thấy đúng scope như hiện tại. `suttaplex` có kiểu `any` (giá trị trả về của `fetchSuttaplex()`), nên `!suttaplex?.uid` không narrow gì và không ảnh hưởng type của code phía sau.

Miền đầu vào của điều kiện `!suttaplex?.uid`, theo cách `fetchSuttaplex()` chuẩn hóa (`Array.isArray(data) ? data[0] : data`):

| Body suttaplex | `suttaplex` | Điều kiện | Nhánh |
|---|---|---|---|
| `[{"uid": null, …}]` (đo: `mn9999`, `MN10`, `%20mn10`, `dhp1`) | object, `uid: null` | true | not-found |
| `[]` (chưa quan sát) | `undefined` | true | not-found |
| object thiếu `uid` / `null` (chưa quan sát) | object / `null` | true | not-found |
| `[{"uid": "mn", …}, …170 phần tử]` / `dhp` 27 phần tử | `[0]`, `uid` truthy | false | đi tiếp → guard (như hiện tại) |
| `mn10`, `ma98`, `dhp1-20` | `uid` truthy | false | đi tiếp, không đổi |

## API / Interface Contracts

Interface ra ngoài là chuỗi text của `get_sutta`. Schema input và `describe()` không đổi (NFR-5).

### U1 — khối kiểm not-found trong `get_sutta` — **[NORMATIVE]**

Khối dưới đây là **đoạn liên tục** của `src/index.ts`, từ dòng `const [suttaplex, bilaraData] = await Promise.all([` tới dòng `const citation = formatCitation(suttaplex);`, cả hai dòng tính vào. Thay đổi so với hiện tại là chèn 8 dòng, gồm một dòng trống và 7 dòng từ comment tới `}`, vào giữa `]);` và dòng trống sẵn có trước `const citation`. Không dòng nào khác đổi. Chép đúng từng ký tự, comment tính là một phần của luật.

```ts
    const [suttaplex, bilaraData] = await Promise.all([
      fetchSuttaplex(uid),
      fetchBilaraText(uid, translator),
    ]);

    // UID không tồn tại: SC trả HTTP 200, suttaplex có `uid` rỗng — cùng tín hiệu `!sp?.uid` của
    // tool metadata. Không xét body bilara: `{"msg":"Not Found"}` cũng gặp ở UID nhánh (mn, dhp).
    if (!suttaplex?.uid) {
      return {
        content: [{ type: "text", text: `Không tìm thấy sutta với UID: ${uid}` }],
      };
    }

    const citation = formatCitation(suttaplex);
```

Vehicle kiểm, bằng `diff` chứ không bằng `grep`. Lệnh dưới phải in rỗng, và mỗi vế trích đúng **14** dòng:

```sh
U1='/^    const \[suttaplex, bilaraData\] = await Promise.all\(\[/,/^    const citation = formatCitation\(suttaplex\);$/'
diff <(awk "$U1" src/index.ts) <(awk "$U1" specs/get-sutta-unknown-uid/design.md)
```

Đã chạy trên bản dựng thử và trên chính file design này: diff rỗng, 14/14 dòng. Pattern bắt đầu chỉ khớp dòng thụt 4 dấu cách, nên trong design này nó chỉ khớp fence ở trên.

Các tính chất của khối:

- **Literal thông báo trùng `get_sutta_meta`.** Dòng `content: [{ type: "text", text: \`Không tìm thấy sutta với UID: ${uid}\` }],` giống từng ký tự dòng tương ứng ở `get_sutta_meta` (`src/index.ts:325`). `{uid}` là tham số nguyên văn, không trim, không đổi hoa/thường (FR-2). Không đặt `isError` (FR-2). Sau thay đổi, `grep -c -F 'Không tìm thấy sutta với UID' src/index.ts` = 2 (NFR-6 cho phép ≤ 2).
- **Comment không nêu tên thành phần được bảo vệ.** Comment viết "tool metadata", không viết `get_sutta_meta`, để lệnh `git diff -U0 -- src/index.ts | grep` trên các tên ở NFR-5 cho 0 hit (§Testability, AC-7). Comment cũng không chứa `segmented`, `sujato`, `translation_text` hay câu thông báo (NFR-7, NFR-6).
- **Đúng `?.`.** Viết `!suttaplex.uid` vẫn compile (`suttaplex: any`) nhưng ném `TypeError` khi suttaplex là mảng rỗng hoặc `null`, và kết thúc bằng `isError` thay vì not-found. Diff U1 bắt được dạng này, compiler thì không.

Output not-found, ví dụ trên `mn9999` (bản dựng thử, 2026-10-17), là một content item duy nhất, `isError` vắng mặt:

```
Không tìm thấy sutta với UID: mn9999
```

## Component Boundaries

| Component | Status | Responsibility |
|-----------|--------|----------------|
| Handler `get_sutta` | modified (U1) | Trả not-found khi suttaplex không có `uid`, trước mọi xử lý khác |
| `fetchSuttaplex()`, `fetchBilaraText()` (N3-A), `extractText()` (N1-A), gate (N1-B), khối retry (N3-B), `formatCitation()`, `formatUnavailable()`, schema `get_sutta`, 4 tool còn lại, `TOPIC_INDEX`, `DIVISIONS` | không đổi | FR-6, FR-7, NFR-5 |

Không hàm, kiểu, hằng hay biến module-scope mới. Hình dạng diff đo trên bản dựng thử bằng `diff -U0`: **1 hunk, +8 / −0 dòng** (`@@ -254,0 +255,8 @@`). Output `-U0` chứa **0** lần mỗi chuỗi sau: `formatCitation`, `formatUnavailable`, `search_topic`, `get_sutta_meta`, `get_parallels`, `list_divisions`, `TOPIC_INDEX`, `DIVISIONS`, `z.`, `extracted.source`, `fetchSuttaplex`, `fetchBilaraText`, `Promise`.

## Integration Points

- **Upstream:** không đổi. Vẫn là `/suttaplex/` và `/bilarasuttas/`, không lời gọi `fetch` mới (`grep -c 'fetch(' src/index.ts` = 3 trước và sau). Đường not-found: 2 request. Đường UID hợp lệ: 2, hoặc 3 khi retry.
- **Downstream (Claude):** UID không tồn tại nay cho cùng một câu ở `get_sutta` và `get_sutta_meta`. Caller có thể xử lý hai tool như nhau. Mọi output khác không đổi byte nào (đo A/B, §Testability).
- **`search_topic`:** không đổi. Lỗi cùng dạng với `sn43.14` nằm ngoài phạm vi (requirements §Out of Scope).

## Cross-Cutting Concerns

### Authentication & Authorization

Không áp dụng. API SuttaCentral công khai, và MCP stdio chạy cục bộ dưới quyền người dùng (nguyên trạng).

### Error Handling

Có một nhánh kết quả mới (not-found, là text thường, không phải lỗi) và không có nhánh lỗi mới.

**Thứ tự ưu tiên khi UID không tồn tại mà request bilara song song ném (FR-6 thắng FR-2).** `Promise.all` reject ngay khi một promise thành phần reject. Khi đó `await` ném **trước** khi dòng `if (!suttaplex?.uid)` được thực thi, handler ném, và SDK dựng tool error `isError: true` với message của lỗi. Kết cục là FR-6 thắng, bất kể suttaplex trả gì. Tình huống ngược lại (suttaplex ném, bilara thành công) cũng cho cùng kết cục. Hành vi này **không đổi so với hiện tại**: ở `249bb97`, cùng lỗi đó cũng ném ở cùng `await`. Nó cũng là hệ quả bắt buộc của quyết định giữ song song: muốn not-found thắng thì phải bắt lỗi bilara, mà FR-6 cấm bắt hay đổi chữ lỗi. Case này đã xuất hiện thật trong phiên đo: một lần chạy `get_sutta {"uid":"mn9999"}` trên bản dựng thử trả `isError: true`, text `fetch failed` (lỗi mạng thoáng qua). Chạy lại thì cho not-found.

Các đầu vào khác:

- `uid: ""`: suttaplex 404, `fetchSuttaplex()` ném, cho `isError: true`, `SuttaCentral API error: 404`. Không đổi (AC-6, đo A/B).
- Suttaplex là mảng rỗng, `null` hoặc object thiếu `uid`: not-found nhờ `?.` (§Data Model). Chưa quan sát trên live.
- Translator sai trên UID hợp lệ (`mn10/xyzzy`, `ma98`), UID nhánh (`mn`, `dhp`): `uid` truthy nên U1 bỏ qua và kết quả vẫn là guard như cũ.

### Logging & Observability

Không áp dụng. Không thêm log. Stderr giữ vai trò kênh chẩn đoán của stdio transport.

### Performance & Scalability

| Đường | Request trước | Request sau | Độ trễ |
|---|---|---|---|
| UID không tồn tại | 2 (song song) | 2 (song song) | không đổi: chờ request chậm hơn trong hai, như hiện tại |
| UID hợp lệ, đường thường | 2 (song song) | 2 (song song) | thêm một phép so sánh |
| UID hợp lệ, retry | 3 | 3 | không đổi |

Request bilara trên đường not-found là request thừa. Phương án bỏ nó (fetch suttaplex trước, bilara sau) thêm một round-trip cho **mọi** lời gọi UID hợp lệ, trái NFR-4 (§Alternative C). Đường not-found thì đằng nào cũng trả kết quả ngay khi `Promise.all` xong.

### Testability & Verification

Không có test framework (ràng buộc dự án). Có ba vehicle: compiler, harness stdio chạy A/B giữa hai bản dựng, và diff/grep/đọc code trên repo.

#### Harness

Dựng lại `/tmp/mcp-call.sh` từ heredoc tại `specs/non-segmented-translation-guard/requirements.md` §Harness, giữ ba luật vận hành của `specs/bilara-lang-param/requirements.md` §Harness. Heredoc chạy `node ./dist/index.js` **tương đối với thư mục hiện hành**, nên cùng một script chạy được cả bản dựng cũ lẫn mới chỉ bằng cách đổi `cwd`. Không cần sửa heredoc.

#### Baseline A/B — **luật hợp lệ và cách dựng bản cũ**

**Dựng bản cũ (một lần, trước khi sửa code, ngoài repo):**

```sh
REPO=$(git rev-parse --show-toplevel)
git -C "$REPO" diff --quiet 249bb97 -- src || echo "STOP: src/ đã khác 249bb97"   # phải im lặng
BASE=$(mktemp -d /tmp/sutta-base.XXXXXX)
git -C "$REPO" archive 249bb97 src package.json tsconfig.json | tar -x -C "$BASE"
ln -s "$REPO/node_modules" "$BASE/node_modules"
(cd "$BASE" && npx tsc -p .)        # tạo $BASE/dist từ đúng 249bb97
```

- Dùng `git archive` mà không dùng `git worktree` hay `git stash` vì nó không ghi gì vào `.git`: không có entry `.git/worktrees`, không có branch bị checkout, không có stash cần nhớ pop lại. Thư mục chỉ là một cây file tạm.
- Chọn `249bb97`, không chọn "HEAD trước thay đổi", vì FR-5 so với output tại `249bb97`. Dòng kiểm đầu tiên dừng lại nếu `src/` của repo đã lệch khỏi commit đó, tức là nếu có thay đổi nào khác chen vào.
- Xóa `$BASE` khi xong (NFR-2).

**Chạy A/B, mỗi input một cặp, tuần tự, liền nhau trong cùng phiên.** Với mỗi input, chạy bản cũ rồi bản mới ngay sau đó: `(cd "$BASE" && /tmp/mcp-call.sh …)` rồi `(cd "$REPO" && npm run build && /tmp/mcp-call.sh …)`. Không chạy nhiều tiến trình song song. Đo trong phiên này: chạy 10 tiến trình đồng thời cho `fetch failed` ở 6/30 lần, còn chạy tuần tự vẫn có 2/12 lần. Vì vậy luật chạy lại dưới đây là cần thiết thật, không phải phòng hờ.

**Luật hợp lệ của một lần chạy.** Một lần chạy, của bản cũ hay bản mới, chỉ được tính khi thỏa **cả bốn** điều kiện. Không thỏa thì chạy lại cả cặp. Không được kết luận regression hay pass từ một lần chạy không hợp lệ.

1. Có đúng 1 dòng chứa `"id":2`.
2. `result.content` có đúng 1 phần tử.
3. `result.isError` vắng mặt hoặc khác `true`. Riêng AC-6 thì ngược lại: `isError: true` **và** text đúng bằng `SuttaCentral API error: 404`. Text `fetch failed` luôn là lần chạy hỏng, kể cả với AC-6.
4. Text chứa neo dương mà AC tương ứng nêu, áp cho **cả bản cũ** (neo của "trước"):

| Input | Neo, bản cũ | Neo, bản mới |
|---|---|---|
| AC-1, AC-2 (`mn9999`, `mn9999`+`phantuananh`, `MN10`, `" mn10"`, `dhp1`) | `URL: https://suttacentral.net/?` | text đúng bằng `Không tìm thấy sutta với UID: {uid}` |
| AC-4 (`mn10`+`xyzzy`, `mn10`+`minh_chau`, `ma98`, `mn`, `dhp`) | câu guard `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả` **và** `URL: https://suttacentral.net/{uid}` | như bản cũ |
| AC-5 `mn10`+`sujato` | `[mn10:1.1] So I have heard.` | như bản cũ |
| AC-5 `dhp1-20`+`phantuananh` | `https://suttacentral.net/dhp1-20/vi/phantuananh#` | như bản cũ |
| AC-5 `mn10`+`sabbamitta` | `https://suttacentral.net/mn10/de/sabbamitta#` | như bản cũ |
| AC-6 `""` | (điều kiện 3) | (điều kiện 3) |

**So sánh.** Với AC-4, AC-5, AC-6, text của hai lần chạy hợp lệ trong một cặp phải trùng từng byte (`cmp`). Nếu lệch, chạy lại cả cặp trước khi kết luận regression. Lệch lặp lại thì so `diff` để phân biệt hai trường hợp: upstream trôi giữa hai lần chạy (thấy ở cả hai bản khi chạy lại), hay code. Baseline gồm input của AC-4, AC-5 **và AC-6**. AC-1/AC-2 chạy bản cũ chỉ để xác nhận hiện trạng (neo `URL: https://suttacentral.net/?`), không so byte.

Một bước giải mã tạm, để in envelope và text của dòng `"id":2` (xóa cùng harness khi xong):

```sh
# In "items=<n> isError=<bool>" lên stderr, text lên stdout; exit 1 nếu không có đúng 1 dòng "id":2.
check() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const L=d.split("\n").filter(l=>l.includes("\"id\":2"));if(L.length!==1){console.error("BROKEN RUN",L.length);process.exit(1)}const r=JSON.parse(L[0]).result;console.error("items="+r.content.length+" isError="+(r.isError===true));process.stdout.write(r.content.map(c=>c.text).join("\n"))})'; }
```

#### Vehicle theo AC

| AC | Vehicle | Kết quả trên bản dựng thử (2026-10-17) |
|---|---|---|
| AC-1 | Harness, `get_sutta` và `get_sutta_meta` với `{"uid":"mn9999"}`; `cmp` hai text; `grep -c -E 'suttacentral.net\|\*\*\?\*\*\|URL:\|dịch giả\|Deep link:'` = 0 | Đạt: 1 item, không `isError`, text `Không tìm thấy sutta với UID: mn9999`, trùng byte với `get_sutta_meta`. Bản cũ: citation `**?**` + guard |
| AC-2 | Harness, 4 input | Đạt: `…: mn9999`, `…: MN10`, `…:  mn10` (hai dấu cách, kiểm bằng `od -c`), `…: dhp1`; 0 hit `suttacentral.net`/`dịch giả` |
| AC-3 | Đọc code: `return` của U1 đứng trước khối retry, nên trên đường đó số lời gọi fetch = 2 (`Promise.all`), 0 lời gọi `fetchBilaraText(uid, translator, retryLang)` | Đạt, theo cấu trúc. Không phụ thuộc `translations: []` |
| AC-4 | Baseline A/B + neo bảng trên; `grep -c -F 'Không tìm thấy sutta với UID'` = 0; `mn10/xyzzy` chứa `  • English — Bhikkhu Sujato (sujato)` | Đạt: 5/5 cặp trùng byte, đủ câu guard và `URL:` đúng `mn10`, `mn10`, `ma98`, `mn`, `dhp` |
| AC-5 | Baseline A/B + neo bảng trên; thêm neo `specs/segment-id-in-get-sutta/requirements.md` AC-1..AC-3 | Đạt: 3/3 cặp trùng byte; dòng thân 1 `[mn10:0.1] Middle Discourses 10` |
| AC-6 | Baseline A/B, điều kiện 3 | Đạt: cả hai bản `isError: true`, `SuttaCentral API error: 404`, trùng byte |
| AC-7 | `npm run build`; `git status`; diff U1 (§U1); bảng §Khối normative của spec tiền nhiệm; `git diff -U0 -- src/index.ts \| grep -c -E 'formatCitation\|formatUnavailable\|search_topic\|get_sutta_meta\|get_parallels\|list_divisions\|TOPIC_INDEX\|DIVISIONS\|z\.\|extracted\.source\|fetchSuttaplex\|fetchBilaraText\|Promise'` = 0; đọc code: `Promise.all` không đổi, không `fetch(` mới; bảng grep dưới | Đạt trên bản dựng thử |

Bảng grep bất biến. Đây là bộ lọc nhanh, không đủ một mình. Lưới thật là diff U1 và các diff awk ở trên.

| Lệnh | Trước (`249bb97`) | Sau (bản dựng thử) |
|---|---|---|
| `grep -c 'segmented' src/index.ts` | 3 | **3** |
| `grep -c -F 'sujato' src/index.ts` | 3 | **3** |
| `grep -c -E 'phantuananh\|sabbamitta\|minh_chau\|indacanda\|trush' src/index.ts` | 0 | **0** |
| `grep -c -F 'Không tìm thấy sutta với UID' src/index.ts` | 1 | **2** |
| `grep -c -F 'extracted.source !== "translation"' src/index.ts` | 1 | **1** |
| `grep -c 'translation_text' src/index.ts` | 1 | **1** |
| `grep -c 'fetch(' src/index.ts` | 3 | **3** |

Dọn dẹp khi xong: `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, `$BASE`, và mọi file output tạm (NFR-2).

## Alternatives Considered

### Alternative A: Cho `fetchSuttaplex()` ném lỗi hoặc trả `null` khi `uid` rỗng

- **Description:** Đưa kiểm vào helper fetch, như phân tích nguyên nhân trong issue gợi ý ("helper không ném vì `res.ok`").
- **Why not chosen:** `fetchSuttaplex()` dùng chung cho `search_topic`, `get_sutta` và `get_sutta_meta`. Nếu nó ném, `get_sutta_meta` chuyển từ text not-found sang `isError`, còn `search_topic` chuyển sang dòng `(không thể tải metadata)`. Cả hai đều trái NFR-5. Nếu nó trả `null` thì không đổi gì cho `get_sutta`, vì handler vẫn cần kiểm. Kiểm ở handler là cách duy nhất chỉ đổi `get_sutta`.

### Alternative B: Dùng body bilara `{"msg": "Not Found"}` làm tín hiệu (ở handler hoặc trong `fetchBilaraText()`)

- **Description:** Coi bilara trả `msg: "Not Found"` là UID không tồn tại.
- **Why not chosen:** Sai trên dữ liệu thật. `mn/sujato` và `dhp/sujato` cũng trả đúng body đó (đo lại 2026-10-17), trong khi hai UID nhánh này phải giữ guard từng byte (FR-5; `segment-id-in-get-sutta` FR-6). Khi đặt trong `fetchBilaraText()`, cách này còn sửa khối normative N3-A và buộc đồng bộ `specs/bilara-lang-param/design.md`. FR-1 cũng đòi kết luận "không phụ thuộc vào nội dung response bilara".

### Alternative C: Tuần tự hóa: fetch suttaplex, kiểm, rồi mới fetch bilara

- **Description:** Bỏ request bilara thừa trên đường not-found.
- **Why not chosen:** Thêm một round-trip cho mọi lời gọi UID hợp lệ, trái NFR-4. Đổi lại chỉ tiết kiệm một request trên đường lỗi của caller. Requirements đã giữ trần ≤ 2 cho đường đó (FR-4).

### Alternative D: Hàm hoặc hằng dùng chung cho câu not-found

- **Description:** Thêm `notFound(uid)` ở module scope, dùng ở cả `get_sutta_meta` và `get_sutta`, để câu thông báo chỉ có một nguồn.
- **Why not chosen:** Phải sửa `get_sutta_meta`, trái NFR-5. Nếu chỉ `get_sutta` dùng thì đó là trừu tượng cho một chỗ gọi. NFR-6 cho phép lặp literal (≤ 2 hit). Rủi ro hai câu trôi khác nhau được AC-1 chặn, vì AC-1 so byte giữa hai tool.

### Alternative E: Sửa `formatCitation()` để không in `?`

- **Description:** Fallback citation khi `uid` rỗng.
- **Why not chosen:** Không sửa được câu đổ lỗi cho dịch giả, vốn là nửa còn lại của bug. Hàm dùng chung cho 3 tool và được NFR-5 bảo vệ. Lỗi cùng dạng ở `search_topic` là follow-up riêng.

### Alternative F: Kiểm muộn hơn (sau `const citation`, sau retry, hoặc trong nhánh gate)

- **Description:** Đặt `if (!suttaplex?.uid)` ngay trước gate N1-B, hoặc bên trong nhánh `extracted.source !== "translation"`.
- **Why not chosen:** Đặt sau `const citation` sẽ tách dòng đó khỏi `let extracted`, làm fence N3-B của `bilara-lang-param` không còn khớp code liền mạch. Đặt sau retry thì FR-4 chỉ còn đúng nhờ upstream trả `translations: []`, không đúng theo cấu trúc. Đặt trong nhánh gate thì đụng vùng N1-B và vẫn tính `citation` vô ích. Đặt sớm là cách duy nhất để đường not-found không chạm thành phần nào của các đường khác.

### Alternative G: Trả `isError: true` cho not-found

- **Description:** Đánh dấu UID không tồn tại là lỗi tool.
- **Why not chosen:** FR-2 cấm. Nó cũng lệch khỏi convention "không tìm thấy → text thường" mà ba tool khác đang theo.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Upstream trả `uid: null` cho một UID hợp lệ và phục vụ được, nên `get_sutta` báo not-found sai | L | H | Requirements đã ghi UNVERIFIED và chấp nhận default: 9 UID không tồn tại đã đo (requirements + review), không phản ví dụ. Hành vi đồng nhất với `get_sutta_meta`. Không thêm cơ chế phòng hờ đọc bilara (§Alternative B) |
| Upstream đổi sang echo `uid` cho UID không tồn tại, nên bug quay lại dưới dạng guard | L | M | AC-1/AC-2 bắt ngay (text phải đúng bằng câu not-found). Fix lúc đó là spec mới |
| Lỗi mạng thoáng qua (`fetch failed`) bị lưu làm baseline hoặc bị đọc thành regression | **H** (đo: 8/44 lần chạy trong phiên này) | M | Luật hợp lệ 4 điều kiện, chạy tuần tự, chạy lại cả cặp (§Baseline A/B) |
| Upstream trôi giữa lúc chụp baseline và lúc verify (ví dụ thêm bản dịch vào `mn10`, làm đổi danh sách thay thế ở AC-4) | M | L | A/B liền nhau theo cặp, cùng phiên. Lệch thì chạy lại cả cặp |
| Implementer chèn khối sai chỗ (giữa `const citation` và `let extracted`) hoặc viết `suttaplex.uid` không có `?.` | L | M | Diff U1 kèm ngữ cảnh 14 dòng. Matcher awk N3-B một mình **không** bắt được lỗi vị trí, compiler không bắt được lỗi `?.` |
| Comment nêu tên `get_sutta_meta`, làm grep phạm vi diff của AC-7 cho hit giả | L | L | Comment trong U1 đã tránh tên đó, và diff U1 giữ nguyên chữ |
| Văn xuôi `specs/segment-id-in-get-sutta/design.md:194` nói UID sai chữ hoa "rơi vào guard" | M | L | Ghi nhận ở §Khối normative của spec tiền nhiệm. Kết luận của câu vẫn đúng. Giữ làm hồ sơ thời điểm |
