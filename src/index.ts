#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── SuttaCentral API helpers ────────────────────────────────────────────────

const SC_BASE = "https://suttacentral.net/api";

async function fetchSuttaplex(uid: string, language = "en") {
  const url = `${SC_BASE}/suttaplex/${uid}?language=${language}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SuttaCentral API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function fetchBilaraText(uid: string, translator = "sujato") {
  const url = `${SC_BASE}/bilarasuttas/${uid}/${translator}`;
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

// ─── Topic → UID index (tĩnh, đủ cho prototype) ─────────────────────────────
// Mở rộng dần khi biết nhu cầu thực tế của cộng đồng

const TOPIC_INDEX: Record<string, string[]> = {
  // Tứ diệu đế / Four Noble Truths
  "four noble truths": ["sn56.11", "mn141", "dn22"],
  "tứ diệu đế": ["sn56.11", "mn141", "dn22"],
  "dukkha": ["sn56.11", "sn12.15", "mn9"],
  "khổ": ["sn56.11", "sn12.15", "mn9"],

  // Bát chánh đạo / Eightfold Path
  "eightfold path": ["sn45.8", "mn117", "dn22"],
  "bát chánh đạo": ["sn45.8", "mn117", "dn22"],
  "noble eightfold path": ["sn45.8", "mn117"],

  // Vô ngã / Not-self
  "not-self": ["sn22.59", "mn35", "ud5.5"],
  "anatta": ["sn22.59", "mn35", "ud5.5"],
  "vô ngã": ["sn22.59", "mn35"],

  // Chánh niệm / Mindfulness
  "mindfulness": ["mn10", "sn47.1", "dn22"],
  "satipatthana": ["mn10", "dn22"],
  "chánh niệm": ["mn10", "sn47.1", "dn22"],

  // Vô thường / Impermanence
  "impermanence": ["sn22.59", "an3.136", "iti47"],
  "anicca": ["sn22.59", "an3.136"],
  "vô thường": ["sn22.59", "an3.136"],

  // Từ bi / Loving-kindness
  "loving-kindness": ["mn7", "snp1.8", "an11.16"],
  "metta": ["mn7", "snp1.8", "an11.16"],
  "từ bi": ["mn7", "snp1.8"],

  // Duyên khởi / Dependent origination
  "dependent origination": ["sn12.1", "sn12.2", "mn38"],
  "paticca-samuppada": ["sn12.1", "sn12.2"],
  "duyên khởi": ["sn12.1", "sn12.2"],

  // Ngũ uẩn / Aggregates
  "aggregates": ["sn22.59", "mn109", "dn15"],
  "five aggregates": ["sn22.59", "mn109"],
  "ngũ uẩn": ["sn22.59", "mn109"],

  // Niết bàn / Nibbana
  "nibbana": ["ud8.1", "iti43", "sn43.14"],
  "nirvana": ["ud8.1", "iti43"],
  "niết bàn": ["ud8.1", "iti43"],

  // Nghiệp / Kamma
  "kamma": ["mn135", "an3.65", "mn57"],
  "karma": ["mn135", "an3.65"],
  "nghiệp": ["mn135", "an3.65"],

  // Thiền định / Meditation / Jhana
  "jhana": ["mn36", "dn2", "an9.36"],
  "meditation": ["mn36", "mn10", "sn47.1"],
  "thiền": ["mn36", "dn2"],

  // Ba ngôi báu / Triple Gem
  "triple gem": ["an3.70", "kp1"],
  "tam bảo": ["an3.70", "kp1"],
  "refuge": ["an3.70", "kp1"],
  "quy y": ["an3.70", "kp1"],
};

function searchByTopic(query: string): string[] {
  const q = query.toLowerCase().trim();
  // Tìm exact match trước
  if (TOPIC_INDEX[q]) return TOPIC_INDEX[q];
  // Rồi partial match
  for (const [key, uids] of Object.entries(TOPIC_INDEX)) {
    if (key.includes(q) || q.includes(key)) return uids;
  }
  return [];
}

// ─── Render sutta text từ Bilara response ────────────────────────────────────

function extractText(bilaraData: any): string {
  const translation = bilaraData?.translation_text ?? {};
  const root = bilaraData?.root_text ?? {};

  const segments = Object.keys(translation).length > 0 ? translation : root;
  const lines: string[] = [];

  for (const [_id, text] of Object.entries(segments)) {
    if (text && typeof text === "string" && text.trim()) {
      lines.push(text.trim());
    }
  }

  return lines.join("\n");
}

function formatCitation(suttaplex: any): string {
  const uid = suttaplex?.uid ?? "?";
  const acronym = suttaplex?.acronym ?? uid.toUpperCase();
  const title = suttaplex?.translated_title ?? suttaplex?.original_title ?? "";
  const parallels = suttaplex?.parallel_count ?? 0;
  const difficulty = suttaplex?.difficulty?.name ?? "unknown";
  const url = `https://suttacentral.net/${uid}`;

  return [
    `**${acronym}** — ${title}`,
    `Difficulty: ${difficulty} | Parallels: ${parallels}`,
    `URL: ${url}`,
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
  "Tìm kiếm các sutta liên quan đến một chủ đề Phật pháp. Trả về danh sách UID kèm metadata.",
  {
    topic: z.string().describe(
      "Chủ đề cần tìm, ví dụ: 'mindfulness', 'vô ngã', 'four noble truths', 'từ bi'"
    ),
    language: z.string().default("en").describe("Ngôn ngữ cho blurb: 'en' hoặc 'vi'"),
  },
  async ({ topic, language }) => {
    const uids = searchByTopic(topic);

    if (uids.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Không tìm thấy sutta nào cho chủ đề "${topic}".\n\nCác chủ đề có sẵn: ${Object.keys(TOPIC_INDEX).join(", ")}`,
          },
        ],
      };
    }

    const results: string[] = [`Tìm thấy ${uids.length} sutta cho chủ đề "${topic}":\n`];

    for (const uid of uids) {
      try {
        const sp = await fetchSuttaplex(uid, language);
        results.push(formatCitation(sp));
        if (sp?.blurb) results.push(`→ ${sp.blurb}`);
        results.push("");
      } catch {
        results.push(`${uid.toUpperCase()} — (không thể tải metadata)`);
      }
    }

    return { content: [{ type: "text", text: results.join("\n") }] };
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
      .describe("ID dịch giả: 'sujato' (mặc định, tiếng Anh), 'brahmali' (Vinaya)"),
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

    const citation = formatCitation(suttaplex);
    const translatorName =
      (suttaplex?.translations ?? []).find((t: any) => t.author_uid === translator)
        ?.author ?? translator;
    const fullText = extractText(bilaraData);
    const lines = fullText.split("\n").filter(Boolean);
    const truncated = lines.slice(0, max_segments);
    const isTruncated = lines.length > max_segments;

    const output = [
      "─".repeat(60),
      citation,
      `Translator: ${translatorName} (${translator})`,
      "─".repeat(60),
      "",
      truncated.join("\n"),
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
