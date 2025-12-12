/**
 * Logo Service
 * Handles logo uploads and AI logo generation for petition letters and support documents
 */

import OpenAI from 'openai';

// Initialize OpenAI for DALL-E logo generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LogoGenerationRequest {
  organizationName: string;
  style: 'professional' | 'modern' | 'academic' | 'creative' | 'tech';
  industry?: string;
  colorPreference?: string;
}

export interface LogoResult {
  url: string;
  style: string;
  generatedAt: string;
}

// Style prompts for different logo types
const stylePrompts: Record<string, string> = {
  professional: 'clean professional corporate logo, minimalist design, suitable for legal documents, navy blue and gold colors, vector style',
  modern: 'modern minimal logo, geometric shapes, clean lines, contemporary design, single color, flat design',
  academic: 'academic institutional logo, scholarly design, shield or crest style, traditional yet elegant, professional colors',
  creative: 'creative artistic logo, unique design, elegant typography, artistic flair while maintaining professionalism',
  tech: 'technology innovation logo, futuristic design, circuit or digital elements, modern tech company style',
};

/**
 * Generate a logo using AI (OpenAI DALL-E)
 */
export async function generateAILogo(request: LogoGenerationRequest): Promise<LogoResult | null> {
  try {
    const stylePrompt = stylePrompts[request.style] || stylePrompts.professional;

    const prompt = `Create a ${stylePrompt} for an organization named "${request.organizationName}"${
      request.industry ? ` in the ${request.industry} industry` : ''
    }${
      request.colorPreference ? `, using ${request.colorPreference} colors` : ''
    }. The logo should be suitable for official letterhead and legal documents. High quality, professional appearance, white or transparent background.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
    });

    if (response.data && response.data[0]?.url) {
      return {
        url: response.data[0].url,
        style: request.style,
        generatedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error: any) {
    console.error('AI Logo generation error:', error);
    throw new Error(`Failed to generate logo: ${error.message}`);
  }
}

/**
 * Process an uploaded logo file
 * Returns a data URL or uploads to storage
 */
export async function processUploadedLogo(
  file: Buffer,
  mimeType: string
): Promise<{ dataUrl: string; mimeType: string }> {
  // Convert to base64 data URL for immediate use
  const base64 = file.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return {
    dataUrl,
    mimeType,
  };
}

/**
 * Validate logo file
 */
export function validateLogoFile(file: { size: number; type: string }): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];

  if (file.size > maxSize) {
    return { valid: false, error: 'Logo file must be less than 5MB' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Logo must be PNG, JPEG, GIF, SVG, or WebP format' };
  }

  return { valid: true };
}

/**
 * Generate letterhead HTML with logo
 */
export function generateLetterheadHTML(
  logoUrl: string | null,
  organizationName: string,
  address?: string,
  phone?: string,
  email?: string
): string {
  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${organizationName}" style="max-height: 80px; max-width: 200px; object-fit: contain;" />`
    : '';

  return `
<div style="border-bottom: 2px solid #1a365d; padding-bottom: 20px; margin-bottom: 30px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="30%" valign="middle">
        ${logoSection}
      </td>
      <td width="70%" valign="middle" align="right" style="font-family: Georgia, serif; color: #1a365d;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">
          ${organizationName}
        </div>
        ${address ? `<div style="font-size: 12px; color: #4a5568;">${address}</div>` : ''}
        ${phone ? `<div style="font-size: 12px; color: #4a5568;">Tel: ${phone}</div>` : ''}
        ${email ? `<div style="font-size: 12px; color: #4a5568;">Email: ${email}</div>` : ''}
      </td>
    </tr>
  </table>
</div>
`;
}

/**
 * Available logo styles with descriptions
 */
export const LOGO_STYLES = [
  {
    id: 'professional',
    name: 'Professional/Corporate',
    description: 'Clean, corporate design with traditional business aesthetics',
  },
  {
    id: 'modern',
    name: 'Modern/Minimal',
    description: 'Contemporary minimalist design with geometric shapes',
  },
  {
    id: 'academic',
    name: 'Academic/Institutional',
    description: 'Scholarly design suitable for educational or research institutions',
  },
  {
    id: 'creative',
    name: 'Creative/Artistic',
    description: 'Unique artistic design while maintaining professionalism',
  },
  {
    id: 'tech',
    name: 'Technology/Innovation',
    description: 'Futuristic design suitable for tech companies and startups',
  },
];
