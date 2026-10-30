// Unit test offline cho logic thuần của get_bilarasuttas, get_suttaplex, get_parallels, get_menu
// (spec tools-api-passthrough). Mỗi case mang tiền tố `tools-api-passthrough FR-{n}:` theo
// specs/tools-api-passthrough/requirements.md. Fixture: response ghi live rồi cắt (test/fixtures/,
// xem design §Fixture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBilarasuttasUrl,
  buildMenuUrl,
  buildParallelsUrl,
  buildSuttaplexUrl,
  renderBody,
  type SuttaplexParams,
} from "../src/passthrough.js";

type Fixture = { url: string; recorded: string; tool: string; params: any; body: any };

function load(name: string): Fixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

const FIXTURES = ["bilarasuttas-dn22-sujato", "suttaplex-mn10", "parallels-mn10", "menu"];
const BUILD: Record<string, (p: any) => string> = {
  get_bilarasuttas: buildBilarasuttasUrl,
  get_suttaplex: buildSuttaplexUrl,
  get_parallels: buildParallelsUrl,
  get_menu: buildMenuUrl,
};
const API = "https://suttacentral.net/api";
const U = `${API}/suttaplex/x`;
const SRC = `Nguồn: SuttaCentral — ${U}`;

// Output text cho một body (đi qua JSON.stringify như body đọc bằng res.text()).
function text(body: unknown, url = U): string {
  const content = renderBody(url, JSON.stringify(body), "text");
  assert.equal(content.length, 1);
  return content[0].text;
}
function fixtureText(name: string): string {
  const f = load(name);
  return text(f.body, f.url);
}
// Các dòng của một key top-level: dòng `key: …` và các dòng con thụt lề ngay sau nó.
function section(t: string, key: string): string[] {
  const lines = t.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`${key}: `));
  assert.ok(start > 0, key);
  const end = lines.findIndex((l, i) => i > start && !l.startsWith(" "));
  return lines.slice(start, end === -1 ? undefined : end);
}
// Tiền tố mong đợi của từng dòng con, theo thứ tự trước của body: thụt lề theo độ sâu, rồi nhãn.
function labels(v: unknown, depth: number, out: string[]): string[] {
  const kids: [string, unknown][] = Array.isArray(v)
    ? v.map((e, i) => [`[${i}]`, e])
    : v !== null && typeof v === "object"
      ? Object.entries(v)
      : [];
  for (const [k, e] of kids) {
    out.push(`${"  ".repeat(depth)}${k}: `);
    labels(e, depth + 1, out);
  }
  return out;
}

test("tools-api-passthrough FR-3: đúng URL của từng tool, chỉ tham số caller truyền, không giá trị mặc định", () => {
  assert.equal(buildBilarasuttasUrl({ uid: "mn10" }), `${API}/bilarasuttas/mn10`);
  assert.equal(buildBilarasuttasUrl({ uid: "mn10", author_uid: "sujato" }), `${API}/bilarasuttas/mn10/sujato`);
  assert.equal(
    buildBilarasuttasUrl({ uid: "mn10", author_uid: "sujato", lang: "vi" }),
    `${API}/bilarasuttas/mn10/sujato?lang=vi`
  );
  assert.equal(buildBilarasuttasUrl({ uid: "mn10", lang: "en" }), `${API}/bilarasuttas/mn10?lang=en`);
  assert.equal(buildSuttaplexUrl({ uid: "mn10" }), `${API}/suttaplex/mn10`);
  assert.equal(buildSuttaplexUrl({ uid: "mn10", language: "vi" }), `${API}/suttaplex/mn10?language=vi`);
  assert.equal(buildParallelsUrl({ uid: "mn10" }), `${API}/parallels/mn10`);
  assert.equal(buildParallelsUrl({ uid: "mn10", language: "vi" }), `${API}/parallels/mn10?language=vi`);
  assert.equal(buildMenuUrl({}), `${API}/menu`);
  assert.equal(buildMenuUrl({ submenu_id: "long" }), `${API}/menu/long`);
  assert.equal(buildMenuUrl({ submenu_id: "long", language: "vi" }), `${API}/menu/long?language=vi`);
  assert.equal(buildMenuUrl({ language: "" }), `${API}/menu?language=`);
  const withFormat = { uid: "mn10", format: "json" } as SuttaplexParams;
  assert.equal(buildSuttaplexUrl(withFormat), `${API}/suttaplex/mn10`);
});

