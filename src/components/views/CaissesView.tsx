import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  CheckCircle2,
  PlusCircle,
  ShieldAlert,
  Vault,
} from 'lucide-react';
import {
  BudgetMonth,
  CAISSES_FOUR_ORDER,
  CAISSES_STANDARD_ORDER,
  CaisseKey,
  MAX_MOTIF_LENGTH,
  TOTAL_CAISSES_DOTATION,
  TransferTargetCaisseKey,
} from '../../types/budget';
import {
  fundCaisseDotation,
  transferCaisseToSurplus,
  transferSurplusToCaisse,
  withdrawFromCaisse,
} from '../../lib/budgetService';
import { formatFCFA } from '../../lib/format';
import { AnimatedNumber } from '../AnimatedNumber';

interface CaissesViewProps {
  userId: string;
  month: BudgetMonth;
}

export const CaissesView: React.FC<CaissesViewProps> = ({ userId, month }) => {
  const [withdrawTarget, setWithdrawTarget] = useState<CaisseKey>('sante');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawMotif, setWithdrawMotif] = useState<string>('');

  const [toSurplusSource, setToSurplusSource] = useState<TransferTargetCaisseKey>('sante');
  const [toSurplusAmount, setToSurplusAmount] = useState<string>('');
  const [toSurplusMotif, setToSurplusMotif] = useState<string>('');

  const [fromSurplusTarget, setFromSurplusTarget] = useState<TransferTargetCaisseKey>('epargne');
  const [fromSurplusAmount, setFromSurplusAmount] = useState<string>('');
  const [fromSurplusMotif, setFromSurplusMotif] = useState<string>('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMonthOpen = month.statut === 'OUVERT';
  const salaryReady = month.salaire.alimentee;
  const canOperate = isMonthOpen && salaryReady;

  const totalDotationAlimentee = CAISSES_STANDARD_ORDER.reduce(
    (sum, k) =>
      sum + (month.caisses[k].dotationAlimentee ? month.caisses[k].dotationMensuelle : 0),
    0
  );

  const handleFundDotation = async (key: 'sante' | 'vetements' | 'secours') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      await fundCaisseDotation(userId, month, key);
      setSuccessMsg(`Dotation mensuelle alimentée pour ${month.caisses[key].label}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors de l’alimentation.');
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const amount = Math.round(Number(withdrawAmount) || 0);
    setBusy(true);
    try {
      await withdrawFromCaisse(userId, month, withdrawTarget, amount, withdrawMotif);
      setWithdrawAmount('');
      setWithdrawMotif('');
      setSuccessMsg(`Retrait effectué depuis ${month.caisses[withdrawTarget].label}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du retrait.');
    } finally {
      setBusy(false);
    }
  };

  const handleTransferToSurplus = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const amount = Math.round(Number(toSurplusAmount) || 0);
    setBusy(true);
    try {
      await transferCaisseToSurplus(userId, month, toSurplusSource, amount, toSurplusMotif);
      setToSurplusAmount('');
      setToSurplusMotif('');
      setSuccessMsg(
        `Transfert effectué de ${month.caisses[toSurplusSource].label} vers Caisse Surplus.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du transfert.');
    } finally {
      setBusy(false);
    }
  };

  const handleTransferFromSurplus = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const amount = Math.round(Number(fromSurplusAmount) || 0);
    setBusy(true);
    try {
      await transferSurplusToCaisse(userId, month, fromSurplusTarget, amount, fromSurplusMotif);
      setFromSurplusAmount('');
      setFromSurplusMotif('');
      setSuccessMsg(
        `Transfert effectué de Caisse Surplus vers ${month.caisses[fromSurplusTarget].label}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du transfert.');
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
        className="bg-[#FDF8F0]/94 backdrop-blur-2xl border border-[#F5E6D3]/95 rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_-16px_rgba(4,40,20,0.42)] space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFE0CC]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#075B2E] via-[#006B35] to-[#EA580C] text-white flex items-center justify-center shadow-md shrink-0">
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#111111]">
                Caisses & Caisse Surplus — {month.label}
              </h2>
              <p className="text-xs text-[#111111]/70 mt-0.5">
                Dotations mensuelles (17 000 F CFA), Caisse Épargne (0 F/mois) et Caisse Surplus
                avec report automatique d’un mois sur l’autre.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-[#111111]/60">Dotations alimentées</p>
            <p className="font-mono-num text-lg font-bold text-[#EA580C]">
              <AnimatedNumber value={totalDotationAlimentee} /> / {formatFCFA(TOTAL_CAISSES_DOTATION)}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#054422] via-[#006B35] to-[#C2410C] text-white px-4 py-3.5 text-sm shadow-[0_14px_30px_-12px_rgba(4,40,20,0.55)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-sheen"
          />
          <span className="relative z-10 font-medium text-[#FDE8D0]">
            Argent encore disponible ce mois
          </span>
          <span className="relative z-10 font-mono-num font-extrabold text-base text-[#FAF3E8]">
            <AnimatedNumber value={month.salaire.argentEncoreDisponible} />
          </span>
        </div>

        {isMonthOpen && !salaryReady && (
          <div className="p-4 rounded-2xl border border-[#FDBA74] bg-gradient-to-r from-[#FAF3E8] to-[#FDE8D0]/85 text-[#7C2D12] text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#EA580C]" />
            <span>
              Salaire non alimenté : alimentez le salaire dans l’onglet Accueil pour activer les
              dotations, retraits et transferts de caisses.
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
              className="p-3.5 rounded-xl border border-[#F5E6D3] bg-gradient-to-r from-[#FAF3E8] to-[#FDE8D0]/80 text-[#075B2E] text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#EA580C]" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 Caisses + Surplus grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAISSES_STANDARD_ORDER.map((key, idx) => {
            const c = month.caisses[key];
            const enoughFunds = month.salaire.argentEncoreDisponible >= c.dotationMensuelle;
            const canFund = canOperate && !c.dotationAlimentee && enoughFunds;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: idx * 0.05 }}
                whileHover={{ y: -3, scale: 1.01 }}
                className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all ${
                  c.dotationAlimentee
                    ? 'border-[#FB923C]/40 bg-gradient-to-br from-[#FAF3E8] via-white to-[#FDE8D0]/60 shadow-sm'
                    : 'border-[#EFE0CC] bg-white hover:border-[#EA580C]/35 shadow-xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#111111]">{c.label}</h3>
                    <span className="text-xs font-mono-num text-[#EA580C] font-semibold">
                      +{formatFCFA(c.dotationMensuelle)}/mois
                    </span>
                  </div>
                  <p className="font-display font-mono-num text-2xl font-extrabold text-[#075B2E]">
                    <AnimatedNumber value={c.soldeActuel} />
                  </p>
                  <p className="text-xs text-[#111111]/60">
                    Report précédent : {formatFCFA(c.soldePrecedent)}
                  </p>
                </div>

                {c.dotationAlimentee ? (
                  <div className="min-h-[42px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#FAF3E8] via-[#FDE8D0]/80 to-[#DDEBD8]/80 text-[#075B2E] border border-[#EFE0CC] text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#EA580C]" />
                    <span>Dotation du mois alimentée</span>
                  </div>
                ) : (
                  <motion.button
                    whileTap={canFund ? { scale: 0.96 } : undefined}
                    type="button"
                    disabled={!canFund || busy}
                    onClick={() => handleFundDotation(key)}
                    className={`w-full min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all ${
                      canFund
                        ? 'bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#EA580C] text-white shadow-md cursor-pointer'
                        : 'bg-[#EFE0CC]/80 text-[#111111]/45 cursor-not-allowed'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Alimenter ({formatFCFA(c.dotationMensuelle)})</span>
                  </motion.button>
                )}
              </motion.div>
            );
          })}

          {/* Caisse Épargne */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.14 }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="border border-[#E7D4BD] bg-gradient-to-br from-[#FAF3E8] via-white to-[#FDE8D0]/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#111111]">
                  {month.caisses.epargne.label}
                </h3>
                <span className="text-xs text-[#C2410C] font-semibold">0 F/mois</span>
              </div>
              <p className="font-display font-mono-num text-2xl font-extrabold text-[#075B2E]">
                <AnimatedNumber value={month.caisses.epargne.soldeActuel} />
              </p>
              <p className="text-xs text-[#111111]/60">
                Report : {formatFCFA(month.caisses.epargne.soldePrecedent)} · Reçoit des
                transferts depuis Caisse Surplus
              </p>
            </div>
            <div className="min-h-[42px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#FDE8D0]/80 to-[#DDEBD8]/70 text-[#075B2E] border border-[#EFE0CC] text-[11px] font-semibold flex items-center justify-center text-center">
              Épargne mensuelle (40 000 F) gérée dans Fixes
            </div>
          </motion.div>

          {/* Caisse Surplus Flagship Vault Card with gentle animated warm wave */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="sm:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#054422] via-[#006B35] to-[#C2410C] text-white p-5 sm:p-6 shadow-[0_22px_48px_-14px_rgba(4,40,20,0.68)] border border-[#FAF3E8]/30 flex flex-col justify-between space-y-3"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-44 bg-gradient-to-r from-transparent via-white/16 to-transparent animate-sheen"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 500 140"
              className="pointer-events-none absolute right-0 bottom-0 w-72 opacity-22"
            >
              <defs>
                <linearGradient id="surplusWarmWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FAF3E8" />
                  <stop offset="50%" stopColor="#FDE8D0" />
                  <stop offset="100%" stopColor="#FB923C" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0 110 Q 125 45 250 95 T 500 60 L 500 140 L 0 140 Z"
                fill="url(#surplusWarmWaveGrad)"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#FDE8D0]">
                  Réserve dynamique hors dotation 155 000 F
                </p>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#FAF3E8]">
                  Caisse Surplus
                </h3>
                <p className="text-xs text-[#F5E6D3]/90 max-w-xl leading-relaxed">
                  Reçoit automatiquement les reliquats de dépenses clôturées, les excédents
                  salariaux (&gt; 155 000 F) et les transferts manuels.
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="font-display font-mono-num text-3xl sm:text-4xl font-extrabold text-[#FAF3E8] drop-shadow-sm">
                  <AnimatedNumber value={month.caisses.surplus.soldeActuel} />
                </p>
                <p className="text-xs text-[#FDE8D0]/90 mt-1">
                  Report précédent : {formatFCFA(month.caisses.surplus.soldePrecedent)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 3 Operations panels */}
        {isMonthOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            {/* 1. Retrait (toutes caisses + surplus) */}
            <form
              onSubmit={handleWithdraw}
              className="border border-[#EFE0CC] rounded-2xl p-4 sm:p-5 space-y-3.5 bg-gradient-to-b from-white to-[#FAF3E8] shadow-xs"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#075B2E]">
                <ArrowDownToLine className="w-4 h-4 shrink-0 text-[#EA580C]" />
                <h3>Retirer d’une caisse / Surplus</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Caisse source</label>
                <select
                  value={withdrawTarget}
                  onChange={(e) => setWithdrawTarget(e.target.value as CaisseKey)}
                  disabled={!canOperate || busy}
                  className="w-full min-h-[44px] px-3 py-2 text-xs border border-[#E7D4BD] rounded-xl bg-white focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                >
                  {[...CAISSES_FOUR_ORDER, 'surplus' as CaisseKey].map((k) => (
                    <option key={k} value={k}>
                      {month.caisses[k].label} ({formatFCFA(month.caisses[k].soldeActuel)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Montant (F CFA)</label>
                <input
                  type="number"
                  min={1}
                  max={month.caisses[withdrawTarget].soldeActuel || 1}
                  required
                  disabled={!canOperate || busy || month.caisses[withdrawTarget].soldeActuel <= 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Ex. 2000"
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-mono-num bg-white border border-[#E7D4BD] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Motif (obligatoire)</label>
                <input
                  type="text"
                  required
                  maxLength={MAX_MOTIF_LENGTH}
                  disabled={!canOperate || busy}
                  value={withdrawMotif}
                  onChange={(e) => setWithdrawMotif(e.target.value)}
                  placeholder="Ex. Achat médicaments"
                  className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#E7D4BD] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!canOperate || busy || month.caisses[withdrawTarget].soldeActuel <= 0}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#EA580C] text-white text-xs font-bold transition-all disabled:opacity-45 cursor-pointer shadow-sm"
              >
                Valider le retrait
              </motion.button>
            </form>

            {/* 2. Transfert Caisse -> Surplus */}
            <form
              onSubmit={handleTransferToSurplus}
              className="border border-[#EFE0CC] rounded-2xl p-4 sm:p-5 space-y-3.5 bg-gradient-to-b from-white to-[#FAF3E8] shadow-xs"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#075B2E]">
                <ArrowLeftRight className="w-4 h-4 shrink-0 text-[#006B35]" />
                <h3>Transférer vers Caisse Surplus</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Caisse source</label>
                <select
                  value={toSurplusSource}
                  onChange={(e) => setToSurplusSource(e.target.value as TransferTargetCaisseKey)}
                  disabled={!canOperate || busy}
                  className="w-full min-h-[44px] px-3 py-2 text-xs border border-[#E7D4BD] rounded-xl bg-white focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                >
                  {CAISSES_FOUR_ORDER.map((k) => (
                    <option key={k} value={k}>
                      {month.caisses[k].label} ({formatFCFA(month.caisses[k].soldeActuel)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Montant (F CFA)</label>
                <input
                  type="number"
                  min={1}
                  max={month.caisses[toSurplusSource].soldeActuel || 1}
                  required
                  disabled={!canOperate || busy || month.caisses[toSurplusSource].soldeActuel <= 0}
                  value={toSurplusAmount}
                  onChange={(e) => setToSurplusAmount(e.target.value)}
                  placeholder="Ex. 1500"
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-mono-num bg-white border border-[#E7D4BD] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Motif (optionnel)</label>
                <input
                  type="text"
                  maxLength={MAX_MOTIF_LENGTH}
                  disabled={!canOperate || busy}
                  value={toSurplusMotif}
                  onChange={(e) => setToSurplusMotif(e.target.value)}
                  placeholder="Ex. Réallocation vers surplus"
                  className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#E7D4BD] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!canOperate || busy || month.caisses[toSurplusSource].soldeActuel <= 0}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#EA580C] text-white text-xs font-bold transition-all disabled:opacity-45 cursor-pointer shadow-sm"
              >
                Transférer vers Surplus
              </motion.button>
            </form>

            {/* 3. Transfert Surplus -> l'une des 4 Caisses */}
            <form
              onSubmit={handleTransferFromSurplus}
              className="border border-[#EFE0CC] rounded-2xl p-4 sm:p-5 space-y-3.5 bg-gradient-to-b from-white to-[#FAF3E8] shadow-xs"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#075B2E]">
                <ArrowLeftRight className="w-4 h-4 shrink-0 text-[#EA580C]" />
                <h3>Transférer depuis Caisse Surplus</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Caisse de destination</label>
                <select
                  value={fromSurplusTarget}
                  onChange={(e) => setFromSurplusTarget(e.target.value as TransferTargetCaisseKey)}
                  disabled={!canOperate || busy}
                  className="w-full min-h-[44px] px-3 py-2 text-xs border border-[#E7D4BD] rounded-xl bg-white focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                >
                  {CAISSES_FOUR_ORDER.map((k) => (
                    <option key={k} value={k}>
                      {month.caisses[k].label} ({formatFCFA(month.caisses[k].soldeActuel)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Montant (F CFA)</label>
                <input
                  type="number"
                  min={1}
                  max={month.caisses.surplus.soldeActuel || 1}
                  required
                  disabled={!canOperate || busy || month.caisses.surplus.soldeActuel <= 0}
                  value={fromSurplusAmount}
                  onChange={(e) => setFromSurplusAmount(e.target.value)}
                  placeholder="Ex. 5000"
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-mono-num bg-white border border-[#E7D4BD] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Motif (optionnel)</label>
                <input
                  type="text"
                  maxLength={MAX_MOTIF_LENGTH}
                  disabled={!canOperate || busy}
                  value={fromSurplusMotif}
                  onChange={(e) => setFromSurplusMotif(e.target.value)}
                  placeholder="Ex. Renforcement épargne"
                  className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#E7D4BD] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!canOperate || busy || month.caisses.surplus.soldeActuel <= 0}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#075B2E] via-[#006B35] to-[#EA580C] text-white text-xs font-bold transition-all disabled:opacity-45 cursor-pointer shadow-sm"
              >
                Transférer depuis Surplus
              </motion.button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};
