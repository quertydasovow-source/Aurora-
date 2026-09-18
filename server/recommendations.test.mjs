import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCatalog } from '../src/lib/recommendations/catalogLoader.ts';
import { buildDevelopmentActions } from '../src/lib/recommendations/developmentActions.ts';
import { checkEnglishExams, checkSat } from '../src/lib/recommendations/examChecks.ts';
import { filterPrograms, isExcludedStatus, isGraduateLevel } from '../src/lib/recommendations/filterPrograms.ts';
import { matchesSelectedDirection } from '../src/data/fieldMap.ts';
import { loadOpportunities } from '../src/lib/recommendations/opportunities.ts';
import { classifyTuition } from '../src/lib/recommendations/tuition.ts';
import { parseDecimalInput, parseIntegerInput, validateGPA, validateIELTS } from '../src/lib/numbers.ts';
import { fallbackProfileAdvice } from '../src/lib/recommendations/profileAdvice.ts';
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
  assert.equal(isGraduateLevel('Магистратура (MA)'), true);
  assert.equal(isGraduateLevel('Докторантура (PhD)'), true);
  assert.ok(catalog.programs.every((program) => !isGraduateLevel(program.level)));
  const synthetic = [
    {
      ...catalog.programs[0],
      id: 98,
      field: 'IT',
      country: 'Казахстан',
      level: 'Магистратура (MA)',
      recordStatus: 'Проверено',
      admissionYear: 2027,
    },
  ];
  const result = filterPrograms(makeProfile({ field: 'it' }), synthetic);
  assert.ok(result.graduateExcluded.some((row) => row.programId === 98));
  assert.ok(![...result.candidates, ...result.preview].some((row) => row.programId === 98));
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
  assert.ok(actions.some((action) => /проект по анализу данных/i.test(action.title)));
});

test('новые направления анкеты химия и психология берут записи из каталога', () => {
  const asOf = new Date('2026-01-01T00:00:00Z');
  const chem = filterPrograms(
    makeProfile({ field: 'natural_sciences', countryPreference: 'kz', intakeYear: 2026 }),
    catalog.programs,
    asOf,
  );
  assert.ok([...chem.candidates, ...chem.preview, ...chem.archived].some((row) => row.programId === 10));
  const psy = filterPrograms(
    makeProfile({ field: 'psychology', countryPreference: 'kz', intakeYear: 2027 }),
    catalog.programs,
    asOf,
  );
  assert.ok([...psy.candidates, ...psy.preview].some((row) => row.programId === 11));
});

test('направление химия не подтягивает бизнес, IT и психологию по интересам', () => {
  const result = filterPrograms(
    makeProfile({
      field: 'natural_sciences',
      countryPreference: 'any',
      intakeYear: 2027,
      interests: ['программирование', 'психология', 'менеджмент'],
      tuitionBudgetKzt: 900_000,
      needsFinancialAid: true,
    }),
    catalog.programs,
    new Date('2026-09-18T00:00:00Z'),
  );
  const shown = [...result.candidates, ...result.preview].map((row) => row.programId);
  assert.ok(!shown.includes(7));
  assert.ok(!shown.includes(8));
  assert.ok(!shown.includes(11));
  assert.ok(!shown.includes(14));
  assert.ok(!shown.includes(6));
  assert.ok(!shown.includes(9));
  assert.ok(!shown.includes(15));
  for (const item of [...result.candidates, ...result.preview]) {
    assert.equal(matchesSelectedDirection(item.program.field, 'natural_sciences'), 'primary');
    assert.ok(!/в анкете —/i.test(item.whyItFits.join(' ')));
  }
  assert.equal(result.candidates.length, 0);
});

test('таксономия направления: химия, психология, IT', () => {
  assert.equal(matchesSelectedDirection('Бизнес и менеджмент', 'natural_sciences'), 'none');
  assert.equal(matchesSelectedDirection('Естественные науки: химия', 'natural_sciences'), 'primary');
  assert.equal(matchesSelectedDirection('Химическая инженерия', 'natural_sciences'), 'related');
  assert.equal(matchesSelectedDirection('Социальные науки: психология', 'psychology'), 'primary');
  assert.equal(matchesSelectedDirection('IT и бизнес', 'it'), 'primary');
  assert.equal(matchesSelectedDirection('Социальные науки: психология', 'it'), 'none');
  assert.equal(matchesSelectedDirection('Бизнес и менеджмент', 'business_management'), 'primary');
  assert.equal(matchesSelectedDirection('IT и бизнес', 'business_management'), 'primary');
  assert.equal(matchesSelectedDirection('Международные отношения', 'international_relations'), 'primary');
  assert.equal(matchesSelectedDirection('IT', 'international_relations'), 'none');
});

test('2026 не попадает в confirmed при наборе 2027', () => {
  const result = filterPrograms(
    makeProfile({ field: 'natural_sciences', countryPreference: 'any', intakeYear: 2027 }),
    catalog.programs,
    new Date('2026-09-18T00:00:00Z'),
  );
  assert.ok(result.candidates.every((item) => item.program.admissionYear === 2027));
  const chem = result.preview.find((item) => item.programId === 10);
  assert.ok(chem);
  assert.equal(chem.eligibility, 'preview');
});

