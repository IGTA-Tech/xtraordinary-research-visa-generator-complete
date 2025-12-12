/**
 * RFE (Request for Evidence) Processor
 * Converts RFE PDFs to structured JSON and extracts insights
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// RFE Issue Categories
export type RFECategory =
  | 'extraordinary_ability'
  | 'sustained_acclaim'
  | 'employment_verification'
  | 'itinerary'
  | 'agent_authorization'
  | 'compensation'
  | 'beneficiary_qualifications'
  | 'petitioner_ability'
  | 'advisory_opinion'
  | 'evidence_authenticity'
  | 'material_change'
  | 'other';

// Structured RFE Data
export interface RFEData {
  // Metadata
  receiptNumber: string;
  beneficiaryName: string;
  petitionerName: string;
  visaType: string;
  issueDate: string;
  responseDeadline: string;
  serviceCenter: string;

  // Issues
  issues: RFEIssue[];

  // Summary
  overallAssessment: string;
  criticalDeficiencies: string[];
  suggestedEvidence: string[];

  // Raw text for reference
  rawText?: string;
}

export interface RFEIssue {
  category: RFECategory;
  criterion?: string; // e.g., "Criterion 1: Awards", "Criterion 5: Original Contributions"
  title: string;
  description: string;
  uscisLanguage: string; // Exact USCIS language used
  evidenceRequested: string[];
  suggestedResponse: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  templateImpact: string[]; // Which templates should be updated based on this
}

// Common RFE patterns for different visa types
export const RFE_PATTERNS: Record<string, string[]> = {
  'O-1A': [
    'Documentation of nationally or internationally recognized prizes or awards',
    'Evidence of membership in associations requiring outstanding achievements',
    'Published material about the beneficiary in professional publications',
    'Evidence of judging the work of others',
    'Evidence of original contributions of major significance',
    'Evidence of authorship of scholarly articles',
    'Evidence of employment in a critical or essential capacity',
    'Evidence of high salary or remuneration',
  ],
  'O-1B': [
    'Evidence of lead or starring participant in productions',
    'Evidence of critical reviews or published material',
    'Evidence of performance for distinguished organizations',
    'Evidence of commercial or critically acclaimed success',
    'Evidence of significant recognition from organizations or experts',
    'Evidence of high salary or remuneration',
  ],
  'P-1A': [
    'Evidence of international recognition in the sport',
    'Evidence of participation with a major U.S. sports league',
    'Evidence of participation in international competition',
    'Evidence of significant prior participation with major league',
    'Evidence of international ranking',
    'Evidence of honors or awards for excellence',
  ],
  'EB-1A': [
    'Evidence of extraordinary ability through sustained national or international acclaim',
    'Evidence meeting at least 3 of 10 criteria',
    'Evidence of intent to continue work in area of expertise',
    'Evidence that entry will substantially benefit the U.S.',
  ],
  'EB-2-NIW': [
    'Evidence of advanced degree or exceptional ability',
    'Evidence proposed endeavor has substantial merit and national importance',
    'Evidence beneficiary is well positioned to advance the endeavor',
    'Evidence that on balance it would be beneficial to waive job offer requirement',
  ],
};

/**
 * Process RFE PDF text and convert to structured JSON
 */
export async function processRFEText(
  pdfText: string,
  visaType?: string
): Promise<RFEData> {
  const prompt = buildRFEExtractionPrompt(pdfText, visaType);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    temperature: 0.1,
    system: `You are an expert immigration attorney specializing in O-1, P-1, and EB visa petitions.
You are analyzing a USCIS Request for Evidence (RFE) document.
Your task is to extract and structure all information from the RFE into a comprehensive JSON format.
Be thorough and capture every issue, deficiency, and request mentioned in the RFE.
Use exact USCIS language when quoting the document.`,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }

  // Try parsing entire response as JSON
  try {
    return JSON.parse(content.text);
  } catch {
    throw new Error('Failed to parse RFE extraction response as JSON');
  }
}

