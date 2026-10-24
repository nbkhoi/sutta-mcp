// Unit test offline cho logic thuần của search_topic (spec search-api-passthrough). Mỗi case mang
// tiền tố id FR của specs/search-api-passthrough/requirements.md. Fixture: response
// /api/search/instant ghi live rồi cắt (test/fixtures/, xem design §Fixture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSearchUrl, renderSearch, type SearchParams } from "../src/search.js";

type Fixture = { url: string; recorded: string; params: SearchParams; body: any };

function load(name: string): Fixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

const BASE = "https://suttacentral.net/api/search/instant?";
const U = `${BASE}query=x`;

// Output text cho một body (đi qua JSON.stringify như body đọc bằng res.text()).
function text(body: unknown, url = U): string {
  const content = renderSearch(url, JSON.stringify(body), "text");
  assert.equal(content.length, 1);
  return content[0].text;
}
function fixtureText(name: string): string {
  const f = load(name);
  return text(f.body, f.url);
}
const blocks = (t: string) => t.split("\n\n");
const items = (t: string, key: string) => blocks(t).filter((b) => b.startsWith(`${key}[`));

test("FR-2: chỉ tham số caller truyền mới vào query string, đúng cách mã hóa", () => {
  assert.equal(buildSearchUrl({ query: "mindfulness" }), `${BASE}query=mindfulness`);
  assert.equal(
    buildSearchUrl({
      query: "mindfulness",
      language: "vi",
      limit: 0,
      offset: 20,
      selectedLanguages: ["vi", "pli"],
      restrict: "all",
      matchpartial: false,
    }),
    `${BASE}query=mindfulness&language=vi&limit=0&offset=20&selectedLanguages=%5B%22vi%22%2C%22pli%22%5D&restrict=all&matchpartial=false`
  );
  const sp = new URL(buildSearchUrl({ query: "m", selectedLanguages: ["vi", "pli"], matchpartial: true })).searchParams;
  assert.equal(sp.get("selectedLanguages"), '["vi","pli"]');
  assert.equal(sp.get("matchpartial"), "true");
  assert.deepEqual([...sp.keys()], ["query", "selectedLanguages", "matchpartial"]);
  assert.equal(buildSearchUrl({ query: "m", selectedLanguages: [] }), `${BASE}query=m&selectedLanguages=%5B%5D`);
  assert.equal(buildSearchUrl({ query: "m", offset: 5 }), `${BASE}query=m&offset=5`);
  const withFormat = { query: "m", format: "json" } as SearchParams;
  assert.equal(buildSearchUrl(withFormat), `${BASE}query=m`);
});

test("FR-2a: URL của fixture là đúng URL hàm dựng phát cho params đã ghi, và là URL trong dòng nguồn", () => {
  for (const name of ["anatta-en", "foo-bar-en", "vo-nga-vi-pli"]) {
    const f = load(name);
    assert.equal(buildSearchUrl(f.params), f.url, name);
    assert.equal(fixtureText(name).split("\n")[0], `Nguồn: SuttaCentral — ${f.url}`, name);
  }
  assert.equal(
    load("vo-nga-vi-pli").url,
    `${BASE}query=v%C3%B4+ng%C3%A3&language=vi&selectedLanguages=%5B%22vi%22%2C%22pli%22%5D`
  );
});

test("FR-3: query gửi nguyên văn: khoảng trắng, chữ hoa, dạng NFD, dấu +", () => {
  const url = buildSearchUrl({ query: "  Vô Ngã " });
  assert.equal(url, `${BASE}query=++V%C3%B4+Ng%C3%A3+`);
  assert.equal(new URL(url).searchParams.get("query"), "  Vô Ngã ");
  const nfc = "vô ngã".normalize("NFC");
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfd, nfc);
  const nfdUrl = buildSearchUrl({ query: nfd });
  assert.equal(nfdUrl, `${BASE}query=vo%CC%82+nga%CC%83`);
  assert.equal(new URL(nfdUrl).searchParams.get("query"), nfd);
  assert.equal(buildSearchUrl({ query: "" }), `${BASE}query=`);
  assert.equal(buildSearchUrl({ query: "a+b" }), `${BASE}query=a%2Bb`);
});

test("FR-5: format json trả body nguyên văn rồi dòng nguồn", () => {
  const raw = '{"total": 0,  "hits": [], "suttaplex": [], "fuzzy_dictionary": []}';
  assert.deepEqual(renderSearch(U, raw, "json"), [
    { type: "text", text: raw },
    { type: "text", text: `Nguồn: SuttaCentral — ${U}` },
  ]);
  assert.equal(renderSearch(U, "null", "json")[0].text, "null");
  assert.equal(renderSearch(U, "<html>", "json")[0].text, "<html>");
});

