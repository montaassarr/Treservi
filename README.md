# Reservi - Multi-Tenant Barber Salon Management System

A comprehensive salon management platform with multi-tenant support, online booking, staff management, and AI-powered features.

## 🏗️ Project Structure

```
reservi/
├── barber-backend/          # Supabase backend
│   ├── supabase/
│   │   ├── functions/      # Edge Functions (Deno)
│   │   └── migrations/     # Database migrations
│   ├── docker/             # Kong API Gateway config
│   └── setup-demo.sh       # Demo data script
├── barber-frontend/        # Main admin dashboard (React + Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── translations/  # i18n translations
│   └── Dockerfile         # Docker build config
├── .github/workflows/     # CI/CD pipelines
├── comprehensive_test.py  # Integration test suite
├── docker-compose.yml     # Local development stack
└── README.md             # This file
```

## 🚀 Features

### Multi-Tenant Architecture
- **Salon Isolation**: Each salon has its own data and users
- **Role-Based Access Control (RBAC)**: Super Admin, Owner, Staff roles
- **Custom Domains**: Each salon can have a unique booking URL

### Core Functionality
- **Staff Management**: CRUD operations for staff members
- **Service Management**: Define services with pricing and duration
- **Appointment Booking**: Public booking interface + admin management
- **Dashboard Analytics**: Real-time insights for salon owners
- **AI Assistant**: Powered by Google Gemini for customer support

### Technical Features
- **Real-time Updates**: WebSocket-based live data
- **Offline Support**: PWA with service workers
- **Internationalization**: Multi-language support (EN, FR, AR)
- **Responsive Design**: Mobile-first UI with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Supabase JS Client** for API/Auth

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Edge Functions)
- **Deno** for Edge Functions
- **Row Level Security (RLS)** for data isolation

### DevOps
- **Docker** + **Docker Compose** for local development
- **GitHub Actions** for CI/CD
- **Vercel** for frontend hosting
- **Supabase Cloud** for backend hosting

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Python 3.12+ (for testing)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/montaassarr/reservi.git
   cd reservi
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local .env
   # Edit .env with your credentials
   ```

3. **Start the Docker stack**
   ```bash
   docker compose up -d
   ```

4. **Run database migrations**
   ```bash
   cd barber-backend
   docker exec -i supabase-db psql -U postgres -d postgres < supabase/migrations/*.sql
   ```

5. **Start the frontend**
   ```bash
   cd barber-frontend
   npm install
   npm run dev
   ```

6. **Access the applications**
   - Frontend: http://localhost:5173
   - Supabase Studio: http://localhost:54323
   - API Gateway: http://localhost:54321

### Create Super Admin

```bash
cd barber-backend
docker exec -i supabase-db psql -U postgres -d postgres < supabase/migrations/20260201000004_create_super_admin_user.sql
```

**Credentials:**
- Email: `superadmin@reservi.com`
- Password: `SuperAdmin123!`

## 🧪 Testing

### Run Integration Tests
```bash
# Setup Python environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install requests python-dotenv

# Run tests
export $(cat .env | xargs)
python comprehensive_test.py
```

### Test Coverage
- ✅ Tenant creation and isolation
- ✅ User authentication (login/signup)
- ✅ Services CRUD operations
- ✅ Staff management
- ✅ Appointment booking
- ✅ Role-based access control

## 🚀 Deployment

### Automated Deployment (CI/CD)

Push to `main` branch triggers automatic deployment:

1. **Test Stage**: Runs all tests
2. **Build Stage**: Creates production builds
3. **Deploy Stage**: Deploys to Vercel + Supabase

### Manual Deployment

#### Deploy to Supabase
```bash
cd barber-backend
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
supabase functions deploy
```

#### Deploy to Vercel
```bash
cd barber-frontend
vercel --prod
```

## 📚 Documentation

- [CI/CD Workflows](.github/workflows/README.md)
- [API Documentation](barber-backend/README.md)
- [Frontend Guide](barber-frontend/README.md)

## 🔒 Security

- **Row Level Security (RLS)**: All tables protected by RLS policies
- **JWT Authentication**: Secure token-based auth
- **API Key Rotation**: Regular credential rotation
- **Input Validation**: Server-side validation for all inputs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Montassar** - [@montaassarr](https://github.com/montaassarr)

## 🙏 Acknowledgments

- Supabase for the amazing BaaS platform
- Vercel for frontend hosting
- Google Gemini for AI capabilities

---

**Need Help?** Open an issue or contact support@reservi.com
