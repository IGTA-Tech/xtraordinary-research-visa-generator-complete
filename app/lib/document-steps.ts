/**
 * Step-based document generation for Inngest
 *
 * Each function is designed to complete within 5 minutes for serverless compatibility.
 */

import { BeneficiaryInfo } from '../types';
import { getKnowledgeBaseFiles, buildKnowledgeBaseContext } from './knowledge-base';
import { fetchMultipleUrls, FetchedUrlData } from './url-fetcher';
import { conductPerplexityResearch } from './perplexity-research';
import { callAIWithFallback } from './document-generator';
import { logError, createFallbackContent } from './retry-helper';

// Type for serializable preparation data
export interface PreparationData {
  knowledgeBaseContext: string;
  fileEvidence: string;
  urlsAnalyzed: Array<{
    url: string;
    title: string;
    content: string;
    fetchedAt: string;
  }>;
  allUrls: string[];
}

/**
 * Step 1: Prepare all context data (knowledge base, files, URLs)
 * This step fetches and prepares all the data needed for document generation.
 */
export async function prepareGenerationContext(
  beneficiaryInfo: BeneficiaryInfo
): Promise<PreparationData> {
  console.log('[DocSteps] Starting preparation...');

  // Read Knowledge Base
  const knowledgeBaseFiles = await getKnowledgeBaseFiles(beneficiaryInfo.visaType);
  const knowledgeBaseContext = buildKnowledgeBaseContext(knowledgeBaseFiles, beneficiaryInfo.visaType);
  console.log('[DocSteps] Knowledge base loaded');

  // Process Uploaded Files
  let fileEvidence = '';
  if (beneficiaryInfo.uploadedFiles && beneficiaryInfo.uploadedFiles.length > 0) {
    fileEvidence = beneficiaryInfo.uploadedFiles
      .map(f => `File: ${f.filename}\n${f.extractedText || ''}`)
      .join('\n\n---\n\n');
    console.log(`[DocSteps] Processed ${beneficiaryInfo.uploadedFiles.length} files`);
  }

  // Gather URLs
  let allUrls = beneficiaryInfo.primaryUrls || [];

  // Try Perplexity research if configured
  if (process.env.PERPLEXITY_API_KEY && allUrls.length > 0) {
    try {
      const research = await conductPerplexityResearch(beneficiaryInfo);
      const discoveredUrls = research.discoveredSources.map(s => s.url);
      allUrls = Array.from(new Set([...allUrls, ...discoveredUrls]));
      console.log(`[DocSteps] Perplexity found ${discoveredUrls.length} additional URLs`);
    } catch (error) {
      logError('Perplexity Research', error);
    }
  }

  // Fetch URLs
  let urlsAnalyzed: FetchedUrlData[] = [];
  if (allUrls.length > 0) {
    try {
      urlsAnalyzed = await fetchMultipleUrls(allUrls);
      console.log(`[DocSteps] Fetched ${urlsAnalyzed.length} URLs`);
    } catch (error) {
      logError('Fetch URLs', error);
    }
  }

  return {
    knowledgeBaseContext,
    fileEvidence,
    urlsAnalyzed: urlsAnalyzed.map(u => ({
      url: u.url,
      title: u.title,
      content: u.content.substring(0, 10000), // Limit content size for serialization
      fetchedAt: new Date().toISOString(),
    })),
    allUrls,
  };
}

/**
 * Step 2: Generate Document 1 - Comprehensive Analysis
 */
