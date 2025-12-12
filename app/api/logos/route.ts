import { NextRequest, NextResponse } from 'next/server';
import { generateAILogo, validateLogoFile, LOGO_STYLES, LogoGenerationRequest } from '../../lib/logo-service';

/**
 * POST /api/logos - Generate AI logo or process uploaded logo
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle JSON request (AI generation)
    if (contentType.includes('application/json')) {
      const body: LogoGenerationRequest = await request.json();

      if (!body.organizationName) {
        return NextResponse.json(
          { error: 'Organization name is required' },
          { status: 400 }
        );
      }

      if (!body.style || !['professional', 'modern', 'academic', 'creative', 'tech'].includes(body.style)) {
        return NextResponse.json(
          { error: 'Valid style is required (professional, modern, academic, creative, tech)' },
          { status: 400 }
        );
      }

      const result = await generateAILogo(body);

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to generate logo' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        logo: result,
        organizationName: body.organizationName,
      });
    }

    // Handle multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('logo') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No logo file provided' },
          { status: 400 }
        );
      }

      // Validate file
      const validation = validateLogoFile({ size: file.size, type: file.type });
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Convert to base64 data URL
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      return NextResponse.json({
        success: true,
        logo: {
          url: dataUrl,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid content type' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Logo API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process logo' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logos - Get available logo styles
 */
export async function GET() {
  return NextResponse.json({
    styles: LOGO_STYLES,
    maxFileSize: '5MB',
    allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
    aiGenerationAvailable: !!process.env.OPENAI_API_KEY,
  });
}
