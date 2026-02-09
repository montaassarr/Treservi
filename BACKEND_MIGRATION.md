# Backend Node API Implementation Summary

## Migration from Supabase → Node.js + MongoDB

### Tech Stack Saved
✅ Frontend: React + Vite + TypeScript + Tailwind  
✅ Backend: Express.js + Node.js  
✅ Database: MongoDB (7.0)  
✅ Auth: JWT (7-day tokens)  
✅ Deployment: Docker Compose (3 containers)  

---

## What's New

### Backend Services (barber-backend-node)

**1. Authentication (`/api/auth`)**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password (returns JWT)
- `GET /auth/me` - Get current user profile (requires Bearer token)

**2. Salons (`/api/salons`)**
- `GET /salons/slug/:slug` - Fetch salon by slug
- `GET /salons/:id` - Fetch salon by ID

**3. Services (`/api/services`)**
- `GET /services?salonId=...` - List salon services
- `POST /services` - Create service (auth required)
- `PATCH /services/:id` - Update service
- `DELETE /services/:id` - Soft delete service
- `DELETE /services/:id/hard` - Hard delete service

**4. Push Subscriptions (`/api/push-subscriptions`)**
- `POST /push-subscriptions` - Save push notification endpoint (auth required)

---

## Frontend Changes

### New API Client (`src/services/apiClient.ts`)
Replaces Supabase client with:
- `apiClient.login(email, password)` → JWT token + user data
- `apiClient.getMe()` → Current user profile
- `apiClient.getSalonBySlug(slug)` → Salon data
- `apiClient.fetchServices(salonId)` → Services list
- `apiClient.savePushSubscription(payload)` → Store push endpoint

### Updated Components
- ✅ `LoginPage.tsx` - Uses apiClient
- ✅ `Login.tsx` - Uses apiClient
- ✅ `SalonContext.tsx` - Uses apiClient for salon fetch
- ✅ `usePushNotifications.ts` - Uses apiClient
- ✅ `serviceService.ts` - Uses apiClient
- ✅ `App.tsx` - Token-based auth instead of Supabase listener

### Environment Variables
```
VITE_API_BASE_URL=http://localhost:4000  # New!
VITE_VAPID_PUBLIC_KEY=...
```

---

## Docker Containers

1. **reservi-mongodb** (mongo:7.0)
   - Port: 27017
   - Data persisted in `mongodb-data` volume

2. **reservi-backend** (Node.js + Express)
   - Port: 4000
   - Builds from `./barber-backend-node/Dockerfile`
   - Health check: GET /health

3. **reservi-frontend** (React + Nginx)
   - Port: 3000
   - Builds from `./barber-frontend/Dockerfile`
   - Uses `VITE_API_BASE_URL` at build time

---

## Getting Started

```bash
# 1. Update env vars (optional)
cp .env.local .env.local
# Edit as needed

# 2. Start services
./docker.sh up

# 3. Wait for services to be healthy
docker-compose ps

# 4. Seed database (creates demo salon + owner)
./docker.sh seed

# 5. Access
# Frontend: http://localhost:3000
# API: http://localhost:4000
# MongoDB: mongodb://REDACTED:REDACTED@localhost:27017
```

### Demo Credentials (after seeding)
- Email: owner@barbershop.com
- Password: ChangeMe123!

---

## MongoDB Models

1. **User** - Email, password hash, role, salon reference
2. **Salon** - Name, slug, owner email, address, contact info
3. **Service** - Name, price, duration, salon reference
4. **PushSubscription** - Endpoint, keys for web push

---

## Next Steps

- [ ] Implement Staff management endpoints
- [ ] Implement Appointments endpoints
- [ ] Add email notifications (SendGrid/Resend)
- [ ] Add web push notifications (Firebase/web-push)
- [ ] Implement file uploads (cloud storage)
- [ ] Add analytics/dashboard endpoints
- [ ] Setup CI/CD pipeline
- [ ] Deploy to production (Render, Railway, Fly.io)

---

## Files Created/Modified

### New
- `barber-backend-node/` - Complete Node.js backend
- `barber-frontend/src/services/apiClient.ts` - API client
- `docker-compose.yml` - Updated to MongoDB + Node.js
- `Dockerfile` (backend) - Node.js app build
- `docker.sh` - Helper script
- `DOCKER_SETUP.md` - Docker guide

### Modified
- `barber-frontend/src/pages/LoginPage.tsx`
- `barber-frontend/src/components/Login.tsx`
- `barber-frontend/src/context/SalonContext.tsx`
- `barber-frontend/src/hooks/usePushNotifications.ts`
- `barber-frontend/src/services/serviceService.ts`
- `barber-frontend/src/App.tsx`
- `.env.local` - New env structure
- `.env.example` - Frontend env

---

## Key Differences from Supabase

| Feature | Supabase | Node + Mongo |
|---------|----------|-------------|
| Auth | Built-in (GoTrue) | JWT tokens |
| Database | PostgreSQL | MongoDB |
| Real-time | WebSocket (Realtime) | Not included (can add Socket.io) |
| File Storage | Storage API | Not included (use cloud storage) |
| Functions | Edge Functions | Express route handlers |
| Admin UI | Supabase Studio | MongoDB Compass (external) |

---

## Notes

- Remove `supabaseClient.ts` once all components migrated
- JWT expires in 7 days; implement refresh token logic if needed
- MongoDB URI uses Docker network DNS (`mongodb:27017`)
- CORS is set to `http://localhost:3000` in dev
