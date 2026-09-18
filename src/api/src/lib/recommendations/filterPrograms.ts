// Подбор по каталогу Aurora: только детерминированные проверки, без AI и без сети.
// Используется сервером (server/index.mjs) и тестами.

import { catalogLabelsForProfile, countryMatches, interestRankBonus, matchesSelectedDirection, type DirectionFit } from '../../data/fieldMap.ts';
import { fieldLabels } from '../../data/labels.ts';
import type { RawProgram } from '../../data/realCatalogTypes.ts';
import type { Profile, SuitabilityStatus } from '../../types';
import { checkEnglishExams, checkSat } from './examChecks.ts';
import { checkBudget, classifyTuition, type BudgetStatus } from './tuition.ts';

export type CandidateVerdict = 'matches' | 'needs_prep' | 'unknown';
export type CandidateEligibility = 'confirmed' | 'preview';
export type CheckOutcome = 'matches' | 'mismatch' | 'needs_prep' | 'unknown';
export type DataStatus =
  | 'confirmed_for_selected_year'
  | 'latest_known_conditions'
  | 'missing_details'
  | 'archived'
  | 'draft';
export type MatchStatus = 'strong_match' | 'match' | 'possible_match' | 'not_match';
export type { DirectionFit };

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
  budgetStatus: BudgetStatus;
  dataStatus: DataStatus;
  matchStatus: MatchStatus;
  directionFit: DirectionFit;
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
  related: RecommendationCandidate[];
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

export function isDraftStatus(status: string | null | undefined): boolean {
  return /черновик/.test(normalizeRecordStatus(status));
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
  const text = String(value).trim();
  let year;
  let month;
  let day;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const dmy = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!dmy) return null;
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  }
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

