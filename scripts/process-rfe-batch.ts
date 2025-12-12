/**
 * Batch RFE/Denial Processor
 * Processes all PDFs in a folder and extracts insights
 */

import * as fs from 'fs';
import * as path from 'path';

// Use dynamic import for pdf-parse since it's CommonJS
async function extractPDFText(filePath: string): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

interface RFEIssue {
  category: string;
  criterion?: string;
  title: string;
  description: string;
  evidenceRequested: string[];
  frequency: number;
}

interface AnalysisResult {
  fileName: string;
  type: 'RFE' | 'Denial';
  receiptNumber: string;
  visaType: string;
  issues: string[];
  rawText: string;
}

// Common RFE/Denial issue patterns to look for
const ISSUE_PATTERNS = [
  { pattern: /extraordinary ability/gi, category: 'extraordinary_ability', title: 'Extraordinary Ability Documentation' },
  { pattern: /sustained.*acclaim/gi, category: 'sustained_acclaim', title: 'Sustained National/International Acclaim' },
  { pattern: /criterion\s*(1|one|i)[:\s]/gi, category: 'criterion_1', title: 'Criterion 1: Awards' },
  { pattern: /criterion\s*(2|two|ii)[:\s]/gi, category: 'criterion_2', title: 'Criterion 2: Membership' },
  { pattern: /criterion\s*(3|three|iii)[:\s]/gi, category: 'criterion_3', title: 'Criterion 3: Published Material' },
  { pattern: /criterion\s*(4|four|iv)[:\s]/gi, category: 'criterion_4', title: 'Criterion 4: Judging' },
  { pattern: /criterion\s*(5|five|v)[:\s]/gi, category: 'criterion_5', title: 'Criterion 5: Original Contributions' },
  { pattern: /criterion\s*(6|six|vi)[:\s]/gi, category: 'criterion_6', title: 'Criterion 6: Scholarly Articles' },
  { pattern: /criterion\s*(7|seven|vii)[:\s]/gi, category: 'criterion_7', title: 'Criterion 7: Critical/Essential Role' },
  { pattern: /criterion\s*(8|eight|viii)[:\s]/gi, category: 'criterion_8', title: 'Criterion 8: High Salary' },
  { pattern: /itinerary/gi, category: 'itinerary', title: 'Itinerary Issues' },
  { pattern: /agent.*authoriz/gi, category: 'agent_authorization', title: 'Agent Authorization' },
  { pattern: /service.*process/gi, category: 'service_of_process', title: 'Service of Process' },
  { pattern: /employment.*verif/gi, category: 'employment', title: 'Employment Verification' },
  { pattern: /compensation|salary|remuneration/gi, category: 'compensation', title: 'Compensation Documentation' },
  { pattern: /advisory.*opinion/gi, category: 'advisory_opinion', title: 'Advisory Opinion' },
  { pattern: /peer.*group/gi, category: 'peer_group', title: 'Peer Group Organization' },
  { pattern: /major.*significance/gi, category: 'major_significance', title: 'Major Significance' },
  { pattern: /leading.*critical.*role/gi, category: 'leading_role', title: 'Leading/Critical Role' },
  { pattern: /comparable.*evidence/gi, category: 'comparable_evidence', title: 'Comparable Evidence' },
  { pattern: /final.*merits/gi, category: 'final_merits', title: 'Final Merits Determination' },
  { pattern: /totality.*evidence/gi, category: 'totality', title: 'Totality of Evidence' },
];

