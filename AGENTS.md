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
npm test         # node:test via tsx — offline unit tests for the pure modules src/search.ts and src/passthrough.ts (test/)
```

No linter is configured yet.

## Architecture

Three source files. `src/index.ts` (~220 lines) holds the MCP server with every tool's zod schema and handler, and `main()`. `src/search.ts` (~150 lines) holds the pure logic of `search_instant` — building the `/api/search/instant` request URL from the caller's parameters and rendering the response body as `text` or `json`, with no filtering, deduplication, reordering or paging logic. `src/passthrough.ts` (~75 lines) holds the pure logic of the other four tools — one URL builder per endpoint and one shared renderer: `json` returns the response body verbatim, `text` prints every key and array element at every depth in body order, with nothing filtered, merged, reordered or truncated. Neither pure module has imports or I/O. Unit tests live in `test/` and read recorded, trimmed SuttaCentral responses from `test/fixtures/`; they never call the network. Fixtures are small snapshots, not a corpus: re-record one only when a code change needs a new response shape.

**Two layers:**

1. **Request/response logic** — `src/search.ts` and `src/passthrough.ts`. Every request URL comes from one `build*Url()` function there; each handler builds it once and passes it unchanged to `fetch` and to the `Nguồn: SuttaCentral — {URL}` source line. There are no other fetch helpers.
2. **MCP tool definitions** — five tools registered via `server.tool()`, each a thin wrapper of one SuttaCentral endpoint: the API's own parameters plus `format` (`text`/`json`), one GET per call carrying only the parameters the caller passed:
   - `search_instant` — thin wrapper of `GET /api/search/instant`: the API's own parameters (`query`, `language`, `limit`, `offset`, `selectedLanguages`, `restrict`, `matchpartial`) plus `format` (`text`/`json`); one request per call carrying only the parameters the caller passed; `text` prints every `suttaplex` and `hits` entry in the order the API returns, unfiltered, with `total`, `fuzzy_dictionary` and `error`; `json` returns the response body verbatim
   - `get_bilarasuttas` — `uid`, `author_uid`, `lang`: segmented text with every map and `keys_order`, keyed by segment ID, never truncated
   - `get_suttaplex` — `uid`, `language`: the suttaplex metadata array, including every `translations` entry
   - `get_parallels` — `uid`, `language`: parallels keyed by source anchor
   - `get_menu` — `submenu_id`, `language`: the navigation tree, one level per call

**Key SuttaCentral API endpoints used:**
- `GET /api/bilarasuttas/{uid}/{author_uid}?lang={lang}`, or `GET /api/bilarasuttas/{uid}` without `author_uid` (root text only) — segmented text; `lang` defaults to `en` upstream, so a non-English translation needs its own `lang`
- `GET /api/suttaplex/{uid}?language={lang}` — metadata; `language` defaults to `en` upstream
- `GET /api/parallels/{uid}?language={lang}` — parallels, keyed by source anchor
- `GET /api/menu?language={lang}` and `GET /api/menu/{submenu_id}?language={lang}` — navigation tree, one level per call
- `GET /api/search/instant?query={q}` plus whichever of `language`, `limit`, `offset`, `selectedLanguages` (JSON string), `restrict`, `matchpartial` the caller passed — search; GET only, not cached

## SuttaCentral Domain Concepts

- **UID** — unique sutta identifier; prefix = division (e.g., `mn10` → Majjhima Nikaya, `sn56.11` → Samyutta Nikaya)
- **Parallels** — equivalent texts across traditions (Pali ↔ Chinese Agamas ↔ Sanskrit ↔ Tibetan)
- **Bilara** — SuttaCentral's segmented translation format
- **Suttaplex** — SC's metadata object for a sutta (title, blurb, difficulty, translations, parallel count)
