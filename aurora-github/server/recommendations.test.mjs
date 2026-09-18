import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCatalog } from '../src/lib/recommendations/catalogLoader.ts';
import { buildDevelopmentActions } from '../src/lib/recommendations/developmentActions.ts';
import { checkEnglishExams, checkSat } from '../src/lib/recommendations/examChecks.ts';
import { filterPrograms, isExcludedStatus, isGraduateLevel } from '../src/lib/recommendations/filterPrograms.ts';
import { loadOpportunities } from '../src/lib/recommendations/opportunities.ts';
import { classifyTuition } from '../src/lib/recommendations/tuition.ts';
import { withExamDefaults } from '../src/storage.ts';
import { validateRecsJson } from './recommendations/validateRecsJson.mjs';

const catalog = loadCatalog();

function makeProfile(overrides = {}) {
  return {
    classYear: '11',
    intakeYear: 2027,
    field: 'it',
    countryPreference: 'any',
    interests: [],
    gradeScale: 'five_point',
    gradeValue: 4.0,
    untStatus: 'not_taken',
    untScore: null,
    untSubjects: [],
    englishLevel: 'B1',
    ieltsStatus: 'not_taken',
    ieltsScore: null,
    satStatus: 'unsure',
    satTotal: null,
    satReadingWriting: null,
    satMath: null,
    satDate: null,
    toeflStatus: 'unsure',
    toeflType: 'ibt',
    toeflScale: 'ibt_120',
    toeflScore: null,
    toeflDate: null,
    languagePreference: 'any',
    tuitionBudgetKzt: 900_000,
    needsFinancialAid: false,
    ...overrides,
  };
}

test('каталог загружает 15 записей с уникальными id и 30 полями', () => {
  assert.equal(catalog.programs.length, 15);
  assert.equal(catalog.programCount, 15);
  const ids = catalog.programs.map((p) => p.id);
  assert.equal(new Set(ids).size, 15);
  for (const program of catalog.programs) {
    assert.equal(Object.keys(program).length, 30);
  }
});

test('записи со статусом «исключить» не попадают в активный подбор', () => {
  const result = filterPrograms(makeProfile({ field: 'it', countryPreference: 'any' }), catalog.programs);
  const excludedIds = result.excluded.map((row) => row.programId);
  assert.ok(excludedIds.includes(3));
  assert.ok(excludedIds.includes(5));
  assert.ok(excludedIds.includes(12));
  assert.ok(excludedIds.includes(13));
  for (const candidate of [...result.candidates, ...result.preview]) {
    assert.equal(isExcludedStatus(candidate.program.recordStatus), false);
  }
});

test('исключение идёт по статусу, а не по зашитому списку id', () => {
  const synthetic = [
    {
      ...catalog.programs[0],
      id: 99,
      field: 'IT',
      country: 'Казахстан',
      level: 'Бакалавриат',
      recordStatus: 'Исключить: тестовая запись',
      admissionYear: 2027,
      applicationDeadline: '2027-12-01',
    },
  ];
  const result = filterPrograms(makeProfile({ field: 'it' }), synthetic);
  assert.deepEqual(result.excluded.map((row) => row.programId), [99]);
  assert.equal(result.candidates.length, 0);
});

test('архивные записи не показываются как открытый набор', () => {
  const result = filterPrograms(makeProfile({ field: 'engineering', intakeYear: 2026 }), catalog.programs);
  assert.ok(result.archived.some((row) => row.programId === 1));
  assert.ok(!result.candidates.some((row) => row.programId === 1));
});

test('магистратура и PhD не входят в школьную выдачу', () => {
  const result = filterPrograms(makeProfile({ field: 'international_relations', countryPreference: 'any' }), catalog.programs);
  const ids = [...result.candidates, ...result.preview].map((row) => row.programId);
  assert.ok(!ids.includes(10));
  assert.ok(!ids.includes(11));
  assert.ok(result.graduateExcluded.some((row) => row.programId === 10));
  assert.ok(result.graduateExcluded.some((row) => row.programId === 11));
  assert.equal(isGraduateLevel('Магистратура (MA)'), true);
  assert.equal(isGraduateLevel('Докторантура (PhD)'), true);
});

