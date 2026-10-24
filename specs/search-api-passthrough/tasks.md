# Tasks: `search_topic` là wrapper mỏng của `GET /api/search/instant`

**Status:** Complete
**Created:** 2026-10-24
**Spec slug:** search-api-passthrough
**Design:** [design.md](./design.md)
**Requirements:** [requirements.md](./requirements.md)
**Review đã kế thừa:** [reviews/design-review-2.md](./reviews/design-review-2.md) (Approve, 0 Critical, 0 Warning, 3 Suggestion). S1, S2, S3 được gộp vào quy tắc của task, không sửa `design.md`. Xem §Notes.

## Conventions

- Task ID theo mẫu `T-<phase>-<n>`. Mỗi task là một thay đổi logic, kiểm được độc lập. Verify là task riêng, không nhét vào task implement.
- **Đọc tối thiểu để implement:** `design.md:53-62`. Số dòng ở đây là số dòng của `design.md` (Status Reviewed, không sửa nữa). Khối có dòng neo `<!-- block: TÊN -->`: M1 (`design.md:158-327`), I1 (`:340-343`), H1 (`:347-408`), T1 (`:457-690`), F1 (`:737-742`), F2 (`:744-760`), F3 (`:762-786`), F4 (`:788-830`), R-1 (`:859-862`), R-2 (`:866-875`), M-1 (`:881-905`), M-2 (`:909-914`), M-3 (`:918-923`), M-4 (`:927-932`), M-5 (`:936-939`), A-1 (`:943-952`), A-2 (`:956-959`), V2 (`:1032-1072`), V3 (`:1094-1124`), V4 (`:1126-1134`), V1 (`:1158-1174`). §Lắp ráp ở `:418-435`, §Fixture ở `:692-735`, §Thứ tự áp dụng ở `:961-975`, luật hợp lệ của harness ở `:1022-1030`, bảng vehicle theo AC ở `:1176-1199`, lệnh tái dựng tài liệu ở `:1201-1217`, bảng grep bất biến ở `:1219-1231`.
- **Khối [NORMATIVE] là chép nguyên văn bằng máy, không phải minh họa.** Các task dưới đây cố ý không chép lại code hay văn bản của khối nào. Chép bằng `blk TÊN > đích`, hoặc bằng pipeline tái dựng nêu trong task. Không gõ tay, không chép từ file này, không diễn đạt lại, không format lại. Write/Edit của công cụ soạn có thể giải mã escape hay chuẩn hóa văn bản, nên **không dùng Write/Edit để đặt nội dung khối vào file đích**. Lưới thật là `diff` (`ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `CITATION-OK`, `README-OK`, `MASTER-OK`, `AGENTS-OK`). Grep chỉ là bộ tiền lọc, pass grep không có nghĩa là đúng.
- **Nhóm commit G1 = T-1-1, T-1-2, T-1-3 (một commit, `design.md:975`, `:1274`).** `src/search.ts` mới (M1) bỏ các hàm mà `test/search.test.ts` cũ import, và fixture cũ không còn được dùng. Vì vậy:
  - `npm run build` phải thoát 0 sau **mỗi** task code, kể cả T-1-1 (`tsconfig.json` chỉ `include` `src/`). Build đỏ ở bất kỳ điểm nào là fail.
  - `npm test` **đỏ là trạng thái chờ** sau T-1-1 và T-1-2, và **không** là tiêu chí của hai task đó. Từ T-1-3 trở đi, `npm test` phải thoát 0.
  - Không commit giữa T-1-1 và T-1-3.
- **Mốc so sánh cố định:** mọi lệnh so với `d972fa6` (code, tài liệu, fixture cũ, baseline A/B), không so với HEAD hay `master`. Vì vậy kết quả giống nhau trước và sau commit.
- **Cấm sửa số hay literal đã pin trong spec artifact để mệnh đề pass.** Áp cho mọi task và mọi artifact: `requirements.md`, `design.md`, các khối, bảng §Fixture, literal trong T1, số đếm grep, số dòng. Số đo lệch trên một lần chạy hợp lệ thì **halt và báo cáo** kèm số đo mới có ngày. Sửa design là việc của orchestrator qua một lần sửa design (`design.md:714`), không phải của implementer. Chỉ mục SC trôi và regression có cùng triệu chứng; không cái nào biện minh cho một lần sửa spec trong task.
- **Luật hợp lệ và chạy lại (NFR-6, `design.md:1026-1028`). Áp cho mọi lần chạy live: harness V2, A/B V3, ghi fixture F2, `curl` của AC-4.**
  - Lần chạy **không hợp lệ** chỉ khi lỗi nằm ở đường truyền: `fetch failed` (V2 thoát 3), timeout, HTTP 000 hay `curl` thoát khác 0, không có frame `"id":2` hoặc có nhiều hơn một (V2 thoát 2). V3 in `INVALID-PAIR`; F2 in `INVALID <tên> <mã> (curl <rc>)` với `<mã>` khác rỗng.
  - **Chỉ lần chạy không hợp lệ được chạy lại**, tối đa **3 lần chạy cho mỗi input** (lần đầu và 2 lần chạy lại), đúng như V3 (design-review-2 S2). Mọi lần chạy live **tuần tự**, không song song, không chạy nền. Ghi số lần chạy lại vào Result.
  - Mọi kết quả khác là lần chạy **hợp lệ**, kể cả text bắt đầu bằng `SuttaCentral API error:`, text rỗng, result có `isError`, kết quả rỗng hay khác dự kiến, `UNEXPECTED` của F2, `MISMATCH` của V3. Lần chạy hợp lệ được so với AC. **Lệch thì halt và báo cáo, không chạy lại** để tìm lần trùng. Trước khi báo, `curl -sS -G` lại đúng URL của dòng nguồn, pipe thẳng vào `node` chỉ in số đếm (`total`, số phần tử), để phân biệt chỉ mục SC trôi với regression.
  - **Quá trần là "inconclusive (network)"**: không phải pass, và chưa kết luận về code (design-review-2 S3). Implementer dừng, báo kèm stderr. Trước khi báo, `curl -sS -G -o /dev/null -w '%{http_code}\n'` tới cùng endpoint. Nếu `curl` trả 200 trong khi tool fail 3 lần, ghi "nghi lỗi code" vào báo cáo. **Orchestrator quyết định** chạy lại sau hay dừng. Implementer không tự chạy lại sau trần.
  - F2 in `INVALID <tên>  (curl <rc>)` với `<mã>` rỗng nghĩa là `buildSearchUrl()` không dựng được URL. Đó không phải lỗi truyền tải: halt như `UNEXPECTED`, không ghi lại (design-review-2 S1).
- **Response thô của SuttaCentral không được ghi ra ngoài `test/fixtures/`**, và `test/fixtures/` chỉ chứa fixture đã cắt (đầu ra của F3).
  - Lệnh kiểm của task giữ result trong biến shell và pipe, không ghi file.
  - Ngoại lệ duy nhất là hai script normative tự ghi file: F2 (body thô vào `$W/raw`) và V3 (output vào `$AB/work`). Hai thư mục này là `mktemp -d` dưới `/tmp/sap-*`. Chính task tạo ra chúng phải xóa chúng trước khi kết thúc, kể cả khi halt.
  - Không chép body, text của tool hay diff output vào `$E`, Result hay báo cáo. Chỉ ghi số đếm, mã thoát, dòng `*-OK`/`PASS`/`MATCH`, sha256 và byte.
- **Lệnh kiểm nằm trong fenced code block.** Alternation viết `|` trơn trong `grep -E`. **Cấm** chép `\|` từ ô bảng của `design.md:1180-1229`: `grep -E` đọc `\|` thành ký tự `|` literal.
- **Chạy mọi khối lệnh bằng `bash`** (`bash -s <<'SH'` … `SH`), không qua zsh. Shell state không giữ giữa các lần gọi, nên mỗi lần gọi bắt đầu bằng **khối khởi đầu**:

  ```sh
  REPO=/Users/khoinb/worktrees/sutta-mcp/main; cd "$REPO" || exit 1
  eval "$(sed -n '423,424p' "$REPO/specs/search-api-passthrough/design.md")"   # REPO, D, blk() nguyên văn từ §Lắp ráp
  E="$REPO/.claude/spec-evidence/search-api-passthrough"; mkdir -p "$E"        # bằng chứng, gitignored (.claude/)
  track() { printf '%s\n' "$1" >> "$E/tmp-dirs.txt"; }                         # ghi mọi đường dẫn mktemp để T-3-3 kiểm
  # call <thư mục build> <tool | tools/list> <arguments JSON>: chạy V2 ($CALL, log stderr vào $H). Chỉ chạy lại
  # khi V2 thoát 2 hoặc 3 (lần chạy không hợp lệ), tối đa 3 lần chạy. In result ra stdout; thoát 3 = inconclusive.
  call() { n=1; while :; do res=$(node "$CALL" "$@" 2>>"$H/stderr.log"); rc=$?
    [ $rc -eq 0 ] && { printf '%s' "$res"; return 0; }
    echo "INVALID try=$n rc=$rc $2 $3" >&2
    [ $rc -eq 2 ] || [ $rc -eq 3 ] || { echo "UNEXPECTED rc=$rc $2 $3" >&2; return 1; }
    n=$((n+1)); [ $n -le 3 ] || { echo "INCONCLUSIVE (network) $2 $3" >&2; return 3; }; done; }
  # chk <nhãn> <mảng JS>: r = result (từ biến $r), t = content[0].text, b = t tách theo "\n\n",
  # src = URL của dòng nguồn. In "<nhãn> PASS", "<nhãn> FAIL <chỉ số mệnh đề sai>" hoặc "<nhãn> FAIL exception: …".
  chk() { R="$r" node -e '
  const r=JSON.parse(process.env.R); const t=r?.content?.[0]?.text ?? ""; const b=t.split("\n\n");
  const src=t.split("\n")[0].replace(/^Nguồn: SuttaCentral — /,"");
  let c; try { c=eval(process.argv[1]); } catch (e) { console.log(process.argv[2]+" FAIL exception: "+e.message); process.exit(1); }
  const bad=c.map((x,i)=>x===true?null:i).filter(x=>x!==null);
  console.log(process.argv[2]+(bad.length?" FAIL "+bad.join(","):" PASS")); process.exit(bad.length?1:0)' "$2" "$1"; }
  # fxcheck: 3 fixture so với bảng §Fixture (design.md:706-712). In FIXTURES-OK.
  fxcheck() { node -e '
  const fs=require("fs"); const P="https://suttacentral.net/api/search/instant?";
  const W={"anatta-en.json":["query=anatta&language=en",145,6,10,4591],
    "foo-bar-en.json":["query=foo%3Abar&language=en",0,0,0,580],
    "vo-nga-vi-pli.json":["query=v%C3%B4+ng%C3%A3&language=vi&selectedLanguages=%5B%22vi%22%2C%22pli%22%5D",185,21,10,10052]};
  const files=fs.readdirSync("test/fixtures").sort(); let bad=0, bytes=0;
  if(JSON.stringify(files)!==JSON.stringify(Object.keys(W).sort())){bad++;console.log("FILESET-MISMATCH",files.join(" "))}
  const L={};
  for(const [n,w] of Object.entries(W)){ if(!files.includes(n)) continue;
    const raw=fs.readFileSync("test/fixtures/"+n,"utf8"); const f=JSON.parse(raw); const b=f.body; L[n]=b; bytes+=Buffer.byteLength(raw);
    const got=[f.url.startsWith(P)?f.url.slice(P.length):"BAD "+f.url,b.total,b.suttaplex.length,b.hits.length,Buffer.byteLength(raw)];
    const ok=JSON.stringify(got)===JSON.stringify(w)&&/^\d{4}-\d{2}-\d{2}$/.test(f.recorded)
      &&JSON.stringify(Object.keys(f))===JSON.stringify(["url","recorded","params","body"])
      &&Array.isArray(b.fuzzy_dictionary)&&b.fuzzy_dictionary.length===0;
    if(!ok)bad++; console.log(ok?"OK":"MISMATCH",n,f.recorded,JSON.stringify(got)); }
  const a=L["anatta-en.json"], fb=L["foo-bar-en.json"], v=L["vo-nga-vi-pli.json"];
  const items=a&&fb&&v?[
    ["anatta suttaplex", a.suttaplex.map(e=>e.uid).join(" ")==="an6.100 sn22.14 sn22.143 sn22.68 sn23.17 sn46.73"],
    ["anatta hits", a.hits.map(e=>e.uid??e.url).join(" ")==="/define/anatta general-guide-sujato sn-guide-sujato subjects terminology thi-ap4 an3.136 an7.18 an7.20 an10.60"],
    ["anatta articles", a.hits.slice(1,5).every(e=>e.is_article===true&&e.lang==="en")],
    ["foo:bar error", fb.error?.type==="unknown_filter"&&fb.error?.message==="Unknown filter: \"foo:\""&&fb.error?.suggestions?.length===3],
    ["vo-nga suttaplex[12]", v.suttaplex[12]?.uid==="sn22.59"&&v.suttaplex[12]?.translated_title==="Năm Vị (Vô ngã tưởng)"&&v.suttaplex[12]?.difficulty===null],
    ["vo-nga hits", v.hits[0]?.url==="/an1.378-393/vi/minh_chau"&&v.hits.every(h=>h.lang==="vi"&&h.author_uid==="minh_chau")],
    ["total bytes", bytes===15223]]:[];
  for(const [k,ok] of items){ if(!ok)bad++; console.log(ok?"OK":"MISMATCH",k,k==="total bytes"?bytes:""); }
  console.log(bad===0?"FIXTURES-OK":"FIXTURES-FAIL "+bad); process.exit(bad?1:0)'; }
  ```

  Bằng chứng ghi vào `$E/<task-id>.log`: lệnh đã chạy, exit code, dòng `*-OK`/`PASS`, số đếm, sha256 file đích, số lần chạy lại, đường dẫn tạm. `$E` nằm dưới `.claude/`, bị ignore, không vào commit.
- **Timeout:** một lần gọi Bash tối đa 600000 ms. V2 chờ frame tối đa 90 s mỗi lần chạy. T-2-5 và T-2-6 mỗi task chạy trong **một** lần gọi Bash. Nếu lần gọi đó hết giờ mà chưa có kết quả, coi là inconclusive (network) theo luật trên.
- Build command: `npm run build` (tsc strict). Test command: `npm test` (đỏ trong G1, phải xanh từ T-1-3). Không có linter.

## Phase 1: Code, fixture và test (nhóm commit G1)

- [x] **T-1-1:** Thay `src/search.ts` bằng khối M1, lắp `src/index.ts` từ `d972fa6` với I1 và H1 (**nguyên văn**)
  - **Files:** `src/search.ts`, `src/index.ts`
  - **Acceptance:**
    - Guard trước khi sửa, lệch thì halt:
      - `src/`, `test/`, `package.json`, `package-lock.json`, `tsconfig.json` trùng `d972fa6`.
      - Không có file untracked trong `src/` hay `test/`.
      - `node_modules/.bin/tsx` và `node_modules/.bin/tsc` tồn tại.
      - `shasum -a 256 AGENTS.md` = `efea3016c0d6ebc2b89af3adba0061e49e1fa1dbb9823438508dfb8f65937f08` (pin `context:agents`, `design.md:963`).
    - Ghi chỉ bằng shell. `src/search.ts` = `blk M1`. `src/index.ts` = `d972fa6:1-4` + `blk I1` + `d972fa6:6-32` + `d972fa6:41-106` + `blk H1` + `d972fa6:148-$`, đúng dải của `design.md:426`. Bị bỏ: dòng import cũ `:5`, `fetchSearch()` và dòng trống sau nó (`:33-40`), khối Tool 1 cũ (`:107-147`).
    - Lệnh §Lắp ráp in `ASSEMBLY-OK`, `SEARCH-OK`, `CITATION-OK`. `wc -l`: `src/index.ts` 446, `src/search.ts` 167.
    - Drift cấm, vì compile sạch hoặc lọt grep (`design.md:1268`):
      - thêm `trim`/`normalize` vào `query`;
      - set mặc định cho tham số API (`limit=10`, `language=en`);
      - đổi thứ tự `q.set`;
      - đổi `!== undefined` thành kiểm truthy (làm mất `limit: 0`);
      - thêm `.default()` cho tham số API, hay thêm `try`/`catch`;
      - giữ lại `fetchSearch()`, hay bọc `fetch(url)` trong helper;
      - nối chuỗi hay `new URL` quanh `url` trong handler;
      - tách dòng I1 thành nhiều dòng hay đổi thứ tự tên;
      - sửa thân `formatCitation()`.
    - `npm run build` thoát 0. `npm test` **không** là tiêu chí (G1, đỏ là chờ).
    - Lệnh ghi:

      ```sh
      # khối khởi đầu, rồi:
      git diff --quiet d972fa6 -- src test package.json package-lock.json tsconfig.json || { echo "STOP: đã khác d972fa6"; exit 1; }
      test -z "$(git ls-files --others --exclude-standard -- src test)" || { echo "STOP: file untracked trong src/ hoặc test/"; exit 1; }
      test -x node_modules/.bin/tsx && test -x node_modules/.bin/tsc || { echo "STOP: thiếu node_modules"; exit 1; }
      [ "$(shasum -a 256 AGENTS.md | cut -d' ' -f1)" = efea3016c0d6ebc2b89af3adba0061e49e1fa1dbb9823438508dfb8f65937f08 ] || { echo "STOP: AGENTS.md drift"; exit 1; }
      T=$(mktemp -d /tmp/sap-T11.XXXXXX); track "$T"
      git show d972fa6:src/index.ts > "$T/old-index.ts"; OLD="$T/old-index.ts"
      blk M1 > src/search.ts
      { sed -n '1,4p' "$OLD"; blk I1; sed -n '6,32p' "$OLD"; sed -n '41,106p' "$OLD"; blk H1; sed -n '148,$p' "$OLD"; } > src/index.ts
      rm -rf "$T"
      ```

  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    sed -n '423,428p;430,432p' "$D" | bash                                        # ASSEMBLY-OK, SEARCH-OK, CITATION-OK
    wc -l < src/index.ts; wc -l < src/search.ts                                   # 446 ; 167
    npm run build; echo "build exit=$?"                                           # 0
    shasum -a 256 src/index.ts src/search.ts
    ```

    Ghi vào `$E/T-1-1.log`. Không in `*-OK` thì xem `diff` và ghi lại bằng lệnh trên. Không sửa `design.md`.
  - **Depends on:** —
  - **Result:** 2026-10-24. Bằng chứng: `$E/T-1-1.log`.
    - Lệnh ghi (bash, khối khởi đầu): 4 guard pass (`git diff --quiet d972fa6` thoát 0, không có file untracked, có `tsx`/`tsc`, sha256 `AGENTS.md` khớp pin); `blk M1 > src/search.ts` thoát 0; lắp `src/index.ts` theo dải `1-4 + I1 + 6-32 + 41-106 + H1 + 148-$` thoát 0. Thư mục tạm `/tmp/sap-T11.KQFypN` đã ghi vào `tmp-dirs.txt` và đã xóa.
    - Test: `sed -n '423,428p;430,432p' "$D" | bash` thoát 0, in `ASSEMBLY-OK`, `SEARCH-OK`, `CITATION-OK`.
    - `wc -l`: `src/index.ts` 446, `src/search.ts` 167.
    - `npm run build` thoát 0. Chưa chạy `npm test` (không là tiêu chí, G1).
    - sha256: `src/index.ts` `7a76dc3612e63538baba2e8974e4594df5117f5cc41082c6bd2a149a8a5f45f4`, `src/search.ts` `e94568f7f674ddf231e02fc704c12faed1e868747418b8e28e761a066e9a52e9`.
    - Không có chỗ lệch. Không chạy live, không có lần chạy lại.

- [x] **T-1-2:** Ghi live 3 fixture (F1, F2), xóa 9 fixture cũ, cắt (F3), kiểm thô so với đã cắt (F4), đối chiếu bảng §Fixture
  - **Files:**
    - 3 file mới: `test/fixtures/anatta-en.json`, `test/fixtures/foo-bar-en.json`, `test/fixtures/vo-nga-vi-pli.json`.
    - 9 file xóa: `anatta-en-0.json`, `foo-bar-en-0.json`, `metta-en-0.json`, `mindfulness-en-0.json`, `mindfulness-en-1450.json`, `mindfulness-en-1460.json`, `nibbana-en-0.json`, `vo-nga-tuong-vi-0.json`, `xyzzyqq-en-0.json`.
    - Ngoài repo: `$W` dưới `/tmp/sap-fx.*`.
  - **Acceptance:**
    - Theo đúng quy trình `design.md:716-728`. Script F1..F4 lấy bằng `blk` và đặt trong `$W/bin`. Body thô nằm trong `$W/raw`, thư mục khác với script. Không có script ghi fixture nào trong repo, và không có script tải hàng loạt (NFR-4).
    - Guard: `src/search.ts` in `SEARCH-OK`, vì F2 và F4 import nó. Ba fixture mới chưa tồn tại.
    - Kiểm trước khi ghi (design-review-2 S1): `buildSearchUrl()` dựng được URL cho cả 3 dòng F1, và in 3 URL khác rỗng.
    - Ghi:
      - Mỗi tên phải có dòng `OK <tên> 200`.
      - Tên có dòng `INVALID <tên> <mã> (curl …)` với `<mã>` khác rỗng là lần chạy không hợp lệ. Ghi lại riêng tên đó, bằng một file danh sách chỉ chứa dòng F1 của nó. Tối đa 3 lần chạy cho mỗi tên. Quá trần thì báo inconclusive (network) và orchestrator quyết định.
      - Dòng `UNEXPECTED`, hoặc dòng `INVALID` có `<mã>` rỗng: halt và báo, không ghi lại.
      - Khi halt: không xóa fixture cũ, xóa `$W`.
    - Chỉ khi cả 3 tên đều `OK`: xóa 9 fixture cũ, rồi cắt bằng F3 với ngày `$(date +%F)`. Fixture là đầu ra của F3, không sửa tay.
    - F4 in **đúng** `EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch` và thoát 0. **Dòng này, kèm ngày chạy, được chép vào Result của task này** (NFR-4, `design.md:724`; T-2-2 kiểm điều này).
    - `fxcheck` in `FIXTURES-OK`. Nếu thấy `FIXTURES-FAIL`, `FILESET-MISMATCH`, `EQUIV-OK` với số khác 21, hay `EQUIV-FAIL` trên lần ghi hợp lệ: đó là chỉ mục SC trôi hoặc lỗi, **không phải lần chạy không hợp lệ** (`design.md:714`).
      - Không ghi lại để tìm lần trùng.
      - Giữ nguyên `test/fixtures/` như đã ghi, ghi số đo mới có ngày vào Result, xóa `$W`, rồi **halt và báo cáo**.
      - Không sửa bảng §Fixture, T1 hay `fxcheck`.
    - `$W` bị xóa khi xong, kể cả khi halt. Body thô không vào repo, `$E` hay Result.
    - `npm test` **không** là tiêu chí (G1).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi (chạy từ gốc repo):
    sed -n '423,424p;428p' "$D" | bash                                            # SEARCH-OK
    ls test/fixtures/anatta-en.json test/fixtures/foo-bar-en.json test/fixtures/vo-nga-vi-pli.json 2>/dev/null && { echo "STOP: fixture mới đã có"; exit 1; }
    W=$(mktemp -d /tmp/sap-fx.XXXXXX); mkdir "$W/raw" "$W/bin"; track "$W"
    blk F1 > "$W/bin/fixtures.list"; blk F2 > "$W/bin/record.sh"; chmod +x "$W/bin/record.sh"
    blk F3 > "$W/bin/trim.mjs"; blk F4 > "$W/bin/equiv.mts"
    node --import tsx -e 'const fs=require("fs");import(require("node:url").pathToFileURL(process.argv[1]).href).then(m=>{for(const row of fs.readFileSync(process.argv[2],"utf8").trim().split("\n")){const i=row.indexOf("|");const u=m.buildSearchUrl(JSON.parse(row.slice(i+1)));if(!u)process.exitCode=1;console.log(row.slice(0,i),u)}})' "$PWD/src/search.ts" "$W/bin/fixtures.list"; echo "url exit=$?"   # 3 URL, 0
    "$W/bin/record.sh" "$PWD/src/search.ts" "$W/bin/fixtures.list" "$W/raw"      # 3 dòng OK <tên> 200
    # Có dòng INVALID <tên> <mã khác rỗng>: grep -E "^<tên>\|" "$W/bin/fixtures.list" > "$W/bin/retry.list"; chạy lại record.sh với retry.list (tối đa 3 lần chạy mỗi tên)
    # Có UNEXPECTED hoặc INVALID mã rỗng: rm -rf "$W"; halt.
    rm test/fixtures/*-0.json test/fixtures/mindfulness-en-14[56]0.json && node "$W/bin/trim.mjs" "$W/raw" test/fixtures "$(date +%F)" "$W/bin/fixtures.list"; echo "trim exit=$?"   # 0
    node --import tsx "$W/bin/equiv.mts" "$PWD/src/search.ts" "$W/raw" "$PWD/test/fixtures" "$W/bin/fixtures.list"; echo "equiv exit=$?"
                                                                                  # EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch ; 0
    fxcheck; echo "fxcheck exit=$?"                                               # FIXTURES-OK ; 0
    date +%F
    rm -rf "$W"; ls "$W" 2>&1                                                     # No such file or directory
    ls test/fixtures                                                              # anatta-en.json foo-bar-en.json vo-nga-vi-pli.json
    shasum -a 256 test/fixtures/*
    ```

    Ghi vào `$E/T-1-2.log`: các dòng `OK`/`INVALID`/`UNEXPECTED` của F2 (mọi lần), dòng `EQUIV-…`, output của `fxcheck`, sha256 từng fixture, ngày ghi.
  - **Depends on:** T-1-1
  - **Result:** 2026-10-24. Bằng chứng: `$E/T-1-2.log`.
    - Guard: `SEARCH-OK`; ba fixture mới chưa tồn tại. Script F1..F4 lấy bằng `blk` vào `$W/bin`, body thô ở `$W/raw`; `$W` = `/tmp/sap-fx.PFiUAV` (đã ghi vào `tmp-dirs.txt`, đã xóa, `ls` báo No such file or directory).
    - Kiểm URL trước khi ghi: `buildSearchUrl()` in 3 URL khác rỗng, `url exit=0`.
    - F2, lần chạy 1 (duy nhất): `OK anatta-en 200`, `OK foo-bar-en 200`, `OK vo-nga-vi-pli 200`. Không có dòng `INVALID`/`UNEXPECTED`; 0 lần chạy lại.
    - Body thô (chỉ trong `$W`): 38333, 309, 128843 byte. Đã xóa 9 fixture cũ; F3 với ngày `2026-10-24`, `trim exit=0`.
    - F4 (2026-10-24): `EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch`, `equiv exit=0`.
    - `fxcheck` (2026-10-24): 3 dòng `OK <file> 2026-10-24 …` khớp bảng §Fixture, 7 mục `OK` (tổng 15223 byte), `FIXTURES-OK`, thoát 0. `grep -l -E '"(highlight|translations)"' test/fixtures/*` rỗng.
    - sha256: `anatta-en.json` `ed296b0b33cdd41158995b2fe11874ff4ca1d3237ffe4a45e7576ce2c30905d9` (4591 B), `foo-bar-en.json` `6e210c945a77dd7fa047f0e21d3d983c1568ba5b3d91ba17fd8d10151c69b019` (580 B), `vo-nga-vi-pli.json` `6e4b64b7fbd7abdd5cc5616cee7d027da0137ee544a4a9772713d8e8682714d0` (10052 B).
    - Không có chỗ lệch. Chưa chạy `npm test` (không là tiêu chí, G1).

- [x] **T-1-3:** Thay `test/search.test.ts` bằng khối T1 (**nguyên văn**); `npm test` xanh
  - **Files:** `test/search.test.ts`
  - **Acceptance:**
    - Ghi chỉ bằng `blk T1 > test/search.test.ts` qua bash, không dùng Write/Edit.
    - Lệnh §Lắp ráp in `TEST-OK`. File có đúng 11 dòng bắt đầu bằng `test(` và 231 dòng.
    - File ở dạng NFC. Case NFD của FR-3 dựng chuỗi bằng `.normalize("NFD")` (`design.md:447`). Nếu công cụ nào chuẩn hóa hay giải mã văn bản thì `TEST-OK` hỏng; khi đó chép lại bằng `blk`.
    - Không có chuỗi `fetch` hay `src/index` trong file (FR-17).
    - `npm test` thoát 0, TAP có `# tests 11`, `# pass 11`, `# fail 0`. Đây là điểm kết thúc của G1.
    - Một case fail trên fixture đã đạt `FIXTURES-OK` là mismatch hợp lệ: halt và báo cáo. Không sửa T1, fixture hay M1.
    - Không thêm `tsconfig` hay bước type-check cho `test/`, không đổi `package.json` (NFR-1).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    blk T1 > test/search.test.ts
    sed -n '423,424p;429p' "$D" | bash                                            # TEST-OK
    grep -c '^test(' test/search.test.ts; wc -l < test/search.test.ts             # 11 ; 231
    node -e 'const s=require("fs").readFileSync("test/search.test.ts","utf8");console.log(s===s.normalize("NFC")?"NFC-OK":"NOT-NFC")'   # NFC-OK
    grep -c -E 'fetch|src/index' test/search.test.ts                              # 0
    npm test 2>&1 | grep -E '^# (tests|pass|fail) |^not ok'; echo "npm test exit=${PIPESTATUS[0]}"   # 11, 11, 0 ; 0
    git diff --quiet d972fa6 -- package.json package-lock.json tsconfig.json; echo "manifest exit=$?"   # 0
    shasum -a 256 test/search.test.ts
    ```

    Ghi vào `$E/T-1-3.log`. Sau task này, G1 (T-1-1..T-1-3) là một commit nếu người dùng yêu cầu commit.
  - **Depends on:** T-1-2
  - **Result:** 2026-10-24. Bằng chứng: `$E/T-1-3.log`.
    - Mốc trước khi ghi: `git diff --quiet d972fa6 -- test/search.test.ts` thoát 0. Ghi bằng `blk T1 > test/search.test.ts` (bash), thoát 0.
    - `sed -n '423,424p;429p' "$D" | bash` in `TEST-OK`, thoát 0.
    - `grep -c '^test('` = 11; `wc -l` = 231. `NFC-OK`. `grep -c -E 'fetch|src/index'` = 0.
    - `npm test` thoát 0: `# tests 11`, `# pass 11`, `# fail 0`, không có dòng `not ok`.
    - `git diff --quiet d972fa6 -- package.json package-lock.json tsconfig.json` thoát 0.
    - sha256 `test/search.test.ts` `bd5bfdb282c8d6a332c68d7c7a546c133e34412cc1d80e85b8c008a89fea8a4f`.
    - Không có chỗ lệch. Không chạy live, không có lần chạy lại, không có thư mục tạm. G1 (T-1-1..T-1-3) xong, chưa commit.

## Phase 2: Verification (không sửa file được track)

- [x] **T-2-1:** Build sạch, lắp ráp toàn bộ, phạm vi diff, bất biến grep, đọc code handler (AC-8 phần đọc code, AC-10, AC-14)
  - **Files:** — (chỉ kiểm; ghi `$E/T-2-1.log`)
  - **Acceptance:**
    - NFR-2: `rm -rf dist && npm run build` thoát 0. `find dist -type f | sort` cho đúng `dist/index.js`, `dist/search.js`.
    - §Lắp ráp đầy đủ (`design.md:423-432`) in đủ bốn dòng `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `CITATION-OK`. Đây là lưới khóa vùng được bảo vệ (`design.md:73-77`): bốn tool khác và các khối normative của spec tiền nhiệm không bị đụng ở mức code.
    - FR-4 và NFR-5 (bảng `design.md:1221-1229`). Lệch số thì halt và báo cáo.
      - Trên `src/index.ts`: `segmented` 3, `sujato` 3, tên translator 0, `fetch(` 4, grep dựng URL 0, `wc -l` 446.
      - Trên `src/search.ts`: 0 cho cả bốn grep NFR-5, `wc -l` 167.
      - Grep FR-4 trên `cat src/*.ts`: 0.
    - FR-15: `grep -c -E '^(let|var|const) ' src/search.ts` = 0. Số dòng `^(let|var|const) ` của `src/index.ts` bằng của `d972fa6` (4). Không có biến module-scope mới.
    - AC-14, đọc code FR-2a: trong `src/index.ts` có đúng một `buildSearchUrl(`, gán vào `const url`. Lời gọi `fetch` search viết trần `fetch(url)`. `renderSearch(url, …)` dùng cùng biến đó. Ba dòng này theo đúng thứ tự trên. Không có nối chuỗi, template literal hay `new URL` quanh `url`. Ghi số dòng của ba dòng vào Result.
    - AC-8, đọc code: trong khối Tool 1 của `src/index.ts`, `.default(` xuất hiện đúng 1 lần (ở `format`) và `.optional()` 6 lần (sáu tham số API ngoài `query`).
    - AC-10: dòng `if (!res.ok) throw new Error(\`SuttaCentral API error: ${res.status}\`);` có trong handler, đứng trước `renderSearch`, chung cho cả hai format. Handler không có `try`, `catch` hay retry.
    - AC-14 và NFR-3, phạm vi:
      - Mọi đường dẫn đổi hay mới so với `d972fa6` (đã commit hay chưa) đều thuộc NFR-3.
      - Diff `package.json`, `package-lock.json`, `tsconfig.json` so với `d972fa6` rỗng.
      - Không có file mới trong `src/` hay ở gốc repo.
      - Ở thời điểm này, `README.md`, `AGENTS.md` và master spec chưa đổi.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    rm -rf dist && npm run build; echo "build exit=$?"                            # 0
    find dist -type f | sort                                                      # dist/index.js, dist/search.js
    sed -n '423,432p' "$D" | bash                                                 # ASSEMBLY-OK SEARCH-OK TEST-OK CITATION-OK
    for f in src/index.ts src/search.ts; do
      echo "== $f"
      grep -c 'segmented' "$f"                                                    # 3 | 0
      grep -c -F 'sujato' "$f"                                                    # 3 | 0
      grep -c -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' "$f"          # 0 | 0
      grep -c 'fetch(' "$f"                                                       # 4 | 0
      wc -l < "$f"                                                                # 446 | 167
    done
    grep -c -E 'URLSearchParams|searchParams|new URL\(|SC_BASE\}/search' src/index.ts   # 0
    cat src/*.ts | grep -c -E 'VI_TOPIC_TERMS|SEARCH_PAGE_SIZE|resolveTopic|searchOffset|selectPage|hasMore|isSutta|takeNew|formatNoResults|Còn kết quả|Hết kết quả'   # 0
    grep -c -E '^(let|var|const) ' src/search.ts                                  # 0
    grep -c -E '^(let|var|const) ' src/index.ts; git show d972fa6:src/index.ts | grep -c -E '^(let|var|const) '   # 4 ; 4
    grep -c 'buildSearchUrl(' src/index.ts                                        # 1
    awk '/^\/\/ Tool 1: search_topic/{f=1} f&&/const url = buildSearchUrl\(params\);/{s=s"U";print NR": "$0} f&&/await fetch\(url\);/{s=s"F";print NR": "$0} f&&/renderSearch\(url, /{s=s"R";print NR": "$0} f&&/fetch\(/{n++} f&&/^\);$/{print (s=="UFR"&&n==1)?"FR2A-ORDER-OK":"FR2A-ORDER-FAIL "s" fetch="n;exit}' src/index.ts
                                                                                  # chỉ khối Tool 1: 3 dòng buildSearchUrl, fetch(url), renderSearch theo thứ tự, rồi FR2A-ORDER-OK
    TOOL1=$(awk '/^\/\/ Tool 1: search_topic/,/^\);$/' src/index.ts)
    printf '%s\n' "$TOOL1" | grep -c '\.default('                                 # 1
    printf '%s\n' "$TOOL1" | grep -c '\.optional()'                               # 6
    printf '%s\n' "$TOOL1" | grep -c -F 'if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);'   # 1
    printf '%s\n' "$TOOL1" | grep -c -E '\btry\b|catch|retry'                     # 0
    { git diff --name-only d972fa6; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|test/search\.test\.ts|test/fixtures/.+|README\.md|AGENTS\.md|specs/sutta-mcp-requirements\.md|specs/search-api-passthrough/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    git diff --stat d972fa6
    git diff d972fa6 -- package.json package-lock.json tsconfig.json | wc -c      # 0
    git diff --quiet d972fa6 -- README.md AGENTS.md specs/sutta-mcp-requirements.md; echo "docs exit=$?"   # 0
    ```

    `specs/INDEX.md` có trong allowlist vì orchestrator quản lý nó. Nếu nó xuất hiện, ghi rõ vào Result. Ghi vào `$E/T-2-1.log`.
  - **Depends on:** T-1-3
  - **Result:** PASS (2026-10-24, lần chạy 2, HEAD `d972fa6` + working tree; bằng chứng `$E/T-2-1.log`). Lần chạy 1 halt ở probe FR-2a cũ: in 6 dòng (13, 21, 28, 152, 153, 155), trong đó 13/21/28 là `await fetch(url);` của `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels`, không đổi so với `d972fa6`. Probe đã sửa ở tasks.md, lần chạy 2 chạy lại toàn bộ khối.
    - Build exit 0; `dist` = `dist/index.js`, `dist/search.js`. Lắp ráp: `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `CITATION-OK`.
    - `src/index.ts`: segmented 3, sujato 3, translator 0, `fetch(` 4, `wc -l` 446, grep dựng URL 0. `src/search.ts`: 0/0/0/0, `wc -l` 167. FR-4 trên `src/*.ts`: 0.
    - FR-15: `src/search.ts` 0; `src/index.ts` 4 = `d972fa6` 4.
    - FR-2a: `buildSearchUrl(` 1; dòng handler 152 (`const url = buildSearchUrl(params);`), 153 (`await fetch(url);`), 155 (`renderSearch(url, …)`); `FR2A-ORDER-OK`.
    - Tool 1: `.default(` 1, `.optional()` 6, dòng `if (!res.ok) throw …` 1, `try|catch|retry` 0.
    - Phạm vi: grep -v rỗng (exit 1); `specs/INDEX.md` không xuất hiện; diff `package.json`/`package-lock.json`/`tsconfig.json` 0 byte; docs exit 0; `git diff --stat d972fa6`: 12 file, +369 −2096.
    - sha256: `src/index.ts` 7a76dc36…45f4, `src/search.ts` e94568f7…52e9, `test/search.test.ts` bd5bfdb2…8a4f. Không chạy live, không có lần chạy lại mạng.

- [x] **T-2-2:** `npm test` offline, đủ tiền tố FR, kiểm tĩnh fixture (AC-13 trừ đột biến; AC-7, AC-16 qua T1)
  - **Files:** — (chỉ kiểm; preload trong `$P` dưới `/tmp`; ghi `$E/T-2-2.log`)
  - **Acceptance:**
    - `npm test` thoát 0, với `# tests 11`, `# pass 11`, `# fail 0`.
    - Chạy lại với preload làm `globalThis.fetch` ném lỗi (`NODE_OPTIONS=--import …`): thoát 0, cùng ba số. Preload có hiệu lực: `node -e 'fetch("x")'` dưới cùng `NODE_OPTIONS` in `network disabled`.
    - Không có dòng `not ok`. Mỗi id `FR-2`, `FR-2a`, `FR-3`, `FR-5`, `FR-6`, `FR-7`, `FR-8`, `FR-9`, `FR-10`, `FR-11`, `FR-12`, viết đúng và theo sau là `:`, là tiền tố của ít nhất một dòng `ok N - <id>:`. Dòng FR-5 của bảng FR-17 áp dụng, vì design dựng output `json` trong `src/search.ts` (`design.md:17`).
    - AC-7 và AC-16 được phủ bởi case `FR-8:` và `FR-10:` (`design.md:1188`, `:1197`). Đọc T1 và ghi vào Result:
      - AC-7: case `FR-8:` có `assert.deepEqual` với khối `hits[0]` của literal `list authors`, gồm `Bhikkhu Anālayo` và `analayo`, không có dòng `URL:`.
      - AC-16: case `FR-10:` có hai dòng `{"entry":"nibbāna"}` và `{"entry":"nibbuta"}` đúng thứ tự, và mảng rỗng chỉ có tiêu đề `fuzzy_dictionary: 0`.
    - `grep -rn -E 'fetch|src/index' test/` không có dòng nào (thoát 1).
    - Fixture (NFR-4):
      - 3 file (≤ 10), `cat test/fixtures/* | wc -c` = 15223 (≤ 65536).
      - `grep -l -E '"(highlight|translations)"' test/fixtures/*` rỗng.
      - `fxcheck` in `FIXTURES-OK`.
      - Result của T-1-2 có dòng `EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch` kèm ngày.
    - Fail trên fixture đã đạt `FIXTURES-OK` là mismatch hợp lệ: halt và báo cáo.
    - `$P` bị xóa khi xong.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm test 2>&1 | grep -E '^# (tests|pass|fail) |^not ok'; echo "t1 exit=${PIPESTATUS[0]}"   # 11, 11, 0 ; 0
    P=$(mktemp -d /tmp/sap-nofetch.XXXXXX); track "$P"
    printf 'globalThis.fetch = () => { throw new Error("network disabled"); };\n' > "$P/nofetch.mjs"
    NODE_OPTIONS="--import $P/nofetch.mjs" node -e 'fetch("x")' 2>&1 | grep -c 'network disabled'   # >=1
    NODE_OPTIONS="--import $P/nofetch.mjs" npm test 2>&1 | grep -E '^# (tests|pass|fail) |^not ok'; echo "t2 exit=${PIPESTATUS[0]}"   # 11, 11, 0 ; 0
    rm -rf "$P"
    OK=$(npm test 2>&1 | grep -E '^ok [0-9]+ - ')
    printf '%s\n' "$OK"                                                           # 11 dòng ok
    for id in FR-2 FR-2a FR-3 FR-5 FR-6 FR-7 FR-8 FR-9 FR-10 FR-11 FR-12; do
      printf '%s %s\n' "$id" "$(printf '%s\n' "$OK" | grep -c -E "^ok [0-9]+ - $id:")"   # mỗi id >= 1
    done
    grep -rn -E 'fetch|src/index' test/; echo "grep exit=$?"                      # không dòng nào, exit 1
    ls test/fixtures | wc -l                                                      # 3
    cat test/fixtures/* | wc -c                                                   # 15223
    grep -l -E '"(highlight|translations)"' test/fixtures/*; echo "forbidden exit=$?"   # rỗng, 1
    fxcheck; echo "fxcheck exit=$?"                                               # FIXTURES-OK, 0
    awk '/^- \[.\] \*\*T-1-2:\*\*/{t=1;next} t&&/^- \[/{exit} t&&/^  - \*\*Result:\*\*/{r=1} r&&/EQUIV-OK 21 dòng Highlight đã bỏ, 0 lệch(`|$)/&&/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/{n++} END{print n+0}' specs/search-api-passthrough/tasks.md
                                                                                  # >= 1: chỉ trong khối Result của T-1-2, dòng EQUIV-OK có ngày
    ```

    Ghi vào `$E/T-2-2.log`: 11 dòng `ok`, ba dòng `# tests/pass/fail` của cả hai lần chạy, output của `fxcheck`.
  - **Depends on:** T-1-3
  - **Result:** PASS (2026-10-24, lần chạy 2, HEAD `d972fa6` + working tree; bằng chứng `$E/T-2-2.log`). Lần chạy 1 halt ở probe EQUIV-OK cũ: in 0 vì probe neo trên dòng `  - **Result:**`, còn dòng EQUIV-OK của T-1-2 nằm ở bullet con. Mọi kiểm khác của lần chạy 1 đã khớp. Probe đã sửa ở tasks.md, lần chạy 2 chạy lại toàn bộ khối.
    - `npm test`: `# tests 11`, `# pass 11`, `# fail 0`, `t1 exit=0`, không có `not ok`.
    - Preload no-fetch: `node -e 'fetch("x")'` cho `network disabled` (count 2). `npm test` dưới preload: 11/11/0, `t2 exit=0`. `$P` = `/tmp/sap-nofetch.rb8HhV` (đã `track`, đã xóa, `ls` báo No such file or directory).
    - 11 dòng `ok`. Mỗi id FR-2, FR-2a, FR-3, FR-5..FR-12 đếm được 1.
    - AC-7: `test/search.test.ts:171-172`, case `FR-8:`, literal `{uid:"", author:"Bhikkhu Anālayo", author_uid:"analayo"}`, `assert.deepEqual` với `["hits[0]\nTác giả: Bhikkhu Anālayo (analayo)"]`, không có dòng `URL:`.
    - AC-16: `:193`, case `FR-10:`, `{"entry":"nibbāna"}` rồi `{"entry":"nibbuta"}`, đúng thứ tự. `:195`: với mảng rỗng, khối cuối đúng bằng `fuzzy_dictionary: 0`.
    - `grep -rn -E 'fetch|src/index' test/`: rỗng, exit 1.
    - Fixture: 3 file, 15223 byte, highlight/translations rỗng (exit 1). `fxcheck`: 3 file và 7 mục `OK`, `FIXTURES-OK`, exit 0. Probe EQUIV-OK trong khối Result của T-1-2: 1.
    - Không chạy live, 0 lần chạy lại mạng. Không đổi file được track nào ngoài mục T-2-2 này.

- [x] **T-2-3:** Bốn đột biến FR-18 trên bản sao ngoài repo (AC-13)
  - **Files:** — (bản sao `$C` dưới `/tmp/sap-mut.*`; ghi `$E/T-2-3.log`)
  - **Acceptance:**
    - Bản sao cây làm việc ngoài repo, theo `design.md:1138-1145`: `rsync` không kèm `.git`, `node_modules`, `dist` và `.claude`; `node_modules` là symlink về repo. Script `blk V1` đặt ngoài cây bản sao.
    - Trước đột biến: `src/search.ts` của bản sao trùng `blk M1`, và `npm test` trong bản sao thoát 0.
    - Chạy `a`, `b`, `c`, `d` lần lượt. Mỗi dòng in ra có `changed=1` và `exit=` khác 0.
      - `changed` khác 1 nghĩa là pattern không khớp M1. Lần chạy đó không có giá trị: halt và báo cáo.
      - Danh sách `failed:` phải chứa id in đậm của bảng `design.md:1149-1154`: (a) `FR-6`, (b) `FR-2`, (c) `FR-2`, (d) `FR-3`.
      - Danh sách đầy đủ design đo được: (a) `FR-6 FR-8`, (b) `FR-2 FR-2a FR-3`, (c) `FR-2 FR-2a`, (d) `FR-3`. Danh sách khác mà vẫn chứa id bắt buộc thì vẫn đạt FR-18, nhưng ghi chênh lệch vào Result và báo cáo. Thiếu id bắt buộc thì halt.
    - Sau bốn lần: `src/search.ts` của bản sao trùng `blk M1`, `npm test` trong bản sao thoát 0.
    - Cây làm việc trong repo không đổi: `git status --porcelain` trước và sau giống hệt, và repo vẫn in `SEARCH-OK`.
    - Bản sao và script bị xóa.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    before=$(git status --porcelain --untracked-files=all | shasum -a 256)
    C=$(mktemp -d /tmp/sap-mut.XXXXXX); track "$C"; track "$C.sh"
    rsync -a --exclude .git --exclude node_modules --exclude dist --exclude .claude "$REPO"/ "$C"/
    ln -s "$REPO/node_modules" "$C/node_modules"
    blk V1 > "$C.sh"; chmod +x "$C.sh"
    diff <(blk M1) "$C/src/search.ts" && echo COPY-SEARCH-OK
    (cd "$C" && npm test > /dev/null 2>&1; echo "copy pre exit=$?")               # 0
    for m in a b c d; do "$C.sh" "$C" "$m"; done                                  # 4 dòng mutation …: changed=1 exit=1 failed: …
    diff <(blk M1) "$C/src/search.ts" && echo COPY-REVERTED-OK
    (cd "$C" && npm test > /dev/null 2>&1; echo "restored exit=$?")               # 0
    rm -rf "$C" "$C.sh"; ls -d "$C" "$C.sh" 2>&1                                  # No such file or directory (x2)
    after=$(git status --porcelain --untracked-files=all | shasum -a 256)
    [ "$before" = "$after" ] && echo REPO-UNCHANGED
    sed -n '423,424p;428p' "$D" | bash                                            # SEARCH-OK
    ```

    Ghi vào `$E/T-2-3.log`.
  - **Depends on:** T-2-2
  - **Result:** PASS (2026-10-24, lần chạy 1, HEAD `d972fa6` + working tree; bằng chứng `$E/T-2-3.log`).
    - Bản sao `$C` = `/tmp/sap-mut.TKkjmt` (rsync exit 0, không kèm `.git`, `node_modules`, `dist`, `.claude`; `node_modules` symlink về repo). Script V1 `/tmp/sap-mut.TKkjmt.sh`, sha256 `0bb774ca…f59c`. Cả hai đã `track`, đã xóa (`ls` báo No such file or directory x2).
    - Trước đột biến: `COPY-SEARCH-OK`, `copy pre exit=0`.
    - (a) `changed=1 exit=1 failed: FR-6 FR-8`. (b) `changed=1 exit=1 failed: FR-2 FR-2a FR-3`. (c) `changed=1 exit=1 failed: FR-2 FR-2a`. (d) `changed=1 exit=1 failed: FR-3`. Đủ id bắt buộc, và trùng đúng danh sách đầy đủ của `design.md:1149-1154`, không có chênh lệch.
    - Sau bốn lần: `COPY-REVERTED-OK`, `restored exit=0`.
    - Repo: sha256 của `git status --porcelain --untracked-files=all` trước và sau giống hệt (`REPO-UNCHANGED`); sha256 nội dung mọi file tracked và untracked không ignore cũng giống hệt (`REPO-BYTES-UNCHANGED`); `SEARCH-OK`. Không chạy live, 0 lần chạy lại.

- [x] **T-2-4:** Harness stdio: `tools/list` và tham số không hợp lệ (AC-9, AC-11)
  - **Files:** — (V2 trong `$H` dưới `/tmp/sap-h.*`; ghi `$E/T-2-4.log`)
  - **Acceptance:**
    - `npm run build` thoát 0 trước khi chạy. V2 chạy `dist/` của repo.
    - Các lần gọi chạy tuần tự qua `call`, với luật hợp lệ ở §Conventions. Các lời gọi này không chạm mạng: SDK từ chối input trước handler, và `tools/list` không có request. Vì vậy một lần chạy không hợp lệ ở đây đáng ghi riêng vào Result.
    - AC-9: cả 7 input của `requirements.md:410-417` cho `isError === true`, và text bắt đầu bằng `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`.
    - AC-11 (máy), trên phần tử `search_topic` của `tools/list`:
      - `inputSchema.properties` có đúng 8 key `query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`, `format`.
      - `required` là `["query"]`. Chỉ `format` có `default`, và giá trị là `"text"`.
      - `selectedLanguages.type` là `"array"`. `limit` và `offset` có `type` `"integer"` và `minimum` 0.
      - Chuỗi nối `description` của tool với `description` của mọi property:
        - có `selectedLanguages`, `vi`, `["en","pli"]`, `suttaplex`, `hits`, `title:`;
        - không có `không hiểu tiếng Việt`, `Chủ đề tiếng Việt có sẵn`, `không bao giờ`.
    - AC-11 (đọc): đọc chuỗi nối đó và ghi vào Result từng mệnh đề còn lại của `requirements.md:439-446`, mỗi mệnh đề có/không kèm câu trích ngắn:
      - `suttaplex` theo `limit`/`offset` với truy vấn `title:`;
      - một trang ít hơn `limit` hit chưa chắc là trang cuối;
      - `total` là số xấp xỉ, kèm đủ ba lý do;
      - khớp tiêu đề lặp lại ở mọi `offset` trừ `title:`;
      - cách biết còn kết quả là gọi lại với `offset` lớn hơn;
      - không có phép so nào giữa `offset`, `limit`, `total` và không có luật dừng.
    - Bất kỳ `FAIL` nào trên lần chạy hợp lệ: halt và báo cáo.
    - `$H` bị xóa khi xong.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build; echo "build exit=$?"                                           # 0
    H=$(mktemp -d /tmp/sap-h.XXXXXX); track "$H"; CALL="$H/mcp-call.mjs"; blk V2 > "$CALL"
    while IFS= read -r a; do
      r=$(call "$REPO" search_topic "$a") || { echo "call exit=$? $a"; continue; }
      chk "AC-9 $a" '[r.isError===true, t.startsWith("MCP error -32602: Input validation error: Invalid arguments for tool search_topic:")]'
    done <<'IN'
    {"query":"mindfulness","offset":-5}
    {"query":"mindfulness","limit":1.5}
    {"query":"mindfulness","limit":"10"}
    {"query":"mindfulness","selectedLanguages":"[\"vi\"]"}
    {"query":"mindfulness","matchpartial":"true"}
    {"query":"mindfulness","format":"xml"}
    {"topic":"x"}
    IN
                                                                                  # 7 dòng AC-9 … PASS
    r=$(call "$REPO" tools/list '{}') || echo "call exit=$?"
    chk AC-11 '(()=>{const s=r.tools.find(x=>x.name==="search_topic"); const p=s.inputSchema.properties;
      const d=[s.description,...Object.values(p).map(x=>x.description)].join("\n");
      return [JSON.stringify(Object.keys(p).sort())===JSON.stringify(["format","language","limit","matchpartial","offset","query","restrict","selectedLanguages"]),
        JSON.stringify(s.inputSchema.required)===JSON.stringify(["query"]),
        JSON.stringify(Object.keys(p).filter(k=>"default" in p[k]))===JSON.stringify(["format"]), p.format.default==="text",
        p.selectedLanguages.type==="array", ["limit","offset"].every(k=>p[k].type==="integer"&&p[k].minimum===0),
        ...["selectedLanguages","vi","[\"en\",\"pli\"]","suttaplex","hits","title:"].map(x=>d.includes(x)),
        ...["không hiểu tiếng Việt","Chủ đề tiếng Việt có sẵn","không bao giờ"].map(x=>!d.includes(x))]})()'   # AC-11 PASS
    R="$r" node -e 'const s=JSON.parse(process.env.R).tools.find(x=>x.name==="search_topic");console.log([s.description,...Object.entries(s.inputSchema.properties).map(([k,v])=>k+": "+v.description)].join("\n"))'   # để đọc AC-11
    rm -rf "$H"
    ```

    Chuỗi mô tả do repo này viết (H1), không phải dữ liệu SuttaCentral, nên được phép ghi vào `$E/T-2-4.log` để đọc. Ghi thêm mọi dòng `PASS`/`FAIL` và số lần chạy lại.
  - **Depends on:** T-2-1
  - **Result:** PASS (2026-10-24, lần chạy 1, HEAD `d972fa6` + working tree; bằng chứng `$E/T-2-4.log`).
    - Khối khởi đầu (`tasks.md:35-80`) và khối Test (`:423-448`) được trích bằng `sed` (bỏ thụt lề) vào script tạm `/tmp/sap-t24.tH7jFx` (sha256 `4d0acd06…54d7`), chạy bằng `bash`. V2 lấy bằng `blk V2` (sha256 `99a1e714…3d52`).
    - `build exit=0`. AC-9: 7/7 dòng `PASS`. AC-11 (máy): `AC-11 PASS`.
    - Không có dòng `INVALID`, `UNEXPECTED` hay `INCONCLUSIVE`: mỗi input chạy 1 lần, 0 lần chạy lại.
    - AC-11 (đọc), trên chuỗi nối mô tả:
      - `suttaplex` theo `limit`/`offset` với `title:`: có ("với truy vấn bắt đầu bằng `title:`, `suttaplex` theo `limit`/`offset` như `hits`").
      - Trang ít hơn `limit` hit chưa chắc là trang cuối: có ("một trang có thể có ít hơn `limit` hit trong khi vẫn còn kết quả").
      - `total` xấp xỉ, đủ ba lý do: có ("phụ thuộc `limit`, bị trừ đi các hit bị bỏ ở trang hiện tại, và khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề").
      - Khớp tiêu đề lặp lại ở mọi `offset` trừ `title:`: có ("khớp tiêu đề lặp lại ở mọi `offset`, trừ khi truy vấn bắt đầu bằng `title:`").
      - Cách biết còn kết quả: có ("gọi lại với `offset` lớn hơn và xem có mục mới không").
      - Phép so `offset`/`limit`/`total` hay luật dừng: không có (đọc; grep `>=|<=|[<>]|dừng|stop|trang cuối` trên chuỗi mô tả cho 0).
    - `$H` = `/tmp/sap-h.SVfXtN` và script tạm đã `track`, đã xóa (`ls` báo No such file or directory). Không đổi file được track nào ngoài mục T-2-4 này.

- [x] **T-2-5:** Harness live trên SuttaCentral (AC-1..AC-6)
  - **Files:** — (V2 trong `$H` dưới `/tmp/sap-h.*`; ghi `$E/T-2-5.log`)
  - **Acceptance:**
    - `npm run build` thoát 0 trước khi chạy.
    - 8 lời gọi chạy tuần tự qua `call`, trong một lần gọi Bash. Luật hợp lệ, trần 3 lần chạy và inconclusive (network) theo §Conventions.
    - Mọi literal dưới đây là số đo live 2026-10-23 (`requirements.md:344-390`, `design.md:1182-1187`). `FAIL` trên lần chạy hợp lệ thì halt. Trước khi báo, `curl -sS -G` lại URL của dòng nguồn và pipe vào `node` chỉ in `total` và độ dài mảng, để phân biệt chỉ mục SC trôi với regression. Không sửa literal.
    - AC-1, `{"query":"vô ngã","language":"vi"}`:
      - Khối `Khớp tiêu đề (suttaplex): 21` có mặt, kèm 21 mục `suttaplex[`.
      - Có dòng `URL: https://suttacentral.net/sn22.59` và chuỗi `— Năm Vị (Vô ngã tưởng)`.
      - Có khối `Khớp nội dung (hits): 0`, và khối `total` kết thúc bằng `: 21`.
      - Key của URL dòng nguồn đúng là `query,language`. Không có `isError`.
    - AC-2, `{"query":"vô ngã","language":"vi","selectedLanguages":["vi","pli"]}`:
      - Có 10 mục `hits[`.
      - `hits[0]` có `URL: https://suttacentral.net/an1.378-393/vi/minh_chau` và `Tác giả: Thích Minh Châu (minh_chau)`.
      - `total` kết thúc bằng `: 185`.
      - `new URL(src).searchParams.get("selectedLanguages")` = `["vi","pli"]`.
    - AC-3, `{"query":"anatta","language":"en"}`:
      - Có 10 mục `hits[`. Mục đầu có `URL: https://suttacentral.net/define/anatta` và không có `UID:`.
      - Các `UID:` tiếp theo là `general-guide-sujato`, `sn-guide-sujato`, `subjects`, `terminology`, `thi-ap4`, `an3.136`, `an7.18`, `an7.20`, `an10.60`. Bốn mục bài viết có `Bài viết (is_article)`.
      - `suttaplex[0]` có `UID: an6.100`.
    - AC-4, `{"query":"foo:bar","language":"en","format":"json"}`, rồi ngay sau đó `curl -sS -G` cùng URL, pipe thẳng vào `node`, không ghi file:
      - `content` có 2 item. `content[0].text` trùng từng byte (`===`) với body của `curl`.
      - `content[1].text` = `Nguồn: SuttaCentral — https://suttacentral.net/api/search/instant?query=foo%3Abar&language=en`.
      - `curl` thoát khác 0 là lần chạy không hợp lệ: chạy lại cặp V2 + `curl`, tối đa 3 lần.
    - AC-5, `{"query":"foo:bar","language":"en"}`:
      - Có `unknown_filter` và `Unknown filter: "foo:"`.
      - Có đúng 3 dòng `suggestion: `, và dòng đầu bắt đầu bằng `suggestion: Supported filters are`.
      - Không có `isError: true`.
    - AC-6, `{"query":"nibbana","language":"en","restrict":"dictionaries"}`:
      - `text` đúng bằng dòng nguồn (URL `…?query=nibbana&language=en&restrict=dictionaries`), một dòng trống, rồi `SuttaCentral trả body \`null\` cho request này.`.
      - Với thêm `"format":"json"`: item 1 có text đúng `null`.
      - Không có `isError` ở cả hai lần.
    - `$H` bị xóa khi xong. Result chỉ ghi `PASS`/`FAIL`, số lần chạy lại và mã `curl`.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build; echo "build exit=$?"                                           # 0
    H=$(mktemp -d /tmp/sap-h.XXXXXX); track "$H"; CALL="$H/mcp-call.mjs"; blk V2 > "$CALL"
    r=$(call "$REPO" search_topic '{"query":"vô ngã","language":"vi"}') && \
    chk AC-1 '[r.isError!==true, r.content.length===1, b.includes("Khớp tiêu đề (suttaplex): 21"), b.filter(x=>x.startsWith("suttaplex[")).length===21,
      t.split("\n").includes("URL: https://suttacentral.net/sn22.59"), t.includes("— Năm Vị (Vô ngã tưởng)"), b.includes("Khớp nội dung (hits): 0"),
      b.some(x=>x.startsWith("total (")&&x.endsWith(": 21")), [...new URL(src).searchParams.keys()].join()==="query,language"]'
    r=$(call "$REPO" search_topic '{"query":"vô ngã","language":"vi","selectedLanguages":["vi","pli"]}') && \
    chk AC-2 '(()=>{const h0=(b.find(x=>x.startsWith("hits[0]"))??"").split("\n"); return [r.isError!==true, b.filter(x=>x.startsWith("hits[")).length===10,
      h0.includes("URL: https://suttacentral.net/an1.378-393/vi/minh_chau"), h0.includes("Tác giả: Thích Minh Châu (minh_chau)"),
      b.some(x=>x.startsWith("total (")&&x.endsWith(": 185")), new URL(src).searchParams.get("selectedLanguages")==="[\"vi\",\"pli\"]"]})()'
    r=$(call "$REPO" search_topic '{"query":"anatta","language":"en"}') && \
    chk AC-3 '(()=>{const h=b.filter(x=>x.startsWith("hits[")); const uid=x=>(x.split("\n").find(l=>l.startsWith("UID: "))??"").slice(5);
      return [r.isError!==true, h.length===10, h[0]?.split("\n").includes("URL: https://suttacentral.net/define/anatta"), uid(h[0]??"")==="",
        JSON.stringify(h.slice(1).map(uid))===JSON.stringify(["general-guide-sujato","sn-guide-sujato","subjects","terminology","thi-ap4","an3.136","an7.18","an7.20","an10.60"]),
        h.slice(1,5).every(x=>x.split("\n").includes("Bài viết (is_article)")),
        (b.find(x=>x.startsWith("suttaplex[0]"))??"").split("\n").includes("UID: an6.100")]})()'
    U='https://suttacentral.net/api/search/instant?query=foo%3Abar&language=en'
    r=$(call "$REPO" search_topic '{"query":"foo:bar","language":"en","format":"json"}') && {
    curl -sS -G "$U" | R="$r" node -e 'let d="";process.stdin.setEncoding("utf8");process.stdin.on("data",c=>d+=c).on("end",()=>{
      const r=JSON.parse(process.env.R); const ok=[d.length>0, r.isError!==true, r.content.length===2, r.content[0].text===d,
        r.content[1]?.text==="Nguồn: SuttaCentral — "+process.argv[1]];
      console.log("AC-4 "+(ok.every(x=>x===true)?"PASS":"FAIL "+ok.map((x,i)=>x?null:i).filter(x=>x!==null)))})' "$U"
    echo "curl exit=${PIPESTATUS[0]}"; }                                          # AC-4 PASS ; curl exit=0 (khác 0: không hợp lệ, chạy lại cặp)
    r=$(call "$REPO" search_topic '{"query":"foo:bar","language":"en"}') && \
    chk AC-5 '(()=>{const s=t.split("\n").filter(l=>l.startsWith("suggestion: ")); return [r.isError!==true, t.includes("unknown_filter"),
      t.includes("Unknown filter: \"foo:\""), s.length===3, s[0]?.startsWith("suggestion: Supported filters are")===true]})()'
    r=$(call "$REPO" search_topic '{"query":"nibbana","language":"en","restrict":"dictionaries"}') && \
    chk AC-6-text '[r.isError!==true, r.content.length===1,
      t==="Nguồn: SuttaCentral — https://suttacentral.net/api/search/instant?query=nibbana&language=en&restrict=dictionaries\n\nSuttaCentral trả body `null` cho request này."]'
    r=$(call "$REPO" search_topic '{"query":"nibbana","language":"en","restrict":"dictionaries","format":"json"}') && \
    chk AC-6-json '[r.isError!==true, r.content.length===2, t==="null"]'
    rm -rf "$H"
    ```

    Mỗi `call` lỗi in `INVALID`/`INCONCLUSIVE` ra stderr. Một AC kết thúc `INCONCLUSIVE (network)` thì làm theo §Conventions: kiểm bằng `curl`, báo cáo, chờ orchestrator. Ghi vào `$E/T-2-5.log`.
  - **Depends on:** T-2-4
  - **Result:** PASS (2026-10-24, lần chạy 1, HEAD `d972fa6` + working tree; bằng chứng `$E/T-2-5.log`).
    - Khối khởi đầu (`tasks.md:35-80`) và khối Test (`:502-534`) được trích bằng `sed` (bỏ thụt lề) vào script tạm `/tmp/sap-t25.Tq2yxz` (sha256 `5bcb24cb…c38c7`), chạy bằng `bash` trong một lần gọi Bash. V2 lấy bằng `blk V2`.
    - `build exit=0`. `AC-1 PASS`, `AC-2 PASS`, `AC-3 PASS`, `AC-4 PASS` (`curl exit=0`), `AC-5 PASS`, `AC-6-text PASS`, `AC-6-json PASS`.
    - 0 dòng `INVALID`, `UNEXPECTED` hay `INCONCLUSIVE`: 7 lời gọi `call` và 1 `curl`, mỗi cái 1 lần chạy, 0 lần chạy lại.
    - Lệch đếm trong tasks.md, chỉ ghi lại: khối Test có 7 lời gọi `call` (đều có request) cộng 1 `curl`. Acceptance ghi "8 lời gọi", §Dependency graph ghi "8 lời gọi, 7 có request".
    - `$H` = `/tmp/sap-h.l4AzJO` và script tạm đã `track`, đã xóa (`ls` báo No such file or directory). Không đổi file được track nào ngoài mục T-2-5 này.

- [x] **T-2-6:** A/B trùng byte với bản build `d972fa6` cho bốn tool kia (AC-12)
  - **Files:** — (`$AB` dưới `/tmp/sap-ab.*`; ghi `$E/T-2-6.log`)
  - **Acceptance:**
    - Theo đúng `design.md:1080-1090`. Baseline dựng từ `git archive d972fa6`, không phụ thuộc cây làm việc. Không dùng `git worktree` hay `git stash`, và không ghi gì vào `.git`.
    - V2, V3, V4 lấy bằng `blk`. V3 tự áp luật hợp lệ: cặp không hợp lệ được chạy lại cả cặp, tối đa 3 lần.
    - `ab.sh` in 6 dòng `MATCH …`, rồi `AB-OK 6/6`, và thoát 0.
      - Thoát 1 (`MISMATCH`) là phát hiện trên lần chạy hợp lệ: halt, không chạy lại. Trước khi xóa `$AB`, chỉ ghi `cmp` (byte lệch đầu tiên) và `wc -c` của hai payload. Không chép payload.
      - Thoát 3 (`INCONCLUSIVE (network)`): không phải pass, chưa kết luận về code. Kiểm bằng `curl` theo §Conventions, báo cáo, orchestrator quyết định.
    - Payload design đo được: 2509, 6790, 56, 2715, 463, 2243 byte (`design.md:1092`). Khác số mà vẫn `MATCH` thì chỉ ghi lại, không fail, vì tiêu chí là trùng byte giữa hai bản build.
    - `$AB` bị xóa khi xong, kể cả khi halt.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    AB=$(mktemp -d /tmp/sap-ab.XXXXXX); mkdir "$AB/base" "$AB/work"; track "$AB"
    git archive d972fa6 src package.json tsconfig.json | tar -x -C "$AB/base"
    ln -s "$REPO/node_modules" "$AB/base/node_modules"
    (cd "$AB/base" && npx tsc -p .); echo "base build exit=$?"                    # 0
    git show d972fa6:src/index.ts | cmp - "$AB/base/src/index.ts" && echo BASE-SRC-OK
    npm run build; echo "build exit=$?"                                           # 0
    blk V2 > "$AB/mcp-call.mjs"; blk V3 > "$AB/ab.sh"; chmod +x "$AB/ab.sh"; blk V4 > "$AB/inputs.list"
    "$AB/ab.sh" "$AB/base" "$REPO" "$AB/inputs.list" "$AB/work" "$AB/mcp-call.mjs"; echo "ab exit=$?"   # 6 MATCH, AB-OK 6/6 ; 0
    rm -rf "$AB"; ls "$AB" 2>&1                                                   # No such file or directory
    ```

    Ghi vào `$E/T-2-6.log`: các dòng `MATCH`/`INVALID-PAIR`/`MISMATCH`/`INCONCLUSIVE`/`AB-OK` và mã thoát.
  - **Depends on:** T-2-5
  - **Result:** PASS (2026-10-24, lần chạy 1, HEAD `d972fa6` + working tree; bằng chứng `$E/T-2-6.log`).
    - Khối khởi đầu (`tasks.md:35-80`) và khối Test (`:560-568`) được trích bằng `sed` (bỏ thụt lề) và `eval` trong `bash -s`, một lần gọi Bash, không có script tạm ngoài `$AB`. V2/V3/V4 lấy bằng `blk` (sha256 `99a1e714…3d52`, `a3fb4131…6243`, `ace1ccca…27f3`).
    - `base build exit=0`, `BASE-SRC-OK`, `build exit=0`. `ab.sh` in 6 dòng `MATCH` (tools/list, get_sutta mn10, get_sutta mn9999, get_sutta_meta mn10, get_parallels mn10, list_divisions), rồi `AB-OK 6/6`, `ab exit=0`.
    - Payload 2509, 6790, 56, 2715, 463, 2243 byte, trùng số đo của `design.md:1092`.
    - 0 dòng `INVALID-PAIR`, `MISMATCH` hay `INCONCLUSIVE`: 6 cặp, mỗi cặp 1 lần chạy, 0 lần chạy lại. stderr V2: 0 dòng.
    - `$AB` = `/tmp/sap-ab.SZS2GQ` đã `track`, đã xóa (`ls` báo No such file or directory). sha256 `git status --porcelain --untracked-files=all` trước và sau giống hệt (`abc4be4a…1304`). Không đổi file được track nào; trong `specs/` chỉ đổi mục T-2-6 này.

