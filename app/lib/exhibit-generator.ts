import Api2Pdf from 'api2pdf';
import { archiveMultipleUrls, ArchivedUrl } from './archive-org';
import { supabase } from './supabase';

const api2pdf = new Api2Pdf(process.env.API2PDF_API_KEY!);

export interface ExhibitSource {
  url: string;
  title: string;
  description?: string;
  archived?: boolean;
  archiveUrl?: string;
}

export interface GeneratedExhibit {
  exhibitLetter: string; // A, B, C, etc.
  originalUrl: string;
  archiveUrl: string | null;
  pdfUrl: string | null;
  title: string;
  success: boolean;
  error?: string;
}

export interface ExhibitPackage {
  caseId: string;
  exhibits: GeneratedExhibit[];
  tableOfContentsUrl: string | null;
  combinedPdfUrl: string | null;
  totalExhibits: number;
  successfulExhibits: number;
  failedExhibits: number;
  generatedAt: Date;
}

/**
 * Generate comprehensive exhibit package with:
 * 1. Archive all URLs to archive.org
 * 2. Convert each URL to PDF
 * 3. Number exhibits (A, B, C...)
 * 4. Generate Table of Contents
 * 5. Merge into single downloadable PDF
 *
 * THIS IS THE KEY FEATURE for the internal tool!
 */
