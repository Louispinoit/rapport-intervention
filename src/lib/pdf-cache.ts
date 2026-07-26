import { Directory, File, Paths } from 'expo-file-system';
import { deleteAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { forgetSavedPdf, listSavedPdfsWrittenBefore } from '@/lib/report-store';

/** expo-print writes generated PDFs here — see FileUtils.generateFilePath in its Android source. */
const PRINT_DIRECTORY = 'Print';

/** Leaves a share target ample time to finish reading a file it was just handed. */
const MAX_AGE_MS = 60 * 60 * 1000;

/** How long a PDF stays in the user's own folder before it is cleaned up. */
const SAVED_PDF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Exported PDFs are derived data: `buildReportHtml` rebuilds any report from the
 * row kept in SQLite, so the generated files are worth nothing once shared and
 * only fill up the device.
 */
export function purgeGeneratedPdfs(now = Date.now()) {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const printDirectory = new Directory(Paths.cache, PRINT_DIRECTORY);

    if (!printDirectory.exists) {
      return;
    }

    for (const entry of printDirectory.list()) {
      if (!(entry instanceof File)) {
        continue;
      }

      const age = entry.modificationTime == null ? MAX_AGE_MS : now - entry.modificationTime;

      if (age >= MAX_AGE_MS) {
        entry.delete();
      }
    }
  } catch {
    // Best effort: cleaning the cache must never break an export.
  }
}

/**
 * Removes PDFs the app wrote into the user's folder once they have had their use.
 * They exist so the file can be picked in Abby's upload dialog, a job measured in
 * minutes — and every one of them is rebuildable from the report kept in SQLite.
 *
 * Only URIs this app recorded are touched, so a file the user put in that folder
 * himself is never a candidate.
 */
export async function purgeSavedPdfs(now = Date.now()) {
  if (Platform.OS !== 'android') {
    return;
  }

  const cutoff = new Date(now - SAVED_PDF_TTL_MS).toISOString();

  for (const uri of await listSavedPdfsWrittenBefore(cutoff)) {
    try {
      await deleteAsync(uri, { idempotent: true });
    } catch {
      // Already gone, moved, or the permission lapsed — drop the record either way.
    }

    await forgetSavedPdf(uri);
  }
}
