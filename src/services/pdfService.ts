import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Requirement, Tender, UploadedFile, PackageGenerationOptions } from '../types';
import { hasPdfMagicBytes } from '../utils/fileUtils';
import { getTodayDateString } from '../utils/dateUtils';

export interface InspectedPdfResult {
  valid: boolean;
  pageCount: number;
  pdfBytes?: ArrayBuffer;
  error?: string;
  isPasswordProtected?: boolean;
}

/**
 * Validates and reads page count of an uploaded PDF file in the browser.
 */
export async function inspectPdfFile(file: File): Promise<InspectedPdfResult> {
  try {
    const buffer = await file.arrayBuffer();

    // Verify magic bytes
    if (!hasPdfMagicBytes(buffer)) {
      return {
        valid: false,
        pageCount: 0,
        error: 'File does not contain a valid PDF signature (%PDF-).'
      };
    }

    // Try loading with pdf-lib to check structure and page count
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      const pageCount = doc.getPageCount();
      return {
        valid: true,
        pageCount,
        pdfBytes: buffer
      };
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
        return {
          valid: false,
          pageCount: 0,
          error: 'PDF is encrypted or password-protected.',
          isPasswordProtected: true
        };
      }
      return {
        valid: false,
        pageCount: 0,
        error: `Could not parse PDF content: ${msg}`
      };
    }
  } catch (err: any) {
    return {
      valid: false,
      pageCount: 0,
      error: `Failed to read file: ${err?.message || 'Unknown read error'}`
    };
  }
}

/**
 * Creates an English Cover Page
 */
