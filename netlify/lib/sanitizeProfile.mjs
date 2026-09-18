const CLASS_YEARS = ['9', '10', '11', '12'];
const FIELDS = [
  'it',
  'engineering',
  'business_management',
  'international_relations',
  'education_languages',
  'natural_sciences',
  'psychology',
];
const COUNTRY_PREFS = ['any', 'kz', 'hungary', 'netherlands'];
const GRADE_SCALES = ['five_point', 'twelve_point', 'percent', 'gpa4'];
const EXAM_STATUSES = ['not_taken', 'planning', 'taken', 'unsure'];
const ENGLISH_LEVELS = ['A2', 'B1', 'B2', 'C1', 'unsure'];
const LANGUAGE_PREFS = ['kz', 'ru', 'en', 'any'];
const TOEFL_TYPES = ['ibt', 'pbt', 'essentials', 'other'];
const TOEFL_SCALES = ['ibt_120', 'ibt_16'];

export function sanitizeProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return { error: 'Профиль не пришёл на сервер (пустое тело запроса).' };
  }
  const classYear = String(profile.classYear || '');
  if (!CLASS_YEARS.includes(classYear)) {
    return { error: `Класс «${classYear || 'не указан'}» не поддерживается анкетой (ожидались 9–12).` };
  }
  const field = String(profile.field || '');
  if (!FIELDS.includes(field)) {
    return { error: `Направление «${field || 'не указано'}» не входит в текущий охват каталога.` };
  }
  const countryPreference = String(profile.countryPreference || 'any');
  if (!COUNTRY_PREFS.includes(countryPreference)) {
    return { error: `Страна «${countryPreference}» не поддерживается школьным сценарием.` };
  }
  const gradeScale = String(profile.gradeScale || '');
  if (!GRADE_SCALES.includes(gradeScale)) {
    return { error: `Шкала оценок «${gradeScale || 'не указана'}» не поддерживается.` };
  }
  const untStatus = String(profile.untStatus || '');
  if (!EXAM_STATUSES.includes(untStatus)) {
    return { error: `Статус ЕНТ «${untStatus || 'не указан'}» не поддерживается.` };
  }
  const ieltsStatus = EXAM_STATUSES.includes(String(profile.ieltsStatus || '')) ? String(profile.ieltsStatus) : 'not_taken';
  const satStatus = EXAM_STATUSES.includes(String(profile.satStatus || '')) ? String(profile.satStatus) : 'unsure';
  const toeflStatus = EXAM_STATUSES.includes(String(profile.toeflStatus || '')) ? String(profile.toeflStatus) : 'unsure';
  const toeflType = TOEFL_TYPES.includes(String(profile.toeflType || '')) ? String(profile.toeflType) : 'ibt';
  const toeflScale = TOEFL_SCALES.includes(String(profile.toeflScale || '')) ? String(profile.toeflScale) : 'ibt_120';
  const englishLevel = String(profile.englishLevel || '');
  if (!ENGLISH_LEVELS.includes(englishLevel)) {
    return { error: `Уровень английского «${englishLevel || 'не указан'}» не поддерживается.` };
  }
  const languagePreference = String(profile.languagePreference || '');
  if (!LANGUAGE_PREFS.includes(languagePreference)) {
    return { error: `Предпочтение языка обучения «${languagePreference || 'не указано'}» не поддерживается.` };
  }
  const tuitionBudgetKzt = Number(profile.tuitionBudgetKzt);
  if (!Number.isFinite(tuitionBudgetKzt) || tuitionBudgetKzt <= 0) {
    return { error: 'Годовой бюджет на обучение указан некорректно.' };
  }
  const intakeYear = Number(profile.intakeYear);
  if (!Number.isFinite(intakeYear)) {
    return { error: 'Год поступления указан некорректно.' };
  }

  return {
    profile: {
      classYear,
      field,
      countryPreference,
      gradeScale,
      gradeValue: Number(profile.gradeValue) || 0,
      untStatus,
      untScore: profile.untScore == null ? null : Number(profile.untScore),
      untSubjects: Array.isArray(profile.untSubjects) ? profile.untSubjects.map(String).slice(0, 4) : [],
      englishLevel,
      ieltsStatus,
      ieltsScore: profile.ieltsScore == null ? null : Number(profile.ieltsScore),
      satStatus,
      satTotal: profile.satTotal == null ? null : Number(profile.satTotal),
      satReadingWriting: profile.satReadingWriting == null ? null : Number(profile.satReadingWriting),
      satMath: profile.satMath == null ? null : Number(profile.satMath),
      satDate: profile.satDate ? String(profile.satDate) : null,
      toeflStatus,
      toeflType,
      toeflScale,
      toeflScore: profile.toeflScore == null ? null : Number(profile.toeflScore),
      toeflDate: profile.toeflDate ? String(profile.toeflDate) : null,
      languagePreference,
      tuitionBudgetKzt,
      needsFinancialAid: Boolean(profile.needsFinancialAid),
      intakeYear,
      interests: Array.isArray(profile.interests) ? profile.interests.map(String).slice(0, 8) : [],
    },
  };
}
