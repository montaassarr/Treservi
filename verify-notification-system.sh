#!/bin/bash

# Verification script to ensure all notification components are in place

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔔 Verifying Notification System${NC}\n"

ERRORS=0

# Check 1: Service Worker exists
echo -n "✓ Service Worker... "
if [ -f "barber-frontend/public/service-worker.js" ]; then
  if grep -q "addEventListener.*'push'" barber-frontend/public/service-worker.js; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}Missing push handler${NC}"
    ERRORS=$((ERRORS+1))
  fi
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 2: Notification sound exists
echo -n "✓ Notification Sound... "
if [ -f "barber-frontend/public/notification.mp3" ]; then
  SIZE=$(ls -lh barber-frontend/public/notification.mp3 | awk '{print $5}')
  echo -e "${GREEN}OK ($SIZE)${NC}"
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 3: Push service exists
echo -n "✓ Push Service... "
if [ -f "barber-frontend/src/services/pushService.ts" ]; then
  if grep -q "setupPushNotifications" barber-frontend/src/services/pushService.ts; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}Missing functions${NC}"
    ERRORS=$((ERRORS+1))
  fi
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 4: Notification Toggle component exists
echo -n "✓ Notification Toggle... "
if [ -f "barber-frontend/src/components/NotificationToggle.tsx" ]; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 5: usePushNotifications hook exists
echo -n "✓ Push Notifications Hook... "
if [ -f "barber-frontend/src/hooks/usePushNotifications.ts" ]; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 6: Manifest.json configured
echo -n "✓ PWA Manifest... "
if [ -f "barber-frontend/public/manifest.json" ]; then
  if grep -q "standalone" barber-frontend/public/manifest.json; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}Not configured for PWA${NC}"
    ERRORS=$((ERRORS+1))
  fi
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 7: Edge function exists
echo -n "✓ Push Edge Function... "
if [ -f "barber-backend/supabase/functions/send-push-notification/index.ts" ]; then
  if grep -q "sound.*notification" barber-backend/supabase/functions/send-push-notification/index.ts; then
    echo -e "${GREEN}OK (with sound)${NC}"
  else
    echo -e "${YELLOW}OK (sound may need update)${NC}"
  fi
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 8: Database trigger exists
echo -n "✓ Database Trigger... "
if [ -f "barber-backend/supabase/migrations/20260204201000_push_notification_trigger.sql" ]; then
  if grep -q "send-push-notification" barber-backend/supabase/migrations/20260204201000_push_notification_trigger.sql; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}Not configured correctly${NC}"
    ERRORS=$((ERRORS+1))
  fi
else
  echo -e "${RED}NOT FOUND${NC}"
  ERRORS=$((ERRORS+1))
fi

# Check 9: Frontend build
echo -n "✓ Frontend Build... "
if [ -d "barber-frontend/dist" ] && [ -f "barber-frontend/dist/index.html" ]; then
  SIZE=$(du -sh barber-frontend/dist | cut -f1)
  echo -e "${GREEN}OK ($SIZE)${NC}"
else
  echo -e "${YELLOW}MISSING (run: npm run build)${NC}"
fi

# Check 10: Git commits
echo -n "✓ Recent Commits... "
COMMITS=$(cd /home/montassar/Desktop/reservi && git log --oneline -5 | grep -c "notification\|push")
if [ $COMMITS -gt 0 ]; then
  echo -e "${GREEN}OK ($COMMITS commits)${NC}"
else
  echo -e "${YELLOW}No recent notification commits${NC}"
fi

echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All notification components verified!${NC}"
  echo ""
  echo "System is ready for testing:"
  echo "  1. Deploy frontend to production"
  echo "  2. Install PWA on salon owner device"
  echo "  3. Enable notifications (bell icon)"
  echo "  4. Close app completely"
  echo "  5. Create booking on /book page"
  echo "  6. Verify notification appears on device"
  echo ""
  echo "Documentation:"
  echo "  • Read: NOTIFICATION_TESTING_GUIDE.md"
  echo "  • Read: NOTIFICATION_SYSTEM_SUMMARY.md"
  exit 0
else
  echo -e "${RED}❌ $ERRORS component(s) missing or misconfigured${NC}"
  exit 1
fi
