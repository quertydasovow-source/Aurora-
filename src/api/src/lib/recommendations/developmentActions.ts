import type { DevelopmentAction, Field, PlanTask, Profile } from '../../types';
import type { RecommendationCandidate } from './filterPrograms.ts';

function effort(text: string): string {
  return `${text} Оценка Aurora.`;
}

export function buildDevelopmentActions(
  profile: Profile,
  candidate: RecommendationCandidate | null,
): DevelopmentAction[] {
  const actions: DevelopmentAction[] = [];
  const programId = candidate?.programId ?? null;
  const gaps = candidate?.requirementsToComplete ?? [];
  const field = profile.field;

  const needsIelts = gaps.some((item) => /ielts/i.test(item)) && profile.ieltsStatus !== 'taken';
  const needsToefl = gaps.some((item) => /toefl/i.test(item)) && profile.toeflStatus !== 'taken';
  const needsEnglish = needsIelts || needsToefl || (gaps.some((item) => /английск/i.test(item)) && profile.ieltsStatus !== 'taken' && profile.toeflStatus !== 'taken');
  const needsUnt = gaps.some((item) => /ент/i.test(item)) && profile.untStatus !== 'taken';
  const needsSat = gaps.some((item) => /\bsat\b/i.test(item)) && profile.satStatus !== 'taken';

  if (needsUnt) {
    actions.push({
      id: `gap-unt-${programId ?? 'any'}`,
      title: 'Подготовиться к ЕНТ по выбранному пути',
      reason: 'Для этой программы в каталоге есть ориентир по ЕНТ, а результата пока нет. Это задача подготовки, а не окончательный отказ.',
      firstStep: 'Уточни профильные предметы выбранного пути и собери пробный вариант за одну неделю.',
      expectedOutcome: 'Появится понятный план подготовки к ЕНТ, если этот путь тебе нужен.',
      suggestedEffort: effort('несколько часов в неделю до экзамена'),
      category: 'requirement',
      programId,
      opportunityId: null,
    });
  }

  if (needsEnglish) {
    actions.push({
      id: `gap-en-${programId ?? 'any'}`,
      title: needsIelts && needsToefl ? 'Подтвердить английский IELTS или TOEFL' : needsToefl ? 'Подготовиться к TOEFL iBT' : 'Подготовиться к IELTS',
      reason: 'Самооценка уровня английского не заменяет сертификат. Если IELTS и TOEFL — альтернативы, достаточно одного пути.',
      firstStep: 'Выбери один формат, который принимает программа, и запиши пробное эссе или speaking на этой неделе.',
      expectedOutcome: 'Появится сертификат по шкале, которую использует выбранный вуз.',
      suggestedEffort: effort('регулярные занятия до даты экзамена'),
      category: 'requirement',
      programId,
      opportunityId: null,
    });
  }

  if (needsSat) {
    actions.push({
      id: `gap-sat-${programId ?? 'any'}`,
      title: 'Разобрать, нужен ли SAT именно тебе',
      reason: 'SAT в каталоге может относиться к грантовому или иному отдельному пути, а не ко всем абитуриентам.',
      firstStep: 'Сверь в карточке программы, к какому пути относится SAT, и только затем планируй дату.',
      expectedOutcome: 'Понятно, обязателен ли SAT или это альтернатива.',
      suggestedEffort: effort('1–2 часа на разбор требований'),
      category: 'requirement',
      programId,
      opportunityId: null,
    });
  }

  actions.push(projectAction(field, profile, programId));
  if (profile.englishLevel === 'A2' || profile.englishLevel === 'B1' || profile.englishLevel === 'unsure') {
    const hasCert =
      (profile.ieltsStatus === 'taken' && profile.ieltsScore != null) ||
      (profile.toeflStatus === 'taken' && profile.toeflScore != null);
    if (!hasCert && !needsEnglish) {
      actions.push({
        id: `skill-english-${programId ?? 'any'}`,
        title: 'Подтянуть академический английский',
        reason: 'Это развитие навыка по твоей самооценке, а не замена IELTS или TOEFL.',
        firstStep: 'Прочитай один учебный текст по выбранному направлению и запиши 8–10 новых слов в контексте.',
        expectedOutcome: 'Будет проще готовиться к сертификату, если он понадобится выбранной программе.',
        suggestedEffort: effort('3–5 коротких занятий в неделю'),
        category: 'advice',
        programId,
        opportunityId: null,
      });
    }
  }

  return actions.slice(0, 4);
}

