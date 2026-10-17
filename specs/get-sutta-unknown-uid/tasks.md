# Tasks: `get_sutta` báo đúng "không tìm thấy" cho UID không tồn tại

**Status:** Complete
**Created:** 2026-10-17
**Spec slug:** get-sutta-unknown-uid
**Design:** [design.md](./design.md)
**Requirements:** [requirements.md](./requirements.md)
**Review đã kế thừa:** [reviews/design-review-1.md](./reviews/design-review-1.md) (Approve with changes). W1, S2, S3 được đưa vào lệnh kiểm của task. S1, S4 là lỗi chữ của `design.md`, không sửa (xem §Notes).

## Conventions

- Task ID theo mẫu `T-<phase>-<n>`. Mỗi task là một thay đổi logic, commit được độc lập. Verify là task riêng, không nhét vào task implement.
- **Đọc tối thiểu để implement:** `design.md:36-42`. Chỉ có một khối ràng buộc code là U1 (`design.md:78-112`). Phần còn lại là lý do và bằng chứng. Không có khối sửa tài liệu nào, và không task nào sửa spec của các spec tiền nhiệm.
- **Khối U1 [NORMATIVE] là chép nguyên văn, không phải minh họa.** Fence ở `design.md:82-97` (nội dung `:83-96`, 14 dòng) phải khớp **từng ký tự** với `src/index.ts`, comment tính là một phần của luật. Các task dưới đây **cố ý không chép lại code**. Chép từ `design.md` theo dải dòng được chỉ, đừng chép từ file này, đừng diễn đạt lại. Lưới thật là `diff` U1 (`design.md:99-104`). Grep chỉ là bộ tiền lọc.
- **Build xanh sau mọi task.** Thay đổi chỉ thêm một khối `if` có `return` sớm, không đổi kiểu. Không có nhóm build đỏ giữa chừng. Build đỏ sau bất kỳ task nào là lỗi, không phải dự kiến.
- **Mốc so sánh cố định là `249bb97`, không phải HEAD và không phải `master`.** Mọi lệnh `git diff` kiểm phạm vi đều neo vào `249bb97` (design-review-1 W1). Lệnh đó cho cùng kết quả trước và sau khi commit. **Cấm** dùng `git diff -U0 -- src/index.ts` (không neo, rỗng sau commit) làm vehicle.
- **Lệnh kiểm nằm trong fenced code block, không trong ô bảng markdown.** Alternation viết `|` trơn trong `grep -E`, hoặc tốt hơn là `grep -F -e … -e …`. **Cấm** chép `\|` từ ô bảng của `design.md:223`, `:229`, `:237`. `\|` là escape của markdown, và `grep -E` đọc nó thành ký tự `|` literal, cho 0 hit với mọi input (design-review-1 W1, đã đo).
- **Hunk header lấy từ `git diff`, không lấy từ `diff`** (design-review-1 S2). Với cùng thay đổi, `diff -U0` in `@@ -254,0 +255,8 @@` (`design.md:127`), còn `git diff -U0` in `@@ -255,0 +256,8 @@`. Task nào trích hunk header thì dùng dạng của `git diff`. Mệnh đề quyết định là `numstat` `8	0`, không phải số dòng trong header.
- **Cấm sửa số/literal đã pin trong spec artifact để làm mệnh đề pass.** Nếu số đo lệch spec: chạy lại cả cặp A/B, rồi fetch lại endpoint đối chiếu (luật vận hành 3, `specs/bilara-lang-param/requirements.md:114-120`), rồi **halt và báo cáo**. Không tự đính chính `requirements.md` hay `design.md` trong task.
- **Đường dẫn cố định.** Shell state không giữ giữa các lần gọi, nên mọi khối lệnh tự khai báo lại:

  ```sh
  REPO=/Users/khoinb/worktrees/sutta-mcp/main
  E="$REPO/.claude/spec-evidence/get-sutta-unknown-uid"   # bằng chứng, gitignored (.claude/)
  BASE=$(cat "$E/base-dir.txt")   # bản dựng cũ 249bb97, do T-1-1 tạo, ngoài repo
  AB=$(cat "$E/ab-dir.txt")       # output thô A/B, do T-1-1 tạo, ngoài repo
  ```

  Bằng chứng (lệnh đã chạy, exit code, số đếm, kết quả `cmp`, `shasum -a 256` của từng text) ghi vào `$E/<task-id>.log`. Output thô và text của harness nằm trong `$AB` (ngoài repo, requirements §Harness: "lưu text output (ngoài repo)") và bị xóa ở T-3-5. Thư mục `$E` giữ lại. Nó nằm dưới `.claude/` nên bị ignore và không vào commit.
