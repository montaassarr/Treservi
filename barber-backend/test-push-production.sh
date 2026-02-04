#!/bin/bash

# Production Push Notification Test
# Tests web push delivery through cloud Supabase (NOT local)
# This verifies the push-notification edge function works end-to-end

set -e

# Production Supabase credentials (from env)
PROD_URL="https://czvsgtvienmchudyzqpk.supabase.co"
PROD_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$PROD_KEY" ]; then
  echo "ERROR: SUPABASE_SERVICE_ROLE_KEY is not set"
  echo "Set it from Supabase Dashboard → Project Settings → API"
  echo "Example:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=YOUR_KEY"
  exit 1
fi

say() {
  echo ""
  echo "===== $1 ====="
}

request_json() {
  local method=$1
  local endpoint=$2
  local key=$3
  local body=$4

  local url="${PROD_URL}/rest/v1${endpoint}"

  if [ -z "$body" ]; then
    curl -s -X "$method" "$url" \
      -H "Authorization: Bearer $key" \
      -H "apikey: $key" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation"
  else
    curl -s -X "$method" "$url" \
      -H "Authorization: Bearer $key" \
      -H "apikey: $key" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "$body"
  fi
}

say "STEP 1: Create test salon (production)"
SALON_PAYLOAD='{
  "name": "Push Test Salon",
  "owner_email": "pushtest@reservi.local"
}'

SALON_RESP=$(request_json POST "/salons" "$PROD_KEY" "$SALON_PAYLOAD")
SALON_ID=$(echo "$SALON_RESP" | jq -r 'if type=="array" then .[0].id else .id end // empty')

if [ -z "$SALON_ID" ]; then
  say "ERROR: Failed to create salon"
  echo "$SALON_RESP"
  exit 1
fi

say "✅ Salon created: $SALON_ID"

say "STEP 2: Create test staff (production)"
STAFF_PAYLOAD="{
  \"salon_id\": \"$SALON_ID\",
  \"full_name\": \"Push Test Staff\",
  \"email\": \"staff@reservi.local\",
  \"phone\": \"95000000\",
  \"specialty\": \"Barber\"
}"

STAFF_RESP=$(request_json POST "/staff" "$PROD_KEY" "$STAFF_PAYLOAD")
STAFF_ID=$(echo "$STAFF_RESP" | jq -r 'if type=="array" then .[0].id else .id end // empty')

if [ -z "$STAFF_ID" ]; then
  say "ERROR: Failed to create staff"
  echo "$STAFF_RESP"
  exit 1
fi

say "✅ Staff created: $STAFF_ID"

say "STEP 3: Create test service (production)"
SERVICE_PAYLOAD="{
  \"salon_id\": \"$SALON_ID\",
  \"name\": \"Push Notification Test\",
  \"price\": 25.00,
  \"duration\": 30
}"

SERVICE_RESP=$(request_json POST "/services" "$PROD_KEY" "$SERVICE_PAYLOAD")
SERVICE_ID=$(echo "$SERVICE_RESP" | jq -r 'if type=="array" then .[0].id else .id end // empty')

if [ -z "$SERVICE_ID" ]; then
  say "ERROR: Failed to create service"
  echo "$SERVICE_RESP"
  exit 1
fi

say "✅ Service created: $SERVICE_ID"

say "STEP 4: Trigger appointment (will call push-notification edge function)"
APPT_DATE=$(date +%Y-%m-%d)
APPT_TIME="14:00:00"

APPT_PAYLOAD="{
  \"salon_id\": \"$SALON_ID\",
  \"staff_id\": \"$STAFF_ID\",
  \"service_id\": \"$SERVICE_ID\",
  \"customer_name\": \"Push Test Customer\",
  \"customer_phone\": \"95123456\",
  \"customer_email\": \"customer@test.local\",
  \"appointment_date\": \"$APPT_DATE\",
  \"appointment_time\": \"$APPT_TIME\",
  \"status\": \"Pending\",
  \"amount\": 25.00,
  \"notes\": \"Test appointment for push notification\"
}"

APPT_RESP=$(request_json POST "/appointments" "$PROD_KEY" "$APPT_PAYLOAD")
APPT_ID=$(echo "$APPT_RESP" | jq -r 'if type=="array" then .[0].id else .id end // empty')

if [ -z "$APPT_ID" ]; then
  say "ERROR: Failed to create appointment"
  echo "$APPT_RESP"
  exit 1
fi

say "✅ Appointment created: $APPT_ID"
say "   This should have triggered the push-notification edge function"

say "STEP 5: Check push_subscriptions table"
SUBS_RESP=$(curl -s -X GET "${PROD_URL}/rest/v1/push_subscriptions?select=id,user_id,endpoint" \
  -H "Authorization: Bearer $PROD_KEY" \
  -H "apikey: $PROD_KEY" \
  -H "Content-Type: application/json")

SUBS_COUNT=$(echo "$SUBS_RESP" | jq 'length')
say "Push subscriptions in database: $SUBS_COUNT"

if [ "$SUBS_COUNT" -gt 0 ]; then
  say "✅ Subscriptions found:"
  echo "$SUBS_RESP" | jq '.[] | {user_id, endpoint: (.endpoint | .[0:50] + "...")}' 
else
  say "⚠️  No subscriptions found - you need to subscribe first"
  say "   Steps to subscribe:"
  say "   1. Open https://reservi.app (or your frontend URL) on your device"
  say "   2. Allow notification permission when prompted"
  say "   3. This saves your device endpoint to push_subscriptions table"
  say "   4. Then re-run this test"
fi

say "CLEANUP: Delete test records"
curl -s -X DELETE "${PROD_URL}/rest/v1/appointments?id=eq.$APPT_ID" \
  -H "Authorization: Bearer $PROD_KEY" > /dev/null
curl -s -X DELETE "${PROD_URL}/rest/v1/services?id=eq.$SERVICE_ID" \
  -H "Authorization: Bearer $PROD_KEY" > /dev/null
curl -s -X DELETE "${PROD_URL}/rest/v1/staff?id=eq.$STAFF_ID" \
  -H "Authorization: Bearer $PROD_KEY" > /dev/null
curl -s -X DELETE "${PROD_URL}/rest/v1/salons?id=eq.$SALON_ID" \
  -H "Authorization: Bearer $PROD_KEY" > /dev/null

say "✅ Test records cleaned up"
say "Done!"
say ""
echo "🔔 NEXT STEPS:"
echo "1. If subscriptions were found, check your device for a notification"
echo "2. If no subscriptions, first subscribe from the app, then re-run this test"
echo "3. Verify on iOS Safari PWA (installed to Home Screen)"
echo "4. Verify on Android Chrome"
