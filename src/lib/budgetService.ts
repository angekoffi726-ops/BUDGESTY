import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  BudgetMonth,
  CaisseKey,
  DepenseCategoryKey,
  ExpenseEntry,
  FixeKey,
  HistoryEntry,
  HistoryOperationType,
  LOYER_MONTANT,
  MAX_EXPENSE_DESC_LENGTH,
  MAX_EXPENSE_NOTE_LENGTH,
  MAX_HISTORY_MOTIF_LENGTH,
  MAX_MOTIF_LENGTH,
  MONTHS_2027,
  MonthDefinition,
  SALAIRE_REFERENCE,
  TransferTargetCaisseKey,
} from '../types/budget';
import { db, handleFirestoreError, OperationType } from './firebase';
import { getNowTimeString, getTodayIsoDate, sanitizeStr } from './format';
import {
  ensureLocalMonthsInitialized,
  getLocalExpenses,
  getLocalHistory,
} from './localStore';

export const WORKSPACE_ID = 'budgesty_2027_principal';

function makeSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function buildInitialMonthDoc(userId: string, def: MonthDefinition): Record<string, unknown> {
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
      epargne: { label: 'Épargne', montant: 40000, valide: false, valideLe: '' },
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
        dotationMensuelle: 5000,
        dotationAlimentee: false,
        soldePrecedent: 0,
        soldeActuel: 0,
      },
      vetements: {
        label: 'Caisse Vêtements',
        dotationMensuelle: 7000,
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildHistoryRecord(
  userId: string,
  month: BudgetMonth,
  params: {
    type: HistoryOperationType;
    categorie: string;
    montant: number;
    motif: string;
    soldeAvant: number;
    soldeApres: number;
  }
): HistoryEntry {
  const now = new Date();
  return {
    id: makeSafeDocId('hist'),
    userId,
    moisId: month.moisId,
    moisLabel: sanitizeStr(month.label, 40),
    dateOperation: getTodayIsoDate(now),
    heureOperation: getNowTimeString(now),
    type: params.type,
    categorie: sanitizeStr(params.categorie, 60) || 'Opération',
    montant: Math.max(0, Math.round(params.montant)),
    motif: sanitizeStr(params.motif, MAX_HISTORY_MOTIF_LENGTH) || 'Opération budgétaire',
    soldeAvant: Math.max(0, Math.round(params.soldeAvant)),
    soldeApres: Math.max(0, Math.round(params.soldeApres)),
    createdAt: now.toISOString(),
  };
}

function addHistoryToBatch(
  batch: ReturnType<typeof writeBatch>,
  userId: string,
  month: BudgetMonth,
  params: {
    type: HistoryOperationType;
    categorie: string;
    montant: number;
    motif: string;
    soldeAvant: number;
    soldeApres: number;
  }
) {
  const record = buildHistoryRecord(userId, month, params);
  const histRef = doc(collection(db, 'users', userId, 'historique'), record.id);
  const { id: _id, ...payload } = record;
  batch.set(histRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function bootstrapWorkspaceBudget(): Promise<void> {
  let activePath = `users/${WORKSPACE_ID}`;
  try {
    const userRef = doc(db, 'users', WORKSPACE_ID);
    const snap = await getDoc(userRef);

    const moisQuery = query(
      collection(db, 'users', WORKSPACE_ID, 'mois'),
      where('userId', '==', WORKSPACE_ID)
    );
    const moisSnap = await getDocs(moisQuery);
    const existingMoisIds = new Set(moisSnap.docs.map((d) => d.id));

    if (snap.exists() && existingMoisIds.size >= MONTHS_2027.length) {
      return;
    }

    if (!snap.exists()) {
      activePath = `users/${WORKSPACE_ID}`;
      const userBatch = writeBatch(db);
      userBatch.set(userRef, {
        userId: WORKSPACE_ID,
        email: 'budget@budgesty.app',
        displayName: 'BUDGESTY 2027',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await userBatch.commit();
    }

    const missingDefs = MONTHS_2027.filter((def) => !existingMoisIds.has(def.moisId));
    if (missingDefs.length === 0) {
      return;
    }

    const localHistory = existingMoisIds.size === 0 ? getLocalHistory() : [];
    const hasLocalActivity = localHistory.length > 0;

    if (hasLocalActivity) {
      try {
        const localMonths = ensureLocalMonthsInitialized();
        const openSalaryFedMonths = new Set(
          localMonths
            .filter((m) => m.statut === 'OUVERT' && m.salaire.alimentee)
            .map((m) => m.moisId)
        );

        activePath = `users/${WORKSPACE_ID}/mois`;
        for (let i = 0; i < localMonths.length; i += 3) {
          const chunk = localMonths.slice(i, i + 3);
          const monthsBatch = writeBatch(db);
          for (const lm of chunk) {
            if (!existingMoisIds.has(lm.moisId)) {
              const moisRef = doc(db, 'users', WORKSPACE_ID, 'mois', lm.moisId);
              monthsBatch.set(moisRef, {
                ...lm,
                userId: WORKSPACE_ID,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          }
          await monthsBatch.commit();
        }

        const localExpenses = getLocalExpenses()
          .filter((exp) => openSalaryFedMonths.has(exp.moisId))
          .slice(0, 100);
        for (let i = 0; i < localExpenses.length; i += 15) {
          const chunk = localExpenses.slice(i, i + 15);
          const expBatch = writeBatch(db);
          for (const exp of chunk) {
            activePath = `users/${WORKSPACE_ID}/mois/${exp.moisId}/depenses/${exp.id}`;
            const depRef = doc(
              db,
              'users',
              WORKSPACE_ID,
              'mois',
              exp.moisId,
              'depenses',
              exp.id
            );
            const { id: _id, ...payload } = exp;
            expBatch.set(depRef, {
              ...payload,
              userId: WORKSPACE_ID,
              createdAt: serverTimestamp(),
            });
          }
          await expBatch.commit();
        }

        const histList = localHistory.slice(0, 200);
        activePath = `users/${WORKSPACE_ID}/historique`;
        for (let i = 0; i < histList.length; i += 50) {
          const chunk = histList.slice(i, i + 50);
          const histBatch = writeBatch(db);
          for (const h of chunk) {
            const histRef = doc(db, 'users', WORKSPACE_ID, 'historique', h.id);
            const { id: _id, ...payload } = h;
            histBatch.set(histRef, {
              ...payload,
              userId: WORKSPACE_ID,
              createdAt: serverTimestamp(),
            });
          }
          await histBatch.commit();
        }

        try {
          localStorage.removeItem('budgesty_local_months_v1');
          localStorage.removeItem('budgesty_local_expenses_v1');
          localStorage.removeItem('budgesty_local_history_v1');
        } catch {
          // ignore localStorage cleanup errors
        }
        return;
      } catch (migErr) {
        console.warn('Migration locale ignorée, initialisation directe Firestore:', migErr);
        try {
          localStorage.removeItem('budgesty_local_months_v1');
          localStorage.removeItem('budgesty_local_expenses_v1');
          localStorage.removeItem('budgesty_local_history_v1');
        } catch {
          // ignore
        }
      }
    }

    // Re-check missing months in case partial migration wrote some
    const afterMigSnap = await getDocs(moisQuery);
    const afterExisting = new Set(afterMigSnap.docs.map((d) => d.id));
    const remainingDefs = MONTHS_2027.filter((def) => !afterExisting.has(def.moisId));

    activePath = `users/${WORKSPACE_ID}/mois`;
    for (let i = 0; i < remainingDefs.length; i += 3) {
      const chunk = remainingDefs.slice(i, i + 3);
      const monthsBatch = writeBatch(db);
      for (const def of chunk) {
        const moisRef = doc(db, 'users', WORKSPACE_ID, 'mois', def.moisId);
        monthsBatch.set(moisRef, buildInitialMonthDoc(WORKSPACE_ID, def));
      }
      await monthsBatch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, activePath);
  }
}

export async function updateSalaryPreview(
  userId: string,
  month: BudgetMonth,
  input: {
    montantARecevoir: number;
    bonus: number;
    datePrevue: string;
    motifModification: string;
  }
): Promise<void> {
  if (month.statut !== 'OUVERT' || month.salaire.alimentee) {
    throw new Error('Le salaire est déjà alimenté ou le mois est verrouillé.');
  }
  const montantARecevoir = Math.max(0, Math.round(input.montantARecevoir));
  const bonus = Math.max(0, Math.round(input.bonus));
  const totalPrevu = montantARecevoir + bonus;
  const motif = sanitizeStr(input.motifModification, MAX_MOTIF_LENGTH);

  if (totalPrevu !== SALAIRE_REFERENCE && !motif) {
    throw new Error('Un motif est obligatoire lorsque le montant total diffère de 155 000 F CFA.');
  }

  const nextSalaire = {
    ...month.salaire,
    montantARecevoir,
    bonus,
    datePrevue: input.datePrevue,
    motifModification: motif,
  };
  const histParams = {
    type: 'MODIFICATION_SALAIRE' as const,
    categorie: 'Salaire',
    montant: totalPrevu,
    motif: motif || `Mise à jour de la prévision salariale (${totalPrevu} F CFA)`,
    soldeAvant: month.salaire.montantARecevoir + month.salaire.bonus,
    soldeApres: totalPrevu,
  };

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, { salaire: nextSalaire, updatedAt: serverTimestamp() });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function feedSalary(userId: string, month: BudgetMonth): Promise<void> {
  if (month.statut !== 'OUVERT' || month.salaire.alimentee) {
    throw new Error('Le salaire a déjà été alimenté ou le mois est verrouillé.');
  }

  const totalPercu = Math.max(0, Math.round(month.salaire.montantARecevoir + month.salaire.bonus));
  const montantActif = Math.min(totalPercu, SALAIRE_REFERENCE);
  const excedent = Math.max(0, totalPercu - SALAIRE_REFERENCE);
  const nowStr = `${getTodayIsoDate()} ${getNowTimeString()}`;

  const prevSurplus = month.caisses.surplus.soldeActuel;
  const nextSurplus = prevSurplus + excedent;

  const nextSalaire = {
    ...month.salaire,
    alimentee: true,
    montantActif,
    argentEncoreDisponible: montantActif,
    excedentTransfere: excedent,
    alimenteeLe: nowStr,
  };
  const nextCaisses = {
    ...month.caisses,
    surplus: {
      ...month.caisses.surplus,
      soldeActuel: nextSurplus,
    },
  };

  const histEntries: Parameters<typeof buildHistoryRecord>[2][] = [
    {
      type: 'ALIMENTATION_SALAIRE',
      categorie: 'Salaire',
      montant: montantActif,
      motif:
        month.salaire.motifModification ||
        `Alimentation irréversible du salaire mensuel (${montantActif} F CFA actifs)`,
      soldeAvant: 0,
      soldeApres: montantActif,
    },
  ];

  if (month.salaire.bonus > 0) {
    histEntries.push({
      type: 'BONUS_SALAIRE',
      categorie: 'Bonus salaire',
      montant: month.salaire.bonus,
      motif: month.salaire.motifModification || 'Bonus salarial déclaré lors de la réception',
      soldeAvant: month.salaire.montantARecevoir,
      soldeApres: totalPercu,
    });
  }

  if (excedent > 0) {
    histEntries.push({
      type: 'TRANSFERT_AUTO_SURPLUS',
      categorie: 'Caisse Surplus',
      montant: excedent,
      motif: 'Transfert automatique de l’excédent salarial (> 155 000 F CFA) vers Caisse Surplus',
      soldeAvant: prevSurplus,
      soldeApres: nextSurplus,
    });
  }

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, {
      salaire: nextSalaire,
      caisses: nextCaisses,
      updatedAt: serverTimestamp(),
    });
    for (const p of histEntries) {
      addHistoryToBatch(batch, userId, month, p);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function payRent(userId: string, month: BudgetMonth): Promise<void> {
  if (month.statut !== 'OUVERT' || !month.salaire.alimentee || month.loyer.paye) {
    throw new Error('Paiement du loyer impossible dans cet état.');
  }

  const nowStr = `${getTodayIsoDate()} ${getNowTimeString()}`;
  const nextLoyer = {
    ...month.loyer,
    paye: true,
    payeLe: nowStr,
  };
  const histParams = {
    type: 'PAIEMENT_LOYER' as const,
    categorie: 'Loyer (hors budget)',
    montant: LOYER_MONTANT,
    motif: `Paiement irréversible du loyer mensuel (${LOYER_MONTANT} F CFA, hors budget 155 000 F)`,
    soldeAvant: month.salaire.argentEncoreDisponible,
    soldeApres: month.salaire.argentEncoreDisponible,
  };

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, { loyer: nextLoyer, updatedAt: serverTimestamp() });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function validateFixe(
  userId: string,
  month: BudgetMonth,
  fixeKey: FixeKey
): Promise<void> {
  const item = month.fixes[fixeKey];
  if (month.statut !== 'OUVERT' || !month.salaire.alimentee || item.valide) {
    throw new Error('Validation de charge fixe impossible.');
  }
  if (month.salaire.argentEncoreDisponible < item.montant) {
    throw new Error('Argent encore disponible insuffisant pour valider ce fixe.');
  }

  const nowStr = `${getTodayIsoDate()} ${getNowTimeString()}`;
  const soldeAvant = month.salaire.argentEncoreDisponible;
  const soldeApres = soldeAvant - item.montant;
  const nextSalaire = { ...month.salaire, argentEncoreDisponible: soldeApres };
  const nextFixes = {
    ...month.fixes,
    [fixeKey]: { ...item, valide: true, valideLe: nowStr },
  };
  const histParams = {
    type: 'VALIDATION_FIXE' as const,
    categorie: item.label,
    montant: item.montant,
    motif: `Validation irréversible du fixe : ${item.label}`,
    soldeAvant,
    soldeApres,
  };

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, {
      salaire: nextSalaire,
      fixes: nextFixes,
      updatedAt: serverTimestamp(),
    });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function addExpense(
  userId: string,
  month: BudgetMonth,
  input: {
    categorieId: DepenseCategoryKey;
    date: string;
    montant: number;
    description: string;
    note: string;
  }
): Promise<void> {
  const cat = month.depensesCategories[input.categorieId];
  const montant = Math.round(input.montant);
  const description = sanitizeStr(input.description, MAX_EXPENSE_DESC_LENGTH);
  const note = sanitizeStr(input.note, MAX_EXPENSE_NOTE_LENGTH);

  if (month.statut !== 'OUVERT' || !month.salaire.alimentee || cat.cloturee) {
    throw new Error('Ajout de dépense impossible pour cette catégorie.');
  }
  if (montant <= 0 || !description) {
    throw new Error('Veuillez saisir un montant positif et une description.');
  }
  const resteCategorie = cat.budgetAlloue - cat.depenseCumulee;
  if (montant > resteCategorie) {
    throw new Error(`Le montant dépasse le reste disponible de la catégorie (${resteCategorie} F CFA).`);
  }
  if (montant > month.salaire.argentEncoreDisponible) {
    throw new Error('Le montant dépasse l’argent encore disponible ce mois-ci.');
  }

  const soldeAvant = month.salaire.argentEncoreDisponible;
  const soldeApres = soldeAvant - montant;
  const depenseId = makeSafeDocId('dep');
  const nextSalaire = { ...month.salaire, argentEncoreDisponible: soldeApres };
  const nextDeps = {
    ...month.depensesCategories,
    [input.categorieId]: { ...cat, depenseCumulee: cat.depenseCumulee + montant },
  };
  const expensePayload: Omit<ExpenseEntry, 'id'> = {
    userId,
    moisId: month.moisId,
    categorieId: input.categorieId,
    date: input.date,
    montant,
    description,
    note,
    createdAt: serverTimestamp(),
  };
  const histParams = {
    type: 'AJOUT_DEPENSE' as const,
    categorie: cat.label,
    montant,
    motif: note ? `${description} — ${note}` : description,
    soldeAvant,
    soldeApres,
  };

  const depensePath = `users/${userId}/mois/${month.moisId}/depenses/${depenseId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    const depRef = doc(db, 'users', userId, 'mois', month.moisId, 'depenses', depenseId);

    batch.set(depRef, expensePayload);
    batch.update(moisRef, {
      salaire: nextSalaire,
      depensesCategories: nextDeps,
      updatedAt: serverTimestamp(),
    });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, depensePath);
  }
}

export async function closeExpenseCategory(
  userId: string,
  month: BudgetMonth,
  categorieId: DepenseCategoryKey
): Promise<void> {
  const cat = month.depensesCategories[categorieId];
  if (month.statut !== 'OUVERT' || !month.salaire.alimentee || cat.cloturee) {
    throw new Error('Clôture de catégorie impossible.');
  }

  const resteBrut = Math.max(0, cat.budgetAlloue - cat.depenseCumulee);
  const transferable = Math.min(resteBrut, month.salaire.argentEncoreDisponible);
  const soldeAvant = month.salaire.argentEncoreDisponible;
  const soldeApres = soldeAvant - transferable;
  const prevSurplus = month.caisses.surplus.soldeActuel;
  const nextSurplus = prevSurplus + transferable;
  const nowStr = `${getTodayIsoDate()} ${getNowTimeString()}`;

  const nextSalaire = { ...month.salaire, argentEncoreDisponible: soldeApres };
  const nextDeps = {
    ...month.depensesCategories,
    [categorieId]: {
      ...cat,
      cloturee: true,
      clotureeLe: nowStr,
      resteTransfereSurplus: transferable,
    },
  };
  const nextCaisses = {
    ...month.caisses,
    surplus: { ...month.caisses.surplus, soldeActuel: nextSurplus },
  };

  const histEntries: Parameters<typeof buildHistoryRecord>[2][] = [
    {
      type: 'CLOTURE_DEPENSE',
      categorie: cat.label,
      montant: transferable,
      motif:
        transferable > 0
          ? `Clôture définitive de ${cat.label} — transfert de ${transferable} F CFA vers Caisse Surplus`
          : `Clôture définitive de ${cat.label} sans reliquat disponible`,
      soldeAvant,
      soldeApres,
    },
  ];
  if (transferable > 0) {
    histEntries.push({
      type: 'TRANSFERT_AUTO_SURPLUS',
      categorie: 'Caisse Surplus',
      montant: transferable,
      motif: `Reliquat clôture ${cat.label} vers Caisse Surplus`,
      soldeAvant: prevSurplus,
      soldeApres: nextSurplus,
    });
  }

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, {
      salaire: nextSalaire,
      depensesCategories: nextDeps,
      caisses: nextCaisses,
      updatedAt: serverTimestamp(),
    });
    for (const p of histEntries) {
      addHistoryToBatch(batch, userId, month, p);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function fundCaisseDotation(
  userId: string,
  month: BudgetMonth,
  caisseKey: 'sante' | 'vetements' | 'secours'
): Promise<void> {
  const caisse = month.caisses[caisseKey];
  if (month.statut !== 'OUVERT' || !month.salaire.alimentee || caisse.dotationAlimentee) {
    throw new Error('Alimentation de caisse impossible.');
  }
  if (month.salaire.argentEncoreDisponible < caisse.dotationMensuelle) {
    throw new Error('Argent encore disponible insuffisant pour alimenter cette caisse.');
  }

  const soldeAvantDispo = month.salaire.argentEncoreDisponible;
  const soldeApresDispo = soldeAvantDispo - caisse.dotationMensuelle;
  const nextCaisseSolde = caisse.soldeActuel + caisse.dotationMensuelle;

  const nextSalaire = { ...month.salaire, argentEncoreDisponible: soldeApresDispo };
  const nextCaisses = {
    ...month.caisses,
    [caisseKey]: { ...caisse, dotationAlimentee: true, soldeActuel: nextCaisseSolde },
  };
  const histParams = {
    type: 'ALIMENTATION_CAISSE' as const,
    categorie: caisse.label,
    montant: caisse.dotationMensuelle,
    motif: `Dotation mensuelle standard (${caisse.dotationMensuelle} F CFA)`,
    soldeAvant: caisse.soldeActuel,
    soldeApres: nextCaisseSolde,
  };

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, {
      salaire: nextSalaire,
      caisses: nextCaisses,
      updatedAt: serverTimestamp(),
    });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function withdrawFromCaisse(
  userId: string,
  month: BudgetMonth,
  caisseKey: CaisseKey,
  montantInput: number,
  motifInput: string
): Promise<void> {
  const caisse = month.caisses[caisseKey];
  const montant = Math.round(montantInput);
  const motif = sanitizeStr(motifInput, MAX_MOTIF_LENGTH);

  if (month.statut !== 'OUVERT' || !month.salaire.alimentee) {
    throw new Error('Veuillez alimenter le salaire du mois avant d’effectuer une opération.');
  }
  if (!motif) {
    throw new Error('Un motif est obligatoire pour tout retrait.');
  }
  if (montant <= 0 || montant > caisse.soldeActuel) {
    throw new Error('Montant de retrait invalide ou supérieur au solde de la caisse.');
  }

  const soldeAvant = caisse.soldeActuel;
  const soldeApres = soldeAvant - montant;
  const nextCaisses = {
    ...month.caisses,
    [caisseKey]: { ...caisse, soldeActuel: soldeApres },
  };
  const histParams = {
    type: (caisseKey === 'surplus' ? 'RETRAIT_SURPLUS' : 'RETRAIT_CAISSE') as HistoryOperationType,
    categorie: caisse.label,
    montant,
    motif,
    soldeAvant,
    soldeApres,
  };

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, { caisses: nextCaisses, updatedAt: serverTimestamp() });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function transferCaisseToSurplus(
  userId: string,
  month: BudgetMonth,
  sourceKey: TransferTargetCaisseKey,
  montantInput: number,
  motifInput: string
): Promise<void> {
  const source = month.caisses[sourceKey];
  const surplus = month.caisses.surplus;
  const montant = Math.round(montantInput);
  const motif = sanitizeStr(motifInput, MAX_MOTIF_LENGTH) || `Transfert de ${source.label} vers Caisse Surplus`;

  if (month.statut !== 'OUVERT' || !month.salaire.alimentee) {
    throw new Error('Opération impossible tant que le salaire du mois n’est pas alimenté.');
  }
  if (montant <= 0 || montant > source.soldeActuel) {
    throw new Error('Montant invalide ou supérieur au solde de la caisse source.');
  }

  const sourceAvant = source.soldeActuel;
  const sourceApres = sourceAvant - montant;
  const surplusApres = surplus.soldeActuel + montant;
  const nextCaisses = {
    ...month.caisses,
    [sourceKey]: { ...source, soldeActuel: sourceApres },
    surplus: { ...surplus, soldeActuel: surplusApres },
  };
  const histParams = {
    type: 'TRANSFERT_CAISSE_SURPLUS' as const,
    categorie: `${source.label} -> Caisse Surplus`,
    montant,
    motif,
    soldeAvant: sourceAvant,
    soldeApres: sourceApres,
  };

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, { caisses: nextCaisses, updatedAt: serverTimestamp() });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function transferSurplusToCaisse(
  userId: string,
  month: BudgetMonth,
  targetKey: TransferTargetCaisseKey,
  montantInput: number,
  motifInput: string
): Promise<void> {
  const surplus = month.caisses.surplus;
  const target = month.caisses[targetKey];
  const montant = Math.round(montantInput);
  const motif = sanitizeStr(motifInput, MAX_MOTIF_LENGTH) || `Transfert depuis Caisse Surplus vers ${target.label}`;

  if (month.statut !== 'OUVERT' || !month.salaire.alimentee) {
    throw new Error('Opération impossible tant que le salaire du mois n’est pas alimenté.');
  }
  if (montant <= 0 || montant > surplus.soldeActuel) {
    throw new Error('Montant invalide ou supérieur au solde de la Caisse Surplus.');
  }

  const surplusAvant = surplus.soldeActuel;
  const surplusApres = surplusAvant - montant;
  const targetApres = target.soldeActuel + montant;
  const nextCaisses = {
    ...month.caisses,
    surplus: { ...surplus, soldeActuel: surplusApres },
    [targetKey]: { ...target, soldeActuel: targetApres },
  };
  const histParams = {
    type: 'TRANSFERT_SURPLUS_CAISSE' as const,
    categorie: `Caisse Surplus -> ${target.label}`,
    montant,
    motif,
    soldeAvant: surplusAvant,
    soldeApres: surplusApres,
  };

  const moisPath = `users/${userId}/mois/${month.moisId}`;
  try {
    const batch = writeBatch(db);
    const moisRef = doc(db, 'users', userId, 'mois', month.moisId);
    batch.update(moisRef, { caisses: nextCaisses, updatedAt: serverTimestamp() });
    addHistoryToBatch(batch, userId, month, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}

export async function closeMonthAndCarryOver(
  userId: string,
  currentMonth: BudgetMonth,
  nextMonth: BudgetMonth | undefined
): Promise<void> {
  if (currentMonth.statut !== 'OUVERT') {
    throw new Error('Seul un mois OUVERT peut être clôturé.');
  }

  const nowStr = `${getTodayIsoDate()} ${getNowTimeString()}`;
  const totalCaissesFinal =
    currentMonth.caisses.sante.soldeActuel +
    currentMonth.caisses.vetements.soldeActuel +
    currentMonth.caisses.secours.soldeActuel +
    currentMonth.caisses.epargne.soldeActuel +
    currentMonth.caisses.surplus.soldeActuel;

  const carriedCaisses =
    nextMonth && nextMonth.statut === 'VERROUILLE'
      ? {
          sante: {
            ...nextMonth.caisses.sante,
            soldePrecedent: currentMonth.caisses.sante.soldeActuel,
            soldeActuel: currentMonth.caisses.sante.soldeActuel,
          },
          vetements: {
            ...nextMonth.caisses.vetements,
            soldePrecedent: currentMonth.caisses.vetements.soldeActuel,
            soldeActuel: currentMonth.caisses.vetements.soldeActuel,
          },
          secours: {
            ...nextMonth.caisses.secours,
            soldePrecedent: currentMonth.caisses.secours.soldeActuel,
            soldeActuel: currentMonth.caisses.secours.soldeActuel,
          },
          epargne: {
            ...nextMonth.caisses.epargne,
            soldePrecedent: currentMonth.caisses.epargne.soldeActuel,
            soldeActuel: currentMonth.caisses.epargne.soldeActuel,
          },
          surplus: {
            ...nextMonth.caisses.surplus,
            soldePrecedent: currentMonth.caisses.surplus.soldeActuel,
            soldeActuel: currentMonth.caisses.surplus.soldeActuel,
          },
        }
      : null;

  const histParams = {
    type: 'CLOTURE_MOIS' as const,
    categorie: 'Clôture mensuelle',
    montant: totalCaissesFinal,
    motif: nextMonth
      ? `Clôture définitive de ${currentMonth.label} et ouverture de ${nextMonth.label} avec report des caisses`
      : `Clôture définitive de ${currentMonth.label}`,
    soldeAvant: currentMonth.salaire.argentEncoreDisponible,
    soldeApres: totalCaissesFinal,
  };

  const moisPath = `users/${userId}/mois/${currentMonth.moisId}`;
  try {
    const batch = writeBatch(db);
    const currentRef = doc(db, 'users', userId, 'mois', currentMonth.moisId);
    batch.update(currentRef, {
      statut: 'CLOTURE',
      clotureLe: nowStr,
      updatedAt: serverTimestamp(),
    });

    if (nextMonth && carriedCaisses) {
      const nextRef = doc(db, 'users', userId, 'mois', nextMonth.moisId);
      batch.update(nextRef, {
        statut: 'OUVERT',
        caisses: carriedCaisses,
        updatedAt: serverTimestamp(),
      });
    }

    addHistoryToBatch(batch, userId, currentMonth, histParams);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, moisPath);
  }
}
