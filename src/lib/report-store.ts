import * as SQLite from 'expo-sqlite';

import type { ReportDraft } from '@/lib/report';

type ReportRow = {
  id: string;
  customer_name: string;
  intervention_date: string;
  job_location: string;
  updated_at: string;
  data: string;
};

const databasePromise = SQLite.openDatabaseAsync('rapport-intervention.db');
let initPromise: Promise<void> | null = null;

export async function initReportStore() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await databasePromise;
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY NOT NULL,
          customer_name TEXT NOT NULL,
          intervention_date TEXT NOT NULL,
          job_location TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          data TEXT NOT NULL
        );
      `);
    })();
  }

  return initPromise;
}

export async function saveReportDraft(report: ReportDraft) {
  await initReportStore();
  const db = await databasePromise;

  await db.runAsync(
    `
      INSERT OR REPLACE INTO reports (
        id,
        customer_name,
        intervention_date,
        job_location,
        updated_at,
        data
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    report.id,
    report.customerName || 'Sans nom',
    report.interventionDate || '',
    report.jobLocation || '',
    report.updatedAt,
    JSON.stringify(report)
  );
}

export async function listReportDrafts() {
  await initReportStore();
  const db = await databasePromise;
  const rows = await db.getAllAsync<ReportRow>(
    `
      SELECT
        id,
        customer_name,
        intervention_date,
        job_location,
        updated_at,
        data
      FROM reports
      ORDER BY updated_at DESC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    interventionDate: row.intervention_date,
    jobLocation: row.job_location,
    updatedAt: row.updated_at,
  }));
}

export async function loadReportDraft(id: string) {
  await initReportStore();
  const db = await databasePromise;
  const row = await db.getFirstAsync<ReportRow>(
    `
      SELECT
        id,
        customer_name,
        intervention_date,
        job_location,
        updated_at,
        data
      FROM reports
      WHERE id = ?
    `,
    id
  );

  if (!row) {
    return null;
  }

  return JSON.parse(row.data) as ReportDraft;
}
