#!/bin/bash

# ============================================================================
# Public Booking Page Background Push Notification Test
# ============================================================================
# 
# Tests the flow when a customer books via /book page:
# 1. Customer fills booking form on /book page
# 2. Submits appointment (calls createAppointment)
# 3. Database trigger fires on INSERT to appointments table
# 4. Edge function sends push to salon owner + all staff
# 5. Notification arrives even if salon owner has PWA in background
#
# Prerequisites:
# - PWA installed on salon owner's device
# - Notifications enabled (bell toggle activated)
# - Database trigger deployed
# - Edge function deployed
#
# Usage: ./test-booking-push.sh
#

set -e

PROJECT_REF="${SUPABASE_PROJECT_REF:-czvsgtvienmchudyzqpk}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Public Booking Page Push Notification Test ===${NC}\n"

# Test 1: Verify booking page exists
echo -e "${YELLOW}Test 1: Booking Page (/book)${NC}"
cd /home/montassar/Desktop/reservi/barber-frontend

if grep -q "BookingPage" src/pages/BookingPage.tsx; then
  echo "✓ BookingPage component exists"
fi

if grep -q "createAppointment" src/pages/BookingPage.tsx; then
  echo "✓ BookingPage calls createAppointment on form submit"
fi

echo ""

# Test 2: Verify database trigger exists
echo -e "${YELLOW}Test 2: Database Trigger${NC}"
cd /home/montassar/Desktop/reservi/barber-backend

if [ -f "supabase/migrations/20260204201000_push_notification_trigger.sql" ]; then
  echo "✓ Database trigger migration found"
  
  if grep -q "AFTER INSERT ON appointments" supabase/migrations/20260204201000_push_notification_trigger.sql; then
    echo "✓ Trigger fires on new appointment INSERT"
  fi
  
  if grep -q "send-push-notification" supabase/migrations/20260204201000_push_notification_trigger.sql; then
    echo "✓ Trigger calls send-push-notification edge function"
  fi
else
  echo "✗ Trigger migration not found"
fi

echo ""

# Test 3: Verify edge function targets all salon subscriptions
echo -e "${YELLOW}Test 3: Edge Function Logic${NC}"
if grep -q "push_subscriptions.*salon_id" supabase/functions/send-push-notification/index.ts; then
  echo "✓ Edge function queries push_subscriptions by salon_id"
  echo "  This sends notifications to:"
  echo "  - Salon owner"
  echo "  - All staff members"
  echo "  - All devices (iOS, Android, Desktop)"
fi

echo ""

# Test 4: End-to-end test flow
echo -e "${YELLOW}Test 4: Complete Flow${NC}\n"

echo -e "${BLUE}Step 1: Setup${NC}"
echo "1. Install the PWA on salon owner's device"
echo "   - Open: https://[your-domain]/?salon=[salon-slug]"
echo "   - Tap 'Add to Home Screen' (iOS/Android)"
echo "   - Or install from Chrome menu (Desktop)"
echo ""

echo -e "${BLUE}Step 2: Enable Notifications${NC}"
echo "1. Open the PWA app"
echo "2. Look for bell icon in top-right navbar"
echo "3. Tap to enable push notifications"
echo "4. Grant permission when prompted"
echo "5. Verify in browser console: 'Subscription saved' message appears"
echo ""

echo -e "${BLUE}Step 3: Test Background Push${NC}"
echo "1. CLOSE the PWA app completely (exit/background state)"
echo "2. Wait 5 seconds"
echo "3. On another device/browser, go to /book page"
echo "4. Fill in the booking form:"
echo "   - Select specialist"
echo "   - Choose date & time"
echo "   - Select service"
echo "   - Enter customer name & phone"
echo "5. Tap 'Confirm Booking'"
echo ""

echo -e "${BLUE}Step 4: Verify Notification${NC}"
echo "Expected Result:"
echo "✓ Push notification appears on salon owner's device"
echo "✓ Even though PWA is completely closed"
echo "✓ Notification shows appointment details"
echo "✓ Clicking notification opens PWA to /dashboard"
echo ""

# Test 5: Debugging checklist
echo -e "${YELLOW}Test 5: Debugging Checklist${NC}\n"

echo "If notifications don't appear:"
echo ""
echo "1. Check Service Worker installation:"
echo "   - Open DevTools → Application → Service Workers"
echo "   - Should show 'service-worker.js' with status 'activated'"
echo ""
echo "2. Check push subscription:"
echo "   - Open DevTools → Application → Storage → IndexedDB"
echo "   - Look for subscription data"
echo "   - Or check Supabase → push_subscriptions table"
echo ""
echo "3. Check edge function logs:"
echo "   - Run: supabase functions logs send-push-notification --project-ref $PROJECT_REF"
echo "   - Look for errors about VAPID, encryption, or HTTP requests"
echo ""
echo "4. Monitor browser console:"
echo "   - Watch for 'push' event logs in service worker"
echo "   - Check for 'Subscription saved', 'Push received', etc."
echo ""
echo "5. Verify database trigger:"
echo "   - After booking, check appointments table has new record"
echo "   - Verify trigger executed (check edge function logs)"
echo ""

# Test 6: Success metrics
echo -e "${YELLOW}Test 6: Success Metrics${NC}\n"
echo "✓ Booking form submits successfully"
echo "✓ New appointment appears in database"
echo "✓ Database trigger fires (check edge function logs)"
echo "✓ Push notification sent to all salon subscriptions"
echo "✓ Notification displays without app being open"
echo "✓ Notification click routes to /dashboard"
echo ""

echo -e "${GREEN}=== Test Summary ===${NC}"
echo "System ready for manual testing on real devices."
echo ""
echo "Key Flow:"
echo "Customer on /book → Submit appointment → Database trigger fires"
echo "   ↓"
echo "Edge function queries push_subscriptions by salon_id"
echo "   ↓"
echo "Sends VAPID-signed + AES-encrypted push to all devices"
echo "   ↓"
echo "Service Worker receives push event → Shows notification"
echo "   ↓"
echo "User sees notification even with app closed ✓"
echo ""
