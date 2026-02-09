# 🚀 Complete Deployment Checklist - Render + Vercel + MongoDB Atlas

This comprehensive checklist covers all steps needed to deploy your barber shop application to production.

## ✅ Prerequisites

Before starting deployment, verify you have:

- [ ] GitHub account with repository: `montassar/barber`
- [ ] Node.js 20+ installed locally: `node --version`
- [ ] Git configured with your credentials
- [ ] MongoDB Atlas account (cloud database)
- [ ] Render account (backend hosting)
- [ ] Vercel account (frontend hosting)
- [ ] GitHub CLI installed: `gh --version`

---

## 📋 Phase 1: Initial Setup (One-time)

### 1.1 MongoDB Atlas Setup

**Time: 10-15 minutes**

- [ ] Go to https://cloud.mongodb.com
- [ ] Sign in / Create account
- [ ] Create new organization: "barber-shop"
- [ ] Create new project: "barber-platform"
- [ ] Create a Cluster:
  - [ ] Select "Shared" tier (free M0)
  - [ ] Select region closest to you
  - [ ] Click "Create" and wait 2-3 minutes
- [ ] Create Database User:
  - [ ] Click "Database Access"
  - [ ] Click "Add New Database User"
  - [ ] Username: `barbershop_user`
  - [ ] Password: `Monta123barberplatform` (or generate strong one)
  - [ ] Role: "Read and write to any database"
  - [ ] Click "Add User"
- [ ] Get Connection String:
  - [ ] Click "Database"
  - [ ] Click "Connect" on your cluster
  - [ ] Select "Drivers"
  - [ ] Copy connection string:
    ```
    mongodb+srv://barbershop_user:<password>@barber.kveiwll.mongodb.net/?appName=barber
    ```
  - [ ] Replace `<password>` with actual password
  - [ ] Replace database name with `/barber` before `?`
- [ ] Add IP Whitelist:
  - [ ] Click "Security"
  - [ ] Click "Network Access"
  - [ ] Click "Add IP Address"
  - [ ] Select "Allow Access from Anywhere"
  - [ ] Click "Confirm"

**Result:** You should have:
- MongoDB connection string: `mongodb+srv://REDACTED:REDACTED@barber.kveiwll.mongodb.net/barber?appName=barber`

### 1.2 Render Account Setup

**Time: 5 minutes**

- [ ] Go to https://render.com
- [ ] Sign in / Create account (via GitHub recommended)
- [ ] Generate API Key:
  - [ ] Click profile → "API Keys"
  - [ ] Click "Create API Key"
  - [ ] Copy and save: `rnd_QsSLvvtS3xCcGHgYbNPNaOyGYb8g`
  - [ ] ⚠️ Save securely - you won't see it again!

**Result:** You should have:
- Render API Key: `rnd_QsSLvvtS3xCcGHgYbNPNaOyGYb8g`

### 1.3 Vercel Account Setup

**Time: 5 minutes**

- [ ] Go to https://vercel.com
- [ ] Sign in / Create account (via GitHub recommended)
- [ ] Create new project (skip for now, GitHub Actions will do it)
- [ ] Generate access token:
  - [ ] Click profile → "Settings"
  - [ ] Click "Tokens"
  - [ ] Click "Create Token"
  - [ ] Name: `gh-actions-deploy`
  - [ ] Expiration: 90 days
  - [ ] Scope: "Full Account"
  - [ ] Copy token and save securely
- [ ] Get Project Information:
  - [ ] You'll get Project ID when GitHub Actions first deploys
  - [ ] Or manually create project first

**Result:** You should have:
- Vercel Token: `<your-vercel-token>`
- Vercel Project ID: `<from-first-deployment>`
- Vercel Org ID: `<optional-if-personal>`

---

## 🔐 Phase 2: GitHub Secrets Setup

### 2.1 Automatic Setup (Recommended)

**Time: 5 minutes**

```bash
# Make script executable
chmod +x scripts/setup-github-secrets.sh

# Run setup script
./scripts/setup-github-secrets.sh

# You'll be prompted for:
# 1. Render API Key
# 2. Render Service ID (optional, auto-generate)
# 3. Render API URL
# 4. Vercel Token
# 5. Vercel Project ID
# 6. Vercel Org ID (optional)
# 7. Vercel Domain
# 8. VAPID Public Key
# 9. MongoDB Connection String
```

### 2.2 Manual Setup (If Automatic Fails)

**Time: 10 minutes**

Go to: https://github.com/montassar/barber/settings/secrets/actions

Click "New repository secret" for each:

