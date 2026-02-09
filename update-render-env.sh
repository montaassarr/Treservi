#!/bin/bash

RENDER_API_KEY="rnd_QsSLvvtS3xCcGHgYbNPNaOyGYb8g"
SERVICE_ID="barber-hcv8"

echo "🔄 Updating Render environment variables..."

# Update environment variables
curl -X PUT "https://api.render.com/v1/services/srv-${SERVICE_ID}" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "envVars": [
      {
        "key": "NODE_ENV",
        "value": "production"
      },
      {
        "key": "PORT",
        "value": "4000"
      },
      {
        "key": "MONGODB_URI",
        "value": "mongodb+srv://REDACTED:REDACTED@barber.kveiwll.mongodb.net/barber?retryWrites=true&w=majority&appName=barber"
      },
      {
        "key": "JWT_SECRET",
        "value": "your-super-secure-jwt-secret-change-in-production-now"
      },
      {
        "key": "JWT_EXPIRES_IN",
        "value": "7d"
      },
      {
        "key": "CORS_ORIGIN",
        "value": "https://resevini.vercel.app"
      },
      {
        "key": "SEED_ADMIN_EMAIL",
        "value": "owner@barbershop.com"
      },
      {
        "key": "SEED_ADMIN_PASSWORD",
        "value": "ChangeMe123!"
      },
      {
        "key": "SEED_SALON_NAME",
        "value": "Demo Salon"
      },
      {
        "key": "SEED_SALON_SLUG",
        "value": "demo-salon"
      }
    ]
  }'

echo ""
echo "✅ Environment variables updated"
echo "🔄 Triggering redeploy..."

# Trigger redeploy
curl -X POST "https://api.render.com/v1/services/srv-${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json"

echo ""
echo "✅ Redeploy triggered!"
echo "📊 Check status at: https://dashboard.render.com/web/srv-${SERVICE_ID}"

