import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AgreementRequest {
  agreementType: 'representation' | 'deal-memo' | 'sponsorship' | 'consultation' | 'agent' | 'multiple-employer' | 'foreign-employer' | 'self-employment';
  data: Record<string, string>;
  templateContent?: string; // Optional user-provided template
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

Format as a professional agent representation agreement for USCIS filing.`,

  'multiple-employer': (data) => `Generate a professional Multiple Employer Agreement for visa petitions with concurrent employment.

Beneficiary: ${data.beneficiary || '[BENEFICIARY NAME]'}
Primary Employer: ${data.primaryEmployer || '[PRIMARY EMPLOYER]'}
Secondary Employers: ${data.secondaryEmployers || '[SECONDARY EMPLOYERS - comma separated]'}
Work Allocation: ${data.workAllocation || '[WORK ALLOCATION - e.g., 60%/40%]'}
Compensation: ${data.compensation || '[TOTAL COMPENSATION]'}
Visa Type: ${data.visaType || 'O-1A'}

Create a comprehensive multiple employer agreement that includes:
1. Parties to the Agreement (All Employers and Beneficiary)
2. Primary vs Secondary Employer Designations
3. Work Allocation and Scheduling
   - Hours per week with each employer
   - Work location for each employer
   - Remote vs on-site requirements
4. Compensation Structure
   - Salary from each employer
   - Benefits allocation
   - Tax withholding responsibilities
5. Visa Sponsorship Responsibilities
   - Which employer is primary petitioner
   - Cost sharing for filing fees
   - Amendment requirements if work allocation changes
6. Coordination Requirements
   - Communication between employers
   - Schedule conflict resolution
   - Performance review process
7. Compliance Provisions
   - USCIS notification requirements
   - Material change reporting
   - Maintaining status requirements
8. Termination Provisions
   - Effect on visa if one employment ends
   - Notice requirements
9. Governing Law
10. Signature Blocks for ALL parties

Format as a professional multi-party employment agreement suitable for USCIS filing.`,

  'foreign-employer': (data) => `Generate a professional Foreign Employer Agreement for O/P visa petitions.

Foreign Employer: ${data.foreignEmployer || '[FOREIGN EMPLOYER NAME]'}
Foreign Country: ${data.foreignCountry || '[COUNTRY]'}
Beneficiary: ${data.beneficiary || '[BENEFICIARY NAME]'}
U.S. Agent: ${data.usAgent || '[U.S. AGENT NAME]'}
Work Location(s): ${data.workLocation || '[U.S. WORK LOCATIONS]'}
Duration: ${data.duration || '[DURATION OF ACTIVITIES]'}
Compensation: ${data.compensation || '[COMPENSATION]'}

Create a comprehensive foreign employer agreement that includes:
1. Parties to the Agreement
   - Foreign employer details and registration
   - U.S. agent details and authority
   - Beneficiary information
2. Nature of Foreign Employment
   - Current position with foreign employer
   - Continuing relationship during U.S. activities
3. U.S. Activities Description
   - Specific events, performances, or work
   - Venues and locations
   - Dates and itinerary
4. U.S. Agent's Role and Authority
   - Filing authority
   - Communication with USCIS
   - Accepting service of process
5. Compensation Arrangements
   - Who pays (foreign employer vs U.S. venues)
   - Currency and payment method
   - Tax obligations in both countries
6. Compliance with U.S. Immigration Law
   - Maintaining valid status
   - Restrictions on unauthorized employment
   - Departure requirements
7. Insurance and Liability
   - Workers' compensation (if applicable)
   - Liability insurance for events
8. Communication Protocol
   - Between foreign employer and U.S. agent
   - Emergency contacts
9. Term and Termination
10. Governing Law (both jurisdictions)
11. Signature Blocks for ALL parties

Format as a professional international employment agreement suitable for USCIS O or P visa filing.`,

  'self-employment': (data) => `Generate a professional Self-Employment Agreement structure for self-petitioned visa cases.

Beneficiary: ${data.beneficiary || '[BENEFICIARY NAME]'}
Business Entity: ${data.businessEntity || '[BUSINESS ENTITY NAME, if any]'}
Business Type: ${data.businessType || '[Sole Proprietor/LLC/Corporation]'}
Field of Work: ${data.fieldOfWork || '[FIELD]'}
Projected Income: ${data.projectedIncome || '[PROJECTED ANNUAL INCOME]'}
Visa Type: ${data.visaType || 'O-1A'}

Create a comprehensive self-employment arrangement document that includes:
1. Overview of Self-Employment Structure
   - Business entity formation (if applicable)
   - Nature of self-employment activities
   - Field and industry classification
2. Beneficiary's Qualifications
   - Extraordinary ability credentials
   - Why self-employment is appropriate
   - Comparison to traditional employment
3. Business Plan Summary
   - Services/products offered
   - Target clients/market
   - Revenue model
4. Financial Projections
   - Projected income
   - Business expenses
   - How beneficiary will support themselves
5. Evidence of Contracts/Engagements
   - Existing client contracts
   - Letters of intent
   - Ongoing projects
6. U.S. Business Presence
   - Business registration
   - Office/workspace arrangements
   - Professional memberships
7. Compliance Commitments
   - Tax filing obligations
   - Business licensing
   - Professional certifications
8. Continuation of Extraordinary Work
   - How self-employment furthers the field
   - Benefit to U.S. interests
   - National importance (for EB-2 NIW)
9. Support Documentation List
   - Required exhibits
   - Financial evidence
   - Client testimonials
10. Declaration and Signature

Format as a professional self-employment declaration/arrangement document suitable for USCIS extraordinary ability or national interest waiver petitions.`
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