- **Harness** (`design.md:171-173`): dựng `/tmp/mcp-call.sh` bằng đúng lệnh `cat … <<'EOF'` ở `specs/non-segmented-translation-guard/requirements.md:183-192`, rồi `chmod +x`. Không sửa heredoc. Script chạy `node ./dist/index.js` tương đối với `cwd`, nên cùng một script chạy được cả bản cũ (`cd "$BASE"`) lẫn bản mới (`cd "$REPO"`). Hàm giải mã `check()` chép từ `design.md:216`. Nó in `items=<n> isError=<bool>` lên stderr, in text lên stdout (không có newline cuối), và exit 1 nếu không có đúng 1 dòng `"id":2`.
- **Một cặp A/B** (`design.md:192`), tuần tự, không chạy song song. Bản cũ chạy trước, bản mới chạy ngay sau, và `npm run build` chạy trước lần chạy bản mới:

  ```sh
  # N = tên case (vd ac4-xyzzy), ARGS = object JSON; TOOL mặc định get_sutta
  (cd "$BASE" && /tmp/mcp-call.sh "${TOOL:-get_sutta}" "$ARGS") > "$AB/$N-old.raw"
  (cd "$REPO" && npm run build >/dev/null && /tmp/mcp-call.sh "${TOOL:-get_sutta}" "$ARGS") > "$AB/$N-new.raw"
  check < "$AB/$N-old.raw" > "$AB/$N-old.txt" 2> "$AB/$N-old.env"; echo "old exit=$?"
  check < "$AB/$N-new.raw" > "$AB/$N-new.txt" 2> "$AB/$N-new.env"; echo "new exit=$?"
  ```

  Mỗi lần chạy harness có `sleep 20`, nên một cặp mất khoảng 45 giây. Chạy **một cặp mỗi lần gọi Bash** để không chạm timeout. Không chạy nhiều cặp trong nền cùng lúc (design đo: chạy đồng thời làm tăng `fetch failed`).
- **Luật hợp lệ của một lần chạy** (`design.md:194-208`, áp cho **cả bản cũ**): (1) `check` exit 0, tức đúng 1 dòng `"id":2`; (2) file `.env` là `items=1 …`; (3) `isError=false`, riêng AC-6 thì `isError=true` và text đúng bằng `SuttaCentral API error: 404`. Text `fetch failed` luôn là lần chạy hỏng; (4) có neo dương của bảng `design.md:201-208`. Một lần chạy không hợp lệ thì **chạy lại cả cặp**, ghi số lần chạy lại vào Result. Không kết luận regression hay pass từ lần chạy không hợp lệ.
- **Matcher chuỗi** chứa `*`, `?`, `[`, `{`, `#`, `—`, `•` hoặc ký tự Unicode thì dùng `grep -F` (`-x` khi cần khớp cả dòng). So sánh "text đúng bằng" dùng `cmp` với `printf '%s' …`, không dùng `grep`. Nhờ đó UID có dấu cách đầu (`" mn10"`) được kiểm đúng từng byte.
- Build command: `npm run build` (tsc, strict). Repo **không có** test runner và **không có** linter, và requirements loại trừ việc thêm (§Out of Scope).

## Phase 1: Foundation

- [x] **T-1-1:** Dựng bản baseline `249bb97` ngoài repo, dựng harness, tạo thư mục A/B (trước khi sửa code)
  - **Files:** — (không ghi file nào được track. Tạo `$BASE` và `$AB` dưới `/tmp`, tạo `/tmp/mcp-call.sh`, và ghi `$E/base-dir.txt`, `$E/ab-dir.txt`, `$E/T-1-1.log`)
  - **Acceptance:**
    - Chạy khi `src/` của repo còn trùng `249bb97`, tức trước T-2-1. Guard phải **dừng thật** (design-review-1 S3), không chỉ in STOP. Guard cũng chặn file untracked trong `src/`, vì `git diff` không thấy file untracked.
    - Bản cũ dựng theo `design.md:177-186` (`git archive 249bb97 src package.json tsconfig.json`, symlink `node_modules`, `npx tsc -p .`), có thêm guard dừng. Không dùng `git worktree` hay `git stash`, và không ghi gì vào `.git`.
    - `$BASE/dist/index.js` tồn tại. `/tmp/mcp-call.sh` có nội dung trùng với `specs/non-segmented-translation-guard/requirements.md:184-191`.
  - **Test:**

    ```sh
    set -e
    REPO=/Users/khoinb/worktrees/sutta-mcp/main
    E="$REPO/.claude/spec-evidence/get-sutta-unknown-uid"; mkdir -p "$E"
    git -C "$REPO" diff --quiet 249bb97 -- src || { echo "STOP: src/ đã khác 249bb97"; exit 1; }
    test -z "$(git -C "$REPO" ls-files --others --exclude-standard -- src)" || { echo "STOP: file untracked trong src/"; exit 1; }
    BASE=$(mktemp -d /tmp/sutta-base.XXXXXX); AB=$(mktemp -d /tmp/sutta-ab.XXXXXX)
    git -C "$REPO" archive 249bb97 src package.json tsconfig.json | tar -x -C "$BASE"
    ln -s "$REPO/node_modules" "$BASE/node_modules"
    (cd "$BASE" && npx tsc -p .)
    test -f "$BASE/dist/index.js"
    printf '%s\n' "$BASE" > "$E/base-dir.txt"; printf '%s\n' "$AB" > "$E/ab-dir.txt"
    ```

    Sau đó dựng `/tmp/mcp-call.sh` theo §Conventions và kiểm `diff <(sed -n '184,191p' "$REPO/specs/non-segmented-translation-guard/requirements.md") /tmp/mcp-call.sh` rỗng. Ghi exit code của từng bước vào `$E/T-1-1.log`. Guard dừng thì halt và báo cáo, không tự "sửa" `src/` cho khớp.
  - **Depends on:** —
  - **Result:** Guard pass, không STOP: `git diff --quiet 249bb97 -- src` exit 0 và không có file untracked trong `src/`. BASE=`/tmp/sutta-base.irNAe4`, AB=`/tmp/sutta-ab.roo2A6`. `npx tsc -p .` exit 0, `$BASE/dist/index.js` có. Harness dựng bằng cách chạy nguyên văn `specs/non-segmented-translation-guard/requirements.md:183-193` (heredoc + `chmod +x`). Diff `:184-191` với `/tmp/mcp-call.sh` rỗng (exit 0), sha256 `3ad73bb7…f142b`. Toàn bộ khối Test exit 0, log ở `$E/T-1-1.log`.

