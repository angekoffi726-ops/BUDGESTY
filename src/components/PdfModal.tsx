import React from 'react';
import { Download, X } from 'lucide-react';
import {
  BudgetMonth,
  CAISSES_FOUR_ORDER,
  DEPENSES_ORDER,
  ExpenseEntry,
  FIXES_ORDER,
  HISTORY_TYPE_LABELS,
  HistoryEntry,
} from '../types/budget';
import { evaluateRentStatus, formatDateDuJour, formatFCFA } from '../lib/format';
import { generateMonthlyPdf } from '../lib/pdfGenerator';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: BudgetMonth;
  expenses: ExpenseEntry[];
  history: HistoryEntry[];
}

export const PdfModal: React.FC<PdfModalProps> = ({
  isOpen,
  onClose,
  month,
  expenses,
  history,
}) => {
  if (!isOpen) return null;

  const rentStatus = evaluateRentStatus(month);
  const monthHistory = history.filter((h) => h.moisId === month.moisId);
  const totalRecu = month.salaire.montantARecevoir + month.salaire.bonus;
  const totalFixesValides = FIXES_ORDER.reduce(
    (sum, k) => sum + (month.fixes[k].valide ? month.fixes[k].montant : 0),
    0
  );
  const totalDepensesCumulees = DEPENSES_ORDER.reduce(
    (sum, k) => sum + month.depensesCategories[k].depenseCumulee,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div className="bg-white border border-[#DDEBD8] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-[#075B2E] text-white px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="pdf-modal-title" className="text-base font-bold">
              Aperçu du bilan mensuel — {month.label}
            </h2>
            <p className="text-xs text-[#DDEBD8] mt-0.5">
              {month.cycleLabel} · Statut : {month.statut} · {formatDateDuJour()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => generateMonthlyPdf(month, expenses, history)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#006B35] hover:bg-white hover:text-[#075B2E] text-white text-xs font-semibold border border-[#DDEBD8]/40 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-[#DDEBD8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Fermer l'aperçu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#111111]">
          {/* Salaire & Loyer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#DDEBD8] rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#075B2E]">
                Salaire du mois
              </h3>
              <div className="flex justify-between">
                <span className="text-[#111111]/75">Salaire reçu (+ bonus)</span>
                <span className="font-mono-num font-semibold">{formatFCFA(totalRecu)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111111]/75">Montant actif</span>
                <span className="font-mono-num font-semibold text-[#075B2E]">
                  {formatFCFA(month.salaire.montantActif)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111111]/75">Excédent vers Surplus</span>
                <span className="font-mono-num">{formatFCFA(month.salaire.excedentTransfere)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[#DDEBD8]">
                <span className="font-semibold">Disponible restant</span>
                <span className="font-mono-num font-bold text-[#006B35]">
                  {formatFCFA(month.salaire.argentEncoreDisponible)}
                </span>
              </div>
            </div>

            <div className="border border-[#DDEBD8] rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#075B2E]">
                Coffre Loyer (hors budget)
              </h3>
              <div className="flex justify-between">
                <span className="text-[#111111]/75">Montant du loyer</span>
                <span className="font-mono-num font-semibold">{formatFCFA(month.loyer.montant)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111111]/75">Date limite</span>
                <span className="font-mono-num">{month.loyer.dateLimite}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[#DDEBD8]">
                <span className="font-semibold">Statut</span>
                <span className="font-semibold text-[#075B2E]">{rentStatus.badgeLabel}</span>
              </div>
            </div>
          </div>

          {/* Fixes */}
          <div className="border border-[#DDEBD8] rounded-lg overflow-hidden">
            <div className="bg-[#DDEBD8]/45 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#075B2E]">
                Fixes irréversibles (102 000 F CFA)
              </h3>
              <span className="font-mono-num text-xs font-bold text-[#075B2E]">
                Validés : {formatFCFA(totalFixesValides)}
              </span>
            </div>
            <div className="divide-y divide-[#DDEBD8]">
              {FIXES_ORDER.map((k) => {
                const item = month.fixes[k];
                return (
                  <div key={k} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-[#111111]/60 ml-2">
                        · {item.valide ? `Validé (${item.valideLe})` : 'En attente'}
                      </span>
                    </div>
                    <span className="font-mono-num font-medium">{formatFCFA(item.montant)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dépenses */}
          <div className="border border-[#DDEBD8] rounded-lg overflow-hidden">
            <div className="bg-[#DDEBD8]/45 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#075B2E]">
                Dépenses petit à petit (36 000 F CFA)
              </h3>
              <span className="font-mono-num text-xs font-bold text-[#075B2E]">
                Dépensé : {formatFCFA(totalDepensesCumulees)}
              </span>
            </div>
            <div className="divide-y divide-[#DDEBD8]">
              {DEPENSES_ORDER.map((k) => {
                const cat = month.depensesCategories[k];
                const reste = Math.max(0, cat.budgetAlloue - cat.depenseCumulee);
                return (
                  <div key={k} className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-medium">{cat.label}</span>
                      <span className="text-xs text-[#111111]/60 ml-2">
                        · {cat.cloturee ? `Clôturée (${formatFCFA(cat.resteTransfereSurplus)} vers Surplus)` : `Reste : ${formatFCFA(reste)}`}
                      </span>
                    </div>
                    <span className="font-mono-num font-medium shrink-0">
                      {formatFCFA(cat.depenseCumulee)} / {formatFCFA(cat.budgetAlloue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Caisses & Surplus */}
          <div className="border border-[#DDEBD8] rounded-lg overflow-hidden">
            <div className="bg-[#DDEBD8]/45 px-4 py-2.5">
              <h3 className="text-xs font-bold text-[#075B2E]">
                Soldes des Caisses et Caisse Surplus
              </h3>
            </div>
            <div className="divide-y divide-[#DDEBD8]">
              {CAISSES_FOUR_ORDER.map((k) => {
                const c = month.caisses[k];
                return (
                  <div key={k} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{c.label}</span>
                      <span className="text-xs text-[#111111]/60 ml-2">
                        · Report : {formatFCFA(c.soldePrecedent)}
                      </span>
                    </div>
                    <span className="font-mono-num font-bold text-[#075B2E]">
                      {formatFCFA(c.soldeActuel)}
                    </span>
                  </div>
                );
              })}
              <div className="px-4 py-2.5 flex items-center justify-between bg-[#DDEBD8]/25">
                <div>
                  <span className="font-semibold text-[#075B2E]">Caisse Surplus</span>
                  <span className="text-xs text-[#111111]/60 ml-2">
                    · Report : {formatFCFA(month.caisses.surplus.soldePrecedent)}
                  </span>
                </div>
                <span className="font-mono-num font-bold text-[#006B35]">
                  {formatFCFA(month.caisses.surplus.soldeActuel)}
                </span>
              </div>
            </div>
          </div>

          {/* Historique du mois */}
          <div className="border border-[#DDEBD8] rounded-lg overflow-hidden">
            <div className="bg-[#DDEBD8]/45 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#075B2E]">
                Historique du mois ({monthHistory.length} opérations)
              </h3>
            </div>
            {monthHistory.length === 0 ? (
              <p className="px-4 py-4 text-xs text-[#111111]/65">
                Aucune opération enregistrée pour ce mois.
              </p>
            ) : (
              <div className="divide-y divide-[#DDEBD8] max-h-56 overflow-y-auto">
                {monthHistory.map((item) => (
                  <div key={item.id} className="px-4 py-2 flex items-center justify-between gap-4 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111111] truncate">
                        {HISTORY_TYPE_LABELS[item.type]} · {item.categorie}
                      </p>
                      <p className="text-[#111111]/65 truncate">
                        {item.dateOperation} {item.heureOperation} · {item.motif}
                      </p>
                    </div>
                    <div className="text-right shrink-0 font-mono-num">
                      <p className="font-semibold text-[#075B2E]">{formatFCFA(item.montant)}</p>
                      <p className="text-[11px] text-[#111111]/60">
                        {formatFCFA(item.soldeAvant)} → {formatFCFA(item.soldeApres)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
