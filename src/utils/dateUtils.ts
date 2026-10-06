/**
 * Date-only comparison utility ensuring zero timezone-skew issues.
 * All tender and expiry dates follow YYYY-MM-DD.
 */

export function normalizeDateString(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If in YYYY-MM-DD format already
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return trimmed;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns:
 *  -1 if dateA < dateB (dateA is strictly before dateB)
 *   0 if dateA === dateB
 *   1 if dateA > dateB (dateA is strictly after dateB)
 */
export function compareDatesOnly(dateA: string, dateB: string): number {
  const normA = normalizeDateString(dateA);
  const normB = normalizeDateString(dateB);
  if (normA < normB) return -1;
  if (normA > normB) return 1;
  return 0;
}

/**
 * Checks whether an expiry date is valid against the submission deadline.
 * Valid if expiry >= submission_deadline.
 */
export function isExpiryValid(expiryDate: string, submissionDeadline: string): boolean {
  if (!expiryDate || !submissionDeadline) return false;
  return compareDatesOnly(expiryDate, submissionDeadline) >= 0;
}

/**
 * Formats YYYY-MM-DD for human display
 */
export function formatDate(dateStr: string, locale: string = 'en'): string {
  if (!dateStr) return '-';
  const norm = normalizeDateString(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(norm)) return dateStr;
  
  const [year, month, day] = norm.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (locale === 'bn') {
    // English numerals to Bengali numerals
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const bnMonths = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const dStr = String(day).replace(/\d/g, d => bnDigits[Number(d)]);
    const yStr = String(year).replace(/\d/g, d => bnDigits[Number(d)]);
    return `${dStr} ${bnMonths[month - 1]} ${yStr}`;
  }

  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