## Phase 2: Core Implementation

- [x] **T-2-1:** Chèn khối kiểm not-found vào handler `get_sutta` (**U1, nguyên văn**)
  - **Files:** `src/index.ts`, giữa dòng `    ]);` đóng `Promise.all` của `get_sutta` (`:254` tại `249bb97`) và dòng trống sẵn có trước `    const citation = formatCitation(suttaplex);` (`:255-256`)
  - **Acceptance:**
    - Chèn đúng 8 dòng `design.md:87-94` (dòng trống, comment 2 dòng, khối `if … }`) ngay sau `:254`. Không dòng nào khác của `src/index.ts` đổi. Sau khi chèn, đoạn từ `const [suttaplex, bilaraData]` tới `const citation` khớp fence `design.md:83-96` từng ký tự.
    - Những drift cấm, vì compile sạch hoặc lọt qua grep: viết `!suttaplex.uid` không có `?.` (`design.md:112`); đặt khối sau `const citation` hoặc giữa `const citation` và `let extracted` (`design.md:56`); thêm `isError`; trim hay lowercase `uid`; viết `get_sutta_meta` trong comment (`design.md:111`); thêm hàm hay hằng dùng chung cho câu thông báo (Alternative D); đụng dòng tương ứng ở `get_sutta_meta` (`:325`).
    - Không đụng `fetchSuttaplex()`, `fetchBilaraText()`, `Promise.all`, `formatCitation()`, khối retry, gate, `formatUnavailable()` hay schema.
  - **Test:**

    ```sh
    REPO=/Users/khoinb/worktrees/sutta-mcp/main; cd "$REPO"
    npm run build; echo "build exit=$?"
    U1='/^    const \[suttaplex, bilaraData\] = await Promise.all\(\[/,/^    const citation = formatCitation\(suttaplex\);$/'
    diff <(awk "$U1" src/index.ts) <(awk "$U1" specs/get-sutta-unknown-uid/design.md); echo "u1 diff exit=$?"
    awk "$U1" src/index.ts | wc -l                                      # 14
    awk "$U1" specs/get-sutta-unknown-uid/design.md | wc -l             # 14
    grep -c -F 'Không tìm thấy sutta với UID' src/index.ts              # 2
    grep -F 'Không tìm thấy sutta với UID' src/index.ts | sort | uniq -c   # 1 dòng phân biệt, đếm 2
    git diff --numstat 249bb97 -- src/index.ts                          # đúng: 8	0	src/index.ts
    ```

    Kỳ vọng: build exit 0, diff U1 rỗng (exit 0), 14/14 dòng. Ghi vào `$E/T-2-1.log`. Kiểm hành vi nằm ở T-3-3, T-3-4.
  - **Depends on:** T-1-1
  - **Result:** Chép `design.md:87-94` từng byte bằng script (`head -n 254` + 8 dòng + `tail -n +255`), sau khi kiểm neo `:254` là `    ]);`, `:255` trống, `:256` là `const citation`. `npm run build` exit 0. Diff U1 rỗng (exit 0), 14/14 dòng. `Không tìm thấy sutta với UID` xuất hiện 2 lần, cùng 1 dòng phân biệt. `numstat` là `8	0	src/index.ts`. Hunk header là `@@ -255,0 +256,8 @@`. Log ở `$E/T-2-1.log`.