test('дедлайн 2026 не переносится на выбранный 2027 год', () => {
  const asOf = new Date('2026-09-17T00:00:00Z');
  const result = filterPrograms(makeProfile({ field: 'international_relations', intakeYear: 2027, countryPreference: 'kz' }), catalog.programs, asOf);
  const kimep = [...result.candidates, ...result.preview].find((row) => row.programId === 2);
  assert.ok(kimep);
  assert.equal(kimep.eligibility, 'preview');
  assert.equal(kimep.yearNote, 'Условия выбранного года не подтверждены');
  assert.ok(!kimep.deadlineNote.includes('2027'));
});

test('прошедший срок помечается как прошедший, null — как нужно уточнить', () => {
  const asOf = new Date('2026-09-17T00:00:00Z');
  const result = filterPrograms(makeProfile({ field: 'it', intakeYear: 2026, countryPreference: 'kz' }), catalog.programs, asOf);
  const sdu = [...result.candidates, ...result.preview].find((row) => row.programId === 4);
  assert.ok(sdu);
  assert.match(sdu.deadlineNote, /Срок уже прошёл/);
  assert.equal(sdu.eligibility, 'preview');
  const kimep = filterPrograms(
    makeProfile({ field: 'international_relations', intakeYear: 2026, countryPreference: 'kz' }),
    catalog.programs,
    asOf,
  );
  const item = [...kimep.candidates, ...kimep.preview].find((row) => row.programId === 2);
  assert.ok(item);
  assert.equal(item.deadlineNote, 'Срок нужно уточнить');
});

test('null-стоимость не считается нулём и не сравнивается с бюджетом', () => {
  const result = filterPrograms(
    makeProfile({ field: 'it', intakeYear: 2026, countryPreference: 'kz', tuitionBudgetKzt: 1 }),
    catalog.programs,
    new Date('2026-01-01T00:00:00Z'),
  );
  const sdu = [...result.candidates, ...result.preview].find((row) => row.programId === 4);
  assert.ok(sdu);
  assert.equal(sdu.budgetComparable, false);
  assert.ok(sdu.uncertainties.some((item) => /не подтверждена|не значит «бесплатно»/i.test(item)));
});

test('цена за кредит не сравнивается с годовым бюджетом как годовая', () => {
  const kimep = catalog.programs.find((row) => row.id === 2);
  const tuition = classifyTuition(kimep);
  assert.equal(tuition.period, 'credit');
  assert.equal(tuition.comparableToYearlyKzt, false);
  const result = filterPrograms(
    makeProfile({ field: 'international_relations', intakeYear: 2026, countryPreference: 'kz', tuitionBudgetKzt: 1 }),
    catalog.programs,
    new Date('2026-01-01T00:00:00Z'),
  );
  const item = [...result.candidates, ...result.preview].find((row) => row.programId === 2);
  assert.ok(item);
  assert.equal(item.budgetComparable, false);
});

test('смена страны, бюджета и направления меняет выдачу', () => {
  const asOf = new Date('2026-01-01T00:00:00Z');
  const kzIt = filterPrograms(makeProfile({ field: 'it', countryPreference: 'kz', intakeYear: 2026 }), catalog.programs, asOf);
  const huBiz = filterPrograms(
    makeProfile({ field: 'business_management', countryPreference: 'hungary', intakeYear: 2027 }),
    catalog.programs,
    asOf,
  );
  const nlIt = filterPrograms(
    makeProfile({ field: 'it', countryPreference: 'netherlands', intakeYear: 2027 }),
    catalog.programs,
    asOf,
  );
  assert.ok([...kzIt.candidates, ...kzIt.preview].every((row) => /казахстан/i.test(row.program.country)));
  assert.ok([...huBiz.candidates, ...huBiz.preview].some((row) => row.programId === 7));
  assert.ok([...nlIt.candidates, ...nlIt.preview].some((row) => row.programId === 8 || row.programId === 14));
  assert.ok(![...kzIt.candidates, ...kzIt.preview].some((row) => row.programId === 7));
});

test('validateRecsJson принимает новую схему и отбрасывает чужие id', () => {
  const raw = JSON.stringify({
    profileSummary: 'Кратко',
    strengths: ['интерес к IT'],
    constraints: ['бюджет'],
    missingInformation: ['уточнить срок'],
    recommendations: [
      { programId: 8, whyItFits: ['IT'], preparationAdvice: ['IELTS'], questionsToClarify: ['календарь'] },
      { programId: 999, whyItFits: ['выдумано'], preparationAdvice: [], questionsToClarify: [] },
    ],
    nextAction: { title: 'Шаг', description: 'Описание', programId: 8 },
  });
  const checked = validateRecsJson(raw, [8, 14]);
  assert.equal(checked.ok, true);
  assert.equal(checked.value.recommendations.length, 1);
  assert.equal(checked.value.recommendations[0].programId, 8);
});

