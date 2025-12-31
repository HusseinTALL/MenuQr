/**
 * PDF Service using pdf-lib
 * Lightweight PDF generation for invoices and reports
 * Replaces heavy puppeteer dependency (~200MB → ~10KB)
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ============================================
// Types
// ============================================

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  dueDate?: Date;

  // Seller info
  sellerName: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerSiret?: string;
  sellerVat?: string;

  // Buyer info
  buyerName: string;
  buyerAddress?: string;
  buyerEmail?: string;

  // Items
  items: InvoiceItem[];

  // Totals
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  deliveryFee?: number;
  discount?: number;
  total: number;

  // Payment
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'pending' | 'overdue';

  // Notes
  notes?: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  data: Array<Record<string, string | number>>;
  columns: Array<{ key: string; label: string; width?: number }>;
  summary?: Record<string, string | number>;
}

// ============================================
// Helper Functions
// ============================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// ============================================
// PDF Generation Functions
// ============================================

/**
 * Generate an invoice PDF
 */
export const generateInvoicePDF = async (data: InvoiceData): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPos = height - 50;

  // Header - Company name
  page.drawText(data.sellerName, {
    x: 50,
    y: yPos,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Invoice title
  page.drawText('FACTURE', {
    x: width - 150,
    y: yPos,
    size: 16,
    font: fontBold,
    color: rgb(0.2, 0.4, 0.8),
  });

  yPos -= 25;

  // Invoice number and date
  page.drawText(`N° ${data.invoiceNumber}`, {
    x: width - 150,
    y: yPos,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  yPos -= 15;
  page.drawText(`Date: ${formatDate(data.date)}`, {
    x: width - 150,
    y: yPos,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Seller details
  yPos = height - 75;
  if (data.sellerAddress) {
    page.drawText(data.sellerAddress, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    yPos -= 12;
  }
  if (data.sellerPhone) {
    page.drawText(`Tél: ${data.sellerPhone}`, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    yPos -= 12;
  }
  if (data.sellerEmail) {
    page.drawText(data.sellerEmail, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    yPos -= 12;
  }
  if (data.sellerSiret) {
    page.drawText(`SIRET: ${data.sellerSiret}`, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    yPos -= 12;
  }

  // Buyer section
  yPos = height - 180;
  page.drawText('Facturé à:', { x: 50, y: yPos, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  yPos -= 15;
  page.drawText(data.buyerName, { x: 50, y: yPos, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  if (data.buyerAddress) {
    yPos -= 12;
    page.drawText(data.buyerAddress, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  }
  if (data.buyerEmail) {
    yPos -= 12;
    page.drawText(data.buyerEmail, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  }

  // Items table header
  yPos = height - 280;
  const tableX = 50;
  const colWidths = [250, 60, 80, 90];

  // Header background
  page.drawRectangle({
    x: tableX - 5,
    y: yPos - 5,
    width: width - 90,
    height: 25,
    color: rgb(0.95, 0.95, 0.95),
  });

  page.drawText('Description', { x: tableX, y: yPos, size: 10, font: fontBold });
  page.drawText('Qté', { x: tableX + colWidths[0], y: yPos, size: 10, font: fontBold });
  page.drawText('Prix unit.', { x: tableX + colWidths[0] + colWidths[1], y: yPos, size: 10, font: fontBold });
  page.drawText('Total', { x: tableX + colWidths[0] + colWidths[1] + colWidths[2], y: yPos, size: 10, font: fontBold });

  // Items
  yPos -= 30;
  for (const item of data.items) {
    page.drawText(truncateText(item.name, 40), { x: tableX, y: yPos, size: 9, font });
    page.drawText(String(item.quantity), { x: tableX + colWidths[0], y: yPos, size: 9, font });
    page.drawText(formatCurrency(item.unitPrice), { x: tableX + colWidths[0] + colWidths[1], y: yPos, size: 9, font });
    page.drawText(formatCurrency(item.total), { x: tableX + colWidths[0] + colWidths[1] + colWidths[2], y: yPos, size: 9, font });
    yPos -= 18;
  }

  // Line
  yPos -= 10;
  page.drawLine({
    start: { x: tableX, y: yPos },
    end: { x: width - 50, y: yPos },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Totals
  yPos -= 25;
  const totalsX = width - 200;

  page.drawText('Sous-total:', { x: totalsX, y: yPos, size: 10, font });
  page.drawText(formatCurrency(data.subtotal), { x: totalsX + 100, y: yPos, size: 10, font });

  if (data.deliveryFee && data.deliveryFee > 0) {
    yPos -= 18;
    page.drawText('Livraison:', { x: totalsX, y: yPos, size: 10, font });
    page.drawText(formatCurrency(data.deliveryFee), { x: totalsX + 100, y: yPos, size: 10, font });
  }

  if (data.discount && data.discount > 0) {
    yPos -= 18;
    page.drawText('Remise:', { x: totalsX, y: yPos, size: 10, font });
    page.drawText(`-${formatCurrency(data.discount)}`, { x: totalsX + 100, y: yPos, size: 10, font, color: rgb(0.2, 0.6, 0.2) });
  }

  if (data.taxAmount && data.taxAmount > 0) {
    yPos -= 18;
    page.drawText(`TVA (${data.taxRate || 0}%):`, { x: totalsX, y: yPos, size: 10, font });
    page.drawText(formatCurrency(data.taxAmount), { x: totalsX + 100, y: yPos, size: 10, font });
  }

  yPos -= 25;
  page.drawText('TOTAL:', { x: totalsX, y: yPos, size: 12, font: fontBold });
  page.drawText(formatCurrency(data.total), { x: totalsX + 100, y: yPos, size: 12, font: fontBold, color: rgb(0.2, 0.4, 0.8) });

  // Payment status
  if (data.paymentStatus) {
    yPos -= 30;
    const statusColor = data.paymentStatus === 'paid'
      ? rgb(0.2, 0.6, 0.2)
      : data.paymentStatus === 'overdue'
        ? rgb(0.8, 0.2, 0.2)
        : rgb(0.8, 0.6, 0.2);

    const statusText = data.paymentStatus === 'paid' ? 'PAYÉ' : data.paymentStatus === 'overdue' ? 'EN RETARD' : 'EN ATTENTE';
    page.drawText(statusText, { x: totalsX + 80, y: yPos, size: 12, font: fontBold, color: statusColor });
  }

  // Notes
  if (data.notes) {
    yPos = 100;
    page.drawText('Notes:', { x: 50, y: yPos, size: 10, font: fontBold });
    yPos -= 15;
    page.drawText(data.notes, { x: 50, y: yPos, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  }

  // Footer
  page.drawText('Merci pour votre commande!', {
    x: width / 2 - 70,
    y: 40,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

/**
 * Generate a report PDF with tabular data
 */
export const generateReportPDF = async (data: ReportData): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPos = height - 50;

  // Title
  page.drawText(data.title, {
    x: 50,
    y: yPos,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  yPos -= 20;
  if (data.subtitle) {
    page.drawText(data.subtitle, {
      x: 50,
      y: yPos,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    yPos -= 15;
  }

  page.drawText(`Généré le ${formatDate(data.generatedAt)}`, {
    x: 50,
    y: yPos,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  yPos -= 40;

  // Table header
  const tableX = 50;
  const totalWidth = width - 100;
  const colCount = data.columns.length;
  const defaultColWidth = totalWidth / colCount;

  // Header background
  page.drawRectangle({
    x: tableX - 5,
    y: yPos - 5,
    width: totalWidth + 10,
    height: 22,
    color: rgb(0.93, 0.93, 0.93),
  });

  let xPos = tableX;
  for (const col of data.columns) {
    const colWidth = col.width || defaultColWidth;
    page.drawText(truncateText(col.label, Math.floor(colWidth / 6)), {
      x: xPos,
      y: yPos,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    xPos += colWidth;
  }

  yPos -= 25;

  // Table rows
  let rowCount = 0;
  for (const row of data.data) {
    // Check if we need a new page
    if (yPos < 80) {
      page = pdfDoc.addPage([595, 842]);
      yPos = height - 50;
    }

    // Alternate row background
    if (rowCount % 2 === 1) {
      page.drawRectangle({
        x: tableX - 5,
        y: yPos - 5,
        width: totalWidth + 10,
        height: 18,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    xPos = tableX;
    for (const col of data.columns) {
      const colWidth = col.width || defaultColWidth;
      const value = String(row[col.key] ?? '');
      page.drawText(truncateText(value, Math.floor(colWidth / 5)), {
        x: xPos,
        y: yPos,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      xPos += colWidth;
    }

    yPos -= 18;
    rowCount++;
  }

  // Summary section
  if (data.summary && Object.keys(data.summary).length > 0) {
    yPos -= 20;
    page.drawLine({
      start: { x: tableX, y: yPos + 10 },
      end: { x: width - 50, y: yPos + 10 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText('Résumé:', { x: tableX, y: yPos - 5, size: 11, font: fontBold });
    yPos -= 25;

    for (const [key, value] of Object.entries(data.summary)) {
      page.drawText(`${key}: ${value}`, {
        x: tableX,
        y: yPos,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPos -= 15;
    }
  }

  // Footer on all pages
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(`Page ${i + 1} / ${pages.length}`, {
      x: width / 2 - 30,
      y: 30,
      size: 8,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

/**
 * Generate a simple receipt PDF
 */
export const generateReceiptPDF = async (
  orderNumber: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  total: number,
  restaurantName: string,
  date: Date
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([226, 400]); // Receipt size (80mm width)
  const { width } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPos = 380;

  // Restaurant name
  page.drawText(restaurantName, {
    x: width / 2 - restaurantName.length * 3,
    y: yPos,
    size: 12,
    font: fontBold,
  });

  yPos -= 20;
  page.drawText(`Commande #${orderNumber}`, {
    x: 15,
    y: yPos,
    size: 9,
    font,
  });

  yPos -= 12;
  page.drawText(formatDate(date), {
    x: 15,
    y: yPos,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  yPos -= 15;
  page.drawLine({
    start: { x: 15, y: yPos },
    end: { x: width - 15, y: yPos },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  yPos -= 15;

  // Items
  for (const item of items) {
    page.drawText(`${item.quantity}x ${truncateText(item.name, 18)}`, {
      x: 15,
      y: yPos,
      size: 8,
      font,
    });
    page.drawText(formatCurrency(item.price * item.quantity), {
      x: width - 60,
      y: yPos,
      size: 8,
      font,
    });
    yPos -= 12;
  }

  yPos -= 5;
  page.drawLine({
    start: { x: 15, y: yPos },
    end: { x: width - 15, y: yPos },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  yPos -= 15;
  page.drawText('TOTAL', {
    x: 15,
    y: yPos,
    size: 10,
    font: fontBold,
  });
  page.drawText(formatCurrency(total), {
    x: width - 60,
    y: yPos,
    size: 10,
    font: fontBold,
  });

  yPos -= 25;
  page.drawText('Merci et à bientôt!', {
    x: width / 2 - 40,
    y: yPos,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

export default {
  generateInvoicePDF,
  generateReportPDF,
  generateReceiptPDF,
};
