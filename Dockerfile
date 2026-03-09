FROM node:25-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build damage-calc dependency
COPY damage-calc/tsconfig.json damage-calc/
COPY damage-calc/calc/package*.json damage-calc/calc/
RUN cd damage-calc/calc && npm install --ignore-scripts
COPY damage-calc/calc damage-calc/calc
RUN cd damage-calc/calc && npm run compile

# Install client deps
COPY client/package*.json client/
RUN cd client && npm install

# Copy source
COPY shared shared
COPY client client
COPY server server

# Install server deps (force native module compilation for this platform)
RUN cd server && npm install && npm rebuild better-sqlite3

# Copy public assets, resolving symlinks into real files
COPY assets assets
COPY assets-public assets-public
COPY pokemon-showdown-client/play.pokemonshowdown.com/fx pokemon-showdown-client/play.pokemonshowdown.com/fx
RUN cd assets-public && find . -type l | while read link; do \
      target=$(readlink -f "$link" 2>/dev/null); \
      if [ -f "$target" ]; then cp --remove-destination "$target" "$link"; \
      else rm "$link"; fi; \
    done

# Build client (BASE_PATH can be set at build time)
ARG BASE_PATH=pokemonparty
ENV BASE_PATH=${BASE_PATH}
RUN cd client && npm run build

# --- Runtime ---
FROM node:25-slim

WORKDIR /app

# Copy built client
COPY --from=builder /app/client/dist client/dist

# Copy server source + deps (tsx runs TypeScript at runtime)
COPY --from=builder /app/server server

# Copy shared source (imported by server at runtime)
COPY --from=builder /app/shared shared

# Copy damage-calc built output
COPY --from=builder /app/damage-calc/calc/dist damage-calc/calc/dist
COPY --from=builder /app/damage-calc/calc/node_modules damage-calc/calc/node_modules
COPY --from=builder /app/damage-calc/calc/package.json damage-calc/calc/package.json

ENV PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
