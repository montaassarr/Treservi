# Local Setup - Important Notes

## ✅ Successfully Configured

All services are now running successfully on localhost!

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:10000  
- **MongoDB**: localhost:27018 → 27017 (container)

### Login Credentials
```
Email: owner@barbershop.com
Password: ChangeMe123!
```

## Key Configuration Details

### MongoDB Port Mapping
- **Host port**: 27018
- **Container port**: 27017
- **Reason**: Port 27017 was already in use on the host machine

### Environment Variables (Backend)
The backend uses **`MONGODB_URI`** (not `MONGO_URI`):
```bash
MONGODB_URI=mongodb://REDACTED:REDACTED@mongodb:27017/barber?authSource=admin
```

Inside the container, the backend connects to `mongodb:27017` (Docker service name).

### Quick Start
```bash
# Start all services
docker compose -f docker-compose.local.yml up -d

# Check status
docker ps

# View logs
docker compose -f docker-compose.local.yml logs -f

# Test backend health
curl http://localhost:10000/health

# Access frontend
open http://localhost:3000
```

### Running Services Outside Docker

#### Backend (faster development)
```bash
cd barber-backend-node
npm install
export MONGODB_URI="mongodb://REDACTED:REDACTED@localhost:27018/barber?authSource=admin"
export JWT_SECRET="REDACTED"
export PORT=10000
npm run dev
```

#### Frontend (faster development)
```bash
cd barber-frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:10000" > .env.local
npm run dev
# Access at http://localhost:5173
```

## Troubleshooting

### If MongoDB fails to start
```bash
# Check if port 27017 is in use
sudo lsof -i :27017

# Stop conflicting service or use the configured port 27018
```

### If backend can't connect to MongoDB
```bash
# Verify MongoDB is healthy
docker ps

# Check backend logs
docker logs reservi-backend

# Ensure MONGODB_URI environment variable is set correctly
docker exec reservi-backend env | grep MONGODB
```

### Fresh restart
```bash
# Stop and remove everything
docker compose -f docker-compose.local.yml down -v

# Start fresh
docker compose -f docker-compose.local.yml up -d --build
```

## Database Access

### MongoDB Shell (from host with mongosh installed)
```bash
mongosh "mongodb://REDACTED:REDACTED@localhost:27018/barber?authSource=admin"
```

### MongoDB Shell (via Docker)
```bash
docker exec -it reservi-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
use barber
db.users.find()
```

## Next Steps

1. Open http://localhost:3000 in your browser
2. Login with owner@barbershop.com / ChangeMe123!
3. Verify all features work correctly
4. Start developing! Make changes and rebuild:
   ```bash
   docker compose -f docker-compose.local.yml up -d --build backend
   ```
