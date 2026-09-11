'use client';

import { useEffect, useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Default true to prevent flash
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Dang ky Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // 2. Kiem tra xem da o che do Standalone (da cai app) chua
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(Boolean(standaloneCheck));
    if (standaloneCheck) return;

    // 3. Kiem tra thiet bi iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Kiem tra nguoi dung co an prompt gan day khong (trong 7 ngay)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
    if (dismissedAt) {
      const daysSinceDismissed =
        (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // 5. Bat su kien beforeinstallprompt tren Chrome / Android
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Neu la iOS va chua cai, hien banner sau 3 giay de nguoi dung lam quen trang truoc
    if (isIosDevice && !standaloneCheck) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
  }

  // Khong hien thi neu da cai app hoac nguoi dung chua bat
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Floating PWA Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-[#1a2139]/95 p-3.5 shadow-2xl backdrop-blur-md text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-inner">
              <Smartphone className="size-6 text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white tracking-tight">
                Cài đặt ứng dụng CloneVocab
              </h4>
              <p className="text-[11px] text-white/70 line-clamp-1">
                Mở nhanh từ màn hình chính, không thanh URL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 rounded-lg px-3 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Cài đặt</span>
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex size-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Huong dan cai dat cho iPhone / iPad (iOS Safari) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-[#384166] bg-[#1a2139] p-6 shadow-2xl text-white space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="size-5 text-blue-400" />
                <h3 className="font-bold text-sm">Cài đặt trên iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Do chính sách bảo mật của Apple trên iOS, hãy làm theo 2 bước đơn giản sau:
            </p>

            <ol className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-blue-400 font-bold text-[11px]">
                  1
                </span>
                <span>
                  Nhấn vào biểu tượng <strong className="text-blue-300">Chia sẻ</strong>{' '}
                  <span className="inline-block px-1">⎋</span> ở thanh công cụ dưới cùng của Safari.
                </span>
              </li>

              <li className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-blue-400 font-bold text-[11px]">
                  2
                </span>
                <span>
                  Cuộn xuống và chọn{' '}
                  <strong className="text-blue-300">&quot;Thêm vào MH chính&quot;</strong> (Add to Home
                  Screen).
                </span>
              </li>
            </ol>

            <Button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl h-10 font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white"
            >
              Đã hiểu
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
