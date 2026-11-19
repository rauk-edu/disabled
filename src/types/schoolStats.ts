export const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'] as const;
export type AcademicYear = string;

export const MAX_COUNT_VALUE = 100000;
export const MAX_SCHOOL_NAME_LENGTH = 150;
export const MAX_DISPLAY_NAME_LENGTH = 120;

export interface AgeDefinition {
  id:
    | 'age_6'
    | 'age_7'
    | 'age_8'
    | 'age_9'
    | 'age_10'
    | 'age_11'
    | 'age_12'
    | 'age_13'
    | 'age_14'
    | 'age_15plus';
  label: string;
  disabledStartIndex: number;
}

export const ENROLLMENT_AGES: AgeDefinition[] = [
  { id: 'age_6', label: '6', disabledStartIndex: 2 },
  { id: 'age_7', label: '7', disabledStartIndex: 6 },
  { id: 'age_8', label: '8', disabledStartIndex: 10 },
  { id: 'age_9', label: '9', disabledStartIndex: 14 },
  { id: 'age_10', label: '10', disabledStartIndex: 18 },
  { id: 'age_11', label: '11', disabledStartIndex: 22 },
  { id: 'age_12', label: '12', disabledStartIndex: Infinity },
  { id: 'age_13', label: '13', disabledStartIndex: Infinity },
  { id: 'age_14', label: '14', disabledStartIndex: Infinity },
  { id: 'age_15plus', label: '១៥+', disabledStartIndex: Infinity },
];

export const ENROLLMENT_FIELDS = [
  'g1_new_total',
  'g1_new_female',
  'g1_repeat_total',
  'g1_repeat_female',
  'g2_promote_total',
  'g2_promote_female',
  'g2_repeat_total',
  'g2_repeat_female',
  'g3_promote_total',
  'g3_promote_female',
  'g3_repeat_total',
  'g3_repeat_female',
  'g4_promote_total',
  'g4_promote_female',
  'g4_repeat_total',
  'g4_repeat_female',
  'g5_promote_total',
  'g5_promote_female',
  'g5_repeat_total',
  'g5_repeat_female',
  'g6_promote_total',
  'g6_promote_female',
  'g6_repeat_total',
  'g6_repeat_female',
] as const;

export type EnrollmentField = (typeof ENROLLMENT_FIELDS)[number];
export type EnrollmentRowData = Record<EnrollmentField, number>;
export type EnrollmentTableData = Record<string, EnrollmentRowData>;

export function createEmptyEnrollmentData(): EnrollmentTableData {
  const initial: EnrollmentTableData = {};
  for (const age of ENROLLMENT_AGES) {
    const row = {} as EnrollmentRowData;
    for (const field of ENROLLMENT_FIELDS) {
      row[field] = 0;
    }
    initial[age.id] = row;
  }
  return initial;
}

export type CategoryRowType = 'header' | 'total' | 'spec' | 'sub';

export interface SpecialNeedsCategory {
  id: string;
  label: string;
  type: CategoryRowType;
  num?: number;
}

