import type { DevelopmentAction, Field, Profile } from '../../types';
import { countryPreferenceLabels, fieldLabels, languagePreferenceLabels, scaleLabels } from '../../data/labels.ts';

export const ADVICE_PROMPT_VERSION = 'aurora-advice-v2';

export type ProfileAdviceResult = {
  intro: string;
  suggestions: DevelopmentAction[];
};

export function adviceFingerprint(profile: Profile): string {
  return JSON.stringify({
    v: ADVICE_PROMPT_VERSION,
    grade: profile.classYear,
    field: profile.field,
    interests: profile.interests,
    gradeScale: profile.gradeScale,
    gradeValue: profile.gradeValue,
    intakeYear: profile.intakeYear,
    englishLevel: profile.englishLevel,
    ieltsStatus: profile.ieltsStatus,
    ieltsScore: profile.ieltsScore,
    toeflStatus: profile.toeflStatus,
    toeflScore: profile.toeflScore,
    satStatus: profile.satStatus,
    satTotal: profile.satTotal,
    untStatus: profile.untStatus,
    untScore: profile.untScore,
    budget: profile.tuitionBudgetKzt,
    country: profile.countryPreference,
    language: profile.languagePreference,
    aid: profile.needsFinancialAid,
  });
}

export function hasEnglishEvidence(profile: Profile): boolean {
  return (
    (profile.ieltsStatus === 'taken' && profile.ieltsScore != null) ||
    (profile.toeflStatus === 'taken' && profile.toeflScore != null)
  );
}

export function hasStrongEnglish(profile: Profile): boolean {
  const ielts = profile.ieltsStatus === 'taken' && profile.ieltsScore != null && profile.ieltsScore >= 6.5;
  const toefl120 = profile.toeflStatus === 'taken' && profile.toeflScale === 'ibt_120' && profile.toeflScore != null && profile.toeflScore >= 90;
  const toefl16 = profile.toeflStatus === 'taken' && profile.toeflScale === 'ibt_16' && profile.toeflScore != null && profile.toeflScore >= 5;
  return ielts || toefl120 || toefl16;
}

export function hasStrongSat(profile: Profile): boolean {
  return profile.satStatus === 'taken' && profile.satTotal != null && profile.satTotal >= 1400;
}

type AdviceProgram = {
  program: { program?: string; university?: string; field?: string } | null;
  requirementsToComplete: string[];
  whyItFits: string[];
};

type AdviceDiagnostics = {
  strengths?: string[];
  gaps?: string[];
  thingsToClarify?: string[];
};

export function toAdviceContext(profile: Profile, items: AdviceProgram[], diagnostics?: AdviceDiagnostics) {
  const gaps = (diagnostics?.gaps?.length ? diagnostics.gaps : items.flatMap((item) => item.requirementsToComplete)).slice(0, 8);
  const strengths = diagnostics?.strengths?.length ? diagnostics.strengths.slice(0, 8) : knownStrengths(profile);

  return {
    profile: {
      grade: profile.classYear,
      intakeYear: profile.intakeYear,
      direction: fieldLabels[profile.field],
      directionId: profile.field,
      interests: profile.interests,
      averageGrade: profile.gradeValue,
      gradeScale: profile.gradeScale,
      gradeScaleLabel: scaleLabels[profile.gradeScale],
      englishLevel: profile.englishLevel,
      sat: profile.satStatus === 'taken' ? profile.satTotal : profile.satStatus,
      ielts: profile.ieltsStatus === 'taken' ? profile.ieltsScore : profile.ieltsStatus,
      toefl: profile.toeflStatus === 'taken' ? profile.toeflScore : profile.toeflStatus,
      ent: profile.untStatus === 'taken' ? profile.untScore : profile.untStatus,
      englishEvidence: hasEnglishEvidence(profile),
      strongEnglish: hasStrongEnglish(profile),
      strongSat: hasStrongSat(profile),
      budget: profile.tuitionBudgetKzt,
      needsFinancialAid: profile.needsFinancialAid,
      country: countryPreferenceLabels[profile.countryPreference],
      language: languagePreferenceLabels[profile.languagePreference],
    },
    diagnostics: {
      strengths,
      gaps,
      thingsToClarify: (diagnostics?.thingsToClarify ?? []).slice(0, 8),
    },
    matchedPrograms: items.slice(0, 4).map((item) => ({
      university: item.program?.university || '',
      program: item.program?.program || '',
      direction: item.program?.field || '',
    })),
  };
}

