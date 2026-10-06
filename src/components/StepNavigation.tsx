import React from 'react';
import { Language } from '../types';
import { translations } from '../utils/i18n';
import { FileJson, Upload, Link2, CalendarClock, ListChecks, FileCheck } from 'lucide-react';

interface Props {
  currentStep: number;
  onStepChange: (step: number) => void;
  lang: Language;
  hasTender: boolean;
  uploadedFilesCount: number;
  matchedCount: number;
  blockingCount: number;
}

export const StepNavigation: React.FC<Props> = ({
  currentStep,
  onStepChange,
  lang,
  hasTender,
  uploadedFilesCount,
  matchedCount,
  blockingCount
}) => {
  const t = translations[lang];

  const steps = [
    {
      num: 1,
      title: t.step1,
      icon: FileJson,
      isReady: hasTender,
      badge: hasTender ? 'Ready' : 'Needed'
    },
    {
      num: 2,
      title: t.step2,
      icon: Upload,
      isReady: uploadedFilesCount > 0,
      badge: uploadedFilesCount > 0 ? `${uploadedFilesCount} files` : undefined
    },
    {
      num: 3,
      title: t.step3,
      icon: Link2,
      isReady: matchedCount > 0,
      badge: matchedCount > 0 ? `${matchedCount} matched` : undefined
    },
    {
      num: 4,
      title: t.step4,
      icon: CalendarClock,
      isReady: true,
      badge: undefined
    },
    {
      num: 5,
      title: t.step5,
      icon: ListChecks,
      isReady: true,
      badge: blockingCount > 0 ? `${blockingCount} issue${blockingCount > 1 ? 's' : ''}` : 'Clean'
    },
    {
      num: 6,
      title: t.step6,
      icon: FileCheck,
      isReady: blockingCount === 0 && hasTender,
      badge: undefined
    }
  ];

  return (
    <nav aria-label="Workflow progress" className="bg-white border-b border-slate-200 shadow-sm sticky top-[68px] z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ol className="flex items-center justify-between overflow-x-auto py-2.5 gap-2 no-scrollbar">
          {steps.map(step => {
            const Icon = step.icon;
            const isActive = currentStep === step.num;
            const isCompleted = step.isReady && currentStep > step.num;

            return (
              <li key={step.num} className="flex-1 min-w-[130px] list-none">
                <button
                  type="button"
                  onClick={() => onStepChange(step.num)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-blue-50/80 text-blue-700 ring-1 ring-blue-500 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate leading-tight">{step.title}</p>
                    {step.badge && (
                      <span
                        className={`text-[10px] inline-block font-normal truncate ${
                          step.badge === 'Clean'
                            ? 'text-emerald-600'
                            : step.badge.includes('issue')
                            ? 'text-amber-600 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.badge}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