/** Будущий набор: последние известные условия как ориентир, без выдуманных дедлайнов. */
export function isLatestKnownOrientation(program: RawProgram, intakeYear: number, asOf: Date): boolean {
  if (program.admissionYear == null) return false;
  if (isArchiveStatus(program.recordStatus) || isDraftStatus(program.recordStatus)) return false;
  const nextPublishedHorizon = asOf.getUTCFullYear() + 1;
  return intakeYear > program.admissionYear && intakeYear > nextPublishedHorizon;
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
  latestKnown: boolean;
  gaps: string[];
  unknowns: string[];
  budgetStatus: BudgetStatus;
}): { suitability: SuitabilityStatus; statusWhy: string } {
  if (input.archived) {
    return { suitability: 'clarification_needed', statusWhy: 'Набор по этой записи не открыт: в каталоге архивный статус.' };
  }
  if (input.deadlinePast && input.yearOk && !input.latestKnown) {
    return { suitability: 'not_suitable', statusWhy: 'Срок подачи по этой записи уже прошёл.' };
  }
  if (input.budgetStatus === 'over_budget') {
    return {
      suitability: 'preparation_needed',
      statusWhy: 'Профиль по направлению подходит, но подтверждённая стоимость выше указанного бюджета.',
    };
  }
  if (input.gaps.length > 0) {
    return {
      suitability: 'preparation_needed',
      statusWhy: input.latestKnown
        ? 'По профилю подходит. Есть достижимые пробелы, а условия выбранного года ещё не опубликованы.'
        : 'Направление подходит, но есть достижимые требования: экзамен, язык или документы.',
    };
  }
  if (input.latestKnown) {
    return {
      suitability: 'suitable',
      statusWhy: 'По профилю подходит. Условия выбранного года ещё не опубликованы — это ориентир по последним известным данным, не подтверждённый набор.',
    };
  }
  if (!input.yearOk) {
    return { suitability: 'clarification_needed', statusWhy: 'Условия выбранного года набора не подтверждены.' };
  }
  const importantUnknown = input.unknowns.some((item) =>
    /срок нужно уточнить|не подтверждена|неоднознач|нужно уточнить соответствие/i.test(item),
  );
  if (importantUnknown || input.unknowns.length > 2 || input.budgetStatus === 'unknown') {
    return { suitability: 'clarification_needed', statusWhy: 'По известным данным не хватает подтверждённых сведений.' };
  }
  if (input.budgetStatus === 'potentially_affordable_with_aid') {
    return {
      suitability: 'preparation_needed',
      statusWhy: 'Направление подходит, но стоимость выше бюджета: нужно подтверждённое финансирование.',
    };
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
  directionFit: DirectionFit,
): RecommendationCandidate {
  const why: string[] = [`Направление соответствует выбранному: ${fieldLabel}.`];
  const gaps: string[] = [];
  const unknowns: string[] = [];

  const tuition = classifyTuition(program);
  const budget = checkBudget(program, profile);
  if (budget.status === 'within_budget') why.push(budget.note);
  else if (budget.status === 'over_budget' || budget.status === 'potentially_affordable_with_aid') gaps.push(budget.note);
  else unknowns.push(budget.note);

  const lang = checkLanguage(program, profile);
  if (lang.result === 'matches' && !lang.note) {
    why.push(`Язык обучения совместим с профилем: ${program.language}.`);
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

  const interestBonus = interestRankBonus(program, profile.interests);
  if (interestBonus > 0) {
    why.push('Интересы из анкеты близки к содержанию этой программы. Это не меняет фильтр направления.');
  }

  if (program.unknowns) {
    unknowns.push(program.unknowns);
  }
  if (/частично|уточнить|черновик/.test(normalizeRecordStatus(program.recordStatus))) {
    unknowns.push('Запись каталога содержит пометку о неполных сведениях — часть условий предстоит уточнить у вуза.');
  }

  const yearOk = yearMatchesIntake(program, profile.intakeYear);
  const latestKnown = isLatestKnownOrientation(program, profile.intakeYear, asOf);
  const archived = isArchiveStatus(program.recordStatus);
  const rawDeadlineNote = describeDeadline(program.applicationDeadline, asOf);
  const deadlinePast = rawDeadlineNote.startsWith('Срок уже прошёл');

  let deadlineNote = rawDeadlineNote;
  let tuitionNote = tuition.display;
  let yearNote: string | null = yearOk ? null : 'Условия выбранного года не подтверждены';
  if (latestKnown) {
    yearNote = `Используем последние известные условия ${program.admissionYear} как ориентир. Условия набора ${profile.intakeYear} ещё не опубликованы.`;
    deadlineNote = `Дедлайн ${profile.intakeYear} ещё не опубликован`;
    tuitionNote = `Последняя известная стоимость (${program.admissionYear}): ${tuition.display}`;
  }

  const eligibility: CandidateEligibility = (yearOk && !deadlinePast && !archived) || latestKnown ? 'confirmed' : 'preview';

  if (yearNote && !latestKnown) unknowns.push(yearNote);
  if (!latestKnown && deadlineNote === 'Срок нужно уточнить') unknowns.push(deadlineNote);
  if (!latestKnown && deadlinePast) unknowns.push(deadlineNote);
  if (archived) unknowns.push('Архивная запись: это не открытый набор.');

  let score = 3 + interestBonus * 2;
  if (budget.status === 'within_budget') score += 3;
  if (budget.status === 'over_budget') score -= 3;
  if (budget.status === 'potentially_affordable_with_aid') score -= 1;
  if (lang.result === 'matches') score += 1;
  if (gaps.length === 0) score += 2;
  if (unknowns.length === 0) score += 1;
  if (eligibility === 'confirmed') score += 4;
  if (directionFit === 'related') score -= 2;

  const verdict: CandidateVerdict =
    unknowns.length > 0 || eligibility === 'preview' ? 'unknown' : gaps.length > 0 ? 'needs_prep' : 'matches';

  const { suitability, statusWhy } = resolveSuitability({
    eligibility,
    archived,
    deadlinePast,
    yearOk,
    latestKnown,
    gaps,
    unknowns,
    budgetStatus: budget.status,
  });

  const dataStatus: DataStatus = archived
    ? 'archived'
    : isDraftStatus(program.recordStatus)
      ? 'draft'
      : latestKnown
        ? 'latest_known_conditions'
        : yearOk
          ? 'confirmed_for_selected_year'
          : 'missing_details';

  const matchStatus: MatchStatus =
    directionFit === 'none'
      ? 'not_match'
      : gaps.length === 0 && (yearOk || latestKnown) && suitability !== 'clarification_needed'
        ? suitability === 'suitable'
          ? 'strong_match'
          : 'match'
        : directionFit === 'primary'
          ? 'match'
          : 'possible_match';

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
    budgetStatus: budget.status,
    dataStatus,
    matchStatus,
    directionFit,
    deadlineNote,
    yearNote,
    tuitionNote,
    score,
  };
}

export function filterPrograms(
  profile: Profile,
  programs: RawProgram[],
  asOf: Date = new Date(),
): FilterProgramsResult {
  const fieldLabel = fieldLabels[profile.field];
  const catalogFieldLabels = catalogLabelsForProfile(profile.field);

  const excluded: ExcludedProgram[] = [];
  const archived: ExcludedProgram[] = [];
  const graduateExcluded: ExcludedProgram[] = [];
  const primaryPool: RecommendationCandidate[] = [];
  const relatedPool: RecommendationCandidate[] = [];
  let fieldMismatchCount = 0;

  for (const program of programs) {
    if (isExcludedStatus(program.recordStatus) || isDraftStatus(program.recordStatus)) {
      excluded.push(toExcluded(program, program.recordStatus));
      continue;
    }
    if (isGraduateLevel(program.level)) {
      graduateExcluded.push(toExcluded(program, `Уровень «${program.level}» не входит в школьный сценарий бакалавриата.`));
      continue;
    }

    const fit = matchesSelectedDirection(program.field, profile.field);
    if (fit === 'none') {
      fieldMismatchCount += 1;
      continue;
    }
    if (!countryMatches(program.country, profile.countryPreference)) {
      continue;
    }

    if (isArchiveStatus(program.recordStatus)) {
      archived.push(toExcluded(program, program.recordStatus));
    }

    const candidate = buildCandidate(program, profile, asOf, fieldLabel, fit);
    if (candidate.matchStatus === 'not_match') continue;
    if (fit === 'related') relatedPool.push(candidate);
    else primaryPool.push(candidate);
  }

  const byScore = (a: RecommendationCandidate, b: RecommendationCandidate) => b.score - a.score;
  primaryPool.sort(byScore);
  relatedPool.sort(byScore);

  const candidates = primaryPool.filter(
    (item) =>
      item.matchStatus !== 'not_match' &&
      item.suitability !== 'not_suitable' &&
      item.dataStatus !== 'draft' &&
      (item.eligibility === 'confirmed' || item.dataStatus === 'latest_known_conditions'),
  );
  const preview = primaryPool.filter((item) => !candidates.includes(item));

  return {
    fieldLabel,
    catalogFieldLabels,
    candidates,
    preview,
    related: relatedPool,
    excluded,
    archived,
    graduateExcluded,
    fieldMismatchCount,
    asOf: asOf.toISOString().slice(0, 10),
  };
}
