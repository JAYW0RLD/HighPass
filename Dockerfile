# Canary: Build Version 2026-01-21-V3
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-dev \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Explicitly set Python path for node-gyp
ENV PYTHON=/usr/bin/python3

# Install Foundry
ENV FOUNDRY_DIR=/opt/foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="${FOUNDRY_DIR}/bin:${PATH}"
RUN foundryup

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
# Install dependencies (ignoring strict peer deps for Web3 compat)
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build Contracts & TS
# RUN forge build
RUN rm -rf dist && npm run build

# Expose ports
EXPOSE 3000
EXPOSE 8545

# Start script (example)
CMD ["npm", "run", "start"]
