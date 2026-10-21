// Unit test offline cho logic thuần của search_topic (spec search-unit-tests). Mỗi case mang
// tiền tố id FR của specs/dynamic-search/requirements.md. Fixture: response /api/search/instant
// ghi live rồi cắt (test/fixtures/, xem specs/search-unit-tests/design.md §Fixture).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatContentMatch,
  formatNoResults,
  formatSearchResult,
  formatTitleMatch,
  hasMore,
  isSutta,
  normalizeSearchResponse,
  resolveTopic,
  searchOffset,
  selectPage,
  type SearchMatch,
} from "../src/search.js";

type Fixture = { url: string; recorded: string; body: any };

function load(name: string): Fixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

function render(name: string, topic: string, match: SearchMatch, page: number): string {
  return formatSearchResult({ topic, match, page }, resolveTopic(topic).term, load(name).body);
}

const URL_PREFIX = "URL: https://suttacentral.net/";
const uidsOf = (text: string) =>
  text
    .split("\n")
    .filter((l) => l.startsWith(URL_PREFIX))
    .map((l) => l.slice(URL_PREFIX.length));
const lastLine = (text: string) => text.slice(text.lastIndexOf("\n") + 1);

const MORE = (p: number) =>
  `Còn kết quả: gọi lại search_topic với page=${p} (giữ nguyên topic, language, match).`;
const END = "Hết kết quả.";
const HINT =
  'Gợi ý: search của SuttaCentral hiểu thuật ngữ tiếng Anh hoặc Pali — thử lại với thuật ngữ tương ứng (ví dụ "satipatthana", "dependent origination").';
const KEYS =
  "Chủ đề tiếng Việt có sẵn: tứ diệu đế, khổ, bát chánh đạo, vô ngã, chánh niệm, vô thường, từ bi, duyên khởi, ngũ uẩn, niết bàn, nghiệp, thiền, tam bảo, quy y";
const EMPTY_BODY = { suttaplex: [], hits: [], total: 0, errorMessage: undefined };

test("FR-3: key tiếng Việt được chuẩn hóa NFC, chữ thường, trim, gộp khoảng trắng rồi khớp chính xác", () => {
  const nfc = "vô ngã".normalize("NFC");
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfd, nfc);
  for (const topic of ["Vô Ngã", "  vô   ngã  ", nfd, nfc]) {
    assert.deepEqual(resolveTopic(topic), { term: "anatta", query: "anatta" }, topic);
  }
});

test("FR-3: chủ đề không trùng key thì không ánh xạ", () => {
  for (const topic of ["thiện", "vo nga", "thiền định"]) {
    assert.deepEqual(resolveTopic(topic), { term: undefined, query: topic }, topic);
  }
});

test("FR-4: topic không khớp được gửi sau NFC + trim, giữ hoa/thường và khoảng trắng bên trong", () => {
  assert.deepEqual(resolveTopic("  Four  Noble Truths\t"), { term: undefined, query: "Four  Noble Truths" });
  const nfdTopic = " Thiền Định ".normalize("NFD");
  assert.notEqual(nfdTopic.trim(), "Thiền Định".normalize("NFC"));
  assert.deepEqual(resolveTopic(nfdTopic), { term: undefined, query: "Thiền Định".normalize("NFC") });
  assert.deepEqual(resolveTopic("   "), { term: undefined, query: "" });
});

test("FR-7: phần tử dictionary, bài viết, thiếu uid hoặc uid rỗng không phải sutta", () => {
  assert.equal(isSutta({ uid: "mn10" }), true);
  assert.equal(isSutta({ uid: "mn10", is_article: null }), true);
  assert.equal(isSutta({ uid: "mn10", category: "dictionary" }), false);
  assert.equal(isSutta({ uid: null, category: "dictionary" }), false);
  assert.equal(isSutta({ uid: "subjects", is_article: true }), false);
  assert.equal(isSutta({ uid: "" }), false);
  assert.equal(isSutta({}), false);
  assert.equal(isSutta(null), false);
});

