import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'xtraordinary-visa-generator',
  name: 'Xtraordinary Visa Generator',
});

// Event types for type safety
export interface GeneratePetitionEvent {
  name: 'petition/generate';
  data: {
    caseId: string;
    beneficiaryInfo: {
      fullName: string;
      profession: string;
      visaType: string;
      nationality?: string;
      currentStatus?: string;
      fieldOfExpertise?: string;
      backgroundInfo?: string;
      petitionerName?: string;
      petitionerOrganization?: string;
      additionalInfo?: string;
      recipientEmail?: string;
      briefType?: 'standard' | 'comprehensive';
    };
    urls: Array<{
      url: string;
      title?: string;
      description?: string;
      sourceType?: string;
      sourceName?: string;
      tier?: number;
    }>;
    uploadedFiles: Array<{
      filename: string;
      fileType: string;
      extractedText?: string;
      wordCount?: number;
    }>;
  };
}

// Additional event types
export interface ExhibitPackageEvent {
  name: 'exhibits/package';
  data: {
    caseId: string;
    caseName: string;
    beneficiaryName: string;
    exhibits: Array<{ id: string; name: string; type: 'file' | 'url'; source: string }>;
    numberingStyle: 'letters' | 'numbers' | 'roman';
  };
}

export interface SupportLetterEvent {
  name: 'letter/generate';
  data: {
    caseId: string;
    letterType: 'expert' | 'employer' | 'peer' | 'advisory';
    beneficiaryData: Record<string, string>;
    writerData: Record<string, string>;
    contentData: Record<string, string>;
  };
}

export interface FormFillEvent {
  name: 'forms/fill';
  data: {
    caseId: string;
    forms: string[];
    visaType: string;
    petitionerData: Record<string, string>;
    beneficiaryData: Record<string, string>;
  };
}

export type InngestEvents = {
  'petition/generate': GeneratePetitionEvent;
  'exhibits/package': ExhibitPackageEvent;
  'letter/generate': SupportLetterEvent;
  'forms/fill': FormFillEvent;
};
