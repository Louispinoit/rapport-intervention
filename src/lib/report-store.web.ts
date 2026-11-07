import type { ReportDraft, ReportSummary } from '@/lib/report';
import { normalizeReportDraft } from '@/lib/report-defaults';

const WEB_STORAGE_KEY = 'rapport-intervention-drafts';

function readWebDrafts() {
  const rawValue = localStorage.getItem(WEB_STORAGE_KEY);
  if (!rawValue) {
    return [] as ReportDraft[];
  }

  try {
    return (JSON.parse(rawValue) as Partial<ReportDraft>[]).map(normalizeReportDraft);
  } catch {
    return [] as ReportDraft[];
  }
}

function writeWebDrafts(drafts: ReportDraft[]) {
  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(drafts));
}

function summarize(report: ReportDraft): ReportSummary {
  return {
    id: report.id,
    interventionDate: report.interventionDate,
    customerLastName: report.customerLastName,
    customerFirstName: report.customerFirstName,
    customerAddress: report.customerAddress,
    customerPhone: report.customerPhone,
    updatedAt: report.updatedAt,
  };
}

export async function initReportStore() {
  return;
}

export async function getSetting(key: string) {
  return localStorage.getItem(`${WEB_STORAGE_KEY}-${key}`);
}

export async function setSetting(key: string, value: string | null) {
  const storageKey = `${WEB_STORAGE_KEY}-${key}`;

  if (value === null) {
    localStorage.removeItem(storageKey);
    return;
  }

  localStorage.setItem(storageKey, value);
}

// The Storage Access Framework is Android-only, so nothing is ever recorded here.
export async function recordSavedPdf(_uri: string) {
  return;
}

export async function listSavedPdfsWrittenBefore(_isoDate: string) {
  return [] as string[];
}

export async function forgetSavedPdf(_uri: string) {
  return;
}

export async function saveReportDraft(report: ReportDraft) {
  const drafts = readWebDrafts().filter((item) => item.id !== report.id);
  writeWebDrafts([report, ...drafts]);
}

export async function listReportDrafts() {
  return readWebDrafts()
    .map(summarize)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function deleteReportDraft(id: string) {
  writeWebDrafts(readWebDrafts().filter((item) => item.id !== id));
}

export async function listAllReportDrafts() {
  return readWebDrafts();
}

export async function loadReportDraft(id: string) {
  return readWebDrafts().find((item) => item.id === id) ?? null;
}
