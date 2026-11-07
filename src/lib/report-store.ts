import * as SQLite from 'expo-sqlite';

import type { ReportDraft } from '@/lib/report';
import { deletePhotos } from '@/lib/photos';
import { normalizeReportDraft } from '@/lib/report-defaults';

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

  // One transaction: if the app is killed mid-way, nothing has moved, instead of
  // the old table being dropped before the copy is renamed into place.
  await db.execAsync(`
    BEGIN;
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
    COMMIT;
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
        CREATE TABLE IF NOT EXISTS saved_pdfs (
          uri TEXT PRIMARY KEY NOT NULL,
          written_at TEXT NOT NULL
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

/**
 * Every PDF the app writes into the user's own folder is recorded here, so the
 * cleanup can only ever remove files this app created — never something the user
 * put in that folder himself.
 */
export async function recordSavedPdf(uri: string) {
  await initReportStore();
  const db = await databasePromise;

  await db.runAsync(
    'INSERT OR REPLACE INTO saved_pdfs (uri, written_at) VALUES (?, ?)',
    uri,
    new Date().toISOString()
  );
}

export async function listSavedPdfsWrittenBefore(isoDate: string) {
  await initReportStore();
  const db = await databasePromise;
  const rows = await db.getAllAsync<{ uri: string }>(
    'SELECT uri FROM saved_pdfs WHERE written_at < ?',
    isoDate
  );

  return rows.map((row) => row.uri);
}

export async function forgetSavedPdf(uri: string) {
  await initReportStore();
  const db = await databasePromise;

  await db.runAsync('DELETE FROM saved_pdfs WHERE uri = ?', uri);
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

  // Summaries come from the stored JSON rather than from columns, so adding a
  // field to the list never means migrating the schema again.
  return rows.map((row) => {
    const report = JSON.parse(row.data) as Partial<ReportDraft>;

    return {
      id: row.id,
      interventionDate: row.intervention_date,
      customerLastName: report.customerLastName ?? '',
      customerFirstName: report.customerFirstName ?? '',
      customerAddress: report.customerAddress ?? '',
      customerPhone: report.customerPhone ?? '',
      updatedAt: row.updated_at,
    };
  });
}

export async function deleteReportDraft(id: string) {
  await initReportStore();
  const db = await databasePromise;
  const report = await loadReportDraft(id);

  await db.runAsync('DELETE FROM reports WHERE id = ?', id);
  // Photos are files of their own, so they go with the report.
  deletePhotos(report?.photos ?? []);
}

/** Every saved report in full, for backups and for finding orphaned photos. */
export async function listAllReportDrafts() {
  await initReportStore();
  const db = await databasePromise;
  const rows = await db.getAllAsync<ReportRow>(
    'SELECT id, intervention_date, updated_at, data FROM reports ORDER BY updated_at DESC'
  );

  return rows.map((row) => normalizeReportDraft(JSON.parse(row.data) as Partial<ReportDraft>));
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

  return normalizeReportDraft(JSON.parse(row.data) as Partial<ReportDraft>);
}
