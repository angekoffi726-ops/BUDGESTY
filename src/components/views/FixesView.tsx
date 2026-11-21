import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Lock, LockKeyhole, ShieldAlert } from 'lucide-react';
import {
  BudgetMonth,
  FIXES_ORDER,
  FixeKey,
  TOTAL_FIXES_BUDGET,
} from '../../types/budget';
import { validateFixe } from '../../lib/budgetService';
import { formatFCFA } from '../../lib/format';
import { AnimatedNumber } from '../AnimatedNumber';

interface FixesViewProps {
  userId: string;
  month: BudgetMonth;
}

export const FixesView: React.FC<FixesViewProps> = ({ userId, month }) => {
  const [confirmKey, setConfirmKey] = useState<FixeKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMonthOpen = month.statut === 'OUVERT';
  const salaryReady = month.salaire.alimentee;
  const totalValide = FIXES_ORDER.reduce(
    (sum, k) => sum + (month.fixes[k].valide ? month.fixes[k].montant : 0),
    0
  );
  const progressPct = Math.min(100, (totalValide / TOTAL_FIXES_BUDGET) * 100);
  const ringCircumference = 2 * Math.PI * 24;
  const ringOffset = ringCircumference * (1 - progressPct / 100);

  const handleValidate = async (key: FixeKey) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      await validateFixe(userId, month, key);
      setConfirmKey(null);
      setSuccessMsg(`Fixe « ${month.fixes[key].label} » validé de manière irréversible.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la validation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white/94 backdrop-blur-2xl border border-white/85 rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_-16px_rgba(38,18,78,0.42)] space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DDEBD8]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#075B2E] via-[#006B35] to-[#6D28D9] text-white flex items-center justify-center shadow-md shrink-0">
              <LockKeyhole className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#111111]">
                Fixes irréversibles — {month.label}
              </h2>
              <p className="text-xs text-[#111111]/70 mt-0.5">
                Chaque charge fixe validée est définitivement verrouillée et déduite de l’argent
                encore disponible.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-[#111111]/60">Validés / Enveloppe</p>
            <p className="font-mono-num text-lg font-bold text-[#5B21B6]">
              <AnimatedNumber value={totalValide} /> / {formatFCFA(TOTAL_FIXES_BUDGET)}
            </p>
          </div>
        </div>

        {/* Gradient Progress Banner with animated SVG ring */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#054422] via-[#006B35] to-[#6D28D9] text-white p-4 sm:p-5 shadow-[0_18px_36px_-12px_rgba(91,33,182,0.6)] flex items-center justify-between gap-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-white/12 to-transparent animate-sheen"
          />
          <div className="relative z-10 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-[#DDD6FE]">Argent encore disponible ce mois</span>
              <span className="font-mono-num font-extrabold text-lg text-white">
                <AnimatedNumber value={month.salaire.argentEncoreDisponible} />
              </span>
            </div>
            <div className="h-3 bg-black/25 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full rounded-full bg-gradient-to-r from-[#DDEBD8] via-white to-[#C4B5FD] overflow-hidden"
              >
                <span className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-progress-glint" />
              </motion.div>
            </div>
          </div>

          <div className="relative z-10 w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60" aria-hidden="true">
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke="rgba(221,214,254,0.25)"
                strokeWidth="5"
              />
              <motion.circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                initial={{ strokeDashoffset: ringCircumference }}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <span className="absolute font-mono-num text-xs font-extrabold text-white">
              {Math.round(progressPct)}%
            </span>
          </div>
        </div>

        {isMonthOpen && !salaryReady && (
          <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/95 text-amber-900 text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
            <span>
              Salaire non alimenté : alimentez d’abord le salaire dans l’onglet Accueil pour
              pouvoir valider vos fixes.
            </span>
          </div>
        )}

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl border border-[#5B21B6]/25 bg-gradient-to-r from-[#DDEBD8]/80 to-[#EDE9FE]/80 text-[#075B2E] text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#5B21B6]" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {FIXES_ORDER.map((key, idx) => {
            const item = month.fixes[key];
            const enoughFunds = month.salaire.argentEncoreDisponible >= item.montant;
            const canValidate = isMonthOpen && salaryReady && !item.valide && enoughFunds;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: idx * 0.05 }}
                whileHover={{ y: -2 }}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  item.valide
                    ? 'bg-gradient-to-r from-[#DDEBD8]/60 via-white to-[#EDE9FE]/60 border-[#5B21B6]/25 shadow-sm'
                    : 'bg-white border-[#DDEBD8] hover:border-[#5B21B6]/35 shadow-xs'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#111111]">{item.label}</span>
                    {item.valide && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5B21B6]">
                        <Lock className="w-3.5 h-3.5" />
                        Verrouillé
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#111111]/60">
                    {item.valide
                      ? `Validé le ${item.valideLe}`
                      : enoughFunds || !salaryReady
                        ? 'En attente de validation irréversible'
                        : 'Solde disponible insuffisant pour ce montant'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                  <span className="font-mono-num text-base font-bold text-[#111111]">
                    {formatFCFA(item.montant)}
                  </span>

                  {item.valide ? (
                    <span className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#DDEBD8] to-[#EDE9FE] text-[#075B2E] text-xs font-bold">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <motion.path
                          d="M5 13l4 4L19 7"
                          stroke="#5B21B6"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                        />
                      </svg>
                      Validé
                    </span>
                  ) : confirmKey === key ? (
                    <div className="flex items-center gap-2 bg-[#EDE9FE]/85 border border-[#5B21B6]/25 p-1.5 rounded-xl">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        type="button"
                        disabled={busy}
                        onClick={() => handleValidate(key)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#075B2E] to-[#6D28D9] text-white text-xs font-bold cursor-pointer"
                      >
                        Confirmer
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmKey(null)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white text-[#111111] text-xs font-semibold cursor-pointer"
                      >
                        Annuler
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={canValidate ? { scale: 1.04 } : undefined}
                      whileTap={canValidate ? { scale: 0.96 } : undefined}
                      type="button"
                      disabled={!canValidate || busy}
                      onClick={() => setConfirmKey(key)}
                      className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        canValidate
                          ? 'bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#6D28D9] text-white shadow-md cursor-pointer'
                          : 'bg-[#DDEBD8]/65 text-[#111111]/45 cursor-not-allowed'
                      }`}
                    >
                      Valider
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
