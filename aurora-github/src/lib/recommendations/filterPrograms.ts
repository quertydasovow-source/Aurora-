// Подбор по каталогу Aurora: только детерминированные проверки, без AI и без сети.
// Используется сервером (server/index.mjs) и тестами.

import { catalogLabelsForProfile, countryMatches } from '../../data/fieldMap.ts';
import { fieldLabels } from '../../data/labels.ts';
import type { RawProgram } from '../../data/realCatalogTypes.ts';
import type { Profile, SuitabilityStatus } from '../../types';
import { checkEnglishExams, checkSat } from './examChecks.ts';
import { checkBudget, classifyTuition } from './tuition.ts';

export type CandidateVerdict = 'matches' | 'needs_prep' | 'unknown';
export type CandidateEligibility = 'confirmed' | 'preview';
export type CheckOutcome = 'matches' | 'mismatch' | 'needs_prep' | 'unknown';

export type RecommendationCandidate = {
  programId: number;
  program: RawProgram;
  verdict: CandidateVerdict;
  eligibility: CandidateEligibility;
  suitability: SuitabilityStatus;
  statusWhy: string;
  whyItFits: string[];
  requirementsToComplete: string[];
  uncertainties: string[];
  budgetComparable: boolean;
  deadlineNote: string;
  yearNote: string | null;
  tuitionNote: string;
  /** Только для внутренней сортировки. Не показывать как вероятность поступления. */
  score: number;
};

export type ExcludedProgram = {
  programId: number;
  university: string;
  program: string;
  reason: string;
};

