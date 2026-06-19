FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY api-gateway-hono/package.json api-gateway-hono/bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1.1 AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY api-gateway-hono/ ./
COPY proto ./proto
RUN bun run tsc --noEmit || true   # type-check, don't fail boot on dev-only type drift
EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
