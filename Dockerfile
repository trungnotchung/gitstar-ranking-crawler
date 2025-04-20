# Dockerfile
FROM node:18

# create app directory
WORKDIR /app

# Copy code
COPY . .

# Install dependencies
RUN npm install

# Install ts-node globally if needed
RUN npm install -g ts-node typescript

# Default command (will be overridden by docker-compose)
CMD ["ts-node", "src/parallel-crawl/worker.ts"]
