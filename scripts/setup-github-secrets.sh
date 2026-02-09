#!/bin/bash

# ============================================================================
# GitHub Secrets Setup Script
# Configure all required secrets in GitHub for Render + Vercel deployment
# ============================================================================

set -e

REPO_OWNER="montassar"
REPO_NAME="barber"
FULL_REPO="$REPO_OWNER/$REPO_NAME"

echo "🔐 GitHub Secrets Configuration for Render + Vercel Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is required. Install from: https://cli.github.com"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated to GitHub. Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Prompt for secrets
read -p "📦 Render API Key (from https://dashboard.render.com/settings/api-tokens): " RENDER_API_KEY
read -p "🆔 Render Service ID (from your Render service URL): " RENDER_SERVICE_ID
read -p "🌐 Render API URL (e.g., https://barber-backend.onrender.com): " RENDER_API_URL
read -p "✔️  Vercel Token (from https://vercel.com/account/tokens): " VERCEL_TOKEN
read -p "🆔 Vercel Project ID: " VERCEL_PROJECT_ID
read -p "👥 Vercel Org ID (leave blank if personal): " VERCEL_ORG_ID
read -p "🌐 Vercel Domain (e.g., barber.vercel.app): " VERCEL_DOMAIN
read -p "🔑 VAPID Public Key (from your push notification setup): " VITE_VAPID_PUBLIC_KEY
read -p "📊 MongoDB URI (mongodb+srv://REDACTED:REDACTED@cluster...): " MONGODB_URI

# Validate inputs
if [[ -z "$RENDER_API_KEY" ]] || [[ -z "$RENDER_SERVICE_ID" ]] || [[ -z "$RENDER_API_URL" ]]; then
    echo "❌ Render credentials are required"
    exit 1
fi

if [[ -z "$VERCEL_TOKEN" ]] || [[ -z "$VERCEL_PROJECT_ID" ]] || [[ -z "$VERCEL_DOMAIN" ]]; then
    echo "❌ Vercel credentials are required"
    exit 1
fi

echo ""
echo "📝 Setting up GitHub secrets for: $FULL_REPO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Set secrets
SECRETS=(
    "RENDER_API_KEY:$RENDER_API_KEY"
    "RENDER_SERVICE_ID:$RENDER_SERVICE_ID"
    "RENDER_API_URL:$RENDER_API_URL"
    "VERCEL_TOKEN:$VERCEL_TOKEN"
    "VERCEL_PROJECT_ID:$VERCEL_PROJECT_ID"
    "VERCEL_ORG_ID:$VERCEL_ORG_ID"
    "VERCEL_DOMAIN:$VERCEL_DOMAIN"
    "VITE_VAPID_PUBLIC_KEY:$VITE_VAPID_PUBLIC_KEY"
    "MONGODB_URI:$MONGODB_URI"
)

for SECRET in "${SECRETS[@]}"; do
    KEY="${SECRET%:*}"
    VALUE="${SECRET#*:}"
    
    if [[ -n "$VALUE" ]]; then
        echo -n "⏳ Setting $KEY... "
        echo "$VALUE" | gh secret set "$KEY" --repo "$FULL_REPO" 2>/dev/null && echo "✅" || echo "⚠️ (may already exist)"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ GitHub secrets configured successfully!"
echo ""
echo "📋 Verify secrets at:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
echo ""
echo "🚀 Next steps:"
echo "   1. Push changes to main branch: git push origin main"
echo "   2. GitHub Actions will automatically TEST → BUILD → DEPLOY"
echo "   3. Monitor deployment: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo "   4. View backend at: https://dashboard.render.com"
echo "   5. View frontend at: https://vercel.com"
