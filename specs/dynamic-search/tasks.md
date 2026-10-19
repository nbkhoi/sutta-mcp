# Tasks: `search_topic` dùng search API của SuttaCentral (dynamic search)

**Status:** Complete
**Created:** 2026-10-19
**Spec slug:** dynamic-search
**Design:** [design.md](./design.md)
**Requirements:** [requirements.md](./requirements.md)
**Review đã kế thừa:** [reviews/design-review-2.md](./reviews/design-review-2.md) (Approve). S3 (Suggestion) là việc của orchestrator, xem §Notes.

## Conventions

- Task ID theo mẫu `T-<phase>-<n>`. Mỗi task là một thay đổi logic. Verify là task riêng, không nhét vào task implement.
- **Đọc tối thiểu để implement:** `design.md:56-64`. Các khối ràng buộc gồm S1 (`design.md:154-160`), S2 (`:174-227`), S3 (`:241-360`), §Lắp ráp (`:448-466`), sáu khối tài liệu R-1 (`:514`), R-2 (`:520-536`), A-1 (`:542-563`), M-1 (`:569-580`), M-2 (`:586`), M-3 (`:592-598`), và §Thứ tự áp dụng (`:497-509`). Số dòng ở đây là số dòng của `design.md` (Status Reviewed, không sửa nữa).
- **Khối [NORMATIVE] là chép nguyên văn, không phải minh họa.** Các task dưới đây **cố ý không chép lại code hay văn bản của khối**. Chép từ `design.md` theo dải dòng được chỉ, đừng chép từ file này, đừng diễn đạt lại, đừng format lại (kể cả chuỗi `describe()` dài, khoảng trắng, comment). Cách an toàn nhất là chép bằng script (`sed -n 'A,Bp' design.md`), không gõ tay. Lưới thật là `diff`. Grep chỉ là bộ tiền lọc, pass grep không có nghĩa là đúng.
- **Nhóm build đỏ có chủ đích: T-2-1 → T-2-2 → T-2-3.** S3 dùng tên do S2 và S1 định nghĩa, S2 xóa `searchByTopic()` mà Tool 1 cũ dùng, nên không có thứ tự nào giữ build xanh giữa chừng (đã thử trên bản dựng tạm ngày 2026-10-19). Build đỏ sau T-2-1 và T-2-2 là **dự kiến**, với đúng tập lỗi ghi trong từng task. Lỗi khác tập đó là fail. Tiêu chí `npm run build` thoát 0 gắn vào T-2-3 (cho cả nhóm) và T-3-1. Không "sửa" build đỏ giữa nhóm bằng cách đụng code ngoài khối. Ba task là một commit, nếu commit.
- **Áp dụng từ dưới lên.** Task code đi S3 → S2 → S1 và task tài liệu áp khối dưới trước, để số dòng `40846bb` dùng làm neo còn đúng. Dù vậy, luôn định vị theo nội dung neo (`design.md:493`), không theo số dòng của file đang sửa.
- **Mốc so sánh cố định là `40846bb`**, không phải HEAD hay `master`. Lệnh lắp ráp và lệnh dựng lại file tài liệu đọc từ `git show 40846bb:…`, nên cho cùng kết quả trước và sau commit.
- **Thứ tự bắt buộc (design §Thứ tự áp dụng):** T-6-1 (A-1, `AGENTS.md`) là task **cuối cùng** của file này, đứng riêng, chỉ sửa `AGENTS.md`. Mọi task khác, kể cả verify và dọn dẹp, xong trước nó. Ngay sau T-6-1, orchestrator chạy đường cập nhật contract với sự authorize rõ ràng của người dùng, rồi mới tới code review on-completion. Đó là việc của orchestrator, không phải bước của implementer (xem T-6-1).
- **Cấm sửa số hay literal đã pin trong spec artifact để mệnh đề pass.** Nếu số đo lệch: chạy lại (luật chạy lại bên dưới), rồi fetch lại endpoint đối chiếu (cùng `query`, `language`, `limit=10`, `offset`; luật 3 của `specs/bilara-lang-param/requirements.md:118`), rồi **halt và báo cáo**. Không tự đính chính `requirements.md`, `design.md`, và không đổi `VI_TOPIC_TERMS` (đổi thuật ngữ là sửa design). Upstream trôi và regression có cùng triệu chứng, và không cái nào biện minh cho một lần sửa spec.
- **Lệnh kiểm nằm trong fenced code block, không trong ô bảng markdown.** Alternation viết `|` trơn trong `grep -E`. **Cấm** chép `\|` từ ô bảng của `design.md:666-699`: `grep -E` đọc `\|` thành ký tự `|` literal, cho 0 hit với mọi input.
- **Chạy các khối lệnh bằng `bash`** (ví dụ `bash -s <<'SH'` … `SH`), không qua shell mặc định zsh: word splitting và `echo` khác nhau. Shell state không giữ giữa các lần gọi, nên mỗi lần gọi bắt đầu bằng **khối khởi đầu**:

  ```sh
  REPO=/Users/khoinb/worktrees/sutta-mcp/main; cd "$REPO"
  DS="$REPO/specs/dynamic-search/design.md"
  E="$REPO/.claude/spec-evidence/dynamic-search"   # bằng chứng, gitignored (.claude/)
  BASE=$(cat "$E/base-dir.txt"); AB=$(cat "$E/ab-dir.txt")   # do T-1-1 tạo, ngoài repo
  eval "$(sed -n '216p' "$REPO/specs/get-sutta-unknown-uid/design.md")"   # định nghĩa check()
  S1='/^async function fetchSearch/,/^}$/'
  S2='/^\/\/ ─── Search: chủ đề/{f=1} f{print} f&&/^}$/{if(++n==2)exit}'
  S3='/^\/\/ Tool 1: search_topic$/,/^\);$/'
  # một lần chạy search_topic (hoặc tool khác) trên bản mới: $1=tên case, $2=tool, $3=arguments JSON
  run() { (cd "$REPO" && /tmp/mcp-call.sh "$2" "$3") > "$AB/$1.raw"
          check < "$AB/$1.raw" > "$AB/$1.txt" 2> "$AB/$1.env"; echo "$1 check=$? $(cat "$AB/$1.env")"; }
  # luật hợp lệ 1-3 cho search_topic thường (design.md:650-652); trả 0 nếu hợp lệ
  valid() { grep -q '^items=1 isError=false$' "$AB/$1.env" || return 1
            [ "$(head -n 1 "$AB/$1.txt")" != "fetch failed" ] || return 1
            head -n 1 "$AB/$1.txt" | grep -q '^SuttaCentral API error:' && return 1
            head -n 1 "$AB/$1.txt" | grep -q -E '^(Tìm thấy|Không tìm thấy|Không có kết quả)'; }
  # đếm số lần các dòng $2.. xuất hiện liên tiếp, khớp cả dòng, trong file $1
  consec() { f=$1; shift; awk 'NR==FNR{w[++n]=$0; next} {L[++m]=$0} END{c=0; for(i=1;i<=m;i++){ok=1; for(j=1;j<=n;j++) if(L[i+j-1]!=w[j]){ok=0; break}; if(ok) c++}; print c}' <(printf '%s\n' "$@") "$f"; }
  # đếm dòng URL theo nhóm: in "<số dưới Khớp tiêu đề:> <số dưới Khớp nội dung:>"
  groups() { awk '/^Khớp tiêu đề:$/{s="t"} /^Khớp nội dung:$/{s="c"} /^URL: https:\/\/suttacentral\.net\//{c[s]++} END{print c["t"]+0, c["c"]+0}' "$1"; }
  # 14 cặp "key|thuật ngữ" đọc từ VI_TOPIC_TERMS trong src (T-3-1 đã chốt src = design)
  keys() { sed -n -E 's/^  \["([^"]+)", "([^"]+)"\],$/\1|\2/p' "$REPO/src/index.ts"; }
  ```

  Bằng chứng (lệnh đã chạy, exit code, số đếm, `shasum -a 256` của từng text, số lần chạy lại) ghi vào `$E/<task-id>.log`. Output thô và text của harness nằm trong `$AB` (ngoài repo) và bị xóa ở T-5-1. `$E` nằm dưới `.claude/` nên bị ignore và không vào commit.
- **Harness** (`design.md:646`): `/tmp/mcp-call.sh` được dựng ở T-1-1 bằng cách chạy nguyên văn `specs/non-segmented-translation-guard/requirements.md:183-193`. Không sửa heredoc. Script chạy `node ./dist/index.js` tương đối với `cwd`, nên chạy được cả bản cũ (`cd "$BASE"`) lẫn bản mới (`cd "$REPO"`). `check()` in `items=<n> isError=<bool>` lên stderr, in text lên stdout (không có newline cuối), exit 1 nếu không có đúng 1 dòng `"id":2`.
- **`npm run build` một lần ở đầu mỗi lần gọi Bash có chạy harness bản mới** (luật 1 của `specs/bilara-lang-param/requirements.md:116`). Mỗi lần chạy có `sleep 20`, nên mỗi lần gọi Bash chạy **tối đa 10 lần harness** (hoặc 4 cặp A/B) để không chạm timeout 600 s.
- **Luật hợp lệ** (`design.md:648-656`): một lần chạy chỉ được tính khi đạt mọi điều kiện áp cho loại của nó. `search_topic` thường: hàm `valid` (luật 1–3, cộng `isError=false`). AC-19: luật 1 cộng `isError=true` và tiền tố riêng (T-3-9). AC-12: luật 1, 2, 4 trên **cả** bản cũ lẫn bản mới (T-3-10). AC-14 `tools/list`: luật 5 (T-3-9). Mệnh đề phủ định ("không chứa X", đếm = 0) chỉ được đánh giá trên lần chạy hợp lệ.
- **Luật chạy lại:** lần chạy không hợp lệ thì chạy lại đúng case đó (AC-12: chạy lại cả cặp; AC-18: chạy lại cả cặp `all`/`content` trang 4; AC-3: chạy lại cả bốn). Ghi số lần chạy lại vào Result. Chạy tuần tự, không song song, không chạy nền (design đo: song song làm tăng `fetch failed`). Một case hỏng 3 lần liên tiếp thì đọc `/tmp/mcp-stderr.log`, rồi halt và báo cáo (ngưỡng 3 là của task plan này, không phải của design).
- **Matcher chuỗi** chứa `*`, `?`, `[`, `(`, `—`, `→` hay ký tự Unicode thì dùng `grep -F` (`-x` khi khớp cả dòng) hoặc `consec`. Dòng tiêu đề khớp tiêu đề có khoảng trắng cuối từ upstream (`design.md:419`), nên kiểm bằng chuỗi con `-F`, không bằng `-x`. So sánh "đúng bằng" dùng `[ "$(…)" = '…' ]` hoặc `cmp`.
- Build command: `npm run build` (tsc, strict). Repo **không có** test runner và **không có** linter, và requirements loại trừ việc thêm (NFR-1, §Out of Scope).

## Phase 1: Foundation

