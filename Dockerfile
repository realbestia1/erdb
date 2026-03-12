# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
# better-sqlite3 needs build tools on alpine
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

# Fonts needed for image rendering
RUN apk add --no-cache fontconfig ttf-dejavu ttf-freefont font-noto

# Copy built app + dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Create writable data directory for SQLite + image cache
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 7860

CMD ["sh", "-c", "npx next start -p 7860"]
