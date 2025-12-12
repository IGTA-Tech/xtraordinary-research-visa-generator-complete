import { NextRequest, NextResponse } from 'next/server';
import { smartAutoFill } from '@/app/lib/smart-autofill';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentsText, urlsContext, beneficiaryName, profession } = body;

    // Validate required fields
    if (!documentsText) {
      return NextResponse.json(
        { error: 'Documents text is required' },
        { status: 400 }
      );
    }

    // Perform smart auto-fill
    const result = await smartAutoFill(
      documentsText,
      urlsContext,
      beneficiaryName,
      profession
    );

    return NextResponse.json({
      success: true,
      autoFillData: result,
    });
  } catch (error: any) {
    console.error('Error in smart-autofill:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to auto-fill data' },
      { status: 500 }
    );
  }
}