- [x] **T-1-1:** Dựng bản baseline `40846bb` ngoài repo, dựng harness, tạo thư mục A/B (trước khi sửa code)
  - **Files:** — (không ghi file nào được track. Tạo `$BASE`, `$AB` dưới `/tmp`, tạo `/tmp/mcp-call.sh`, ghi `$E/base-dir.txt`, `$E/ab-dir.txt`, `$E/T-1-1.log`)
  - **Acceptance:**
    - Chạy khi `src/` của repo còn trùng `40846bb`, tức trước T-2-1. Guard phải **dừng thật**, kể cả với file untracked trong `src/`.
    - Bản cũ dựng theo `design.md:660` (cách của `specs/get-sutta-unknown-uid/design.md:177-186`, thay `249bb97` bằng `40846bb` ở cả dòng kiểm lẫn `git archive`). Không dùng `git worktree` hay `git stash`, không ghi gì vào `.git`.
    - `$BASE/dist/index.js` tồn tại. `/tmp/mcp-call.sh` trùng `specs/non-segmented-translation-guard/requirements.md:184-191`.
  - **Test:**

    ```sh
    set -e
    REPO=/Users/khoinb/worktrees/sutta-mcp/main
    E="$REPO/.claude/spec-evidence/dynamic-search"; mkdir -p "$E"
    git -C "$REPO" diff --quiet 40846bb -- src || { echo "STOP: src/ đã khác 40846bb"; exit 1; }
    test -z "$(git -C "$REPO" ls-files --others --exclude-standard -- src)" || { echo "STOP: file untracked trong src/"; exit 1; }
    BASE=$(mktemp -d /tmp/sutta-base.XXXXXX); AB=$(mktemp -d /tmp/sutta-ab.XXXXXX)
    git -C "$REPO" archive 40846bb src package.json tsconfig.json | tar -x -C "$BASE"
    ln -s "$REPO/node_modules" "$BASE/node_modules"
    (cd "$BASE" && npx tsc -p .)
    test -f "$BASE/dist/index.js"
    printf '%s\n' "$BASE" > "$E/base-dir.txt"; printf '%s\n' "$AB" > "$E/ab-dir.txt"
    sed -n '183,193p' "$REPO/specs/non-segmented-translation-guard/requirements.md" | sh
    diff <(sed -n '184,191p' "$REPO/specs/non-segmented-translation-guard/requirements.md") /tmp/mcp-call.sh && echo HARNESS-OK
    ```

    Ghi exit code từng bước và sha256 của `/tmp/mcp-call.sh` vào `$E/T-1-1.log`. Guard dừng thì halt và báo cáo, không tự "sửa" `src/` cho khớp.
  - **Depends on:** —
  - **Result:** Khối Test (`tasks.md:67-79`, trích bằng script) chạy bằng `bash -x`, exit 0 (`set -e`, mọi bước exit 0). Cả hai guard im lặng: `git diff --quiet 40846bb -- src` cho 0, `ls-files --others --exclude-standard -- src` rỗng. `BASE=/tmp/sutta-base.gfrie6`, `AB=/tmp/sutta-ab.mza2Ht` (rỗng). `npx tsc -p .` trong `$BASE` cho 0, `$BASE/dist/index.js` tồn tại (sha256 `898e4a22d41287e403579a7d48700d23f06fceecc3b8539929841888fcbcee9b`). `cmp` giữa `git show 40846bb:src/index.ts` và `$BASE/src/index.ts` cho 0. `diff` dòng 184-191 với `/tmp/mcp-call.sh` cho 0, in `HARNESS-OK`. Script có quyền thực thi, sha256 `3ad73bb76e770bf4a211489c5ba20582c54b20b6d49dd4abf626a02c777f142b`. Không ghi gì vào `.git`, không file được track nào đổi. Bằng chứng nằm ở `$E/T-1-1.log`, `$E/base-dir.txt`, `$E/ab-dir.txt`.

## Phase 2: Core Implementation (nhóm build đỏ T-2-1 → T-2-3)

- [x] **T-2-1:** Thay đăng ký tool `search_topic` bằng khối S3 (**nguyên văn**)
  - **Files:** `src/index.ts`, đoạn từ dòng `// Tool 1: search_topic` tới dòng `);` đóng `server.tool(` của nó (`40846bb:191-230`)
  - **Acceptance:**
    - Đoạn đó được thay bằng đúng `design.md:241-360` (120 dòng). Không dòng nào khác của `src/index.ts` đổi. Lệnh lắp ráp từng phần dưới đây in `S3-OK`.
    - Drift cấm, vì compile sạch hoặc lọt grep (`design.md:748`): bỏ `?? topic.normalize("NFC").trim()`; đổi thứ tự NFC/`toLowerCase`/`trim`/gộp khoảng trắng; bỏ `h > 0`; bọc `await fetchSearch` trong `try`; thêm `.transform`/`.catch`/`coerce` vào schema; viết lại hay ngắt dòng chuỗi `describe()`; thêm dòng `Thuật ngữ đã dùng…` vào nhánh FR-20; in `total`.
    - Build **đỏ là dự kiến**. Tập lỗi dự kiến (đo trên bản dựng tạm 2026-10-19): chỉ `TS2304 Cannot find name` cho `VI_TOPIC_TERMS`, `SEARCH_PAGE_SIZE`, `fetchSearch`, `formatTitleMatch`, `formatContentMatch`, tổng 9 lỗi. Lỗi khác tập này là fail.
  - **Test:**

    ```sh
    # khối khởi đầu (§Conventions), rồi:
    OLD=$(mktemp); git show 40846bb:src/index.ts > "$OLD"
    { sed -n '1,190p' "$OLD"; awk "$S3" "$DS"; sed -n '231,$p' "$OLD"; } | diff - src/index.ts && echo S3-OK
    rm -f "$OLD"
    npx tsc -p . --noEmit 2>&1 | grep -c 'error TS'                                    # 9
    npx tsc -p . --noEmit 2>&1 | grep 'error TS' | grep -v -c 'error TS2304: Cannot find name'   # 0
    ```

    Ghi vào `$E/T-2-1.log`.
  - **Depends on:** T-1-1
  - **Result:** Preflight: `git diff --quiet 40846bb -- src` cho 0, không có file untracked trong `src/`. Splice bằng script: `40846bb:1-190` + `design.md:241-360` (`sed -n`, 120 dòng, trùng `awk "$S3" design.md`) + `40846bb:231-$`, không gõ tay. Khối Test chạy bằng `bash` với khối khởi đầu và in `S3-OK` (diff lắp ráp rỗng). Mọi hunk của `git diff -U0 40846bb` nằm trong dải 194-308 của khối S3. sha256 của khối S3 trong src bằng của design (`9b995b2b…f0bf09`). `src/index.ts` có 599 dòng, sha256 `9967fb3f…afaedf`. `tsc --noEmit` cho `grep -c 'error TS'` = 9, số dòng không phải TS2304 = 0. Đúng tập dự kiến: `SEARCH_PAGE_SIZE` ×4, `VI_TOPIC_TERMS` ×2, `fetchSearch` ×1, `formatTitleMatch` ×1, `formatContentMatch` ×1. Build đỏ là dự kiến (nhóm T-2-1..T-2-3). Bằng chứng ở `$E/T-2-1.log`.

- [x] **T-2-2:** Thay `TOPIC_INDEX` và `searchByTopic()` bằng section search S2 (**nguyên văn**)
  - **Files:** `src/index.ts`, đoạn từ dòng `// ─── Topic → UID index (tĩnh, đủ cho prototype) ───…` tới hết `searchByTopic()` (`40846bb:32-108`)
  - **Acceptance:**
    - Đoạn đó được thay bằng đúng `design.md:174-227` (54 dòng). Dòng trống `40846bb:109` trước `// ─── Render sutta text…` giữ nguyên. Lệnh lắp ráp từng phần in `S2-OK`.
    - Drift cấm: dùng object literal hay `Record` thay `Map` (Alternative C); thêm, bớt, đổi thứ tự hay đổi thuật ngữ trong `VI_TOPIC_TERMS`; thêm `?.` vào `hit.uid.toUpperCase()`; sửa `formatCitation()` để hiểu `difficulty` số (Alternative B1); giữ lại `TOPIC_INDEX` "làm fallback".
    - Build **đỏ là dự kiến**, với đúng 1 lỗi: `TS2304: Cannot find name 'fetchSearch'`.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    OLD=$(mktemp); git show 40846bb:src/index.ts > "$OLD"
    { sed -n '1,31p' "$OLD"; awk "$S2" "$DS"; sed -n '109,190p' "$OLD"; awk "$S3" "$DS"; sed -n '231,$p' "$OLD"; } | diff - src/index.ts && echo S2-OK
    rm -f "$OLD"
    npx tsc -p . --noEmit 2>&1 | grep 'error TS'      # đúng 1 dòng, TS2304 'fetchSearch'
    grep -c 'TOPIC_INDEX' src/index.ts                 # 0
    ```

    Ghi vào `$E/T-2-2.log`.
  - **Depends on:** T-2-1
  - **Result:** Preflight: lắp ráp S3 của T-2-1 trên src hiện tại cho diff rỗng, dòng 1-108 trùng `40846bb`. Splice bằng script: src `1-31` + `awk "$S2" design.md` (54 dòng, trùng `design.md:174-227`) + src `109-$`, không gõ tay. Khối Test chạy bằng `bash` với khối khởi đầu và in `S2-OK` (diff lắp ráp rỗng; dòng trống `40846bb:109` giữ nguyên). `tsc --noEmit` cho đúng 1 lỗi: `src/index.ts(224,24): error TS2304: Cannot find name 'fetchSearch'.` `grep -c 'TOPIC_INDEX'` = 0, `searchByTopic` = 0. sha256 khối S2 trong src bằng của design (`af7218b9…77f645`). `src/index.ts` có 576 dòng, sha256 `7b8ea317…3aa8b`. Build đỏ là dự kiến (nhóm T-2-1..T-2-3). Bằng chứng ở `$E/T-2-2.log` (dòng `assembly diff exit=` trống do đọc `PIPESTATUS` sau `&&`, `S2-OK` là bằng chứng diff thoát 0).

- [x] **T-2-3:** Thêm `fetchSearch()` (S1, **nguyên văn**) sau `fetchParallels()`, đóng nhóm build đỏ
  - **Files:** `src/index.ts`, ngay sau dòng trống `40846bb:31` (sau `}` của `fetchParallels()`)
  - **Acceptance:**
    - Chèn đúng `design.md:154-160` (7 dòng), rồi một dòng trống, ngay trước dòng mở đầu S2. Lệnh lắp ráp **toàn file** của `design.md:448-456` in `ASSEMBLY-OK`, và file có 584 dòng.
    - Drift cấm: luôn gửi `offset` (kể cả 0); thêm `selectedLanguages`, `restrict`, `matchpartial`, `page`, `from`; dùng POST; thêm `try`, retry, timeout; dùng `encodeURIComponent` dựng URL tay thay `URLSearchParams`.
    - **Nhóm T-2-1..T-2-3:** `npm run build` thoát 0.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi (chạy trong repo: lệnh của design dùng git rev-parse --show-toplevel):
    npm run build; echo "build exit=$?"                       # 0
    sed -n '449,456p' "$DS" | bash                            # in ASSEMBLY-OK, rồi 519
    wc -l < src/index.ts                                      # 584
    ```

    Ghi vào `$E/T-2-3.log`. Không in `ASSEMBLY-OK` thì so `diff` để tìm khối lệch, sửa cho khớp `design.md`, không sửa `design.md`.
  - **Depends on:** T-2-2
  - **Result:** Preflight: lắp ráp S2+S3 của T-2-2 trên src hiện tại cho diff rỗng (sha256 `7b8ea317…3aa8b`, 576 dòng). Splice bằng script: src `1-31` + `awk "$S1" design.md` (7 dòng, trùng `design.md:154-160`) + một dòng trống + src `32-$`, không gõ tay. Khối Test chạy bằng `bash` với khối khởi đầu: `npm run build` thoát 0; `sed -n '449,456p' design.md | bash` in `ASSEMBLY-OK` rồi `519`; `wc -l` = 584. `tsc --noEmit` cho 0 lỗi. sha256 khối S1 trong src bằng của design (`9a9b53d8…008347`). `src/index.ts` sha256 `fb9794b0…59db53`. Mọi hunk của `git diff -U0 40846bb` nằm trong dải 32-108 và 191-230 của `40846bb`. Nhóm build đỏ T-2-1..T-2-3 đã đóng (build xanh). Bằng chứng ở `$E/T-2-3.log`.

## Phase 3: Integration & Verification

