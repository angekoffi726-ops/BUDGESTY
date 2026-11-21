import { BudgetMonth } from '../types/budget';

const FRENCH_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export function formatFCFA(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} F CFA`;
}

export function formatDateDuJour(date: Date = new Date()): string {
  const day = date.getDate();
  const monthName = FRENCH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `Date du jour : ${day} ${monthName} ${year}`;
}

export function formatIsoDateFr(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate;
  }
  const [y, m, d] = isoDate.split('-').map(Number);
  const monthName = FRENCH_MONTHS[m - 1] ?? '';
  return `${d} ${monthName} ${y}`;
}

export function getTodayIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNowTimeString(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export type RentWindowStatus = 'PAYE' | 'BLOQUE' | 'AUTORISE' | 'RETARD';

export interface RentStatusDetail {
  status: RentWindowStatus;
  badgeLabel: string;
  buttonLabel: string;
  canPay: boolean;
  helperText: string;
}

/**
 * Evaluates the rent payment window for a given budget month (2027-01 .. 2027-12).
 * Rule:
 * - Already paid => PAYE ("LOYER PAYÉ — VERROUILLÉ")
 * - From 1st to 24th (or prior to the 25th of that month) => BLOQUE ("BLOQUÉ JUSQU'AU 25")
 * - From 25th 00:00 to 28th 23:59 => AUTORISE ("PAYER LE LOYER")
 * - After 28th 23:59 if unpaid => RETARD ("LOYER EN RETARD")
 */
export function evaluateRentStatus(month: BudgetMonth, now: Date = new Date()): RentStatusDetail {
  if (month.loyer.paye) {
    return {
      status: 'PAYE',
      badgeLabel: 'LOYER PAYÉ — VERROUILLÉ',
      buttonLabel: 'LOYER PAYÉ — VERROUILLÉ',
      canPay: false,
      helperText: month.loyer.payeLe
        ? `Payé le ${month.loyer.payeLe}. Validation irréversible.`
        : 'Paiement validé de manière irréversible.',
    };
  }

  const [yearStr, monthStr] = month.moisId.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;

  const windowStart = new Date(year, monthIdx, 25, 0, 0, 0, 0);
  const windowEnd = new Date(year, monthIdx, 28, 23, 59, 59, 999);

  if (now.getTime() < windowStart.getTime()) {
    return {
      status: 'BLOQUE',
      badgeLabel: "BLOQUÉ JUSQU'AU 25",
      buttonLabel: "BLOQUÉ JUSQU'AU 25",
      canPay: false,
      helperText: `Le paiement du loyer s'ouvre du 25 à 00h00 au 28 à 23h59 (${formatIsoDateFr(month.loyer.dateLimite)} au plus tard).`,
    };
  }

  if (now.getTime() <= windowEnd.getTime()) {
    return {
      status: 'AUTORISE',
      badgeLabel: 'FENÊTRE OUVERTE (25–28)',
      buttonLabel: 'PAYER LE LOYER',
      canPay: true,
      helperText: `Fenêtre de paiement active jusqu'au ${formatIsoDateFr(month.loyer.dateLimite)} à 23h59.`,
    };
  }

  return {
    status: 'RETARD',
    badgeLabel: 'LOYER EN RETARD',
    buttonLabel: 'PAYER LE LOYER',
    canPay: true,
    helperText: `Échéance du ${formatIsoDateFr(month.loyer.dateLimite)} dépassée. Régularisation requise.`,
  };
}

export function sanitizeStr(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}
