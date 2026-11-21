import React, { useState } from 'react';
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
    <div className="space-y-6">
      <div className="border border-[#DDEBD8] bg-white rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DDEBD8]">
          <div>
            <div className="flex items-center gap-2.5">
              <Vault className="w-5 h-5 text-[#075B2E]" />
              <h2 className="text-lg font-bold text-[#111111]">
                Caisses & Caisse Surplus — {month.label}
              </h2>
            </div>
            <p className="text-xs text-[#111111]/70 mt-1">
              Dotations mensuelles (17 000 F CFA), Caisse Épargne (0 F/mois) et Caisse Surplus
              avec report automatique d’un mois sur l’autre.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#111111]/60">Dotations alimentées</p>
            <p className="font-mono-num text-lg font-bold text-[#075B2E]">
              {formatFCFA(totalDotationAlimentee)} / {formatFCFA(TOTAL_CAISSES_DOTATION)}
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
              Salaire non alimenté : alimentez le salaire dans l’onglet Accueil pour activer les
              dotations, retraits et transferts de caisses.
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

        {/* 4 Caisses + Surplus grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAISSES_STANDARD_ORDER.map((key) => {
            const c = month.caisses[key];
            const enoughFunds = month.salaire.argentEncoreDisponible >= c.dotationMensuelle;
            const canFund = canOperate && !c.dotationAlimentee && enoughFunds;
            return (
              <div
                key={key}
                className="border border-[#DDEBD8] rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#111111]">{c.label}</h3>
                    <span className="text-xs font-mono-num text-[#075B2E] font-semibold">
                      +{formatFCFA(c.dotationMensuelle)}/mois
                    </span>
                  </div>
                  <p className="font-mono-num text-2xl font-bold text-[#075B2E]">
                    {formatFCFA(c.soldeActuel)}
                  </p>
                  <p className="text-xs text-[#111111]/60">
                    Report précédent : {formatFCFA(c.soldePrecedent)}
                  </p>
                </div>

                {c.dotationAlimentee ? (
                  <div className="py-2 px-3 rounded-lg bg-[#DDEBD8]/60 text-[#075B2E] text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dotation du mois alimentée</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canFund || busy}
                    onClick={() => handleFundDotation(key)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      canFund
                        ? 'bg-[#006B35] hover:bg-[#075B2E] text-white cursor-pointer'
                        : 'bg-[#DDEBD8]/60 text-[#111111]/45 cursor-not-allowed'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Alimenter ({formatFCFA(c.dotationMensuelle)})</span>
                  </button>
                )}
              </div>
            );
          })}

          {/* Caisse Épargne */}
          <div className="border border-[#DDEBD8] rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#111111]">
                  {month.caisses.epargne.label}
                </h3>
                <span className="text-xs text-[#111111]/60 font-medium">0 F/mois</span>
              </div>
              <p className="font-mono-num text-2xl font-bold text-[#075B2E]">
                {formatFCFA(month.caisses.epargne.soldeActuel)}
              </p>
              <p className="text-xs text-[#111111]/60">
                Report : {formatFCFA(month.caisses.epargne.soldePrecedent)} · Reçoit des
                transferts depuis Caisse Surplus
              </p>
            </div>
            <div className="py-2 px-3 rounded-lg bg-[#DDEBD8]/30 text-[#075B2E] text-[11px] font-medium text-center">
              Épargne mensuelle (40 000 F) gérée dans Fixes
            </div>
          </div>

          {/* Caisse Surplus */}
          <div className="sm:col-span-2 border border-[#006B35] bg-[#DDEBD8]/25 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#075B2E]">
                  Caisse Surplus (hors dotation 155 000 F)
                </h3>
                <p className="text-xs text-[#111111]/70">
                  Reçoit les reliquats de dépenses clôturées, les excédents salariaux (&gt; 155 000
                  F) et les transferts manuels.
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono-num text-2xl font-bold text-[#006B35]">
                  {formatFCFA(month.caisses.surplus.soldeActuel)}
                </p>
                <p className="text-xs text-[#111111]/60">
                  Report précédent : {formatFCFA(month.caisses.surplus.soldePrecedent)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Operations panels */}
        {isMonthOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            {/* 1. Retrait (toutes caisses + surplus) */}
            <form
              onSubmit={handleWithdraw}
              className="border border-[#DDEBD8] rounded-xl p-4 space-y-3 bg-white"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#075B2E]">
                <ArrowDownToLine className="w-4 h-4" />
                <h3>Retirer d’une caisse / Surplus</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Caisse source</label>
                <select
                  value={withdrawTarget}
                  onChange={(e) => setWithdrawTarget(e.target.value as CaisseKey)}
                  disabled={!canOperate || busy}
                  className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg bg-white focus:outline-none focus:border-[#006B35]"
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
                  className="w-full px-3 py-2 text-xs font-mono-num border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
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
                  className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <button
                type="submit"
                disabled={!canOperate || busy || month.caisses[withdrawTarget].soldeActuel <= 0}
                className="w-full py-2 px-3 rounded-lg bg-[#075B2E] hover:bg-[#006B35] text-white text-xs font-bold transition-colors disabled:opacity-45 cursor-pointer"
              >
                Valider le retrait
              </button>
            </form>

            {/* 2. Transfert Caisse -> Surplus */}
            <form
              onSubmit={handleTransferToSurplus}
              className="border border-[#DDEBD8] rounded-xl p-4 space-y-3 bg-white"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#075B2E]">
                <ArrowLeftRight className="w-4 h-4" />
                <h3>Transférer vers Caisse Surplus</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Caisse source</label>
                <select
                  value={toSurplusSource}
                  onChange={(e) => setToSurplusSource(e.target.value as TransferTargetCaisseKey)}
                  disabled={!canOperate || busy}
                  className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg bg-white focus:outline-none focus:border-[#006B35]"
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
                  className="w-full px-3 py-2 text-xs font-mono-num border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
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
                  className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <button
                type="submit"
                disabled={!canOperate || busy || month.caisses[toSurplusSource].soldeActuel <= 0}
                className="w-full py-2 px-3 rounded-lg bg-[#006B35] hover:bg-[#075B2E] text-white text-xs font-bold transition-colors disabled:opacity-45 cursor-pointer"
              >
                Transférer vers Surplus
              </button>
            </form>

            {/* 3. Transfert Surplus -> l'une des 4 Caisses */}
            <form
              onSubmit={handleTransferFromSurplus}
              className="border border-[#DDEBD8] rounded-xl p-4 space-y-3 bg-white"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#075B2E]">
                <ArrowLeftRight className="w-4 h-4" />
                <h3>Transférer depuis Caisse Surplus</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Caisse de destination</label>
                <select
                  value={fromSurplusTarget}
                  onChange={(e) => setFromSurplusTarget(e.target.value as TransferTargetCaisseKey)}
                  disabled={!canOperate || busy}
                  className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg bg-white focus:outline-none focus:border-[#006B35]"
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
                  className="w-full px-3 py-2 text-xs font-mono-num border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
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
                  className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                />
              </div>

              <button
                type="submit"
                disabled={!canOperate || busy || month.caisses.surplus.soldeActuel <= 0}
                className="w-full py-2 px-3 rounded-lg bg-[#006B35] hover:bg-[#075B2E] text-white text-xs font-bold transition-colors disabled:opacity-45 cursor-pointer"
              >
                Transférer depuis Surplus
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