## Phase 3: Integration & Verification

- [x] **T-3-1:** Build, phạm vi diff neo `249bb97`, `package.json` không đổi (AC-7 phần phạm vi; NFR-1, NFR-2, NFR-3, NFR-5)
  - **Files:** — (chỉ kiểm; ghi `$E/T-3-1.log`)
  - **Acceptance:**
    - `npm run build` thoát mã 0 (NFR-3).
    - **Phạm vi (design-review-1 W1):** `git diff --numstat 249bb97 -- src/index.ts` in đúng `8	0	src/index.ts`. Kết hợp với diff U1 rỗng (T-3-2), điều này chốt toàn bộ thay đổi: 8 dòng thêm, đều nằm trong U1, không gì khác. Mệnh đề này thay cho grep tên ở `design.md:229`.
    - `git diff --name-only 249bb97 -- src` có đúng 1 dòng (`src/index.ts`). `git ls-files --others --exclude-standard -- src` rỗng (NFR-2).
    - `package.json`, `package-lock.json`, `tsconfig.json` không đổi so với `249bb97` (NFR-1).
    - Trong `specs/`, chỉ `specs/get-sutta-unknown-uid/` đổi. Không spec tiền nhiệm nào bị sửa (FR-7, `design.md:58`).
    - Hunk: đúng 1 hunk. Header theo `git diff` dự kiến là `@@ -255,0 +256,8 @@` (design-review-1 S2). Số dòng trong header lệch mà `numstat` vẫn `8	0` và diff U1 rỗng thì ghi lại, không coi là fail.
    - Bộ lọc nhanh NFR-5 (không đủ một mình): grep tên trên diff đã neo, viết trong fence, `|` trơn, cho 0. Có kiểm chống-vacuous: cùng diff phải có hit cho `suttaplex?.uid`.
    - Số đo lệch: halt và báo cáo, không sửa `design.md`.
  - **Test:**

    ```sh
    REPO=/Users/khoinb/worktrees/sutta-mcp/main; cd "$REPO"
    npm run build; echo "build exit=$?"
    git diff --numstat 249bb97 -- src/index.ts                                  # 8	0	src/index.ts
    git diff --name-only 249bb97 -- src | wc -l                                 # 1
    git ls-files --others --exclude-standard -- src | wc -l                     # 0
    git diff --quiet 249bb97 -- package.json package-lock.json tsconfig.json; echo "pkg exit=$?"   # 0
    { git diff --name-only 249bb97 -- specs; git ls-files --others --exclude-standard -- specs; } \
      | grep -v -c '^specs/get-sutta-unknown-uid/'                              # 0
    git diff -U0 249bb97 -- src/index.ts | grep -c '^@@'                        # 1
    git diff -U0 249bb97 -- src/index.ts | grep '^@@'                           # ghi nguyên văn header
    git diff -U0 249bb97 -- src/index.ts | grep -c -E 'formatCitation|formatUnavailable|search_topic|get_sutta_meta|get_parallels|list_divisions|TOPIC_INDEX|DIVISIONS|z\.|extracted\.source|fetchSuttaplex|fetchBilaraText|Promise'   # 0
    git diff -U0 249bb97 -- src/index.ts | grep -c -F 'suttaplex?.uid'          # 1 (chống-vacuous)
    ```

    Nếu dòng `grep -v -c` cho 0 vì không có dòng nào để đếm, đó vẫn là pass, nhưng ghi danh sách `name-only` vào log. Ghi mọi số đo thực vào Result.
  - **Depends on:** T-2-1
  - **Result:** `npm run build` exit 0. `numstat` là `8	0	src/index.ts`. `src` có 1 tên đổi, 0 file untracked. `package.json`, `package-lock.json`, `tsconfig.json` không đổi (exit 0). Spec khác ngoài thư mục này: 0, và đây không phải 0 rỗng vì danh sách có 7 file, đều dưới `specs/get-sutta-unknown-uid/`. Có 1 hunk, header nguyên văn `@@ -255,0 +256,8 @@ server.tool(`, đúng như dự kiến. Grep tên cấm cho 0, grep chống-vacuous `suttaplex?.uid` cho 1. Log ở `$E/T-3-1.log`.

