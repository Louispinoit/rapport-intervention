import * as DocumentPicker from 'expo-document-picker';

/** The browser has no share sheet for files: the backup is downloaded instead. */
export async function shareBackupFile(name: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return true;
}

export async function pickBackupText() {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  if (asset.file) {
    return asset.file.text();
  }

  return (await fetch(asset.uri)).text();
}
