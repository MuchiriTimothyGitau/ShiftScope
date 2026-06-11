# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS builder

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime

RUN apk add --no-cache wget tini

WORKDIR /app

RUN addgroup -S app && adduser -S -G app -u 1001 appuser

COPY --from=builder --chown=appuser:app /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:app /app/server.js ./
COPY --from=builder --chown=appuser:app /app/dist ./dist

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
