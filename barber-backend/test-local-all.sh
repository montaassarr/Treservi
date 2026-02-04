#!/bin/bash
set -euo pipefail

# Comprehensive local Supabase test suite
# Usage: ./test-local-all.sh

API_URL="http://127.0.0.1:54321"

# Extract keys from supabase status
STATUS_OUTPUT=$(supabase status 2>/dev/null || true)
ANON_KEY=$(echo "$STATUS_OUTPUT" | awk -F': ' '/anon key:/{print $2}' | tr -d '\r')
SERVICE_ROLE_KEY=$(echo "$STATUS_OUTPUT" | awk -F': ' '/service_role key:/{print $2}' | tr -d '\r')

if [[ -z "${ANON_KEY}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "❌ Could not read keys from 'supabase status'. Ensure supabase is running."
  exit 1
fi

TEST_SUFFIX=$(date +%s)

say() { echo -e "\n===== $1 ====="; }

request() {
  local method=$1 url=$2 key=$3 data=${4:-}
  if [[ -n "$data" ]]; then
    curl -s -X "$method" "$url" \
      -H "apikey: $key" \
      -H "Authorization: Bearer $key" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "$data" \
      -w "\nHTTP_STATUS:%{http_code}"
  else
    curl -s -X "$method" "$url" \
      -H "apikey: $key" \
      -H "Authorization: Bearer $key" \
      -H "Content-Type: application/json" \
      -w "\nHTTP_STATUS:%{http_code}"
  fi
}

request_json() {
  local method=$1 url=$2 key=$3 data=${4:-}
  local response status body
  response=$(request "$method" "$url" "$key" "$data")
  status=$(echo "$response" | awk -F'HTTP_STATUS:' 'NF>1{print $2}' | tail -n1 | tr -d '\r')
  body=$(echo "$response" | sed '/HTTP_STATUS:/d')

  if [[ -z "$status" ]]; then
    echo "❌ No HTTP status captured for $method $url"
    echo "$response"
    exit 1
  fi

  if [[ "$status" != "200" && "$status" != "201" && "$status" != "204" ]]; then
    echo "❌ HTTP $status for $method $url"
    echo "$body"
    exit 1
  fi

  echo "$body"
}

json_get() {
  local json_input="$1"
  local path="$2"
  python3 - "$json_input" "$path" <<'PY'
import json,sys
obj=json.loads(sys.argv[1])
path=sys.argv[2]
for key in path.split('.'):
    obj = obj[int(key)] if key.isdigit() else obj[key]
print(obj)
PY
}

say "READ: salons/staff/services/appointments/stations"
request_json GET "$API_URL/rest/v1/salons?select=*&limit=2" "$ANON_KEY" | head -c 200; echo
request_json GET "$API_URL/rest/v1/staff?select=*&limit=2" "$ANON_KEY" | head -c 200; echo
request_json GET "$API_URL/rest/v1/services?select=*&limit=2" "$ANON_KEY" | head -c 200; echo
request_json GET "$API_URL/rest/v1/appointments?select=*&limit=2" "$ANON_KEY" | head -c 200; echo
request_json GET "$API_URL/rest/v1/stations?select=*&limit=2" "$ANON_KEY" | head -c 200; echo

say "CREATE: salon"
request_json POST "$API_URL/rest/v1/salons" "$SERVICE_ROLE_KEY" "{\"name\":\"Local Test Salon $TEST_SUFFIX\",\"slug\":\"local-test-$TEST_SUFFIX\",\"owner_email\":\"owner+$TEST_SUFFIX@local.test\"}" >/dev/null
SALON_LOOKUP=$(curl -s "$API_URL/rest/v1/salons?select=id&slug=eq.local-test-$TEST_SUFFIX" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY")
if [[ -z "$SALON_LOOKUP" || "$SALON_LOOKUP" == "[]" ]]; then
  echo "❌ Salon not found after insert. Response: $SALON_LOOKUP"
  exit 1
fi
echo "Salon lookup payload: $SALON_LOOKUP"
SALON_ID=$(json_get "$SALON_LOOKUP" 0.id)

echo "Salon ID: $SALON_ID"

say "CREATE: service"
request_json POST "$API_URL/rest/v1/services" "$SERVICE_ROLE_KEY" "{\"salon_id\":\"$SALON_ID\",\"name\":\"Local Cut\",\"price\":30,\"duration\":30}" >/dev/null
SERVICE_LOOKUP=$(curl -s "$API_URL/rest/v1/services?select=id&salon_id=eq.$SALON_ID&name=eq.Local%20Cut" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY")
if [[ -z "$SERVICE_LOOKUP" || "$SERVICE_LOOKUP" == "[]" ]]; then
  echo "❌ Service not found after insert. Response: $SERVICE_LOOKUP"
  exit 1
fi
SERVICE_ID=$(json_get "$SERVICE_LOOKUP" 0.id)

echo "Service ID: $SERVICE_ID"

say "CREATE: station"
request_json POST "$API_URL/rest/v1/stations" "$SERVICE_ROLE_KEY" "{\"salon_id\":\"$SALON_ID\",\"name\":\"Station A\",\"type\":\"chair\"}" >/dev/null
STATION_LOOKUP=$(curl -s "$API_URL/rest/v1/stations?select=id&salon_id=eq.$SALON_ID&name=eq.Station%20A" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY")
if [[ -z "$STATION_LOOKUP" || "$STATION_LOOKUP" == "[]" ]]; then
  echo "❌ Station not found after insert. Response: $STATION_LOOKUP"
  exit 1
fi
STATION_ID=$(json_get "$STATION_LOOKUP" 0.id)

echo "Station ID: $STATION_ID"

say "CREATE: appointment"
request_json POST "$API_URL/rest/v1/appointments" "$SERVICE_ROLE_KEY" "{\"salon_id\":\"$SALON_ID\",\"service_id\":\"$SERVICE_ID\",\"customer_name\":\"Local Customer\",\"customer_email\":\"customer@local.test\",\"appointment_date\":\"2026-02-15\",\"appointment_time\":\"10:00:00\",\"amount\":30}" >/dev/null
APPT_LOOKUP=$(curl -s "$API_URL/rest/v1/appointments?select=id&salon_id=eq.$SALON_ID&customer_email=eq.customer@local.test&appointment_date=eq.2026-02-15" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY")
if [[ -z "$APPT_LOOKUP" || "$APPT_LOOKUP" == "[]" ]]; then
  echo "❌ Appointment not found after insert. Response: $APPT_LOOKUP"
  exit 1
fi
APPT_ID=$(json_get "$APPT_LOOKUP" 0.id)

echo "Appointment ID: $APPT_ID"

say "UPDATE: appointment status"
request_json PATCH "$API_URL/rest/v1/appointments?id=eq.$APPT_ID" "$SERVICE_ROLE_KEY" '{"status":"Confirmed"}' | head -c 200; echo

say "RPC: generate_slug"
request_json POST "$API_URL/rest/v1/rpc/generate_slug" "$ANON_KEY" '{"name":"Local Salon"}' | head -c 200; echo

say "RPC: is_user_super_admin"
RPC_RESP=$(request POST "$API_URL/rest/v1/rpc/is_user_super_admin" "$ANON_KEY" '{}')
RPC_STATUS=$(echo "$RPC_RESP" | awk -F'HTTP_STATUS:' 'NF>1{print $2}' | tail -n1 | tr -d '\r')
RPC_BODY=$(echo "$RPC_RESP" | sed '/HTTP_STATUS:/d')
if [[ "$RPC_STATUS" == "404" ]]; then
  echo "⚠️ is_user_super_admin not found locally (skipping)"
else
  if [[ "$RPC_STATUS" != "200" ]]; then
    echo "❌ HTTP $RPC_STATUS for is_user_super_admin"
    echo "$RPC_BODY"
    exit 1
  fi
  echo "$RPC_BODY" | head -c 200; echo
fi

say "EDGE FUNCTION: realtime-notification"
request_json POST "$API_URL/functions/v1/realtime-notification" "$SERVICE_ROLE_KEY" "{\"record\":{\"id\":\"$APPT_ID\",\"salon_id\":\"$SALON_ID\",\"customer_name\":\"Local Customer\"}}" | head -c 200; echo

say "EDGE FUNCTION: push-notification"
set +e
PUSH_RESP=$(request POST "$API_URL/functions/v1/push-notification" "$SERVICE_ROLE_KEY" "{\"record\":{\"id\":\"$APPT_ID\",\"salon_id\":\"$SALON_ID\",\"customer_name\":\"Local Customer\"}}")
PUSH_STATUS=$(echo "$PUSH_RESP" | awk -F'HTTP_STATUS:' 'NF>1{print $2}' | tail -n1 | tr -d '\r')
PUSH_BODY=$(echo "$PUSH_RESP" | sed '/HTTP_STATUS:/d')
if [[ "$PUSH_STATUS" != "200" ]]; then
  echo "⚠️ push-notification failed with HTTP $PUSH_STATUS"
  echo "$PUSH_BODY" | head -c 200; echo
else
  echo "$PUSH_BODY" | head -c 200; echo
fi
set -e

say "DELETE: appointment"
request_json DELETE "$API_URL/rest/v1/appointments?id=eq.$APPT_ID" "$SERVICE_ROLE_KEY" | head -c 200; echo

say "DELETE: station"
request_json DELETE "$API_URL/rest/v1/stations?id=eq.$STATION_ID" "$SERVICE_ROLE_KEY" | head -c 200; echo

say "DELETE: service"
request_json DELETE "$API_URL/rest/v1/services?id=eq.$SERVICE_ID" "$SERVICE_ROLE_KEY" | head -c 200; echo

say "DELETE: salon"
request_json DELETE "$API_URL/rest/v1/salons?id=eq.$SALON_ID" "$SERVICE_ROLE_KEY" | head -c 200; echo

say "DONE"
