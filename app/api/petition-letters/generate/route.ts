import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface PetitionLetterRequest {
  letterType: 'cover' | 'support' | 'advisory' | 'expert-opinion' | 'employer';
  beneficiaryName: string;
  visaType: string;
  petitionerName: string;
  petitionerOrganization: string;
  fieldOfExpertise: string;
  keyAchievements: string;
  caseNarrative: string;
  includeLogo: boolean;
  generateAILogo: boolean;
  logoStyle?: string;
  // Template to use as reference (user-provided)
  templateContent?: string;
}

// Letter type configurations with prompts
const letterConfigs: Record<string, { title: string; systemPrompt: string }> = {
  'cover': {
    title: 'USCIS Cover Letter',
    systemPrompt: `You are an expert immigration attorney drafting a cover letter for a USCIS visa petition.
The letter should:
- Be addressed to USCIS
- Clearly identify the visa classification being requested
- Summarize the beneficiary's extraordinary ability qualifications
- Reference the enclosed exhibits and evidence
- Be professional, persuasive, and legally precise
- Follow standard immigration law formatting conventions`
  },
  'support': {
    title: 'Support Letter',
    systemPrompt: `You are drafting a third-party support letter for an immigration petition.
The letter should:
- Be written from the perspective of a professional colleague or expert in the field
- Attest to the beneficiary's extraordinary achievements and reputation
- Provide specific examples and observations
- Explain why the beneficiary meets the visa criteria
- Include the writer's qualifications to provide this assessment
- Be on professional letterhead format`
  },
  'advisory': {
    title: 'Advisory Opinion Letter',
    systemPrompt: `You are drafting an expert advisory opinion letter for an immigration petition.
The letter should:
- Provide authoritative expert opinion on the beneficiary's standing in their field
- Compare the beneficiary to peers and industry standards
- Assess specific achievements and their significance
- Reference objective criteria and metrics
- Be written in formal academic/professional tone
- Include credentials of the opinion provider`
  },
  'expert-opinion': {
    title: 'Expert Opinion Letter',
    systemPrompt: `You are drafting a detailed expert opinion letter for an immigration petition.
The letter should:
- Provide in-depth analysis of the beneficiary's contributions to their field
- Explain technical achievements in accessible terms
- Assess the impact and significance of the work
- Compare to standards for extraordinary ability
- Cite specific evidence and documentation
- Conclude with a clear opinion on visa eligibility`
  },
  'employer': {
    title: 'Employer Support Letter',
    systemPrompt: `You are drafting an employer support letter for an immigration petition.
The letter should:
- Confirm the employment offer and position details
- Explain why this specific beneficiary is essential
- Describe the role and its requirements
- Attest to the beneficiary's qualifications
- Confirm compensation and terms
- Be on company letterhead format`
  }
};

function buildLetterPrompt(data: PetitionLetterRequest): string {
  const config = letterConfigs[data.letterType] || letterConfigs['cover'];

  let prompt = `Generate a professional ${config.title} for the following visa petition case:

## CASE DETAILS
- Beneficiary: ${data.beneficiaryName}
- Visa Type: ${data.visaType}
- Field of Expertise: ${data.fieldOfExpertise}
- Petitioner: ${data.petitionerName}
- Organization: ${data.petitionerOrganization}

## KEY ACHIEVEMENTS
${data.keyAchievements}

## CASE NARRATIVE
${data.caseNarrative}

`;

  if (data.templateContent) {
    prompt += `
## REFERENCE TEMPLATE
Use the following template as a style and format reference:
---
${data.templateContent}
---

`;
  }

  prompt += `
Generate a complete, professional letter ready for signature. Include appropriate:
- Date placeholder [DATE]
- Letterhead format suggestions
- Signature block
- Any necessary disclaimers

The letter should be compelling, factually grounded, and legally appropriate for USCIS submission.`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: PetitionLetterRequest = await request.json();

    if (!body.beneficiaryName || !body.visaType) {
      return NextResponse.json(
        { error: 'Beneficiary name and visa type are required' },
        { status: 400 }
      );
    }

    const config = letterConfigs[body.letterType] || letterConfigs['cover'];
    const prompt = buildLetterPrompt(body);

    // Generate the letter
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: config.systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    const letterContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Generate AI logo if requested
    let logoUrl: string | null = null;
    if (body.includeLogo && body.generateAILogo) {
      // For now, return a placeholder - in production, integrate with DALL-E or similar
      logoUrl = await generateAILogo(body.petitionerOrganization, body.logoStyle || 'professional');
    }

    return NextResponse.json({
      success: true,
      letterType: body.letterType,
      title: config.title,
      letter: letterContent,
      logo: logoUrl,
      beneficiary: body.beneficiaryName,
      visaType: body.visaType,
      generatedAt: new Date().toISOString(),
      wordCount: letterContent.split(/\s+/).length,
    });

  } catch (error: any) {
    console.error('Petition letter generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate letter' },
      { status: 500 }
    );
  }
}

// AI Logo Generation (placeholder - integrate with OpenAI DALL-E or similar)
async function generateAILogo(organizationName: string, style: string): Promise<string | null> {
  try {
    // In production, call OpenAI DALL-E API
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.images.generate({
    //   model: "dall-e-3",
    //   prompt: `Professional ${style} logo for "${organizationName}", clean design, suitable for legal letterhead`,
    //   n: 1,
    //   size: "256x256",
    // });
    // return response.data[0].url;

    // For now, return null - logo generation needs OpenAI integration
    console.log(`[Logo] Would generate ${style} logo for: ${organizationName}`);
    return null;
  } catch (error) {
    console.error('Logo generation error:', error);
    return null;
  }
}

// Get available letter types
export async function GET() {
  return NextResponse.json({
    letterTypes: Object.entries(letterConfigs).map(([id, config]) => ({
      id,
      title: config.title,
    })),
    visaTypes: ['O-1A', 'O-1B', 'P-1A', 'P-1B', 'EB-1A', 'EB-1B', 'EB-2 NIW'],
    logoStyles: [
      { id: 'professional', name: 'Professional/Corporate' },
      { id: 'modern', name: 'Modern/Minimal' },
      { id: 'academic', name: 'Academic/Institutional' },
      { id: 'creative', name: 'Creative/Artistic' },
      { id: 'tech', name: 'Technology/Innovation' },
    ],
  });
}
