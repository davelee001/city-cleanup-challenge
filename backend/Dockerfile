# Backend Dockerfile
FROM node:22.23.1-alpine3.24

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only packages shipped at runtime
RUN npm ci --omit=dev

# Copy only runtime application code
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

# Create writable runtime directories, then drop root privileges
RUN mkdir -p /app/data /app/uploads \
  && chown -R node:node /app/data /app/uploads
ENV DATABASE_PATH=/app/data/city-cleanup.db
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/health-check.js || exit 1

# Run the application
CMD ["npm", "start"]
