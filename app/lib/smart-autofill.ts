import Anthropic from '@anthropic-ai/sdk';
import { callAIWithFallback } from './document-generator';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AutoFillData {
  // Beneficiary Information
  beneficiaryBackground?: string; // 2-3 paragraph background
  nationality?: string;
  currentStatus?: string; // Current visa status
  fieldOfExpertise?: string;
  additionalInfo?: string;

  // Petitioner Information (if found in context)
  petitionerName?: string;
  petitionerOrganization?: string;
  petitionerRole?: string; // e.g., "Employer", "Agent", "Sponsor"
  petitionerRelationship?: string; // Relationship to beneficiary

  // Suggested Information
  suggestedVisaType?: 'O-1A' | 'O-1B' | 'P-1A' | 'EB-1A';
  suggestedVisaReason?: string; // Why this visa type

  // Extracted Key Facts
  extractedAchievements?: string[];
  extractedAwards?: string[];
  extractedPublications?: string[];
  extractedMediaMentions?: string[];

  // Confidence and Metadata
  confidence: 'high' | 'medium' | 'low';
  sourcesUsed: string[]; // Which documents/URLs were analyzed
  extractionNotes?: string; // Any caveats or notes
}

/**
 * Smart auto-fill that extracts ALL possible form fields from context
 *
 * This addresses the issue where previous versions only filled "additional info"
 * Now it intelligently fills: background, petitioner info, achievements, etc.
 *
 * IMPORTANT: Provides suggestions but NEVER assumes - user confirms each field
 */
