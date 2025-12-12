import Anthropic from '@anthropic-ai/sdk';
import { BeneficiaryInfo, UploadedFile } from '../types';
import { getKnowledgeBaseFiles, buildKnowledgeBaseContext } from './knowledge-base';
import { fetchMultipleUrls, FetchedUrlData, analyzePublicationQuality } from './url-fetcher';
import { conductPerplexityResearch, ResearchResult } from './perplexity-research';
import { getCFRSection, getCriteriaForVisaType, hasComparableEvidenceProvision, getComparableEvidenceCFR } from './criterion-templates';
import {
  retryWithBackoff as retryHelper,
  createFallbackContent,
  createSafeProgressCallback,
  logError,
} from './retry-helper';
import { callOpenAI, isOpenAIConfigured } from './openai-client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('http');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require('https');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 300000, // 5 minutes
  maxRetries: 0, // We handle retries ourselves in retryHelper
});

/**
 * RETRY WITH CLAUDE + OPENAI FALLBACK
 *
 * Attempts to call Claude API with retries. If all retries fail, falls back to OpenAI GPT-4o.
 * This ensures document generation NEVER fails due to a single API being down.
 *
 * @param prompt - The user prompt/content
 * @param systemPrompt - Optional system prompt (default: '')
 * @param maxTokens - Max tokens for response (default: 16384)
 * @param temperature - Temperature setting (default: 0.3)
 * @returns The AI-generated text content
 */
export async function callAIWithFallback(
  prompt: string,
  systemPrompt: string = '',
  maxTokens: number = 16384,
  temperature: number = 0.3
): Promise<string> {
  let claudeError: any = null;

  // Try Claude first with retries
  try {
    console.log('[AI] Attempting Claude Sonnet 4.5 (September 2025)...');
    const response = await retryHelper(() =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: maxTokens,
        temperature: temperature,
        system: systemPrompt || undefined,
        messages: [{ role: 'user', content: prompt }],
      })
    );

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('[AI] Claude succeeded!');
      return content.text;
    }

    throw new Error('Claude returned non-text response');
  } catch (error: any) {
    claudeError = error;
    console.error('[AI] Claude API failed after all retries:', error.message);
  }

  // Claude failed - try OpenAI fallback if configured
  if (!isOpenAIConfigured()) {
    console.log('[AI] OpenAI not configured, cannot fallback');
    throw claudeError;
  }

  console.log('[AI Fallback] Attempting OpenAI GPT-4o as fallback...');

  try {
    // GPT-4o has a max_tokens limit of 16384
    const openaiMaxTokens = Math.min(maxTokens, 16384);
    if (openaiMaxTokens < maxTokens) {
      console.log(`[AI Fallback] Capping max_tokens from ${maxTokens} to ${openaiMaxTokens} (GPT-4o limit)`);
    }

    const result = await callOpenAI(prompt, systemPrompt, openaiMaxTokens, temperature);
    console.log('[AI Fallback] OpenAI succeeded!');
    return result;
  } catch (openaiError: any) {
    console.error('[AI Fallback] OpenAI also failed:', openaiError.message);
    console.error('[AI Fallback] Both Claude and OpenAI failed');
    throw claudeError; // Throw original Claude error
  }
}

/**
 * LEGACY WRAPPER: retryWithBackoff
 *
 * For compatibility with existing code that passes Claude API call functions directly.
 * New code should use callAIWithFallback() instead.
 */
async function retryWithBackoff<T>(claudeCall: () => Promise<T>): Promise<T> {
  return await retryHelper(claudeCall);
}

// ============================================
// DIY TEMPLATE ENFORCEMENT SYSTEM PROMPT
// ============================================

const TEMPLATE_ENFORCEMENT_SYSTEM_PROMPT = `
# MANDATORY TEMPLATE ADHERENCE INSTRUCTIONS

You are generating a legal immigration petition document. You MUST follow the DIY template structure EXACTLY. There is NO flexibility on this.

## STRUCTURE REQUIREMENTS FOR EACH CRITERION

### REQUIRED ELEMENT 1: Criterion Header with Checkboxes
ALWAYS begin each criterion with:
\`\`\`
### **Criterion Number [X]: [Full Official Name from CFR]**

☐ **Yes**, the Beneficiary is pursuing qualification under this criterion.
☐ **No**, the Beneficiary is not pursuing qualification under this criterion.
\`\`\`

### REQUIRED ELEMENT 2: Regulatory Standard Block
ALWAYS include immediately after header:
\`\`\`
#### **Regulatory Standard**

Under **[exact CFR citation]**, [verbatim regulatory language]. This evidence must establish:

1. [First regulatory element]
2. [Second regulatory element]
[etc.]
\`\`\`

### REQUIRED ELEMENT 3: Establishment of Elements in Evidence
ALWAYS include with numbered points matching regulatory elements:
\`\`\`
---

**Establishment of Elements in Evidence**

The Beneficiary satisfies this criterion, as the evidence provided establishes the following:

1. **[Element from Regulatory Standard]**: [Specific evidence with exhibit reference]
2. **[Element from Regulatory Standard]**: [Specific evidence with exhibit reference]
[etc.]

The evidence supporting these elements includes [specific exhibits]. All relevant supporting materials have been included as exhibits in this petition.
\`\`\`

### REQUIRED ELEMENT 4: Comparable Evidence Theory (O-1A, O-1B, EB-1A ONLY)
For O-1A, O-1B, and EB-1A ONLY, ALWAYS include:
\`\`\`
---

**Comparable Evidence Theory**

☐ **Yes**, this criterion is being considered under the comparable evidence theory.
☐ **No**, this criterion is not being considered under the comparable evidence theory.

If "Yes," the following USCIS language applies:
When the standard evidentiary requirements described in **[criterion CFR]** do not readily apply to the Beneficiary's field, the Petitioner may submit comparable evidence under **[comparable evidence CFR]**. Comparable evidence must demonstrate that the Beneficiary's achievements or recognition are of comparable significance to [criterion standard].

---

**Explanation of Comparable Evidence**

This space is provided to explain why the standard evidentiary criteria for [criterion name] do not readily apply to the Beneficiary's field and to demonstrate how the submitted evidence is of comparable significance:

[Detailed explanation - minimum 2 paragraphs explaining:
1. WHY the standard criterion doesn't apply to this field
2. WHAT evidence is being submitted as comparable
3. HOW this evidence demonstrates comparable significance]

---
\`\`\`

**CRITICAL**: NEVER include Comparable Evidence section for P-1A or P-1B petitions.

### REQUIRED ELEMENT 5: Consideration of Evidence Closing
ALWAYS end each criterion with:
\`\`\`
---

**Consideration of Evidence**

Evidence for this criterion, including comparable evidence (if applicable), has been included in this petition.

All relevant evidence provided in this petition establishes that the Beneficiary has met the regulatory requirements under **[criterion CFR]**. The adjudicating officer is requested to consider all submitted materials and, if applicable, evaluate the evidence under the comparable evidence standard per **[comparable evidence CFR]**.

**Citation**: This section aligns with **[criterion CFR]** and **[comparable evidence CFR if applicable]**, which govern the requirements and flexibility for demonstrating [criterion description].
\`\`\`

## PROHIBITED BEHAVIORS

1. **NEVER** skip the checkbox format
2. **NEVER** use vague language like "the beneficiary is recognized" without specific evidence
3. **NEVER** omit the Comparable Evidence section for O-1A, O-1B, or EB-1A
4. **NEVER** include Comparable Evidence section for P-1A or P-1B
5. **NEVER** truncate the Consideration of Evidence closing
6. **NEVER** use incorrect CFR citations
7. **NEVER** skip numbered elements in the Establishment of Elements section
8. **NEVER** fail to reference specific exhibits

## TOKEN ALLOCATION

You have been allocated maximum tokens for this document. USE THEM ALL.
- Each criterion should be 3-5 pages minimum
- The Establishment of Elements section should be detailed and evidence-rich
- The Comparable Evidence explanation (when applicable) should be 2-3 paragraphs minimum
- Do NOT summarize. Do NOT abbreviate. Do NOT take shortcuts.
`;