- [x] **T-3-1:** Build, phạm vi diff neo `40846bb`, lắp ráp, bất biến grep (AC-13)
  - **Files:** — (chỉ kiểm; ghi `$E/T-3-1.log`)
  - **Acceptance:**
    - `npm run build` thoát 0 (NFR-3).
    - `git status --porcelain -- src` chỉ có ` M src/index.ts` (hoặc rỗng nếu đã commit), và `git diff --name-only 40846bb -- src` có đúng `src/index.ts`. Không file untracked trong `src/` (NFR-2).
    - `package.json`, `package-lock.json`, `tsconfig.json` không đổi so với `40846bb` (NFR-1).
    - Spec tiền nhiệm không đổi: `specs/non-segmented-translation-guard/`, `specs/bilara-lang-param/`, `specs/segment-id-in-get-sutta/`, `specs/get-sutta-unknown-uid/` (`design.md:85`).
    - §Lắp ráp in `ASSEMBLY-OK` (khóa FR-5, FR-14 ở mức code, và mọi vùng được bảo vệ).
    - Bảng bất biến `design.md:690-699`, chạy từ fence dưới: `segmented` 3, `sujato` 3, translator-ID 0, `TOPIC_INDEX` 0, `search/instant?` 1, `fetch(` 4, gate 1, `wc -l` 584. Số lệch thì halt và báo cáo.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build; echo "build exit=$?"                                           # 0
    git status --porcelain -- src
    git diff --name-only 40846bb -- src                                           # src/index.ts
    git ls-files --others --exclude-standard -- src | wc -l                       # 0
    git diff --quiet 40846bb -- package.json package-lock.json tsconfig.json; echo "pkg exit=$?"   # 0
    git diff --quiet 40846bb -- specs/non-segmented-translation-guard specs/bilara-lang-param specs/segment-id-in-get-sutta specs/get-sutta-unknown-uid; echo "prior-specs exit=$?"   # 0
    sed -n '449,456p' "$DS" | bash                                                # ASSEMBLY-OK, 519
    grep -c 'segmented' src/index.ts                                              # 3
    grep -c -F 'sujato' src/index.ts                                              # 3
    grep -c -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/index.ts    # 0
    grep -c 'TOPIC_INDEX' src/index.ts                                            # 0
    grep -c -F 'search/instant?' src/index.ts                                     # 1
    grep -c 'fetch(' src/index.ts                                                 # 4
    grep -c -F 'extracted.source !== "translation"' src/index.ts                  # 1
    wc -l < src/index.ts                                                          # 584
    ```

  - **Depends on:** T-2-3
  - **Result:** Khối Test chạy bằng `bash` với khối khởi đầu (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`), mọi giá trị khớp kỳ vọng: `npm run build` thoát 0; `git status --porcelain -- src` = ` M src/index.ts`; `git diff --name-only 40846bb -- src` = `src/index.ts`; untracked trong `src/` = 0; `pkg exit=0`; `prior-specs exit=0`; §Lắp ráp in `ASSEMBLY-OK` rồi `519`; `segmented` 3, `sujato` 3, translator-ID 0, `TOPIC_INDEX` 0, `search/instant?` 1, `fetch(` 4, gate 1, `wc -l` 584. Không sửa `src/`. Bằng chứng ở `$E/T-3-1.log`.

- [x] **T-3-2:** Kiểm tĩnh: vùng được bảo vệ, đọc code AC-3/4/8/10/11/19
  - **Files:** — (chỉ kiểm; ghi `$E/T-3-2.log`)
  - **Acceptance:**
    - **Vùng được bảo vệ** (`design.md:74-81`): diff N5-T, N1-A (so với `specs/non-segmented-translation-guard/design.md`), N3-A, N3-B (so với `specs/bilara-lang-param/design.md`), U1 (so với `specs/get-sutta-unknown-uid/design.md`) đều rỗng, số dòng 8, 20, 6, 18, 14.
    - **Code mới không đọc** `highlight`, `is_segmented`, `segmented_uid`, `fuzzy_dictionary` (`design.md:143`, NFR-7): 0 hit trong S1+S2+S3 lấy từ `src`.
    - **AC-10:** `fetchSearch()` có dòng `throw new Error(\`SuttaCentral API error: ${res.status}\`)`; S3 không có `try`/`catch`; S3 có ba dòng `Array.isArray(data?.suttaplex)`, `Array.isArray(data?.hits)`, `typeof data?.total === "number"`.
    - **AC-11:** `search/instant?` 1 hit, chỉ ở dòng `fetch` của S1; S3 không gọi `fetchSuttaplex`/`fetchBilaraText`/`fetchParallels`; khai báo `const`/`let`/`var` module-scope chỉ khác `40846bb` ở chỗ mất `TOPIC_INDEX` và thêm `SEARCH_PAGE_SIZE`, `VI_TOPIC_TERMS`, `DIFFICULTY_NAMES` (không hằng nào giữ response hay `uid`, NFR-5).
    - **AC-3, AC-4 (đọc code):** dòng `key` bắt đầu bằng `topic.normalize("NFC")`; nhánh không khớp gửi `topic.normalize("NFC").trim()`; tra bảng bằng `VI_TOPIC_TERMS.get(key)` (khớp chính xác, Q2 đã chốt).
    - **AC-8 (đọc code):** `return` trong `if (query === "")` đứng trước dòng `await fetchSearch(`. Ghi hai số dòng vào Result.
    - **AC-19 (đọc code):** S3 có `z.enum(["title", "content", "all"])` và `.number()` `.int()` `.min(1)` `.max(10000)`; 0 hit `transform|catch|coerce|preprocess` trong S3.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    NSG=specs/non-segmented-translation-guard/design.md; BLP=specs/bilara-lang-param/design.md; GSU=specs/get-sutta-unknown-uid/design.md
    T5='/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/'
    A1='/^function extractText/,/^}$/'
    A3='/^async function fetchBilaraText/,/^}$/'
    B3='/^    let extracted = extractText/,/^    }$/'
    U1='/^    const \[suttaplex, bilaraData\] = await Promise.all\(\[/,/^    const citation = formatCitation\(suttaplex\);$/'
    diff <(awk "$T5" src/index.ts) <(awk "$T5" "$NSG"); echo "N5-T $?"
    diff <(awk "$A1" src/index.ts) <(awk "$A1" "$NSG"); echo "N1-A $?"
    diff <(awk "$A3" src/index.ts) <(awk "$A3" "$BLP"); echo "N3-A $?"
    diff <(awk "$B3" src/index.ts) <(awk "$B3" "$BLP"); echo "N3-B $?"
    diff <(awk "$U1" src/index.ts) <(awk "$U1" "$GSU"); echo "U1 $?"
    for p in "$T5" "$A1" "$A3" "$B3" "$U1"; do awk "$p" src/index.ts | wc -l; done     # 8 20 6 18 14
    for p in "$S1" "$S2" "$S3"; do awk "$p" src/index.ts; done | grep -c -E 'highlight|is_segmented|segmented_uid|fuzzy_dictionary'   # 0
    awk "$S1" src/index.ts | grep -c -F 'throw new Error(`SuttaCentral API error: ${res.status}`)'   # 1
    awk "$S3" src/index.ts | grep -c -w -E 'try|catch'                                            # 0
    awk "$S3" src/index.ts | grep -c -E 'Array\.isArray\(data\?\.(suttaplex|hits)\)|typeof data\?\.total === "number"'   # 3
    grep -n -F 'search/instant?' src/index.ts                                                      # 1 dòng, trong S1
    awk "$S3" src/index.ts | grep -c -E 'fetchSuttaplex|fetchBilaraText|fetchParallels'            # 0
    diff <(git show 40846bb:src/index.ts | grep -E '^(export )?(const|let|var) ') <(grep -E '^(export )?(const|let|var) ' src/index.ts)
    grep -n -E 'normalize\("NFC"\)|VI_TOPIC_TERMS\.get\(key\)' src/index.ts
    grep -n -E 'if \(query === ""\)|await fetchSearch\(' src/index.ts
    awk "$S3" src/index.ts | grep -c -E 'transform|catch|coerce|preprocess'                        # 0
    awk "$S3" src/index.ts | grep -c -F '.enum(["title", "content", "all"])'                       # 1
    ```

    `diff` khai báo module-scope phải chỉ có `< const TOPIC_INDEX…` và ba dòng `>` cho `SEARCH_PAGE_SIZE`, `VI_TOPIC_TERMS`, `DIFFICULTY_NAMES`. Ghi nguyên văn vào log. Mọi diff vùng được bảo vệ exit 0. Lệch thì halt và báo cáo.
  - **Depends on:** T-3-1
  - **Result:** Khối Test chạy bằng `bash` với khối khởi đầu (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`), mọi giá trị khớp kỳ vọng: diff N5-T, N1-A, N3-A, N3-B, U1 đều exit 0, số dòng 8, 20, 6, 18, 14; `highlight|is_segmented|segmented_uid|fuzzy_dictionary` trong S1+S2+S3 = 0; dòng `throw` trong S1 = 1; `try|catch` trong S3 = 0; ba dòng kiểm hình dạng = 3; `search/instant?` 1 hit ở dòng 35 (S1 = dòng 32-38); S3 gọi `fetchSuttaplex|fetchBilaraText|fetchParallels` = 0; diff khai báo module-scope (exit 1, như kỳ vọng): `2c2,4` / `< const TOPIC_INDEX: Record<string, string[]> = {` / `---` / `> const SEARCH_PAGE_SIZE = 10;` / `> const VI_TOPIC_TERMS = new Map<string, string>([` / `> const DIFFICULTY_NAMES = new Map<unknown, string>([`; AC-3/4: dòng 209 `const key = topic.normalize("NFC")…`, 210 `VI_TOPIC_TERMS.get(key)`, 211 `term ?? topic.normalize("NFC").trim()`; AC-8: `if (query === "")` dòng 226 (return dòng 227) đứng trước `await fetchSearch(` dòng 232; AC-19: `transform|catch|coerce|preprocess` trong S3 = 0, `.enum(["title", "content", "all"])` = 1, `.number()` `.int()` `.min(1)` `.max(10000)` có mặt. Không sửa `src/`. Bằng chứng ở `$E/T-3-2.log`.

- [x] **T-3-3:** Harness AC-1: ba chủ đề tiếng Việt cốt lõi × `en`/`vi`, `chánh niệm` × `title`
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-3.log`)
  - **Acceptance:**
    - Tám lần chạy hợp lệ (`valid`): `vô ngã`, `niết bàn`, `chánh niệm` với `language` `en` và `vi`; `chánh niệm` với `"match":"title"`, `language` `en` và `vi`.
    - Mỗi output: dòng 1 khớp cả dòng `Tìm thấy {n} sutta cho chủ đề "{topic}" (trang 1):` với 1 ≤ n ≤ 20; dòng 2 đúng bằng dòng thuật ngữ của key (thuật ngữ lấy từ `keys`); số dòng `URL: https://suttacentral.net/` đúng bằng n.
    - Bốn output `chánh niệm`: `grep -c -x 'URL: https://suttacentral.net/mn10'` = 1.
    - Ghi n từng lần vào Result. Số đo của design (11/17, 18/19, 7/12; `title` 3/3) là tham chiếu: n khác mà vẫn trong [1, 20] thì ghi lại, không phải fail. `mn10` vắng thì fetch lại `query=satipatthana` rồi halt và báo cáo.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    run ac1-vonga-en      search_topic '{"topic":"vô ngã","language":"en"}'
    run ac1-vonga-vi      search_topic '{"topic":"vô ngã","language":"vi"}'
    run ac1-nietban-en    search_topic '{"topic":"niết bàn","language":"en"}'
    run ac1-nietban-vi    search_topic '{"topic":"niết bàn","language":"vi"}'
    run ac1-chanhniem-en  search_topic '{"topic":"chánh niệm","language":"en"}'
    run ac1-chanhniem-vi  search_topic '{"topic":"chánh niệm","language":"vi"}'
    run ac1-chanhniem-title-en search_topic '{"topic":"chánh niệm","language":"en","match":"title"}'
    run ac1-chanhniem-title-vi search_topic '{"topic":"chánh niệm","language":"vi","match":"title"}'
    for N in ac1-vonga-en ac1-vonga-vi ac1-nietban-en ac1-nietban-vi ac1-chanhniem-en ac1-chanhniem-vi ac1-chanhniem-title-en ac1-chanhniem-title-vi; do
      T="$AB/$N.txt"; valid "$N" && v=ok || v=INVALID
      case $N in ac1-vonga*) K='vô ngã';; ac1-nietban*) K='niết bàn';; *) K='chánh niệm';; esac
      TERM=$(keys | awk -F'|' -v k="$K" '$1==k{print $2}')
      n=$(head -n 1 "$T" | sed -n -E 's/^Tìm thấy ([0-9]+) sutta cho chủ đề ".*" \(trang 1\):$/\1/p')
      echo "$N $v n=$n header=$(head -n 1 "$T" | grep -c -x -E "Tìm thấy [0-9]+ sutta cho chủ đề \"$K\" \(trang 1\):") term=$([ "$(sed -n 2p "$T")" = "Thuật ngữ đã dùng để tìm trên SuttaCentral: \"$TERM\"" ] && echo 1 || echo 0) url=$(grep -c '^URL: https://suttacentral.net/' "$T") mn10=$(grep -c -x 'URL: https://suttacentral.net/mn10' "$T")"
    done
    ```

    Kỳ vọng mỗi dòng: `ok`, `header=1`, `term=1`, `url` = `n`; `mn10=1` ở bốn case `chánh niệm`.
  - **Depends on:** T-1-1, T-3-1
  - **Result:** Khối khởi đầu và khối Test trích từ `tasks.md` bằng script (`sed -n`), chạy bằng `bash`, tuần tự, một lần gọi (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`, `AB=/tmp/sutta-ab.mza2Ht`). Cả tám case `check=0 items=1 isError=false`, `valid` = ok, `header=1`, `term=1`, `url` = n. n: `vô ngã` en 11, vi 17; `niết bàn` en 18, vi 19; `chánh niệm` en 7, vi 12; `chánh niệm` `title` en 3, vi 3 (trùng số đo của design). `mn10=1` ở cả bốn case `chánh niệm` (vắng ở bốn case kia). Số lần chạy lại: 0 cho mọi case. Kiểm chống-vacuous: `keys` in 14 cặp; dòng 2 thực tế là `"anatta"`, `"nibbana"`, `"satipatthana"`. Không sửa `src/`. Bằng chứng (kèm sha256 từng text) ở `$E/T-3-3.log`.