test("tools-api-passthrough FR-4: tham số path mã hóa như một path segment, không trim, không đổi hoa/thường", () => {
  assert.equal(buildSuttaplexUrl({ uid: "a b?c#d" }), `${API}/suttaplex/a%20b%3Fc%23d`);
  assert.equal(buildBilarasuttasUrl({ uid: "MN10", author_uid: "x/y" }), `${API}/bilarasuttas/MN10/x%2Fy`);
  assert.equal(buildMenuUrl({ submenu_id: " long " }), `${API}/menu/%20long%20`);
  assert.equal(buildParallelsUrl({ uid: "mn10", language: "a b&c=d" }), `${API}/parallels/mn10?language=a+b%26c%3Dd`);
  const nfc = "ā".normalize("NFC");
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfd, nfc);
  assert.equal(buildSuttaplexUrl({ uid: nfd }), `${API}/suttaplex/a%CC%84`);
  assert.equal(buildSuttaplexUrl({ uid: nfc }), `${API}/suttaplex/%C4%81`);
});

test("tools-api-passthrough FR-5: URL của fixture là URL hàm dựng phát cho params đã ghi", () => {
  for (const name of FIXTURES) {
    const f = load(name);
    assert.equal(BUILD[f.tool](f.params), f.url, name);
  }
  assert.deepEqual(
    FIXTURES.map((n) => load(n).url),
    [`${API}/bilarasuttas/dn22/sujato`, `${API}/suttaplex/mn10`, `${API}/parallels/mn10`, `${API}/menu`]
  );
});

test("tools-api-passthrough FR-7: format json trả body nguyên văn rồi dòng nguồn", () => {
  const raw = '{"msg":  "Not Found"}';
  assert.deepEqual(renderBody(U, raw, "json"), [
    { type: "text", text: raw },
    { type: "text", text: SRC },
  ]);
  assert.equal(renderBody(U, "{}", "json")[0].text, "{}");
  assert.equal(renderBody(U, "null", "json")[0].text, "null");
  assert.equal(renderBody(U, "<html>", "json")[0].text, "<html>");
});

test("tools-api-passthrough FR-9: dòng đầu của text là dòng nguồn với URL request", () => {
  for (const name of FIXTURES) {
    const f = load(name);
    assert.equal(fixtureText(name).split("\n")[0], `Nguồn: SuttaCentral — ${f.url}`, name);
  }
  assert.equal(renderBody(U, "{}", "text").length, 1);
});

test("tools-api-passthrough FR-10: mọi key và phần tử của fixture, ở mọi độ sâu, theo đúng thứ tự body", () => {
  for (const name of FIXTURES) {
    const lines = fixtureText(name).split("\n").slice(2);
    const expected = labels(load(name).body, 0, []);
    assert.equal(lines.length, expected.length, name);
    lines.forEach((l, i) => assert.ok(l.startsWith(expected[i]), `${name} dòng ${i + 3}: ${l}`));
  }
  const sp = fixtureText("suttaplex-mn10").split("\n");
  assert.deepEqual(sp.slice(1, 4), ["[mảng, 1 phần tử]", "[0]: {object, 18 key}", "  acronym: MN 10"]);
  const d = sp.indexOf("  difficulty: {object, 2 key}");
  assert.deepEqual(sp.slice(d, d + 3), ["  difficulty: {object, 2 key}", "    name: intermediate", "    level: 2"]);
  assert.ok(sp.includes("  translated_title: The Discourse on Mindfulness Meditation "));
  assert.ok(sp.includes('  verseNo: ""'));
  assert.ok(sp.includes("  alt_acronym: null"));
  const par = fixtureText("parallels-mn10");
  assert.deepEqual(
    par.split("\n").filter((l) => /^\S/.test(l)).slice(1),
    ["{object, 4 key}", "mn10: [mảng, 8 phần tử]", "mn10#44.1: [mảng, 2 phần tử]", "mn10#47.1: [mảng, 3 phần tử]", "mn10#10.1: [mảng, 3 phần tử]"]
  );
  const mn10 = section(par, "mn10");
  assert.deepEqual(mn10.slice(0, 5), [
    "mn10: [mảng, 8 phần tử]",
    "  [0]: {object, 5 key}",
    "    enumber: 10",
    "    to: {object, 12 key}",
    "      to: dn22",
  ]);
  const first = mn10.slice(1, mn10.indexOf("  [1]: {object, 5 key}"));
  assert.deepEqual(first.slice(-3), ["    type: full", "    remark: null", "    resembling: false"]);
  assert.ok(first.includes("      uid: dn22"));
  const menu = fixtureText("menu").split("\n");
  assert.equal(menu[1], "[mảng, 4 phần tử]");
  assert.deepEqual(
    menu.filter((l) => /^ {2}uid: /.test(l)),
    ["  uid: abhidhamma", "  uid: cnd-khaggavisanasuttaniddesa", "  uid: g2dhp1", "  uid: sutta"]
  );
  assert.equal(menu.filter((l) => l === "  children: [mảng rỗng, 0 phần tử]").length, 2);
  assert.deepEqual(
    menu.filter((l) => /^ {6}uid: /.test(l)).slice(4),
    ["long", "middle", "linked", "numbered", "minor", "other-group"].map((u) => `      uid: ${u}`)
  );
});

