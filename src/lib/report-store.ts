import * as SQLite from 'expo-sqlite';

import type { ReportDraft } from '@/lib/report';

type ReportRow = {
  id: string;
  intervention_date: string;
  updated_at: string;
  data: string;
};

const databasePromise = SQLite.openDatabaseAsync('rapport-intervention.db');
let initPromise: Promise<void> | null = null;

/**
 * Earlier versions carried customer_name and job_location columns. They are gone
 * now that the client is identified by the Abby invoice, so existing rows are
 * copied across rather than dropped.
 */
async function dropLegacyCustomerColumns(db: SQLite.SQLiteDatabase) {
  const table = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reports'"
  );

  if (!table) {
    return;
  }

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(reports)');

  if (!columns.some((column) => column.name === 'customer_name')) {
    return;
  }

  await db.execAsync(`
    CREATE TABLE reports_next (
      id TEXT PRIMARY KEY NOT NULL,
      intervention_date TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    INSERT INTO reports_next (id, intervention_date, updated_at, data)
      SELECT id, intervention_date, updated_at, data FROM reports;
    DROP TABLE reports;
    ALTER TABLE reports_next RENAME TO reports;
  `);
}

export async function initReportStore() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await databasePromise;
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await dropLegacyCustomerColumns(db);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY NOT NULL,
          intervention_date TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
    })();
  }

  return initPromise;
}

export async function getSetting(key: string) {
  await initReportStore();
  const db = await databasePromise;
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );

  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null) {
  await initReportStore();
  const db = await databasePromise;

  if (value === null) {
    await db.runAsync('DELETE FROM settings WHERE key = ?', key);
    return;
  }

  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

export async function saveReportDraft(report: ReportDraft) {
  await initReportStore();
  const db = await databasePromise;

  await db.runAsync(
    `
      INSERT OR REPLACE INTO reports (
        id,
        intervention_date,
        updated_at,
        data
      ) VALUES (?, ?, ?, ?)
    `,
    report.id,
    report.interventionDate || '',
    report.updatedAt,
    JSON.stringify(report)
  );
}

export async function listReportDrafts() {
  await initReportStore();
  const db = await databasePromise;
  const rows = await db.getAllAsync<ReportRow>(
    `
      SELECT id, intervention_date, updated_at, data
      FROM reports
      ORDER BY updated_at DESC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    interventionDate: row.intervention_date,
    updatedAt: row.updated_at,
  }));
}

export async function loadReportDraft(id: string) {
  await initReportStore();
  const db = await databasePromise;
  const row = await db.getFirstAsync<ReportRow>(
    'SELECT id, intervention_date, updated_at, data FROM reports WHERE id = ?',
    id
  );

  if (!row) {
    return null;
  }

  return JSON.parse(row.data) as ReportDraft;
}
