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

Two source files. `src/index.ts` (~445 lines) holds the SuttaCentral API helpers, the MCP server with every tool's zod schema and handler, and `main()`. `src/search.ts` (~165 lines) holds the pure logic of `search_topic` — building the `/api/search/instant` request URL from the caller's parameters and rendering the response body as `text` or `json`, with no filtering, deduplication, reordering or paging logic — plus `formatCitation()`, which `get_sutta` and `get_sutta_meta` import from it. `src/search.ts` has no imports and no I/O. Unit tests live in `test/` and read recorded, trimmed `/api/search/instant` responses from `test/fixtures/`; they never call the network. Fixtures are small snapshots, not a corpus: re-record one only when a code change needs a new response shape.

**Two layers:**

1. **SuttaCentral API helpers** — `fetchSuttaplex()`, `fetchBilaraText()`, `fetchParallels()` wrapping `https://suttacentral.net/api`. The `search_topic` handler fetches the URL built by `buildSearchUrl()` in `src/search.ts` directly.
2. **MCP tool definitions** — five tools registered via `server.tool()`:
   - `search_topic` — thin wrapper of `GET /api/search/instant`: the API's own parameters (`query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`) plus `format` (`text`/`json`); one request per call carrying only the parameters the caller passed; `text` prints every `suttaplex` and `hits` entry in the order the API returns, unfiltered, with `total`, `fuzzy_dictionary` and `error`; `json` returns the response body verbatim
   - `get_sutta` — full sutta text via Bilara API, each segment prefixed with its segment ID plus a `Deep link:` header (with `max_segments` truncation)
   - `get_sutta_meta` — metadata only (blurb, difficulty, translations list)
   - `get_parallels` — cross-tradition parallel texts for a given sutta
   - `list_divisions` — hardcoded division listing filtered by pitaka (sutta/vinaya/abhidhamma); no API call

**Key SuttaCentral API endpoints used:**
- `GET /api/suttaplex/{uid}?language={lang}` — metadata
- `GET /api/bilarasuttas/{uid}/{translator}?lang={lang}` — segmented text; `lang` defaults to `en` upstream, so non-English translations are retried once with `?lang=`
- `GET /api/parallels/{uid}` — parallels
- `GET /api/search/instant?query={q}` plus whichever of `language`, `limit`, `offset`, `selectedLanguages` (JSON string), `restrict`, `matchpartial` the caller passed — search; GET only, not cached

## SuttaCentral Domain Concepts

- **UID** — unique sutta identifier; prefix = division (e.g., `mn10` → Majjhima Nikaya, `sn56.11` → Samyutta Nikaya)
- **Parallels** — equivalent texts across traditions (Pali ↔ Chinese Agamas ↔ Sanskrit ↔ Tibetan)
- **Bilara** — SuttaCentral's segmented translation format; translator ID defaults to `sujato`
- **Suttaplex** — SC's metadata object for a sutta (title, blurb, difficulty, translations, parallel count)
