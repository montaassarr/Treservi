import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker Registration
// Handles push notifications, offline caching, and badge updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('[App] Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, prompt user or auto-update
              console.log('[App] New Service Worker version available');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      // Handle subscription changes
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SUBSCRIPTION_CHANGED') {
          console.log('[App] Push subscription changed, re-saving to backend');
          // The useNotifications hook will handle re-saving on next mount
        }
        
        // Handle notification sound playback request from service worker
        if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
          console.log('[App] 🔊 Playing notification sound from service worker request');
          try {
            // Play sound using HTML5 Audio API
            const audio = new Audio(event.data.sound || '/notification.mp3');
            audio.volume = 0.8;
            audio.play().catch((err) => {
              console.warn('[App] Could not play notification sound:', err);
            });
          } catch (err) {
            console.warn('[App] Error setting up notification sound:', err);
          }
        }
      });

    } catch (error) {
      console.error('[App] Service Worker registration failed:', error);
    }
  });
}