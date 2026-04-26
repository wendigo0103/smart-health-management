FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build client (production build)
RUN npx vite build --config vite.config.prod.ts

# Expose port
EXPOSE 8080

# Start the server directly with tsx (serves static files from dist/spa)
CMD ["npx", "tsx", "server/node-build.ts"]
