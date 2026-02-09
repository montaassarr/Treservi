# Docker Setup Guide

## Quick Start

```bash
# Start all services (MongoDB, Backend API, Frontend)
./docker.sh up

# View logs
./docker.sh logs

# Seed database with demo data
./docker.sh seed

# Stop all services
./docker.sh down
```

## Services

### MongoDB (reservi-mongodb)
- Image: mongo:7.0
- Port: 27017
- Username: admin
- Password: password123
- Database: reservi

### Backend API (reservi-backend)
- Image: barber-backend-node (built from ./barber-backend-node)
- Port: 4000
- Environment: Node.js production mode
- Health check: /health

### Frontend (reservi-frontend)
- Image: barber-frontend (built from ./barber-frontend)
- Port: 3000
- Environment: Served via nginx

## Environment Variables

Create or update `.env` in the project root:

```
JWT_SECRET=REDACTED
SEED_ADMIN_EMAIL=owner@example.com
SEED_ADMIN_PASSWORD=YourPassword123!
SEED_SALON_NAME=My Salon
SEED_SALON_SLUG=my-salon
VITE_VAPID_PUBLIC_KEY=your-vapid-key
```

## Common Commands

```bash
# Build images (useful after code changes)
./docker.sh build

# Full restart
./docker.sh down && ./docker.sh up

# Backend logs
./docker.sh logs backend

# Execute commands in containers
docker-compose exec backend npm run seed
docker-compose exec mongodb mongosh

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin

# Check service status
./docker.sh ps
```

## Port Mapping

| Service | Local Port | Container Port |
| --- | --- | --- |
| Frontend | 3000 | 80 |
| Backend API | 4000 | 4000 |
| MongoDB | 27017 | 27017 |

## Troubleshooting

### MongoDB won't start
```bash
# Reset MongoDB volume
docker volume rm reservi_mongodb-data
./docker.sh down && ./docker.sh up
```

### Backend can't connect to MongoDB
- Ensure MongoDB is running: `./docker.sh ps`
- Check logs: `./docker.sh logs backend`
- Verify connection string in env vars

### Frontend shows API errors
- Ensure backend is healthy: `./docker.sh logs backend`
- Check `VITE_API_BASE_URL` env var
- Verify CORS settings in backend

## Production Notes

For production deployment:
1. Change MongoDB password in docker-compose.yml
2. Use strong JWT_SECRET
3. Update CORS_ORIGIN to your frontend domain
4. Consider using managed MongoDB (Atlas)
5. Use proper SSL certificates
6. Set NODE_ENV=production
