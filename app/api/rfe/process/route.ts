import { NextRequest, NextResponse } from 'next/server';
import {
  processRFEText,
  extractPDFText,
  analyzeRFEPatterns,
  generateTemplateImprovements,
  RFEData,
} from '../../../lib/rfe-processor';

// Store processed RFEs for pattern analysis (in production, use database)
const processedRFEs: RFEData[] = [];

/**
 * POST /api/rfe/process
 * Upload and process an RFE PDF to extract structured data
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let pdfText: string;
    let visaType: string | undefined;

    // Handle multipart form data (PDF upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      visaType = formData.get('visaType') as string | undefined;

      if (!file) {
        return NextResponse.json(
          { error: 'No PDF file provided' },
          { status: 400 }
        );
      }

      if (!file.type.includes('pdf')) {
        return NextResponse.json(
          { error: 'File must be a PDF' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      pdfText = await extractPDFText(buffer);
    }
    // Handle JSON with raw text
    else if (contentType.includes('application/json')) {
      const body = await request.json();
      pdfText = body.text;
      visaType = body.visaType;

      if (!pdfText) {
        return NextResponse.json(
          { error: 'No text provided. Send either a PDF file or JSON with "text" field' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid content type. Use multipart/form-data for PDF or application/json for text' },
        { status: 400 }
      );
    }

    // Process the RFE text
    const rfeData = await processRFEText(pdfText, visaType);

    // Store for pattern analysis
    processedRFEs.push(rfeData);

    return NextResponse.json({
      success: true,
      data: rfeData,
      issueCount: rfeData.issues.length,
      criticalCount: rfeData.issues.filter(i => i.priority === 'critical').length,
      highCount: rfeData.issues.filter(i => i.priority === 'high').length,
      processedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('RFE processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process RFE' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rfe/process
 * Get pattern analysis from all processed RFEs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'patterns') {
      if (processedRFEs.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No RFEs processed yet. Upload RFE PDFs first.',
          totalProcessed: 0,
        });
      }

      const analysis = await analyzeRFEPatterns(processedRFEs);
      const improvements = generateTemplateImprovements(analysis);

      return NextResponse.json({
        success: true,
        analysis,
        templateImprovements: improvements,
      });
    }

    // Default: return summary of processed RFEs
    return NextResponse.json({
      success: true,
      totalProcessed: processedRFEs.length,
      rfesSummary: processedRFEs.map(rfe => ({
        receiptNumber: rfe.receiptNumber,
        beneficiaryName: rfe.beneficiaryName,
        visaType: rfe.visaType,
        issueCount: rfe.issues.length,
        criticalCount: rfe.issues.filter(i => i.priority === 'critical').length,
      })),
    });

  } catch (error: any) {
    console.error('RFE analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze RFEs' },
      { status: 500 }
    );
  }
}
