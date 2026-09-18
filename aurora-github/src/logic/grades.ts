import type { GradeScale } from '../types';

/**
 * Явное правило сравнения разных шкал оценок.
 * Это внутреннее правило Aurora, а не официальная таблица перевода вузов.
 * В казахстанском поступлении на бакалавриат решающую роль обычно играет балл ЕНТ,
 * а средний балл аттестата используется как справочная информация.
 */
export const GRADE_RULE =
  'Сравнение оценок из разных шкал — внутреннее правило Aurora, не официальная таблица вузов.';

export function scaleBounds(scale: GradeScale): { min: number; max: number; step: number } {
  switch (scale) {
    case 'five_point':
      return { min: 2, max: 5, step: 0.1 };
    case 'twelve_point':
      return { min: 1, max: 12, step: 0.5 };
    case 'percent':
      return { min: 1, max: 100, step: 1 };
    case 'gpa4':
      return { min: 0, max: 4, step: 0.1 };
  }
}

/** Приводит оценку к условной шкале 0–100 по правилу Aurora. */
export function toInternalScore(scale: GradeScale, value: number): number {
  switch (scale) {
    case 'five_point':
      return ((value - 2) / 3) * 100;
    case 'twelve_point':
      return (value / 12) * 100;
    case 'percent':
      return value;
    case 'gpa4':
      return (value / 4) * 100;
  }
}