export const ADVICE_SYSTEM_PROMPT = `Ты — Aurora Profile Coach.

Ты помогаешь школьнику улучшить профиль подготовки к университету.

Тебе передаётся структурированный профиль пользователя.

Твоя задача:
предложить 2–3 конкретных действия,
которые реально подходят именно этому пользователю.

Каждая рекомендация должна учитывать:
- направление;
- интересы;
- существующие достижения;
- экзамены;
- слабые места;
- время до поступления.

КРИТИЧЕСКИ ВАЖНО:

Не советуй улучшать то, что уже является сильной стороной.

Например:
если IELTS 7.5 и TOEFL 110,
не давай generic совет "улучши английский",
если нет отдельной причины.
Если SAT 1500, не советуй готовиться к SAT.

Каждый совет должен содержать:
- название;
- объяснение, почему он подходит именно этому человеку;
- первый шаг;
- ожидаемый результат;
- примерную нагрузку.

Если направление Engineering / Инженерия: проект, расчёт, техническое портфолио, практика.
Если направление Business: market research, customer research, business case, entrepreneurship.
Если направление IT: coding, data, product, GitHub/portfolio.
Если направление Chemistry / natural_sciences: research, experiment, data, scientific summary.
Если направление Psychology: academic reading, ethical mini-study, data. Не предлагай эксперименты на людях без согласия и этики.

Запрещено:
- гарантировать поступление;
- придумывать требования университетов;
- придумывать дедлайны;
- придумывать минимальные баллы;
- придумывать стипендии;
- придумывать конкретные существующие программы или курсы;
- выдавать рекомендацию Aurora за официальное требование университета.

Если фактов недостаточно,
формулируй совет как рекомендацию Aurora,
а не как требование приёмной комиссии.

Не называй конкретные курсы, платформы, хакатоны, олимпиады и конкурсы (Coursera, Kaggle, CS50 и т.п.).
Формулируй действие так, чтобы школьник мог сделать его сам, без выдуманной программы.

Верни только JSON по схеме. Без Markdown.`;

export const ADVICE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intro', 'recommendations'],
  properties: {
    intro: { type: 'string' },
    recommendations: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'why', 'firstStep', 'expectedResult', 'effort', 'category'],
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          firstStep: { type: 'string' },
          expectedResult: { type: 'string' },
          effort: { type: 'string' },
          category: { type: 'string' },
        },
      },
    },
  },
};

type AdviceJson = {
  intro?: string;
  summary?: string;
  recommendations?: Array<AdviceRow>;
  suggestions?: Array<AdviceRow>;
};

type AdviceRow = {
  title?: string;
  why?: string;
  firstStep?: string;
  expectedResult?: string;
  expectedOutcome?: string;
  effort?: string;
  estimatedEffort?: string;
  category?: string;
};

function looksInvented(text: string): boolean {
  return /harvard|cs50|coursera|udemy|edx|kaggle|drivendata|leetcode|codewars|олимпиад[аые] |science fair|требует университет|обязательн\w* требован|гарант\w* поступ|онлайн[-\s‑]*курс по |конкретн\w* курс/i.test(text);
}

function contradictsStrengths(text: string, profile: Profile): boolean {
  if (hasStrongEnglish(profile) && /улучш\w* английск|подтян\w* английск|подтверд\w* английск|сда[йть] ielts|сда[йть] toefl|нет сертификат/i.test(text)) {
    return true;
  }
  if (hasStrongSat(profile) && /готов\w* к sat|улучш\w* sat|сда[йть] sat|подними sat/i.test(text)) {
    return true;
  }
  return false;
}

function adviceId(title: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return `ai-advice-${index + 1}-${hash.toString(16)}`;
}

export function parseAdviceJson(raw: unknown, profile: Profile): ProfileAdviceResult | null {
  const data = raw as AdviceJson;
  if (!data || typeof data !== 'object') return null;
  const rows = Array.isArray(data.recommendations) ? data.recommendations : data.suggestions;
  if (!Array.isArray(rows)) return null;
  const actions: DevelopmentAction[] = [];
  for (const row of rows.slice(0, 3)) {
    const title = String(row?.title || '').trim();
    const why = String(row?.why || '').trim();
    const firstStep = String(row?.firstStep || '').trim();
    if (!title || !why || !firstStep) continue;
    const blob = `${title} ${why} ${firstStep}`;
    if (looksInvented(blob) || contradictsStrengths(blob, profile)) continue;
    if (profile.field === 'business_management' && /хим|лаборатор/i.test(blob) && !/бизнес|рынк|клиент/i.test(blob)) continue;
    if (profile.field === 'natural_sciences' && /маркетинг|стартап/i.test(blob) && !/данн|исслед|хим/i.test(blob)) continue;
    actions.push({
      id: adviceId(title, actions.length),
      title: title.slice(0, 140),
      reason: why.slice(0, 420),
      firstStep: firstStep.slice(0, 320),
      expectedOutcome: String(row?.expectedResult || row?.expectedOutcome || '').slice(0, 320),
      suggestedEffort: String(row?.effort || row?.estimatedEffort || '1–2 недели').slice(0, 80),
      category: 'advice',
      programId: null,
      opportunityId: null,
    });
  }
  if (actions.length < 2) return null;
  const intro = String(data.intro || data.summary || '').trim().slice(0, 320);
  return { intro, suggestions: actions };
}

