#!/bin/bash

# Test script for Supabase backend endpoints
# Usage: ./test-backend.sh

echo "🧪 Testing Supabase Backend Endpoints"
echo "======================================"
echo ""

# Wait for Supabase to be ready
echo "⏳ Waiting for Supabase to start..."
sleep 5

# Get Supabase status
echo "📊 Checking Supabase status..."
npx supabase status

echo ""
echo "======================================"
echo "📝 Test Instructions:"
echo ""
echo "1. Get your local Supabase credentials from the output above"
echo "2. Create a test salon:"
echo ""
echo "   curl -X POST 'http://127.0.0.1:54321/rest/v1/salons' \\"
echo "     -H 'apikey: YOUR_ANON_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -d '{\"name\": \"Test Salon\", \"owner_email\": \"owner@test.com\"}'"
echo ""
echo "3. Test create-staff Edge Function:"
echo ""
echo "   curl -X POST 'http://127.0.0.1:54321/functions/v1/create-staff' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{"
echo "       \"fullName\": \"John Barber\","
echo "       \"email\": \"john@test.com\","
echo "       \"password\": \"test123456\","
echo "       \"specialty\": \"Haircut\","
echo "       \"salonId\": \"YOUR_SALON_ID\""
echo "     }'"
echo ""
echo "4. Verify staff was created:"
echo ""
echo "   curl 'http://127.0.0.1:54321/rest/v1/staff?select=*' \\"
echo "     -H 'apikey: YOUR_ANON_KEY' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY'"
echo ""
echo "======================================"
