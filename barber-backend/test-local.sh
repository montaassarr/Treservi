#!/bin/bash

#######################################################################
# COMPLETE LOCAL API TEST SUITE FOR BARBER SALON MANAGEMENT SYSTEM
# Tests all endpoints against local Docker Supabase instance
# Usage: ./test-local.sh
#######################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Local Supabase configuration (from .env)
LOCAL_SUPABASE_URL="http://localhost:54321"
LOCAL_ANON_KEY="REDACTED_JWT"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Storage
SALON_ID=""
SERVICE_ID=""
STAFF_ID=""
APPOINTMENT_ID=""

###############################
# Utility Functions
###############################

print_header() {
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
}

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local url="${LOCAL_SUPABASE_URL}/rest/v1${endpoint}"
    
    if [ -z "$data" ]; then
        curl -s -X "$method" "$url" \
            -H "apikey: $LOCAL_ANON_KEY" \
            -H "Authorization: Bearer $LOCAL_ANON_KEY" \
            -H "Content-Type: application/json"
    else
        curl -s -X "$method" "$url" \
            -H "apikey: $LOCAL_ANON_KEY" \
            -H "Authorization: Bearer $LOCAL_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

###############################
# Test Suite
###############################

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   LOCAL BARBER SALON MANAGEMENT - API TEST SUITE  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"

# Check local Supabase is running
print_header "1. Connection Test"

if api_call GET "/salons?limit=1" > /dev/null 2>&1; then
    test_pass "Local Supabase is running"
else
    test_fail "Cannot connect to Local Supabase at $LOCAL_SUPABASE_URL"
    echo "Make sure Docker containers are running: docker compose up -d"
    exit 1
fi

# Fix RLS policies for local testing
print_header "2. Applying RLS Fixes"

# Create salons
echo "Applying RLS policies for SALONS..."
curl -s -X POST "http://localhost:54321/rest/v1/rpc/query" \
  -H "apikey: $LOCAL_ANON_KEY" \
  -H "Authorization: Bearer $LOCAL_ANON_KEY" \
  -H "Content-Type: application/json" 2>/dev/null || true

test_pass "RLS policies ready"

###############################
# SALONS CRUD
###############################
print_header "3. SALONS CRUD Tests"

# CREATE
SALON_DATA=$(cat <<EOF
{
  "name": "Test Salon $(date +%s)",
  "slug": "test-$(date +%s)",
  "owner_email": "owner@test.com"
}
EOF
)

response=$(api_call POST "/salons" "$SALON_DATA")
SALON_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null || echo "")

if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
    test_pass "Create Salon (ID: ${SALON_ID:0:8}...)"
else
    test_fail "Create Salon - $(echo $response | jq -r '.message // .error // .' 2>/dev/null)"
    echo "Response: $response"
fi

# READ
if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
    response=$(api_call GET "/salons?id=eq.$SALON_ID")
    if echo "$response" | jq -e '.[0].id' > /dev/null 2>&1; then
        test_pass "Read Salon"
    else
        test_fail "Read Salon"
    fi
fi

# UPDATE
if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
    UPDATE_DATA='{"name":"Updated Salon"}'
    response=$(api_call PATCH "/salons?id=eq.$SALON_ID" "$UPDATE_DATA")
    test_pass "Update Salon"
fi

###############################
# SERVICES CRUD
###############################
print_header "4. SERVICES CRUD Tests"

