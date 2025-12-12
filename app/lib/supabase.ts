import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Database types
export interface PetitionCase {
  id: string;
  beneficiary_name: string;
  visa_type: string;
  recipient_email: string;
  status: 'processing' | 'completed' | 'error';
  stripe_session_id?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  progress_stage?: string;
  progress_percent?: number;
  progress_message?: string;
}

export interface GeneratedDocument {
  id: string;
  case_id: string;
  document_number: number;
  document_name: string;
  storage_path: string;
  public_url: string;
  word_count: number;
  page_count: number;
  created_at: string;
}

/**
 * Upload a document to Supabase Storage
 */
export async function uploadDocument(
  caseId: string,
  fileName: string,
  content: string
): Promise<{ path: string; url: string }> {
  const filePath = `petitions/${caseId}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('petition-documents')
    .upload(filePath, content, {
      contentType: 'text/markdown',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload document: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('petition-documents')
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: publicUrlData.publicUrl,
  };
}

/**
 * Create a new petition case in the database
 */
export async function createPetitionCase(
  caseId: string,
  beneficiaryInfo: any,
  stripeSessionId?: string
): Promise<void> {
  const { error } = await supabase.from('petition_cases').insert({
    id: caseId,
    beneficiary_name: beneficiaryInfo.fullName,
    visa_type: beneficiaryInfo.visaType,
    recipient_email: beneficiaryInfo.recipientEmail,
    status: 'processing',
    stripe_session_id: stripeSessionId,
    progress_stage: 'Initializing',
    progress_percent: 0,
    progress_message: 'Starting document generation...',
  });

  if (error) {
    throw new Error(`Failed to create petition case: ${error.message}`);
  }
}

/**
 * Update petition case progress
 */
export async function updateCaseProgress(
  caseId: string,
  stage: string,
  percent: number,
  message: string
): Promise<void> {
  const { error } = await supabase
    .from('petition_cases')
    .update({
      progress_stage: stage,
      progress_percent: percent,
      progress_message: message,
    })
    .eq('id', caseId);

  if (error) {
    console.error('Failed to update progress:', error);
  }
}

/**
 * Mark petition case as completed
 */
export async function completePetitionCase(caseId: string): Promise<void> {
  const { error } = await supabase
    .from('petition_cases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      progress_stage: 'Complete',
      progress_percent: 100,
      progress_message: 'Documents generated and emailed successfully!',
    })
    .eq('id', caseId);

  if (error) {
    throw new Error(`Failed to complete petition case: ${error.message}`);
  }
}

/**
 * Mark petition case as error
 */
export async function errorPetitionCase(
  caseId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('petition_cases')
    .update({
      status: 'error',
      error_message: errorMessage,
      progress_stage: 'Error',
      progress_percent: 0,
      progress_message: 'An error occurred during generation',
    })
    .eq('id', caseId);

  if (error) {
    console.error('Failed to update error status:', error);
  }
}

/**
 * Save generated document metadata to database
 */
export async function saveDocumentMetadata(
  caseId: string,
  documentNumber: number,
  documentName: string,
  storagePath: string,
  publicUrl: string,
  wordCount: number,
  pageCount: number
): Promise<void> {
  const { error } = await supabase.from('generated_documents').insert({
    case_id: caseId,
    document_number: documentNumber,
    document_name: documentName,
    storage_path: storagePath,
    public_url: publicUrl,
    word_count: wordCount,
    page_count: pageCount,
  });

  if (error) {
    throw new Error(`Failed to save document metadata: ${error.message}`);
  }
}

/**
 * Get petition case by ID
 */
export async function getPetitionCase(
  caseId: string
): Promise<PetitionCase | null> {
  const { data, error } = await supabase
    .from('petition_cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get petition case: ${error.message}`);
  }

  return data;
}

/**
 * Get all documents for a case
 */
export async function getCaseDocuments(
  caseId: string
): Promise<GeneratedDocument[]> {
  const { data, error } = await supabase
    .from('generated_documents')
    .select('*')
    .eq('case_id', caseId)
    .order('document_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to get case documents: ${error.message}`);
  }

  return data || [];
}
