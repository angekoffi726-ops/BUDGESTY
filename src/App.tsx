import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Calendar, Lock, Unlock } from 'lucide-react';
import {
  db,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { bootstrapWorkspaceBudget, WORKSPACE_ID } from './lib/budgetService';
import { formatDateDuJour } from './lib/format';
import {
  BudgetMonth,
  ExpenseEntry,
  HistoryEntry,
  NavTab,
} from './types/budget';
import { Navbar } from './components/Navbar';
import { PdfModal } from './components/PdfModal';
import { AccueilView } from './components/views/AccueilView';
import { LoyerView } from './components/views/LoyerView';
import { FixesView } from './components/views/FixesView';
import { DepensesView } from './components/views/DepensesView';
import { CaissesView } from './components/views/CaissesView';
import { HistoriqueView } from './components/views/HistoriqueView';

function sortHistoryDesc(a: HistoryEntry, b: HistoryEntry): number {
  const keyA = `${a.dateOperation} ${a.heureOperation}`;
  const keyB = `${b.dateOperation} ${b.heureOperation}`;
  if (keyA !== keyB) return keyB.localeCompare(keyA);
  return b.id.localeCompare(a.id);
}

const FLOATING_MOTES = [
  { id: 1, left: '8%', top: '20%', size: 16, duration: 7.5, delay: 0, color: 'bg-[#DDEBD8]/35' },
  { id: 2, left: '22%', top: '70%', size: 12, duration: 9, delay: 1.2, color: 'bg-[#DDD6FE]/45' },
  { id: 3, left: '46%', top: '30%', size: 20, duration: 8.5, delay: 0.6, color: 'bg-white/25' },
  { id: 4, left: '72%', top: '74%', size: 14, duration: 10, delay: 2.1, color: 'bg-[#C4B5FD]/40' },
  { id: 5, left: '86%', top: '24%', size: 18, duration: 8, delay: 1.5, color: 'bg-[#DDEBD8]/35' },
  { id: 6, left: '62%', top: '52%', size: 11, duration: 9.5, delay: 0.4, color: 'bg-white/30' },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  const [months, setMonths] = useState<BudgetMonth[]>([]);
  const [selectedMoisId, setSelectedMoisId] = useState<string>('2027-01');
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [activeTab, setActiveTab] = useState<NavTab>('accueil');
  const [pdfOpen, setPdfOpen] = useState(false);

  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await bootstrapWorkspaceBudget();
        if (active) setReady(true);
      } catch (err) {
        if (active) {
          setAsyncError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Firestore listener for the 12 months
  useEffect(() => {
    if (!ready) return;
    const path = `users/${WORKSPACE_ID}/mois`;
    const q = query(
      collection(db, 'users', WORKSPACE_ID, 'mois'),
      where('userId', '==', WORKSPACE_ID)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as BudgetMonth);
        list.sort((a, b) => a.ordre - b.ordre);
        if (list.length > 0) {
          setMonths(list);
          setSelectedMoisId((prev) => {
            const exists = list.some((m) => m.moisId === prev);
            if (exists) return prev;
            const openMonth = list.find((m) => m.statut === 'OUVERT');
            return openMonth ? openMonth.moisId : list[0].moisId;
          });
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
    return () => unsub();
  }, [ready]);

  // Firestore listener for expenses of the selected month
  useEffect(() => {
    if (!ready || !selectedMoisId) return;
    const path = `users/${WORKSPACE_ID}/mois/${selectedMoisId}/depenses`;
    const q = query(
      collection(db, 'users', WORKSPACE_ID, 'mois', selectedMoisId, 'depenses'),
      where('userId', '==', WORKSPACE_ID)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ExpenseEntry, 'id'>),
        }));
        list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
        setExpenses(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
    return () => unsub();
  }, [ready, selectedMoisId]);

  // Firestore listener for general history
  useEffect(() => {
    if (!ready) return;
    const path = `users/${WORKSPACE_ID}/historique`;
    const q = query(
      collection(db, 'users', WORKSPACE_ID, 'historique'),
      where('userId', '==', WORKSPACE_ID)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<HistoryEntry, 'id'>),
        }));
        list.sort(sortHistoryDesc);
        setHistory(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
    return () => unsub();
  }, [ready]);

  const activeMonth = useMemo(
    () => months.find((m) => m.moisId === selectedMoisId) || months[0],
    [months, selectedMoisId]
  );

  const nextMonth = useMemo(() => {
    if (!activeMonth) return undefined;
    return months.find((m) => m.ordre === activeMonth.ordre + 1);
  }, [months, activeMonth]);

  if (!ready || !activeMonth) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, #075B2E 0%, #006B35 35%, #4C1D95 75%, #7C3AED 100%)',
          }}
        />
        <div className="h-14 bg-[#053B20]/80 backdrop-blur-md border-b border-white/15" />
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_28px_70px_-18px_rgba(45,18,95,0.55)] rounded-3xl p-8 max-w-md w-full text-center space-y-4"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#075B2E] via-[#006B35] to-[#6D28D9] flex items-center justify-center text-white font-display font-extrabold text-2xl shadow-lg"
            >
              B
            </motion.div>
            <p className="font-display text-lg font-bold text-[#075B2E]">
              Chargement de BUDGESTY...
            </p>
            <p className="text-xs text-[#111111]/70 leading-relaxed">
              Synchronisation du cycle budgétaire 2027 (du 21 au 20) et des caisses sur Cloud Firestore.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen relative text-[#111111] flex flex-col pb-24 md:pb-12">
        {/* Vibrant Emerald + Violet living aurora gradient backdrop */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, #053E1F 0%, #075B2E 28%, #006B35 48%, #4C1D95 76%, #7C3AED 100%)',
            }}
          />
          {/* Mint & Emerald Aurora Glow */}
          <div
            className="absolute -top-36 -left-32 w-[480px] h-[480px] sm:w-[760px] sm:h-[760px] rounded-full animate-aurora-a"
            style={{
              background:
                'radial-gradient(circle, rgba(221,235,216,0.52) 0%, rgba(0,107,53,0.45) 45%, rgba(7,91,46,0) 74%)',
            }}
          />
          {/* Rich Violet Aurora Glow */}
          <div
            className="absolute top-[14%] -right-36 w-[480px] h-[480px] sm:w-[780px] sm:h-[780px] rounded-full animate-aurora-b"
            style={{
              background:
                'radial-gradient(circle, rgba(167,139,250,0.62) 0%, rgba(124,58,237,0.48) 42%, rgba(76,29,149,0) 74%)',
            }}
          />
          {/* Mint-to-Lavender Sweep */}
          <div
            className="absolute -bottom-44 left-[14%] w-[520px] h-[520px] sm:w-[840px] sm:h-[840px] rounded-full animate-aurora-wave"
            style={{
              background:
                'radial-gradient(circle, rgba(221,235,216,0.48) 0%, rgba(139,92,246,0.38) 48%, rgba(76,29,149,0) 75%)',
            }}
          />
          {/* Floating light motes */}
          {FLOATING_MOTES.map((mote) => (
            <motion.span
              key={mote.id}
              className={`absolute rounded-full ${mote.color} backdrop-blur-xs`}
              style={{
                left: mote.left,
                top: mote.top,
                width: mote.size,
                height: mote.size,
              }}
              animate={{
                y: [-18, 20, -18],
                x: [-10, 12, -10],
                opacity: [0.28, 0.68, 0.28],
              }}
              transition={{
                duration: mote.duration,
                delay: mote.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenPdf={() => setPdfOpen(true)}
        />

        {/* Frosted glass context bar */}
        <div className="bg-[#062E22]/45 backdrop-blur-xl border-b border-white/15 text-white shadow-[0_8px_28px_-12px_rgba(32,12,72,0.5)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#DDEBD8]">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{formatDateDuJour()}</span>
              </span>
              <span className="text-white/30 hidden sm:inline">·</span>
              <span className="text-white/95 font-medium">
                Cycle : <strong className="text-white">{activeMonth.label}</strong> ({activeMonth.cycleLabel})
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2">
              <label
                htmlFor="month-select"
                className="text-xs font-semibold text-[#DDD6FE] whitespace-nowrap hidden sm:inline"
              >
                Mois 2027 :
              </label>
              <select
                id="month-select"
                value={activeMonth.moisId}
                onChange={(e) => setSelectedMoisId(e.target.value)}
                className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-white/95 border border-white/70 rounded-xl text-[#111111] shadow-md focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m.moisId} value={m.moisId}>
                    {m.label} · {m.statut}
                  </option>
                ))}
              </select>
              <span
                className={`inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 shadow-md ${
                  activeMonth.statut === 'OUVERT'
                    ? 'bg-gradient-to-r from-[#DDEBD8] via-white to-[#DDD6FE] text-[#075B2E]'
                    : activeMonth.statut === 'CLOTURE'
                      ? 'bg-[#4C1D95] text-white border border-white/25'
                      : 'bg-white/20 text-white border border-white/25'
                }`}
              >
                {activeMonth.statut === 'OUVERT' ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{activeMonth.statut}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
          {activeMonth.statut === 'VERROUILLE' && activeTab !== 'historique' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 rounded-2xl bg-white/94 backdrop-blur-2xl border border-white/85 shadow-[0_18px_40px_-14px_rgba(32,12,72,0.45)] text-sm text-[#075B2E] flex items-center gap-3"
            >
              <Lock className="w-4 h-4 shrink-0 text-[#6D28D9]" />
              <span>
                <strong>{activeMonth.label}</strong> est actuellement verrouillé. Clôturez le mois
                précédent pour l’ouvrir et débloquer ses opérations.
              </span>
            </motion.div>
          )}

          {activeMonth.statut === 'CLOTURE' && activeTab !== 'historique' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 rounded-2xl bg-white/94 backdrop-blur-2xl border border-white/85 shadow-[0_18px_40px_-14px_rgba(32,12,72,0.45)] text-sm text-[#4C1D95] flex items-center gap-3"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                <strong>{activeMonth.label}</strong> est clôturé définitivement (lecture seule).
              </span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${activeMonth.moisId}`}
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'accueil' && (
                <AccueilView
                  userId={WORKSPACE_ID}
                  month={activeMonth}
                  nextMonth={nextMonth}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === 'loyer' && <LoyerView userId={WORKSPACE_ID} month={activeMonth} />}
              {activeTab === 'fixes' && <FixesView userId={WORKSPACE_ID} month={activeMonth} />}
              {activeTab === 'depenses' && (
                <DepensesView userId={WORKSPACE_ID} month={activeMonth} expenses={expenses} />
              )}
              {activeTab === 'caisses' && <CaissesView userId={WORKSPACE_ID} month={activeMonth} />}
              {activeTab === 'historique' && (
                <HistoriqueView history={history} activeMoisId={activeMonth.moisId} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <PdfModal
          isOpen={pdfOpen}
          onClose={() => setPdfOpen(false)}
          month={activeMonth}
          expenses={expenses}
          history={history}
        />
      </div>
    </MotionConfig>
  );
}
