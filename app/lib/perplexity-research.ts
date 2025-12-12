import axios from 'axios';
import { BeneficiaryInfo } from '../types';

// Perplexity API configuration
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface DiscoveredSource {
  url: string;
  title: string;
  source_name: string;
  tier: 1 | 2 | 3;
  criteria: string[];
  key_content: string;
  date_published?: string;
  evidence_type: string;
}

interface TitleAnalysis {
  title: string;
  level_descriptor: string;
  domain: string;
  role: string;
  specialization: string;
  scope_type: 'EXPANDING' | 'RESTRICTING' | 'SPLITTING';
  evidence_boundaries: string;
  primary_criteria: string[];
  secondary_criteria: string[];
  weak_criteria: string[];
  research_strategy: 'Competitor/Performer' | 'Creator/Researcher' | 'Business/Leadership' | 'Multi-Domain';
  evidence_threshold: string;
}

interface ResearchResult {
  titleAnalysis: TitleAnalysis;
  discoveredSources: DiscoveredSource[];
  totalSourcesFound: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  criteriaCoverage: string[];
  researchSummary: string;
  costEstimate: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}

/**
 * Conduct title analysis for the beneficiary
 */
async function analyzeBeneficiaryTitle(
  beneficiaryInfo: BeneficiaryInfo
): Promise<TitleAnalysis> {
  const systemPrompt = `You are an expert immigration attorney analyzing beneficiary job titles for visa petitions.

Reference the BENEFICIARY_TITLE_RESEARCH_GUIDE.md methodology to analyze the beneficiary's professional title.

Your analysis must determine:
1. Level descriptor (world-class, elite, professional, accomplished, emerging)
2. Domain (the field/sport/industry)
3. Role (competitor, creator, leader, performer, etc.)
4. Specialization (any specific niche)
5. Scope type (EXPANDING, RESTRICTING, or SPLITTING)
6. Evidence boundaries (what counts vs what doesn't)
7. Primary criteria this title naturally supports
8. Secondary criteria (possible but harder)
9. Weak criteria (unlikely for this title)
10. Research strategy to use
11. Evidence threshold (what achievements are "good enough")

Return your analysis in JSON format.`;

  const fieldOfWork = beneficiaryInfo.fieldOfExpertise || beneficiaryInfo.fieldOfProfession;
  const userPrompt = `Analyze this beneficiary's title and professional descriptor:

**Full Name:** ${beneficiaryInfo.fullName}
**Professional Title/Description:** ${beneficiaryInfo.jobTitle || beneficiaryInfo.occupation || 'Professional in ' + fieldOfWork}
**Field:** ${fieldOfWork}
**Visa Type:** ${beneficiaryInfo.visaType}
**Country of Origin:** ${beneficiaryInfo.nationality || 'Not specified'}
**Background:** ${beneficiaryInfo.background}

Provide a complete title analysis following the BENEFICIARY_TITLE_RESEARCH_GUIDE.md framework.`;

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await axios.post<PerplexityResponse>(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',
        messages,
        temperature: 0.1,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // If no JSON found, create a default analysis
    const fieldOfWork = beneficiaryInfo.fieldOfExpertise || beneficiaryInfo.fieldOfProfession || beneficiaryInfo.profession || 'Professional Field';
    return {
      title: beneficiaryInfo.jobTitle || beneficiaryInfo.occupation || 'Professional',
      level_descriptor: 'professional',
      domain: fieldOfWork,
      role: 'professional',
      specialization: 'general',
      scope_type: 'RESTRICTING',
      evidence_boundaries: 'Focus on achievements directly related to the stated field',
      primary_criteria: ['Awards', 'Published Material', 'Critical Role'],
      secondary_criteria: ['Membership', 'Original Contributions'],
      weak_criteria: ['Judging', 'Scholarly Articles'],
      research_strategy: 'Competitor/Performer',
      evidence_threshold: 'Demonstrated excellence in the field with quantifiable achievements'
    };
  } catch (error: any) {
    console.error('Error in title analysis:', error.response?.data || error.message);
    throw new Error(`Title analysis failed: ${error.message}`);
  }
}

