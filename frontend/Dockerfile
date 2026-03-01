# ── Frontend Dockerfile (multi-stage) ───────────────────────────────────────
#
# Stage 1: deps — install node_modules
# Stage 2: builder — run next build
# Stage 3: runner — minimal production image
#
# Why multi-stage? The final image only contains what's needed to RUN the app,
# not the full node_modules used to BUILD it. Result: ~3x smaller image.

# ── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build argument — injected at build time by docker-compose
# This is the URL the browser uses to call the backend
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js app
# output: standalone creates a self-contained server (no node_modules needed at runtime)
RUN npm run build

# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only what the standalone server needs to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port Next.js listens on
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the standalone server
CMD ["node", "server.js"]
