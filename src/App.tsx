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
import { OfflineIndicator } from './components/OfflineIndicator';
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
  { id: 1, left: '7%', top: '18%', size: 20, duration: 7.2, delay: 0, color: 'bg-[#FFF7EB]/60' },
  { id: 2, left: '20%', top: '72%', size: 15, duration: 8.8, delay: 1.1, color: 'bg-[#FB923C]/45' },
  { id: 3, left: '42%', top: '26%', size: 22, duration: 8.2, delay: 0.5, color: 'bg-[#E6C79C]/55' },
  { id: 4, left: '66%', top: '76%', size: 16, duration: 9.6, delay: 1.9, color: 'bg-[#FAF0DF]/65' },
  { id: 5, left: '84%', top: '22%', size: 20, duration: 7.8, delay: 1.4, color: 'bg-[#F97316]/40' },
  { id: 6, left: '56%', top: '48%', size: 12, duration: 9.2, delay: 0.3, color: 'bg-[#A7D7BA]/45' },
  { id: 7, left: '91%', top: '62%', size: 15, duration: 8.4, delay: 2.2, color: 'bg-[#FDBA74]/50' },
  { id: 8, left: '14%', top: '44%', size: 13, duration: 10.2, delay: 0.9, color: 'bg-[#A7D7BA]/38' },
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
              'linear-gradient(135deg, #E8CFAF 0%, #F4E3CA 32%, #FDE2C4 58%, #FB923C 84%, #EA580C 100%)',
          }}
        />
        <div className="h-14 bg-[#9A3412]/90 backdrop-blur-md border-b border-[#FAF0DF]/20" />
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#F6EAD6]/95 backdrop-blur-2xl border border-[#DFC5A2] shadow-[0_28px_70px_-18px_rgba(124,45,18,0.28)] rounded-3xl p-8 max-w-md w-full text-center space-y-4"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#9A3412] via-[#C2410C] to-[#EA580C] flex items-center justify-center text-[#FAF0DF] font-display font-extrabold text-2xl shadow-lg"
            >
              B
            </motion.div>
            <p className="font-display text-lg font-bold text-[#9A3412]">
              Chargement de BUDGESTY...
            </p>
            <p className="text-xs text-[#2B1E14]/75 leading-relaxed">
              Synchronisation du cycle budgétaire 2027 (du 21 au 20) et des caisses sur Cloud Firestore.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen relative text-[#1F160F] flex flex-col pb-24 md:pb-12">
        {/* Vibrant Warm Beige + Sunset Orange living aurora backdrop with subtle emerald accent */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        >
          <div
            className="absolute -inset-12 animate-bg-shift"
            style={{
              background:
                'linear-gradient(135deg, #E8CFAF 0%, #F4E3CA 32%, #FDE2C4 58%, #FB923C 84%, #EA580C 100%)',
            }}
          />
          {/* Rich Warm Sand-Beige Aurora */}
          <div
            className="absolute -top-36 -left-32 w-[500px] h-[500px] sm:w-[820px] sm:h-[820px] rounded-full animate-aurora-a"
            style={{
              background:
                'radial-gradient(circle, rgba(251,244,232,0.88) 0%, rgba(235,209,172,0.58) 46%, rgba(232,207,175,0) 76%)',
            }}
          />
          {/* Sunset Orange Aurora */}
          <div
            className="absolute top-[8%] -right-32 w-[460px] h-[460px] sm:w-[740px] sm:h-[740px] rounded-full animate-aurora-b"
            style={{
              background:
                'radial-gradient(circle, rgba(249,115,22,0.55) 0%, rgba(234,88,12,0.34) 44%, rgba(194,65,12,0) 74%)',
            }}
          />
          {/* Warm Champagne-Beige & Apricot Sweep */}
          <div
            className="absolute -bottom-44 left-[10%] w-[540px] h-[540px] sm:w-[860px] sm:h-[860px] rounded-full animate-aurora-wave"
            style={{
              background:
                'radial-gradient(circle, rgba(250,240,223,0.82) 0%, rgba(251,146,60,0.36) 48%, rgba(235,209,172,0) 76%)',
            }}
          />
          {/* Subtle Emerald Corner Halo (restrained green accent) */}
          <div
            className="absolute bottom-[-18%] right-[-10%] w-[380px] h-[380px] sm:w-[580px] sm:h-[580px] rounded-full animate-aurora-a"
            style={{
              background:
                'radial-gradient(circle, rgba(21,128,61,0.22) 0%, rgba(234,88,12,0.16) 50%, rgba(232,207,175,0) 74%)',
            }}
          />
          {/* Floating warm beige, tangerine & soft sage motes */}
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
                y: [-20, 22, -20],
                x: [-12, 14, -12],
                opacity: [0.35, 0.78, 0.35],
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

        {/* Frosted warm-beige context bar */}
        <div className="bg-[#F2DFC4]/90 backdrop-blur-xl border-b border-[#D7B88E] text-[#231810] shadow-[0_8px_24px_-12px_rgba(124,45,18,0.25)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#9A3412]">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#EA580C]" />
                <span>{formatDateDuJour()}</span>
              </span>
              <span className="text-[#9A3412]/35 hidden sm:inline">·</span>
              <span className="text-[#2B1E14]/90 font-medium">
                Cycle : <strong className="text-[#1F160F]">{activeMonth.label}</strong> ({activeMonth.cycleLabel})
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2">
              <label
                htmlFor="month-select"
                className="text-xs font-semibold text-[#5C3A21] whitespace-nowrap hidden sm:inline"
              >
                Mois 2027 :
              </label>
              <select
                id="month-select"
                value={activeMonth.moisId}
                onChange={(e) => setSelectedMoisId(e.target.value)}
                className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-[#FBF4E8] border border-[#D7B88E] rounded-xl text-[#1F160F] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#EA580C] cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m.moisId} value={m.moisId}>
                    {m.label} · {m.statut}
                  </option>
                ))}
              </select>
              <span
                className={`inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 shadow-xs ${
                  activeMonth.statut === 'OUVERT'
                    ? 'bg-[#FBF4E8] text-[#15803D] border border-[#15803D]/30'
                    : activeMonth.statut === 'CLOTURE'
                      ? 'bg-gradient-to-r from-[#C2410C] to-[#EA580C] text-white'
                      : 'bg-[#E5CEAE] text-[#5C3A21] border border-[#C9A679]'
                }`}
              >
                {activeMonth.statut === 'OUVERT' ? (
                  <Unlock className="w-3.5 h-3.5 text-[#15803D]" />
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
              className="mb-5 p-4 rounded-2xl bg-[#F6EAD6]/95 backdrop-blur-2xl border border-[#DFC5A2] shadow-[0_14px_34px_-14px_rgba(124,45,18,0.22)] text-sm text-[#432818] flex items-center gap-3"
            >
              <Lock className="w-4 h-4 shrink-0 text-[#EA580C]" />
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
              className="mb-5 p-4 rounded-2xl bg-[#F6EAD6]/95 backdrop-blur-2xl border border-[#DFC5A2] shadow-[0_14px_34px_-14px_rgba(124,45,18,0.22)] text-sm text-[#9A3412] flex items-center gap-3"
            >
              <Lock className="w-4 h-4 shrink-0 text-[#EA580C]" />
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

        <OfflineIndicator />
      </div>
    </MotionConfig>
  );
}
