# 🔧 MONITORING & LOGGING SETUP

## Health Check Endpoints

### Backend Health Checks

1. **Health Check** (Detailed monitoring)
   ```
   GET https://barber-hcv8.onrender.com/health
   ```
   Response:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-02-09T14:30:00.000Z",
     "uptime": 12345,
     "mongodb": "connected",
     "memory": {
       "used": 45,
       "total": 128
     },
     "environment": "production"
   }
   ```

2. **Readiness Probe** (For container orchestration)
   ```
   GET https://barber-hcv8.onrender.com/ready
   ```
   Returns 200 if database is connected, 503 otherwise

3. **Liveness Probe** (For container orchestration)
   ```
   GET https://barber-hcv8.onrender.com/live
   ```
   Always returns 200 if server is running

## Docker Health Checks

Both Dockerfiles now include:
- Automatic health checks every 30 seconds
- Graceful shutdown handling (SIGTERM/SIGINT)
- Non-root user for security
- Proper signal handling with dumb-init

## Monitoring Tools Integration

### Option 1: UptimeRobot (Free)
1. Go to https://uptimerobot.com
2. Add monitor:
   - URL: https://barber-hcv8.onrender.com/health
   - Type: HTTP(s)
   - Interval: 5 minutes
   - Alert: Email/SMS when down

### Option 2: Better Uptime (Free tier)
1. Go to https://betteruptime.com
2. Create monitor for /health endpoint
3. Set up alerts via email/Slack

### Option 3: Datadog (Free tier for small apps)
1. Sign up at https://www.datadoghq.com
2. Install Datadog agent (if using dedicated server)
3. Monitor metrics, logs, and traces

### Option 4: Render Built-in Monitoring
- View logs: `render logs <service-id>`
- Metrics: Available in Render dashboard
- Alerts: Configure in Render settings

## CI/CD Monitoring

GitHub Actions now includes:
- ✅ Parallel testing (backend & frontend)
- ✅ Docker image builds with caching
- ✅ Security scans (npm audit)
- ✅ Deployment status summaries
- ✅ GitHub Actions summary with live URLs

## Logging Strategy

### Backend Logging
- ✅ Structured console logs with emojis for visibility
- ✅ Error stack traces in development
- ✅ MongoDB connection status
- ✅ Server startup information
- ✅ Graceful shutdown logs

### Recommended Log Aggregation
For production, consider:
1. **Papertrail** (Free tier)
2. **Logtail** (Free tier)
3. **Better Stack** (Free tier)

Add to Render:
```bash
# In Render dashboard > Environment
LOG_LEVEL=info
```

## Performance Monitoring

### Key Metrics to Track
1. Response time (target: <200ms)
2. Error rate (target: <1%)
3. Uptime (target: >99.9%)
4. Memory usage (alert if >80%)
5. Database connection pool

### Setup with Render
1. Dashboard > Service > Metrics
2. View: CPU, Memory, Network
3. Set up alerts for thresholds

## Security Monitoring

### npm Audit (Automated in CI/CD)
- Runs on every push to main
- Checks for known vulnerabilities
- Reports in GitHub Actions

### Manual Security Check
```bash
cd barber-backend-node && npm audit
cd barber-frontend && npm audit
```

### Recommended Security Tools
1. **Snyk** (Free for open source)
2. **Dependabot** (GitHub built-in)
3. **Socket.dev** (Free tier)

## Quick Monitoring Commands

```bash
# Check backend health
curl https://barber-hcv8.onrender.com/health

# Check if backend is ready
curl https://barber-hcv8.onrender.com/ready

# Check frontend
curl https://resevini.vercel.app

# Test backend API
curl https://barber-hcv8.onrender.com/api/salons

# View Render logs
render logs srv-<your-service-id>
```

## Alerts & Notifications

### Critical Alerts
- Database connection failure (immediate)
- API response time >5s (warning)
- Error rate >5% (immediate)
- Server down >2 minutes (immediate)

### Warning Alerts
- Memory usage >80%
- API response time >1s
- Failed health checks 3x in a row

## Dashboard URLs

- **GitHub Actions**: https://github.com/montaassarr/barber/actions
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Backend Health**: https://barber-hcv8.onrender.com/health
- **Frontend**: https://resevini.vercel.app

## Next Steps

1. ✅ Health endpoints implemented
2. ✅ Docker health checks configured
3. ✅ CI/CD pipeline enhanced
4. ✅ Graceful shutdown implemented
5. ⏭️ Choose monitoring service (UptimeRobot recommended)
6. ⏭️ Set up log aggregation (optional)
7. ⏭️ Configure alerts
