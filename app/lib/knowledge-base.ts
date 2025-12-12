import fs from 'fs';
import path from 'path';
import { VisaType } from '../types';

export interface KnowledgeBaseFile {
  name: string;
  path: string;
  content: string;
  priority: number;
}

// Define the optimal reading order for each visa type
const VISA_TYPE_FILES: Record<VisaType, string[]> = {
  'O-1A': [
    'O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md', // Section 3: O-1A Criteria
    'O-1a knowledge base.md', // Complete O-1A knowledge
    'O-1a visa complete guide.md',
    'O-1A Evlaution Rag.md',
    'DIY O1A RAG.md',
    'Master mega prompt Visa making.md',
    'policy memeos visas EB1a and O-1.md',
    'policy memeos visas.md',
  ],
  'O-1B': [
    'O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md', // Section 4: O-1B Criteria
    'O-1B knowledge base.md',
    'DIY O1B Rag.md',
    'Master mega prompt Visa making.md',
    'policy memeos visas.md',
  ],
  'P-1A': [
    'O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md', // Section 5: P-1A Criteria
    'P-1 A Knowledge Base.md',
    'P-1A Itienrary document.md',
    'DIY P1A RAG.md',
    'Master mega prompt Visa making.md',
    'policy memeos visas.md',
  ],
  'EB-1A': [
    'O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md', // Section 2: EB-1A Criteria
    'EB-1A knowledge base.md',
    'EB1A_petition_Brief.md',
    'EB1A_petition_Brief.mddive analysis example.md', // GOLD STANDARD
    'EB1A_Tech_Marathon_Runner_Comprehensive_Analysis (1).md',
    'Master mega prompt Visa making.md',
    'policy memeos visas EB1a and O-1.md',
  ],
  'EB-2 NIW': [
    'O1A_O1B_P1A_EB1A_profesional_evaluationRAG.md',
    'Master mega prompt Visa making.md',
    'policy memeos visas.md',
  ],
};

export async function getKnowledgeBaseFiles(visaType: VisaType): Promise<KnowledgeBaseFile[]> {
  const knowledgeBasePath = path.join(process.cwd(), 'knowledge-base');
  const fileNames = VISA_TYPE_FILES[visaType];
  const files: KnowledgeBaseFile[] = [];

  for (let i = 0; i < fileNames.length; i++) {
    const fileName = fileNames[i];
    const filePath = path.join(knowledgeBasePath, fileName);

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        files.push({
          name: fileName,
          path: filePath,
          content,
          priority: i + 1, // Priority based on order
        });
      } else {
        console.warn(`Knowledge base file not found: ${fileName}`);
      }
    } catch (error) {
      console.error(`Error reading knowledge base file ${fileName}:`, error);
    }
  }

  return files;
}

export function extractRelevantSections(content: string, visaType: VisaType): string {
  // Extract specific sections based on visa type
  const sectionMarkers: Record<VisaType, string[]> = {
    'O-1A': ['SECTION 3: O-1A', 'O-1A CRITERIA', 'SECTION 6: PUBLICATION', 'SECTION 8: LEGAL BRIEF'],
    'O-1B': ['SECTION 4: O-1B', 'O-1B CRITERIA', 'SECTION 6: PUBLICATION', 'SECTION 8: LEGAL BRIEF'],
    'P-1A': ['SECTION 5: P-1A', 'P-1A CRITERIA', 'SECTION 6: PUBLICATION', 'SECTION 8: LEGAL BRIEF'],
    'EB-1A': ['SECTION 2: EB-1A', 'EB-1A CRITERIA', 'SECTION 6: PUBLICATION', 'SECTION 8: LEGAL BRIEF', 'KAZARIAN'],
    'EB-2 NIW': ['NATIONAL INTEREST', 'NIW', 'SECTION 6: PUBLICATION', 'SECTION 8: LEGAL BRIEF'],
  };

  const markers = sectionMarkers[visaType];
  const sections: string[] = [];

  for (const marker of markers) {
    const markerIndex = content.toUpperCase().indexOf(marker.toUpperCase());
    if (markerIndex !== -1) {
      // Extract a reasonable chunk around this marker
      const start = Math.max(0, markerIndex - 500);
      const end = Math.min(content.length, markerIndex + 5000);
      sections.push(content.substring(start, end));
    }
  }

  return sections.length > 0 ? sections.join('\n\n---\n\n') : content;
}

export function buildKnowledgeBaseContext(files: KnowledgeBaseFile[], visaType: VisaType): string {
  let context = `# VISA PETITION KNOWLEDGE BASE - ${visaType}\n\n`;
  context += `This knowledge base contains comprehensive information for generating ${visaType} visa petition documents.\n\n`;
  context += `Files loaded (in priority order):\n`;

  files.forEach((file, index) => {
    context += `${index + 1}. ${file.name}\n`;
  });

  context += `\n---\n\n`;

  files.forEach((file, index) => {
    context += `## FILE ${index + 1}: ${file.name}\n\n`;

    // Extract relevant sections to reduce token usage
    const relevantContent = extractRelevantSections(file.content, visaType);
    context += relevantContent;

    context += `\n\n---\n\n`;
  });

  return context;
}
