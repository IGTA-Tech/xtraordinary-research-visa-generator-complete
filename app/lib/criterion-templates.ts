// app/lib/criterion-templates.ts
// CRITICAL: Exact regulatory language for DIY template enforcement

export interface CriterionTemplate {
  number: number;
  letter: string;
  name: string;
  regulatoryLanguage: string;
  elements: string[];
  cfrCitation: string;
  hasComparableEvidence: boolean;
  applicableCaseLaw?: { case: string; citation: string; application: string }[];
}

// ============================================
// O-1A CRITERIA (8 total)
// ============================================

export const O1A_CRITERIA_TEMPLATES: CriterionTemplate[] = [
  {
    number: 1,
    letter: 'A',
    name: 'Major Awards or Prizes',
    regulatoryLanguage: 'Documentation of the beneficiary\'s receipt of nationally or internationally recognized prizes or awards for excellence in the field of endeavor.',
    elements: [
      'Receipt of a prize or award',
      'The prize or award is for excellence in the field',
      'The prize or award is nationally or internationally recognized'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(A)',
    hasComparableEvidence: true,
    applicableCaseLaw: [
      {
        case: 'Kazarian v. USCIS',
        citation: '596 F.3d 1115 (9th Cir. 2010)',
        application: 'Established two-step analysis for extraordinary ability claims'
      }
    ]
  },
  {
    number: 2,
    letter: 'B',
    name: 'Membership in Associations Requiring Outstanding Achievements',
    regulatoryLanguage: 'Documentation of the beneficiary\'s membership in associations in the field for which classification is sought, which require outstanding achievements of their members, as judged by recognized national or international experts in their disciplines or fields.',
    elements: [
      'Membership in an association in the field',
      'The association requires outstanding achievements for membership',
      'Membership is judged by recognized national or international experts'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(B)',
    hasComparableEvidence: true
  },
  {
    number: 3,
    letter: 'C',
    name: 'Published Material About the Beneficiary',
    regulatoryLanguage: 'Published material in professional or major trade publications or major media about the beneficiary, relating to the beneficiary\'s work in the field for which classification is sought, which shall include the title, date, and author of such published material, and any necessary translation.',
    elements: [
      'Material is published in professional, major trade, or major media publications',
      'The material is about the beneficiary',
      'The material relates to the beneficiary\'s work in the field',
      'The material includes title, date, and author',
      'Translations are provided if necessary'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(C)',
    hasComparableEvidence: true,
    applicableCaseLaw: [
      {
        case: 'Muni v. INS',
        citation: '891 F. Supp. 440 (N.D. Ill. 1995)',
        application: 'Published material need not claim the beneficiary is the best in their field'
      }
    ]
  },
  {
    number: 4,
    letter: 'D',
    name: 'Judging the Work of Others',
    regulatoryLanguage: 'Evidence of the beneficiary\'s participation on a panel, or individually, as a judge of the work of others in the same or in an allied field of specification for which classification is sought.',
    elements: [
      'Participation as a judge',
      'Judging is of the work of others',
      'Judging is in the same or allied field'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(D)',
    hasComparableEvidence: true
  },
  {
    number: 5,
    letter: 'E',
    name: 'Original Contributions of Major Significance',
    regulatoryLanguage: 'Evidence of the beneficiary\'s original scientific, scholarly, or business-related contributions of major significance in the field.',
    elements: [
      'Contributions are original',
      'Contributions are scientific, scholarly, or business-related',
      'Contributions are of major significance in the field'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(E)',
    hasComparableEvidence: true
  },
  {
    number: 6,
    letter: 'F',
    name: 'Authorship of Scholarly Articles',
    regulatoryLanguage: 'Evidence of the beneficiary\'s authorship of scholarly articles in the field, in professional journals, or other major media.',
    elements: [
      'Authorship of scholarly articles',
      'Articles are in the field',
      'Published in professional journals or major media'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(F)',
    hasComparableEvidence: true
  },
  {
    number: 7,
    letter: 'G',
    name: 'Employment in a Critical or Essential Capacity',
    regulatoryLanguage: 'Evidence that the beneficiary has been employed in a critical or essential capacity for organizations and establishments that have a distinguished reputation.',
    elements: [
      'Employment in a critical or essential capacity',
      'The organization has a distinguished reputation'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(G)',
    hasComparableEvidence: true
  },
  {
    number: 8,
    letter: 'H',
    name: 'High Salary or Remuneration',
    regulatoryLanguage: 'Evidence that the beneficiary has either commanded a high salary or will command a high salary or other remuneration for services, evidenced by contracts or other reliable evidence.',
    elements: [
      'High salary or remuneration',
      'Evidence through contracts or other reliable documentation',
      'Comparison to others in the field'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iii)(H)',
    hasComparableEvidence: true
  }
];

// ============================================
// O-1B CRITERIA (6 total)
// ============================================

export const O1B_CRITERIA_TEMPLATES: CriterionTemplate[] = [
  {
    number: 1,
    letter: 'A',
    name: 'Leading or Starring Role',
    regulatoryLanguage: 'Evidence that the beneficiary has been nominated for, or has been the recipient of, significant national or international awards or prizes in the particular field such as an Academy Award, an Emmy, a Grammy, or a Director\'s Guild Award.',
    elements: [
      'Receipt or nomination for significant awards',
      'Awards are national or international in scope',
      'Awards are in the particular field'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iv)(A)',
    hasComparableEvidence: true
  },
  {
    number: 2,
    letter: 'B',
    name: 'Critical Reviews or Other Published Materials',
    regulatoryLanguage: 'Documentation of the beneficiary\'s receipt of nationally or internationally recognized prizes or awards for excellence in the field of endeavor.',
    elements: [
      'Published material about the beneficiary',
      'Material relates to the beneficiary\'s work',
      'Material is in professional or major trade publications'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iv)(B)',
    hasComparableEvidence: true
  },
  {
    number: 3,
    letter: 'C',
    name: 'Leading, Starring, or Critical Role for Distinguished Organizations',
    regulatoryLanguage: 'Evidence that the beneficiary has performed, and will perform, services as a lead or starring participant in productions or events which have a distinguished reputation as evidenced by critical reviews, advertisements, publicity releases, publications contracts, or endorsements.',
    elements: [
      'Performance in lead or starring role',
      'Productions or events have distinguished reputation',
      'Evidence includes critical reviews, advertisements, or publicity'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iv)(C)',
    hasComparableEvidence: true
  },
  {
    number: 4,
    letter: 'D',
    name: 'Record of Major Commercial or Critically Acclaimed Successes',
    regulatoryLanguage: 'Evidence that the beneficiary has achieved recognition for achievements as shown by critical reviews or other published materials by or about the individual in major newspapers, trade journals, magazines, or other publications.',
    elements: [
      'Recognition for achievements',
      'Critical reviews or published materials',
      'Publications are major newspapers, trade journals, or magazines'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iv)(D)',
    hasComparableEvidence: true
  },
  {
    number: 5,
    letter: 'E',
    name: 'Significant Recognition from Organizations, Critics, Agencies, or Experts',
    regulatoryLanguage: 'Evidence that the beneficiary has received significant recognition for achievements from organizations, critics, government agencies, or other recognized experts in the field in which the beneficiary is engaged.',
    elements: [
      'Significant recognition received',
      'Recognition is from organizations, critics, agencies, or experts',
      'Recognizers are recognized in the field'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iv)(E)',
    hasComparableEvidence: true
  },
  {
    number: 6,
    letter: 'F',
    name: 'High Salary or Remuneration',
    regulatoryLanguage: 'Evidence that the beneficiary has either commanded a high salary or will command a high salary or other substantial remuneration for services in relation to others in the field, as shown by contracts or other reliable evidence.',
    elements: [
      'High salary or substantial remuneration',
      'Comparison to others in the field',
      'Evidence through contracts or reliable documentation'
    ],
    cfrCitation: '8 CFR § 214.2(o)(3)(iv)(F)',
    hasComparableEvidence: true
  }
];

// ============================================
// P-1A CRITERIA (5 total) - NO COMPARABLE EVIDENCE
// ============================================

export const P1A_CRITERIA_TEMPLATES: CriterionTemplate[] = [
  {
    number: 1,
    letter: 'A',
    name: 'Significant International Competition Participation',
    regulatoryLanguage: 'Evidence of having participated to a significant extent in a prior season with a major United States sports league.',
    elements: [
      'Participation in prior season',
      'League is a major United States sports league',
      'Participation was to a significant extent'
    ],
    cfrCitation: '8 CFR § 214.2(p)(4)(ii)(A)',
    hasComparableEvidence: false
  },
  {
    number: 2,
    letter: 'B',
    name: 'Participation with National Team',
    regulatoryLanguage: 'Evidence of having participated in international competition with a national team.',
    elements: [
      'Participation in international competition',
      'Competition was with a national team'
    ],
    cfrCitation: '8 CFR § 214.2(p)(4)(ii)(B)',
    hasComparableEvidence: false
  },
  {
    number: 3,
    letter: 'C',
    name: 'Participation with US College Team in Prior Season',
    regulatoryLanguage: 'Evidence of having participated to a significant extent in a prior season for a U.S. college or university in intercollegiate competition.',
    elements: [
      'Participation in prior season',
      'Team is U.S. college or university team',
      'Competition is intercollegiate',
      'Participation was to a significant extent'
    ],
    cfrCitation: '8 CFR § 214.2(p)(4)(ii)(C)',
    hasComparableEvidence: false
  },
  {
    number: 4,
    letter: 'D',
    name: 'Written Statement from Sports League or Governing Body',
    regulatoryLanguage: 'A written statement from an official of a major U.S. sports league or an official of the governing body of the sport which details how the alien or team is internationally recognized.',
    elements: [
      'Written statement from official',
      'Official is from major U.S. sports league or governing body',
      'Statement details international recognition'
    ],
    cfrCitation: '8 CFR § 214.2(p)(4)(ii)(D)',
    hasComparableEvidence: false
  },
  {
    number: 5,
    letter: 'E',
    name: 'Individual Ranking if Applicable',
    regulatoryLanguage: 'A written statement from a member of the sports media or a recognized expert in the sport which details how the alien or team is internationally recognized.',
    elements: [
      'Written statement from sports media or expert',
      'Source is recognized in the sport',
      'Statement details international recognition'
    ],
    cfrCitation: '8 CFR § 214.2(p)(4)(ii)(E)',
    hasComparableEvidence: false
  }
];

// ============================================
// EB-1A CRITERIA (10 total)
// ============================================

export const EB1A_CRITERIA_TEMPLATES: CriterionTemplate[] = [
  {
    number: 1,
    letter: 'A',
    name: 'Major International Awards',
    regulatoryLanguage: 'Documentation of the beneficiary\'s receipt of lesser nationally or internationally recognized prizes or awards for excellence in the field of endeavor.',
    elements: [
      'Receipt of nationally or internationally recognized prizes or awards',
      'Awards are for excellence in the field',
      'Awards are lesser than one-time major international award (Nobel, Oscar, etc.)'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(i)',
    hasComparableEvidence: true
  },
  {
    number: 2,
    letter: 'B',
    name: 'Membership Requiring Outstanding Achievements',
    regulatoryLanguage: 'Documentation of the beneficiary\'s membership in associations in the field for which classification is sought, which require outstanding achievements of their members, as judged by recognized national or international experts in their disciplines or fields.',
    elements: [
      'Membership in associations in the field',
      'Associations require outstanding achievements',
      'Requirements are judged by recognized experts'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(ii)',
    hasComparableEvidence: true
  },
  {
    number: 3,
    letter: 'C',
    name: 'Published Material About Beneficiary',
    regulatoryLanguage: 'Published material about the beneficiary in professional or major trade publications or other major media, relating to the beneficiary\'s work in the field for which classification is sought. Such evidence shall include the title, date, and author of the material, and any necessary translation.',
    elements: [
      'Published material about the beneficiary',
      'Material is in professional/major trade publications or major media',
      'Material relates to beneficiary\'s work in the field',
      'Includes title, date, and author',
      'Includes translations if necessary'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(iii)',
    hasComparableEvidence: true
  },
  {
    number: 4,
    letter: 'D',
    name: 'Judging the Work of Others',
    regulatoryLanguage: 'Evidence of the beneficiary\'s participation, either individually or on a panel, as a judge of the work of others in the same or an allied field of specification for which classification is sought.',
    elements: [
      'Participation as a judge',
      'Judging the work of others',
      'Work is in same or allied field'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(iv)',
    hasComparableEvidence: true
  },
  {
    number: 5,
    letter: 'E',
    name: 'Original Contributions of Major Significance',
    regulatoryLanguage: 'Evidence of the beneficiary\'s original scientific, scholarly, artistic, athletic, or business-related contributions of major significance in the field.',
    elements: [
      'Original contributions',
      'Contributions are scientific, scholarly, artistic, athletic, or business-related',
      'Contributions are of major significance'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(v)',
    hasComparableEvidence: true
  },
  {
    number: 6,
    letter: 'F',
    name: 'Authorship of Scholarly Articles',
    regulatoryLanguage: 'Evidence of the beneficiary\'s authorship of scholarly articles in the field, in professional or major trade publications or other major media.',
    elements: [
      'Authorship of scholarly articles',
      'Articles are in the field',
      'Published in professional/major trade publications or major media'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(vi)',
    hasComparableEvidence: true
  },
  {
    number: 7,
    letter: 'G',
    name: 'Display of Work at Artistic Exhibitions or Showcases',
    regulatoryLanguage: 'Evidence of the display of the beneficiary\'s work in the field at artistic exhibitions or showcases.',
    elements: [
      'Display of work',
      'Display is at artistic exhibitions or showcases',
      'Work is in the field'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(vii)',
    hasComparableEvidence: true
  },
  {
    number: 8,
    letter: 'H',
    name: 'Leading or Critical Role for Distinguished Organizations',
    regulatoryLanguage: 'Evidence that the beneficiary has performed in a leading or critical role for organizations or establishments that have a distinguished reputation.',
    elements: [
      'Performance in leading or critical role',
      'Organization or establishment has distinguished reputation'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(viii)',
    hasComparableEvidence: true
  },
  {
    number: 9,
    letter: 'I',
    name: 'High Salary or Remuneration',
    regulatoryLanguage: 'Evidence that the beneficiary has commanded a high salary or other significantly high remuneration for services, in relation to others in the field.',
    elements: [
      'High salary or significantly high remuneration',
      'Comparison to others in the field',
      'Evidence of remuneration for services'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(ix)',
    hasComparableEvidence: true
  },
  {
    number: 10,
    letter: 'J',
    name: 'Commercial Success in Performing Arts',
    regulatoryLanguage: 'Evidence of commercial successes in the performing arts, as shown by box office receipts or record, cassette, compact disk, or video sales.',
    elements: [
      'Commercial successes in performing arts',
      'Evidence includes box office receipts or sales data',
      'Sales are for records, cassettes, CDs, or videos'
    ],
    cfrCitation: '8 CFR § 204.5(h)(3)(x)',
    hasComparableEvidence: true
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCFRSection(visaType: string): string {
  const cfrMap: Record<string, string> = {
    'O-1A': '8 CFR § 214.2(o)(3)(iii)',
    'O-1B': '8 CFR § 214.2(o)(3)(iv)',
    'P-1A': '8 CFR § 214.2(p)(4)(ii)',
    'P-1B': '8 CFR § 214.2(p)(4)(iii)',
    'EB-1A': '8 CFR § 204.5(h)(3)',
  };
  return cfrMap[visaType] || '8 CFR § 214.2(o)(3)(iii)';
}

export function getCriteriaForVisaType(visaType: string): CriterionTemplate[] {
  switch (visaType) {
    case 'O-1A':
      return O1A_CRITERIA_TEMPLATES;
    case 'O-1B':
      return O1B_CRITERIA_TEMPLATES;
    case 'P-1A':
      return P1A_CRITERIA_TEMPLATES;
    case 'EB-1A':
      return EB1A_CRITERIA_TEMPLATES;
    default:
      return O1A_CRITERIA_TEMPLATES;
  }
}

export function hasComparableEvidenceProvision(visaType: string): boolean {
  return ['O-1A', 'O-1B', 'EB-1A'].includes(visaType);
}

export function getComparableEvidenceCFR(visaType: string): string | null {
  if (!hasComparableEvidenceProvision(visaType)) return null;

  const comparableMap: Record<string, string> = {
    'O-1A': '8 CFR § 214.2(o)(3)(v)',
    'O-1B': '8 CFR § 214.2(o)(3)(v)',
    'EB-1A': '8 CFR § 204.5(k)(2)',
  };

  return comparableMap[visaType] || null;
}