- [x] **T-3-4:** Harness AC-2: 14 key tiếng Việt × `en`/`vi` (28 lần)
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-4.log`)
  - **Acceptance:**
    - `keys` in đúng 14 cặp. 28 lần chạy hợp lệ, tên case `ac2-k<NN>-<lang>` (NN = thứ tự trong `keys`, 01..14).
    - Cả 28 output: dòng 1 bắt đầu bằng `Tìm thấy`, n ≥ 1; không output nào bắt đầu bằng `Không tìm thấy sutta nào`; dòng 2 đúng bằng dòng thuật ngữ của key.
    - Một key cho 0 kết quả (FR-2 trượt): chạy lại, fetch lại `/api/search/instant` với thuật ngữ đó, rồi halt và báo cáo. **Không** đổi thuật ngữ trong `VI_TOPIC_TERMS` (đổi là sửa design, `design.md:129`).
  - **Test:** chạy theo ba lần gọi Bash (key 01–05, 06–10, 11–14; mỗi lần ≤ 10 lần harness), cùng một vòng lặp, chỉ đổi `seq`:

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    test "$(keys | wc -l | tr -d ' ')" = 14 || { echo "STOP: keys != 14"; exit 1; }
    for i in $(seq 1 5); do                       # lần 2: seq 6 10; lần 3: seq 11 14
      K=$(keys | sed -n "${i}p" | cut -d'|' -f1); TERM=$(keys | sed -n "${i}p" | cut -d'|' -f2); NN=$(printf '%02d' "$i")
      for L in en vi; do
        N="ac2-k$NN-$L"; run "$N" search_topic "{\"topic\":\"$K\",\"language\":\"$L\"}"
        T="$AB/$N.txt"; valid "$N" && v=ok || v=INVALID
        echo "$N [$K→$TERM] $v line1=$(head -n 1 "$T" | cut -c1-40) term=$([ "$(sed -n 2p "$T")" = "Thuật ngữ đã dùng để tìm trên SuttaCentral: \"$TERM\"" ] && echo 1 || echo 0)"
      done
    done
    ```

    Ghi n của cả 28 lần vào Result (design đo n từ 5 tới 20, bảng `design.md:108-123`; số khác mà ≥ 1 thì ghi lại, không phải fail).
  - **Depends on:** T-1-1, T-3-1
  - **Result:** Khối khởi đầu và vòng lặp Test trích từ `tasks.md` bằng script (`sed -n`, chỉ đổi `seq`), chạy bằng `bash`, tuần tự, ba lần gọi (`seq 1 5`, `6 10`, `11 14`), mỗi lần `npm run build` trước (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`, `AB=/tmp/sutta-ab.mza2Ht`). `keys` in 14 cặp. Cả 28 case `check=0 items=1 isError=false`, `valid` = ok, dòng 1 bắt đầu `Tìm thấy`, 0 dòng 1 `Không tìm thấy sutta nào`, `term=1`. n (en/vi): k01 `tứ diệu đế` 17/7; k02 `khổ` 20/20; k03 `bát chánh đạo` 7/5; k04 `vô ngã` 11/17; k05 `chánh niệm` 7/12; k06 `vô thường` 14/17; k07 `từ bi` 15/16; k08 `duyên khởi` 15/10; k09 `ngũ uẩn` 13/15; k10 `niết bàn` 18/19; k11 `nghiệp` 13/13; k12 `thiền` 19/12; k13 `tam bảo` 7/7; k14 `quy y` 9/9 (n từ 5 tới 20). Số lần chạy lại: 0 cho mọi case. Ghi chú: nhãn hiển thị `[$K→$TERM]` của vòng lặp bị bash 3.2 làm méo (một byte của `→` bị đọc vào tên biến), chỉ ảnh hưởng phần hiển thị: `run` nhận `$K` nguyên vẹn (dòng 1 in lại đúng topic), kiểm `term` dùng `$TERM`. Không sửa `src/`. Bằng chứng (kèm sha256 từng text) ở `$E/T-3-4.log`.

- [x] **T-3-5:** Harness AC-3, AC-4: chuẩn hóa input, không bỏ dấu, không khớp một phần
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-5.log`)
  - **Acceptance:**
    - **AC-3:** bốn lần chạy hợp lệ, liền nhau, cùng `language` mặc định: `Vô Ngã`, `  vô   ngã  `, dạng NFD, `vô ngã`. Dạng NFD **phải** truyền bằng đúng lệnh ASCII escape của `design.md:658` (`'{"topic":"vo\u0302 nga\u0303"}'`, trong nháy đơn). Không dán chuỗi NFD thô vào lệnh: một lớp chuẩn hóa NFC sẽ biến nó thành ca `vô ngã` và mệnh đề pass vô nghĩa.
      - Danh sách `grep '^URL:'` của bốn output trùng nhau (cùng md5).
      - Dòng 2 của cả bốn đúng bằng `Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"`.
      - Chống-vacuous cho ca NFD: dòng 1 của output NFD chứa byte `6f cc 82` (topic được in lại đúng dạng NFD), còn dòng 1 của ca `vô ngã` thì không.
    - **AC-4:** ba lần chạy hợp lệ: `vo nga`, `thiện`, `thiền định`. Mỗi output: `head -2 | grep -c -E 'anatta|jhana'` = 0 (AC-4 chỉ ràng buộc header); 0 dòng `Thuật ngữ đã dùng`. Output nào có dòng 1 `Không tìm thấy` thì theo FR-11: có câu gợi ý `tiếng Anh hoặc Pali` và `tail -n 1` là `Hết kết quả.` hoặc footer `Còn kết quả`. (Design đo 2026-10-19: cả ba theo FR-11.)
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    run ac3-upper  search_topic '{"topic":"Vô Ngã"}'
    run ac3-spaces search_topic '{"topic":"  vô   ngã  "}'
    run ac3-nfd    search_topic '{"topic":"vo\u0302 nga\u0303"}'
    run ac3-nfc    search_topic '{"topic":"vô ngã"}'
    for N in ac3-upper ac3-spaces ac3-nfd ac3-nfc; do
      valid "$N" && v=ok || v=INVALID
      echo "$N $v md5=$(grep '^URL:' "$AB/$N.txt" | md5) urls=$(grep -c '^URL:' "$AB/$N.txt") term=$([ "$(sed -n 2p "$AB/$N.txt")" = 'Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"' ] && echo 1 || echo 0)"
    done
    head -n 1 "$AB/ac3-nfd.txt" | od -An -tx1 | tr -d ' \n' | grep -c '6fcc82'     # 1
    head -n 1 "$AB/ac3-nfc.txt" | od -An -tx1 | tr -d ' \n' | grep -c '6fcc82'     # 0
    run ac4-vonga     search_topic '{"topic":"vo nga"}'
    run ac4-thien     search_topic '{"topic":"thiện"}'
    run ac4-thiendinh search_topic '{"topic":"thiền định"}'
    for N in ac4-vonga ac4-thien ac4-thiendinh; do
      T="$AB/$N.txt"; valid "$N" && v=ok || v=INVALID
      echo "$N $v hdr=$(head -n 2 "$T" | grep -c -E 'anatta|jhana') termline=$(grep -c 'Thuật ngữ đã dùng' "$T") line1=$(head -n 1 "$T" | cut -c1-30) hint=$(grep -c -F 'tiếng Anh hoặc Pali' "$T") tail=$(tail -n 1 "$T" | cut -c1-20)"
    done
    ```

    Kỳ vọng: bốn `md5` bằng nhau, `term=1` cả bốn; `hdr=0`, `termline=0` cả ba ca AC-4.
  - **Depends on:** T-1-1, T-3-1
  - **Result:** Khối khởi đầu và khối Test trích từ `tasks.md` bằng script (`sed -n`), chạy bằng `bash`, tuần tự, một lần gọi (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`, `AB=/tmp/sutta-ab.mza2Ht`). Cả bảy case `check=0 items=1 isError=false`, `valid` = ok. AC-3: bốn md5 danh sách `URL:` bằng nhau (`98cf5211…`), mỗi ca 11 URL, `term=1` cả bốn. Chống-vacuous NFD: lệnh `ac3-nfd` trong script giữ nguyên ASCII escape `\u0302`/`\u0303` (0 byte `0xcc` trong script); dòng 1 output NFD chứa `6fcc82` (đếm 1, kèm `61cc83`), dòng 1 ca `vô ngã` thì không (0, có `c3b4`/`c3a3`). AC-4: `vo nga`, `thiện`, `thiền định` đều `hdr=0`, `termline=0`, dòng 1 `Không tìm thấy sutta nào cho chủ đề …`, `hint=1`, `tail -n 1` đúng bằng `Hết kết quả.` (theo FR-11, trùng số đo design). Số lần chạy lại: 0. Không sửa `src/`. Bằng chứng (kèm hex dòng 1 và sha256 từng text) ở `$E/T-3-5.log`.

