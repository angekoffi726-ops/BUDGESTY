import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
import { AnimatedNumber } from '../AnimatedNumber';

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
  }, [
    month.moisId,
    month.salaire.montantARecevoir,
    month.salaire.bonus,
    month.salaire.datePrevue,
    month.salaire.motifModification,
  ]);

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

  const availableRatio =
    month.salaire.montantActif > 0
      ? Math.min(100, Math.max(0, (month.salaire.argentEncoreDisponible / month.salaire.montantActif) * 100))
      : 0;
  const ringCircumference = 2 * Math.PI * 40;
  const ringOffset = ringCircumference * (1 - availableRatio / 100);

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

  const previewActifPct = totalPrevu > 0 ? Math.round((previewActif / totalPrevu) * 100) : 100;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero Emerald-to-Violet Cockpit Card */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#054422]/95 via-[#006B35]/95 via-[#3B2878]/95 to-[#6D28D9]/95 backdrop-blur-2xl text-white p-5 sm:p-7 shadow-[0_28px_64px_-16px_rgba(45,18,95,0.75)] border border-white/25"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-48 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-sheen"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 600 220"
          className="pointer-events-none absolute right-0 bottom-0 w-96 opacity-20"
        >
          <motion.path
            d="M0 180 Q 150 90 300 150 T 600 100 L 600 220 L 0 220 Z"
            fill="url(#heroWaveGrad)"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <defs>
            <linearGradient id="heroWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DDEBD8" />
              <stop offset="100%" stopColor="#C4B5FD" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-wide text-[#DDD6FE]">
                Argent encore disponible · {month.label}
              </p>
              <p className="font-display font-mono-num text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                <AnimatedNumber value={month.salaire.argentEncoreDisponible} />
              </p>
              <p className="text-xs text-[#DDEBD8]/95">
                {month.salaire.alimentee
                  ? `Solde budgétaire libre sur ${formatFCFA(month.salaire.montantActif)} actif · Référence ${formatFCFA(SALAIRE_REFERENCE)}`
                  : `En attente d’alimentation du salaire · Référence ${formatFCFA(SALAIRE_REFERENCE)}`}
              </p>
            </div>

            {/* Animated Radial Balance Gauge */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-4 self-start sm:self-center bg-black/25 border border-white/25 rounded-2xl px-4 py-3.5 backdrop-blur-md shadow-inner"
            >
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="rgba(221,214,254,0.25)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="url(#heroRingViolet)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    initial={{ strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <defs>
                    <linearGradient id="heroRingViolet" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#DDEBD8" />
                      <stop offset="50%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor="#C4B5FD" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute font-mono-num text-base font-extrabold text-white">
                  {Math.round(availableRatio)}%
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-white">Reste disponible</p>
                <p className="text-[#DDEBD8] font-mono-num">
                  Engagé : {formatFCFA(totalEngage)}
                </p>
                <p className="text-[#DDD6FE] font-mono-num">
                  Référence : {formatFCFA(SALAIRE_REFERENCE)}
                </p>
              </div>
            </motion.div>
          </div>

          {/* 3-metric elevated glass sub-row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ duration: 0.16 }}
              className="rounded-2xl bg-white/14 border border-white/25 backdrop-blur-md p-4 shadow-sm"
            >
              <p className="text-[11px] font-medium text-[#DDEBD8]">Montant actif du mois</p>
              <p className="font-mono-num text-lg sm:text-xl font-bold text-white mt-0.5">
                <AnimatedNumber value={month.salaire.montantActif} />
              </p>
              <p className="text-[11px] text-[#DDEBD8]/85 mt-0.5">
                Plafonné à {formatFCFA(SALAIRE_REFERENCE)}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ duration: 0.16 }}
              className="rounded-2xl bg-white/14 border border-white/25 backdrop-blur-md p-4 shadow-sm"
            >
              <p className="text-[11px] font-medium text-[#DDD6FE]">Budget engagé</p>
              <p className="font-mono-num text-lg sm:text-xl font-bold text-white mt-0.5">
                <AnimatedNumber value={totalEngage} />
              </p>
              <p className="text-[11px] text-[#DDD6FE]/85 mt-0.5">
                Fixes · Dépenses · Caisses
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ duration: 0.16 }}
              className="rounded-2xl bg-white/14 border border-white/25 backdrop-blur-md p-4 shadow-sm"
            >
              <p className="text-[11px] font-medium text-[#DDD6FE]">Réserve Caisses + Surplus</p>
              <p className="font-mono-num text-lg sm:text-xl font-bold text-white mt-0.5">
                <AnimatedNumber value={totalCaissesEtSurplus} />
              </p>
              <p className="text-[11px] text-[#DDEBD8]/90 mt-0.5">
                Dont Surplus : {formatFCFA(month.caisses.surplus.soldeActuel)}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Animated Feedback messages */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-2xl border border-red-200 bg-red-50/95 backdrop-blur-md text-red-800 text-sm flex items-start gap-3 shadow-lg"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-2xl border border-white/80 bg-white/95 backdrop-blur-xl text-[#075B2E] text-sm flex items-start gap-3 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#5B21B6]" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blocked salary alert */}
      {month.statut === 'OUVERT' && !month.salaire.alimentee && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/95 to-white/95 backdrop-blur-xl text-amber-950 text-sm flex items-start gap-3 shadow-[0_18px_40px_-14px_rgba(45,18,95,0.35)]"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
          <div>
            <p className="font-semibold">Mois en attente d’alimentation du salaire</p>
            <p className="text-xs mt-1 text-amber-800 leading-relaxed">
              Tant que le salaire n’est pas alimenté, toutes les opérations du mois (fixes,
              dépenses, alimentation des caisses, paiement du loyer) sont bloquées.
            </p>
          </div>
        </motion.div>
      )}

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Card: Réception du salaire */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 bg-white/94 backdrop-blur-2xl border border-white/85 rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_-16px_rgba(38,18,78,0.42)] space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#DDEBD8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#075B2E] via-[#006B35] to-[#6D28D9] text-white flex items-center justify-center shadow-md shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-[#111111]">
                  Réception du salaire — {month.label}
                </h2>
                <p className="text-xs text-[#5B21B6] font-medium">
                  {month.salaire.alimentee ? 'Statut : ALIMENTÉ' : 'Statut : À ALIMENTER'}
                </p>
              </div>
            </div>
          </div>

          {!month.salaire.alimentee && !isReadOnly ? (
            <form onSubmit={handleSavePreview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                    className="w-full min-h-[44px] px-3 py-2 text-sm font-mono-num bg-white border border-[#5B21B6]/20 rounded-xl focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#7C3AED]/20"
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
                    className="w-full min-h-[44px] px-3 py-2 text-sm font-mono-num bg-white border border-[#5B21B6]/20 rounded-xl focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#7C3AED]/20"
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
                    className="w-full min-h-[44px] px-3 py-2 text-sm font-mono-num bg-white border border-[#5B21B6]/20 rounded-xl focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#7C3AED]/20"
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
                  className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-[#5B21B6]/20 rounded-xl focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#7C3AED]/20"
                />
              </div>

              {/* Live visual split bar & simulation */}
              <div className="bg-gradient-to-br from-[#DDEBD8]/65 via-white to-[#EDE9FE]/70 border border-[#5B21B6]/15 rounded-2xl p-4 space-y-3 text-xs">
                <div className="h-2.5 bg-white rounded-full overflow-hidden flex border border-[#075B2E]/15">
                  <motion.div
                    animate={{ width: `${previewActifPct}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full bg-gradient-to-r from-[#075B2E] to-[#006B35]"
                  />
                  {previewExcedent > 0 && (
                    <motion.div
                      animate={{ width: `${100 - previewActifPct}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]"
                    />
                  )}
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#111111]/75">Total prévu à recevoir</span>
                  <span className="font-mono-num font-bold text-[#111111]">
                    {formatFCFA(totalPrevu)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#111111]/75">Montant actif plafonné (max 155 000 F)</span>
                  <span className="font-mono-num font-bold text-[#075B2E]">
                    {formatFCFA(previewActif)}
                  </span>
                </div>
                {previewExcedent > 0 && (
                  <div className="flex justify-between gap-2 text-[#5B21B6] font-semibold">
                    <span>Excédent transféré automatiquement en Caisse Surplus</span>
                    <span className="font-mono-num">+{formatFCFA(previewExcedent)}</span>
                  </div>
                )}
                {previewManque > 0 && (
                  <div className="pt-1 text-red-700 font-semibold flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Manque de {formatFCFA(previewManque)} par rapport aux 155 000 F CFA :
                      aucune opération ne pourra dépasser le montant actif.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={busy || !hasUnsavedSalaryChanges}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#5B21B6]/35 text-[#5B21B6] hover:bg-[#EDE9FE]/65 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  Enregistrer la prévision
                </motion.button>

                {!confirmFeed ? (
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmFeed(true)}
                    className="min-h-[46px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#6D28D9] text-white text-sm font-bold shadow-[0_14px_30px_-8px_rgba(91,33,182,0.65)] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    ALIMENTER
                  </motion.button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 bg-[#EDE9FE]/85 border border-[#5B21B6]/25 p-2 rounded-xl">
                    <span className="text-xs font-semibold text-[#4C1D95] px-2">
                      Action irréversible :
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      disabled={busy}
                      onClick={handleFeedSalary}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#075B2E] to-[#5B21B6] text-white text-xs font-bold cursor-pointer"
                    >
                      Confirmer ALIMENTER
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmFeed(false)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#111111] bg-white border border-[#DDEBD8] cursor-pointer"
                    >
                      Annuler
                    </motion.button>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-[#DDEBD8]/40 border border-[#DDEBD8]">
                  <p className="text-xs text-[#111111]/60">Salaire prévu / reçu</p>
                  <p className="font-mono-num font-bold text-[#111111] text-base mt-0.5">
                    {formatFCFA(month.salaire.montantARecevoir + month.salaire.bonus)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#DDEBD8]/65 to-[#EDE9FE]/55 border border-[#5B21B6]/15">
                  <p className="text-xs text-[#075B2E]/85">Montant actif</p>
                  <p className="font-mono-num font-bold text-[#075B2E] text-base mt-0.5">
                    {formatFCFA(month.salaire.montantActif)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-[#DDEBD8]">
                  <p className="text-xs text-[#111111]/60">Bonus déclaré</p>
                  <p className="font-mono-num font-semibold text-base mt-0.5">
                    {formatFCFA(month.salaire.bonus)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-[#EDE9FE]">
                  <p className="text-xs text-[#111111]/60">Excédent vers Caisse Surplus</p>
                  <p className="font-mono-num font-semibold text-[#6D28D9] text-base mt-0.5">
                    {formatFCFA(month.salaire.excedentTransfere)}
                  </p>
                </div>
              </div>

              {month.salaire.alimentee && month.salaire.montantActif < SALAIRE_REFERENCE && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Manque constaté : {formatFCFA(SALAIRE_REFERENCE - month.salaire.montantActif)} en
                    dessous du salaire de référence. Plafond strict actif :{' '}
                    {formatFCFA(month.salaire.montantActif)}.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-[#DDEBD8] text-xs text-[#111111]/70 flex flex-wrap justify-between gap-2">
                <span>Date prévue : {formatIsoDateFr(month.salaire.datePrevue)}</span>
                {month.salaire.alimenteeLe && (
                  <span>Alimenté le : {month.salaire.alimenteeLe}</span>
                )}
              </div>
              {month.salaire.motifModification && (
                <p className="text-xs text-[#111111]/75 bg-[#EDE9FE]/45 px-3.5 py-2.5 rounded-xl">
                  Motif : {month.salaire.motifModification}
                </p>
              )}
            </div>
          )}
        </motion.section>

        {/* Card: Synthèse des 3 blocs + Loyer + Clôture */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 bg-white/94 backdrop-blur-2xl border border-white/85 rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_-16px_rgba(38,18,78,0.42)] flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <h2 className="font-display text-base sm:text-lg font-bold text-[#111111] pb-3 border-b border-[#DDEBD8]">
              Architecture budgétaire (155 000 F CFA)
            </h2>

            {/* Bloc 1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <motion.button
                  whileHover={{ x: 3 }}
                  type="button"
                  onClick={() => onNavigate('fixes')}
                  className="font-semibold text-[#075B2E] hover:text-[#6D28D9] inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <span>1. Fixes irréversibles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
                <span className="font-mono-num text-xs font-semibold">
                  {formatFCFA(totalFixesValides)} / {formatFCFA(TOTAL_FIXES_BUDGET)}
                </span>
              </div>
              <div className="h-3 bg-[#DDEBD8]/75 rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (totalFixesValides / TOTAL_FIXES_BUDGET) * 100)}%`,
                  }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full rounded-full bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#7C3AED] overflow-hidden"
                >
                  <span className="absolute inset-y-0 w-14 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-glint" />
                </motion.div>
              </div>
            </div>

            {/* Bloc 2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <motion.button
                  whileHover={{ x: 3 }}
                  type="button"
                  onClick={() => onNavigate('depenses')}
                  className="font-semibold text-[#075B2E] hover:text-[#6D28D9] inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <span>2. Dépenses petit à petit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
                <span className="font-mono-num text-xs font-semibold">
                  {formatFCFA(totalDepenses + totalRestesSurplus)} / {formatFCFA(TOTAL_DEPENSES_BUDGET)}
                </span>
              </div>
              <div className="h-3 bg-[#DDEBD8]/75 rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      100,
                      ((totalDepenses + totalRestesSurplus) / TOTAL_DEPENSES_BUDGET) * 100
                    )}%`,
                  }}
                  transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full rounded-full bg-gradient-to-r from-[#006B35] via-[#4C1D95] to-[#7C3AED] overflow-hidden"
                >
                  <span className="absolute inset-y-0 w-14 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-glint" />
                </motion.div>
              </div>
            </div>

            {/* Bloc 3 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <motion.button
                  whileHover={{ x: 3 }}
                  type="button"
                  onClick={() => onNavigate('caisses')}
                  className="font-semibold text-[#075B2E] hover:text-[#6D28D9] inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <span>3. Dotations Caisses</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
                <span className="font-mono-num text-xs font-semibold">
                  {formatFCFA(totalDotationsCaisses)} / {formatFCFA(TOTAL_CAISSES_DOTATION)}
                </span>
              </div>
              <div className="h-3 bg-[#DDEBD8]/75 rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (totalDotationsCaisses / TOTAL_CAISSES_DOTATION) * 100)}%`,
                  }}
                  transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full rounded-full bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#7C3AED] overflow-hidden"
                >
                  <span className="absolute inset-y-0 w-14 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-glint" />
                </motion.div>
              </div>
            </div>

            {/* Loyer hors budget */}
            <div className="pt-3 border-t border-[#DDEBD8] flex items-center justify-between gap-3 text-sm">
              <div>
                <motion.button
                  whileHover={{ x: 3 }}
                  type="button"
                  onClick={() => onNavigate('loyer')}
                  className="font-semibold text-[#111111] hover:text-[#6D28D9] inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <span>Coffre Loyer (hors budget)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
                <p className="text-xs text-[#5B21B6] font-medium">{rentStatus.badgeLabel}</p>
              </div>
              <span className="font-mono-num font-bold text-[#075B2E] whitespace-nowrap">
                {formatFCFA(month.loyer.montant)}
              </span>
            </div>
          </div>

          {/* Month closure section */}
          <div className="pt-4 border-t border-[#DDEBD8]">
            {month.statut === 'OUVERT' ? (
              !confirmCloseMonth ? (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmCloseMonth(true)}
                  className="w-full min-h-[46px] py-2.5 px-4 rounded-xl border border-[#5B21B6]/35 bg-gradient-to-r from-[#DDEBD8]/45 to-[#EDE9FE]/55 text-[#4C1D95] hover:from-[#075B2E] hover:to-[#6D28D9] hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Clôturer définitivement {month.label}</span>
                </motion.button>
              ) : (
                <div className="p-4 rounded-2xl bg-[#EDE9FE]/65 border border-[#5B21B6]/25 space-y-3">
                  <p className="text-xs text-[#111111] leading-relaxed">
                    La clôture rendra <strong>{month.label}</strong> strictement en lecture seule
                    {nextMonth
                      ? ` et ouvrira ${nextMonth.label} avec le report automatique des 4 caisses et de la Caisse Surplus.`
                      : '.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      disabled={busy}
                      onClick={handleCloseMonth}
                      className="flex-1 min-h-[42px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#075B2E] to-[#6D28D9] text-white text-xs font-bold cursor-pointer"
                    >
                      Confirmer la clôture
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmCloseMonth(false)}
                      className="min-h-[42px] py-2 px-3.5 rounded-xl bg-white border border-[#DDEBD8] text-xs font-semibold text-[#111111] cursor-pointer"
                    >
                      Annuler
                    </motion.button>
                  </div>
                </div>
              )
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#EDE9FE]/50 text-xs text-[#4C1D95] font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {month.statut === 'CLOTURE'
                    ? `Mois clôturé le ${month.clotureLe || '—'} (lecture seule).`
                    : 'Mois verrouillé. Clôturez le mois précédent pour l’ouvrir.'}
                </span>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};