type ProgressCallback = (stage: string, progress: number, message: string) => void;

export interface GenerationResult {
  document1: string; // Comprehensive Analysis
  document2: string; // Publication Analysis
  document3: string; // URL Reference
  document4: string; // Legal Brief
  document5: string; // Evidence Gap Analysis (NEW)
  document6: string; // USCIS Cover Letter (NEW)
  document7: string; // Visa Checklist (NEW)
  document8: string; // Exhibit Assembly Guide (NEW)
  urlsAnalyzed: FetchedUrlData[];
  filesProcessed: number;
  // NOTE: Exhibits are generated separately via generateExhibitPackage()
  // after user reviews documents and chooses to generate them
}

async function processUploadedFiles(files: UploadedFile[]): Promise<string> {
  if (files.length === 0) return '';

  let fileEvidence = '\n\n# UPLOADED DOCUMENT EVIDENCE\n\n';
  fileEvidence += `Total documents uploaded: ${files.length}\n\n`;

  for (const fileData of files) {
    fileEvidence += `## ${fileData.filename}\n`;
    fileEvidence += `- Type: ${fileData.fileType}\n`;
    fileEvidence += `- Word Count: ${fileData.wordCount || 0}\n`;
    if ((fileData as any).pageCount) {
      fileEvidence += `- Pages: ${(fileData as any).pageCount}\n`;
    }
    fileEvidence += `\n**Summary:**\n${(fileData as any).summary || 'N/A'}\n\n`;
    fileEvidence += `---\n\n`;
  }

  return fileEvidence;
}

export async function generateAllDocuments(
  beneficiaryInfo: BeneficiaryInfo,
  onProgress?: (stage: string, progress: number, message: string) => void
): Promise<GenerationResult> {
  // Create safe progress callback that never throws
  const safeProgress = createSafeProgressCallback(onProgress);

  try {
    // Stage 1: Read Knowledge Base (5%)
    safeProgress('Reading Knowledge Base', 5, 'Loading visa petition knowledge base files...');
    const knowledgeBaseFiles = await getKnowledgeBaseFiles(beneficiaryInfo.visaType);
    const knowledgeBaseContext = buildKnowledgeBaseContext(knowledgeBaseFiles, beneficiaryInfo.visaType);

    // Stage 2: Process Uploaded Files (10%)
    safeProgress('Processing Uploaded Files', 10, 'Extracting text from uploaded documents...');
    let fileEvidence = '';
    try {
      fileEvidence = await processUploadedFiles(beneficiaryInfo.uploadedFiles || []);
    } catch (error) {
      logError('processUploadedFiles', error);
      safeProgress('Processing Uploaded Files', 10, 'Warning: Some files could not be processed');
      // Continue with empty file evidence rather than failing
    }

    // Stage 3: Conduct Perplexity Research (15-20%) - NEW!
    let allUrls = beneficiaryInfo.primaryUrls || [];
    let perplexityResearch: ResearchResult | null = null;

    if (process.env.PERPLEXITY_API_KEY && allUrls.length > 0) {
      safeProgress('Perplexity Research', 15, 'Conducting deep research to discover additional sources...');

      try {
        perplexityResearch = await conductPerplexityResearch(beneficiaryInfo, safeProgress);

        // Add discovered URLs to the list
        const discoveredUrls = perplexityResearch.discoveredSources.map(s => s.url);
        allUrls = [...allUrls, ...discoveredUrls];

        // Deduplicate URLs
        allUrls = Array.from(new Set(allUrls));

        safeProgress(
          'Perplexity Research',
          20,
          `Found ${perplexityResearch.totalSourcesFound} additional sources (${perplexityResearch.tier1Count} Tier 1, ${perplexityResearch.tier2Count} Tier 2)`
        );
      } catch (error) {
        logError('Perplexity Research', error);
        safeProgress('Perplexity Research', 20, 'Using initial URLs only');
      }
    } else {
      safeProgress('Perplexity Research', 20, 'Skipped (no Perplexity API key or initial URLs)');
    }

    // Stage 4: Fetch URLs (25%)
    safeProgress('Analyzing URLs', 25, `Fetching and analyzing ${allUrls.length} evidence URLs...`);
    let urlsAnalyzed: FetchedUrlData[] = [];
    try {
      urlsAnalyzed = await fetchMultipleUrls(allUrls);
    } catch (error) {
      logError('fetchMultipleUrls', error);
      safeProgress('Analyzing URLs', 25, 'Warning: Some URLs could not be fetched');
      // Continue with whatever URLs were successfully fetched
    }

    // Stage 5: Generate Document 1 - Comprehensive Analysis (35%)
    safeProgress('Generating Comprehensive Analysis', 35, 'Creating 75+ page comprehensive analysis...');
    const document1 = await generateComprehensiveAnalysis(
      beneficiaryInfo,
      knowledgeBaseContext,
      urlsAnalyzed,
      fileEvidence,
      safeProgress
    );

    // Stage 6: Generate Document 2 - Publication Analysis (55%)
    safeProgress('Generating Publication Analysis', 55, 'Creating 40+ page publication significance analysis...');
    const document2 = await generatePublicationAnalysis(
      beneficiaryInfo,
      knowledgeBaseContext,
      urlsAnalyzed,
      document1,
      safeProgress
    );

    // Stage 7: Generate Document 3 - URL Reference (70%)
    safeProgress('Generating URL Reference', 70, 'Creating organized URL reference document...');
    const document3 = await generateUrlReference(
      beneficiaryInfo,
      urlsAnalyzed,
      document1,
      document2,
      safeProgress
    );

    // Stage 8: Generate Document 4 - Legal Brief (80%)
    safeProgress('Generating Legal Brief', 80, 'Creating 30+ page professional legal brief...');
    const document4 = await generateLegalBrief(
      beneficiaryInfo,
      knowledgeBaseContext,
      document1,
      document2,
      document3,
      safeProgress
    );

    // Stage 9: Generate Document 5 - Evidence Gap Analysis (87%)
    safeProgress('Analyzing Evidence Gaps', 87, 'Scoring evidence and identifying weaknesses...');
    const document5 = await generateEvidenceGapAnalysis(
      beneficiaryInfo,
      knowledgeBaseContext,
      document1,
      document2,
      urlsAnalyzed,
      safeProgress
    );

    // Stage 10: Generate Document 6 - USCIS Cover Letter (91%)
    safeProgress('Generating Cover Letter', 91, 'Creating professional USCIS submission letter...');
    const document6 = await generateCoverLetter(
      beneficiaryInfo,
      document1,
      safeProgress
    );

    // Stage 11: Generate Document 7 - Visa Checklist (94%)
    safeProgress('Creating Visa Checklist', 94, 'Building quick reference scorecard...');
    const document7 = await generateVisaChecklist(
      beneficiaryInfo,
      document5,
      safeProgress
    );

    // Stage 12: Generate Document 8 - Exhibit Assembly Guide (97%)
    safeProgress('Generating Exhibit Guide', 97, 'Creating assembly instructions...');
    const document8 = await generateExhibitGuide(
      beneficiaryInfo,
      urlsAnalyzed,
      document4,
      safeProgress
    );

    // NOTE: Exhibits are generated SEPARATELY after documents are complete
    // User will have option to generate exhibits after reviewing documents
    safeProgress('Complete', 100, 'All 8 documents generated successfully!');

    return {
      document1,
      document2,
      document3,
      document4,
      document5,
      document6,
      document7,
      document8,
      urlsAnalyzed,
      filesProcessed: beneficiaryInfo.uploadedFiles?.length || 0,
    };
  } catch (error: any) {
    // Critical error - generate fallback documents
    logError('generateAllDocuments', error);
    safeProgress('Error', 100, 'Generation encountered errors - creating fallback documents');

    const fallbackDoc = createFallbackContent('Visa Petition Documents', beneficiaryInfo);

    return {
      document1: fallbackDoc,
      document2: fallbackDoc,
      document3: fallbackDoc,
      document4: fallbackDoc,
      document5: fallbackDoc,
      document6: fallbackDoc,
      document7: fallbackDoc,
      document8: fallbackDoc,
      urlsAnalyzed: [],
      filesProcessed: 0,
    };
  }
}

