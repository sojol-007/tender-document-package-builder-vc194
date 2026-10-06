import React, { useState, useEffect } from 'react';
import {
  Language,
  Requirement,
  RequirementsData,
  Tender,
  UploadedFile
} from './types';
import { Header } from './components/Header';
import { StepNavigation } from './components/StepNavigation';
import { TenderRequirementsStep } from './components/TenderRequirementsStep';
import { FileUploadStep } from './components/FileUploadStep';
import { MatchingStep } from './components/MatchingStep';
import { ExpiryDatesStep } from './components/ExpiryDatesStep';
import { StatusDashboardStep } from './components/StatusDashboardStep';
import { GeneratePackageStep } from './components/GeneratePackageStep';
import { SAMPLE_REQUIREMENTS_DATA } from './utils/sampleData';
import { validatePackageGeneration } from './services/validationService';
import { updateDuplicateStatuses } from './services/matchingService';
import { translations } from './utils/i18n';
import { ShieldCheck, Info } from 'lucide-react';

const STORAGE_KEY_LANG = 'tender_builder_lang';

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    return saved === 'bn' ? 'bn' : 'en';
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [tender, setTender] = useState<Tender | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Keep language in localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  }, [lang]);

  // Handle Loading new requirements
  const handleRequirementsLoaded = (data: RequirementsData) => {
    if (uploadedFiles.length > 0 && tender) {
      const confirmReset = window.confirm(translations[lang].confirmClear);
      if (!confirmReset) return;
    }

    setTender(data.tender);
    setRequirements(data.requirements);

    // Reset matched requirements on uploaded files
    const resetFiles = uploadedFiles.map(f => ({
      ...f,
      matchedRequirementId: null,
      expiryDate: null
    }));
    setUploadedFiles(updateDuplicateStatuses(resetFiles));

    // Automatically navigate to Step 2 if not already there
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  // Quick load of sample requirements
  const handleLoadSample = () => {
    handleRequirementsLoaded(SAMPLE_REQUIREMENTS_DATA);
  };

  // Reset entire state
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all tender data and uploaded files?')) {
      setTender(null);
      setRequirements([]);
      setUploadedFiles([]);
      setCurrentStep(1);
    }
  };

  // Handle files update
  const handleFilesUpdated = (newFiles: UploadedFile[]) => {
    setUploadedFiles(newFiles);
  };

  // Calculate current blocking counts for badges
  const validation = tender
    ? validatePackageGeneration(requirements, uploadedFiles, tender.submission_deadline)
    : { canGenerate: false, blockingCount: 0 };

  const matchedCount = requirements.filter(r =>
    uploadedFiles.some(f => f.matchedRequirementId === r.id)
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* Top Application Header */}
      <Header
        lang={lang}
        onLanguageChange={setLang}
        tender={tender}
        onReset={handleReset}
        onLoadSample={handleLoadSample}
      />

      {/* Step Navigation Progress Bar */}
      <StepNavigation
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        lang={lang}
        hasTender={tender !== null}
        uploadedFilesCount={uploadedFiles.length}
        matchedCount={matchedCount}
        blockingCount={validation.blockingCount}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Requirements Specification */}
        {currentStep === 1 && (
          <TenderRequirementsStep
            tender={tender}
            requirements={requirements}
            onRequirementsLoaded={handleRequirementsLoaded}
            lang={lang}
            onNextStep={() => setCurrentStep(2)}
          />
        )}

        {/* Step 2: Upload PDFs */}
        {currentStep === 2 && (
          <FileUploadStep
            files={uploadedFiles}
            onFilesUpdated={handleFilesUpdated}
            requirements={requirements}
            lang={lang}
            onNextStep={() => setCurrentStep(3)}
          />
        )}

        {/* Step 3: Match Documents */}
        {currentStep === 3 && (
          <MatchingStep
            requirements={requirements}
            files={uploadedFiles}
            onFilesUpdated={handleFilesUpdated}
            lang={lang}
            onNextStep={() => setCurrentStep(4)}
          />
        )}

        {/* Step 4: Expiry Dates */}
        {currentStep === 4 && tender && (
          <ExpiryDatesStep
            tender={tender}
            requirements={requirements}
            files={uploadedFiles}
            onFilesUpdated={handleFilesUpdated}
            lang={lang}
            onNextStep={() => setCurrentStep(5)}
          />
        )}
        {currentStep === 4 && !tender && (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
            <p className="text-base font-semibold">Please load a requirements.json file in Step 1 first.</p>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Go to Step 1
            </button>
          </div>
        )}

        {/* Step 5: Review & Status Dashboard */}
        {currentStep === 5 && tender && (
          <StatusDashboardStep
            tender={tender}
            requirements={requirements}
            files={uploadedFiles}
            lang={lang}
            onNextStep={() => setCurrentStep(6)}
            onNavigateToStep={setCurrentStep}
          />
        )}
        {currentStep === 5 && !tender && (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
            <p className="text-base font-semibold">Please load a requirements.json file in Step 1 first.</p>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Go to Step 1
            </button>
          </div>
        )}

        {/* Step 6: Generate Package */}
        {currentStep === 6 && tender && (
          <GeneratePackageStep
            tender={tender}
            requirements={requirements}
            files={uploadedFiles}
            lang={lang}
            onNavigateToStep={setCurrentStep}
          />
        )}
        {currentStep === 6 && !tender && (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
            <p className="text-base font-semibold">Please load a requirements.json file in Step 1 first.</p>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Go to Step 1
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© Tender Document Package Builder • Strict Compliance Engine</p>
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Local Browser Processing Only (Zero Cloud Transmission)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
