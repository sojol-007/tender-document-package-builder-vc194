import React, { useRef, useState } from 'react';
import { Language, Requirement, UploadedFile } from '../types';
import { translations } from '../utils/i18n';
import {
  calculateSHA256,
  formatFileSize,
  MAX_FILES,
  MAX_TOTAL_SIZE_BYTES
} from '../utils/fileUtils';
import { inspectPdfFile, createSamplePdfFile } from '../services/pdfService';
import { updateDuplicateStatuses } from '../services/matchingService';
import {
  UploadCloud,
  FileCheck2,
  Trash2,
  AlertTriangle,
  Copy,
  Layers,
  ArrowRight,
  Sparkles,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Props {
  files: UploadedFile[];
  onFilesUpdated: (files: UploadedFile[]) => void;
  requirements: Requirement[];
  lang: Language;
  onNextStep: () => void;
}

export const FileUploadStep: React.FC<Props> = ({
  files,
  onFilesUpdated,
  requirements,
  lang,
  onNextStep
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  const processIncomingFiles = async (newFileList: FileList | File[]) => {
    const incoming = Array.from(newFileList);
    if (incoming.length === 0) return;

    setErrorMessages([]);
    setIsProcessing(true);
    const errors: string[] = [];
    const currentFiles = [...files];

    let currentTotalSize = totalBytes;
    let currentTotalCount = currentFiles.length;

    const acceptedFiles: UploadedFile[] = [];

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      setProcessingStatus(`Analyzing ${file.name} (${i + 1}/${incoming.length})...`);

      // 1. Check max count limit
      if (currentTotalCount >= MAX_FILES) {
        errors.push(t.errors.exceedsMaxFiles.replace('{filename}', file.name));
        continue;
      }

      // 2. Check total size limit
      if (currentTotalSize + file.size > MAX_TOTAL_SIZE_BYTES) {
        errors.push(t.errors.exceedsMaxSize.replace('{filename}', file.name));
        continue;
      }

      // 3. Inspect PDF format and integrity
      const inspection = await inspectPdfFile(file);
      if (!inspection.valid) {
        if (inspection.isPasswordProtected) {
          errors.push(t.errors.passwordProtectedPdf.replace('{filename}', file.name));
        } else {
          errors.push(
            t.errors.nonPdfFile.replace('{filename}', file.name) +
              ` (${inspection.error || 'Invalid PDF content'})`
          );
        }
        continue;
      }

      // 4. Calculate SHA-256 for binary duplicate detection
      let hash = '';
      try {
        hash = await calculateSHA256(inspection.pdfBytes!);
      } catch (err: any) {
        errors.push(`Could not calculate hash for ${file.name}: ${err?.message}`);
        continue;
      }

      const newUploadedFile: UploadedFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        filename: file.name,
        size: file.size,
        pageCount: inspection.pageCount,
        hash,
        isDuplicate: false,
        duplicateGroupId: null,
        matchedRequirementId: null,
        expiryDate: null,
        parseStatus: 'valid',
        pdfBytes: inspection.pdfBytes
      };

      acceptedFiles.push(newUploadedFile);
      currentTotalSize += file.size;
      currentTotalCount++;
    }

    if (acceptedFiles.length > 0) {
      // Recompute duplicates across all files
      const combined = updateDuplicateStatuses([...currentFiles, ...acceptedFiles]);
      onFilesUpdated(combined);
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
    }

    setIsProcessing(false);
    setProcessingStatus('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processIncomingFiles(e.target.files);
    }
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
    if (e.dataTransfer.files) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    const updated = files.filter(f => f.id !== fileId);
    const recomputed = updateDuplicateStatuses(updated);
    onFilesUpdated(recomputed);
  };

  /**
   * Generates sample test PDFs for instant testing (includes an intentional duplicate file)
   */
  const handleGenerateTestPdfs = async () => {
    setIsProcessing(true);
    setProcessingStatus('Generating sample test PDFs...');

    const sampleFiles: File[] = [];

    // Create 4 distinct PDF files
    const tradeLicenseFile = await createSamplePdfFile('Trade License', 2);
    sampleFiles.push(tradeLicenseFile);

    const tinCertFile = await createSamplePdfFile('TIN Certificate', 1);
    sampleFiles.push(tinCertFile);

    const vatCertFile = await createSamplePdfFile('VAT Certificate', 3);
    sampleFiles.push(vatCertFile);

    const bankSolvencyFile = await createSamplePdfFile('Bank Solvency Certificate', 2);
    sampleFiles.push(bankSolvencyFile);

    // Intentional Duplicate: Exact binary copy of tradeLicenseFile with a different filename!
    // This allows testing Test Case 7: "Two PDFs with identical binary content but different filenames"
    const duplicateBytes = await tradeLicenseFile.arrayBuffer();
    const duplicateFile = new File([duplicateBytes], 'Trade_License_Duplicate_Copy.pdf', {
      type: 'application/pdf'
    });
    sampleFiles.push(duplicateFile);

    await processIncomingFiles(sampleFiles);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-600" />
              {t.step2} — {t.uploadTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t.uploadLimitNotice}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateTestPdfs}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition"
              title={t.generateTestPdfsHint}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {t.generateTestPdfs}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || files.length >= MAX_FILES}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Drag Drop Area */}
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
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-800">{t.uploadSubtitle}</p>
          <p className="text-xs text-slate-500 mt-1">
            Accepts multiple PDF files up to 30 files & 50 MB total. Exact SHA-256 hashes are automatically computed for duplicate prevention.
          </p>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 text-blue-800 text-sm animate-pulse">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{processingStatus || 'Reading and verifying PDF pages...'}</span>
          </div>
        )}

        {/* Error Banners */}
        {errorMessages.length > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              File Upload Notice ({errorMessages.length} issue{errorMessages.length > 1 ? 's' : ''})
            </div>
            <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
              {errorMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload Counters & Limits Tracker */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Files:</span>
            <span className={`font-mono font-bold ${files.length > 25 ? 'text-amber-600' : 'text-slate-800'}`}>
              {files.length} / {MAX_FILES}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Total Size:</span>
            <span className={`font-mono font-bold ${totalBytes > 40 * 1024 * 1024 ? 'text-amber-600' : 'text-slate-800'}`}>
              {formatFileSize(totalBytes)} / 50 MB
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Total Pages:</span>
            <span className="font-mono font-bold text-slate-800">
              {files.reduce((acc, f) => acc + f.pageCount, 0)} pages
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Files Table */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-600" />
                {t.uploadedPdfs} ({files.length})
              </h3>
              <p className="text-xs text-slate-500">
                Verified valid PDFs with accurate page counts and cryptographic SHA-256 signatures
              </p>
            </div>

            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Continue to Step 3: Match Documents
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4 w-28">Size</th>
                  <th className="py-3 px-4 w-24">Pages</th>
                  <th className="py-3 px-4 w-44">Duplicate Status</th>
                  <th className="py-3 px-4 w-48">Match Status</th>
                  <th className="py-3 px-4 w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map(file => {
                  const matchedReq = requirements.find(r => r.id === file.matchedRequirementId);
                  const reqTitle = matchedReq
                    ? lang === 'bn'
                      ? matchedReq.title_bn
                      : matchedReq.title_en
                    : null;

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-xs" title={file.filename}>
                          {file.filename}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs" title={file.hash}>
                          SHA-256: {file.hash ? `${file.hash.substring(0, 12)}...` : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          <Layers className="w-3 h-3 text-slate-500" />
                          {file.pageCount} pg
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {file.isDuplicate ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Copy className="w-3 h-3 text-amber-600" />
                              {t.duplicateBadge}
                            </span>
                            {file.duplicateFilenames && file.duplicateFilenames.length > 0 && (
                              <p className="text-[10px] text-amber-700 truncate max-w-[180px]" title={file.duplicateFilenames.join(', ')}>
                                Same as: {file.duplicateFilenames.join(', ')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Unique</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {matchedReq ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[200px]" title={reqTitle || ''}>
                            {matchedReq.id}: {reqTitle}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unmatched</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