function createCoverPage(
  doc: PDFDocument,
  tender: Tender,
  includedDocs: Array<{ requirement: Requirement; file: UploadedFile; pageCount: number }>,
  fontBold: any,
  fontRegular: any
) {
  const page = doc.addPage([595.28, 841.89]); // Standard A4 in points
  const { width, height } = page.getSize();

  // Top header accent bar
  page.drawRectangle({
    x: 40,
    y: height - 50,
    width: width - 80,
    height: 4,
    color: rgb(0.08, 0.28, 0.58) // Official Deep Navy
  });

  // Main Header
  page.drawText('TENDER SUBMISSION PACKAGE', {
    x: 40,
    y: height - 78,
    size: 18,
    font: fontBold,
    color: rgb(0.08, 0.28, 0.58)
  });

  page.drawText('OFFICIAL DOCUMENTATION COMPILATION', {
    x: 40,
    y: height - 94,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5)
  });

  // Compact Metadata Box (2-column grid, ~88 pt high)
  const metaBoxY = height - 195;
  const metaBoxHeight = 90;
  page.drawRectangle({
    x: 40,
    y: metaBoxY,
    width: width - 80,
    height: metaBoxHeight,
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1.0)
  });

  const packageDate = getTodayDateString();

  // Left Column
  const drawLeftMeta = (label: string, value: string, yPos: number) => {
    page.drawText(label.toUpperCase(), {
      x: 52,
      y: yPos,
      size: 7.5,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.45)
    });
    const displayVal = value.length > 38 ? value.substring(0, 36) + '...' : value;
    page.drawText(displayVal, {
      x: 135,
      y: yPos,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.12, 0.15)
    });
  };

  // Right Column
  const drawRightMeta = (label: string, value: string, yPos: number) => {
    page.drawText(label.toUpperCase(), {
      x: 320,
      y: yPos,
      size: 7.5,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.45)
    });
    const displayVal = value.length > 34 ? value.substring(0, 32) + '...' : value;
    page.drawText(displayVal, {
      x: 415,
      y: yPos,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.12, 0.15)
    });
  };

  drawLeftMeta('Tender ID:', tender.tender_id, metaBoxY + 68);
  drawLeftMeta('Tender Title:', tender.title, metaBoxY + 44);
  drawLeftMeta('Procuring Entity:', tender.procuring_entity, metaBoxY + 20);

  drawRightMeta('Bidder Name:', tender.bidder, metaBoxY + 68);
  drawRightMeta('Deadline:', tender.submission_deadline, metaBoxY + 44);
  drawRightMeta('Package Date:', packageDate, metaBoxY + 20);

  // Section: Included Documents Table
  const tableY = metaBoxY - 26;
  page.drawText('INCLUDED DOCUMENTS', {
    x: 40,
    y: tableY,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.28, 0.58)
  });

  // Table header bar
  page.drawRectangle({
    x: 40,
    y: tableY - 20,
    width: width - 80,
    height: 16,
    color: rgb(0.92, 0.94, 0.97)
  });

  page.drawText('#', { x: 48, y: tableY - 16, size: 7.5, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
  page.drawText('DOCUMENT TITLE', { x: 75, y: tableY - 16, size: 7.5, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
  page.drawText('EXPIRY DATE', { x: 415, y: tableY - 16, size: 7.5, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
  page.drawText('PAGES', { x: 505, y: tableY - 16, size: 7.5, font: fontBold, color: rgb(0.2, 0.25, 0.3) });

  // Calculate row height dynamically to guarantee all included documents fit
  const availableTableHeight = tableY - 60; // down to bottom margin
  const docCount = includedDocs.length;
  const rowHeight = docCount > 20 ? 13 : docCount > 14 ? 15 : 18;
  const fontSize = docCount > 20 ? 7.5 : 8;

  let rowY = tableY - 34;
  includedDocs.forEach((item, index) => {
    if (rowY < 40) return; // safety boundary

    // alternating row tint
    if (index % 2 === 1) {
      page.drawRectangle({
        x: 40,
        y: rowY - 4,
        width: width - 80,
        height: rowHeight - 2,
        color: rgb(0.98, 0.99, 1.0)
      });
    }

    page.drawText(String(index + 1), {
      x: 48,
      y: rowY,
      size: fontSize,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });

    // Prominent Document Title (English)
    const docTitle = item.requirement.title_en.length > 58
      ? item.requirement.title_en.substring(0, 55) + '...'
      : item.requirement.title_en;
    page.drawText(docTitle, {
      x: 75,
      y: rowY,
      size: fontSize,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.2)
    });

    const expiry = item.file.expiryDate || (item.requirement.has_expiry ? 'N/A' : '-');
    page.drawText(expiry, {
      x: 415,
      y: rowY,
      size: fontSize,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.4)
    });

    page.drawText(`${item.pageCount} pg`, {
      x: 505,
      y: rowY,
      size: fontSize,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.4)
    });

    rowY -= rowHeight;
  });
}

/**
 * Creates an English Index / Table of Contents Page (Page 2)
 */
function createIndexPage(
  doc: PDFDocument,
  tender: Tender,
  entries: Array<{ title: string; filename: string; startPage: number; pages: number }>,
  fontBold: any,
  fontRegular: any
) {
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  page.drawText('TABLE OF CONTENTS', {
    x: 40,
    y: height - 80,
    size: 16,
    font: fontBold,
    color: rgb(0.08, 0.28, 0.58)
  });

  page.drawText(`Tender ID: ${tender.tender_id} | Index of Included Documents`, {
    x: 40,
    y: height - 100,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5)
  });

  page.drawLine({
    start: { x: 40, y: height - 110 },
    end: { x: width - 40, y: height - 110 },
    thickness: 1,
    color: rgb(0.8, 0.85, 0.9)
  });

  let curY = height - 145;

  // Cover page row
  page.drawText('1. Official Cover Page & Tender Metadata', {
    x: 45,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.25)
  });
  page.drawText('Page 1', {
    x: width - 85,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4)
  });
  curY -= 26;

  // Index row
  page.drawText('2. Table of Contents / Document Index', {
    x: 45,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.25)
  });
  page.drawText('Page 2', {
    x: width - 85,
    y: curY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.4)
  });
  curY -= 28;

  // Document rows
  entries.forEach((entry, idx) => {
    if (curY < 65) return;

    const rowNum = idx + 3;
    const itemTitle = `${rowNum}. ${entry.title}`;
    const cleanTitle = itemTitle.length > 55 ? itemTitle.substring(0, 52) + '...' : itemTitle;

    page.drawText(cleanTitle, {
      x: 45,
      y: curY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.15, 0.2)
    });

    // Dot leader
    const pageText = `Page ${entry.startPage}`;
    page.drawText(pageText, {
      x: width - 85,
      y: curY,
      size: 9,
      font: fontBold,
      color: rgb(0.08, 0.28, 0.58)
    });

    curY -= 22;
  });
}

/**
 * Merges all documents into a complete, stamped final PDF package.
 */
