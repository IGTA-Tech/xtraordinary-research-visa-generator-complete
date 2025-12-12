import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AgreementRequest {
  agreementType: 'representation' | 'deal-memo' | 'sponsorship' | 'consultation' | 'agent';
  data: Record<string, string>;
}

const agreementPrompts: Record<string, (data: Record<string, string>) => string> = {
  'representation': (data) => `Generate a professional Representation Agreement for visa petition services.

Client Name: ${data.clientName || '[CLIENT NAME]'}
Visa Type: ${data.visaType || 'O-1A'}
Fee: ${data.fee || '[FEE AMOUNT]'}
Payment Terms: ${data.paymentTerms || '[PAYMENT TERMS]'}

Create a comprehensive legal agreement that includes:
1. Scope of Representation
2. Attorney/Representative Responsibilities
3. Client Responsibilities
4. Fee Structure and Payment Terms
5. Timeline and Milestones
6. Confidentiality Provisions
7. Termination Clause
8. Limitation of Liability
9. Governing Law
10. Signature Blocks

Format as a professional legal document ready for signature.`,

  'deal-memo': (data) => `Generate a professional Deal Memo agreement between petitioner and beneficiary.

Petitioner: ${data.petitioner || '[PETITIONER NAME]'}
Beneficiary: ${data.beneficiary || '[BENEFICIARY NAME]'}
Position: ${data.position || '[JOB TITLE]'}
Compensation: ${data.compensation || '[COMPENSATION]'}
Duration: ${data.duration || '[DURATION]'}

Create a comprehensive deal memo that includes:
1. Parties to the Agreement
2. Position Description and Duties
3. Compensation Package (salary, bonuses, benefits)
4. Employment Duration and Start Date
5. Visa Sponsorship Commitment
6. Performance Expectations
7. Termination Provisions
8. Confidentiality and Non-Compete (if applicable)
9. Governing Law
10. Signature Blocks

Format as a professional business agreement.`,

  'sponsorship': (data) => `Generate a professional Employer Sponsorship Agreement.

Employer: ${data.employer || '[EMPLOYER NAME]'}
Employee/Beneficiary: ${data.employee || '[EMPLOYEE NAME]'}
Position: ${data.position || '[POSITION]'}
Start Date: ${data.startDate || '[START DATE]'}
Terms: ${data.terms || '[TERMS]'}

Create a comprehensive sponsorship agreement that includes:
1. Employer's Commitment to Sponsor
2. Position Details and Responsibilities
3. Compensation and Benefits
4. Duration of Sponsorship
5. Employer's Obligations (filing fees, legal costs)
6. Employee's Obligations
7. Conditions for Continued Employment
8. What Happens if Visa is Denied
9. Repayment Provisions (if any)
10. Signature Blocks

Format as a professional employment/sponsorship document.`,

  'consultation': (data) => `Generate a professional Consultation Agreement for initial case evaluation.

Client Name: ${data.clientName || '[CLIENT NAME]'}
Consultation Fee: ${data.consultationFee || '[FEE]'}
Scope: ${data.scope || 'Initial visa case evaluation and strategy consultation'}

Create a consultation agreement that includes:
1. Purpose of Consultation
2. Scope of Services
3. Fee and Payment
4. Duration of Consultation
5. Confidentiality
6. No Guarantee of Outcome
7. Relationship Clarification (not full representation)
8. Follow-up Options
9. Signature Blocks

Format as a brief, professional agreement.`,

  'agent': (data) => `Generate a professional Agent Agreement for P-1A/O-1B visa petitions.

Agent Name: ${data.agentName || '[AGENT NAME]'}
Beneficiary: ${data.beneficiary || '[BENEFICIARY NAME]'}
Employers/Venues: ${data.employers || '[LIST OF EMPLOYERS/VENUES]'}
Event Details: ${data.eventDetails || '[EVENT DETAILS]'}

Create an agent petition agreement that includes:
1. Agent's Role and Authority
2. Beneficiary Information
3. List of Employers/Venues/Events
4. Agent's Responsibilities
5. Financial Arrangements
6. Duration of Agreement
7. Multiple Employer Provisions
8. Itinerary Management
9. Reporting Requirements
10. Signature Blocks

Format as a professional agent representation agreement for USCIS filing.`
};

export async function POST(request: NextRequest) {
  try {
    const body: AgreementRequest = await request.json();
    const { agreementType, data } = body;

    if (!agreementType || !agreementPrompts[agreementType]) {
      return NextResponse.json(
        { error: 'Invalid agreement type' },
        { status: 400 }
      );
    }

    const prompt = agreementPrompts[agreementType](data);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.3,
      system: 'You are an expert immigration attorney drafting professional legal agreements for visa petition cases. Generate clear, comprehensive, and legally sound documents.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({
      success: true,
      agreementType,
      content: content.text,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Agreement generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate agreement' },
      { status: 500 }
    );
  }
}