function item(
  id: string,
  title: string,
  why: string,
  firstStep: string,
  expectedResult: string,
  effort: string,
): DevelopmentAction {
  return {
    id,
    title,
    reason: why,
    firstStep,
    expectedOutcome: expectedResult,
    suggestedEffort: effort,
    category: 'advice',
    programId: null,
    opportunityId: null,
  };
}

export function fallbackProfileAdvice(profile: Profile, _candidate?: unknown): ProfileAdviceResult {
  const direction = fieldLabels[profile.field];
  const interests = profile.interests.join(', ') || direction.toLowerCase();
  const englishNote = hasStrongEnglish(profile)
    ? 'английский уже подтверждён результатами'
    : hasEnglishEvidence(profile)
      ? 'есть сертификат английского'
      : `самооценка английского: ${profile.englishLevel}`;
  const satNote = hasStrongSat(profile) ? `SAT ${profile.satTotal} уже сильная сторона` : null;
  const aidNote = profile.needsFinancialAid ? 'в анкете указана потребность в финансовой помощи' : null;

  const byField: Record<Field, DevelopmentAction[]> = {
    engineering: [
      item(
        'ai-fallback-eng-project',
        'Собери небольшой инженерный проект',
        `Ты выбрал направление «${direction}», интересы: ${interests}. ${satNote || englishNote}, поэтому сейчас полезнее показать практику, а не повторять уже сильные экзамены.`,
        'Выбери простую техническую проблему и опиши прототип, расчёт или схему решения на одной странице.',
        'Небольшой проект, который можно добавить в портфолио и обсудить в эссе.',
        '1–2 недели',
      ),
      item(
        'ai-fallback-eng-portfolio',
        'Собери техническое портфолио достижений',
        `Для инженерии приёмным комиссиям обычно важнее увидеть, как ты применяешь знания. Это совет Aurora, не требование конкретного вуза.`,
        'Сложи 3–5 работ: школьный проект, расчёт, фото модели или краткое описание задачи и результата.',
        'Появится набор примеров, который можно использовать в заявке и консультации.',
        'несколько вечеров',
      ),
    ],
    it: [
      item(
        'ai-fallback-it-code',
        'Сделай небольшой coding-проект',
        `Ты выбрал IT и отметил интересы: ${interests}. Практический код показывает направление лучше, чем общий совет «учись программировать ещё больше в теории».`,
        'Выбери одну задачу на 20–50 строк: калькулятор, парсер таблицы или мини-дашборд, и сохрани описание + код.',
        'Появится пример работы, который можно положить в портфолио.',
        '1–2 недели',
      ),
      item(
        'ai-fallback-it-data',
        'Разбери небольшой набор данных',
        `Интерес к данным и IT лучше проверять делом: гипотеза, таблица, вывод. Это совет Aurora, не требование вуза.`,
        'Возьми открытую таблицу из 20–50 строк и запиши 3 наблюдения: что видно, чего не хватает, какой следующий вопрос.',
        'Короткий data-разбор для портфолио или эссе.',
        'несколько вечеров',
      ),
      item(
        'ai-fallback-it-github',
        'Оформи GitHub-портфолио с одним понятным репозиторием',
        `Для IT полезно уметь показать ход работы. Это рекомендация Aurora, а не официальное требование университета.`,
        'Создай репозиторий, добавь README: цель, как запустить, чему научился.',
        'Будет ссылка, которую можно вставить в эссе или обсудить на консультации.',
        '3–5 дней',
      ),
    ],
    business_management: [
      item(
        'ai-fallback-biz-market',
        'Сделай mini market research по одной идее',
        `Направление — бизнес, интересы: ${interests}. Здесь полезнее понять клиента и рынок, чем повторять экзамены без причины.`,
        'Выбери товар или сервис, опроси 5–7 знакомых и запиши 3 вывода: кто клиент, какая боль, почему купили бы или нет.',
        'Короткий разбор, который показывает интерес к entrepreneurship и customer research.',
        '1 неделя',
      ),
      item(
        'ai-fallback-biz-case',
        'Разбери простой business case',
        `Для бизнес-направления полезно тренировать аргументацию: проблема → вариант → рекомендация. Это совет Aurora, не условие приёма.`,
        'Возьми одну школьную или местную проблему и предложи решение с плюсами, минусами и следующим шагом.',
        'Появится текст, который можно использовать в мотивационном письме.',
        'несколько вечеров',
      ),
    ],
    natural_sciences: [
      item(
        'ai-fallback-chem-data',
        'Разбери один эксперимент или набор данных',
        `Ты выбрал химию и естественные науки, интересы: ${interests}. Сейчас сильнее выглядит умение анализировать опыт, а не generic советы из другой области.`,
        'Опиши гипотезу, что измерялось, какой вывод можно сделать, и где могла быть ошибка — на одной странице.',
        'Краткий научный разбор для эссе или консультации.',
        'несколько вечеров',
      ),
      item(
        'ai-fallback-chem-summary',
        'Напиши scientific summary одной статьи или опыта',
        `Для химии полезно показать, что ты умеешь читать и сжимать научный текст. Это рекомендация Aurora, не требование вуза.`,
        'Выбери один понятный материал и законспектируй: вопрос, метод, результат, что осталось неясным.',
        'Появится пример академического чтения по направлению.',
        '3–5 дней',
      ),
    ],
    psychology: [
      item(
        'ai-fallback-psy-read',
        'Разбери одну академическую статью по психологии',
        `Направление — психология, интересы: ${interests}. Полезно потренировать academic reading, а не выдумывать эксперименты на людях.`,
        'Прочитай короткий обзор или главу и выпиши вопрос исследования, выборку и ограничение выводов.',
        'Появится конспект, который показывает интерес к научной психологии.',
        'несколько вечеров',
      ),
      item(
        'ai-fallback-psy-ethics',
        'Спланируй ethical mini-study без вмешательства в людей',
        `Исследовательский интерес важен, но без согласия и этики нельзя ставить эксперименты на людях. Это совет Aurora.`,
        'Сформулируй один наблюдательный вопрос и способ собрать открытые данные или ответы знакомых с согласием.',
        'Понятный мини-дизайн, который можно описать в эссе.',
        '1 неделя',
      ),
    ],
    international_relations: [
      item(
        'ai-fallback-ir-sources',
        'Сравни два источника по одной международной теме',
        `Ты выбрал международные отношения. Навык работы с источниками здесь важнее generic языковых советов, если английский уже не главный пробел (${englishNote}).`,
        'Возьми одну новость и сопоставь, в чём источники согласны и где расходятся.',
        'Короткий аналитический текст для портфолио или эссе.',
        'несколько вечеров',
      ),
      item(
        'ai-fallback-ir-memo',
        'Напиши одностраничный policy memo',
        `Это тренировка навыка аргументации, а не официальное требование университета.`,
        'Сформулируй проблему, два варианта действий и свою рекомендацию с одним риском.',
        'Появится пример аналитической работы по направлению.',
        '3–5 дней',
      ),
    ],
    education_languages: [
      item(
        'ai-fallback-edu-lesson',
        'Собери план мини-урока на 15 минут',
        `Направление связано с педагогикой и языками, интересы: ${interests}. Практика преподавания здесь уместнее, чем советы из инженерии или бизнеса.`,
        'Опиши цель, одно задание и как проверишь понимание.',
        'Короткий план, который показывает интерес к преподаванию.',
        'одна неделя',
      ),
      item(
        'ai-fallback-edu-text',
        'Разбери учебный текст на иностранном языке',
        `Это развитие предметного навыка по анкете, не требование конкретного вуза.`,
        'Выбери абзац, выпиши 8–10 слов в контексте и придумай одно упражнение.',
        'Появится пример методической работы.',
        'несколько вечеров',
      ),
    ],
  };

  const suggestions = [...byField[profile.field]];
  if (aidNote && suggestions.length < 3) {
    suggestions.push(
      item(
        `ai-fallback-aid-${profile.field}`,
        'Собери список достижений для заявок на financial aid',
        `${aidNote}. Имеет смысл заранее описать достижения своими словами. Это не список реальных стипендий и не гарантия финансирования.`,
        'Запиши 5 фактов: учёба, проект, ответственность, язык, что умеешь объяснить на примере.',
        'Черновик, который потом можно использовать в эссе или форме помощи.',
        '2–4 часа',
      ),
    );
  }

  return {
    intro: `Ты готовишься к бакалавриату по направлению «${direction}». Ниже — действия Aurora, подобранные под твои ответы, а не официальные требования вузов.`,
    suggestions: suggestions.slice(0, 3),
  };
}

function knownStrengths(profile: Profile): string[] {
  const strengths: string[] = [];
  if (profile.ieltsStatus === 'taken' && profile.ieltsScore != null) strengths.push(`IELTS ${profile.ieltsScore}`);
  if (profile.toeflStatus === 'taken' && profile.toeflScore != null) strengths.push(`TOEFL ${profile.toeflScore}`);
  if (profile.satStatus === 'taken' && profile.satTotal != null) strengths.push(`SAT ${profile.satTotal}`);
  if (profile.untStatus === 'taken' && profile.untScore != null) strengths.push(`ЕНТ ${profile.untScore}`);
  strengths.push(`средний балл ${profile.gradeValue}`);
  return strengths;
}
