// Типы для каталога Aurora (src/data/catalog.json).
// 30 полей записи совпадают с fieldMapping в JSON — переименовывать вручную не нужно.

export const PROGRAM_FIELD_KEYS = [
  'id',
  'university',
  'program',
  'field',
  'country',
  'city',
  'level',
  'language',
  'duration',
  'curriculumSummary',
  'admissionYear',
  'tuitionAmount',
  'tuitionBasis',
  'admissionPath',
  'entSubjects',
  'minimumEntScore',
  'englishRequirement',
  'otherRequirements',
  'documents',
  'applicationDeadline',
  'financialAid',
  'scholarshipDeadline',
  'programUrl',
  'requirementsUrl',
  'tuitionUrl',
  'scholarshipUrl',
  'verifiedAt',
  'unknowns',
  'verificationMethod',
  'recordStatus',
] as const;

export type ProgramFieldKey = (typeof PROGRAM_FIELD_KEYS)[number];

export type RawProgram = {
  id: number;
  university: string;
  program: string;
  field: string;
  country: string;
  city: string;
  level: string;
  language: string;
  duration: string;
  curriculumSummary: string;
  /** null — год набора в источнике не указан. */
  admissionYear: number | null;
  /** null — стоимость не подтверждена. Никогда не считать null нулём. */
  tuitionAmount: number | null;
  tuitionBasis: string;
  admissionPath: string;
  entSubjects: string;
  /** null — порог ЕНТ не подтверждён источником. */
  minimumEntScore: number | null;
  englishRequirement: string;
  otherRequirements: string;
  documents: string;
  applicationDeadline: string | null;
  financialAid: string;
  scholarshipDeadline: string | null;
  programUrl: string;
  requirementsUrl: string;
  tuitionUrl: string;
  scholarshipUrl: string;
  verifiedAt: string;
  unknowns: string;
  verificationMethod: string;
  recordStatus: string;
};

export type RawCatalog = {
  schemaVersion: number;
  sourceFile: string;
  programCount: number;
  verificationNotice: string;
  fieldMapping: Record<string, string>;
  programs: RawProgram[];
};
