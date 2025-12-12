import { NextRequest, NextResponse } from 'next/server';
import { getProgress } from '@/app/lib/progress-store';

// Try to get Supabase client - returns null if unavailable
function getOptionalSupabase() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { caseId } = params;

    // First, try to get from in-memory store (always available)
    const inMemoryProgress = getProgress(caseId);

    // Try Supabase if available
    const supabase = getOptionalSupabase();

    if (supabase) {
      try {
        // Get case progress from database
        const { data: caseData, error: caseError } = await supabase
          .from('petition_cases')
          .select('*')
          .eq('case_id', caseId)
          .single();

        if (!caseError && caseData) {
          // If completed, get documents from database
          let documents = null;
          if (caseData.status === 'completed') {
            const { data: docsData } = await supabase
              .from('generated_documents')
              .select('*')
              .eq('case_id', caseId)
              .order('document_number');

            documents = docsData;
          }

          return NextResponse.json({
            success: true,
            caseId,
            status: caseData.status,
            progress: caseData.progress_percentage || 0,
            currentStage: caseData.current_stage || 'Processing',
            currentMessage: caseData.current_message || '',
            errorMessage: caseData.error_message,
            createdAt: caseData.created_at,
            completedAt: caseData.completed_at,
            documents,
            source: 'database',
          });
        }

        // Database error or case not found - fall through to in-memory
        console.log(`[Progress] Case ${caseId} not found in database, checking in-memory store`);
      } catch (dbError) {
        console.warn(`[Progress] Database error for ${caseId}:`, dbError);
        // Fall through to in-memory store
      }
    }

    // Use in-memory store as fallback
    if (inMemoryProgress) {
      console.log(`[Progress] Returning in-memory progress for ${caseId}: ${inMemoryProgress.progress}%`);

      return NextResponse.json({
        success: true,
        caseId,
        status: inMemoryProgress.status,
        progress: inMemoryProgress.progress,
        currentStage: inMemoryProgress.currentStage,
        currentMessage: inMemoryProgress.currentMessage,
        errorMessage: inMemoryProgress.errorMessage,
        createdAt: inMemoryProgress.createdAt,
        completedAt: inMemoryProgress.completedAt,
        documents: inMemoryProgress.documents,
        source: 'memory',
      });
    }

    // Case not found in either store
    console.log(`[Progress] Case ${caseId} not found in database or memory`);
    return NextResponse.json(
      { error: 'Case not found', caseId },
      { status: 404 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get progress';
    console.error('[Progress] Error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