test("FR-6: mỗi phần có tiêu đề kèm length, mỗi phần tử một mục, đúng thứ tự API", () => {
  const t = fixtureText("anatta-en");
  const b = blocks(t);
  const order = [
    "Khớp tiêu đề (suttaplex): 6",
    "Khớp nội dung (hits): 10",
    "total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): 145",
    "fuzzy_dictionary: 0",
  ].map((h) => b.indexOf(h));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), String(order));
  assert.deepEqual(
    items(t, "suttaplex").map((e) => e.split("\n")[1]),
    ["an6.100", "sn22.14", "sn22.143", "sn22.68", "sn23.17", "sn46.73"].map((u) => `UID: ${u}`)
  );
  assert.deepEqual(
    items(t, "hits").map((e) => e.split("\n")[1]),
    [
      "/define/anatta",
      "/general-guide-sujato",
      "/sn-guide-sujato",
      "/subjects",
      "/terminology",
      "/thi-ap4/en/walters",
      "/an3.136/pli/ms",
      "/an7.18/pli/ms",
      "/an7.20/pli/ms",
      "/an10.60/pli/ms",
    ].map((p) => `URL: https://suttacentral.net${p}`)
  );
  assert.deepEqual(
    items(t, "hits").map((e) => e.split("\n")[0].split(" ")[0]),
    ["hits[0]", "hits[1]", "hits[2]", "hits[3]", "hits[4]", "hits[5]", "hits[6]", "hits[7]", "hits[8]", "hits[9]"]
  );
  const dup = text({ suttaplex: [{ uid: "a" }, { uid: "a" }], hits: [{ uid: "a" }, { uid: "b" }, { uid: "a" }] });
  assert.equal(items(dup, "suttaplex").length, 2);
  assert.deepEqual(items(dup, "hits").map((e) => e.split("\n")[1]), ["UID: a", "UID: b", "UID: a"]);
});

test("FR-7: mục suttaplex: link, tiêu đề rơi về original_title, field vắng thì bỏ dòng", () => {
  const sp = {
    uid: "mn10",
    acronym: "MN 10",
    translated_title: "",
    original_title: "Satipaṭṭhānasutta",
    difficulty: 2,
    blurb: "Blurb.",
    translations: [{ lang: "en" }],
  };
  assert.deepEqual(items(text({ suttaplex: [sp] }), "suttaplex"), [
    "suttaplex[0] **MN 10** — Satipaṭṭhānasutta\nUID: mn10\nURL: https://suttacentral.net/mn10\nDifficulty: 2\nBlurb: Blurb.",
  ]);
  assert.deepEqual(
    items(text({ suttaplex: [{ uid: "sn1.1", difficulty: null, blurb: "" }, {}] }), "suttaplex"),
    ["suttaplex[0] **sn1.1**\nUID: sn1.1\nURL: https://suttacentral.net/sn1.1", "suttaplex[1]"]
  );
  const vi = items(fixtureText("vo-nga-vi-pli"), "suttaplex");
  assert.equal(vi.length, 21);
  assert.equal(
    vi[12],
    "suttaplex[12] **SN 22.59** — Năm Vị (Vô ngã tưởng)\nUID: sn22.59\nURL: https://suttacentral.net/sn22.59\nBlurb: In the Deer Park at Varanasi the Buddha teaches the famous second discourse, on not-self with regard to the aggregates, to the group of five monks. At the conclusion, they become perfected ones."
  );
});

