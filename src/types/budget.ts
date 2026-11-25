export const SALAIRE_REFERENCE = 155000;
export const LOYER_MONTANT = 35350;
export const TOTAL_FIXES_BUDGET = 102000;
export const TOTAL_DEPENSES_BUDGET = 36000;
export const TOTAL_CAISSES_DOTATION = 17000;

export const MAX_TEXT_SHORT = 40;
export const MAX_MOTIF_LENGTH = 200;
export const MAX_EXPENSE_DESC_LENGTH = 140;
export const MAX_EXPENSE_NOTE_LENGTH = 240;
export const MAX_HISTORY_MOTIF_LENGTH = 240;

export type NavTab = 'accueil' | 'loyer' | 'fixes' | 'depenses' | 'caisses' | 'historique';

export type MonthStatus = 'OUVERT' | 'VERROUILLE' | 'CLOTURE';

export type FixeKey =
  | 'epargne_personnelle'
  | 'epargne_bloquee_mehiel'
  | 'soutien_famille'
  | 'don_papa'
  | 'femme_enfant'
  | 'eau_boire';

export type DepenseCategoryKey = 'maison' | 'internet' | 'eau_laver';

export type CaisseKey = 'sante' | 'vetements' | 'secours' | 'epargne' | 'surplus';

export type TransferTargetCaisseKey = 'sante' | 'vetements' | 'secours' | 'epargne';

export type HistoryOperationType =
  | 'MODIFICATION_SALAIRE'
  | 'ALIMENTATION_SALAIRE'
  | 'BONUS_SALAIRE'
  | 'TRANSFERT_AUTO_SURPLUS'
  | 'PAIEMENT_LOYER'
  | 'VALIDATION_FIXE'
  | 'AJOUT_DEPENSE'
  | 'CLOTURE_DEPENSE'
  | 'ALIMENTATION_CAISSE'
  | 'RETRAIT_CAISSE'
  | 'TRANSFERT_CAISSE_SURPLUS'
  | 'TRANSFERT_SURPLUS_CAISSE'
  | 'RETRAIT_SURPLUS'
  | 'CLOTURE_MOIS';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface SalaireState {
  salaireReference: number;
  montantARecevoir: number;
  bonus: number;
  datePrevue: string;
  motifModification: string;
  alimentee: boolean;
  montantActif: number;
  argentEncoreDisponible: number;
  excedentTransfere: number;
  alimenteeLe: string;
}

export interface LoyerState {
  montant: number;
  paye: boolean;
  payeLe: string;
  dateLimite: string;
}

export interface FixeItem {
  label: string;
  montant: number;
  valide: boolean;
  valideLe: string;
}

export interface DepenseCategoryState {
  label: string;
  budgetAlloue: number;
  depenseCumulee: number;
  cloturee: boolean;
  clotureeLe: string;
  resteTransfereSurplus: number;
}

export interface CaisseState {
  label: string;
  dotationMensuelle: number;
  dotationAlimentee: boolean;
  soldePrecedent: number;
  soldeActuel: number;
}

