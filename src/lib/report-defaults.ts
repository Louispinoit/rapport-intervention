import type { ChimneyEntry, ReportDraft } from '@/lib/report';

// Kept apart from report.ts so the stores can fill old reports in without
// importing report.ts, which itself imports the stores.

function todayAsFrenchDate() {
  return new Intl.DateTimeFormat('fr-FR').format(new Date());
}

let chimneyCounter = 0;

export function createEmptyChimney(): ChimneyEntry {
  chimneyCounter += 1;

  return {
    id: `chimney-${Date.now()}-${chimneyCounter}`,
    label: '',
    services: [],
    sootTypes: [],
    sootVolume: '',
    visibleDefects: [],
    advice: [],
    observations: '',
  };
}

export function createEmptyReport(): ReportDraft {
  const timestamp = new Date().toISOString();

  return {
    id: `report-${Date.now()}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    interventionDate: todayAsFrenchDate(),
    customerLastName: '',
    customerFirstName: '',
    customerAddress: '',
    customerPhone: '',
    chimneys: [createEmptyChimney()],
    signature: [],
    photos: [],
  };
}

/** The findings fields as reports stored them before a report could hold several flues. */
const LEGACY_FIELDS = [
  'services',
  'sootTypes',
  'sootVolume',
  'visibleDefects',
  'advice',
  'observations',
] as const;

type StoredReport = Partial<ReportDraft> & Partial<Omit<ChimneyEntry, 'id' | 'label'>>;

/**
 * Reports saved by an older version of the app can lack fields added since
 * (e.g. the customer's name), and keep their findings at the top level rather
 * than in `chimneys`. Both are filled in here, at read time, so old data stays
 * readable without a migration.
 */
export function normalizeReportDraft(stored: StoredReport): ReportDraft {
  const { chimneys, ...rest } = stored;
  const legacy: Partial<ChimneyEntry> = {};
  for (const field of LEGACY_FIELDS) {
    if (field in rest) {
      (legacy as Record<string, unknown>)[field] = rest[field];
      delete (rest as Record<string, unknown>)[field];
    }
  }

  const entries =
    Array.isArray(chimneys) && chimneys.length > 0
      ? chimneys
      : [{ ...legacy, id: `${stored.id ?? 'report'}-chimney-1` }];

  return {
    ...createEmptyReport(),
    ...(rest as Partial<ReportDraft>),
    chimneys: entries.map((entry) => ({ ...createEmptyChimney(), ...entry })),
  };
}
