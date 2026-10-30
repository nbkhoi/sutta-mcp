#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildBilarasuttasUrl,
  buildMenuUrl,
  buildParallelsUrl,
  buildSuttaplexUrl,
  renderBody,
} from "./passthrough.js";
import { buildSearchUrl, renderSearch } from "./search.js";

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "sutta-mcp",
  version: "0.1.0",
});

// Tool 1: search_instant
server.tool(
  "search_instant",
  "Wrapper mỏng của search SuttaCentral (GET https://suttacentral.net/api/search/instant): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên kết quả theo thứ tự SuttaCentral, không lọc, không khử trùng, không sắp lại. Body có hai mảng. `suttaplex` là khớp tiêu đề: với truy vấn thường, API trả nguyên mảng ở mọi trang; với truy vấn bắt đầu bằng `title:`, `suttaplex` theo `limit`/`offset` như `hits`; với truy vấn là một uid (ví dụ `mn10`), `suttaplex` chỉ có sutta đó. Vì vậy khớp tiêu đề lặp lại ở mọi `offset`, trừ khi truy vấn bắt đầu bằng `title:`. `hits` là khớp nội dung, gồm cả mục dictionary, bài viết và mỗi bản dịch một mục, phân trang bằng `limit`/`offset`. API bỏ khỏi `hits` các sutta đã có trong `suttaplex`, nên một trang có thể có ít hơn `limit` hit trong khi vẫn còn kết quả. `total` là số đếm xấp xỉ của SuttaCentral: nó phụ thuộc `limit`, bị trừ đi các hit bị bỏ ở trang hiện tại, và khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề. Vì vậy `total` không phải tín hiệu tin được để biết còn trang sau. Muốn biết còn kết quả hay không: gọi lại với `offset` lớn hơn và xem có mục mới không. Tìm bằng tiếng Việt: truyền `language` = `vi` để khớp tiêu đề tiếng Việt, và `selectedLanguages` có `vi` để có bản dịch tiếng Việt trong `hits`. Output có thể rất lớn, vì tool không lọc và `json` trả nguyên body: ví dụ `mindfulness` với `language` = `en` cho body 140,685 B, phần lớn là `translations` của các mục `suttaplex`; `limit`/`offset` chỉ phân trang `hits`, còn với truy vấn thường thì `suttaplex` (khớp tiêu đề) được trả nguyên mảng; muốn thu hẹp, dùng truy vấn bắt đầu bằng `title:` (khi đó `suttaplex` theo `limit`/`offset`) hoặc một truy vấn cụ thể hơn.",
  {
    query: z
      .string()
      .describe(
        "Chuỗi tìm kiếm, gửi nguyên văn: không chuẩn hóa, không trim, không đổi hoa/thường. Nhận cả lệnh lọc của SuttaCentral, ví dụ 'title:mindfulness', 'list authors'. Ví dụ: 'mindfulness', 'satipatthana', 'niệm xứ' (kèm language='vi')."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Mã ngôn ngữ gửi tới API, ví dụ 'en', 'vi'. Quyết định ngôn ngữ của tiêu đề được khớp và trả về. Bỏ trống thì không gửi, và kết quả khác với 'en'. Tìm bằng tiếng Việt: truyền 'vi' để khớp tiêu đề tiếng Việt."
      ),
    limit: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Số hit tối đa của trang `hits`, gửi nguyên tới API. Bỏ trống: API dùng mặc định 10."),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Vị trí bắt đầu của trang `hits`, gửi nguyên tới API. Bỏ trống: API dùng mặc định 0."),
    selectedLanguages: z
      .array(z.string())
      .optional()
      .describe(
        'Ngôn ngữ của các bản văn trong `hits`, gửi tới API dạng chuỗi JSON. Bỏ trống: API dùng mặc định ["en","pli"]. Muốn có bản dịch tiếng Việt trong `hits`, truyền mảng có "vi", ví dụ ["vi","pli"].'
      ),
    restrict: z
      .string()
      .optional()
      .describe(
        "Giới hạn loại kết quả, gửi nguyên tới API. 'all' coi như không giới hạn. 'dictionaries' làm API trả body null. Bỏ trống: không gửi."
      ),
    matchpartial: z
      .boolean()
      .optional()
      .describe("Bật khớp một phần, gửi tới API dạng 'true'/'false'. Bỏ trống: API mặc định tắt."),
    format: z
      .enum(["text", "json"])
      .default("text")
      .describe(
        "'text' (mặc định): dòng nguồn kèm URL request, rồi mọi phần tử của `suttaplex` và `hits` theo thứ tự API (mỗi mục kèm link SuttaCentral khi có), `total`, `fuzzy_dictionary`, và `error` nếu có. 'json': item thứ nhất là body response nguyên văn, item thứ hai là dòng nguồn kèm URL request."
      ),
  },
  async ({ format, ...params }) => {
    // Wrapper mỏng (spec search-api-passthrough): một URL, dùng nguyên cho fetch và cho output.
    const url = buildSearchUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderSearch(url, await res.text(), format) };
  }
);