/**
 * Conduct Phase 1: Identity & Primary Achievement Discovery
 */
async function conductPhase1Research(
  beneficiaryInfo: BeneficiaryInfo,
  titleAnalysis: TitleAnalysis
): Promise<{ sources: DiscoveredSource[]; tokens: { input: number; output: number } }> {
  const systemPrompt = `You are an expert research paralegal conducting Phase 1 identity and primary achievement discovery for a visa petition.

Reference COMPREHENSIVE_RESEARCH_METHODOLOGY_TRAINING.md for the professional attorney methodology.

Your task: Find 8-12 high-quality sources that establish:
1. WHO the beneficiary is (identity confirmation)
2. Primary field and specialization
3. Top 1-3 signature achievements
4. Career highlights and timeline

CRITICAL INSTRUCTIONS:
- Apply the 4-Tier Source Quality Framework (Tier 1 = best)
- Use Wikipedia mining strategy: Extract external links, NEVER cite Wikipedia text
- Focus on Tier 1-2 sources (BBC, ESPN, Reuters, USA Today, major sports media)
- For each source found, provide: URL, title, source name, tier, criteria it supports, key content

Title Analysis Context:
- Scope: ${titleAnalysis.scope_type}
- Primary Criteria: ${titleAnalysis.primary_criteria.join(', ')}
- Research Strategy: ${titleAnalysis.research_strategy}

Return results as a JSON array of sources.`;

  const userPrompt = `Conduct Phase 1 research for:

**Name:** ${beneficiaryInfo.fullName}
**Title:** ${titleAnalysis.title}
**Field:** ${titleAnalysis.domain}
**Visa Type:** ${beneficiaryInfo.visaType}

Find 8-12 high-quality Tier 1-2 sources for identity confirmation and primary achievements.

User already provided these URLs (do NOT duplicate):
${(beneficiaryInfo.urls || beneficiaryInfo.primaryUrls)?.slice(0, 5).join('\n') || 'None provided yet'}

Focus on NEW sources not in the list above.`;

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await axios.post<PerplexityResponse>(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',
        messages,
        temperature: 0.2,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const usage = response.data.usage;

    // Try to parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let sources: DiscoveredSource[] = [];

    if (jsonMatch) {
      sources = JSON.parse(jsonMatch[0]);
    }

    return {
      sources,
      tokens: {
        input: usage.prompt_tokens,
        output: usage.completion_tokens
      }
    };
  } catch (error: any) {
    console.error('Error in Phase 1 research:', error.response?.data || error.message);
    return { sources: [], tokens: { input: 0, output: 0 } };
  }
}

/**
 * Conduct Phase 2: Criterion-Specific Deep Dive
 */
