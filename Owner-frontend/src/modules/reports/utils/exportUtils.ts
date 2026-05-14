import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function isNumericLike(value: unknown) {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  const normalized = value.replace(/,/g, "").trim();
  return normalized !== "" && !Number.isNaN(Number(normalized));
}

export function exportToExcel(data: any[], fileName: string, columns?: string[]) {
  const orderedColumns = columns && columns.length ? columns : Object.keys(data[0] || {});
  const bodyRows = data.map((row) => orderedColumns.map((key) => row?.[key] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([orderedColumns, ...bodyRows]);

  ws["!cols"] = orderedColumns.map((header, index) => {
    const maxBodyLength = bodyRows.reduce((max, row) => {
      const cell = row[index];
      const text = cell === null || cell === undefined ? "" : String(cell);
      return Math.max(max, text.length);
    }, header.length);

    return { wch: Math.min(Math.max(maxBodyLength + 2, 12), 36) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportToPDF(data: any[], columns: string[], fileName: string, title: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 40, 30);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 48);
  
  // Prepare data for autotable
  // Ensure we map the keys correctly from the columns provided
  const body = data.map(item => columns.map(col => item?.[col] ?? ''));
  const columnStyles: Record<number, { halign: "left" | "center" | "right"; cellWidth?: "auto" | "wrap" | number }> = {};

  columns.forEach((_, index) => {
    const hasNumericData = body.some((row) => isNumericLike(row[index]));
    columnStyles[index] = {
      halign: hasNumericData ? "right" : "left",
      cellWidth: "auto",
    };
  });
  
  autoTable(doc, {
    head: [columns.map(c => c.toUpperCase())],
    body: body,
    startY: 62,
    theme: 'striped',
    headStyles: { fillColor: [139, 94, 60] }, // #8B5E3C
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "middle",
      lineWidth: 0.2,
    },
    columnStyles,
    margin: { left: 40, right: 40, top: 24, bottom: 24 },
  });
  
  doc.save(`${fileName}.pdf`);
}
