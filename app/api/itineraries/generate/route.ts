import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Event {
  date: string;
  endDate: string;
  venue: string;
  city: string;
  state: string;
  country: string;
  eventType: string;
  description: string;
  compensation: string;
}

interface ItineraryRequest {
  visaType: 'P-1A' | 'O-1A' | 'O-1B';
  beneficiaryName: string;
  events: Event[];
  petitionerName?: string;
  agentName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ItineraryRequest = await request.json();
    const { visaType, beneficiaryName, events, petitionerName, agentName } = body;

    if (!visaType || !beneficiaryName || !events || events.length === 0) {
      return NextResponse.json(
        { error: 'Visa type, beneficiary name, and at least one event required' },
        { status: 400 }
      );
    }

    // Format events for the prompt
    const eventsFormatted = events.map((event, index) => `
Event ${index + 1}:
- Dates: ${event.date} to ${event.endDate || event.date}
- Type: ${event.eventType}
- Venue: ${event.venue}
- Location: ${event.city}, ${event.state}, ${event.country}
- Description: ${event.description}
- Compensation: ${event.compensation}
`).join('\n');

    const prompt = `Generate a professional USCIS-compliant itinerary document for a ${visaType} visa petition.

BENEFICIARY: ${beneficiaryName}
VISA TYPE: ${visaType}
${petitionerName ? `PETITIONER: ${petitionerName}` : ''}
${agentName ? `AGENT: ${agentName}` : ''}

SCHEDULED EVENTS:
${eventsFormatted}

Generate a comprehensive itinerary document that includes:

1. COVER PAGE
   - Document title
   - Beneficiary name
   - Visa classification
   - Petition period

2. INTRODUCTION
   - Purpose of the itinerary
   - Overview of the beneficiary's activities

3. DETAILED ITINERARY TABLE
   Format as a table with columns:
   | Date(s) | Event Type | Venue | Location | Description | Compensation |

4. EVENT DESCRIPTIONS
   For each event, provide:
   - Detailed description of activities
   - Significance of the event/venue
   - Role of the beneficiary
   - Expected audience/participants

5. SUMMARY
   - Total number of events
   - Geographic scope
   - Duration of activities
   - Total compensation

6. EMPLOYER/VENUE CONFIRMATIONS
   - Statement that events are confirmed
   - Contact information for verification

Format as a professional document suitable for USCIS submission. Include proper headers, page numbers, and professional formatting.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.2,
      system: 'You are an expert immigration document preparer specializing in P-1A and O-1 visa itineraries. Generate clear, detailed, and USCIS-compliant itinerary documents.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({
      success: true,
      visaType,
      beneficiary: beneficiaryName,
      eventCount: events.length,
      content: content.text,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Itinerary generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate itinerary' },
      { status: 500 }
    );
  }
}