async function conductPhase2Research(
  beneficiaryInfo: BeneficiaryInfo,
  titleAnalysis: TitleAnalysis,
  phase1Sources: DiscoveredSource[]
): Promise<{ sources: DiscoveredSource[]; tokens: { input: number; output: number } }> {
  const systemPrompt = `You are an expert research paralegal conducting Phase 2 criterion-specific research for a visa petition.

Reference COMPREHENSIVE_RESEARCH_METHODOLOGY_TRAINING.md for field-specific research protocols.

Your task: Find 10-15 sources focused on the PRIMARY CRITERIA for this case.

CRITICAL FIELD-SPECIFIC PROTOCOLS:
- Combat Sports (MMA/Boxing): National team focus, Tapology/Fight Matrix rankings, MMA Junkie/Sherdog
- Tennis: National team selection (game-changer), ATP/WTA rankings, tournament results
- Cricket: National team caps, CricInfo, country competitiveness matters
- Figure Skating: Olympic participation, ISU rankings, Disney on Ice = distinguished org

Apply the professional attorney methodology:
- National team = satisfies multiple criteria (Awards, Membership, Critical Role, Press)
- Rankings from multiple systems (verify with contacts)
- "5-7 pages" per source (not too few, not too many)
- Capture context (ranked AMONG peers, not just individual ranking)

Return results as JSON array.`;

  const userPrompt = `Conduct Phase 2 criterion-specific research for:

**Name:** ${beneficiaryInfo.fullName}
**Title:** ${titleAnalysis.title}
**Field:** ${titleAnalysis.domain}
**Primary Criteria to Focus:** ${titleAnalysis.primary_criteria.join(', ')}

Find 10-15 sources targeting these specific criteria. Focus on field-specific databases and authoritative sources.

Already found ${phase1Sources.length} sources in Phase 1. Find NEW sources.`;

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await axios.post<PerplexityResponse>(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',
        messages,
        temperature: 0.2,
        max_tokens: 5000,
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const usage = response.data.usage;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let sources: DiscoveredSource[] = [];

    if (jsonMatch) {
      sources = JSON.parse(jsonMatch[0]);
    }

    return {
      sources,
      tokens: {
        input: usage.prompt_tokens,
        output: usage.completion_tokens
      }
    };
  } catch (error: any) {
    console.error('Error in Phase 2 research:', error.response?.data || error.message);
    return { sources: [], tokens: { input: 0, output: 0 } };
  }
}

/**
 * Conduct Phase 3: Media & Recognition Research
 */
async function conductPhase3Research(
  beneficiaryInfo: BeneficiaryInfo,
  titleAnalysis: TitleAnalysis,
  existingSources: DiscoveredSource[]
): Promise<{ sources: DiscoveredSource[]; tokens: { input: number; output: number } }> {
  const systemPrompt = `You are an expert research paralegal conducting Phase 3 media and recognition research.

Apply the 4-Tier Source Quality Framework:
- TIER 1 (Gold): BBC, ESPN, CNN, NYT, Reuters, USA Today, major sports networks
- TIER 2 (Strong): Industry publications (MMA Junkie, Variety, Billboard), regional major outlets
- TIER 3 (Supplementary): Niche publications, established blogs
- TIER 4 (AVOID): Social media, self-published, Wikipedia text

Your task: Find 8-12 Tier 1-2 media sources featuring the beneficiary.

CRITICAL:
- Better to have 3 Tier 1 sources than 20 Tier 3 sources
- MMA Junkie (USA Today Sports) = Tier 1 for combat sports
- Articles must be ABOUT the beneficiary, not just mentioning them
- Include expert commentary where possible

Return results as JSON array.`;

  const userPrompt = `Conduct Phase 3 media research for:

**Name:** ${beneficiaryInfo.fullName}
**Field:** ${titleAnalysis.domain}

Find 8-12 TIER 1-2 media sources with coverage of the beneficiary's achievements.

Already found ${existingSources.length} sources. Find NEW media coverage.`;

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await axios.post<PerplexityResponse>(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',
        messages,
        temperature: 0.2,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const usage = response.data.usage;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    let sources: DiscoveredSource[] = [];

    if (jsonMatch) {
      sources = JSON.parse(jsonMatch[0]);
    }

    return {
      sources,
      tokens: {
        input: usage.prompt_tokens,
        output: usage.completion_tokens
      }
    };
  } catch (error: any) {
    console.error('Error in Phase 3 research:', error.response?.data || error.message);
    return { sources: [], tokens: { input: 0, output: 0 } };
  }
}

/**
 * Main research orchestration function
 */
