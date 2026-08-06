# ==============================================
# Stage 1: Dependencies
# ==============================================
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# ==============================================
# Stage 2: Build
# ==============================================
FROM deps AS build
WORKDIR /app

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ==============================================
# Stage 3: Production
# ==============================================
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# prisma CLI + tsx (for seed) live in devDependencies,
# keep them so migrate/seed can run from the entrypoint
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