| Secret Name | Value |
|---|---|
| `RENDER_API_KEY` | `rnd_QsSLvvtS3xCcGHgYbNPNaOyGYb8g` |
| `RENDER_SERVICE_ID` | (leave blank initially) |
| `RENDER_API_URL` | `https://barber-backend.onrender.com` |
| `VERCEL_TOKEN` | Your Vercel token |
| `VERCEL_PROJECT_ID` | (leave blank initially) |
| `VERCEL_ORG_ID` | (optional, leave blank if personal) |
| `VERCEL_DOMAIN` | `barber.vercel.app` |
| `VITE_VAPID_PUBLIC_KEY` | Your VAPID public key |
| `MONGODB_URI` | `mongodb+srv://...` |

---

## 🚀 Phase 3: First Deployment

### 3.1 Prepare Backend

**Time: 5 minutes**

```bash
# Navigate to backend
cd barber-backend-node

# Create .env from example
cp .env.example .env

# Edit .env with your values:
# - MONGODB_URI
# - JWT_SECRET
# - CORS_ORIGIN
# - VITE_VAPID_PUBLIC_KEY
# - SEED_* variables

# Test locally
npm ci
npm run build
npm start

# Should see:
# ✅ MongoDB connected
# ✅ Server running on port 4000
```

### 3.2 Prepare Frontend

**Time: 5 minutes**

```bash
# Navigate to frontend
cd barber-frontend

# Create .env from example
cp .env.example .env

# Edit .env with:
# - VITE_API_BASE_URL=http://localhost:4000 (for dev)
# - VITE_VAPID_PUBLIC_KEY

# Test locally
npm ci
npm run dev

# Should see:
# ✅ Dev server running on http://localhost:5173
```

### 3.3 Push to GitHub

**Time: 5 minutes**

```bash
# From project root
git add .
git commit -m "chore: setup production deployment

- Add render.yaml configuration
- Add deployment scripts
- Update .env.example with production variables
- Configure GitHub Actions for Render + Vercel"

git push origin main
```

This will trigger the GitHub Actions workflow:
1. ✅ **TEST** - Run TypeScript checks and tests
2. ✅ **BUILD** - Build Docker images
3. ✅ **DEPLOY** - Deploy to Render and Vercel

### 3.4 Monitor Deployment

**Time: 10-15 minutes**

- [ ] Go to https://github.com/montassar/barber/actions
- [ ] Click latest workflow run
- [ ] Wait for all 3 stages to complete:
  - `test` job ✅
  - `build` job ✅
  - `deploy-backend-render` job ✅
  - `deploy-frontend-vercel` job ✅
  - `integration-tests` job ✅

Expected logs:
```
✅ Backend deployed successfully
✅ Frontend deployed successfully
✅ Integration tests passed
```

---

## 🔍 Phase 4: Post-Deployment Verification

### 4.1 Check Backend Health

```bash
# Test backend is running
curl https://barber-backend.onrender.com/health

# Should return:
# {"status":"ok","timestamp":"2025-01-31T12:00:00Z"}
```

- [ ] Backend responds to health check
- [ ] Go to https://dashboard.render.com
- [ ] Find "barber-backend" service
- [ ] Verify "Live" status
- [ ] Check logs for "Server running on port 4000"
- [ ] Verify MongoDB connection: "Connected to MongoDB"

### 4.2 Check Frontend Deployment

```bash
# Test frontend is accessible
curl https://barber.vercel.app

# Should return HTML content
```

- [ ] Frontend loads at https://barber.vercel.app
- [ ] Console shows no errors
- [ ] Network requests go to https://barber-backend.onrender.com
- [ ] Login page displays correctly

### 4.3 Database Verification

```bash
# From MongoDB Atlas:
# 1. Click "Collections"
# 2. Should see "barber" database
# 3. Check collections created:
#    - admins
#    - salons
#    - staff
#    - appointments
#    - services
#    - stations
```

- [ ] Database "barber" exists in MongoDB Atlas
- [ ] Collections were auto-created
- [ ] Admin user was seeded (check admins collection)

### 4.4 E2E Testing

- [ ] Load frontend: https://barber.vercel.app
- [ ] Login with seed admin account:
  - Email: `owner@barbershop.com`
  - Password: `ChangeMe123!`
- [ ] Verify dashboard loads
- [ ] Create a test booking
- [ ] Verify data saved to MongoDB
- [ ] Check Render logs for request logs

---

## 📊 Phase 5: Configuration & Optimization

### 5.1 Update Admin Passwords

**CRITICAL - Do this immediately!**

```bash
# Use MongoDB Atlas to change passwords:
# 1. Go to Collections → admins
# 2. Edit admin document
# 3. Change SEED_ADMIN_PASSWORD
# 4. Change SEED_SUPER_ADMIN_PASSWORD

# Or via backend API:
curl -X POST https://barber-backend.onrender.com/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "ChangeMe123!",
    "newPassword": "YourNewSecurePassword"
  }'
```

