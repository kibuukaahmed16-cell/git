# Multi-stage build -> a small runtime image. Works for Railway
# (auto-detects this Dockerfile) and for any VPS via `docker run`.
#
# gitOps.js shells out to the real `git` CLI to build each commit, so
# the runtime stage installs git - without it, every push fails.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Install ALL dependencies (including dev dependencies for build)
RUN npm install

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Make sure we have all dependencies
RUN npm install --legacy-peer-deps
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
