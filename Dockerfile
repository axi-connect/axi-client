# syntax=docker/dockerfile:1.7
#
# Imagen de producción de axi-client (Next.js 15 / React 19).
#
#   docker build \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.ejemplo.com \
#     --build-arg NEXT_PUBLIC_WS_BASE_URL=https://api.ejemplo.com \
#     --build-arg NEXT_PUBLIC_STORAGE_URL=https://storage.ejemplo.com \
#     -t axi-client .
#
# Las variables NEXT_PUBLIC_* se HORNEAN en el bundle durante `next build`, así
# que entran como ARG y no como variables de runtime: cambiarlas exige
# reconstruir la imagen, no basta con reiniciar el contenedor.
#
# Requiere `output: "standalone"` en next.config.ts (ya configurado).

FROM node:22-alpine AS base
# libc6-compat: algunas dependencias nativas de Next lo requieren en Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---------------------------------------------------------------------------
# deps — dependencias completas (las dev incluidas: el build necesita
# TypeScript, Tailwind y ESLint)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# builder — compila con las URLs públicas ya inyectadas
# ---------------------------------------------------------------------------
FROM base AS builder

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WS_BASE_URL
ARG NEXT_PUBLIC_STORAGE_URL
# Obligatoria: sin ella `npm run build` aborta (core/config/env.ts). Antes
# faltaba aquí, y la imagen salía sin ningún CTA de ventas sin avisar.
ARG NEXT_PUBLIC_SALES_WHATSAPP
# Origen público del sitio. OBLIGATORIA: `core/config/env.ts` aborta el build si
# falta, porque de ella cuelgan metadataBase, los canonical, Open Graph, el
# sitemap y el JSON-LD (docs/architecture.md §13.2).
ARG NEXT_PUBLIC_APP_URL
# Analítica. Opcionales: si no se pasan, el sitio se despliega sin medición en
# vez de romper el build.
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_WS_BASE_URL=${NEXT_PUBLIC_WS_BASE_URL} \
    NEXT_PUBLIC_STORAGE_URL=${NEXT_PUBLIC_STORAGE_URL} \
    NEXT_PUBLIC_SALES_WHATSAPP=${NEXT_PUBLIC_SALES_WHATSAPP} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID} \
    NEXT_PUBLIC_META_PIXEL_ID=${NEXT_PUBLIC_META_PIXEL_ID} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=3072

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# runner — solo el servidor standalone; sin node_modules ni código fuente
# ---------------------------------------------------------------------------
FROM base AS runner

# Sella la imagen con su commit. NO es una NEXT_PUBLIC_* a propósito: no hace
# falta hornearla en el bundle, la lee `/api/version` en el servidor. Existe para
# que el deploy pueda exigir que la versión en servicio sea la publicada — sin
# esto, un swap que no ocurre es indistinguible de uno que sí, y la comprobación
# (que solo miraba que la portada diera 200) sale verde igual.
ARG BUILD_SHA=unknown
ENV BUILD_SHA=$BUILD_SHA \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# public/ incluye las fuentes Nexa, la marca y el sonido de notificación.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3001

# La landing pública no requiere autenticación: sirve como sonda de vida.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3001/ || exit 1

CMD ["node", "server.js"]