test("tools-api-passthrough FR-10: literal: chuỗi rỗng, null, object và mảng rỗng, mảng lồng, translations, nguyên văn", () => {
  const body = {
    a: "",
    b: null,
    c: {},
    d: [],
    e: [[1, "x"], []],
    f: { g: true, h: 1.5, i: " <b>x</b> " },
    translations: [
      { lang: "vi", author_uid: "phantuananh" },
      { lang: "en", author_uid: "sujato" },
    ],
    "mn10:1.1": "So I have heard. ",
  };
  assert.equal(
    text(body),
    [
      SRC,
      "{object, 8 key}",
      'a: ""',
      "b: null",
      "c: {object rỗng}",
      "d: [mảng rỗng, 0 phần tử]",
      "e: [mảng, 2 phần tử]",
      "  [0]: [mảng, 2 phần tử]",
      "    [0]: 1",
      "    [1]: x",
      "  [1]: [mảng rỗng, 0 phần tử]",
      "f: {object, 3 key}",
      "  g: true",
      "  h: 1.5",
      "  i:  <b>x</b> ",
      "translations: [mảng, 2 phần tử]",
      "  [0]: {object, 2 key}",
      "    lang: vi",
      "    author_uid: phantuananh",
      "  [1]: {object, 2 key}",
      "    lang: en",
      "    author_uid: sujato",
      "mn10:1.1: So I have heard. ",
    ].join("\n")
  );
  const ids = Array.from({ length: 60 }, (_, i) => `mn10:${i + 1}.1`);
  const map = Object.fromEntries(ids.map((id, i) => [id, `s${i + 1}`]));
  assert.equal(
    text({ translation_text: map, keys_order: ids }),
    [
      SRC,
      "{object, 2 key}",
      "translation_text: {object, 60 key}",
      ...ids.map((id, i) => `  ${id}: s${i + 1}`),
      "keys_order: [mảng, 60 phần tử]",
      ...ids.map((id, i) => `  [${i}]: ${id}`),
    ].join("\n")
  );
});

test("tools-api-passthrough FR-11: fixture bilara: mọi key của keys_order có ở mọi map, kể cả key cuối có giá trị rỗng", () => {
  const f = load("bilarasuttas-dn22-sujato");
  const t = fixtureText("bilarasuttas-dn22-sujato");
  const maps = ["comment_text", "html_text", "root_text", "translation_text", "variant_text", "reference_text"];
  assert.deepEqual(Object.keys(f.body), [...maps, "keys_order"]);
  for (const m of maps) {
    assert.deepEqual(
      section(t, m).slice(1).map((l) => l.slice(2, l.indexOf(": "))),
      f.body.keys_order,
      m
    );
  }
  assert.deepEqual(section(t, "translation_text").slice(-2), [
    "  dn22:22.27: Satisfied, the mendicants approved what the Buddha said. ",
    '  dn22:22.28: ""',
  ]);
  assert.deepEqual(section(t, "keys_order"), [
    "keys_order: [mảng, 5 phần tử]",
    "  [0]: dn22:0.1",
    "  [1]: dn22:0.2",
    "  [2]: dn22:1.1",
    "  [3]: dn22:22.27",
    "  [4]: dn22:22.28",
  ]);
});

test("tools-api-passthrough FR-12: body không tìm thấy, rỗng, null, scalar không ném; body không phải JSON thì ném", () => {
  assert.equal(text({ msg: "Not Found" }), `${SRC}\n{object, 1 key}\nmsg: Not Found`);
  assert.equal(text({}), `${SRC}\n{object rỗng}`);
  assert.equal(text([]), `${SRC}\n[mảng rỗng, 0 phần tử]`);
  assert.equal(renderBody(U, "null", "text")[0].text, `${SRC}\nnull`);
  assert.equal(text("abc"), `${SRC}\nabc`);
  assert.equal(text(42), `${SRC}\n42`);
  assert.throws(() => renderBody(U, "<html>", "text"), SyntaxError);
});
