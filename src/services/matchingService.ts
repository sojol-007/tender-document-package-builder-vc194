import { Requirement, UploadedFile, AutoMatchSuggestion } from '../types';

/**
 * Checks whether assigning a file to a requirement is permitted.
 * Critical Rule: Two files with identical binary content (same hash) must NOT be allowed
 * to be matched to different required documents!
 */
export function checkDuplicateAssignmentAllowed(
  file: UploadedFile,
  targetRequirementId: string,
  allFiles: UploadedFile[]
): { allowed: boolean; conflictingFile?: UploadedFile; reason?: string } {
  if (!file.hash) return { allowed: true };

  // Find other files with the exact same hash
  const identicalFiles = allFiles.filter(f => f.id !== file.id && f.hash === file.hash);

  for (const other of identicalFiles) {
    if (other.matchedRequirementId && other.matchedRequirementId !== targetRequirementId) {
      return {
        allowed: false,
        conflictingFile: other,
        reason: `This file has identical content (SHA-256 match) to "${other.filename}", which is already assigned to a different requirement.`
      };
    }
  }

  return { allowed: true };
}

/**
 * Updates duplicate flags and groups across all uploaded files.
 */
export function updateDuplicateStatuses(files: UploadedFile[]): UploadedFile[] {
  const hashCount = new Map<string, string[]>();

  for (const f of files) {
    if (f.hash && f.parseStatus === 'valid') {
      const existing = hashCount.get(f.hash) || [];
      existing.push(f.filename);
      hashCount.set(f.hash, existing);
    }
  }

  return files.map(f => {
    if (!f.hash || f.parseStatus !== 'valid') {
      return { ...f, isDuplicate: false, duplicateGroupId: null, duplicateFilenames: [] };
    }
    const matchingFilenames = hashCount.get(f.hash) || [];
    const isDuplicate = matchingFilenames.length > 1;
    return {
      ...f,
      isDuplicate,
      duplicateGroupId: isDuplicate ? f.hash : null,
      duplicateFilenames: isDuplicate ? matchingFilenames.filter(name => name !== f.filename) : []
    };
  });
}

/**
 * Clean string for similarity matching (strips punctuation, extensions, numbers, lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes word overlap coefficient between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const words1 = new Set(s1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(s2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return intersection / union;
}

/**
 * Generates auto-match suggestions based on normalized filename and requirement titles.
 */
export function generateAutoMatchSuggestions(
  requirements: Requirement[],
  files: UploadedFile[]
): AutoMatchSuggestion[] {
  const suggestions: AutoMatchSuggestion[] = [];
  const assignedReqs = new Set(files.map(f => f.matchedRequirementId).filter(Boolean));
  const assignedFiles = new Set(files.filter(f => f.matchedRequirementId).map(f => f.id));

  // Find suggestions only for unmatched files and unmatched requirements
  const availableFiles = files.filter(f => !assignedFiles.has(f.id) && f.parseStatus === 'valid');
  const availableReqs = requirements.filter(r => !assignedReqs.has(r.id));

  for (const file of availableFiles) {
    let bestReq: Requirement | null = null;
    let highestScore = 0;

    for (const req of availableReqs) {
      // Check duplicate assignment safety first
      const check = checkDuplicateAssignmentAllowed(file, req.id, files);
      if (!check.allowed) continue;

      const simEn = calculateSimilarity(file.filename, req.title_en);
      const simBn = calculateSimilarity(file.filename, req.title_bn);
      const simId = calculateSimilarity(file.filename, req.id);
      const score = Math.max(simEn, simBn, simId * 0.9);

      if (score > highestScore && score >= 0.4) {
        highestScore = score;
        bestReq = req;
      }
    }

    if (bestReq && highestScore >= 0.4) {
      suggestions.push({
        fileId: file.id,
        requirementId: bestReq.id,
        confidence: highestScore,
        reason: `Matched "${file.filename}" to "${bestReq.title_en}" (${Math.round(highestScore * 100)}% match)`
      });
    }
  }

  return suggestions;
}