test("FR-7: dictionary (nibbana, metta) và 4 bài viết (anatta) không xuất hiện trong output", () => {
  const nibbana = load("nibbana-en-0").body;
  assert.equal(nibbana.hits[0].category, "dictionary");
  assert.deepEqual(uidsOf(render("nibbana-en-0", "nibbana", "content", 1)), [
    "an3.32", "an3.35", "an3.36", "an3.39", "an3.55", "an3.57", "an3.60", "an4.1",
  ]);

  const metta = load("metta-en-0").body;
  assert.equal(metta.hits[0].category, "dictionary");
  assert.equal(uidsOf(render("metta-en-0", "metta", "content", 1)).length, 7);

  const articles = ["general-guide-sujato", "sn-guide-sujato", "subjects", "terminology"];
  const anattaHits = load("anatta-en-0").body.hits;
  assert.deepEqual(anattaHits.filter((e: any) => e.is_article === true).map((e: any) => e.uid), articles);
  const text = render("anatta-en-0", "anatta", "all", 1);
  assert.deepEqual(uidsOf(text), [
    "an6.100", "sn22.14", "sn22.143", "sn22.68", "sn23.17", "sn46.73",
    "thi-ap4", "an3.136", "an7.18", "an7.20", "an10.60",
  ]);
  for (const uid of [...articles, "null", "?"]) assert.ok(!text.includes(`suttacentral.net/${uid}\n`), uid);
  assert.ok(!text.includes("**?**"));
});

test("FR-6: trang tiêu đề mindfulness 1..4 có 10/10/10/2 uid, hợp lại 32 uid khác nhau", () => {
  const res = normalizeSearchResponse(load("mindfulness-en-0").body);
  assert.equal(res.suttaplex.length, 32);
  const pages = [1, 2, 3, 4].map((p) => selectPage(res, "title", p).titlePage.map((e) => e.uid));
  assert.deepEqual(pages.map((p) => p.length), [10, 10, 10, 2]);
  assert.equal(new Set(pages.flat()).size, 32);
  assert.equal(pages[0][0], "an1.575-615");
  assert.ok(pages[1].includes("dn22") && pages[1].includes("mn10"));
  assert.deepEqual(pages[3], ["uvs15", "vb7"]);
  assert.deepEqual(selectPage(res, "title", 1).contentPage, []);
});

test("FR-6: ở match=all hit trùng uid với trang tiêu đề bị bỏ; trong một trang không uid nào lặp", () => {
  const res = normalizeSearchResponse({
    suttaplex: [{ uid: "a" }, { uid: "b" }, { uid: "a" }],
    hits: [{ uid: "b" }, { uid: "c" }, { uid: "c" }, { uid: "d" }],
    total: 4,
  });
  const all = selectPage(res, "all", 1);
  assert.deepEqual(all.titlePage.map((e) => e.uid), ["a", "b"]);
  assert.deepEqual(all.contentPage.map((e) => e.uid), ["c", "d"]);
  assert.equal(all.titleCount, 2);
  assert.deepEqual(selectPage(res, "content", 1).titlePage, []);
  assert.deepEqual(selectPage(res, "content", 1).contentPage.map((e) => e.uid), ["b", "c", "d"]);

  for (const [name, topic] of [["mindfulness-en-0", "mindfulness"], ["anatta-en-0", "anatta"], ["metta-en-0", "metta"]]) {
    const uids = uidsOf(render(name, topic, "all", 1));
    assert.equal(new Set(uids).size, uids.length, name);
  }
});

test("FR-8: citation khớp tiêu đề: difficulty số → tên, giá trị khác → unknown, dòng blurb chỉ khi khác rỗng", () => {
  const sp = {
    uid: "mn10",
    acronym: "MN 10",
    translated_title: "Mindfulness Meditation",
    original_title: "Satipaṭṭhānasutta",
    blurb: "Blurb.",
    parallel_count: 16,
    difficulty: 2,
  };
  assert.equal(
    formatTitleMatch(sp),
    "**MN 10** — Mindfulness Meditation\nDifficulty: intermediate | Parallels: 16\nURL: https://suttacentral.net/mn10\n→ Blurb."
  );
  assert.equal(sp.difficulty, 2);
  const difficultyLine = (difficulty: unknown) =>
    formatTitleMatch({ ...sp, difficulty, blurb: "" }).split("\n")[1];
  assert.equal(difficultyLine(1), "Difficulty: beginner | Parallels: 16");
  assert.equal(difficultyLine(3), "Difficulty: advanced | Parallels: 16");
  for (const d of [null, undefined, 0, 4, "2", { name: "beginner" }]) {
    assert.equal(difficultyLine(d), "Difficulty: unknown | Parallels: 16", String(d));
  }
  assert.equal(
    formatTitleMatch({ ...sp, blurb: "" }),
    "**MN 10** — Mindfulness Meditation\nDifficulty: intermediate | Parallels: 16\nURL: https://suttacentral.net/mn10"
  );
});