- [ ] Admin password changed
- [ ] Super admin password changed
- [ ] Test login with new credentials

### 5.2 Setup Environment Variables

All should be configured in GitHub Secrets:

- [ ] `MONGODB_URI` - Verified working
- [ ] `JWT_SECRET` - Strong 32+ char key
- [ ] `CORS_ORIGIN` - Set to Vercel domain
- [ ] `VITE_VAPID_PUBLIC_KEY` - For push notifications
- [ ] `RENDER_API_URL` - Correct backend URL
- [ ] `RENDER_SERVICE_ID` - Your Render service ID

### 5.3 Setup Domain (Optional)

If you have custom domain:

**Render:**
- [ ] Render Dashboard → barber-backend → Settings
- [ ] Under "Custom Domain"
- [ ] Add domain: `api.yourdomain.com`
- [ ] Follow DNS instructions

**Vercel:**
- [ ] Vercel Dashboard → barber project → Settings
- [ ] Under "Domains"
- [ ] Add domain: `yourdomain.com`
- [ ] Update DNS records as shown

---

## 🔄 Phase 6: Continuous Integration

### 6.1 Understand the Workflow

Every push to `main` branch will:

```
┌─────────────────────────────────────────┐
│ GitHub Actions Triggered (main branch)  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Stage 1: TEST                           │
│ - Install dependencies                  │
│ - TypeScript compilation                │
│ - Run unit tests                        │
└─────────────────────────────────────────┘
              ↓ (passes only if test passes)
┌─────────────────────────────────────────┐
│ Stage 2: BUILD                          │
│ - Build Docker images                   │
│ - Push to GitHub Container Registry     │
└─────────────────────────────────────────┘
              ↓ (parallel)
      ┌───────────────────┬───────────────────┐
      ↓                   ↓
┌─────────────────┐  ┌─────────────────────┐
│ Deploy Backend  │  │ Deploy Frontend     │
│ to Render       │  │ to Vercel           │
└─────────────────┘  └─────────────────────┘
      ↓                   ↓
   ┌──────────────────────────┐
   │ Integration Tests        │
   │ - Health checks          │
   │ - API connectivity       │
   │ - Frontend accessibility │
   └──────────────────────────┘
```

### 6.2 Deployment Strategies

**For small features:**
```bash
git commit -m "feat: add new feature"
git push origin main
# Auto-deploys to production
```

**For major changes:**
```bash
# Create feature branch
git checkout -b feature/major-change
# Make changes, test locally
git commit -m "feat: major change"
git push origin feature/major-change

# Create Pull Request
# CI runs but doesn't deploy
# Review and test in preview
# Merge to main
# CI runs and deploys to production
```

---

## 🛠️ Phase 7: Manual Deployment (If Needed)

### 7.1 Deploy Backend Only

```bash
cd /path/to/reservi

# Option 1: Using deployment script
./scripts/deploy-render.sh

# Option 2: Manual Render CLI
npm install -g @render-api/cli
render --token $RENDER_API_KEY deploy --service-id $RENDER_SERVICE_ID
```

### 7.2 Deploy Frontend Only

```bash
cd /path/to/reservi

# Option 1: Using deployment script
./scripts/deploy-vercel.sh

# Option 2: Manual Vercel CLI
npm install -g vercel
vercel --prod --token $VERCEL_TOKEN
```

---

## 📈 Phase 8: Monitoring & Maintenance

### 8.1 Monitor Backend Health

**Daily:**
```bash
# Check service status
curl https://barber-backend.onrender.com/health

# Check Render dashboard
# https://dashboard.render.com/services/[SERVICE_ID]
```

**Expected responses:**
- Health endpoint returns 200 with status
- No error messages in logs
- MongoDB connection stable
- Request latency < 1 second

### 8.2 Monitor Frontend Performance

**Vercel Dashboard:**
- [ ] Go to https://vercel.com
- [ ] Click barber project
- [ ] Check "Analytics" tab
- [ ] Monitor build time, page load, CLS

**Browser DevTools:**
- [ ] Open https://barber.vercel.app
- [ ] Check Network tab for slow requests
- [ ] Check Console for errors
- [ ] Check Performance for Core Web Vitals

### 8.3 Monitor Database

**MongoDB Atlas:**
- [ ] Metrics Dashboard
  - [ ] Storage usage (should be < 50MB)
  - [ ] Connection count (should be < 5)
  - [ ] Operation latency (should be < 100ms)
- [ ] Security
  - [ ] IP whitelist includes Render IPs
  - [ ] Database user credentials are strong
- [ ] Backups
  - [ ] Enable automated backups (optional)

### 8.4 Check Logs