export async function conductPerplexityResearch(
  beneficiaryInfo: BeneficiaryInfo,
  progressCallback?: (stage: string, progress: number, message: string) => void
): Promise<ResearchResult> {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Step 0: Title Analysis
    if (progressCallback) {
      progressCallback('Perplexity Research', 5, 'Analyzing beneficiary title...');
    }

    const titleAnalysis = await analyzeBeneficiaryTitle(beneficiaryInfo);

    // Phase 1: Identity & Primary Achievements
    if (progressCallback) {
      progressCallback('Perplexity Research', 10, 'Phase 1: Discovering primary achievements...');
    }

    const phase1Result = await conductPhase1Research(beneficiaryInfo, titleAnalysis);
    totalInputTokens += phase1Result.tokens.input;
    totalOutputTokens += phase1Result.tokens.output;

    // Phase 2: Criterion-Specific Research
    if (progressCallback) {
      progressCallback('Perplexity Research', 15, 'Phase 2: Finding criterion-specific evidence...');
    }

    const phase2Result = await conductPhase2Research(beneficiaryInfo, titleAnalysis, phase1Result.sources);
    totalInputTokens += phase2Result.tokens.input;
    totalOutputTokens += phase2Result.tokens.output;

    // Phase 3: Media Coverage
    if (progressCallback) {
      progressCallback('Perplexity Research', 18, 'Phase 3: Discovering media coverage...');
    }

    const allSources = [...phase1Result.sources, ...phase2Result.sources];
    const phase3Result = await conductPhase3Research(beneficiaryInfo, titleAnalysis, allSources);
    totalInputTokens += phase3Result.tokens.input;
    totalOutputTokens += phase3Result.tokens.output;

    // Combine all discovered sources
    const discoveredSources = [
      ...phase1Result.sources,
      ...phase2Result.sources,
      ...phase3Result.sources
    ];

    // Calculate tier distribution
    const tier1Count = discoveredSources.filter(s => s.tier === 1).length;
    const tier2Count = discoveredSources.filter(s => s.tier === 2).length;
    const tier3Count = discoveredSources.filter(s => s.tier === 3).length;

    // Get criteria coverage
    const criteriaCoverage = Array.from(
      new Set(discoveredSources.flatMap(s => s.criteria))
    );

    // Calculate cost (Perplexity pricing: $1/M input, $1/M output for sonar model)
    const estimatedCost = ((totalInputTokens / 1_000_000) * 1) + ((totalOutputTokens / 1_000_000) * 1);

    const researchSummary = `Perplexity research discovered ${discoveredSources.length} new sources:
- Tier 1 (Gold standard): ${tier1Count} sources
- Tier 2 (Strong): ${tier2Count} sources
- Tier 3 (Supplementary): ${tier3Count} sources

Criteria Coverage: ${criteriaCoverage.join(', ')}

Title Analysis: ${titleAnalysis.scope_type} scope, ${titleAnalysis.research_strategy} strategy
Primary Focus: ${titleAnalysis.primary_criteria.join(', ')}`;

    if (progressCallback) {
      progressCallback('Perplexity Research', 20, `Discovered ${discoveredSources.length} new sources across 3 research phases`);
    }

    return {
      titleAnalysis,
      discoveredSources,
      totalSourcesFound: discoveredSources.length,
      tier1Count,
      tier2Count,
      tier3Count,
      criteriaCoverage,
      researchSummary,
      costEstimate: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        estimatedCost
      }
    };
  } catch (error: any) {
    console.error('Error in Perplexity research:', error);

    // Return minimal result on error
    const fieldOfWork = beneficiaryInfo.fieldOfExpertise || beneficiaryInfo.fieldOfProfession || beneficiaryInfo.profession || 'Professional Field';
    return {
      titleAnalysis: {
        title: beneficiaryInfo.jobTitle || 'Professional',
        level_descriptor: 'professional',
        domain: fieldOfWork,
        role: 'professional',
        specialization: 'general',
        scope_type: 'RESTRICTING',
        evidence_boundaries: '',
        primary_criteria: [],
        secondary_criteria: [],
        weak_criteria: [],
        research_strategy: 'Competitor/Performer',
        evidence_threshold: ''
      },
      discoveredSources: [],
      totalSourcesFound: 0,
      tier1Count: 0,
      tier2Count: 0,
      tier3Count: 0,
      criteriaCoverage: [],
      researchSummary: `Perplexity research encountered an error: ${error.message}`,
      costEstimate: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        estimatedCost: 0
      }
    };
  }
}

export type { ResearchResult, TitleAnalysis, DiscoveredSource };