- [x] **T-3-6:** Harness AC-5, AC-6, AC-7: lọc phần tử không phải sutta, khử trùng trong trang, citation
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-6.log`)
  - **Acceptance:**
    - **AC-5:** `nibbana`, `anatta`, `{"topic":"nibbana","match":"content","page":2}` hợp lệ (không `isError`, dòng 1 `Tìm thấy`). `URL: https://suttacentral.net/an4.179` có đúng 1 lần (`-x`) trong output `nibbana`; `…/an6.100` có đúng 1 lần trong output `anatta`; 0 hit regex cấm của `design.md:672` trên cả ba.
    - **AC-6:** `{"topic":"mindfulness"}`: 18 dòng `URL:`, `groups` = `10 8`; `grep '^URL:' | sort | uniq -d` rỗng; dòng `URL:` đầu là `URL: https://suttacentral.net/an1.575-615`; 0 hit `mn10|dn22`; 0 hit `1461|1462`; `tail -n 1` đúng bằng footer `page=2` (FR-19). 18, `an1.575-615` là số đo upstream: lệch thì fetch lại `query=mindfulness&language=en&limit=10`, rồi halt và báo cáo.
    - **AC-7:** `{"topic":"satipatthana","language":"en"}`: 0 dòng `Thuật ngữ đã dùng`; ba dòng ngay sau dòng chứa `**MN 10** — The Discourse on Mindfulness Meditation` (khớp `-F`, vì có khoảng trắng cuối) là `Difficulty: intermediate | Parallels: 16`, `URL: https://suttacentral.net/mn10`, rồi một dòng bắt đầu bằng `→ Here the Buddha details the seventh factor`; `consec` cho ba dòng `**AN 8.19** — Pahārādasutta` / `Text: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (pli)` / `URL: https://suttacentral.net/an8.19` = 1. `Parallels: 16` là số đo upstream (halt rule như trên).
    - **AC-7, mệnh đề xuyên output:** trên mọi output hợp lệ của AC-1..AC-7 (`ac1-*`, `ac2-*`, `ac3-*`, `ac4-*`, `ac5-*`, `ac6-*`, `ac7-*`), dòng ngay sau dòng bắt đầu bằng `**MN 10** — ` không bao giờ là `Difficulty: unknown…`. Chống-vacuous: số dòng `**MN 10** — ` trên tập đó ≥ 1 (ghi số đếm).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    run ac5-nibbana    search_topic '{"topic":"nibbana"}'
    run ac5-anatta     search_topic '{"topic":"anatta"}'
    run ac5-nibbana-c2 search_topic '{"topic":"nibbana","match":"content","page":2}'
    run ac6-mindfulness search_topic '{"topic":"mindfulness"}'
    run ac7-satipatthana search_topic '{"topic":"satipatthana","language":"en"}'
    for N in ac5-nibbana ac5-anatta ac5-nibbana-c2 ac6-mindfulness ac7-satipatthana; do valid "$N" && echo "$N ok" || echo "$N INVALID"; done
    grep -c -x 'URL: https://suttacentral.net/an4.179' "$AB/ac5-nibbana.txt"        # 1
    grep -c -x 'URL: https://suttacentral.net/an6.100' "$AB/ac5-anatta.txt"         # 1
    for N in ac5-nibbana ac5-anatta ac5-nibbana-c2; do
      grep -c -E '\*\*\?\*\*|suttacentral\.net/\?|/define/|suttacentral\.net/(subjects|terminology|sn-guide-sujato|general-guide-sujato)$' "$AB/$N.txt"   # 0
    done
    T="$AB/ac6-mindfulness.txt"
    grep -c '^URL: https://suttacentral.net/' "$T"; groups "$T"                     # 18 ; 10 8
    grep '^URL:' "$T" | sort | uniq -d | wc -l                                      # 0
    grep -m 1 '^URL:' "$T"                                                          # URL: https://suttacentral.net/an1.575-615
    grep -c -E 'mn10|dn22' "$T"; grep -c -E '1461|1462' "$T"                        # 0 ; 0
    [ "$(tail -n 1 "$T")" = 'Còn kết quả: gọi lại search_topic với page=2 (giữ nguyên topic, language, match).' ] && echo footer-ok
    T="$AB/ac7-satipatthana.txt"
    grep -c 'Thuật ngữ đã dùng' "$T"                                                # 0
    L=$(grep -n -F '**MN 10** — The Discourse on Mindfulness Meditation' "$T" | head -n 1 | cut -d: -f1)
    sed -n "$((L+1))p" "$T" | grep -c -x -F 'Difficulty: intermediate | Parallels: 16'     # 1
    sed -n "$((L+2))p" "$T" | grep -c -x -F 'URL: https://suttacentral.net/mn10'           # 1
    sed -n "$((L+3))p" "$T" | grep -c -F '→ Here the Buddha details the seventh factor'     # 1
    consec "$T" '**AN 8.19** — Pahārādasutta' 'Text: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (pli)' 'URL: https://suttacentral.net/an8.19'   # 1
    cat "$AB"/ac[1-7]-*.txt | grep -c '^\*\*MN 10\*\* — '                            # >= 1
    cat "$AB"/ac[1-7]-*.txt | awk '/^\*\*MN 10\*\* — /{getline nx; if (nx ~ /^Difficulty: unknown/) bad++} END{print bad+0}'   # 0
    ```

    Mệnh đề xuyên output chỉ hợp lệ khi mọi file `ac1-*`..`ac7-*` là lần chạy hợp lệ cuối cùng của case đó (lần chạy hỏng đã bị ghi đè khi chạy lại).
  - **Depends on:** T-3-3, T-3-4, T-3-5
  - **Result:** Khối khởi đầu và khối Test trích từ `tasks.md` bằng script (`sed -n`), chạy bằng `bash`, tuần tự, một lần gọi (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`, `AB=/tmp/sutta-ab.mza2Ht`). Cả năm case `check=0 items=1 isError=false`, `valid` = ok, dòng 1 `Tìm thấy` (nibbana 18, anatta 11, nibbana content trang 2: 9, mindfulness 18, satipatthana 7). AC-5: `an4.179` = 1, `an6.100` = 1, regex cấm = 0/0/0. AC-6: 18 `URL:`, `groups` = `10 8`, `uniq -d` = 0, `URL:` đầu `…/an1.575-615`, `mn10|dn22` = 0, `1461|1462` = 0, `footer-ok`. AC-7: `Thuật ngữ đã dùng` = 0; ba dòng sau `**MN 10** — The Discourse on Mindfulness Meditation` khớp (1/1/1); `consec` AN 8.19 = 1. Mệnh đề xuyên output: 48 file `ac1-*`..`ac7-*` đều `valid`; 7 dòng `**MN 10** — ` (ac1 bốn case `chánh niệm`, ac2-k05 en/vi, ac7), dòng sau của cả 7 là `Difficulty: intermediate | Parallels: 16`, `Difficulty: unknown` = 0. Số lần chạy lại: 0. Không sửa `src/`. Bằng chứng (kèm sha256 từng text) ở `$E/T-3-6.log`.

