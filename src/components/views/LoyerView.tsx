import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { BudgetMonth, LOYER_MONTANT } from '../../types/budget';
import { payRent } from '../../lib/budgetService';
import { evaluateRentStatus, formatFCFA, formatIsoDateFr } from '../../lib/format';

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
    <div className="space-y-6">
      <div className="border border-[#DDEBD8] bg-white rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#DDEBD8]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-[#075B2E]" />
              <h2 className="text-lg font-bold text-[#111111]">
                Coffre Loyer — {month.label}
              </h2>
            </div>
            <p className="text-xs text-[#111111]/70">
              Suivi indépendant strictement exclu du budget de fonctionnement de 155 000 F CFA.
            </p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-md ${
              rentStatus.status === 'PAYE'
                ? 'bg-[#DDEBD8] text-[#075B2E]'
                : rentStatus.status === 'RETARD'
                  ? 'bg-red-100 text-red-800'
                  : rentStatus.status === 'AUTORISE'
                    ? 'bg-[#006B35] text-white'
                    : 'bg-[#DDEBD8]/50 text-[#111111]/75'
            }`}
          >
            {rentStatus.badgeLabel}
          </span>
        </div>

        {!salaryReady && isMonthOpen && (
          <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
            <span>
              Salaire non alimenté : veuillez d’abord alimenter le salaire du mois dans l’onglet
              Accueil avant de valider le loyer.
            </span>
          </div>
        )}

        {rentStatus.status === 'RETARD' && !month.loyer.paye && (
          <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-900 text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-700" />
            <div>
              <p className="font-bold">LOYER EN RETARD</p>
              <p className="text-xs mt-0.5">
                La date limite du {formatIsoDateFr(month.loyer.dateLimite)} à 23h59 est dépassée.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-lg border border-[#006B35]/30 bg-[#DDEBD8]/50 text-[#075B2E] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#DDEBD8]/30 rounded-lg p-4">
            <p className="text-xs text-[#075B2E] font-medium">Montant mensuel du loyer</p>
            <p className="font-mono-num text-2xl font-bold text-[#075B2E] mt-1">
              {formatFCFA(LOYER_MONTANT)}
            </p>
            <p className="text-xs text-[#111111]/65 mt-1">Hors budget 155 000 F CFA</p>
          </div>

          <div className="border border-[#DDEBD8] rounded-lg p-4">
            <p className="text-xs text-[#111111]/65 font-medium">Date limite</p>
            <p className="font-mono-num text-base font-bold text-[#111111] mt-1">
              {formatIsoDateFr(month.loyer.dateLimite)} · 23h59
            </p>
            <p className="text-xs text-[#111111]/65 mt-1">Fenêtre du 25 à 00h00 au 28 à 23h59</p>
          </div>

          <div className="border border-[#DDEBD8] rounded-lg p-4">
            <p className="text-xs text-[#111111]/65 font-medium">Impact sur le disponible</p>
            <p className="font-mono-num text-base font-bold text-[#006B35] mt-1">0 F CFA</p>
            <p className="text-xs text-[#111111]/65 mt-1">
              Ne réduit jamais le budget de 155 000 F
            </p>
          </div>
        </div>

        {/* Calendrier des règles */}
        <div className="border border-[#DDEBD8] rounded-lg p-4 space-y-2 text-xs text-[#111111]/80">
          <p className="font-semibold text-[#075B2E]">Règles de la fenêtre de paiement :</p>
          <p>· Du 1er au 24 : bouton désactivé (« BLOQUÉ JUSQU&apos;AU 25 »).</p>
          <p>· Du 25 à 00h00 au 28 à 23h59 : paiement autorisé (« PAYER LE LOYER »).</p>
          <p>· Après le 28 si non payé : alerte « LOYER EN RETARD ».</p>
          <p>· Une fois payé : validation irréversible et verrouillée (« LOYER PAYÉ — VERROUILLÉ »).</p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[#111111]/70">{rentStatus.helperText}</p>

          {month.loyer.paye ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#DDEBD8] text-[#075B2E] text-sm font-bold cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>LOYER PAYÉ — VERROUILLÉ</span>
            </button>
          ) : !confirmPay ? (
            <button
              type="button"
              disabled={!canExecutePay || busy}
              onClick={() => setConfirmPay(true)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                canExecutePay
                  ? 'bg-[#006B35] hover:bg-[#075B2E] text-white cursor-pointer'
                  : 'bg-[#DDEBD8]/60 text-[#111111]/50 cursor-not-allowed'
              }`}
            >
              {!rentStatus.canPay && <Lock className="w-4 h-4" />}
              <span>{rentStatus.buttonLabel}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-[#DDEBD8]/60 p-2 rounded-lg">
              <span className="text-xs font-semibold text-[#075B2E] px-2">
                Confirmer paiement de {formatFCFA(LOYER_MONTANT)} :
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={handlePayRent}
                className="px-3.5 py-1.5 rounded-md bg-[#075B2E] text-white text-xs font-bold cursor-pointer"
              >
                Confirmer
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmPay(false)}
                className="px-3 py-1.5 rounded-md bg-white text-[#111111] text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
