#!/bin/bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
TOKEN="${1:-${JWT_TOKEN:-}}"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./test-push.sh <JWT_TOKEN>"
  echo "Or set JWT_TOKEN and run: ./test-push.sh"
  exit 1
fi

echo "Sending test push via ${API_BASE_URL}/api/push-subscriptions/test ..."

curl -i --request POST "${API_BASE_URL}/api/push-subscriptions/test" \
  --header "Authorization: Bearer ${TOKEN}" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "Treservi Test",
    "message": "If you see this on mobile, push is working.",
    "url": "/dashboard"
  }'

echo -e "\n\nDone. Check your mobile device for notification delivery."