test("FR-8: mục hits: dictionary, bài viết, bản dịch tiếng Việt, mục không có url, highlight nguyên văn", () => {
  const t = fixtureText("anatta-en");
  const h = items(t, "hits");
  assert.equal(h[0], "hits[0]\nURL: https://suttacentral.net/define/anatta\nCategory: dictionary");
  assert.equal(
    h[3],
    "hits[3] — subjects\nURL: https://suttacentral.net/subjects\nUID: subjects\nNgôn ngữ: en\nBài viết (is_article)"
  );
  assert.equal(
    h[6],
    "hits[6] **AN 3.136** — Uppādāsutta\nURL: https://suttacentral.net/an3.136/pli/ms\nUID: an3.136\nTác giả: Mahāsaṅgīti Tipiṭaka Buddhavasse 2500 (ms)\nNgôn ngữ: pli"
  );
  assert.ok(!/null|undefined/.test(t));
  assert.equal(
    items(fixtureText("vo-nga-vi-pli"), "hits")[0],
    "hits[0] **AN 1.378–393** — Thật Sự Là Vậy\nURL: https://suttacentral.net/an1.378-393/vi/minh_chau\nUID: an1.378-393\nTác giả: Thích Minh Châu (minh_chau)\nNgôn ngữ: vi"
  );
  const author = items(text({ hits: [{ uid: "", author: "Bhikkhu Anālayo", author_uid: "analayo" }] }), "hits");
  assert.deepEqual(author, ["hits[0]\nTác giả: Bhikkhu Anālayo (analayo)"]);
  const lit = text({
    hits: [
      { uid: "x", name: "", root_name: "Root", url: "x/no-slash", highlight: { content: ['<a href="/x#1.1">a</a>', "<b>b</b>"] } },
      { url: null, acronym: null, name: null, author: null, author_uid: null, lang: null, category: null, is_article: false },
    ],
  });
  assert.deepEqual(items(lit, "hits"), [
    'hits[0] — Root\nUID: x\nHighlight: <a href="/x#1.1">a</a>\nHighlight: <b>b</b>',
    "hits[1]",
  ]);
});

test("FR-9: total in nguyên văn với nhãn của SuttaCentral; thiếu total thì nói rõ", () => {
  assert.ok(blocks(fixtureText("vo-nga-vi-pli")).includes("total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): 185"));
  assert.ok(blocks(text({ total: "9" })).includes("total (số đếm xấp xỉ do SuttaCentral báo, không phải số sutta): 9"));
  assert.ok(blocks(text({})).includes("total: body không có key `total`"));
});

test("FR-10: fuzzy_dictionary: mỗi phần tử JSON một dòng, đúng thứ tự; mảng rỗng chỉ có tiêu đề", () => {
  const two = text({ total: 0, hits: [], suttaplex: [], fuzzy_dictionary: [{ entry: "nibbāna" }, { entry: "nibbuta" }] });
  assert.ok(blocks(two).includes('fuzzy_dictionary: 2\n{"entry":"nibbāna"}\n{"entry":"nibbuta"}'), two);
  const zero = text({ total: 0, hits: [], suttaplex: [], fuzzy_dictionary: [] });
  assert.equal(blocks(zero).at(-1), "fuzzy_dictionary: 0");
});

test("FR-11: error của SuttaCentral in type, message và mọi suggestion", () => {
  const content = renderSearch(load("foo-bar-en").url, JSON.stringify(load("foo-bar-en").body), "text");
  assert.deepEqual(Object.keys(content[0]), ["type", "text"]);
  assert.equal(
    blocks(content[0].text).at(-1),
    [
      "Lỗi truy vấn do SuttaCentral báo (error):",
      "type: unknown_filter",
      'message: Unknown filter: "foo:"',
      "suggestion: Supported filters are：volpage:, author:, by:, title:, lang:, ref:, in:",
      "suggestion: Please check the filter name",
      "suggestion: Please check if the spelling is correct",
    ].join("\n")
  );
  assert.ok(!blocks(fixtureText("anatta-en")).some((b) => b.startsWith("Lỗi truy vấn")));
});

test("FR-12: body null, thiếu key, không phải object, không parse được", () => {
  assert.equal(renderSearch(U, "null", "text")[0].text, `Nguồn: SuttaCentral — ${U}\n\nSuttaCentral trả body \`null\` cho request này.`);
  assert.deepEqual(blocks(text({})), [
    `Nguồn: SuttaCentral — ${U}`,
    "Khớp tiêu đề (suttaplex): body không có key `suttaplex`",
    "Khớp nội dung (hits): body không có key `hits`",
    "total: body không có key `total`",
    "fuzzy_dictionary: body không có key `fuzzy_dictionary`",
  ]);
  assert.deepEqual(blocks(text({ suttaplex: {}, hits: "x", total: 3, fuzzy_dictionary: null })).slice(1, 3), [
    "Khớp tiêu đề (suttaplex): `suttaplex` không phải mảng: {}",
    'Khớp nội dung (hits): `hits` không phải mảng: "x"',
  ]);
  assert.equal(blocks(text([1, 2]))[1], "SuttaCentral trả body không phải object JSON: [1,2]");
  assert.equal(blocks(text("abc"))[1], 'SuttaCentral trả body không phải object JSON: "abc"');
  assert.throws(() => renderSearch(U, "<html>", "text"), SyntaxError);
});