async function generateComprehensiveAnalysis(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  urls: FetchedUrlData[],
  fileEvidence: string,
  progressCallback?: ProgressCallback
): Promise<string> {
  try {
  const urlContext = urls
    .map(
      (url, i) =>
        `URL ${i + 1}: ${url.url}\nTitle: ${url.title}\nContent: ${url.content.substring(0, 2000)}...\n`
    )
    .join('\n\n');

  const prompt = `You are an expert immigration law analyst specializing in ${beneficiaryInfo.visaType} visa petitions.

BENEFICIARY INFORMATION:
- Name: ${beneficiaryInfo.fullName}
- Visa Type: ${beneficiaryInfo.visaType}
- Field/Profession: ${beneficiaryInfo.fieldOfProfession}
- Background: ${beneficiaryInfo.background}
- Additional Info: ${beneficiaryInfo.additionalInfo || 'None provided'}

UPLOADED DOCUMENT EVIDENCE:
${fileEvidence || 'No documents uploaded'}

EVIDENCE URLS ANALYZED:
${urlContext}

KNOWLEDGE BASE:
${knowledgeBase.substring(0, 50000)}

YOUR TASK:
Generate a comprehensive 75+ page VISA PETITION ANALYSIS document following this EXACT structure:

# COMPREHENSIVE VISA PETITION ANALYSIS
## ${beneficiaryInfo.visaType} CLASSIFICATION - ${beneficiaryInfo.fullName}

### EXECUTIVE SUMMARY
[3-4 paragraphs with key findings and recommendation]

### PART 1: VISA TYPE DETERMINATION
[Explain why ${beneficiaryInfo.visaType} is appropriate for this beneficiary]

### PART 2: REGULATORY FRAMEWORK
[Legal standards for ${beneficiaryInfo.visaType} - use EXACT regulatory language from knowledge base]

### PART 3: CRITERION-BY-CRITERION ANALYSIS

For EACH criterion applicable to ${beneficiaryInfo.visaType}:

#### Criterion [Number]: [Name]
**Regulatory Language**: [Exact text from regulations]
**Scoring**: [Points awarded] / [Max points]
**Assessment**: [Detailed 2-3 paragraph analysis]
**Evidence Provided**:
- [List ALL relevant evidence with quality assessment]
**Strengths**: [What's strong about this criterion]
**Weaknesses**: [What's lacking or could be improved]

[Repeat for ALL applicable criteria - minimum 8 criteria for O-1A/EB-1A, 6 for O-1B, 5 for P-1A]

### PART 4: EVIDENCE MAPPING
[Create a table mapping all evidence to specific criteria]

### PART 5: SCORING SUMMARY
- Total Points: [X]
- Threshold for Approval: [Y]
- Classification: [Strong Approval / Likely Approval / Borderline / Likely Denial]
- Confidence Level: [X%]
- Approval Probability: [X%]

### PART 6: STRENGTHS ANALYSIS
[Detailed 3-5 paragraph analysis of strongest aspects]

### PART 7: WEAKNESSES & GAPS
[Detailed analysis of what's missing or weak, with specific recommendations]

### PART 8: APPROVAL PROBABILITY ASSESSMENT
[Statistical analysis and prediction with reasoning]

### PART 9: RECOMMENDATIONS
[Minimum 10 specific, actionable recommendations to strengthen the case]

### PART 10: CONCLUSION
[3-4 paragraph summary and final recommendation]

CRITICAL REQUIREMENTS:
- **LENGTH**: This MUST be a COMPREHENSIVE 75+ PAGE document (~40,000+ words)
- **DETAIL LEVEL**: Each criterion analysis should be 3-5 pages with extensive detail
- Write in COMPLETE, DETAILED paragraphs - not bullet points
- Include ALL criteria (8 for O-1A/EB-1A, 6 for O-1B, 5 for P-1A)
- Use exact regulatory language from knowledge base with full citations
- Apply proper evidence weighting with detailed scoring explanations
- Provide extensive statistical analysis and comparisons
- Include 10+ specific, detailed recommendations (1-2 paragraphs each)
- Be objective - highlight both strengths AND weaknesses extensively
- Reference specific URLs throughout with detailed analysis

**OUTPUT FORMAT**: Generate the FULL, UNABBREVIATED document. Do NOT summarize or shorten. Write as if this is the complete final document that will be given to an attorney.

Generate the COMPLETE comprehensive analysis now (aim for maximum detail and length):`;

    const textResponse = await callAIWithFallback(
      prompt,
      '',
      20480,
      0.3
    );

    return textResponse;
  } catch (error) {
    logError('generateComprehensiveAnalysis', error);
    progressCallback?.('Generating Comprehensive Analysis', 35, 'Error - using fallback content');
    return createFallbackContent('Comprehensive Analysis', beneficiaryInfo);
  }
}

