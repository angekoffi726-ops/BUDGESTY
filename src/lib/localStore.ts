import {
  BudgetMonth,
  ExpenseEntry,
  HistoryEntry,
  LOYER_MONTANT,
  MONTHS_2027,
  MonthDefinition,
  SALAIRE_REFERENCE,
} from '../types/budget';

export const LOCAL_USER_ID = 'local_budgesty_user';

const KEY_MONTHS = 'budgesty_local_months_v1';
const KEY_EXPENSES = 'budgesty_local_expenses_v1';
const KEY_HISTORY = 'budgesty_local_history_v1';
const LOCAL_EVENT = 'budgesty-local-store-updated';

export function buildInitialMonthData(userId: string, def: MonthDefinition): BudgetMonth {
  const nowIso = new Date().toISOString();
  return {
    userId,
    moisId: def.moisId,
    ordre: def.ordre,
    label: def.label,
    cycleLabel: def.cycleLabel,
    cycleDebut: def.cycleDebut,
    cycleFin: def.cycleFin,
    statut: def.ordre === 1 ? 'OUVERT' : 'VERROUILLE',
    salaire: {
      salaireReference: SALAIRE_REFERENCE,
      montantARecevoir: SALAIRE_REFERENCE,
      bonus: 0,
      datePrevue: def.cycleDebut,
      motifModification: '',
      alimentee: false,
      montantActif: 0,
      argentEncoreDisponible: 0,
      excedentTransfere: 0,
      alimenteeLe: '',
    },
    loyer: {
      montant: LOYER_MONTANT,
      paye: false,
      payeLe: '',
      dateLimite: def.dateLimiteLoyer,
    },
    fixes: {
      epargne_personnelle: {
        label: 'Épargne personnelle',
        montant: 30000,
        valide: false,
        valideLe: '',
      },
      epargne_bloquee_mehiel: {
        label: 'Épargne bloquée Mehiel',
        montant: 10000,
        valide: false,
        valideLe: '',
      },
      soutien_famille: { label: 'Soutien Famille', montant: 30000, valide: false, valideLe: '' },
      don_papa: { label: 'Don à Papa', montant: 10000, valide: false, valideLe: '' },
      femme_enfant: { label: 'Femme et enfant', montant: 20000, valide: false, valideLe: '' },
      eau_boire: { label: 'Eau à boire', montant: 2000, valide: false, valideLe: '' },
    },
    depensesCategories: {
      maison: {
        label: 'Dépenses Maison (riz, huile, savon, provisions)',
        budgetAlloue: 30000,
        depenseCumulee: 0,
        cloturee: false,
        clotureeLe: '',
        resteTransfereSurplus: 0,
      },
      internet: {
        label: 'Internet (forfait Orange, MTN ou Moov)',
        budgetAlloue: 5000,
        depenseCumulee: 0,
        cloturee: false,
        clotureeLe: '',
        resteTransfereSurplus: 0,
      },
      eau_laver: {
        label: "Eau à laver (achat d'eau)",
        budgetAlloue: 1000,
        depenseCumulee: 0,
        cloturee: false,
        clotureeLe: '',
        resteTransfereSurplus: 0,
      },
    },
    caisses: {
      sante: {
        label: 'Caisse Santé',
        dotationMensuelle: 7000,
        dotationAlimentee: false,
        soldePrecedent: 0,
        soldeActuel: 0,
      },
      vetements: {
        label: 'Caisse Vêtements',
        dotationMensuelle: 5000,
        dotationAlimentee: false,
        soldePrecedent: 0,
        soldeActuel: 0,
      },
      secours: {
        label: 'Fonds Secours',
        dotationMensuelle: 5000,
        dotationAlimentee: false,
        soldePrecedent: 0,
        soldeActuel: 0,
      },
      epargne: {
        label: 'Caisse Épargne',
        dotationMensuelle: 0,
        dotationAlimentee: false,
        soldePrecedent: 0,
        soldeActuel: 0,
      },
      surplus: {
        label: 'Caisse Surplus',
        dotationMensuelle: 0,
        dotationAlimentee: false,
        soldePrecedent: 0,
        soldeActuel: 0,
      },
    },
    clotureLe: '',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function notifyLocalChange(): void {
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
}

export function subscribeLocalStore(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(LOCAL_EVENT, handler);
  return () => window.removeEventListener(LOCAL_EVENT, handler);
}

function normalizeLocalMonth(m: BudgetMonth): BudgetMonth {
  const rawFixes = m.fixes as unknown as Record<
    string,
    { label?: string; montant?: number; valide?: boolean; valideLe?: string } | undefined
  >;
  const legacyEpargne = rawFixes?.epargne;
  const fixes =
    legacyEpargne || !rawFixes?.epargne_personnelle || !rawFixes?.epargne_bloquee_mehiel
      ? {
          epargne_personnelle: {
            label: 'Épargne personnelle',
            montant: 30000,
            valide: Boolean(legacyEpargne?.valide),
            valideLe: typeof legacyEpargne?.valideLe === 'string' ? legacyEpargne.valideLe : '',
          },
          epargne_bloquee_mehiel: {
            label: 'Épargne bloquée Mehiel',
            montant: 10000,
            valide: Boolean(legacyEpargne?.valide),
            valideLe: typeof legacyEpargne?.valideLe === 'string' ? legacyEpargne.valideLe : '',
          },
          soutien_famille: m.fixes.soutien_famille,
          don_papa: m.fixes.don_papa,
          femme_enfant: m.fixes.femme_enfant,
          eau_boire: m.fixes.eau_boire,
        }
      : m.fixes;

  return {
    ...m,
    fixes,
    caisses: {
      ...m.caisses,
      sante: {
        ...m.caisses.sante,
        dotationMensuelle: 7000,
      },
      vetements: {
        ...m.caisses.vetements,
        dotationMensuelle: 5000,
      },
    },
  };
}

export function ensureLocalMonthsInitialized(): BudgetMonth[] {
  try {
    const raw = localStorage.getItem(KEY_MONTHS);
    if (raw) {
      const parsed = JSON.parse(raw) as BudgetMonth[];
      if (Array.isArray(parsed) && parsed.length === 12) {
        return [...parsed].map(normalizeLocalMonth).sort((a, b) => a.ordre - b.ordre);
      }
    }
  } catch {
    // fallback to reinitialize
  }
  const initial = MONTHS_2027.map((def) => buildInitialMonthData(LOCAL_USER_ID, def));
  localStorage.setItem(KEY_MONTHS, JSON.stringify(initial));
  return initial;
}

export function saveLocalMonths(months: BudgetMonth[]): void {
  localStorage.setItem(KEY_MONTHS, JSON.stringify(months));
  notifyLocalChange();
}

export function getLocalExpenses(moisId?: string): ExpenseEntry[] {
  try {
    const raw = localStorage.getItem(KEY_EXPENSES);
    const list = raw ? (JSON.parse(raw) as ExpenseEntry[]) : [];
    const filtered = moisId ? list.filter((e) => e.moisId === moisId) : list;
    return filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}

export function appendLocalExpense(entry: ExpenseEntry): void {
  const list = getLocalExpenses();
  list.push(entry);
  localStorage.setItem(KEY_EXPENSES, JSON.stringify(list));
  notifyLocalChange();
}

export function getLocalHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    const list = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return list.sort((a, b) => {
      const keyA = `${a.dateOperation} ${a.heureOperation}`;
      const keyB = `${b.dateOperation} ${b.heureOperation}`;
      if (keyA !== keyB) return keyB.localeCompare(keyA);
      return b.id.localeCompare(a.id);
    });
  } catch {
    return [];
  }
}

export function appendLocalHistory(entries: HistoryEntry[]): void {
  const list = getLocalHistory();
  list.push(...entries);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(list));
  notifyLocalChange();
}
