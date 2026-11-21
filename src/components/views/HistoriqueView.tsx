import React, { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="border border-[#DDEBD8] bg-white rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#DDEBD8]">
          <div>
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-[#075B2E]" />
              <h2 className="text-lg font-bold text-[#111111]">Historique général</h2>
            </div>
            <p className="text-xs text-[#111111]/70 mt-1">
              Journal complet et immuable de chaque opération avec date, heure, motif et soldes
              avant/après.
            </p>
          </div>
          <span className="font-mono-num text-xs font-semibold text-[#075B2E]">
            {filtered.length} opération{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Filtrer par mois
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg bg-white focus:outline-none focus:border-[#006B35]"
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
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Filtrer par type d’opération
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDEBD8] rounded-lg bg-white focus:outline-none focus:border-[#006B35]"
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
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Rechercher
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#075B2E]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Motif, catégorie..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
              />
            </div>
          </div>
        </div>

        {/* History table */}
        <div className="border border-[#DDEBD8] rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#111111]/60">
              Aucune opération ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#DDEBD8]/40 border-b border-[#DDEBD8] text-[#075B2E]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Heure</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Mois</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Type</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Catégorie</th>
                    <th className="py-2.5 px-3 font-semibold">Motif</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      Montant
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      Solde avant
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      Solde après
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDEBD8]">
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#DDEBD8]/15">
                      <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                        {entry.dateOperation}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num whitespace-nowrap text-[#111111]/70">
                        {entry.heureOperation}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium">
                        {entry.moisLabel}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-[#075B2E]">
                        {HISTORY_TYPE_LABELS[entry.type] || entry.type}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{entry.categorie}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate" title={entry.motif}>
                        {entry.motif}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num font-bold text-right whitespace-nowrap text-[#006B35]">
                        {formatFCFA(entry.montant)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right whitespace-nowrap text-[#111111]/70">
                        {formatFCFA(entry.soldeAvant)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num font-semibold text-right whitespace-nowrap">
                        {formatFCFA(entry.soldeApres)}
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
