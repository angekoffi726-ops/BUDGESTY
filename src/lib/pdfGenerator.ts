import { jsPDF } from 'jspdf';
import {
  BudgetMonth,
  CAISSES_FOUR_ORDER,
  DEPENSES_ORDER,
  ExpenseEntry,
  FIXES_ORDER,
  HISTORY_TYPE_LABELS,
  HistoryEntry,
} from '../types/budget';
import { evaluateRentStatus, formatDateDuJour, formatFCFA } from './format';

export function generateMonthlyPdf(
  month: BudgetMonth,
  expenses: ExpenseEntry[],
  history: HistoryEntry[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  // Header band
  doc.setFillColor(7, 91, 46); // #075B2E
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BUDGESTY — Bilan Mensuel', margin, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${month.label} (${month.cycleLabel})  |  Statut : ${month.statut}`, margin, 21);
  doc.text(formatDateDuJour(), pageWidth - margin, 21, { align: 'right' });

  y = 36;
  doc.setTextColor(17, 17, 17);

  const sectionHeader = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(221, 235, 216); // #DDEBD8
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(7, 91, 46);
    doc.text(title, margin + 3, y + 5.5);
    doc.setTextColor(17, 17, 17);
    y += 11;
  };

  const rowLine = (label: string, value: string, bold = false) => {
    ensureSpace(7);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.text(label, margin + 2, y);
    doc.text(value, pageWidth - margin - 2, y, { align: 'right' });
    y += 6;
  };

  // 1. Salaire
  sectionHeader('1. Réception du salaire');
  const totalRecu = month.salaire.montantARecevoir + month.salaire.bonus;
  rowLine('Salaire de référence', formatFCFA(month.salaire.salaireReference));
  rowLine('Montant prévu / reçu (avec bonus)', formatFCFA(totalRecu));
  rowLine('Statut alimentation', month.salaire.alimentee ? `Alimenté (${month.salaire.alimenteeLe})` : 'À ALIMENTER');
  rowLine('Montant actif sur le mois', formatFCFA(month.salaire.montantActif), true);
  rowLine('Excédent transféré vers Caisse Surplus', formatFCFA(month.salaire.excedentTransfere));
  rowLine('Argent encore disponible', formatFCFA(month.salaire.argentEncoreDisponible), true);
  y += 3;

  // 2. Coffre Loyer
  sectionHeader('2. Coffre Loyer (suivi indépendant hors budget 155 000 F)');
  const rentStatus = evaluateRentStatus(month);
  rowLine('Montant du loyer mensuel', formatFCFA(month.loyer.montant));
  rowLine('Date limite', month.loyer.dateLimite);
  rowLine('Statut loyer', rentStatus.badgeLabel, true);
  y += 3;

  // 3. Fixes irréversibles
  sectionHeader('3. Charges fixes irréversibles (102 000 F CFA)');
  let totalFixesValides = 0;
  for (const key of FIXES_ORDER) {
    const item = month.fixes[key];
    if (item.valide) totalFixesValides += item.montant;
    rowLine(
      `${item.label} — ${item.valide ? `Validé (${item.valideLe})` : 'En attente'}`,
      formatFCFA(item.montant)
    );
  }
  rowLine('Total fixes validés', formatFCFA(totalFixesValides), true);
  y += 3;

  // 4. Dépenses petit à petit
  sectionHeader('4. Dépenses petit à petit (36 000 F CFA)');
  for (const key of DEPENSES_ORDER) {
    const cat = month.depensesCategories[key];
    const reste = Math.max(0, cat.budgetAlloue - cat.depenseCumulee);
    rowLine(
      `${cat.label} [${cat.cloturee ? 'Clôturée' : 'Ouverte'}]`,
      `Dépensé: ${formatFCFA(cat.depenseCumulee)} / ${formatFCFA(cat.budgetAlloue)} (Reste: ${formatFCFA(reste)})`
    );
  }
  if (expenses.length > 0) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Détail des dépenses enregistrées :', margin + 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const exp of expenses) {
      ensureSpace(6);
      const line = `${exp.date} · ${exp.description}${exp.note ? ` (${exp.note})` : ''}`;
      doc.text(line.slice(0, 75), margin + 4, y);
      doc.text(formatFCFA(exp.montant), pageWidth - margin - 2, y, { align: 'right' });
      y += 5;
    }
  }
  y += 3;

  // 5. Caisses et Surplus
  sectionHeader('5. Soldes des Caisses et Caisse Surplus');
  for (const key of CAISSES_FOUR_ORDER) {
    const c = month.caisses[key];
    rowLine(
      `${c.label} (Report: ${formatFCFA(c.soldePrecedent)} | Dotation: ${c.dotationMensuelle > 0 ? (c.dotationAlimentee ? 'Alimentée' : 'À alimenter') : 'Hors dotation'})`,
      formatFCFA(c.soldeActuel),
      true
    );
  }
  rowLine(
    `Caisse Surplus (Report: ${formatFCFA(month.caisses.surplus.soldePrecedent)})`,
    formatFCFA(month.caisses.surplus.soldeActuel),
    true
  );
  y += 3;

  // 6. Historique du mois
  const monthHistory = history.filter((h) => h.moisId === month.moisId);
  sectionHeader(`6. Historique des opérations (${monthHistory.length})`);
  if (monthHistory.length === 0) {
    rowLine('Aucune opération enregistrée pour ce mois.', '');
  } else {
    doc.setFontSize(8.2);
    for (const item of monthHistory) {
      ensureSpace(9);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `${item.dateOperation} ${item.heureOperation} · ${HISTORY_TYPE_LABELS[item.type]} · ${item.categorie}`,
        margin + 2,
        y
      );
      doc.text(formatFCFA(item.montant), pageWidth - margin - 2, y, { align: 'right' });
      y += 4;
      doc.setFont('helvetica', 'normal');
      const detail = `${item.motif.slice(0, 68)} (Solde: ${formatFCFA(item.soldeAvant)} -> ${formatFCFA(item.soldeApres)})`;
      doc.text(detail, margin + 4, y);
      y += 5.5;
    }
  }

  doc.save(`BUDGESTY_Bilan_${month.moisId}.pdf`);
}
