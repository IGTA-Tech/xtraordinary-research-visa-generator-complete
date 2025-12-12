/**
 * Batch RFE/Denial Processor
 * Processes all PDFs in a folder and extracts insights
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

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
  { pattern: /prong/gi, category: 'kazarian_prongs', title: 'Kazarian Two-Prong Analysis' },
  { pattern: /beneficiary.*fail/gi, category: 'failure', title: 'Beneficiary Failed to Establish' },
  { pattern: /insufficient.*evidence/gi, category: 'insufficient', title: 'Insufficient Evidence' },
  { pattern: /not.*establish/gi, category: 'not_established', title: 'Not Established' },
  { pattern: /does not meet/gi, category: 'does_not_meet', title: 'Does Not Meet Requirements' },
];

async function extractPDFText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function processFolder(folderPath) {
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.pdf'));
  const results = [];
  const issueCounts = {};
  const extractedTexts = {};

  console.log(`Processing ${files.length} PDF files...`);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    console.log(`\nProcessing: ${file}`);

    try {
      const text = await extractPDFText(filePath);
      extractedTexts[file] = text;

      // Determine type
      const isDenial = file.toLowerCase().includes('denial') ||
                       text.toLowerCase().includes('petition is denied') ||
                       text.toLowerCase().includes('we are denying') ||
                       text.toLowerCase().includes('this denial');

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
      const foundIssues = [];
      for (const pattern of ISSUE_PATTERNS) {
        // Reset regex lastIndex
        pattern.pattern.lastIndex = 0;
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
        textLength: text.length,
      });

      console.log(`  Type: ${isDenial ? 'DENIAL' : 'RFE'}`);
      console.log(`  Receipt: ${receiptNumber}`);
      console.log(`  Visa: ${visaType}`);
      console.log(`  Issues Found: ${foundIssues.length}`);

    } catch (error) {
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
    extractedTexts,
    summary: {
      totalFiles: files.length,
      rfes: results.filter(r => r.type === 'RFE').length,
      denials: results.filter(r => r.type === 'Denial').length,
      commonIssues: sortedIssues,
      recommendations,
    },
  };
}

function generateRecommendations(issues, results) {
  const recs = [];

  // Based on most common issues
  for (const { issue, count } of issues) {
    if (count >= 1) {
      switch (issue) {
        case 'Extraordinary Ability Documentation':
          recs.push('Add comprehensive extraordinary ability evidence checklist to templates');
          recs.push('Include comparison to field standards in all agreements');
          break;
        case 'Sustained National/International Acclaim':
          recs.push('Add sustained acclaim documentation section with timeline requirements');
          recs.push('Include media coverage tracking table');
          break;
        case 'Criterion 5: Original Contributions':
          recs.push('Add section for documenting original contributions with measurable impact');
          recs.push('Include citation metrics and adoption evidence requirements');
          break;
        case 'Itinerary Issues':
          recs.push('Strengthen itinerary section with mandatory venue confirmations');
          recs.push('Add date range specifications and amendment notification clause');
          break;
        case 'Agent Authorization':
          recs.push('Enhance agent authorization language with explicit USCIS filing authority');
          recs.push('Add clause stating agent can represent multiple parties');
          break;
        case 'Service of Process':
          recs.push('Add explicit service of process acceptance clause in all agreements');
          recs.push('Include physical address for service');
          break;
        case 'Compensation Documentation':
          recs.push('Add detailed compensation breakdown table with payment schedule');
          recs.push('Include wage comparison to industry/field standards');
          recs.push('Add documentation of bonus and benefit structures');
          break;
        case 'Advisory Opinion':
          recs.push('Add peer group organization identification section');
          recs.push('Include advisory opinion requirements checklist');
          break;
        case 'Major Significance':
          recs.push('Add section for documenting major significance with quantifiable metrics');
          recs.push('Include impact statements from industry experts');
          break;
        case 'Final Merits Determination':
          recs.push('Add final merits analysis preparation section');
          recs.push('Include totality of evidence summary');
          break;
        case 'Kazarian Two-Prong Analysis':
          recs.push('Add Kazarian-compliant evidence organization');
          recs.push('Include both initial evidence and final merits sections');
          break;
        case 'Peer Group Organization':
          recs.push('Add peer group/professional organization membership documentation');
          recs.push('Include membership criteria and selectivity evidence');
          break;
        case 'Does Not Meet Requirements':
          recs.push('Add pre-filing checklist to verify all requirements are met');
          recs.push('Include self-assessment questionnaire');
          break;
        case 'Insufficient Evidence':
          recs.push('Add evidence sufficiency checklist for each criterion');
          recs.push('Include minimum documentation requirements');
          break;
      }
    }
  }

  return [...new Set(recs)]; // Remove duplicates
}

// Main execution
const RFE_FOLDER = '/home/sherrod/RFE and denials';

processFolder(RFE_FOLDER)
  .then(({ results, extractedTexts, summary }) => {
    console.log('\n' + '='.repeat(70));
    console.log('RFE/DENIAL ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    console.log(`\nTotal Files Processed: ${summary.totalFiles}`);
    console.log(`RFEs: ${summary.rfes}`);
    console.log(`Denials: ${summary.denials}`);

    console.log('\n--- MOST COMMON ISSUES ---');
    summary.commonIssues.slice(0, 20).forEach(({ issue, count }, i) => {
      const bar = '█'.repeat(Math.min(count * 3, 30));
      console.log(`  ${(i + 1).toString().padStart(2)}. ${issue.padEnd(45)} ${bar} (${count})`);
    });

    console.log('\n--- TEMPLATE UPDATE RECOMMENDATIONS ---');
    summary.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });

    // Save results to JSON
    const outputPath = '/home/sherrod/xtraordinary-research-visa-generator-complete/rfe-analysis-results.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      results,
      summary,
      analysisDate: new Date().toISOString()
    }, null, 2));
    console.log(`\n✓ Results saved to: ${outputPath}`);

    // Save extracted texts for further analysis
    const textsPath = '/home/sherrod/xtraordinary-research-visa-generator-complete/rfe-extracted-texts.json';
    fs.writeFileSync(textsPath, JSON.stringify(extractedTexts, null, 2));
    console.log(`✓ Extracted texts saved to: ${textsPath}`);
  })
  .catch(console.error);
