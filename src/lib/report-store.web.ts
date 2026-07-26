import type { ReportDraft, ReportSummary } from '@/lib/report';

const WEB_STORAGE_KEY = 'rapport-intervention-drafts';

function readWebDrafts() {
  const rawValue = localStorage.getItem(WEB_STORAGE_KEY);
  if (!rawValue) {
    return [] as ReportDraft[];
  }

  try {
    return JSON.parse(rawValue) as ReportDraft[];
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

export async function saveReportDraft(report: ReportDraft) {
  const drafts = readWebDrafts().filter((item) => item.id !== report.id);
  writeWebDrafts([report, ...drafts]);
}

export async function listReportDrafts() {
  return readWebDrafts()
    .map(summarize)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function loadReportDraft(id: string) {
  return readWebDrafts().find((item) => item.id === id) ?? null;
}