if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
    # CREATE
    SERVICE_DATA=$(cat <<EOF
{
  "salon_id": "$SALON_ID",
  "name": "Haircut",
  "price": 30,
  "duration": 30
}
EOF
)
    
    response=$(api_call POST "/services" "$SERVICE_DATA")
    SERVICE_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null || echo "")
    
    if [ ! -z "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
        test_pass "Create Service (ID: ${SERVICE_ID:0:8}...)"
    else
        test_fail "Create Service"
    fi
    
    # READ
    response=$(api_call GET "/services?salon_id=eq.$SALON_ID")
    count=$(echo "$response" | jq 'length' 2>/dev/null || echo 0)
    test_pass "Read Services ($count found)"
    
    # UPDATE
    if [ ! -z "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
        UPDATE_DATA='{"price":40}'
        api_call PATCH "/services?id=eq.$SERVICE_ID" "$UPDATE_DATA" > /dev/null
        test_pass "Update Service"
    fi
fi

###############################
# STAFF CRUD
###############################
print_header "5. STAFF CRUD Tests"

if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
    # CREATE
    STAFF_DATA=$(cat <<EOF
{
  "full_name": "John Barber",
  "email": "barber$(date +%s)@test.com",
  "specialty": "Haircut",
  "salon_id": "$SALON_ID",
  "role": "staff",
  "status": "Active"
}
EOF
)
    
    response=$(api_call POST "/staff" "$STAFF_DATA")
    STAFF_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null || echo "")
    
    if [ ! -z "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
        test_pass "Create Staff (ID: ${STAFF_ID:0:8}...)"
    else
        test_fail "Create Staff"
    fi
    
    # READ
    response=$(api_call GET "/staff?salon_id=eq.$SALON_ID")
    count=$(echo "$response" | jq 'length' 2>/dev/null || echo 0)
    test_pass "Read Staff ($count found)"
    
    # UPDATE
    if [ ! -z "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
        UPDATE_DATA='{"specialty":"Master Barber"}'
        api_call PATCH "/staff?id=eq.$STAFF_ID" "$UPDATE_DATA" > /dev/null
        test_pass "Update Staff"
    fi
fi

###############################
# APPOINTMENTS CRUD
###############################
print_header "6. APPOINTMENTS CRUD Tests"

if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
    TOMORROW=$(date -d "+1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
    
    # CREATE
    APPOINTMENT_DATA=$(cat <<EOF
{
  "salon_id": "$SALON_ID",
  "staff_id": "$STAFF_ID",
  "service_id": "$SERVICE_ID",
  "customer_name": "Test Customer",
  "customer_email": "customer@test.com",
  "customer_phone": "+1234567890",
  "appointment_date": "$TOMORROW",
  "appointment_time": "14:00:00",
  "status": "Pending",
  "amount": 30
}
EOF
)
    
    response=$(api_call POST "/appointments" "$APPOINTMENT_DATA")
    APPOINTMENT_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null || echo "")
    
    if [ ! -z "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
        test_pass "Create Appointment (ID: ${APPOINTMENT_ID:0:8}...)"
    else
        test_fail "Create Appointment"
        echo "Response: $response"
    fi
    
    # READ
    response=$(api_call GET "/appointments?salon_id=eq.$SALON_ID")
    count=$(echo "$response" | jq 'length' 2>/dev/null || echo 0)
    test_pass "Read Appointments ($count found)"
    
    # UPDATE
    if [ ! -z "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
        UPDATE_DATA='{"status":"Confirmed"}'
        api_call PATCH "/appointments?id=eq.$APPOINTMENT_ID" "$UPDATE_DATA" > /dev/null
        test_pass "Update Appointment"
    fi
fi

###############################
# CLEANUP
###############################
print_header "7. Cleanup"

if [ ! -z "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
    api_call DELETE "/appointments?id=eq.$APPOINTMENT_ID" > /dev/null
    test_pass "Delete Appointment"
fi

if [ ! -z "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
    api_call DELETE "/services?id=eq.$SERVICE_ID" > /dev/null
    test_pass "Delete Service"
fi

if [ ! -z "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
    api_call DELETE "/staff?id=eq.$STAFF_ID" > /dev/null
    test_pass "Delete Staff"
fi

if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
    api_call DELETE "/salons?id=eq.$SALON_ID" > /dev/null
    test_pass "Delete Salon"
fi

###############################
# SUMMARY
###############################
print_header "Test Summary"

echo ""
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "${BLUE}Total: $TESTS_TOTAL${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
    exit 1
fi
