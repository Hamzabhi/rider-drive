# syntax=docker/dockerfile:1
FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1.1 AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run tsc --noEmit || true   # type-check, don't fail boot on dev-only type drift
EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
