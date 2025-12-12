import { jsPDF } from 'jspdf';

export interface PDFDocument {
  name: string;
  content: string;
  pageCount: number;
}

/**
 * Convert markdown content to PDF
 * Handles formatting, page breaks, and professional styling
 */
export async function convertMarkdownToPDF(
  markdown: string,
  filename: string
): Promise<Buffer> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 8.5" x 11"
  });

  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const lineHeight = 6;
  let y = margin;

  // Helper to add new page
  const addNewPage = () => {
    pdf.addPage();
    y = margin;
  };

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace = lineHeight) => {
    if (y + requiredSpace > pageHeight - margin) {
      addNewPage();
    }
  };

  // Parse and render markdown
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle different markdown elements
    if (!line.trim()) {
      // Empty line - add spacing
      y += lineHeight / 2;
      continue;
    }

    // Headers (# ## ### ####)
    if (line.startsWith('####')) {
      checkPageBreak(lineHeight * 1.5);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const text = line.replace(/^####\s*/, '');
      pdf.text(text, margin, y);
      y += lineHeight * 1.2;
      pdf.setFont('helvetica', 'normal');
    } else if (line.startsWith('###')) {
      checkPageBreak(lineHeight * 1.8);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      const text = line.replace(/^###\s*/, '');
      pdf.text(text, margin, y);
      y += lineHeight * 1.3;
      pdf.setFont('helvetica', 'normal');
    } else if (line.startsWith('##')) {
      checkPageBreak(lineHeight * 2);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const text = line.replace(/^##\s*/, '');
      pdf.text(text, margin, y);
      y += lineHeight * 1.5;
      pdf.setFont('helvetica', 'normal');
    } else if (line.startsWith('#')) {
      checkPageBreak(lineHeight * 2.5);
      // Add some space before main headers
      if (y > margin + 10) {
        y += lineHeight;
      }
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      const text = line.replace(/^#\s*/, '');
      pdf.text(text, margin, y);
      y += lineHeight * 1.8;
      pdf.setFont('helvetica', 'normal');
    }
    // Horizontal rule
    else if (line.trim().match(/^[-*_]{3,}$/)) {
      checkPageBreak(lineHeight);
      pdf.line(margin, y, pageWidth - margin, y);
      y += lineHeight;
    }
    // Bullet points or numbered lists
    else if (line.match(/^\s*[-*+]\s/) || line.match(/^\s*\d+\.\s/)) {
      checkPageBreak(lineHeight * 2);
      pdf.setFontSize(10);

      // Extract indentation
      const indent = (line.match(/^\s*/)?.[0].length || 0) * 2;
      const text = line.replace(/^\s*[-*+\d.]\s*/, '• ');

      // Split long lines
      const wrappedLines = pdf.splitTextToSize(text, contentWidth - indent);
      for (const wrappedLine of wrappedLines) {
        checkPageBreak();
        pdf.text(wrappedLine, margin + indent, y);
        y += lineHeight;
      }
    }
    // Block quotes
    else if (line.startsWith('>')) {
      checkPageBreak(lineHeight * 2);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      const text = line.replace(/^>\s*/, '');
      const wrappedLines = pdf.splitTextToSize(text, contentWidth - 10);

      // Draw left border for quote
      const quoteStartY = y;
      for (const wrappedLine of wrappedLines) {
        checkPageBreak();
        pdf.text(wrappedLine, margin + 5, y);
        y += lineHeight;
      }
      pdf.setLineWidth(0.5);
      pdf.line(margin, quoteStartY - 2, margin, y - lineHeight);
      pdf.setFont('helvetica', 'normal');
    }
    // Code blocks
    else if (line.startsWith('```')) {
      // Skip code blocks for now or render as monospace
      checkPageBreak(lineHeight);
      y += lineHeight / 2;
      continue;
    }
    // Regular paragraph text
    else {
      checkPageBreak(lineHeight * 3);
      pdf.setFontSize(10);

      // Handle bold and italic (basic support)
      let text = line.trim();

      // Split long paragraphs into multiple lines
      const wrappedLines = pdf.splitTextToSize(text, contentWidth);
      for (const wrappedLine of wrappedLines) {
        checkPageBreak();
        pdf.text(wrappedLine, margin, y);
        y += lineHeight;
      }

      // Add paragraph spacing
      if (i < lines.length - 1 && lines[i + 1].trim()) {
        y += lineHeight / 3;
      }
    }
  }

  // Add footer with page numbers
  const totalPages = pdf.internal.pages.length - 1; // Subtract the empty first page
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Add filename in footer
    pdf.text(
      filename,
      margin,
      pageHeight - 10,
      { align: 'left' }
    );
  }

  // Return as Buffer
  const pdfOutput = pdf.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

/**
 * Convert multiple markdown documents to PDFs
 */
export async function convertDocumentsToPDFs(
  documents: PDFDocument[]
): Promise<Array<{ name: string; buffer: Buffer; pageCount: number }>> {
  const pdfDocuments = [];

  for (const doc of documents) {
    try {
      const pdfName = doc.name.replace(/\.md$/, '.pdf');
      const pdfBuffer = await convertMarkdownToPDF(doc.content, pdfName);

      pdfDocuments.push({
        name: pdfName,
        buffer: pdfBuffer,
        pageCount: doc.pageCount,
      });
    } catch (error) {
      console.error(`Error converting ${doc.name} to PDF:`, error);
      // Continue with other documents even if one fails
    }
  }

  return pdfDocuments;
}