- [x] **T-3-2:** Kiểm tĩnh: diff U1, khối normative tiền nhiệm, bảng bất biến grep, đọc code (AC-3; AC-7 phần khối và đọc code; FR-7, NFR-4, NFR-6, NFR-7)
  - **Files:** — (chỉ kiểm; ghi `$E/T-3-2.log`)
  - **Acceptance:**
    - Diff U1 (`design.md:99-104`) rỗng, mỗi phía 14 dòng.
    - Bảng tiền nhiệm `design.md:48-54`: diff N5-T, N1-A (với `specs/non-segmented-translation-guard/design.md`), N3-A, N3-B (với `specs/bilara-lang-param/design.md`) đều rỗng, với số dòng 8, 20, 6, 18. Dòng gate `extracted.source !== "translation"` có đúng 1 lần.
    - Bảng bất biến `design.md:233-241`, kỳ vọng sau thay đổi: `segmented` 3; `sujato` 3; translator-ID 0; `Không tìm thấy sutta với UID` 2; gate 1; `translation_text` 1; `fetch(` 3. Các lệnh này chạy từ fence dưới, không chép từ ô bảng.
    - **AC-3 (đọc code):** `return` của U1 đứng trước khối retry. Trên đường not-found, số lời gọi `fetchSuttaplex`/`fetchBilaraText` đúng bằng 2 (hai lời gọi trong `Promise.all`), và có 0 lời gọi `fetchBilaraText(uid, translator, retryLang)`. Tính chất này đúng theo cấu trúc, không dựa vào việc upstream trả `translations: []`. Ghi số dòng của `return` và của `if (retryLang)` vào Result.
    - **AC-7 (đọc code):** `Promise.all` với `fetchSuttaplex(uid)` và `fetchBilaraText(uid, translator)` không đổi, nên hai request vẫn song song trên đường UID hợp lệ. Không có `fetch(` mới. Đường nhiều request nhất vẫn ≤ 3 (NFR-4).
  - **Test:**

    ```sh
    REPO=/Users/khoinb/worktrees/sutta-mcp/main; cd "$REPO"
    NSG=specs/non-segmented-translation-guard/design.md; BLP=specs/bilara-lang-param/design.md
    U1='/^    const \[suttaplex, bilaraData\] = await Promise.all\(\[/,/^    const citation = formatCitation\(suttaplex\);$/'
    diff <(awk "$U1" src/index.ts) <(awk "$U1" specs/get-sutta-unknown-uid/design.md); echo "U1 $?"
    T='/^\/\/ Non-empty tuple/,/^  \| \{ source: "root"/'
    diff <(awk "$T" src/index.ts) <(awk "$T" "$NSG"); echo "N5-T $?"
    diff <(awk '/^function extractText/,/^}$/' src/index.ts) <(awk '/^function extractText/,/^}$/' "$NSG"); echo "N1-A $?"
    diff <(awk '/^async function fetchBilaraText/,/^}$/' src/index.ts) <(awk '/^async function fetchBilaraText/,/^}$/' "$BLP"); echo "N3-A $?"
    diff <(awk '/^    let extracted = extractText/,/^    }$/' src/index.ts) <(awk '/^    let extracted = extractText/,/^    }$/' "$BLP"); echo "N3-B $?"
    for p in "$U1" "$T" '/^function extractText/,/^}$/' '/^async function fetchBilaraText/,/^}$/' '/^    let extracted = extractText/,/^    }$/'; do
      awk "$p" src/index.ts | wc -l     # 14, 8, 20, 6, 18
    done
    grep -c 'segmented' src/index.ts                                            # 3
    grep -c -F 'sujato' src/index.ts                                            # 3
    grep -c -E 'phantuananh|sabbamitta|minh_chau|indacanda|trush' src/index.ts  # 0
    grep -c -F 'Không tìm thấy sutta với UID' src/index.ts                      # 2
    grep -c -F 'extracted.source !== "translation"' src/index.ts                # 1
    grep -c 'translation_text' src/index.ts                                     # 1
    grep -c 'fetch(' src/index.ts                                               # 3
    ```

    Mọi diff exit 0. Số lệch thì halt và báo cáo.
  - **Depends on:** T-2-1
  - **Result:** Các diff U1, N5-T, N1-A, N3-A, N3-B đều rỗng (exit 0), số dòng lần lượt 14, 8, 20, 6, 18. Bảng bất biến cho `segmented` 3, `sujato` 3, translator-ID 0, `Không tìm thấy sutta với UID` 2, gate 1, `translation_text` 1, `fetch(` 3. AC-3: `return` của U1 ở `:259`, nằm trong `if` ở `:258`, đứng trước khối retry ở `:274` và `if (retryLang)` ở `:278`. Đường not-found chỉ có 2 lời gọi `Promise.all` (`:252`, `:253`) và 0 lời gọi retry `:279`. AC-7/NFR-4: `Promise.all` ở `:251-254` không đổi. `fetch(` chỉ có ở `:12`, `:20`, `:27` như trước. Handler chỉ gọi ở `:252`, `:253`, `:279`, nên đường dài nhất là 3 request. Log ở `$E/T-3-2.log`.

