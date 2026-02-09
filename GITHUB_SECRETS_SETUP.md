# 🔐 GitHub Secrets Checklist & Configuration Guide

> **Required Before First Deployment**

---

## Quick Copy-Paste Section

Use this section as a template for all secrets you need to create.

### What You Need to Generate/Collect

```
1. JWT_SECRET
   - Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   - Example: a3f9c2e1b4d7c8f9e2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d
   - Length: 64 characters (32 bytes as hex)
   - Description: Secret key for signing JWT tokens in backend

2. MONGODB_URI
   - Source: MongoDB Atlas → Cluster → Connect → Connection String
   - Template: mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi?retryWrites=true&w=majority
   - Example: mongodb+srv://REDACTED:REDACTED@ssw0rd!@cluster0.xyz.mongodb.net/reservi?retryWrites=true&w=majority
   - Test: mongosh "YOUR_URI"

3. RUNWAY_API_TOKEN
   - Source: Runway Dashboard → Account Settings → API Tokens
   - Generate: Click "Create Token"
   - Format: Long alphanumeric string
   - Example: rw_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

4. RUNWAY_SERVICE_ID
   - Source: Runway Dashboard → Service → Settings
   - Format: srv_xxxxxxxx or UUID
   - Example: srv_8a1b2c3d

5. RUNWAY_API_URL
   - Source: Runway Dashboard → Service → Deployment Details
   - Format: https://your-service-id.runway.app
   - Example: https://srv_8a1b2c3d.runway.app
   - Note: This is set AFTER first deployment

6. VERCEL_TOKEN
   - Source: Vercel Dashboard → Settings → Tokens
   - Generate: Click "Create Token"
   - Name it: "GitHub Actions"
   - Scope: Full Account
   - Example: T0kEn_VeRy_LoNg_StRiNg

7. VERCEL_PROJECT_URL
   - Source: Vercel Dashboard → Project → Domains
   - Format: your-project-name.vercel.app
   - Example: reservi-barber.vercel.app
   - Note: WITHOUT https:// prefix

8. VITE_API_BASE_URL_DOCKER
   - Value: Same as RUNWAY_API_URL
   - Example: https://srv_8a1b2c3d.runway.app
   - Purpose: Baked into frontend Docker image at build time

9. VITE_VAPID_PUBLIC_KEY
   - Source: barber-frontend/.env
   - Current value: BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA
   - Purpose: Web push notifications

10. CORS_ORIGIN
    - Format: https://your-vercel-domain.com
    - Example: https://reservi-barber.vercel.app
    - NO trailing slash
    - Purpose: Allowed CORS origin for backend

11. JWT_EXPIRES_IN
    - Value: "7d"
    - Do NOT change unless you want shorter/longer tokens

12. SEED_ADMIN_EMAIL
    - Default: owner@barbershop.com
    - Change to your email if desired

13. SEED_ADMIN_PASSWORD
    - Default: ChangeMe123!
    - CHANGE THIS for production
    - Requirements: 8+ chars, letter + number

14. SEED_SALON_NAME
    - Default: Demo Salon
    - Change to your salon name

15. SEED_SALON_SLUG
    - Default: demo-salon
    - Must be lowercase, hyphens only, no spaces

16. SEED_SUPER_ADMIN_EMAIL (NEW)
    - Default: superadmin@barbershop.com
    - Required for multi-salon support

17. SEED_SUPER_ADMIN_PASSWORD
    - Default: ChangeMe123!
    - CHANGE THIS for production

18. SLACK_WEBHOOK (OPTIONAL)
    - Source: Slack workspace → Create Incoming Webhook
    - Format: https://hooks.slack.com/services/XXXXXXXXXXX/YYYYYYYYYYY/ZZZZZZZZZZZZZZZZZZZZZZZZ
    - Purpose: Get deployment notifications in Slack
    - If not set: CI/CD still works, just no Slack alerts
```

---

## Step-by-Step Setup Instructions

### Step 1: Access GitHub Settings

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** (green button)

### Step 2: Create Each Secret

**For each secret below:**
1. Click "New repository secret"
2. **Name:** Exact name from column 1
3. **Value:** Exact value from above section
4. Click "Add secret"

---

## Complete Secrets List

Copy this table and fill in column 3 with YOUR values:

