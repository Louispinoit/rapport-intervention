import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/** expo-print writes generated PDFs here — see FileUtils.generateFilePath in its Android source. */
const PRINT_DIRECTORY = 'Print';

/** Leaves a share target ample time to finish reading a file it was just handed. */
const MAX_AGE_MS = 60 * 60 * 1000;

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
