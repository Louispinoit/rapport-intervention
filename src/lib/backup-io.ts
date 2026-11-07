import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Returns false when there is no share sheet to hand the file to. */
export async function shareBackupFile(name: string, contents: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(contents);

  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Sauvegarder les rapports',
    mimeType: 'application/json',
  });
  return true;
}

/** Null when the picker is closed without choosing a file. */
export async function pickBackupText() {
  // Android often labels .json files as a generic binary, so any file is offered
  // and the content is checked after reading.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return new File(result.assets[0].uri).text();
}