- [x] **T-3-3:** Harness A/B — AC-1, AC-2: UID không tồn tại trả not-found trùng `get_sutta_meta`
  - **Files:** — (output thô trong `$AB`; bằng chứng `$E/T-3-3.log`)
  - **Acceptance:**
    - Năm cặp A/B theo §Conventions, với `N`/`ARGS`: `ac1-mn9999` `{"uid":"mn9999"}`; `ac2-phantuananh` `{"uid":"mn9999","translator":"phantuananh"}`; `ac2-upper` `{"uid":"MN10"}`; `ac2-space` `{"uid":" mn10"}`; `ac2-dhp1` `{"uid":"dhp1"}`. Mỗi lần chạy thỏa luật hợp lệ. Không so byte giữa cũ và mới ở task này (`design.md:210`).
    - **Bản cũ** (xác nhận hiện trạng): mỗi text có dòng `URL: https://suttacentral.net/?` (`grep -c -x -F`, kết quả ≥ 1).
    - **Bản mới:** `.env` là `items=1 isError=false`. Text **đúng bằng** `Không tìm thấy sutta với UID: <uid>`, với `<uid>` là giá trị nguyên văn của tham số, gồm cả hai dấu cách của case `" mn10"`. Kiểm bằng `cmp` với `printf '%s'`.
    - **AC-1 so với metadata:** chạy `get_sutta_meta '{"uid":"mn9999"}'` một lần trên bản mới (`TOOL=get_sutta_meta`, `N=ac1-meta`; chỉ cần phía `-new`). Lần chạy phải hợp lệ, và `cmp "$AB/ac1-mn9999-new.txt" "$AB/ac1-meta-new.txt"` exit 0.
    - **Phủ định (FR-3):** mỗi text của bản mới có 0 hit cho `suttacentral.net`, `**?**`, `URL:`, `dịch giả`, `Deep link:`. Mệnh đề này chỉ có nghĩa khi lần chạy hợp lệ.
  - **Test:**

    ```sh
    # sau mỗi cặp: kiểm text bản mới đúng bằng câu not-found và các mệnh đề phủ định
    printf '%s' "Không tìm thấy sutta với UID: $UIDV" | cmp - "$AB/$N-new.txt"; echo "exact $?"   # 0
    grep -c -F -e 'suttacentral.net' -e '**?**' -e 'URL:' -e 'dịch giả' -e 'Deep link:' "$AB/$N-new.txt"   # 0
    grep -c -x -F 'URL: https://suttacentral.net/?' "$AB/$N-old.txt"            # >= 1
    cat "$AB/$N-old.env" "$AB/$N-new.env"                                       # items=1 isError=false (cả hai)
    ```

    `UIDV` là giá trị `uid` của case, lấy trong nháy kép để giữ dấu cách đầu. Ghi vào log: `.env`, kết quả `cmp`, số hit, `shasum -a 256` của từng text, số lần chạy lại. Literal lệch: chạy lại cặp, fetch lại `/api/suttaplex/<uid>`, rồi halt và báo cáo.
  - **Depends on:** T-1-1, T-2-1
  - **Result:** Năm cặp A/B và `ac1-meta` đều hợp lệ, `.env` của mọi lần chạy là `items=1 isError=false`. Bản cũ: mỗi text có 1 dòng `URL: https://suttacentral.net/?`. Bản mới: `cmp` với `Không tìm thấy sutta với UID: <uid>` exit 0 cho cả 5 case. `od` xác nhận case `" mn10"` có hai dấu cách sau `UID:`. Phủ định: 0 hit ở mọi text bản mới. `cmp ac1-mn9999-new.txt ac1-meta-new.txt` exit 0. Chạy lại: `ac2-phantuananh` 1 lần và `ac2-upper` 1 lần, đều do bản mới gặp `fetch failed` thoáng qua, stderr không có lỗi khác. Các case còn lại 0 lần. sha256 từng text ghi ở `$E/T-3-3.log`.

