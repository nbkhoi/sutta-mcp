# Tasks: unit test offline cho logic thuần của `search_topic`

**Status:** Complete
**Created:** 2026-10-20
**Spec slug:** search-unit-tests
**Design:** [design.md](./design.md)
**Requirements:** [requirements.md](./requirements.md)
**Review đã kế thừa:** [reviews/design-review-1.md](./reviews/design-review-1.md) (Approve, 0 Critical, 0 Warning, 4 Suggestion). S1, S3, S4 đã gộp vào task; S2 là việc của orchestrator. Xem §Notes.

## Conventions

- Task ID theo mẫu `T-<phase>-<n>`. Mỗi task là một thay đổi logic, kiểm được độc lập. Verify là task riêng, không nhét vào task implement.
- **Đọc tối thiểu để implement:** `design.md:61-71`. Số dòng ở đây là số dòng của `design.md` (Status Reviewed, không sửa nữa). Các khối ràng buộc có dòng neo `<!-- block: TÊN -->`: M1 (`design.md:159-373`), I1 (`:403-406`), H1 (`:410-422`), P1 (`:454-462`), T1 (`:472-778`), F1 (`:848-859`), F2 (`:861-874`), F3 (`:876-897`), F4 (`:899-941`), R-1 (`:973-977`), R-2 (`:981-984`), R-3 (`:988-991`), A-1a (`:1002-1005`), A-1b (`:1009-1012`), A-1c (`:1016-1019`), A-1d (`:1023-1026`), V2 (`:1096-1149`), V3 (`:1151-1171`), V1 (`:1192-1208`). M-1/M-2 không có fence (`:993-998`). §Lắp ráp ở `:430-448`, §Fixture ở `:802-846`, §Thứ tự áp dụng ở `:1028-1040`, luật hợp lệ của harness ở `:1074-1094`.
- **Khối [NORMATIVE] là chép nguyên văn, không phải minh họa.** Các task dưới đây **cố ý không chép lại code hay văn bản của khối nào**. Chép bằng máy: `blk TÊN > đích` (hàm `blk` lấy nguyên văn từ `design.md:436` qua khối khởi đầu). Không gõ tay, không chép từ file này, không diễn đạt lại, không format lại (kể cả comment, khoảng trắng, dòng dài). Write/Edit của công cụ soạn có thể giải mã escape hay chuẩn hóa văn bản, nên **không dùng Write/Edit để đặt nội dung khối vào file đích**; dùng `blk` qua shell. Lưới thật là `diff`. Grep chỉ là bộ tiền lọc, pass grep không có nghĩa là đúng.
- **Không có nhóm build đỏ trong spec này.** `src/search.ts` không import gì, nên tạo nó (T-2-1) không làm hỏng build. T-2-2 bỏ section search và thêm dòng import trong cùng một task. `npm run build` phải thoát 0 sau **mỗi** task code. Build đỏ ở bất kỳ điểm nào là fail, không phải trạng thái chờ.
- **Mốc so sánh cố định:** code so với `5459d5a` (lệnh §Lắp ráp đọc `git show 5459d5a:src/index.ts`), tài liệu so với `148b8c0` (lệnh tái dựng `design.md:1231-1242`). Không so với HEAD hay `master`, nên kết quả giống nhau trước và sau commit.
- **Áp dụng tài liệu từ dưới lên, định vị theo nội dung neo.** Mỗi neo phải khớp đúng 1 dòng trước khi sửa. Số dòng trong `design.md` là số đo tại `148b8c0`, chỉ dùng trong lệnh tái dựng.
- **Cấm sửa số hay literal đã pin trong spec artifact để mệnh đề pass.** Áp cho mọi task, kể cả `requirements.md`, `design.md`, các khối, bảng §Fixture, literal trong T1, `VI_TOPIC_TERMS`. Khi số đo lệch: nếu lần chạy **không hợp lệ** (định nghĩa ở dưới) thì chạy lại; nếu lần chạy **hợp lệ** thì **halt và báo cáo** kèm số đo mới có ngày. Sửa design là việc của orchestrator qua một vòng sửa design (`design.md:830`), không phải của implementer. Upstream trôi và regression có cùng triệu chứng; không cái nào biện minh cho một lần sửa spec trong task.
- **Luật hợp lệ và chạy lại (NFR-6, `design.md:1078`).** Ghi fixture: dòng `INVALID` của F2 (lỗi mạng, HTTP khác 200, body không parse được) là không hợp lệ, chỉ ghi lại đúng tên đó. A/B: cặp có lần chạy không hợp lệ thì V2 tự chạy lại cả cặp, tối đa 3 lần; quá 3 lần (`STOP:`) thì halt. Cặp hợp lệ mà lệch (`MISMATCH`) thì **halt ngay**, không chạy lại để tìm lần trùng. Mọi lần chạy live **tuần tự**, không song song, không chạy nền. Ghi số lần chạy lại vào Result.
- **Lệnh kiểm nằm trong fenced code block.** Alternation viết `|` trơn trong `grep -E`. **Cấm** chép `\|` từ ô bảng của `design.md:1214-1257`: `grep -E` đọc `\|` thành ký tự `|` literal.
- **Chạy mọi khối lệnh bằng `bash`** (ví dụ `bash -s <<'SH'` … `SH`), không qua zsh. Shell state không giữ giữa các lần gọi, nên mỗi lần gọi bắt đầu bằng **khối khởi đầu**:

  ```sh
  REPO=/Users/khoinb/worktrees/sutta-mcp/main; cd "$REPO" || exit 1
  eval "$(sed -n '435,436p' "$REPO/specs/search-unit-tests/design.md")"   # REPO, D, blk() nguyên văn từ §Lắp ráp
  E="$REPO/.claude/spec-evidence/search-unit-tests"                        # bằng chứng, gitignored (.claude/)
  AB=$(cat "$E/ab-dir.txt" 2>/dev/null)                                     # do T-1-1 tạo, ngoài repo
  track() { printf '%s\n' "$1" >> "$E/tmp-dirs.txt"; }                      # ghi mọi thư mục mktemp để T-6-1 dọn
  # AC-8: số đếm, query string, ngày ghi của 9 fixture so với bảng design.md:818-826. In COUNTS-OK.
  # Byte từng file chỉ để đối chiếu (cột "design"), không phải tiêu chí.
  counts() { sed -n '818,826p' "$D" | node -e '
  const fs=require("fs");
  const rows=fs.readFileSync(0,"utf8").trim().split("\n").map(l=>l.split("|").slice(1,-1).map(c=>c.trim().replace(/`/g,"")));
  const P="https://suttacentral.net/api/search/instant?";
  const files=fs.readdirSync("test/fixtures").sort();
  let bad=0;
  if(JSON.stringify(files)!==JSON.stringify(rows.map(c=>c[0]).sort())){bad++;console.log("FILESET-MISMATCH",files.join(" "))}
  for(const c of rows){
    const raw=fs.readFileSync("test/fixtures/"+c[0],"utf8"); const f=JSON.parse(raw); const b=f.body;
    const qs=f.url.startsWith(P)?f.url.slice(P.length):"BAD-PREFIX "+f.url;
    const qsOk=c[1].startsWith("query=")?qs===c[1]:qs.startsWith("query=mindfulness&language=en&")&&qs.endsWith(c[1].slice(1));
    const got=[b.total,b.suttaplex.length,b.hits.length], want=[c[2],c[3],c[4]].map(s=>parseInt(s));
    const ok=qsOk&&/^\d{4}-\d{2}-\d{2}$/.test(f.recorded)&&got.join("/")===want.join("/");
    if(!ok)bad++;
    console.log(ok?"OK":"MISMATCH",c[0],f.recorded,got.join("/"),"want",want.join("/"),qs,"bytes",Buffer.byteLength(raw),"design",parseInt(c[6]));
  }
  console.log(bad===0?"COUNTS-OK":"COUNTS-FAIL "+bad);process.exit(bad?1:0)'; }
  # design-review-1 S3: các expected value của T1 không có trong bảng §Fixture (danh sách uid nibbana/anatta,
  # số 7, 8, 11, 18) phải suy được từ body fixture bằng phép lọc độc lập, không gọi src/search.ts. In PROVENANCE-OK.
  provenance() { node -e '
  const fs=require("fs");
  const L=n=>JSON.parse(fs.readFileSync("test/fixtures/"+n+".json","utf8")).body;
  const ok=e=>typeof e==="object"&&e!==null&&!("category" in e)&&typeof e.uid==="string"&&e.uid!==""&&e.is_article!==true;
  const uniq=(a,seen)=>a.filter(e=>!seen.has(e.uid)&&seen.add(e.uid));
  const page1=(n,match)=>{const b=L(n);const t=match==="content"?[]:uniq(b.suttaplex.filter(ok),new Set()).slice(0,10);const c=match==="title"?[]:uniq(b.hits.filter(ok),new Set(t.map(e=>e.uid)));return [...t,...c].map(e=>e.uid)};
  const T=fs.readFileSync(process.argv[1],"utf8").replace(/\s+/g," ");
  const q=a=>a.map(u=>JSON.stringify(u)).join(", ");
  const nib=page1("nibbana-en-0","content"), ana=page1("anatta-en-0","all"), met=page1("metta-en-0","content");
  const mc=page1("mindfulness-en-0","content"), ma=page1("mindfulness-en-0","all");
  const checks=[
    ["nibbana content uids", q(nib)],
    ["anatta all uids", q(ana)],
    ["metta content count", `"content", 1)).length, ${met.length})`],
    ["anatta header", `Tìm thấy ${ana.length} sutta cho chủ đề "vô ngã"`],
    ["mindfulness content header", `Tìm thấy ${mc.length} sutta cho chủ đề "mindfulness" (trang 1):`],
    ["mindfulness all count", `uidsOf(more).length, ${ma.length})`],
  ];
  let bad=0;
  for(const [k,s] of checks){const hit=T.includes(s);if(!hit)bad++;console.log(hit?"OK":"MISSING",k,s)}
  console.log(bad===0?"PROVENANCE-OK":"PROVENANCE-FAIL "+bad);process.exit(bad?1:0)' test/search.test.ts; }
  ```

  Bằng chứng (lệnh đã chạy, exit code, dòng `*-OK`, số đếm, sha256 file đích, số lần chạy lại, đường dẫn tạm) ghi vào `$E/<task-id>.log`. `$E` nằm dưới `.claude/`, bị ignore, không vào commit. Output thô của harness, body thô và log tạm nằm trong thư mục `mktemp` dưới `/tmp/sut-*` (ngoài repo, NFR-6), được `track` ghi lại và bị xóa (task tự xóa thư mục của mình; T-6-1 dọn phần còn lại).
- **Timeout:** V2 có `sleep 20` mỗi lần chạy. Một lần gọi Bash chạy tối đa **4 input A/B** (8 lần chạy, tối đa 24 khi chạy lại), timeout 600000 ms.
- Build command: `npm run build` (tsc strict). Test command: `npm test` (có sau T-2-3, chạy được sau T-3-2). Không có linter. Không type-check file test (Q2 đã chốt, §Notes).

## Phase 1: Foundation

- [x] **T-1-1:** Dựng bản baseline `5459d5a` ngoài repo cho A/B (trước khi sửa code)
  - **Files:** — (không ghi file nào được track. Tạo `$AB` dưới `/tmp`, ghi `$E/ab-dir.txt`, `$E/tmp-dirs.txt`, `$E/T-1-1.log`)
  - **Acceptance:**
    - Chạy khi `src/`, `package.json`, `package-lock.json`, `tsconfig.json` còn trùng `5459d5a` và `test/` chưa tồn tại. Guard phải **dừng thật**, kể cả với file untracked trong `src/`.
    - `node_modules` đã cài: `node_modules/.bin/tsx` và `node_modules/.bin/tsc` tồn tại.
    - Bản cũ dựng theo `design.md:1084-1087` (`git archive 5459d5a src package.json tsconfig.json`, symlink `node_modules`, `npx tsc -p .`). Không dùng `git worktree` hay `git stash`, không ghi gì vào `.git`.
    - `$AB/base/dist/index.js` tồn tại; `$AB/work` tồn tại, rỗng. `cmp` giữa `git show 5459d5a:src/index.ts` và `$AB/base/src/index.ts` cho 0.
  - **Test:**

    ```sh
    set -e
    # khối khởi đầu (§Conventions), rồi:
    git diff --quiet 5459d5a -- src package.json package-lock.json tsconfig.json || { echo "STOP: đã khác 5459d5a"; exit 1; }
    test -z "$(git ls-files --others --exclude-standard -- src test)" || { echo "STOP: file untracked trong src/ hoặc test/"; exit 1; }
    test ! -e test || { echo "STOP: test/ đã tồn tại"; exit 1; }
    test -x node_modules/.bin/tsx && test -x node_modules/.bin/tsc
    AB=$(mktemp -d /tmp/sut-ab.XXXXXX); mkdir "$AB/base" "$AB/work"; track "$AB"
    git archive 5459d5a src package.json tsconfig.json | tar -x -C "$AB/base"
    ln -s "$REPO/node_modules" "$AB/base/node_modules"
    (cd "$AB/base" && npx tsc -p .)
    test -f "$AB/base/dist/index.js"
    git show 5459d5a:src/index.ts | cmp - "$AB/base/src/index.ts" && echo BASE-SRC-OK
    printf '%s\n' "$AB" > "$E/ab-dir.txt"
    node --version
    ```

    Ghi exit code từng bước, `node --version`, sha256 của `$AB/base/dist/index.js` vào `$E/T-1-1.log`. Guard dừng thì halt và báo cáo, không tự sửa repo cho khớp.
  - **Depends on:** —
  - **Result:** Done 2026-10-20. Test (tasks.md:89-102 + prelude :24-70, copied by `sed -n`, run in bash with xtrace) exit 0: all three guards passed (src/package*/tsconfig equal `5459d5a`, no untracked in src/test, `test/` absent), tsx/tsc present, `BASE-SRC-OK`. `$AB=/tmp/sut-ab.4qlOtb` (tracked in `$E/tmp-dirs.txt`, written to `$E/ab-dir.txt`); `base/dist/index.js` sha256 `2234ed6616aecada52da9ab6e9b02d9a20565bd709e1f6e09da174a771391732`; `work/` empty. node v22.17.0. No git worktree/stash, `git status` unchanged. Evidence: `$E/T-1-1.log`.

## Phase 2: Core Implementation

- [x] **T-2-1:** Tạo `src/search.ts` từ khối M1 (**nguyên văn**)
  - **Files:** `src/search.ts` (mới)
  - **Acceptance:**
    - `src/search.ts` = `blk M1` (212 dòng). Lệnh `design.md:440` in `SEARCH-OK`.
    - Drift cấm, vì compile sạch hoặc lọt grep (`design.md:375-381`, `:1306`): đổi thứ tự NFC/`toLowerCase`/`trim`/gộp khoảng trắng trong `resolveTopic()`; bỏ `h > 0`; bỏ `&& e.is_article !== true`; bỏ `.trim()` ở `hit.name`; quên `export` ở `SEARCH_PAGE_SIZE`/`formatTitleMatch`/`formatContentMatch`/`formatCitation`; export `VI_TOPIC_TERMS` hay `DIFFICULTY_NAMES`; thêm `import`; thêm `?.` vào `hit.uid.toUpperCase()`; cho `formatNoResults()` trả mảng.
    - Module thuần (FR-3): `grep -c -E '^(import|let|var)\b' src/search.ts` = 0; import module không in gì, mã 0.
    - Năm lệnh grep FR-5 trên `src/search.ts` đều cho 0.
    - `src/index.ts` chưa đổi (`git diff --quiet 5459d5a -- src/index.ts`). `npm run build` thoát 0 (search.ts độc lập, chưa ai import).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    sed -n '435,436p;440p' "$D" | bash                                            # SEARCH-OK
    wc -l < src/search.ts                                                         # 212
    grep -c -E '^(import|let|var)\b' src/search.ts                                # 0
    out=$(node --import tsx -e 'import("./src/search.ts")' 2>&1); echo "import exit=$? bytes=${#out}"   # 0, 0
    grep -c 'segmented' src/search.ts                                             # 0
    grep -c -F 'sujato' src/search.ts                                             # 0
    grep -c -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/search.ts   # 0
    grep -c -F 'search/instant?' src/search.ts                                    # 0
    grep -c 'fetch(' src/search.ts                                                # 0
    git diff --quiet 5459d5a -- src/index.ts; echo "index unchanged exit=$?"      # 0
    npm run build; echo "build exit=$?"                                           # 0
    shasum -a 256 src/search.ts
    ```

    Ghi vào `$E/T-2-1.log`. Không in `SEARCH-OK` thì chép lại bằng `blk M1 > src/search.ts`, không sửa `design.md`.
  - **Depends on:** T-1-1
  - **Result:** Done 2026-10-20. `src/search.ts` written only via `blk M1 > src/search.ts` (bash, prelude tasks.md:24-70 loaded by `sed -n`). Test (tasks.md:123-134) all as expected: `SEARCH-OK`; `wc -l` 212; `^(import|let|var)` 0; import exit=0 bytes=0; five FR-5 greps 0/0/0/0/0; `src/index.ts` unchanged vs `5459d5a` (exit 0); `npm run build` exit 0. sha256 `1bfbee1d10a921079650a809a13a3cececfba1481fc13f07ca12e8a51438f24e`. No divergence. Evidence: `$E/T-2-1.log`.

- [x] **T-2-2:** Tách handler `search_topic` trong `src/index.ts`: bỏ section search và `formatCitation()`, thêm I1, thay thân handler bằng H1 (**nguyên văn**)
  - **Files:** `src/index.ts`
  - **Acceptance:**
    - Guard: trước khi sửa, `git diff --quiet 5459d5a -- src/index.ts`; `src/search.ts` in `SEARCH-OK`. Lệch thì halt.
    - Dựng file bằng script theo đúng dải của `design.md:438`: `5459d5a:1-4` + `blk I1` + `5459d5a:5-39` + `5459d5a:95-126` + `5459d5a:142-205` + `blk H1` + `5459d5a:295-$`. Ba đoạn bị bỏ là `:40-94` (section search), `:127-141` (`formatCitation()` và dòng trống sau nó), `:206-294` (thân handler cũ) (`design.md:448`). Không dòng nào khác đổi.
    - Lệnh `design.md:437-439` in `ASSEMBLY-OK`; lệnh `:443-444` in `CITATION-OK`. `src/index.ts` có 436 dòng.
    - Drift cấm: giữ một bản `formatCitation()` trong `src/index.ts`; bọc `await fetchSearch(` trong `try`; tách dòng import I1 thành nhiều dòng hay đổi thứ tự tên; đổi schema zod hay chuỗi `describe()`; truyền `language` vào `formatSearchResult()`; chuyển nhánh `query === ""` vào `src/search.ts`.
    - `npm run build` thoát 0.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    sed -n '435,439p;443,445p' "$D" | bash                                        # ASSEMBLY-OK, CITATION-OK
    wc -l < src/index.ts                                                          # 436
    npm run build; echo "build exit=$?"                                           # 0
    git diff --quiet 5459d5a -- src/index.ts; echo "changed exit=$?"              # 1 (đã đổi)
    shasum -a 256 src/index.ts
    ```

    Ghi vào `$E/T-2-2.log`. Không in `ASSEMBLY-OK` thì xem `diff`, dựng lại bằng script, không sửa `design.md`.
  - **Depends on:** T-2-1
  - **Result:** Done 2026-10-20. Guard passed (`git diff --quiet 5459d5a -- src/index.ts` exit 0; `SEARCH-OK`; markers I1/H1 each match 1 line). `src/index.ts` assembled in bash only, from the ranges in `design.md:438` (`5459d5a:1-4` + `blk I1` + `:5-39` + `:95-126` + `:142-205` + `blk H1` + `:295-$`). Temp dir `/tmp/sut-T22.95L0kc` recorded with `track` and deleted. Test: `ASSEMBLY-OK`, `CITATION-OK`; `wc -l` 436; `npm run build` exit 0; `changed exit=1`. Drift probes: no `formatCitation` definition left in `src/index.ts`, 1 `await fetchSearch(` with no `try`, I1 on one line (line 5). Diff vs `5459d5a`: 7 insertions, 155 deletions. sha256 `83462b34d97363b747dd27a40a7c37a0884ebd79b01c7aa7529f7c4cd336eb68`. No divergence. Evidence: `$E/T-2-2.log`.

- [x] **T-2-3:** Thêm script `test` vào `package.json` theo khối P1 (**nguyên văn**)
  - **Files:** `package.json`
  - **Acceptance:**
    - Khối `scripts` trùng `blk P1`: lệnh `design.md:442` in `SCRIPTS-OK`.
    - Chỉ thêm dòng `test` và dấu phẩy sau dòng `start` (NFR-1): `git diff -U0 5459d5a -- package.json` có đúng 3 dòng thay đổi (1 `-`, 2 `+`), đúng ba dòng ghi ở `design.md:464`.
    - `package-lock.json` không đổi; không chạy `npm install` hay đổi dependency nào.
    - `npm test` **chưa** là tiêu chí ở task này (file test có ở T-3-2).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    sed -n '435,436p;442p' "$D" | bash                                            # SCRIPTS-OK
    git diff -U0 5459d5a -- package.json | grep -E '^[-+] '                       # đúng 3 dòng, khớp design.md:464
    git diff -U0 5459d5a -- package.json | grep -c -E '^[-+] '                    # 3
    git diff --quiet 5459d5a -- package-lock.json; echo "lock exit=$?"            # 0
    node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8"))'; echo "json exit=$?"   # 0
    ```

    Ghi vào `$E/T-2-3.log`.
  - **Depends on:** T-1-1
  - **Result:** Done 2026-10-20. `package.json` lines 11-15 (`scripts` block) replaced only via `blk P1` in bash (anchor `  "scripts": {` matched 1 line; temp dir `/tmp/sut-T23.u78OvR` recorded with `track` and deleted). Test: `SCRIPTS-OK`; `git diff -U0 5459d5a -- package.json` shows exactly 3 changed lines (1 `-`, 2 `+`), matching `design.md:464`; `package-lock.json` unchanged (exit 0); JSON parses (exit 0). `npm install` not run. sha256 `f76946f2619e6e899ef3924eb689398115c964854b7763be4db6aeb88fc30c3a`. No divergence. Evidence: `$E/T-2-3.log`.

## Phase 3: Fixture và file test

- [x] **T-3-1:** Ghi live 9 fixture (F1, F2), cắt (F3), kiểm thô so với đã cắt (F4), đối chiếu số đếm với bảng §Fixture
  - **Files:** `test/fixtures/*.json` (9 file mới: `nibbana-en-0`, `anatta-en-0`, `metta-en-0`, `xyzzyqq-en-0`, `foo-bar-en-0`, `mindfulness-en-0`, `mindfulness-en-1450`, `mindfulness-en-1460`, `vo-nga-tuong-vi-0`). Ngoài repo: `$W` dưới `/tmp`.
  - **Acceptance:**
    - Theo đúng quy trình `design.md:834-842`. Script F1..F4 lấy bằng `blk`, đặt trong `$W/bin`; body thô trong `$W/raw` (thư mục khác script). Không script ghi fixture nào nằm trong repo (NFR-4).
    - Guard: `test/fixtures` chưa tồn tại; `src/search.ts` in `SEARCH-OK` (F4 import nó).
    - Ghi: mỗi tên có dòng `OK <tên> 200`. Tên có dòng `INVALID` được ghi lại riêng (file danh sách chỉ chứa dòng đó, chạy lại F2), tối đa 3 lần mỗi tên; quá 3 lần thì halt. Ghi số lần ghi lại vào Result.
    - Cắt bằng F3 với ngày `$(date +%F)`. Fixture là đầu ra của F3, không sửa tay.
    - Kiểm F4 in **đúng** `EQUIV-OK 141 cặp output, 0 lệch` và thoát 0. **Dòng này, kèm ngày chạy, được chép vào Result của task này** (AC-8, FR-11).
    - Đối chiếu (bước 6): `counts` in `COUNTS-OK`. Nếu `COUNTS-FAIL` hay `FILESET-MISMATCH` trên lần ghi hợp lệ: **không ghi lại để tìm lần trùng**. Giữ nguyên `test/fixtures/` như đã ghi, ghi bảng số đo mới có ngày vào Result, xóa `$W`, rồi **halt và báo cáo** (`design.md:830`). Không sửa bảng §Fixture, không sửa T1.
    - `$W` bị xóa khi xong (kể cả khi halt); body thô không vào repo.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi (chạy từ gốc repo):
    test ! -e test/fixtures || { echo "STOP: test/fixtures đã tồn tại"; exit 1; }
    sed -n '435,436p;440p' "$D" | bash                                            # SEARCH-OK
    W=$(mktemp -d /tmp/sut-fx.XXXXXX); mkdir "$W/raw" "$W/bin"; track "$W"
    blk F1 > "$W/bin/fixtures.list"; blk F2 > "$W/bin/record.sh"; chmod +x "$W/bin/record.sh"
    blk F3 > "$W/bin/trim.mjs"; blk F4 > "$W/bin/equiv.mts"
    "$W/bin/record.sh" "$W/bin/fixtures.list" "$W/raw"                           # 9 dòng OK <tên> 200
    # Có dòng INVALID <tên>: grep -E "^<tên>\|" "$W/bin/fixtures.list" > "$W/bin/retry.list"; chạy lại record.sh với retry.list
    mkdir -p test/fixtures && node "$W/bin/trim.mjs" "$W/raw" test/fixtures "$(date +%F)" $(cut -d'|' -f1 "$W/bin/fixtures.list")
    node --import tsx "$W/bin/equiv.mts" "$PWD/src/search.ts" "$W/raw" "$PWD/test/fixtures" "$W/bin/fixtures.list"; echo "equiv exit=$?"
                                                                                  # EQUIV-OK 141 cặp output, 0 lệch ; 0
    counts; echo "counts exit=$?"                                                 # COUNTS-OK ; 0
    date +%F
    rm -rf "$W"; ls "$W" 2>&1                                                     # No such file or directory
    ```

    Ghi vào `$E/T-3-1.log`: toàn bộ output của F2 (mọi lần), dòng `EQUIV-OK`, output của `counts`, sha256 từng fixture, ngày ghi.
  - **Depends on:** T-2-1
  - **Result:** Done 2026-10-20. F2 run once: 9 lines `OK <name> 200`, 0 `INVALID`, 0 re-records. F3 trim dated `2026-10-20`. F4 (2026-10-20): `EQUIV-OK 141 cặp output, 0 lệch`, exit 0. `counts`: `COUNTS-OK`, exit 0. All 9 match the §Fixture table on query string, total/suttaplex/hits, and bytes. Total 52333 bytes (`cat test/fixtures/* | wc -c`), 9 files; the `highlight|translations|fuzzy_dictionary` and `fetch` greps come back empty. Scripts came from `blk` into `$W=/tmp/sut-fx.4PvSpL` (tracked, now deleted). The prelude and test lines were read from tasks.md:24-70 and :202-214 with `sed -n`. No divergence. sha256 for each fixture is in `$E/T-3-1.log`.

- [x] **T-3-2:** Tạo `test/search.test.ts` từ khối T1 (**nguyên văn**)
  - **Files:** `test/search.test.ts` (mới)
  - **Acceptance:**
    - `test/search.test.ts` = `blk T1`: lệnh `design.md:441` in `TEST-OK`. Có đúng 16 dòng bắt đầu bằng `test(`.
    - File ở dạng NFC và không có ký tự tổ hợp: case NFD dựng chuỗi bằng `.normalize("NFD")` (`design.md:782`). Một công cụ chuẩn hóa hay giải mã văn bản làm hỏng điều này thì `TEST-OK` cũng hỏng; khi đó chép lại bằng `blk`.
    - Không chuỗi `fetch` hay `src/index` trong file (AC-1, `design.md:784`).
    - Không thêm `tsconfig` hay bước type-check cho `test/` (Q2).
    - Chạy `npm test` **không** là tiêu chí ở task này; xem T-4-3.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    sed -n '435,436p;441p' "$D" | bash                                            # TEST-OK
    grep -c '^test(' test/search.test.ts                                          # 16
    node -e 'const s=require("fs").readFileSync("test/search.test.ts","utf8");console.log(s===s.normalize("NFC")?"NFC-OK":"NOT-NFC")'   # NFC-OK
    grep -c -E 'fetch|src/index' test/search.test.ts                              # 0
    ls test                                                                       # fixtures  search.test.ts
    shasum -a 256 test/search.test.ts
    ```

    Ghi vào `$E/T-3-2.log`.
  - **Depends on:** T-3-1
  - **Result:** Done 2026-10-20. `test/search.test.ts` written only by `blk T1 > test/search.test.ts` through bash (no Write/Edit); 304 lines. `design.md:441` prints `TEST-OK` (exit 0); `grep -c '^test('` = 16; `NFC-OK`; `grep -c -E 'fetch|src/index'` = 0; `ls test` = `fixtures  search.test.ts`. sha256 `20212285a4bc939880f4d976f3952931bfe71a787f0be36f521a296360f9c9ff`. Prelude read from tasks.md:24-70 with `sed -n`. No tsconfig or type-check change. No temp dirs. No divergence. Output in `$E/T-3-2.log`.

## Phase 4: Integration & Verification

- [x] **T-4-1:** Build sạch, lắp ráp toàn bộ, phạm vi diff, bất biến grep (AC-6, AC-7, FR-5)
  - **Files:** — (chỉ kiểm; ghi `$E/T-4-1.log`)
  - **Acceptance:**
    - AC-6: `rm -rf dist && npm run build` thoát 0; `find dist -type f | sort` cho đúng hai dòng `dist/index.js`, `dist/search.js`; `tsconfig.json` trùng `5459d5a`.
    - §Lắp ráp đầy đủ (`design.md:435-445`) in đủ năm dòng `ASSEMBLY-OK`, `SEARCH-OK`, `TEST-OK`, `SCRIPTS-OK`, `CITATION-OK`. Đây là lưới khóa mọi vùng được bảo vệ của spec tiền nhiệm (`design.md:92`).
    - S2 của dynamic-search chỉ đổi chỗ: lệnh `design.md:99-102` in `S2-PROVENANCE-OK`. N1-B: `grep -c -F 'extracted.source !== "translation"' src/index.ts` = 1.
    - FR-5 (bảng `design.md:1248-1257`): trên `src/index.ts` 3 / 3 / 0 / 1 / 4, literal FR-2 = 0, `'Còn kết quả',` = 1, `wc -l` 436; trên `src/search.ts` 0 cho cả năm lệnh, `wc -l` 212. Số lệch thì halt và báo cáo.
    - AC-7 (phần code): mọi đường dẫn đổi hay mới so với `148b8c0` (đã commit hay chưa) thuộc danh sách NFR-3; `package-lock.json` trùng `5459d5a`; `git diff -U0 5459d5a -- package.json` chỉ 3 dòng của P1. Ở thời điểm này README, AGENTS.md, master spec chưa đổi. `test/` có đúng 10 file (1 test, 9 fixture).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    rm -rf dist && npm run build; echo "build exit=$?"                            # 0
    find dist -type f | sort                                                      # dist/index.js, dist/search.js
    git diff --quiet 5459d5a -- tsconfig.json; echo "tsconfig exit=$?"            # 0
    sed -n '435,445p' "$D" | bash                                                 # ASSEMBLY-OK SEARCH-OK TEST-OK SCRIPTS-OK CITATION-OK
    sed -n '99,102p' "$D" | bash                                                  # S2-PROVENANCE-OK
    grep -c -F 'extracted.source !== "translation"' src/index.ts                  # 1
    for f in src/index.ts src/search.ts; do
      echo "== $f"
      grep -c 'segmented' "$f"                                                    # 3 | 0
      grep -c -F 'sujato' "$f"                                                    # 3 | 0
      grep -c -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' "$f"          # 0 | 0
      grep -c -F 'search/instant?' "$f"                                           # 1 | 0
      grep -c 'fetch(' "$f"                                                       # 4 | 0
      wc -l < "$f"                                                                # 436 | 212
    done
    grep -c -E 'Tìm thấy|Hết kết quả|Còn kết quả:|Khớp tiêu đề:|Khớp nội dung:|Không có kết quả sutta|Không tìm thấy sutta nào' src/index.ts   # 0
    grep -c -F "'Còn kết quả'," src/index.ts                                      # 1
    { git diff --name-only 148b8c0; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|test/.+|package\.json|README\.md|AGENTS\.md|specs/sutta-mcp-requirements\.md|specs/search-unit-tests/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    git diff --stat 148b8c0
    git diff --quiet 5459d5a -- package-lock.json; echo "lock exit=$?"            # 0
    git diff -U0 5459d5a -- package.json | grep -c -E '^[-+] '                    # 3
    git diff --quiet 148b8c0 -- README.md AGENTS.md specs/sutta-mcp-requirements.md; echo "docs exit=$?"   # 0
    find test -type f | sort                                                      # 10 dòng
    ```

    `specs/INDEX.md` nằm trong danh sách vì do orchestrator quản lý; nếu nó xuất hiện, ghi rõ vào Result. Ghi vào `$E/T-4-1.log`.
  - **Depends on:** T-2-2, T-2-3, T-3-2
  - **Result:** Pass 2026-10-20 (HEAD 148b8c0, chạy 1 lần, không chạy lại). `rm -rf dist && npm run build` exit 0; `dist/` = `dist/index.js`, `dist/search.js`; tsconfig exit 0. §Lắp ráp in đủ ASSEMBLY-OK, SEARCH-OK, TEST-OK, SCRIPTS-OK, CITATION-OK; S2-PROVENANCE-OK; N1-B = 1. FR-5 `src/index.ts`: 3/3/0/1/4, wc -l 436; `src/search.ts`: 0/0/0/0/0, wc -l 212; literal FR-2 = 0; `'Còn kết quả',` = 1. Allowlist NFR-3: rỗng; `specs/INDEX.md` không xuất hiện. `git diff --stat 148b8c0`: package.json 3, src/index.ts 162 (9+/156-). lock exit 0; package.json diff 3 dòng; docs exit 0; `test/` 10 file (1 test, 9 fixture). Bằng chứng: `$E/T-4-1.log`.

- [x] **T-4-2:** Kiểm tĩnh module thuần và handler chỉ nối (AC-2)
  - **Files:** — (chỉ kiểm; ghi `$E/T-4-2.log`)
  - **Acceptance:**
    - `src/search.ts` không có `import`, `let`, `var` ở cấp module; khai báo cấp module chỉ là `const`, `function`, `type` (có hoặc không `export`) (FR-3). Không chứa `fetch`, `process.`, `console.`, `require(`.
    - `src/search.ts` export các hàm của FR-1 (a)–(g) theo bảng `design.md:139-151`: `resolveTopic`, `searchOffset`, `normalizeSearchResponse`, `isSutta`, `selectPage`, `hasMore`, `formatTitleMatch`, `formatContentMatch`, `formatCitation`, `formatNoResults`, `formatSearchResult`, và hằng `SEARCH_PAGE_SIZE`. Không export `VI_TOPIC_TERMS`, `DIFFICULTY_NAMES`, `hasCategory`, `takeNew`, `formatFooter`, `termLines`.
    - Handler: `grep -c 'await fetchSearch(' src/index.ts` = 1; số dòng của `return` trong nhánh `if (query === "")` nhỏ hơn số dòng của `await fetchSearch(` (ghi hai số dòng vào Result).
    - Literal FR-2 = 0 trên `src/index.ts`, trong khi `'Còn kết quả',` = 1.
    - `node --import tsx -e 'import("./src/search.ts")'` kết thúc, mã 0, không in gì.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    grep -n -E '^(import|export|const|function|type|let|var|async)\b' src/search.ts   # chỉ export/const/function/type
    grep -c -E '^(import|let|var)\b' src/search.ts                                # 0
    grep -c -E 'fetch|process\.|console\.|require\(' src/search.ts                # 0
    grep -o -E '^export (const|function|type) [A-Za-z_]+' src/search.ts | awk '{print $3}' | sort | tr '\n' ' '; echo
    grep -c -E '^export (const|function) (VI_TOPIC_TERMS|DIFFICULTY_NAMES|hasCategory|takeNew|formatFooter|termLines)\b' src/search.ts   # 0
    grep -c 'await fetchSearch(' src/index.ts                                     # 1
    grep -n -E 'if \(query === ""\)|return \{ content: \[\{ type: "text", text: formatNoResults|await fetchSearch\(' src/index.ts
    grep -c -E 'Tìm thấy|Hết kết quả|Còn kết quả:|Khớp tiêu đề:|Khớp nội dung:|Không có kết quả sutta|Không tìm thấy sutta nào' src/index.ts   # 0
    grep -c -F "'Còn kết quả'," src/index.ts                                      # 1
    out=$(node --import tsx -e 'import("./src/search.ts")' 2>&1); echo "import exit=$? bytes=${#out}"   # 0, 0
    ```

    Danh sách export in ra phải gồm đúng 11 hàm và `SEARCH_PAGE_SIZE` của bảng `design.md:139-151`, cộng 5 kiểu (`SearchMatch`, `SearchInput`, `ResolvedTopic`, `SearchResponse`, `SearchPage`, `design.md:113-119`). Ghi vào `$E/T-4-2.log`.
  - **Depends on:** T-2-2
  - **Result:** Pass 2026-10-20 (HEAD 148b8c0, chạy 1 lần, không chạy lại). Cấp module `src/search.ts` chỉ `export const`/`const`/`export function`/`function`/`export type`; `^(import|let|var)` = 0; `fetch|process.|console.|require(` = 0. Export (17): `ResolvedTopic SEARCH_PAGE_SIZE SearchInput SearchMatch SearchPage SearchResponse formatCitation formatContentMatch formatNoResults formatSearchResult formatTitleMatch hasMore isSutta normalizeSearchResponse resolveTopic searchOffset selectPage` = 11 hàm + `SEARCH_PAGE_SIZE` + 5 kiểu; export cấm = 0. `await fetchSearch(` = 1; `if (query === "")` dòng 140, `return … formatNoResults` dòng 141 < `await fetchSearch(` dòng 143. Literal FR-2 = 0; `'Còn kết quả',` = 1. `node --import tsx -e 'import("./src/search.ts")'` exit 0, 0 byte. Bằng chứng: `$E/T-4-2.log`.

- [x] **T-4-3:** `npm test` thoát 0, offline, phủ đủ FR (AC-1, AC-3)
  - **Files:** — (chỉ kiểm; log tạm trong `$L`, `$P` dưới `/tmp`; ghi `$E/T-4-3.log`)
  - **Acceptance:**
    - AC-1: `npm test` thoát 0, TAP có `# tests 16`, `# pass 16`, `# fail 0`. Chạy lại với preload làm `globalThis.fetch` ném lỗi (`NODE_OPTIONS=--import …`): thoát 0, cùng ba số. Preload có hiệu lực: `node -e 'fetch("x")'` dưới cùng `NODE_OPTIONS` in `network disabled`.
    - AC-1: `grep -rn -E 'fetch|src/index' test/` không có dòng nào (thoát 1).
    - AC-3: không dòng `not ok`; mỗi id FR-3, FR-4, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-18, FR-19, FR-20 là tiền tố của ít nhất một dòng `ok N - <id>:`.
    - AC-3 (đọc): mỗi mục "nội dung tối thiểu" của bảng FR-12 (`requirements.md:146-159`) có assertion tương ứng trong T1, theo bảng phủ `design.md:787-800`. T1 đã khóa nguyên văn ở T-4-1 (`TEST-OK`), nên việc đọc là đối chiếu bảng phủ với file; ghi kết quả từng FR vào Result.
    - Một lần fail ở đây trên fixture đã đạt `COUNTS-OK` là mismatch hợp lệ: halt và báo cáo, không sửa T1 hay fixture.
    - `$L`, `$P` bị xóa khi xong.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    L=$(mktemp -d /tmp/sut-log.XXXXXX); track "$L"
    npm test > "$L/t1.log" 2>&1; echo "t1 exit=$?"                                # 0
    grep -E '^# (tests|pass|fail) ' "$L/t1.log"                                   # 16, 16, 0
    P=$(mktemp -d /tmp/sut-nofetch.XXXXXX); track "$P"
    echo 'globalThis.fetch = () => { throw new Error("network disabled"); };' > "$P/nofetch.mjs"
    NODE_OPTIONS="--import $P/nofetch.mjs" node -e 'fetch("x")' 2>&1 | grep -c 'network disabled'   # >=1
    NODE_OPTIONS="--import $P/nofetch.mjs" npm test > "$L/t2.log" 2>&1; echo "t2 exit=$?"          # 0
    grep -E '^# (tests|pass|fail) ' "$L/t2.log"                                   # 16, 16, 0
    grep -rn -E 'fetch|src/index' test/; echo "grep exit=$?"                      # không dòng nào, exit 1
    grep -c '^not ok' "$L/t1.log"                                                 # 0
    for id in FR-3 FR-4 FR-6 FR-7 FR-8 FR-9 FR-10 FR-11 FR-12 FR-18 FR-19 FR-20; do
      printf '%s %s\n' "$id" "$(grep -c -E "^ok [0-9]+ - $id:" "$L/t1.log")"     # mỗi id >= 1
    done
    grep -E '^(not )?ok ' "$L/t1.log"                                             # 16 dòng ok
    shasum -a 256 "$L/t1.log" "$L/t2.log"
    rm -rf "$L" "$P"
    ```

    Chép 16 dòng `ok` và ba dòng `# tests/pass/fail` của cả hai lần vào `$E/T-4-3.log` trước khi xóa `$L`.
  - **Depends on:** T-2-3, T-3-2
  - **Result:** Pass 2026-10-20 (HEAD 148b8c0, chạy 1 lần, không chạy lại). `npm test` exit 0: `# tests 16`, `# pass 16`, `# fail 0`. Preload no-fetch có hiệu lực (`network disabled` đếm 2); `npm test` dưới preload exit 0, cùng 16/16/0. `grep -rn -E 'fetch|src/index' test/` không dòng nào, exit 1. `not ok` = 0. Tiền tố FR: FR-3 2, FR-4 1, FR-6 2, FR-7 2, FR-8 1, FR-9 2, FR-10 1, FR-11 1, FR-12 1, FR-18 1, FR-19 1, FR-20 1. Đọc AC-3 (`requirements.md:146-159` đối chiếu `design.md:787-800`): cả 12 FR (FR-3, FR-4, FR-7, FR-6, FR-8, FR-9, FR-10, FR-11, FR-12, FR-18, FR-19, FR-20) đều có assertion tương ứng trong `test/search.test.ts`, không thiếu mục nào. sha256 t1.log `805c5023…`, t2.log `c2be7263…`. `$L` (`/tmp/sut-log.HyM06K`), `$P` (`/tmp/sut-nofetch.VixT3u`) đã ghi bằng `track` và đã xóa. Bằng chứng: `$E/T-4-3.log`.

- [x] **T-4-4:** Kiểm tĩnh fixture: số file, byte, field cấm, số đếm, nguồn của expected value (AC-8)
  - **Files:** — (chỉ kiểm; ghi `$E/T-4-4.log`)
  - **Acceptance:**
    - `ls test/fixtures | wc -l` = 9 (≤ 10); `cat test/fixtures/* | wc -c` ≤ 65536 (design đo 52,333; khác 52,333 mà vẫn ≤ 65536 thì chỉ ghi lại, không fail).
    - `grep -l -E '"(highlight|translations|fuzzy_dictionary)"' test/fixtures/*` rỗng; `grep -n -i fetch test/fixtures/*` rỗng.
    - Mỗi file có `url` đầy đủ và `recorded` dạng `YYYY-MM-DD`; `counts` in `COUNTS-OK` (query string in đủ, sau tiền tố 44 ký tự, gộp design-review-1 S1).
    - Result của T-3-1 có dòng `EQUIV-OK 141 cặp output, 0 lệch` kèm ngày (AC-8, mệnh đề cuối).
    - design-review-1 S3: `provenance` in `PROVENANCE-OK`, tức danh sách 8 `uid` của `nibbana` `content`, 11 `uid` của `anatta` `all`, và các số 7, 8, 11, 18 trong T1 đều suy được từ body fixture bằng phép lọc độc lập (không gọi `src/search.ts`). `PROVENANCE-FAIL` thì halt và báo cáo: literal của T1 không truy được về fixture (FR-12).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    ls test/fixtures | wc -l                                                      # 9
    cat test/fixtures/* | wc -c                                                   # <= 65536 (design: 52333)
    grep -l -E '"(highlight|translations|fuzzy_dictionary)"' test/fixtures/*; echo "forbidden exit=$?"   # rỗng, 1
    grep -n -i fetch test/fixtures/*; echo "fetch exit=$?"                        # rỗng, 1
    counts; echo "counts exit=$?"                                                 # COUNTS-OK, 0
    provenance; echo "provenance exit=$?"                                         # PROVENANCE-OK, 0
    ```

    Ghi vào `$E/T-4-4.log`.
  - **Depends on:** T-3-1, T-3-2
  - **Result:** Pass 2026-10-20 (HEAD 148b8c0, chạy 1 lần, không chạy lại). Lệnh: `sed -n '24,70p;365,370p' tasks.md | bash -s`, exit 0. 9 file; tổng 52333 byte (trùng design, ≤ 65536). Grep field cấm và grep `fetch` đều rỗng, exit 1. `counts`: `COUNTS-OK`, exit 0. Cả 9 file đều có `recorded` 2026-10-20 và query string đầy đủ sau tiền tố; total/suttaplex/hits và số byte trùng bảng §Fixture. Result của T-3-1 có `EQUIV-OK 141 cặp output, 0 lệch` ngày 2026-10-20. `provenance`: `PROVENANCE-OK`, exit 0 (8 uid nibbana content, 11 uid anatta all, các số 7, 8, 11, 18). Không chênh lệch. sha256 từng fixture ở `$E/T-4-4.log`.

- [x] **T-4-5:** Bốn đột biến FR-13 trên bản sao ngoài repo (AC-4)
  - **Files:** — (bản sao `$M` dưới `/tmp`; ghi `$E/T-4-5.log`)
  - **Acceptance:**
    - Bản sao cây làm việc ngoài repo, không kèm `.git`, `node_modules` (symlink về repo), `dist`, `.claude` (`design.md:1175`). Trước đột biến: `src/search.ts` của bản sao trùng `blk M1` và `npm test` trong bản sao thoát 0.
    - Script là `blk V1`, đặt ngoài cây bản sao. Chạy `a`, `b`, `c`, `d` lần lượt.
    - Mỗi dòng in ra có `changed=1` và `exit=` khác 0, và danh sách `failed:` chứa id FR mà AC-4 nêu: (a) FR-18, (b) FR-7, (c) FR-9, (d) FR-3. `changed` khác 1 nghĩa là pattern không khớp M1: lần chạy đó không có giá trị, halt và báo cáo.
    - Design đo danh sách đầy đủ: (a) `FR-11 FR-18`, (b) `FR-10 FR-7`, (c) `FR-9`, (d) `FR-3` (`design.md:1183-1188`). Danh sách khác mà vẫn chứa id bắt buộc thì đạt AC-4, nhưng ghi rõ chênh lệch vào Result và báo cáo. Thiếu id bắt buộc thì halt.
    - Sau bốn lần: `src/search.ts` của bản sao trùng `blk M1`, `npm test` trong bản sao thoát 0. Cây làm việc trong repo không đổi: `git status --porcelain` trước và sau giống hệt, và `SEARCH-OK` trong repo. Bản sao bị xóa.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    before=$(git status --porcelain --untracked-files=all | shasum -a 256)
    M=$(mktemp -d /tmp/sut-mut.XXXXXX); mkdir "$M/tree"; track "$M"
    tar -C "$REPO" --exclude .git --exclude node_modules --exclude dist --exclude .claude -cf - . | tar -xf - -C "$M/tree"
    ln -s "$REPO/node_modules" "$M/tree/node_modules"
    blk V1 > "$M/mutate.sh"
    diff <(blk M1) "$M/tree/src/search.ts" && echo COPY-SEARCH-OK
    (cd "$M/tree" && npm test > /dev/null 2>&1); echo "copy pre exit=$?"          # 0
    for m in a b c d; do sh "$M/mutate.sh" "$M/tree" "$m"; done                   # 4 dòng mutation …: changed=1 exit=1 failed: …
    diff <(blk M1) "$M/tree/src/search.ts" && echo COPY-REVERTED-OK
    (cd "$M/tree" && npm test > /dev/null 2>&1); echo "copy post exit=$?"         # 0
    after=$(git status --porcelain --untracked-files=all | shasum -a 256)
    [ "$before" = "$after" ] && echo REPO-UNCHANGED
    sed -n '435,436p;440p' "$D" | bash                                            # SEARCH-OK
    rm -rf "$M"; ls "$M" 2>&1                                                     # No such file or directory
    ```

    Ghi bốn dòng `mutation …` vào `$E/T-4-5.log`.
  - **Depends on:** T-4-3
  - **Result:** Pass 2026-10-20 (HEAD 148b8c0, chạy 1 lần, không chạy lại). Lệnh: `sed -n '24,70p;389,402p' tasks.md | bash -s`; exit cuối 1 là do `ls "$M"` sau `rm -rf` (No such file or directory), đúng kỳ vọng. `COPY-SEARCH-OK`, copy pre exit=0. Bốn dòng: `mutation a: changed=1 exit=1 failed: FR-11 FR-18`, `mutation b: changed=1 exit=1 failed: FR-10 FR-7`, `mutation c: changed=1 exit=1 failed: FR-9`, `mutation d: changed=1 exit=1 failed: FR-3`; trùng hoàn toàn danh sách design (`design.md:1183-1188`), không chênh lệch. `COPY-REVERTED-OK`, copy post exit=0, `REPO-UNCHANGED`, `SEARCH-OK`. Bản sao `/tmp/sut-mut.A7r8rL` đã xóa. Output ở `$E/T-4-5.log`.

- [x] **T-4-6:** A/B 18 input trùng byte với bản build `5459d5a` (AC-5)
  - **Files:** — (`$AB` của T-1-1; ghi `$E/T-4-6.log`)
  - **Acceptance:**
    - Harness là `blk V2` (`$AB/ab.sh`), input là `blk V3` (18 dòng), bản cũ `$AB/base`, bản mới là repo sau `npm run build`. Không sửa V2 hay V3.
    - Chạy tuần tự, mỗi lần gọi Bash một phần ≤ 4 input (dòng 1-4, 5-8, 9-12, 13-16, 17-18 của V3), mỗi lần gọi bắt đầu bằng `npm run build`. Mỗi phần in `AB-OK k/k`. Tổng cộng 18 dòng `MATCH`, không dòng `MISMATCH` hay `STOP:`.
    - Luật hợp lệ của V2 (`design.md:1078`): `INVALID-PAIR` được V2 tự chạy lại cả cặp, tối đa 3 lần; ghi mọi dòng `INVALID-PAIR` vào Result. `MISMATCH` trên cặp hợp lệ: halt ngay, giữ `$AB/work/old.<i>`/`new.<i>` để báo cáo, không chạy lại. `STOP:` (3 lần không hợp lệ liên tiếp): đọc `$AB/work/stderr.log`, halt và báo cáo.
    - Input 18 (`page:0`) khớp với `isError=true` ở cả hai bản (`design-review-1`, `design.md:1076`).
  - **Test:** mỗi phần một lần gọi Bash riêng, timeout 600000 ms, không chạy nền. Phần `1,4p`:

    ```sh
    # khối khởi đầu, rồi:
    test -n "$AB" && test -f "$AB/base/dist/index.js" || { echo "STOP: thiếu baseline của T-1-1"; exit 1; }
    npm run build; echo "build exit=$?"                                           # 0
    blk V2 > "$AB/ab.sh"; chmod +x "$AB/ab.sh"
    blk V3 | sed -n '1,4p' > "$AB/inputs-1.list"
    "$AB/ab.sh" "$AB/base" "$REPO" "$AB/inputs-1.list" "$AB/work"; echo "ab exit=$?"   # MATCH ×4, AB-OK 4/4, 0
    ```

    Các phần sau thay `1,4p`/`inputs-1` bằng `5,8p`/`inputs-2`, `9,12p`/`inputs-3`, `13,16p`/`inputs-4`, `17,18p`/`inputs-5`. Phần sau chỉ chạy khi phần trước in `AB-OK`. Trước phần đầu: `blk V3 | wc -l` = 18. Ghi output của từng phần (dòng `MATCH` có số byte) vào `$E/T-4-6.log`.
  - **Depends on:** T-1-1, T-4-1
  - **Result:** Pass 2026-10-20 (HEAD 148b8c0, `$AB=/tmp/sut-ab.4qlOtb` của T-1-1). Năm lần gọi Bash tuần tự, mỗi lần `sed -n '24,70p;420,424p' tasks.md | bash -s` (phần 2-5 thay `1,4p`/`inputs-1` như :427); `blk V3 | wc -l` = 18. Phần nào cũng `build exit=0` và `ab exit=0`: phần 1 (1-4) `AB-OK 4/4`, phần 2 (5-8) `AB-OK 4/4`, phần 3 (9-12) `AB-OK 4/4`, phần 4 (13-16) `AB-OK 4/4`, phần 5 (17-18) `AB-OK 2/2`. Tổng 18 dòng `MATCH`, 0 `MISMATCH`, 0 `STOP:`. `INVALID-PAIR`: không có, 0 lần chạy lại. Input 18 (`page:0`): dòng đầu của `old.2` và `new.2` đều là `isError=true`, `cmp` trùng. Lần chạy 1 bị ngắt do rate limit sau phần 1 và tiếp tục từ phần 2; phần 1 không chạy lại. Bằng chứng: `$E/T-4-6.log` (gồm một dòng kiểm isError đầu tiên dùng sai pattern và dòng đã sửa ngay sau).

## Phase 5: Tài liệu (FR-14, FR-17; trừ `AGENTS.md`)

- [x] **T-5-1:** Áp R-3, R-2, R-1 vào `README.md` (**nguyên văn**)
  - **Files:** `README.md`
  - **Acceptance:**
    - Guard: trước khi sửa, `git diff --quiet 148b8c0 -- README.md`. Lệch thì halt.
    - Áp từ dưới lên bằng script, khối lấy bằng `blk`, mỗi neo khớp đúng 1 dòng (`design.md:971-991`):
      - R-3: thay dòng bắt đầu bằng `Để thêm chủ đề tiếng Việt, thêm một cặp` bằng `blk R-3`. Hai dòng tiếp theo giữ nguyên.
      - R-2: thay dòng bắt đầu bằng `Nguồn chính của danh sách này là bảng` bằng `blk R-2`.
      - R-1: chèn `blk R-1` (2 dòng) ngay sau dòng đúng bằng `npm run build` trong khối bash của `## Cài đặt`.
    - Lệnh tái dựng `design.md:1233-1234` in `README-OK`.
    - AC-9 phần README: `npm test` có đúng một dòng trong mục `## Cài đặt`; mọi dòng có `VI_TOPIC_TERMS` trỏ `src/search.ts`, không dòng nào trỏ `src/index.ts`. Ngoài ba khối, README không đổi (FR-14).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    { sed -n '435,436p;1233,1235p' "$D"; echo 'rm -f "$R"'; } | bash             # README-OK
    awk '/^## Cài đặt$/{f=1;next} /^## /{f=0} f' README.md | grep -c -x 'npm test' # 1
    grep -n 'npm test' README.md
    grep -n 'VI_TOPIC_TERMS' README.md                                            # 2 dòng, cả hai `src/search.ts`
    grep 'VI_TOPIC_TERMS' README.md | grep -c -F 'src/index.ts'                   # 0
    git diff --stat 148b8c0 -- README.md                                          # 4 insertions, 2 deletions
    shasum -a 256 README.md
    ```

    Ghi vào `$E/T-5-1.log`.
  - **Depends on:** T-2-2, T-2-3
  - **Result:** Guard `git diff --quiet 148b8c0 -- README.md` OK. Áp R-3, R-2, R-1 từ dưới lên bằng script (`blk` + awk), mỗi neo khớp đúng 1 dòng (README:80, :76, :25). Test: `README-OK`; `npm test` trong `## Cài đặt` = 1 (README:27); `VI_TOPIC_TERMS` 2 dòng (:78, :82), cả hai `src/search.ts`; trỏ `src/index.ts` = 0; diff stat 148b8c0: 4 insertions, 2 deletions. sha256 README.md `b1fb44b0f5def1a5eb9048daebab80ea07a13e6d0d12a9e509d7f32bc0af6038`. Không chạy live, 0 lần chạy lại. Thư mục tạm `/tmp/sut-T51-m65q` đã track và đã xóa. Bằng chứng: `$E/T-5-1.log`.

- [x] **T-5-2:** Áp M-2, M-1 vào `specs/sutta-mcp-requirements.md`: hai token `src/index.ts` → `src/search.ts` (FR-17)
  - **Files:** `specs/sutta-mcp-requirements.md`
  - **Acceptance:**
    - Guard: trước khi sửa, `git diff --quiet 148b8c0 -- specs/sutta-mcp-requirements.md`; `grep -c -F 'src/index.ts'` = 2. Lệch thì halt.
    - Trên đúng hai dòng của `design.md:995-996`, định vị theo nội dung (dòng chứa ``bằng bảng tĩnh trong `src/index.ts` `` và dòng chứa ``(bảng `VI_TOPIC_TERMS` trong `src/index.ts` ``), thay token `` `src/index.ts` `` bằng `` `src/search.ts` ``. Không đổi ký tự nào khác.
    - Lệnh `design.md:1239-1240` in `MASTER-OK`.
    - AC-9 phần master spec: `grep -c -F 'src/index.ts'` = 0; `grep -c -F 'src/search.ts'` = 3; `diff` với bản `148b8c0` đã thay toàn cục bằng `sed` rỗng.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    M=specs/sutta-mcp-requirements.md
    sed -n '435p;1239,1240p' "$D" | bash                                          # MASTER-OK
    grep -c -F 'src/index.ts' "$M"                                                # 0
    grep -c -F 'src/search.ts' "$M"                                               # 3
    diff <(git show 148b8c0:"$M" | sed 's#src/index\.ts#src/search.ts#g') "$M" && echo GLOBAL-SED-OK
    git diff --stat 148b8c0 -- "$M"                                               # 2 insertions, 2 deletions
    shasum -a 256 "$M"
    ```

    Ghi vào `$E/T-5-2.log`.
  - **Depends on:** T-2-2
  - **Result:** Guard OK: `git diff --quiet 148b8c0` exit 0, `src/index.ts` = 2 (:160, :293). Áp M-2 rồi M-1 bằng script (grep -F định vị + `sed -i` trên đúng dòng), mỗi neo khớp đúng 1 dòng (:293, :160). Test (khối khởi đầu + khối Test pipe từ `sed -n` của tasks.md vào `bash -s`): `MASTER-OK`; `src/index.ts` = 0; `src/search.ts` = 3; `GLOBAL-SED-OK`; diff stat 148b8c0: 2 insertions, 2 deletions. sha256 `3199d32ac2419d734e023c59138756195c30ae7c8caf6c54ac59334e568e5922`. Không chạy live, 0 lần chạy lại, không tạo thư mục tạm. Bằng chứng: `$E/T-5-2.log`.

## Phase 6: Dọn dẹp

- [x] **T-6-1:** Dọn thư mục tạm (NFR-6) và kiểm trạng thái repo trước A-1
  - **Files:** — (`/tmp`, ngoài repo)
  - **Acceptance:**
    - Xóa **theo đúng đường dẫn đã ghi** trong `$E/tmp-dirs.txt`, không dùng glob: mỗi dòng phải có tiền tố `/tmp/sut-` (kiểm bằng `case` trước `rm -rf`). Gồm `$AB` (baseline, harness, output A/B) và mọi `$W`, `$L`, `$P`, `$M` còn sót. `node_modules` trong `$AB/base` là symlink; `rm -rf` không đi theo symlink, `node_modules` của repo còn nguyên.
    - Nếu `rm` bị từ chối (quyền), không thử cách khác: ghi các đường dẫn còn lại vào Result và báo cáo.
    - Giữ `$E` (bằng chứng, gitignored).
    - Phạm vi trước A-1: mọi đường dẫn đổi hay mới so với `148b8c0` thuộc NFR-3, và **chỉ** gồm `src/index.ts`, `src/search.ts`, `test/**`, `package.json`, `README.md`, `specs/sutta-mcp-requirements.md`, `specs/search-unit-tests/**` (cùng `specs/INDEX.md` do orchestrator quản lý, nếu có). `AGENTS.md` **chưa** đổi: `git diff --quiet 148b8c0 -- AGENTS.md` và `shasum -a 256 AGENTS.md` = `bcd1feed014c2b2c9d1addbf07807ab80257f930c92883a8ce133797240dee28`.
    - `dist/` có thể còn (gitignored); `node_modules` của repo còn nguyên (`node_modules/.bin/tsx` tồn tại).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    while IFS= read -r d; do
      case "$d" in /tmp/sut-*) rm -rf "$d"; echo "rm $d exit=$?";; *) echo "SKIP (tiền tố lạ): $d";; esac
    done < "$E/tmp-dirs.txt"
    while IFS= read -r d; do ls -d "$d" 2>&1; done < "$E/tmp-dirs.txt"            # mỗi dòng: No such file or directory
    test -x node_modules/.bin/tsx && echo NODE-MODULES-OK
    { git diff --name-only 148b8c0; git ls-files --others --exclude-standard; } | sort -u
    { git diff --name-only 148b8c0; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|test/.+|package\.json|README\.md|specs/sutta-mcp-requirements\.md|specs/search-unit-tests/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    git diff --quiet 148b8c0 -- AGENTS.md; echo "agents exit=$?"                  # 0
    shasum -a 256 AGENTS.md                                                       # bcd1feed…dee28
    ```

    Ghi vào `$E/T-6-1.log`.
  - **Depends on:** T-4-1, T-4-2, T-4-3, T-4-4, T-4-5, T-4-6, T-5-1, T-5-2
  - **Result:** Đã xóa đúng 8 đường dẫn trong `$E/tmp-dirs.txt` (`/tmp/sut-ab.4qlOtb`, `sut-T22.95L0kc`, `sut-T23.u78OvR`, `sut-fx.4PvSpL`, `sut-log.HyM06K`, `sut-nofetch.VixT3u`, `sut-mut.A7r8rL`, `sut-T51-m65q`), mỗi `rm` exit=0, `ls -d` sau đó: No such file or directory cho cả 8; không có SKIP. `NODE-MODULES-OK`. Phạm vi so với `148b8c0`: 24 đường dẫn, đều thuộc allowlist, `grep -v` rỗng. `git diff --quiet 148b8c0 -- AGENTS.md` exit=0, sha256 `bcd1feed…dee28` khớp pin. `$E` giữ nguyên. Ngoài danh sách nên không xóa: `/tmp/sut-design.KSPa0V` (không do task nào `track`). Bằng chứng: `$E/T-6-1.log`.

## Phase 7: `AGENTS.md` (task build cuối cùng)

- [x] **T-7-1:** Áp A-1d, A-1c, A-1b, A-1a vào `AGENTS.md` (**nguyên văn**), task cuối, chỉ sửa `AGENTS.md`
  - **Files:** `AGENTS.md` (duy nhất). Không đụng `specs/search-unit-tests/workflow-contract.json`, `workflow-state.json`, hay file nào khác.
  - **Acceptance:**
    - Guard: mọi task khác đã check; `git diff --quiet 148b8c0 -- AGENTS.md`; `shasum -a 256 AGENTS.md` = `bcd1feed014c2b2c9d1addbf07807ab80257f930c92883a8ce133797240dee28` (pin `context:agents`, `design.md:1030`). Lệch thì halt.
    - Áp từ dưới lên bằng script, khối lấy bằng `blk`, mỗi neo khớp đúng 1 dòng (`design.md:1000-1026`):
      - A-1d: thay dòng bắt đầu bằng ``To support another Vietnamese topic, add a `[key, term]` pair`` bằng `blk A-1d`.
      - A-1c: thay dòng bắt đầu bằng `Single-file server:` bằng `blk A-1c`. Dòng trống và `**Three layers:**` giữ nguyên.
      - A-1b: thay dòng đúng bằng `No test runner or linter is configured yet.` bằng `blk A-1b`.
      - A-1a: chèn `blk A-1a` ngay sau dòng đúng bằng `npm start        # node dist/index.js (production)`.
    - Lệnh tái dựng `design.md:1236-1237` in `AGENTS-OK`. Ngoài bốn khối, AGENTS.md không đổi (FR-15).
    - AC-9 đầy đủ (lệnh `requirements.md:292`): `npm test` có trong README và AGENTS.md; `grep -n -E 'No test runner|Single-file server|Everything lives here' AGENTS.md` rỗng; mọi dòng có `VI_TOPIC_TERMS` ở README và AGENTS.md trỏ `src/search.ts`; AGENTS.md nêu `src/search.ts`, `test/`, `test/fixtures/`; master spec 0 và 3; `README-OK`, `MASTER-OK` vẫn in.
    - Phạm vi cuối (AC-7): mọi đường dẫn đổi hay mới so với `148b8c0` thuộc NFR-3; danh sách giống T-6-1 cộng thêm đúng `AGENTS.md`.
    - Ghi sha256 mới của `AGENTS.md` vào Result. Orchestrator dùng giá trị này để đối chiếu với preview cập nhật contract.
    - **Ngay sau task này, trước code review on-completion, orchestrator chạy đường cập nhật contract** (`design.md:1028-1040`; các hàm ở `lib/workflow_contracts.py` của spec-workflow: `preview_contract_update` `:133`, `authorize_contract_update` `:189`, `write_contract_atomic` `:244`, `finish_contract_update` `:279`, `settle_contract_invalidation` `:323`, gộp design-review-1 S4): preview (thay đổi duy nhất mong đợi là `dependencies.context:agents`; có thay đổi khác thì dừng, báo người dùng), trình preview cùng scope bị ảnh hưởng `{"type":"contract","id":"dependencies.context:agents"}` cho người dùng, `authorize_contract_update` **chỉ khi người dùng đồng ý rõ ràng tại thời điểm đó**, `write_contract_atomic`, `finish_contract_update`, `settle_contract_invalidation`. Đây là việc của orchestrator, **không phải bước của implementer**: implementer không chạy hàm contract nào, không sửa `workflow-contract.json`, không authorize thay người dùng. Mệnh đề AC-10 "`shasum -a 256 AGENTS.md` bằng sha256 mới của `context:agents` trong `workflow-contract.json`" được kiểm sau bước đó, không trong task này. Người dùng không authorize thì workflow dừng ở drift; không agent nào tự khôi phục `AGENTS.md` (FR-16).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    { sed -n '435,436p;1236,1238p' "$D"; echo 'rm -f "$A"'; } | bash             # AGENTS-OK
    { sed -n '435,436p;1233,1235p' "$D"; echo 'rm -f "$R"'; } | bash             # README-OK
    sed -n '435p;1239,1240p' "$D" | bash                                          # MASTER-OK
    grep -n 'npm test' README.md AGENTS.md                                        # có ở cả hai file
    grep -n -E 'No test runner|Single-file server|Everything lives here' AGENTS.md; echo "old exit=$?"   # rỗng, 1
    grep -n 'VI_TOPIC_TERMS' README.md AGENTS.md                                  # mọi dòng nêu vị trí trỏ src/search.ts
    grep -c -F 'src/search.ts' AGENTS.md; grep -c -F 'test/fixtures/' AGENTS.md; grep -c -F 'test/' AGENTS.md   # >=1 ; >=1 ; >=1
    grep -c -F 'src/index.ts' specs/sutta-mcp-requirements.md                     # 0
    grep -c -F 'src/search.ts' specs/sutta-mcp-requirements.md                    # 3
    { git diff --name-only 148b8c0; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|test/.+|package\.json|README\.md|AGENTS\.md|specs/sutta-mcp-requirements\.md|specs/search-unit-tests/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    git diff --stat 148b8c0 -- AGENTS.md                                          # 4 insertions, 3 deletions
    shasum -a 256 AGENTS.md                                                       # ghi vào Result
    ```

    Ghi vào `$E/T-7-1.log`.
  - **Depends on:** T-6-1
  - **Result:** Guard pass (mọi task khác `[x]`; `git diff --quiet 148b8c0 -- AGENTS.md` exit 0; sha256 trước `bcd1feed…dee28`). Áp từ dưới lên bằng script, nội dung chỉ qua `blk`, mỗi neo khớp đúng 1 dòng: A-1d thay dòng 44, A-1c thay dòng 23, A-1b thay dòng 19, A-1a chèn sau dòng 16. Test (`sed -n '24,70p;534,548p' tasks.md | bash -s`, exit 0): `AGENTS-OK`, `README-OK`, `MASTER-OK`; `npm test` có ở README.md:27 và AGENTS.md:17; grep chuỗi cũ rỗng (`old exit=1`); mọi dòng nêu vị trí `VI_TOPIC_TERMS` trỏ `src/search.ts` (AGENTS.md:29 chỉ mô tả bảng, không nêu vị trí, không đổi so với `148b8c0`); đếm AGENTS.md `src/search.ts`=2, `test/fixtures/`=1, `test/`=2; master spec 0 và 3, `diff` sed của AC-9 rỗng; lọc phạm vi rỗng (AC-7); `git diff --stat 148b8c0 -- AGENTS.md` = 4 insertions, 3 deletions. **sha256 mới của `AGENTS.md`: `8acd68cd7cdd9a4021fd7245f243baed23663208943edfc79cb3d15a943ddc20`.** Không chạy lại. Thư mục tạm `/tmp/sut-T71.GMB1OK` đã track và xóa. Không đụng contract/state. Bằng chứng: `.claude/spec-evidence/search-unit-tests/T-7-1.log`.

## AC coverage

| AC / mục | Task |
|---|---|
| AC-1 (`npm test` 0, offline, không `fetch` trong `test/`) | T-4-3 |
| AC-2 (module thuần, handler chỉ nối) | T-4-2 (+ `SEARCH-OK`/`ASSEMBLY-OK` ở T-2-1, T-2-2, T-4-1) |
| AC-3 (phủ FR, tên case) | T-4-3 |
| AC-4 (đột biến) | T-4-5 |
| AC-5 (A/B 18 input) | T-4-6 (baseline ở T-1-1) |
| AC-6 (build sạch, `dist/` không có test) | T-4-1 |
| AC-7 (phạm vi diff, dependency, bất biến) | T-4-1 (code), T-6-1 (trước A-1), T-7-1 (cuối) |
| AC-8 (fixture nhỏ, có nguồn, đã cắt đúng) | T-3-1 (`EQUIV-OK`, `COUNTS-OK`), T-4-4 |
| AC-9 (tài liệu) | T-5-1 (README), T-5-2 (master spec), T-7-1 (AGENTS.md, AC-9 đầy đủ) |
| AC-10 (thứ tự AGENTS.md, contract) | T-7-1 là task cuối, chỉ sửa `AGENTS.md`; contract update và so sha256: orchestrator sau T-7-1 |
| FR-12 nguồn expected value (design-review-1 S3) | T-4-4 (`PROVENANCE-OK`) |
| Vùng được bảo vệ, S2 provenance | T-4-1 (`ASSEMBLY-OK`, `S2-PROVENANCE-OK`, N1-B) |
| Dọn dẹp (NFR-6) | mỗi task tự xóa thư mục tạm; T-6-1 |

## Dependency graph

```
T-1-1 ─┬─> T-2-1 ─┬─> T-2-2 ─┬──────────────────────────────> T-4-2 ──────────────┐
       │          │          ├──────────────────────────────> T-5-2 ──────────────┤
       │          │          └─┐                                                  │
       ├─> T-2-3 ─┼────────────┴─> T-5-1 ─────────────────────────────────────────┤
       │          └─> T-3-1 ─> T-3-2 ─┬─> T-4-1 (cũng cần T-2-2, T-2-3) ─> T-4-6 ─┤
       │                              ├─> T-4-3 (cũng cần T-2-3) ─> T-4-5 ────────┼─> T-6-1 ─> T-7-1
       │                              └─> T-4-4 ──────────────────────────────────┤
       └───────────────────────────────────────────> T-4-6 (baseline) ────────────┘
```

Task chạy mạng: T-3-1 (9 request) và T-4-6 (A/B). Hai task này không chạy song song với nhau hay với task nào khác. T-7-1 luôn là task cuối; không task nào được dispatch sau nó trước khi orchestrator settle cập nhật contract.

## Notes

- **Quyết định của người dùng (ghi lại, không mở lại):**
  - 2026-10-19: MVS. Tách logic thuần của `search_topic` sang `src/search.ts`, không đổi hành vi; test bằng `node:test` qua `tsx` (`npm test`), không thêm dependency; fixture offline ghi live, không mock `fetch`; không end-to-end test, linter, CI hay coverage (requirements, "Quyết định stakeholder").
  - 2026-10-19: FR-17. Sửa đúng hai đường dẫn `VI_TOPIC_TERMS` trong `specs/sutta-mcp-requirements.md` (`src/index.ts` → `src/search.ts`). Task T-5-2.
  - 2026-10-20: design được duyệt (Continue sau design-review-1, Approve).
  - 2026-10-20: **Q2 đã chốt: không type-check file test.** Không thêm `tsconfig` cho `test/`, không thêm `tsc --noEmit` vào `npm test`. Requirements Q2 và design §Câu hỏi mở (`design.md:75`) đã mặc định đúng lựa chọn này, nên không artifact nào cần sửa; P1 giữ nguyên.
- **design-review-1, bốn Suggestion:**
  - S1 (AC-8 cắt URL ở `slice(42)`): gộp vào hàm `counts` của khối khởi đầu, in query string sau đủ tiền tố 44 ký tự và so với cột "Query string" của bảng §Fixture. `design.md:1223` không sửa.
  - S2 (design ghi hai số cặp A/B không hợp lệ khác nhau, `:1094`/`:1220` là 3, `:1308` là 1): **việc của orchestrator**, không phải bước của task. Là bằng chứng có ngày trong design (Status Reviewed); nếu muốn thống nhất thì qua một lần sửa design. Không ảnh hưởng tiêu chí của T-4-6.
  - S3 (nguồn của một số expected value trong T1): gộp vào T-4-4 (`provenance`, suy từ body fixture bằng phép lọc độc lập). Đã thử hàm này trên bản dựng của design-review-1: in `PROVENANCE-OK`.
  - S4 (`design.md:1033` trỏ `workflow.md` cho các hàm contract): T-7-1 trỏ thẳng `lib/workflow_contracts.py` kèm số dòng.
- **Ràng buộc phạm vi áp cho mọi task:** không thêm dependency, runner, assertion library hay linter; `package-lock.json` và `tsconfig.json` không đổi; `package.json` chỉ thêm script `test`. File mới chỉ có `src/search.ts`, `test/search.test.ts`, 9 file `test/fixtures/*.json`. Không đụng `fetchSearch()`, ba helper fetch khác, schema zod và `describe()` của `search_topic`, bốn tool còn lại, `extractText()`, `formatUnavailable()`, `DIVISIONS`, `main()`, hay spec tiền nhiệm. Không làm issue #17-#20. Script ghi fixture, A/B và đột biến chỉ nằm ở `/tmp/sut-*` và bị xóa.
- **Số đo có ngày của spec khác:** lệnh §Lắp ráp của `specs/dynamic-search/design.md` không còn in `ASSEMBLY-OK` sau spec này; văn xuôi và số dòng `src/index.ts:NNN` trong các spec tiền nhiệm không sửa (`design.md:106-107`).
- **Commit (nếu được yêu cầu):** mỗi task code hay tài liệu là một commit riêng: T-2-1, T-2-2, T-2-3, T-3-1, T-3-2, T-5-1, T-5-2, T-7-1 (build xanh sau mỗi commit; `npm test` xanh từ commit T-3-2). Task verify và dọn dẹp không có commit. Mọi lệnh kiểm neo `5459d5a`/`148b8c0`, nên cho cùng kết quả trước và sau commit.
