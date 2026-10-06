import React, { useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Language,
  PackageGenerationOptions,
  Requirement,
  Tender,
  UploadedFile
} from '../types';
import { translations } from '../utils/i18n';
import { validatePackageGeneration } from '../services/validationService';
import { generateFinalTenderPackage } from '../services/pdfService';
import { formatDate, getTodayDateString } from '../utils/dateUtils';
import {
  FileCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Settings2,
  FileText,
  Stamp,
  Layers,
  Calendar,
  Building,
  UserCheck,
  Hash,
  X
} from 'lucide-react';

interface Props {
  tender: Tender;
  requirements: Requirement[];
  files: UploadedFile[];
  lang: Language;
  onNavigateToStep: (step: number) => void;
}

export const GeneratePackageStep: React.FC<Props> = ({
  tender,
  requirements,
  files,
  lang,
  onNavigateToStep
}) => {
  const t = translations[lang];

  // Options state (Index page is an optional bonus, false by default for standard package)
  const [includeIndex, setIncludeIndex] = useState(false);
  const [signaturePlacement, setSignaturePlacement] = useState<'cover' | 'all' | 'last'>('cover');
  const [stampImageBytes, setStampImageBytes] = useState<ArrayBuffer | null>(null);
  const [stampFileName, setStampFileName] = useState<string | null>(null);

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatusText, setGenerationStatusText] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    blobUrl: string;
    filename: string;
    totalPages: number;
  } | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // Validation
  const validation = validatePackageGeneration(requirements, files, tender.submission_deadline);

  // Included documents in numeric order
  const sortedRequirements = [...requirements].sort((a, b) => a.order - b.order);
  const includedDocs = sortedRequirements
    .map(r => {
      const matched = files.find(f => f.matchedRequirementId === r.id);
      return { requirement: r, file: matched };
    })
    .filter(item => item.file && item.file.parseStatus === 'valid');

  // Handle Stamp Upload
  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
        alert('Please upload a PNG image file with transparency for signature/seal stamp.');
        return;
      }
      const buffer = await file.arrayBuffer();
      setStampImageBytes(buffer);
      setStampFileName(file.name);
    }
  };

  // Generate Action
  const handleGenerate = async () => {
    if (!validation.canGenerate) return;

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStatusText('Starting compilation...');

    try {
      const options: PackageGenerationOptions = {
        includeIndexPage: includeIndex,
        signatureImageBytes: stampImageBytes || undefined,
        signaturePlacement: stampImageBytes ? signaturePlacement : undefined
      };

      const result = await generateFinalTenderPackage(
        tender,
        requirements,
        files,
        options,
        (progress, text) => {
          setGenerationProgress(progress);
          setGenerationStatusText(text);
        }
      );

      setGeneratedResult(result);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      alert(`Package generation failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedResult) return;
    const a = document.createElement('a');
    a.href = generatedResult.blobUrl;
    a.download = generatedResult.filename;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Review & Readiness Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-blue-600" />
              {t.step6} — {t.generatePackageButton}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Final pre-compilation review. Generates official PDF package with cover page, page ordering, and standardized footers.
            </p>
          </div>

          <div>
            {validation.canGenerate ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Ready to Generate Package
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Generation Blocked ({validation.blockingCount} issue{validation.blockingCount > 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>

        {/* Blocking Warning Details */}
        {!validation.canGenerate && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              {t.errors.generationBlocked.replace('{count}', String(validation.blockingCount))}
            </div>
            <p className="text-xs text-rose-800">
              Please fix the following blocking issues before generating the tender package:
            </p>
            <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
              {validation.blockingReasons.map((b, i) => (
                <li key={i}>
                  <strong className="text-rose-900">{b.requirementTitle}</strong> ({b.status}): {b.reason}
                </li>
              ))}
              {validation.duplicateConflicts.map((c, i) => (
                <li key={`dup_${i}`} className="text-rose-900 font-medium">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pre-generation Summary Box */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-600" />
              Tender Details
            </span>
            <p className="text-sm font-bold text-slate-900">{tender.tender_id}</p>
            <p className="text-xs text-slate-600 truncate">{tender.title}</p>
            <p className="text-xs text-slate-500 truncate">{tender.procuring_entity}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Compilation Structure
            </span>
            <p className="text-sm font-bold text-slate-900">
              {includedDocs.length} Documents Included
            </p>
            <p className="text-xs text-slate-600">Page 1: English Cover Page</p>
            {includeIndex && <p className="text-xs text-slate-600">Page 2: Table of Contents (Index)</p>}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Footer Specifications
            </span>
            <p className="text-sm font-bold font-mono text-slate-900">
              {tender.tender_id} | Page X of Y
            </p>
            <p className="text-xs text-slate-600">Stamps all pages including cover</p>
            <p className="text-xs text-slate-500">Output: {tender.tender_id}_Package.pdf</p>
          </div>
        </div>
      </div>

      {/* Package Options (TOC Index, Stamp/Signature) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-blue-600" />
          {t.packageOptions.title}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Index Page Toggle */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
            <input
              id="include-index-toggle"
              type="checkbox"
              checked={includeIndex}
              onChange={e => setIncludeIndex(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="include-index-toggle" className="text-xs space-y-0.5 cursor-pointer">
              <span className="font-bold text-slate-900 block">{t.packageOptions.includeIndex}</span>
              <span className="text-slate-500 block">{t.packageOptions.includeIndexDesc}</span>
            </label>
          </div>

          {/* Optional Seal / Stamp */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Stamp className="w-4 h-4 text-indigo-600" />
                {t.packageOptions.addSignatureStamp}
              </span>
              <input
                ref={stampInputRef}
                type="file"
                accept="image/png"
                onChange={handleStampUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => stampInputRef.current?.click()}
                className="text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded-md text-slate-700"
              >
                {stampFileName ? 'Replace PNG' : t.packageOptions.uploadStampButton}
              </button>
            </div>

            {stampFileName && (
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-emerald-700 font-medium">✓ {stampFileName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Placement:</span>
                  <select
                    aria-label={t.packageOptions.stampPlacement}
                    value={signaturePlacement}
                    onChange={e => setSignaturePlacement(e.target.value as any)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-0.5"
                  >
                    <option value="cover">{t.packageOptions.placementCover}</option>
                    <option value="last">{t.packageOptions.placementLast}</option>
                    <option value="all">{t.packageOptions.placementAll}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Package Document Order Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Final Package Document Order (Cover + {includedDocs.length} Documents)
            </h3>
            <p className="text-xs text-slate-500">
              Optional documents without matched files are automatically omitted.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="w-5 text-center">1.</span>
            <span>English Official Cover Page</span>
            <span className="text-slate-500 font-normal">(1 page • A4)</span>
          </div>
          {includeIndex && (
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="w-5 text-center">2.</span>
              <span>Table of Contents (Index Page)</span>
              <span className="text-slate-500 font-normal">(1 page • A4)</span>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {includedDocs.map((item, idx) => {
            const rowNumber = (includeIndex ? 3 : 2) + idx;
            const title = lang === 'bn' ? item.requirement.title_bn : item.requirement.title_en;

            return (
              <div key={item.requirement.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-slate-500 w-5 text-center">
                    {rowNumber}.
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{title}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      File: {item.file?.filename} • Req Order: #{item.requirement.order}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {item.file?.pageCount} pages
                  </span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ready
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Generation & Download Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Generate Final PDF Package</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Target Filename: <span className="font-mono font-bold text-blue-300">{tender.tender_id}_Package.pdf</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!validation.canGenerate || isGenerating}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition ${
                validation.canGenerate && !isGenerating
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.generatingPackage} ({generationProgress}%)
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5" />
                  {t.generatePackageButton}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-300 text-center font-mono">
              {generationStatusText}
            </p>
          </div>
        )}

        {/* Generated Success Card */}
        {generatedResult && (
          <div className="pt-4 border-t border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{t.packageReady}</h4>
                <p className="text-xs text-slate-300">
                  {generatedResult.filename} • {generatedResult.totalPages} total pages compiled with verified footers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition"
              >
                <Eye className="w-4 h-4" />
                {t.previewPdf}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition"
              >
                <Download className="w-4 h-4" />
                {t.downloadPackage}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewOpen && generatedResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">{generatedResult.filename} (Preview)</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {generatedResult.totalPages} pages
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100">
              <iframe
                src={generatedResult.blobUrl}
                title="Final Package Preview"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
