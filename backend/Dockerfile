FROM node:20-alpine

RUN apk add --no-cache openssl
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

# Run as a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000

CMD ["node", "src/server.js"]
