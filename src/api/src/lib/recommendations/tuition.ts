import type { RawProgram } from '../../data/realCatalogTypes.ts';
import type { Profile } from '../../types';

export type TuitionPeriod = 'year' | 'credit' | 'program' | 'semester' | 'unknown';
export type TuitionCurrency = 'KZT' | 'USD' | 'EUR' | 'GBP' | 'unknown';

export type TuitionInfo = {
  amountKnown: boolean;
  amount: number | null;
  period: TuitionPeriod;
  currency: TuitionCurrency;
  comparableToYearlyKzt: boolean;
  display: string;
};

const PERIOD_LABEL: Record<TuitionPeriod, string> = {
  year: 'учебный год',
  credit: 'кредит',
  program: 'вся программа',
  semester: 'семестр',
  unknown: 'период не подтверждён',
};

export function classifyTuition(program: RawProgram): TuitionInfo {
  const basis = (program.tuitionBasis || '').toLowerCase();
  const amountKnown = typeof program.tuitionAmount === 'number' && Number.isFinite(program.tuitionAmount);
  const amount = amountKnown ? (program.tuitionAmount as number) : null;

  let period: TuitionPeriod = 'unknown';
  if (/кредит/.test(basis)) period = 'credit';
  else if (/семестр/.test(basis)) period = 'semester';
  else if (/всей программ|вся однолетн|вся программа/.test(basis)) period = 'program';
  else if (/учебный год/.test(basis) || (/(^|[^\w])год/.test(basis) && !/не год/.test(basis))) period = 'year';

  let currency: TuitionCurrency = 'unknown';
  if (/kzt|тенге|₸/.test(basis)) currency = 'KZT';
  else if (/\busd\b|\$/.test(basis)) currency = 'USD';
  else if (/\beur\b|€/.test(basis)) currency = 'EUR';
  else if (/\bgbp\b|£/.test(basis)) currency = 'GBP';

  const comparableToYearlyKzt = amountKnown && period === 'year' && currency === 'KZT';

  let display: string;
  if (!amountKnown) {
    display = `Тариф неизвестен (${program.tuitionBasis || 'период и валюта не указаны'}). Null не означает нулевую цену.`;
  } else {
    const number = amount!.toLocaleString('ru-RU');
    const currencyLabel = currency === 'unknown' ? '' : ` ${currency}`;
    display = `${number}${currencyLabel} за ${PERIOD_LABEL[period]}. ${program.tuitionBasis}`;
  }

  return { amountKnown, amount, period, currency, comparableToYearlyKzt, display };
}

export type BudgetStatus = 'within_budget' | 'over_budget' | 'unknown' | 'potentially_affordable_with_aid';

export function hasConfirmedAid(program: RawProgram): boolean {
  const text = `${program.financialAid || ''} ${program.scholarshipDeadline || ''}`;
  if (!text.trim()) return false;
  if (/не подтвержд|уточнить|не переносить|для нового набора не|подходящая стипендия бакалавриата не/i.test(text)) {
    return false;
  }
  return /грант|стипенд|скидк|финанс/i.test(text);
}

export function checkBudget(program: RawProgram, profile: Profile): {
  comparable: boolean;
  withinBudget: boolean | null;
  status: BudgetStatus;
  note: string;
} {
  const tuition = classifyTuition(program);
  if (!tuition.amountKnown) {
    return {
      comparable: false,
      withinBudget: null,
      status: 'unknown',
      note: 'Стоимость программы пока не подтверждена — это не значит «бесплатно».',
    };
  }
  if (!tuition.comparableToYearlyKzt) {
    return {
      comparable: false,
      withinBudget: null,
      status: 'unknown',
      note: 'Нужно уточнить соответствие бюджету: валюта или период тарифа несопоставимы с годовым бюджетом в тенге. Курс не применялся.',
    };
  }
  const amount = tuition.amount as number;
  const within = amount <= profile.tuitionBudgetKzt;
  if (within) {
    return {
      comparable: true,
      withinBudget: true,
      status: 'within_budget',
      note: `Стоимость ${amount.toLocaleString('ru-RU')} ₸ за учебный год в пределах твоего бюджета.`,
    };
  }
  if (profile.needsFinancialAid && hasConfirmedAid(program)) {
    return {
      comparable: true,
      withinBudget: false,
      status: 'potentially_affordable_with_aid',
      note: `Стоимость ${amount.toLocaleString('ru-RU')} ₸ выше бюджета. Потребуется подтверждённое финансирование — стипендию нельзя вычитать заранее.`,
    };
  }
  return {
    comparable: true,
    withinBudget: false,
    status: 'over_budget',
    note: `Стоимость ${amount.toLocaleString('ru-RU')} ₸ за учебный год выше указанного бюджета.`,
  };
}
