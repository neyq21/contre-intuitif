# Image de production : Node 22, build Next.js, base SQLite sur un volume (/data).
FROM node:22-bookworm-slim AS dependances
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM dependances AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apt-get purge -y python3 make g++ && apt-get autoremove -y
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/contenu ./contenu
COPY --from=build /app/next.config.ts ./next.config.ts
RUN mkdir -p /data && chown node:node /data /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
