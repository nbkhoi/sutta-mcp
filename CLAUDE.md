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
```

No test runner or linter is configured yet.

## Architecture

Single-file server: `src/index.ts` (~317 lines). Everything lives here.

**Three layers:**

1. **SuttaCentral API helpers** — `fetchSuttaplex()`, `fetchBilaraText()`, `fetchParallels()` wrapping `https://suttacentral.net/api`.
2. **Topic index** — `TOPIC_INDEX` is a static `Record<string, string[]>` mapping topic keywords (both English and Vietnamese) to sutta UIDs. This is the prototype search mechanism; the roadmap calls for replacing it with SuttaCentral's Elasticsearch.
3. **MCP tool definitions** — four tools registered via `server.tool()`:
   - `search_topic` — topic keyword → list of sutta UIDs with metadata
   - `get_sutta` — full sutta text via Bilara API (with `max_segments` truncation)
   - `get_sutta_meta` — metadata only (blurb, difficulty, translations list)
   - `get_parallels` — cross-tradition parallel texts for a given sutta

**Key SuttaCentral API endpoints used:**
- `GET /api/suttaplex/{uid}?language={lang}` — metadata
- `GET /api/bilarasuttas/{uid}/{translator}` — segmented text
- `GET /api/parallels/{uid}` — parallels

**Not yet implemented** (per `specs/sutta-mcp-requirements.md`): `list_divisions` tool — hardcoded division listing filtered by pitaka.

## Extending the Topic Index

To add new topics, add entries to the `TOPIC_INDEX` object in `src/index.ts`. Each key is a lowercase search term (English or Vietnamese), each value is an array of sutta UIDs (e.g., `["mn10", "sn47.1"]`).

## SuttaCentral Domain Concepts

- **UID** — unique sutta identifier; prefix = division (e.g., `mn10` → Majjhima Nikaya, `sn56.11` → Samyutta Nikaya)
- **Parallels** — equivalent texts across traditions (Pali ↔ Chinese Agamas ↔ Sanskrit ↔ Tibetan)
- **Bilara** — SuttaCentral's segmented translation format; translator ID defaults to `sujato`
- **Suttaplex** — SC's metadata object for a sutta (title, blurb, difficulty, translations, parallel count)
