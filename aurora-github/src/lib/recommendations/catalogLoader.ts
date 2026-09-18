import catalogJson from '../../data/catalog.json' with { type: 'json' };
import { PROGRAM_FIELD_KEYS, type RawCatalog, type RawProgram } from '../../data/realCatalogTypes.ts';

export class CatalogLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogLoadError';
  }
}

function isNullOrFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function assertProgram(entry: unknown, index: number): RawProgram {
  if (!entry || typeof entry !== 'object') {
    throw new CatalogLoadError(`Запись каталога #${index} не является объектом.`);
  }
  const row = entry as Record<string, unknown>;
  for (const key of PROGRAM_FIELD_KEYS) {
    if (!(key in row)) {
      throw new CatalogLoadError(`У записи #${index} нет поля «${key}».`);
    }
  }
  if (typeof row.id !== 'number' || !Number.isInteger(row.id)) {
    throw new CatalogLoadError(`У записи #${index} некорректный id.`);
  }
  if (!isNullOrFiniteNumber(row.tuitionAmount)) {
    throw new CatalogLoadError(`У записи id ${row.id} tuitionAmount должен быть числом или null.`);
  }
  if (!isNullOrFiniteNumber(row.minimumEntScore)) {
    throw new CatalogLoadError(`У записи id ${row.id} minimumEntScore должен быть числом или null.`);
  }
  if (!isNullOrFiniteNumber(row.admissionYear)) {
    throw new CatalogLoadError(`У записи id ${row.id} admissionYear должен быть числом или null.`);
  }
  return row as RawProgram;
}

export function parseCatalog(raw: unknown): RawCatalog {
  if (!raw || typeof raw !== 'object') {
    throw new CatalogLoadError('Каталог пуст или повреждён.');
  }
  const data = raw as RawCatalog;
  if (!Array.isArray(data.programs)) {
    throw new CatalogLoadError('В каталоге нет массива programs.');
  }
  const programs = data.programs.map((program, index) => assertProgram(program, index));
  const ids = programs.map((program) => program.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new CatalogLoadError('В каталоге повторяются идентификаторы программ.');
  }
  if (typeof data.programCount === 'number' && data.programCount !== programs.length) {
    throw new CatalogLoadError(`programCount=${data.programCount}, фактически ${programs.length} записей.`);
  }
  return {
    schemaVersion: Number(data.schemaVersion) || 1,
    sourceFile: String(data.sourceFile || ''),
    programCount: programs.length,
    verificationNotice: String(data.verificationNotice || ''),
    fieldMapping: data.fieldMapping && typeof data.fieldMapping === 'object' ? data.fieldMapping : {},
    programs,
  };
}

let cached: RawCatalog | null = null;

export function loadCatalog(): RawCatalog {
  if (!cached) cached = parseCatalog(catalogJson);
  return cached;
}

export function loadPrograms(): RawProgram[] {
  return loadCatalog().programs;
}
