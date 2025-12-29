# Stage 1: Build Frontend
FROM node:20-slim AS builder
WORKDIR /app
# Accept API key as build argument
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-slim
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY server ./server

# Copy frontend build from builder stage to 'dist'
COPY --from=builder /app/dist ./dist

# Create data directory for persistence
RUN mkdir -p data
VOLUME /app/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server/index.js"]