async function generatePublicationAnalysis(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  urls: FetchedUrlData[],
  comprehensiveAnalysis: string,
  progressCallback?: ProgressCallback
): Promise<string> {
  try {
  // Helper to convert tier string to number for sorting/comparison
  const getTierNumber = (tier: string): number => {
    if (tier === 'Major Media') return 1;
    if (tier === 'Trade Publication') return 2;
    if (tier === 'Online Media') return 3;
    return 4; // Unknown
  };

  // Smart filtering: Focus on up to 60 most relevant URLs
  // Prioritize by tier quality and content relevance
  let relevantUrls = urls;
  if (urls.length > 60) {
    // Sort by tier (lower tier number = higher quality) and take top 60
    const sortedByQuality = [...urls].sort((a, b) => {
      const qualityA = analyzePublicationQuality(a.domain);
      const qualityB = analyzePublicationQuality(b.domain);
      return getTierNumber(qualityA.tier) - getTierNumber(qualityB.tier);
    });
    relevantUrls = sortedByQuality.slice(0, 60);
    console.log(`Filtered ${urls.length} URLs down to top 60 by publication quality`);
  }

  // Categorize URLs by tier for analysis
  const tier1Urls = relevantUrls.filter(url => getTierNumber(analyzePublicationQuality(url.domain).tier) === 1);
  const tier2Urls = relevantUrls.filter(url => getTierNumber(analyzePublicationQuality(url.domain).tier) === 2);
  const tier3Urls = relevantUrls.filter(url => getTierNumber(analyzePublicationQuality(url.domain).tier) === 3);

  const urlDetails = relevantUrls
    .map((url, i) => {
      const quality = analyzePublicationQuality(url.domain);
      const tierNum = getTierNumber(quality.tier);
      return `URL ${i + 1}:
- Link: ${url.url}
- Domain: ${url.domain}
- Title: ${url.title}
- Tier: ${quality.tier} (${tierNum === 1 ? 'Gold Standard' : tierNum === 2 ? 'Strong/Industry' : 'Supplementary'})
- Estimated Reach: ${quality.estimatedReach}
- Content Preview: ${url.content.substring(0, 1500)}...
`;
    })
    .join('\n\n');

  const prompt = `You are an expert at evaluating publication significance for ${beneficiaryInfo.visaType} visa petitions.

BENEFICIARY: ${beneficiaryInfo.fullName}
FIELD: ${beneficiaryInfo.fieldOfProfession}

## PUBLICATION TIER BREAKDOWN (Total: ${relevantUrls.length} sources):
- **Tier 1 (Gold Standard)**: ${tier1Urls.length} sources - ESPN, BBC, CNN, NYT, major sports networks
- **Tier 2 (Strong/Industry)**: ${tier2Urls.length} sources - Trade publications, official league sites, industry databases
- **Tier 3 (Supplementary)**: ${tier3Urls.length} sources - Regional media, niche publications, established blogs

## TIER QUALITY STANDARDS:

**TIER 1 - GOLD STANDARD** (Weight: Premium)
- Major international/national media: ESPN, BBC, CNN, NYT, WSJ, Reuters, USA Today
- Major sports networks: Fox Sports, NBC Sports, CBS Sports
- Reach: Millions (national/international audiences)
- Use: Primary evidence, strongest weight

**TIER 2 - STRONG/INDUSTRY** (Weight: High)
- Official league/federation sources: UFC.com, NBA.com, FIFA.com
- Industry publications: MMA Junkie (USA Today Sports), Sherdog, Tapology
- Regional major outlets: LA Times, Chicago Tribune
- Reach: Hundreds of thousands (industry-specific)
- Use: Strong supporting evidence

**TIER 3 - SUPPLEMENTARY** (Weight: Moderate)
- Niche publications with editorial standards
- Established blogs and specialist sites
- Local newspapers
- Reach: Thousands to tens of thousands
- Use: Supporting context, not primary evidence

**CRITICAL ANALYSIS RULES**:
1. **Focus on Tier 1-2 sources** - These carry the most weight with USCIS
2. **Be realistic** - Don't overstate Tier 3 sources
3. **Aggregate reach sensibly** - Account for audience overlap
4. **Quality > Quantity** - 3 Tier 1 sources > 20 Tier 3 sources
5. **Stay grounded** - Use reasonable estimates, not inflated numbers

PUBLICATIONS/MEDIA TO ANALYZE:
${urlDetails}

CONTEXT FROM COMPREHENSIVE ANALYSIS:
${comprehensiveAnalysis.substring(0, 5000)}

YOUR TASK:
Generate a 40+ page PUBLICATION SIGNIFICANCE ANALYSIS following this EXACT structure:

# PUBLICATION SIGNIFICANCE ANALYSIS
## MEDIA COVERAGE ASSESSMENT - ${beneficiaryInfo.fullName}

### EXECUTIVE SUMMARY
[Overview of media coverage quality and reach]

### PART 1: METHODOLOGY
[Explain how publications were evaluated - circulation data, editorial standards, etc.]

### PART 2: PUBLICATION-BY-PUBLICATION ANALYSIS

For EACH URL provided:

#### Publication #[N]: [Publication Name]
**URL**: [Full URL]
**Publication Type**: [Major media / Trade publication / Online media]

**Reach Metrics**:
- Circulation/Monthly Visitors: [Specific numbers with sources if available]
- Geographic Reach: [Local / Regional / National / International]
- Audience Demographics: [Description]

**Editorial Standards**:
- Editorial Process: [Description]
- Journalist Credentials: [If known]
- Publication Prestige: [Assessment]

**Industry Significance**:
- Standing in Field: [Analysis]
- Comparable Publications: [List similar publications]
- Impact Factor: [If applicable]

**Content Analysis**:
- Article Title: [Full title]
- Publication Date: [If determinable]
- Length: [Estimate]
- Focus on Beneficiary: [Primary subject / Secondary mention / Brief mention]
- Tone: [Positive / Neutral / Critical]
- Key Points Mentioned: [Paraphrase major points about beneficiary]
- Context: [Why this coverage matters for the petition]

**Significance Score**: [1-10]
**Quality Assessment**: [High / Medium / Low]

### PART 3: AGGREGATE ANALYSIS
**Total Combined Reach**: [Sum of all circulation/viewership]
**Geographic Distribution**: [Breakdown]
**Timeline of Coverage**: [Pattern over time if dates available]
**Coverage Quality Distribution**: [How many high/medium/low quality]

### PART 4: COMPARATIVE ANALYSIS
[Compare beneficiary's media coverage to typical coverage in their field]

### PART 5: USCIS STANDARDS ANALYSIS
[How this coverage meets USCIS requirements for ${beneficiaryInfo.visaType}]

### PART 6: TIER-BASED CUMULATIVE ANALYSIS

**Publication Count by Tier:**
| Tier | Count | Quality Level | Example Sources |
|------|-------|---------------|-----------------|
| Tier 1 | ${tier1Urls.length} | Gold Standard | ESPN, BBC, CNN, NYT |
| Tier 2 | ${tier2Urls.length} | Strong/Industry | UFC.com, Sherdog, MMA Junkie |
| Tier 3 | ${tier3Urls.length} | Supplementary | Regional media, niche sites |
| **Total** | **${relevantUrls.length}** | | |

**Tier 1 Analysis (Highest Weight):**
- List and analyze all Tier 1 sources in detail
- Combined reach: [Estimate total reach with overlap consideration]
- Why these matter most for USCIS
- Mainstream vs niche coverage

**Tier 2 Analysis (Strong Supporting Evidence):**
- Analyze industry-specific and official sources
- Authority in the field
- Combined reach within industry
- Credibility with USCIS

**Tier 3 Analysis (Supplementary Context):**
- Brief overview of supplementary sources
- Provide context but don't overemphasize
- Combined reach estimate (realistic)

**Aggregate Reach Calculation (REALISTIC ESTIMATES):**
- Account for audience overlap between sources
- Focus on NET unique reach
- Conservative vs aggressive estimates
- Geographic distribution breakdown

**Quality vs Quantity Assessment:**
Compare beneficiary's coverage profile:
- Is it top-heavy (mostly Tier 1-2)? → STRONG
- Is it bottom-heavy (mostly Tier 3)? → NEEDS WORK
- Balanced mix? → EVALUATE TIER 1-2 DEPTH

### PART 7: CONCLUSIONS
[Overall assessment emphasizing Tier 1-2 sources, realistic reach estimates, and quality over quantity]

CRITICAL REQUIREMENTS:
- **LENGTH**: This MUST be a COMPREHENSIVE 40+ PAGE document (~20,000+ words)
- **TIER-BASED APPROACH**:
  * Tier 1 sources get 2-4 pages each (most important)
  * Tier 2 sources get 1-2 pages each (strong supporting)
  * Tier 3 sources get 0.5-1 page each (contextual overview)
- **REALISTIC REACH ESTIMATES**: Use reasonable, verifiable numbers
  * ESPN: ~150M monthly visitors (verifiable via SimilarWeb)
  * UFC.com: ~50M monthly (verifiable)
  * Regional outlets: Thousands to hundreds of thousands
  * DO NOT inflate numbers - be conservative and credible
- **FOCUS ON QUALITY**: Emphasize strength of Tier 1-2 sources
- **AGGREGATE REACH**: Account for audience overlap (ESPN fans likely also visit UFC.com)
- **SMART FILTERING**: Already limited to top ${relevantUrls.length} most relevant sources
- **BALANCED ANALYSIS**: If mostly Tier 3 sources, acknowledge this as a limitation
- Write in COMPLETE, DETAILED paragraphs with thorough analysis
- Each Tier 1 publication deserves 2-4 pages of detailed assessment
- Tier 2-3 publications can be more concise but still substantive
- Provide detailed publication quality assessments with justification
- Include comparative analysis to field norms

**OUTPUT FORMAT**: Generate the FULL, UNABBREVIATED document. Prioritize analysis of Tier 1-2 sources. Do NOT summarize top-tier publications. Be realistic about reach estimates.

Generate the COMPLETE publication analysis now (emphasizing tier-based quality assessment):`;

    const textResponse = await callAIWithFallback(
      prompt,
      '',
      20480,
      0.3
    );

    return textResponse;
  } catch (error) {
    logError('generatePublicationAnalysis', error);
    progressCallback?.('Generating Publication Analysis', 55, 'Error - using fallback content');
    return createFallbackContent('Publication Analysis', beneficiaryInfo);
  }
}

