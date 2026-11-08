import { pickBackupText, shareBackupFile } from '@/lib/backup-io';
import { photoDataUri, restorePhoto } from '@/lib/photos';
import type { ReportDraft } from '@/lib/report';
import { normalizeReportDraft } from '@/lib/report-defaults';
import {
  getSetting,
  listAllReportDrafts,
  saveReportDraft,
  setSetting,
} from '@/lib/report-store';

const FORMAT = 'rapport-intervention-sauvegarde';
// 2: findings live per flue, in `chimneys`. Version 1 files are still read:
// normalizeReportDraft turns their flat findings into a single flue.
const VERSION = 2;
const LAST_BACKUP_KEY = 'last-backup-at';

type BackupFile = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  /** Photos travel inside the file as data URIs, so one file is the whole backup. */
  reports: ReportDraft[];
};

export async function getLastBackupDate() {
  const value = await getSetting(LAST_BACKUP_KEY);
  return value ? new Date(value) : null;
}

/**
 * Writes every report, photos included, into one file and hands it to the
 * share sheet, so Marc can send it to Drive or to himself by mail.
 */
export async function exportBackup() {
  const drafts = await listAllReportDrafts();
  const reports = await Promise.all(
    drafts.map(async (report) => ({
      ...report,
      photos: await Promise.all(
        report.photos.map((uri) => photoDataUri(uri).catch(() => null))
      ).then((photos) => photos.filter((photo): photo is string => photo !== null)),
    }))
  );

  const now = new Date();
  const file: BackupFile = { format: FORMAT, version: VERSION, exportedAt: now.toISOString(), reports };
  const stamp = now.toISOString().slice(0, 10);
  const shared = await shareBackupFile(`sauvegarde-rapports-${stamp}.json`, JSON.stringify(file));

  if (shared) {
    await setSetting(LAST_BACKUP_KEY, now.toISOString());
  }

  return { shared, count: reports.length };
}

export type RestoreResult =
  | { status: 'cancelled' }
  | { status: 'restored'; added: number; skipped: number };

/**
 * Adds the reports from a backup file. Reports already on the phone are kept
 * as they are, never overwritten, so restoring twice is harmless.
 */
export async function restoreBackup(): Promise<RestoreResult> {
  const text = await pickBackupText();
  if (text === null) {
    return { status: 'cancelled' };
  }

  let file: BackupFile;
  try {
    file = JSON.parse(text) as BackupFile;
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde de rapports.");
  }

  if (file?.format !== FORMAT || !Array.isArray(file.reports)) {
    throw new Error("Ce fichier n'est pas une sauvegarde de rapports.");
  }
  if (file.version > VERSION) {
    throw new Error("Cette sauvegarde vient d'une version plus récente de l'app. Mets l'app à jour d'abord.");
  }

  const existing = new Set((await listAllReportDrafts()).map((report) => report.id));
  let added = 0;
  let skipped = 0;

  for (const raw of file.reports) {
    const report = normalizeReportDraft(raw);
    if (!report.id || existing.has(report.id)) {
      skipped += 1;
      continue;
    }

    const photos = report.photos.map((dataUri, index) => restorePhoto(report.id, index, dataUri));
    await saveReportDraft({ ...report, photos });
    added += 1;
  }

  return { status: 'restored', added, skipped };
}
