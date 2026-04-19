import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a professional monthly performance PDF report.
 * @param {Object} options
 * @param {Object} options.goal - goal object
 * @param {Array}  options.logs - daily log array (chronological)
 * @param {Object} options.analysis - analysis data
 * @param {number} options.streak - current streak
 */
export function generatePDF({ goal, logs, analysis, streak }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const PAGE_W = 210;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const INDIGO = [79, 70, 229];
  const SLATE  = [100, 116, 139];
  const DARK   = [15, 23, 42];
  const LIGHT_BG = [248, 250, 252];
  const WHITE  = [255, 255, 255];

  // ── COVER PAGE ──────────────────────────────────────────────
  // Header banner
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PAGE_W, 65, 'F');

  // Brand logo area
  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(MARGIN, 15, 12, 12, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GP', MARGIN + 2.5, 23.5);

  doc.setFontSize(22);
  doc.text('GrowthPath', MARGIN + 16, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 255);
  doc.text(`Performance Report  •  ${monthLabel}`, MARGIN, 40);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const goalTitle = goal?.title || 'Untitled Goal';
  doc.text(doc.splitTextToSize(goalTitle, CONTENT_W), MARGIN, 52);

  // ── Summary Stats Row ─────────────────────────────────────
  let y = 80;
  const statBoxW = (CONTENT_W - 10) / 4;
  const stats = [
    { label: 'Completion', value: `${analysis?.completion_rate || 0}%` },
    { label: 'Avg Focus', value: `${(analysis?.average_focus || 0).toFixed(1)} / 5` },
    { label: 'Days Logged', value: String(analysis?.total_days_logged || 0) },
    { label: 'Current Streak', value: `${streak} days` },
  ];

  stats.forEach((s, i) => {
    const x = MARGIN + i * (statBoxW + 10/3);
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, statBoxW, 24, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(s.value, x + statBoxW / 2, y + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(s.label.toUpperCase(), x + statBoxW / 2, y + 20, { align: 'center' });
  });

  y += 36;

  // ── Goal Details ─────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text('Goal Details', MARGIN, y);
  y += 6;

  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 7;

  const details = [
    ['Category',   goal?.category || '—'],
    ['Difficulty', goal?.difficulty || '—'],
    ['Commitment', goal?.commitment || '—'],
    ['Deadline',   `${goal?.deadline || '—'} days`],
  ];

  details.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);
    doc.text(k.toUpperCase(), MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(v, MARGIN + 35, y);
    y += 7;
  });

  if (goal?.motivation) {
    y += 2;
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, 'F');
    doc.setDrawColor(...INDIGO);
    doc.setLineWidth(1);
    doc.line(MARGIN, y, MARGIN, y + 18);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    const wrapped = doc.splitTextToSize(`"${goal.motivation}"`, CONTENT_W - 10);
    doc.text(wrapped, MARGIN + 5, y + 7);
    y += 26;
  }

  // ── Daily Log Table ────────────────────────────────────
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text('Daily Log', MARGIN, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Date', 'Done', 'Mood', 'Focus', 'Notes']],
    body: logs.map(log => [
      log.log_date || '—',
      log.task_done ? '✓' : '✗',
      log.mood || '—',
      log.focus_level != null ? `${log.focus_level}/5` : '—',
      (log.notes || '').slice(0, 40),
    ]),
    headStyles: {
      fillColor: INDIGO,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 28 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      // Footer
      const pageH = doc.internal.pageSize.height;
      doc.setFontSize(7.5);
      doc.setTextColor(...SLATE);
      doc.text('Generated by GrowthPath', MARGIN, pageH - 10);
      doc.text(
        `Page ${data.pageNumber}`,
        PAGE_W - MARGIN,
        pageH - 10,
        { align: 'right' }
      );
    },
  });

  const filename = `GrowthPath_Report_${monthLabel.replace(' ', '_')}.pdf`;
  doc.save(filename);
}
