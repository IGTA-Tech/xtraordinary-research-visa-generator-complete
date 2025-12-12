import { NextRequest, NextResponse } from 'next/server';

interface Exhibit {
  id: string;
  name: string;
  type: 'file' | 'url';
  source: string;
  archived?: boolean;
  archiveUrl?: string;
}

interface ExhibitPackageRequest {
  caseName: string;
  beneficiaryName: string;
  numberingStyle: 'letters' | 'numbers' | 'roman';
  exhibits: Exhibit[];
}

function getExhibitLabel(index: number, style: 'letters' | 'numbers' | 'roman'): string {
  switch (style) {
    case 'letters':
      // A-Z, then AA, AB, etc.
      if (index < 26) {
        return String.fromCharCode(65 + index);
      } else {
        const first = Math.floor(index / 26) - 1;
        const second = index % 26;
        return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
      }
    case 'numbers':
      return (index + 1).toString();
    case 'roman':
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
        'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
        'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX'];
      return romanNumerals[index] || (index + 1).toString();
    default:
      return String.fromCharCode(65 + index);
  }
}

async function archiveUrl(url: string): Promise<string | null> {
  try {
    // Submit to archive.org
    const archiveResponse = await fetch(`https://web.archive.org/save/${url}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Xtraordinary-Visa-Generator/1.0',
      },
    });

    if (archiveResponse.ok) {
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      return `https://web.archive.org/web/${date}/${url}`;
    }
    return null;
  } catch (error) {
    console.error('Archive.org error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ExhibitPackageRequest = await request.json();
    const { caseName, beneficiaryName, numberingStyle, exhibits } = body;

    if (!caseName || !beneficiaryName || !exhibits || exhibits.length === 0) {
      return NextResponse.json(
        { error: 'Case name, beneficiary name, and exhibits required' },
        { status: 400 }
      );
    }

    // Process exhibits and generate labels
    const processedExhibits = exhibits.map((exhibit, index) => ({
      ...exhibit,
      label: getExhibitLabel(index, numberingStyle),
      displayName: `Exhibit ${getExhibitLabel(index, numberingStyle)}: ${exhibit.name}`,
    }));

    // Generate Table of Contents
    const tableOfContents = `
TABLE OF CONTENTS
${caseName}
Beneficiary: ${beneficiaryName}
Generated: ${new Date().toLocaleDateString()}

${'='.repeat(60)}

${processedExhibits.map(e => {
  const urlInfo = e.type === 'url'
    ? `\n   Original: ${e.source}${e.archiveUrl ? `\n   Archived: ${e.archiveUrl}` : ''}`
    : '';
  return `Exhibit ${e.label}: ${e.name}${urlInfo}`;
}).join('\n\n')}

${'='.repeat(60)}

Total Exhibits: ${processedExhibits.length}
`;

    // Generate exhibit cover pages content
    const exhibitCovers = processedExhibits.map(e => ({
      label: e.label,
      name: e.name,
      coverPage: `
${'='.repeat(60)}

                    EXHIBIT ${e.label}

${'='.repeat(60)}

Document: ${e.name}
Case: ${caseName}
Beneficiary: ${beneficiaryName}

${e.type === 'url' ? `
Source URL: ${e.source}
${e.archiveUrl ? `Archived URL: ${e.archiveUrl}` : ''}
` : ''}

${'='.repeat(60)}
`,
    }));

    return NextResponse.json({
      success: true,
      caseName,
      beneficiaryName,
      numberingStyle,
      exhibitCount: processedExhibits.length,
      tableOfContents,
      exhibits: processedExhibits,
      exhibitCovers,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Exhibit package error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate exhibit package' },
      { status: 500 }
    );
  }
}

// Archive URLs endpoint
export async function PUT(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs array required' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      urls.map(async (url: string) => {
        const archiveUrl = await archiveUrl(url);
        return {
          original: url,
          archived: archiveUrl,
          success: !!archiveUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      results,
      archivedCount: results.filter(r => r.success).length,
      totalCount: results.length,
    });

  } catch (error: any) {
    console.error('URL archiving error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to archive URLs' },
      { status: 500 }
    );
  }
}
