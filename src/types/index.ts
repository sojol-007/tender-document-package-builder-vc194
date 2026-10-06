export type Language = 'en' | 'bn';

export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string; // YYYY-MM-DD
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface RequirementsData {
  tender: Tender;
  requirements: Requirement[];
}

export type RequirementStatus =
  | 'Missing'
  | 'Expiry date needed'
  | 'Expired'
  | 'Not provided'
  | 'OK';

export interface UploadedFile {
  id: string;
  file: File;
  filename: string;
  size: number;
  pageCount: number;
  hash: string; // SHA-256 hex string
  isDuplicate: boolean;
  duplicateGroupId: string | null;
  duplicateFilenames?: string[];
  matchedRequirementId: string | null;
  expiryDate: string | null; // YYYY-MM-DD
  parseStatus: 'valid' | 'corrupt' | 'password-protected' | 'processing' | 'invalid-format';
  errorMessage?: string;
  pdfBytes?: ArrayBuffer;
}

export interface AutoMatchSuggestion {
  fileId: string;
  requirementId: string;
  confidence: number; // 0 to 1
  reason: string;
}

export interface PackageGenerationOptions {
  includeIndexPage: boolean;
  signatureImageBytes?: ArrayBuffer;
  signaturePlacement?: 'all' | 'last' | 'cover';
}
