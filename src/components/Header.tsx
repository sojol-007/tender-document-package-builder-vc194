import React from 'react';
import { Language, Tender } from '../types';
import { translations } from '../utils/i18n';
import { FileStack, Languages, ShieldCheck, RefreshCw, FileText } from 'lucide-react';

interface Props {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  tender: Tender | null;
  onReset: () => void;
  onLoadSample: () => void;
}

export const Header: React.FC<Props> = ({
  lang,
  onLanguageChange,
  tender,
  onReset,
  onLoadSample
}) => {
  const t = translations[lang];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-inner text-white font-bold">
              <FileStack className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">{t.appTitle}</h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Client-Side PDF
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">{t.appSubtitle}</p>
            </div>
          </div>

          {/* Quick Actions & Language Switcher */}
          <div className="flex items-center flex-wrap gap-2.5">
            {!tender && (
              <button
                type="button"
                onClick={onLoadSample}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                {t.useSampleRequirements}
              </button>
            )}

            {tender && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-md transition border border-slate-700"
                title="Reset application"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            {/* Language Switch */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                  lang === 'en'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('bn')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                  lang === 'bn'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
