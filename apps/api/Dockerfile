# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Image cho NestJS API. Build tu THU MUC GOC cua monorepo:
#   docker build -f apps/api/Dockerfile -t thebai-api .
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

# --- Cai dependency (tach rieng de layer cache khong vo khi ma nguon thay doi) ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
COPY . .
RUN pnpm --filter @flashcard/contracts run build \
 && pnpm --filter @flashcard/db run build \
 && pnpm --filter @flashcard/api run build \
 && pnpm prune --prod

# --- Runtime ---
FROM base AS runtime
ENV NODE_ENV=production
# Khong chay bang root.
USER node

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages ./packages
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/

EXPOSE 4000
WORKDIR /app/apps/api

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
