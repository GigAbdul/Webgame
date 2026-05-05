FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=build --chown=app:app /app/client/package.json ./client/package.json
COPY --from=build --chown=app:app /app/server/package.json ./server/package.json
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/client/dist ./client/dist
COPY --from=build --chown=app:app /app/server/dist ./server/dist
COPY --from=build --chown=app:app /app/prisma ./prisma
EXPOSE 4000
USER app
CMD ["npm", "run", "start"]

