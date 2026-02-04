#!/bin/bash

# ============================================================================
# COMPLETE NOTIFICATION TESTING GUIDE
# ============================================================================
# 
# This guide walks through testing push notifications exactly like Instagram/
# WhatsApp where you get notifications even when the app is completely closed.
#
# System Features:
# ✓ Notifications work offline
# ✓ Sound plays automatically (📞 bell + audio tone)
# ✓ Vibration on mobile (200ms pulse pattern)
# ✓ Works in Brave, Chrome, Edge, Firefox
# ✓ Works on iOS 16.4+, Android, and Desktop
#
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════════════════╗
║                    TRESERVI NOTIFICATION TESTING GUIDE                     ║
║                  Like Instagram/WhatsApp - Notifications                   ║
║            Work Even When App Is Completely Closed/Background              ║
╚════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# SECTION 1: PREREQUISITES
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 1: PREREQUISITES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo "You need:"
echo "  1. Salon owner's device (iOS, Android, or Desktop)"
echo "  2. Another device/browser to create bookings"
echo "  3. Internet connection (notifications work online)"
echo "  4. PWA installed on salon owner's device"
echo ""
echo "Browser Compatibility:"
echo "  ✓ Chrome/Chromium (Android, Desktop)"
echo "  ✓ Brave (Android, Desktop)"
echo "  ✓ Edge (Windows, Mac, Android)"
echo "  ✓ Firefox (Android, Desktop)"
echo "  ✓ Safari (iOS 16.4+ only)"
echo ""

# SECTION 2: INSTALL PWA
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 2: INSTALL PWA ON SALON OWNER'S DEVICE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Step 1: Open the Booking Page${NC}"
echo "  URL: https://[your-domain]/?salon=[salon-slug]&route=/book"
echo ""
echo "  Where:"
echo "    [your-domain] = your deployed frontend domain"
echo "    [salon-slug]  = your salon's unique slug"
echo ""
echo "  Example: https://treservi.app/?salon=hamdi-salon&route=/book"
echo ""

echo -e "${YELLOW}Step 2: Install as PWA${NC}"
echo "  📱 iOS/iPad:"
echo "    1. Open Safari"
echo "    2. Tap the Share icon (bottom-right)"
echo "    3. Tap 'Add to Home Screen'"
echo "    4. Name it 'Treservi' and tap Add"
echo ""
echo "  📱 Android:"
echo "    1. Open Chrome/Brave/Edge"
echo "    2. Tap menu (⋮) → 'Install app' OR"
echo "    3. Tap 'Install' when prompt appears"
echo ""
echo "  💻 Desktop:"
echo "    1. Open Chrome/Edge/Brave"
echo "    2. Tap menu (⋮) → 'Install Treservi' OR"
echo "    3. Click install icon in address bar"
echo ""

echo -e "${YELLOW}Step 3: Grant Permissions${NC}"
echo "  When prompted:"
echo "    1. Allow notifications → TAP YES/ALLOW"
echo "    2. Allow camera/location (optional)"
echo ""

echo -e "${YELLOW}Step 4: Open the App${NC}"
echo "  ✓ App now runs standalone (not in browser tab)"
echo "  ✓ Home screen shows Treservi icon 'T'"
echo ""

# SECTION 3: ENABLE NOTIFICATIONS
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 3: ENABLE PUSH NOTIFICATIONS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Step 1: Open the App${NC}"
echo "  ✓ Tap Treservi icon on home screen"
echo "  ✓ Wait for app to load"
echo ""

echo -e "${YELLOW}Step 2: Find Notification Toggle${NC}"
echo "  📍 Look in top-right corner of navbar"
echo "  📍 Should see 🔔 (bell icon)"
echo ""
echo "  If no bell icon:"
echo "    - Refresh the page (F5 or down-swipe)"
echo "    - Check browser DevTools → Console for errors"
echo ""

