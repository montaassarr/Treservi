#!/bin/bash

# ============================================================================
# Vercel Frontend Deployment Script
# Deploy frontend to Vercel using Vercel CLI
# ============================================================================

set -e

VERCEL_TOKEN="${1:-$VERCEL_TOKEN}"
VERCEL_PROJECT_ID="${2:-$VERCEL_PROJECT_ID}"

echo "🚀 Deploying Frontend to Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Validate inputs
if [[ -z "$VERCEL_TOKEN" ]]; then
    read -p "✔️  Vercel Token: " VERCEL_TOKEN
fi

if [[ -z "$VERCEL_PROJECT_ID" ]]; then
    read -p "🆔 Vercel Project ID: " VERCEL_PROJECT_ID
fi

if [[ -z "$VERCEL_TOKEN" ]] || [[ -z "$VERCEL_PROJECT_ID" ]]; then
    echo "❌ Vercel token and project ID are required"
    exit 1
fi

export VERCEL_TOKEN

echo "✅ Credentials validated"
echo ""

# Get Render API URL for frontend environment
RENDER_API_URL="${3:-https://barber-backend.onrender.com}"
VITE_VAPID_PUBLIC_KEY="${4:-$(gh secret get VITE_VAPID_PUBLIC_KEY 2>/dev/null || echo "")}"

# Build frontend
echo "🔨 Building frontend..."
cd barber-frontend
npm ci
npm run build
echo "✅ Frontend built successfully"
echo ""

# Deploy to Vercel
echo "📤 Deploying to Vercel..."
echo "   Project ID: $VERCEL_PROJECT_ID"
echo "   Backend URL: $RENDER_API_URL"
echo ""

vercel deploy \
    --prod \
    --token "$VERCEL_TOKEN" \
    --project-id "$VERCEL_PROJECT_ID" \
    --yes \
    --env VITE_API_BASE_URL="$RENDER_API_URL" \
    --env VITE_VAPID_PUBLIC_KEY="$VITE_VAPID_PUBLIC_KEY" \
    2>&1

DEPLOY_EXIT_CODE=$?

echo ""
cd ..

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo "✅ Frontend deployed successfully!"
    echo ""
    echo "📊 Checking deployment status..."
    
    # Wait for deployment to be ready
    sleep 10
    
    VERCEL_DOMAIN=$(gh secret get VERCEL_DOMAIN 2>/dev/null || echo "barber.vercel.app")
    FRONTEND_URL="https://$VERCEL_DOMAIN"
    
    if curl -f "$FRONTEND_URL" 2>/dev/null | grep -q "html"; then
        echo "✅ Frontend is live!"
        echo "   URL: $FRONTEND_URL"
    else
        echo "⏳ Frontend still initializing. Check at: $FRONTEND_URL"
    fi
    
    echo ""
    echo "🎉 Vercel deployment complete!"
    echo "   Dashboard: https://vercel.com"
else
    echo "❌ Deployment failed. Check logs above."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ All systems deployed!"
