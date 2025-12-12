import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { PDFDocument } from 'pdf-lib';
import { Mistral } from '@mistralai/mistralai';

// Lazy-initialized Mistral client
let mistralClient: Mistral | null = null;

function getMistralClient(): Mistral | null {
  if (!process.env.MISTRAL_API_KEY) {
    return null;
  }
  if (!mistralClient) {
    mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  }
  return mistralClient;
}

export interface ProcessedFile {
  fileName: string;
  fileType: string;
  extractedText: string;
  pageCount?: number;
  wordCount: number;
  summary: string;
}

/**
 * Extract text from PDF file using Mistral OCR
 * Falls back to basic pdf-lib info if Mistral API key not set
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();

    const client = getMistralClient();
    if (!client) {
      console.log('Mistral API key not set, returning basic PDF info');
      return {
        text: `[PDF Document - ${pageCount} pages]\nNote: Set MISTRAL_API_KEY for full text extraction.`,
        pageCount,
      };
    }

    // Convert buffer to base64 data URL for Mistral OCR
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64Data}`;

    console.log(`Processing PDF with ${pageCount} pages using Mistral OCR...`);

    const response = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: dataUrl,
      },
    });

    // Extract text from all pages
    let fullText = '';
    if (response.pages && response.pages.length > 0) {
      fullText = response.pages
        .map((page, index) => {
          const pageText = page.markdown || '';
          return `--- Page ${index + 1} ---\n${pageText}`;
        })
        .join('\n\n');
    }

    console.log(`Extracted ${fullText.length} characters from PDF`);

    return {
      text: fullText || `[PDF Document - ${pageCount} pages - No text extracted]`,
      pageCount,
    };
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    // Try to at least get page count
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      return {
        text: `[PDF extraction failed - ${pdfDoc.getPageCount()} pages]`,
        pageCount: pdfDoc.getPageCount()
      };
    } catch {
      return { text: '[PDF extraction failed]', pageCount: 0 };
    }
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    return '';
  }
}

/**
 * Extract text from image using Mistral OCR
 * Falls back to tesseract.js if Mistral API key not set
 */
export async function extractTextFromImage(buffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  try {
    const client = getMistralClient();

    if (!client) {
      console.log('Mistral API key not set, falling back to tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return data.text;
    }

    // Convert buffer to base64 data URL for Mistral OCR
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    console.log('Processing image with Mistral OCR...');

    const response = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'image_url',
        imageUrl: dataUrl,
      },
    });

    // Extract text from the response
    let extractedText = '';
    if (response.pages && response.pages.length > 0) {
      extractedText = response.pages
        .map((page) => page.markdown || '')
        .join('\n\n');
    }

    console.log(`Extracted ${extractedText.length} characters from image`);

    return extractedText;
  } catch (error) {
    console.error('Error extracting image text with Mistral, falling back to tesseract:', error);
    // Fallback to tesseract.js
    try {
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return data.text;
    } catch (tessError) {
      console.error('Tesseract fallback also failed:', tessError);
      return '[Image text extraction failed]';
    }
  }
}

/**
 * Process a single file and extract text based on type
 * Supports both File objects and Buffer + filename
 */
export async function processFile(fileOrBuffer: File | Buffer, fileName?: string): Promise<ProcessedFile> {
  let buffer: Buffer;
  let name: string;
  let mimeType: string;

  // Handle both File and Buffer inputs
  if (Buffer.isBuffer(fileOrBuffer)) {
    buffer = fileOrBuffer;
    name = fileName || 'unknown';
    // Detect mime type from filename extension
    const ext = name.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'bmp': 'image/bmp',
      'txt': 'text/plain',
    };
    mimeType = mimeTypes[ext || ''] || 'application/octet-stream';
  } else {
    buffer = Buffer.from(await fileOrBuffer.arrayBuffer());
    name = fileOrBuffer.name;
    mimeType = fileOrBuffer.type;
  }

  let extractedText = '';
  let pageCount: number | undefined;

  // Extract text based on file type
  if (mimeType === 'application/pdf') {
    const result = await extractTextFromPDF(buffer);
    extractedText = result.text;
    pageCount = result.pageCount;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    extractedText = await extractTextFromDOCX(buffer);
  } else if (mimeType.startsWith('image/')) {
    extractedText = await extractTextFromImage(buffer, mimeType);
  } else if (mimeType === 'text/plain') {
    extractedText = buffer.toString('utf-8');
  }

  // Clean up extracted text
  extractedText = extractedText
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  // Calculate word count
  const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;

  // Generate summary (first 500 characters)
  const summary = extractedText.length > 500
    ? extractedText.substring(0, 500) + '...'
    : extractedText;

  return {
    fileName: name,
    fileType: mimeType,
    extractedText,
    pageCount,
    wordCount,
    summary,
  };
}

