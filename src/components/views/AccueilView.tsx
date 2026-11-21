import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import {
  BudgetMonth,
  CAISSES_STANDARD_ORDER,
  DEPENSES_ORDER,
  FIXES_ORDER,
  NavTab,
  SALAIRE_REFERENCE,
  TOTAL_CAISSES_DOTATION,
  TOTAL_DEPENSES_BUDGET,
  TOTAL_FIXES_BUDGET,
} from '../../types/budget';
import {
  closeMonthAndCarryOver,
  feedSalary,
  updateSalaryPreview,
} from '../../lib/budgetService';
import { evaluateRentStatus, formatFCFA, formatIsoDateFr } from '../../lib/format';

interface AccueilViewProps {
  userId: string;
  month: BudgetMonth;
  nextMonth?: BudgetMonth;
  onNavigate: (tab: NavTab) => void;
}

export const AccueilView: React.FC<AccueilViewProps> = ({
  userId,
  month,
  nextMonth,
  onNavigate,
}) => {
  const [montantARecevoir, setMontantARecevoir] = useState<string>(
    String(month.salaire.montantARecevoir)
  );
  const [bonus, setBonus] = useState<string>(String(month.salaire.bonus));
  const [datePrevue, setDatePrevue] = useState<string>(month.salaire.datePrevue);
  const [motif, setMotif] = useState<string>(month.salaire.motifModification);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmFeed, setConfirmFeed] = useState(false);
  const [confirmCloseMonth, setConfirmCloseMonth] = useState(false);

  useEffect(() => {
    setMontantARecevoir(String(month.salaire.montantARecevoir));
    setBonus(String(month.salaire.bonus));
    setDatePrevue(month.salaire.datePrevue);
    setMotif(month.salaire.motifModification);
    setConfirmFeed(false);
    setConfirmCloseMonth(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [month.moisId, month.salaire.montantARecevoir, month.salaire.bonus, month.salaire.datePrevue, month.salaire.motifModification]);

  const isReadOnly = month.statut !== 'OUVERT';
  const parsedMontant = Math.max(0, Math.round(Number(montantARecevoir) || 0));
  const parsedBonus = Math.max(0, Math.round(Number(bonus) || 0));
  const totalPrevu = parsedMontant + parsedBonus;
  const needsMotif = totalPrevu !== SALAIRE_REFERENCE;
  const previewActif = Math.min(totalPrevu, SALAIRE_REFERENCE);
  const previewExcedent = Math.max(0, totalPrevu - SALAIRE_REFERENCE);
  const previewManque = Math.max(0, SALAIRE_REFERENCE - totalPrevu);

  const totalFixesValides = FIXES_ORDER.reduce(
    (acc, k) => acc + (month.fixes[k].valide ? month.fixes[k].montant : 0),
    0
  );
  const totalDepenses = DEPENSES_ORDER.reduce(
    (acc, k) => acc + month.depensesCategories[k].depenseCumulee,
    0
  );
  const totalRestesSurplus = DEPENSES_ORDER.reduce(
    (acc, k) => acc + month.depensesCategories[k].resteTransfereSurplus,
    0
  );
  const totalDotationsCaisses = CAISSES_STANDARD_ORDER.reduce(
    (acc, k) =>
      acc + (month.caisses[k].dotationAlimentee ? month.caisses[k].dotationMensuelle : 0),
    0
  );
  const totalEngage =
    totalFixesValides + totalDepenses + totalRestesSurplus + totalDotationsCaisses;

  const totalCaissesEtSurplus =
    month.caisses.sante.soldeActuel +
    month.caisses.vetements.soldeActuel +
    month.caisses.secours.soldeActuel +
    month.caisses.epargne.soldeActuel +
    month.caisses.surplus.soldeActuel;

  const rentStatus = evaluateRentStatus(month);

  const hasUnsavedSalaryChanges =
    parsedMontant !== month.salaire.montantARecevoir ||
    parsedBonus !== month.salaire.bonus ||
    datePrevue !== month.salaire.datePrevue ||
    motif.trim() !== month.salaire.motifModification;

  const handleSavePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (needsMotif && !motif.trim()) {
      setErrorMsg('Un motif est obligatoire lorsque le montant total diffère de 155 000 F CFA.');
      return;
    }
    setBusy(true);
    try {
      await updateSalaryPreview(userId, month, {
        montantARecevoir: parsedMontant,
        bonus: parsedBonus,
        datePrevue,
        motifModification: motif,
      });
      setSuccessMsg('Prévision salariale enregistrée.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setBusy(false);
    }
  };

  const handleFeedSalary = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (hasUnsavedSalaryChanges) {
      if (needsMotif && !motif.trim()) {
        setErrorMsg('Un motif est obligatoire lorsque le montant total diffère de 155 000 F CFA.');
        setConfirmFeed(false);
        return;
      }
    }
    setBusy(true);
    try {
      if (hasUnsavedSalaryChanges) {
        await updateSalaryPreview(userId, month, {
          montantARecevoir: parsedMontant,
          bonus: parsedBonus,
          datePrevue,
          motifModification: motif,
        });
        const updatedMonth: BudgetMonth = {
          ...month,
          salaire: {
            ...month.salaire,
            montantARecevoir: parsedMontant,
            bonus: parsedBonus,
            datePrevue,
            motifModification: motif.trim(),
          },
        };
        await feedSalary(userId, updatedMonth);
      } else {
        await feedSalary(userId, month);
      }
      setConfirmFeed(false);
      setSuccessMsg('Salaire alimenté de manière irréversible. Les opérations du mois sont débloquées.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de l’alimentation.');
    } finally {
      setBusy(false);
    }
  };

  const handleCloseMonth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      await closeMonthAndCarryOver(userId, month, nextMonth);
      setConfirmCloseMonth(false);
      setSuccessMsg(
        nextMonth
          ? `${month.label} clôturé. ${nextMonth.label} est désormais OUVERT avec report des soldes.`
          : `${month.label} clôturé définitivement.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Impossible de clôturer le mois.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4-column KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#DDEBD8] bg-white rounded-xl p-4">
          <p className="text-xs font-medium text-[#111111]/65">Montant actif du mois</p>
          <p className="font-mono-num text-xl font-bold text-[#075B2E] mt-1">
            {formatFCFA(month.salaire.montantActif)}
          </p>
          <p className="text-xs text-[#111111]/60 mt-1">
            Référence : {formatFCFA(SALAIRE_REFERENCE)}
          </p>
        </div>

        <div className="border border-[#DDEBD8] bg-[#DDEBD8]/30 rounded-xl p-4">
          <p className="text-xs font-medium text-[#075B2E]">Argent encore disponible</p>
          <p className="font-mono-num text-xl font-bold text-[#006B35] mt-1">
            {formatFCFA(month.salaire.argentEncoreDisponible)}
          </p>
          <p className="text-xs text-[#075B2E]/75 mt-1">
            {month.salaire.alimentee ? 'Solde budget utilisable' : 'En attente d’alimentation'}
          </p>
        </div>

        <div className="border border-[#DDEBD8] bg-white rounded-xl p-4">
          <p className="text-xs font-medium text-[#111111]/65">Budget engagé</p>
          <p className="font-mono-num text-xl font-bold text-[#111111] mt-1">
            {formatFCFA(totalEngage)}
          </p>
          <p className="text-xs text-[#111111]/60 mt-1">
            Fixes · Dépenses · Caisses
          </p>
        </div>

        <div className="border border-[#DDEBD8] bg-white rounded-xl p-4">
          <p className="text-xs font-medium text-[#111111]/65">Réserve Caisses + Surplus</p>
          <p className="font-mono-num text-xl font-bold text-[#075B2E] mt-1">
            {formatFCFA(totalCaissesEtSurplus)}
          </p>
          <p className="text-xs text-[#111111]/60 mt-1">
            Dont Surplus : {formatFCFA(month.caisses.surplus.soldeActuel)}
          </p>
        </div>
      </div>

      {/* Feedback messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl border border-[#006B35]/30 bg-[#DDEBD8]/50 text-[#075B2E] text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Blocked salary alert */}
      {month.statut === 'OUVERT' && !month.salaire.alimentee && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
          <div>
            <p className="font-semibold">Mois en attente d’alimentation du salaire</p>
            <p className="text-xs mt-1 text-amber-800">
              Tant que le salaire n’est pas alimenté, toutes les opérations du mois (fixes,
              dépenses, alimentation des caisses, paiement du loyer) sont bloquées.
            </p>
          </div>
        </div>
      )}

      {/* Main 2-column grid: Reception du salaire + 3-block summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card: Réception du salaire */}
        <section className="lg:col-span-7 border border-[#DDEBD8] bg-white rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#DDEBD8]">
            <div className="flex items-center gap-2.5">
              <Wallet className="w-5 h-5 text-[#075B2E]" />
              <h2 className="text-base font-bold text-[#111111]">
                Réception du salaire — {month.label}
              </h2>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                month.salaire.alimentee
                  ? 'bg-[#DDEBD8] text-[#075B2E]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {month.salaire.alimentee ? 'ALIMENTÉ' : 'À ALIMENTER'}
            </span>
          </div>

          {!month.salaire.alimentee && !isReadOnly ? (
            <form onSubmit={handleSavePreview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Montant à recevoir (F CFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50000000}
                    step={50}
                    required
                    value={montantARecevoir}
                    onChange={(e) => setMontantARecevoir(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-num border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Bonus éventuel (F CFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50000000}
                    step={50}
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-num border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                    Date prévue de réception
                  </label>
                  <input
                    type="date"
                    required
                    value={datePrevue}
                    onChange={(e) => setDatePrevue(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-num border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                  Motif {needsMotif ? '(obligatoire car total ≠ 155 000 F CFA)' : '(optionnel)'}
                </label>
                <input
                  type="text"
                  maxLength={200}
                  required={needsMotif}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder={
                    needsMotif
                      ? 'Expliquez l’écart par rapport aux 155 000 F CFA...'
                      : 'Note ou précision sur la paie...'
                  }
                  className="w-full px-3 py-2 text-sm border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                />
              </div>

              {/* Live simulation */}
              <div className="bg-[#DDEBD8]/35 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#111111]/75">Total prévu à recevoir</span>
                  <span className="font-mono-num font-bold text-[#111111]">
                    {formatFCFA(totalPrevu)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#111111]/75">Montant actif plafonné (max 155 000 F)</span>
                  <span className="font-mono-num font-bold text-[#075B2E]">
                    {formatFCFA(previewActif)}
                  </span>
                </div>
                {previewExcedent > 0 && (
                  <div className="flex justify-between text-[#006B35] font-semibold">
                    <span>Excédent transféré automatiquement en Caisse Surplus</span>
                    <span className="font-mono-num">+{formatFCFA(previewExcedent)}</span>
                  </div>
                )}
                {previewManque > 0 && (
                  <div className="pt-1 text-red-700 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Manque de {formatFCFA(previewManque)} par rapport aux 155 000 F CFA :
                      aucune opération ne pourra dépasser le montant actif.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="submit"
                  disabled={busy || !hasUnsavedSalaryChanges}
                  className="px-4 py-2 rounded-lg border border-[#075B2E]/30 text-[#075B2E] hover:bg-[#DDEBD8]/40 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Enregistrer la prévision
                </button>

                {!confirmFeed ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmFeed(true)}
                    className="px-5 py-2.5 rounded-lg bg-[#006B35] hover:bg-[#075B2E] text-white text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    ALIMENTER
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-[#DDEBD8]/60 p-1.5 rounded-lg">
                    <span className="text-xs font-semibold text-[#075B2E] px-2">
                      Action irréversible :
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleFeedSalary}
                      className="px-3 py-1.5 rounded-md bg-[#075B2E] text-white text-xs font-bold cursor-pointer"
                    >
                      Confirmer ALIMENTER
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmFeed(false)}
                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-[#111111] hover:bg-white cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#111111]/60">Salaire prévu / reçu</p>
                  <p className="font-mono-num font-bold text-[#111111] mt-0.5">
                    {formatFCFA(month.salaire.montantARecevoir + month.salaire.bonus)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#111111]/60">Montant actif</p>
                  <p className="font-mono-num font-bold text-[#075B2E] mt-0.5">
                    {formatFCFA(month.salaire.montantActif)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#111111]/60">Bonus déclaré</p>
                  <p className="font-mono-num font-medium mt-0.5">
                    {formatFCFA(month.salaire.bonus)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#111111]/60">Excédent vers Caisse Surplus</p>
                  <p className="font-mono-num font-medium text-[#006B35] mt-0.5">
                    {formatFCFA(month.salaire.excedentTransfere)}
                  </p>
                </div>
              </div>

              {month.salaire.alimentee && month.salaire.montantActif < SALAIRE_REFERENCE && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Manque constaté : {formatFCFA(SALAIRE_REFERENCE - month.salaire.montantActif)} en
                    dessous du salaire de référence. Plafond strict actif :{' '}
                    {formatFCFA(month.salaire.montantActif)}.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-[#DDEBD8] text-xs text-[#111111]/70 flex flex-wrap justify-between gap-2">
                <span>
                  Date prévue : {formatIsoDateFr(month.salaire.datePrevue)}
                </span>
                {month.salaire.alimenteeLe && (
                  <span>Alimenté le : {month.salaire.alimenteeLe}</span>
                )}
              </div>
              {month.salaire.motifModification && (
                <p className="text-xs text-[#111111]/75 bg-[#DDEBD8]/30 px-3 py-2 rounded-lg">
                  Motif : {month.salaire.motifModification}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Card: Synthèse des 3 blocs + Loyer + Clôture */}
        <section className="lg:col-span-5 border border-[#DDEBD8] bg-white rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#DDEBD8]">
              Architecture budgétaire (155 000 F CFA)
            </h2>

            {/* Bloc 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => onNavigate('fixes')}
                  className="font-semibold text-[#075B2E] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>1. Fixes irréversibles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-num text-xs font-semibold">
                  {formatFCFA(totalFixesValides)} / {formatFCFA(TOTAL_FIXES_BUDGET)}
                </span>
              </div>
              <div className="h-2 bg-[#DDEBD8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#075B2E]"
                  style={{ width: `${Math.min(100, (totalFixesValides / TOTAL_FIXES_BUDGET) * 100)}%` }}
                />
              </div>
            </div>

            {/* Bloc 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => onNavigate('depenses')}
                  className="font-semibold text-[#075B2E] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>2. Dépenses petit à petit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-num text-xs font-semibold">
                  {formatFCFA(totalDepenses + totalRestesSurplus)} / {formatFCFA(TOTAL_DEPENSES_BUDGET)}
                </span>
              </div>
              <div className="h-2 bg-[#DDEBD8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#006B35]"
                  style={{
                    width: `${Math.min(
                      100,
                      ((totalDepenses + totalRestesSurplus) / TOTAL_DEPENSES_BUDGET) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Bloc 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => onNavigate('caisses')}
                  className="font-semibold text-[#075B2E] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>3. Dotations Caisses</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-num text-xs font-semibold">
                  {formatFCFA(totalDotationsCaisses)} / {formatFCFA(TOTAL_CAISSES_DOTATION)}
                </span>
              </div>
              <div className="h-2 bg-[#DDEBD8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#075B2E]"
                  style={{
                    width: `${Math.min(100, (totalDotationsCaisses / TOTAL_CAISSES_DOTATION) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Loyer hors budget */}
            <div className="pt-3 border-t border-[#DDEBD8] flex items-center justify-between text-sm">
              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('loyer')}
                  className="font-semibold text-[#111111] hover:text-[#075B2E] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Coffre Loyer (hors budget)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <p className="text-xs text-[#111111]/60">{rentStatus.badgeLabel}</p>
              </div>
              <span className="font-mono-num font-bold text-[#075B2E]">
                {formatFCFA(month.loyer.montant)}
              </span>
            </div>
          </div>

          {/* Month closure section */}
          <div className="pt-4 border-t border-[#DDEBD8]">
            {month.statut === 'OUVERT' ? (
              !confirmCloseMonth ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmCloseMonth(true)}
                  className="w-full py-2.5 px-4 rounded-lg border border-[#075B2E] text-[#075B2E] hover:bg-[#075B2E] hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Clôturer définitivement {month.label}</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-lg bg-[#DDEBD8]/50 border border-[#075B2E]/30 space-y-3">
                  <p className="text-xs text-[#111111] leading-relaxed">
                    La clôture rendra <strong>{month.label}</strong> strictement en lecture seule
                    {nextMonth
                      ? ` et ouvrira ${nextMonth.label} avec le report automatique des 4 caisses et de la Caisse Surplus.`
                      : '.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleCloseMonth}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#075B2E] text-white text-xs font-bold cursor-pointer"
                    >
                      Confirmer la clôture
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmCloseMonth(false)}
                      className="py-2 px-3 rounded-lg bg-white border border-[#DDEBD8] text-xs font-semibold text-[#111111] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="p-3 rounded-lg bg-[#DDEBD8]/40 text-xs text-[#075B2E] font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {month.statut === 'CLOTURE'
                    ? `Mois clôturé le ${month.clotureLe || '—'} (lecture seule).`
                    : 'Mois verrouillé. Clôturez le mois précédent pour l’ouvrir.'}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
