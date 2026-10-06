import { Requirement, UploadedFile, RequirementStatus, RequirementsData } from '../types';
import { compareDatesOnly } from '../utils/dateUtils';

/**
 * Calculates the exact requirement status strictly matching the 5 specified rules.
 */
export function getRequirementStatus(
  requirement: Requirement,
  matchedFile: UploadedFile | undefined,
  submissionDeadline: string
): RequirementStatus {
  if (!matchedFile) {
    return requirement.mandatory ? 'Missing' : 'Not provided';
  }

  if (requirement.has_expiry) {
    if (!matchedFile.expiryDate || matchedFile.expiryDate.trim() === '') {
      return 'Expiry date needed';
    }
    // Date-only comparison:
    // If expiry < submission_deadline => Expired
    // If expiry == submission_deadline => OK
    // If expiry > submission_deadline => OK
    const comparison = compareDatesOnly(matchedFile.expiryDate, submissionDeadline);
    if (comparison < 0) {
      return 'Expired';
    }
  }

  return 'OK';
}

export function isStatusBlocking(status: RequirementStatus): boolean {
  return status === 'Missing' || status === 'Expiry date needed' || status === 'Expired';
}

export interface PackageValidationResult {
  canGenerate: boolean;
  blockingCount: number;
  blockingReasons: Array<{
    requirementId: string;
    requirementTitle: string;
    status: RequirementStatus;
    reason: string;
  }>;
  duplicateConflicts: string[];
}

/**
 * Validates whether the entire package can be generated.
 */
export function validatePackageGeneration(
  requirements: Requirement[],
  files: UploadedFile[],
  submissionDeadline: string
): PackageValidationResult {
  const blockingReasons: PackageValidationResult['blockingReasons'] = [];
  const duplicateConflicts: string[] = [];

  // Check requirement statuses
  for (const req of requirements) {
    const matched = files.find(f => f.matchedRequirementId === req.id);
    const status = getRequirementStatus(req, matched, submissionDeadline);

    if (isStatusBlocking(status)) {
      let reason = '';
      if (status === 'Missing') {
        reason = `Mandatory document "${req.title_en}" has not been matched with any PDF.`;
      } else if (status === 'Expiry date needed') {
        reason = `Document "${req.title_en}" requires an expiry date.`;
      } else if (status === 'Expired') {
        reason = `Document "${req.title_en}" expiry date (${matched?.expiryDate}) is before submission deadline (${submissionDeadline}).`;
      }
      blockingReasons.push({
        requirementId: req.id,
        requirementTitle: req.title_en,
        status,
        reason
      });
    }

    if (matched && matched.parseStatus !== 'valid') {
      blockingReasons.push({
        requirementId: req.id,
        requirementTitle: req.title_en,
        status: 'Missing',
        reason: `Matched file "${matched.filename}" is invalid or damaged (${matched.parseStatus}).`
      });
    }
  }

  // Check duplicate hash assignments:
  // No two files with identical binary content (same hash) may be assigned to different requirements!
  const hashMap = new Map<string, string[]>(); // hash -> requirementIds
  for (const f of files) {
    if (f.matchedRequirementId && f.hash) {
      const existing = hashMap.get(f.hash) || [];
      if (!existing.includes(f.matchedRequirementId)) {
        existing.push(f.matchedRequirementId);
      }
      hashMap.set(f.hash, existing);
    }
  }

  for (const [hash, reqIds] of hashMap.entries()) {
    if (reqIds.length > 1) {
      const conflictingFiles = files.filter(f => f.hash === hash).map(f => f.filename);
      duplicateConflicts.push(
        `Duplicate content detected: Files (${conflictingFiles.join(', ')}) with identical hash are assigned to multiple requirements (${reqIds.join(', ')}).`
      );
    }
  }

  const canGenerate = blockingReasons.length === 0 && duplicateConflicts.length === 0;

  return {
    canGenerate,
    blockingCount: blockingReasons.length + duplicateConflicts.length,
    blockingReasons,
    duplicateConflicts
  };
}

/**
 * Validates requirements.json content strictly
 */
export function validateRequirementsJson(raw: any): { valid: boolean; error?: string; data?: RequirementsData } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'File is not a valid JSON object.' };
  }

  if (!raw.tender || typeof raw.tender !== 'object') {
    return { valid: false, error: 'Missing "tender" object in requirements file.' };
  }

  const { tender_id, title, procuring_entity, bidder, submission_deadline } = raw.tender;
  if (!tender_id || !title || !procuring_entity || !bidder || !submission_deadline) {
    return {
      valid: false,
      error: 'Missing required tender fields: tender_id, title, procuring_entity, bidder, and submission_deadline are all required.'
    };
  }

  if (!Array.isArray(raw.requirements) || raw.requirements.length === 0) {
    return { valid: false, error: '"requirements" must be a non-empty list of document rules.' };
  }

  for (let i = 0; i < raw.requirements.length; i++) {
    const req = raw.requirements[i];
    if (
      !req ||
      typeof req !== 'object' ||
      typeof req.id === 'undefined' ||
      typeof req.order !== 'number' ||
      typeof req.title_en !== 'string' ||
      typeof req.title_bn !== 'string' ||
      typeof req.mandatory !== 'boolean' ||
      typeof req.has_expiry !== 'boolean'
    ) {
      return {
        valid: false,
        error: `Requirement at index ${i} is missing required fields (id, numeric order, title_en, title_bn, mandatory, has_expiry).`
      };
    }
  }

  // Sort requirements by numeric order ascending
  const sortedRequirements = [...raw.requirements].sort((a, b) => a.order - b.order);

  return {
    valid: true,
    data: {
      tender: {
        tender_id: String(tender_id).trim(),
        title: String(title).trim(),
        procuring_entity: String(procuring_entity).trim(),
        bidder: String(bidder).trim(),
        submission_deadline: String(submission_deadline).trim()
      },
      requirements: sortedRequirements
    }
  };
}