test("FR-9: hai khối metta của AC-15 (SA 264, CND8)", () => {
  const lines = render("metta-en-0", "metta", "all", 1).split("\n");
  const sa = lines.indexOf("**SA 264** — 小土塼");
  assert.ok(sa >= 0);
  assert.deepEqual(lines.slice(sa, sa + 3), [
    "**SA 264** — 小土塼",
    "Text: Bhikkhu Anālayo (en)",
    "URL: https://suttacentral.net/sa264",
  ]);
  const cnd = lines.indexOf("**CND8** — Exposition of the Questions of the Student  Mettagū");
  assert.ok(cnd >= 0);
  assert.equal(lines[cnd + 1], "URL: https://suttacentral.net/cnd8");
});

test("FR-9: hit có name và root_name rỗng in dòng tiêu đề đúng **{acronym}**; name được trim", () => {
  const hit = { uid: "sa1", acronym: "SA 1", name: "", root_name: "", author: "X", lang: "en" };
  assert.equal(formatContentMatch(hit), "**SA 1**\nText: X (en)\nURL: https://suttacentral.net/sa1");
  assert.equal(
    formatContentMatch({ ...hit, name: "  Padded  ", author: null }),
    "**SA 1** — Padded\nURL: https://suttacentral.net/sa1"
  );
});

test("FR-10: header, dòng thuật ngữ chỉ khi key khớp, dòng nhóm chỉ khi nhóm khác rỗng", () => {
  const title = render("mindfulness-en-0", "mindfulness", "title", 1);
  const tl = title.split("\n");
  assert.equal(tl[0], 'Tìm thấy 10 sutta cho chủ đề "mindfulness" (trang 1):');
  assert.deepEqual(tl.slice(1, 4), ["", "Khớp tiêu đề:", ""]);
  assert.ok(!title.includes("Khớp nội dung:"));
  assert.ok(!title.includes("1461"));

  const content = render("mindfulness-en-0", "mindfulness", "content", 1);
  assert.deepEqual(content.split("\n").slice(0, 4), [
    'Tìm thấy 8 sutta cho chủ đề "mindfulness" (trang 1):',
    "",
    "Khớp nội dung:",
    "",
  ]);
  assert.ok(!content.includes("Khớp tiêu đề:"));

  const vi = render("anatta-en-0", "vô ngã", "all", 1).split("\n");
  assert.deepEqual(vi.slice(0, 4), [
    'Tìm thấy 11 sutta cho chủ đề "vô ngã" (trang 1):',
    'Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"',
    "",
    "Khớp tiêu đề:",
  ]);
  assert.ok(vi.indexOf("Khớp tiêu đề:") < vi.indexOf("Khớp nội dung:"));
});

test("FR-11: trang 1 không có kết quả, topic rỗng, lỗi truy vấn của SC, gợi ý match", () => {
  assert.equal(
    render("xyzzyqq-en-0", "xyzzyqq", "all", 1),
    ['Không tìm thấy sutta nào cho chủ đề "xyzzyqq".', "", HINT, KEYS, "", END].join("\n")
  );
  assert.equal(formatNoResults("", "all", undefined), ['Không tìm thấy sutta nào cho chủ đề "".', "", HINT, KEYS].join("\n"));
  assert.equal(
    formatNoResults("   ", "title", undefined).split("\n")[0],
    'Không tìm thấy sutta nào cho chủ đề "   ".'
  );
  assert.deepEqual(render("foo-bar-en-0", "foo:bar", "all", 1).split("\n").slice(0, 2), [
    'Không tìm thấy sutta nào cho chủ đề "foo:bar".',
    'SuttaCentral báo lỗi truy vấn: Unknown filter: "foo:"',
  ]);
  assert.equal(
    render("vo-nga-tuong-vi-0", "vô ngã tướng", "content", 1),
    [
      'Không tìm thấy sutta nào cho chủ đề "vô ngã tướng".',
      "",
      HINT,
      'Đang dùng match="content" — thử match="all" để xem cả khớp tiêu đề lẫn khớp nội dung.',
      KEYS,
      "",
      END,
    ].join("\n")
  );
  assert.ok(!render("xyzzyqq-en-0", "xyzzyqq", "all", 1).includes("Đang dùng match="));
  assert.ok(render("xyzzyqq-en-0", "xyzzyqq", "title", 1).includes('Đang dùng match="title"'));
  assert.equal(
    formatNoResults("vô ngã", "all", "anatta").split("\n")[1],
    'Thuật ngữ đã dùng để tìm trên SuttaCentral: "anatta"'
  );
});

