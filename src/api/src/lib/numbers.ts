import { scaleBounds } from '../logic/grades.ts';
import type { GradeScale } from '../types';

export type ParseStatus = 'empty' | 'incomplete' | 'invalid' | 'ok';

export type ParseResult = {
  status: ParseStatus;
  value: number | null;
};

function normalizeDecimalText(raw: string): string {
  return String(raw ?? '').trim().replace(/\s/g, '').replace(',', '.');
}

export function parseDecimalInput(raw: string): ParseResult {
  const text = normalizeDecimalText(raw);
  if (text === '') return { status: 'empty', value: null };
  if (text === '-' || text === '.' || text === '-.') return { status: 'incomplete', value: null };
  if (/^-?\d+\.$/.test(text)) return { status: 'incomplete', value: null };
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { status: 'invalid', value: null };
  const value = Number(text);
  if (!Number.isFinite(value)) return { status: 'invalid', value: null };
  return { status: 'ok', value };
}

export function parseIntegerInput(raw: string): ParseResult {
  const original = String(raw ?? '').trim().replace(/\s/g, '');
  if (original === '') return { status: 'empty', value: null };
  if (original === '-') return { status: 'incomplete', value: null };
  const text = original.replace(',', '.');
  if (text.includes('.')) return { status: 'invalid', value: null };
  if (!/^-?\d+$/.test(text)) return { status: 'invalid', value: null };
  const value = Number(text);
  if (!Number.isInteger(value)) return { status: 'invalid', value: null };
  return { status: 'ok', value };
}

export function validateGPA(value: number, scale: GradeScale): string | null {
  if (!Number.isFinite(value)) return 'Укажи средний балл.';
  const bounds = scaleBounds(scale);
  if (value < bounds.min || value > bounds.max) {
    return `Для этой шкалы допустимо ${bounds.min}–${bounds.max}.`;
  }
  return null;
}

export function validateIELTS(value: number): string | null {
  if (!Number.isFinite(value)) return 'Укажи балл IELTS.';
  if (value < 0 || value > 9) return 'IELTS бывает от 0 до 9.';
  const halfSteps = value * 2;
  if (Math.abs(halfSteps - Math.round(halfSteps)) > 1e-6) {
    return 'IELTS идёт с шагом 0.5: 6, 6.5, 7, 7.5.';
  }
  return null;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}