| # | Secret Name | Your Value | Status | Notes |
|---|---|---|---|---|
| 1 | `JWT_SECRET` | `[generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ⬜ | Copy full output |
| 2 | `MONGODB_URI` | `mongodb+srv://REDACTED:REDACTED@cluster.../reservi?...` | ⬜ | From MongoDB Atlas |
| 3 | `RUNWAY_API_TOKEN` | `rw_prod_xxxx...` | ⬜ | From Runway Settings |
| 4 | `RUNWAY_SERVICE_ID` | `srv_xxxxxxxx` | ⬜ | From Runway Service |
| 5 | `RUNWAY_API_URL` | `https://srv_xxxxxxxx.runway.app` | ⬜ | After first deploy |
| 6 | `VERCEL_TOKEN` | `xxxxxxxxxxxxxxxx` | ⬜ | From Vercel Settings |
| 7 | `VERCEL_PROJECT_URL` | `your-app.vercel.app` | ⬜ | From Vercel Domain |
| 8 | `VITE_API_BASE_URL_DOCKER` | `https://srv_xxxxxxxx.runway.app` | ⬜ | Same as RUNWAY_API_URL |
| 9 | `VITE_VAPID_PUBLIC_KEY` | `BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA` | ⬜ | Use as-is |
| 10 | `CORS_ORIGIN` | `https://your-app.vercel.app` | ⬜ | No trailing / |
| 11 | `JWT_EXPIRES_IN` | `7d` | ⬜ | Default is 7 days |
| 12 | `SEED_ADMIN_EMAIL` | `owner@barbershop.com` | ⬜ | Change if desired |
| 13 | `SEED_ADMIN_PASSWORD` | `ChangeMe123!` | ⬜ | ⚠️ Change for prod |
| 14 | `SEED_SALON_NAME` | `Demo Salon` | ⬜ | Your salon name |
| 15 | `SEED_SALON_SLUG` | `demo-salon` | ⬜ | lowercase-hyphen |
| 16 | `SEED_SUPER_ADMIN_EMAIL` | `superadmin@barbershop.com` | ⬜ | Change if desired |
| 17 | `SEED_SUPER_ADMIN_PASSWORD` | `ChangeMe123!` | ⬜ | ⚠️ Change for prod |
| 18 | `SLACK_WEBHOOK` | `https://hooks.slack.com/...` | ⬜ | OPTIONAL |

---

## Generation Guide for Each Secret

### JWT_SECRET (Required)

**How to Generate:**

On your local machine:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output Example:**
```
a3f9c2e1b4d7c8f9e2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d
```

**Copy the entire output to GitHub Secret `JWT_SECRET`**

---

### MONGODB_URI (Required)

**Step 1:** Go to MongoDB Atlas
- https://cloud.mongodb.com → Click your cluster

**Step 2:** Click "Connect"

**Step 3:** Select "Connect your application"

**Step 4:** Copy connection string:
```
mongodb+srv://REDACTED:REDACTED@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Step 5:** Modify it:
- Replace `username` with your DB user (e.g., `barbershop_user`)
- Replace `password` with your DB password
- Add `/reservi` before `?` to specify database

**Final format:**
```
mongodb+srv://REDACTED:REDACTED@cluster0.xxxxx.mongodb.net/reservi?retryWrites=true&w=majority
```

**Verify it works locally:**
```bash
mongosh "mongodb+srv://REDACTED:REDACTED@cluster0.xxxxx.mongodb.net/reservi"
# Should show: test>
```

---

### RUNWAY_API_TOKEN (Required)

**Step 1:** Go to Runway Dashboard
- https://www.runwayapp.com → Sign in

**Step 2:** Click Account Settings (bottom left)

**Step 3:** Click "API Tokens"

**Step 4:** Click "Create Token"

**Step 5:** Set name to "GitHub Actions"

**Step 6:** Copy the token (it's a long string starting with `rw_`)

**Step 7:** Paste into GitHub Secret `RUNWAY_API_TOKEN`

---

### RUNWAY_SERVICE_ID (Required)

**Step 1:** Go to Runway Dashboard

**Step 2:** Click your service ("barber-backend")

**Step 3:** Click "Settings" (top right)

**Step 4:** Copy the **Service ID** field (looks like `srv_8a1b2c3d` or a UUID)

**Step 5:** Paste into GitHub Secret `RUNWAY_SERVICE_ID`

---

### RUNWAY_API_URL (Required - but set AFTER first deployment)

**Step 1:** After your backend is deployed to Runway:

**Step 2:** Go to Runway Dashboard → Service → Deployments

**Step 3:** Click the latest deployment

**Step 4:** Copy the URL shown (format: `https://srv_xxxxxxxx.runway.app`)

**Step 5:** Update GitHub Secret `RUNWAY_API_URL`

⚠️ **You can skip this initially, set it after first deployment**

---

### VERCEL_TOKEN (Required)

**Step 1:** Go to Vercel Dashboard
- https://vercel.com/dashboard

**Step 2:** Click Account Settings (bottom left)

**Step 3:** Click "Tokens"

**Step 4:** Click "Create Token"

**Step 5:** Name: "GitHub Actions"

**Step 6:** Expiration: "No Expiration" or yearly

**Step 7:** Copy the token

**Step 8:** Paste into GitHub Secret `VERCEL_TOKEN`

---

### VERCEL_PROJECT_URL (Required)

**Step 1:** Go to your Vercel Project
- https://vercel.com/dashboard → Your project

**Step 2:** Click "Settings"

**Step 3:** Click "Domains"

