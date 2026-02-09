#!/bin/bash

# ============================================================================
# Render Backend Deployment Script
# Deploy backend to Render using Render CLI
# ============================================================================

set -e

RENDER_API_KEY="${1:-$RENDER_API_KEY}"
RENDER_SERVICE_ID="${2:-$RENDER_SERVICE_ID}"

echo "🚀 Deploying Backend to Render"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Render CLI is installed
if ! command -v render &> /dev/null; then
    echo "📦 Installing Render CLI..."
    npm install -g @render-api/cli
fi

# Validate inputs
if [[ -z "$RENDER_API_KEY" ]]; then
    read -p "📦 Render API Key: " RENDER_API_KEY
fi

if [[ -z "$RENDER_SERVICE_ID" ]]; then
    read -p "🆔 Render Service ID: " RENDER_SERVICE_ID
fi

if [[ -z "$RENDER_API_KEY" ]] || [[ -z "$RENDER_SERVICE_ID" ]]; then
    echo "❌ Render API key and Service ID are required"
    exit 1
fi

export RENDER_API_KEY

echo "✅ Credentials validated"
echo ""

# Build backend
echo "🔨 Building backend..."
cd barber-backend-node
npm ci
npm run build
cd ..
echo "✅ Backend built successfully"
echo ""

# Deploy to Render
echo "📤 Deploying to Render..."
echo "   Service ID: $RENDER_SERVICE_ID"
echo ""
echo "   Render will automatically deploy from GitHub:"
echo "   1. Watch deployment progress at:"
echo "      https://dashboard.render.com/services/$RENDER_SERVICE_ID"
echo ""
echo "   2. Check logs:"
echo "      render logs --service-id $RENDER_SERVICE_ID"
echo ""
echo "   3. Get deployment status:"
echo "      render list-deploys --service-id $RENDER_SERVICE_ID"
echo ""

echo "⏳ Waiting for deployment to complete..."
sleep 5

# Check deployment status
echo "📊 Checking deployment status..."
if command -v curl &> /dev/null; then
    for i in {1..30}; do
        BACKEND_URL=$(gh secret get RENDER_API_URL 2>/dev/null || echo "https://barber-backend.onrender.com")
        if curl -f "$BACKEND_URL/health" 2>/dev/null | grep -q '"status"'; then
            echo "✅ Backend is live!"
            echo "   URL: $BACKEND_URL"
            echo "   Health: $BACKEND_URL/health"
            exit 0
        fi
        echo "⏳ Waiting... (attempt $i/30)"
        sleep 10
    done
    echo "⚠️ Backend still starting. Check dashboard for full status"
else
    echo "ℹ️ Manual check: https://dashboard.render.com/services/$RENDER_SERVICE_ID"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Render deployment initiated!"
