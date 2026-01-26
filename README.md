# Barber Salon Management System

## Architecture Overview

```
barber-frontend/     - React + TypeScript + Vite frontend
barber-backend/      - Supabase configuration & Edge Functions
├── supabase/
│   ├── migrations/   - SQL database schemas
│   └── functions/    - Edge Functions for backend operations
```

## Database Schema

### Salons Table
```sql
CREATE TABLE salons (
  id UUID PRIMARY KEY,
  name TEXT,
  owner_email TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Staff Table
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY (references auth.users),
  full_name TEXT,
  email TEXT UNIQUE,
  specialty TEXT,
  status TEXT,
  avatar_url TEXT,
  salon_id UUID (references salons),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Row-Level Security (RLS)

All tables have RLS enabled:
- **Owners** can only see/manage staff for their salon
- **Staff** can only view their own profile
- **Salon creation** restricted to authenticated users

## Backend API Endpoints

### Edge Functions

#### 1. Create Staff
```bash
POST /functions/v1/create-staff
Content-Type: application/json

{
  "fullName": "John Smith",
  "email": "john@barbershop.com",
  "password": "securepass123",
  "specialty": "Haircut",
  "salonId": "uuid-here"
}
```

**Response:**
```json
{
  "data": {
    "id": "user-uuid",
    "full_name": "John Smith",
    "email": "john@barbershop.com",
    "specialty": "Haircut",
    "salon_id": "salon-uuid",
    "status": "Active"
  },
  "message": "Staff member created successfully"
}
```

#### 2. Reset Staff Password
```bash
POST /functions/v1/reset-staff-password
Content-Type: application/json

{
  "email": "john@barbershop.com"
}
```

## Frontend Features

### Authentication
- Real Supabase authentication for owners
- Session persistence
- Logout functionality

### Staff Management
- ✅ Create staff (owner only)
- ✅ Read/View staff list
- ✅ Update staff info
- ✅ Delete staff
- ✅ View staff stats (earnings, appointments)
- ✅ Manage clients assigned to staff

### UI/UX
- Responsive grid layout
- Compact card design to prevent text overflow
- Dark mode support
- Real-time status updates

## Setup Instructions

### 1. Start Supabase Local Environment

```bash
# Install Supabase CLI if not already installed
# For macOS/Linux:
brew install supabase/tap/supabase

# Start local Supabase
cd barber-backend
supabase start
```

### 2. Create Demo Owner Account

```bash
# Use Supabase Studio (http://localhost:54321)
# Go to Auth > Users > Create new user
# Email: owner@barbershop.com
# Password: password123
```

### 3. Create Salon via SQL

```bash
# Run in Supabase Studio Query Editor:
INSERT INTO salons (name, owner_email) 
VALUES ('Main Barber Shop', 'owner@barbershop.com');
```

### 4. Start Frontend

```bash
cd barber-frontend
npm install
npm run dev
```

**Frontend runs on:** http://localhost:3000

### 5. Login & Test

```
Email: owner@barbershop.com
Password: password123
```

Then:
1. Navigate to Staff Management
2. Click "Add New Staff"
3. Create test staff members
4. View their stats and clients

## Testing Edge Functions

```bash
# Test create-staff endpoint
curl -X POST http://localhost:54321/functions/v1/create-staff \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "email": "jane@barbershop.com",
    "password": "jane123456",
    "specialty": "Coloring",
    "salonId": "<salon-uuid-here>"
  }'
```

## Environment Variables

### Frontend (.env.local)
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=REDACTED
```

### Backend (config.json in Supabase)
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Docker Quickstart (frontend + Supabase)
1) Copy env template and set secrets (keys signed with the same JWT secret):
```bash
cp .env.local.example .env.local
# edit .env.local -> POSTGRES_PASSWORD, JWT_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```
2) Build and start everything:
```bash
docker compose --env-file .env.local up --build
```
Services:
- Frontend: http://localhost:3000
- Supabase gateway (auth/rest/realtime/storage): http://localhost:54321
- Postgres: localhost:5432
- Supabase Studio: http://localhost:54323

## Supabase client env (Vite)
- Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (already wired in `supabaseClient.ts` and the Dockerfile).
- Do **not** use Next.js names (`NEXT_PUBLIC_*`) in this Vite app.

## Connectivity smoke test (Tenants)
- Component: `src/components/TestTenants.tsx`
- Renders on the dashboard in `App.tsx`.
- Runs `supabase.from('Tenants').select('*').limit(1)` and shows:
  - Data row (success), or
  - “Supabase client not initialized” (env missing), or
  - “No rows returned…RLS may be blocking” (policy issue).

## RLS debug steps (multi-tenant)
1) Verify data exists: `select * from "Tenants" limit 1;`
2) Compare anon vs service role:
```bash
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" http://localhost:54321/rest/v1/Tenants?select=*&limit=1
curl -H "apikey: $SUPABASE_ANON_KEY" http://localhost:54321/rest/v1/Tenants?select=*&limit=1
```
   - If service-role returns rows but anon returns empty/403, RLS is blocking.
3) Ensure JWT claims include the tenant identifier your policies expect (e.g., `tenant_id`).
4) Example policy pattern:
```sql
create policy "tenant_read" on "Tenants"
for select using ( tenant_id::text = current_setting('request.jwt.claims', true)::json->>'tenant_id' );
```

## Troubleshooting

### Staff not loading?
- Check if Supabase is running: `supabase status`
- Verify owner_email matches salon record
- Check RLS policies are correct

### Can't create staff?
- Ensure owner is authenticated
- Verify salonId exists in database
- Check Edge Function logs: `supabase functions list`

### Authentication fails?
- Clear browser cookies
- Check email/password in Supabase Auth
- Verify CORS settings

## Demo Data

### Owner Account
- Email: `owner@barbershop.com`
- Password: `password123`
- Salon: Main Barber Shop

### Test Staff (created via UI)
- Staff members auto-create with given credentials
- Can immediately login as staff
- View earnings and client assignments

## Feature Checklist

- [x] Real Supabase authentication
- [x] Owner account creation
- [x] Staff CRUD operations
- [x] Edge Functions for secure staff creation
- [x] Row-Level Security policies
- [x] Real-time stats tracking
- [x] Client management
- [x] Responsive card layout
- [x] Dark mode support
- [x] Mock data fallback

## Next Steps

1. Deploy to production (Vercel for frontend, Supabase cloud for backend)
2. Add payment integration
3. Implement appointment booking
4. Add email notifications
5. Mobile app for staff members

## Support

For issues or questions, check:
- Supabase logs: `supabase logs`
- Frontend console: Browser DevTools
- Network requests: Check Chrome DevTools Network tab