export async function smartAutoFill(
  documentsText: string,
  urlsContext?: string,
  beneficiaryName?: string,
  profession?: string
): Promise<AutoFillData> {
  const prompt = `You are analyzing documents and web sources to help auto-fill a visa petition form.

CONTEXT PROVIDED:
${beneficiaryName ? `Beneficiary Name: ${beneficiaryName}` : ''}
${profession ? `Profession: ${profession}` : ''}

DOCUMENTS/SOURCES CONTENT:
${documentsText}

${urlsContext ? `\nADDITIONAL URL CONTEXT:\n${urlsContext}` : ''}

TASK: Extract and organize information to pre-fill form fields. Be thorough but NEVER make assumptions.

EXTRACT THE FOLLOWING (mark as null if not found):

1. BENEFICIARY BACKGROUND (2-3 paragraphs):
   - Professional history and current role
   - Key achievements and recognition
   - International experience and impact
   - Why they qualify for extraordinary ability status
   - Use formal, professional tone suitable for legal document

2. BENEFICIARY DETAILS:
   - Nationality (if mentioned)
   - Current visa status (if mentioned)
   - Field of expertise (specific area within profession)

3. PETITIONER INFORMATION (if mentioned):
   - Petitioner name (person or organization filing petition)
   - Petitioner organization name
   - Petitioner role (employer, agent, sponsor, etc.)
   - Relationship to beneficiary (employer, sponsor, representative, etc.)

   IMPORTANT: Only extract petitioner info if CLEARLY stated in documents.
   Common scenarios:
   - Employment letter → Petitioner is employer
   - Agent contract → Petitioner is talent agency
   - Invitation letter → Petitioner is inviting organization

   If unclear or not mentioned, mark as null.

4. SUGGESTED VISA TYPE:
   Based on the evidence, which visa seems most appropriate?
   - O-1A: Extraordinary ability in sciences, education, business, athletics
   - O-1B: Extraordinary ability in arts, motion pictures, television
   - P-1A: Internationally recognized athlete
   - EB-1A: Extraordinary ability (green card)

   Provide reasoning for suggestion.

5. EXTRACTED KEY FACTS:
   - List of specific achievements (with dates if available)
   - Awards and honors received
   - Publications or creative works
   - Media mentions or press coverage

6. ADDITIONAL INFORMATION:
   - Salary information (if mentioned)
   - Notable collaborations
   - Industry leadership positions
   - Any other relevant details not captured above

OUTPUT FORMAT (JSON):
{
  "beneficiaryBackground": "Professional background narrative (2-3 paragraphs) or null",
  "nationality": "Country name or null",
  "currentStatus": "Current visa status or null",
  "fieldOfExpertise": "Specific field or null",
  "additionalInfo": "Additional relevant information or null",

  "petitionerName": "Name or null",
  "petitionerOrganization": "Organization name or null",
  "petitionerRole": "employer/agent/sponsor/other or null",
  "petitionerRelationship": "Description of relationship or null",

  "suggestedVisaType": "O-1A/O-1B/P-1A/EB-1A or null",
  "suggestedVisaReason": "Brief explanation of why this visa type or null",

  "extractedAchievements": ["achievement 1", "achievement 2", ...] or [],
  "extractedAwards": ["award 1", "award 2", ...] or [],
  "extractedPublications": ["publication 1", "publication 2", ...] or [],
  "extractedMediaMentions": ["mention 1", "mention 2", ...] or [],

  "confidence": "high/medium/low",
  "sourcesUsed": ["document type 1", "document type 2", ...],
  "extractionNotes": "Any important notes or caveats or null"
}

IMPORTANT RULES:
1. If information is not clearly stated, use null - DO NOT guess or infer
2. For petitioner info especially, only extract if explicitly mentioned
3. Mark confidence as "high" only if information is very clear
4. Include extraction notes if there's any ambiguity
5. Focus on facts that can be verified from the provided content

BEGIN EXTRACTION:`;

  try {
    const textResponse = await callAIWithFallback(
      prompt,
      '', // no system prompt
      4096, // max_tokens
      0.2 // temperature
    );

    // Parse JSON response
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and return structured data
    return {
      beneficiaryBackground: result.beneficiaryBackground || undefined,
      nationality: result.nationality || undefined,
      currentStatus: result.currentStatus || undefined,
      fieldOfExpertise: result.fieldOfExpertise || undefined,
      additionalInfo: result.additionalInfo || undefined,

      petitionerName: result.petitionerName || undefined,
      petitionerOrganization: result.petitionerOrganization || undefined,
      petitionerRole: result.petitionerRole || undefined,
      petitionerRelationship: result.petitionerRelationship || undefined,

      suggestedVisaType: result.suggestedVisaType || undefined,
      suggestedVisaReason: result.suggestedVisaReason || undefined,

      extractedAchievements: result.extractedAchievements || [],
      extractedAwards: result.extractedAwards || [],
      extractedPublications: result.extractedPublications || [],
      extractedMediaMentions: result.extractedMediaMentions || [],

      confidence: result.confidence || 'low',
      sourcesUsed: result.sourcesUsed || [],
      extractionNotes: result.extractionNotes || undefined,
    };
  } catch (error) {
    console.error('Error in smart auto-fill:', error);

    // Return minimal data on error
    return {
      confidence: 'low',
      sourcesUsed: [],
      extractionNotes: `Error during extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Merge auto-fill data with user-provided data
 * User data always takes precedence
 */
export function mergeAutoFillWithUserData(
  autoFillData: AutoFillData,
  userData: Partial<AutoFillData>
): AutoFillData {
  return {
    ...autoFillData,
    ...userData, // User data overrides auto-fill
  };
}

/**
 * Generate a summary of what was auto-filled
 * Useful for showing user what the AI extracted
 */
export function getAutoFillSummary(data: AutoFillData): string {
  const filled: string[] = [];

  if (data.beneficiaryBackground) filled.push('Background narrative');
  if (data.nationality) filled.push('Nationality');
  if (data.currentStatus) filled.push('Current status');
  if (data.fieldOfExpertise) filled.push('Field of expertise');
  if (data.petitionerName) filled.push('Petitioner name');
  if (data.petitionerOrganization) filled.push('Petitioner organization');
  if (data.suggestedVisaType) filled.push('Suggested visa type');
  if (data.extractedAchievements?.length) filled.push(`${data.extractedAchievements.length} achievements`);
  if (data.extractedAwards?.length) filled.push(`${data.extractedAwards.length} awards`);

  if (filled.length === 0) {
    return 'No fields could be auto-filled from the provided documents.';
  }

  return `Auto-filled: ${filled.join(', ')}`;
}
