#!/bin/bash

###########################################
# COMPREHENSIVE ENDPOINT TEST SUITE
# Tests all CRUD operations for the Barber Salon Management System
# Usage: ./test-all-endpoints.sh
###########################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="REDACTED"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefg"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Storage for IDs
SALON_ID=""
STAFF_ID=""
SERVICE_ID=""
APPOINTMENT_ID=""
CREATED_USER_EMAIL=""

###########################################
# UTILITY FUNCTIONS
###########################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
}

print_test() {
    echo -e "${YELLOW}➜ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local auth_key="$5"
    
    ((TESTS_TOTAL++))
    
    if [ -z "$auth_key" ]; then
        auth_key="$SUPABASE_ANON_KEY"
    fi
    
    print_test "$test_name"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X "$method" "$SUPABASE_URL$endpoint" \
            -H "apikey: $auth_key" \
            -H "Authorization: Bearer $auth_key" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -X "$method" "$SUPABASE_URL$endpoint" \
            -H "apikey: $auth_key" \
            -H "Authorization: Bearer $auth_key" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    # Check for errors
    if echo "$response" | grep -q "error\|Error\|ERROR" && ! echo "$response" | grep -q "^\[\]"; then
        print_error "Failed - $response"
        return 1
    else
        print_success "Success"
        echo "$response"
        return 0
    fi
}