export type FilterProgramsResult = {
  fieldLabel: string;
  catalogFieldLabels: string[];
  candidates: RecommendationCandidate[];
  preview: RecommendationCandidate[];
  excluded: ExcludedProgram[];
  archived: ExcludedProgram[];
  graduateExcluded: ExcludedProgram[];
  fieldMismatchCount: number;
  asOf: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function normalizeRecordStatus(status: string | null | undefined): string {
  return (status || '').trim().toLowerCase();
}

export function isExcludedStatus(status: string | null | undefined): boolean {
  return normalizeRecordStatus(status).includes('исключить');
}

export function isArchiveStatus(status: string | null | undefined): boolean {
  return normalizeRecordStatus(status).includes('архив');
}

export function isGraduateLevel(level: string | null | undefined): boolean {
  const text = normalize(level || '');
  return /магистратур|\bma\b|phd|докторант|докторск/.test(text);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

export function describeDeadline(deadline: string | null | undefined, asOf: Date): string {
  if (!deadline) return 'Срок нужно уточнить';
  const parsed = parseIsoDate(deadline);
  if (!parsed) return 'Срок нужно уточнить';
  if (parsed.getTime() < startOfUtcDay(asOf).getTime()) {
    return `Срок уже прошёл (${deadline})`;
  }
  return `Срок подачи: ${deadline}`;
}

function yearMatchesIntake(program: RawProgram, intakeYear: number): boolean {
  return program.admissionYear != null && program.admissionYear === intakeYear;
}

function checkLanguage(program: RawProgram, profile: Profile): { result: CheckOutcome; note: string | null } {
  const lang = normalize(program.language || '');
  const ambiguous = containsAny(lang, ['уточнить', 'не подтверждено', 'подтвердить']);
  if (profile.languagePreference === 'any') {
    return ambiguous
      ? { result: 'unknown', note: 'Язык обучения по этому потоку пока не подтверждён.' }
      : { result: 'matches', note: null };
  }
  const wantsWord = { kz: 'казах', ru: 'русск', en: 'английск' }[profile.languagePreference];
  const matches = lang.includes(wantsWord);
  if (ambiguous) {
    return { result: 'unknown', note: 'Язык обучения по этому потоку пока не подтверждён.' };
  }
  return {
    result: matches ? 'matches' : 'needs_prep',
    note: matches ? null : `Язык обучения программы — «${program.language}», отличается от твоего предпочтения.`,
  };
}

function isKazakhstanProgram(country: string): boolean {
  const text = normalize(country);
  return text.includes('казахстан') && !text.includes('великобритан');
}

function hasAlternativeAdmission(program: RawProgram): boolean {
  const blob = `${program.admissionPath} ${program.otherRequirements}`.toLowerCase();
  return containsAny(blob, ['sat', 'act', 'nis', 'nuet', 'внутренн', 'альтернатив', 'ib', 'toefl']);
}

function checkEnt(program: RawProgram, profile: Profile): { why: string[]; gaps: string[]; unknowns: string[] } {
  const why: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  const subjects = program.entSubjects || '';
  const path = program.admissionPath || '';

  if (!isKazakhstanProgram(program.country) && !/ент/i.test(`${subjects} ${path}`)) {
    why.push(`Для этой зарубежной программы ЕНТ не применяется автоматически: ${path || 'путь поступления указан в каталоге'}.`);
    return { why, gaps, unknowns };
  }

  if (/не применя/i.test(subjects)) {
    why.push(`Поступление не завязано на ЕНТ: ${path}`);
    return { why, gaps, unknowns };
  }

  const preparing = profile.untStatus === 'planning' || profile.untStatus === 'not_taken' || profile.untStatus === 'unsure';
  const alternatives = hasAlternativeAdmission(program);

  if (program.minimumEntScore == null) {
    if (/ент/i.test(`${subjects} ${path}`)) {
      unknowns.push('Минимальный балл ЕНТ для этой программы пока не подтверждён источником.');
    } else if (alternatives) {
      unknowns.push('В каталоге есть альтернативные пути поступления. ЕНТ не превращён в единственное обязательное требование.');
    }
  } else if (profile.untStatus === 'taken' && typeof profile.untScore === 'number') {
    if (profile.untScore >= program.minimumEntScore) {
      why.push(`Балл ЕНТ ${profile.untScore} соответствует известному ориентиру программы (от ${program.minimumEntScore}).`);
    } else if (alternatives) {
      gaps.push(
        `Балл ЕНТ ${profile.untScore} ниже известного ориентира ${program.minimumEntScore}. В каталоге есть и другие пути поступления — это не окончательный отказ.`,
      );
    } else {
      gaps.push(`Балл ЕНТ ниже ориентира программы: нужно от ${program.minimumEntScore}, у тебя ${profile.untScore}.`);
    }
  } else if (preparing) {
    const extra = alternatives ? ' Есть альтернативные пути поступления, их тоже стоит уточнить.' : '';
    gaps.push(
      `ЕНТ ещё не сдан — это задача подготовки, а не окончательный отказ. Известный ориентир программы: от ${program.minimumEntScore}.${extra}`,
    );
  }

  if (profile.untSubjects.length && subjects && !/не применя/i.test(subjects) && !/уточнить/i.test(subjects)) {
    const needed = subjects.toLowerCase();
    const overlap = profile.untSubjects.some((subject) => needed.includes(subject.toLowerCase()));
    if (!overlap && /ент/i.test(`${subjects} ${path}`)) {
      unknowns.push(`Профильные предметы в каталоге: ${subjects}. Сверь их с выбранными в анкете — это не жёсткий автоотказ.`);
    }
  }

  return { why, gaps, unknowns };
}

function resolveSuitability(input: {
  eligibility: CandidateEligibility;
  archived: boolean;
  deadlinePast: boolean;
  yearOk: boolean;
  gaps: string[];
  unknowns: string[];
  budgetOver: boolean;
}): { suitability: SuitabilityStatus; statusWhy: string } {
  if (input.archived) {
    return { suitability: 'not_suitable', statusWhy: 'Набор по этой записи не открыт: в каталоге архивный статус.' };
  }
  if (input.budgetOver) {
    return { suitability: 'not_suitable', statusWhy: 'Подтверждённая годовая стоимость в тенге выше указанного бюджета.' };
  }
  if (input.deadlinePast && input.yearOk) {
    return { suitability: 'not_suitable', statusWhy: 'Срок подачи по этой записи уже прошёл.' };
  }
  if (!input.yearOk) {
    return { suitability: 'clarification_needed', statusWhy: 'Условия выбранного года набора не подтверждены.' };
  }
  const importantUnknown = input.unknowns.some((item) =>
    /срок нужно уточнить|не подтверждена|неоднознач|нужно уточнить соответствие/i.test(item),
  );
  if (input.gaps.length > 0) {
    return {
      suitability: 'preparation_needed',
      statusWhy: 'Направление подходит, но есть достижимые требования: экзамен, язык или документы.',
    };
  }
  if (importantUnknown || input.unknowns.length > 2) {
    return { suitability: 'clarification_needed', statusWhy: 'По известным данным не хватает подтверждённых сведений.' };
  }
  return {
    suitability: 'suitable',
    statusWhy: 'По известным данным основные требования соблюдены. Это не гарантия поступления.',
  };
}

function toExcluded(program: RawProgram, reason: string): ExcludedProgram {
  return {
    programId: program.id,
    university: program.university,
    program: program.program,
    reason,
  };
}

function buildCandidate(
  program: RawProgram,
  profile: Profile,
  asOf: Date,
  fieldLabel: string,
): RecommendationCandidate {
  const why: string[] = [`Совпадает с направлением подбора: ${program.field} (в анкете — ${fieldLabel}).`];
  const gaps: string[] = [];
  const unknowns: string[] = [];

  const tuition = classifyTuition(program);
  const budget = checkBudget(program, profile);
  if (budget.comparable && budget.withinBudget) why.push(budget.note);
  else unknowns.push(budget.note);
  if (profile.needsFinancialAid) {
    unknowns.push('Возможную стипендию нельзя вычитать из цены до её присуждения.');
  }

  const lang = checkLanguage(program, profile);
  if (lang.result === 'matches' && !lang.note) {
    why.push(`Язык обучения — ${program.language}.`);
  } else if (lang.note) {
    if (lang.result === 'needs_prep') gaps.push(lang.note);
    else unknowns.push(lang.note);
  }

  const ent = checkEnt(program, profile);
  why.push(...ent.why);
  gaps.push(...ent.gaps);
  unknowns.push(...ent.unknowns);

  const eng = checkEnglishExams(program, profile);
  why.push(...eng.why);
  gaps.push(...eng.gaps);
  unknowns.push(...eng.unknowns);

  const sat = checkSat(program, profile);
  why.push(...sat.why);
  gaps.push(...sat.gaps);
  unknowns.push(...sat.unknowns);

  if (program.unknowns) {
    unknowns.push(program.unknowns);
  }
  if (/частично|уточнить|черновик/.test(normalizeRecordStatus(program.recordStatus))) {
    unknowns.push('Запись каталога содержит пометку о неполных сведениях — часть условий предстоит уточнить у вуза.');
  }

  const yearOk = yearMatchesIntake(program, profile.intakeYear);
  const yearNote = yearOk ? null : 'Условия выбранного года не подтверждены';
  const deadlineNote = describeDeadline(program.applicationDeadline, asOf);
  const deadlinePast = deadlineNote.startsWith('Срок уже прошёл');
  const archived = isArchiveStatus(program.recordStatus);

  const eligibility: CandidateEligibility =
    yearOk && !deadlinePast && !archived ? 'confirmed' : 'preview';

  if (yearNote) unknowns.push(yearNote);
  if (deadlineNote === 'Срок нужно уточнить') unknowns.push(deadlineNote);
  if (deadlinePast) unknowns.push(deadlineNote);
  if (archived) unknowns.push('Архивная запись: это не открытый набор.');

  let score = 3;
  if (budget.comparable && budget.withinBudget) score += 2;
  if (lang.result === 'matches') score += 1;
  if (gaps.length === 0) score += 2;
  if (unknowns.length === 0) score += 1;
  if (eligibility === 'confirmed') score += 4;
  if (catalogLabelsForProfile(profile.field, []).includes(program.field)) score += 1;

  const verdict: CandidateVerdict =
    unknowns.length > 0 || eligibility === 'preview' ? 'unknown' : gaps.length > 0 ? 'needs_prep' : 'matches';

  const { suitability, statusWhy } = resolveSuitability({
    eligibility,
    archived,
    deadlinePast,
    yearOk,
    gaps,
    unknowns,
    budgetOver: Boolean(budget.comparable && budget.withinBudget === false),
  });

  return {
    programId: program.id,
    program,
    verdict,
    eligibility,
    suitability,
    statusWhy,
    whyItFits: why,
    requirementsToComplete: gaps,
    uncertainties: unknowns,
    budgetComparable: budget.comparable,
    deadlineNote,
    yearNote,
    tuitionNote: tuition.display,
    score,
  };
}

export function filterPrograms(
  profile: Profile,
  programs: RawProgram[],
  asOf: Date = new Date(),
): FilterProgramsResult {
  const fieldLabel = fieldLabels[profile.field];
  const catalogFieldLabels = catalogLabelsForProfile(profile.field, profile.interests);
  const wanted = new Set(catalogFieldLabels.map((label) => normalize(label)));

  const excluded: ExcludedProgram[] = [];
  const archived: ExcludedProgram[] = [];
  const graduateExcluded: ExcludedProgram[] = [];
  const pool: RecommendationCandidate[] = [];
  let fieldMismatchCount = 0;

  for (const program of programs) {
    if (isExcludedStatus(program.recordStatus)) {
      excluded.push(toExcluded(program, program.recordStatus));
      continue;
    }
    if (isGraduateLevel(program.level)) {
      graduateExcluded.push(toExcluded(program, `Уровень «${program.level}» не входит в школьный сценарий бакалавриата.`));
      continue;
    }
    if (isArchiveStatus(program.recordStatus)) {
      archived.push(toExcluded(program, program.recordStatus));
      // Архив можно показать только как предварительное изучение, не как открытый набор.
      if (wanted.has(normalize(program.field)) && countryMatches(program.country, profile.countryPreference)) {
        pool.push(buildCandidate(program, profile, asOf, fieldLabel));
      }
      continue;
    }
    if (!countryMatches(program.country, profile.countryPreference)) {
      continue;
    }
    if (!wanted.has(normalize(program.field))) {
      fieldMismatchCount += 1;
      continue;
    }

    const candidate = buildCandidate(program, profile, asOf, fieldLabel);
    pool.push(candidate);
  }

  const remaining: RecommendationCandidate[] = [...pool];

  remaining.sort((a, b) => b.score - a.score);
  const candidates = remaining.filter((item) => item.eligibility === 'confirmed' && item.suitability !== 'not_suitable');
  const preview = remaining.filter((item) => item.eligibility === 'preview' || item.suitability === 'not_suitable');

  return {
    fieldLabel,
    catalogFieldLabels,
    candidates,
    preview,
    excluded,
    archived,
    graduateExcluded,
    fieldMismatchCount,
    asOf: asOf.toISOString().slice(0, 10),
  };
}
