/**
 * Badge System Test Utilities
 * Run these in browser console to test badge functionality
 */

// Test 1: Check Badge API Support
export const testBadgeSupport = () => {
  console.log('=== Badge API Support ===');
  console.log('navigator.setAppBadge:', 'setAppBadge' in navigator);
  console.log('navigator.clearAppBadge:', 'clearAppBadge' in navigator);
  console.log('Notification.permission:', Notification.permission);
  console.log('Is PWA:', window.matchMedia('(display-mode: standalone)').matches);
  console.log('Service Worker:', !!navigator.serviceWorker?.controller);
};

// Test 2: Check LocalStorage State
export const testStorageState = () => {
  console.log('=== LocalStorage State ===');
  console.log('Badge Count:', localStorage.getItem('unread_badge_count'));
  console.log('Last Checked:', localStorage.getItem('last_notification_check'));
  console.log('Notifications Read:', localStorage.getItem('dashboard_notifications_read'));
  console.log('Notifications:', JSON.parse(localStorage.getItem('dashboard_notifications') || '[]').length);
};

// Test 3: Manually Set Badge (Browser Console)
export const testSetBadge = async (count: number) => {
  console.log(`=== Setting Badge to ${count} ===`);
  try {
    if ('setAppBadge' in navigator) {
      await (navigator as any).setAppBadge(count);
      console.log('✅ Badge set successfully');
    } else {
      console.warn('⚠️ Badge API not supported');
    }
  } catch (error) {
    console.error('❌ Failed to set badge:', error);
  }
};

// Test 4: Manually Clear Badge
export const testClearBadge = async () => {
  console.log('=== Clearing Badge ===');
  try {
    if ('clearAppBadge' in navigator) {
      await (navigator as any).clearAppBadge();
      localStorage.setItem('last_notification_check', new Date().toISOString());
      console.log('✅ Badge cleared successfully');
    } else {
      console.warn('⚠️ Badge API not supported');
    }
  } catch (error) {
    console.error('❌ Failed to clear badge:', error);
  }
};

// Test 5: Simulate New Appointment
export const testIncrementBadge = async () => {
  console.log('=== Simulating New Appointment ===');
  const current = parseInt(localStorage.getItem('unread_badge_count') || '0', 10);
  const newCount = current + 1;
  
  localStorage.setItem('unread_badge_count', newCount.toString());
  
  if ('setAppBadge' in navigator) {
    await (navigator as any).setAppBadge(newCount);
    console.log(`✅ Badge incremented to ${newCount}`);
  } else {
    console.warn('⚠️ Badge API not supported');
  }
};

// Test 6: Play Notification Sound
export const testNotificationSound = () => {
  console.log('=== Playing Notification Sound ===');
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    console.log('✅ Sound played');
  } catch (error) {
    console.error('❌ Failed to play sound:', error);
  }
};

// Test 7: Request Notification Permission
export const testRequestPermission = async () => {
  console.log('=== Requesting Notification Permission ===');
  if (!('Notification' in window)) {
    console.warn('⚠️ Notifications not supported');
    return;
  }
  
  try {
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Permission granted');
      new Notification('Test Notification', {
        body: 'Badge system is working!',
        icon: '/icon-192.png'
      });
    } else {
      console.warn('⚠️ Permission denied or dismissed');
    }
  } catch (error) {
    console.error('❌ Failed to request permission:', error);
  }
};

// Test 8: Check Supabase Connection (requires import)
export const testSupabaseConnection = async (supabase: any, salonId: string) => {
  console.log('=== Testing Supabase Connection ===');
  try {
    const { data, error, count } = await supabase
      .from('appointments')
      .select('id, status, created_at', { count: 'exact' })
      .eq('salon_id', salonId)
      .in('status', ['Pending', 'Confirmed']);
    
    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log('✅ Connected to Supabase');
      console.log(`Found ${count} unread appointments:`, data);
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
};

// Test 9: Reset Everything
export const testResetBadge = async () => {
  console.log('=== Resetting Badge System ===');
  
  // Clear localStorage
  localStorage.removeItem('unread_badge_count');
  localStorage.removeItem('last_notification_check');
  localStorage.removeItem('dashboard_notifications_read');
  localStorage.removeItem('dashboard_notifications');
  
  // Clear badge
  if ('clearAppBadge' in navigator) {
    await (navigator as any).clearAppBadge();
  }
  
  console.log('✅ Badge system reset complete');
};

// Test 10: Run All Tests
export const runAllTests = async () => {
  console.log('\n========================================');
  console.log('BADGE SYSTEM DIAGNOSTIC REPORT');
  console.log('========================================\n');
  
  testBadgeSupport();
  console.log('\n');
  
  testStorageState();
  console.log('\n');
  
  console.log('=== Manual Tests ===');
  console.log('Run these in console:');
  console.log('testSetBadge(5) - Set badge to 5');
  console.log('testIncrementBadge() - Increment badge');
  console.log('testClearBadge() - Clear badge');
  console.log('testNotificationSound() - Play sound');
  console.log('testRequestPermission() - Request permission');
  console.log('testResetBadge() - Reset everything');
  
  console.log('\n========================================\n');
};

// Browser Console Usage:
// Copy/paste these commands in DevTools console:
/*
// Run full diagnostic
runAllTests();

// Set badge to 5
testSetBadge(5);

// Clear badge
testClearBadge();

// Simulate new appointment
testIncrementBadge();

// Play notification sound
testNotificationSound();

// Request notification permission
testRequestPermission();

// Reset everything
testResetBadge();

// Check Supabase connection (requires supabase client)
// import { supabase } from './services/supabaseClient';
// testSupabaseConnection(supabase, 'your-salon-id');
*/

// Export for use in components
export const BadgeTestUtils = {
  testBadgeSupport,
  testStorageState,
  testSetBadge,
  testClearBadge,
  testIncrementBadge,
  testNotificationSound,
  testRequestPermission,
  testSupabaseConnection,
  testResetBadge,
  runAllTests,
};