export async function generateExhibitPackage(
  caseId: string,
  sources: ExhibitSource[],
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<ExhibitPackage> {
  const exhibits: GeneratedExhibit[] = [];

  try {
    // STEP 1: Archive all URLs to archive.org
    if (onProgress) onProgress('Archiving URLs', 0, sources.length);

    const archivedUrls = await archiveMultipleUrls(
      sources.map(s => s.url),
      (current, total, url) => {
        if (onProgress) onProgress('Archiving URLs', current, total);
      }
    );

    // STEP 2: Convert each URL to PDF with API2PDF
    if (onProgress) onProgress('Converting to PDFs', 0, sources.length);

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const archivedResult = archivedUrls[i];
      const exhibitLetter = String.fromCharCode(65 + i); // A, B, C...

      if (onProgress) onProgress('Converting to PDFs', i + 1, sources.length);

      try {
        // Use archived URL if available, otherwise original
        const urlToConvert = archivedResult.archiveUrl || source.url;

        // Convert URL to PDF using API2PDF
        const pdfResult = await api2pdf.chromeUrlToPdf(urlToConvert, {
          landscape: false,
          marginTop: '0.5in',
          marginBottom: '0.5in',
          marginLeft: '0.5in',
          marginRight: '0.5in',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: `<div style="font-size: 10px; width: 100%; text-align: center;">Exhibit ${exhibitLetter}</div>`,
          footerTemplate: `<div style="font-size: 10px; width: 100%; text-align: center;"><span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
        });

        const exhibit: GeneratedExhibit = {
          exhibitLetter,
          originalUrl: source.url,
          archiveUrl: archivedResult.archiveUrl,
          pdfUrl: pdfResult.FileUrl || null,
          title: source.title,
          success: true,
        };

        exhibits.push(exhibit);

        // Store in database
        await supabase.from('exhibit_pdfs').insert({
          case_id: caseId,
          exhibit_number: exhibitLetter,
          exhibit_title: source.title,
          source_url: source.url,
          archive_url: archivedResult.archiveUrl,
          pdf_storage_url: pdfResult.FileUrl,
          generation_status: 'completed',
          generated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Failed to convert exhibit ${i + 1} to PDF:`, error);

        const exhibit: GeneratedExhibit = {
          exhibitLetter: String.fromCharCode(65 + i),
          originalUrl: source.url,
          archiveUrl: archivedResult.archiveUrl,
          pdfUrl: null,
          title: source.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        exhibits.push(exhibit);

        // Store failed attempt in database
        await supabase.from('exhibit_pdfs').insert({
          case_id: caseId,
          exhibit_number: String.fromCharCode(65 + i),
          exhibit_title: source.title,
          source_url: source.url,
          archive_url: archivedResult.archiveUrl,
          generation_status: 'failed',
          generation_error: exhibit.error,
        });
      }

      // Small delay between conversions to avoid rate limiting
      if (i < sources.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    // STEP 3: Generate Table of Contents
    if (onProgress) onProgress('Generating Table of Contents', 0, 1);

    const tocHtml = generateTableOfContentsHtml(exhibits, caseId);
    const tocPdfResult = await api2pdf.chromeHtmlToPdf(tocHtml, {
      landscape: false,
      printBackground: true,
    });

    // STEP 4: Merge all PDFs
    if (onProgress) onProgress('Merging PDFs', 0, 1);

    const successfulExhibits = exhibits.filter(e => e.success && e.pdfUrl);
    const pdfUrls = [
      tocPdfResult.FileUrl,
      ...successfulExhibits.map(e => e.pdfUrl),
    ].filter((url): url is string => url !== null && url !== undefined);

    let combinedPdfUrl: string | null = null;

    if (pdfUrls.length > 1) {
      try {
        const mergedResult = await api2pdf.pdfsharpMerge(pdfUrls, {
          inline: false,
          fileName: `Exhibit_Package_${caseId}.pdf`,
        });

        combinedPdfUrl = mergedResult.FileUrl || null;
      } catch (error) {
        console.error('Failed to merge PDFs:', error);
        // If merge fails, we still have individual PDFs
      }
    }

    const successCount = exhibits.filter(e => e.success).length;
    const failCount = exhibits.filter(e => !e.success).length;

    return {
      caseId,
      exhibits,
      tableOfContentsUrl: tocPdfResult.FileUrl || null,
      combinedPdfUrl,
      totalExhibits: exhibits.length,
      successfulExhibits: successCount,
      failedExhibits: failCount,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error generating exhibit package:', error);
    throw error;
  }
}

/**
 * Generate HTML for Table of Contents
 */
function generateTableOfContentsHtml(
  exhibits: GeneratedExhibit[],
  caseId: string
): string {
  const exhibitRows = exhibits
    .map(
      (exhibit, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold;">Exhibit ${exhibit.exhibitLetter}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd;">${exhibit.title}</td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; font-size: 10px; color: #666;">
        ${exhibit.success ? '✓ Generated' : '✗ Failed'}
      </td>
    </tr>
  `
    )
    .join('');

  const archivedUrls = exhibits
    .filter(e => e.archiveUrl)
    .map(
      (exhibit, index) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Exhibit ${exhibit.exhibitLetter}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 9px; word-break: break-all;">
        <div><strong>Original:</strong> ${exhibit.originalUrl}</div>
        <div style="margin-top: 4px;"><strong>Archived:</strong> ${exhibit.archiveUrl}</div>
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Exhibit Package - Table of Contents</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      margin: 40px;
      line-height: 1.6;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
      font-size: 24px;
    }
    h2 {
      margin-top: 40px;
      margin-bottom: 20px;
      font-size: 18px;
      border-bottom: 2px solid #333;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .case-info {
      margin-bottom: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border-left: 4px solid #333;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>EXHIBIT PACKAGE</h1>
  <h1>TABLE OF CONTENTS</h1>

  <div class="case-info">
    <strong>Case ID:</strong> ${caseId}<br>
    <strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
    <strong>Total Exhibits:</strong> ${exhibits.length}
  </div>

  <h2>Exhibit List</h2>
  <table>
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="padding: 12px; text-align: left; width: 100px;">Exhibit</th>
        <th style="padding: 12px; text-align: left;">Title/Description</th>
        <th style="padding: 12px; text-align: left; width: 100px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${exhibitRows}
    </tbody>
  </table>

  <h2>Archived URLs (archive.org)</h2>
  <p style="font-size: 11px; color: #666; margin-bottom: 15px;">
    All URLs have been preserved on archive.org for long-term accessibility.
  </p>
  <table>
    <thead>
      <tr style="background-color: #f0f0f0;">
        <th style="padding: 8px; text-align: left; width: 100px;">Exhibit</th>
        <th style="padding: 8px; text-align: left;">URLs</th>
      </tr>
    </thead>
    <tbody>
      ${archivedUrls}
    </tbody>
  </table>

  <div class="footer">
    <p>This exhibit package was generated automatically.</p>
    <p>All source URLs have been archived to archive.org for preservation.</p>
    <p>Generated by Mega Internal V1 - Visa Generation Tool</p>
  </div>
</body>
</html>
  `;
}

/**
 * Get exhibit package for a case from database
 */
export async function getExhibitPackage(caseId: string): Promise<GeneratedExhibit[]> {
  const { data, error } = await supabase
    .from('exhibit_pdfs')
    .select('*')
    .eq('case_id', caseId)
    .order('exhibit_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to get exhibit package: ${error.message}`);
  }

  return (
    data?.map(row => ({
      exhibitLetter: row.exhibit_number,
      originalUrl: row.source_url,
      archiveUrl: row.archive_url,
      pdfUrl: row.pdf_storage_url,
      title: row.exhibit_title,
      success: row.generation_status === 'completed',
      error: row.generation_error || undefined,
    })) || []
  );
}