- [x] **T-3-4:** Harness A/B — AC-4, AC-5, AC-6: UID hợp lệ và lỗi HTTP không đổi từng byte so với `249bb97`
  - **Files:** — (output thô trong `$AB`; bằng chứng `$E/T-3-4.log`)
  - **Acceptance:**
    - Chín cặp A/B theo §Conventions, với `N`/`ARGS`:
      - AC-4: `ac4-xyzzy` `{"uid":"mn10","translator":"xyzzy"}`; `ac4-minhchau` `{"uid":"mn10","translator":"minh_chau"}`; `ac4-ma98` `{"uid":"ma98"}`; `ac4-mn` `{"uid":"mn"}`; `ac4-dhp` `{"uid":"dhp"}`.
      - AC-5: `ac5-sujato` `{"uid":"mn10","translator":"sujato"}`; `ac5-phantuananh` `{"uid":"dhp1-20","translator":"phantuananh"}`; `ac5-sabbamitta` `{"uid":"mn10","translator":"sabbamitta"}`.
      - AC-6: `ac6-empty` `{"uid":""}`.
    - Cả hai lần chạy của mỗi cặp hợp lệ (§Conventions). Với AC-6, `.env` là `items=1 isError=true` và text đúng bằng `SuttaCentral API error: 404`.
    - **So byte (FR-5, FR-6):** `cmp "$AB/$N-old.txt" "$AB/$N-new.txt"` exit 0 cho cả 9 cặp. Lệch thì chạy lại cả cặp. Nếu lệch lặp lại, `diff` hai text và chạy lại để phân biệt upstream trôi (thấy ở cả hai bản) với code (`design.md:210`), rồi halt và báo cáo.
    - **Neo dương** (`design.md:204-207`, áp cho cả hai bản):
      - AC-4: câu `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả`, và dòng `URL: https://suttacentral.net/<uid>` khớp `-x -F`, với `<uid>` lần lượt là `mn10`, `mn10`, `ma98`, `mn`, `dhp`. 0 hit `Không tìm thấy sutta với UID`. Riêng `ac4-xyzzy` có dòng `  • English — Bhikkhu Sujato (sujato)` (hai dấu cách đầu, `-x -F`).
      - AC-5: `ac5-sujato` chứa dòng `[mn10:1.1] So I have heard.`; `ac5-phantuananh` chứa `https://suttacentral.net/dhp1-20/vi/phantuananh#`; `ac5-sabbamitta` chứa `https://suttacentral.net/mn10/de/sabbamitta#`. Thân dòng 1 của `ac5-sujato` là `[mn10:0.1] Middle Discourses 10` (`design.md:227`).
  - **Test:**

    ```sh
    # sau mỗi cặp
    cat "$AB/$N-old.env" "$AB/$N-new.env"
    cmp "$AB/$N-old.txt" "$AB/$N-new.txt"; echo "cmp $?"                      # 0
    grep -c -F 'Không tìm thấy sutta với UID' "$AB/$N-new.txt"                  # 0 (AC-4)
    grep -c -F 'API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả' "$AB/$N-old.txt" "$AB/$N-new.txt"   # >= 1 mỗi file (AC-4)
    grep -c -x -F "URL: https://suttacentral.net/$UIDV" "$AB/$N-old.txt" "$AB/$N-new.txt"   # >= 1 mỗi file (AC-4)
    ```

    Neo AC-5 và AC-6 dùng `grep -c -F` / `cmp` với `printf '%s'` theo cùng mẫu. Ghi vào log: `.env`, `cmp`, số hit neo, `shasum -a 256` từng text, số lần chạy lại của từng cặp. Không lưu text vào repo.
  - **Depends on:** T-1-1, T-2-1
  - **Result:** `cmp` giữa bản cũ và bản mới exit 0 cho cả 9 cặp, và mọi lần chạy cuối đều hợp lệ. AC-4 (5 cặp): câu guard 1 hit và dòng `URL: https://suttacentral.net/<uid>` 1 hit (`-x -F`) ở mỗi file, `Không tìm thấy sutta với UID` 0 hit. `ac4-xyzzy` có dòng `  • English — Bhikkhu Sujato (sujato)` (1 hit). AC-5: `ac5-sujato` có `[mn10:1.1] So I have heard.` (1 hit), và dòng `[` đầu tiên là `[mn10:0.1] Middle Discourses 10`. `ac5-phantuananh` và `ac5-sabbamitta` mỗi bản có 1 hit cho deep link. AC-6: cả hai bản là `items=1 isError=true`, `cmp` với `SuttaCentral API error: 404` exit 0. Chạy lại: `ac4-xyzzy` 2 lần, `ac4-minhchau` 1 lần, `ac4-mn` 1 lần, các cặp khác 0 lần. Mọi lần chạy hỏng đều do `fetch failed` thoáng qua (3 ở bản cũ, 1 ở bản mới), không có lệch byte nào giữa hai lần chạy hợp lệ. sha256 ghi ở `$E/T-3-4.log`.

