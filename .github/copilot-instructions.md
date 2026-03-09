# Copilot Instructions

## Project Context

Before making changes, read the project documentation:
- `README.md` — project overview, config, structure
- `docs/ARCHITECTURE.md` — tech stack, data flow, routing, DB schema, shared module
- `docs/GAME_DESIGN.md` — game mechanics, economy, battles, items
- `docs/API_REFERENCE.md` — REST endpoints, Socket.IO events, key types

**Keep docs up to date.** When your changes affect architecture, routes, API endpoints, Socket.IO events, database schema, game mechanics, or configuration — update the relevant doc files in the same commit.

## Running the App

Two processes for development:

1. **Server** (Express + Socket.IO, port 3001):
   ```
   cd server && npm install && npm run dev
   ```

2. **Client** (Vite + React, port 5173):
   ```
   cd client && npm install && npm run dev -- --host
   ```

Production (single container):
```
docker build -t pokemonparty .
docker run -p 3001:3001 -v ./data:/app/data pokemonparty
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_PATH` | `pokemonparty` | URL prefix (empty = serve at root `/`) |
| `PORT` | `3001` | Server port |
| `API_TARGET` | `http://localhost:3001` | Client dev proxy target |

`BASE_PATH` is used in `client/vite.config.ts` (build-time), `client/src/config.ts` (runtime via `import.meta.env.BASE_URL`), and `server/src/index.ts` (runtime via `process.env.BASE_PATH`).

## Type Checking

- Client: `cd client && npx tsc --noEmit`
- Server has pre-existing rootDir issues with shared imports; uses `tsx` at runtime which handles them

## CSS Layout

- When combining CSS Grid with flex-based scrolling, **do not** put `flex: 1; min-height: 0; overflow-y: auto` directly on the grid element. Wrap the grid in a separate scroll container instead.

## Sprites

- Sprite images are in `assets-public/assets/` (some are symlinks to `assets/` and `pokemon-showdown-client/`)
- **Each sprite has ~16px of transparent padding per side.** Account for this in layouts.
- Always use `image-rendering: pixelated` for pixel art sprites
- Avoid non-integer `transform: scale()` on pixel art
