import React from 'react';
import { RequirementStatus, Language } from '../types';
import { translations } from '../utils/i18n';
import { CheckCircle2, AlertCircle, Clock, FileQuestion, MinusCircle } from 'lucide-react';

interface Props {
  status: RequirementStatus;
  lang: Language;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ status, lang, showIcon = true }) => {
  const t = translations[lang].statusLabels;

  switch (status) {
    case 'OK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          {t.OK}
        </span>
      );
    case 'Missing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {showIcon && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
          {t.Missing}
        </span>
      );
    case 'Expiry date needed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          {showIcon && <Clock className="w-3.5 h-3.5 text-amber-600" />}
          {t['Expiry date needed']}
        </span>
      );
    case 'Expired':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
          {showIcon && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
          {t.Expired}
        </span>
      );
    case 'Not provided':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          {showIcon && <MinusCircle className="w-3.5 h-3.5 text-slate-500" />}
          {t['Not provided']}
        </span>
      );
    default:
      return null;
  }
};