async function processFolder(folderPath: string): Promise<{
  results: AnalysisResult[];
  summary: {
    totalFiles: number;
    rfes: number;
    denials: number;
    commonIssues: { issue: string; count: number }[];
    recommendations: string[];
  };
}> {
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf'));
  const results: AnalysisResult[] = [];
  const issueCounts: Record<string, number> = {};

  console.log(`Processing ${files.length} PDF files...`);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    console.log(`\nProcessing: ${file}`);

    try {
      const text = await extractPDFText(filePath);

      // Determine type
      const isDenial = file.toLowerCase().includes('denial') ||
                       text.toLowerCase().includes('petition is denied') ||
                       text.toLowerCase().includes('we are denying');

      // Extract receipt number
      const receiptMatch = text.match(/IOE\d{10}|WAC\d{10}|EAC\d{10}|SRC\d{10}|LIN\d{10}/i);
      const receiptNumber = receiptMatch ? receiptMatch[0] : 'Unknown';

      // Detect visa type
      let visaType = 'O-1';
      if (text.includes('O-1A')) visaType = 'O-1A';
      else if (text.includes('O-1B')) visaType = 'O-1B';
      else if (text.includes('P-1A')) visaType = 'P-1A';
      else if (text.includes('P-1B')) visaType = 'P-1B';
      else if (text.includes('EB-1A')) visaType = 'EB-1A';
      else if (text.includes('EB-2') && text.includes('NIW')) visaType = 'EB-2 NIW';

      // Find issues
      const foundIssues: string[] = [];
      for (const pattern of ISSUE_PATTERNS) {
        if (pattern.pattern.test(text)) {
          foundIssues.push(pattern.title);
          issueCounts[pattern.title] = (issueCounts[pattern.title] || 0) + 1;
        }
      }

      results.push({
        fileName: file,
        type: isDenial ? 'Denial' : 'RFE',
        receiptNumber,
        visaType,
        issues: foundIssues,
        rawText: text,
      });

      console.log(`  Type: ${isDenial ? 'Denial' : 'RFE'}`);
      console.log(`  Receipt: ${receiptNumber}`);
      console.log(`  Visa: ${visaType}`);
      console.log(`  Issues Found: ${foundIssues.length}`);

    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
    }
  }

  // Generate summary
  const sortedIssues = Object.entries(issueCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([issue, count]) => ({ issue, count }));

  const recommendations = generateRecommendations(sortedIssues, results);

  return {
    results,
    summary: {
      totalFiles: files.length,
      rfes: results.filter(r => r.type === 'RFE').length,
      denials: results.filter(r => r.type === 'Denial').length,
      commonIssues: sortedIssues.slice(0, 15),
      recommendations,
    },
  };
}

function generateRecommendations(
  issues: { issue: string; count: number }[],
  results: AnalysisResult[]
): string[] {
  const recs: string[] = [];

  // Based on most common issues
  for (const { issue, count } of issues.slice(0, 10)) {
    if (count >= 2) {
      switch (issue) {
        case 'Extraordinary Ability Documentation':
          recs.push('TEMPLATE UPDATE: Add comprehensive extraordinary ability evidence checklist');
          recs.push('TEMPLATE UPDATE: Include comparison to field standards in all agreements');
          break;
        case 'Sustained National/International Acclaim':
          recs.push('TEMPLATE UPDATE: Add sustained acclaim documentation section with timeline');
          break;
        case 'Criterion 5: Original Contributions':
          recs.push('TEMPLATE UPDATE: Add section for documenting original contributions with impact metrics');
          break;
        case 'Itinerary Issues':
          recs.push('TEMPLATE UPDATE: Strengthen itinerary section with venue confirmations and dates');
          recs.push('TEMPLATE UPDATE: Add itinerary amendment notification clause');
          break;
        case 'Agent Authorization':
          recs.push('TEMPLATE UPDATE: Enhance agent authorization language with explicit filing authority');
          break;
        case 'Service of Process':
          recs.push('TEMPLATE UPDATE: Add explicit service of process acceptance clause');
          break;
        case 'Compensation Documentation':
          recs.push('TEMPLATE UPDATE: Add detailed compensation breakdown table');
          recs.push('TEMPLATE UPDATE: Include wage comparison to industry standards');
          break;
        case 'Advisory Opinion':
          recs.push('TEMPLATE UPDATE: Add peer group organization identification section');
          break;
        case 'Major Significance':
          recs.push('TEMPLATE UPDATE: Add section for documenting major significance with metrics');
          break;
        case 'Final Merits Determination':
          recs.push('TEMPLATE UPDATE: Add final merits analysis preparation section');
          break;
      }
    }
  }

  return [...new Set(recs)]; // Remove duplicates
}

// Main execution
const RFE_FOLDER = '/home/sherrod/RFE and denials';

processFolder(RFE_FOLDER)
  .then(({ results, summary }) => {
    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nTotal Files: ${summary.totalFiles}`);
    console.log(`RFEs: ${summary.rfes}`);
    console.log(`Denials: ${summary.denials}`);
    console.log('\nMost Common Issues:');
    summary.commonIssues.forEach(({ issue, count }, i) => {
      console.log(`  ${i + 1}. ${issue} (${count} occurrences)`);
    });
    console.log('\nTemplate Update Recommendations:');
    summary.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });

    // Save results to JSON
    const outputPath = '/home/sherrod/xtraordinary-research-visa-generator-complete/rfe-analysis-results.json';
    fs.writeFileSync(outputPath, JSON.stringify({ results, summary }, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);
  })
  .catch(console.error);
