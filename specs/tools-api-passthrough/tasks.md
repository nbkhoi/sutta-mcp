# Tasks: Năm tool là wrapper mỏng của SuttaCentral API, đặt tên theo endpoint

**Status:** Complete
**Created:** 2026-10-30
**Spec slug:** tools-api-passthrough
**Design:** [design.md](./design.md)
**Requirements:** [requirements.md](./requirements.md)
**Clarifications:** [clarifications.md](./clarifications.md)
**Review đã kế thừa:** [reviews/design-review-2.md](./reviews/design-review-2.md) (Approve, 0 Critical, 0 Warning, 1 Suggestion tùy chọn). S1 được gộp vào quy tắc của T-3-4, không sửa `design.md`. Người dùng chọn Continue ngày 2026-10-30, giữ default của Q1, Q2, Q3 (`design.md:74-76`).

## Conventions

- Task ID theo mẫu `T-<phase>-<n>` (ví dụ `T-1-2` là task 2 của phase 1).
- Mỗi task là một thay đổi logic, kiểm được độc lập, đủ nhỏ để commit riêng. Verify là task riêng, không nhét vào task implement. Task verify không sửa file được track.
- Khi xong một task: đánh dấu ô, và ghi vào **Result** ngày chạy, bằng chứng, và mọi chỗ lệch kế hoạch.
- **Đọc tối thiểu để implement:** `design.md:58-68`. Số dòng ở đây là số dòng của `design.md` (Status Reviewed, không sửa nữa).
  - Khối có dòng neo `<!-- block: TÊN -->`: P1 (`design.md:194-273`), I1 (`:288-510`), SE-1 (`:527-530`), SE-2 (`:534-537`), TS-1 (`:543-546`), PK-1 (`:550-553`), T2 (`:597-861`), F1 (`:903-909`), F2 (`:911-927`), F3 (`:929-962`), R-1 (`:992-999`), R-2 (`:1003-1012`), M-1..M-13 (`:1016-1252`), A-1..A-4 (`:1256-1294`), V3 (`:1391-1416`), V4 (`:1418-1451`), V5 (`:1453-1543`), V1 (`:1569-1587`).
  - §Lắp ráp: lệnh ở `:560-576`. §Fixture: quy tắc `:865-872`, bảng số đo `:874-887`, quy trình ghi `:889-900`. §Thứ tự áp dụng: `:1296-1311`. Harness và luật hợp lệ: `:1368-1389`. §Đột biến: `:1545-1587`. Bảng vehicle theo AC: `:1589-1610`. Lệnh tái dựng tài liệu: `:1612-1630`. Bảng grep bất biến: `:1632-1646`.
- **Khối [NORMATIVE] được chép nguyên văn bằng máy.** Các task dưới đây cố ý không chép lại code hay văn bản của khối nào.
  - Chép bằng `blk TÊN > đích`, hoặc bằng pipeline tái dựng nêu trong task. Không gõ tay, không chép từ file này, không diễn đạt lại, không format lại.
  - **Không dùng Write/Edit để đặt nội dung khối vào file đích.** Công cụ soạn có thể giải mã escape hay chuẩn hóa Unicode (T2 có chuỗi NFD dựng bằng `.normalize("NFD")`).
  - Lưới thật là `diff`: `PASSTHROUGH-OK`, `INDEX-OK`, `SEARCH-OK`, `SEARCH-INSTANT-OK`, `TEST-OK`, `SEARCHTEST-OK`, `PACKAGE-OK`, `README-OK`, `MASTER-OK`, `AGENTS-OK`. Grep chỉ là bộ tiền lọc: pass grep không có nghĩa là đúng.
- **Mốc so sánh cố định là `7dc2299`.** Mọi lệnh so với `7dc2299`, không so với HEAD hay `master`, nên cho cùng kết quả trước và sau commit.
- **Build và test giữa chừng.** Spec này **không** có nhóm task làm build đỏ. Thứ tự task được chọn để `npm run build` và `npm test` thoát 0 sau **mỗi** task code:
  - T-1-1 chỉ thêm file mới; `src/index.ts` cũ vẫn import `formatCitation` có sẵn.
  - T-1-2 thay `src/index.ts`; `formatCitation()` vẫn còn trong `src/search.ts` nhưng không ai dùng.
  - T-1-3 xóa `formatCitation()` khi không còn ai import nó.
  - T-2-1 thêm fixture mà chưa test nào đọc; `scripts.test` chưa đổi.
  - T-2-2 thêm T2 và đổi `scripts.test` (PK-1) **trong cùng task, PK-1 sau cùng**.
  - Build hay test đỏ ở bất kỳ điểm nào là fail của task đó, không phải trạng thái chờ.
- **Nhóm commit (chỉ khi người dùng yêu cầu commit; `design.md:1309`).**
  - G1 = T-1-1, T-1-2, T-1-3 là **một** commit. Ràng buộc của design là P1, I1, SE-1, SE-2 và việc xóa `formatCitation()` vào cùng một commit build được.
  - G2 = T-2-1, T-2-2 là **một** commit: T2, bốn fixture, TS-1 và PK-1.
  - T-4-1, T-4-2, T-5-1 mỗi task một commit. Task verify và dọn dẹp không có commit.
- **Cấm sửa số hay literal đã pin trong spec artifact để mệnh đề pass.** Áp cho mọi task và mọi artifact: `requirements.md`, `design.md`, các khối, bảng §Fixture, literal trong T2 và V5, số đếm grep, số dòng.
  - Số đo lệch trên một lần chạy hợp lệ thì **halt và báo cáo**, kèm số đo mới có ngày.
  - Sửa design là việc của orchestrator qua một lần sửa design (`design.md:887`), không phải của implementer.
  - Dữ liệu SC trôi và regression có cùng triệu chứng; không cái nào biện minh cho một lần sửa spec trong task.
- **Luật hợp lệ và chạy lại (NFR-5, `design.md:1370-1372`). Áp cho mọi lần chạy live: ghi fixture F2 (T-2-1), harness V3 (T-3-4), `curl` kiểm drift.**
  - Lần chạy **không hợp lệ** chỉ khi lỗi nằm ở đường truyền: V2 thoát 2 (số dòng `"id":2` khác 1, hoặc timeout 90 s) hoặc 3 (`fetch failed`); `curl` thoát khác 0 (gồm timeout 60 s) hoặc HTTP 000. F2 in `INVALID`; V3 in `INVALID … try=…`.
  - **Chỉ lần chạy không hợp lệ được chạy lại**, tối đa **3 lần chạy cho mỗi input** (lần đầu và 2 lần chạy lại). V3 tự đếm như vậy. Mọi lần chạy live **tuần tự**, không song song với nhau hay với task nào khác.
  - Mọi kết quả khác là lần chạy **hợp lệ**, kể cả `isError`, text bắt đầu bằng `SuttaCentral API error:`, `UNEXPECTED` của F2, dòng `FAIL` của V5. Lần chạy hợp lệ được so với AC. **Lệch thì halt và báo cáo, không chạy lại** để tìm lần trùng.
  - Trước khi báo một lệch: `curl -sS` lại đúng URL của dòng nguồn, pipe thẳng vào `node` chỉ in số đếm (số key, số phần tử, byte), để phân biệt SC trôi với regression.
  - **Quá trần là "inconclusive (network)"**: không phải pass, và chưa kết luận về code. Implementer dừng, báo kèm phần cuối `stderr.log`. Trước khi báo, `curl -sS -o /dev/null -w '%{http_code}\n'` tới cùng endpoint; nếu `curl` trả 200 trong khi tool fail 3 lần, ghi "nghi lỗi code". **Orchestrator quyết định** chạy lại sau hay dừng. Implementer không tự chạy lại sau trần.
- **Response thô của SuttaCentral không được ghi ra ngoài `test/fixtures/`**, và `test/fixtures/` chỉ chứa fixture đã cắt (đầu ra của F3).
  - Lệnh kiểm do task soạn giữ dữ liệu trong biến shell và pipe, không ghi file.
  - Ngoại lệ duy nhất là các script normative tự ghi file: F2 (body thô vào `$W/raw`) và V3 (output tool và body `curl` vào `$H/ac`). Hai thư mục này nằm trong `$TAP` của chính task đó và bị xóa khi task kết thúc, kể cả khi halt.
  - Không chép body, text của tool hay output `diff` dài vào `$E`, Result hay báo cáo. Chỉ ghi số đếm, mã thoát, dòng `*-OK`/`PASS`/`FAIL`, sha256 và byte.
- **Thư mục tạm.** Mọi thư mục tạm nằm dưới `/tmp/tap-*`, do khối khởi đầu tạo, ghi vào `$E/tmp-dirs.txt`, và xóa bằng `trap` khi lần gọi kết thúc. Trên macOS này, `TMPDIR` **không** đổi được chỗ của `mktemp` trần (đo 2026-10-30: `TMPDIR=/tmp/x/ mktemp -d` vẫn ra `/var/folders/…/T/`). Vì vậy khối khởi đầu định nghĩa hàm `mktemp` và `export -f` nó (kèm `export TAP`): `mktemp` không đối số và `mktemp -d` không đối số luôn dùng mẫu `$TAP/tmp.XXXXXX`, trong shell hiện tại và trong mọi tiến trình `bash` con (`asm`, `docs`, `sed … | bash`), nên mọi `mktemp` trần của task và của các khối design (`design.md:565`, `:894`, `:1376`, `:1550`, `:1606`, `:1616-1624`) rơi vào `$TAP`. Gọi `mktemp` có mẫu tường minh thì chuyển nguyên cho `command mktemp`. Khối khởi đầu tự kiểm `mktemp -d` và `bash -c mktemp` đều trả đường dẫn dưới `$TAP`, lệch thì halt. **Không đọc, ghi, hay dọn bất kỳ thứ gì dưới `/private/tmp/claude-*`** (thư mục tạm của phiên công cụ). Dọn dẹp chỉ xóa đường dẫn có trong `tmp-dirs.txt` và khớp `/tmp/tap-*`.
- **Lệnh kiểm nằm trong fenced code block.** Alternation viết `|` trơn trong `grep -E`. **Cấm** chép `\|` từ ô bảng của `design.md:1589-1646`: `grep -E` đọc `\|` thành ký tự `|` literal.
- **Chạy mọi khối lệnh bằng `bash`** (`bash -s <<'SH'` … `SH`), không qua zsh. Shell state không giữ giữa các lần gọi, nên mỗi lần gọi bắt đầu bằng **khối khởi đầu**:

  ```sh
  REPO=/Users/khoinb/worktrees/sutta-mcp/main; cd "$REPO" || exit 1
  eval "$(sed -n '560,561p' "$REPO/specs/tools-api-passthrough/design.md")"   # REPO, D, blk() nguyên văn từ §Lắp ráp
  E="$REPO/.claude/spec-evidence/tools-api-passthrough"; mkdir -p "$E"         # bằng chứng, gitignored (.claude/)
  track() { printf '%s\n' "$1" >> "$E/tmp-dirs.txt"; }                         # ghi mọi thư mục tạm để T-4-3 kiểm
  TAP=$(mktemp -d /tmp/tap-XXXXXX) || exit 1; track "$TAP"
  # TMPDIR không có tác dụng với mktemp trên macOS: ép mọi mktemp trần (shell này và bash con) vào $TAP.
  mktemp() { if [ $# -eq 0 ]; then command mktemp "$TAP/tmp.XXXXXX"; elif [ "$1" = -d ] && [ $# -eq 1 ]; then command mktemp -d "$TAP/tmp.XXXXXX"; else command mktemp "$@"; fi; }
  export TAP; export -f mktemp
  trap 'rm -rf "$TAP"' EXIT                                                     # xóa khi kết thúc, kể cả khi halt
  for t in "$(mktemp -d)" "$(bash -c mktemp)"; do case "$t" in "$TAP"/tmp.*) rm -rf "$t";; *) echo "STOP: mktemp ra ngoài \$TAP: $t"; exit 1;; esac; done   # tự kiểm
  # asm <dải dòng sed của design.md:560-576>: chạy một phần lệnh §Lắp ráp; luôn kèm 560-561 (REPO, D, blk).
  asm() { sed -n "560,561p;$1" "$D" | bash; }
  # docs <README|MASTER|AGENTS>: chạy đúng một phần của lệnh tái dựng tài liệu (design.md:1614-1628).
  docs() { case "$1" in README) r='1616,1618p'; v=R;; MASTER) r='1619,1623p'; v=S;; AGENTS) r='1624,1626p'; v=A;; esac
    { sed -n "560,561p;$r" "$D"; echo "rm -f \"\$$v\""; } | bash; }
  # fxcheck: 7 file của test/fixtures/ so với bảng §Fixture (design.md:878-885). In FIXTURES-OK.
  fxcheck() { node -e '
  const fs=require("fs");
  const W={"bilarasuttas-dn22-sujato.json":["get_bilarasuttas","bilarasuttas/dn22/sujato",2804],
    "suttaplex-mn10.json":["get_suttaplex","suttaplex/mn10",1295],
    "parallels-mn10.json":["get_parallels","parallels/mn10",11410],
    "menu.json":["get_menu","menu",7711]};
  const OLD=["anatta-en.json","foo-bar-en.json","vo-nga-vi-pli.json"];
  const files=fs.readdirSync("test/fixtures").sort(); let bad=0, total=0;
  if(JSON.stringify(files)!==JSON.stringify([...Object.keys(W),...OLD].sort())){bad++;console.log("FILESET-MISMATCH",files.join(" "));}
  for(const n of files){ const raw=fs.readFileSync("test/fixtures/"+n,"utf8"); total+=Buffer.byteLength(raw); const f=JSON.parse(raw);
    if(!(typeof f.url==="string"&&f.url.startsWith("https://suttacentral.net/api/")&&/^\d{4}-\d{2}-\d{2}$/.test(f.recorded))){bad++;console.log("NO-URL-OR-DATE",n);}
    if(/"(highlight|translations)"/.test(raw)){bad++;console.log("FORBIDDEN-KEY",n);}
    const w=W[n]; if(!w) continue;
    const got=[f.tool,f.url.slice(29),Buffer.byteLength(raw)];
    const ok=JSON.stringify(Object.keys(f))===JSON.stringify(["url","recorded","tool","params","body"])&&JSON.stringify(got)===JSON.stringify(w);
    if(!ok)bad++; console.log(ok?"OK":"MISMATCH",n,f.recorded,JSON.stringify(got)); }
  const ok2=files.length<=10&&total<=65536&&total===38443; if(!ok2)bad++;
  console.log(ok2?"OK":"MISMATCH","fixtures",files.length,total);
  console.log(bad===0?"FIXTURES-OK":"FIXTURES-FAIL "+bad); process.exit(bad?1:0)'; }
  ```

  Bằng chứng ghi vào `$E/<task-id>.log`: lệnh đã chạy, mã thoát, dòng `*-OK`/`PASS`, số đếm, sha256 file đích, số lần chạy lại, đường dẫn `$TAP`. `$E` nằm dưới `.claude/`, bị ignore, không vào commit.
