import type { Profile } from '../../types';

export function fingerprint(profile: Profile): string {
  return JSON.stringify({
    classYear: profile.classYear,
    intakeYear: profile.intakeYear,
    field: profile.field,
    countryPreference: profile.countryPreference,
    interests: profile.interests,
    gradeScale: profile.gradeScale,
    gradeValue: profile.gradeValue,
    untStatus: profile.untStatus,
    untScore: profile.untScore,
    untSubjects: profile.untSubjects,
    englishLevel: profile.englishLevel,
    ieltsStatus: profile.ieltsStatus,
    ieltsScore: profile.ieltsScore,
    satStatus: profile.satStatus,
    satTotal: profile.satTotal,
    satReadingWriting: profile.satReadingWriting,
    satMath: profile.satMath,
    toeflStatus: profile.toeflStatus,
    toeflType: profile.toeflType,
    toeflScale: profile.toeflScale,
    toeflScore: profile.toeflScore,
    languagePreference: profile.languagePreference,
    tuitionBudgetKzt: profile.tuitionBudgetKzt,
    needsFinancialAid: profile.needsFinancialAid,
  });
}

export function describeProfileChange(previous: Profile, next: Profile): string | null {
  const parts: string[] = [];
  if (previous.field !== next.field) parts.push('направление');
  if (previous.countryPreference !== next.countryPreference) parts.push('страну');
  if (previous.tuitionBudgetKzt !== next.tuitionBudgetKzt) parts.push('бюджет');
  if (previous.intakeYear !== next.intakeYear) parts.push('год поступления');
  if (previous.languagePreference !== next.languagePreference) parts.push('язык обучения');
  if (previous.satTotal !== next.satTotal || previous.satStatus !== next.satStatus) parts.push('SAT');
  if (previous.toeflScore !== next.toeflScore || previous.toeflStatus !== next.toeflStatus) parts.push('TOEFL');
  if (previous.ieltsScore !== next.ieltsScore || previous.ieltsStatus !== next.ieltsStatus) parts.push('IELTS');
  if (!parts.length) return null;
  return `Ты изменил(а) ${parts.join(', ')}. Маршрут обновлён.`;
}
