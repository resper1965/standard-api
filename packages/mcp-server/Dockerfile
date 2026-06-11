FROM node:20-alpine AS builder

WORKDIR /app

# Copy the monorepo root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

# Copy the mcp-server package source
COPY packages/mcp-server ./packages/mcp-server

# Install pnpm and build the MCP server
RUN corepack enable pnpm && \
    pnpm install --filter @standard/mcp-server... && \
    pnpm --filter @standard/mcp-server build

FROM node:20-alpine

WORKDIR /app

# Copy only the compiled output and package.json
COPY --from=builder /app/packages/mcp-server/dist ./dist
COPY --from=builder /app/packages/mcp-server/package.json ./

# We only need production dependencies and ensure node user has access
RUN npm install --omit=dev && chown -R node:node /app

USER node

# Entrypoint for running the MCP server
# Note: we don't start the app right away without args; 
# the user/cursor will supply args or environment variables.
ENTRYPOINT ["node", "dist/index.js"]
