import { countryPreferenceLabels, fieldLabels } from '../data/labels';
import type { Profile } from '../types';

export function buildProfileDiagnosis(profile: Profile) {
  const goal = `Поступление на бакалавриат (${fieldLabels[profile.field]}), ${countryPreferenceLabels[profile.countryPreference]}, набор ${profile.intakeYear}.`;
  const strengths: string[] = [];
  if (profile.untStatus === 'taken' && profile.untScore != null) {
    strengths.push(`Есть результат ЕНТ: ${profile.untScore} из 140.`);
  }
  if (profile.ieltsStatus === 'taken' && profile.ieltsScore != null) {
    strengths.push(`Есть результат IELTS: ${profile.ieltsScore}.`);
  }
  if (profile.satStatus === 'taken' && profile.satTotal != null) {
    strengths.push(`Есть результат SAT: ${profile.satTotal}.`);
  }
  if (profile.toeflStatus === 'taken' && profile.toeflScore != null) {
    strengths.push(`Есть результат TOEFL: ${profile.toeflScore}.`);
  }
  if (profile.interests.length) strengths.push(`Интересы: ${profile.interests.join(', ')}.`);
  const constraints = [
    `Бюджет ${profile.tuitionBudgetKzt.toLocaleString('ru-RU')} ₸ покрывает только обучение.`,
  ];
  if (profile.needsFinancialAid) constraints.push('Нужна финансовая помощь — её нельзя заранее вычитать из цены.');
  const missing: string[] = [];
  if (!profile.interests.length) missing.push('Интересы внутри направления не уточнены.');
  return { goal, strengths, constraints, missing };
}

export function describeMatchChange(previous: Profile, next: Profile): string | null {
  const parts: string[] = [];
  if (previous.field !== next.field) parts.push('направление');
  if (previous.countryPreference !== next.countryPreference) parts.push('страну');
  if (previous.tuitionBudgetKzt !== next.tuitionBudgetKzt) parts.push('бюджет');
  if (previous.intakeYear !== next.intakeYear) parts.push('год поступления');
  if (previous.satStatus !== next.satStatus || previous.satTotal !== next.satTotal) parts.push('SAT');
  if (previous.toeflStatus !== next.toeflStatus || previous.toeflScore !== next.toeflScore) parts.push('TOEFL');
  if (previous.ieltsStatus !== next.ieltsStatus || previous.ieltsScore !== next.ieltsScore) parts.push('IELTS');
  if (!parts.length) return null;
  return `Ты изменил(а) ${parts.join(', ')}.`;
}
