// Logic thuần của tool search_topic (spec search-unit-tests): chuẩn hóa topic và response,
// lọc, phân trang, format. Module không import gì, không I/O, không giữ trạng thái ngoài các
// hằng khai báo ở đây. src/index.ts gọi API rồi đưa body vào; test/ import thẳng module này.

// ─── Search: chủ đề → /api/search/instant (spec dynamic-search) ──────────────

// Mỗi trang: tối đa 10 kết quả khớp tiêu đề + 10 kết quả khớp nội dung; cũng là `limit` gửi API.
export const SEARCH_PAGE_SIZE = 10;

// Chủ đề tiếng Việt → MỘT thuật ngữ tìm kiếm Anh/Pali. SSOT là bảng này; README/AGENTS.md chỉ
// trỏ về đây. Key: NFC, chữ thường, các từ cách nhau một dấu cách. Thuật ngữ mới phải cho ít
// nhất 1 kết quả sutta ở trang 1 (match=all) với cả language=en lẫn vi — đo trước khi thêm.
const VI_TOPIC_TERMS = new Map<string, string>([
  ["tứ diệu đế", "four noble truths"],
  ["khổ", "dukkha"],
  ["bát chánh đạo", "eightfold path"],
  ["vô ngã", "anatta"],
  ["chánh niệm", "satipatthana"],
  ["vô thường", "anicca"],
  ["từ bi", "metta"],
  ["duyên khởi", "dependent origination"],
  ["ngũ uẩn", "khandha"],
  ["niết bàn", "nibbana"],
  ["nghiệp", "kamma"],
  ["thiền", "jhana"],
  ["tam bảo", "three jewels"],
  ["quy y", "going for refuge"],
]);

// `suttaplex` của search mang `difficulty` dạng số; /api/suttaplex mang { name, level }.
const DIFFICULTY_NAMES = new Map<unknown, string>([
  [1, "beginner"],
  [2, "intermediate"],
  [3, "advanced"],
]);

// Khớp tiêu đề: citation đầy đủ qua formatCitation() trên BẢN SAO có difficulty đã đổi sang
// dạng { name } — formatCitation() giữ nguyên cho input /api/suttaplex.
export function formatTitleMatch(sp: any): string {
  const citation = formatCitation({ ...sp, difficulty: { name: DIFFICULTY_NAMES.get(sp.difficulty) } });
  return sp.blurb ? `${citation}\n→ ${sp.blurb}` : citation;
}

// Khớp nội dung: hit là MỘT bản văn (dịch hoặc gốc), không có blurb/difficulty/parallels —
// không bịa các dòng đó. `name` rỗng (bản Āgama) → `root_name`; thiếu `author` → bỏ dòng Text.
export function formatContentMatch(hit: any): string {
  const acronym = (typeof hit.acronym === "string" && hit.acronym) || hit.uid.toUpperCase();
  const title =
    (typeof hit.name === "string" && hit.name.trim()) ||
    (typeof hit.root_name === "string" && hit.root_name.trim()) ||
    "";
  const lines = [title ? `**${acronym}** — ${title}` : `**${acronym}**`];
  if (typeof hit.author === "string" && hit.author !== "") {
    lines.push(hit.lang ? `Text: ${hit.author} (${hit.lang})` : `Text: ${hit.author}`);
  }
  lines.push(`URL: https://suttacentral.net/${hit.uid}`);
  return lines.join("\n");
}

// ─── Citation dùng chung: get_sutta, get_sutta_meta (import từ đây) và khớp tiêu đề ───────

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

// ─── search_topic: từ topic và body response tới text output ─────────────────

export type SearchMatch = "title" | "content" | "all";
export type SearchInput = { topic: string; match: SearchMatch; page: number };
// `term`: thuật ngữ của VI_TOPIC_TERMS khi key khớp. `query`: chuỗi gửi API; "" thì không gọi API.
export type ResolvedTopic = { term: string | undefined; query: string };
// Body của /api/search/instant sau khi chuẩn hóa kiểu (dynamic-search FR-12).
export type SearchResponse = {
  suttaplex: any[];
  hits: any[];
  total: number;
  errorMessage: string | undefined;
};
// `titleCount`: số phần tử khớp tiêu đề sau lọc và khử trùng, trên mọi trang (cho FR-18).
export type SearchPage = { titleCount: number; titlePage: any[]; contentPage: any[] };

export function resolveTopic(topic: string): ResolvedTopic {
  // Key bảng: NFC → chữ thường → trim → gộp khoảng trắng, khớp CHÍNH XÁC. Không khớp: gửi
  // topic chỉ qua NFC + trim (giữ hoa/thường, khoảng trắng bên trong).
  const key = topic.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ");
  const term = VI_TOPIC_TERMS.get(key);
  return { term, query: term ?? topic.normalize("NFC").trim() };
}

// Trang tiêu đề cắt cục bộ (không cần offset); trang nội dung dùng offset của API.
export function searchOffset(match: SearchMatch, page: number): number {
  return match === "title" ? 0 : (page - 1) * SEARCH_PAGE_SIZE;
}

