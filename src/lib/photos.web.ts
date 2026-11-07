import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// On web the photos live inside the report as data URIs: there is no app file
// system, and localStorage only holds text. They are kept small for that reason.
const MAX_SIDE = 1000;

export async function keepPhoto(_reportId: string, sourceUri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(sourceUri);
  if (width >= height) {
    context.resize({ width: Math.min(width || MAX_SIDE, MAX_SIDE) });
  } else {
    context.resize({ height: Math.min(height || MAX_SIDE, MAX_SIDE) });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });

  return `data:image/jpeg;base64,${saved.base64}`;
}

export function deletePhotos(_uris: string[]) {
  return;
}

export async function photoDataUri(uri: string) {
  return uri;
}

export function restorePhoto(_reportId: string, _index: number, dataUri: string) {
  return dataUri;
}

export function purgeOrphanPhotos(_referenced: Set<string>) {
  return;
}
