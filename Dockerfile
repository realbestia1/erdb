FROM node:20-alpine AS deps
WORKDIR /app
# build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++
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
# Copy standalone output (includes server.js + minimal node_modules)
COPY --from=builder /app/.next/standalone ./
# Copy static assets (not included in standalone by default)
COPY --from=builder /app/.next/static ./.next/static
# Copy public folder if it exists (optional)
# COPY --from=builder /app/public ./public
RUN mkdir -p /app/data/cache/images && \
    chmod -R 777 /app/data && \
    chmod -R 777 /app/.next
USER 1000
EXPOSE 7860
CMD ["node", "server.js"]
