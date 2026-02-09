# CI/CD Pipeline

## Overview
Simple 3-stage pipeline: **TEST** → **BUILD** → **DEPLOY**

## Jobs

1. **test**: TypeScript build + unit tests (backend)
2. **build**: Build backend + frontend
3. **deploy**: Deployment summary (auto-deploy via Git)

## Auto-Deploy Setup

### ✅ Render (Backend)
Already connected - auto-deploys on push to `main`

### ⚠️ Vercel (Frontend) 
**To enable auto-deploy:**
1. Go to https://vercel.com/dashboard
2. Import repository: `montaassarr/barber`
3. Root Directory: `barber-frontend`
4. Add environment variable:
   - `VITE_API_BASE_URL=https://barber-hcv8.onrender.com`
5. Deploy

## Environment Variables

### Backend (Render Dashboard)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://resevini.vercel.app
SEED_ADMIN_EMAIL=owner@barbershop.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

### Frontend (Vercel Dashboard)
```
VITE_API_BASE_URL=https://barber-hcv8.onrender.com
```

## GitHub Secrets (Optional)

Only needed if using Vercel CLI in workflow:
- `VERCEL_TOKEN`: Get from https://vercel.com/account/tokens

## Monitoring

- Backend Logs: https://dashboard.render.com/web/srv-d64r8rsr85hc73c2l4a0/logs
- Frontend Deploys: https://vercel.com/montaassarrs-projects/barber
- GitHub Actions: https://github.com/montaassarr/barber/actions

## Live URLs

- Backend: https://barber-hcv8.onrender.com
- Frontend: https://resevini.vercel.app
