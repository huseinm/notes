# ==========================================
# Stage 1: Build Frontend (Vite + React)
# Runs natively on $BUILDPLATFORM to avoid QEMU emulation for static JS/CSS assets
# ==========================================
FROM --platform=$BUILDPLATFORM node:22-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server
# Uses node:22-slim (glibc) so better-sqlite3 uses official prebuilt binaries
# instead of compiling 250k lines of sqlite3.c under QEMU arm64 emulation
# ==========================================
FROM node:22-slim

WORKDIR /app

# Install server dependencies (uses prebuilt better-sqlite3 binary)
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy server application code
COPY server/ ./

# Copy built frontend assets from builder stage
COPY --from=client-builder /app/client/dist /app/client/dist

# Setup persistent data directory
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data/uploads

VOLUME ["/app/data"]

EXPOSE 3000

# Healthcheck using Node's built-in fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