- [x] **T-3-7:** Harness AC-8, AC-9, AC-15: không có kết quả, lệnh lọc sai, hit thiếu `name`/`acronym`/`author`
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-7.log`)
  - **Acceptance:**
    - **AC-8:** `xyzzyqq`, `""`, `"   "` hợp lệ, `isError=false`. Dòng 1 đúng bằng `Không tìm thấy sutta nào cho chủ đề "{topic}".` với `{topic}` nguyên văn (kể cả ba dấu cách); chứa `tiếng Anh hoặc Pali`; chứa đủ 14 key (`grep -c -F` từng key ≥ 1, key lấy từ `keys`); `grep -c 'https://suttacentral.net'` = 0. `xyzzyqq`: `tail -n 1` = `Hết kết quả.`. `""` và `"   "`: không có footer, đúng 4 dòng, dòng cuối bắt đầu bằng `Chủ đề tiếng Việt có sẵn:` (`design.md:434`).
    - **AC-9:** `foo:bar` hợp lệ; dòng 1 bắt đầu bằng `Không tìm thấy sutta nào`; `grep -c -F 'Unknown filter: "foo:"'` = 1; `tail -n 1` = `Hết kết quả.`.
    - **AC-15:** `metta`/`en` và `three jewels`/`en` hợp lệ. `consec` = 1 cho `**SA 264** — 小土塼` / `Text: Bhikkhu Anālayo (en)` / `URL: https://suttacentral.net/sa264` (metta); cho `**CND8** — Exposition of the Questions of the Student  Mettagū` / `URL: https://suttacentral.net/cnd8` (metta, hai dấu cách giữa `Student` và `Mettagū`); cho `**SA 107** — 長者` / `Text: Bhikkhu Anālayo (en)` / `URL: https://suttacentral.net/sa107` (three jewels). `grep -c -E ' — $|Text: (null|undefined)'` = 0 trên hai output. Các hit này là số đo upstream: vắng thì fetch lại endpoint, rồi halt và báo cáo.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    run ac8-xyzzy  search_topic '{"topic":"xyzzyqq"}'
    run ac8-empty  search_topic '{"topic":""}'
    run ac8-spaces search_topic '{"topic":"   "}'
    run ac9-foobar search_topic '{"topic":"foo:bar"}'
    run ac15-metta search_topic '{"topic":"metta","language":"en"}'
    run ac15-jewels search_topic '{"topic":"three jewels","language":"en"}'
    for N in ac8-xyzzy ac8-empty ac8-spaces ac9-foobar ac15-metta ac15-jewels; do valid "$N" && echo "$N ok" || echo "$N INVALID"; done
    for P in 'ac8-xyzzy|xyzzyqq' 'ac8-empty|' 'ac8-spaces|   '; do
      N=${P%%|*}; TP=${P#*|}; T="$AB/$N.txt"
      miss=0; while IFS='|' read -r k _; do [ "$(grep -c -F "$k" "$T")" -ge 1 ] || miss=$((miss+1)); done < <(keys)
      echo "$N line1=$([ "$(head -n 1 "$T")" = "Không tìm thấy sutta nào cho chủ đề \"$TP\"." ] && echo 1 || echo 0) hint=$(grep -c -F 'tiếng Anh hoặc Pali' "$T") missing_keys=$miss sc=$(grep -c 'https://suttacentral.net' "$T") lines=$(awk 'END{print NR}' "$T") footer=$(grep -c -E '^(Hết kết quả\.|Còn kết quả)' "$T") last=$(tail -n 1 "$T" | cut -c1-26)"
    done
    # kỳ vọng: line1=1 hint=1 missing_keys=0 sc=0; xyzzy: footer=1, last=Hết kết quả.; empty/spaces: lines=4 footer=0 last=Chủ đề tiếng Việt có sẵn:
    T="$AB/ac9-foobar.txt"; head -n 1 "$T" | cut -c1-25; grep -c -F 'Unknown filter: "foo:"' "$T"; tail -n 1 "$T"   # Không tìm thấy… ; 1 ; Hết kết quả.
    consec "$AB/ac15-metta.txt" '**SA 264** — 小土塼' 'Text: Bhikkhu Anālayo (en)' 'URL: https://suttacentral.net/sa264'   # 1
    consec "$AB/ac15-metta.txt" '**CND8** — Exposition of the Questions of the Student  Mettagū' 'URL: https://suttacentral.net/cnd8'   # 1
    consec "$AB/ac15-jewels.txt" '**SA 107** — 長者' 'Text: Bhikkhu Anālayo (en)' 'URL: https://suttacentral.net/sa107'   # 1
    grep -c -E ' — $|Text: (null|undefined)' "$AB/ac15-metta.txt" "$AB/ac15-jewels.txt"   # 0, 0
    ```

  - **Depends on:** T-1-1, T-3-1
  - **Result:** Pass, 6 lần chạy hợp lệ (`items=1 isError=false`), 0 lần chạy lại. AC-8: cả ba case line1=1 hint=1 missing_keys=0/14 sc=0; `xyzzyqq` footer=1, tail = `Hết kết quả.`; `""`/`"   "` lines=4 footer=0, dòng cuối tiền tố `Chủ đề tiếng Việt có sẵn:`. AC-9: dòng 1 `Không tìm thấy sutta nào…`, `Unknown filter: "foo:"` = 1, tail = `Hết kết quả.`. AC-15: consec SA 264 = 1, CND8 = 1, SA 107 = 1; ` — $|Text: (null|undefined)` = 0, 0. Script chép bằng `sed -n` (dòng 24-45, 375-394). Bằng chứng và sha256: `$E/T-3-7.log`.

- [x] **T-3-8:** Harness AC-16, AC-17, AC-18: phân trang `title`, `content`, `all`
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-8.log`)
  - **Acceptance:**
    - **AC-16** (`mindfulness`, `"match":"title"`, `page` 1..5): số `URL:` lần lượt 10/10/10/2/0; 0 dòng `Khớp nội dung:` ở mọi trang; `tail -n 1` lần lượt footer `page=2`, `page=3`, `page=4`, `Hết kết quả.`, `Hết kết quả.`; trang 2 có `-x` `URL: https://suttacentral.net/dn22` và `…/mn10`; trang 4 có đúng `…/uvs15`, `…/vb7`; trang 5 dòng 1 đúng bằng `Không có kết quả sutta ở trang 5 cho chủ đề "mindfulness".`, `isError=false`, 0 hit `https://suttacentral.net` (FR-20); hợp trang 1..4 có 32 `URL:` khác nhau (trang 3 chạy để hợp đủ 32, `design.md:683`).
    - **AC-17** (`mindfulness`, `"match":"content"`, `page` 1, 2, 147, 148): trang 1 có 8 `URL:`, đầu `…/an1.296-305`, cuối `…/an3.33`, 0 dòng `Khớp tiêu đề:`, footer `page=2`; trang 2 có 5 `URL:`, đầu `…/an3.33`, footer `page=3`; trang 147, 148: dòng 1 đúng bằng `Không có kết quả sutta ở trang {p} cho chủ đề "mindfulness".`, `tail -n 1` = `Hết kết quả.`, 0 hit `https://suttacentral.net`; 0 hit `mn10|dn22` ở cả bốn trang. `{"topic":"vô ngã tướng","language":"vi","match":"content"}`: dòng 1 bắt đầu bằng `Không tìm thấy sutta nào`, chứa `Đang dùng match="content"`, `tail -n 1` = `Hết kết quả.`, 0 hit `Còn kết quả` (chặn bởi `h > 0`).
    - **AC-18:** `{"topic":"mindfulness","page":4}` rồi **ngay sau đó** `{"topic":"mindfulness","match":"content","page":4}` (một cặp, hỏng một thì chạy lại cả cặp), rồi `{"topic":"mindfulness","page":5}`. Trang `all` 4: `groups` có 2 ở cột tiêu đề, gồm `…/uvs15`, `…/vb7`; danh sách `URL:` sau `Khớp nội dung:` trùng (`diff` rỗng) danh sách của lần chạy `content` trang 4; footer `page=5`. Trang `all` 5: 0 dòng `Khớp tiêu đề:`.
    - Số trang, số `URL:` và UID ở đây là số đo upstream (`design.md:683-685`): lệch thì fetch lại endpoint với `offset` tương ứng, rồi halt và báo cáo.
  - **Test:** hai lần gọi Bash. Lần 1 (AC-16):

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    for p in 1 2 3 4 5; do run "ac16-p$p" search_topic "{\"topic\":\"mindfulness\",\"match\":\"title\",\"page\":$p}"; done
    for p in 1 2 3 4 5; do N="ac16-p$p"; T="$AB/$N.txt"; valid "$N" && v=ok || v=INVALID
      echo "$N $v urls=$(grep -c '^URL: https://suttacentral.net/' "$T") content=$(grep -c -x 'Khớp nội dung:' "$T") tail=$(tail -n 1 "$T" | sed -n -E 's/.*page=([0-9]+).*/page=\1/p;/^Hết kết quả\.$/p')"; done
    grep -c -x -e 'URL: https://suttacentral.net/dn22' -e 'URL: https://suttacentral.net/mn10' "$AB/ac16-p2.txt"   # 2
    grep '^URL:' "$AB/ac16-p4.txt"                                                   # …/uvs15, …/vb7
    [ "$(head -n 1 "$AB/ac16-p5.txt")" = 'Không có kết quả sutta ở trang 5 cho chủ đề "mindfulness".' ] && echo p5-ok
    grep -c 'https://suttacentral.net' "$AB/ac16-p5.txt"                             # 0
    cat "$AB"/ac16-p[1-4].txt | grep '^URL:' | sort -u | wc -l                       # 32
    ```

    Lần 2 (AC-17, AC-18):

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    for p in 1 2 147 148; do run "ac17-p$p" search_topic "{\"topic\":\"mindfulness\",\"match\":\"content\",\"page\":$p}"; done
    run ac17-vongatuong search_topic '{"topic":"vô ngã tướng","language":"vi","match":"content"}'
    run ac18-all-p4     search_topic '{"topic":"mindfulness","page":4}'
    run ac18-content-p4 search_topic '{"topic":"mindfulness","match":"content","page":4}'
    run ac18-all-p5     search_topic '{"topic":"mindfulness","page":5}'
    for N in ac17-p1 ac17-p2 ac17-p147 ac17-p148 ac17-vongatuong ac18-all-p4 ac18-content-p4 ac18-all-p5; do valid "$N" && echo "$N ok" || echo "$N INVALID"; done
    for p in 1 2; do T="$AB/ac17-p$p.txt"; echo "p$p urls=$(grep -c '^URL:' "$T") first=$(grep -m 1 '^URL:' "$T") last=$(grep '^URL:' "$T" | tail -n 1) title=$(grep -c -x 'Khớp tiêu đề:' "$T") tail=$(tail -n 1 "$T" | cut -c1-50)"; done
    for p in 147 148; do T="$AB/ac17-p$p.txt"; echo "p$p line1=$([ "$(head -n 1 "$T")" = "Không có kết quả sutta ở trang $p cho chủ đề \"mindfulness\"." ] && echo 1 || echo 0) tail=$(tail -n 1 "$T") sc=$(grep -c 'https://suttacentral.net' "$T")"; done
    cat "$AB"/ac17-p1.txt "$AB"/ac17-p2.txt "$AB"/ac17-p147.txt "$AB"/ac17-p148.txt | grep -c -E 'mn10|dn22'   # 0
    T="$AB/ac17-vongatuong.txt"; head -n 1 "$T" | cut -c1-25; grep -c -F 'Đang dùng match="content"' "$T"; tail -n 1 "$T"; grep -c 'Còn kết quả' "$T"   # Không tìm thấy… ; 1 ; Hết kết quả. ; 0
    groups "$AB/ac18-all-p4.txt"                                                     # 2 <k>
    awk '/^Khớp tiêu đề:$/{s=1} /^Khớp nội dung:$/{s=0} s&&/^URL:/' "$AB/ac18-all-p4.txt"   # …/uvs15, …/vb7
    diff <(awk '/^Khớp nội dung:$/{s=1} s&&/^URL:/' "$AB/ac18-all-p4.txt") <(awk '/^Khớp nội dung:$/{s=1} s&&/^URL:/' "$AB/ac18-content-p4.txt") && echo ac18-content-same
    tail -n 1 "$AB/ac18-all-p4.txt"                                                  # footer page=5
    grep -c -x 'Khớp tiêu đề:' "$AB/ac18-all-p5.txt"                                 # 0
    ```

  - **Depends on:** T-1-1, T-3-1
  - **Result:** Pass, hai lần gọi Bash tuần tự, script chép bằng `sed -n` (dòng 24-45 + 411-419, 24-45 + 426-441), chạy bằng `bash` (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`, `AB=/tmp/sutta-ab.mza2Ht`). 13 lần chạy đều `check=0 items=1 isError=false`, `valid` ok; số lần chạy lại: 0. AC-16: `URL:` 10/10/10/2/0, `Khớp nội dung:` = 0 mọi trang, tail `page=2`/`page=3`/`page=4`/`Hết kết quả.`/`Hết kết quả.`; trang 2 dn22+mn10 = 2; trang 4 đúng `…/uvs15`, `…/vb7`; trang 5 `p5-ok`, `https://suttacentral.net` = 0; hợp trang 1..4 = 32 `URL:` khác nhau. AC-17: trang 1: 8 `URL:`, đầu `…/an1.296-305`, cuối `…/an3.33`, `Khớp tiêu đề:` = 0, footer `page=2`; trang 2: 5 `URL:`, đầu `…/an3.33`, footer `page=3`; trang 147/148 line1=1, tail `Hết kết quả.`, sc=0; `mn10|dn22` = 0; `vô ngã tướng` content: `Không tìm thấy sutta nào`, `Đang dùng match="content"` = 1, tail `Hết kết quả.`, `Còn kết quả` = 0. AC-18: `groups` all p4 = `2 6`, mục tiêu đề `…/uvs15`, `…/vb7`; `ac18-content-same` (6 = 6 URL, không rỗng); footer `page=5`; all p5 `Khớp tiêu đề:` = 0. Ghi chú: text không có newline cuối nên `tail -n 1` dính với `grep -c` kế tiếp (`Hết kết quả.0`, `…match).0`), và `exit=1` của lần 2 là do `grep -c` cuối đếm 0; đã tách lại bằng kiểm chỉ-đọc. Bằng chứng và sha256: `$E/T-3-8.log`.

- [x] **T-3-9:** Harness AC-19 (tham số không hợp lệ) và AC-14 phần schema (`tools/list`)
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-9.log`)
  - **Acceptance:**
    - **AC-19:** bảy lần chạy với `topic` `mindfulness` và lần lượt `{"match":"both"}`, `{"match":"Title"}`, `{"page":0}`, `{"page":-1}`, `{"page":1.5}`, `{"page":10001}`, `{"page":"2"}`. Mỗi lần: `check` exit 0 (đúng 1 dòng `"id":2`), `.env` là `items=1 isError=true`, dòng 1 bắt đầu bằng `MCP error -32602: Input validation error: Invalid arguments for tool search_topic:`. Không dùng `valid` cho các lần này (AC-19 là ngoại lệ của luật 2–3).
    - **AC-14 schema:** một lần `tools/list` (frame 3 thay bằng `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}`, `design.md:681`). Hợp lệ khi đúng 1 dòng `"id":2` và `result.tools` có phần tử `name` = `search_topic` (luật 5). `match` (bỏ `description`) = `{"type":"string","enum":["title","content","all"],"default":"all"}`; `page` = `{"type":"integer","minimum":1,"maximum":10000,"default":1}`; `required` = `["topic"]`; description của tool cộng `describe` của các tham số chứa `SuttaCentral`, `Anh/Pali`, `title`, `content`, `all`, `page`. Nếu chuỗi JSON chỉ khác thứ tự key mà cùng key và giá trị, ghi lại, không phải fail.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    i=0
    for A in '"match":"both"' '"match":"Title"' '"page":0' '"page":-1' '"page":1.5' '"page":10001' '"page":"2"'; do
      i=$((i+1)); run "ac19-$i" search_topic "{\"topic\":\"mindfulness\",$A}"
      echo "ac19-$i [$A] prefix=$(head -n 1 "$AB/ac19-$i.txt" | grep -c '^MCP error -32602: Input validation error: Invalid arguments for tool search_topic:')"
    done
    # kỳ vọng mỗi case: check=0 items=1 isError=true prefix=1
    { printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"ac","version":"1"}}}' \
        '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
        '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'; sleep 20; } \
      | node ./dist/index.js 2>/tmp/mcp-stderr.log > "$AB/ac14-list.raw"
    grep -c '"id":2' "$AB/ac14-list.raw"                                             # 1
    node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const L=d.split("\n").filter(l=>l.includes("\"id\":2"));const t=JSON.parse(L[0]).result.tools.find(x=>x.name==="search_topic");if(!t){console.log("NO search_topic");process.exit(1)}const s=t.inputSchema,strip=({description,...r})=>r;console.log(JSON.stringify(strip(s.properties.match)));console.log(JSON.stringify(strip(s.properties.page)));console.log(JSON.stringify(s.required));const txt=[t.description,...Object.values(s.properties).map(p=>p.description)].join("\n");for(const w of ["SuttaCentral","Anh/Pali","title","content","all","page"])console.log(w,txt.includes(w))})' < "$AB/ac14-list.raw"
    ```

    Hai frame đầu chép từ heredoc `specs/non-segmented-translation-guard/requirements.md:186-187`; frame 3 thay bằng `tools/list`. `sleep 20` giữ như heredoc. Ghi output `node -e` nguyên văn vào log.
  - **Depends on:** T-1-1, T-3-1
  - **Result:** Pass, một lần gọi Bash tuần tự, script chép bằng `sed -n` (dòng 24-45 + 456-468), chạy bằng `bash` (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`, `AB=/tmp/sutta-ab.mza2Ht`), exit 0; số lần chạy lại: 0. AC-19: ac19-1..7 đều `check=0 items=1 isError=true prefix=1` (ac19-3 và ac19-4 cho text trùng byte). AC-14: `grep -c '"id":2'` = 1, có `search_topic`; `match` = `{"type":"string","enum":["title","content","all"],"default":"all"}`, `page` = `{"type":"integer","minimum":1,"maximum":10000,"default":1}`, `required` = `["topic"]`, trùng cả thứ tự key; sáu từ `SuttaCentral`, `Anh/Pali`, `title`, `content`, `all`, `page` đều `true`. Output `node -e` nguyên văn và sha256: `$E/T-3-9.log`.

- [x] **T-3-10:** Harness A/B AC-12: bốn tool còn lại trùng từng byte với `40846bb`
  - **Files:** — (output trong `$AB`; bằng chứng `$E/T-3-10.log`)
  - **Acceptance:**
    - Năm cặp, mỗi cặp bản cũ (`cd "$BASE"`) rồi bản mới (`cd "$REPO"`) liền nhau: `get_sutta {"uid":"mn10"}`, `get_sutta {"uid":"mn9999"}`, `get_sutta_meta {"uid":"mn10"}`, `get_parallels {"uid":"mn10"}`, `list_divisions {}`.
    - Cả hai lần chạy của mỗi cặp hợp lệ theo luật 1, 2, 4 (`design.md:650-653`): `check` exit 0; text khác rỗng; dòng 1 khác `fetch failed` và không bắt đầu bằng `SuttaCentral API error:`. Kiểm **trước** khi `cmp`. Không áp luật 3.
    - `cmp "$AB/$N-old.txt" "$AB/$N-new.txt"` exit 0 cho cả 5 cặp. Lệch thì chạy lại cả cặp. Lệch lặp lại thì `diff` hai text và chạy lại để phân biệt upstream trôi với code, rồi halt và báo cáo. Số byte (`design.md:679`: 6776, 42, 2701, 449, 2229) chỉ để ghi lại, tiêu chí là `cmp`.
  - **Test:** tối đa 3 cặp mỗi lần gọi Bash:

    ```sh
    # khối khởi đầu, rồi:
    npm run build >/dev/null
    ab() { (cd "$BASE" && /tmp/mcp-call.sh "$2" "$3") > "$AB/$1-old.raw"
           (cd "$REPO" && /tmp/mcp-call.sh "$2" "$3") > "$AB/$1-new.raw"
           for s in old new; do check < "$AB/$1-$s.raw" > "$AB/$1-$s.txt" 2> "$AB/$1-$s.env"; c=$?
             f="$AB/$1-$s.txt"; ok=1; [ $c -eq 0 ] && [ -s "$f" ] && [ "$(head -n 1 "$f")" != "fetch failed" ] && ! head -n 1 "$f" | grep -q '^SuttaCentral API error:' || ok=0
             echo "$1-$s check=$c valid=$ok bytes=$(wc -c < "$f" | tr -d ' ') $(cat "$AB/$1-$s.env")"; done
           cmp "$AB/$1-old.txt" "$AB/$1-new.txt"; echo "$1 cmp=$?"; }
    ab ac12-sutta-mn10    get_sutta      '{"uid":"mn10"}'
    ab ac12-sutta-mn9999  get_sutta      '{"uid":"mn9999"}'
    ab ac12-meta-mn10     get_sutta_meta '{"uid":"mn10"}'
    # lần gọi thứ hai (định nghĩa lại ab):
    # ab ac12-parallels-mn10 get_parallels  '{"uid":"mn10"}'
    # ab ac12-divisions      list_divisions '{}'
    ```

    Kỳ vọng mỗi dòng `valid=1` và `cmp=0`. Ghi sha256 từng text và số lần chạy lại vào log.
  - **Depends on:** T-1-1, T-3-1
  - **Result:** Pass, hai lần gọi Bash tuần tự, script chép bằng `sed -n` (dòng 24-45 + 485-494; lần 2: 24-45 + 485-491 + 496-497 bỏ `# `), chạy bằng `bash` (HEAD `40846bb`, `src/index.ts` sha256 `fb9794b0…59db53`, `AB=/tmp/sutta-ab.mza2Ht`), exit 0; số lần chạy lại: 0. Cả 10 lần chạy `check=0 valid=1 items=1 isError=false`, cả 5 cặp `cmp=0`: ac12-sutta-mn10 6776 B `2ef6071a…1e4b77`; ac12-sutta-mn9999 42 B `cf52ba69…d1a46e`; ac12-meta-mn10 2701 B `98615232…745874`; ac12-parallels-mn10 449 B `18d7879d…f76c24`; ac12-divisions 2229 B `cb2aff92…e37445` (sha256 old = new, số byte trùng `design.md:679`). Bằng chứng: `$E/T-3-10.log`.

## Phase 4: Tài liệu (FR-15, trừ `AGENTS.md`)

- [x] **T-4-1:** Áp R-2 rồi R-1 vào `README.md` (**nguyên văn**)
  - **Files:** `README.md`
  - **Acceptance:**
    - Guard: trước khi sửa, `git diff --quiet 40846bb -- README.md` (đã xác nhận ngày 2026-10-19). Lệch thì halt.
    - R-2: đoạn từ dòng `## Chủ đề có sẵn` tới dòng bắt đầu bằng `Đây là prototype — bước tiếp theo` (cả hai tính vào, `40846bb:66-77`) thay bằng đúng `design.md:520-536`. Dòng trống trước `## Lưu ý` giữ nguyên.
    - R-1: dòng bắt đầu bằng `` | `search_topic` | `` trong bảng Tools (`40846bb:13`) thay bằng đúng `design.md:514`.
    - Lệnh dựng lại file từ `40846bb` và hai khối in `README-OK` (khóa cả nội dung khối, vị trí, và mọi dòng còn lại).
    - AC-14 phần README: 14 key dạng `` `key` `` mỗi key ≥ 1 hit; `` `match` ``, `` `page` ``, `VI_TOPIC_TERMS` mỗi cái ≥ 1; `TOPIC_INDEX` 0.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    O() { git show 40846bb:README.md | sed -n "$1"; }
    { O '1,12p'; sed -n '514p' "$DS"; O '14,65p'; sed -n '520,536p' "$DS"; O '78,$p'; } | diff - README.md && echo README-OK
    miss=0; while IFS='|' read -r k _; do [ "$(grep -c -F "\`$k\`" README.md)" -ge 1 ] || miss=$((miss+1)); done < <(keys); echo "missing_keys=$miss"   # 0
    grep -c -F '`match`' README.md; grep -c -F '`page`' README.md; grep -c 'VI_TOPIC_TERMS' README.md   # >=1 >=1 >=1 (design đo: 2 cho VI_TOPIC_TERMS)
    grep -c 'TOPIC_INDEX' README.md                                                  # 0
    ```

    Ghi vào `$E/T-4-1.log`.
  - **Depends on:** T-2-3
  - **Result:** Pass. Guard `git diff --quiet 40846bb -- README.md` exit 0 trước khi sửa. Áp bằng script (awk định vị theo nội dung neo, mỗi neo khớp đúng 1 lần), khối lấy bằng `sed -n '520,536p'` (R-2) rồi `sed -n '514p'` (R-1) của `design.md`, không gõ tay. Test chạy bằng `bash` (HEAD `40846bb`): `README-OK`; 14 key đọc từ `VI_TOPIC_TERMS`, `missing_keys=0`; `` `match` `` 1, `` `page` `` 1, `VI_TOPIC_TERMS` 2 (trùng số design đo), `TOPIC_INDEX` 0. `git diff --stat`: 12+/7-. `README.md` sha256 `58776e47…1ef12d5`. Bằng chứng: `$E/T-4-1.log`.

- [x] **T-4-2:** Áp M-3, M-2, M-1 vào `specs/sutta-mcp-requirements.md` (**nguyên văn**)
  - **Files:** `specs/sutta-mcp-requirements.md`
  - **Acceptance:**
    - Guard: trước khi sửa, `git diff --quiet 40846bb -- specs/sutta-mcp-requirements.md`. Lệch thì halt.
    - M-3: đoạn từ dòng bắt đầu bằng `1. **Dynamic search**` tới dòng bắt đầu bằng `   - **GET và POST lệch \`total\`.**` (`40846bb:290-296`) thay bằng đúng `design.md:592-598`. Dòng trống trước mục 2 giữ nguyên.
    - M-2: dòng `Trả về: mn10, sn47.1, dn22 + blurb` (`40846bb:259`) thay bằng đúng `design.md:586`. Dòng `Claude gọi search_topic("chánh niệm")` phía trên không đổi.
    - M-1: neo đầu là dòng `| Tham số | Kiểu | Bắt buộc | Mô tả |` **đầu tiên sau** dòng ``### Tool 1: `search_topic` `` (Tool 2..5 có cùng dòng header), neo cuối là dòng bắt đầu bằng `**Lưu ý:** Topic index cần hỗ trợ` (`40846bb:149-158`). Thay bằng đúng `design.md:569-580`.
    - Lệnh dựng lại file in `MASTER-OK`.
    - AC-14 phần master spec: `grep -c 'sn47.1, dn22'` = 0; `grep -n 'TOPIC_INDEX'` cho đúng 1 dòng, là dòng đầu của M-3 (mô tả lịch sử); `đã thực hiện (spec \`dynamic-search\`)` có 1 hit.
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    M=specs/sutta-mcp-requirements.md; O() { git show 40846bb:$M | sed -n "$1"; }
    { O '1,148p'; sed -n '569,580p' "$DS"; O '159,258p'; sed -n '586p' "$DS"; O '260,289p'; sed -n '592,598p' "$DS"; O '297,$p'; } | diff - "$M" && echo MASTER-OK
    grep -c 'sn47.1, dn22' "$M"                                                      # 0
    grep -n 'TOPIC_INDEX' "$M"                                                       # đúng 1 dòng, bắt đầu "1. **Dynamic search** — **đã thực hiện"
    grep -c -F 'đã thực hiện (spec `dynamic-search`)' "$M"                           # 1
    ```

    Ghi vào `$E/T-4-2.log`.
  - **Depends on:** T-2-3
  - **Result:** Pass. Guard `git diff --quiet 40846bb -- specs/sutta-mcp-requirements.md` exit 0 trước khi sửa. Áp từ dưới lên bằng script (awk định vị theo nội dung neo, mỗi neo khớp đúng 1 lần; neo đầu M-1 là dòng header bảng đầu tiên sau ``### Tool 1: `search_topic` ``), khối lấy bằng `sed -n` của `design.md`: M-3 `592,598p`, M-2 `586p`, M-1 `569,580p`, không gõ tay. Test chạy bằng `bash` (HEAD `40846bb`): `MASTER-OK`; `sn47.1, dn22` 0; `TOPIC_INDEX` đúng 1 dòng (292, dòng đầu M-3); `` đã thực hiện (spec `dynamic-search`) `` 1. `git diff --stat`: 14+/12-. sha256 `99fea927…742da6e`. Bằng chứng: `$E/T-4-2.log`.

## Phase 5: Dọn dẹp

- [x] **T-5-1:** Dọn file tạm (NFR-2) và kiểm trạng thái repo trước A-1
  - **Files:** — (`/tmp`, ngoài repo)
  - **Acceptance:**
    - Xóa **theo đúng đường dẫn đã ghi**, không dùng glob rộng: `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, `$BASE` (đọc từ `$E/base-dir.txt`, kiểm tiền tố `/tmp/sutta-base.` trước `rm -rf`), `$AB` (từ `$E/ab-dir.txt`, tiền tố `/tmp/sutta-ab.`), và mọi file trung gian khác do T-1-1..T-4-2 tạo (`design.md:701`).
    - Giữ `$E` (bằng chứng, gitignored). Ghi vào Result việc giữ hay xóa `$E/base-dir.txt`, `$E/ab-dir.txt`.
    - `git status --short` chỉ còn `src/index.ts`, `README.md`, `specs/sutta-mcp-requirements.md` và `specs/dynamic-search/` (cùng file workflow, `specs/INDEX.md` do orchestrator quản lý, nếu có), hoặc ít hơn nếu đã commit. `AGENTS.md` **chưa** đổi: `git diff --quiet 40846bb -- AGENTS.md`.
  - **Test:**

    ```sh
    ls /tmp/mcp-call.sh /tmp/mcp-stderr.log "$BASE" "$AB" 2>&1     # cả bốn: No such file or directory
    git -C /Users/khoinb/worktrees/sutta-mcp/main status --short
    git -C /Users/khoinb/worktrees/sutta-mcp/main diff --quiet 40846bb -- AGENTS.md; echo "agents exit=$?"   # 0
    ```

  - **Depends on:** T-3-2, T-3-6, T-3-7, T-3-8, T-3-9, T-3-10, T-4-1, T-4-2
  - **Result:** Xóa theo đúng đường dẫn đã ghi, không dùng glob: `$BASE=/tmp/sutta-base.gfrie6` (đọc từ `$E/base-dir.txt`, kiểm tiền tố `/tmp/sutta-base.` bằng `case` trước `rm -rf`; `node_modules` trong đó là symlink, `rm -rf` không đi theo, `node_modules` của repo còn nguyên), `$AB=/tmp/sutta-ab.mza2Ht` (258 file output thô, text và script harness, kiểm tiền tố `/tmp/sutta-ab.`), `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`. Mọi lệnh xóa exit 0. Không còn file trung gian nào khác ngoài repo: mọi đường dẫn `/tmp` trong Result và log của T-1-1..T-4-2 đều nằm trong `$BASE` hay `$AB`; file `mktemp` của T-2-1/T-2-2 (`$OLD`) đã bị `rm -f "$OLD"` trong chính Test của chúng xóa, và không ghi đường dẫn. Giữ `$E`, gồm cả `$E/base-dir.txt` và `$E/ab-dir.txt` (giờ trỏ tới thư mục đã xóa). Test chạy bằng `bash`: `ls` báo `No such file or directory` cho cả bốn; `git status --short` chỉ còn `M README.md`, `M specs/sutta-mcp-requirements.md`, `M src/index.ts`, `?? specs/dynamic-search/`; `agents exit=0`, `shasum -a 256 AGENTS.md` = `ecd1fdd6…94afd15` (trùng pin). Bằng chứng ở `$E/T-5-1.log`.

## Phase 6: `AGENTS.md` (task build cuối cùng)

- [x] **T-6-1:** Áp A-1 vào `AGENTS.md` (**nguyên văn**), task cuối, chỉ sửa `AGENTS.md`
  - **Files:** `AGENTS.md` (duy nhất). Không đụng `specs/dynamic-search/workflow-contract.json`, `workflow-state.json`, hay file nào khác.
  - **Acceptance:**
    - Guard: mọi task khác đã xong (đã check); `git diff --quiet 40846bb -- AGENTS.md`; `shasum -a 256 AGENTS.md` = `ecd1fdd6c81ca2ced6d7633f5b424d828839cc9988ded3c173514d5af94afd15` (pin `context:agents`, `design.md:499`). Lệch thì halt.
    - Đoạn từ dòng bắt đầu bằng `Single-file server:` tới dòng bắt đầu bằng ``To add new topics, add entries to the `TOPIC_INDEX` `` (`40846bb:23-43`) thay bằng đúng `design.md:542-563`. Lệnh dựng lại file in `AGENTS-OK`.
    - AC-14 phần AGENTS.md: `VI_TOPIC_TERMS` ≥ 1 (design đo 2), `/api/search/instant` ≥ 1; `grep -n 'TOPIC_INDEX' README.md AGENTS.md specs/sutta-mcp-requirements.md` cho đúng 1 dòng, là dòng M-3.
    - Phạm vi cuối: `git diff --name-only 40846bb` chỉ gồm `AGENTS.md`, `README.md`, `specs/sutta-mcp-requirements.md`, `src/index.ts` (ngoài file do orchestrator quản lý như `specs/INDEX.md`). Spec này thêm `specs/dynamic-search/` (untracked hoặc đã commit).
    - Ghi sha256 mới của `AGENTS.md` vào Result. Orchestrator dùng giá trị này để đối chiếu với preview cập nhật contract.
    - **Ngay sau task này, trước code review on-completion, orchestrator chạy đường cập nhật contract** (`design.md:502-508`): `preview_contract_update` (thay đổi duy nhất mong đợi là `dependencies.context:agents`; có thay đổi khác thì dừng, báo người dùng), trình preview cho người dùng, `authorize_contract_update` **chỉ khi người dùng đồng ý rõ ràng tại thời điểm đó**, `write_contract_atomic`, `finish_contract_update`, `settle_contract_invalidation`. Đây là việc của orchestrator, **không phải bước của implementer**: implementer không chạy hàm contract nào, không sửa `workflow-contract.json`, không authorize thay người dùng. Mệnh đề AC-14 "`shasum -a 256 AGENTS.md` bằng sha256 mới của `context:agents` trong `workflow-contract.json`" được kiểm sau bước đó, không trong task này. Người dùng không authorize thì workflow dừng ở drift (`design.md:509`).
  - **Test:**

    ```sh
    # khối khởi đầu, rồi:
    O() { git show 40846bb:AGENTS.md | sed -n "$1"; }
    { O '1,22p'; sed -n '542,563p' "$DS"; O '44,$p'; } | diff - AGENTS.md && echo AGENTS-OK
    grep -c 'VI_TOPIC_TERMS' AGENTS.md; grep -c '/api/search/instant' AGENTS.md     # >=1 ; >=1
    grep -n 'TOPIC_INDEX' README.md AGENTS.md specs/sutta-mcp-requirements.md        # đúng 1 dòng: specs/sutta-mcp-requirements.md:<n>:1. **Dynamic search** — **đã thực hiện…
    git diff --name-only 40846bb
    shasum -a 256 AGENTS.md                                                          # ghi vào Result
    ```

    Ghi vào `$E/T-6-1.log`.
  - **Depends on:** T-5-1
  - **Result:** Guard OK (T-1-1..T-5-1 checked; AGENTS.md = `40846bb`; sha256 `ecd1fdd6…afd15`). Splice by script: unique anchors at lines 23/43 replaced by `sed -n '542,563p'` of design.md. Test: `AGENTS-OK` (diff exit 0); `VI_TOPIC_TERMS` = 2, `/api/search/instant` = 3; `TOPIC_INDEX` exactly 1 line (`specs/sutta-mcp-requirements.md:292`, M-3); `git diff --name-only 40846bb` = AGENTS.md, README.md, specs/sutta-mcp-requirements.md, src/index.ts. New `AGENTS.md` sha256: `bcd1feed014c2b2c9d1addbf07807ab80257f930c92883a8ce133797240dee28`. Contract update left to orchestrator. Evidence: `$E/T-6-1.log`.

## AC coverage

| AC / mục | Task |
|---|---|
| AC-1 | T-3-3 |
| AC-2 | T-3-4 |
| AC-3 (harness + đọc code NFC) | T-3-5, T-3-2 |
| AC-4 (harness + đọc code) | T-3-5, T-3-2 |
| AC-5 | T-3-6 |
| AC-6 | T-3-6 |
| AC-7 (gồm mệnh đề xuyên AC-1..AC-7) | T-3-6 |
| AC-8 (harness + đọc code không request) | T-3-7, T-3-2 |
| AC-9 | T-3-7 |
| AC-10 (đọc code) | T-3-2 (+ §Lắp ráp ở T-3-1) |
| AC-11 (đọc code) | T-3-2, T-3-1 (grep `search/instant?`, `fetch(`) |
| AC-12 | T-3-10 |
| AC-13 | T-3-1 (+ T-2-3) |
| AC-14 schema | T-3-9 |
| AC-14 README, master spec | T-4-1, T-4-2 |
| AC-14 AGENTS.md, `grep TOPIC_INDEX` ba file | T-6-1; so sha256 với contract: orchestrator sau T-6-1 |
| AC-15 | T-3-7 |
| AC-16 | T-3-8 |
| AC-17 | T-3-8 |
| AC-18 | T-3-8 |
| AC-19 (harness + đọc code) | T-3-9, T-3-2 |
| Vùng được bảo vệ (N5-T, N1-A, N1-B, N3-A, N3-B, U1) | T-3-2 (N1-B ở T-3-1) |
| NFR-6 (không `**?**`, `/define/`, link hỏng) | T-3-6 (AC-5), T-3-7, T-3-8 |
| Baseline `40846bb` (guard dừng) | T-1-1 |
| Dọn dẹp (NFR-2) | T-5-1 |

## Dependency graph

```
T-1-1 ─> T-2-1 ─> T-2-2 ─> T-2-3 ─> T-3-1 ─┬─> T-3-2 ───────────────────────────┐
                                    │       ├─> T-3-3 ─┐                         │
                                    │       ├─> T-3-4 ─┼─> T-3-6 ────────────────┤
                                    │       ├─> T-3-5 ─┘                         │
                                    │       ├─> T-3-7 ───────────────────────────┤
                                    │       ├─> T-3-8 ───────────────────────────┼─> T-5-1 ─> T-6-1
                                    │       ├─> T-3-9 ───────────────────────────┤
                                    │       └─> T-3-10 ──────────────────────────┤
                                    ├─> T-4-1 ───────────────────────────────────┤
                                    └─> T-4-2 ───────────────────────────────────┘
```

Mọi task harness (T-3-3..T-3-10) cần `$BASE`, `$AB`, harness từ T-1-1 và chạy **tuần tự**, không song song. T-3-2, T-4-1, T-4-2 không chạy harness. T-6-1 luôn là task cuối, không task nào được dispatch sau nó trước khi orchestrator settle cập nhật contract.

## Notes

- **Quyết định của người dùng (ghi lại, không mở lại):**
  - 2026-10-18: từ khóa tiếng Việt được ánh xạ sang thuật ngữ Pali/Anh, rồi **luôn** gọi search API; không giữ `TOPIC_INDEX` làm fallback (requirements, dòng "Quyết định stakeholder").
  - 2026-10-18: `search_topic` có thêm tham số `match` (`title`/`content`/`all`) và `page` (requirements FR-13, FR-16..FR-19).
  - 2026-10-19: design được duyệt (Continue sau design-review-2, Approve).
  - 2026-10-19: **Q2 đã chốt: chỉ khớp chính xác** (default đã ghi, không khớp một phần). Requirements Q2 (`requirements.md:371`) và §Câu hỏi mở của design (`design.md:68`) đã mặc định đúng lựa chọn này, nên không cần sửa artifact nào. S3 giữ nguyên dòng `VI_TOPIC_TERMS.get(key)`, AC-4 giữ nguyên.
- **design-review-2 S3 (Suggestion, cho orchestrator, không phải bước của task):** persist kết quả T-6-1 (đã check, kèm bằng chứng) trước, rồi mới `preview_contract_update`; preview phải được lưu ở một đường dẫn trong project để làm bằng chứng cho `authorize_contract_update`; `after_action` của `finish`/`settle` là reserve + `dispatch-review` cho final review on-completion.
- **Ràng buộc phạm vi áp cho mọi task:** không thêm dependency npm, test runner hay linter; `package.json`, `package-lock.json`, `tsconfig.json` không đổi. Code chỉ đổi trong `src/index.ts`, không file mới trong `src/`. Không đụng `formatCitation()`, `formatUnavailable()`, ba helper fetch cũ, `extractText()`, handler `get_sutta`/`get_sutta_meta`/`get_parallels`/`list_divisions`, `DIVISIONS`, `main()`, hay spec tiền nhiệm. Tài liệu chỉ đổi đúng sáu khối. Script verify nằm ngoài repo và bị xóa ở T-5-1.
- **Số đo có ngày của spec khác:** `specs/get-sutta-unknown-uid/design.md` ghi `grep -c 'fetch(' src/index.ts` = 3. Sau spec này là 4. Đó là số trước/sau của spec kia, không sửa (`design.md:85`).
- **Commit (nếu được yêu cầu):** T-2-1..T-2-3 một commit (build đỏ giữa nhóm); T-4-1 một commit; T-4-2 một commit; T-6-1 một commit riêng. Task verify và dọn dẹp không có commit. Mọi lệnh kiểm neo `40846bb`, nên cho cùng kết quả trước và sau commit.
