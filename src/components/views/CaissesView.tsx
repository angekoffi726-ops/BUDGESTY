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

  const [mobileOpTab, setMobileOpTab] = useState<'retirer' | 'toSurplus' | 'fromSurplus'>('retirer');
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
    <div className="space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#F6EAD6]/95 backdrop-blur-2xl border border-[#DFC5A2] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_18px_46px_-16px_rgba(124,45,18,0.24)] space-y-4 sm:space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#DFC5A2]">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#C2410C] via-[#EA580C] to-[#F97316] text-white flex items-center justify-center shadow-md shrink-0">
              <Vault className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-[#1F160F]">
                Caisses &amp; Surplus — {month.label}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#2B1E14]/75 mt-0.5 leading-snug">
                Dotations (17 000 F), Épargne &amp; Surplus avec report mensuel.
              </p>
            </div>
          </div>
          <div className="flex items-baseline justify-between sm:block sm:text-right bg-[#EFE0C9]/70 sm:bg-transparent px-3 py-2 sm:p-0 rounded-xl border border-[#DFC5A2] sm:border-0">
            <p className="text-[11px] sm:text-xs text-[#2B1E14]/65">Dotations alimentées</p>
            <p className="font-mono-num text-sm sm:text-lg font-bold text-[#C2410C]">
              <AnimatedNumber value={totalDotationAlimentee} /> / {formatFCFA(TOTAL_CAISSES_DOTATION)}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-[#9A3412] via-[#C2410C] to-[#EA580C] text-white px-3.5 sm:px-4 py-3 sm:py-3.5 text-xs sm:text-sm shadow-[0_14px_30px_-12px_rgba(124,45,18,0.4)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-sheen"
          />
          <span className="relative z-10 font-medium text-[#FDE2C4]">
            Disponible ce mois
          </span>
          <span className="relative z-10 font-mono-num font-extrabold text-sm sm:text-base text-[#FAF0DF]">
            <AnimatedNumber value={month.salaire.argentEncoreDisponible} />
          </span>
        </div>

        {isMonthOpen && !salaryReady && (
          <div className="p-4 rounded-2xl border border-[#EA580C]/40 bg-gradient-to-r from-[#EFE0C9] to-[#FDE2C4]/85 text-[#7C2D12] text-sm flex items-start gap-2.5">
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
              className="p-3.5 rounded-xl border border-[#DFC5A2] bg-[#FBF4E8] text-[#15803D] text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803D]" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 Caisses (2x2 compact grid on Android phones) + Surplus spanning full width */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {CAISSES_STANDARD_ORDER.map((key, idx) => {
            const c = month.caisses[key];
            const enoughFunds = month.salaire.argentEncoreDisponible >= c.dotationMensuelle;
            const canFund = canOperate && !c.dotationAlimentee && enoughFunds;
            const shortLabel =
              key === 'sante' ? 'Santé' : key === 'vetements' ? 'Vêtements' : 'Secours';
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: idx * 0.05 }}
                whileHover={{ y: -3, scale: 1.01 }}
                className={`border rounded-2xl p-3 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4 transition-all ${
                  c.dotationAlimentee
                    ? 'border-[#D7B88E] bg-gradient-to-br from-[#EFE0C9] via-[#F6EAD6] to-[#FDE2C4]/75 shadow-sm'
                    : 'border-[#DFC5A2] bg-[#FBF4E8] hover:border-[#EA580C]/40 shadow-xs'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-[#1F160F] truncate">
                      <span className="sm:hidden">{shortLabel}</span>
                      <span className="hidden sm:inline">{c.label}</span>
                    </h3>
                    <span className="text-[10px] sm:text-xs font-mono-num text-[#EA580C] font-semibold">
                      +{formatFCFA(c.dotationMensuelle)}/m
                    </span>
                  </div>
                  <p className="font-display font-mono-num text-lg sm:text-2xl font-extrabold text-[#15803D] pt-0.5">
                    <AnimatedNumber value={c.soldeActuel} />
                  </p>
                  <p className="text-[10px] sm:text-xs text-[#2B1E14]/65 truncate">
                    Report : {formatFCFA(c.soldePrecedent)}
                  </p>
                </div>

                {c.dotationAlimentee ? (
                  <div className="min-h-[38px] sm:min-h-[42px] py-1.5 px-2 sm:px-3 rounded-xl bg-[#FAF0DF] text-[#15803D] border border-[#15803D]/25 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 text-center">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#15803D] shrink-0" />
                    <span className="sm:hidden">Alimentée</span>
                    <span className="hidden sm:inline">Dotation du mois alimentée</span>
                  </div>
                ) : (
                  <motion.button
                    whileTap={canFund ? { scale: 0.96 } : undefined}
                    type="button"
                    disabled={!canFund || busy}
                    onClick={() => handleFundDotation(key)}
                    className={`w-full min-h-[40px] sm:min-h-[44px] py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                      canFund
                        ? 'bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white shadow-md cursor-pointer'
                        : 'bg-[#E2CAA6] text-[#2B1E14]/45 cursor-not-allowed'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">
                      <span className="sm:hidden">{c.dotationMensuelle.toLocaleString('fr-FR')} F</span>
                      <span className="hidden sm:inline">Alimenter ({formatFCFA(c.dotationMensuelle)})</span>
                    </span>
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
            className="border border-[#DFC5A2] bg-gradient-to-br from-[#EFE0C9] via-[#FBF4E8] to-[#FDE2C4]/70 rounded-2xl p-3 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4 shadow-xs"
          >
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-[#1F160F] truncate">
                  <span className="sm:hidden">Épargne</span>
                  <span className="hidden sm:inline">{month.caisses.epargne.label}</span>
                </h3>
                <span className="text-[10px] sm:text-xs text-[#C2410C] font-semibold">0 F/mois</span>
              </div>
              <p className="font-display font-mono-num text-lg sm:text-2xl font-extrabold text-[#15803D] pt-0.5">
                <AnimatedNumber value={month.caisses.epargne.soldeActuel} />
              </p>
              <p className="text-[10px] sm:text-xs text-[#2B1E14]/65 truncate">
                Report : {formatFCFA(month.caisses.epargne.soldePrecedent)}
              </p>
            </div>
            <div className="min-h-[38px] sm:min-h-[42px] py-1.5 px-2 sm:px-3 rounded-xl bg-[#FAF0DF] text-[#9A3412] border border-[#D7B88E] text-[10px] sm:text-[11px] font-semibold flex items-center justify-center text-center leading-tight">
              <span className="sm:hidden">40 000 F dans Fixes</span>
              <span className="hidden sm:inline">Épargne mensuelle (40 000 F) gérée dans Fixes</span>
            </div>
          </motion.div>

          {/* Caisse Surplus Flagship Vault Card spanning full row on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9A3412] via-[#C2410C] to-[#EA580C] text-white p-4 sm:p-6 shadow-[0_22px_48px_-14px_rgba(124,45,18,0.45)] border border-[#FAF0DF]/35 flex flex-col justify-between space-y-2.5 sm:space-y-3"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-44 bg-gradient-to-r from-transparent via-white/16 to-transparent animate-sheen"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 500 140"
              className="pointer-events-none absolute right-0 bottom-0 w-56 sm:w-72 opacity-25"
            >
              <defs>
                <linearGradient id="surplusWarmWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FAF0DF" />
                  <stop offset="55%" stopColor="#F5E4CA" />
                  <stop offset="100%" stopColor="#FDBA74" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0 110 Q 125 45 250 95 T 500 60 L 500 140 L 0 140 Z"
                fill="url(#surplusWarmWaveGrad)"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] sm:text-xs font-semibold text-[#FDE2C4]">
                  Réserve dynamique
                </p>
                <h3 className="font-display text-base sm:text-xl font-bold text-[#FAF0DF]">
                  Caisse Surplus
                </h3>
                <p className="hidden sm:block text-xs text-[#F5E4CA]/90 max-w-xl leading-relaxed">
                  Reçoit automatiquement les reliquats de dépenses clôturées, les excédents
                  salariaux (&gt; 155 000 F) et les transferts manuels.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-mono-num text-2xl sm:text-4xl font-extrabold text-[#FAF0DF] drop-shadow-sm">
                  <AnimatedNumber value={month.caisses.surplus.soldeActuel} />
                </p>
                <p className="text-[11px] sm:text-xs text-[#FDE2C4]/90 mt-0.5 sm:mt-1">
                  Report : {formatFCFA(month.caisses.surplus.soldePrecedent)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 3 Operations panels: tabbed on Android phones, 3-col side-by-side on desktop */}
        {isMonthOpen && (
          <div className="space-y-3 pt-1">
            <div className="lg:hidden grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#E8D2B2]/95 border border-[#D7B88E]">
              {[
                { id: 'retirer' as const, label: 'Retrait' },
                { id: 'toSurplus' as const, label: '→ Surplus' },
                { id: 'fromSurplus' as const, label: 'Surplus →' },
              ].map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setMobileOpTab(op.id)}
                  className={`min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mobileOpTab === op.id
                      ? 'bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white shadow-sm'
                      : 'text-[#5C3A21] hover:text-[#1F160F]'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 1. Retrait (toutes caisses + surplus) */}
              <form
                onSubmit={handleWithdraw}
                className={`${mobileOpTab === 'retirer' ? 'block' : 'hidden lg:block'} border border-[#DFC5A2] rounded-2xl p-4 sm:p-5 space-y-3 bg-gradient-to-b from-[#FBF4E8] to-[#EFE0C9] shadow-xs`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#9A3412]">
                  <ArrowDownToLine className="w-4 h-4 shrink-0 text-[#EA580C]" />
                  <h3>Retirer d’une caisse / Surplus</h3>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Caisse source
                  </label>
                  <select
                    value={withdrawTarget}
                    onChange={(e) => setWithdrawTarget(e.target.value as CaisseKey)}
                    disabled={!canOperate || busy}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-[#D7B88E] rounded-xl bg-[#FBF4E8] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  >
                    {[...CAISSES_FOUR_ORDER, 'surplus' as CaisseKey].map((k) => (
                      <option key={k} value={k}>
                        {month.caisses[k].label} ({formatFCFA(month.caisses[k].soldeActuel)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Montant (F CFA)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={month.caisses[withdrawTarget].soldeActuel || 1}
                    required
                    disabled={!canOperate || busy || month.caisses[withdrawTarget].soldeActuel <= 0}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Ex. 2000"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs font-mono-num bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Motif (obligatoire)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={MAX_MOTIF_LENGTH}
                    disabled={!canOperate || busy}
                    value={withdrawMotif}
                    onChange={(e) => setWithdrawMotif(e.target.value)}
                    placeholder="Ex. Achat médicaments"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={!canOperate || busy || month.caisses[withdrawTarget].soldeActuel <= 0}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white text-xs font-bold transition-all disabled:opacity-45 cursor-pointer shadow-sm"
                >
                  Valider le retrait
                </motion.button>
              </form>

              {/* 2. Transfert Caisse -> Surplus */}
              <form
                onSubmit={handleTransferToSurplus}
                className={`${mobileOpTab === 'toSurplus' ? 'block' : 'hidden lg:block'} border border-[#DFC5A2] rounded-2xl p-4 sm:p-5 space-y-3 bg-gradient-to-b from-[#FBF4E8] to-[#EFE0C9] shadow-xs`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#9A3412]">
                  <ArrowLeftRight className="w-4 h-4 shrink-0 text-[#15803D]" />
                  <h3>Transférer vers Caisse Surplus</h3>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Caisse source
                  </label>
                  <select
                    value={toSurplusSource}
                    onChange={(e) => setToSurplusSource(e.target.value as TransferTargetCaisseKey)}
                    disabled={!canOperate || busy}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-[#D7B88E] rounded-xl bg-[#FBF4E8] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  >
                    {CAISSES_FOUR_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {month.caisses[k].label} ({formatFCFA(month.caisses[k].soldeActuel)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Montant (F CFA)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={month.caisses[toSurplusSource].soldeActuel || 1}
                    required
                    disabled={!canOperate || busy || month.caisses[toSurplusSource].soldeActuel <= 0}
                    value={toSurplusAmount}
                    onChange={(e) => setToSurplusAmount(e.target.value)}
                    placeholder="Ex. 1500"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs font-mono-num bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Motif (optionnel)
                  </label>
                  <input
                    type="text"
                    maxLength={MAX_MOTIF_LENGTH}
                    disabled={!canOperate || busy}
                    value={toSurplusMotif}
                    onChange={(e) => setToSurplusMotif(e.target.value)}
                    placeholder="Ex. Réallocation vers surplus"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={!canOperate || busy || month.caisses[toSurplusSource].soldeActuel <= 0}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white text-xs font-bold transition-all disabled:opacity-45 cursor-pointer shadow-sm"
                >
                  Transférer vers Surplus
                </motion.button>
              </form>

              {/* 3. Transfert Surplus -> l'une des 4 Caisses */}
              <form
                onSubmit={handleTransferFromSurplus}
                className={`${mobileOpTab === 'fromSurplus' ? 'block' : 'hidden lg:block'} border border-[#DFC5A2] rounded-2xl p-4 sm:p-5 space-y-3 bg-gradient-to-b from-[#FBF4E8] to-[#EFE0C9] shadow-xs`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#9A3412]">
                  <ArrowLeftRight className="w-4 h-4 shrink-0 text-[#EA580C]" />
                  <h3>Transférer depuis Caisse Surplus</h3>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Caisse de destination
                  </label>
                  <select
                    value={fromSurplusTarget}
                    onChange={(e) => setFromSurplusTarget(e.target.value as TransferTargetCaisseKey)}
                    disabled={!canOperate || busy}
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-[#D7B88E] rounded-xl bg-[#FBF4E8] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  >
                    {CAISSES_FOUR_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {month.caisses[k].label} ({formatFCFA(month.caisses[k].soldeActuel)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Montant (F CFA)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={month.caisses.surplus.soldeActuel || 1}
                    required
                    disabled={!canOperate || busy || month.caisses.surplus.soldeActuel <= 0}
                    value={fromSurplusAmount}
                    onChange={(e) => setFromSurplusAmount(e.target.value)}
                    placeholder="Ex. 5000"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs font-mono-num bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold mb-1">
                    Motif (optionnel)
                  </label>
                  <input
                    type="text"
                    maxLength={MAX_MOTIF_LENGTH}
                    disabled={!canOperate || busy}
                    value={fromSurplusMotif}
                    onChange={(e) => setFromSurplusMotif(e.target.value)}
                    placeholder="Ex. Renforcement épargne"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={!canOperate || busy || month.caisses.surplus.soldeActuel <= 0}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white text-xs font-bold transition-all disabled:opacity-45 cursor-pointer shadow-sm"
                >
                  Transférer depuis Surplus
                </motion.button>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
