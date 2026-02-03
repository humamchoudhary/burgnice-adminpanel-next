# Dockerfile for Next.js Application (with configurable port)

# ---------- Dependencies ----------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ---------- Runner (Production) ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Default port (can be overridden at runtime)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder (standalone mode)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs

# Expose port (actual port controlled by ENV PORT)
EXPOSE $PORT

# Start the application
CMD ["node", "server.js"]

# ===== IMPORTANT =====
# Add to your next.config.js:
#   module.exports = {
#     output: 'standalone',
#   }
#
# ===== USAGE =====
# Build: docker build -t my-nextjs-app .
# Run: docker run -p 6003:6003 -e PORT=6003 my-nextjs-app