export interface BudgetMonth {
  userId: string;
  moisId: string;
  ordre: number;
  label: string;
  cycleLabel: string;
  cycleDebut: string;
  cycleFin: string;
  statut: MonthStatus;
  salaire: SalaireState;
  loyer: LoyerState;
  fixes: Record<FixeKey, FixeItem>;
  depensesCategories: Record<DepenseCategoryKey, DepenseCategoryState>;
  caisses: Record<CaisseKey, CaisseState>;
  clotureLe: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ExpenseEntry {
  id: string;
  userId: string;
  moisId: string;
  categorieId: DepenseCategoryKey;
  date: string;
  montant: number;
  description: string;
  note: string;
  createdAt: unknown;
}

export interface HistoryEntry {
  id: string;
  userId: string;
  moisId: string;
  moisLabel: string;
  dateOperation: string;
  heureOperation: string;
  type: HistoryOperationType;
  categorie: string;
  montant: number;
  motif: string;
  soldeAvant: number;
  soldeApres: number;
  createdAt: unknown;
}

export interface MonthDefinition {
  moisId: string;
  ordre: number;
  label: string;
  cycleLabel: string;
  cycleDebut: string;
  cycleFin: string;
  dateLimiteLoyer: string;
}

export const MONTHS_2027: MonthDefinition[] = [
  {
    moisId: '2027-01',
    ordre: 1,
    label: 'Janvier 2027',
    cycleLabel: '21 déc. 2026 – 20 janv. 2027',
    cycleDebut: '2026-12-21',
    cycleFin: '2027-01-20',
    dateLimiteLoyer: '2027-01-28',
  },
  {
    moisId: '2027-02',
    ordre: 2,
    label: 'Février 2027',
    cycleLabel: '21 janv. 2027 – 20 févr. 2027',
    cycleDebut: '2027-01-21',
    cycleFin: '2027-02-20',
    dateLimiteLoyer: '2027-02-28',
  },
  {
    moisId: '2027-03',
    ordre: 3,
    label: 'Mars 2027',
    cycleLabel: '21 févr. 2027 – 20 mars 2027',
    cycleDebut: '2027-02-21',
    cycleFin: '2027-03-20',
    dateLimiteLoyer: '2027-03-28',
  },
  {
    moisId: '2027-04',
    ordre: 4,
    label: 'Avril 2027',
    cycleLabel: '21 mars 2027 – 20 avr. 2027',
    cycleDebut: '2027-03-21',
    cycleFin: '2027-04-20',
    dateLimiteLoyer: '2027-04-28',
  },
  {
    moisId: '2027-05',
    ordre: 5,
    label: 'Mai 2027',
    cycleLabel: '21 avr. 2027 – 20 mai 2027',
    cycleDebut: '2027-04-21',
    cycleFin: '2027-05-20',
    dateLimiteLoyer: '2027-05-28',
  },
  {
    moisId: '2027-06',
    ordre: 6,
    label: 'Juin 2027',
    cycleLabel: '21 mai 2027 – 20 juin 2027',
    cycleDebut: '2027-05-21',
    cycleFin: '2027-06-20',
    dateLimiteLoyer: '2027-06-28',
  },
  {
    moisId: '2027-07',
    ordre: 7,
    label: 'Juillet 2027',
    cycleLabel: '21 juin 2027 – 20 juil. 2027',
    cycleDebut: '2027-06-21',
    cycleFin: '2027-07-20',
    dateLimiteLoyer: '2027-07-28',
  },
  {
    moisId: '2027-08',
    ordre: 8,
    label: 'Août 2027',
    cycleLabel: '21 juil. 2027 – 20 août 2027',
    cycleDebut: '2027-07-21',
    cycleFin: '2027-08-20',
    dateLimiteLoyer: '2027-08-28',
  },
  {
    moisId: '2027-09',
    ordre: 9,
    label: 'Septembre 2027',
    cycleLabel: '21 août 2027 – 20 sept. 2027',
    cycleDebut: '2027-08-21',
    cycleFin: '2027-09-20',
    dateLimiteLoyer: '2027-09-28',
  },
  {
    moisId: '2027-10',
    ordre: 10,
    label: 'Octobre 2027',
    cycleLabel: '21 sept. 2027 – 20 oct. 2027',
    cycleDebut: '2027-09-21',
    cycleFin: '2027-10-20',
    dateLimiteLoyer: '2027-10-28',
  },
  {
    moisId: '2027-11',
    ordre: 11,
    label: 'Novembre 2027',
    cycleLabel: '21 oct. 2027 – 20 nov. 2027',
    cycleDebut: '2027-10-21',
    cycleFin: '2027-11-20',
    dateLimiteLoyer: '2027-11-28',
  },
  {
    moisId: '2027-12',
    ordre: 12,
    label: 'Décembre 2027',
    cycleLabel: '21 nov. 2027 – 20 déc. 2027',
    cycleDebut: '2027-11-21',
    cycleFin: '2027-12-20',
    dateLimiteLoyer: '2027-12-28',
  },
];

export const FIXES_ORDER: FixeKey[] = [
  'epargne_personnelle',
  'epargne_bloquee_mehiel',
  'soutien_famille',
  'don_papa',
  'femme_enfant',
  'eau_boire',
];

export const DEPENSES_ORDER: DepenseCategoryKey[] = ['maison', 'internet', 'eau_laver'];

export const CAISSES_STANDARD_ORDER: ('sante' | 'vetements' | 'secours')[] = [
  'sante',
  'vetements',
  'secours',
];

export const CAISSES_FOUR_ORDER: TransferTargetCaisseKey[] = [
  'sante',
  'vetements',
  'secours',
  'epargne',
];

export const HISTORY_TYPE_LABELS: Record<HistoryOperationType, string> = {
  MODIFICATION_SALAIRE: 'Modification salaire',
  ALIMENTATION_SALAIRE: 'Alimentation salaire',
  BONUS_SALAIRE: 'Bonus salaire',
  TRANSFERT_AUTO_SURPLUS: 'Transfert auto surplus',
  PAIEMENT_LOYER: 'Paiement loyer',
  VALIDATION_FIXE: 'Validation fixe',
  AJOUT_DEPENSE: 'Ajout dépense',
  CLOTURE_DEPENSE: 'Clôture dépense',
  ALIMENTATION_CAISSE: 'Alimentation caisse',
  RETRAIT_CAISSE: 'Retrait caisse',
  TRANSFERT_CAISSE_SURPLUS: 'Transfert vers surplus',
  TRANSFERT_SURPLUS_CAISSE: 'Transfert depuis surplus',
  RETRAIT_SURPLUS: 'Retrait surplus',
  CLOTURE_MOIS: 'Clôture du mois',
};
