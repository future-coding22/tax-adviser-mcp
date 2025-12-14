# Stage 1: Base image with shared tools and CLIs
FROM node:20-alpine AS base

# Set shell to bash
ENV SHELL=/bin/bash

# Install system dependencies and command-line tools requested
# This includes git, curl, and CLIs for GitHub, Gemini, and Claude
RUN apk add --no-cache bash git procps docker-cli curl github-cli python3 py3-pip build-base python3-dev libffi-dev openssl-dev cargo \
    && pip install --no-cache-dir --break-system-packages google-genai openai anthropic \
    && npm install -g @google/gemini-cli @anthropic-ai/claude-code \
    && apk del build-base python3-dev libffi-dev openssl-dev cargo

WORKDIR /app

# Stage 2: Install production dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 3: Build the application
# This stage installs devDependencies to get TypeScript for building
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 4: Final production image
FROM base AS runner
WORKDIR /app

# Copy production dependencies from 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled source code from 'builder' stage
#COPY --from=builder /app/dist ./dist
# Copy package.json to be able to run npm scripts
COPY package.json .
# Copy data and knowledge directories which are needed at runtime
COPY data ./data
COPY knowledge ./knowledge

# Expose the default port for the MCP server
EXPOSE 3033

ENV NODE_ENV=production

# The default command to start the server
CMD ["npm", "start"]