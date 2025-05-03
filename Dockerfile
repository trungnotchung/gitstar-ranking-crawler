# Dockerfile
FROM node:18

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy code
COPY . .

# Install dependencies
RUN pnpm install

# Install ts-node globally if needed
RUN npm install -g ts-node typescript

# Default command (will be overridden by docker-compose)
CMD ["ts-node", "src/parallel-crawl/worker.ts"]
