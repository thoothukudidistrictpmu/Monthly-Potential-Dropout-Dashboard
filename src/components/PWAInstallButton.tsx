import React, { useState } from 'react';
import { Download, Smartphone, Check, X, ExternalLink, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running inside standalone PWA window
  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-100 border border-emerald-400/40 shadow-xs">
        <Check className="w-3.5 h-3.5 text-emerald-300" />
        <span>App Installed</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/20 hover:bg-white/30 text-white shadow-xs border border-white/30 transition-all active:scale-95 cursor-pointer ${className}`}
        title="Install this dashboard as an app on your computer or phone"
      >
        <Download className="w-4 h-4 text-emerald-300 animate-pulse" />
        <span>Install App</span>
      </button>

      {/* Guided Installation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white border-2 border-slate-300 shadow-2xl overflow-hidden text-slate-800">
            {/* Header */}
            <div className="bg-[#1e3a5f] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Install Dashboard App</h3>
                  <p className="text-xs text-slate-200">Standalone offline-capable application</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm font-medium">
              {isIOS ? (
                <div>
                  <p className="font-bold text-slate-900 mb-2">To install on iPhone or iPad:</p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <li>Open this page in <strong>Safari</strong> browser.</li>
                    <li>Tap the <strong>Share</strong> button (box with upward arrow) at the bottom.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner.</li>
                  </ol>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-900 mb-2">To install on Chrome, Edge, or Android:</p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <li>Look at your browser's address bar (URL bar).</li>
                    <li>Click the <strong>Install App icon (computer/down arrow)</strong> in the right corner of the address bar.</li>
                    <li>Or click the browser menu (<strong>⋮</strong> three dots) and select <strong>"Install Thoothukudi District Dashboard"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Confirm <strong>Install</strong> to add to your desktop or home screen!</li>
                  </ol>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 font-bold">
                <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  Once installed, the app launches in its own dedicated window without browser bars, and loads instantly with offline caching.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1e3a5f] hover:bg-[#152a45] text-white shadow-xs transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
