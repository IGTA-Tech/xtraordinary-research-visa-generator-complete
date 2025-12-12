import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'xtraordinary-visa-generator',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      petitionGeneration: true,
      documentGeneration: true,
      exhibitPackaging: true,
      formFilling: true,
      supportLetters: true,
      itineraries: true,
      agreements: true,
    },
  });
}