## Phase 3: Tài liệu (trừ `AGENTS.md`)

- [x] **T-3-1:** Áp R-1, R-2 vào `README.md` (**nguyên văn**)
  - **Files:** `README.md`
  - **Acceptance:**
    - Guard, lệch thì halt:
      - `README.md` trùng `d972fa6`.
      - Neo khớp đúng chỗ: `:13` bắt đầu bằng `` | `search_topic` | ``; `:68` là `## Chủ đề có sẵn`; `:84` bắt đầu bằng `1 kết quả sutta ở trang 1`; `:85` trống; `:86` là `## Lưu ý`.
    - Ghi bằng pipeline tái dựng của `design.md:1205-1206`, chép qua `blk`: `d972fa6:1-12` + `blk R-1` + `d972fa6:14-67` + `blk R-2` + `d972fa6:85-$`.
    - Lệnh tái dựng in `README-OK`.
    - FR-19: `grep -c 'VI_TOPIC_TERMS' README.md` = 0. Grep AC-15 trên `README.md` không có dòng nào.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    git diff --quiet d972fa6 -- README.md || { echo "STOP: README.md đã khác d972fa6"; exit 1; }
    sed -n '13p' README.md | grep -c -F '| `search_topic` |'                      # 1
    sed -n '68p;85p;86p' README.md                                                # ## Chủ đề có sẵn / (trống) / ## Lưu ý
    sed -n '84p' README.md | grep -c '^1 kết quả sutta ở trang 1'                 # 1
    R=$(mktemp /tmp/sap-readme.XXXXXX); git show d972fa6:README.md > "$R"
    { sed -n '1,12p' "$R"; blk R-1; sed -n '14,67p' "$R"; blk R-2; sed -n '85,$p' "$R"; } > README.md
    rm -f "$R"
    { sed -n '423,424p;1205,1207p' "$D"; echo 'rm -f "$R"'; } | bash             # README-OK
    grep -c 'VI_TOPIC_TERMS' README.md                                            # 0
    grep -n -E 'VI_TOPIC_TERMS|không hiểu tiếng Việt|does not handle Vietnamese' README.md; echo "grep exit=$?"   # rỗng, 1
    git diff --stat d972fa6 -- README.md
    ```

    Ghi vào `$E/T-3-1.log`.
  - **Depends on:** T-1-3
  - **Result:** Pass, 2026-10-24, 1 lần chạy (không live, không chạy lại). Bằng chứng: `$E/T-3-1.log`.
    - Guard: `README.md` trùng `d972fa6`; neo `:13` = 1, `:68` `## Chủ đề có sẵn`, `:85` trống, `:86` `## Lưu ý`, `:84` = 1.
    - Ghi bằng pipeline của task (`blk R-1`, `blk R-2`), không dùng Write/Edit. Lệnh tái dựng in `README-OK`; test exit 0.
    - `grep -c 'VI_TOPIC_TERMS'` = 0; grep AC-15 rỗng, exit 1. `git diff --stat d972fa6 -- README.md`: 1 file, 7 insertions, 17 deletions.
    - `README.md` sha256 `71e0d533…3dac58d7`, 4315 byte, 99 dòng.
    - Tạm: `/tmp/sap-readme.Suu4ke` và script `/tmp/sap-t31.euL7U5` đã `track`, đã xóa (`ls` báo No such file or directory). `R=$(mktemp)` của `design.md:1205` tạo file dưới `$TMPDIR` và bị `rm -f "$R"` nối thêm xóa ngay; không track được vì nằm trong subshell.
    - Chỉ đổi `README.md` và mục T-3-1 này.