function buildRFEExtractionPrompt(pdfText: string, visaType?: string): string {
  return `Analyze the following USCIS Request for Evidence (RFE) document and extract all information into structured JSON.

## RFE DOCUMENT TEXT:
---
${pdfText}
---

${visaType ? `## VISA TYPE: ${visaType}` : ''}

## EXTRACTION INSTRUCTIONS:

Extract and return a JSON object with this structure:

\`\`\`json
{
  "receiptNumber": "string - the USCIS receipt number (e.g., WAC-XX-XXX-XXXXX)",
  "beneficiaryName": "string - full name of the beneficiary",
  "petitionerName": "string - name of the petitioner/employer",
  "visaType": "string - O-1A, O-1B, P-1A, EB-1A, EB-2 NIW, etc.",
  "issueDate": "string - date RFE was issued (YYYY-MM-DD)",
  "responseDeadline": "string - deadline to respond (YYYY-MM-DD)",
  "serviceCenter": "string - which service center issued the RFE",

  "issues": [
    {
      "category": "string - one of: extraordinary_ability, sustained_acclaim, employment_verification, itinerary, agent_authorization, compensation, beneficiary_qualifications, petitioner_ability, advisory_opinion, evidence_authenticity, material_change, other",
      "criterion": "string or null - specific criterion number if applicable (e.g., 'Criterion 1: Awards')",
      "title": "string - brief title for this issue",
      "description": "string - detailed description of the deficiency",
      "uscisLanguage": "string - exact quote from USCIS document",
      "evidenceRequested": ["array of specific evidence USCIS is requesting"],
      "suggestedResponse": "string - recommended approach to address this issue",
      "priority": "string - critical, high, medium, or low",
      "templateImpact": ["array of template types that should address this: petitioner-talent, foreign-employer, multiple-engagement, self-employment, support-letter, cover-letter"]
    }
  ],

  "overallAssessment": "string - summary of the RFE's main concerns",
  "criticalDeficiencies": ["array of the most serious issues that must be addressed"],
  "suggestedEvidence": ["array of recommended evidence types to submit"]
}
\`\`\`

Be thorough - extract EVERY issue mentioned in the RFE. Do not summarize or skip any requests.
Return ONLY the JSON object, no additional text.`;
}

/**
 * Analyze multiple RFEs to find common patterns
 */
export async function analyzeRFEPatterns(
  rfeDataArray: RFEData[]
): Promise<RFEPatternAnalysis> {
  const categoryCount: Record<RFECategory, number> = {} as Record<RFECategory, number>;
  const criterionCount: Record<string, number> = {};
  const commonIssues: string[] = [];
  const templateGaps: Set<string> = new Set();

  for (const rfe of rfeDataArray) {
    for (const issue of rfe.issues) {
      // Count categories
      categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1;

      // Count criteria
      if (issue.criterion) {
        criterionCount[issue.criterion] = (criterionCount[issue.criterion] || 0) + 1;
      }

      // Track template impacts
      for (const template of issue.templateImpact) {
        templateGaps.add(template);
      }
    }
  }

  return {
    totalRFEsAnalyzed: rfeDataArray.length,
    mostCommonCategories: Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, count]) => ({ category: cat as RFECategory, count })),
    mostChallengedCriteria: Object.entries(criterionCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([criterion, count]) => ({ criterion, count })),
    templatesNeedingUpdates: Array.from(templateGaps),
    recommendations: generateRecommendations(categoryCount, criterionCount),
  };
}

export interface RFEPatternAnalysis {
  totalRFEsAnalyzed: number;
  mostCommonCategories: { category: RFECategory; count: number }[];
  mostChallengedCriteria: { criterion: string; count: number }[];
  templatesNeedingUpdates: string[];
  recommendations: string[];
}

function generateRecommendations(
  categoryCount: Record<RFECategory, number>,
  criterionCount: Record<string, number>
): string[] {
  const recommendations: string[] = [];

  // Based on most common categories
  if (categoryCount.extraordinary_ability > 2) {
    recommendations.push('Templates should include more detailed guidance on documenting extraordinary ability evidence');
  }
  if (categoryCount.itinerary > 1) {
    recommendations.push('Itinerary templates need more specific date ranges and venue confirmations');
  }
  if (categoryCount.agent_authorization > 1) {
    recommendations.push('Agent authorization sections should explicitly state service of process acceptance');
  }
  if (categoryCount.compensation > 1) {
    recommendations.push('Compensation sections need more detailed breakdowns and supporting documentation requirements');
  }
  if (categoryCount.employment_verification > 1) {
    recommendations.push('Employment verification should include detailed job duties and reporting structure');
  }

  return recommendations;
}

/**
 * Generate template improvements based on RFE analysis
 */
export function generateTemplateImprovements(
  analysis: RFEPatternAnalysis
): Record<string, string[]> {
  const improvements: Record<string, string[]> = {};

  for (const template of analysis.templatesNeedingUpdates) {
    improvements[template] = [];

    // Add relevant improvements based on common issues
    for (const { category } of analysis.mostCommonCategories) {
      switch (category) {
        case 'extraordinary_ability':
          improvements[template].push('Add section for listing specific criteria being claimed');
          improvements[template].push('Include evidence checklist for each criterion');
          break;
        case 'itinerary':
          improvements[template].push('Add detailed itinerary table with dates, venues, and confirmation status');
          improvements[template].push('Include venue contact information section');
          break;
        case 'agent_authorization':
          improvements[template].push('Strengthen service of process authorization language');
          improvements[template].push('Add explicit agent authority statement');
          break;
        case 'compensation':
          improvements[template].push('Add detailed compensation breakdown table');
          improvements[template].push('Include payment schedule and method');
          break;
        case 'employment_verification':
          improvements[template].push('Add detailed job duties section');
          improvements[template].push('Include organizational chart position');
          break;
      }
    }
  }

  return improvements;
}

/**
 * Extract text from PDF buffer (placeholder - integrate with PDF library)
 */
export async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
  // In production, use pdf-parse, pdfplumber, or similar
  // For now, this is a placeholder
  try {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF. Ensure pdf-parse is installed.');
  }
}
