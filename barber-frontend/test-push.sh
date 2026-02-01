#!/bin/bash

# Configuration
PROJECT_REF="czvsgtvienmchudyzqpk"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/push-notification"
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2)

# If ANON_KEY is empty, ask user
if [ -z "$ANON_KEY" ]; then
  echo "Error: VITE_SUPABASE_ANON_KEY not found in .env"
  echo "Please export ANON_KEY manually or set it in .env"
  exit 1
fi

# Mock Data
SALON_ID="YOUR_SALON_ID_HERE" 
USER_ID="YOUR_USER_ID_HERE"

echo "To test real push, verify you have:"
echo "1. Logged into the app (Dashboard)"
echo "2. Allowed Notifications"
echo "3. Update SALON_ID below or pass it as first argument"

if [ ! -z "$1" ]; then
    SALON_ID=$1
fi

echo "Sending push trigger to $FUNCTION_URL..."

curl -i --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header "Content-Type: application/json" \
  --data "{
    \"record\": {
        \"salon_id\": \"$SALON_ID\",
        \"customer_name\": \"Test User via Script\",
        \"service_name\": \"Haircut\",
        \"appointment_date\": \"2026-02-01\",
        \"appointment_time\": \"14:00\",
        \"is_read\": false
    }
}"

echo -e "\n\nDone. If successful, you should see { success: true } and receive a notification."