- [x] **T-3-2:** Áp M-1..M-5 vào `specs/sutta-mcp-requirements.md` (**nguyên văn**)
  - **Files:** `specs/sutta-mcp-requirements.md`
  - **Acceptance:**
    - Guard, lệch thì halt:
      - File trùng `d972fa6`.
      - Neo khớp đúng chỗ:
        - `:143` là `` ### Tool 1: `search_topic` ``; `:160` bắt đầu bằng `**Lưu ý:**`; `:161` trống.
        - `:259` bắt đầu bằng `Claude gọi search_topic("chánh niệm")`; `:261` bắt đầu bằng `Trả về (tìm bằng "satipatthana")`.
        - `:292` bắt đầu bằng `1. **Dynamic search**`; `:298` bắt đầu bằng `   **Phân trang:**`; `:299` trống.
        - `:376`, `:377`, `:378` lần lượt bắt đầu bằng `| [#18]`, `| [#19]`, `| [#20]`; `:379` trống; `:380` bắt đầu bằng `**Thứ tự đề xuất:**`.
    - Ghi bằng pipeline tái dựng của `design.md:1208-1209`, chép qua `blk`, áp cả năm khối trong một lần ghi (một task cho cả file).
    - Lệnh tái dựng in `MASTER-OK`.
    - AC-15:
      - Grep AC-15 trên master spec cho đúng 2 dòng: roadmap mục 1 và issue #18. Cả hai ở ngữ cảnh lịch sử, nói rõ là đã bỏ hay bị thay (`design.md:1196`).
      - Tool 1 có 8 dòng tham số trong bảng Input.
      - Roadmap mục 1 trỏ `specs/search-api-passthrough/`.
      - #18 ghi `không còn áp dụng`. #19 và #20 ghi cần kiểm lại phần `search_topic`.
      - Khác 2 dòng thì halt và báo cáo.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    F=specs/sutta-mcp-requirements.md
    git diff --quiet d972fa6 -- "$F" || { echo "STOP: master spec đã khác d972fa6"; exit 1; }
    for n in 143 160 161 259 261 292 298 299 376 377 378 379 380; do printf '%s: ' "$n"; sed -n "${n}p" "$F" | cut -c1-60; done   # khớp danh sách neo
    S=$(mktemp /tmp/sap-master.XXXXXX); git show d972fa6:"$F" > "$S"
    { sed -n '1,142p' "$S"; blk M-1; sed -n '161,258p' "$S"; blk M-2; sed -n '262,291p' "$S"; blk M-3; sed -n '299,375p' "$S"; blk M-4; sed -n '379p' "$S"; blk M-5; sed -n '381,$p' "$S"; } > "$F"
    rm -f "$S"
    { sed -n '423,424p;1208,1210p' "$D"; echo 'rm -f "$S"'; } | bash             # MASTER-OK
    grep -n -E 'VI_TOPIC_TERMS|không hiểu tiếng Việt|does not handle Vietnamese' "$F"   # đúng 2 dòng: roadmap mục 1, #18
    awk '/^### Tool 1: `search_topic`/{f=1;next} f&&/^### /{exit} f' "$F" | grep -c -E '^\| `(query|language|limit|offset|selectedLanguages|restrict|matchpartial|format)` \|'   # 8
    grep -c -F 'specs/search-api-passthrough/' "$F"                               # >= 1
    grep -n -F '**không còn áp dụng**' "$F"                                       # dòng #18
    grep -c -F 'cần kiểm lại trên output mới của spec `search-api-passthrough`' "$F"   # 2 (#19, #20)
    git diff --stat d972fa6 -- "$F"
    ```

    Ghi vào `$E/T-3-2.log`.
  - **Depends on:** T-1-3
  - **Result:** Pass, 2026-10-24, 1 lần chạy (không live, không chạy lại). Bằng chứng: `$E/T-3-2.log`.
    - Guard: master spec trùng `d972fa6`; cả 13 neo (`:143`, `:160`, `:161`, `:259`, `:261`, `:292`, `:298`, `:299`, `:376`..`:380`) khớp.
    - Ghi bằng pipeline của task (`blk M-1`..`blk M-5`, một lần ghi), không dùng Write/Edit. Lệnh tái dựng in `MASTER-OK`; rc 0.
    - Grep AC-15 = 2 dòng: `:296` roadmap mục 1 (đã thay bằng spec `search-api-passthrough`) và `:376` issue #18 (`**không còn áp dụng**`), cả hai ngữ cảnh lịch sử. Tool 1 có 8 dòng tham số; `specs/search-api-passthrough/` = 1; `cần kiểm lại…` = 2 (#19, #20).
    - `git diff --stat d972fa6`: 1 file, 22 insertions, 22 deletions. sha256 `b4c241c0…5040c1fdf`, 29262 byte, 380 dòng.
    - Tạm: `/tmp/sap-master.sMxQje` đã `track`, đã xóa (`ls` báo No such file or directory). `S=$(mktemp)` của `design.md:1208` nằm trong subshell, bị `rm -f "$S"` nối thêm xóa ngay.
    - Chỉ đổi `specs/sutta-mcp-requirements.md` và mục T-3-2 này.

- [x] **T-3-3:** Dọn thư mục tạm (NFR-6) và kiểm trạng thái repo trước task `AGENTS.md`
  - **Files:** — (chỉ kiểm; ghi `$E/T-3-3.log`)
  - **Acceptance:**
    - Mọi task trước (T-1-1..T-3-2) đã `[x]`. Không có task nào đang halt hay inconclusive mà orchestrator chưa quyết định.
    - Mọi đường dẫn trong `$E/tmp-dirs.txt` không còn tồn tại. Đường dẫn nào còn thì xóa, và ghi tên vào Result.
    - Không có thư mục `/tmp/sap-*` nào do các task này tạo mà còn sót lại.
    - Không có body thô SuttaCentral nào trong repo ngoài `test/fixtures/`. `git status --porcelain --untracked-files=all` chỉ liệt kê đường dẫn thuộc NFR-3.
    - Trạng thái trước A-1:
      - `README-OK` và `MASTER-OK` vẫn in.
      - §Lắp ráp in đủ bốn dòng `*-OK`.
      - `npm run build` và `npm test` thoát 0.
      - `AGENTS.md` vẫn trùng `d972fa6`, với sha256 `efea3016c0d6ebc2b89af3adba0061e49e1fa1dbb9823438508dfb8f65937f08`.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    grep -c -E '^- \[ \] \*\*T-(1|2|3-[12])' specs/search-api-passthrough/tasks.md   # 0
    while IFS= read -r p; do [ -e "$p" ] && { echo "LEFTOVER $p"; rm -rf "$p"; }; done < "$E/tmp-dirs.txt"; echo "leftover check done"
    ls -d /tmp/sap-* 2>/dev/null                                                  # chỉ những đường dẫn không có trong tmp-dirs.txt (ghi vào Result nếu có)
    git status --porcelain --untracked-files=all
    { git diff --name-only d972fa6; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|test/search\.test\.ts|test/fixtures/.+|README\.md|AGENTS\.md|specs/sutta-mcp-requirements\.md|specs/search-api-passthrough/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    sed -n '423,432p' "$D" | bash                                                 # ASSEMBLY-OK SEARCH-OK TEST-OK CITATION-OK
    { sed -n '423,424p;1205,1207p' "$D"; echo 'rm -f "$R"'; } | bash             # README-OK
    { sed -n '423,424p;1208,1210p' "$D"; echo 'rm -f "$S"'; } | bash             # MASTER-OK
    npm run build > /dev/null; echo "build exit=$?"                               # 0
    npm test 2>&1 | grep -E '^# (pass|fail) '; echo "test exit=${PIPESTATUS[0]}"  # 11, 0 ; 0
    git diff --quiet d972fa6 -- AGENTS.md; echo "agents exit=$?"                  # 0
    shasum -a 256 AGENTS.md                                                       # efea3016…7f08
    ```

    Ghi vào `$E/T-3-3.log`.
  - **Depends on:** T-2-1, T-2-2, T-2-3, T-2-4, T-2-5, T-2-6, T-3-1, T-3-2
  - **Result:** PASS (2026-10-24, lần chạy 1, HEAD `d972fa6` + working tree; bằng chứng `$E/T-3-3.log`). Task T-1-1..T-3-2 chưa check: 0; không có halt hay inconclusive chưa quyết định (halt của T-2-1, T-2-2 đã được chạy lại và PASS). `tmp-dirs.txt` có 14 đường dẫn, tất cả khớp `/tmp/sap-*`; không đường dẫn nào còn tồn tại, nên không xóa gì (không có `LEFTOVER`). `ls -d /tmp/sap-*` rỗng (exit 1). `git status` chỉ có đường dẫn NFR-3; grep phạm vi rỗng (exit 1). In `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `CITATION-OK`, `README-OK`, `MASTER-OK`. build exit 0; `npm test` pass 11, fail 0, exit 0. `AGENTS.md` trùng `d972fa6` (exit 0), sha256 `efea3016c0d6ebc2b89af3adba0061e49e1fa1dbb9823438508dfb8f65937f08`. Không sửa file tracked nào.

## Phase 4: `AGENTS.md` (task build cuối cùng)

- [x] **T-4-1:** Áp A-1, A-2 vào `AGENTS.md` (**nguyên văn**). Task cuối, chỉ sửa `AGENTS.md`
  - **Files:** `AGENTS.md` (duy nhất). Không đụng `specs/search-api-passthrough/workflow-contract.json`, `workflow-state.json` hay file nào khác.
  - **Acceptance:**
    - Q1 đã chốt ngày 2026-10-24: người dùng chọn default, nên A-1 sửa cả `:26`, `:28` và `:30` (`design.md:66-71`). Khối A-1 giữ nguyên, không có lần sửa design nào trước task này.
    - Guard, lệch thì halt:
      - Mọi task khác đã `[x]`.
      - `git diff --quiet d972fa6 -- AGENTS.md`. `shasum -a 256 AGENTS.md` = `efea3016c0d6ebc2b89af3adba0061e49e1fa1dbb9823438508dfb8f65937f08` (`design.md:963`).
      - Neo khớp đúng chỗ:
        - `:24` bắt đầu bằng `Two source files.`; `:26` là `**Three layers:**`; `:29` bắt đầu bằng `2. **Vietnamese topic mapping**`.
        - `:31` bắt đầu bằng ``   - `search_topic` —``; `:32` bắt đầu bằng ``   - `get_sutta` —``.
        - `:41` bắt đầu bằng `` - `GET /api/search/instant ``; `:42` trống; `:43` là `## Extending the Vietnamese Topic Mapping`; `:46` trống; `:47` là `## SuttaCentral Domain Concepts`.
    - Ghi bằng pipeline tái dựng của `design.md:1211-1212`, chép qua `blk`: `d972fa6:1-23` + `blk A-1` + `d972fa6:32-40` + `blk A-2` + `d972fa6:42` + `d972fa6:47-$`. A-1 thay `:24-31`. A-2 thay `:41` và bỏ `:43-46`.
    - Lệnh tái dựng in `AGENTS-OK`. Ngoài A-1, A-2, `AGENTS.md` không đổi (FR-21).
    - AC-15 đầy đủ:
      - Grep AC-15 trên `README.md` và `AGENTS.md` không có dòng nào. Trên master spec vẫn đúng 2 dòng lịch sử.
      - `README-OK`, `MASTER-OK` vẫn in.
    - Phạm vi cuối (AC-14, NFR-3): danh sách đường dẫn đổi giống T-3-3, cộng đúng `AGENTS.md`.
    - Ghi sha256 mới của `AGENTS.md` vào Result. Orchestrator dùng giá trị này để đối chiếu với preview cập nhật contract.
    - **Ngay sau task này, trước code review on-completion, orchestrator chạy đường cập nhật contract** (`design.md:966-973`). Đây là việc của orchestrator, **không phải bước của implementer**.
      - Implementer không chạy hàm contract nào, không sửa `workflow-contract.json`, không authorize thay người dùng.
      - Thứ tự của orchestrator:
        1. `preview_contract_update`. Thay đổi duy nhất được chờ là `dependencies.context:agents`. Có thay đổi khác thì dừng và báo người dùng.
        2. Trình preview cho người dùng, kèm scope `{"type":"contract","id":"dependencies.context:agents"}`.
        3. `authorize_contract_update`, **chỉ khi người dùng đồng ý rõ ràng tại thời điểm đó**.
        4. `write_contract_atomic`, rồi `finish_contract_update`, rồi `settle_contract_invalidation`.
      - Mệnh đề AC-15 "`shasum -a 256 AGENTS.md` bằng sha256 mới của `context:agents` trong `workflow-contract.json`" được kiểm sau bước đó, không trong task này.
      - Người dùng không authorize thì workflow dừng ở drift. Không agent nào tự khôi phục `AGENTS.md`.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    grep -c -E '^- \[ \] \*\*T-[123]-' specs/search-api-passthrough/tasks.md      # 0
    git diff --quiet d972fa6 -- AGENTS.md || { echo "STOP: AGENTS.md đã khác d972fa6"; exit 1; }
    [ "$(shasum -a 256 AGENTS.md | cut -d' ' -f1)" = efea3016c0d6ebc2b89af3adba0061e49e1fa1dbb9823438508dfb8f65937f08 ] || { echo "STOP: sha256 lệch pin"; exit 1; }
    for n in 24 26 29 31 32 41 42 43 46 47; do printf '%s: ' "$n"; sed -n "${n}p" AGENTS.md | cut -c1-60; done   # khớp danh sách neo
    A=$(mktemp /tmp/sap-agents.XXXXXX); git show d972fa6:AGENTS.md > "$A"
    { sed -n '1,23p' "$A"; blk A-1; sed -n '32,40p' "$A"; blk A-2; sed -n '42p' "$A"; sed -n '47,$p' "$A"; } > AGENTS.md
    rm -f "$A"
    { sed -n '423,424p;1211,1213p' "$D"; echo 'rm -f "$A"'; } | bash             # AGENTS-OK
    { sed -n '423,424p;1205,1207p' "$D"; echo 'rm -f "$R"'; } | bash             # README-OK
    { sed -n '423,424p;1208,1210p' "$D"; echo 'rm -f "$S"'; } | bash             # MASTER-OK
    grep -n -E 'VI_TOPIC_TERMS|không hiểu tiếng Việt|does not handle Vietnamese' README.md AGENTS.md; echo "grep exit=$?"   # rỗng, 1
    grep -c -E 'VI_TOPIC_TERMS|không hiểu tiếng Việt|does not handle Vietnamese' specs/sutta-mcp-requirements.md   # 2
    { git diff --name-only d972fa6; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|test/search\.test\.ts|test/fixtures/.+|README\.md|AGENTS\.md|specs/sutta-mcp-requirements\.md|specs/search-api-passthrough/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    git diff --stat d972fa6 -- AGENTS.md
    shasum -a 256 AGENTS.md                                                       # ghi vào Result
    ```

    Ghi vào `$E/T-4-1.log`.
  - **Depends on:** T-3-3
  - **Result:** Pass, 2026-10-24, 1 lần chạy (không live, không chạy lại). Bằng chứng: `$E/T-4-1.log`.
    - Guard: task T-1..T-3 chưa check = 0; `AGENTS.md` trùng `d972fa6`, sha256 trước = `efea3016…7f08` (khớp pin); cả 10 neo (`:24`, `:26`, `:29`, `:31`, `:32`, `:41`, `:42`, `:43`, `:46`, `:47`) khớp.
    - Ghi bằng pipeline của task (`blk A-1`, `blk A-2`), không dùng Write/Edit. Q1 theo default: A-1 sửa `:26`, `:28`, `:30`. In `AGENTS-OK`, `README-OK`, `MASTER-OK` (rc 0 cả ba).
    - Grep AC-15 trên `README.md` và `AGENTS.md` rỗng, exit 1; trên master spec = 2. Grep phạm vi rỗng, exit 1 (chỉ thêm `AGENTS.md` so với T-3-3).
    - `git diff --stat d972fa6 -- AGENTS.md`: 1 file, 6 insertions, 11 deletions. **sha256 mới `4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b`**, 3808 byte, 47 dòng.
    - Tạm: `/tmp/sap-agents.4pPO46` đã `track`, đã xóa (`ls` báo No such file or directory).
    - Chỉ đổi `AGENTS.md` và mục T-4-1 này. Cập nhật contract (`context:agents`) là bước của orchestrator, chưa chạy.

## AC coverage

| AC / mục | Task |
|---|---|
| AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 (harness live) | T-2-5 |
| AC-7 (`list authors`, unit test) | T-1-3 (`npm test`), T-2-2 (đọc case `FR-8:`) |
| AC-8 (tham số không truyền thì không gửi) | T-2-2 (case `FR-2:`, `FR-3:`), T-2-1 (đọc schema: 1 `.default(`, 6 `.optional()`) |
| AC-9 (input không hợp lệ) | T-2-4 |
| AC-10 (non-2xx) | T-2-1 (đọc code, khóa bằng `ASSEMBLY-OK`) |
| AC-11 (`tools/list`, mô tả) | T-2-4 |
| AC-12 (bốn tool khác không đổi) | T-2-6 (A/B với `d972fa6`) |
| AC-13 (unit test, đột biến, fixture) | T-1-2 (`EQUIV-OK`, `FIXTURES-OK`), T-1-3, T-2-2, T-2-3 |
| AC-14 (logic tự chế đã bỏ, phạm vi, bất biến) | T-2-1; phạm vi kiểm lại ở T-3-3 và T-4-1 |
| AC-15 (tài liệu) | T-3-1 (README), T-3-2 (master spec), T-4-1 (AGENTS.md); mệnh đề contract: orchestrator sau T-4-1 |
| AC-16 (`fuzzy_dictionary`) | T-1-3 (`npm test`), T-2-2 (đọc case `FR-10:`) |
| FR-21 thứ tự `AGENTS.md` | T-4-1 là task cuối, chỉ sửa `AGENTS.md` |
| Vùng được bảo vệ (`design.md:73-77`) | T-1-1, T-2-1 (`ASSEMBLY-OK`, `CITATION-OK`), T-2-6 (mức output) |
| Dọn dẹp (NFR-6) | mỗi task tự xóa thư mục tạm; T-3-3 |

## Dependency graph

```
T-1-1 ─> T-1-2 ─> T-1-3 ─┬─> T-2-1 ─> T-2-4 ─> T-2-5 ─> T-2-6 ─┐
         (nhóm commit G1) ├─> T-2-2 ─> T-2-3 ──────────────────┤
                          ├─> T-3-1 ───────────────────────────┼─> T-3-3 ─> T-4-1
                          └─> T-3-2 ───────────────────────────┘
```

- **Task chạy mạng:** T-1-2 (3 request), T-2-5 (8 lời gọi, 7 có request, cộng một `curl`) và T-2-6 (A/B). Chúng chạy tuần tự, không song song với nhau hay với task nào khác.
- **T-4-1 luôn là task cuối.** Không task nào được dispatch sau nó trước khi orchestrator settle cập nhật contract.

## Notes

- **Quyết định của người dùng (ghi lại, không mở lại):**
  - 2026-10-23: ba quyết định stakeholder của requirements.
    - `search_topic` mang đúng tham số của API, cộng `format`.
    - Bỏ mọi logic tự chế.
    - Phạm vi chỉ có `search_topic`.
  - 2026-10-23: C1–C11. Người dùng chọn đúng default cho C1, C2, C5; C3, C4, C6–C11 dùng default.
  - 2026-10-24: design được duyệt (Continue). Q1 trả lời theo default: A-1 sửa cả `AGENTS.md:26`, `:28`, `:30`.
- **design-review-2, ba Suggestion.** Gộp vào §Conventions và T-1-2; không sửa `design.md`, vì design ở Status Reviewed.
  - S1 (F2 báo lỗi dựng URL là `INVALID`): T-1-2 kiểm `buildSearchUrl()` cho cả 3 dòng F1 trước khi ghi. Dòng `INVALID` có mã HTTP rỗng bị coi như `UNEXPECTED`: halt, không ghi lại.
  - S2 ("tối đa 3 lần" đếm khác nhau): mọi task dùng cách đếm của V3, tức tối đa 3 lần chạy cho mỗi input (lần đầu và 2 lần chạy lại). Hàm `call` của khối khởi đầu đếm như vậy.
  - S3 ("không phải lỗi code" quá mạnh): quá trần ghi là "inconclusive (network)", chưa kết luận về code. Trước khi báo, kiểm endpoint bằng `curl`. Nếu `curl` trả 200 trong khi tool fail 3 lần thì báo nghi lỗi code. Orchestrator quyết định.
- **Response thô.** Ràng buộc của orchestrator: không ghi response thô SuttaCentral ra ngoài `test/fixtures/`, và thư mục đó chỉ chứa fixture đã cắt.
  - Lệnh do task này soạn giữ result trong biến shell và pipe: `call`, `chk`, `curl` của AC-4, bước kiểm drift bằng `curl`.
  - F2 (`$W/raw`) và V3 (`$AB/work`) là script normative của design và tự ghi file. Chúng chỉ ghi vào thư mục `mktemp` mà chính task đó xóa trước khi kết thúc, kể cả khi halt.
  - Nếu orchestrator đọc ràng buộc này chặt hơn, tức không ghi cả vào thư mục tạm, thì F2 và V3 phải đổi qua một lần sửa design. Implementer không tự đổi.
- **Ràng buộc phạm vi áp cho mọi task:**
  - Không thêm dependency, runner, assertion library hay linter. `package.json`, `package-lock.json`, `tsconfig.json` không đổi.
  - Không có file mới trong `src/` hay ở gốc repo.
  - Không đụng bốn tool còn lại, ba helper fetch còn lại, `formatCitation()`, `main()`, hay artifact của `dynamic-search`/`search-unit-tests`.
  - Không làm issue #16, #19, #20.
  - Không sửa `specs/INDEX.md`: dòng của spec này do orchestrator viết khi hoàn tất.
- **Commit (nếu người dùng yêu cầu):**
  - G1 (T-1-1, T-1-2, T-1-3) là **một** commit: `src/search.ts`, `src/index.ts`, `test/search.test.ts`, 3 fixture mới, 9 fixture xóa. Build xanh sau mỗi task; `npm test` xanh từ cuối G1.
  - T-3-1, T-3-2, T-4-1 mỗi task một commit.
  - Task verify và dọn dẹp không có commit.
  - Mọi lệnh kiểm neo `d972fa6`, nên cho cùng kết quả trước và sau commit.