test('validateRecsJson отклоняет полностью выдуманные id', () => {
  const raw = JSON.stringify({
    profileSummary: 'x',
    strengths: [],
    constraints: [],
    missingInformation: [],
    recommendations: [{ programId: 12345, whyItFits: [], preparationAdvice: [], questionsToClarify: [] }],
    nextAction: { title: 'x', description: 'x', programId: null },
  });
  const checked = validateRecsJson(raw, [8, 14]);
  assert.equal(checked.ok, false);
});

test('fallback без Groq: filterPrograms не требует ключ', () => {
  const result = filterPrograms(makeProfile({ field: 'education_languages', intakeYear: 2026, countryPreference: 'kz' }), catalog.programs);
  assert.ok(result.candidates.length + result.preview.length >= 1);
  assert.ok([...result.candidates, ...result.preview].some((row) => row.programId === 15));
});

test('старый профиль без SAT/TOEFL открывается с неизвестными экзаменами', () => {
  const restored = withExamDefaults({
    classYear: '11',
    intakeYear: 2027,
    field: 'it',
    countryPreference: 'any',
    interests: [],
    gradeScale: 'five_point',
    gradeValue: 4,
    untStatus: 'not_taken',
    untScore: null,
    untSubjects: [],
    englishLevel: 'B1',
    ieltsStatus: 'not_taken',
    ieltsScore: null,
    languagePreference: 'any',
    tuitionBudgetKzt: 900000,
    needsFinancialAid: false,
  });
  assert.equal(restored.satStatus, 'unsure');
  assert.equal(restored.toeflStatus, 'unsure');
  assert.equal(restored.toeflType, 'ibt');
  assert.equal(restored.satTotal, null);
});

test('SAT у NU не становится обязательным для всех путей', () => {
  const nu = catalog.programs.find((row) => row.id === 1);
  const sat = checkSat(nu, makeProfile({ field: 'engineering', countryPreference: 'kz', satStatus: 'not_taken' }));
  assert.equal(sat.gaps.length, 0);
  assert.ok(sat.unknowns.length > 0);
  const result = filterPrograms(
    makeProfile({ field: 'engineering', countryPreference: 'kz', intakeYear: 2026, satStatus: 'not_taken' }),
    catalog.programs,
    new Date('2026-01-01T00:00:00Z'),
  );
  const item = [...result.candidates, ...result.preview].find((row) => row.programId === 1);
  assert.ok(item);
  assert.ok(!item.requirementsToComplete.some((gap) => /^нужен sat/i.test(gap)));
});

test('IELTS и TOEFL как альтернативы: достаточно одного результата', () => {
  const nu = catalog.programs.find((row) => row.id === 1);
  const withIelts = checkEnglishExams(nu, makeProfile({ ieltsStatus: 'taken', ieltsScore: 6.5 }));
  assert.ok(withIelts.why.some((item) => /ielts/i.test(item)));
  assert.ok(!withIelts.gaps.some((item) => /toefl/i.test(item)));
  const withToeflMismatch = checkEnglishExams(
    nu,
    makeProfile({ toeflStatus: 'taken', toeflType: 'ibt', toeflScale: 'ibt_16', toeflScore: 5 }),
  );
  assert.ok(withToeflMismatch.unknowns.some((item) => /уточнить соответствие/i.test(item)) || withToeflMismatch.gaps.length > 0);
});

test('статус соответствия считает код, а не вероятность', () => {
  const archived = filterPrograms(
    makeProfile({ field: 'it', countryPreference: 'kz', intakeYear: 2026 }),
    catalog.programs,
    new Date('2026-01-01T00:00:00Z'),
  );
  for (const item of [...archived.candidates, ...archived.preview]) {
    assert.ok(['suitable', 'preparation_needed', 'clarification_needed', 'not_suitable'].includes(item.suitability));
    assert.ok(item.statusWhy.length > 0);
  }
});

test('каталог opportunities пуст — выдуманных курсов нет', () => {
  assert.equal(loadOpportunities().length, 0);
  const actions = buildDevelopmentActions(makeProfile({ field: 'it', interests: ['данные', 'IT'] }), null);
  assert.ok(actions.every((action) => action.opportunityId == null));
  assert.ok(actions.some((action) => /академическому письму|проект по анализу данных/i.test(action.title)));
});
