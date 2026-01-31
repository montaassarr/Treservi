# Treservi Barbershop Dashboard

Production-ready barber salon management dashboard with Staff Management feature.

## 🏗️ Project Structure

```
barber/
├── src/                  # Source code (organized)
│   ├── components/       # React components
│   │   ├── Dashboard.tsx
│   │   ├── Staff.tsx     # ✨ Staff Management (NEW)
│   │   ├── Login.tsx
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── services/         # API clients
│   │   ├── supabaseClient.ts
│   │   ├── staffService.ts
│   │   └── geminiService.ts
│   ├── utils/            # Utility functions and helpers
│   │   └── format.ts     # Centralized currency and number formatting (e.g. `0.000 TND`)
│   ├── App.tsx
│   ├── index.tsx
│   ├── index.css         # Tailwind imports
│   └── types.ts
├── supabase/             # Backend (separate)
│   ├── migrations/
│   │   └── 20260126000001_create_staff_tables.sql
│   └── functions/
│       ├── create-staff/         # Edge Function
│       └── reset-staff-password/ # Edge Function
├── index.html
├── tailwind.config.js    # ✅ Proper Tailwind (no CDN)
├── postcss.config.js
└── package.json
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```env
# Supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=REDACTED
VITE_SUPABASE_SERVICE_ROLE_KEY=REDACTED

# Optional
VITE_SALON_ID=your-salon-uuid
GEMINI_API_KEY=REDACTED
```

### 3. Start Supabase Backend

```bash
# Start all services (Postgres, Auth, API, Edge Functions)
npx supabase start

# Get credentials
npx supabase status
```

Copy the displayed URLs/keys to `.env.local`.

### 4. Deploy Edge Functions

```bash
npx supabase functions deploy create-staff
npx supabase functions deploy reset-staff-password
```

### 5. Run Frontend

```bash
npm run dev
```

Visit: **http://localhost:3000**

## 🧪 Testing Backend Endpoints

### Option 1: Use Test Script

```bash
chmod +x test-backend.sh
./test-backend.sh
```

### Option 2: Manual cURL

```bash
# 1. Create test salon
curl -X POST 'http://127.0.0.1:54321/rest/v1/salons' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test Salon", "owner_email": "owner@test.com"}'

# 2. Create staff via Edge Function
curl -X POST 'http://127.0.0.1:54321/functions/v1/create-staff' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "John Barber",
    "email": "john@test.com",
    "password": "secure123",
    "specialty": "Haircut",
    "salonId": "SALON_UUID_FROM_STEP1"
  }'

# 3. List all staff
curl 'http://127.0.0.1:54321/rest/v1/staff?select=*' \
  -H 'apikey: YOUR_ANON_KEY'
```

## ✨ Staff Management Feature

### Design System

- **Bento/Clay UI**: 32px radius, `shadow-[0_20px_50px_rgba(0,0,0,0.05)]`
- **Pills**: Rounded-full buttons with 3D effects
- **Clay Avatars**: Gradient backgrounds with inner shadows
- **Active Badges**: Emerald-themed status pills

### UI Flow

1. **Empty State**: 3D barber illustration + "Start your team" CTA
2. **Add Staff Button**: Opens highly-rounded modal
3. **Modal Form**:
   - Full Name (text input)
   - Email/Username (email input)
   - Password (with show/hide toggle)
   - Specialty (select: Haircut, Beard, Coloring, Styling)
4. **Staff Grid**: Clay-styled cards with avatars, specialties, status badges
5. **Owner Actions**: Reset Password & Delete (owner-only permissions)

### Backend Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Frontend   │ ───> │ Edge Function    │ ───> │ Supabase Auth   │
│ (Staff.tsx) │      │ (create-staff)   │      │ + Database      │
└─────────────┘      └──────────────────┘      └─────────────────┘
                              │
                              v
                     1. auth.admin.createUser()
                     2. INSERT INTO staff
                     3. Link salon_id
```

### Database Schema

```sql
-- salons table
CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- staff table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  specialty TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  avatar_url TEXT,
  salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Owners can manage their salon's staff only
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS (PostCSS, no CDN ✅) |
| **Backend** | Supabase (Postgres, Auth, Edge Functions) |
| **Icons** | Lucide React |
| **AI** | Google Gemini 3.0 Pro (optional) |

## 📦 Production

```bash
# Build
npm run build

# Preview production build
npm run preview
```

## 🐛 Troubleshooting

### Tailwind not loading
```bash
# Ensure Tailwind imports exist
cat src/index.css  # Should have @tailwind directives
grep "index.css" src/index.tsx  # Should import CSS
```

### Supabase errors
```bash
# Check status
npx supabase status

# View logs
npx supabase functions logs create-staff

# Restart
npx supabase stop && npx supabase start
```

### Staff creation fails
- ✅ Salon exists in DB
- ✅ Edge Function deployed
- ✅ Service role key valid
- ✅ RLS policies allow insert

## 📚 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

## 📄 License

MIT

---

**Built with ❤️ for Treservi**
