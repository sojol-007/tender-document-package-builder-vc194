import React, { useMemo, useState } from 'react';
import { AutoMatchSuggestion, Language, Requirement, UploadedFile } from '../types';
import { translations } from '../utils/i18n';
import {
  checkDuplicateAssignmentAllowed,
  generateAutoMatchSuggestions
} from '../services/matchingService';
import {
  Link2,
  Unlink,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  FileText,
  Copy,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  XCircle
} from 'lucide-react';

interface Props {
  requirements: Requirement[];
  files: UploadedFile[];
  onFilesUpdated: (files: UploadedFile[]) => void;
  lang: Language;
  onNextStep: () => void;
}

export const MatchingStep: React.FC<Props> = ({
  requirements,
  files,
  onFilesUpdated,
  lang,
  onNextStep
}) => {
  const t = translations[lang];
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Compute Auto-Match suggestions
  const autoMatchSuggestions = useMemo(() => {
    return generateAutoMatchSuggestions(requirements, files);
  }, [requirements, files]);

  // Handler to assign a file to a requirement
  const handleAssignFile = (fileId: string, requirementId: string) => {
    setDuplicateWarning(null);
    const targetFile = files.find(f => f.id === fileId);
    if (!targetFile) return;

    // Check duplicate assignment constraint
    const duplicateCheck = checkDuplicateAssignmentAllowed(targetFile, requirementId, files);
    if (!duplicateCheck.allowed) {
      setDuplicateWarning(duplicateCheck.reason || t.errors.duplicateAssignmentConflict);
      return;
    }

    const updated = files.map(f => {
      // If this file was already matched to another requirement, release it
      if (f.id === fileId) {
        return { ...f, matchedRequirementId: requirementId };
      }
      // If another file was previously matched to this requirement, unmatch it
      if (f.matchedRequirementId === requirementId) {
        return { ...f, matchedRequirementId: null, expiryDate: null };
      }
      return f;
    });

    onFilesUpdated(updated);
  };

  // Handler to unmatch a file
  const handleUnmatchFile = (fileId: string) => {
    setDuplicateWarning(null);
    const updated = files.map(f => {
      if (f.id === fileId) {
        return { ...f, matchedRequirementId: null, expiryDate: null };
      }
      return f;
    });
    onFilesUpdated(updated);
  };

  // Handler to unmatch by requirement
  const handleUnmatchRequirement = (requirementId: string) => {
    setDuplicateWarning(null);
    const updated = files.map(f => {
      if (f.matchedRequirementId === requirementId) {
        return { ...f, matchedRequirementId: null, expiryDate: null };
      }
      return f;
    });
    onFilesUpdated(updated);
  };

  // Apply one suggested match
  const handleApplySuggestion = (suggestion: AutoMatchSuggestion) => {
    handleAssignFile(suggestion.fileId, suggestion.requirementId);
  };

  // Apply all suggested matches
  const handleApplyAllSuggestions = () => {
    let currentFiles = [...files];
    const errors: string[] = [];

    for (const sug of autoMatchSuggestions) {
      const file = currentFiles.find(f => f.id === sug.fileId);
      if (!file) continue;

      const dupCheck = checkDuplicateAssignmentAllowed(file, sug.requirementId, currentFiles);
      if (dupCheck.allowed) {
        currentFiles = currentFiles.map(f => {
          if (f.id === sug.fileId) {
            return { ...f, matchedRequirementId: sug.requirementId };
          }
          if (f.matchedRequirementId === sug.requirementId) {
            return { ...f, matchedRequirementId: null, expiryDate: null };
          }
          return f;
        });
      } else {
        errors.push(dupCheck.reason || 'Conflict');
      }
    }

    onFilesUpdated(currentFiles);
    if (errors.length > 0) {
      setDuplicateWarning(errors.join(' '));
    }
  };

  const matchedCount = requirements.filter(r =>
    files.some(f => f.matchedRequirementId === r.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-blue-600" />
              {t.step3} — {t.matchingWorkspace}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t.matchingSubtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              Matched: {matchedCount} / {requirements.length} Documents
            </span>

            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Continue to Step 4: Expiry Dates
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Duplicate Assignment Conflict Warning Banner */}
        {duplicateWarning && (
          <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start justify-between gap-3 text-rose-800 text-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Duplicate Assignment Blocked</p>
                <p className="mt-0.5 text-xs text-rose-700">{duplicateWarning}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDuplicateWarning(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Auto Match Suggestion Banner */}
        {autoMatchSuggestions.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-indigo-900">
                    {t.autoMatchTitle} ({autoMatchSuggestions.length} found)
                  </h4>
                  <p className="text-xs text-indigo-700 mt-0.5">{t.autoMatchDesc}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyAllSuggestions}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition self-start sm:self-auto shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t.applyAllSuggestions}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {autoMatchSuggestions.map(sug => {
                const file = files.find(f => f.id === sug.fileId);
                const req = requirements.find(r => r.id === sug.requirementId);
                if (!file || !req) return null;
                const reqTitle = lang === 'bn' ? req.title_bn : req.title_en;

                return (
                  <div
                    key={`${sug.fileId}_${sug.requirementId}`}
                    className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800 truncate max-w-[120px]" title={file.filename}>
                      {file.filename}
                    </span>
                    <span className="text-indigo-400">➔</span>
                    <span className="font-medium text-indigo-700 truncate max-w-[130px]" title={reqTitle}>
                      {req.id}: {reqTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplySuggestion(sug)}
                      className="ml-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                    >
                      {t.acceptSuggestion}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Matching Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Uploaded Files (4 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                {t.uploadedPdfs} ({files.length})
              </h3>
              <p className="text-xs text-slate-500">Select requirement to assign</p>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No files uploaded yet. Please complete Step 2.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {files.map(file => {
                const matchedReq = requirements.find(r => r.id === file.matchedRequirementId);
                const reqTitle = matchedReq
                  ? lang === 'bn'
                    ? matchedReq.title_bn
                    : matchedReq.title_en
                  : null;

                return (
                  <div
                    key={file.id}
                    className={`p-3.5 rounded-lg border transition ${
                      file.matchedRequirementId
                        ? 'border-blue-300 bg-blue-50/40'
                        : file.isDuplicate
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate" title={file.filename}>
                            {file.filename}
                          </p>
                          {file.isDuplicate && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800"
                              title={`Identical SHA-256 match with: ${file.duplicateFilenames?.join(', ')}`}
                            >
                              <Copy className="w-2.5 h-2.5" />
                              {t.duplicateBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {file.pageCount} pages • {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      {file.matchedRequirementId ? (
                        <button
                          type="button"
                          onClick={() => handleUnmatchFile(file.id)}
                          className="shrink-0 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded text-xs flex items-center gap-1"
                          title="Unmatch"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {/* Matching Selector */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-2">
                      <select
                        aria-label={`Match requirement for ${file.filename}`}
                        value={file.matchedRequirementId || ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) {
                            handleUnmatchFile(file.id);
                          } else {
                            handleAssignFile(file.id, val);
                          }
                        }}
                        className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- {t.noMatchYet} --</option>
                        {requirements.map(r => {
                          const isAssignedToThis = file.matchedRequirementId === r.id;
                          const otherFileAssigned = files.find(
                            f => f.matchedRequirementId === r.id && f.id !== file.id
                          );
                          const dupCheck = checkDuplicateAssignmentAllowed(file, r.id, files);
                          const isDuplicateBlocked = !dupCheck.allowed;

                          const label = `${r.order}. [${r.id}] ${lang === 'bn' ? r.title_bn : r.title_en}${
                            otherFileAssigned ? ` (Replaces: ${otherFileAssigned.filename})` : ''
                          }${isDuplicateBlocked ? ' ⚠️ [Duplicate Conflict]' : ''}`;

                          return (
                            <option
                              key={r.id}
                              value={r.id}
                              disabled={isDuplicateBlocked && !isAssignedToThis}
                            >
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {file.isDuplicate && file.duplicateFilenames && file.duplicateFilenames.length > 0 && (
                      <p className="text-[10px] text-amber-700 mt-1 italic">
                        Binary identical to: {file.duplicateFilenames.join(', ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Required Documents (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                {t.requiredDocsList} ({requirements.length})
              </h3>
              <p className="text-xs text-slate-500">Strict order • 1 file per document</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {requirements.map(req => {
              const matchedFile = files.find(f => f.matchedRequirementId === req.id);
              const title = lang === 'bn' ? req.title_bn : req.title_en;

              return (
                <div
                  key={req.id}
                  className={`p-3.5 rounded-lg border transition ${
                    matchedFile
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : req.mandatory
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{req.order}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate" title={title}>
                          {title}
                        </h4>
                        {req.mandatory ? (
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {t.mandatoryBadge}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                            {t.optionalBadge}
                          </span>
                        )}
                        {req.has_expiry && (
                          <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {t.hasExpiryBadge}
                          </span>
                        )}
                      </div>
                    </div>

                    {matchedFile && (
                      <button
                        type="button"
                        onClick={() => handleUnmatchRequirement(req.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title={t.unmatchAction}
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Matched File details or assignment selector */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {matchedFile ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate max-w-xs" title={matchedFile.filename}>
                          {matchedFile.filename}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          ({matchedFile.pageCount} pg)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span className="italic">{t.noMatchYet}</span>
                      </div>
                    )}

                    {/* Change / Assign dropdown */}
                    <div className="shrink-0 w-full sm:w-auto">
                      <select
                        aria-label={`Assign file to ${title}`}
                        value={matchedFile?.id || ''}
                        onChange={e => {
                          const fId = e.target.value;
                          if (!fId) {
                            handleUnmatchRequirement(req.id);
                          } else {
                            handleAssignFile(fId, req.id);
                          }
                        }}
                        className="w-full sm:w-48 text-xs bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">{matchedFile ? '-- Unmatch --' : '-- Choose File --'}</option>
                        {files.map(f => {
                          const dupCheck = checkDuplicateAssignmentAllowed(f, req.id, files);
                          const isBlocked = !dupCheck.allowed;
                          const isCurrentlyAssigned = f.matchedRequirementId === req.id;

                          return (
                            <option
                              key={f.id}
                              value={f.id}
                              disabled={isBlocked && !isCurrentlyAssigned}
                            >
                              {f.filename} {f.isDuplicate ? '[Duplicate]' : ''}{' '}
                              {isBlocked && !isCurrentlyAssigned ? '⛔ [Duplicate Conflict]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
