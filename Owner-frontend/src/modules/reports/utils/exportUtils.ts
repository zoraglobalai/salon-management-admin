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

export function exportToPDF(data: any[], columns: string[], fileName: string, title: string, meta?: string[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 30, 30);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 30, 45);

  let startY = 60;
  if (meta && meta.length) {
    doc.setFontSize(8);
    doc.setTextColor(80);
    meta.forEach((line, index) => {
      const sanitizedLine = typeof line === 'string' ? line.replace(/\u20B9/g, 'Rs.') : line;
      doc.text(sanitizedLine, 30, startY + (index * 12));
    });
    startY += (meta.length * 12) + 10;
  }
  
  // Prepare data for autotable
  const body = data.map(item => columns.map(col => {
    const val = item?.[col] ?? '';
    return typeof val === 'string' ? val.replace(/\u20B9/g, 'Rs.') : val;
  }));
  const columnCount = columns.length;
  let fontSize = 8;
  if (columnCount > 10) fontSize = 7;
  if (columnCount > 15) fontSize = 6.5;
  if (columnCount > 20) fontSize = 5.5;

  autoTable(doc, {
    head: [columns],
    body: body,
    startY: startY,
    theme: 'grid',
    headStyles: { 
      fillColor: [139, 94, 60], 
      fontSize: fontSize + 0.5,
      halign: 'center',
      cellPadding: 3,
      textColor: [255, 255, 255]
    },
    styles: {
      fontSize: fontSize,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
      lineWidth: 0.1,
    },
    margin: { left: 20, right: 20, bottom: 20 },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const val = data.cell.raw;
        if (isNumericLike(val)) {
          data.cell.styles.halign = 'right';
        }
      }
    }
  });
  
  doc.save(`${fileName}.pdf`);
}
