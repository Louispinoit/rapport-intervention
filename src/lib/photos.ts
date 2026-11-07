import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Photos are resized before they are kept: a phone camera shot is several MB,
 * and every photo is embedded in the PDF and in backups. 1600 px on the long
 * side stays sharp on an A4 page at a few hundred KB.
 */
const MAX_SIDE = 1600;
const QUALITY = 0.7;

function photoDirectory() {
  const directory = new Directory(Paths.document, 'photos');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

async function resize(sourceUri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(sourceUri);
  if (width >= height) {
    context.resize({ width: Math.min(width || MAX_SIDE, MAX_SIDE) });
  } else {
    context.resize({ height: Math.min(height || MAX_SIDE, MAX_SIDE) });
  }
  const rendered = await context.renderAsync();
  return rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY });
}

/**
 * Resizes a picked or captured photo and moves it out of the cache, which
 * Android may clear at any time, into the app's own documents.
 */
export async function keepPhoto(reportId: string, sourceUri: string, width: number, height: number) {
  const resized = await resize(sourceUri, width, height);
  const destination = new File(photoDirectory(), `${reportId}-${Date.now()}.jpg`);
  new File(resized.uri).copy(destination);

  return destination.uri;
}

export function deletePhotos(uris: string[]) {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Already gone: nothing to clean up.
    }
  }
}

/** For the PDF and backups: the print WebView can't read app files, data URIs it can. */
export async function photoDataUri(uri: string) {
  const base64 = await new File(uri).base64();
  return `data:image/jpeg;base64,${base64}`;
}

/** Writes a photo carried in a backup back to disk. */
export function restorePhoto(reportId: string, index: number, dataUri: string) {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
  const destination = new File(photoDirectory(), `${reportId}-restored-${index}.jpg`);
  destination.create({ overwrite: true });
  destination.write(base64ToBytes(base64));

  return destination.uri;
}

function fileName(uri: string) {
  return decodeURIComponent(uri.split('/').pop() ?? uri);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Photos taken for a report that was then abandoned are never referenced.
 * Clears them at launch so they don't pile up on the phone.
 */
export function purgeOrphanPhotos(referenced: Set<string>) {
  // Compared by file name, which is unique per photo: URIs of the same file can
  // differ in form (slashes, encoding), and a mismatch here would delete photos
  // of saved reports.
  const keep = new Set([...referenced].map(fileName));
  try {
    for (const entry of photoDirectory().list()) {
      if (entry instanceof File && !keep.has(fileName(entry.uri))) {
        entry.delete();
      }
    }
  } catch {
    // Best effort: a failed cleanup must never block the app.
  }
}
