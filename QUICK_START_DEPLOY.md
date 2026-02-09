# ⚡ Quick Start: Deploy to Production in 30 Minutes

**TL;DR** - Everything is ready. Follow these 5 steps to go live:

---

## Step 1: Get Your Credentials (5 min)

You already have these:

```
✅ MongoDB: mongodb+srv://REDACTED:REDACTED@barber.kveiwll.mongodb.net/barber
✅ Render API Key: rnd_QsSLvvtS3xCcGHgYbNPNaOyGYb8g
✅ GitHub: Connected to montassar/barber
```

Need to get:
- [ ] **Vercel Token** → https://vercel.com/account/tokens (create one)
- [ ] **VAPID Public Key** → https://web-push-codelab.glitch.me/ (generate)

---

## Step 2: Setup GitHub Secrets (5 min)

```bash
# From project root:
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh

# Follow prompts and enter:
# - Render API Key ✅ (you have it)
# - Render Service ID (leave blank, auto-generates)
# - Render API URL (https://barber-backend.onrender.com)
# - Vercel Token (from step 1)
# - Vercel Project ID (leave blank, auto-generates)
# - VAPID Public Key (from step 1)
# - MongoDB URI ✅ (you have it)
```

---

## Step 3: Create Environment Files (5 min)

**Backend:**
```bash
cd barber-backend-node
cp .env.example .env

# Edit .env - change these:
# MONGODB_URI=mongodb+srv://REDACTED:REDACTED@...
# JWT_SECRET=REDACTED
# CORS_ORIGIN=https://barber.vercel.app
# VITE_VAPID_PUBLIC_KEY=<from-step-1>
```

**Frontend:**
```bash
cd barber-frontend
cp .env.example .env

# Edit .env - change these:
# VITE_API_BASE_URL=https://barber-backend.onrender.com
# VITE_VAPID_PUBLIC_KEY=<from-step-1>
```

---

## Step 4: Push to GitHub (3 min)

```bash
git add .
git commit -m "chore: deploy to production"
git push origin main
```

This automatically triggers:
1. ✅ **TEST** - Runs tests (2 min)
2. ✅ **BUILD** - Builds Docker images (5 min)
3. ✅ **DEPLOY** - Deploys to Render + Vercel (5 min)

**Monitor at:** https://github.com/montassar/barber/actions

---

## Step 5: Verify Everything Works (7 min)

```bash
# Check backend is live
curl https://barber-backend.onrender.com/health
# Should return: {"status":"ok"}

# Check frontend is live
open https://barber.vercel.app
# Should load login page

# Login with:
# Email: owner@barbershop.com
# Password: ChangeMe123!
```

---

## 🎉 Done! Your app is live!

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://barber.vercel.app | 🟢 Live |
| Backend API | https://barber-backend.onrender.com | 🟢 Live |
| Database | MongoDB Atlas (barber cluster) | 🟢 Connected |

---

## 📊 What's Running

### Frontend (Vercel)
- React 19 + TypeScript app
- Served from Vercel CDN (global)
- Auto-deploys on git push
- HTTPS enabled
- SPA with client-side routing

### Backend (Render)
- Node.js 20 + Express
- Runs 24/7 (starter plan included)
- Auto-restart on crash
- Logs available in dashboard
- Connected to MongoDB Atlas

### Database (MongoDB Atlas)
- Shared M0 cluster (free, 512MB)
- Collections auto-created on first start
- Backups available
- Can upgrade anytime

---

## 🔄 Making Changes

Every time you push to main:
1. GitHub Actions tests your code
2. Builds Docker images
3. Deploys automatically to Render + Vercel
4. Runs integration tests

```bash
# Make a change
echo "// comment" >> barber-backend-node/src/index.ts

# Commit and push
git add .
git commit -m "feat: added cool feature"
git push origin main

# That's it! Auto-deployed in ~15 minutes
```

---

## ⚠️ First Things to Do

**IMPORTANT - Change default passwords!**

1. Login to https://barber.vercel.app
2. Use: owner@barbershop.com / ChangeMe123!
3. Go to Settings → Change Password
4. Set a new secure password
5. Delete the SEED_* variables from .env on backend (so new users aren't created)

---

## 🚀 Next Steps

- [ ] Test all features work
- [ ] Change admin passwords
- [ ] Setup custom domain (optional)
- [ ] Monitor logs for 24 hours
- [ ] Setup automated backups
- [ ] Plan scaling strategy

---

## 📞 Troubleshooting

**Backend won't start?**
```bash
# Check logs
curl https://barber-backend.onrender.com/health

# Manual restart
render restart --service-id <your-service-id>
```

**Frontend shows errors?**
```bash
# Clear cache
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Check console errors
# Open DevTools (F12) → Console
```

**Can't login?**
```bash
# Default credentials:
# Email: owner@barbershop.com
# Password: ChangeMe123!

# Check MongoDB has data
# https://cloud.mongodb.com → Collections
```

---

**Deployment Time:** ~15-20 minutes total
**Status:** 🟢 Production Ready
**Last Updated:** January 31, 2025