**Render Logs:**
```bash
# View deployment logs
render logs --service-id $RENDER_SERVICE_ID

# Expected patterns:
# "Server running on port 4000"
# "Connected to MongoDB"
# "[GET] /api/health 200"
```

**Vercel Logs:**
- [ ] Check function logs
- [ ] Check edge middleware logs
- [ ] Check build logs

---

## 🚨 Phase 9: Troubleshooting

### Common Issues & Solutions

**Backend won't start:**
```bash
# 1. Check MongoDB connection
curl https://barber-backend.onrender.com/health

# 2. Check Render logs
render logs --service-id $RENDER_SERVICE_ID

# 3. Verify MONGODB_URI is correct
# Should be: mongodb+srv://REDACTED:REDACTED@cluster/dbname

# 4. Restart service
render restart --service-id $RENDER_SERVICE_ID
```

**Frontend shows "API Error":**
```bash
# 1. Check VITE_API_BASE_URL is correct
# Should be: https://barber-backend.onrender.com

# 2. Check CORS_ORIGIN on backend
# Should match frontend domain: https://barber.vercel.app

# 3. Clear browser cache (Cmd+Shift+R)

# 4. Check browser console for actual error
```

**MongoDB won't connect:**
```bash
# 1. Verify IP whitelist in MongoDB Atlas
# Should include: Render IPs (auto-detected)

# 2. Check connection string format
# mongodb+srv://REDACTED:REDACTED@cluster/dbname?appName=name

# 3. Verify user credentials
# Check in MongoDB Atlas → Database Users

# 4. Test connection locally
# mongodb://REDACTED:REDACTED@cluster...
```

**GitHub Actions fails:**
```bash
# 1. Check workflow logs
# https://github.com/montassar/barber/actions

# 2. Verify all secrets are set
# https://github.com/montassar/barber/settings/secrets/actions

# 3. Check for Docker build errors
# Logs show exact failure point

# 4. Verify Node.js version is 20
# Check in barber-backend-node/package.json
```

---

## 📚 Quick Reference

### Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | https://barber.vercel.app | User-facing app |
| Backend API | https://barber-backend.onrender.com | API server |
| API Health | https://barber-backend.onrender.com/health | Status check |
| Render Dashboard | https://dashboard.render.com | Backend monitoring |
| Vercel Dashboard | https://vercel.com | Frontend monitoring |
| MongoDB Atlas | https://cloud.mongodb.com | Database management |
| GitHub Actions | https://github.com/montassar/barber/actions | CI/CD logs |
| GitHub Secrets | https://github.com/montassar/barber/settings/secrets/actions | Environment variables |

### Critical Passwords & Keys (⚠️ Keep Secure!)

```
MongoDB User: barbershop_user
MongoDB Password: Monta123barberplatform
Render API Key: rnd_QsSLvvtS3xCcGHgYbNPNaOyGYb8g
Vercel Token: [from setup]
JWT_SECRET: [generate strong one]
```

### Useful Commands

```bash
# Deploy backend
./scripts/deploy-render.sh

# Deploy frontend
./scripts/deploy-vercel.sh

# Setup GitHub secrets
./scripts/setup-github-secrets.sh

# Check backend
curl https://barber-backend.onrender.com/health

# View Render logs
render logs --service-id $RENDER_SERVICE_ID

# Check GitHub Actions
open https://github.com/montassar/barber/actions
```

---

## ✨ Deployment Complete!

Once all phases are complete, you have:

- ✅ MongoDB Atlas cloud database
- ✅ Render backend (auto-scales, 24/7 uptime)
- ✅ Vercel frontend (CDN, serverless functions)
- ✅ GitHub Actions CI/CD (3-stage pipeline)
- ✅ Automated deployments on git push
- ✅ Health monitoring and integration tests
- ✅ Production-ready barber shop platform

**Next steps:**
1. Get feedback from barbers/customers
2. Monitor performance in production
3. Plan for features based on usage
4. Scale infrastructure as needed

---

## 📞 Support

If you encounter issues:

1. Check logs:
   - Render: https://dashboard.render.com
   - Vercel: https://vercel.com
   - GitHub: https://github.com/montassar/barber/actions

2. Check environment variables:
   - https://github.com/montassar/barber/settings/secrets/actions

3. Test locally:
   - Start backend: `cd barber-backend-node && npm start`
   - Start frontend: `cd barber-frontend && npm run dev`
   - Check logs for errors

4. Common solutions:
   - Restart Render service: `render restart --service-id ...`
   - Clear browser cache: Cmd+Shift+R
   - Redeploy: Push to main branch

---

**Last Updated:** January 31, 2025
**Deployed By:** GitHub Actions
**Production Ready:** ✅ Yes
