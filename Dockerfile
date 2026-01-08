FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y curl git build-essential

# Install Foundry
ENV FOUNDRY_DIR=/opt/foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="${FOUNDRY_DIR}/bin:${PATH}"
RUN foundryup

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build Contracts & TS
RUN forge build
RUN npm run build

# Expose ports
EXPOSE 3000
EXPOSE 8545

# Start script (example)
CMD ["npm", "run", "start"]
