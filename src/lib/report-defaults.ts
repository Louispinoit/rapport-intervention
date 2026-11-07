import type { ReportDraft } from '@/lib/report';

// Kept apart from report.ts so the stores can fill old reports in without
// importing report.ts, which itself imports the stores.

function todayAsFrenchDate() {
  return new Intl.DateTimeFormat('fr-FR').format(new Date());
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
    services: [],
    sootTypes: [],
    sootVolume: '',
    visibleDefects: [],
    advice: [],
    observations: '',
    signature: [],
    photos: [],
  };
}

/**
 * Reports saved by an older version of the app can lack fields added since
 * (e.g. the customer's name). Filling them from an empty report keeps old
 * data readable without a migration.
 */
export function normalizeReportDraft(stored: Partial<ReportDraft>): ReportDraft {
  return { ...createEmptyReport(), ...stored };
}
