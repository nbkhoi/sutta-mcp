// Logic thuần của tool search_topic (spec search-api-passthrough): dựng URL request của
// GET /api/search/instant và dựng output từ body response. Không lọc, không khử trùng, không
// đổi thứ tự. Module không import gì, không I/O, không giữ trạng thái. src/index.ts gọi API;
// test/ import thẳng module này.

// ─── search_topic: wrapper mỏng của /api/search/instant ─────────────────────

// Tham số API của tool, cùng tên với API. Tham số vắng thì không gửi.
export type SearchParams = {
  query: string;
  language?: string;
  limit?: number;
  offset?: number;
  selectedLanguages?: string[];
  restrict?: string;
  matchpartial?: boolean;
};
export type SearchFormat = "text" | "json";
export type TextContent = { type: "text"; text: string };

// URL request duy nhất của một lời gọi. Handler truyền nguyên chuỗi này cho fetch và cho
// renderSearch(); không nơi nào khác dựng hay sửa URL search.
export function buildSearchUrl(p: SearchParams): string {
  const q = new URLSearchParams({ query: p.query });
  if (p.language !== undefined) q.set("language", p.language);
  if (p.limit !== undefined) q.set("limit", String(p.limit));
  if (p.offset !== undefined) q.set("offset", String(p.offset));
  if (p.selectedLanguages !== undefined) q.set("selectedLanguages", JSON.stringify(p.selectedLanguages));
  if (p.restrict !== undefined) q.set("restrict", p.restrict);
  if (p.matchpartial !== undefined) q.set("matchpartial", String(p.matchpartial));
  return `https://suttacentral.net/api/search/instant?${q}`;
}

// `raw`: body response đọc bằng res.text(). json: body nguyên văn rồi dòng nguồn. text: body
// phải parse được JSON, nếu không JSON.parse ném lỗi và SDK dựng isError.
export function renderSearch(url: string, raw: string, format: SearchFormat): TextContent[] {
  if (format === "json") return [{ type: "text", text: raw }, { type: "text", text: sourceLine(url) }];
  return [{ type: "text", text: formatSearchText(url, JSON.parse(raw)) }];
}

function sourceLine(url: string): string {
  return `Nguồn: SuttaCentral — ${url}`;
}

// Chuỗi khác rỗng thì trả nguyên văn; mọi giá trị khác coi như vắng.
function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

// Giá trị thô của API: chuỗi in nguyên văn, kiểu khác in dạng JSON.
function rawValue(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

function formatSearchText(url: string, body: unknown): string {
  const blocks = [sourceLine(url)];
  if (body === null) {
    blocks.push("SuttaCentral trả body `null` cho request này.");
    return blocks.join("\n\n");
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    blocks.push(`SuttaCentral trả body không phải object JSON: ${JSON.stringify(body)}`);
    return blocks.join("\n\n");
  }
  const b = body as Record<string, unknown>;
  blocks.push(...arraySection(b, "suttaplex", "Khớp tiêu đề (suttaplex)", formatSuttaplexItem));
  blocks.push(...arraySection(b, "hits", "Khớp nội dung (hits)", formatHit));
  blocks.push(
    Object.hasOwn(b, "total")
      ? `total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): ${rawValue(b.total)}`
      : "total: body không có key `total`"
  );
  blocks.push(fuzzySection(b));
  if (Object.hasOwn(b, "error")) blocks.push(formatError(b.error));
  return blocks.join("\n\n");
}

// Tiêu đề kèm `length` của mảng, rồi mỗi phần tử một khối, đúng thứ tự API.
function arraySection(
  b: Record<string, unknown>,
  key: string,
  title: string,
  item: (label: string, e: any) => string
): string[] {
  if (!Object.hasOwn(b, key)) return [`${title}: body không có key \`${key}\``];
  const arr = b[key];
  if (!Array.isArray(arr)) return [`${title}: \`${key}\` không phải mảng: ${JSON.stringify(arr)}`];
  return [`${title}: ${arr.length}`, ...arr.map((e, i) => item(`${key}[${i}]`, e))];
}

function heading(label: string, acronym: string | undefined, title: string | undefined): string {
  return [label, acronym && `**${acronym}**`, title && `— ${title}`].filter(Boolean).join(" ");
}

function formatSuttaplexItem(label: string, sp: any): string {
  const uid = str(sp?.uid);
  const lines = [heading(label, str(sp?.acronym) ?? uid, str(sp?.translated_title) ?? str(sp?.original_title))];
  if (uid) lines.push(`UID: ${uid}`, `URL: https://suttacentral.net/${uid}`);
  if (sp?.difficulty !== undefined && sp?.difficulty !== null) lines.push(`Difficulty: ${rawValue(sp.difficulty)}`);
  const blurb = str(sp?.blurb);
  if (blurb) lines.push(`Blurb: ${blurb}`);
  return lines.join("\n");
}

function formatHit(label: string, hit: any): string {
  const lines = [heading(label, str(hit?.acronym), str(hit?.name) ?? str(hit?.root_name))];
  const url = str(hit?.url);
  if (url?.startsWith("/")) lines.push(`URL: https://suttacentral.net${url}`);
  const uid = str(hit?.uid);
  if (uid) lines.push(`UID: ${uid}`);
  const author = str(hit?.author);
  const authorUid = str(hit?.author_uid);
  if (author) lines.push(authorUid ? `Tác giả: ${author} (${authorUid})` : `Tác giả: ${author}`);
  else if (authorUid) lines.push(`Tác giả: ${authorUid}`);
  const lang = str(hit?.lang);
  if (lang) lines.push(`Ngôn ngữ: ${lang}`);
  const category = str(hit?.category);
  if (category) lines.push(`Category: ${category}`);
  if (hit?.is_article === true) lines.push("Bài viết (is_article)");
  const highlight = hit?.highlight?.content;
  if (Array.isArray(highlight)) {
    for (const h of highlight) if (typeof h === "string") lines.push(`Highlight: ${h}`);
  }
  return lines.join("\n");
}

// Dạng phần tử chưa quan sát được: mỗi phần tử là JSON một dòng, liền sau tiêu đề.
function fuzzySection(b: Record<string, unknown>): string {
  const title = "fuzzy_dictionary";
  if (!Object.hasOwn(b, "fuzzy_dictionary")) return `${title}: body không có key \`fuzzy_dictionary\``;
  const arr = b.fuzzy_dictionary;
  if (!Array.isArray(arr)) return `${title}: \`fuzzy_dictionary\` không phải mảng: ${JSON.stringify(arr)}`;
  return [`${title}: ${arr.length}`, ...arr.map((e) => JSON.stringify(e))].join("\n");
}

function formatError(error: any): string {
  const lines = ["Lỗi truy vấn do SuttaCentral báo (error):"];
  if (typeof error !== "object" || error === null) {
    lines.push(rawValue(error));
    return lines.join("\n");
  }
  const type = str(error.type);
  if (type) lines.push(`type: ${type}`);
  const message = str(error.message);
  if (message) lines.push(`message: ${message}`);
  if (Array.isArray(error.suggestions)) {
    for (const s of error.suggestions) if (typeof s === "string") lines.push(`suggestion: ${s}`);
  }
  return lines.join("\n");
}

// ─── Citation dùng chung: get_sutta, get_sutta_meta (import từ đây) ──────────

export function formatCitation(suttaplex: any): string {
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
