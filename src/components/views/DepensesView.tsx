import React, { useState } from 'react';
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
    <div className="space-y-6">
      <div className="border border-[#DDEBD8] bg-white rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DDEBD8]">
          <div>
            <div className="flex items-center gap-2.5">
              <Receipt className="w-5 h-5 text-[#075B2E]" />
              <h2 className="text-lg font-bold text-[#111111]">
                Dépenses petit à petit — {month.label}
              </h2>
            </div>
            <p className="text-xs text-[#111111]/70 mt-1">
              Suivi daté des achats courants. La clôture d’une catégorie transfère son reliquat
              positif vers la Caisse Surplus.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#111111]/60">Cumulé / Enveloppe</p>
            <p className="font-mono-num text-lg font-bold text-[#075B2E]">
              {formatFCFA(totalDepense)} / {formatFCFA(TOTAL_DEPENSES_BUDGET)}
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
              Salaire non alimenté : alimentez le salaire dans l’onglet Accueil avant d’ajouter ou
              clôturer une dépense.
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

        {/* 3 Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEPENSES_ORDER.map((catKey) => {
            const cat = month.depensesCategories[catKey];
            const reste = Math.max(0, cat.budgetAlloue - cat.depenseCumulee);
            const transferable = Math.min(reste, month.salaire.argentEncoreDisponible);
            const pct = Math.min(100, (cat.depenseCumulee / cat.budgetAlloue) * 100);
            const isSelected = activeCat === catKey;

            return (
              <div
                key={catKey}
                className={`border rounded-xl p-4 flex flex-col justify-between space-y-4 transition-colors ${
                  isSelected
                    ? 'border-[#006B35] bg-[#DDEBD8]/20'
                    : 'border-[#DDEBD8] bg-white'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#111111] leading-snug">
                      {cat.label}
                    </h3>
                    {cat.cloturee && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#075B2E] shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                        Clôturée
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between text-xs pt-1">
                    <span className="text-[#111111]/65">Dépensé</span>
                    <span className="font-mono-num font-bold text-[#111111]">
                      {formatFCFA(cat.depenseCumulee)} / {formatFCFA(cat.budgetAlloue)}
                    </span>
                  </div>

                  <div className="h-2 bg-[#DDEBD8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#006B35]" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[#111111]/65">
                      {cat.cloturee ? 'Transféré Surplus' : 'Reste catégorie'}
                    </span>
                    <span className="font-mono-num font-semibold text-[#075B2E]">
                      {cat.cloturee
                        ? formatFCFA(cat.resteTransfereSurplus)
                        : formatFCFA(reste)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DDEBD8] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCat(catKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#075B2E] text-white'
                        : 'bg-[#DDEBD8]/50 text-[#075B2E] hover:bg-[#DDEBD8]'
                    }`}
                  >
                    {isSelected ? 'Sélectionnée' : 'Sélectionner'}
                  </button>

                  {!cat.cloturee && isMonthOpen && salaryReady && (
                    confirmCloseCat === catKey ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleCloseCategory(catKey)}
                          className="px-2.5 py-1.5 rounded-md bg-[#075B2E] text-white text-[11px] font-bold cursor-pointer"
                        >
                          Confirmer ({formatFCFA(transferable)})
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmCloseCat(null)}
                          className="px-2 py-1.5 rounded-md border border-[#DDEBD8] text-[11px] font-semibold cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmCloseCat(catKey)}
                        className="px-3 py-1.5 rounded-lg border border-[#075B2E]/30 text-[#075B2E] hover:bg-[#075B2E] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Clôturer
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Expense Form */}
        {isMonthOpen && (
          <form
            onSubmit={handleAddExpense}
            className="border border-[#DDEBD8] rounded-xl p-5 bg-[#DDEBD8]/15 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#075B2E]">
                Ajouter une dépense — {selectedCat.label}
              </h3>
              <span className="text-xs font-mono-num text-[#111111]/70">
                Plafond injectable :{' '}
                {formatFCFA(Math.min(resteSelected, month.salaire.argentEncoreDisponible))}
              </span>
            </div>

            {selectedCat.cloturee ? (
              <p className="text-xs text-[#075B2E] font-medium">
                Cette catégorie est clôturée définitivement ({selectedCat.clotureeLe}).
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      disabled={!canAddToSelected || busy}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
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
                      className="w-full px-3 py-2 text-sm font-mono-num bg-white border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
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
                      className="w-full px-3 py-2 text-sm bg-white border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
                      Note (optionnelle)
                    </label>
                    <input
                      type="text"
                      maxLength={MAX_EXPENSE_NOTE_LENGTH}
                      disabled={!canAddToSelected || busy}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Précision..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!canAddToSelected || busy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006B35] hover:bg-[#075B2E] text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enregistrer la dépense</span>
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Recorded expenses list */}
        <div className="border border-[#DDEBD8] rounded-xl overflow-hidden">
          <div className="bg-[#DDEBD8]/40 px-4 py-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#075B2E]">
              Dépenses enregistrées sur {month.label} ({expenses.length})
            </h3>
          </div>
          {expenses.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#111111]/60">
              Aucune dépense enregistrée pour ce mois. Sélectionnez une catégorie ci-dessus pour
              enregistrer votre première dépense datée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#DDEBD8] text-[#111111]/65 bg-white">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Catégorie</th>
                    <th className="py-2.5 px-4 font-semibold">Description</th>
                    <th className="py-2.5 px-4 font-semibold">Note</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDEBD8]">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#DDEBD8]/15">
                      <td className="py-2.5 px-4 font-mono-num whitespace-nowrap">{exp.date}</td>
                      <td className="py-2.5 px-4 font-medium text-[#075B2E]">
                        {month.depensesCategories[exp.categorieId]?.label || exp.categorieId}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#111111]">
                        {exp.description}
                      </td>
                      <td className="py-2.5 px-4 text-[#111111]/65">{exp.note || '—'}</td>
                      <td className="py-2.5 px-4 font-mono-num font-bold text-right whitespace-nowrap">
                        {formatFCFA(exp.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
