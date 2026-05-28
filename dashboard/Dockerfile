# syntax=docker/dockerfile:1.6

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY server.ts ./
COPY src ./src

RUN npm run build

# Prune to production deps
RUN npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime

RUN apk add --no-cache wget tini

WORKDIR /app

# Non-root user
RUN addgroup -S app && adduser -S -G app -u 1001 appuser

COPY --from=builder --chown=appuser:app /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:app /app/dist ./dist
COPY --from=builder --chown=appuser:app /app/server.js ./server.js
COPY --chown=appuser:app package*.json ./

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
