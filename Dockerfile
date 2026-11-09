# ==========================================
# Stage 1: Build Frontend (Vite + React)
# ==========================================
FROM node:22-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server
# ==========================================
FROM node:22-alpine

# Install build dependencies for native SQLite compilation on Alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install server dependencies
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

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]
