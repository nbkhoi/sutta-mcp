# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that connects Claude to the SuttaCentral API for answering Buddhist Dhamma questions with proper scripture citations. Bilingual: Vietnamese and English. Transport: stdio.

Content from SuttaCentral must NOT be used for AI training. This server fetches data in real-time to answer users, with every response linking back to SuttaCentral as the source.

## Commands

```bash
npm run build    # tsc → dist/
npm run dev      # tsx src/index.ts (hot-reload dev mode)
npm start        # node dist/index.js (production)
npm test         # node:test via tsx — offline unit tests for search_topic (test/)
```

No linter is configured yet.

## Architecture

Two source files. `src/index.ts` (~435 lines) holds the SuttaCentral API helpers, the MCP server with every tool's zod schema and handler, and `main()`. `src/search.ts` (~210 lines) holds the pure logic of `search_topic` — the `VI_TOPIC_TERMS` table, topic and response normalization, filtering, paging and formatting — plus `formatCitation()`, which `get_sutta` and `get_sutta_meta` import from it. `src/search.ts` has no imports and no I/O. Unit tests live in `test/` and read recorded, trimmed `/api/search/instant` responses from `test/fixtures/`; they never call the network. Fixtures are small snapshots, not a corpus: re-record one only when a code change needs a new response shape.

**Three layers:**

1. **SuttaCentral API helpers** — `fetchSuttaplex()`, `fetchBilaraText()`, `fetchParallels()`, `fetchSearch()` wrapping `https://suttacentral.net/api`.
2. **Vietnamese topic mapping** — `VI_TOPIC_TERMS` is a static `Map` from 14 Vietnamese topic keys to one English/Pali search term each, because SuttaCentral's search API (`/api/search/instant`) does not handle Vietnamese queries. A topic matches a key only exactly, after NFC, lowercasing, trimming and collapsing whitespace; every other topic is sent to the search API unchanged (NFC + trim).
3. **MCP tool definitions** — five tools registered via `server.tool()`:
   - `search_topic` — one `/api/search/instant` request per call; title matches (`suttaplex`) then content matches (`hits`), canonical order, non-sutta entries filtered out, selected by `match` (`title`/`content`/`all`) and paged by `page` (up to 10 + 10 results per page)
   - `get_sutta` — full sutta text via Bilara API, each segment prefixed with its segment ID plus a `Deep link:` header (with `max_segments` truncation)
   - `get_sutta_meta` — metadata only (blurb, difficulty, translations list)
   - `get_parallels` — cross-tradition parallel texts for a given sutta
   - `list_divisions` — hardcoded division listing filtered by pitaka (sutta/vinaya/abhidhamma); no API call

**Key SuttaCentral API endpoints used:**
- `GET /api/suttaplex/{uid}?language={lang}` — metadata
- `GET /api/bilarasuttas/{uid}/{translator}?lang={lang}` — segmented text; `lang` defaults to `en` upstream, so non-English translations are retried once with `?lang=`
- `GET /api/parallels/{uid}` — parallels
- `GET /api/search/instant?query={q}&language={lang}&limit=10` (plus `offset` for content pages) — search; GET only, not cached

## Extending the Vietnamese Topic Mapping

To support another Vietnamese topic, add a `[key, term]` pair to `VI_TOPIC_TERMS` in `src/search.ts`. The key is lowercase NFC Vietnamese with single spaces; the term is one English or Pali search term. Measure before adding: the term must return at least one sutta on page 1 with `match=all` for both `language=en` and `language=vi`. English and Pali topics need no entry — they go to the search API directly.

## SuttaCentral Domain Concepts

- **UID** — unique sutta identifier; prefix = division (e.g., `mn10` → Majjhima Nikaya, `sn56.11` → Samyutta Nikaya)
- **Parallels** — equivalent texts across traditions (Pali ↔ Chinese Agamas ↔ Sanskrit ↔ Tibetan)
- **Bilara** — SuttaCentral's segmented translation format; translator ID defaults to `sujato`
- **Suttaplex** — SC's metadata object for a sutta (title, blurb, difficulty, translations, parallel count)