/**
 * Process multiple files
 */
export async function processFiles(files: File[]): Promise<ProcessedFile[]> {
  const processPromises = files.map(file => processFile(file));
  return Promise.all(processPromises);
}

/**
 * Categorize files by evidence type
 */
export function categorizeFiles(processedFiles: ProcessedFile[]): {
  resumes: ProcessedFile[];
  awards: ProcessedFile[];
  publications: ProcessedFile[];
  media: ProcessedFile[];
  letters: ProcessedFile[];
  other: ProcessedFile[];
} {
  const categories = {
    resumes: [] as ProcessedFile[],
    awards: [] as ProcessedFile[],
    publications: [] as ProcessedFile[],
    media: [] as ProcessedFile[],
    letters: [] as ProcessedFile[],
    other: [] as ProcessedFile[],
  };

  processedFiles.forEach(file => {
    const text = file.extractedText.toLowerCase();
    const fileName = file.fileName.toLowerCase();

    if (fileName.includes('cv') || fileName.includes('resume') || text.includes('curriculum vitae')) {
      categories.resumes.push(file);
    } else if (
      fileName.includes('award') ||
      fileName.includes('certificate') ||
      text.includes('award') ||
      text.includes('certificate of')
    ) {
      categories.awards.push(file);
    } else if (
      fileName.includes('publication') ||
      fileName.includes('paper') ||
      fileName.includes('article') ||
      text.includes('published in') ||
      text.includes('journal of')
    ) {
      categories.publications.push(file);
    } else if (
      fileName.includes('media') ||
      fileName.includes('press') ||
      fileName.includes('news') ||
      text.includes('published:') ||
      text.includes('news article')
    ) {
      categories.media.push(file);
    } else if (
      fileName.includes('letter') ||
      fileName.includes('recommendation') ||
      text.includes('to whom it may concern') ||
      text.includes('i am writing to recommend')
    ) {
      categories.letters.push(file);
    } else {
      categories.other.push(file);
    }
  });

  return categories;
}

/**
 * Generate file evidence summary for AI analysis
 */
export function generateFileEvidenceSummary(processedFiles: ProcessedFile[]): string {
  const categories = categorizeFiles(processedFiles);

  let summary = '# UPLOADED DOCUMENT EVIDENCE\n\n';
  summary += `Total documents uploaded: ${processedFiles.length}\n`;
  summary += `Total words extracted: ${processedFiles.reduce((sum, f) => sum + f.wordCount, 0)}\n\n`;

  // Add categorized summaries
  if (categories.resumes.length > 0) {
    summary += '## RESUMES/CVs\n\n';
    categories.resumes.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.awards.length > 0) {
    summary += '## AWARDS & CERTIFICATES\n\n';
    categories.awards.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.publications.length > 0) {
    summary += '## PUBLICATIONS & PAPERS\n\n';
    categories.publications.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}${file.pageCount ? `, Pages: ${file.pageCount}` : ''}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.media.length > 0) {
    summary += '## MEDIA COVERAGE\n\n';
    categories.media.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.letters.length > 0) {
    summary += '## LETTERS OF RECOMMENDATION\n\n';
    categories.letters.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  if (categories.other.length > 0) {
    summary += '## OTHER EVIDENCE\n\n';
    categories.other.forEach(file => {
      summary += `### ${file.fileName}\n`;
      summary += `Words: ${file.wordCount}\n`;
      summary += `Content: ${file.summary}\n\n`;
    });
  }

  // Add full text for detailed analysis
  summary += '\n---\n\n# FULL EXTRACTED TEXT (for detailed analysis)\n\n';
  processedFiles.forEach(file => {
    summary += `## ${file.fileName}\n\n`;
    summary += file.extractedText + '\n\n---\n\n';
  });

  return summary;
}