test("FR-12: body thiếu hoặc sai kiểu được xử lý như rỗng/0", () => {
  for (const data of [undefined, null, "abc", {}, { suttaplex: {}, hits: "x", total: "5", error: { message: 1 } }]) {
    assert.deepEqual(normalizeSearchResponse(data), EMPTY_BODY, JSON.stringify(data));
  }
  assert.equal(
    formatSearchResult({ topic: "x", match: "all", page: 1 }, undefined, { hits: null, total: "9" }),
    ['Không tìm thấy sutta nào cho chủ đề "x".', "", HINT, KEYS, "", END].join("\n")
  );
});

test("FR-18: luật trang sau chỉ suy từ response hiện tại", () => {
  const m1450 = load("mindfulness-en-1450");
  assert.equal(new URL(m1450.url).searchParams.get("offset"), "1450");
  assert.equal(searchOffset("content", 146), 1450);
  assert.deepEqual([m1450.body.total, m1450.body.hits.length], [1461, 9]);
  assert.equal(lastLine(render("mindfulness-en-1450", "mindfulness", "content", 146)), MORE(147));

  const m1460 = load("mindfulness-en-1460");
  assert.equal(new URL(m1460.url).searchParams.get("offset"), "1460");
  assert.equal(searchOffset("content", 147), 1460);
  assert.deepEqual([m1460.body.total, m1460.body.hits.length], [1460, 0]);
  assert.equal(lastLine(render("mindfulness-en-1460", "mindfulness", "content", 147)), END);

  const vo = load("vo-nga-tuong-vi-0").body;
  assert.deepEqual([vo.total, vo.suttaplex.length, vo.hits.length], [1, 1, 0]);
  assert.equal(hasMore(normalizeSearchResponse(vo), "content", 1, 1), false);
  assert.equal(lastLine(render("vo-nga-tuong-vi-0", "vô ngã tướng", "content", 1)), END);

  assert.equal(searchOffset("title", 3), 0);
  assert.equal(lastLine(render("mindfulness-en-0", "mindfulness", "title", 3)), MORE(4));
  assert.equal(lastLine(render("mindfulness-en-0", "mindfulness", "title", 4)), END);

  assert.equal(lastLine(render("mindfulness-en-1450", "mindfulness", "all", 146)), MORE(147));
  const one = { uid: "a" };
  assert.equal(hasMore({ ...EMPTY_BODY }, "all", 1, 11), true);
  assert.equal(hasMore({ ...EMPTY_BODY, hits: [one], total: 20 }, "all", 2, 0), true);
  assert.equal(hasMore({ ...EMPTY_BODY, hits: [one], total: 11 }, "all", 2, 10), false);
});

test("FR-19: footer chính xác là dòng cuối, không có newline sau", () => {
  const more = render("mindfulness-en-0", "mindfulness", "all", 1);
  assert.equal(uidsOf(more).length, 18);
  assert.ok(more.endsWith(`\n\n${MORE(2)}`));
  const end = render("mindfulness-en-0", "mindfulness", "title", 4);
  assert.ok(end.endsWith(`\n\n${END}`));
});

test("FR-20: trang sau trống in câu riêng rồi footer", () => {
  assert.equal(
    render("mindfulness-en-0", "mindfulness", "title", 5),
    `Không có kết quả sutta ở trang 5 cho chủ đề "mindfulness".\n\n${END}`
  );
  assert.equal(
    render("mindfulness-en-1460", "mindfulness", "content", 147),
    `Không có kết quả sutta ở trang 147 cho chủ đề "mindfulness".\n\n${END}`
  );
});
