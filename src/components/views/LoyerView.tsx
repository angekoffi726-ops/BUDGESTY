import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { BudgetMonth, LOYER_MONTANT } from '../../types/budget';
import { payRent } from '../../lib/budgetService';
import { evaluateRentStatus, formatFCFA, formatIsoDateFr } from '../../lib/format';
import { AnimatedNumber } from '../AnimatedNumber';

interface LoyerViewProps {
  userId: string;
  month: BudgetMonth;
}

export const LoyerView: React.FC<LoyerViewProps> = ({ userId, month }) => {
  const [confirmPay, setConfirmPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const rentStatus = evaluateRentStatus(month);
  const isMonthOpen = month.statut === 'OUVERT';
  const salaryReady = month.salaire.alimentee;
  const canExecutePay = isMonthOpen && salaryReady && rentStatus.canPay && !month.loyer.paye;

  const currentStep = month.loyer.paye
    ? 3
    : rentStatus.status === 'AUTORISE' || rentStatus.status === 'RETARD'
      ? 2
      : 1;

  const handlePayRent = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      await payRent(userId, month);
      setConfirmPay(false);
      setSuccessMsg('Loyer payé et verrouillé de manière irréversible.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du paiement du loyer.');
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
        className="bg-[#F6EAD6]/95 backdrop-blur-2xl border border-[#DFC5A2] rounded-3xl p-5 sm:p-6 shadow-[0_22px_54px_-16px_rgba(124,45,18,0.26)] space-y-5 sm:space-y-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#DFC5A2]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C2410C] via-[#EA580C] to-[#F97316] text-white flex items-center justify-center shadow-md shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#1F160F]">
                Coffre Loyer — {month.label}
              </h2>
              <p className="text-xs text-[#2B1E14]/75 mt-0.5">
                Suivi indépendant strictement exclu du budget de fonctionnement de 155 000 F CFA
                <span className="mx-1.5 text-[#EA580C]/50">·</span>
                <strong className="text-[#C2410C]">{rentStatus.badgeLabel}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Visual 3-step window tracker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: 1, title: '1er au 24', sub: 'Bloqué jusqu’au 25' },
            { step: 2, title: '25 à 00h00 – 28 à 23h59', sub: 'Fenêtre de paiement ouverte' },
            { step: 3, title: 'Validation', sub: 'Verrouillé après paiement' },
          ].map((item, idx) => {
            const reached = currentStep >= item.step;
            const active = currentStep === item.step;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                whileHover={{ y: -2 }}
                className={`rounded-2xl p-3.5 border transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white border-transparent shadow-[0_14px_28px_-10px_rgba(234,88,12,0.45)]'
                    : reached
                      ? 'bg-gradient-to-r from-[#EFE0C9] to-[#FDE2C4]/75 text-[#9A3412] border-[#D7B88E]'
                      : 'bg-[#FBF4E8] text-[#2B1E14]/65 border-[#DFC5A2]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{item.step}. {item.title}</span>
                  {reached && !active && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#15803D]" />}
                </div>
                <p
                  className={`text-[11px] mt-1 ${
                    active ? 'text-[#FDE2C4]' : 'text-current opacity-80'
                  }`}
                >
                  {item.sub}
                </p>
              </motion.div>
            );
          })}
        </div>

        {!salaryReady && isMonthOpen && (
          <div className="p-4 rounded-2xl border border-[#EA580C]/40 bg-gradient-to-r from-[#EFE0C9] to-[#FDE2C4]/85 text-[#7C2D12] text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#EA580C]" />
            <span>
              Salaire non alimenté : veuillez d’abord alimenter le salaire du mois dans l’onglet
              Accueil avant de valider le loyer.
            </span>
          </div>
        )}

        {rentStatus.status === 'RETARD' && !month.loyer.paye && (
          <div className="p-4 rounded-2xl border border-red-300 bg-red-50/95 text-red-900 text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-700" />
            <div>
              <p className="font-bold">LOYER EN RETARD</p>
              <p className="text-xs mt-0.5">
                La date limite du {formatIsoDateFr(month.loyer.dateLimite)} à 23h59 est dépassée.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm"
            >
              {errorMsg}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-xl border border-[#DFC5A2] bg-[#FBF4E8] text-[#15803D] text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803D]" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9A3412] via-[#C2410C] to-[#EA580C] text-white p-5 shadow-[0_18px_36px_-12px_rgba(124,45,18,0.45)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-white/16 to-transparent animate-sheen"
            />
            <p className="relative z-10 text-xs text-[#FDE2C4] font-medium">Montant mensuel du loyer</p>
            <p className="relative z-10 font-display font-mono-num text-2xl sm:text-3xl font-extrabold text-[#FAF0DF] mt-1">
              <AnimatedNumber value={LOYER_MONTANT} />
            </p>
            <p className="relative z-10 text-xs text-[#F5E4CA]/90 mt-1.5">Hors budget 155 000 F CFA</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="bg-[#FBF4E8] border border-[#DFC5A2] rounded-2xl p-5 flex flex-col justify-center shadow-xs"
          >
            <p className="text-xs text-[#2B1E14]/65 font-medium">Date limite</p>
            <p className="font-mono-num text-base font-bold text-[#1F160F] mt-1">
              {formatIsoDateFr(month.loyer.dateLimite)} · 23h59
            </p>
            <p className="text-xs text-[#EA580C] font-medium mt-1">Fenêtre du 25 à 00h00 au 28 à 23h59</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="bg-gradient-to-br from-[#EFE0C9] via-[#F6EAD6] to-[#FDE2C4]/70 border border-[#DFC5A2] rounded-2xl p-5 flex flex-col justify-center shadow-xs"
          >
            <p className="text-xs text-[#C2410C] font-semibold">Impact sur le disponible</p>
            <p className="font-mono-num text-xl font-bold text-[#15803D] mt-1">0 F CFA</p>
            <p className="text-xs text-[#2B1E14]/65 mt-1">
              Ne réduit jamais le budget de 155 000 F
            </p>
          </motion.div>
        </div>

        {/* Règles de la fenêtre */}
        <div className="bg-gradient-to-r from-[#EFE0C9] via-[#F6EAD6] to-[#FDE2C4]/65 border border-[#DFC5A2] rounded-2xl p-4 space-y-1.5 text-xs text-[#2B1E14]/85">
          <p className="font-semibold text-[#C2410C]">Règles de la fenêtre de paiement :</p>
          <p>· Du 1er au 24 : bouton désactivé (« BLOQUÉ JUSQU&apos;AU 25 »).</p>
          <p>· Du 25 à 00h00 au 28 à 23h59 : paiement autorisé (« PAYER LE LOYER »).</p>
          <p>· Après le 28 si non payé : alerte « LOYER EN RETARD ».</p>
          <p>· Une fois payé : validation irréversible et verrouillée (« LOYER PAYÉ — VERROUILLÉ »).</p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-[#2B1E14]/75">{rentStatus.helperText}</p>

          {month.loyer.paye ? (
            <button
              type="button"
              disabled
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#EFE0C9] to-[#FDE2C4] text-[#15803D] border border-[#DFC5A2] text-sm font-bold cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-[#15803D]" />
              <span>LOYER PAYÉ — VERROUILLÉ</span>
            </button>
          ) : !confirmPay ? (
            <motion.button
              whileHover={canExecutePay ? { scale: 1.03, y: -1 } : undefined}
              whileTap={canExecutePay ? { scale: 0.97 } : undefined}
              type="button"
              disabled={!canExecutePay || busy}
              onClick={() => setConfirmPay(true)}
              className={`w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                canExecutePay
                  ? 'bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white shadow-[0_14px_30px_-8px_rgba(234,88,12,0.5)] cursor-pointer'
                  : 'bg-[#E2CAA6] text-[#2B1E14]/50 cursor-not-allowed'
              }`}
            >
              {!rentStatus.canPay && <Lock className="w-4 h-4" />}
              <span>{rentStatus.buttonLabel}</span>
            </motion.button>
          ) : (
            <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-2 bg-[#FDE2C4]/85 border border-[#FB923C]/45 p-2.5 rounded-xl">
              <span className="text-xs font-semibold text-[#7C2D12] px-1">
                Confirmer paiement de {formatFCFA(LOYER_MONTANT)} :
              </span>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  disabled={busy}
                  onClick={handlePayRent}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-gradient-to-r from-[#C2410C] to-[#EA580C] text-white text-xs font-bold cursor-pointer"
                >
                  Confirmer
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmPay(false)}
                  className="min-h-[42px] px-3.5 py-2 rounded-lg bg-[#FBF4E8] border border-[#DFC5A2] text-[#1F160F] text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
