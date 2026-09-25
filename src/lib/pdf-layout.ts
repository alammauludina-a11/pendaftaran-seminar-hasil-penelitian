// Shared layout for every PDF the admin dashboard exports, so all downloads look the same:
// a centered title block, a navy grid table and a footer with print date + page number.
import type { jsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";

export const PDF_MARGIN = 12;
const NAVY: [number, number, number] = [6, 18, 92];

/** Draws the title block and returns the Y position where the table should start. */
export function drawPdfHeader(doc: jsPDF, title: string, subtitles: string[] = []): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), pageWidth / 2, y, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  for (const line of subtitles.filter(Boolean)) {
    y += 5.5;
    doc.text(line, pageWidth / 2, y, { align: "center" });
  }

  y += 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.line(PDF_MARGIN, y, pageWidth - PDF_MARGIN, y);
  return y + 4;
}

/** autoTable options shared by all exports; pass table-specific options (head, body, columnStyles...) on top. */
export function pdfTableOptions(doc: jsPDF, startY: number, options: UserOptions): UserOptions {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const printed = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return {
    startY,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: 16 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, valign: "top", overflow: "linebreak", lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [30, 41, 59] },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center", valign: "middle" },
    footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Dicetak: ${printed}`, PDF_MARGIN, pageHeight - 8);
      doc.text(`Halaman ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - PDF_MARGIN, pageHeight - 8, { align: "right" });
    },
    ...options,
  };
}

/** "AKN 60" from an angkatan value that may or may not already contain "AKN". */
export function formatAngkatan(angkatan?: string | null): string {
  const a = (angkatan || "").trim();
  if (!a) return "";
  return a.toUpperCase().includes("AKN") ? a : `AKN ${a}`;
}
