import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        aria-label={isIOS ? 'Installer sur iOS' : "Installer l'application"}
        className="inline-flex items-center gap-1.5 min-h-[36px] md:min-h-[38px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white text-xs sm:text-sm font-bold shadow-[0_8px_20px_-6px_rgba(234,88,12,0.75)] hover:shadow-[0_12px_24px_-6px_rgba(234,88,12,0.9)] border border-[#FDBA74]/55 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDBA74]"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Installer l&apos;app</span>
        <span className="sm:hidden">Installer</span>
      </motion.button>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGuide(false)}
            className="fixed inset-0 z-50 bg-[#052915]/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#FDF8F0] border border-[#F5E6D3] overflow-hidden shadow-[0_28px_70px_-15px_rgba(4,40,20,0.65)]"
            >
              <div className="bg-gradient-to-r from-[#054422] via-[#006B35] to-[#EA580C] text-white px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-[#FAF3E8]" />
                  </div>
                  <div>
                    <h3 id="pwa-install-title" className="font-display text-base font-bold">
                      Installer BUDGESTY
                    </h3>
                    <p className="text-[11px] text-[#FDE8D0]">
                      Accès rapide plein écran sur téléphone &amp; ordinateur
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Fermer le guide d'installation"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-sm text-[#111111]">
                {isIOS ? (
                  <div className="space-y-3">
                    <p className="font-semibold text-[#075B2E]">
                      Installation sur iPhone / iPad (Safari) :
                    </p>
                    <ol className="space-y-2.5 text-xs text-[#111111]/85">
                      <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-[#F5E6D3]">
                        <span className="w-6 h-6 rounded-lg bg-[#EA580C] text-white font-bold flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>
                          Appuyez sur le bouton{' '}
                          <strong className="inline-flex items-center gap-1 text-[#C2410C]">
                            <Share className="w-3.5 h-3.5" /> Partager
                          </strong>{' '}
                          dans la barre Safari.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-[#F5E6D3]">
                        <span className="w-6 h-6 rounded-lg bg-[#075B2E] text-white font-bold flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span>
                          Faites défiler et touchez{' '}
                          <strong className="text-[#075B2E]">Sur l&apos;écran d&apos;accueil</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-[#F5E6D3]">
                        <span className="w-6 h-6 rounded-lg bg-[#006B35] text-white font-bold flex items-center justify-center shrink-0">
                          3
                        </span>
                        <span>Validez avec « Ajouter » pour lancer BUDGESTY comme une app native.</span>
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-semibold text-[#075B2E]">
                      Installation rapide sur Android, Chrome ou Edge :
                    </p>
                    <ol className="space-y-2.5 text-xs text-[#111111]/85">
                      <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-[#F5E6D3]">
                        <span className="w-6 h-6 rounded-lg bg-[#EA580C] text-white font-bold flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>
                          Ouvrez l&apos;application directement dans Chrome / Edge (hors aperçu intégré
                          si nécessaire).
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-[#F5E6D3]">
                        <span className="w-6 h-6 rounded-lg bg-[#075B2E] text-white font-bold flex items-center justify-center shrink-0">
                          2
                        </span>
                        <span>
                          Touchez le menu <strong className="text-[#075B2E]">⋮</strong> ou l&apos;icône
                          d&apos;installation dans la barre d&apos;adresse, puis{' '}
                          <strong className="text-[#EA580C]">Installer l&apos;application</strong>.
                        </span>
                      </li>
                    </ol>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#EA580C] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Compris
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