**Step 4:** Copy your domain (e.g., `your-app.vercel.app`)

⚠️ **Do NOT include `https://` prefix**

**Step 5:** Paste into GitHub Secret `VERCEL_PROJECT_URL`

---

## Default Values (Copy As-Is)

These don't need to be generated, just copy the value:

```
VITE_VAPID_PUBLIC_KEY=BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA

JWT_EXPIRES_IN=7d

SEED_ADMIN_EMAIL=owner@barbershop.com
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_SALON_NAME=Demo Salon
SEED_SALON_SLUG=demo-salon

SEED_SUPER_ADMIN_EMAIL=superadmin@barbershop.com
SEED_SUPER_ADMIN_PASSWORD=ChangeMe123!
```

⚠️ **Change password defaults for production!**

---

## Verification Checklist

After setting all secrets, verify:

```bash
# ✅ 1. Can push to GitHub
git push origin main

# ✅ 2. GitHub Actions starts
# GitHub → Actions → Latest workflow should show "Test" job running

# ✅ 3. Test stage passes
# Should see ✅ green checkmark for TypeScript compilation

# ✅ 4. Build stage succeeds
# Should see ✅ green checkmark for Docker builds

# ✅ 5. Check secret access (in logs)
# Logs should show deployment to Runway/Vercel without printing secrets

# ✅ 6. Deployment completes
# Should see ✅ green checkmark for deploy stages
```

---

## Troubleshooting Secrets

### "Secret not found in environment"

**Error message in logs:**
```
Error: RUNWAY_API_TOKEN is not set
```

**Fix:**
1. Go to GitHub → Settings → Secrets
2. Check that the secret name matches EXACTLY (case-sensitive)
3. Copy-paste from this guide to avoid typos

### "Invalid token" / "Unauthorized"

**Error message:**
```
401 Unauthorized
```

**Fix:**
1. Verify the token is correct (copy from dashboard again)
2. Check no extra spaces before/after token
3. If Runway: Token might have expired, generate new one
4. If Vercel: Create new token, update GitHub secret

### "MongoDB connection failed"

**Error message:**
```
MongooseError: connect ECONNREFUSED
```

**Fix:**
1. Verify MongoDB URI in secret is correct
2. Check IP whitelist in MongoDB Atlas (allow 0.0.0.0/0)
3. Test locally: `mongosh "YOUR_URI"`
4. Ensure `/reservi` is in the URI (database name)

### "CORS error from frontend"

**Error in browser console:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Fix:**
1. Get exact frontend URL from Vercel domain
2. Update GitHub Secret `CORS_ORIGIN` to match
3. Format: `https://your-app.vercel.app` (no trailing /)
4. Redeploy backend

---

## Security Best Practices

✅ **DO:**
- [ ] Store secrets in GitHub, never in code
- [ ] Use strong passwords (16+ chars for production)
- [ ] Rotate sensitive secrets monthly
- [ ] Use different passwords for dev/staging/production
- [ ] Enable 2FA on Vercel, Runway, GitHub accounts
- [ ] Review secret access logs regularly

❌ **DON'T:**
- [ ] Ever commit `.env` files to Git
- [ ] Share tokens in messages or emails
- [ ] Use same passwords across services
- [ ] Hardcode secrets in Docker files
- [ ] Log secrets to console
- [ ] Share GitHub Settings page screenshots

---

## Secret Rotation (Monthly)

```bash
# To rotate JWT_SECRET:
1. Generate new secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
2. Update GitHub Secret: JWT_SECRET
3. Old tokens become invalid immediately
4. Users must login again

# To rotate VERCEL_TOKEN:
1. Vercel Dashboard → Tokens → Create new
2. GitHub Secret: Update VERCEL_TOKEN
3. Old token still works until deleted from Vercel

# To rotate MONGODB credentials:
1. MongoDB Atlas → Database Users → Edit
2. Change password
3. Update GitHub Secret: MONGODB_URI
4. Test locally first
```

---

## Reference Checklist

```
Before first deployment:
☐ All 18 secrets (or 17 without Slack) configured
☐ JWT_SECRET generated (64 char hex)
☐ MONGODB_URI tested locally
☐ RUNWAY_API_TOKEN created
☐ RUNWAY_SERVICE_ID copied
☐ VERCEL_TOKEN created
☐ VERCEL_PROJECT_URL obtained
☐ VITE_API_BASE_URL_DOCKER same as RUNWAY_API_URL
☐ Passwords changed from defaults
☐ No secrets in Git repository
☐ All values copy-pasted exactly (no typos)

After first deployment:
☐ RUNWAY_API_URL obtained and set
☐ Health check: curl RUNWAY_API_URL/health → 200 OK
☐ Frontend can reach backend (check browser Network tab)
☐ Integration tests pass
```

---

**That's it! You're ready to deploy. 🚀**

Next: Go back to `PRODUCTION_DEPLOYMENT_GUIDE.md` and follow "Post-Deployment Verification"
