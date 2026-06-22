FROM node:22-slim

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./
COPY mobile/package.json ./mobile/
COPY shared ./shared
COPY web ./web

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build the Next.js app
RUN pnpm run web:build

# Expose Next.js server port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run the stateful Express server using tsx
CMD ["pnpm", "run", "web:start"]
