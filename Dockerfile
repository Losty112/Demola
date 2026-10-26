FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
# Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY at runtime.
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "npx next start -p ${PORT} -H 0.0.0.0"]