export async function generateDocument1(
  beneficiaryInfo: BeneficiaryInfo,
  prepData: PreparationData
): Promise<string> {
  console.log('[DocSteps] Generating Document 1 - Comprehensive Analysis...');

  const urlContext = prepData.urlsAnalyzed
    .map((url, i) => `URL ${i + 1}: ${url.url}\nTitle: ${url.title}\nContent: ${url.content.substring(0, 2000)}...`)
    .join('\n\n');

  const prompt = `You are an expert immigration law analyst specializing in ${beneficiaryInfo.visaType} visa petitions.

BENEFICIARY INFORMATION:
- Name: ${beneficiaryInfo.fullName}
- Visa Type: ${beneficiaryInfo.visaType}
- Field/Profession: ${beneficiaryInfo.profession || beneficiaryInfo.fieldOfExpertise}
- Background: ${beneficiaryInfo.backgroundInfo || 'Not provided'}

UPLOADED DOCUMENT EVIDENCE:
${prepData.fileEvidence || 'No documents uploaded'}

URL EVIDENCE:
${urlContext || 'No URLs provided'}

KNOWLEDGE BASE:
${prepData.knowledgeBaseContext.substring(0, 5000)}

Generate a COMPREHENSIVE ANALYSIS document for this ${beneficiaryInfo.visaType} visa petition.

This should be a detailed analysis covering:
1. Executive Summary
2. Beneficiary Profile and Qualifications
3. Analysis of Each Applicable Criterion
4. Evidence Assessment for Each Criterion
5. Strengths of the Case
6. Areas Requiring Additional Evidence
7. Strategic Recommendations
8. Conclusion

Write in professional legal style. Be thorough and specific. Reference the actual evidence provided.
Target length: 15-25 pages.`;

  try {
    const result = await callAIWithFallback(prompt, '', 16384, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument1', error);
    return createFallbackContent('Comprehensive Analysis', beneficiaryInfo);
  }
}

/**
 * Step 3: Generate Document 2 - Publication Analysis
 */
export async function generateDocument2(
  beneficiaryInfo: BeneficiaryInfo,
  prepData: PreparationData,
  document1: string
): Promise<string> {
  console.log('[DocSteps] Generating Document 2 - Publication Analysis...');

  const prompt = `You are an expert at analyzing publications and media coverage for immigration visa petitions.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}
FIELD: ${beneficiaryInfo.profession || beneficiaryInfo.fieldOfExpertise}

PREVIOUS ANALYSIS SUMMARY:
${document1.substring(0, 3000)}...

URL EVIDENCE:
${prepData.urlsAnalyzed.map(u => `- ${u.title}: ${u.url}`).join('\n')}

Generate a PUBLICATION ANALYSIS document that:
1. Catalogs all publications, articles, and media coverage
2. Analyzes the significance of each publication
3. Evaluates the reach and impact of coverage
4. Identifies tier 1 (major) vs tier 2 publications
5. Provides citation-ready references
6. Summarizes overall media presence

Target length: 10-15 pages.`;

  try {
    const result = await callAIWithFallback(prompt, '', 12000, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument2', error);
    return createFallbackContent('Publication Analysis', beneficiaryInfo);
  }
}

/**
 * Step 4: Generate Document 3 - URL Reference
 */
export async function generateDocument3(
  beneficiaryInfo: BeneficiaryInfo,
  prepData: PreparationData
): Promise<string> {
  console.log('[DocSteps] Generating Document 3 - URL Reference...');

  const prompt = `Create an organized URL REFERENCE DOCUMENT for this visa petition.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}

URLS TO CATALOG:
${prepData.urlsAnalyzed.map((u, i) => `${i + 1}. ${u.url}\n   Title: ${u.title}`).join('\n\n')}

Generate a comprehensive URL reference that:
1. Organizes URLs by category (publications, awards, memberships, etc.)
2. Provides a brief description of each URL's relevance
3. Indicates which visa criterion each URL supports
4. Includes retrieval dates
5. Notes any archival recommendations

Format as a professional exhibit reference document.`;

  try {
    const result = await callAIWithFallback(prompt, '', 8000, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument3', error);
    return createFallbackContent('URL Reference', beneficiaryInfo);
  }
}

/**
 * Step 5: Generate Document 4 - Legal Brief
 */
export async function generateDocument4(
  beneficiaryInfo: BeneficiaryInfo,
  prepData: PreparationData,
  document1: string,
  document2: string
): Promise<string> {
  console.log('[DocSteps] Generating Document 4 - Legal Brief...');

  const prompt = `You are an experienced immigration attorney drafting a legal brief for a ${beneficiaryInfo.visaType} visa petition.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}
FIELD: ${beneficiaryInfo.profession || beneficiaryInfo.fieldOfExpertise}

COMPREHENSIVE ANALYSIS EXCERPT:
${document1.substring(0, 4000)}...

PUBLICATION ANALYSIS EXCERPT:
${document2.substring(0, 2000)}...

KNOWLEDGE BASE:
${prepData.knowledgeBaseContext.substring(0, 3000)}

Draft a PROFESSIONAL LEGAL BRIEF that:
1. Introduces the beneficiary and petition
2. States the legal standard for ${beneficiaryInfo.visaType}
3. Argues how beneficiary meets each criterion with evidence citations
4. References relevant case law and AAO decisions
5. Addresses potential weaknesses preemptively
6. Concludes with a strong summary

Use proper legal brief formatting and citations.
Target length: 20-30 pages.`;

  try {
    const result = await callAIWithFallback(prompt, '', 16384, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument4', error);
    return createFallbackContent('Legal Brief', beneficiaryInfo);
  }
}

/**
 * Step 6: Generate Document 5 - Evidence Gap Analysis
 */
export async function generateDocument5(
  beneficiaryInfo: BeneficiaryInfo,
  prepData: PreparationData,
  document1: string
): Promise<string> {
  console.log('[DocSteps] Generating Document 5 - Evidence Gap Analysis...');

  const prompt = `You are an immigration case analyst identifying evidence gaps and scoring criteria strength.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}

COMPREHENSIVE ANALYSIS EXCERPT:
${document1.substring(0, 5000)}...

NUMBER OF URLS PROVIDED: ${prepData.urlsAnalyzed.length}
NUMBER OF FILES PROVIDED: ${prepData.fileEvidence ? 'Yes' : 'None'}

Generate an EVIDENCE GAP ANALYSIS that:
1. Lists each criterion for ${beneficiaryInfo.visaType}
2. Scores current evidence strength (1-10) for each criterion
3. Identifies specific gaps in documentation
4. Recommends additional evidence to obtain
5. Prioritizes gaps by importance
6. Provides actionable next steps
7. Estimates overall case strength

Be specific and practical in recommendations.`;

  try {
    const result = await callAIWithFallback(prompt, '', 10000, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument5', error);
    return createFallbackContent('Evidence Gap Analysis', beneficiaryInfo);
  }
}

/**
 * Step 7: Generate Document 6 - Cover Letter
 */
export async function generateDocument6(
  beneficiaryInfo: BeneficiaryInfo,
  document1: string
): Promise<string> {
  console.log('[DocSteps] Generating Document 6 - Cover Letter...');

  const prompt = `Draft a professional USCIS COVER LETTER for this ${beneficiaryInfo.visaType} petition.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}
FIELD: ${beneficiaryInfo.profession || beneficiaryInfo.fieldOfExpertise}
PETITIONER: ${beneficiaryInfo.petitionerName || 'Self-petitioned'}
ORGANIZATION: ${beneficiaryInfo.petitionerOrganization || 'N/A'}

CASE SUMMARY:
${document1.substring(0, 3000)}...

Generate a COVER LETTER that:
1. Is addressed to USCIS
2. Introduces the petition and beneficiary
3. Summarizes qualifications in 2-3 paragraphs
4. Lists enclosed exhibits/evidence
5. Requests approval of the petition
6. Includes professional closing

Format as a formal business letter ready for submission.`;

  try {
    const result = await callAIWithFallback(prompt, '', 4000, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument6', error);
    return createFallbackContent('Cover Letter', beneficiaryInfo);
  }
}

/**
 * Step 8: Generate Document 7 - Visa Checklist
 */
export async function generateDocument7(
  beneficiaryInfo: BeneficiaryInfo,
  document5: string
): Promise<string> {
  console.log('[DocSteps] Generating Document 7 - Visa Checklist...');

  const prompt = `Create a VISA PETITION CHECKLIST for this ${beneficiaryInfo.visaType} case.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}

EVIDENCE GAP ANALYSIS:
${document5.substring(0, 4000)}...

Generate a comprehensive CHECKLIST that includes:
1. Required forms and fees
2. Identity documents needed
3. Evidence checklist by criterion
4. Status of each item (gathered/needed/in progress)
5. Filing timeline recommendations
6. Quick reference scorecard
7. Contact information sections to fill

Format as a practical, actionable checklist document.`;

  try {
    const result = await callAIWithFallback(prompt, '', 6000, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument7', error);
    return createFallbackContent('Visa Checklist', beneficiaryInfo);
  }
}

/**
 * Step 9: Generate Document 8 - Exhibit Guide
 */
export async function generateDocument8(
  beneficiaryInfo: BeneficiaryInfo,
  prepData: PreparationData,
  document4: string
): Promise<string> {
  console.log('[DocSteps] Generating Document 8 - Exhibit Guide...');

  const prompt = `Create an EXHIBIT ASSEMBLY GUIDE for this ${beneficiaryInfo.visaType} petition.

BENEFICIARY: ${beneficiaryInfo.fullName}
VISA TYPE: ${beneficiaryInfo.visaType}

LEGAL BRIEF EXCERPT:
${document4.substring(0, 3000)}...

EVIDENCE URLS:
${prepData.urlsAnalyzed.map((u, i) => `Exhibit ${i + 1}: ${u.title}`).join('\n')}

Generate an EXHIBIT ASSEMBLY GUIDE that:
1. Lists all exhibits in recommended order
2. Provides exhibit labels and tab numbers
3. Explains the purpose of each exhibit
4. Gives assembly instructions
5. Notes any exhibits that need to be printed/obtained
6. Includes a table of contents for the exhibit binder

Format as step-by-step assembly instructions.`;

  try {
    const result = await callAIWithFallback(prompt, '', 6000, 0.3);
    return result;
  } catch (error) {
    logError('generateDocument8', error);
    return createFallbackContent('Exhibit Guide', beneficiaryInfo);
  }
}
