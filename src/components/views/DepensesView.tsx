import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Receipt,
  ShieldAlert,
} from 'lucide-react';
import {
  BudgetMonth,
  DEPENSES_ORDER,
  DepenseCategoryKey,
  ExpenseEntry,
  MAX_EXPENSE_DESC_LENGTH,
  MAX_EXPENSE_NOTE_LENGTH,
  TOTAL_DEPENSES_BUDGET,
} from '../../types/budget';
import { addExpense, closeExpenseCategory } from '../../lib/budgetService';
import { formatFCFA, getTodayIsoDate } from '../../lib/format';
import { AnimatedNumber } from '../AnimatedNumber';

interface DepensesViewProps {
  userId: string;
  month: BudgetMonth;
  expenses: ExpenseEntry[];
}

export const DepensesView: React.FC<DepensesViewProps> = ({
  userId,
  month,
  expenses,
}) => {
  const [activeCat, setActiveCat] = useState<DepenseCategoryKey>('maison');
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [montant, setMontant] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [confirmCloseCat, setConfirmCloseCat] = useState<DepenseCategoryKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMonthOpen = month.statut === 'OUVERT';
  const salaryReady = month.salaire.alimentee;

  const totalDepense = DEPENSES_ORDER.reduce(
    (sum, k) => sum + month.depensesCategories[k].depenseCumulee,
    0
  );
  const depensePct = Math.min(100, (totalDepense / TOTAL_DEPENSES_BUDGET) * 100);
  const ringCircumference = 2 * Math.PI * 24;
  const ringOffset = ringCircumference * (1 - depensePct / 100);

  const selectedCat = month.depensesCategories[activeCat];
  const resteSelected = Math.max(0, selectedCat.budgetAlloue - selectedCat.depenseCumulee);
  const canAddToSelected =
    isMonthOpen &&
    salaryReady &&
    !selectedCat.cloturee &&
    resteSelected > 0 &&
    month.salaire.argentEncoreDisponible > 0;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const parsed = Math.round(Number(montant) || 0);
    if (parsed <= 0) {
      setErrorMsg('Veuillez saisir un montant strictement positif.');
      return;
    }
    setBusy(true);
    try {
      await addExpense(userId, month, {
        categorieId: activeCat,
        date,
        montant: parsed,
        description,
        note,
      });
      setMontant('');
      setDescription('');
      setNote('');
      setSuccessMsg('Dépense enregistrée et déduite du solde disponible.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de l’ajout de la dépense.');
    } finally {
      setBusy(false);
    }
  };

  const handleCloseCategory = async (catKey: DepenseCategoryKey) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      await closeExpenseCategory(userId, month, catKey);
      setConfirmCloseCat(null);
      setSuccessMsg(
        `Catégorie « ${month.depensesCategories[catKey].label} » clôturée définitivement.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la clôture.');
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
        className="bg-[#F6EAD6]/95 backdrop-blur-2xl border border-[#DFC5A2] rounded-3xl p-5 sm:p-6 shadow-[0_22px_54px_-16px_rgba(124,45,18,0.26)] space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DFC5A2]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C2410C] via-[#EA580C] to-[#F97316] text-white flex items-center justify-center shadow-md shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#1F160F]">
                Dépenses petit à petit — {month.label}
              </h2>
              <p className="text-xs text-[#2B1E14]/75 mt-0.5">
                Suivi daté des achats courants. La clôture d’une catégorie transfère son reliquat
                positif vers la Caisse Surplus.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-[#2B1E14]/65">Cumulé / Enveloppe</p>
            <p className="font-mono-num text-lg font-bold text-[#C2410C]">
              <AnimatedNumber value={totalDepense} /> / {formatFCFA(TOTAL_DEPENSES_BUDGET)}
            </p>
          </div>
        </div>

        {/* Gradient Banner with SVG progress ring + glint */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#9A3412] via-[#C2410C] to-[#EA580C] text-white p-4 sm:p-5 shadow-[0_18px_36px_-12px_rgba(124,45,18,0.42)] flex items-center justify-between gap-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-sheen"
          />
          <div className="relative z-10 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-[#FDE2C4]">Argent encore disponible ce mois</span>
              <span className="font-mono-num font-extrabold text-lg text-[#FAF0DF]">
                <AnimatedNumber value={month.salaire.argentEncoreDisponible} />
              </span>
            </div>
            <div className="h-3 bg-[#4A1907]/35 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${depensePct}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full rounded-full bg-gradient-to-r from-[#FAF0DF] via-[#FDBA74] to-[#34D399] overflow-hidden"
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
                stroke="rgba(250,240,223,0.28)"
                strokeWidth="5"
              />
              <motion.circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke="#FAF0DF"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                initial={{ strokeDashoffset: ringCircumference }}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <span className="absolute font-mono-num text-xs font-extrabold text-[#FAF0DF]">
              {Math.round(depensePct)}%
            </span>
          </div>
        </div>

        {isMonthOpen && !salaryReady && (
          <div className="p-4 rounded-2xl border border-[#EA580C]/40 bg-gradient-to-r from-[#EFE0C9] to-[#FDE2C4]/85 text-[#7C2D12] text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#EA580C]" />
            <span>
              Salaire non alimenté : alimentez le salaire dans l’onglet Accueil avant d’ajouter ou
              clôturer une dépense.
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
              className="p-3.5 rounded-xl border border-[#DFC5A2] bg-[#FBF4E8] text-[#15803D] text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803D]" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3 Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEPENSES_ORDER.map((catKey, idx) => {
            const cat = month.depensesCategories[catKey];
            const reste = Math.max(0, cat.budgetAlloue - cat.depenseCumulee);
            const transferable = Math.min(reste, month.salaire.argentEncoreDisponible);
            const pct = Math.min(100, (cat.depenseCumulee / cat.budgetAlloue) * 100);
            const isSelected = activeCat === catKey;

            return (
              <motion.div
                key={catKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: idx * 0.05 }}
                whileHover={{ y: -3, scale: 1.01 }}
                className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all ${
                  isSelected
                    ? 'border-[#EA580C]/55 bg-gradient-to-br from-[#EFE0C9] via-[#F6EAD6] to-[#FDE2C4]/80 shadow-[0_16px_32px_-14px_rgba(234,88,12,0.3)]'
                    : 'border-[#DFC5A2] bg-[#FBF4E8] hover:border-[#EA580C]/35 shadow-xs'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#1F160F] leading-snug">
                      {cat.label}
                    </h3>
                    {cat.cloturee && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                        Clôturée
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between text-xs pt-1">
                    <span className="text-[#2B1E14]/65">Dépensé</span>
                    <span className="font-mono-num font-bold text-[#1F160F]">
                      {formatFCFA(cat.depenseCumulee)} / {formatFCFA(cat.budgetAlloue)}
                    </span>
                  </div>

                  <div className="h-2.5 bg-[#E3CCA8] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="relative h-full rounded-full bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#FB923C] overflow-hidden"
                    >
                      <span className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-glint" />
                    </motion.div>
                  </div>

                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[#2B1E14]/65">
                      {cat.cloturee ? 'Transféré Surplus' : 'Reste catégorie'}
                    </span>
                    <span className="font-mono-num font-semibold text-[#C2410C]">
                      {cat.cloturee
                        ? formatFCFA(cat.resteTransfereSurplus)
                        : formatFCFA(reste)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#DFC5A2] flex flex-wrap items-center justify-between gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setActiveCat(catKey)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white shadow-sm'
                        : 'bg-gradient-to-r from-[#EFE0C9] to-[#FDE2C4] text-[#9A3412] hover:from-[#FDE2C4] hover:to-[#FDBA74]/60'
                    }`}
                  >
                    {isSelected ? 'Sélectionnée' : 'Sélectionner'}
                  </motion.button>

                  {!cat.cloturee && isMonthOpen && salaryReady && (
                    confirmCloseCat === catKey ? (
                      <div className="flex items-center gap-1.5">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          disabled={busy}
                          onClick={() => handleCloseCategory(catKey)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#C2410C] to-[#EA580C] text-white text-[11px] font-bold cursor-pointer"
                        >
                          Confirmer ({formatFCFA(transferable)})
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmCloseCat(null)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[#DFC5A2] bg-[#FBF4E8] text-[11px] font-semibold cursor-pointer"
                        >
                          Annuler
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmCloseCat(catKey)}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#C2410C]/40 text-[#9A3412] hover:bg-gradient-to-r hover:from-[#C2410C] hover:to-[#EA580C] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Clôturer
                      </motion.button>
                    )
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add Expense Form */}
        {isMonthOpen && (
          <form
            onSubmit={handleAddExpense}
            className="border border-[#DFC5A2] rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#EFE0C9] via-[#F6EAD6] to-[#FDE2C4]/70 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#9A3412]">
                Ajouter une dépense — <span className="text-[#EA580C]">{selectedCat.label}</span>
              </h3>
              <span className="text-xs font-mono-num font-semibold text-[#15803D] bg-[#FBF4E8] px-2.5 py-1 rounded-lg border border-[#D7B88E]">
                Plafond injectable :{' '}
                {formatFCFA(Math.min(resteSelected, month.salaire.argentEncoreDisponible))}
              </span>
            </div>

            {selectedCat.cloturee ? (
              <p className="text-xs text-[#C2410C] font-medium">
                Cette catégorie est clôturée définitivement ({selectedCat.clotureeLe}).
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F160F] mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      disabled={!canAddToSelected || busy}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 text-sm font-mono-num bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F160F] mb-1">
                      Montant (F CFA)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.min(resteSelected, month.salaire.argentEncoreDisponible) || 155000}
                      required
                      disabled={!canAddToSelected || busy}
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                      placeholder="Ex. 2500"
                      className="w-full min-h-[44px] px-3 py-2 text-sm font-mono-num bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F160F] mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={MAX_EXPENSE_DESC_LENGTH}
                      disabled={!canAddToSelected || busy}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex. Riz 5 kg + huile"
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F160F] mb-1">
                      Note (optionnelle)
                    </label>
                    <input
                      type="text"
                      maxLength={MAX_EXPENSE_NOTE_LENGTH}
                      disabled={!canAddToSelected || busy}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Précision..."
                      className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <motion.button
                    whileHover={canAddToSelected ? { scale: 1.02, y: -1 } : undefined}
                    whileTap={canAddToSelected ? { scale: 0.97 } : undefined}
                    type="submit"
                    disabled={!canAddToSelected || busy}
                    className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enregistrer la dépense</span>
                  </motion.button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Recorded expenses list: stacked mobile cards + desktop table */}
        <div className="border border-[#DFC5A2] rounded-2xl overflow-hidden bg-[#FBF4E8]">
          <div className="bg-gradient-to-r from-[#EFE0C9] via-[#EBD4B4] to-[#FDE2C4]/75 px-4 py-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#9A3412]">
              Dépenses enregistrées sur {month.label}{' '}
              <span className="text-[#EA580C]">({expenses.length})</span>
            </h3>
          </div>
          {expenses.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#2B1E14]/65">
              Aucune dépense enregistrée pour ce mois. Sélectionnez une catégorie ci-dessus pour
              enregistrer votre première dépense datée.
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-[#EFE0C9]">
                {expenses.map((exp, idx) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.25) }}
                    className="p-4 space-y-1.5 bg-[#FBF4E8]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1F160F] truncate">
                          {exp.description}
                        </p>
                        <p className="text-[11px] font-semibold text-[#9A3412] mt-0.5">
                          {month.depensesCategories[exp.categorieId]?.label || exp.categorieId}
                          <span className="text-[#2B1E14]/40 mx-1.5">·</span>
                          <span className="font-mono-num text-[#2B1E14]/65">{exp.date}</span>
                        </p>
                      </div>
                      <span className="font-mono-num text-sm font-bold text-[#EA580C] whitespace-nowrap shrink-0">
                        {formatFCFA(exp.montant)}
                      </span>
                    </div>
                    {exp.note && (
                      <p className="text-xs text-[#2B1E14]/75 bg-gradient-to-r from-[#EFE0C9] to-[#FDE2C4]/65 px-2.5 py-1.5 rounded-lg">
                        {exp.note}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#DFC5A2] text-[#5C3A21] bg-[#F5E6CE]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Catégorie</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold">Note</th>
                      <th className="py-3 px-4 font-semibold text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE0C9]">
                    {expenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-gradient-to-r hover:from-[#EFE0C9]/70 hover:to-[#FDE2C4]/45 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono-num whitespace-nowrap">{exp.date}</td>
                        <td className="py-3 px-4 font-medium text-[#9A3412]">
                          {month.depensesCategories[exp.categorieId]?.label || exp.categorieId}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#1F160F]">
                          {exp.description}
                        </td>
                        <td className="py-3 px-4 text-[#2B1E14]/65">{exp.note || '—'}</td>
                        <td className="py-3 px-4 font-mono-num font-bold text-right whitespace-nowrap text-[#EA580C]">
                          {formatFCFA(exp.montant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
