import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'visa-petition-generator',
  name: 'Visa Petition Generator',
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

export type InngestEvents = {
  'petition/generate': GeneratePetitionEvent;
};
