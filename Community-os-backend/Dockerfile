# ==============================================
# Stage 1: Dependencies
# ==============================================
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

# bcrypt@6 builds a native addon at install time (node-gyp) — needs a toolchain on alpine
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci \
    && apk del .build-deps

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
# keep them so migrate/seed can run from the entrypoint.
# NODE_ENV=production makes `npm ci` omit devDeps by default,
# so `--include=dev` is required here (otherwise `prisma generate`
# would npx-fetch the latest CLI, breaking Prisma 6 schemas).
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --include=dev \
    && npx prisma generate \
    && apk del .build-deps

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
