import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { appendLocalReportExportLog } from '@/lib/reportExportLogs';

type ExportTablePdfArgs = {
	title: string;
	filePrefix: string;
	head: string[];
	rows: Array<Array<string | number | null | undefined>>;
	subtitle?: string;
	orientation?: 'portrait' | 'landscape';
	reportType?: string;
	filterSummary?: string;
	user?: {
		id?: string | null;
		role?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		email?: string | null;
	} | null;
};

const sanitizeCell = (value: string | number | null | undefined): string => {
	if (value === null || value === undefined) return '-';
	return String(value).trim() || '-';
};

export function exportTablePdf({
	title,
	filePrefix,
	head,
	rows,
	subtitle,
	orientation = 'landscape',
	reportType,
	filterSummary,
	user,
}: ExportTablePdfArgs) {
	const now = new Date();
	const safeDate = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const fileName = `${filePrefix}-${safeDate}.pdf`;

	const doc = new jsPDF({ orientation });
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.text(title, 14, 16);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(`Generated: ${now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`, 14, 23);

	if (subtitle) {
		doc.setFontSize(9);
		doc.text(subtitle, 14, 29);
	}

	autoTable(doc, {
		startY: subtitle ? 34 : 28,
		head: [head],
		body: rows.map((row) => row.map((cell) => sanitizeCell(cell))),
		styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
		headStyles: { fillColor: [249, 197, 19], textColor: [20, 20, 20] },
		alternateRowStyles: { fillColor: [245, 245, 248] },
		margin: { left: 10, right: 10 },
	});

	doc.save(fileName);
	if (reportType) {
		appendLocalReportExportLog({
			reportType,
			fileName,
			filterSummary,
			user,
		});
	}
	return fileName;
}
