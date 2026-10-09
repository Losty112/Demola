FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Build tools are only a fallback in case better-sqlite3 has no prebuilt binary for the platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
# The SQLite file lives on a mounted volume so saved data survives redeploys.
ENV BENCHMARK_DB_PATH=/data/benchmark.db PORT=3000
VOLUME /data
EXPOSE 3000
CMD ["sh", "-c", "mkdir -p /data && npx next start -p ${PORT} -H 0.0.0.0"]
