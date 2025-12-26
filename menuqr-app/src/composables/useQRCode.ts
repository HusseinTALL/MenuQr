import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Table } from '@/types/reservation';

interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

const defaultOptions: QRCodeOptions = {
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
};

export function useQRCode() {
  /**
   * Generate a QR code as a data URL (base64 PNG)
   */
  const generateQRCode = async (
    url: string,
    options: QRCodeOptions = {}
  ): Promise<string> => {
    const mergedOptions = { ...defaultOptions, ...options };

    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: mergedOptions.width,
        margin: mergedOptions.margin,
        color: mergedOptions.color,
        type: 'image/png',
        errorCorrectionLevel: 'M',
      });
      return dataUrl;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('Impossible de générer le QR code');
    }
  };

  /**
   * Generate a QR code to a canvas element
   */
  const generateQRCodeToCanvas = async (
    canvas: HTMLCanvasElement,
    url: string,
    options: QRCodeOptions = {}
  ): Promise<void> => {
    const mergedOptions = { ...defaultOptions, ...options };

    try {
      await QRCode.toCanvas(canvas, url, {
        width: mergedOptions.width,
        margin: mergedOptions.margin,
        color: mergedOptions.color,
        errorCorrectionLevel: 'M',
      });
    } catch (error) {
      console.error('Failed to generate QR code to canvas:', error);
      throw new Error('Impossible de générer le QR code');
    }
  };

  /**
   * Download a QR code as PNG
   */
  const downloadQRCode = async (
    url: string,
    filename: string,
    options: QRCodeOptions = {}
  ): Promise<void> => {
    try {
      const dataUrl = await generateQRCode(url, { ...options, width: 500 });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Download using file-saver
      saveAs(blob, `${filename}.png`);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      throw new Error('Impossible de télécharger le QR code');
    }
  };

  /**
   * Generate the menu URL for a restaurant
   */
  const getMenuUrl = (slug: string): string => {
    const origin = window.location.origin;
    return `${origin}/r/${slug}`;
  };

  /**
   * Generate the table-specific menu URL
   */
  const getTableUrl = (slug: string, tableName: string): string => {
    const origin = window.location.origin;
    // URL encode the table name to handle spaces and special characters
    const encodedTableName = encodeURIComponent(tableName);
    return `${origin}/r/${slug}/table/${encodedTableName}`;
  };

  /**
   * Download all table QR codes as a ZIP file
   */
  const downloadAllQRCodes = async (
    tables: Table[],
    restaurantSlug: string,
    restaurantName?: string
  ): Promise<void> => {
    try {
      const zip = new JSZip();
      const folder = zip.folder(restaurantName || restaurantSlug);

      if (!folder) {
        throw new Error('Failed to create ZIP folder');
      }

      // Add general restaurant QR code
      const generalUrl = getMenuUrl(restaurantSlug);
      const generalQR = await generateQRCode(generalUrl, { width: 500 });
      const generalBlob = await (await fetch(generalQR)).blob();
      folder.file(`${restaurantSlug}-menu-general.png`, generalBlob);

      // Add QR code for each table
      for (const table of tables) {
        if (!table.isActive) continue; // Skip inactive tables

        const tableUrl = getTableUrl(restaurantSlug, table.name);
        const qrDataUrl = await generateQRCode(tableUrl, { width: 500 });
        const blob = await (await fetch(qrDataUrl)).blob();

        // Sanitize table name for filename
        const safeTableName = table.name.replace(/[^a-zA-Z0-9-_]/g, '-');
        folder.file(`${restaurantSlug}-${safeTableName}.png`, blob);
      }

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${restaurantSlug}-qr-codes.zip`);
    } catch (error) {
      console.error('Failed to download all QR codes:', error);
      throw new Error('Impossible de télécharger les QR codes');
    }
  };

  /**
   * Copy URL to clipboard
   */
  const copyToClipboard = async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  return {
    generateQRCode,
    generateQRCodeToCanvas,
    downloadQRCode,
    downloadAllQRCodes,
    getMenuUrl,
    getTableUrl,
    copyToClipboard,
  };
}
