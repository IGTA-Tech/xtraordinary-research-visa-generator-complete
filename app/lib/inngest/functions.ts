import { inngest } from './client';
import { logError } from '../retry-helper';
import { BeneficiaryInfo } from '../../types';
import { setProgress, completeProgress } from '../progress-store';
import { sendDocumentsEmail } from '../email-service';
import {
  prepareGenerationContext,
  generateDocument1,
  generateDocument2,
  generateDocument3,
  generateDocument4,
  generateDocument5,
  generateDocument6,
  generateDocument7,
  generateDocument8,
  PreparationData,
} from '../document-steps';

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

/**
 * Inngest function for generating visa petition documents
 *
 * REFACTORED: Each document is generated in its own step to avoid timeouts.
 * Each step should complete within 5 minutes.
 */
export const generatePetitionFunction = inngest.createFunction(
  {
    id: 'generate-petition-documents',
    name: 'Generate Visa Petition Documents',
    retries: 2,
    concurrency: {
      limit: 1,
      key: 'event.data.caseId',
    },
  },
  { event: 'petition/generate' },
  async ({ event, step }) => {
    const { caseId, beneficiaryInfo, urls, uploadedFiles } = event.data;

    const supabase = getOptionalSupabase();
    console.log(`[Inngest] Starting for case ${caseId}, Supabase: ${supabase ? 'connected' : 'unavailable'}`);

    // Helper to update progress
    const updateProgress = async (stage: string, percentage: number, message: string) => {
      setProgress(caseId, {
        status: percentage === 100 ? 'completed' : 'generating',
        progress: percentage,
        currentStage: stage,
        currentMessage: message,
      });

      if (supabase) {
        try {
          await supabase
            .from('petition_cases')
            .update({
              status: percentage === 100 ? 'completed' : 'generating',
              progress_percentage: percentage,
              current_stage: stage,
              current_message: message,
              updated_at: new Date().toISOString(),
            })
            .eq('case_id', caseId);
        } catch (error) {
          logError('updateProgress DB', error, { caseId });
        }
      }
    };

    // Step 1: Mark as started
    await step.run('mark-started', async () => {
      console.log(`[Inngest] Step 1: Starting for case ${caseId}`);
      await updateProgress('Starting', 5, 'Initializing document generation...');
      return { started: true };
    });

    // Step 2: Prepare beneficiary info
    const preparedInfo = await step.run('prepare-info', async () => {
      console.log(`[Inngest] Step 2: Preparing beneficiary info`);
      await updateProgress('Preparing', 8, 'Preparing beneficiary information...');

      const info: BeneficiaryInfo = {
        fullName: beneficiaryInfo.fullName,
        profession: beneficiaryInfo.profession,
        visaType: beneficiaryInfo.visaType,
        nationality: beneficiaryInfo.nationality,
        currentStatus: beneficiaryInfo.currentStatus,
        fieldOfExpertise: beneficiaryInfo.fieldOfExpertise,
        backgroundInfo: beneficiaryInfo.backgroundInfo,
        petitionerName: beneficiaryInfo.petitionerName,
        petitionerOrganization: beneficiaryInfo.petitionerOrganization,
        additionalInfo: beneficiaryInfo.additionalInfo,
        recipientEmail: beneficiaryInfo.recipientEmail,
        briefType: beneficiaryInfo.briefType,
        primaryUrls: urls.map((u: { url: string }) => u.url),
        uploadedFiles: uploadedFiles.map((f: { filename: string; fileType: string; extractedText?: string; wordCount?: number }) => ({
          filename: f.filename,
          fileType: f.fileType,
          extractedText: f.extractedText || '',
          wordCount: f.wordCount || 0,
        })),
      };

      return info;
    });

    // Step 3: Prepare context (knowledge base, URLs)
    const prepData: PreparationData = await step.run('prepare-context', async () => {
      console.log(`[Inngest] Step 3: Preparing generation context`);
      await updateProgress('Preparing Context', 10, 'Loading knowledge base and fetching URLs...');
      return await prepareGenerationContext(preparedInfo as BeneficiaryInfo);
    });

    // Step 4: Generate Document 1 - Comprehensive Analysis
    const document1 = await step.run('generate-doc-1', async () => {
      console.log(`[Inngest] Step 4: Generating Document 1`);
      await updateProgress('Document 1', 20, 'Generating Comprehensive Analysis...');
      return await generateDocument1(preparedInfo as BeneficiaryInfo, prepData as PreparationData);
    });

    // Step 5: Generate Document 2 - Publication Analysis
    const document2 = await step.run('generate-doc-2', async () => {
      console.log(`[Inngest] Step 5: Generating Document 2`);
      await updateProgress('Document 2', 35, 'Generating Publication Analysis...');
      return await generateDocument2(preparedInfo as BeneficiaryInfo, prepData as PreparationData, document1);
    });

    // Step 6: Generate Document 3 - URL Reference
    const document3 = await step.run('generate-doc-3', async () => {
      console.log(`[Inngest] Step 6: Generating Document 3`);
      await updateProgress('Document 3', 45, 'Generating URL Reference...');
      return await generateDocument3(preparedInfo as BeneficiaryInfo, prepData as PreparationData);
    });

    // Step 7: Generate Document 4 - Legal Brief
    const document4 = await step.run('generate-doc-4', async () => {
      console.log(`[Inngest] Step 7: Generating Document 4`);
      await updateProgress('Document 4', 55, 'Generating Legal Brief...');
      return await generateDocument4(preparedInfo as BeneficiaryInfo, prepData as PreparationData, document1, document2);
    });

    // Step 8: Generate Document 5 - Evidence Gap Analysis
    const document5 = await step.run('generate-doc-5', async () => {
      console.log(`[Inngest] Step 8: Generating Document 5`);
      await updateProgress('Document 5', 65, 'Generating Evidence Gap Analysis...');
      return await generateDocument5(preparedInfo as BeneficiaryInfo, prepData as PreparationData, document1);
    });

    // Step 9: Generate Document 6 - Cover Letter
    const document6 = await step.run('generate-doc-6', async () => {
      console.log(`[Inngest] Step 9: Generating Document 6`);
      await updateProgress('Document 6', 75, 'Generating Cover Letter...');
      return await generateDocument6(preparedInfo as BeneficiaryInfo, document1);
    });

    // Step 10: Generate Document 7 - Visa Checklist
    const document7 = await step.run('generate-doc-7', async () => {
      console.log(`[Inngest] Step 10: Generating Document 7`);
      await updateProgress('Document 7', 82, 'Generating Visa Checklist...');
      return await generateDocument7(preparedInfo as BeneficiaryInfo, document5);
    });

    // Step 11: Generate Document 8 - Exhibit Guide
    const document8 = await step.run('generate-doc-8', async () => {
      console.log(`[Inngest] Step 11: Generating Document 8`);
      await updateProgress('Document 8', 90, 'Generating Exhibit Assembly Guide...');
      return await generateDocument8(preparedInfo as BeneficiaryInfo, prepData as PreparationData, document4);
    });

    // Step 12: Save to database
    await step.run('save-documents', async () => {
      console.log(`[Inngest] Step 12: Saving documents`);
      await updateProgress('Saving', 95, 'Saving documents to database...');

      if (!supabase) {
        console.log('[Inngest] Skipping DB save - Supabase unavailable');
        return { saved: false };
      }

      const documents = [
        { number: 1, name: 'Comprehensive Analysis', type: 'analysis', content: document1 },
        { number: 2, name: 'Publication Analysis', type: 'analysis', content: document2 },
        { number: 3, name: 'URL Reference', type: 'reference', content: document3 },
        { number: 4, name: 'Legal Brief', type: 'brief', content: document4 },
        { number: 5, name: 'Evidence Gap Analysis', type: 'analysis', content: document5 },
        { number: 6, name: 'USCIS Cover Letter', type: 'letter', content: document6 },
        { number: 7, name: 'Visa Checklist', type: 'checklist', content: document7 },
        { number: 8, name: 'Exhibit Assembly Guide', type: 'guide', content: document8 },
      ];

      for (const doc of documents) {
        try {
          await supabase
            .from('generated_documents')
            .upsert({
              case_id: caseId,
              document_number: doc.number,
              document_name: doc.name,
              document_type: doc.type,
              content: doc.content,
              word_count: doc.content?.split(/\s+/).length || 0,
              page_estimate: Math.ceil((doc.content?.split(/\s+/).length || 0) / 500),
              generated_at: new Date().toISOString(),
            }, { onConflict: 'case_id,document_number' });
        } catch (error) {
          logError(`Save doc ${doc.number}`, error, { caseId });
        }
      }

      return { saved: true };
    });

    // Step 13: Mark completed
    await step.run('mark-completed', async () => {
      console.log(`[Inngest] Step 13: Marking complete`);

      const documents = [
        { name: 'Comprehensive Analysis', content: document1, pageCount: Math.ceil((document1?.length || 0) / 3000), wordCount: document1?.split(/\s+/).length || 0 },
        { name: 'Publication Analysis', content: document2, pageCount: Math.ceil((document2?.length || 0) / 3000), wordCount: document2?.split(/\s+/).length || 0 },
        { name: 'URL Reference', content: document3, pageCount: Math.ceil((document3?.length || 0) / 3000), wordCount: document3?.split(/\s+/).length || 0 },
        { name: 'Legal Brief', content: document4, pageCount: Math.ceil((document4?.length || 0) / 3000), wordCount: document4?.split(/\s+/).length || 0 },
        { name: 'Evidence Gap Analysis', content: document5, pageCount: Math.ceil((document5?.length || 0) / 3000), wordCount: document5?.split(/\s+/).length || 0 },
        { name: 'USCIS Cover Letter', content: document6, pageCount: Math.ceil((document6?.length || 0) / 3000), wordCount: document6?.split(/\s+/).length || 0 },
        { name: 'Visa Checklist', content: document7, pageCount: Math.ceil((document7?.length || 0) / 3000), wordCount: document7?.split(/\s+/).length || 0 },
        { name: 'Exhibit Assembly Guide', content: document8, pageCount: Math.ceil((document8?.length || 0) / 3000), wordCount: document8?.split(/\s+/).length || 0 },
      ];

      completeProgress(caseId, documents);

      if (supabase) {
        await supabase
          .from('petition_cases')
          .update({
            status: 'completed',
            progress_percentage: 100,
            current_stage: 'Complete',
            current_message: 'All 8 documents generated successfully!',
            completed_at: new Date().toISOString(),
          })
          .eq('case_id', caseId);
      }

      return { completed: true };
    });

    // Step 14: Send email
    await step.run('send-email', async () => {
      if (!beneficiaryInfo.recipientEmail) {
        console.log(`[Inngest] No email provided, skipping`);
        return { sent: false };
      }

      console.log(`[Inngest] Step 14: Sending email to ${beneficiaryInfo.recipientEmail}`);

      try {
        const docs = [
          { name: 'Document 1 - Comprehensive Analysis', content: document1, pageCount: 1 },
          { name: 'Document 2 - Publication Analysis', content: document2, pageCount: 1 },
          { name: 'Document 3 - URL Reference', content: document3, pageCount: 1 },
          { name: 'Document 4 - Legal Brief', content: document4, pageCount: 1 },
          { name: 'Document 5 - Evidence Gap Analysis', content: document5, pageCount: 1 },
          { name: 'Document 6 - USCIS Cover Letter', content: document6, pageCount: 1 },
          { name: 'Document 7 - Visa Checklist', content: document7, pageCount: 1 },
          { name: 'Document 8 - Exhibit Assembly Guide', content: document8, pageCount: 1 },
        ];

        await sendDocumentsEmail(preparedInfo as BeneficiaryInfo, docs);
        return { sent: true };
      } catch (error) {
        logError('send-email', error, { caseId });
        return { sent: false, error: String(error) };
      }
    });

    return {
      success: true,
      caseId,
      documentsGenerated: 8,
      message: 'All documents generated successfully',
    };
  }
);

export const inngestFunctions = [generatePetitionFunction];
