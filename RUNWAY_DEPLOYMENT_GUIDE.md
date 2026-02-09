# Runway Deployment Guide

## Overview
This guide covers deploying the barber-backend-node to Runway with MongoDB Atlas.

---

## Architecture
```
Frontend (Vercel)
    ↓ API calls
Backend (Runway)
    ↓ Database operations
MongoDB (MongoDB Atlas)
```

---

## Step 1: MongoDB Atlas Setup

### Create Free MongoDB Atlas Cluster
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free account)
3. Create Organization and Project
4. Click "Build a Cluster"
5. Choose:
   - Provider: AWS/Azure/GCP (pick region close to users)
   - Tier: M0 (Free, 512MB storage)
6. Create cluster

### Get Connection String
1. In Atlas Dashboard → "Connect"
2. Choose "Drivers" method
3. Copy connection string: `mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/?retryWrites=true&w=majority`
4. Replace `username` and `password` with your credentials
5. Add `/reservi` after domain: `mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi?retryWrites=true&w=majority`

### Whitelist IP Address
1. In Atlas → "Security" → "Network Access"
2. Add IP Address: `0.0.0.0/0` (allows all - for production use specific IPs)

---

## Step 2: Prepare Backend for Deployment

### Update Dockerfile (Already Done)
Your Dockerfile is now optimized for production:
- Multi-stage build (builder + production)
- Only production dependencies in final image
- Compiles TypeScript to JavaScript

### Update .env.example (Already Done)
Used by Runway to know what variables to expect.

---

## Step 3: Deploy to Runway

### Create Runway Account
1. Go to https://runway.dev
2. Sign up (free tier available)
3. Connect GitHub account

### Create Deployment
1. Click "New Project"
2. Select repository: `montaassarr/barber`
3. Select branch: `main`
4. Select service directory: `barber-backend-node/` (or let it auto-detect)
5. Runtime: Node.js (auto-detected from package.json)
6. Build command: `npm run build`
7. Start command: `node dist/server.js`

### Set Environment Variables
In Runway Dashboard → Project Settings → Environment Variables, add:

```
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi?retryWrites=true&w=majority
JWT_SECRET=REDACTED
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-vercel-frontend.vercel.app
SEED_ADMIN_EMAIL=owner@barbershop.com
SEED_ADMIN_PASSWORD=YourSecurePassword123!
SEED_SALON_NAME=Demo Salon
SEED_SALON_SLUG=demo-salon
SEED_SUPER_ADMIN_EMAIL=superadmin@barbershop.com
SEED_SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Deploy
1. Click "Deploy" button
2. Wait for build and deployment (~2-3 minutes)
3. Get your Runway URL: `https://your-service-id.runway.app`

---

## Step 4: Update Frontend (Vercel)

### Add Environment Variable
In Vercel Dashboard:
1. Go to your project settings
2. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-service-id.runway.app
   ```

### Redeploy Frontend
```bash
git push origin main  # Vercel will auto-redeploy
```

---

## Step 5: Verify Deployment

### Test Backend Health
```bash
curl https://your-service-id.runway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production"
}
```

### Test Frontend Connection
1. Open your Vercel frontend URL
2. Check browser console for errors
3. Try logging in - should work with backend data

### Monitor Logs
In Runway Dashboard → Logs, you can see:
- Build logs
- Runtime logs
- Errors and warnings

---

## MongoDB Database Setup

### Initialize Data
Option 1: Run seed from Runway dashboard (if endpoint available)
```
POST https://your-service-id.runway.app/api/seed
```

Option 2: Manual MongoDB import
```bash
mongoimport --uri "mongodb+srv://REDACTED:REDACTED@cluster.mongodb.net/reservi" --collection users --file users.json
```

Option 3: Use MongoDB Atlas UI to create initial admin user

---

## Environment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Connection string obtained and tested
- [ ] Backend variables set in Runway
- [ ] Frontend VITE_API_BASE_URL updated in Vercel
- [ ] CORS_ORIGIN matches your frontend URL
- [ ] JWT_SECRET is strong and random
- [ ] Backend deployment successful
- [ ] Frontend redeploy completed
- [ ] Health endpoint responds
- [ ] Login test successful

---

## Troubleshooting

### Backend won't start
- Check logs in Runway dashboard
- Verify MongoDB connection string is correct
- Ensure all required env variables are set
- Check PORT is 4000

### Frontend can't connect to backend
- Verify VITE_API_BASE_URL is correct
- Check CORS_ORIGIN matches frontend URL
- Check browser console for CORS errors
- Verify backend health endpoint works

### Database connection fails
- Check MongoDB credentials
- Verify IP whitelist includes 0.0.0.0/0 or Runway IP
- Test connection from local: `mongosh "your-connection-string"`
- Check database exists: `reservi`

### Changes not reflecting
- Clear browser cache (Ctrl+Shift+Del)
- Hard refresh (Ctrl+Shift+R)
- Check that Vercel/Runway redeployment completed

---

## Production Checklist

- [ ] Use strong JWT secret (32+ chars)
- [ ] Set NODE_ENV=production
- [ ] Configure CORS for production domain only
- [ ] Use MongoDB Atlas IP whitelist (not 0.0.0.0)
- [ ] Enable MongoDB backups
- [ ] Set up Runway monitoring/alerts
- [ ] Use HTTPS only (Runway provides SSL)
- [ ] Regular database backups
- [ ] Monitor API response times
- [ ] Set up error tracking (Sentry, etc.)

---

## Cost Estimation

- **MongoDB Atlas M0 (Free)**: Free tier, 512MB storage
- **Runway**: Free tier available, pay-as-you-go for production (~$0.10-1.00/day)
- **Vercel Frontend**: Free tier or ~$20/month Pro

---

## Local Development (Keep Your Current Setup)

Your docker-compose.yml for local dev remains unchanged:
```bash
docker-compose up  # Runs MongoDB locally + backend locally
```

---

## Next Steps

1. Set up MongoDB Atlas account and cluster
2. Get connection string
3. Deploy to Runway with variables
4. Update Vercel with new backend URL
5. Test thoroughly
6. Monitor logs for issues

Need help? Check Runway docs: https://docs.runway.dev