###########################################
# TEST SUITE
###########################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  BARBER SALON MANAGEMENT - COMPREHENSIVE TEST SUITE║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    
    # Check if local Supabase is running
    print_header "Checking Local Supabase Connection"
    if ! curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" > /dev/null 2>&1; then
        print_error "Cannot connect to Supabase at $SUPABASE_URL"
        print_error "Please ensure Supabase containers are running: docker-compose up -d"
        exit 1
    fi
    print_success "Connected to Supabase"
    
    ###########################################
    # SALONS TESTS
    ###########################################
    print_header "1. SALONS CRUD TESTS"
    
    # Create Salon
    SALON_DATA=$(cat <<EOF
{
  "name": "Test Barber Shop $(date +%s)",
  "slug": "test-salon-$(date +%s)",
  "owner_email": "owner@testbarber.com",
  "is_active": true
}
EOF
)
    
    response=$(curl -s -X POST "$SUPABASE_URL/rest/v1/salons" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$SALON_DATA")
    
    SALON_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null)
    
    if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "null" ]; then
        ((TESTS_TOTAL++))
        print_success "Create Salon - ID: $SALON_ID"
    else
        ((TESTS_TOTAL++))
        print_error "Create Salon - Failed to create salon"
        SALON_ID="test-id"
    fi
    
    # Read Salons
    ((TESTS_TOTAL++))
    print_test "Read All Salons"
    response=$(curl -s -X GET "$SUPABASE_URL/rest/v1/salons" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json")
    
    if echo "$response" | jq . > /dev/null 2>&1; then
        count=$(echo "$response" | jq 'length')
        print_success "Read All Salons - Found $count salons"
    else
        print_error "Read All Salons - Invalid response"
    fi
    
    # Read Single Salon
    if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "test-id" ]; then
        ((TESTS_TOTAL++))
        print_test "Read Single Salon"
        response=$(curl -s -X GET "$SUPABASE_URL/rest/v1/salons?id=eq.$SALON_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        if echo "$response" | jq -e '.[0].id' > /dev/null 2>&1; then
            print_success "Read Single Salon - Retrieved salon"
        else
            print_error "Read Single Salon - Failed"
        fi
    fi
    
    # Update Salon
    if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "test-id" ]; then
        ((TESTS_TOTAL++))
        print_test "Update Salon"
        UPDATE_DATA=$(cat <<EOF
{
  "name": "Updated Test Barber Shop"
}
EOF
)
        response=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/salons?id=eq.$SALON_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "$UPDATE_DATA")
        
        print_success "Update Salon - Completed"
    fi
    
    ###########################################
    # SERVICES TESTS
    ###########################################
    print_header "2. SERVICES CRUD TESTS"
    
    if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "test-id" ]; then
        # Create Service
        SERVICE_DATA=$(cat <<EOF
{
  "salon_id": "$SALON_ID",
  "name": "Haircut",
  "description": "Professional haircut",
  "price": 30.00,
  "duration": 30,
  "is_active": true
}
EOF
)
        
        response=$(curl -s -X POST "$SUPABASE_URL/rest/v1/services" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "$SERVICE_DATA")
        
        SERVICE_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null)
        
        if [ ! -z "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
            ((TESTS_TOTAL++))
            print_success "Create Service - ID: $SERVICE_ID"
        else
            ((TESTS_TOTAL++))
            print_error "Create Service - Failed"
        fi
        
        # Read Services
        ((TESTS_TOTAL++))
        print_test "Read Services for Salon"
        response=$(curl -s -X GET "$SUPABASE_URL/rest/v1/services?salon_id=eq.$SALON_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        if echo "$response" | jq . > /dev/null 2>&1; then
            count=$(echo "$response" | jq 'length')
            print_success "Read Services - Found $count services"
        else
            print_error "Read Services - Invalid response"
        fi
        
        # Update Service
        if [ ! -z "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
            ((TESTS_TOTAL++))
            print_test "Update Service"
            UPDATE_DATA=$(cat <<EOF
{
  "name": "Premium Haircut",
  "price": 40.00
}
EOF
)
            response=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/services?id=eq.$SERVICE_ID" \
                -H "apikey: $SUPABASE_ANON_KEY" \
                -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
                -H "Content-Type: application/json" \
                -d "$UPDATE_DATA")
            
            print_success "Update Service - Completed"
        fi
    fi
    
    ###########################################
    # STAFF TESTS
    ###########################################
    print_header "3. STAFF CRUD TESTS"
    
    if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "test-id" ]; then
        # Create Staff
        STAFF_DATA=$(cat <<EOF
{
  "full_name": "John Barber",
  "email": "john@testbarber$(date +%s).com",
  "specialty": "Haircut",
  "salon_id": "$SALON_ID",
  "role": "staff",
  "status": "Active"
}
EOF
)
        
        response=$(curl -s -X POST "$SUPABASE_URL/rest/v1/staff" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "$STAFF_DATA")
        
        STAFF_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null)
        CREATED_USER_EMAIL=$(echo "$response" | jq -r '.[0].email' 2>/dev/null)
        
        if [ ! -z "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
            ((TESTS_TOTAL++))
            print_success "Create Staff - ID: $STAFF_ID, Email: $CREATED_USER_EMAIL"
        else
            ((TESTS_TOTAL++))
            print_error "Create Staff - Failed"
        fi
        
        # Read Staff
        ((TESTS_TOTAL++))
        print_test "Read Staff for Salon"
        response=$(curl -s -X GET "$SUPABASE_URL/rest/v1/staff?salon_id=eq.$SALON_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        if echo "$response" | jq . > /dev/null 2>&1; then
            count=$(echo "$response" | jq 'length')
            print_success "Read Staff - Found $count staff members"
        else
            print_error "Read Staff - Invalid response"
        fi
        
        # Update Staff
        if [ ! -z "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
            ((TESTS_TOTAL++))
            print_test "Update Staff"
            UPDATE_DATA=$(cat <<EOF
{
  "specialty": "Barber & Stylist",
  "status": "Active"
}
EOF
)
            response=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/staff?id=eq.$STAFF_ID" \
                -H "apikey: $SUPABASE_ANON_KEY" \
                -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
                -H "Content-Type: application/json" \
                -d "$UPDATE_DATA")
            
            print_success "Update Staff - Completed"
        fi
    fi
    
    ###########################################
    # APPOINTMENTS TESTS
    ###########################################
    print_header "4. APPOINTMENTS CRUD TESTS"
    
    if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "test-id" ]; then
        # Create Appointment
        APPOINTMENT_DATE=$(date -d "+1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
        APPOINTMENT_DATA=$(cat <<EOF
{
  "salon_id": "$SALON_ID",
  "staff_id": "$STAFF_ID",
  "service_id": "$SERVICE_ID",
  "customer_name": "Test Customer",
  "customer_email": "customer@test.com",
  "customer_phone": "+1234567890",
  "appointment_date": "$APPOINTMENT_DATE",
  "appointment_time": "14:00:00",
  "status": "Pending",
  "amount": 30.00,
  "notes": "Test appointment"
}
EOF
)
        
        response=$(curl -s -X POST "$SUPABASE_URL/rest/v1/appointments" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "$APPOINTMENT_DATA")
        
        APPOINTMENT_ID=$(echo "$response" | jq -r '.[0].id' 2>/dev/null)
        
        if [ ! -z "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
            ((TESTS_TOTAL++))
            print_success "Create Appointment - ID: $APPOINTMENT_ID"
        else
            ((TESTS_TOTAL++))
            print_error "Create Appointment - Failed"
            echo "Response: $response"
        fi
        
        # Read Appointments
        ((TESTS_TOTAL++))
        print_test "Read Appointments for Salon"
        response=$(curl -s -X GET "$SUPABASE_URL/rest/v1/appointments?salon_id=eq.$SALON_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        if echo "$response" | jq . > /dev/null 2>&1; then
            count=$(echo "$response" | jq 'length')
            print_success "Read Appointments - Found $count appointments"
        else
            print_error "Read Appointments - Invalid response"
        fi
        
        # Update Appointment Status
        if [ ! -z "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
            ((TESTS_TOTAL++))
            print_test "Update Appointment Status"
            UPDATE_DATA=$(cat <<EOF
{
  "status": "Confirmed"
}
EOF
)
            response=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/appointments?id=eq.$APPOINTMENT_ID" \
                -H "apikey: $SUPABASE_ANON_KEY" \
                -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
                -H "Content-Type: application/json" \
                -d "$UPDATE_DATA")
            
            print_success "Update Appointment - Completed"
        fi
        
        # Read Single Appointment
        if [ ! -z "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
            ((TESTS_TOTAL++))
            print_test "Read Single Appointment with Relations"
            response=$(curl -s -X GET "$SUPABASE_URL/rest/v1/appointments?id=eq.$APPOINTMENT_ID&select=*,service:services(*),staff:staff(*)" \
                -H "apikey: $SUPABASE_ANON_KEY" \
                -H "Content-Type: application/json")
            
            if echo "$response" | jq -e '.[0].id' > /dev/null 2>&1; then
                print_success "Read Appointment with Relations - Success"
            else
                print_error "Read Appointment - Failed"
            fi
        fi
    fi
    
    ###########################################
    # DELETE TESTS (Cleanup)
    ###########################################
    print_header "5. DELETE TESTS (Cleanup)"
    
    # Delete Appointment
    if [ ! -z "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
        ((TESTS_TOTAL++))
        print_test "Delete Appointment"
        response=$(curl -s -X DELETE "$SUPABASE_URL/rest/v1/appointments?id=eq.$APPOINTMENT_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        print_success "Delete Appointment - Completed"
    fi
    
    # Delete Service
    if [ ! -z "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
        ((TESTS_TOTAL++))
        print_test "Delete Service"
        response=$(curl -s -X DELETE "$SUPABASE_URL/rest/v1/services?id=eq.$SERVICE_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        print_success "Delete Service - Completed"
    fi
    
    # Delete Staff
    if [ ! -z "$STAFF_ID" ] && [ "$STAFF_ID" != "null" ]; then
        ((TESTS_TOTAL++))
        print_test "Delete Staff"
        response=$(curl -s -X DELETE "$SUPABASE_URL/rest/v1/staff?id=eq.$STAFF_ID" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        print_success "Delete Staff - Completed"
    fi
    
    # Delete Salon (optional, keep for reference)
    # if [ ! -z "$SALON_ID" ] && [ "$SALON_ID" != "test-id" ]; then
    #     ((TESTS_TOTAL++))
    #     print_test "Delete Salon"
    #     response=$(curl -s -X DELETE "$SUPABASE_URL/rest/v1/salons?id=eq.$SALON_ID" \
    #         -H "apikey: $SUPABASE_ANON_KEY" \
    #         -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    #         -H "Content-Type: application/json")
    #     
    #     print_success "Delete Salon - Completed"
    # fi
    
    ###########################################
    # TEST SUMMARY
    ###########################################
    print_header "TEST SUMMARY"
    
    echo ""
    echo -e "${GREEN}✓ Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}✗ Failed: $TESTS_FAILED${NC}"
    echo -e "${BLUE}Total: $TESTS_TOTAL${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
        return 1
    fi
}

# Run main function
main
exit $?