test('черновик с исключением скрыт из обычной выдачи', () => {
  const result = filterPrograms(
    makeProfile({ field: 'engineering', countryPreference: 'kz', intakeYear: 2027 }),
    catalog.programs,
  );
  const shown = [...result.candidates, ...result.preview, ...result.related].map((row) => row.programId);
  assert.ok(!shown.includes(13));
  assert.ok(result.excluded.some((row) => row.programId === 13));
});

test('средний балл и IELTS принимают десятичные и запятую', () => {
  assert.equal(parseDecimalInput('4,6').value, 4.6);
  assert.equal(parseDecimalInput('4.75').value, 4.75);
  assert.equal(parseDecimalInput('4.').status, 'incomplete');
  assert.equal(parseDecimalInput('7,5').value, 7.5);
  assert.equal(validateGPA(4.6, 'five_point'), null);
  assert.equal(validateGPA(4.75, 'five_point'), null);
  assert.equal(validateIELTS(7.5), null);
  assert.ok(validateIELTS(7.3));
  assert.ok(validateIELTS(10));
  assert.equal(parseIntegerInput('1350').value, 1350);
  assert.equal(parseIntegerInput('7,5').status, 'invalid');
});

test('2029 не превращает бизнес-программу 2027 в общее «нужно уточнить»', () => {
  const result = filterPrograms(
    makeProfile({ field: 'business_management', countryPreference: 'hungary', intakeYear: 2029 }),
    catalog.programs,
    new Date('2026-09-18T00:00:00Z'),
  );
  const pecs = [...result.candidates, ...result.preview].find((row) => row.programId === 7);
  assert.ok(pecs);
  assert.ok(result.candidates.some((row) => row.programId === 7));
  assert.equal(pecs.dataStatus, 'latest_known_conditions');
  assert.ok(['strong_match', 'match', 'possible_match'].includes(pecs.matchStatus));
  assert.ok(!/нужно уточнить условия/i.test(pecs.statusWhy));
  assert.match(pecs.deadlineNote, /ещё не опубликован/);
});

test('fallback советов различается для IT и химии', () => {
  const it = fallbackProfileAdvice(makeProfile({ field: 'it', interests: ['программирование'] }), null).suggestions;
  const chem = fallbackProfileAdvice(makeProfile({ field: 'natural_sciences', interests: ['химия'] }), null).suggestions;
  assert.ok(it.some((item) => /данн|программ|код|github|репозитор/i.test(`${item.title} ${item.reason}`)));
  assert.ok(chem.some((item) => /хим|лаборатор|опыт|стат/i.test(`${item.title} ${item.reason}`)));
  assert.ok(!it.every((item) => chem.some((other) => other.title === item.title)));
});

test('AI fallback: инженерия с сильным SAT/IELTS/TOEFL не советует английский', () => {
  const advice = fallbackProfileAdvice(
    makeProfile({
      field: 'engineering',
      interests: ['роботы'],
      satStatus: 'taken',
      satTotal: 1500,
      ieltsStatus: 'taken',
      ieltsScore: 7,
      toeflStatus: 'taken',
      toeflScore: 110,
      toeflScale: 'ibt_120',
    }),
  ).suggestions;
  const blob = advice.map((item) => `${item.title} ${item.reason} ${item.firstStep}`).join(' ');
  assert.ok(advice.length >= 2);
  assert.ok(/проект|портфолио|инженер/i.test(blob));
  assert.ok(!/улучш\w* английск|подтверд\w* английск|сда[йть] ielts|сда[йть] toefl/i.test(blob));
  assert.ok(!/готов\w* к sat|сда[йть] sat/i.test(blob));
});

test('AI fallback: бизнес, IT, химия и психология дают разные советы', () => {
  const business = fallbackProfileAdvice(makeProfile({ field: 'business_management', interests: ['startups', 'marketing'] })).suggestions;
  const it = fallbackProfileAdvice(makeProfile({ field: 'it', interests: ['programming', 'data'] })).suggestions;
  const chem = fallbackProfileAdvice(makeProfile({ field: 'natural_sciences', interests: ['chemistry'] })).suggestions;
  const psy = fallbackProfileAdvice(makeProfile({ field: 'psychology', interests: ['psychology'] })).suggestions;
  const titles = (list) => list.map((item) => item.title).join(' | ');
  assert.match(titles(business), /market|бизнес|клиент|case/i);
  assert.match(titles(it), /coding|github|данн|код|репозитор/i);
  assert.match(titles(chem), /эксперимент|данн|стат|научн/i);
  assert.match(titles(psy), /стат|этич|психолог|исследован/i);
  assert.notEqual(titles(business), titles(it));
  assert.notEqual(titles(it), titles(chem));
  assert.notEqual(titles(chem), titles(psy));
});

