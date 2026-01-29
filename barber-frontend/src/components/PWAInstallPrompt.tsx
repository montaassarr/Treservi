import React, { useEffect } from 'react';

const PWAInstallPrompt: React.FC = () => {
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-treservi-accent text-white rounded-2xl shadow-lg p-4 z-30 md:hidden animate-in">
      <p className="text-sm font-semibold mb-2">Install Treservi</p>
      <p className="text-xs opacity-90 mb-3">
        Add to your home screen for quick access
      </p>
      <button
        onClick={handleInstall}
        className="w-full bg-white text-treservi-accent font-semibold py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        Install
      </button>
    </div>
  );
};

export default PWAInstallPrompt;
