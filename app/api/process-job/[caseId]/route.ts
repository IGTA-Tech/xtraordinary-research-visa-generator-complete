import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/lib/supabase-server';
import { generateAllDocuments } from '@/app/lib/document-generator';
import { BeneficiaryInfo } from '@/app/types';
import {
  logError,
  createSafeProgressCallback,
} from '@/app/lib/retry-helper';

export const maxDuration = 300; // 5 minutes max for Vercel Pro
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;
  let supabase: any = null;

  try {
    supabase = getSupabaseClient();
    console.log(`[ProcessJob] Starting job for case ${caseId}`);

    // Get case from database
    const { data: caseData, error: caseError } = await supabase
      .from('petition_cases')
      .select('*')
      .eq('case_id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error(`[ProcessJob] Case not found: ${caseId}`, caseError);
      return NextResponse.json(
        { error: 'Case not found', caseId },
        { status: 404 }
      );
    }

    // Check if already processing or completed
    if (caseData.status === 'completed') {
      return NextResponse.json({
        success: true,
        caseId,
        message: 'Case already completed',
        status: 'completed',
      });
    }

    if (caseData.status === 'generating' && caseData.progress_percentage > 5) {
      return NextResponse.json({
        success: true,
        caseId,
        message: 'Case is already being processed',
        status: 'generating',
        progress: caseData.progress_percentage,
      });
    }

    // Update status to generating
    await supabase
      .from('petition_cases')
      .update({
        status: 'generating',
        progress_percentage: 1,
        current_stage: 'Starting',
        current_message: 'Initializing document generation...',
        updated_at: new Date().toISOString(),
      })
      .eq('case_id', caseId);

    // Get URLs for this case
    const { data: urlsData } = await supabase
      .from('case_urls')
      .select('*')
      .eq('case_id', caseId);

    // Get uploaded files for this case
    const { data: filesData } = await supabase
      .from('case_files')
      .select('*')
      .eq('case_id', caseId);

    // Reconstruct beneficiary info
    const beneficiaryInfo: BeneficiaryInfo = {
      fullName: caseData.beneficiary_name,
      profession: caseData.profession,
      visaType: caseData.visa_type,
      nationality: caseData.nationality,
      currentStatus: caseData.current_status,
      fieldOfExpertise: caseData.field_of_expertise,
      backgroundInfo: caseData.background_info,
      petitionerName: caseData.petitioner_name,
      petitionerOrganization: caseData.petitioner_organization,
      additionalInfo: caseData.additional_info,
      primaryUrls: urlsData?.map((u: any) => u.url) || [],
      urls: urlsData || [],
      uploadedFiles: filesData || [],
    };

    // Progress callback
    const updateProgress = async (stage: string, progress: number, message: string) => {
      try {
        await supabase
          .from('petition_cases')
          .update({
            status: progress === 100 ? 'completed' : 'generating',
            progress_percentage: progress,
            current_stage: stage,
            current_message: message,
            updated_at: new Date().toISOString(),
            completed_at: progress === 100 ? new Date().toISOString() : null,
          })
          .eq('case_id', caseId);
      } catch (progressError) {
        logError('updateProgress', progressError, { caseId, stage, progress });
      }
    };

    const safeProgress = createSafeProgressCallback(updateProgress);

    // Generate all documents
    console.log(`[ProcessJob] Generating documents for ${caseId}`);
    const result = await generateAllDocuments(beneficiaryInfo, safeProgress);

    // Store generated documents
    const documents = [
      { number: 1, name: 'Comprehensive Analysis', type: 'analysis', content: result.document1 },
      { number: 2, name: 'Publication Analysis', type: 'analysis', content: result.document2 },
      { number: 3, name: 'URL Reference', type: 'reference', content: result.document3 },
      { number: 4, name: 'Legal Brief', type: 'brief', content: result.document4 },
      { number: 5, name: 'Evidence Gap Analysis', type: 'analysis', content: result.document5 },
      { number: 6, name: 'USCIS Cover Letter', type: 'letter', content: result.document6 },
      { number: 7, name: 'Visa Checklist', type: 'checklist', content: result.document7 },
      { number: 8, name: 'Exhibit Assembly Guide', type: 'guide', content: result.document8 },
    ];

    let savedCount = 0;
    for (const doc of documents) {
      try {
        // Upsert to handle retries
        const { error } = await supabase
          .from('generated_documents')
          .upsert({
            case_id: caseId,
            document_number: doc.number,
            document_name: doc.name,
            document_type: doc.type,
            content: doc.content,
            word_count: doc.content?.split(/\s+/).length || 0,
            page_estimate: Math.ceil((doc.content?.split(/\s+/).length || 0) / 500),
            storage_url: `generated/${caseId}/document-${doc.number}.md`,
            generated_at: new Date().toISOString(),
          }, {
            onConflict: 'case_id,document_number',
          });

        if (!error) savedCount++;
      } catch (docError) {
        logError(`Save document ${doc.number}`, docError, { caseId, docName: doc.name });
      }
    }

    console.log(`[ProcessJob] ✅ Completed case ${caseId} - saved ${savedCount}/${documents.length} documents`);

    return NextResponse.json({
      success: true,
      caseId,
      message: `Successfully generated ${savedCount} documents`,
      documentsGenerated: savedCount,
    });

  } catch (error: any) {
    logError('process-job', error, { caseId });

    // Update case with error
    if (supabase) {
      try {
        await supabase
          .from('petition_cases')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error during generation',
            updated_at: new Date().toISOString(),
          })
          .eq('case_id', caseId);
      } catch (updateError) {
        logError('Database - update failed status', updateError, { caseId });
      }
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to process job',
        caseId,
      },
      { status: 500 }
    );
  }
}
