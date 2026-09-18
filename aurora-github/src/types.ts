// Модель данных Aurora: школьники, бакалавриат в Казахстане, Венгрии и Нидерландах.

export const FIELDS = [
  'it',
  'engineering',
  'business_management',
  'international_relations',
  'education_languages',
] as const;
export type Field = (typeof FIELDS)[number];

export const COUNTRY_PREFERENCES = ['any', 'kz', 'hungary', 'netherlands'] as const;
export type CountryPreference = (typeof COUNTRY_PREFERENCES)[number];

export const CLASS_YEARS = ['9', '10', '11', '12'] as const;
export type ClassYear = (typeof CLASS_YEARS)[number];

export const SENIOR_CLASS_YEARS: ClassYear[] = ['11', '12'];

export const GRADE_SCALES = ['five_point', 'twelve_point', 'percent', 'gpa4'] as const;
export type GradeScale = (typeof GRADE_SCALES)[number];

export const ENGLISH_LEVELS = ['A2', 'B1', 'B2', 'C1'] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];
export type EnglishSelfAssessment = EnglishLevel | 'unsure';

export type ExamStatus = 'not_taken' | 'planning' | 'taken' | 'unsure';

export const STUDY_LANGUAGES = ['kz', 'ru', 'en'] as const;
export type StudyLanguage = (typeof STUDY_LANGUAGES)[number];
export type LanguagePreference = StudyLanguage | 'any';

export const UNT_SUBJECTS = [
  'Математика',
  'География',
  'Основы права',
  'Всемирная история',
  'Информатика',
  'Английский язык',
  'Физика',
] as const;
export type UntSubject = (typeof UNT_SUBJECTS)[number];

/** TOEFL iBT — основной формат; PBT и другие шкалы не смешиваем с iBT. */
export const TOEFL_TYPES = ['ibt', 'pbt', 'essentials', 'other'] as const;
export type ToeflType = (typeof TOEFL_TYPES)[number];

/**
 * Шкалы TOEFL iBT по ETS:
 * - ibt_120: историческая и переходная оценка 0–120;
 * - ibt_16: шкала 1–6 с шагом 0.5 для тестов с 21 января 2026.
 * Между шкалами нет собственной конвертации Aurora.
 */
export const TOEFL_SCALES = ['ibt_120', 'ibt_16'] as const;
export type ToeflScale = (typeof TOEFL_SCALES)[number];

export type SuitabilityStatus = 'suitable' | 'preparation_needed' | 'clarification_needed' | 'not_suitable';

export type CheckResult = 'matches' | 'mismatch' | 'needs_prep' | 'unknown';

export type RequirementCheck = {
  key: string;
  label: string;
  result: CheckResult;
  detail: string;
};

export type Profile = {
  classYear: ClassYear;
  intakeYear: number;
  field: Field;
  countryPreference: CountryPreference;
  interests: string[];
  gradeScale: GradeScale;
  gradeValue: number;
  untStatus: ExamStatus;
  untScore: number | null;
  untSubjects: UntSubject[];
  englishLevel: EnglishSelfAssessment;
  ieltsStatus: ExamStatus;
  ieltsScore: number | null;
  satStatus: ExamStatus;
  satTotal: number | null;
  satReadingWriting: number | null;
  satMath: number | null;
  satDate: string | null;
  toeflStatus: ExamStatus;
  toeflType: ToeflType;
  toeflScale: ToeflScale;
  toeflScore: number | null;
  toeflDate: string | null;
  languagePreference: LanguagePreference;
  tuitionBudgetKzt: number;
  needsFinancialAid: boolean;
};

export type PlanTaskBasis = 'requirement' | 'advice';

export type PlanTask = {
  id: string;
  programId: number | null;
  title: string;
  category: 'exam' | 'documents' | 'academic' | 'application' | 'finance';
  basis: PlanTaskBasis;
  source: string | null;
  note: string;
  suggestedTiming: string | null;
  officialDeadline: string | null;
  removable?: boolean;
};

export type DevelopmentCategory = 'requirement' | 'advice';

export type DevelopmentAction = {
  id: string;
  title: string;
  reason: string;
  firstStep: string;
  expectedOutcome: string;
  suggestedEffort: string;
  category: DevelopmentCategory;
  programId: number | null;
  opportunityId: string | null;
};

export type JourneyTab = 'summary' | 'recs' | 'compare' | 'plan';

export type StoredState = {
  profile: Profile | null;
  view: 'landing' | 'quiz' | 'journey';
  quizStep: number;
  journeyTab: JourneyTab;
  selectedIds: string[];
  targetId: string | null;
  taskDone: Record<string, boolean>;
  extraPlanTasks: PlanTask[];
  lastFingerprint: string | null;
  changeNote: string | null;
  resetNotice: string | null;
};