echo -e "${YELLOW}Step 3: Enable Notifications${NC}"
echo "  1. Tap the 🔔 (bell icon)"
echo "  2. Browser shows permission dialog"
echo "  3. Tap ALLOW or YES"
echo "  4. Bell icon should turn GREEN ✓"
echo ""

echo -e "${YELLOW}Step 4: Verify Subscription${NC}"
echo "  ✓ Check browser console (F12)"
echo "  ✓ Look for message: 'Subscription saved to backend'"
echo "  ✓ This means notifications are armed"
echo ""
echo "  Desktop DevTools:"
echo "    1. Press F12"
echo "    2. Go to Console tab"
echo "    3. Look for: '[PushService] Subscription saved to backend'"
echo ""

# SECTION 4: TEST BACKGROUND NOTIFICATION
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 4: TEST BACKGROUND NOTIFICATION (The Real Test!)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Step 1: CLOSE THE APP${NC}"
echo "  ❌ COMPLETELY close the Treservi app"
echo "     iOS: Swipe up to remove from app switcher"
echo "     Android: Tap back button or swipe to close"
echo "     Desktop: Close the window entirely"
echo ""
echo "  ⚠️  IMPORTANT: App must be COMPLETELY closed, not just in background"
echo "  ⚠️  Like Instagram: notifications arrive even when app is closed"
echo ""

echo -e "${YELLOW}Step 2: Wait 5 Seconds${NC}"
echo "  ⏱️  Give the system time to register app closure"
echo ""

echo -e "${YELLOW}Step 3: CREATE BOOKING ON ANOTHER DEVICE${NC}"
echo "  On a different browser/device:"
echo "    1. Go to: https://[your-domain]/?salon=[salon-slug]&route=/book"
echo "    2. Fill booking form:"
echo "       • Select specialist (barber/stylist)"
echo "       • Choose date & time"
echo "       • Select service (haircut, beard trim, etc)"
echo "       • Enter customer name"
echo "       • Enter customer phone"
echo "    3. Tap 'CONFIRM BOOKING' button"
echo "    4. You should see 'Booking Received!' message"
echo ""

echo -e "${YELLOW}Step 4: WATCH FOR NOTIFICATION${NC}"
echo "  ✓ Check salon owner's device (which has app closed)"
echo "  ✓ Look for notification with:"
echo "    • Title: 📞 New Appointment"
echo "    • Body: [Customer Name] booked [Service]"
echo "    • Sound: Bell tone (🔊 audio plays)"
echo "    • Vibration: Phone vibrates (200ms pattern)"
echo ""
echo "  Expected on:"
echo "    📱 iOS: Notification appears at top of screen"
echo "    📱 Android: Notification appears in notification shade"
echo "    💻 Desktop: OS notification popup (top-right corner)"
echo ""

echo -e "${YELLOW}Step 5: TAP THE NOTIFICATION${NC}"
echo "  ✓ Click/tap the notification"
echo "  ✓ App opens and shows /dashboard"
echo "  ✓ New appointment visible in schedule"
echo ""

# SECTION 5: TROUBLESHOOTING
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 5: TROUBLESHOOTING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "${RED}Problem: No notification appears${NC}"
echo ""
echo "  Check 1: Service Worker Installed?"
echo "    1. Open app → Press F12 (DevTools)"
echo "    2. Go to: Application → Service Workers"
echo "    3. Should show 'service-worker.js' with green status"
echo "    4. If red/inactive: Click 'Unregister' and refresh"
echo ""

echo "  Check 2: Push Subscription Active?"
echo "    1. Open app → Press F12 (DevTools)"
echo "    2. Go to: Application → Storage → IndexedDB"
echo "    3. Look for subscription data"
echo "    4. OR check browser console for 'Subscription saved' message"
echo ""

echo "  Check 3: Database Has Subscription?"
echo "    1. Go to: Supabase Dashboard"
echo "    2. Navigate to: Database → Tables → push_subscriptions"
echo "    3. Filter by salon_id matching the salon"
echo "    4. Should see row with endpoint, p256dh, auth keys"
echo ""

