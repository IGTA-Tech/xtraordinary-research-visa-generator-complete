import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SupportLetterRequest {
  letterType: 'expert' | 'employer' | 'peer' | 'advisory';
  beneficiary: {
    name: string;
    visaType: string;
    field: string;
    achievements: string;
  };
  writer: {
    name: string;
    title: string;
    organization: string;
    email: string;
    relationship: string;
  };
  content: {
    keyPoints: string;
    specificExamples: string;
  };
}

const letterPrompts: Record<string, (req: SupportLetterRequest) => string> = {
  'expert': (req) => `Generate a professional Expert Opinion Letter for a ${req.beneficiary.visaType} visa petition.

LETTER WRITER:
- Name: ${req.writer.name}
- Title: ${req.writer.title}
- Organization: ${req.writer.organization}
- Relationship to Beneficiary: ${req.writer.relationship}

BENEFICIARY:
- Name: ${req.beneficiary.name}
- Field: ${req.beneficiary.field}
- Key Achievements: ${req.beneficiary.achievements}

KEY POINTS TO ADDRESS:
${req.content.keyPoints}

SPECIFIC EXAMPLES TO MENTION:
${req.content.specificExamples}

Generate a comprehensive expert opinion letter that:
1. Establishes the writer's credentials and expertise
2. Explains how the writer knows the beneficiary
3. Provides detailed analysis of the beneficiary's extraordinary ability
4. Addresses specific visa criteria with concrete examples
5. Compares the beneficiary to others in the field
6. Concludes with strong endorsement

Format as a formal letter on letterhead with date, address, salutation, body paragraphs, and signature block.`,

  'employer': (req) => `Generate a professional Employer Support Letter for a ${req.beneficiary.visaType} visa petition.

EMPLOYER/LETTER WRITER:
- Name: ${req.writer.name}
- Title: ${req.writer.title}
- Organization: ${req.writer.organization}
- Relationship: ${req.writer.relationship}

BENEFICIARY:
- Name: ${req.beneficiary.name}
- Field: ${req.beneficiary.field}
- Achievements: ${req.beneficiary.achievements}

KEY POINTS:
${req.content.keyPoints}

SPECIFIC EXAMPLES:
${req.content.specificExamples}

Generate an employer support letter that:
1. Introduces the organization and its reputation
2. Describes the position offered to the beneficiary
3. Explains why the beneficiary is uniquely qualified
4. Details the beneficiary's expected contributions
5. Confirms employment terms and compensation
6. Emphasizes the organization's need for this specific individual

Format as a formal business letter.`,

  'peer': (req) => `Generate a professional Peer Recommendation Letter for a ${req.beneficiary.visaType} visa petition.

PEER/COLLEAGUE:
- Name: ${req.writer.name}
- Title: ${req.writer.title}
- Organization: ${req.writer.organization}
- Relationship: ${req.writer.relationship}

BENEFICIARY:
- Name: ${req.beneficiary.name}
- Field: ${req.beneficiary.field}
- Achievements: ${req.beneficiary.achievements}

KEY POINTS:
${req.content.keyPoints}

SPECIFIC EXAMPLES:
${req.content.specificExamples}

Generate a peer recommendation that:
1. Establishes the writer's credentials in the same field
2. Explains the professional relationship
3. Provides firsthand observations of the beneficiary's work
4. Describes specific collaborations or interactions
5. Compares the beneficiary to other professionals
6. Offers strong personal endorsement

Format as a professional recommendation letter.`,

  'advisory': (req) => `Generate a professional Advisory Opinion Letter for a ${req.beneficiary.visaType} visa petition.

This letter is from a peer group, labor organization, or management organization.

ORGANIZATION/WRITER:
- Name: ${req.writer.name}
- Title: ${req.writer.title}
- Organization: ${req.writer.organization}
- Relationship: ${req.writer.relationship}

BENEFICIARY:
- Name: ${req.beneficiary.name}
- Field: ${req.beneficiary.field}
- Achievements: ${req.beneficiary.achievements}

KEY POINTS:
${req.content.keyPoints}

SPECIFIC EXAMPLES:
${req.content.specificExamples}

Generate an advisory opinion that:
1. Establishes the organization's authority in the field
2. Explains the organization's role and membership
3. Confirms the beneficiary's standing in the profession
4. Addresses the nature of the proposed work
5. Verifies the beneficiary's qualifications
6. Provides industry context for the beneficiary's achievements

Format as an official advisory opinion letter.`
};

export async function POST(request: NextRequest) {
  try {
    const body: SupportLetterRequest = await request.json();
    const { letterType, beneficiary, writer, content } = body;

    if (!letterType || !letterPrompts[letterType]) {
      return NextResponse.json(
        { error: 'Invalid letter type' },
        { status: 400 }
      );
    }

    if (!beneficiary?.name || !writer?.name) {
      return NextResponse.json(
        { error: 'Beneficiary and writer information required' },
        { status: 400 }
      );
    }

    const prompt = letterPrompts[letterType](body);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      temperature: 0.3,
      system: 'You are an expert immigration attorney helping draft support letters for extraordinary ability visa petitions. Generate compelling, detailed, and professional letters that effectively support the visa application.',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({
      success: true,
      letterType,
      beneficiary: beneficiary.name,
      writer: writer.name,
      content: responseContent.text,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Support letter generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate support letter' },
      { status: 500 }
    );
  }
}
