import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/app/lib/inngest/client';
import {
  logError,
  validateRequiredFields,
} from '@/app/lib/retry-helper';
import { initProgress, setProgress } from '@/app/lib/progress-store';

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

export async function POST(request: NextRequest) {
  let caseId: string | null = null;

  // Try to get Supabase - returns null if not available
  const supabase = getOptionalSupabase();
  if (supabase) {
    console.log('[Generate] Supabase connected successfully');
  } else {
    console.log('[Generate] Supabase not available - using in-memory progress tracking');
  }

  try {
    const body = await request.json();
    const { beneficiaryInfo, urls, uploadedFiles } = body;

    // Validate required fields
    const validation = validateRequiredFields(
      beneficiaryInfo,
      ['fullName', 'visaType'],
      'beneficiaryInfo'
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: `Missing required fields: ${validation.missing.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`[Generate] Starting generation for ${beneficiaryInfo.fullName}`);

    // Generate case ID
    caseId = generateCaseId(beneficiaryInfo.fullName);
    console.log(`[Generate] Generated case ID: ${caseId}`);

    // Always initialize in-memory progress (works even without Supabase)
    initProgress(caseId);
    console.log(`[Generate] Initialized in-memory progress for ${caseId}`);

    // Create case in database with error handling (if Supabase available)
    if (supabase) {
      try {
        const { error: caseError } = await supabase
          .from('petition_cases')
          .insert({
            case_id: caseId,
            beneficiary_name: beneficiaryInfo.fullName,
            profession: beneficiaryInfo.profession || beneficiaryInfo.fieldOfProfession || 'Not specified',
            visa_type: beneficiaryInfo.visaType,
            nationality: beneficiaryInfo.nationality,
            current_status: beneficiaryInfo.currentStatus,
            field_of_expertise: beneficiaryInfo.fieldOfExpertise || beneficiaryInfo.profession || beneficiaryInfo.fieldOfProfession,
            background_info: beneficiaryInfo.backgroundInfo || beneficiaryInfo.background,
            petitioner_name: beneficiaryInfo.petitionerName,
            petitioner_organization: beneficiaryInfo.petitionerOrganization,
            additional_info: beneficiaryInfo.additionalInfo,
            status: 'initializing',
            progress_percentage: 0,
            current_stage: 'Queued for processing',
            current_message: 'Your petition is queued and will start processing shortly...',
          })
          .select()
          .single();

        if (caseError) {
          throw new Error(`Failed to create case: ${caseError.message}`);
        }

        console.log(`[Generate] Case created in database: ${caseId}`);
      } catch (dbError: any) {
        logError('Database - create case', dbError, { caseId });
        // Continue even if database write fails - we'll try to save results later
      }
    } else {
      console.log('[Generate] Skipping database case creation (Supabase not available)');
    }

    // Store URLs in database with error handling (if Supabase available)
    if (urls && urls.length > 0 && supabase) {
      try {
        const urlRecords = urls.map((url: any) => ({
          case_id: caseId,
          url: url.url || url,
          title: url.title,
          description: url.description,
          source_type: url.sourceType || 'manual',
          source_name: url.sourceName,
          quality_tier: url.tier || url.sourceTier,
        }));

        await supabase.from('case_urls').insert(urlRecords);
        console.log(`[Generate] Stored ${urlRecords.length} URLs in database`);
      } catch (urlError: any) {
        logError('Database - store URLs', urlError, { caseId });
        // Continue even if URL storage fails
      }
    }

    // Store uploaded files metadata in database (if Supabase available)
    if (uploadedFiles && uploadedFiles.length > 0 && supabase) {
      try {
        const fileRecords = uploadedFiles.map((file: any) => ({
          case_id: caseId,
          filename: file.filename || file.name,
          file_type: file.fileType || file.type || 'pdf',
          file_size_bytes: file.size || 0,
          mime_type: file.mimeType,
          extracted_text: file.extractedText,
          word_count: file.wordCount,
          processing_status: 'completed',
          storage_path: `uploads/${caseId}/${file.filename || file.name}`,
        }));

        await supabase.from('case_files').insert(fileRecords);
        console.log(`[Generate] Stored ${fileRecords.length} file records in database`);
      } catch (fileError: any) {
        logError('Database - store files', fileError, { caseId });
      }
    }

    // TRIGGER INNGEST BACKGROUND JOB
    // This is the key change - we send an event to Inngest which will
    // run the document generation in the background with NO timeout limits
    try {
      console.log(`[Generate] Triggering Inngest job for case ${caseId}...`);

      await inngest.send({
        name: 'petition/generate',
        data: {
          caseId,
          beneficiaryInfo: {
            fullName: beneficiaryInfo.fullName,
            profession: beneficiaryInfo.profession || beneficiaryInfo.fieldOfProfession || 'Not specified',
            visaType: beneficiaryInfo.visaType,
            nationality: beneficiaryInfo.nationality,
            currentStatus: beneficiaryInfo.currentStatus,
            fieldOfExpertise: beneficiaryInfo.fieldOfExpertise || beneficiaryInfo.profession || beneficiaryInfo.fieldOfProfession,
            backgroundInfo: beneficiaryInfo.backgroundInfo || beneficiaryInfo.background,
            petitionerName: beneficiaryInfo.petitionerName,
            petitionerOrganization: beneficiaryInfo.petitionerOrganization,
            additionalInfo: beneficiaryInfo.additionalInfo,
            recipientEmail: beneficiaryInfo.recipientEmail,
            briefType: beneficiaryInfo.briefType || 'comprehensive',
          },
          urls: (urls || []).map((url: any) => ({
            url: url.url || url,
            title: url.title,
            description: url.description,
            sourceType: url.sourceType || 'manual',
            sourceName: url.sourceName,
            tier: url.tier || url.sourceTier,
          })),
          uploadedFiles: (uploadedFiles || []).map((file: any) => ({
            filename: file.filename || file.name,
            fileType: file.fileType || file.type || 'pdf',
            extractedText: file.extractedText,
            wordCount: file.wordCount,
          })),
        },
      });

      console.log(`[Generate] Inngest job triggered successfully for case ${caseId}`);

      // Update status in both in-memory store and database
      setProgress(caseId, {
        status: 'researching',
        progress: 5,
        currentStage: 'Processing',
        currentMessage: 'Document generation started in background...',
      });

      if (supabase) {
        await supabase
          .from('petition_cases')
          .update({
            status: 'researching',
            progress_percentage: 5,
            current_stage: 'Processing',
            current_message: 'Document generation started in background...',
          })
          .eq('case_id', caseId);
      }
    } catch (inngestError) {
      logError('Inngest - send event', inngestError, { caseId });

      // If Inngest fails, fall back to the old process-job endpoint
      console.warn('[Generate] Inngest failed, falling back to process-job endpoint');

      return NextResponse.json({
        success: true,
        caseId,
        message: 'Case created. Inngest unavailable - use process endpoint.',
        progressEndpoint: `/api/progress/${caseId}`,
        processEndpoint: `/api/process-job/${caseId}`,
        status: 'ready',
        fallback: true,
      });
    }

    // Return immediately - Inngest will handle the rest
    return NextResponse.json({
      success: true,
      caseId,
      message: 'Document generation started! This will take 15-30 minutes.',
      progressEndpoint: `/api/progress/${caseId}`,
      status: 'processing',
      estimatedTime: '15-30 minutes',
    });
  } catch (error: any) {
    logError('generate POST', error, { caseId });

    // Update case with error if we have a caseId and Supabase
    if (caseId && supabase) {
      try {
        await supabase
          .from('petition_cases')
          .update({
            status: 'failed',
            error_message: error.message || 'Failed to start generation',
            updated_at: new Date().toISOString(),
          })
          .eq('case_id', caseId);
      } catch (updateError) {
        logError('Database - update error status', updateError);
      }
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to start generation',
        caseId: caseId || null,
      },
      { status: 500 }
    );
  }
}

// Helper function to generate case ID
function generateCaseId(name: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const nameHash = name
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 4)
    .toUpperCase();
  return `${nameHash}${timestamp}`;
}
