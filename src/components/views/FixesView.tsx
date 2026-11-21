import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, LockKeyhole, ShieldAlert } from 'lucide-react';
import {
  BudgetMonth,
  FIXES_ORDER,
  FixeKey,
  TOTAL_FIXES_BUDGET,
} from '../../types/budget';
import { validateFixe } from '../../lib/budgetService';
import { formatFCFA } from '../../lib/format';

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
    <div className="space-y-6">
      <div className="border border-[#DDEBD8] bg-white rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DDEBD8]">
          <div>
            <div className="flex items-center gap-2.5">
              <LockKeyhole className="w-5 h-5 text-[#075B2E]" />
              <h2 className="text-lg font-bold text-[#111111]">
                Fixes irréversibles — {month.label}
              </h2>
            </div>
            <p className="text-xs text-[#111111]/70 mt-1">
              Chaque charge fixe validée est définitivement verrouillée et déduite de l’argent
              encore disponible.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#111111]/60">Validés / Enveloppe</p>
            <p className="font-mono-num text-lg font-bold text-[#075B2E]">
              {formatFCFA(totalValide)} / {formatFCFA(TOTAL_FIXES_BUDGET)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#DDEBD8]/35 rounded-lg px-4 py-3 text-sm">
          <span className="font-medium text-[#075B2E]">Argent encore disponible ce mois</span>
          <span className="font-mono-num font-bold text-[#006B35]">
            {formatFCFA(month.salaire.argentEncoreDisponible)}
          </span>
        </div>

        {isMonthOpen && !salaryReady && (
          <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
            <span>
              Salaire non alimenté : alimentez d’abord le salaire dans l’onglet Accueil pour
              pouvoir valider vos fixes.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-lg border border-[#006B35]/30 bg-[#DDEBD8]/50 text-[#075B2E] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="divide-y divide-[#DDEBD8] border border-[#DDEBD8] rounded-xl overflow-hidden">
          {FIXES_ORDER.map((key) => {
            const item = month.fixes[key];
            const enoughFunds = month.salaire.argentEncoreDisponible >= item.montant;
            const canValidate = isMonthOpen && salaryReady && !item.valide && enoughFunds;

            return (
              <div
                key={key}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  item.valide ? 'bg-[#DDEBD8]/20' : 'bg-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#111111]">{item.label}</span>
                    {item.valide && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#075B2E]">
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

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span className="font-mono-num text-base font-bold text-[#111111]">
                    {formatFCFA(item.montant)}
                  </span>

                  {item.valide ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#DDEBD8] text-[#075B2E] text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Validé
                    </span>
                  ) : confirmKey === key ? (
                    <div className="flex items-center gap-2 bg-[#DDEBD8]/60 p-1.5 rounded-lg">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleValidate(key)}
                        className="px-3 py-1.5 rounded-md bg-[#075B2E] text-white text-xs font-bold cursor-pointer"
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmKey(null)}
                        className="px-2.5 py-1.5 rounded-md bg-white text-[#111111] text-xs font-semibold cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canValidate || busy}
                      onClick={() => setConfirmKey(key)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                        canValidate
                          ? 'bg-[#006B35] hover:bg-[#075B2E] text-white cursor-pointer'
                          : 'bg-[#DDEBD8]/60 text-[#111111]/45 cursor-not-allowed'
                      }`}
                    >
                      Valider
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
