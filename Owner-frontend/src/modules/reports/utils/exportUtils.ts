import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data: any[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportToPDF(data: any[], columns: string[], fileName: string, title: string) {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Prepare data for autotable
  // Ensure we map the keys correctly from the columns provided
  const body = data.map(item => columns.map(col => item[col] || ''));
  
  autoTable(doc, {
    head: [columns.map(c => c.toUpperCase())],
    body: body,
    startY: 40,
    theme: 'striped',
    headStyles: { fillColor: [139, 94, 60] }, // #8B5E3C
  });
  
  doc.save(`${fileName}.pdf`);
}
