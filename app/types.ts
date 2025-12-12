// Core Types for Visa Petition Generator - Internal Tool

export type VisaType = 'O-1A' | 'O-1B' | 'P-1A' | 'EB-1A' | 'EB-2 NIW';

export type BriefType = 'standard' | 'comprehensive';

export interface BeneficiaryInfo {
  fullName: string;
  profession: string;
  visaType: VisaType;
  briefType?: BriefType; // Standard (15-20 pages) or Comprehensive (30-50 pages)
  generateExhibits?: boolean; // Whether to generate exhibit PDFs at the end
  nationality?: string;
  currentStatus?: string;
  fieldOfExpertise?: string;
  fieldOfProfession?: string;
  backgroundInfo?: string;
  petitionerName?: string;
  petitionerOrganization?: string;
  additionalInfo?: string;
  primaryUrls?: string[]; // Array of primary URL strings for generation
  urls?: any[]; // Full URL objects with metadata
  uploadedFiles?: UploadedFile[]; // Files uploaded by user
  // Aliases for compatibility
  background?: string; // Alias for backgroundInfo
  recipientEmail?: string; // Email for sending documents
  jobTitle?: string; // Alias for profession
  occupation?: string; // Alias for profession
}

export interface URL {
  url: string;
  category?: string;
  description?: string;
  archived?: boolean;
  archiveUrl?: string;
  sourceTier?: 1 | 2 | 3;
}

export interface UploadedFile {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'image' | 'txt';
  size: number;
  category?: 'resume' | 'award' | 'publication' | 'media' | 'other';
  extractedText?: string;
  wordCount?: number;
  uploadedAt: Date;
}

export interface PetitionCase {
  caseId: string;
  beneficiaryInfo: BeneficiaryInfo;
  urls: URL[];
  files: UploadedFile[];
  status: 'initializing' | 'researching' | 'generating' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  currentMessage?: string;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface GeneratedDocument {
  caseId: string;
  documentNumber: number;
  documentName: string;
  content: string;
  storageUrl?: string;
  generatedAt: Date;
}

export interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
}

export type ProgressCallback = (stage: string, progress: number, message: string) => Promise<void>;

export interface PerplexitySource {
  url: string;
  title: string;
  sourceName: string;
  tier: 1 | 2 | 3;
  criteria: string[];
  keyContent: string;
  datePublished?: string;
  evidenceType: string;
}

export interface ResearchResult {
  discoveredSources: PerplexitySource[];
  totalSourcesFound: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  criteriaCoverage: string[];
  researchSummary: string;
}

export interface ExhibitPDF {
  exhibitNumber: string;
  url: string;
  title: string;
  pdfUrl?: string;
  archiveUrl?: string;
}
