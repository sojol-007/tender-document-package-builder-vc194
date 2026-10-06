import React, { useRef, useState } from 'react';
import { Language, Requirement, RequirementsData, Tender } from '../types';
import { translations } from '../utils/i18n';
import { validateRequirementsJson } from '../services/validationService';
import { formatDate } from '../utils/dateUtils';
import { SAMPLE_REQUIREMENTS_DATA } from '../utils/sampleData';
import {
  UploadCloud,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building2,
  Briefcase,
  Calendar,
  Hash,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface Props {
  tender: Tender | null;
  requirements: Requirement[];
  onRequirementsLoaded: (data: RequirementsData) => void;
  lang: Language;
  onNextStep: () => void;
}

export const TenderRequirementsStep: React.FC<Props> = ({
  tender,
  requirements,
  onRequirementsLoaded,
  lang,
  onNextStep
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processJsonFile = async (file: File) => {
    setErrorMessage(null);

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setErrorMessage(t.errors.invalidJson + ' (Expected .json file)');
      return;
    }

    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setErrorMessage(t.errors.invalidJson);
        return;
      }

      const validation = validateRequirementsJson(parsed);
      if (!validation.valid || !validation.data) {
        setErrorMessage(validation.error || t.errors.invalidJson);
        return;
      }

      onRequirementsLoaded(validation.data);
    } catch (err: any) {
      setErrorMessage(`Failed to read file: ${err?.message || 'Unknown read error'}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processJsonFile(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processJsonFile(file);
    }
  };

  const handleDownloadSample = () => {
    const jsonStr = JSON.stringify(SAMPLE_REQUIREMENTS_DATA, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload & Actions Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileJson className="w-6 h-6 text-blue-600" />
              {t.step1} — {t.tenderInfoTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t.loadRequirementsHint}</p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <UploadCloud className="w-4 h-4" />
              {t.loadRequirements}
            </button>
            <button
              type="button"
              onClick={() => onRequirementsLoaded(SAMPLE_REQUIREMENTS_DATA)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              {t.useSampleRequirements}
            </button>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition"
              title="Download sample JSON"
            >
              <Download className="w-4 h-4" />
              {t.downloadSampleJson}
            </button>
          </div>
        </div>

        {/* Drag & Drop Area if no tender loaded or replace */}
        {!tender && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
            }`}
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">
              Drop your <code className="bg-slate-200 text-blue-700 px-1.5 py-0.5 rounded text-sm">requirements.json</code> file here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Strictly adheres to standard tender specification format with numeric ordering and bilingual document titles.
            </p>
          </div>
        )}

        {/* Error notification if any */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Validation Error</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tender Metadata Details Card */}
      {tender && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
                ID
              </span>
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{t.tenderId}</span>
                <p className="text-lg font-bold font-mono text-white">{tender.tender_id}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Valid Specification
              </span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {t.tenderTitle}
              </span>
              <p className="text-sm font-semibold text-slate-900">{tender.title}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {t.procuringEntity}
              </span>
              <p className="text-sm font-semibold text-slate-900">{tender.procuring_entity}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                {t.bidderName}
              </span>
              <p className="text-sm font-semibold text-slate-900">{tender.bidder}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {t.submissionDeadline}
              </span>
              <p className="text-sm font-bold text-blue-700 font-mono">
                {tender.submission_deadline}
                <span className="text-xs font-normal text-slate-500 block">
                  ({formatDate(tender.submission_deadline, lang)})
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Required Documents Table */}
      {requirements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-blue-600" />
                {t.requiredDocsList} ({requirements.length})
              </h3>
              <p className="text-xs text-slate-500">Sorted strictly by numeric "order" ascending</p>
            </div>

            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Continue to Step 2: Upload PDFs
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16">{t.tableHeaders.order}</th>
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">{t.tableHeaders.document}</th>
                  <th className="py-3 px-4 w-32">{t.tableHeaders.required}</th>
                  <th className="py-3 px-4 w-36">{t.tableHeaders.expiry}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map(req => {
                  const title = lang === 'bn' ? req.title_bn : req.title_en;
                  const alternateTitle = lang === 'bn' ? req.title_en : req.title_bn;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">{req.order}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{req.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{title}</div>
                        <div className="text-xs text-slate-400">{alternateTitle}</div>
                      </td>
                      <td className="py-3 px-4">
                        {req.mandatory ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {t.mandatoryBadge}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {t.optionalBadge}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {req.has_expiry ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {t.hasExpiryBadge}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            {t.noExpiryBadge}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
