FROM node:20-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY lib/db/package.json lib/db/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/replit-auth-web/package.json lib/replit-auth-web/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/neo-fmc/package.json artifacts/neo-fmc/
COPY tsconfig.base.json tsconfig.json ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
COPY artifacts/neo-fmc/ artifacts/neo-fmc/
COPY scripts/ scripts/

RUN pnpm --filter @workspace/api-server run build
RUN PORT=80 BASE_PATH=/ pnpm --filter @workspace/neo-fmc run build

FROM node:20-alpine AS production
RUN npm install -g pnpm@10
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY lib/db/package.json lib/db/
COPY lib/api-zod/package.json lib/api-zod/
COPY artifacts/api-server/package.json artifacts/api-server/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/neo-fmc/dist/public ./public

COPY scripts/docker-start.sh ./docker-start.sh
RUN chmod +x ./docker-start.sh

EXPOSE 3000

CMD ["./docker-start.sh"]
