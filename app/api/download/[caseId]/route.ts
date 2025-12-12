import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { caseId } = params;
    const { searchParams } = new URL(request.url);
    const documentNumber = searchParams.get('documentNumber');
    const format = searchParams.get('format') || 'markdown'; // markdown, text, json

    // Validate case exists
    const { data: caseData, error: caseError } = await supabase
      .from('petition_cases')
      .select('*')
      .eq('case_id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // If documentNumber specified, download single document
    if (documentNumber) {
      const { data: doc, error: docError } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('case_id', caseId)
        .eq('document_number', parseInt(documentNumber))
        .single();

      if (docError || !doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Return document content
      if (format === 'json') {
        return NextResponse.json({
          success: true,
          document: doc,
        });
      }

      // Return as downloadable file
      const fileName = `${caseData.beneficiary_name.replace(/[^a-zA-Z0-9]/g, '_')}_Document_${documentNumber}_${doc.document_name.replace(/[^a-zA-Z0-9]/g, '_')}.${format === 'text' ? 'txt' : 'md'}`;

      return new NextResponse(doc.content, {
        headers: {
          'Content-Type': format === 'text' ? 'text/plain' : 'text/markdown',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    // Otherwise, download all documents
    const { data: documents, error: docsError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('case_id', caseId)
      .order('document_number');

    if (docsError) {
      throw new Error(`Failed to get documents: ${docsError.message}`);
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found for this case' },
        { status: 404 }
      );
    }

    // Return all documents in JSON format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        caseId,
        beneficiaryName: caseData.beneficiary_name,
        visaType: caseData.visa_type,
        documents: documents.map(doc => ({
          number: doc.document_number,
          name: doc.document_name,
          type: doc.document_type,
          content: doc.content,
          wordCount: doc.word_count,
          pageEstimate: doc.page_estimate,
        })),
      });
    }

    // Return as combined markdown/text file
    const combined = documents
      .map(doc => {
        return `${'='.repeat(80)}
DOCUMENT ${doc.document_number}: ${doc.document_name}
${'='.repeat(80)}

${doc.content}

`;
      })
      .join('\n\n');

    const fileName = `${caseData.beneficiary_name.replace(/[^a-zA-Z0-9]/g, '_')}_All_Documents_${caseId}.${format === 'text' ? 'txt' : 'md'}`;

    return new NextResponse(combined, {
      headers: {
        'Content-Type': format === 'text' ? 'text/plain' : 'text/markdown',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error in download:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download documents' },
      { status: 500 }
    );
  }
}
