import { RequirementsData } from '../types';

export const SAMPLE_REQUIREMENTS_DATA: RequirementsData = {
  tender: {
    tender_id: 'T-2026-0417',
    title: 'Supply of IT Equipment & Infrastructure',
    procuring_entity: 'Department of Information Technology & Telecommunications',
    bidder: 'Apex Enterprise Solutions Ltd.',
    submission_deadline: '2026-10-20'
  },
  requirements: [
    {
      id: 'R01',
      order: 1,
      title_en: 'Trade License',
      title_bn: 'ট্রেড লাইসেন্স',
      mandatory: true,
      has_expiry: true
    },
    {
      id: 'R02',
      order: 2,
      title_en: 'Tax Identification Number (TIN) Certificate',
      title_bn: 'কর সনাক্তকরণ নম্বর (টিআইএন) সনদপত্র',
      mandatory: true,
      has_expiry: false
    },
    {
      id: 'R03',
      order: 3,
      title_en: 'VAT Registration Certificate',
      title_bn: 'ভ্যাট নিবন্ধন সনদপত্র',
      mandatory: true,
      has_expiry: false
    },
    {
      id: 'R04',
      order: 4,
      title_en: 'Bank Solvency Certificate',
      title_bn: 'ব্যাংক সচ্ছলতা সনদপত্র',
      mandatory: true,
      has_expiry: true
    },
    {
      id: 'R05',
      order: 5,
      title_en: 'Manufacturer Authorization Letter (MAL)',
      title_bn: 'প্রস্তুতকারক অনুমোদন পত্র (এমএএল)',
      mandatory: true,
      has_expiry: true
    },
    {
      id: 'R06',
      order: 6,
      title_en: 'Audited Financial Statements (Last 3 Years)',
      title_bn: 'নিরীক্ষিত আর্থিক বিবরণী (বিগত ৩ বছর)',
      mandatory: false,
      has_expiry: false
    },
    {
      id: 'R07',
      order: 7,
      title_en: 'ISO 9001:2015 Quality Certificate',
      title_bn: 'আইএসও ৯০০১:২০১৫ গুণমান সনদপত্র',
      mandatory: false,
      has_expiry: true
    }
  ]
};
