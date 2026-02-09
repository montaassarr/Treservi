# 🚀 Complete Production Deployment Guide

> **Last Updated:** February 2026  
> **Status:** Production Ready  
> **Stages:** Test → Build → Deploy

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Stage 1: Test Pipeline](#stage-1-test-pipeline)
5. [Stage 2: Build Pipeline](#stage-2-build-pipeline)
6. [Stage 3: Deploy Pipeline](#stage-3-deploy-pipeline)
7. [GitHub Secrets Configuration](#github-secrets-configuration)
8. [Docker Configuration](#docker-configuration)
9. [Database Setup (MongoDB Atlas)](#database-setup-mongodb-atlas)
10. [Vercel Setup](#vercel-setup)
11. [Runway Setup](#runway-setup)
12. [Post-Deployment Verification](#post-deployment-verification)
13. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses a **3-stage CI/CD pipeline** with GitHub Actions:

```
┌─────────────┐
│   STAGE 1   │
│   TEST      │ → TypeScript compilation + Unit tests
└──────┬──────┘
       ↓
┌─────────────┐
│   STAGE 2   │ → Build Docker images + Push to container registry
│   BUILD     │
└──────┬──────┘
       ↓
┌─────────────┐
│   STAGE 3   │ → Deploy backend to Runway + frontend to Vercel
│   DEPLOY    │
└─────────────┘
```

**Technology Stack:**
- **Frontend:** React 19 + TypeScript + Vite → Vercel + Nginx
- **Backend:** Node.js 20 + Express + TypeScript → Runway + Docker
- **Database:** MongoDB Atlas (Cloud)
- **CI/CD:** GitHub Actions
- **Container Registry:** GitHub Container Registry (GHCR)

---

## Architecture

### Frontend
```
barber-frontend/
├── src/                    # TypeScript React components
├── package.json            # Dependencies (React, Vite, Tailwind)
├── vite.config.ts          # Vite build configuration
├── Dockerfile              # Multi-stage: node:20 → nginx
├── vercel.json             # Vercel-specific rewrites
└── .env.example            # Environment variables template
```

**Build Process:**
1. Install dependencies: `npm ci`
2. Build with Vite: `npm run build` → outputs to `dist/`
3. Serve with Nginx: Multi-stage Docker build

**Environment Variables:**
- `VITE_API_BASE_URL` - Backend API endpoint (set by CI/CD)
- `VITE_VAPID_PUBLIC_KEY` - Web push notifications

### Backend
```
barber-backend-node/
├── src/
│   ├── server.ts           # Express app entry point
│   ├── app.ts              # Express middleware setup
│   ├── config/
│   │   └── env.ts          # Environment variable validation
│   ├── routes/             # API endpoints
│   ├── models/             # MongoDB models
│   ├── middleware/         # Auth, CORS, etc.
│   └── tests/              # Unit tests with Vitest
├── package.json            # Dependencies (Express, Mongoose, JWT)
├── tsconfig.json           # TypeScript configuration
├── Dockerfile              # Multi-stage: builder → node:20
└── .env.example            # Environment variables template
```

**Build Process:**
1. Install dependencies: `npm ci`
2. Type check: `tsc -p tsconfig.json`
3. Run tests: `vitest run`
4. Docker multi-stage build:
   - **Builder stage:** Install all deps + compile TypeScript
   - **Production stage:** Only production deps + compiled JS

**Environment Variables:**
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT signing (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `JWT_EXPIRES_IN` - Token expiration (default: "7d")
- `CORS_ORIGIN` - Frontend URL for CORS
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 4000)
- Plus 4 seed variables for initial admin/super admin setup

### Database
- **Type:** MongoDB Atlas (Cloud)
- **Tier:** M0 (free) - 512MB shared cluster
- **Connection:** `mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi`
- **Features:** Auto-scaling, backup, 3-node replica set

---

## Prerequisites

### Required Accounts & Access
- [ ] GitHub account with repository access
- [ ] MongoDB Atlas account (create at https://www.mongodb.com/cloud/atlas)
- [ ] Runway account (create at https://www.runwayapp.com)
- [ ] Vercel account (create at https://vercel.com)
- [ ] Docker Hub account (optional, for private images)

### Required Tools (Local Development)
- Node.js 20+
- Docker & Docker Compose
- Git
- npm 10+

### Generated Credentials (You Need to Create)
- [ ] MongoDB Atlas username/password
- [ ] JWT secret key (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] GitHub Personal Access Token (for container registry)
- [ ] Vercel API token
- [ ] Runway API token

---

## STAGE 1: Test Pipeline

### What Gets Tested?
1. **TypeScript Compilation** - `npm run build`
2. **Unit Tests** - `npm run test` (Vitest)
3. **Linting** - Code quality checks (optional)

### Configuration File Location
`.github/workflows/deploy.yml` - Job: `test`

### How to Run Locally (for validation)

```bash
cd barber-backend-node

# Install dependencies
npm ci

# TypeScript check (must pass)
npm run build
# ✅ Output: dist/ folder created

# Run tests (currently 1 test)
npm run test
# ✅ Output: GET /health returns 200 with { "status": "ok" }
```

### Current Test Coverage

**File:** `barber-backend-node/src/tests/health.test.ts`
```typescript
describe('GET /health', () => {
  it('returns ok', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

### Adding More Tests

Example: Test authentication endpoint
```typescript
describe('POST /auth/login', () => {
  it('returns 401 for invalid credentials', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'invalid@test.com', password: 'wrong' });
    expect(response.status).toBe(401);
  });
});
```

### Test Failure Handling
- ✅ **Pass:** Continue to Stage 2 (Build)
- ❌ **Fail:** Pipeline stops, logs available in GitHub Actions
- Developers notified via Slack (if webhook configured)

---

## STAGE 2: Build Pipeline

### What Gets Built?

#### 2.1 Backend Docker Image
```dockerfile
# Multi-stage build: 2 stages
FROM node:20-alpine AS builder  # Stage 1: Build environment
├── Install all deps (npm ci)
├── Copy source code
└── Compile TypeScript (npm run build)

FROM node:20-alpine             # Stage 2: Runtime
├── Install only production deps
├── Copy compiled dist/ from builder
└── Expose port 4000
```

**Image Name:** `ghcr.io/montaassarr/barber/backend:main`  
**Size Optimization:** ~200MB (vs ~500MB without multi-stage)

#### 2.2 Frontend Docker Image
```dockerfile
# Multi-stage build: 2 stages
FROM node:20-alpine AS builder  # Stage 1: Build environment
├── Install all deps (npm ci)
├── Copy source code
├── Build with Vite (npm run build)
└── Output to dist/

FROM nginx:stable-alpine        # Stage 2: Web server
├── Copy nginx config (handles SPA routing)
├── Copy dist/ from builder
├── Expose port 80
└── Gzip compression enabled
```

**Image Name:** `ghcr.io/montaassarr/barber/frontend:main`  
**Size Optimization:** ~40MB (vs ~400MB without multi-stage)

### Build Arguments (Passed from GitHub Actions)

#### Frontend Build Args
```yaml
VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL_DOCKER }}
VITE_VAPID_PUBLIC_KEY: ${{ secrets.VITE_VAPID_PUBLIC_KEY }}
```

These are baked into the container at build time for production.

### Container Registry
- **Service:** GitHub Container Registry (GHCR)
- **Authentication:** Uses `${{ secrets.GITHUB_TOKEN }}` (auto-provided)
- **Images:**
  - Backend: `ghcr.io/montaassarr/barber/backend`
  - Frontend: `ghcr.io/montaassarr/barber/frontend`

### Build Tagging Strategy
```
ghcr.io/montaassarr/barber/backend:main      # Latest on main branch
ghcr.io/montaassarr/barber/backend:sha-abc123 # Specific commit SHA
ghcr.io/montaassarr/barber/backend:v1.0.0    # Semantic versioning
```

### Build Caching
- **Layer caching:** `cache-from: type=registry`
- **Build cache:** Stored in registry for next builds
- **Speed improvement:** 50-70% faster rebuilds

### Build Failure Handling
- ❌ **TypeScript errors:** Build fails, pipeline stops
- ❌ **Missing dependencies:** npm install fails, pipeline stops
- ✅ **Pass:** Images pushed to GHCR, continue to Stage 3

---

## STAGE 3: Deploy Pipeline

### 3.1 Backend Deployment (Runway)

**Trigger:** `main` branch push only  
**Deployed Image:** Latest from GHCR build

```bash
# Runway CLI deployment
runway deploy \
  --service-id $RUNWAY_SERVICE_ID \
  --docker-image ghcr.io/.../backend:main \
  --environment-variables \
    MONGODB_URI="..." \
    JWT_SECRET="..." \
    CORS_ORIGIN="https://your-frontend.com"
```

**Environment Variables Set:**
- All 12 variables from `.env.example`
- Plus: `NODE_ENV=production`, `PORT=4000`

**Post-Deployment:**
1. Health check: `curl -f $RUNWAY_API_URL/health`
2. Wait 30 seconds for service startup
3. If healthy → Continue to frontend deployment
4. If failed → Pipeline stops, Slack notification sent

### 3.2 Frontend Deployment (Vercel)

**Trigger:** Only after backend deployment succeeds  
**Deployment Method:** Vercel CLI

```bash
vercel --prod \
  --token $VERCEL_TOKEN \
  --env VITE_API_BASE_URL=$RUNWAY_API_URL \
  --env VITE_VAPID_PUBLIC_KEY=$VAPID_KEY
```

**Environment Variables Set:**
- `VITE_API_BASE_URL` - Points to new Runway API
- `VITE_VAPID_PUBLIC_KEY` - Web push key

**Post-Deployment:**
1. Health check: `curl -f https://your-frontend.com`
2. Wait 30 seconds for CDN propagation
3. If accessible → Continue to integration tests
4. If failed → Pipeline stops, Slack notification sent

### 3.3 Integration Tests

**Trigger:** Only after both deployments succeed  
**Duration:** ~2-3 minutes

**Tests Performed:**
```bash
# 1. Backend health check
curl -f $RUNWAY_API_URL/health
# Expected: 200 OK { "status": "ok" }

# 2. Frontend accessibility
curl -f https://your-frontend.com
# Expected: 200 OK + HTML response

# 3. Connectivity test
# Frontend can reach backend API
```

### Deployment Failure Handling

| Stage | Failure | Action |
|-------|---------|--------|
| Test | ❌ | Stop, notify dev |
| Build | ❌ | Stop, notify dev |
| Backend Deploy | ❌ | Stop, don't deploy frontend |
| Frontend Deploy | ❌ | Rollback possible, notify |
| Integration Tests | ❌ | Alert, investigate manually |

---

## GitHub Secrets Configuration

### Step 1: Create GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

### All Required Secrets

```plaintext
┌─ CREDENTIALS ─────────────────────────┐
│ RUNWAY_API_TOKEN                      │ (from Runway)
│ RUNWAY_SERVICE_ID                     │ (from Runway)
│ VERCEL_TOKEN                          │ (from Vercel)
│ VERCEL_PROJECT_URL                    │ (Vercel domain)
│ SLACK_WEBHOOK                         │ (optional)
│
├─ DATABASE ───────────────────────────┤
│ MONGODB_URI                           │ (MongoDB Atlas)
│
├─ BACKEND CONFIGURATION ──────────────┤
│ JWT_SECRET                            │ (generated 32 char hex)
│ JWT_EXPIRES_IN                        │ "7d"
│ CORS_ORIGIN                           │ (frontend URL)
│ SEED_ADMIN_EMAIL                      │ owner@barbershop.com
│ SEED_ADMIN_PASSWORD                   │ ChangeMe123!
│ SEED_SALON_NAME                       │ Demo Salon
│ SEED_SALON_SLUG                       │ demo-salon
│ SEED_SUPER_ADMIN_EMAIL                │ superadmin@barbershop.com
│ SEED_SUPER_ADMIN_PASSWORD             │ ChangeMe123!
│
├─ FRONTEND CONFIGURATION ─────────────┤
│ VITE_API_BASE_URL_DOCKER              │ (Runway API URL)
│ VITE_VAPID_PUBLIC_KEY                 │ (from .env)
│ RUNWAY_API_URL                        │ (full API URL)
└───────────────────────────────────────┘
```

### Step 2: Populate Each Secret

**RUNWAY_API_TOKEN**
- Where: Runway Dashboard → Account Settings → API Tokens
- Format: Long alphanumeric string
- Copy: Entire token

**RUNWAY_SERVICE_ID**
- Where: Runway Dashboard → Service → Settings
- Format: `srv_xxxxx` or UUID
- Copy: Service ID

**RUNWAY_API_URL**
- Where: Runway Dashboard → Service → Deployment Details
- Format: `https://your-service-id.runway.app`
- Copy: Full URL including protocol

**MONGODB_URI**
- Format: `mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi?retryWrites=true&w=majority`
- Where: MongoDB Atlas → Cluster → Connect → Connection String
- Copy: Full string, replace username/password

**JWT_SECRET**
- Generate locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Example output: a3f9c2e1b4d7c8f9e2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d
```

**CORS_ORIGIN**
- Format: `https://your-vercel-domain.com`
- Example: `https://reservi-barber.vercel.app`
- Without trailing slash

**VITE_API_BASE_URL_DOCKER**
- Same as `RUNWAY_API_URL`
- Format: `https://your-service-id.runway.app`

**VERCEL_TOKEN**
- Where: Vercel Dashboard → Settings → Tokens → Create Token
- Copy: Full token (40+ chars)

**VERCEL_PROJECT_URL**
- Format: `your-frontend.vercel.app`
- Where: Vercel Dashboard → Project → Domains
- Without `https://` prefix

---

## Docker Configuration

### Frontend Dockerfile Analysis

**Location:** `barber-frontend/Dockerfile`

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build args (from GitHub Actions)
ARG VITE_API_BASE_URL
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY}

RUN npm ci --legacy-peer-deps --include=dev && npm run build

# Stage 2: Runtime
FROM nginx:stable-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why Multi-Stage?**
- Builder: Node 20, dev dependencies, Vite compiler (~400MB)
- Runtime: Nginx only, compiled assets (~40MB)
- **Result:** 90% size reduction

**Build Args (from CI/CD):**
```yaml
VITE_API_BASE_URL: https://your-backend.runway.app
VITE_VAPID_PUBLIC_KEY: BK18bQ4NEXiaZlIV6...
```

These are baked into the image → No runtime environment variables needed

**Nginx Configuration:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    
    location / {
        try_files $uri /index.html;  # SPA routing
    }
    
    gzip on;  # Compression enabled
}
```

### Backend Dockerfile Analysis

**Location:** `barber-backend-node/Dockerfile`

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # TypeScript → JavaScript

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # Only prod deps
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

**Why Multi-Stage?**
- Builder: TypeScript, dev deps (~300MB)
- Runtime: Only production deps (~150MB)
- **Result:** 50% size reduction

**Environment Variables (from Runway):**
```
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=a3f9c2e1...
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend.com
```

**Health Check (Built-in):**
```bash
docker healthcheck --interval=30s --timeout=3s --retries=3
  exec node -e "require('http').get('http://localhost:4000/health')"
```

---

## Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Sign Up"
3. Fill in email, password, complete verification
4. Agree to terms, click "Create my Atlas account"

### Step 2: Create Free Cluster
1. Click "Create a Deployment"
2. Select **M0 (FREE)** tier
3. Select cloud provider (AWS, Google Cloud, Azure)
4. Select region closest to you
5. Click "Create Deployment"
6. Wait ~10 minutes for cluster to provision

### Step 3: Create Database User
1. Click "Create a Database User"
2. Enter username: `barbershop_user`
3. Enter password: Generate strong password (save it!)
4. Click "Create Database User"

### Step 4: Get Connection String
1. Click "Connect"
2. Select "Connect your application"
3. Copy connection string:
   ```
   mongodb+srv://barbershop_user:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
4. **Replace `<password>` with actual password**
5. **Add `/reservi` before `?` to specify database:**
   ```
   mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi?retryWrites=true&w=majority
   ```

### Step 5: Add IP Whitelist
1. Click "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Confirm: `0.0.0.0/0`

⚠️ **In production:** Use specific IP ranges, not `0.0.0.0/0`

### Step 6: Set GitHub Secret
```bash
# GitHub Settings → Secrets → MONGODB_URI
# Set to:
mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi?retryWrites=true&w=majority
```

### Verify Connection
```bash
# Locally (to test)
mongosh "mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi"

# Should show: 
# test> 
# (means connected)
```

---

## Vercel Setup

### Step 1: Create Vercel Account
1. Go to https://vercel.com/signup
2. Sign up with GitHub
3. Click "Authorize Vercel"
4. Complete setup

### Step 2: Create New Project
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select **your GitHub repository**
4. Click "Import"

### Step 3: Configure Environment Variables
1. Go to Project Settings → Environment Variables
2. Add variables:

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `https://your-service.runway.app` |
| `VITE_VAPID_PUBLIC_KEY` | `BK18bQ4NEXiaZlIV6...` |
| `GEMINI_API_KEY` | (optional, if using AI) |

### Step 4: Generate Vercel API Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions"
4. Scope: "Full Account"
5. Copy token
6. **GitHub Settings → Secrets → VERCEL_TOKEN** (paste here)

### Step 5: Get Project URL
1. Deploy once manually: `vercel --prod`
2. Or go to Project → Deployments
3. Copy domain: `your-project.vercel.app`
4. **GitHub Secrets → VERCEL_PROJECT_URL** (paste here)

### Step 6: Test Deployment
```bash
# Deploy manually to verify
cd barber-frontend
vercel --prod --token YOUR_TOKEN

# Or via CLI
npm install -g vercel
vercel link  # Link to Vercel project
vercel --prod
```

---

## Runway Setup

### Step 1: Create Runway Account
1. Go to https://www.runwayapp.com
2. Click "Sign Up"
3. Use GitHub for easy authentication
4. Complete setup

### Step 2: Create New Service
1. Go to Dashboard
2. Click "Create Service"
3. Name: "barber-backend"
4. Select "Docker Container"
5. Click "Create"

### Step 3: Get Service ID
1. Click on created service
2. Go to Settings
3. Copy **Service ID** (format: `srv_xxxxx`)
4. **GitHub Secrets → RUNWAY_SERVICE_ID** (paste here)

### Step 4: Generate API Token
1. Go to Account Settings → API Tokens
2. Click "Create Token"
3. Name: "GitHub Actions"
4. Copy token
5. **GitHub Secrets → RUNWAY_API_TOKEN** (paste here)

### Step 5: Configure Environment Variables in Runway

Option A: Via Dashboard
1. Service Settings → Environment Variables
2. Add all 12 variables from `.env.example`
3. Click "Save"

Option B: Via GitHub Actions (Recommended)
- CI/CD pipeline sets them automatically
- See "STAGE 3: Deploy Pipeline" section

### Step 6: Get Deployment URL
After first deployment:
1. Service → Deployments
2. Copy URL: `https://your-service-id.runway.app`
3. **GitHub Secrets → RUNWAY_API_URL** (paste here)

### Step 7: Test Deployment
```bash
# After CI/CD completes
curl https://your-service-id.runway.app/health

# Expected response:
# {"status":"ok"}
```

---

## Post-Deployment Verification

### Checklist

```bash
# ✅ 1. Backend Health Check
curl -i https://runway-api-url.runway.app/health
# Expected: HTTP 200
# Response: { "status": "ok" }

# ✅ 2. Frontend Accessibility
curl -i https://your-app.vercel.app
# Expected: HTTP 200
# Response: HTML with <title> containing "Reservi"

# ✅ 3. CORS Headers (from Frontend)
curl -i -H "Origin: https://your-app.vercel.app" \
     https://runway-api-url.runway.app/health
# Expected: Access-Control-Allow-Origin header

# ✅ 4. Database Connection (via API)
curl -X POST https://runway-api-url.runway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@barbershop.com","password":"ChangeMe123!"}'
# Expected: JWT token in response OR error if credentials wrong

# ✅ 5. Frontend → Backend Communication
# Open browser console: https://your-app.vercel.app
# Check: Network tab → API calls should go to runway URL
```

### GitHub Actions Dashboard

1. Go to **Repository → Actions**
2. Click latest workflow run
3. View logs:
   - ✅ Green checkmarks = Success
   - ❌ Red X = Failed
   - Expand jobs to see details

### Monitor Logs

**Frontend Build Logs:**
```
✅ Build and push frontend image
├── Build context: barber-frontend
├── Build args: VITE_API_BASE_URL, VITE_VAPID_PUBLIC_KEY
└── Pushed to: ghcr.io/.../frontend:main
```

**Backend Deploy Logs:**
```
✅ Deploy to Runway
├── Service ID: srv_xxxxx
├── Image: ghcr.io/.../backend:main
├── Environment variables: 12 set
└── Health check: PASSED
```

**Frontend Deploy Logs:**
```
✅ Deploy to Vercel
├── Project: your-project
├── Environment: VITE_API_BASE_URL set to runway URL
└── Deployment: SUCCESSFUL
```

---

## Troubleshooting

### 1. GitHub Actions - Test Stage Fails

**Error:** `error TS2322: Type is not assignable to type`

**Cause:** TypeScript compilation error in backend

**Solution:**
```bash
# Run locally to debug
cd barber-backend-node
npm ci
npm run build

# Fix TypeScript errors, push changes
git add -A && git commit -m "fix: resolve TypeScript errors"
git push origin main
```

### 2. GitHub Actions - Build Stage Fails

**Error:** `Docker build failed` or `npm install failed`

**Cause:** Missing dependency, Dockerfile error, or registry auth issue

**Solution:**
```bash
# Test build locally
docker build -t test-backend barber-backend-node
# or
docker build -t test-frontend barber-frontend

# Check Dockerfile syntax
docker build --dry-run barber-backend-node
```

### 3. Runway Deployment Fails

**Error:** `RUNWAY_API_TOKEN invalid` or `Service not found`

**Cause:** Wrong token or service ID in GitHub Secrets

**Solution:**
1. Verify token at: Runway → Account Settings → API Tokens
2. Verify service ID at: Runway → Service → Settings
3. Update GitHub Secrets if changed
4. Re-run workflow: GitHub Actions → workflow → Re-run

### 4. Vercel Deployment Fails

**Error:** `VERCEL_TOKEN invalid` or `Project not found`

**Cause:** Expired token or wrong project configured

**Solution:**
```bash
# Generate new token
# Vercel → Account Settings → Tokens → Create

# Update GitHub Secret: VERCEL_TOKEN

# Verify project
vercel link --project your-project
```

### 5. Backend Can't Connect to MongoDB

**Error:** `MongooseError: connect ECONNREFUSED`

**Cause:** Wrong `MONGODB_URI` or network restriction

**Solution:**
```bash
# Test connection string locally
mongosh "MONGODB_URI"

# Verify:
1. IP address whitelisted in MongoDB Atlas
2. Username/password correct
3. Database name matches (/reservi)
4. No special characters in password
```

### 6. Frontend Can't Reach Backend (CORS Error)

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Cause:** `CORS_ORIGIN` doesn't match frontend URL

**Solution:**
1. Get exact frontend URL: `https://your-app.vercel.app`
2. Update secret: `CORS_ORIGIN=https://your-app.vercel.app`
3. Re-deploy backend: Re-run GitHub Actions workflow
4. Hard refresh frontend: `Ctrl+Shift+R` (clear cache)

### 7. Health Check Timeout

**Error:** `curl: (7) Failed to connect` after deployment

**Cause:** Service not fully started or network issue

**Solution:**
```bash
# Wait longer
sleep 60
curl https://runway-api-url.runway.app/health

# Or check Runway dashboard
# Runway → Service → Logs → view startup logs
```

### 8. Docker Image Size Too Large

**Error:** `Docker image exceeds maximum size`

**Cause:** Dev dependencies or build artifacts not excluded

**Solution:**
- Verify multi-stage build in Dockerfile
- Check `.dockerignore` file
- Confirm `--only=production` flag in second stage

### Emergency Rollback

If deployment breaks production:

```bash
# Runway: Re-deploy previous image
runway deploy --service-id srv_xxxxx --image ghcr.io/.../backend:previous-commit-sha

# Vercel: Automatic via dashboard
# Vercel → Project → Deployments → (previous) → Promote to Production
```

---

## Next Steps

1. **Populate all GitHub Secrets** → See "GitHub Secrets Configuration"
2. **Test locally:**
   ```bash
   docker-compose up --build
   # Test at http://localhost:3000
   ```
3. **Push to GitHub:**
   ```bash
   git add -A
   git commit -m "feat: add CI/CD pipeline"
   git push origin main
   ```
4. **Monitor GitHub Actions** → Watch deployment progress
5. **Verify production URLs:**
   - Frontend: `https://your-app.vercel.app`
   - Backend: `https://your-service.runway.app`
6. **Run integration tests** → See "Post-Deployment Verification"

---

## Support

**For issues:**
1. Check logs at: GitHub Actions → Workflow → Job
2. Run local tests: `npm run build && npm run test`
3. Verify secrets: GitHub → Settings → Secrets
4. Check service status: Runway & Vercel dashboards

**Documentation:**
- Runway Docs: https://www.runwayapp.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- GitHub Actions: https://docs.github.com/en/actions
