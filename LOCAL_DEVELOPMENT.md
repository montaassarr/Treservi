# Local Development Setup Guide

## Prerequisites
- Docker Desktop installed and running
- Git installed
- At least 4GB of free disk space

## Quick Start

### 1. Clone the repository (if not already done)
```bash
git clone https://github.com/montaassarr/barber.git
cd barber
```

### 2. Start all services
```bash
# Start MongoDB, Backend, and Frontend
docker compose -f docker-compose.local.yml up -d

# Check logs
docker compose -f docker-compose.local.yml logs -f
```

### 3. Wait for services to be ready (~2-3 minutes)
The backend will automatically:
- Connect to MongoDB
- Run migrations
- Create the seed admin user

### 4. Access the application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:10000
- **MongoDB**: localhost:27017

### 5. Login Credentials
```
Email: owner@barbershop.com
Password: ChangeMe123!
```

## Managing Services

### Stop all services
```bash
docker compose -f docker-compose.local.yml down
```

### Stop and remove all data (fresh start)
```bash
docker compose -f docker-compose.local.yml down -v
```

### Restart a specific service
```bash
# Restart backend only
docker compose -f docker-compose.local.yml restart backend

# Restart frontend only
docker compose -f docker-compose.local.yml restart frontend
```

### View logs
```bash
# All services
docker compose -f docker-compose.local.yml logs -f

# Specific service
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend
docker compose -f docker-compose.local.yml logs -f mongodb
```

### Rebuild after code changes
```bash
# Rebuild and restart
docker compose -f docker-compose.local.yml up -d --build

# Rebuild specific service
docker compose -f docker-compose.local.yml up -d --build backend
```

## Database Management

### Access MongoDB Shell
```bash
docker exec -it reservi-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
```

### MongoDB Commands
```javascript
// Switch to barber database
use barber

// List all collections
show collections

// Find all users
db.users.find().pretty()

// Find all salons
db.salons.find().pretty()

// Find all appointments
db.appointments.find().pretty()

// Clear all appointments
db.appointments.deleteMany({})

// Reset database (drop and recreate)
db.dropDatabase()
```

### Backup Database
```bash
# Backup
docker exec reservi-mongodb mongodump --username admin --password admin123 --authenticationDatabase admin --db barber --out /data/backup

# Copy backup to host
docker cp reservi-mongodb:/data/backup ./mongodb-backup
```

### Restore Database
```bash
# Copy backup to container
docker cp ./mongodb-backup reservi-mongodb:/data/backup

# Restore
docker exec reservi-mongodb mongorestore --username admin --password admin123 --authenticationDatabase admin --db barber /data/backup/barber
```

## Troubleshooting

### Backend won't start - "Cannot connect to MongoDB"
```bash
# Check MongoDB is running
docker compose -f docker-compose.local.yml ps mongodb

# Check MongoDB logs
docker compose -f docker-compose.local.yml logs mongodb

# Restart MongoDB
docker compose -f docker-compose.local.yml restart mongodb
```

### Frontend shows blank page
```bash
# Check backend is running
curl http://localhost:10000/health

# Check frontend logs
docker compose -f docker-compose.local.yml logs frontend

# Rebuild frontend
docker compose -f docker-compose.local.yml up -d --build frontend
```

### Port already in use
```bash
# Check what's using the port
sudo lsof -i :10000  # Backend port
sudo lsof -i :3000   # Frontend port
sudo lsof -i :27017  # MongoDB port

# Stop the conflicting service or change ports in docker-compose.local.yml
```

### Fresh start (nuclear option)
```bash
# Stop everything
docker compose -f docker-compose.local.yml down -v

# Remove all images
docker compose -f docker-compose.local.yml down --rmi all

# Rebuild from scratch
docker compose -f docker-compose.local.yml up -d --build
```

## Development Workflow

### Making Backend Changes
1. Edit code in `barber-backend-node/src/`
2. Rebuild: `docker compose -f docker-compose.local.yml up -d --build backend`
3. Check logs: `docker compose -f docker-compose.local.yml logs -f backend`

### Making Frontend Changes
1. Edit code in `barber-frontend/src/`
2. Rebuild: `docker compose -f docker-compose.local.yml up -d --build frontend`
3. Clear browser cache and refresh

### Running Backend Outside Docker (for faster development)
```bash
cd barber-backend-node

# Install dependencies
npm install

# Set environment variables
export MONGO_URI="mongodb://REDACTED:REDACTED@localhost:27017/barber?authSource=admin"
export JWT_SECRET="REDACTED"
export PORT=10000
export CORS_ORIGIN="http://localhost:5173"

# Run dev server
npm run dev
```

### Running Frontend Outside Docker (for faster development)
```bash
cd barber-frontend

# Install dependencies
npm install

# Create .env.local file
echo "VITE_API_BASE_URL=http://localhost:10000" > .env.local

# Run dev server
npm run dev
# Access at http://localhost:5173
```

## Environment Variables

All environment variables can be customized in `docker-compose.local.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://REDACTED:REDACTED@mongodb:27017/barber?authSource=admin` | MongoDB connection string |
| `JWT_SECRET` | `your-local-jwt-secret-key-change-in-production` | JWT signing key |
| `PORT` | `10000` | Backend port |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:5173` | Allowed origins |
| `SEED_ADMIN_EMAIL` | `owner@barbershop.com` | Initial admin email |
| `SEED_ADMIN_PASSWORD` | `ChangeMe123!` | Initial admin password |
| `VITE_API_BASE_URL` | `http://localhost:10000` | Frontend API URL |

## API Endpoints

### Health Check
```bash
curl http://localhost:10000/health
```

### Seed Database
```bash
curl -X POST http://localhost:10000/api/seed/init
```

### Login
```bash
curl -X POST http://localhost:10000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@barbershop.com","password":"ChangeMe123!"}'
```

## Tips

1. **Use Docker logs**: They show all errors and debug info
2. **Clear browser cache**: After rebuilding frontend
3. **Check MongoDB connection**: Most backend errors are MongoDB-related
4. **Use separate terminals**: One for logs, one for commands
5. **Keep Docker Desktop open**: It shows resource usage

## Need Help?

- Check logs first: `docker compose -f docker-compose.local.yml logs -f`
- Restart services: `docker compose -f docker-compose.local.yml restart`
- Fresh start: `docker compose -f docker-compose.local.yml down -v && docker compose -f docker-compose.local.yml up -d --build`
