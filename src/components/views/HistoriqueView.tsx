import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, History, Search } from 'lucide-react';
import {
  HISTORY_TYPE_LABELS,
  HistoryEntry,
  HistoryOperationType,
  MONTHS_2027,
} from '../../types/budget';
import { formatFCFA } from '../../lib/format';

interface HistoriqueViewProps {
  history: HistoryEntry[];
  activeMoisId: string;
}

const ALL_TYPES = Object.keys(HISTORY_TYPE_LABELS) as HistoryOperationType[];

export const HistoriqueView: React.FC<HistoriqueViewProps> = ({
  history,
  activeMoisId,
}) => {
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((entry) => {
      if (filterMonth !== 'ALL' && entry.moisId !== filterMonth) return false;
      if (filterType !== 'ALL' && entry.type !== filterType) return false;
      if (q) {
        const hay = `${entry.categorie} ${entry.motif} ${entry.moisLabel} ${HISTORY_TYPE_LABELS[entry.type]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [history, filterMonth, filterType, searchQuery]);

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
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#1F160F]">Historique général</h2>
              <p className="text-xs text-[#2B1E14]/75 mt-0.5">
                Journal complet et immuable de chaque opération avec date, heure, motif et soldes
                avant/après
                <span className="mx-1.5 text-[#EA580C]/45">·</span>
                <strong className="font-mono-num text-[#C2410C]">
                  {filtered.length} opération{filtered.length > 1 ? 's' : ''}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#1F160F] mb-1">
              Filtrer par mois
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-xs border border-[#D7B88E] rounded-xl bg-[#FBF4E8] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
            >
              <option value="ALL">Tous les mois (2027)</option>
              <option value={activeMoisId}>Mois sélectionné ({activeMoisId})</option>
              {MONTHS_2027.map((m) => (
                <option key={m.moisId} value={m.moisId}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F160F] mb-1">
              Filtrer par type d’opération
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-xs border border-[#D7B88E] rounded-xl bg-[#FBF4E8] focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
            >
              <option value="ALL">Tous les types d’opérations</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {HISTORY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F160F] mb-1">
              Rechercher
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#EA580C]/75 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Motif, catégorie..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs bg-[#FBF4E8] border border-[#D7B88E] rounded-xl focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#FB923C]/25"
              />
            </div>
          </div>
        </div>

        {/* History list: Mobile stacked cards + Desktop table */}
        <div className="border border-[#DFC5A2] rounded-2xl overflow-hidden bg-[#FBF4E8]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#2B1E14]/65">
              Aucune opération ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            <>
              {/* Mobile stacked cards */}
              <div className="md:hidden divide-y divide-[#EFE0C9]">
                {filtered.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.25) }}
                    className="p-4 space-y-2 bg-[#FBF4E8]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-[#9A3412]">
                          {HISTORY_TYPE_LABELS[entry.type] || entry.type}
                        </p>
                        <p className="text-[11px] text-[#2B1E14]/65 font-medium">
                          {entry.moisLabel}
                          <span className="mx-1.5 text-[#2B1E14]/35">·</span>
                          {entry.categorie}
                        </p>
                      </div>
                      <span className="font-mono-num text-sm font-bold text-[#EA580C] whitespace-nowrap shrink-0">
                        {formatFCFA(entry.montant)}
                      </span>
                    </div>

                    <p className="text-xs text-[#1F160F]/85 leading-relaxed">{entry.motif}</p>

                    <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num text-[#2B1E14]/65 border-t border-[#EFE0C9]">
                      <span>
                        {entry.dateOperation} · {entry.heureOperation}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1F160F]/80">
                        {formatFCFA(entry.soldeAvant)}
                        <ArrowRight className="w-3 h-3 text-[#EA580C]" />
                        <span className="text-[#15803D] font-bold">
                          {formatFCFA(entry.soldeApres)}
                        </span>
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gradient-to-r from-[#EFE0C9] via-[#EBD4B4] to-[#FDE2C4]/75 border-b border-[#DFC5A2] text-[#9A3412]">
                    <tr>
                      <th className="py-3 px-3 font-semibold whitespace-nowrap">Date</th>
                      <th className="py-3 px-3 font-semibold whitespace-nowrap">Heure</th>
                      <th className="py-3 px-3 font-semibold whitespace-nowrap">Mois</th>
                      <th className="py-3 px-3 font-semibold whitespace-nowrap">Type</th>
                      <th className="py-3 px-3 font-semibold whitespace-nowrap">Catégorie</th>
                      <th className="py-3 px-3 font-semibold">Motif</th>
                      <th className="py-3 px-3 font-semibold text-right whitespace-nowrap">
                        Montant
                      </th>
                      <th className="py-3 px-3 font-semibold text-right whitespace-nowrap">
                        Solde avant
                      </th>
                      <th className="py-3 px-3 font-semibold text-right whitespace-nowrap">
                        Solde après
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE0C9]">
                    {filtered.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-gradient-to-r hover:from-[#EFE0C9]/70 hover:to-[#FDE2C4]/45 transition-colors"
                      >
                        <td className="py-3 px-3 font-mono-num whitespace-nowrap">
                          {entry.dateOperation}
                        </td>
                        <td className="py-3 px-3 font-mono-num whitespace-nowrap text-[#2B1E14]/70">
                          {entry.heureOperation}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium">
                          {entry.moisLabel}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-semibold text-[#9A3412]">
                          {HISTORY_TYPE_LABELS[entry.type] || entry.type}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">{entry.categorie}</td>
                        <td className="py-3 px-3 max-w-xs truncate" title={entry.motif}>
                          {entry.motif}
                        </td>
                        <td className="py-3 px-3 font-mono-num font-bold text-right whitespace-nowrap text-[#EA580C]">
                          {formatFCFA(entry.montant)}
                        </td>
                        <td className="py-3 px-3 font-mono-num text-right whitespace-nowrap text-[#2B1E14]/70">
                          {formatFCFA(entry.soldeAvant)}
                        </td>
                        <td className="py-3 px-3 font-mono-num font-bold text-right whitespace-nowrap text-[#15803D]">
                          {formatFCFA(entry.soldeApres)}
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