export async function generateFinalTenderPackage(
  tender: Tender,
  requirements: Requirement[],
  files: UploadedFile[],
  options: PackageGenerationOptions = { includeIndexPage: true },
  onProgress?: (progressPercent: number, statusMessage: string) => void
): Promise<{ pdfBytes: Uint8Array; totalPages: number; blobUrl: string; filename: string }> {
  onProgress?.(10, 'Initializing PDF document...');

  const finalDoc = await PDFDocument.create();
  const fontRegular = await finalDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await finalDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Sort requirements according to numeric order ascending
  const sortedRequirements = [...requirements].sort((a, b) => a.order - b.order);

  // 2. Identify all included documents in order (skipping optional ones with no file)
  const includedItems: Array<{ requirement: Requirement; file: UploadedFile; pageCount: number }> = [];

  for (const req of sortedRequirements) {
    const matched = files.find(f => f.matchedRequirementId === req.id);
    if (matched && matched.parseStatus === 'valid' && matched.pdfBytes) {
      includedItems.push({
        requirement: req,
        file: matched,
        pageCount: matched.pageCount
      });
    }
  }

  onProgress?.(25, 'Creating cover page...');
  // Add Cover Page (Page 1)
  createCoverPage(finalDoc, tender, includedItems, fontBold, fontRegular);

  // Calculate starting page numbers for documents
  let runningPageNumber = 1; // cover is 1
  if (options.includeIndexPage) {
    runningPageNumber = 2; // index is 2
  }

  const indexEntries: Array<{ title: string; filename: string; startPage: number; pages: number }> = [];

  for (const item of includedItems) {
    const startPage = runningPageNumber + 1;
    indexEntries.push({
      title: item.requirement.title_en,
      filename: item.file.filename,
      startPage,
      pages: item.pageCount
    });
    runningPageNumber += item.pageCount;
  }

  // Add Index Page if requested (Page 2)
  if (options.includeIndexPage) {
    onProgress?.(35, 'Creating index page...');
    createIndexPage(finalDoc, tender, indexEntries, fontBold, fontRegular);
  }

  // 3. Import and append all included document pages in their exact order
  for (let i = 0; i < includedItems.length; i++) {
    const item = includedItems[i];
    const progress = 40 + Math.round(((i + 1) / includedItems.length) * 40);
    onProgress?.(progress, `Appending ${item.requirement.title_en} (${item.file.filename})...`);

    const sourceDoc = await PDFDocument.load(item.file.pdfBytes!, { ignoreEncryption: true });
    const pageIndices = sourceDoc.getPageIndices();
    const copiedPages = await finalDoc.copyPages(sourceDoc, pageIndices);

    for (const copiedPage of copiedPages) {
      finalDoc.addPage(copiedPage);
    }
  }

  // 4. Calculate final total page count Y
  const totalPages = finalDoc.getPageCount();
  onProgress?.(85, `Stamping page footer on all ${totalPages} pages...`);

  // Embed optional signature image if provided
  let embeddedStamp: any = null;
  if (options.signatureImageBytes) {
    try {
      embeddedStamp = await finalDoc.embedPng(options.signatureImageBytes);
    } catch {
      // If PNG embedding failed, try jpg or continue without failing
    }
  }

  // 5. Add footer to EVERY page: <tender_id> | Page X of Y
  const pages = finalDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = i + 1;
    const { width, height } = page.getSize();

    const footerText = `${tender.tender_id} | Page ${pageNum} of ${totalPages}`;
    const fontSize = 8.5;
    const textWidth = fontRegular.widthOfTextAtSize(footerText, fontSize);

    // Center footer text in safe bottom margin so it does not cover document content
    const centerX = Math.max(20, (width - textWidth) / 2);
    page.drawText(footerText, {
      x: centerX,
      y: 15,
      size: fontSize,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.3)
    });

    // Apply optional signature stamp if requested
    if (embeddedStamp) {
      const shouldStamp =
        options.signaturePlacement === 'all' ||
        (options.signaturePlacement === 'cover' && pageNum === 1) ||
        (options.signaturePlacement === 'last' && pageNum === totalPages);

      if (shouldStamp) {
        const stampW = 75;
        const stampH = (embeddedStamp.height / embeddedStamp.width) * stampW;
        page.drawImage(embeddedStamp, {
          x: width - stampW - 40,
          y: 40,
          width: stampW,
          height: stampH,
          opacity: 0.85
        });
      }
    }
  }

  onProgress?.(95, 'Finalizing and compiling PDF bytes...');
  const pdfBytes = await finalDoc.save();

  // Create downloadable Blob URL
  // Wrap in Blob with correct MIME type
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const filename = `${tender.tender_id}_Package.pdf`;

  onProgress?.(100, 'Done!');
  return {
    pdfBytes,
    totalPages,
    blobUrl,
    filename
  };
}

/**
 * Creates dummy sample PDF documents directly in the browser for instant testing.
 */
export async function createSamplePdfFile(
  docTitle: string,
  pageCount: number = 2,
  tenderId: string = 'T-2026-0417'
): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 1; p <= pageCount; p++) {
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 30,
      y: height - 50,
      width: width - 60,
      height: 4,
      color: rgb(0.15, 0.35, 0.65)
    });

    page.drawText(docTitle.toUpperCase(), {
      x: 30,
      y: height - 80,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4)
    });

    page.drawText(`Official Document Sample for Tender: ${tenderId}`, {
      x: 30,
      y: height - 100,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4)
    });

    page.drawText(`Sheet Page ${p} of ${pageCount}`, {
      x: 30,
      y: height - 120,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Mock document content box
    page.drawRectangle({
      x: 30,
      y: 100,
      width: width - 60,
      height: height - 240,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
      color: rgb(0.98, 0.98, 0.99)
    });

    page.drawText('THIS IS AN OFFICIAL VERIFIED SAMPLE TENDER ATTACHMENT', {
      x: 45,
      y: height - 160,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.3)
    });

    page.drawText('Issued for verification and tender evaluation demonstration purposes.', {
      x: 45,
      y: height - 180,
      size: 9,
      font: font,
      color: rgb(0.3, 0.3, 0.3)
    });
  }

  const bytes = await doc.save();
  const safeFilename = `${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
  return new File([bytes as unknown as BlobPart], safeFilename, { type: 'application/pdf' });
}
