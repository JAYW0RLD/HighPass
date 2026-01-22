FROM node:20-alpine

# Install basic tools
RUN apk add --no-cache git

# Set working directory
WORKDIR /home/agent/easy-ai-agent

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build || npx tsc

# Default command
CMD ["npm", "start"]