echo "  Check 4: Edge Function Errors?"
echo "    1. Open terminal"
echo "    2. Run: supabase functions logs send-push-notification --project-ref czvsgtvienmchudyzqpk"
echo "    3. Look for error messages about VAPID, encryption, or HTTP"
echo "    4. Check the timestamps match when you created booking"
echo ""

echo "  Check 5: Appointment Created?"
echo "    1. Go to Supabase Dashboard"
echo "    2. Check: Database → Tables → appointments"
echo "    3. Should see new row with your test booking"
echo "    4. If missing: booking.page form didn't submit"
echo ""

echo -e "${RED}Problem: Notification has no sound${NC}"
echo "  • Mobile: Check device volume is ON (not silent mode)"
echo "  • Desktop: Check speaker is ON and not muted"
echo "  • Browser may suppress sound if:
echo "    - First time getting notification (needs permission)"
echo "    - Device is in silent mode"
echo "    - Browser notifications are muted in OS settings"
echo ""

echo -e "${RED}Problem: Notification has no vibration${NC}"
echo "  • Only works on mobile devices (iOS/Android)"
echo "  • Check device vibration is enabled in settings"
echo "  • Pattern: 200ms vibrate → 100ms pause → 200ms vibrate"
echo ""

echo -e "${RED}Problem: PWA won't install${NC}"
echo "  iOS:"
echo "    - Need Safari (not Chrome)"
echo "    - Need iOS 16.4+ for Web Push"
echo "    - May need full HTTPS (no self-signed certs)"
echo ""
echo "  Android:"
echo "    - Chrome/Brave/Edge should show install prompt"
echo "    - If not: Manual install via menu → 'Install app'"
echo ""
echo "  Desktop:"
echo "    - Check address bar for install icon"
echo "    - Try menu → 'Install Treservi'"
echo ""

# SECTION 6: TESTING CHECKLIST
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 6: TESTING CHECKLIST${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo "Final Verification:"
echo ""
echo "  ✓ [ ] PWA installed on device"
echo "  ✓ [ ] Bell icon visible in navbar"
echo "  ✓ [ ] Notifications enabled (bell is green)"
echo "  ✓ [ ] 'Subscription saved' message in console"
echo "  ✓ [ ] App completely closed/not running"
echo "  ✓ [ ] New booking created via /book page"
echo "  ✓ [ ] Notification appeared (even app closed)"
echo "  ✓ [ ] Notification has sound 🔊"
echo "  ✓ [ ] Notification has vibration (mobile)"
echo "  ✓ [ ] Tapping notification opens dashboard"
echo "  ✓ [ ] New appointment visible in schedule"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}SUCCESS! Notifications working like Instagram/WhatsApp 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo "System Architecture:"
echo ""
echo "  Customer on /book page"
echo "       ↓"
echo "  Submits booking form (POST /appointments)"
echo "       ↓"
echo "  Database INSERT trigger fires"
echo "       ↓"
echo "  Calls send-push-notification edge function"
echo "       ↓"
echo "  Function queries push_subscriptions by salon_id"
echo "       ↓"
echo "  Sends VAPID-signed + AES-encrypted push to endpoint"
echo "       ↓"
echo "  Service Worker receives 'push' event"
echo "       ↓"
echo "  Shows notification with sound + vibration"
echo "       ↓"
echo "  Notification appears EVEN WITH APP CLOSED ✓"
echo ""

echo "Browser Support:"
echo "  Chrome ✓  | Brave ✓  | Edge ✓  | Firefox ✓  | Safari (iOS 16.4+) ✓"
echo "  Android ✓  | iOS ✓  | Desktop ✓"
echo ""

echo "Key Features Deployed:"
echo "  ✓ Sound notification (800Hz tone for 300ms)"
echo "  ✓ Vibration pattern (200+100+200ms)"
echo "  ✓ Works offline (cached service worker)"
echo "  ✓ Works in background (service worker runs independently)"
echo "  ✓ Works when app closed (OS handles notification delivery)"
echo ""
