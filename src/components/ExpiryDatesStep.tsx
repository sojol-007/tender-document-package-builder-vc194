import React from 'react';
import { Language, Requirement, Tender, UploadedFile } from '../types';
import { translations } from '../utils/i18n';
import { compareDatesOnly, formatDate } from '../utils/dateUtils';
import { StatusBadge } from './StatusBadge';
import {
  CalendarClock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info
} from 'lucide-react';

interface Props {
  tender: Tender;
  requirements: Requirement[];
  files: UploadedFile[];
  onFilesUpdated: (files: UploadedFile[]) => void;
  lang: Language;
  onNextStep: () => void;
}

export const ExpiryDatesStep: React.FC<Props> = ({
  tender,
  requirements,
  files,
  onFilesUpdated,
  lang,
  onNextStep
}) => {
  const t = translations[lang];

  // Requirements that require expiry date AND have a matched file
  const expiryRequirements = requirements.filter(r => r.has_expiry);

  const handleExpiryDateChange = (fileId: string, dateStr: string) => {
    const updated = files.map(f => {
      if (f.id === fileId) {
        return { ...f, expiryDate: dateStr || null };
      }
      return f;
    });
    onFilesUpdated(updated);
  };

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-blue-600" />
              {t.step4} — {t.expirySectionTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t.expirySubtitle}</p>
          </div>

          <button
            type="button"
            onClick={onNextStep}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Continue to Step 5: Review & Check
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Submission Deadline Callout */}
        <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <p className="font-semibold text-sm text-blue-950">
              Tender Submission Deadline: <span className="font-mono">{tender.submission_deadline}</span> ({formatDate(tender.submission_deadline, lang)})
            </p>
            <p className="text-blue-800">
              {t.deadlineComparisonNote.replace('{deadline}', tender.submission_deadline)}
            </p>
          </div>
        </div>
      </div>

      {/* Expiry Cards / Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Documents Requiring Expiry Dates ({expiryRequirements.length})
          </h3>
          <span className="text-xs text-slate-500">
            Only documents marked with "has_expiry: true" require dates
          </span>
        </div>

        {expiryRequirements.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            None of the tender requirements specify an expiry date check.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expiryRequirements.map(req => {
              const matchedFile = files.find(f => f.matchedRequirementId === req.id);
              const title = lang === 'bn' ? req.title_bn : req.title_en;

              // Check current expiry status
              let statusLabel = '';
              let isOk = false;
              let isExpired = false;
              let isNeeded = false;

              if (!matchedFile) {
                statusLabel = 'File Not Matched Yet';
              } else if (!matchedFile.expiryDate) {
                statusLabel = 'Expiry date needed';
                isNeeded = true;
              } else {
                const comp = compareDatesOnly(matchedFile.expiryDate, tender.submission_deadline);
                if (comp < 0) {
                  statusLabel = 'Expired';
                  isExpired = true;
                } else {
                  statusLabel = 'OK';
                  isOk = true;
                }
              }

              return (
                <div key={req.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        #{req.order}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                      {req.mandatory ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {t.mandatoryBadge}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {t.optionalBadge}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500">
                      {matchedFile ? (
                        <span className="text-slate-700">
                          Matched PDF: <span className="font-semibold text-slate-900">{matchedFile.filename}</span> ({matchedFile.pageCount} pages)
                        </span>
                      ) : (
                        <span className="italic text-slate-400">
                          No file matched yet. Match a file in Step 3 to enter an expiry date.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input & Evaluation */}
                  <div className="flex items-center gap-3">
                    {matchedFile ? (
                      <div className="flex items-center gap-3">
                        <div className="space-y-1">
                          <label htmlFor={`expiry-${req.id}`} className="block text-xs font-medium text-slate-600">
                            Enter Document Expiry Date:
                          </label>
                          <input
                            id={`expiry-${req.id}`}
                            type="date"
                            value={matchedFile.expiryDate || ''}
                            onChange={e => handleExpiryDateChange(matchedFile.id, e.target.value)}
                            className="text-xs font-mono px-3 py-1.5 border border-slate-300 rounded-lg bg-white shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Status preview */}
                        <div className="self-end pb-1">
                          {isOk && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              OK (Valid)
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Expired
                            </span>
                          )}
                          {isNeeded && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Date Needed
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        File match required
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
