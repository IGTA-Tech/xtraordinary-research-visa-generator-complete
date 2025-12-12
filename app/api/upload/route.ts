import { NextRequest, NextResponse } from 'next/server';
import { processFile } from '@/app/lib/file-processor';
import { logError } from '@/app/lib/retry-helper';

// Try to get Supabase client - returns null if unavailable
function getOptionalSupabase() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('[Upload] Supabase not configured - running in local mode');
      return null;
    }

    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.warn('[Upload] Failed to initialize Supabase:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const caseId = formData.get('caseId') as string;

    // Validate required fields
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const supabase = getOptionalSupabase();
    const uploadedFiles = [];
    const failedFiles = [];

    console.log(`[Upload] Processing ${files.length} file(s)${caseId ? ` for case ${caseId}` : ''} (Supabase: ${supabase ? 'available' : 'local mode'})`);

    for (const file of files) {
      try {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'image/jpeg',
          'image/png',
          'text/plain',
        ];

        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} not supported. Allowed: PDF, DOCX, DOC, JPG, PNG, TXT`);
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File exceeds 50MB limit`);
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storagePath = caseId
          ? `uploads/${caseId}/${fileName}`
          : `uploads/temp/${fileName}`;

        let storageUrl = '';
        let storageSuccess = false;

        // Try to upload to Supabase if available
        if (supabase) {
          try {
            console.log(`[Upload] Uploading ${file.name} to Supabase storage`);

            const { error } = await supabase.storage
              .from('petition-files')
              .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true,
              });

            if (error) {
              console.warn(`[Upload] Supabase upload failed: ${error.message}`);
            } else {
              const { data: urlData } = supabase.storage
                .from('petition-files')
                .getPublicUrl(storagePath);
              storageUrl = urlData.publicUrl;
              storageSuccess = true;
              console.log(`[Upload] Uploaded to Supabase: ${storagePath}`);
            }
          } catch (supabaseError) {
            console.warn('[Upload] Supabase storage error:', supabaseError);
          }
        }

        // Process file to extract text (the important part for generation)
        let extractedText = '';
        let pageCount = 0;
        let wordCount = 0;

        if (
          file.type === 'application/pdf' ||
          file.type.includes('word') ||
          file.type.includes('document')
        ) {
          try {
            console.log(`[Upload] Extracting text from ${file.name}`);
            const processedFile = await processFile(buffer, file.name);
            extractedText = processedFile.extractedText;
            pageCount = processedFile.pageCount || 0;
            wordCount = processedFile.wordCount || 0;
            console.log(`[Upload] Extracted ${wordCount} words, ${pageCount} pages from ${file.name}`);
          } catch (processError) {
            logError('processFile', processError, { fileName: file.name });
            console.warn(`[Upload] Text extraction failed for ${file.name}, continuing...`);
          }
        } else if (file.type === 'text/plain') {
          // Handle plain text files directly
          extractedText = buffer.toString('utf-8');
          wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;
          pageCount = 1;
        }

        // File processed successfully - add to uploaded list
        uploadedFiles.push({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storagePath: storageSuccess ? storagePath : '',
          storageUrl,
          extractedText,
          pageCount,
          wordCount,
          storedInCloud: storageSuccess,
        });

        console.log(`[Upload] Successfully processed ${file.name} (cloud: ${storageSuccess}, text: ${extractedText.length > 0})`);
      } catch (fileError) {
        const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
        logError('Upload file', fileError, { fileName: file.name });
        failedFiles.push({
          fileName: file.name,
          error: errorMessage,
        });
      }
    }

    // Determine success based on whether we got useful data
    const successCount = uploadedFiles.length;
    const failCount = failedFiles.length;

    let message: string;
    if (failCount === 0) {
      message = `Successfully processed ${successCount} file(s)`;
    } else if (successCount > 0) {
      message = `Processed ${successCount} file(s), ${failCount} failed`;
    } else {
      message = `All ${failCount} file(s) failed to process`;
    }

    console.log(`[Upload] ${message}`);

    return NextResponse.json({
      success: successCount > 0,
      message,
      files: uploadedFiles,
      failed: failCount > 0 ? failedFiles : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload files';
    logError('upload POST', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve uploaded files for a case
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    const supabase = getOptionalSupabase();

    // If Supabase not available, return empty (files are in-memory only)
    if (!supabase) {
      console.log(`[Upload GET] Supabase not available - files only exist in session`);
      return NextResponse.json({
        success: true,
        files: [],
        message: 'Files stored in session only (cloud storage not configured)',
      });
    }

    console.log(`[Upload GET] Fetching files for case ${caseId}`);

    const { data, error } = await supabase
      .from('case_files')
      .select('*')
      .eq('case_id', caseId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.warn(`[Upload GET] Database error: ${error.message}`);
      return NextResponse.json({
        success: true,
        files: [],
        message: 'Could not fetch files from database',
      });
    }

    console.log(`[Upload GET] Found ${data?.length || 0} file(s) for case ${caseId}`);

    return NextResponse.json({
      success: true,
      files: data || [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get uploaded files';
    logError('upload GET', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