export const SPECIAL_NEEDS_CATEGORIES: SpecialNeedsCategory[] = [
  { id: 'disabled_header', label: 'សិស្សពិការ', type: 'header' },
  { id: 'disabled_count', label: 'ចំនួនសិស្សពិការ*', type: 'total' },
  { id: 'disabled_type', label: 'ប្រភេទពិការ**', type: 'spec' },
  { id: 'disabled_movement', label: 'ពិបាកក្នុងការធ្វើចលនា', type: 'sub', num: 1 },
  { id: 'disabled_hearing', label: 'ពិបាកក្នុងការស្តាប់', type: 'sub', num: 2 },
  { id: 'disabled_speaking', label: 'ពិបាកក្នុងការនិយាយ', type: 'sub', num: 3 },
  { id: 'disabled_vision', label: 'ពិបាកក្នុងការមើល', type: 'sub', num: 4 },
  { id: 'disabled_internal', label: 'ពិការសរីរាង្គខាងក្នុង', type: 'sub', num: 5 },
  { id: 'disabled_intellectual', label: 'ពិការសតិបញ្ញា', type: 'sub', num: 6 },
  { id: 'disabled_mental', label: 'ពិបាកខាងផ្លូវចិត្ត', type: 'sub', num: 7 },
  { id: 'disabled_other', label: 'ពិការផ្សេងៗ (ក្រៅពីខាងលើ)', type: 'sub', num: 8 },
  { id: 'disabled_deaf_mute', label: 'ពិការគ ថ្លង់', type: 'sub', num: 9 },
  { id: 'health_main', label: 'សិស្សជួបការលំបាកផ្នែកសុខភាព', type: 'header' },
  { id: 'health_count', label: 'ចំនួនជួបការលំបាកផ្នែកសុខភាព*', type: 'total' },
  { id: 'health_type', label: 'ប្រភេទការលំបាកផ្នែកសុខភាព**', type: 'spec' },
  { id: 'health_nutrition', label: 'មានស្ថានភាពអាហារូបត្ថម្ភធ្ងន់ធ្ងរ', type: 'sub', num: 1 },
  { id: 'health_chronic', label: 'មានជម្ងឺប្រចាំកាយ', type: 'sub', num: 2 },
  { id: 'difficulty_main', label: 'សិស្សជួបការលំបាក', type: 'header' },
  { id: 'difficulty_count', label: 'ចំនួនសិស្សជួបការលំបាក*', type: 'total' },
  { id: 'difficulty_type', label: 'ប្រភេទការលំបាក**', type: 'spec' },
  { id: 'difficulty_migration', label: 'មកពីគ្រួសារផ្លាស់ប្តូរទីលំនៅ', type: 'sub', num: 1 },
  { id: 'difficulty_orphan', label: 'កុមារកំព្រា', type: 'sub', num: 2 },
  { id: 'difficulty_hiv', label: 'កុមាររងគ្រោះដោយ HIV/AIDS', type: 'sub', num: 3 },
  {
    id: 'difficulty_family_violence',
    label: 'កុមាររងអំពើហិង្សាក្នុងគ្រួសារ (ផ្លូវកាយ ផ្លូវចិត្ត ផ្លូវភេទ និងការបោះបង់)',
    type: 'sub',
    num: 4,
  },
  { id: 'difficulty_labor', label: 'កុមាររងការកេងប្រវ័ញ្ចពលកម្ម', type: 'sub', num: 5 },
  { id: 'difficulty_poverty', label: 'កុមារដែលមកពីគ្រួសារក្រីក្រ', type: 'sub', num: 6 },
  { id: 'difficulty_school_violence', label: 'កុមាររងអំពើហិង្សាក្នុងសាលា', type: 'sub', num: 7 },
  { id: 'intervention_main', label: 'ចំនួនកុមារទទួលបានកិច្ចអន្តរាគមន៍ និងប្រឹក្សាយោបល់', type: 'header' },
  { id: 'intervention_welfare', label: 'ចំនួនសិស្សទទួលបានកិច្ចអន្តរាគមន៍របស់សុខាភិបាល', type: 'sub', num: 1 },
  {
    id: 'support_welfare',
    label: 'ចំនួនសិស្សទទួលបានកិច្ចគាំពារ និងប្រឹក្សាយោបល់របស់សុខាភិបាល',
    type: 'sub',
    num: 2,
  },
];

export const EDITABLE_SPECIAL_NEEDS_CATEGORIES = SPECIAL_NEEDS_CATEGORIES.filter(
  (c) => c.type === 'sub'
);

export const SPECIAL_NEEDS_GRADES = [
  { id: 'lower', label: 'ថ្នាក់កម្រិតទាប' },
  { id: 'middle', label: 'ថ្នាក់កម្រិតមធ្យម' },
  { id: 'upper', label: 'ថ្នាក់កម្រិតខ្ពស់' },
  { id: 'mixed', label: 'ថ្នាក់កម្រិតចម្រុះ' },
  { id: 'g1', label: 'ថ្នាក់ទី១' },
  { id: 'g2', label: 'ថ្នាក់ទី២' },
  { id: 'g3', label: 'ថ្នាក់ទី៣' },
  { id: 'g4', label: 'ថ្នាក់ទី៤' },
  { id: 'g5', label: 'ថ្នាក់ទី៥' },
  { id: 'g6', label: 'ថ្នាក់ទី៦' },
] as const;

export const SPECIAL_NEEDS_FIELDS = [
  'lower_total',
  'lower_female',
  'middle_total',
  'middle_female',
  'upper_total',
  'upper_female',
  'mixed_total',
  'mixed_female',
  'g1_total',
  'g1_female',
  'g2_total',
  'g2_female',
  'g3_total',
  'g3_female',
  'g4_total',
  'g4_female',
  'g5_total',
  'g5_female',
  'g6_total',
  'g6_female',
] as const;

export type SpecialNeedsField = (typeof SPECIAL_NEEDS_FIELDS)[number];
export type SpecialNeedsRowData = Record<SpecialNeedsField, number>;
export type SpecialNeedsTableData = Record<string, SpecialNeedsRowData>;

export function createEmptySpecialNeedsData(): SpecialNeedsTableData {
  const initial: SpecialNeedsTableData = {};
  for (const cat of EDITABLE_SPECIAL_NEEDS_CATEGORIES) {
    const row = {} as SpecialNeedsRowData;
    for (const field of SPECIAL_NEEDS_FIELDS) {
      row[field] = 0;
    }
    initial[cat.id] = row;
  }
  return initial;
}

export function sanitizeCountInput(raw: string): number {
  if (raw.trim() === '') return 0;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_COUNT_VALUE);
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  schoolName: string;
  academicYear: string;
}
