/**
 * Template Service
 * Loads and manages agreement and letter templates
 */

import fs from 'fs';
import path from 'path';

// Template definitions
export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'agreement' | 'letter' | 'petition';
  filePath: string;
  fields: TemplateField[];
}

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
}

// Petitioner-Talent Agreement fields based on template
export const PETITIONER_TALENT_FIELDS: TemplateField[] = [
  { name: 'agreementDate', label: 'Agreement Date', type: 'date', required: true },
  { name: 'petitionerName', label: 'Petitioner Name', type: 'text', required: true, placeholder: 'Company or Organization Name' },
  { name: 'beneficiaryName', label: 'Beneficiary Name', type: 'text', required: true, placeholder: 'Full Legal Name' },
  { name: 'beneficiaryProfession', label: 'Beneficiary Profession', type: 'text', required: true, placeholder: 'e.g., Professional Soccer Player' },

  // Petitioner Role
  { name: 'petitionerRole', label: 'Petitioner Role', type: 'select', required: true, options: [
    'Direct Employer',
    'US Agent Functioning as Employer',
    'US Agent for Foreign Employer',
    'US Agent for Multiple Employers',
    'US Agent for Foreign Employer who is Self-Employed'
  ]},

  // Secondary Employers
  { name: 'secondaryEmployer1', label: 'Secondary Employer #1', type: 'text', required: false },
  { name: 'secondaryEmployer1Role', label: 'Secondary Employer #1 Role', type: 'text', required: false },
  { name: 'secondaryEmployer2', label: 'Secondary Employer #2', type: 'text', required: false },
  { name: 'secondaryEmployer2Role', label: 'Secondary Employer #2 Role', type: 'text', required: false },
  { name: 'secondaryEmployer3', label: 'Secondary Employer #3', type: 'text', required: false },
  { name: 'secondaryEmployer3Role', label: 'Secondary Employer #3 Role', type: 'text', required: false },
  { name: 'secondaryEmployer4', label: 'Secondary Employer #4', type: 'text', required: false },
  { name: 'secondaryEmployer4Role', label: 'Secondary Employer #4 Role', type: 'text', required: false },

  // Agent Structure Justification
  { name: 'agentStructureJustification', label: 'Agent Structure Justification', type: 'textarea', required: false, placeholder: 'Explain why this petitioner structure is appropriate...' },

  // Activities
  { name: 'directEmploymentActivities', label: 'Direct Employment Activities', type: 'textarea', required: false, placeholder: 'List activities performed directly under employment...' },
  { name: 'agentDirectedActivities', label: 'Agent-Directed Activities', type: 'textarea', required: false, placeholder: 'List activities organized by the agent...' },
  { name: 'selfEmploymentActivities', label: 'Self-Employment Activities', type: 'textarea', required: false, placeholder: 'List self-employment activities...' },
  { name: 'multipleEmployerActivities', label: 'Multiple Employer Activities', type: 'textarea', required: false, placeholder: 'List activities for multiple employers...' },

  // Compensation
  { name: 'compensationAmount', label: 'Compensation Amount', type: 'text', required: true, placeholder: 'e.g., 100,000' },
  { name: 'compensationPeriod', label: 'Compensation Period', type: 'select', required: true, options: ['year', 'month', 'week', 'engagement'] },

  // Governing Law
  { name: 'governingState', label: 'Governing State', type: 'text', required: true, placeholder: 'e.g., Florida' },
];

// Foreign Employer Engagement fields
export const FOREIGN_EMPLOYER_FIELDS: TemplateField[] = [
  { name: 'employerName', label: 'Employer/Engager Name', type: 'text', required: true, placeholder: 'Individual or company name' },
  { name: 'organizationName', label: 'Organization Name', type: 'text', required: true, placeholder: 'Foreign organization name' },
  { name: 'contactInfo', label: 'Contact Information', type: 'textarea', required: true, placeholder: 'Address, Phone, Email' },
  { name: 'beneficiaryName', label: 'Beneficiary Full Name', type: 'text', required: true, placeholder: 'Full legal name' },
  { name: 'activitiesStartDate', label: 'Activities Start Date', type: 'date', required: false },
  { name: 'activitiesEndDate', label: 'Activities End Date', type: 'date', required: false },
  { name: 'compensationAmount', label: 'Compensation Amount', type: 'text', required: true, placeholder: 'e.g., 5,000' },
  { name: 'compensationPeriod', label: 'Compensation Period', type: 'select', required: true, options: ['year', 'month', 'week', 'engagement', 'performance'] },
  { name: 'authorizedActivities', label: 'Description of Authorized Activities', type: 'textarea', required: true, placeholder: 'Describe the specific activities the beneficiary will perform...' },
];

// Available templates
export const TEMPLATES: Template[] = [
  {
    id: 'petitioner-talent',
    name: 'Petitioner and Talent Agreement',
    description: 'Comprehensive agreement covering Direct Employer, US Agent, Foreign Employer, Multiple Employers, and Self-Employment structures',
    category: 'agreement',
    filePath: 'templates/agreements/petitioner-talent-agreement.md',
    fields: PETITIONER_TALENT_FIELDS,
  },
  {
    id: 'foreign-employer-engagement',
    name: 'Foreign Employer Engagement Agreement',
    description: 'Agreement for P-1/O-1 visa beneficiaries with foreign employers, including authorization for service of process',
    category: 'agreement',
    filePath: 'templates/agreements/foreign-employer-engagement.md',
    fields: FOREIGN_EMPLOYER_FIELDS,
  },
];

/**
 * Load template content from file
 */
export async function loadTemplate(templateId: string): Promise<string | null> {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;

  try {
    const fullPath = path.join(process.cwd(), template.filePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load template ${templateId}:`, error);
    return null;
  }
}

/**
 * Fill template with provided data
 */
export function fillTemplate(templateContent: string, data: Record<string, string>): string {
  let filled = templateContent;

  // Replace placeholders like _______________ with actual values
  for (const [key, value] of Object.entries(data)) {
    if (value) {
      // Handle different placeholder patterns
      const patterns = [
        new RegExp(`\\[${key.toUpperCase()}\\]`, 'g'),
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        new RegExp(`{{${key}}}`, 'g'),
      ];

      for (const pattern of patterns) {
        filled = filled.replace(pattern, value);
      }
    }
  }

  return filled;
}

/**
 * Generate a filled agreement using AI to customize based on template and data
 */
export function buildAgreementPrompt(
  templateContent: string,
  templateId: string,
  data: Record<string, string>
): string {
  const template = TEMPLATES.find(t => t.id === templateId);

  return `You are generating a professional legal agreement based on a template.

## TEMPLATE REFERENCE
Use the following template as the structure and legal language reference:

---
${templateContent}
---

## DATA TO FILL IN
${Object.entries(data)
  .filter(([_, value]) => value)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

## INSTRUCTIONS
1. Use the template structure and legal language as the foundation
2. Fill in all blanks with the provided data
3. For checkbox sections, mark the appropriate option with [X] based on the petitioner role
4. Expand activity sections with appropriate professional language
5. Keep all legal clauses intact
6. Format dates properly
7. Maintain professional legal document formatting
8. If secondary employers are not provided, remove those sections
9. Customize the activities sections based on the beneficiary's profession

Generate the complete, filled agreement ready for signature.`;
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): Template | undefined {
  return TEMPLATES.find(t => t.id === templateId);
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category: 'agreement' | 'letter' | 'petition'): Template[] {
  return TEMPLATES.filter(t => t.category === category);
}
