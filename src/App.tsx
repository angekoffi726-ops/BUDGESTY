import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Calendar, Lock, Unlock } from 'lucide-react';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { bootstrapUserBudget } from './lib/budgetService';
import {
  ensureLocalMonthsInitialized,
  getLocalExpenses,
  getLocalHistory,
  LOCAL_USER_ID,
  subscribeLocalStore,
} from './lib/localStore';
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  const [months, setMonths] = useState<BudgetMonth[]>(() => ensureLocalMonthsInitialized());
  const [selectedMoisId, setSelectedMoisId] = useState<string>('2027-01');
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() => getLocalExpenses('2027-01'));
  const [history, setHistory] = useState<HistoryEntry[]>(() => getLocalHistory());

  const [activeTab, setActiveTab] = useState<NavTab>('accueil');
  const [pdfOpen, setPdfOpen] = useState(false);

  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        setBootstrapping(true);
        try {
          await bootstrapUserBudget(currentUser);
        } catch (err) {
          setAsyncError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setBootstrapping(false);
        }
      } else {
        const localMonths = ensureLocalMonthsInitialized();
        setMonths(localMonths);
        const openMonth = localMonths.find((m) => m.statut === 'OUVERT');
        const targetId = openMonth ? openMonth.moisId : localMonths[0].moisId;
        setSelectedMoisId((prev) =>
          localMonths.some((m) => m.moisId === prev) ? prev : targetId
        );
        setExpenses(getLocalExpenses(targetId));
        setHistory(getLocalHistory());
      }
    });
    return () => unsub();
  }, []);

  // Local store subscription when not signed into Firebase
  useEffect(() => {
    if (user) return;
    const syncFromLocal = () => {
      const localMonths = ensureLocalMonthsInitialized();
      setMonths(localMonths);
      setExpenses(getLocalExpenses(selectedMoisId));
      setHistory(getLocalHistory());
    };
    syncFromLocal();
    return subscribeLocalStore(syncFromLocal);
  }, [user, selectedMoisId]);

  // Firestore listeners when signed into Firebase
  useEffect(() => {
    if (!authReady || !user) return;
    const path = `users/${user.uid}/mois`;
    const q = query(collection(db, 'users', user.uid, 'mois'), where('userId', '==', user.uid));
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
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady || !user || !selectedMoisId) return;
    const path = `users/${user.uid}/mois/${selectedMoisId}/depenses`;
    const q = query(
      collection(db, 'users', user.uid, 'mois', selectedMoisId, 'depenses'),
      where('userId', '==', user.uid)
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
  }, [authReady, user, selectedMoisId]);

  useEffect(() => {
    if (!authReady || !user) return;
    const path = `users/${user.uid}/historique`;
    const q = query(
      collection(db, 'users', user.uid, 'historique'),
      where('userId', '==', user.uid)
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
  }, [authReady, user]);

  const activeMonth = useMemo(
    () => months.find((m) => m.moisId === selectedMoisId) || months[0],
    [months, selectedMoisId]
  );

  const nextMonth = useMemo(() => {
    if (!activeMonth) return undefined;
    return months.find((m) => m.ordre === activeMonth.ordre + 1);
  }, [months, activeMonth]);

  const effectiveUserId = user ? user.uid : LOCAL_USER_ID;

  if (bootstrapping || !activeMonth) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="h-14 bg-[#075B2E]" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="border border-[#DDEBD8] rounded-xl p-6 max-w-md w-full text-center space-y-2">
            <p className="text-sm font-bold text-[#075B2E]">
              Synchronisation du cycle budgétaire 2027
            </p>
            <p className="text-xs text-[#111111]/65">
              Chargement de vos données depuis Cloud Firestore...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col pb-20 md:pb-10">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPdf={() => setPdfOpen(true)}
      />

      {/* Context bar: Date du jour + Month selector */}
      <div className="bg-[#DDEBD8]/40 border-b border-[#DDEBD8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#075B2E]">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{formatDateDuJour()}</span>
            </span>
            <span className="text-[#111111]/40 hidden sm:inline">|</span>
            <span className="text-[#111111]/80 font-medium">
              Cycle actif : <strong>{activeMonth.label}</strong> ({activeMonth.cycleLabel})
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <label htmlFor="month-select" className="text-xs font-semibold text-[#075B2E] whitespace-nowrap">
              Mois 2027 :
            </label>
            <select
              id="month-select"
              value={activeMonth.moisId}
              onChange={(e) => setSelectedMoisId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#075B2E]/30 rounded-lg text-[#111111] focus:outline-none focus:border-[#006B35]"
            >
              {months.map((m) => (
                <option key={m.moisId} value={m.moisId}>
                  {m.label} · {m.statut}
                </option>
              ))}
            </select>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 ${
                activeMonth.statut === 'OUVERT'
                  ? 'bg-[#006B35] text-white'
                  : activeMonth.statut === 'CLOTURE'
                    ? 'bg-[#075B2E] text-[#DDEBD8]'
                    : 'bg-white border border-[#DDEBD8] text-[#111111]/65'
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeMonth.statut === 'VERROUILLE' && activeTab !== 'historique' && (
          <div className="mb-6 p-4 rounded-xl border border-[#DDEBD8] bg-[#DDEBD8]/30 text-sm text-[#075B2E] flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              <strong>{activeMonth.label}</strong> est actuellement verrouillé. Clôturez le mois
              précédent pour l’ouvrir et débloquer ses opérations.
            </span>
          </div>
        )}

        {activeMonth.statut === 'CLOTURE' && activeTab !== 'historique' && (
          <div className="mb-6 p-4 rounded-xl border border-[#075B2E]/25 bg-[#DDEBD8]/35 text-sm text-[#075B2E] flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              <strong>{activeMonth.label}</strong> est clôturé définitivement (lecture seule).
            </span>
          </div>
        )}

        {activeTab === 'accueil' && (
          <AccueilView
            userId={effectiveUserId}
            month={activeMonth}
            nextMonth={nextMonth}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'loyer' && <LoyerView userId={effectiveUserId} month={activeMonth} />}
        {activeTab === 'fixes' && <FixesView userId={effectiveUserId} month={activeMonth} />}
        {activeTab === 'depenses' && (
          <DepensesView userId={effectiveUserId} month={activeMonth} expenses={expenses} />
        )}
        {activeTab === 'caisses' && <CaissesView userId={effectiveUserId} month={activeMonth} />}
        {activeTab === 'historique' && (
          <HistoriqueView history={history} activeMoisId={activeMonth.moisId} />
        )}
      </main>

      <PdfModal
        isOpen={pdfOpen}
        onClose={() => setPdfOpen(false)}
        month={activeMonth}
        expenses={expenses}
        history={history}
      />
    </div>
  );
}
