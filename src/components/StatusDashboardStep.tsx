import React from 'react';
import { Language, Requirement, RequirementStatus, Tender, UploadedFile } from '../types';
import { translations } from '../utils/i18n';
import { getRequirementStatus, isStatusBlocking } from '../services/validationService';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/dateUtils';
import {
  ListChecks,
  CheckCircle2,
  AlertCircle,
  Clock,
  MinusCircle,
  FileDown,
  ArrowRight,
  ShieldAlert,
  Edit3
} from 'lucide-react';

interface Props {
  tender: Tender;
  requirements: Requirement[];
  files: UploadedFile[];
  lang: Language;
  onNextStep: () => void;
  onNavigateToStep: (step: number) => void;
}

export const StatusDashboardStep: React.FC<Props> = ({
  tender,
  requirements,
  files,
  lang,
  onNextStep,
  onNavigateToStep
}) => {
  const t = translations[lang];

  // Calculate status for every requirement
  const requirementStatuses = requirements.map(req => {
    const matched = files.find(f => f.matchedRequirementId === req.id);
    const status = getRequirementStatus(req, matched, tender.submission_deadline);
    return {
      requirement: req,
      matchedFile: matched,
      status
    };
  });

  // Calculate summary counters
  const counters: Record<RequirementStatus | 'total', number> = {
    total: requirements.length,
    OK: 0,
    Missing: 0,
    'Expiry date needed': 0,
    Expired: 0,
    'Not provided': 0
  };

  requirementStatuses.forEach(item => {
    counters[item.status]++;
  });

  const blockingCount = counters.Missing + counters['Expiry date needed'] + counters.Expired;

  // CSV Export Checklist
  const handleExportCsv = () => {
    const headers = ['Order', 'Document', 'Required', 'Expiry Required', 'File Name', 'Pages', 'Expiry Date', 'Status'];
    const rows = requirementStatuses.map(item => {
      const docName = lang === 'bn' ? item.requirement.title_bn : item.requirement.title_en;
      return [
        item.requirement.order,
        `"${docName.replace(/"/g, '""')}"`,
        item.requirement.mandatory ? 'Mandatory' : 'Optional',
        item.requirement.has_expiry ? 'Yes' : 'No',
        item.matchedFile ? `"${item.matchedFile.filename.replace(/"/g, '""')}"` : 'None',
        item.matchedFile ? item.matchedFile.pageCount : 0,
        item.matchedFile?.expiryDate || 'N/A',
        item.status
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tender.tender_id}_Checklist.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-blue-600" />
              {t.step5} — {t.statusDashboardTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t.statusDashboardSubtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              {t.exportChecklistCsv}
            </button>

            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Continue to Step 6: Generate Package
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Summary Counters */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              {t.summaryCounters.total}
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
              {counters.total}
            </span>
          </div>

          {/* OK */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t.summaryCounters.ok}
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block">
              {counters.OK}
            </span>
          </div>

          {/* Missing */}
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t.summaryCounters.missing}
            </span>
            <span className="text-2xl font-bold font-mono text-rose-800 mt-1 block">
              {counters.Missing}
            </span>
          </div>

          {/* Expiry Needed */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {t.summaryCounters.expiryNeeded}
            </span>
            <span className="text-2xl font-bold font-mono text-amber-800 mt-1 block">
              {counters['Expiry date needed']}
            </span>
          </div>

          {/* Expired */}
          <div className="p-3.5 rounded-xl bg-red-100 border border-red-300 text-center">
            <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider block flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t.summaryCounters.expired}
            </span>
            <span className="text-2xl font-bold font-mono text-red-900 mt-1 block">
              {counters.Expired}
            </span>
          </div>

          {/* Not provided */}
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wider block flex items-center justify-center gap-1">
              <MinusCircle className="w-3 h-3" />
              {t.summaryCounters.notProvided}
            </span>
            <span className="text-2xl font-bold font-mono text-slate-700 mt-1 block">
              {counters['Not provided']}
            </span>
          </div>
        </div>

        {/* Blocking Alert or Clean Notice */}
        {blockingCount > 0 ? (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 space-y-1">
              <p className="font-bold text-sm text-rose-950">
                {t.blockingAlertTitle} ({blockingCount} blocking requirement{blockingCount > 1 ? 's' : ''})
              </p>
              <p>{t.blockingAlertDesc}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 space-y-1">
              <p className="font-bold text-sm text-emerald-950">{t.allClearTitle}</p>
              <p>{t.allClearDesc}</p>
            </div>
          </div>
        )}
      </div>

      {/* Full Requirements Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Official Requirements Verification Table
          </h3>
          <span className="text-xs text-slate-500">
            Ordered strictly according to specification numeric order
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-16">{t.tableHeaders.order}</th>
                <th className="py-3 px-4">{t.tableHeaders.document}</th>
                <th className="py-3 px-4 w-28">{t.tableHeaders.required}</th>
                <th className="py-3 px-4 w-28">{t.tableHeaders.expiry}</th>
                <th className="py-3 px-4">{t.tableHeaders.matchedFile}</th>
                <th className="py-3 px-4 w-20">{t.tableHeaders.pages}</th>
                <th className="py-3 px-4 w-32">{t.tableHeaders.expiryDate}</th>
                <th className="py-3 px-4 w-40">{t.tableHeaders.status}</th>
                <th className="py-3 px-4 w-24 text-right">{t.tableHeaders.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirementStatuses.map(({ requirement: req, matchedFile, status }) => {
                const title = lang === 'bn' ? req.title_bn : req.title_en;
                const isBlocking = isStatusBlocking(status);

                return (
                  <tr
                    key={req.id}
                    className={`transition ${
                      isBlocking
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">{req.order}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{title}</div>
                      <div className="text-[11px] font-mono text-slate-400">ID: {req.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      {req.mandatory ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {t.mandatoryBadge}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {t.optionalBadge}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {req.has_expiry ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {t.hasExpiryBadge}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          {t.noExpiryBadge}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {matchedFile ? (
                        <span className="font-semibold text-slate-800 truncate max-w-xs block" title={matchedFile.filename}>
                          {matchedFile.filename}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {matchedFile ? `${matchedFile.pageCount} pg` : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {matchedFile?.expiryDate ? (
                        <span className="text-slate-800 font-medium">
                          {matchedFile.expiryDate}
                        </span>
                      ) : req.has_expiry && matchedFile ? (
                        <span className="text-amber-600 font-medium">Needed</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={status} lang={lang} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {status === 'Missing' ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToStep(3)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Match
                        </button>
                      ) : status === 'Expiry date needed' || status === 'Expired' ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToStep(4)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Date
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigateToStep(3)}
                          className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