async function generateUrlReference(
  beneficiaryInfo: BeneficiaryInfo,
  urls: FetchedUrlData[],
  doc1: string,
  doc2: string,
  progressCallback?: ProgressCallback
): Promise<string> {
  try {
  const prompt = `Create a URL REFERENCE DOCUMENT organizing all evidence URLs by criterion for ${beneficiaryInfo.fullName}'s ${beneficiaryInfo.visaType} petition.

URLS TO ORGANIZE:
${urls.map((url, i) => `${i + 1}. ${url.url} - ${url.title}`).join('\n')}

CONTEXT FROM DOCUMENTS:
Comprehensive Analysis (first 3000 chars): ${doc1.substring(0, 3000)}
Publication Analysis (first 3000 chars): ${doc2.substring(0, 3000)}

Generate a URL Reference Document with this EXACT structure:

# URL REFERENCE DOCUMENT
## EVIDENCE SOURCES BY CRITERION - ${beneficiaryInfo.fullName}

---

## CRITERION 1: [Name from ${beneficiaryInfo.visaType} regulations]

### Primary Evidence
- [URL 1]: [Description of what this proves]
  - Source Type: [Media / Official / Social / Competition / Academic]
  - Quality: [High / Medium / Low]
  - Status: [Active]

### Supporting Evidence
[Additional URLs]

---

[Repeat for ALL applicable criteria]

---

## GENERAL BACKGROUND SOURCES
[URLs providing general biographical info]

---

## COMPETITIVE LANDSCAPE SOURCES
[URLs showing beneficiary vs competitors/comparisons]

---

## INDUSTRY CONTEXT SOURCES
[URLs providing field context]

---

## TOTAL URL COUNT: [Number]
## LAST VERIFIED: ${new Date().toLocaleDateString()}

Generate the COMPLETE URL reference document now:`;

    const textResponse = await callAIWithFallback(
      prompt,
      '',
      10240,
      0.2
    );

    return textResponse;
  } catch (error) {
    logError('generateUrlReference', error);
    progressCallback?.('Generating URL Reference', 70, 'Error - using fallback content');
    return createFallbackContent('URL Reference', beneficiaryInfo);
  }
}