- **Timeout.** Một lần gọi Bash tối đa 600000 ms. T-3-4 (harness, 31 dòng V4) có thể vượt mức đó khi có chạy lại: chạy nó bằng `run_in_background` và chờ thông báo kết thúc. Lần gọi hết giờ mà chưa có kết quả là inconclusive (network) theo luật trên, không phải pass.
- Build command: `npm run build` (tsc strict). Test command: `npm test` (`node:test` qua `tsx`). Không có linter.

## Phase 1: Code (nhóm commit G1)

- [x] **T-1-1:** Tạo `src/passthrough.ts` từ khối P1 (**nguyên văn**)
  - **Files:** `src/passthrough.ts` (mới, duy nhất)
  - **Acceptance:**
    - Guard trước khi ghi, lệch thì halt:
      - `src/`, `test/`, `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `AGENTS.md`, `specs/sutta-mcp-requirements.md` trùng `7dc2299`.
      - `src/passthrough.ts` chưa tồn tại. Không có file untracked trong `src/` hay `test/`.
      - `node_modules/.bin/tsx` và `node_modules/.bin/tsc` tồn tại.
      - `shasum -a 256 AGENTS.md` = `4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b` (pin `context:agents`, `design.md:1298`).
    - Ghi chỉ bằng `blk P1 > src/passthrough.ts` qua bash.
    - `asm '562p'` in `PASSTHROUGH-OK`. `wc -l` = 77. Không có dòng `import`. `grep -c -E '^(let|var|const) '` = 0 (FR-16).
    - Drift cấm, vì compile sạch (`design.md:275-282`): thêm `?? "en"` hay `?? "sujato"`; `trim`/`toLowerCase`/`normalize` tham số; bỏ `export`; đổi `{}`/`[]` của `head()` thành dấu ngoặc trần; lọc chuỗi rỗng; thêm `try`/`catch` quanh `JSON.parse`; thêm `import` (kể cả từ `./search.js`).
    - `npm run build` thoát 0; `dist/passthrough.js` có mặt. `npm test` thoát 0 (chưa có test mới; `src/index.ts` cũ vẫn build).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    git diff --quiet 7dc2299 -- src test package.json package-lock.json tsconfig.json README.md AGENTS.md specs/sutta-mcp-requirements.md || { echo "STOP: đã khác 7dc2299"; exit 1; }
    test -z "$(git ls-files --others --exclude-standard -- src test)" || { echo "STOP: file untracked trong src/ hoặc test/"; exit 1; }
    test ! -e src/passthrough.ts || { echo "STOP: src/passthrough.ts đã có"; exit 1; }
    test -x node_modules/.bin/tsx && test -x node_modules/.bin/tsc || { echo "STOP: thiếu node_modules"; exit 1; }
    [ "$(shasum -a 256 AGENTS.md | cut -d' ' -f1)" = 4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b ] || { echo "STOP: AGENTS.md drift"; exit 1; }
    blk P1 > src/passthrough.ts
    asm '562p'                                                                    # PASSTHROUGH-OK
    wc -l < src/passthrough.ts                                                    # 77
    grep -c -E '^import |^(let|var|const) ' src/passthrough.ts                    # 0
    npm run build > /dev/null; echo "build exit=$?"; ls dist/passthrough.js       # 0 ; dist/passthrough.js
    npm test 2>&1 | grep -E '^# (pass|fail) '; echo "test exit=${PIPESTATUS[0]}"  # 11, 0 ; 0
    shasum -a 256 src/passthrough.ts
    ```

    Ghi vào `$E/T-1-1.log`. Không in `PASSTHROUGH-OK` thì ghi lại bằng `blk`, không sửa tay, không sửa `design.md`.
  - **Depends on:** —
  - **Result:** 2026-10-30. Guard pass (diff với `7dc2299` rỗng, không untracked trong `src/`/`test/`, `src/passthrough.ts` chưa có, `tsx`/`tsc` có, sha256 `AGENTS.md` = `4c8b646d…a038a02b`). Ghi bằng `blk P1 > src/passthrough.ts` một lần. `asm '562p'` in `PASSTHROUGH-OK`; `wc -l` = 77; grep `import`/`let|var|const` = 0. `npm run build` exit 0, `dist/passthrough.js` có mặt; `npm test` exit 0 (`# pass 11`, `# fail 0`). sha256 `src/passthrough.ts` = `f83a4d3270d13e145e4f7e8da2a5efdbb18fcca53ba8bcbf1fff5fe2c18466bd`, 4264 byte. Không chạy lại, không lệch kế hoạch. `$TAP` = `/tmp/tap-lKnMjM` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-1-1.log`.

- [x] **T-1-2:** Thay toàn bộ `src/index.ts` bằng khối I1 (**nguyên văn**)
  - **Files:** `src/index.ts`
  - **Acceptance:**
    - Guard: `src/index.ts` trùng `7dc2299`; `asm '562p'` in `PASSTHROUGH-OK` (I1 import `./passthrough.js`).
    - Ghi chỉ bằng `blk I1 > src/index.ts` qua bash.
    - `asm '563p'` in `INDEX-OK`. `asm '565p;571,576p'` in `SEARCH-INSTANT-OK` (vùng được bảo vệ, `design.md:81`: khối tool search trùng `7dc2299:src/index.ts:99-157` trừ tên ở hai dòng và câu `S`). `wc -l` = 220.
    - Ba helper `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels`, `extractText`, `formatUnavailable`, `DIVISIONS`, `PITAKA_LABELS`, `formatDivisions`, `SC_BASE` không còn trong `src/index.ts` (`design.md:970`).
    - Drift cấm, vì compile sạch hoặc lọt grep (`design.md:512-521`): gộp bốn handler vào một hàm chung (Alternative B); bọc `fetch(url)` trong helper hay dựng URL thứ hai; thêm `.default()` cho tham số API; thêm `try`/`catch`, retry hay fallback; đổi thứ tự tool hay property; sửa chữ `describe()`.
    - `npm run build` thoát 0. `npm test` thoát 0 (case search không đổi).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    git diff --quiet 7dc2299 -- src/index.ts || { echo "STOP: src/index.ts đã khác 7dc2299"; exit 1; }
    asm '562p' | grep -qx PASSTHROUGH-OK || { echo "STOP: thiếu P1"; exit 1; }
    blk I1 > src/index.ts
    asm '563p'                                                                    # INDEX-OK
    asm '565p;571,576p'                                                           # SEARCH-INSTANT-OK
    wc -l < src/index.ts                                                          # 220
    grep -c -E 'fetchSuttaplex|fetchBilaraText|fetchParallels|extractText|formatUnavailable|DIVISIONS|PITAKA_LABELS|formatDivisions|SC_BASE' src/index.ts   # 0
    npm run build > /dev/null; echo "build exit=$?"                               # 0
    npm test 2>&1 | grep -E '^# (pass|fail) '; echo "test exit=${PIPESTATUS[0]}"  # 11, 0 ; 0
    shasum -a 256 src/index.ts
    ```

    Ghi vào `$E/T-1-2.log`.
  - **Depends on:** T-1-1
  - **Result:** 2026-10-30. Guard pass (`src/index.ts` trùng `7dc2299`; `asm '562p'` in `PASSTHROUGH-OK`). Ghi bằng `blk I1 > src/index.ts` một lần. `asm '563p'` in `INDEX-OK`; `asm '565p;571,576p'` in `SEARCH-INSTANT-OK`; `wc -l` = 220; grep helper cũ (`fetchSuttaplex|…|SC_BASE`) = 0. `npm run build` exit 0; `npm test` exit 0 (`# pass 11`, `# fail 0`). sha256 `src/index.ts` = `8e97bd6062254ffb42b4deb5a501c82740474d606ab59635f3ee00688c9cecf4`, 17150 byte. Không chạy lại, không lệch kế hoạch. `$TAP` = `/tmp/tap-mYIMyC` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-1-2.log`.

- [x] **T-1-3:** Áp SE-1, SE-2 và xóa `formatCitation()` (`src/search.ts:151-167`)
  - **Files:** `src/search.ts`
  - **Acceptance:**
    - Guard, lệch thì halt:
      - `src/search.ts` trùng `7dc2299`; `asm '563p'` in `INDEX-OK` (không còn ai import `formatCitation`).
      - Neo: `:1` bắt đầu bằng `// Logic thuần của tool search_topic`; `:6` bắt đầu bằng `// ─── search_topic: wrapper mỏng`; `:150` là `}`; `:151` trống; `:152` bắt đầu bằng `// ─── Citation dùng chung`; file có 167 dòng.
    - Ghi bằng pipeline của `design.md:565-566`, chép qua `blk`: `blk SE-1` + `7dc2299:2-5` + `blk SE-2` + `7dc2299:7-150`.
    - `asm '565,566p;576p'` in `SEARCH-OK`. `wc -l` = 150. `buildSearchUrl()`, `renderSearch()` và các hàm private không đổi từng byte (vùng được bảo vệ, `design.md:80`); `SEARCH-OK` khóa điều đó.
    - `cat src/*.ts | grep -c -F formatCitation` = 0.
    - `npm run build` thoát 0. `npm test` thoát 0 (case search không đổi; `test/search.test.ts` không import `formatCitation`).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    git diff --quiet 7dc2299 -- src/search.ts || { echo "STOP: src/search.ts đã khác 7dc2299"; exit 1; }
    asm '563p' | grep -qx INDEX-OK || { echo "STOP: thiếu I1"; exit 1; }
    for n in 1 6 150 151 152; do printf '%s: ' "$n"; sed -n "${n}p" src/search.ts | cut -c1-50; done; wc -l < src/search.ts   # khớp neo ; 167
    O=$(mktemp); git show 7dc2299:src/search.ts > "$O"
    { blk SE-1; sed -n '2,5p' "$O"; blk SE-2; sed -n '7,150p' "$O"; } > src/search.ts; rm -f "$O"
    asm '565,566p;576p'                                                           # SEARCH-OK
    wc -l < src/search.ts                                                         # 150
    cat src/*.ts | grep -c -F formatCitation                                      # 0
    npm run build > /dev/null; echo "build exit=$?"                               # 0
    npm test 2>&1 | grep -E '^# (pass|fail) '; echo "test exit=${PIPESTATUS[0]}"  # 11, 0 ; 0
    shasum -a 256 src/search.ts
    ```

    Ghi vào `$E/T-1-3.log`. Sau task này, G1 (T-1-1..T-1-3) là một commit nếu người dùng yêu cầu commit.
  - **Depends on:** T-1-2
  - **Result:** 2026-10-30. Guard pass (`src/search.ts` trùng `7dc2299`; `asm '563p'` in `INDEX-OK`; neo `:1`, `:6`, `:150` = `}`, `:151` trống, `:152`, 167 dòng, kiểm bằng điều kiện halt tự động trước khi ghi). Ghi bằng pipeline `blk SE-1` + `7dc2299:2-5` + `blk SE-2` + `7dc2299:7-150` một lần. `asm '565,566p;576p'` in `SEARCH-OK`; `wc -l` = 150; `cat src/*.ts | grep -c -F formatCitation` = 0. `npm run build` exit 0; `npm test` exit 0 (`# pass 11`, `# fail 0`). sha256 `src/search.ts` = `f75e5ee55e80039439e00087af9d66485dc68e794130917318c5b9da14a70703`, 6956 byte. Không chạy lại. Lệch quy ước (không ảnh hưởng kết quả): `mktemp` trần trên macOS bỏ qua `TMPDIR`, nên `$O` rơi vào `/var/folders/xn/…/T/tmp.XM50n4bbrZ` thay vì `$TAP`. File chỉ chứa `7dc2299:src/search.ts` (không phải response SC), bị `rm -f` ngay sau đó, đã kiểm là không còn. `asm '565p;…'` của T-1-2 cũng dùng cùng lệnh `mktemp` (`design.md:565`, `rm -f` ở `:576`). `$TAP` = `/tmp/tap-mYXqBL` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-1-3.log`.

## Phase 2: Fixture và test (nhóm commit G2)

- [x] **T-2-1:** Ghi live 4 fixture (F1, F2), cắt (F3), kiểm lại phép cắt, đối chiếu bảng §Fixture
  - **Files:**
    - 4 file mới: `test/fixtures/bilarasuttas-dn22-sujato.json`, `test/fixtures/suttaplex-mn10.json`, `test/fixtures/parallels-mn10.json`, `test/fixtures/menu.json`.
    - 3 fixture search hiện có không đổi (C11, `design.md:869`).
    - Ngoài repo: `$W` trong `$TAP`.
  - **Acceptance:**
    - Theo đúng quy trình `design.md:891-898`. Script F1, F2, F3 lấy bằng `blk` và đặt trong `$W/bin`. Body thô nằm trong `$W/raw`, thư mục khác với script. Không có script ghi fixture nào trong repo, và không có script tải hàng loạt (NFR-4).
    - Guard: `asm '562p'` in `PASSTHROUGH-OK` (F2 import `src/passthrough.ts`). Bốn fixture mới chưa tồn tại. Ba fixture search trùng `7dc2299`.
    - Kiểm trước khi ghi: các hàm dựng URL của P1 dựng được URL cho cả 4 dòng F1, đúng thứ tự: `https://suttacentral.net/api/bilarasuttas/dn22/sujato`, `…/api/suttaplex/mn10`, `…/api/parallels/mn10`, `…/api/menu`. Lệch hoặc rỗng: halt, không ghi. (F2 không phân biệt URL rỗng với lỗi truyền tải, nên phải kiểm trước.)
    - Ghi (`design.md:895`):
      - Mỗi tên phải có dòng `OK <tên> 200 <url>`.
      - Dòng `INVALID <tên> …` là lần chạy không hợp lệ. Ghi lại riêng tên đó, bằng một file danh sách chỉ chứa dòng F1 của nó. Tối đa 3 lần chạy cho mỗi tên. Quá trần thì báo inconclusive (network) và orchestrator quyết định.
      - Dòng `UNEXPECTED`: halt và báo, không ghi lại.
      - Khi halt trước bước cắt: không ghi gì vào `test/fixtures/`.
    - Chỉ khi cả 4 tên đều `OK`: cắt bằng F3 với ngày `$(date +%F)`. Fixture là đầu ra của F3, không sửa tay.
    - F3 in đúng 4 dòng `bilarasuttas-dn22-sujato 2804`, `suttaplex-mn10 1295`, `parallels-mn10 11410`, `menu 7711`.
    - Kiểm lại phép cắt (bước 5, AC-12): cắt lại vào `$W/re` rồi `cmp` từng file với `test/fixtures/`. Không dòng `FIXTURE-MISMATCH` nào.
    - `fxcheck` in `FIXTURES-OK`: 7 file, 38,443 B; `grep -l -E '"(highlight|translations)"' test/fixtures/*` rỗng.
    - **Fixture lệch bảng §Fixture trên lần ghi hợp lệ** (số byte, `FIXTURES-FAIL`, `FIXTURE-MISMATCH`): đó là SC trôi hoặc lỗi, **không phải lần chạy không hợp lệ** (`design.md:887`).
      - Không ghi lại để tìm lần trùng.
      - Giữ nguyên 4 file như đã ghi (untracked), ghi số đo mới có ngày vào Result, rồi **halt và báo cáo**. Không làm T-2-2.
      - Không sửa bảng §Fixture, T2, F3 hay `fxcheck`.
    - `$W` bị xóa khi xong, kể cả khi halt (`trap` của khối khởi đầu). Body thô không vào repo, `$E` hay Result.
    - `npm test` vẫn thoát 0 (`scripts.test` chưa đổi; chưa test nào đọc fixture mới).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi (chạy từ gốc repo):
    asm '562p' | grep -qx PASSTHROUGH-OK || { echo "STOP: thiếu P1"; exit 1; }
    ls test/fixtures/bilarasuttas-dn22-sujato.json test/fixtures/suttaplex-mn10.json test/fixtures/parallels-mn10.json test/fixtures/menu.json 2>/dev/null && { echo "STOP: fixture mới đã có"; exit 1; }
    git diff --quiet 7dc2299 -- test/fixtures || { echo "STOP: fixture search đã khác 7dc2299"; exit 1; }
    W=$(mktemp -d); mkdir "$W/raw" "$W/bin"
    blk F1 > "$W/bin/fixtures.list"; blk F2 > "$W/bin/record.sh"; chmod +x "$W/bin/record.sh"; blk F3 > "$W/bin/trim.mjs"
    node --import tsx -e 'const fs=require("fs");const F={get_bilarasuttas:"buildBilarasuttasUrl",get_suttaplex:"buildSuttaplexUrl",get_parallels:"buildParallelsUrl",get_menu:"buildMenuUrl"};import(require("node:url").pathToFileURL(process.argv[1]).href).then(m=>{for(const row of fs.readFileSync(process.argv[2],"utf8").trim().split("\n")){const [n,t,p]=row.split("|");console.log(n,m[F[t]](JSON.parse(p)))}})' "$PWD/src/passthrough.ts" "$W/bin/fixtures.list"
                                                                                  # 4 dòng <tên> <URL> như Acceptance
    "$W/bin/record.sh" "$PWD/src/passthrough.ts" "$W/bin/fixtures.list" "$W/raw"  # 4 dòng OK <tên> 200 <url>
    # Có dòng INVALID <tên>: grep -E "^<tên>\|" "$W/bin/fixtures.list" > "$W/bin/retry.list"; chạy lại record.sh với retry.list (tối đa 3 lần chạy mỗi tên)
    # Có dòng UNEXPECTED: halt (trap xóa $W).
    node "$W/bin/trim.mjs" "$W/raw" test/fixtures "$(date +%F)" "$W/bin/fixtures.list"; echo "trim exit=$?"
                                                                                  # 4 dòng tên + byte như Acceptance ; 0
    mkdir "$W/re" && node "$W/bin/trim.mjs" "$W/raw" "$W/re" "$(date +%F)" "$W/bin/fixtures.list" > /dev/null \
      && for f in "$W"/re/*.json; do cmp "$f" "test/fixtures/$(basename "$f")" || echo "FIXTURE-MISMATCH $f"; done; echo "recheck done"
                                                                                  # chỉ "recheck done"
    fxcheck; echo "fxcheck exit=$?"                                               # FIXTURES-OK ; 0
    git diff --quiet 7dc2299 -- test/fixtures; echo "old fixtures exit=$?"       # 0
    npm test 2>&1 | grep -E '^# (pass|fail) '; echo "test exit=${PIPESTATUS[0]}"  # 11, 0 ; 0
    date +%F
    shasum -a 256 test/fixtures/bilarasuttas-dn22-sujato.json test/fixtures/suttaplex-mn10.json test/fixtures/parallels-mn10.json test/fixtures/menu.json
    ```

    Ghi vào `$E/T-2-1.log`: các dòng `OK`/`INVALID`/`UNEXPECTED` của F2 (mọi lần), 4 dòng của F3, output của `fxcheck`, sha256 từng fixture, ngày ghi, số lần chạy lại.
  - **Depends on:** T-1-1
  - **Result:** 2026-10-30. Guard pass (`PASSTHROUGH-OK`; 4 fixture mới chưa có; `test/fixtures` trùng `7dc2299`); khối khởi đầu mới tự kiểm `mktemp` pass, `$W` = `$TAP/tmp.9TfQ2F`. Kiểm URL trước khi ghi: 4 URL đúng thứ tự (`URL-PRECHECK-OK`). F2 lần chạy 1: 4 dòng `OK <tên> 200 <url>`, 0 `INVALID`, 0 `UNEXPECTED`, 0 lần chạy lại. F3 (`recorded` = `2026-10-30`) in `bilarasuttas-dn22-sujato 2804`, `suttaplex-mn10 1295`, `parallels-mn10 11410`, `menu 7711`, khớp bảng §Fixture. Kiểm lại phép cắt: không `FIXTURE-MISMATCH`. `fxcheck` in `FIXTURES-OK` (7 file, 38443 B); grep `highlight|translations` rỗng; 3 fixture search trùng `7dc2299`. `npm test` exit 0 (`# pass 11`, `# fail 0`). sha256: `bilarasuttas-dn22-sujato.json` `c3d0eae57506a033e608356b6d7b52021d6a7c418107dab547c435748d811fd6`, `suttaplex-mn10.json` `5645da64f76377e65e5983efcc0f72b1d4695380e5a74517e3cdf7736b13a9a6`, `parallels-mn10.json` `dc5065ddbe6e4b1b20f42ed908b1c03c4d7c8336ad28647f007b044bdaeb81c2`, `menu.json` `56694850fad4d19da1672828c6d8df3ea8b124923df32af741ddc24ea10419ba`. Lệch: lệnh của tôi in `trim exit=$?` sau `echo`, nên mã thoát của F3 không được ghi trực tiếp; thay bằng 4 dòng F3 đầy đủ, recheck sạch và `FIXTURES-OK`. Thêm guard ngoài kế hoạch: halt nếu có file untracked trong `test/fixtures` (pass). `$TAP` = `/tmp/tap-NXc95k` (đã xóa, cùng `$W` và body thô). Log: `.claude/spec-evidence/tools-api-passthrough/T-2-1.log`.

- [x] **T-2-2:** Thêm `test/passthrough.test.ts` (T2), áp TS-1 rồi PK-1 (**nguyên văn**); `npm test` xanh với 20 case
  - **Files:** `test/passthrough.test.ts` (mới), `test/search.test.ts` (dòng 1), `package.json` (dòng 15, `scripts.test`)
  - **Acceptance:**
    - Guard, lệch thì halt: `fxcheck` in `FIXTURES-OK`; `test/passthrough.test.ts` chưa tồn tại; `test/search.test.ts` và `package.json` trùng `7dc2299`; `package.json:15` là `    "test": "tsx --test test/search.test.ts"`.
    - Ghi chỉ qua bash, theo thứ tự này (`design.md:1309`: PK-1 vào cùng task với T2, sau T2 và fixture):
      1. `blk T2 > test/passthrough.test.ts`.
      2. TS-1 bằng pipeline của `design.md:567-568`: `blk TS-1` + `7dc2299:test/search.test.ts:2-$`.
      3. PK-1 bằng pipeline của `design.md:569-570`: `7dc2299:package.json:1-14` + `blk PK-1` + `7dc2299:package.json:16-$`.
    - `asm '564p'` in `TEST-OK`; `asm '565p;567,570p;576p'` in `SEARCHTEST-OK` và `PACKAGE-OK`.
    - `test/passthrough.test.ts`: 262 dòng, đúng 9 dòng bắt đầu bằng `test(`, ở dạng NFC, không có chuỗi `fetch` hay `src/index` (FR-17).
    - Case search không đổi, trừ comment dòng 1 (vùng được bảo vệ, `design.md:82`): `git diff 7dc2299 -- test/search.test.ts` chỉ đổi dòng 1.
    - `npm test` thoát 0, TAP có `# tests 20`, `# pass 20`, `# fail 0`.
    - Một case fail trên fixture đã đạt `FIXTURES-OK` là lệch hợp lệ: halt và báo cáo. Không sửa T2, fixture hay P1.
    - Không thêm `tsconfig` hay bước type-check cho `test/`. `package.json` chỉ đổi `scripts.test`; `package-lock.json` không đổi (NFR-1).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    fxcheck | tail -n 1 | grep -qx FIXTURES-OK || { echo "STOP: fixture chưa đạt"; exit 1; }
    test ! -e test/passthrough.test.ts || { echo "STOP: test/passthrough.test.ts đã có"; exit 1; }
    git diff --quiet 7dc2299 -- test/search.test.ts package.json || { echo "STOP: đã khác 7dc2299"; exit 1; }
    [ "$(sed -n '15p' package.json)" = '    "test": "tsx --test test/search.test.ts"' ] || { echo "STOP: neo package.json:15 lệch"; exit 1; }
    blk T2 > test/passthrough.test.ts
    O=$(mktemp); git show 7dc2299:test/search.test.ts > "$O"; { blk TS-1; sed -n '2,$p' "$O"; } > test/search.test.ts
    git show 7dc2299:package.json > "$O"; { sed -n '1,14p' "$O"; blk PK-1; sed -n '16,$p' "$O"; } > package.json; rm -f "$O"
    asm '564p'                                                                    # TEST-OK
    asm '565p;567,570p;576p'                                                      # SEARCHTEST-OK PACKAGE-OK
    wc -l < test/passthrough.test.ts; grep -c '^test(' test/passthrough.test.ts   # 262 ; 9
    node -e 'const s=require("fs").readFileSync("test/passthrough.test.ts","utf8");console.log(s===s.normalize("NFC")?"NFC-OK":"NOT-NFC")'   # NFC-OK
    grep -c -E 'fetch|src/index' test/passthrough.test.ts                         # 0
    git diff -U0 7dc2299 -- test/search.test.ts | grep -c -E '^@@'                # 1
    npm test 2>&1 | grep -E '^# (tests|pass|fail) |^not ok'; echo "npm test exit=${PIPESTATUS[0]}"   # 20, 20, 0 ; 0
    git diff --quiet 7dc2299 -- package-lock.json tsconfig.json; echo "manifest exit=$?"   # 0
    shasum -a 256 test/passthrough.test.ts test/search.test.ts package.json
    ```

    Ghi vào `$E/T-2-2.log`. Sau task này, G2 (T-2-1, T-2-2) là một commit nếu người dùng yêu cầu commit.
  - **Depends on:** T-1-3, T-2-1
  - **Result:** 2026-10-30. Guard pass (`fxcheck` rc 0, `FIXTURES-OK`; `test/passthrough.test.ts` chưa có; `test/search.test.ts`, `package.json` trùng `7dc2299`; neo `package.json:15` khớp); tự kiểm `mktemp` pass, `$O` = `$TAP/tmp.AidCAM`. Ghi theo thứ tự `blk T2` → TS-1 → PK-1 (PK-1 sau cùng), mỗi bước rc 0. `asm '564p'` in `TEST-OK` (rc 0); `asm '565p;567,570p;576p'` in `SEARCHTEST-OK`, `PACKAGE-OK` (rc 0). `test/passthrough.test.ts`: 262 dòng, 9 dòng `test(`, `NFC-OK`, grep `fetch|src/index` = 0. `git diff -U0 7dc2299 -- test/search.test.ts`: 1 hunk `@@ -1 +1 @@`. `npm test` exit 0 (`# tests 20`, `# pass 20`, `# fail 0`, không `not ok`). `package-lock.json`, `tsconfig.json` trùng `7dc2299` (exit 0); `package.json` đổi 1 dòng. Thêm ngoài kế hoạch: `npm run build` exit 0. sha256: `test/passthrough.test.ts` `3f394c9184c32f35ef1e0e82b4af2f6ddd58dd686df1afa37e576186a531d939`, `test/search.test.ts` `a4b6da8bf0fbab1ea8e4cf8d8db6d8519ba89ecfb2ae4b36e65b4a835637a204`, `package.json` `c424e626a1c9e5495584f3128ae2c215e359ea90f39cf03811d9e17b4fda5e3d`. Không chạy lại, không lệch kế hoạch. `$TAP` = `/tmp/tap-Wnli6o` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-2-2.log`.

## Phase 3: Verification (không sửa file được track)

- [x] **T-3-1:** Build sạch, lắp ráp toàn bộ, phạm vi diff, bảng grep bất biến, đọc code handler (AC-13; phần đọc code của AC-4, AC-8, AC-11)
  - **Files:** — (chỉ kiểm; ghi `$E/T-3-1.log`)
  - **Acceptance:**
    - §Lắp ráp in đủ 7 dòng: `PASSTHROUGH-OK`, `INDEX-OK`, `TEST-OK`, `SEARCH-OK`, `SEARCHTEST-OK`, `PACKAGE-OK`, `SEARCH-INSTANT-OK`. Đây là lưới thật cho FR-5, FR-6 (phần mã), FR-13..FR-16 và vùng được bảo vệ.
    - NFR-2: `rm -rf dist && npm run build` thoát 0; `find dist -type f | sort` là đúng `dist/index.js`, `dist/passthrough.js`, `dist/search.js`.
    - NFR-1, NFR-3: `git diff --name-only 7dc2299` cộng file untracked chỉ gồm `src/index.ts`, `src/search.ts`, `src/passthrough.ts`, `test/**`, `package.json` và artifact của `specs/tools-api-passthrough/`. Ở điểm này `README.md`, `AGENTS.md`, master spec chưa đổi. Diff của `package-lock.json` và `tsconfig.json` rỗng. Diff của `package.json` chỉ ở dòng `scripts.test`.
    - FR-15 (grep đúng như requirements): `cat src/*.ts | grep -c -E '<pattern FR-15>'` = 0; `grep -c -E '≡|≈|↺|→'` = 0 ở mỗi file `src/`; `grep -c -F 'segmented'` = 0 ở mỗi file `src/`; ba helper fetch cũ không còn.
    - Bảng grep bất biến (`design.md:1634-1644`), chỉ trên `src/`: `src/index.ts` có `sujato` 2 dòng, `fetch(` 5, `server.tool(` 5, `formatCitation` 0, `^(let|var|const) ` 2; `wc -l` 220 / 150 / 77.
    - FR-5, FR-13, AC-13 phần đọc code, **kiểm theo từng handler, không bằng grep toàn file**:
      - Lệnh `node` dưới tìm đúng 4 handler có hình dạng `const url = build…Url(params); const res = await fetch(url); if (!res.ok) throw new Error(\`SuttaCentral API error: ${res.status}\`); return { content: renderBody(url, await res.text(), format) };`, với 4 hàm dựng khác nhau theo thứ tự `buildBilarasuttasUrl`, `buildSuttaplexUrl`, `buildParallelsUrl`, `buildMenuUrl`.
      - Số `fetch(` trong cả file là 5 = 4 handler trên + handler search (được `SEARCH-INSTANT-OK` khóa). Vì vậy không có `fetch` nào ngoài handler, và handler `get_bilarasuttas` chỉ có một request, không tới `/api/suttaplex/` (AC-4, FR-3).
      - `try`/`catch` (FR-13): trong `src/index.ts` và `src/passthrough.ts` chỉ có đúng một dòng khớp `\btry\b|catch`, là `main().catch((err) => {` của `main()`. Không có `try` nào.
      - FR-16: module-scope chỉ có `const server` và `const formatParam` (schema zod, không giữ response hay tham số).
    - FR-14, AC-8, AC-11 phần đọc I1 (`design.md:512-521`): đọc `src/index.ts` (đã `INDEX-OK`) và xác nhận cho cả bốn tool mới: endpoint chính xác; một request, chỉ tham số caller truyền; nguyên body, thứ tự SC, không lọc, không cắt; dạng body "không tìm thấy"; câu `Kích thước: output có thể rất lớn` có số đo (tiền lọc: `grep -c -F 'Kích thước: output có thể rất lớn' src/index.ts` = 4); `get_menu` nêu `sutta`, `vinaya`, `abhidhamma`; không mô tả nào nói uid của division làm output của `get_parallels` hay `get_bilarasuttas` lớn. NFR-7: `search_instant` có câu cảnh báo (`SEARCH-INSTANT-OK`).
    - Lệch ở bất kỳ mục nào: halt và báo cáo. Không sửa file được track trong task này.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    asm '562,576p'                                                                # 7 dòng *-OK như Acceptance, không dòng diff nào
    rm -rf dist && npm run build > /dev/null; echo "build exit=$?"; find dist -type f | sort   # 0 ; dist/index.js dist/passthrough.js dist/search.js
    { git diff --name-only 7dc2299; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|src/passthrough\.ts|test/.+|package\.json|specs/tools-api-passthrough/.+)$'
                                                                                  # rỗng (exit 1)
    git diff --stat 7dc2299 -- package-lock.json tsconfig.json README.md AGENTS.md specs/sutta-mcp-requirements.md   # rỗng
    git diff -U0 7dc2299 -- package.json | grep -E '^[-+] '                       # đúng 2 dòng: -/+ "test": …
    cat src/*.ts | grep -c -E 'extractText|formatUnavailable|formatCitation|formatDivisions|DIVISIONS|PITAKA_LABELS|max_segments|Deep link|retryLang|servedLang|Không tìm thấy sutta|tradition'   # 0
    grep -c -E '≡|≈|↺|→' src/*.ts; grep -c -F 'segmented' src/*.ts               # 0 ở mỗi file ; 0 ở mỗi file
    grep -c -E 'fetchSuttaplex|fetchBilaraText|fetchParallels' src/*.ts           # 0 ở mỗi file
    for p in sujato 'fetch(' 'server.tool(' formatCitation; do printf '%s: ' "$p"; grep -c -F "$p" src/index.ts; done   # 2, 5, 5, 0
    grep -n -E '^(let|var|const) ' src/*.ts                                       # đúng 2 dòng: src/index.ts const server, const formatParam
    wc -l < src/index.ts; wc -l < src/search.ts; wc -l < src/passthrough.ts       # 220 ; 150 ; 77
    node -e 'const s=require("fs").readFileSync("src/index.ts","utf8");
    const re=/async \(\{ format, \.\.\.params \}\) => \{\n    const url = (build\w+Url)\(params\);\n    const res = await fetch\(url\);\n    if \(!res\.ok\) throw new Error\(`SuttaCentral API error: \$\{res\.status\}`\);\n    return \{ content: (render\w+)\(url, await res\.text\(\), format\) \};\n  \}\n\);/g;
    const m=[...s.matchAll(re)].map((x)=>x[1]+"/"+x[2]); const f=(s.match(/fetch\(/g)||[]).length;
    const ok=JSON.stringify(m)===JSON.stringify(["buildBilarasuttasUrl/renderBody","buildSuttaplexUrl/renderBody","buildParallelsUrl/renderBody","buildMenuUrl/renderBody"])&&f===5;
    console.log(ok?"HANDLERS-OK":"HANDLERS-MISMATCH "+m.length+" "+f); process.exit(ok?0:1)'   # HANDLERS-OK
    grep -n -E '\btry\b|catch' src/index.ts src/passthrough.ts                    # đúng 1 dòng: src/index.ts:…:main().catch((err) => {
    grep -c -F 'Kích thước: output có thể rất lớn' src/index.ts                  # 4
    ```

    Ghi vào `$E/T-3-1.log`, kèm danh sách các ý đọc code của FR-14/AC-8/AC-11 đã xác nhận.
  - **Depends on:** T-1-3, T-2-2
  - **Result:** 2026-10-30. `asm '562,576p'` (rc 0) in đủ 7 dòng `PASSTHROUGH-OK`, `INDEX-OK`, `TEST-OK`, `SEARCH-OK`, `SEARCHTEST-OK`, `PACKAGE-OK`, `SEARCH-INSTANT-OK`, không dòng diff. `rm -rf dist && npm run build` exit 0; `dist/` đúng `index.js`, `passthrough.js`, `search.js`. Phạm vi: grep loại trừ rỗng (rc 1); `git diff --stat` của `package-lock.json`, `tsconfig.json`, `README.md`, `AGENTS.md`, master spec rỗng; `package.json` đúng 2 dòng `-`/`+` `"test"`. FR-15: pattern = 0; `≡|≈|↺|→` = 0, `segmented` = 0, helper fetch cũ = 0 ở cả 3 file `src/`. Bất biến `src/index.ts`: `sujato` 2, `fetch(` 5, `server.tool(` 5, `formatCitation` 0; module-scope chỉ `src/index.ts:16 const server`, `:86 const formatParam`; `wc -l` 220/150/77. `HANDLERS-OK` (rc 0: 4 handler đúng hình, thứ tự `buildBilarasuttasUrl`, `buildSuttaplexUrl`, `buildParallelsUrl`, `buildMenuUrl`, `renderBody`; `fetch(` = 5). `try`/`catch`: đúng 1 dòng `src/index.ts:217:main().catch((err) => {`. Câu `Kích thước: output có thể rất lớn` = 4. Đọc code `src/index.ts:93-207` theo `design.md:512-521` cho cả 4 tool: endpoint chính xác, một request chỉ tham số caller, nguyên body thứ tự SC không lọc/cắt, dạng "không tìm thấy", câu kích thước có số đo, `get_menu` nêu `sutta`/`vinaya`/`abhidhamma`, không mô tả nào nói uid division làm output `get_parallels`/`get_bilarasuttas` lớn, `lang` của `get_bilarasuttas` không mô tả là "chỉ đổi ngôn ngữ", 4/4 `describe()` tham số query nói bỏ trống thì không gửi và mặc định `en` (`CODE-READING-OK`). Tiền lọc thêm ngoài kế hoạch: `hardcode|max_segments|Deep link|tradition` trong `src/index.ts` = 0. Không lệch; không sửa file được track. `$TAP` = `/tmp/tap-EKGde1` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-3-1.log`.

- [x] **T-3-2:** `npm test` offline hai lần (thường và với `fetch` bị chặn), đủ 8 tiền tố FR, kiểm tĩnh fixture (AC-12 trừ đột biến)
  - **Files:** — (chỉ kiểm; ghi `$E/T-3-2.log`)
  - **Acceptance:**
    - Theo dòng AC-12 của `design.md:1606`. `L` và `P` là thư mục tạm trong `$TAP`.
    - Lần 1 (`npm test`) và lần 2 (preload `globalThis.fetch` ném lỗi qua `NODE_OPTIONS`) đều thoát 0, TAP có `# pass 20`, `# fail 0`. Lần 2 chứng minh test không gọi mạng (FR-17).
    - Mỗi tiền tố `tools-api-passthrough FR-3:`, `FR-4:`, `FR-5:`, `FR-7:`, `FR-9:`, `FR-10:`, `FR-11:`, `FR-12:` là tiền tố của ít nhất một dòng `ok` trong log lần 1. Khớp có dấu `:` ngay sau số, nên `FR-1` không tính cho `FR-10`. Đúng 8 id khác nhau; `FR-10` có 2 case.
    - Không file `.ts` nào trong `test/` có `fetch` hay `src/index` (FR-17).
    - Fixture (NFR-4): `fxcheck` in `FIXTURES-OK` (≤ 10 file, ≤ 65536 B, đúng 7 file 38,443 B, mỗi file có `url` và `recorded`, không key `highlight`/`translations`). Ba fixture search trùng `7dc2299`.
    - Lệch: halt và báo cáo.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    L=$(mktemp -d)
    npm test > "$L/t1.log" 2>&1; echo "t1 exit=$?"                                # 0
    P=$(mktemp -d); printf 'globalThis.fetch = () => { throw new Error("network disabled"); };\n' > "$P/nofetch.mjs"
    NODE_OPTIONS="--import $P/nofetch.mjs" npm test > "$L/t2.log" 2>&1; echo "t2 exit=$?"   # 0
    grep -E '^# (pass|fail) ' "$L/t1.log" "$L/t2.log"                             # mỗi log: pass 20, fail 0
    grep -o -E '^ok [0-9]+ - tools-api-passthrough FR-[0-9]+:' "$L/t1.log" | sed 's/.* - //' | sort | uniq -c
                                                                                  # 8 id: FR-3, 4, 5, 7, 9, 11, 12 mỗi id 1; FR-10 là 2
    grep -n -E 'fetch|src/index' test/*.ts; echo "grep exit=$?"                   # rỗng ; 1
    fxcheck; echo "fxcheck exit=$?"                                               # FIXTURES-OK ; 0
    git diff --quiet 7dc2299 -- test/fixtures; echo "old fixtures exit=$?"       # 0
    ```

    Ghi vào `$E/T-3-2.log` các dòng đếm, không chép log TAP.
  - **Depends on:** T-2-2
  - **Result:** 2026-10-30. `L`, `P` nằm trong `$TAP` (`$TAP/tmp.pG29MY`, `$TAP/tmp.7bzmJ6`). Lần 1 `npm test` exit 0; lần 2 (preload `nofetch.mjs` qua `NODE_OPTIONS`) exit 0. Cả hai log: `# tests 20`, `# pass 20`, `# fail 0`, 0 dòng `not ok`. Kiểm thêm ngoài kế hoạch (chống vacuous): cùng `NODE_OPTIONS`, `node -e` gọi `fetch` ném `network disabled`, nên preload có tác dụng. Tiền tố trong log lần 1: 8 id khác nhau; `FR-10:` 2, `FR-3:`, `FR-4:`, `FR-5:`, `FR-7:`, `FR-9:`, `FR-11:`, `FR-12:` mỗi id 1. `grep -n -E 'fetch|src/index' test/*.ts` rỗng (exit 1). `fxcheck` in `FIXTURES-OK` (exit 0; 7 file, 38443 B); 3 fixture search trùng `7dc2299` (exit 0). Không lệch; không sửa file được track. `$TAP` = `/tmp/tap-LorPCG` (đã xóa bởi trap, cùng log TAP). Log: `.claude/spec-evidence/tools-api-passthrough/T-3-2.log`.

- [x] **T-3-3:** Sáu đột biến FR-18 trên bản sao ngoài repo (AC-12)
  - **Files:** — (chỉ kiểm; bản sao `$C` trong `$TAP`; ghi `$E/T-3-3.log`)
  - **Acceptance:**
    - Chạy đúng lệnh `design.md:1550-1553` (V1 lấy bằng `blk`). Bản sao không có `.git`, `node_modules`, `dist`; `node_modules` là symlink về repo. Repo không bị sửa.
    - In đúng 6 dòng `mutation <m>: changed=1 exit=<khác 0> failed: …`, một dòng cho mỗi `a`..`f`. `changed` khác 1 nghĩa là pattern không khớp P1 và lần chạy đó không có giá trị: halt và báo (P1 trong repo lệch block, dù `PASSTHROUGH-OK` đã in ở T-3-1).
    - Danh sách `failed` của mỗi đột biến chứa ít nhất case in đậm ở bảng `design.md:1558-1565`: (a) `FR-10`, (b) `FR-3`, (c) `FR-10`, (d) `FR-10`, (e) `FR-10`, (f) `FR-3`.
    - Dòng cuối `restored exit=0` (bản sao đã hoàn nguyên).
    - Sau đó `git status --porcelain -- src test package.json` trên repo giống trước khi chạy, và `asm '562p'` vẫn in `PASSTHROUGH-OK`.
    - `$C` và `$C.sh` bị xóa (lệnh của design tự xóa; `trap` xóa nếu halt). AC-12 "bản sao ngoài repo bị xóa".
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    before=$(git status --porcelain -- src test package.json | shasum -a 256)
    { sed -n '560,561p;1550,1553p' "$D"; } | bash                                 # 6 dòng mutation … ; restored exit=0
    [ "$(git status --porcelain -- src test package.json | shasum -a 256)" = "$before" ] && echo "REPO-UNCHANGED"   # REPO-UNCHANGED
    asm '562p'                                                                    # PASSTHROUGH-OK
    ls -d "$TAP"/tmp.* 2>/dev/null; echo "leftover exit=$?"                       # rỗng ; 1 (design đã rm $C, $C.sh)
    ```

    Ghi vào `$E/T-3-3.log` 6 dòng `mutation …` và dòng `restored …`.
  - **Depends on:** T-3-2
  - **Result:** 2026-10-30. Lệnh `design.md:1550-1553` (V1 qua `blk`, `$C` trong `$TAP`) rc 0, in đúng 6 dòng: `a` changed=1 exit=1 failed FR-10, FR-11; `b` changed=1 exit=1 failed FR-3, FR-4, FR-5; `c` changed=1 exit=1 failed FR-10; `d` changed=1 exit=1 failed FR-10; `e` changed=1 exit=1 failed FR-10; `f` changed=1 exit=1 failed FR-3 (trùng cột "Case fail" của bảng `design.md:1558-1565`, gồm mọi case in đậm). Dòng cuối `restored exit=0`. Kiểm máy (`MUTATIONS-OK`, rc 0): mỗi đột biến 1 dòng, changed=1, exit≠0, chứa case in đậm. `REPO-UNCHANGED`; thêm ngoài kế hoạch: hash nội dung mọi file `src/`, `test/`, `package.json` trước/sau trùng (`dcb79a9d…1d253232`, `CONTENT-UNCHANGED`). `asm '562p'` in `PASSTHROUGH-OK`. Không còn `$TAP/tmp.*` (leftover exit=1: `$C`, `$C.sh` đã bị xóa). Không đột biến nào sống sót; không sửa file được track. `$TAP` = `/tmp/tap-gmiXtO` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-3-3.log`.

- [x] **T-3-4:** Harness live V3..V5 trên bản build mới và bản build `7dc2299` (AC-1..AC-11)
  - **Files:** — (chỉ kiểm; `$H` trong `$TAP`; ghi `$E/T-3-4.log`)
  - **Acceptance:**
    - Dựng theo `design.md:1375-1381`, lấy nguyên văn bằng `sed`: `$H/base` từ `git archive 7dc2299` (baseline AC-10 của requirements; bản build này chính là code chưa sửa, nên không cần chạy baseline trước T-1-1), `$H/work` symlink về repo, `npm run build`, V2 lấy từ `specs/search-api-passthrough/design.md`, V3/V4/V5 lấy bằng `blk`. Harness chờ mỗi frame tối đa 90 s (≥ 30 s của NFR-6).
    - Chạy `run.sh` (V3) và V5 tách riêng để phân biệt hai loại thoát 3:
      - `run.sh` thoát 0: mọi dòng V4 hợp lệ. Chạy V5.
      - `run.sh` thoát 3: inconclusive (network) theo Conventions. **V5 không chạy.** In phần cuối `$H/ac/stderr.log` vào báo cáo trước khi lần gọi kết thúc, kiểm endpoint bằng `curl` như Conventions, rồi dừng; orchestrator quyết định.
    - V5 thoát 0 và in **đúng 51 dòng `PASS`, 0 dòng `FAIL`**. Mệnh đề theo AC ở bảng `design.md:1593-1608`.
    - V5 in `FAIL …` (thoát 1): lệch trên lần chạy hợp lệ. **Không chạy lại.** `curl -sS` lại URL của dòng nguồn của input đó, pipe vào `node` chỉ in số đếm, rồi halt và báo cáo. AC-6 và AC-8 so với `length` của body `curl` lấy ngay sau lời gọi tool, nên chúng chịu được SC trôi về số lượng; các literal khác thì không.
    - **design-review-2 S1:** nếu `run.sh` thoát 0 mà V5 vẫn in `INCONCLUSIVE (network) …` và thoát 3, thì đó là một dòng `curl` hợp lệ có body rỗng. Đó là **lệch trên lần chạy hợp lệ**, không phải lỗi mạng: halt và báo như một `FAIL`, không chạy lại.
    - Ghi số lần chạy lại của từng id (dòng `INVALID … try=…`) vào Result.
    - Không chép output tool hay body `curl` vào `$E`/Result: chỉ dòng `VALID`/`INVALID`/`INCONCLUSIVE`, dòng `PASS`/`FAIL` (tên mệnh đề kèm số đếm, đúng như V5 in), mã thoát.
    - `$H` bị xóa khi lần gọi kết thúc (`trap`).
  - **Test:**

    Chạy trong **một** lần gọi Bash, bằng `run_in_background` (xem Conventions, Timeout).

    ```sh
    # khối khởi đầu, rồi:
    { sed -n '560,561p;1375,1381p' "$D"
      echo '"$H/run.sh" "$H"; r1=$?; echo "run.sh exit=$r1"'
      echo 'if [ $r1 -eq 0 ]; then (cd "$H/ac" && { node check.cjs > check.out; r=$?; cat check.out; echo "check exit=$r"; echo "PASS lines: $(grep -c "^PASS " check.out)"; }); else echo "--- stderr.log (cuối) ---"; tail -n 40 "$H/ac/stderr.log"; fi'
      echo 'rm -r "$H"'
    } | bash
                                                                                  # run.sh exit=0 ; 51 dòng PASS ; check exit=0 ; PASS lines: 51
    ```

    `check.out` chỉ chứa dòng `PASS`/`FAIL` của V5 và nằm trong `$H` (bị xóa). Ghi vào `$E/T-3-4.log`.
  - **Depends on:** T-3-1, T-3-2
  - **Result:** 2026-10-30 (12:51–12:53 UTC), một lần gọi `run_in_background`. Dựng theo `design.md:1375-1381` lấy bằng `sed` (`npm run build` rc 0; `$H` = `$TAP/tmp.OZ8q4g`). `run.sh` exit 0: 31 dòng V4 đều `VALID`, 0 `INCONCLUSIVE`. Chạy lại (chỉ dòng `INVALID`, rc=3 `fetch failed`): `ac5b` 1 (`VALID` try=2), `ac6a` 2 (`VALID` try=3, trong trần), `ac8c` 1 (try=2), `ac10a-base` 1 (try=2); mọi id khác 0; tổng 5 dòng `INVALID`. V5 (`check.cjs`) exit 0: đúng 51 dòng `PASS`, 0 `FAIL`, gồm AC-1..AC-11 (AC-1 `body===curl`, AC-2 `keys_order 454`, AC-6 `19 keys order`, `translations len 43`, AC-7 `dn22 7`, AC-8 `menu 464`, AC-9 ac9a..ac9f, AC-10 `a byte`/`b byte`/`schema`/`desc`/`names`, AC-11 4 tool và 4 `neg`). Không cần `curl` đếm lại vì không có lệch. Không lệch; không sửa file được track. `$H` bị lệnh design xóa; `$TAP` = `/tmp/tap-BSRcNh` (đã xóa bởi trap, không còn `$TAP/tmp.*`). Log: `.claude/spec-evidence/tools-api-passthrough/T-3-4.log` (dòng đếm cuối `PASS=52` gồm cả dòng tóm tắt `PASS lines: 51`).

## Phase 4: Tài liệu (trừ `AGENTS.md`)

- [x] **T-4-1:** Áp R-1, R-2 vào `README.md` (**nguyên văn**)
  - **Files:** `README.md`
  - **Acceptance:**
    - Guard, lệch thì halt: `README.md` trùng `7dc2299`. Neo: `:13` bắt đầu bằng ``| `search_topic` |``; `:17` bắt đầu bằng ``| `list_divisions` |``; `:70` bắt đầu bằng `` `search_topic` gửi truy vấn``; `:74` bắt đầu bằng `SuttaCentral dùng mặc định`.
    - Ghi bằng pipeline tái dựng của `design.md:1616-1617`, chép qua `blk`: `7dc2299:1-12` + `blk R-1` + `7dc2299:18-69` + `blk R-2` + `7dc2299:75-$`. R-1 thay `:13-17`, R-2 thay `:70-74`.
    - `docs README` in `README-OK`. `wc -l` = 101.
    - FR-19: `grep -c -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions' README.md` = 0; grep AC-14 trên `README.md` không có dòng nào. Bảng Tools có đúng năm dòng tool của FR-1, theo thứ tự `search_instant`, `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu`.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    git diff --quiet 7dc2299 -- README.md || { echo "STOP: README.md đã khác 7dc2299"; exit 1; }
    for n in 13 17 70 74; do printf '%s: ' "$n"; sed -n "${n}p" README.md | cut -c1-40; done   # khớp neo
    R=$(mktemp); git show 7dc2299:README.md > "$R"
    { sed -n '1,12p' "$R"; blk R-1; sed -n '18,69p' "$R"; blk R-2; sed -n '75,$p' "$R"; } > README.md; rm -f "$R"
    docs README                                                                   # README-OK
    wc -l < README.md                                                             # 101
    grep -c -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions' README.md # 0
    grep -n -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions|max_segments|Deep link' README.md; echo "grep exit=$?"   # rỗng ; 1
    sed -n '13,17p' README.md | cut -d'|' -f2 | tr -d ' `'                       # 5 dòng: search_instant, get_bilarasuttas, get_suttaplex, get_parallels, get_menu
    shasum -a 256 README.md
    ```

    Ghi vào `$E/T-4-1.log`.
  - **Depends on:** T-2-2
  - **Result:** 2026-10-30. Guard pass (`README.md` trùng `7dc2299`; neo `:13`, `:17`, `:70`, `:74` khớp, kiểm bằng điều kiện halt tự động). Ghi một lần bằng pipeline `7dc2299:1-12` + `blk R-1` + `7dc2299:18-69` + `blk R-2` + `7dc2299:75-$` (rc 0; `$R` = `$TAP/tmp.M3ZzfK`, đã xóa). `docs README` in `README-OK` (rc 0). `wc -l` = 101. FR-19: grep `search_topic|get_sutta\b|get_sutta_meta|list_divisions` = 0; grep AC-14 (thêm `max_segments|Deep link`) rỗng (exit 1). Bảng Tools `:13-17` đúng 5 dòng `search_instant`, `get_bilarasuttas`, `get_suttaplex`, `get_parallels`, `get_menu` (`TOOLS-TABLE-OK`). sha256 `README.md` = `cf6ada54c740beb47ad64e209ce721fb600658bfd20dcebe4a525775186edfc1`. Không lệch kế hoạch. `$TAP` = `/tmp/tap-cAYX0z` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-4-1.log`.

- [x] **T-4-2:** Áp M-1..M-13 vào `specs/sutta-mcp-requirements.md` (**nguyên văn**, một task cho cả file)
  - **Files:** `specs/sutta-mcp-requirements.md`
  - **Acceptance:**
    - Guard, lệch thì halt: file trùng `7dc2299`, 369 dòng. Neo: `:118` là `| Endpoint | Mô tả |`; `:143` là ``### Tool 1: `search_topic` ``; `:254` là ```` ``` ````; `:290` bắt đầu bằng `- **Attribution:**`; `:321` bắt đầu bằng `   | Divisions list |`; `:363` bắt đầu bằng `**Thứ tự ưu tiên.**`.
    - Ghi bằng pipeline tái dựng của `design.md:1620-1623`, chép qua `blk`, trong **một** lần ghi: không áp từng khối, vì số dòng của design là số dòng tại `7dc2299` và mọi khối đọc từ bản `7dc2299`, không từ file đang sửa.
    - `docs MASTER` in `MASTER-OK`. `wc -l` = 367.
    - AC-14 trên master spec: grep AC-14 cho **đúng 6 dòng** `:296`, `:298`, `:302`, `:351`, `:360`, `:361` (`design.md:988`), và đọc từng dòng để xác nhận ở ngữ cảnh lịch sử, nói rõ đã bị thay thế hoặc đổi tên.
    - FR-20, đọc (khóa bởi `MASTER-OK`; ghi vào Result từng ý đã xác nhận): bảng endpoint có đủ năm endpoint, kèm `language`/`lang` và dẫn chứng `config.py:34`, `views.py:1061`; bảng Parallel types không còn cột "Ký hiệu"; Tool 1–5 (Tool 5 là `get_menu`, không bảng `tradition`); luồng mẫu dùng tên mới; Constraints (dòng nguồn, Attribution, segment ID); roadmap mục 1, 2, 3, 5, 6, 7; bảng issue có #16, #19, #20 ghi bị spec `tools-api-passthrough` thay thế; spec `get-sutta-unknown-uid` ghi bị thay thế.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    git diff --quiet 7dc2299 -- specs/sutta-mcp-requirements.md || { echo "STOP: master spec đã khác 7dc2299"; exit 1; }
    wc -l < specs/sutta-mcp-requirements.md                                       # 369
    for n in 118 143 254 290 321 363; do printf '%s: ' "$n"; sed -n "${n}p" specs/sutta-mcp-requirements.md | cut -c1-40; done   # khớp neo
    S=$(mktemp); git show 7dc2299:specs/sutta-mcp-requirements.md > "$S"
    { sed -n '1,117p' "$S"; blk M-1; sed -n '123,129p' "$S"; blk M-2; sed -n '138,142p' "$S"; blk M-3; sed -n '255,260p' "$S"
      blk M-4; sed -n '274,282p' "$S"; blk M-5; sed -n '285,289p' "$S"; blk M-6; sed -n '291,295p' "$S"; blk M-7; sed -n '301p' "$S"
      blk M-8; sed -n '303,320p' "$S"; blk M-9; sed -n '322,326p' "$S"; blk M-10; sed -n '332,350p' "$S"; blk M-11
      sed -n '352,358p' "$S"; blk M-12; sed -n '362p' "$S"; blk M-13; } > specs/sutta-mcp-requirements.md; rm -f "$S"
    docs MASTER                                                                   # MASTER-OK
    wc -l < specs/sutta-mcp-requirements.md                                       # 367
    grep -n -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions|max_segments|Deep link' specs/sutta-mcp-requirements.md | cut -d: -f1 | tr '\n' ' '   # 296 298 302 351 360 361
    grep -c -F 'tools-api-passthrough' specs/sutta-mcp-requirements.md            # ghi số vào Result (tiền lọc cho phần đọc)
    shasum -a 256 specs/sutta-mcp-requirements.md
    ```

    Ghi vào `$E/T-4-2.log`, kèm danh sách ý FR-20 đã đọc.
  - **Depends on:** T-2-2
  - **Result:** 2026-10-30. Guard pass (file trùng `7dc2299`, 369 dòng; neo `:118`, `:143`, `:254`, `:290`, `:321`, `:363` khớp, kiểm bằng điều kiện halt tự động). Ghi một lần bằng pipeline `design.md:1620-1623` qua `blk` M-1..M-13 (rc 0; `$S` = `$TAP/tmp.lfuE4N`, đã xóa). `docs MASTER` in `MASTER-OK` (rc 0). `wc -l` = 367. Grep AC-14 đúng 6 dòng `296 298 302 351 360 361`; đọc từng dòng: đều ở ngữ cảnh lịch sử (`:296` đổi tên `search_topic` → `search_instant`; `:298`, `:302` "bị spec `tools-api-passthrough` thay thế"; `:351` `list_divisions` "đã được thay bằng `get_menu`"; `:360`, `:361` "trước là `get_sutta_meta`", dòng ghi bị thay thế). `grep -c -F 'tools-api-passthrough'` = 12. FR-20 đã đọc: bảng endpoint đủ 5 endpoint kèm `language`/`lang`, `config.py:34` và `views.py:1061` (`:121`); bảng Parallel types không còn cột "Ký hiệu"; Tool 1–5 (`:145` `search_instant`, `:181` `get_bilarasuttas`, `:200` `get_suttaplex`, `:218` `get_parallels`, `:236` `get_menu`, không bảng `tradition`); luồng mẫu dùng tên mới; Constraints có dòng nguồn, Attribution, segment ID; roadmap mục 1, 2, 3, 5, 6, 7; bảng issue #16, #19, #20 ghi bị spec `tools-api-passthrough` thay thế; `:178` spec `get-sutta-unknown-uid` ghi bị thay thế (`FR20-READING-OK`). sha256 = `4da0da67584ebd2a1b4fd4d4edb99e7830503ab77fb7facd4269df0f33f7cd7c`. Không lệch kế hoạch. `$TAP` = `/tmp/tap-ofQuKE` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-4-2.log`.

- [x] **T-4-3:** Dọn thư mục tạm (NFR-5) và kiểm trạng thái repo trước task `AGENTS.md`
  - **Files:** — (chỉ kiểm; ghi `$E/T-4-3.log`)
  - **Acceptance:**
    - Mọi task T-1-1..T-4-2 đã `[x]`. Không có task nào đang halt hay inconclusive mà orchestrator chưa quyết định.
    - Mọi đường dẫn trong `$E/tmp-dirs.txt` (trừ `$TAP` của chính lần gọi này) không còn tồn tại. Đường dẫn nào còn **và** khớp `/tmp/tap-*` thì xóa, và ghi tên vào Result. Không xóa gì ngoài danh sách đó, và không đụng `/private/tmp/claude-*`.
    - Không có body thô SuttaCentral nào trong repo ngoài `test/fixtures/`. `git status --porcelain --untracked-files=all` chỉ liệt kê đường dẫn thuộc NFR-3.
    - FR-21: không commit nào trên nhánh (từ `7dc2299`) chứa từ khóa tự đóng issue (`close`/`closes`/`closed`/`fix`/`fixes`/`fixed`/`resolve`/`resolves`/`resolved` theo sau là `#<số>`). Chưa có commit thì phép kiểm rỗng.
    - Trạng thái trước A-1..A-4:
      - §Lắp ráp in đủ 7 dòng `*-OK`; `README-OK` và `MASTER-OK` vẫn in.
      - `npm run build` và `npm test` thoát 0 (`# pass 20`).
      - `AGENTS.md` vẫn trùng `7dc2299`, sha256 `4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b`.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    grep -c -E '^- \[ \] \*\*T-([123]-[0-9]+|4-[12]):' specs/tools-api-passthrough/tasks.md   # 0
    while IFS= read -r p; do [ "$p" = "$TAP" ] && continue
      case "$p" in /tmp/tap-*) [ -e "$p" ] && { echo "LEFTOVER $p"; rm -rf "$p"; } ;; *) echo "UNEXPECTED-PATH $p" ;; esac
    done < "$E/tmp-dirs.txt"; echo "leftover check done"                         # chỉ "leftover check done"
    git status --porcelain --untracked-files=all
    { git diff --name-only 7dc2299; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|src/passthrough\.ts|test/.+|package\.json|README\.md|AGENTS\.md|specs/sutta-mcp-requirements\.md|specs/tools-api-passthrough/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    git log --format=%B 7dc2299..HEAD | grep -n -i -E '\b(close[sd]?|fix(e[sd])?|resolve[sd]?)[[:space:]]+#[0-9]+'; echo "keyword exit=$?"   # rỗng ; 1
    asm '562,576p'                                                                # 7 dòng *-OK
    docs README; docs MASTER                                                      # README-OK ; MASTER-OK
    npm run build > /dev/null; echo "build exit=$?"                               # 0
    npm test 2>&1 | grep -E '^# (pass|fail) '; echo "test exit=${PIPESTATUS[0]}"  # 20, 0 ; 0
    git diff --quiet 7dc2299 -- AGENTS.md; echo "agents exit=$?"                  # 0
    shasum -a 256 AGENTS.md                                                       # 4c8b646d…a2e53
    ```

    Ghi vào `$E/T-4-3.log`.
  - **Depends on:** T-3-1, T-3-2, T-3-3, T-3-4, T-4-1, T-4-2
  - **Result:** 2026-10-30. T-1-1..T-4-2 đều `[x]` (grep ô trống = 0); không task nào đang halt hay inconclusive. `tmp-dirs.txt` có 27 dòng (gồm `$TAP` lần này); không dòng `LEFTOVER` nào (không xóa gì), không `UNEXPECTED-PATH`. `git status --porcelain --untracked-files=all` chỉ liệt kê `README.md`, `package.json`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts` (M), `src/passthrough.ts`, `test/passthrough.test.ts`, 4 fixture mới, artifact `specs/tools-api-passthrough/` (??); grep phạm vi NFR-3 rỗng (rc 1); không có body thô SC ngoài `test/fixtures/`. FR-21: 0 commit trong `7dc2299..HEAD`, grep từ khóa tự đóng issue rỗng (exit 1). `asm '562,576p'` in đủ 7 dòng `*-OK` (rc 0); `README-OK`, `MASTER-OK`. `npm run build` exit 0; `npm test` exit 0 (`# pass 20`, `# fail 0`). `AGENTS.md` trùng `7dc2299` (exit 0), sha256 `4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b` (so đủ 64 ký tự với pin, `AGENTS-PIN-OK`; comment rút gọn `4c8b646d…a2e53` trong khối Test không khớp đuôi `…a038a02b` của pin, chỉ là lỗi chú thích). Mục đã biết cho người dùng, không xóa: `/var/folders/xn/g3xfp9zs001fmzv6gtwz6j740000gn/T/tmp.ayC1uLkb2n` (bản clone chạy thử của planner, ngoài `tmp-dirs.txt`, vẫn tồn tại). `$TAP` = `/tmp/tap-BnOCXJ` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-4-3.log`.

## Phase 5: `AGENTS.md` (task build cuối cùng)

- [x] **T-5-1:** Áp A-1..A-4 vào `AGENTS.md` (**nguyên văn**). Task cuối, chỉ sửa `AGENTS.md`
  - **Files:** `AGENTS.md` (duy nhất). **Không đụng** `specs/tools-api-passthrough/workflow-contract.json`, `workflow-state.json` hay file nào khác.
  - **Acceptance:**
    - Guard, lệch thì halt:
      - Mọi task khác đã `[x]`.
      - `git diff --quiet 7dc2299 -- AGENTS.md`; `shasum -a 256 AGENTS.md` = `4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b` (`design.md:1298`).
      - Neo: `:17` bắt đầu bằng `npm test         # node:test via tsx`; `:24` bắt đầu bằng `Two source files.`; `:26` là `**Two layers:**`; `:34` bắt đầu bằng ``   - `list_divisions` —``; `:37` bắt đầu bằng ``- `GET /api/suttaplex/``; `:40` bắt đầu bằng ``- `GET /api/search/instant``; `:46` bắt đầu bằng `- **Bilara**`; file có 47 dòng.
    - Ghi bằng pipeline tái dựng của `design.md:1625`, chép qua `blk`: `7dc2299:1-16` + `blk A-1` + `7dc2299:18-23` + `blk A-2` + `7dc2299:35-36` + `blk A-3` + `7dc2299:41-45` + `blk A-4` + `7dc2299:47-$`. A-1 thay `:17`, A-2 thay `:24-34`, A-3 thay `:37-40`, A-4 thay `:46`.
    - `docs AGENTS` in `AGENTS-OK`. Ngoài A-1..A-4, `AGENTS.md` không đổi (FR-22). `wc -l` = 48.
    - AC-14 đầy đủ trên ba file: grep AC-14 trên `README.md` và `AGENTS.md` không có dòng nào; trên master spec vẫn đúng 6 dòng lịch sử. `README-OK`, `MASTER-OK` vẫn in.
    - Phạm vi cuối (AC-13, NFR-3): danh sách đường dẫn đổi giống T-4-3, cộng đúng `AGENTS.md`.
    - Ghi sha256 mới của `AGENTS.md` vào Result. Mô phỏng của task planner ngày 2026-10-30 (khối A trên `7dc2299:AGENTS.md`, ngoài repo) cho `2e23154c8bf28a0aaa6d76f1f5bdf42ab5724013e975b60d93c060d7af5d5cdf`, 48 dòng. `AGENTS-OK` là tiêu chí; nếu `AGENTS-OK` in mà sha256 khác số này thì ghi cả hai và báo. Orchestrator dùng sha256 trong Result để đối chiếu với preview cập nhật contract.
    - **Ngay sau task này, trước code review on-completion, orchestrator chạy đường cập nhật contract** (`design.md:1300-1307`, FR-22). Bước này **cần người dùng authorize rõ ràng** và **không phải bước của implementer**.
      - Implementer không chạy hàm contract nào, **không sửa `workflow-contract.json`** hay `workflow-state.json`, không authorize thay người dùng, không khôi phục `AGENTS.md`.
      - Thứ tự của orchestrator: `preview_contract_update` (thay đổi duy nhất được chờ là `dependencies.context:agents`; có thay đổi khác thì dừng và báo người dùng) → trình preview cho người dùng, scope `{"type":"contract","id":"dependencies.context:agents"}` → `authorize_contract_update` **chỉ khi người dùng đồng ý rõ ràng tại thời điểm đó** → `write_contract_atomic` → `finish_contract_update` → `settle_contract_invalidation`.
      - Mệnh đề AC-14 "`shasum -a 256 AGENTS.md` bằng sha256 mới của `context:agents` trong `workflow-contract.json`" được kiểm sau bước đó, không trong task này.
      - Người dùng không authorize thì workflow dừng ở trạng thái drift. Không agent nào tự khôi phục `AGENTS.md`.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    grep -c -E '^- \[ \] \*\*T-[1-4]-[0-9]+:' specs/tools-api-passthrough/tasks.md   # 0
    wc0=$(shasum -a 256 specs/tools-api-passthrough/workflow-contract.json)
    git diff --quiet 7dc2299 -- AGENTS.md || { echo "STOP: AGENTS.md đã khác 7dc2299"; exit 1; }
    [ "$(shasum -a 256 AGENTS.md | cut -d' ' -f1)" = 4c8b646d5555cbcce542aa519894488bcb2ae2c8c19170cfb3a7128be038a02b ] || { echo "STOP: sha256 lệch pin"; exit 1; }
    for n in 17 24 26 34 37 40 46; do printf '%s: ' "$n"; sed -n "${n}p" AGENTS.md | cut -c1-45; done; wc -l < AGENTS.md   # khớp neo ; 47
    A=$(mktemp); git show 7dc2299:AGENTS.md > "$A"
    { sed -n '1,16p' "$A"; blk A-1; sed -n '18,23p' "$A"; blk A-2; sed -n '35,36p' "$A"; blk A-3; sed -n '41,45p' "$A"; blk A-4; sed -n '47,$p' "$A"; } > AGENTS.md; rm -f "$A"
    docs AGENTS; docs README; docs MASTER                                         # AGENTS-OK ; README-OK ; MASTER-OK
    wc -l < AGENTS.md                                                             # 48
    grep -n -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions|max_segments|Deep link' README.md AGENTS.md; echo "grep exit=$?"   # rỗng ; 1
    grep -c -E 'search_topic|get_sutta\b|get_sutta_meta|list_divisions|max_segments|Deep link' specs/sutta-mcp-requirements.md   # 6
    { git diff --name-only 7dc2299; git ls-files --others --exclude-standard; } | sort -u \
      | grep -v -E '^(src/index\.ts|src/search\.ts|src/passthrough\.ts|test/.+|package\.json|README\.md|AGENTS\.md|specs/sutta-mcp-requirements\.md|specs/tools-api-passthrough/.+|specs/INDEX\.md)$'
                                                                                  # rỗng (exit 1)
    [ "$(shasum -a 256 specs/tools-api-passthrough/workflow-contract.json)" = "$wc0" ] && echo CONTRACT-UNCHANGED   # CONTRACT-UNCHANGED
    shasum -a 256 AGENTS.md                                                       # ghi vào Result
    ```

    Ghi vào `$E/T-5-1.log`.
  - **Depends on:** T-4-3
  - **Result:** 2026-10-30. Guard pass (T-1..T-4 đều `[x]`; `AGENTS.md` trùng `7dc2299`, sha256 = pin `4c8b646d…a038a02b`; neo `:17`, `:24`, `:26`, `:34`, `:37`, `:40`, `:46` khớp, 47 dòng, kiểm bằng điều kiện halt tự động). Ghi một lần bằng pipeline `7dc2299:1-16` + `blk A-1` + `7dc2299:18-23` + `blk A-2` + `7dc2299:35-36` + `blk A-3` + `7dc2299:41-45` + `blk A-4` + `7dc2299:47-$` (rc 0; `$A` = `$TAP/tmp.H6TpYW`, đã xóa). `docs AGENTS` in `AGENTS-OK`; `README-OK`, `MASTER-OK` vẫn in. `wc -l` = 48. AC-14: grep trên `README.md`, `AGENTS.md` rỗng (exit 1); master spec = 6. Phạm vi: grep NFR-3 rỗng (rc 1); file track đã đổi so với `7dc2299`: `AGENTS.md`, `README.md`, `package.json`, `specs/sutta-mcp-requirements.md`, `src/index.ts`, `src/search.ts`, `test/search.test.ts` (= T-4-3 cộng đúng `AGENTS.md`). `workflow-contract.json` không đổi (`CONTRACT-UNCHANGED`); thêm ngoài kế hoạch: `workflow-state.json` không đổi (`STATE-UNCHANGED`). **sha256 mới của `AGENTS.md` = `2e23154c8bf28a0aaa6d76f1f5bdf42ab5724013e975b60d93c060d7af5d5cdf`**, trùng mô phỏng của task planner. Không chạy hàm contract nào; cập nhật contract `dependencies.context:agents` là việc của orchestrator và cần người dùng authorize. Không lệch kế hoạch. `$TAP` = `/tmp/tap-3wR4GO` (đã xóa bởi trap). Log: `.claude/spec-evidence/tools-api-passthrough/T-5-1.log`.

## AC coverage

| AC / mục | Task |
|---|---|
| AC-1, AC-2, AC-3, AC-5, AC-6, AC-7 (harness live) | T-3-4 (V5) |
| AC-4 | T-3-4 (V5: dòng nguồn, `root_text`, không `translation_text`/`comment_text`); T-3-1 (đọc handler: một `fetch`, không tới `/api/suttaplex/`) |
| AC-8 | T-3-4 (V5); T-3-1 (đọc `describe()` của `get_menu`: `sutta`, `vinaya`, `abhidhamma`) |
| AC-9 (input không hợp lệ) | T-3-4 (V5, 6 dòng `AC-9`) |
| AC-10 (`search_instant` là `search_topic` đổi tên) | T-3-4 (V5: trùng byte với bản build `7dc2299`, `inputSchema`, `desc_base + " " + S`, thứ tự năm tên); T-1-2, T-3-1 (`SEARCH-INSTANT-OK`); T-1-3 (`SEARCH-OK`) |
| AC-11 (`tools/list`, mô tả) | T-3-4 (V5); T-3-1 (đọc các ý FR-14 còn lại) |
| AC-12 (unit test, đột biến, fixture) | T-2-1 (ghi, cắt, kiểm lại phép cắt, `FIXTURES-OK`); T-2-2 (`npm test` 20/20); T-3-2 (hai lần chạy, 8 tiền tố, fixture); T-3-3 (6 đột biến, bản sao bị xóa) |
| AC-13 (logic tự chế đã bỏ, phạm vi, không trạng thái) | T-3-1; phạm vi kiểm lại ở T-4-3 và T-5-1 |
| AC-14 (tài liệu) | T-4-1 (README), T-4-2 (master spec), T-5-1 (AGENTS.md, grep trên cả ba file); mệnh đề PR: §Notes (FR-21); mệnh đề contract: orchestrator sau T-5-1 |
| Vùng được bảo vệ (`design.md:78-82`) | T-1-2 (`SEARCH-INSTANT-OK`), T-1-3 (`SEARCH-OK`), T-2-2 (`SEARCHTEST-OK`, chỉ dòng 1 đổi), T-3-1, T-3-4 (AC-10) |
| Dọn dẹp (NFR-5) | `trap` của khối khởi đầu trong mọi task; T-3-3 (bản sao đột biến); T-4-3 |

| FR / NFR | Task |
|---|---|
| FR-1 | T-1-2 (I1), T-3-4 (V5 `AC-10 names`) |
| FR-2 | T-1-2, T-3-4 (V5 `AC-11`, `AC-9`) |
| FR-3, FR-4 | T-1-1 (P1), T-2-2 (case `FR-3:`, `FR-4:`), T-3-1 (một `fetch` mỗi handler), T-3-3 (đột biến b, f), T-3-4 (dòng nguồn của AC-1, AC-3, AC-4, AC-6, AC-7, AC-8) |
| FR-5 | T-1-1, T-1-2, T-2-1 (F2 dựng URL bằng P1), T-2-2 (case `FR-5:`), T-3-1 (`HANDLERS-OK`) |
| FR-6 | T-1-2 (`SEARCH-INSTANT-OK`), T-1-3 (`SEARCH-OK`), T-3-4 (AC-10) |
| FR-7, FR-8, FR-9 | T-2-2 (case `FR-7:`, `FR-9:`), T-3-4 (AC-1) |
| FR-10, FR-11, FR-12 | T-2-2 (case `FR-10:` ×2, `FR-11:`, `FR-12:`), T-3-3 (đột biến a, c, d, e), T-3-4 (AC-2, AC-5..AC-8) |
| FR-13 | T-3-1 (`HANDLERS-OK`, không `try`) |
| FR-14 | T-3-1 (đọc I1), T-3-4 (AC-11) |
| FR-15, FR-16 | T-1-2, T-1-3, T-3-1 |
| FR-17 | T-2-2, T-3-2 |
| FR-18 | T-3-3 |
| FR-19 | T-4-1 |
| FR-20 | T-4-2 |
| FR-21 | T-4-3 (không từ khóa tự đóng trong commit); §Notes (mô tả PR) |
| FR-22 | T-5-1 (task build cuối, chỉ `AGENTS.md`); orchestrator (cập nhật contract do người dùng authorize) |
| NFR-1 | T-2-2, T-3-1 |
| NFR-2 | T-3-1 |
| NFR-3 | T-3-1, T-4-3, T-5-1 |
| NFR-4 | T-2-1, T-3-2 |
| NFR-5 | Conventions (luật hợp lệ); T-2-1, T-3-4; T-4-3 (dọn dẹp) |
| NFR-6 | T-3-1 (một `fetch` mỗi handler), T-3-4 (chờ 90 s mỗi frame) |
| NFR-7 | T-3-1 (cảnh báo trong `describe()`), T-3-4 (AC-10 câu `S`) |

## Dependency graph

```
T-1-1 ─> T-1-2 ─> T-1-3 ─────────┐            (G1 = T-1-1..T-1-3)
  └────> T-2-1 ─────────────────> T-2-2        (G2 = T-2-1, T-2-2)
                                  │
       ┌──────────────┬───────────┼───────────┐
       v              v           v           v
     T-3-1          T-3-2       T-4-1       T-4-2
       │              ├─> T-3-3   │           │
       └─> T-3-4 <────┘     │     │           │
             │              │     │           │
             └──────────────┴─────┴─> T-4-3 <─┘
                                        │
                                        v
                                      T-5-1 ─> [orchestrator: cập nhật contract, cần người dùng authorize]
```

- **Task chạy mạng:** T-2-1 (4 request) và T-3-4 (31 dòng V4: 28 lời gọi tool, 3 `curl`). Hai task này chạy tuần tự, không song song với nhau hay với task nào khác.
- **T-5-1 luôn là task cuối.** Không task nào, kể cả code review on-completion, được dispatch sau nó trước khi orchestrator settle cập nhật contract.

## Notes

<!-- Blockers, decisions made during implementation, scope adjustments. Append entries; do not delete history. -->

- **Quyết định của người dùng (ghi lại, không mở lại):**
  - 2026-10-24: năm quyết định stakeholder của requirements (`clarifications.md`); C1 = (A), C3 chấp nhận kèm cảnh báo trong `describe()`, C4 default; C2, C5–C12 default.
  - 2026-10-30: design được duyệt (Continue), giữ default của Q1 (không thêm kiểm `.`/`..`), Q2 (chuỗi in nguyên văn), Q3 (`scripts.test` liệt kê hai file). Vì vậy không có lần sửa design nào trước các task.
- **Cách đọc ràng buộc thứ hai của `design.md:1309`.** "T2, bốn fixture và PK-1 vào cùng lúc hoặc sau đó trong cùng task" được đọc là: PK-1 nằm cùng task với T2 (T-2-2) và sau fixture (T-2-1); fixture ghi live trong task riêng, vì có luật halt và chạy lại riêng. Không có điểm nào `npm test` đỏ: `scripts.test` chỉ đổi khi file test mới và mọi fixture đã có. G2 vẫn là một commit.
- **Baseline của AC-10.** Requirements nói chạy harness ở `7dc2299` "trước khi sửa code". Design dựng bản build baseline bằng `git archive 7dc2299` ngay trong lần chạy harness (`design.md:1376-1378`), tương đương code chưa sửa. T-3-4 theo design; không có task baseline riêng trước T-1-1.
- **design-review-2 S1** (tùy chọn) gộp vào T-3-4: V5 in `INCONCLUSIVE (network)` sau khi `run.sh` thoát 0 là lệch trên lần chạy hợp lệ, không phải lỗi mạng. Không sửa `design.md`.
- **FR-21, mô tả PR (khi người dùng yêu cầu tạo PR).** Mô tả PR nêu #16, #19, #20 bị spec này thay thế, kèm lý do của M-12 (`get_parallels` in theo anchor; `get_suttaplex` in nguyên `blurb` và `translations`; không còn citation `Difficulty`). Không dùng `Closes #…`/`Fixes #…` trong commit hay PR, và không agent nào đóng issue, trừ khi người dùng đồng ý rõ ràng lúc merge.
- **Response thô.** Ràng buộc của orchestrator: không ghi response thô SuttaCentral ra ngoài `test/fixtures/`. F2 (`$W/raw`) và V3 (`$H/ac`) là script normative của design và tự ghi file; chúng chỉ ghi vào `$TAP` mà chính lần gọi đó xóa. Nếu orchestrator đọc ràng buộc này chặt hơn, F2 và V3 phải đổi qua một lần sửa design; implementer không tự đổi.
- **Ràng buộc phạm vi áp cho mọi task:**
  - Không thêm dependency, runner, assertion library hay linter. `package-lock.json`, `tsconfig.json` không đổi; `package.json` chỉ đổi `scripts.test`.
  - Không có file mới trong `src/` ngoài `src/passthrough.ts`, không file mới ở gốc repo.
  - Không sửa artifact của các spec cũ (`non-segmented-translation-guard`, `bilara-lang-param`, `segment-id-in-get-sutta`, `get-sutta-unknown-uid`, `search-api-passthrough`); chúng giữ nguyên làm lịch sử.
  - Không sửa `specs/INDEX.md`: dòng của spec này do orchestrator viết khi hoàn tất.
  - Không sửa `specs/tools-api-passthrough/workflow-contract.json` hay `workflow-state.json` trong bất kỳ task nào.
- **Commit (nếu người dùng yêu cầu):** G1 (T-1-1..T-1-3) một commit; G2 (T-2-1, T-2-2) một commit; T-4-1, T-4-2, T-5-1 mỗi task một commit. Task verify và dọn dẹp không có commit. Mọi lệnh kiểm neo `7dc2299`, nên cho cùng kết quả trước và sau commit.