export function actionToPlanTask(action: DevelopmentAction): PlanTask {
  return {
    id: `extra-${action.id}`,
    programId: action.programId,
    title: action.title,
    category: action.category === 'requirement' ? 'exam' : 'academic',
    basis: action.category === 'requirement' ? 'requirement' : 'advice',
    source: null,
    note: `${action.reason} Первый шаг: ${action.firstStep}`,
    suggestedTiming: action.suggestedEffort,
    officialDeadline: null,
    removable: action.category === 'advice',
  };
}

function projectAction(field: Field, profile: Profile, programId: number | null): DevelopmentAction {
  const interests = profile.interests.join(', ');
  if (field === 'it' || field === 'business_management') {
    return {
      id: `project-data-${programId ?? 'any'}`,
      title: 'Сделай небольшой проект по анализу данных',
      reason: `Ты интересуешься ${interests || 'IT и бизнесом'}. Такой проект поможет попробовать работу с данными и понять, нравится ли тебе направление. Это не подтверждённое требование вуза и не гарантия поступления.`,
      firstStep: 'Выбери открытый набор из 20–50 строк и опиши 3 наблюдения в коротком отчёте.',
      expectedOutcome: 'Появится пример работы, который можно обсудить на консультации или в эссе.',
      suggestedEffort: effort('1–2 недели в спокойном темпе'),
      category: 'advice',
      programId,
      opportunityId: null,
    };
  }
  if (field === 'international_relations') {
    return {
      id: `project-ir-${programId ?? 'any'}`,
      title: 'Разбери одну международную новость по источникам',
      reason: 'Это тренировка навыка, связанного с выбранным направлением, а не обязательное условие приёма.',
      firstStep: 'Сравни два источника по одной теме и запиши, в чём они расходятся.',
      expectedOutcome: 'Появится короткий текст, который показывает интерес к международным отношениям.',
      suggestedEffort: effort('несколько вечеров'),
      category: 'advice',
      programId,
      opportunityId: null,
    };
  }
  if (field === 'education_languages') {
    return {
      id: `project-teach-${programId ?? 'any'}`,
      title: 'Проведи мини-урок или разбор текста на иностранном языке',
      reason: 'Практика связана с педагогикой и языками из анкеты. Вуз это как обязательное условие не подтверждал.',
      firstStep: 'Подготовь план на 15 минут: цель, задание, как проверишь понимание.',
      expectedOutcome: 'Поймёшь, интересна ли тебе преподавательская работа.',
      suggestedEffort: effort('одна неделя подготовки'),
      category: 'advice',
      programId,
      opportunityId: null,
    };
  }
  if (field === 'natural_sciences') {
    return {
      id: `project-chem-${programId ?? 'any'}`,
      title: 'Разбери один химический опыт или набор данных с лаборатории',
      reason: `Ты интересуешься ${interests || 'химией и естественными науками'}. Это проверка интереса, а не требование приёмной комиссии.`,
      firstStep: 'Опиши гипотезу, что измеряешь и какой вывод можно сделать за одну страницу.',
      expectedOutcome: 'Появится короткий пример научной работы для эссе или консультации.',
      suggestedEffort: effort('несколько вечеров'),
      category: 'advice',
      programId,
      opportunityId: null,
    };
  }
  if (field === 'psychology') {
    return {
      id: `project-psy-${programId ?? 'any'}`,
      title: 'Проведи мини-наблюдение или короткий опрос',
      reason: 'Это тренировка навыка, связанного с психологией из анкеты. Вуз такое как обязательное условие не подтверждал.',
      firstStep: 'Сформулируй один вопрос, собери 5–7 ответов знакомых и запиши, что заметил(а).',
      expectedOutcome: 'Поймёшь, интересна ли тебе исследовательская работа с людьми.',
      suggestedEffort: effort('3–5 дней в спокойном темпе'),
      category: 'advice',
      programId,
      opportunityId: null,
    };
  }
  return {
    id: `project-eng-${programId ?? 'any'}`,
    title: 'Собери мини-проект по выбранной инженерной теме',
    reason: 'Интерес к инженерии лучше проверять делом. Это совет Aurora, не требование приёмной комиссии.',
    firstStep: 'Опиши задачу, ограничение и один способ проверки за одну страницу.',
    expectedOutcome: 'Появится понятный пример интереса к направлению.',
    suggestedEffort: effort('1–2 недели'),
    category: 'advice',
    programId,
    opportunityId: null,
  };
}
