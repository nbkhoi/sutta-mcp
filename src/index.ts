#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildSearchUrl, formatCitation, renderSearch } from "./search.js";

// ─── SuttaCentral API helpers ────────────────────────────────────────────────

const SC_BASE = "https://suttacentral.net/api";

async function fetchSuttaplex(uid: string, language = "en") {
  const url = `${SC_BASE}/suttaplex/${uid}?language=${language}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function fetchBilaraText(uid: string, translator = "sujato", lang?: string) {
  const url = `${SC_BASE}/bilarasuttas/${uid}/${translator}${lang ? `?lang=${lang}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
  return res.json();
}

async function fetchParallels(uid: string) {
  const url = `${SC_BASE}/parallels/${uid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
  return res.json();
}

// ─── Render sutta text từ Bilara response ────────────────────────────────────

// Non-empty tuple mã hóa FR-1: source="translation" thì có ít nhất một dòng sau lọc.
// Rào chắn MỘT PHẦN — thân hàm là normative nguyên văn, xem N1 trong
// specs/non-segmented-translation-guard/design.md
// Segment.id là key nguyên văn của bilara (segment ID) — spec segment-id-in-get-sutta.
type Segment = { id: string; text: string };
type ExtractedText =
  | { source: "translation"; lines: [Segment, ...Segment[]] }
  | { source: "root"; lines: Segment[] };

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

  return [
    "─".repeat(60),
    citation,
    "─".repeat(60),
    "",
    `API SuttaCentral không trả về nội dung bản dịch nào cho kinh này với dịch giả ${translatorName} (${translator}).`,
    "",
    "Server cố ý không thay bằng văn bản gốc Pali, để không gán nhầm văn bản cho dịch giả được yêu cầu.",
    "",
    ...(alternatives.length > 0
      ? ["**Các bản dịch khác của kinh này, có thể lấy được (không bảo đảm):**", ...alternatives]
      : ["  (không tìm thấy bản dịch nào khác cho kinh này)"]),
  ].join("\n");
}

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "sutta-mcp",
  version: "0.1.0",
});

