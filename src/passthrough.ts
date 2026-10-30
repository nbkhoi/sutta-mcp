// Logic thuần của bốn tool get_bilarasuttas, get_suttaplex, get_parallels, get_menu (spec
// tools-api-passthrough): dựng URL request của từng endpoint và dựng output từ body response.
// Không lọc, không gộp, không sắp lại, không cắt. Module không import gì, không I/O, không giữ
// trạng thái. src/index.ts gọi API; test/ import thẳng module này.

// Tham số API của từng tool, cùng tên với API. Tham số vắng thì không gửi.
export type BilarasuttasParams = { uid: string; author_uid?: string; lang?: string };
export type SuttaplexParams = { uid: string; language?: string };
export type ParallelsParams = { uid: string; language?: string };
export type MenuParams = { submenu_id?: string; language?: string };
export type Format = "text" | "json";
export type TextContent = { type: "text"; text: string };

// URL request duy nhất của một lời gọi. Handler truyền nguyên chuỗi này cho fetch và cho
// renderBody(); không nơi nào khác dựng hay sửa URL của bốn endpoint này.
export function buildBilarasuttasUrl(p: BilarasuttasParams): string {
  return apiUrl(["bilarasuttas", p.uid, p.author_uid], "lang", p.lang);
}

export function buildSuttaplexUrl(p: SuttaplexParams): string {
  return apiUrl(["suttaplex", p.uid], "language", p.language);
}

export function buildParallelsUrl(p: ParallelsParams): string {
  return apiUrl(["parallels", p.uid], "language", p.language);
}

export function buildMenuUrl(p: MenuParams): string {
  return apiUrl(["menu", p.submenu_id], "language", p.language);
}

// Mỗi phần path khác undefined được mã hóa như một path segment; phần undefined bị bỏ. Mỗi endpoint
// có đúng một tham số query, chỉ gửi khi khác undefined. Không có giá trị mặc định nào.
function apiUrl(path: (string | undefined)[], key: string, value: string | undefined): string {
  const segments = path.filter((s): s is string => s !== undefined).map((s) => encodeURIComponent(s));
  const query = value === undefined ? "" : `?${new URLSearchParams({ [key]: value })}`;
  return `https://suttacentral.net/api/${segments.join("/")}${query}`;
}

// `raw`: body response đọc bằng res.text(). json: body nguyên văn rồi dòng nguồn. text: dòng nguồn
// rồi body theo render(); body phải parse được JSON, nếu không JSON.parse ném lỗi và SDK dựng isError.
export function renderBody(url: string, raw: string, format: Format): TextContent[] {
  if (format === "json") return [{ type: "text", text: raw }, { type: "text", text: sourceLine(url) }];
  const lines = [sourceLine(url)];
  render(lines, "", undefined, JSON.parse(raw));
  return [{ type: "text", text: lines.join("\n") }];
}

function sourceLine(url: string): string {
  return `Nguồn: SuttaCentral — ${url}`;
}

// Mỗi giá trị một dòng `{nhãn}: {head}`; nhãn là key của object hoặc `[i]` của mảng, giá trị
// top-level không có nhãn. Con của object/mảng in ngay sau nó, theo thứ tự body, thụt thêm hai dấu
// cách (con của giá trị top-level không thụt). Không bỏ, không gộp, không sắp lại, không cắt.
function render(lines: string[], indent: string, label: string | undefined, v: unknown): void {
  lines.push(label === undefined ? indent + head(v) : `${indent}${label}: ${head(v)}`);
  const inner = label === undefined ? indent : indent + "  ";
  const children: [string, unknown][] = Array.isArray(v)
    ? v.map((e, i) => [`[${i}]`, e])
    : v !== null && typeof v === "object"
      ? Object.entries(v)
      : [];
  for (const [k, e] of children) render(lines, inner, k, e);
}

// Chuỗi: nguyên văn, chuỗi rỗng là `""`. Số, boolean, null: literal JSON. Mảng, object: kiểu kèm
// số phần tử hoặc số key; nội dung nằm ở các dòng con.
function head(v: unknown): string {
  if (typeof v === "string") return v === "" ? '""' : v;
  if (Array.isArray(v)) return v.length === 0 ? "[mảng rỗng, 0 phần tử]" : `[mảng, ${v.length} phần tử]`;
  if (v !== null && typeof v === "object") {
    const n = Object.keys(v).length;
    return n === 0 ? "{object rỗng}" : `{object, ${n} key}`;
  }
  return JSON.stringify(v);
}
