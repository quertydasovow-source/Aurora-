import type {
  CountryPreference,
  EnglishSelfAssessment,
  ExamStatus,
  Field,
  GradeScale,
  LanguagePreference,
  StudyLanguage,
} from '../types';

export const fieldLabels: Record<Field, string> = {
  it: 'IT',
  engineering: 'Инженерия',
  business_management: 'Бизнес и менеджмент',
  international_relations: 'Международные отношения',
  education_languages: 'Педагогика и языки',
};

export const fieldShort: Record<Field, string> = {
  it: 'IT',
  engineering: 'Инженерия',
  business_management: 'Бизнес',
  international_relations: 'МО',
  education_languages: 'Педагогика',
};

export const countryPreferenceLabels: Record<CountryPreference, string> = {
  any: 'Любая страна',
  kz: 'Казахстан',
  hungary: 'Венгрия',
  netherlands: 'Нидерланды',
};

export const languageLabels: Record<StudyLanguage, string> = {
  kz: 'казахский',
  ru: 'русский',
  en: 'английский',
};

export const languagePreferenceLabels: Record<LanguagePreference, string> = {
  ...languageLabels,
  any: 'любой язык',
};

export const scaleLabels: Record<GradeScale, string> = {
  five_point: '5-балльная (Казахстан: 5 — отлично, 4 — хорошо, 3 — удовлетворительно)',
  twelve_point: '12-балльная',
  percent: 'Проценты (0–100)',
  gpa4: 'GPA по шкале 4.0',
};

export const scaleShort: Record<GradeScale, string> = {
  five_point: 'из 5',
  twelve_point: 'из 12',
  percent: 'из 100%',
  gpa4: 'GPA 4.0',
};

export const englishLabels: Record<EnglishSelfAssessment, string> = {
  A2: 'A2 — базовый',
  B1: 'B1 — средний',
  B2: 'B2 — уверенный',
  C1: 'C1 — продвинутый',
  unsure: 'Пока не знаю',
};

export const examStatusLabels: Record<ExamStatus, string> = {
  not_taken: 'Не сдавал(а)',
  planning: 'Планирую сдавать',
  taken: 'Есть результат',
  unsure: 'Пока не знаю',
};

export const toeflTypeLabels = {
  ibt: 'TOEFL iBT',
  pbt: 'TOEFL PBT (бумажный)',
  essentials: 'TOEFL Essentials',
  other: 'Другой формат TOEFL',
} as const;

export const toeflScaleLabels = {
  ibt_120: 'Шкала 0–120 (историческая / переходная оценка ETS)',
  ibt_16: 'Шкала 1–6 с шагом 0.5 (с 21 января 2026)',
} as const;

export const suitabilityLabels: Record<string, string> = {
  suitable: 'Подходит для рассмотрения',
  preparation_needed: 'Можно рассматривать после подготовки',
  clarification_needed: 'Нужно уточнить условия',
  not_suitable: 'Сейчас не подходит',
};

export const DEMO_BANNER = 'Некоторые условия требуют уточнения.';

export const SCOPE_NOTE =
  'Школьный сценарий: бакалавриат в Казахстане, Венгрии и Нидерландах. Магистратура и докторантура в подбор не входят.';