async function generateLegalBrief(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  doc1: string,
  doc2: string,
  doc3: string,
  progressCallback?: ProgressCallback
): Promise<string> {
  try {
  // Get visa-specific template requirements
  const cfrSection = getCFRSection(beneficiaryInfo.visaType);
  const criteria = getCriteriaForVisaType(beneficiaryInfo.visaType);
  const hasComparable = hasComparableEvidenceProvision(beneficiaryInfo.visaType);
  const comparableCFR = getComparableEvidenceCFR(beneficiaryInfo.visaType);

  // Determine brief type (default to comprehensive for backwards compatibility)
  const briefType = beneficiaryInfo.briefType || 'comprehensive';
  const isStandard = briefType === 'standard';

  // Build criterion-specific template instructions
  let criterionTemplates = '';
  for (const criterion of criteria) {
    criterionTemplates += `
### **Criterion Number ${criterion.number}: ${criterion.name}**

☐ **Yes**, the Beneficiary is pursuing qualification under this criterion.
☐ **No**, the Beneficiary is not pursuing qualification under this criterion.

#### **Regulatory Standard**

Under **${criterion.cfrCitation}**, ${criterion.regulatoryLanguage} This evidence must establish:

${criterion.elements.map((el, i) => `${i + 1}. ${el}`).join('\n')}

---

**Establishment of Elements in Evidence**

The Beneficiary satisfies this criterion, as the evidence provided establishes the following:

${criterion.elements.map((el, i) => `${i + 1}. **${el}**: [Specific evidence with exhibit references from the analysis documents]`).join('\n')}

The evidence supporting these elements includes [list specific exhibits]. All relevant supporting materials have been included as exhibits in this petition.

${hasComparable ? `
---

**Comparable Evidence Theory**

☐ **Yes**, this criterion is being considered under the comparable evidence theory.
☐ **No**, this criterion is not being considered under the comparable evidence theory.

If "Yes," the following USCIS language applies:
When the standard evidentiary requirements described in **${criterion.cfrCitation}** do not readily apply to the Beneficiary's field, the Petitioner may submit comparable evidence under **${comparableCFR}**. Comparable evidence must demonstrate that the Beneficiary's achievements or recognition are of comparable significance to ${criterion.name.toLowerCase()}.

---

**Explanation of Comparable Evidence**

[If using comparable evidence for this criterion, provide detailed 2-3 paragraph explanation of:
1. WHY the standard criterion doesn't apply to this field
2. WHAT evidence is being submitted as comparable
3. HOW this evidence demonstrates comparable significance]

---
` : ''}

**Consideration of Evidence**

Evidence for this criterion, including comparable evidence (if applicable), has been included in this petition.

All relevant evidence provided in this petition establishes that the Beneficiary has met the regulatory requirements under **${criterion.cfrCitation}**. The adjudicating officer is requested to consider all submitted materials${hasComparable ? ` and, if applicable, evaluate the evidence under the comparable evidence standard per **${comparableCFR}**` : ''}.

**Citation**: This section aligns with **${criterion.cfrCitation}**${hasComparable ? ` and **${comparableCFR}**` : ''}, which govern the requirements and flexibility for demonstrating ${criterion.name.toLowerCase()}.

---

`;
  }

  const prompt = `${TEMPLATE_ENFORCEMENT_SYSTEM_PROMPT}

# LEGAL BRIEF GENERATION - ${beneficiaryInfo.visaType} PETITION

## BENEFICIARY INFORMATION
- **Full Name**: ${beneficiaryInfo.fullName}
- **Field of Endeavor**: ${beneficiaryInfo.fieldOfProfession}
- **Visa Type**: ${beneficiaryInfo.visaType}
- **Comparable Evidence Available**: ${hasComparable ? `YES - Must include Comparable Evidence sections` : `NO - Do NOT include Comparable Evidence sections`}

## CFR REFERENCE
Base Section: ${cfrSection}
${hasComparable ? `Comparable Evidence Section: ${comparableCFR}` : ''}

## KNOWLEDGE BASE (Regulations):
${knowledgeBase.substring(0, 20000)}

## ANALYSIS SUMMARY (from Document 1):
${doc1.substring(0, 8000)}

## PUBLICATION DATA (from Document 2):
${doc2.substring(0, 5000)}

## URL REFERENCES (from Document 3):
${doc3.substring(0, 3000)}

## STRICT STRUCTURE REQUIREMENTS

You are generating the LEGAL BRIEF (Document 4). This is the primary document reviewed by USCIS. It MUST follow the DIY template structure EXACTLY.

### DOCUMENT STRUCTURE

YOUR TASK:
Generate a professional 30-50 page PETITION BRIEF in proper legal format following this EXACT structure:

# PETITION BRIEF IN SUPPORT OF ${beneficiaryInfo.visaType} PETITION
## ${beneficiaryInfo.fullName}

**Petitioner**: [Organization/Self]
**Beneficiary**: ${beneficiaryInfo.fullName}
**Visa Classification**: ${beneficiaryInfo.visaType}
**Field of Endeavor**: ${beneficiaryInfo.fieldOfProfession}
**Date**: ${new Date().toLocaleDateString()}

---

## TABLE OF CONTENTS

I. Executive Summary
II. Introduction and Background
III. Legal Standards
IV. Statement of Facts
V. Argument - Criteria Analysis
${beneficiaryInfo.visaType === 'EB-1A' ? 'VI. Final Merits Determination\n' : ''}VII. Conclusion
VIII. Exhibit List

---

## I. EXECUTIVE SUMMARY

[2-3 compelling paragraphs summarizing the case]

**Criteria Met**: [List all criteria being claimed]
**Recommendation**: This petition should be APPROVED.

---

## II. INTRODUCTION AND BACKGROUND

### A. Beneficiary's Professional Background
[4-6 paragraphs from comprehensive analysis, written professionally]

### B. Current Standing in Field
[Statistical positioning and comparisons]

### C. Purpose of Petition
[Why seeking this visa]

---

## III. LEGAL STANDARDS

### A. Statutory Requirements
[Exact INA section and CFR regulations for ${beneficiaryInfo.visaType}]

### B. Regulatory Criteria
[List all criteria from regulations with checkbox format]

### C. Standard of Proof
[Preponderance of evidence standard]

### D. Applicable USCIS Policy Guidance
[Recent policy memos]
${hasComparable ? `\n### E. Comparable Evidence Standard\n[Explanation of ${comparableCFR} provision for ${beneficiaryInfo.visaType}]` : ''}

---

## IV. STATEMENT OF FACTS

[Chronological narrative of beneficiary's career - 3-5 pages]

---

## V. ARGUMENT - CRITERIA ANALYSIS

**CRITICAL STRUCTURE**: You MUST use the following EXACT template structure for EACH criterion claimed:

${criterionTemplates}

[REPEAT THE ABOVE EXACT STRUCTURE FOR ALL CRITERIA THAT APPLY TO THIS CASE]

**CRITICAL REMINDERS**:
1. EVERY criterion MUST have the checkbox format (☐ Yes / ☐ No)
2. EVERY criterion MUST have the Regulatory Standard block with exact CFR citation
3. EVERY criterion MUST have Establishment of Elements with numbered points matching regulatory elements
4. ${hasComparable ? `EVERY criterion MUST have the Comparable Evidence Theory section (even if checking "No")` : `DO NOT include Comparable Evidence Theory (not available for ${beneficiaryInfo.visaType})`}
5. EVERY criterion MUST end with Consideration of Evidence closing
6. Reference SPECIFIC exhibits from Document 3
7. Each criterion should be 3-5 pages of detailed analysis

---

${
  beneficiaryInfo.visaType === 'EB-1A'
    ? `## VI. FINAL MERITS DETERMINATION

### A. Sustained National or International Acclaim
[Kazarian Step 2 analysis using totality of evidence]

### B. Small Percentage at Top of Field
[Statistical and comparative analysis]

### C. Continued Work in Area of Expertise
[Plans for US activities]

**Conclusion**: The totality of evidence demonstrates extraordinary ability.

---
`
    : ''
}
## VII. CONCLUSION

[3-4 powerful paragraphs summarizing why petition should be approved]

For the foregoing reasons, this petition should be APPROVED.

Respectfully submitted,

[Attorney/Representative Name]
[Date]

---

## VIII. EXHIBIT LIST

[Organize all exhibits by criterion, referencing URLs from Document 3]

### EXHIBIT A: BIOGRAPHICAL DOCUMENTATION
- A-1: Passport
- A-2: Curriculum Vitae
[etc.]

### EXHIBIT B: [CRITERION 1 NAME]
- B-1: [Description] - [URL from Doc 3]
- B-2: [Description] - [URL from Doc 3]

[Continue for all exhibits organized by criterion]

**TOTAL EXHIBITS**: [Number]

---

## CRITICAL REQUIREMENTS - ENFORCE STRICTLY:

**BRIEF TYPE**: ${isStandard ? 'STANDARD (15-20 pages, focused)' : 'COMPREHENSIVE (30-50 pages, extensive)'}

${isStandard ? `
### STANDARD BRIEF REQUIREMENTS:
1. **LENGTH**: 15-20 PAGE focused legal brief (~8,000-10,000 words)
2. **DETAIL LEVEL**: Each criterion gets 1-2 pages of focused analysis
3. **FOCUS**: Cover the strongest 3-5 criteria in depth
4. **EFFICIENCY**: Clear, concise arguments without excessive detail
5. **TEMPLATE**: Still follow DIY template structure exactly
` : `
### COMPREHENSIVE BRIEF REQUIREMENTS:
1. **LENGTH**: 30-50 PAGE extensive legal brief (~20,000-25,000 words)
2. **DETAIL LEVEL**: Each criterion gets 3-5 pages of detailed analysis
3. **BREADTH**: Cover ALL applicable criteria thoroughly
4. **DEPTH**: Extensive evidence analysis, comparisons, case law
5. **TOKEN USAGE**: Use ALL allocated tokens - do not truncate
`}

**UNIVERSAL REQUIREMENTS** (Both Standard and Comprehensive):
2. **TEMPLATE ADHERENCE**: EVERY criterion MUST follow the exact DIY template structure above
3. **CHECKBOX FORMAT**: Never skip the ☐ Yes/No checkboxes
4. **CFR CITATIONS**: All citations must be bold and exact: **8 CFR § X.X(x)(x)(x)**
5. **ESTABLISHMENT OF ELEMENTS**: Must have numbered points matching regulatory requirements
6. **COMPARABLE EVIDENCE**: ${hasComparable ? `MUST be included for ALL criteria` : `MUST NOT be included (not available for ${beneficiaryInfo.visaType})`}
7. **CONSIDERATION OF EVIDENCE**: Must end EVERY criterion
8. **SPECIFIC EVIDENCE**: Reference actual exhibits, not vague statements
9. **NO SUMMARIES**: Write complete analysis for each criterion covered

**OUTPUT FORMAT**: Generate the ${isStandard ? 'FOCUSED, EFFICIENT' : 'FULL, UNABBREVIATED'} legal brief following the DIY template structure EXACTLY. This is a formal USCIS petition document.

Generate the COMPLETE legal brief now:`;

  // Adjust max_tokens based on brief type
  const maxTokens = isStandard ? 16000 : 32000; // Standard: 16K, Comprehensive: 32K

    const textResponse = await callAIWithFallback(
      prompt,
      '',
      maxTokens,
      0.2
    );

    return textResponse;
  } catch (error) {
    logError('generateLegalBrief', error);
    progressCallback?.('Generating Legal Brief', 80, 'Error - using fallback content');
    return createFallbackContent('Legal Brief', beneficiaryInfo);
  }
}
// We'll extend with 4 new documents

/**
 * Generate Document 5: Evidence Gap Analysis & Strength Assessment
 */
async function generateEvidenceGapAnalysis(
  beneficiaryInfo: BeneficiaryInfo,
  knowledgeBase: string,
  comprehensiveAnalysis: string,
  publicationAnalysis: string,
  urls: FetchedUrlData[],
  progressCallback?: ProgressCallback
): Promise<string> {
  progressCallback?.('Generating Evidence Gap Analysis', 75, 'Analyzing evidence strengths and identifying gaps...');

  const visaType = beneficiaryInfo.visaType;
  const criteriaCount = visaType === 'O-1A' || visaType === 'EB-1A' ? 8 : visaType === 'O-1B' ? 6 : 5;

  const prompt = `You are an expert immigration analyst and USCIS adjudicator perspective analyzer for ${visaType} visa petitions.

# YOUR TASK

Generate a comprehensive **Evidence Gap Analysis & Strength Assessment** document that provides:

1. **Evidence-by-Evidence Scoring** with USCIS adjudicator perspective
2. **Criterion-by-Criterion Gap Analysis** showing what's missing or weak
3. **RFE Risk Assessment** by criterion
4. **Prioritized Action Items** for strengthening the case
5. **Specific Evidence Gathering Recommendations** with examples

# BENEFICIARY INFORMATION

Name: ${beneficiaryInfo.fullName}
Visa Type: ${visaType}
Field: ${beneficiaryInfo.fieldOfProfession}

Background:
${beneficiaryInfo.background}

# PREVIOUS ANALYSIS TO BUILD UPON

## Comprehensive Analysis Summary
${comprehensiveAnalysis.substring(0, 8000)}

## Publication Analysis Summary
${publicationAnalysis.substring(0, 5000)}

# KNOWLEDGE BASE CONTEXT
${knowledgeBase.substring(0, 15000)}

# DOCUMENT STRUCTURE

## EXECUTIVE SUMMARY
- Overall case strength (Strong/Moderate/Weak)
- Primary strengths (top 3)
- Critical gaps (top 3)
- Overall RFE risk (Low/Medium/High)
- Recommended filing timeline (File Now / Strengthen First / Significant Work Needed)

## EVIDENCE STRENGTH SCORING

For EACH piece of evidence (URLs, uploaded documents):

### Evidence #[N]: [Title/Source]
**Type:** [Award/Media Article/Letter/Publication/etc.]
**Criterion Supported:** [Which criterion(a) this supports]
**Strength Score:** [1-10, where 10 is strongest]
**USCIS Adjudicator Perspective:**
- What adjudicator will see as strengths
- What adjudicator will question or find weak
- Likelihood of acceptance (High/Medium/Low)

**Gaps in This Evidence:**
- Missing elements that would strengthen it
- Additional documentation needed

**Recommendations:**
- Specific actions to improve this evidence
- Alternative evidence if this is weak

[Analyze ALL evidence pieces]

## CRITERION-BY-CRITERION GAP ANALYSIS

For each of the ${criteriaCount} applicable criteria:

### Criterion #[X]: [Full Criterion Name]
**Current Evidence Provided:** [List evidence]
**Evidence Strength:** [Strong/Moderate/Weak]
**USCIS Adequacy Assessment:** [Meets/Partially Meets/Does Not Meet Standard]

**Gaps Identified:**
1. [Specific gap with explanation]
2. [Specific gap with explanation]

**RFE Risk for This Criterion:** [Low/Medium/High]

**Common RFE Triggers:**
- [Trigger from USCIS patterns]
- [Trigger from USCIS patterns]

**Does Current Evidence Avoid These Triggers?** [Yes/No with explanation]

**Recommended Evidence to Add:**
1. [Specific evidence type with example]
2. [Specific evidence type with example]

**Priority Level:** [Critical/High/Medium/Low]

## RFE PREVENTION ANALYSIS

### Overall RFE Risk Assessment
**Overall Risk Level:** [Low/Medium/High]
**Criteria Most Likely to Trigger RFE:** [List top 2-3]

### Criterion-Specific RFE Scenarios
For each Medium/High RFE risk criterion:
- Likely RFE language USCIS would use
- Why this RFE would be issued
- Evidence needed to prevent it
- Timeline to gather

## PRIORITIZED ACTION PLAN

### CRITICAL (Must Address Before Filing)
1. [Action with specifics: what, from whom, timeframe, impact]
2. [Next action]

### HIGH PRIORITY (Strongly Recommended)
[Same format]

### MEDIUM PRIORITY (Would Strengthen Case)
[Same format]

### LOW PRIORITY (Nice to Have)
[Same format]

## TIMELINE RECOMMENDATION

**Filing Readiness:** [File Now / 2-4 Weeks / 1-2 Months / 3+ Months]
**Reasoning:** [Detailed explanation]
**Optimal Filing Strategy:** [Specific recommendations]

## PREPARATION CHECKLIST

Before final review and filing:
- [ ] All critical gaps addressed
- [ ] High-priority evidence gathered
- [ ] Evidence organized by criterion
- [ ] Weak evidence supplemented or removed
- [ ] RFE prevention strategies documented

## CONCLUSION
[2-3 paragraph summary]

---

Generate the COMPLETE evidence gap analysis now (be brutally honest about weaknesses):`;

  const textResponse = await callAIWithFallback(
    prompt,
    '',
    16384,
    0.3
  );

  return textResponse;
}

/**
 * Generate Document 6: USCIS Cover Letter
 */
async function generateCoverLetter(
  beneficiaryInfo: BeneficiaryInfo,
  comprehensiveAnalysis: string,
  progressCallback?: ProgressCallback
): Promise<string> {
  progressCallback?.('Generating Cover Letter', 85, 'Creating USCIS submission cover letter...');

  const visaType = beneficiaryInfo.visaType;
  // Extract criteria info for cover letter
  comprehensiveAnalysis.substring(0, 10000);

  const prompt = `You are an expert immigration professional preparing a USCIS cover letter.

# YOUR TASK
Generate a professional, formal USCIS cover letter for a ${visaType} visa petition.

# BENEFICIARY INFORMATION
Name: ${beneficiaryInfo.fullName}
Visa Type: ${visaType}
Field: ${beneficiaryInfo.fieldOfProfession}

# FORMAT

[DATE]

U.S. Citizenship and Immigration Services
${visaType === 'EB-1A' ? 'I-140 Unit' : 'I-129 Nonimmigrant Classifications'}
[Appropriate Service Center]

**Re: ${visaType === 'EB-1A' ? 'Form I-140' : 'Form I-129'} Petition for ${visaType} Classification**
**Petitioner:** [Name]
**Beneficiary:** ${beneficiaryInfo.fullName}
**Field of Expertise:** ${beneficiaryInfo.fieldOfProfession}

Dear Immigration Officer:

## INTRODUCTION
[2-3 paragraphs introducing petition and beneficiary]

## BENEFICIARY QUALIFICATIONS SUMMARY
[2-3 paragraphs highlighting most compelling qualifications]

## CRITERIA SATISFIED
This petition establishes ${visaType} qualification under the following criteria:

[List applicable criteria with checkboxes - mark ☑ for claimed criteria based on analysis]

## PETITION CONTENTS
**Volume I: Legal Documents**
- Cover Letter
- Legal Brief
- Comprehensive Analysis
- Publication Analysis
- Evidence Gap Analysis
- Visa Checklist
- Exhibit Guide

**Volume II: Supporting Evidence**
- Organized by criterion with exhibit numbers

## REQUEST FOR APPROVAL
[Professional closing requesting approval]

## CONTACT INFORMATION
Email: ${beneficiaryInfo.recipientEmail}

Respectfully submitted,

[Signature block]

---

**INSTRUCTIONS:**
- Professional, confident tone
- Extract claimed criteria from analysis
- Highlight top 3 strengths
- 2-3 pages maximum

Generate complete cover letter now:`;

  const textResponse = await callAIWithFallback(
    prompt,
    '',
    2048,
    0.2
  );

  return textResponse;
}

/**
 * Generate Document 7: Visa Checklist (NOT "Attorney Checklist" - for public use)
 */
async function generateVisaChecklist(
  beneficiaryInfo: BeneficiaryInfo,
  gapAnalysis: string,
  progressCallback?: ProgressCallback
): Promise<string> {
  progressCallback?.('Generating Visa Checklist', 90, 'Creating quick reference scorecard...');

  const visaType = beneficiaryInfo.visaType;

  const prompt = `You are creating a Visa Checklist for immigration professionals and petitioners.

# YOUR TASK
Generate a **1-2 page Visa Checklist** - a quick-scan scorecard for case assessment.

IMPORTANT: Do NOT use "attorney" or "legal" language - this is for public use by petitioners and immigration professionals.

# BENEFICIARY
Name: ${beneficiaryInfo.fullName}
Visa Type: ${visaType}
Field: ${beneficiaryInfo.fieldOfProfession}

# GAP ANALYSIS CONTEXT
${gapAnalysis.substring(0, 8000)}

# CHECKLIST FORMAT

# VISA PETITION CHECKLIST
## ${visaType} Classification for ${beneficiaryInfo.fullName}

---

## CASE STRENGTH OVERVIEW

**Overall Assessment:** [Strong/Moderate/Weak] ⭐⭐⭐⭐⭐

**Filing Recommendation:** [✅ File Now / ⚠️ Strengthen First / ❌ Significant Work Needed]

**Approval Probability:** [High (>75%) / Medium (50-75%) / Low (<50%)]

**RFE Risk:** [🟢 Low / 🟡 Medium / 🔴 High]

---

## CRITERIA SCORECARD

| Criterion | Status | Strength | Evidence Count | Notes |
|-----------|--------|----------|----------------|-------|
| #1: [Name] | ✅/⚠️/❌ | 🟢/🟡/🔴 | [#] | [Brief] |
[Continue for all criteria]

**Criteria Met:** [X] of [Y] required
**Status:** [✅ Sufficient / ⚠️ Borderline / ❌ Insufficient]

---

## TOP 5 STRENGTHS 💪
1. [Strength with explanation]
2. [Strength with explanation]
[Continue...]

---

## TOP 5 WEAKNESSES/RISKS ⚠️
1. [Weakness] - RFE Risk: [Low/Med/High]
2. [Weakness] - RFE Risk: [Low/Med/High]
[Continue...]

---

## CRITICAL ACTION ITEMS

- [ ] **[Action Item]**
  - Timeframe: [X days/weeks]
  - Responsible Party: [Client/Representative/Third Party]
  - Impact: [High/Med/Low]

[List all critical items]

---

## RECOMMENDED ACTIONS

- [ ] [Action] - Impact: [High/Med/Low] - Timeframe: [X]
[Continue...]

---

## EVIDENCE INVENTORY

**Total Evidence:** [Count]
- URLs: [Count]
- Documents: [Count]

**By Type:**
- 🏆 Awards: [Count] - Strength: [Strong/Mod/Weak]
- 📰 Media: [Count] - Strength: [Strong/Mod/Weak]
- 📄 Letters: [Count] - Strength: [Strong/Mod/Weak]
[Continue...]

---

## RFE RISK BREAKDOWN

**Overall RFE Probability:** [XX%]

**High-Risk Criteria:**
1. Criterion #[X] - Risk: 🔴 High - Reason: [Brief]

**Medium-Risk Criteria:**
1. Criterion #[X] - Risk: 🟡 Medium - Reason: [Brief]

---

## TIMELINE ESTIMATE

**If Filing Today:**
- Processing: [X months]
- RFE Likelihood: [XX%]
- Approval Likelihood: [XX%]

**If Strengthening First ([X weeks]):**
- RFE Likelihood: [XX%] (reduced)
- Approval Likelihood: [XX%] (increased)

**Recommended Filing Date:** [Specific or conditional]

---

## DOCUMENT READINESS

- [ ] Cover letter complete
- [ ] Legal brief complete
- [ ] Evidence organized
- [ ] Exhibit list prepared
- [ ] Forms completed
- [ ] Filing fee confirmed

---

## PREPARATION NOTES

[Space for case-specific notes]

---

## NEXT STEPS FOR PREPARATION

- [ ] Organize exhibits by criterion
- [ ] Verify all citations
- [ ] Quality check documents
- [ ] Schedule follow-up for missing evidence

---

**INSTRUCTIONS:**
- Use color coding: 🟢 Strong, 🟡 Moderate, 🔴 Weak
- Be specific and actionable
- NO "attorney" or "legal professional" language - this is for public/petitioner use
- Include realistic timeframes

Generate complete checklist now:`;

  const textResponse = await callAIWithFallback(
    prompt,
    '',
    4096,
    0.3
  );

  return textResponse;
}

/**
 * Generate Document 8: Exhibit Assembly Guide
 */
async function generateExhibitGuide(
  beneficiaryInfo: BeneficiaryInfo,
  urls: FetchedUrlData[],
  legalBrief: string,
  progressCallback?: ProgressCallback
): Promise<string> {
  progressCallback?.('Generating Exhibit Guide', 95, 'Creating exhibit assembly instructions...');

  const visaType = beneficiaryInfo.visaType;
  const uploadedFiles = beneficiaryInfo.uploadedFiles || [];

  const prompt = `You are creating an exhibit assembly guide for a ${visaType} petition.

# YOUR TASK
Generate a comprehensive **Exhibit Assembly Guide** for organizing evidence into a professional USCIS submission.

# BENEFICIARY
Name: ${beneficiaryInfo.fullName}
Visa Type: ${visaType}

# EVIDENCE AVAILABLE

## URLs (${urls.length} total)
${urls.map((url, idx) => `${idx + 1}. ${url.url} - ${url.title || 'Untitled'}`).join('\n')}

## Files (${uploadedFiles.length} total)
${uploadedFiles.map((file, idx) => `${idx + 1}. ${file.filename}`).join('\n')}

# LEGAL BRIEF CONTEXT
${legalBrief.substring(0, 8000)}

# EXHIBIT GUIDE FORMAT

# EXHIBIT ASSEMBLY GUIDE
## ${visaType} Petition for ${beneficiaryInfo.fullName}

---

## TABLE OF CONTENTS
1. Organization Overview
2. Detailed Exhibit List by Criterion
3. Assembly Instructions
4. Highlighting Guide
5. Quality Control Checklist

---

## 1. ORGANIZATION OVERVIEW

**Total Exhibits:** [Count]
**Organization:** By Criterion

**Binder Structure:**
- Volume I: Legal Documents
- Volume II: Evidence by Criterion

**Labeling:**
- Criterion 1: A-1, A-2, A-3...
- Criterion 2: B-1, B-2, B-3...
[Continue pattern]

---

## 2. DETAILED EXHIBIT LIST BY CRITERION

### CRITERION 1: [Name]

**Exhibit A-1:** [Title]
- **Source:** [URL/filename]
- **Type:** [Award/Article/etc.]
- **Pages:** [X]
- **Key Points:**
  * [What this proves]
  * [Specific evidence]
- **Highlighting:**
  * Page [X]: Highlight "[text]" - Shows [what]
  * Page [X]: Circle [data point]
- **Tab Color:** Yellow
- **Legal Brief Reference:** p. [X]

[Continue for all exhibits in each criterion]

---

## 3. ASSEMBLY INSTRUCTIONS

### Step 1: Print All Documents
- [ ] Cover Letter
- [ ] Legal Brief
- [ ] All analyses
- [ ] All URL evidence as PDFs
- [ ] All uploaded documents

**Specs:** Single-sided, 8.5x11, 20lb paper

### Step 2: Organize by Criterion
1. Gather exhibits per criterion
2. Arrange by strength (strongest first)
3. Insert tab dividers
4. Number pages

### Step 3: Create Exhibit Labels
[Template for exhibit cover pages]

### Step 4: Apply Highlighting
[Follow highlighting guide]

### Step 5: Assemble Binders
**Volume I:** Legal docs
**Volume II:** Evidence by criterion

### Step 6: Page Numbering
Volume I: Roman numerals
Volume II: Arabic numerals

---

## 4. HIGHLIGHTING GUIDE

### Principles
✅ DO: Highlight facts, achievements, data
❌ DON'T: Over-highlight (max 30% per page)

### Exhibit-Specific Instructions
[Detailed highlighting for each piece of evidence]

---

## 5. QUALITY CONTROL CHECKLIST

- [ ] All exhibits referenced in brief are included
- [ ] Exhibit numbers match brief citations
- [ ] All pages present
- [ ] Organization correct
- [ ] Highlighting strategic
- [ ] Professional presentation

---

## 6. FILING INSTRUCTIONS

**USCIS Address:** [Appropriate service center for ${visaType}]

**Shipping:** Use tracked method

---

## 7. TIMELINE ESTIMATES

**Assembly Time:**
- Printing: 1-2 hours
- Organizing: 2-3 hours
- Highlighting: 3-4 hours
- Quality control: 1-2 hours
- **Total: 7-11 hours**

---

Generate complete exhibit guide now:`;

  const textResponse = await callAIWithFallback(
    prompt,
    '',
    8192,
    0.2
  );

  return textResponse;
}

// Export the new generation functions for integration
export {
  generateEvidenceGapAnalysis,
  generateCoverLetter,
  generateVisaChecklist,
  generateExhibitGuide,
};
