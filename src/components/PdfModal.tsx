import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#2B1508]/55 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F6EAD6] border border-[#DFC5A2] rounded-t-3xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_28px_70px_-15px_rgba(124,45,18,0.45)]"
          >
            {/* Mobile bottom-sheet grab handle */}
            <div className="sm:hidden bg-gradient-to-r from-[#9A3412] via-[#C2410C] to-[#EA580C] pt-2.5 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-white/40" />
            </div>

            <div className="bg-gradient-to-r from-[#9A3412] via-[#C2410C] to-[#EA580C] text-white px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 id="pdf-modal-title" className="font-display text-base sm:text-lg font-bold truncate">
                  Aperçu du bilan — {month.label}
                </h2>
                <p className="text-xs text-[#FDE2C4] mt-0.5 truncate">
                  {month.cycleLabel} · {month.statut} · {formatDateDuJour()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => generateMonthlyPdf(month, expenses, history)}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FAF0DF] text-[#9A3412] hover:bg-[#FDE2C4] text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4 text-[#15803D]" />
                  <span>Télécharger PDF</span>
                </motion.button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#FAF0DF] hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  aria-label="Fermer l'aperçu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm text-[#1F160F]">
              {/* Salaire & Loyer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-[#FBF4E8] via-[#F5E6CE] to-[#EED5B4] border border-[#DFC5A2] rounded-2xl p-4 space-y-2">
                  <h3 className="text-xs font-bold tracking-wide text-[#9A3412]">
                    Salaire du mois
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-[#2B1E14]/75">Salaire reçu (+ bonus)</span>
                    <span className="font-mono-num font-semibold">{formatFCFA(totalRecu)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#2B1E14]/75">Montant actif</span>
                    <span className="font-mono-num font-semibold text-[#15803D]">
                      {formatFCFA(month.salaire.montantActif)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#2B1E14]/75">Excédent vers Surplus</span>
                    <span className="font-mono-num">{formatFCFA(month.salaire.excedentTransfere)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#DFC5A2]">
                    <span className="font-semibold">Disponible restant</span>
                    <span className="font-mono-num font-bold text-[#C2410C]">
                      {formatFCFA(month.salaire.argentEncoreDisponible)}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#FBF4E8] via-[#F5E6CE] to-[#FDE2C4]/75 border border-[#DFC5A2] rounded-2xl p-4 space-y-2">
                  <h3 className="text-xs font-bold tracking-wide text-[#C2410C]">
                    Coffre Loyer (hors budget)
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-[#2B1E14]/75">Montant du loyer</span>
                    <span className="font-mono-num font-semibold">{formatFCFA(month.loyer.montant)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#2B1E14]/75">Date limite</span>
                    <span className="font-mono-num">{month.loyer.dateLimite}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#DFC5A2]">
                    <span className="font-semibold">Statut</span>
                    <span className="font-semibold text-[#15803D]">{rentStatus.badgeLabel}</span>
                  </div>
                </div>
              </div>

              {/* Fixes */}
              <div className="border border-[#DFC5A2] bg-[#FBF4E8] rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#EFE0C9] via-[#EBD4B4] to-[#FDE2C4]/75 px-4 py-2.5 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#9A3412]">
                    Fixes irréversibles (102 000 F CFA)
                  </h3>
                  <span className="font-mono-num text-xs font-bold text-[#C2410C]">
                    Validés : {formatFCFA(totalFixesValides)}
                  </span>
                </div>
                <div className="divide-y divide-[#EFE0C9]">
                  {FIXES_ORDER.map((k) => {
                    const item = month.fixes[k];
                    return (
                      <div key={k} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs text-[#2B1E14]/65 ml-2">
                            · {item.valide ? `Validé (${item.valideLe})` : 'En attente'}
                          </span>
                        </div>
                        <span className="font-mono-num font-medium shrink-0">{formatFCFA(item.montant)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dépenses */}
              <div className="border border-[#DFC5A2] bg-[#FBF4E8] rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#EFE0C9] via-[#EBD4B4] to-[#FDE2C4]/75 px-4 py-2.5 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#9A3412]">
                    Dépenses petit à petit (36 000 F CFA)
                  </h3>
                  <span className="font-mono-num text-xs font-bold text-[#C2410C]">
                    Dépensé : {formatFCFA(totalDepensesCumulees)}
                  </span>
                </div>
                <div className="divide-y divide-[#EFE0C9]">
                  {DEPENSES_ORDER.map((k) => {
                    const cat = month.depensesCategories[k];
                    const reste = Math.max(0, cat.budgetAlloue - cat.depenseCumulee);
                    return (
                      <div key={k} className="px-4 py-2.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="font-medium">{cat.label}</span>
                          <span className="text-xs text-[#2B1E14]/65 ml-2">
                            ·{' '}
                            {cat.cloturee
                              ? `Clôturée (${formatFCFA(cat.resteTransfereSurplus)} vers Surplus)`
                              : `Reste : ${formatFCFA(reste)}`}
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
              <div className="border border-[#DFC5A2] bg-[#FBF4E8] rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#EFE0C9] via-[#EBD4B4] to-[#FDE2C4]/75 px-4 py-2.5">
                  <h3 className="text-xs font-bold text-[#9A3412]">
                    Soldes des Caisses et Caisse Surplus
                  </h3>
                </div>
                <div className="divide-y divide-[#EFE0C9]">
                  {CAISSES_FOUR_ORDER.map((k) => {
                    const c = month.caisses[k];
                    return (
                      <div key={k} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-medium">{c.label}</span>
                          <span className="text-xs text-[#2B1E14]/65 ml-2">
                            · Report : {formatFCFA(c.soldePrecedent)}
                          </span>
                        </div>
                        <span className="font-mono-num font-bold text-[#15803D]">
                          {formatFCFA(c.soldeActuel)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-[#F5E4CA] to-[#FDE2C4]/75">
                    <div>
                      <span className="font-semibold text-[#9A3412]">Caisse Surplus</span>
                      <span className="text-xs text-[#2B1E14]/65 ml-2">
                        · Report : {formatFCFA(month.caisses.surplus.soldePrecedent)}
                      </span>
                    </div>
                    <span className="font-mono-num font-bold text-[#C2410C]">
                      {formatFCFA(month.caisses.surplus.soldeActuel)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historique du mois */}
              <div className="border border-[#DFC5A2] bg-[#FBF4E8] rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#EFE0C9] via-[#EBD4B4] to-[#FDE2C4]/75 px-4 py-2.5 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#9A3412]">
                    Historique du mois ({monthHistory.length} opérations)
                  </h3>
                </div>
                {monthHistory.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-[#2B1E14]/65">
                    Aucune opération enregistrée pour ce mois.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EFE0C9] max-h-56 overflow-y-auto">
                    {monthHistory.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1F160F] truncate">
                            {HISTORY_TYPE_LABELS[item.type]} · {item.categorie}
                          </p>
                          <p className="text-[#2B1E14]/65 truncate">
                            {item.dateOperation} {item.heureOperation} · {item.motif}
                          </p>
                        </div>
                        <div className="text-right shrink-0 font-mono-num">
                          <p className="font-semibold text-[#EA580C]">{formatFCFA(item.montant)}</p>
                          <p className="text-[11px] text-[#2B1E14]/60">
                            {formatFCFA(item.soldeAvant)} → {formatFCFA(item.soldeApres)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