- [x] **T-3-5:** Dọn file tạm (NFR-2) và kiểm trạng thái repo
  - **Files:** — (`/tmp`, ngoài repo)
  - **Acceptance:**
    - Xóa **theo đúng đường dẫn đã ghi**, không dùng glob rộng: `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, thư mục `$BASE` (đọc từ `$E/base-dir.txt`, kiểm có tiền tố `/tmp/sutta-base.` trước khi `rm -rf`), thư mục `$AB` (từ `$E/ab-dir.txt`, tiền tố `/tmp/sutta-ab.`), và mọi file trung gian khác do T-1-1..T-3-4 tạo.
    - Giữ `$E` (bằng chứng, nằm trong `.claude/` nên bị ignore). Có thể xóa `$E/base-dir.txt` và `$E/ab-dir.txt` sau khi xóa hai thư mục, hoặc giữ làm hồ sơ. Ghi lựa chọn vào Result.
    - `git status --short` chỉ còn `src/index.ts` và `specs/get-sutta-unknown-uid/` (cùng các file workflow, INDEX do orchestrator quản lý, nếu có). Không có file debug hay log nào trong phần được track.
  - **Test:**

    ```sh
    ls /tmp/mcp-call.sh /tmp/mcp-stderr.log "$BASE" "$AB" 2>&1   # cả bốn: No such file or directory
    git -C /Users/khoinb/worktrees/sutta-mcp/main status --short
    ```

  - **Depends on:** T-3-1, T-3-2, T-3-3, T-3-4
  - **Result:** Đã xóa đúng theo đường dẫn ghi lại: `/tmp/sutta-base.irNAe4` (tiền tố `/tmp/sutta-base.` đã kiểm), `/tmp/sutta-ab.roo2A6` (tiền tố `/tmp/sutta-ab.` đã kiểm), `/tmp/mcp-call.sh`, `/tmp/mcp-stderr.log`, mọi lệnh `rm` exit 0. File trung gian khác (các script chạy trong scratchpad) đã được xóa trong từng task. `ls` cho No such file or directory ở cả bốn đường dẫn. `git status --short` chỉ còn ` M src/index.ts` và `?? specs/get-sutta-unknown-uid/`. Lựa chọn: giữ `$E/base-dir.txt` và `$E/ab-dir.txt` làm hồ sơ. Log ở `$E/T-3-5.log`.

## AC coverage

| AC / mục | Task |
|---|---|
| AC-1 (gồm `cmp` với `get_sutta_meta`) | T-3-3 |
| AC-2 | T-3-3 |
| AC-3 (đọc code, theo cấu trúc) | T-3-2 |
| AC-4 | T-3-4 |
| AC-5 | T-3-4 |
| AC-6 | T-3-4 |
| AC-7: build, phạm vi diff, `package.json`, file mới, hunk NFR-5 | T-3-1 |
| AC-7: diff U1, khối N5-T/N1-A/N1-B/N3-A/N3-B, bất biến NFR-6/NFR-7, đọc code NFR-4 | T-3-2 (+ diff tại chỗ ở T-2-1) |
| Baseline `249bb97` (dựng bản cũ, guard dừng) | T-1-1 |
| design-review-1 W1 (neo `249bb97`, `numstat 8 0`, lệnh trong fence) | T-3-1 (+ §Conventions) |
| design-review-1 S2 (hunk header theo `git diff`) | T-3-1 (+ §Conventions) |
| design-review-1 S3 (guard dừng thật) | T-1-1 |

## Dependency graph

```
T-1-1 ──> T-2-1 ──┬──> T-3-1 ──┐
   │              ├──> T-3-2 ──┤
   │              ├──> T-3-3 ──┼──> T-3-5
   └──────────────┴──> T-3-4 ──┘
```

T-3-3 và T-3-4 cần `$BASE`, `$AB` và harness từ T-1-1, cùng code từ T-2-1. Chạy chúng **tuần tự**, không song song, vì luật chạy A/B tuần tự áp cho mọi tiến trình harness. T-3-1 và T-3-2 là kiểm tĩnh, có thể chạy độc lập với nhau.

## Notes

- **Ràng buộc phạm vi áp cho mọi task:** không thêm dependency npm. Code chỉ đổi trong `src/index.ts`, không file mới trong `src/`. Không hàm, kiểu hay hằng module-scope mới. Không thêm test framework hay linter. `tsconfig.json` không đổi. Không đụng `formatCitation()`, `formatUnavailable()`, gate N1-B, khối retry N3-B, `fetchSuttaplex()`, `fetchBilaraText()`, schema và `describe()` của `get_sutta`, bốn tool còn lại, `TOPIC_INDEX`, `DIVISIONS`, README, master spec, hay spec tiền nhiệm.
- **design-review-1 S1, S4 không sửa `design.md`** (theo dispatch). Giá trị đúng, dùng khi cần trích: câu "UID sai chữ hoa/thường rơi vào guard" nằm ở `specs/segment-id-in-get-sutta/design.md:190`, không phải `:194` như `design.md:58`, `:292` ghi. Suttaplex của `mn` có **171** phần tử, không phải "…170 phần tử" như `design.md:71` (requirements và live API đều cho 171). Không task nào phụ thuộc hai giá trị này.
- **Dư âm của requirements-review-1 W1:** `requirements.md` FR-7 chỉ liệt kê N1-A, N1-B, N3-B. Design và T-3-2 kiểm thêm N5-T và N3-A. Không sửa `requirements.md`.
- **Commit:** chỉ một commit code (T-2-1). Mọi lệnh phạm vi neo `249bb97`, nên T-3-1 cho cùng kết quả dù chạy trước hay sau commit.
