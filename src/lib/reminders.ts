import {
  customerFullName,
  normalizeForSearch,
  reportDate,
  type ReportSummary,
} from '@/lib/report';
import { getSetting, setSetting } from '@/lib/report-store';

/**
 * Sweeping is due once a year, so a client whose last report is this old is
 * worth a call. Eleven months leaves time to book before the anniversary.
 */
const DUE_AFTER_MONTHS = 11;
const DISMISSED_KEY = 'reminders-dismissed';

export type DueClient = {
  key: string;
  name: string;
  lastDate: Date;
  /** The latest report, used to copy the client's details into a new one. */
  lastReportId: string;
  phone: string;
  address: string;
};

/** Same client = same name, ignoring case, accents and spacing. */
export function clientKey(report: Pick<ReportSummary, 'customerFirstName' | 'customerLastName'>) {
  return normalizeForSearch(customerFullName(report)).replace(/\s+/g, ' ');
}

type Dismissals = Record<string, string>;

async function readDismissals(): Promise<Dismissals> {
  try {
    return JSON.parse((await getSetting(DISMISSED_KEY)) ?? '{}') as Dismissals;
  } catch {
    return {};
  }
}

/** Hides a client until a newer report for them makes them due again. */
export async function dismissReminder(key: string) {
  const dismissals = await readDismissals();
  dismissals[key] = new Date().toISOString();
  await setSetting(DISMISSED_KEY, JSON.stringify(dismissals));
}

export async function listDueClients(reports: ReportSummary[], now = new Date()) {
  const dismissals = await readDismissals();
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - DUE_AFTER_MONTHS);

  const latest = new Map<string, { report: ReportSummary; date: Date }>();
  for (const report of reports) {
    const key = clientKey(report);
    // A report without a name can't be matched to anyone.
    if (!key) {
      continue;
    }
    const date = reportDate(report);
    const current = latest.get(key);
    if (!current || date > current.date) {
      latest.set(key, { report, date });
    }
  }

  const due: DueClient[] = [];
  for (const [key, { report, date }] of latest) {
    if (date > threshold) {
      continue;
    }
    const dismissedAt = dismissals[key] ? new Date(dismissals[key]) : null;
    if (dismissedAt && dismissedAt >= date) {
      continue;
    }
    due.push({
      key,
      name: customerFullName(report),
      lastDate: date,
      lastReportId: report.id,
      phone: report.customerPhone,
      address: report.customerAddress,
    });
  }

  // Longest overdue first: those are the calls to make before anything else.
  return due.sort((a, b) => a.lastDate.getTime() - b.lastDate.getTime());
}
