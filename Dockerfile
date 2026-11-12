# Rechly (Privatliquidation) – lokaler Betrieb im Desktop-Modus:
# SQLite statt Appwrite, kein Login, alle Daten unter /data.
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS builder
# Operator legal pages / source link (baked into the client bundle)
ARG NEXT_PUBLIC_IMPRINT_URL= \
    NEXT_PUBLIC_PRIVACY_URL= \
    NEXT_PUBLIC_TERMS_URL= \
    NEXT_PUBLIC_SOURCE_URL=
ENV NEXT_PUBLIC_IMPRINT_URL=$NEXT_PUBLIC_IMPRINT_URL \
    NEXT_PUBLIC_PRIVACY_URL=$NEXT_PUBLIC_PRIVACY_URL \
    NEXT_PUBLIC_TERMS_URL=$NEXT_PUBLIC_TERMS_URL \
    NEXT_PUBLIC_SOURCE_URL=$NEXT_PUBLIC_SOURCE_URL
COPY . .
# NEXT_PUBLIC_* werden beim Build eingebacken.
ENV NEXT_TELEMETRY_DISABLED=1 \
    RECHLY_DESKTOP=1 \
    NEXT_PUBLIC_RECHLY_DESKTOP=1 \
    NEXT_PUBLIC_APPWRITE_ENDPOINT=http://127.0.0.1/desktop \
    NEXT_PUBLIC_APPWRITE_PROJECT_ID=desktop-local
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    RECHLY_DESKTOP=1 \
    NEXT_PUBLIC_RECHLY_DESKTOP=1 \
    RECHLY_DATA_DIR=/data \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/desktop/health || exit 1
CMD ["node", "server.js"]
