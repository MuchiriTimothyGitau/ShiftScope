# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS builder

WORKDIR /app

COPY analysis_chain/package*.json ./
RUN npm ci

COPY analysis_chain/tsconfig.json ./
COPY analysis_chain/src ./src
COPY scheduler/src ./scheduler/src

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime

RUN apk add --no-cache wget tini

WORKDIR /app

RUN addgroup -S app && adduser -S -G app -u 1001 appuser

COPY --from=builder --chown=appuser:app /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:app /app/dist ./dist
COPY --from=builder --chown=appuser:app analysis_chain/package*.json ./

USER appuser

EXPOSE 9091

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9091/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/worker.js"]