// ─── Bốn tool passthrough (spec tools-api-passthrough) ──────────────────────
// Mỗi handler: dựng URL đúng một lần vào một biến, fetch đúng biến đó, kiểm `ok`, rồi trả
// renderBody() với cùng biến. Không retry, không fallback, không request nào khác.

// Tham số `format` chung của bốn tool. Không gửi tới API.
const formatParam = z
  .enum(["text", "json"])
  .default("text")
  .describe(
    "'text' (mặc định): dòng nguồn kèm URL request, rồi body theo đúng thứ tự SuttaCentral: mỗi giá trị một dòng `key: giá trị`, phần tử mảng có nhãn `[i]`; object ghi số key và mảng ghi số phần tử, rồi in các con ở các dòng sau, thụt thêm hai dấu cách. Chuỗi in nguyên văn, chuỗi rỗng in `\"\"`; số, boolean và null in dạng JSON. 'json': item thứ nhất là body response nguyên văn, item thứ hai là dòng nguồn kèm URL request."
  );

// Tool 2: get_bilarasuttas
server.tool(
  "get_bilarasuttas",
  'Wrapper mỏng của GET https://suttacentral.net/api/bilarasuttas/{uid}/{author_uid}?lang={lang} (không có `author_uid` thì là GET https://suttacentral.net/api/bilarasuttas/{uid}): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body là object gồm các map `comment_text`, `html_text`, `root_text`, `translation_text`, `variant_text`, `reference_text` (map nào SuttaCentral không có thì không có key) và mảng `keys_order`. Key của mỗi map là segment ID (ví dụ `mn10:1.1`); `keys_order` là thứ tự đọc. Bỏ `author_uid` thì body chỉ có văn bản gốc: không có `translation_text` và `comment_text`; `author_uid` không có bản dịch của sutta này cũng cho đúng body đó. Bản dịch không phải tiếng Anh cần `lang` của bản dịch đó, lấy từ `translations[].lang` của `get_suttaplex`, ví dụ `dhp1-20` với `author_uid` = `phantuananh` và `lang` = `vi`. `lang` không khớp bản dịch của `author_uid` thì body không có `translation_text`, ví dụ `mn10` với `sujato` và `lang` = `vi`. Không tìm thấy (uid sai, kể cả sai hoa/thường như `MN10`, hoặc uid của một bộ như `dn`): SuttaCentral trả HTTP 200 với body `{"msg": "Not Found"}`. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Kích thước theo chính sutta, và không có tham số nào thu nhỏ: `dn22` với `sujato` khoảng 158 KB, `dn16` với `sujato` khoảng 633 KB. Bỏ `author_uid` thì body không có `translation_text` và `comment_text` (`dn16`: khoảng 345 KB), nhưng đó là đổi nội dung, không phải thu hẹp.',
  {
    uid: z
      .string()
      .min(1)
      .describe(
        "UID của sutta, ví dụ 'mn10', 'sn56.11', 'dhp1-20'. Gửi nguyên văn như một path segment: không trim, không đổi hoa/thường."
      ),
    author_uid: z
      .string()
      .min(1)
      .optional()
      .describe(
        "ID dịch giả, ví dụ 'sujato' (tiếng Anh) hoặc 'phantuananh' (tiếng Việt, cần lang 'vi'); lấy từ `translations[].author_uid` của `get_suttaplex`. Gửi như path segment thứ hai. Bỏ trống thì không gửi segment này, và body chỉ có văn bản gốc."
      ),
    lang: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của bản dịch, gửi dạng query `lang`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Phải khớp `translations[].lang` của bản dịch trong `get_suttaplex`; không khớp thì body không có `translation_text`. Không thu nhỏ output."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildBilarasuttasUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// Tool 3: get_suttaplex
server.tool(
  "get_suttaplex",
  "Wrapper mỏng của GET https://suttacentral.net/api/suttaplex/{uid}?language={language}: mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body luôn là mảng. Với uid của một sutta, mảng có một phần tử là metadata của sutta (`acronym`, `uid`, `blurb`, `difficulty`, `original_title`, `translated_title`, `translations`, `parallel_count`, `previous`, `next`, …). `translations` liệt kê mọi bản dịch, kể cả văn bản gốc (`is_root`); `author_uid` và `lang` của mỗi mục dùng làm tham số của `get_bilarasuttas`. Với uid của division hay vagga, mảng có mọi sutta bên dưới, là cây được duỗi theo thứ tự trước (ví dụ `mn`: 171 phần tử), nên output rất lớn. `language` đổi các field phụ thuộc ngôn ngữ: `translated_title`, tên trong `previous`/`next`, `translations[].title` và `priority_author_uid` (`mn10` với `vi`: `null`); `blurb` có thể vẫn là tiếng Anh, và số mục `translations` không đổi. Không tìm thấy: SuttaCentral trả HTTP 200 với mảng một phần tử có `uid` là `null` và `translations` rỗng. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Muốn thu hẹp, truyền uid của một sutta (ví dụ `mn10`, khoảng 13 KB) thay vì uid của division (`mn`: 171 phần tử, khoảng 1.3 MB).",
  {
    uid: z
      .string()
      .min(1)
      .describe(
        "UID của sutta (ví dụ 'mn10', 'dn22'), hoặc của division hay vagga (ví dụ 'mn': mọi sutta bên dưới, output rất lớn). Gửi nguyên văn như một path segment: không trim, không đổi hoa/thường."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của các field phụ thuộc ngôn ngữ, gửi dạng query `language`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Đổi `translated_title`, `previous`/`next` `name`, `translations[].title` và `priority_author_uid` (`mn10` với 'vi': `null`); `blurb` có thể vẫn là tiếng Anh."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildSuttaplexUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// Tool 4: get_parallels
server.tool(
  "get_parallels",
  "Wrapper mỏng của GET https://suttacentral.net/api/parallels/{uid}?language={language}: mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body là object. Mỗi key là anchor của sutta nguồn, có thể kèm `#segment` (ví dụ `mn10`, `mn10#44.1`), theo thứ tự SuttaCentral sắp. Giá trị là mảng parallel `{enumber, to, type, remark, resembling}`; target nằm trong `to` (`to.uid`, `to.acronym`, `to.translated_title`, `to.translations`, …). `type` là loại parallel, ví dụ `full`, `mention`; `resembling` là `true` khi parallel chỉ tương đồng một phần. `language` đổi `to.translated_title` và `to.translations[].title`. Không tìm thấy: SuttaCentral trả HTTP 200 với body `{}`; uid của division (ví dụ `mn`) cũng trả `{}`. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Kích thước theo chính sutta, và không có tham số nào thu nhỏ: `dn16` có 43 anchor, 162 parallel, khoảng 321 KB; `dn22` khoảng 78 KB.",
  {
    uid: z
      .string()
      .min(1)
      .describe(
        "UID của sutta nguồn, ví dụ 'mn10', 'dn22'. Gửi nguyên văn như một path segment: không trim, không đổi hoa/thường."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của tiêu đề target, gửi dạng query `language`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Đổi `to.translated_title` và `to.translations[].title`; không phải cách thu nhỏ output."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildParallelsUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// Tool 5: get_menu
server.tool(
  "get_menu",
  "Wrapper mỏng của GET https://suttacentral.net/api/menu/{submenu_id}?language={language} (không có `submenu_id` thì là GET https://suttacentral.net/api/menu): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên body theo thứ tự SuttaCentral, không lọc, không cắt. Body là mảng node (`uid`, `root_name`, `translated_name`, `blurb`, `node_type`, …). Mỗi lần gọi trả một cấp con: node con có `has_children` nhưng không có `children`; gọi tiếp với `uid` của node con để xuống cấp sau. Không có `submenu_id` thì trả mọi node gốc, gồm ba tạng `sutta`, `vinaya`, `abhidhamma` (chỉ ba node này có `children` khác rỗng) và nhiều node rời có `children` rỗng. Muốn duyệt theo tạng thì truyền `submenu_id` là `sutta`, `vinaya` hoặc `abhidhamma`, rồi gọi tiếp với uid con, ví dụ `long` cho `dn`, `da`, `da-ot`. `language` đổi `translated_name` (ví dụ `sutta` với `vi`: `Kinh tạng`) và `yellow_brick_road`/`yellow_brick_road_count`. Không tìm thấy: SuttaCentral trả HTTP 200 với mảng một node có `uid` là `null` và `children` rỗng. Kích thước: output có thể rất lớn, vì tool không lọc, không cắt. Muốn thu hẹp, truyền `submenu_id` thay vì gọi không tham số (`/api/menu`: 464 node, khoảng 168 KB; `/api/menu/sutta` khoảng 3 KB).",
  {
    submenu_id: z
      .string()
      .min(1)
      .optional()
      .describe(
        "uid của node cần mở, ví dụ 'sutta', 'vinaya', 'abhidhamma', 'long', 'dn'. Gửi nguyên văn như một path segment. Bỏ trống thì gọi /api/menu: mọi node gốc, output lớn."
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Ngôn ngữ của tên node, gửi dạng query `language`, ví dụ 'vi'. Bỏ trống thì không gửi, và API dùng mặc định `en`. Đổi `translated_name`, `yellow_brick_road` và `yellow_brick_road_count`."
      ),
    format: formatParam,
  },
  async ({ format, ...params }) => {
    const url = buildMenuUrl(params);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
    return { content: renderBody(url, await res.text(), format) };
  }
);

// ─── Start server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sutta MCP server running (stdio)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
