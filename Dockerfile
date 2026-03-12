FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
RUN apk add --no-cache fontconfig ttf-dejavu ttf-freefont font-noto
RUN addgroup --system --gid 1000 nodejs && \
    adduser --system --uid 1000 nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
RUN mkdir -p /app/data/cache/images && \
    chown -R nextjs:nodejs /app/data && \
    chown -R nextjs:nodejs /app/.next
USER nextjs
EXPOSE 7860
CMD ["sh", "-c", "npm run start -- -p ${PORT:-7860}"]