// Tool 1: search_topic
server.tool(
  "search_topic",
  "Wrapper mỏng của search SuttaCentral (GET https://suttacentral.net/api/search/instant): mỗi lời gọi gửi đúng một request, chỉ với các tham số caller truyền, và trả nguyên kết quả theo thứ tự SuttaCentral, không lọc, không khử trùng, không sắp lại. Body có hai mảng. `suttaplex` là khớp tiêu đề: với truy vấn thường, API trả nguyên mảng ở mọi trang; với truy vấn bắt đầu bằng `title:`, `suttaplex` theo `limit`/`offset` như `hits`; với truy vấn là một uid (ví dụ `mn10`), `suttaplex` chỉ có sutta đó. Vì vậy khớp tiêu đề lặp lại ở mọi `offset`, trừ khi truy vấn bắt đầu bằng `title:`. `hits` là khớp nội dung, gồm cả mục dictionary, bài viết và mỗi bản dịch một mục, phân trang bằng `limit`/`offset`. API bỏ khỏi `hits` các sutta đã có trong `suttaplex`, nên một trang có thể có ít hơn `limit` hit trong khi vẫn còn kết quả. `total` là số đếm xấp xỉ của SuttaCentral: nó phụ thuộc `limit`, bị trừ đi các hit bị bỏ ở trang hiện tại, và khi `total` tính ra bằng 0 thì rơi về số khớp tiêu đề. Vì vậy `total` không phải tín hiệu tin được để biết còn trang sau. Muốn biết còn kết quả hay không: gọi lại với `offset` lớn hơn và xem có mục mới không. Tìm bằng tiếng Việt: truyền `language` = `vi` để khớp tiêu đề tiếng Việt, và `selectedLanguages` có `vi` để có bản dịch tiếng Việt trong `hits`.",
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

// Tool 2: get_sutta
server.tool(
  "get_sutta",
  "Lấy toàn văn một sutta theo UID. Dùng sau khi đã tìm được UID từ search_topic hoặc biết trước.",
  {
    uid: z.string().describe("UID của sutta, ví dụ: 'mn10', 'sn56.11', 'dn22'"),
    translator: z
      .string()
      .default("sujato")
      .describe(
        "ID dịch giả: 'sujato' (mặc định, tiếng Anh), 'brahmali' (Vinaya). Không phải dịch giả nào có trong metadata cũng lấy được toàn văn qua API — kể cả khi metadata ghi segmented=true. Dùng get_sutta_meta để xem danh sách bản dịch của một kinh; nếu dịch giả được yêu cầu không lấy được, tool sẽ báo rõ và gợi ý dịch giả khác."
      ),
    max_segments: z
      .number()
      .default(50)
      .describe("Giới hạn số đoạn văn trả về, tránh quá dài. Mặc định 50."),
  },
  async ({ uid, translator, max_segments }) => {
    // Lấy metadata song song với text
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

    if (extracted.source !== "translation") {
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
      (suttaplex?.translations ?? []).find((t: any) => t.author_uid === translator)
        ?.author ?? translator;
    const lines = extracted.lines;
    const truncated = lines.slice(0, max_segments);
    const isTruncated = lines.length > max_segments;

    const output = [
      "─".repeat(60),
      citation,
      `Translator: ${translatorName} (${translator})`,
      `Deep link: https://suttacentral.net/${uid}/${servedLang}/${translator}#<segment_id> (thay <segment_id> bằng ID trong ngoặc vuông ở đầu mỗi đoạn)`,
      "─".repeat(60),
      "",
      truncated.map((s) => `[${s.id}] ${s.text}`).join("\n"),
      "",
      isTruncated
        ? `[... văn bản bị cắt sau ${max_segments} đoạn. Tổng: ${lines.length} đoạn. Tăng max_segments để xem thêm.]`
        : `[Hết văn bản — ${lines.length} đoạn]`,
    ].join("\n");

    return { content: [{ type: "text", text: output }] };
  }
);

// Tool 3: get_sutta_meta
server.tool(
  "get_sutta_meta",
  "Lấy metadata của một sutta: tên, blurb, độ khó, số parallels, danh sách bản dịch có sẵn, link.",
  {
    uid: z.string().describe("UID của sutta, ví dụ: 'mn10', 'dn1'"),
    language: z.string().default("en").describe("Ngôn ngữ cho blurb và tiêu đề dịch"),
  },
  async ({ uid, language }) => {
    const sp = await fetchSuttaplex(uid, language);

    if (!sp?.uid) {
      return {
        content: [{ type: "text", text: `Không tìm thấy sutta với UID: ${uid}` }],
      };
    }

    const translations = (sp.translations ?? [])
      .filter((t: any) => !t.is_root)
      .map((t: any) => `  • ${t.lang_name} — ${t.author} (${t.author_uid})`)
      .join("\n");

    const output = [
      formatCitation(sp),
      "",
      sp.blurb ? `**Tóm tắt:** ${sp.blurb}` : "",
      "",
      `**Ngôn ngữ gốc:** ${sp.root_lang_name} (${sp.root_lang})`,
      `**Loại:** ${sp.type}`,
      "",
      `**Bản dịch có sẵn:**`,
      translations || "  (không có)",
    ]
      .filter((l) => l !== "")
      .join("\n");

    return { content: [{ type: "text", text: output }] };
  }
);

// Tool 4: get_parallels
server.tool(
  "get_parallels",
  "Lấy danh sách parallels của một sutta — các kinh tương đương trong các truyền thống khác (Hán tạng, Sanskrit...).",
  {
    uid: z.string().describe("UID của sutta gốc, ví dụ: 'mn10'"),
  },
  async ({ uid }) => {
    const data = await fetchParallels(uid);

    if (!data || Object.keys(data).length === 0) {
      return {
        content: [{ type: "text", text: `Không tìm thấy parallels cho ${uid.toUpperCase()}.` }],
      };
    }

    const lines: string[] = [`**Parallels của ${uid.toUpperCase()}:**\n`];
    let count = 0;

    // Response có dạng { <anchor nguồn>: [ { to: { to, uid, acronym... }, type, resembling } ] }
    // — key là anchor của chính sutta nguồn, target thật nằm trong entry.to
    for (const entries of Object.values(data as Record<string, any[]>)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const type = entry?.type ?? "full";
        const resembling = entry?.resembling === true;
        let icon: string;
        if (type === "full") {
          icon = resembling ? "≈" : "≡";
        } else if (type === "mention") {
          icon = "→";
        } else if (type === "retelling") {
          icon = "↺";
        } else {
          icon = "≈";
        }
        const label = resembling ? "resembling" : type;
        // to.to giữ anchor segment (vd "dn22#17.1") nhưng với văn bản chưa host trên SC
        // nó suy biến thành mã ngôn ngữ ("lzh") — khi đó to.uid mới là UID thật
        const toUid = entry?.to?.uid;
        const toAnchor = entry?.to?.to;
        const target =
          toAnchor && toUid && String(toAnchor).includes(String(toUid))
            ? toAnchor
            : toUid ?? toAnchor ?? "?";
        lines.push(`${icon} ${String(target).toUpperCase()} (${label})`);
        count++;
      }
    }

    lines.push(`\n${count} parallels tổng cộng.`);
    lines.push(`\nTra cứu chi tiết tại: https://suttacentral.net/${uid}`);

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ─── Division data (hardcode — gần như bất biến) ─────────────────────────────

interface Division {
  uid: string;
  name: string;
  tradition: string;
  language: string;
}

const DIVISIONS: Record<string, Division[]> = {
  sutta: [
    { uid: "dn", name: "Dīgha Nikāya", tradition: "Theravada", language: "Pali" },
    { uid: "mn", name: "Majjhima Nikāya", tradition: "Theravada", language: "Pali" },
    { uid: "sn", name: "Saṃyutta Nikāya", tradition: "Theravada", language: "Pali" },
    { uid: "an", name: "Aṅguttara Nikāya", tradition: "Theravada", language: "Pali" },
    { uid: "kn", name: "Khuddaka Nikāya", tradition: "Theravada", language: "Pali" },
    { uid: "da", name: "Dīrghāgama 長阿含經", tradition: "Dharmaguptaka", language: "Chinese" },
    { uid: "ma", name: "Madhyamāgama 中阿含經", tradition: "Sarvāstivāda", language: "Chinese" },
    { uid: "sa", name: "Saṃyuktāgama 雜阿含經", tradition: "Sarvāstivāda", language: "Chinese" },
    { uid: "sa-2", name: "Saṃyuktāgama 2 別譯雜阿含經", tradition: "Unknown", language: "Chinese" },
    { uid: "ea", name: "Ekottarikāgama 增壹阿含經", tradition: "Mahāsāṃghika", language: "Chinese" },
    { uid: "ea-2", name: "Ekottarikāgama 2", tradition: "Unknown", language: "Chinese" },
  ],
  vinaya: [
    { uid: "pli-tv-vi", name: "Theravāda Vinayapiṭaka", tradition: "Theravada", language: "Pali" },
    { uid: "lzh-mg-vi", name: "Mahāsaṅghika Vinaya", tradition: "Mahāsaṅghika", language: "Chinese" },
    { uid: "san-mg-vi", name: "Mahāsaṅghika Vinaya", tradition: "Mahāsaṅghika", language: "Sanskrit" },
    { uid: "san-lo-vi", name: "Lokuttaravāda Vinaya", tradition: "Lokuttaravāda", language: "Sanskrit" },
    { uid: "lzh-mi-vi", name: "Mahīśāsaka Vinaya", tradition: "Mahīśāsaka", language: "Chinese" },
    { uid: "lzh-dg-vi", name: "Dharmaguptaka Vinaya", tradition: "Dharmaguptaka", language: "Chinese" },
    { uid: "pgd-dg-vi", name: "Dharmaguptaka Vinaya", tradition: "Dharmaguptaka", language: "Gāndhārī" },
    { uid: "lzh-sarv-vi", name: "Sarvāstivāda Vinaya", tradition: "Sarvāstivāda", language: "Chinese" },
    { uid: "san-sarv-vi", name: "Sarvāstivāda Vinaya", tradition: "Sarvāstivāda", language: "Sanskrit" },
    { uid: "lzh-mu-vi", name: "Mūlasarvāstivāda Vinaya", tradition: "Mūlasarvāstivāda", language: "Chinese" },
    { uid: "san-mu-vi", name: "Mūlasarvāstivāda Vinaya", tradition: "Mūlasarvāstivāda", language: "Sanskrit" },
    { uid: "xct-mu-vi", name: "Mūlasarvāstivāda Vinaya", tradition: "Mūlasarvāstivāda", language: "Tibetan" },
  ],
  abhidhamma: [
    { uid: "ds", name: "Dhammasaṅgaṇī", tradition: "Theravada", language: "Pali" },
    { uid: "vb", name: "Vibhaṅga", tradition: "Theravada", language: "Pali" },
    { uid: "dt", name: "Dhātukathā", tradition: "Theravada", language: "Pali" },
    { uid: "pp", name: "Puggalapaññatti", tradition: "Theravada", language: "Pali" },
    { uid: "kv", name: "Kathāvatthu", tradition: "Theravada", language: "Pali" },
    { uid: "ya", name: "Yamaka", tradition: "Theravada", language: "Pali" },
    { uid: "patthana", name: "Paṭṭhāna", tradition: "Theravada", language: "Pali" },
  ],
};

const PITAKA_LABELS: Record<string, string> = {
  sutta: "Sutta Pitaka (Kinh tạng)",
  vinaya: "Vinaya Pitaka (Luật tạng)",
  abhidhamma: "Abhidhamma Pitaka (Luận tạng)",
};

function formatDivisions(pitakas: string[]): string {
  const sections: string[] = [];

  for (const p of pitakas) {
    const divs = DIVISIONS[p];
    if (!divs) continue;
    const label = PITAKA_LABELS[p] ?? p;
    const lines = divs.map(
      (d) => `  • ${d.uid.padEnd(12)} — ${d.name} (${d.language}, ${d.tradition})`
    );
    sections.push(`**${label}:**\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}

// Tool 5: list_divisions
server.tool(
  "list_divisions",
  "Liệt kê các divisions (bộ kinh) trên SuttaCentral, có thể lọc theo pitaka (tạng). Dữ liệu hardcode, không gọi API.",
  {
    pitaka: z
      .enum(["sutta", "vinaya", "abhidhamma"])
      .optional()
      .describe("Lọc theo tạng. Bỏ trống → trả về tất cả."),
  },
  async ({ pitaka }) => {
    const pitakas = pitaka ? [pitaka] : ["sutta", "vinaya", "abhidhamma"];
    const output = [
      formatDivisions(pitakas),
      "",
      "Nguồn: SuttaCentral — xem từng bộ tại https://suttacentral.net/{uid} (vd https://suttacentral.net/dn)",
    ].join("\n");
    return { content: [{ type: "text", text: output }] };
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
