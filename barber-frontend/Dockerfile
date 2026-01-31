# Multi-stage build for Vite React (TypeScript) frontend
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build with Supabase environment passed at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
RUN npm run build

# Stage 2: serve static assets with nginx
FROM nginx:stable-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .

# Provide a default nginx config (handles SPA routing)
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    location / {
        try_files $uri /index.html;
    }

    gzip on;
    gzip_types text/plain application/javascript application/x-javascript text/javascript text/xml text/css application/json;
    gzip_proxied any;
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
