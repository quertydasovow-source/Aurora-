import type { RawProgram } from '../../data/realCatalogTypes.ts';
import type { PlanTask, Profile } from '../../types';
import { parseCatalogLink } from './links.ts';

function splitDocuments(value: string): string[] {
  return (value || '')
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function hrefOf(value: string | null | undefined): string | null {
  const link = parseCatalogLink(value);
  return link.kind === 'url' ? link.href : null;
}

function sourceLink(program: RawProgram): string | null {
  return hrefOf(program.requirementsUrl) || hrefOf(program.programUrl);
}

function officialDeadline(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const dmy = String(value).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!dmy) return null;
  return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
}

export function buildPlanForProgram(
  profile: Profile,
  candidate: {
    program: RawProgram;
    requirementsToComplete: string[];
    deadlineNote: string;
  },
  extraAdvice: string[] = [],
): PlanTask[] {
  const program = candidate.program;
  const tasks: PlanTask[] = [];
  const year = profile.intakeYear;
  const source = sourceLink(program);
  const applyBy = officialDeadline(program.applicationDeadline);
  const scholarshipBy = officialDeadline(program.scholarshipDeadline);

  if (applyBy) {
    tasks.push({
      id: `p${program.id}-deadline`,
      programId: program.id,
      title: 'Подать заявку в срок, указанный в каталоге',
      category: 'application',
      basis: 'requirement',
      source,
      note: candidate.deadlineNote,
      suggestedTiming: null,
      officialDeadline: applyBy,
    });
  } else {
    tasks.push({
      id: `p${program.id}-deadline-unknown`,
      programId: program.id,
      title: 'Уточнить срок подачи у вуза',
      category: 'application',
      basis: 'requirement',
      source,
      note: 'Срок нужно уточнить. Рекомендуемый период — не официальный дедлайн вуза.',
      suggestedTiming: `Когда: за 1–3 месяца до предполагаемой подачи на ${year} год.`,
      officialDeadline: null,
    });
  }

  if (scholarshipBy && profile.needsFinancialAid) {
    tasks.push({
      id: `p${program.id}-scholarship`,
      programId: program.id,
      title: 'Проверить срок стипендии отдельно от подачи',
      category: 'finance',
      basis: 'requirement',
      source: hrefOf(program.scholarshipUrl) || source,
      note: program.financialAid || 'Стипендию нельзя вычитать из цены до присуждения.',
      suggestedTiming: null,
      officialDeadline: scholarshipBy,
    });
  }

  for (const [index, doc] of splitDocuments(program.documents).entries()) {
    tasks.push({
      id: `p${program.id}-doc-${index + 1}`,
      programId: program.id,
      title: `Собрать документ: ${doc}`,
      category: 'documents',
      basis: 'requirement',
      source,
      note: 'Список взят из каталога этой программы. Не смешивай требования других вузов.',
      suggestedTiming: `Когда: за 1–3 месяца до подачи на ${year} год.`,
      officialDeadline: applyBy,
    });
  }

  const entRelevant = candidate.requirementsToComplete.some((item) => /ент/i.test(item));
  if (entRelevant && profile.untStatus !== 'taken') {
    tasks.push({
      id: `p${program.id}-exam-unt`,
      programId: program.id,
      title: 'Подготовиться к ЕНТ, если этот путь нужен программе',
      category: 'exam',
      basis: 'requirement',
      source,
      note: candidate.requirementsToComplete.find((item) => /ент/i.test(item)) || program.admissionPath,
      suggestedTiming: `Когда: за 6–9 месяцев до подачи на ${year} год.`,
      officialDeadline: null,
    });
  }

  const englishRelevant = candidate.requirementsToComplete.some((item) => /ielts|toefl|английск/i.test(item));
  if (englishRelevant && profile.ieltsStatus !== 'taken' && profile.toeflStatus !== 'taken') {
    tasks.push({
      id: `p${program.id}-exam-english`,
      programId: program.id,
      title: 'Подтвердить английский сертификатом, если это требует программа',
      category: 'exam',
      basis: 'requirement',
      source,
      note: candidate.requirementsToComplete.find((item) => /ielts|toefl|английск/i.test(item)) || program.englishRequirement,
      suggestedTiming: `Когда: за 4–8 месяцев до подачи на ${year} год.`,
      officialDeadline: applyBy,
    });
  }

  const satRelevant = candidate.requirementsToComplete.some((item) => /\bsat\b/i.test(item));
  if (satRelevant && profile.satStatus !== 'taken') {
    tasks.push({
      id: `p${program.id}-exam-sat`,
      programId: program.id,
      title: 'Разобрать, нужен ли SAT для выбранного пути поступления',
      category: 'exam',
      basis: 'requirement',
      source,
      note: candidate.requirementsToComplete.find((item) => /\bsat\b/i.test(item)) || program.otherRequirements,
      suggestedTiming: `Когда: после того, как станет ясно, относится ли SAT к твоему пути.`,
      officialDeadline: null,
    });
  }

  extraAdvice.slice(0, 6).forEach((advice, index) => {
    tasks.push({
      id: `p${program.id}-advice-${index + 1}`,
      programId: program.id,
      title: advice.slice(0, 160),
      category: 'academic',
      basis: 'advice',
      source: null,
      note: 'Совет Aurora. Это не официальное требование университета.',
      suggestedTiming: null,
      officialDeadline: null,
    });
  });

  return tasks;
}
