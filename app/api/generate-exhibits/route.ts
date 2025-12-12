import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/lib/supabase-server';
import { generateExhibitPackage } from '@/app/lib/exhibit-generator';

export async function POST(request: NextRequest) {
  let supabase: any = null;

  // Try to initialize Supabase, but don't fail if it's not configured
  try {
    supabase = getSupabaseClient();
    console.log('[GenerateExhibits] Supabase connected successfully');
  } catch (supabaseError: any) {
    console.warn('[GenerateExhibits] Supabase not available:', supabaseError.message);
    console.warn('[GenerateExhibits] Continuing without database - exhibits will still generate');
  }

  try {
    const body = await request.json();
    const { caseId, exhibitSources } = body;

    // Validate required fields
    if (!caseId || !exhibitSources || !Array.isArray(exhibitSources)) {
      return NextResponse.json(
        { error: 'Case ID and exhibit sources are required' },
        { status: 400 }
      );
    }

    // Verify case exists (if Supabase available)
    if (supabase) {
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
    } else {
      console.log('[GenerateExhibits] Skipping case verification (Supabase not available)');
    }

    // Update case status to indicate exhibit generation started (if Supabase available)
    if (supabase) {
      await supabase
        .from('petition_cases')
        .update({
          status: 'generating_exhibits',
          updated_at: new Date().toISOString(),
        })
        .eq('case_id', caseId);
    }

    // Progress update function - adapted for exhibit generator signature
    const onProgress = async (stage: string, current: number, total: number) => {
      const progress = total > 0 ? Math.round((current / total) * 100) : 0;
      const message = `Processing ${current} of ${total} exhibits`;

      if (!supabase) {
        console.log(`[ExhibitProgress] ${stage} - ${progress}% - ${message}`);
        return;
      }

      await supabase
        .from('petition_cases')
        .update({
          current_stage: `Exhibits: ${stage}`,
          current_message: message,
          exhibit_generation_progress: progress,
          updated_at: new Date().toISOString(),
        })
        .eq('case_id', caseId);
    };

    // Generate exhibit package in background (fire-and-forget)
    generateExhibitsInBackground(caseId, exhibitSources, onProgress);

    return NextResponse.json({
      success: true,
      caseId,
      message: 'Exhibit generation started. Check progress endpoint for status.',
      progressEndpoint: `/api/progress/${caseId}`,
    });
  } catch (error: any) {
    console.error('Error in generate-exhibits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start exhibit generation' },
      { status: 500 }
    );
  }
}

// Background exhibit generation function
async function generateExhibitsInBackground(
  caseId: string,
  exhibitSources: any[],
  onProgress: (stage: string, current: number, total: number) => void
) {
  try {
    const supabase = getSupabaseClient();
    // Generate exhibit package
    const exhibitPackage = await generateExhibitPackage(
      caseId,
      exhibitSources,
      onProgress
    );

    // Store exhibit package information in database
    await supabase
      .from('petition_cases')
      .update({
        status: 'completed',
        exhibit_generation_progress: 100,
        exhibit_package_url: exhibitPackage.combinedPdfUrl,
        exhibit_toc_url: exhibitPackage.tableOfContentsUrl,
        total_exhibits: exhibitPackage.totalExhibits,
        updated_at: new Date().toISOString(),
      })
      .eq('case_id', caseId);

    // Store individual exhibit records
    if (exhibitPackage.exhibits) {
      const exhibitRecords = exhibitPackage.exhibits.map((exhibit: any) => ({
        case_id: caseId,
        exhibit_number: exhibit.number || exhibit.label, // e.g., "A", "B", "C"
        exhibit_title: exhibit.title || `Exhibit ${exhibit.number}`,
        source_url: exhibit.sourceUrl || exhibit.url,
        archive_url: exhibit.archiveUrl,
        pdf_storage_url: exhibit.pdfUrl,
        pdf_size_bytes: exhibit.fileSize || 0,
        generation_status: 'completed',
        generated_at: new Date().toISOString(),
      }));

      await supabase.from('exhibit_pdfs').insert(exhibitRecords);
    }

    console.log(`✅ Successfully generated exhibits for case ${caseId}`);
  } catch (error: any) {
    console.error(`❌ Error generating exhibits for case ${caseId}:`, error);

    // Update case with error
    const supabase = getSupabaseClient();
    await supabase
      .from('petition_cases')
      .update({
        status: 'exhibit_generation_failed',
        error_message: `Exhibit generation failed: ${error.message}`,
        updated_at: new Date().toISOString(),
      })
      .eq('case_id', caseId);
  }
}
