# Multi-stage Docker build for Sui Chat Wallet

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend for deployment (skip TypeScript checks)
RUN npm run build:deploy

# Stage 2: Setup Backend
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY server/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY server/ .

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./static

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app
ENV STATIC_FILES_PATH=/app/static

# Run the application (Render sets PORT environment variable, default to 8000 for local)
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
