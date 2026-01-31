#!/bin/bash

# Setup script to create demo owner and staff accounts in Supabase

SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_ANON_KEY="REDACTED"

echo "🔧 Setting up Barber Salon Management System"
echo "=============================================="
echo ""

# Step 1: Create salon via REST API
echo "📍 Step 1: Creating salon..."
SALON=$(curl -s -X POST "$SUPABASE_URL/rest/v1/salons" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "name": "Main Barber Shop",
    "owner_email": "owner@barbershop.com"
  }')

echo "Response: $SALON"
SALON_ID=$(echo "$SALON" | jq -r '.[0].id' 2>/dev/null)

if [ "$SALON_ID" != "null" ] && [ ! -z "$SALON_ID" ]; then
  echo "✅ Salon created: $SALON_ID"
else
  echo "⚠️  Could not parse salon ID, will use fallback"
  SALON_ID="salon-1"
fi

echo ""
echo "📍 Step 2: Owner account details"
echo "Email: owner@barbershop.com"
echo "Password: password123"
echo "Note: Create this account via Supabase Auth dashboard or use: supabase auth signup"
echo ""

echo "📍 Step 3: Create staff members via Edge Function"
echo "Endpoint: POST /functions/v1/create-staff"
echo ""

# Test staff creation
STAFF1=$(curl -s -X POST "$SUPABASE_URL/functions/v1/create-staff" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Smith",
    "email": "john@barbershop.com",
    "password": "john123456",
    "specialty": "Haircut",
    "salonId": "'$SALON_ID'"
  }')

echo "Staff 1 Response: $STAFF1"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "📋 Test Credentials:"
echo "==================="
echo "Owner Email: owner@barbershop.com"
echo "Owner Password: password123"
echo ""
echo "Staff 1 Email: john@barbershop.com"
echo "Staff 1 Password: john123456"
echo ""
echo "🚀 Next steps:"
echo "1. Start the frontend: cd barber-frontend && npm run dev"
echo "2. Login with owner credentials"
echo "3. Add more staff members using the dashboard"
