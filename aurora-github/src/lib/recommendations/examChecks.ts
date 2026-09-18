import type { RawProgram } from '../../data/realCatalogTypes.ts';
import type { Profile } from '../../types';

export type ExamRole = 'required' | 'alternative' | 'advantage' | 'unknown' | 'none';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function ambiguous(text: string): boolean {
  return /противореч|конфликт|уточнить|не подтвержд/.test(normalize(text));
}

export function satMention(program: RawProgram): { role: ExamRole; note: string } {
  const blob = `${program.admissionPath}\n${program.otherRequirements}`;
  if (!/sat/i.test(blob)) return { role: 'none', note: '' };
  if (ambiguous(blob) || blob.length > 280) {
    return {
      role: 'unknown',
      note: 'SAT упомянут в каталоге среди нескольких путей. Это не единый обязательный список для всех абитуриентов.',
    };
  }
  if (/грант/i.test(blob) && /sat/i.test(blob)) {
    return { role: 'alternative', note: 'SAT относится к отдельному (в том числе грантовому) пути, а не ко всем способам поступления.' };
  }
  if (/альтернатив/i.test(blob)) {
    return { role: 'alternative', note: 'SAT указан как альтернативный путь поступления.' };
  }
  return { role: 'unknown', note: 'Роль SAT в каталоге указана неоднозначно.' };
}

function extractIelts(text: string): number | null {
  if (!text || ambiguous(text) || text.length > 180) return null;
  const match = text.match(/IELTS[^0-9]{0,8}(\d(?:[.,]\d)?)/i);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function extractToeflIbt120(text: string): number | null {
  if (!text || ambiguous(text)) return null;
  if (/TOEFL PBT/i.test(text) && !/TOEFL iBT/i.test(text)) return null;
  const match = text.match(/TOEFL iBT[^0-9]{0,20}(\d{2,3})/i);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 0 && value <= 120 ? value : null;
}

function extractToeflIbt16(text: string): number | null {
  if (!text || ambiguous(text)) return null;
  const match = text.match(/TOEFL[^.]{0,80}?(\d(?:[.,]\d)?)\s*по шкале 1/i);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return value >= 1 && value <= 6 ? value : null;
}

function extractToeflPbt(text: string): number | null {
  const match = text.match(/TOEFL PBT[^0-9]{0,8}(\d{3})/i);
  if (!match) return null;
  return Number(match[1]);
}

export function checkEnglishExams(
  program: RawProgram,
  profile: Profile,
): { why: string[]; gaps: string[]; unknowns: string[] } {
  const why: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  const req = program.englishRequirement || '';
  if (!req) {
    unknowns.push('Требование по английскому в каталоге не указано. Самооценка уровня сертификат не заменяет.');
    return { why, gaps, unknowns };
  }
  if (ambiguous(req)) {
    unknowns.push('Требования по английскому указаны неоднозначно. Порог из длинного текста автоматически не извлекали.');
    return { why, gaps, unknowns };
  }

  const ieltsMin = extractIelts(req);
  const toefl120 = extractToeflIbt120(req);
  const toefl16 = extractToeflIbt16(req);
  const toeflPbt = extractToeflPbt(req);
  const mentionsToefl = /toefl/i.test(req);
  const mentionsIelts = /ielts/i.test(req);
  const alternatives = /либо|или|альтернатив/i.test(req) && mentionsIelts && mentionsToefl;

  const ieltsOk =
    profile.ieltsStatus === 'taken' && typeof profile.ieltsScore === 'number' && ieltsMin != null && profile.ieltsScore >= ieltsMin;
  const toeflOk = toeflResultMeets(profile, { toefl120, toefl16, toeflPbt, mentionsToefl });

  if (toeflOk === 'scale_mismatch') {
    unknowns.push('Нужно уточнить соответствие результата TOEFL требованиям: в каталоге другая шкала, чем в анкете. Aurora шкалы не пересчитывает.');
  }

  if (alternatives) {
    if (ieltsOk || toeflOk === true) {
      why.push(ieltsOk ? 'IELTS закрывает языковое требование как один из допустимых путей.' : 'TOEFL закрывает языковое требование как альтернатива IELTS.');
      return { why, gaps, unknowns };
    }
    if (profile.ieltsStatus === 'taken' && ieltsMin != null && profile.ieltsScore != null && profile.ieltsScore < ieltsMin) {
      gaps.push(`Балл IELTS ниже известного ориентира (от ${ieltsMin}). Можно рассмотреть TOEFL, если это допустимая альтернатива.`);
      return { why, gaps, unknowns };
    }
    gaps.push('Нужно подтвердить английский одним из путей каталога: IELTS или TOEFL. Оба сразу не требуются.');
    return { why, gaps, unknowns };
  }

  if (ieltsMin != null) {
    if (ieltsOk) why.push(`Балл IELTS ${profile.ieltsScore} соответствует известному требованию (от ${ieltsMin}).`);
    else if (toeflOk === true && mentionsToefl) why.push('TOEFL указан рядом с IELTS — результат можно уточнить как возможную альтернативу.');
    else if (profile.ieltsStatus === 'taken' && profile.ieltsScore != null) {
      gaps.push(`Балл IELTS ниже известного требования: нужно от ${ieltsMin}, у тебя ${profile.ieltsScore}.`);
    } else {
      gaps.push(`Нужен IELTS не ниже ${ieltsMin}, если нет подтверждённой альтернативы. Самооценка уровня не заменяет сертификат.`);
    }
  } else if (mentionsIelts || mentionsToefl) {
    unknowns.push('Формулировка языкового требования неоднозначна. Числовой порог автоматически не извлекали.');
  }

  return { why, gaps, unknowns };
}

function toeflResultMeets(
  profile: Profile,
  opts: { toefl120: number | null; toefl16: number | null; toeflPbt: number | null; mentionsToefl: boolean },
): boolean | 'scale_mismatch' {
  if (profile.toeflStatus !== 'taken' || profile.toeflScore == null) return false;
  if (profile.toeflType !== 'ibt') {
    if (opts.toeflPbt != null && profile.toeflType === 'pbt') {
      return profile.toeflScore >= opts.toeflPbt;
    }
    if (opts.mentionsToefl) return 'scale_mismatch';
    return false;
  }
  if (profile.toeflScale === 'ibt_120' && opts.toefl120 != null) return profile.toeflScore >= opts.toefl120;
  if (profile.toeflScale === 'ibt_16' && opts.toefl16 != null) return profile.toeflScore >= opts.toefl16;
  if (opts.mentionsToefl && (opts.toefl120 != null || opts.toefl16 != null || opts.toeflPbt != null)) {
    return 'scale_mismatch';
  }
  return false;
}

export function checkSat(
  program: RawProgram,
  profile: Profile,
): { why: string[]; gaps: string[]; unknowns: string[] } {
  const why: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  const mention = satMention(program);
  if (mention.role === 'none') return { why, gaps, unknowns };
  if (mention.role === 'unknown' || mention.role === 'alternative') {
    if (profile.satStatus === 'taken' && profile.satTotal != null) {
      why.push(`У тебя есть результат SAT ${profile.satTotal}. Каталог упоминает SAT как отдельный путь, не как обязательный экзамен для всех.`);
    } else {
      unknowns.push(mention.note);
    }
    return { why, gaps, unknowns };
  }
  if (mention.role === 'required' && profile.satStatus !== 'taken') {
    gaps.push('Для этой записи SAT указан как требование выбранного пути.');
  }
  return { why, gaps, unknowns };
}