export function normalizeSearchResponse(data: any): SearchResponse {
  return {
    suttaplex: Array.isArray(data?.suttaplex) ? data.suttaplex : [],
    hits: Array.isArray(data?.hits) ? data.hits : [],
    total: typeof data?.total === "number" ? data.total : 0,
    errorMessage: typeof data?.error?.message === "string" ? data.error.message : undefined,
  };
}

// Loại dictionary (`category`), phần tử không có uid, bài viết (`is_article`).
function hasCategory(e: any): boolean {
  return typeof e === "object" && e !== null && "category" in e;
}

export function isSutta(e: any): boolean {
  return !hasCategory(e) && typeof e?.uid === "string" && e.uid !== "" && e.is_article !== true;
}

// Giữ phần tử đầu tiên của mỗi uid; `seen` truyền vào để khử trùng xuyên nhóm trong trang.
function takeNew(items: any[], seen: Set<string>): any[] {
  return items.filter((e) => {
    if (seen.has(e.uid)) return false;
    seen.add(e.uid);
    return true;
  });
}

export function selectPage(res: SearchResponse, match: SearchMatch, page: number): SearchPage {
  const titles = takeNew(res.suttaplex.filter(isSutta), new Set());
  const titlePage =
    match === "content"
      ? []
      : titles.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE);
  const contentPage =
    match === "title"
      ? []
      : takeNew(res.hits.filter(isSutta), new Set(titlePage.map((e) => e.uid)));
  return { titleCount: titles.length, titlePage, contentPage };
}

// Còn trang sau: chỉ suy từ response này. h đếm hit không có `category`, TRƯỚC khi lọc bài
// viết/uid; h > 0 chặn trường hợp upstream trả total = số suttaplex khi hits rỗng.
export function hasMore(res: SearchResponse, match: SearchMatch, page: number, titleCount: number): boolean {
  const offset = searchOffset(match, page);
  const h = res.hits.filter((e) => !hasCategory(e)).length;
  const moreTitles = page * SEARCH_PAGE_SIZE < titleCount;
  const moreContent = h > 0 && offset + h < res.total;
  return match === "title" ? moreTitles : match === "content" ? moreContent : moreTitles || moreContent;
}

function formatFooter(more: boolean, page: number): string {
  return more
    ? `Còn kết quả: gọi lại search_topic với page=${page + 1} (giữ nguyên topic, language, match).`
    : "Hết kết quả.";
}

function termLines(term: string | undefined): string[] {
  return term ? [`Thuật ngữ đã dùng để tìm trên SuttaCentral: "${term}"`] : [];
}

// Câu không có kết quả (FR-11): `topic` rỗng (không gọi API, không footer) hoặc trang 1 rỗng.
// `errorMessage`: lỗi truy vấn SC báo trong body, nếu có.
export function formatNoResults(
  topic: string,
  match: SearchMatch,
  term: string | undefined,
  errorMessage?: string
): string {
  return [
    `Không tìm thấy sutta nào cho chủ đề "${topic}".`,
    ...termLines(term),
    ...(errorMessage !== undefined ? [`SuttaCentral báo lỗi truy vấn: ${errorMessage}`] : []),
    "",
    `Gợi ý: search của SuttaCentral hiểu thuật ngữ tiếng Anh hoặc Pali — thử lại với thuật ngữ tương ứng (ví dụ "satipatthana", "dependent origination").`,
    ...(match !== "all"
      ? [`Đang dùng match="${match}" — thử match="all" để xem cả khớp tiêu đề lẫn khớp nội dung.`]
      : []),
    `Chủ đề tiếng Việt có sẵn: ${[...VI_TOPIC_TERMS.keys()].join(", ")}`,
  ].join("\n");
}

// Text output của một trang từ body response thô (`data` là JSON đã parse, chưa kiểm kiểu).
export function formatSearchResult(input: SearchInput, term: string | undefined, data: any): string {
  const { topic, match, page } = input;
  const res = normalizeSearchResponse(data);
  const { titleCount, titlePage, contentPage } = selectPage(res, match, page);
  const footer = formatFooter(hasMore(res, match, page, titleCount), page);

  const n = titlePage.length + contentPage.length;
  if (n === 0 && page === 1) {
    return [formatNoResults(topic, match, term, res.errorMessage), "", footer].join("\n");
  }
  if (n === 0) {
    return [`Không có kết quả sutta ở trang ${page} cho chủ đề "${topic}".`, "", footer].join("\n");
  }
  const lines = [`Tìm thấy ${n} sutta cho chủ đề "${topic}" (trang ${page}):`, ...termLines(term), ""];
  if (titlePage.length > 0) {
    lines.push("Khớp tiêu đề:", "");
    for (const sp of titlePage) lines.push(formatTitleMatch(sp), "");
  }
  if (contentPage.length > 0) {
    lines.push("Khớp nội dung:", "");
    for (const hit of contentPage) lines.push(formatContentMatch(hit), "");
  }
  lines.push(footer);
  return lines.join("\n");
}
