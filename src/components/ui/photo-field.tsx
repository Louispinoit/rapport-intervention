import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CloseIcon } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tickHaptic } from '@/lib/haptics';
import { deletePhotos, keepPhoto } from '@/lib/photos';
import { MAX_PHOTOS } from '@/lib/report';

type PhotoFieldProps = {
  reportId: string;
  photos: string[];
  onChange?: (photos: string[]) => void;
  readOnly?: boolean;
};

export function PhotoField({ reportId, photos, onChange, readOnly = false }: PhotoFieldProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  // Tiles are sized from the measured grid: Android doesn't resolve a % width
  // combined with aspectRatio inside a wrapping row, and drew them 0 px tall.
  const [gridWidth, setGridWidth] = useState(0);
  const tileWidth = gridWidth > 0 ? (gridWidth - GAP) / 2 : 0;
  const tileSize = { width: tileWidth, height: (tileWidth * 3) / 4 };
  const full = photos.length >= MAX_PHOTOS;

  async function add(source: 'camera' | 'library') {
    if (full || busy) {
      return;
    }

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Appareil photo refusé',
          "Autorise l'appareil photo pour cette app dans les réglages d'Android, ou choisis une photo dans la galerie."
        );
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      quality: 1,
      allowsMultipleSelection: source === 'library',
      selectionLimit: MAX_PHOTOS - photos.length,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setBusy(true);
    try {
      const kept: string[] = [];
      for (const asset of result.assets.slice(0, MAX_PHOTOS - photos.length)) {
        kept.push(await keepPhoto(reportId, asset.uri, asset.width, asset.height));
      }
      tickHaptic();
      onChange?.([...photos, ...kept]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Photo non ajoutée', message);
    } finally {
      setBusy(false);
    }
  }

  function remove(uri: string) {
    deletePhotos([uri]);
    onChange?.(photos.filter((photo) => photo !== uri));
  }

  if (readOnly && photos.length === 0) {
    return (
      <ThemedText style={[styles.empty, { color: theme.textTertiary }]}>Aucune photo</ThemedText>
    );
  }

  return (
    <View style={styles.field}>
      {photos.length > 0 || busy ? (
        <View onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)} style={styles.grid}>
          {photos.map((uri, index) => (
            <View
              key={uri}
              style={[
                styles.thumb,
                tileSize,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.line },
              ]}>
              <Image
                accessibilityLabel={`Photo ${index + 1}`}
                contentFit="cover"
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                transition={150}
              />
              {readOnly ? null : (
                <Pressable
                  accessibilityLabel={`Retirer la photo ${index + 1}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => remove(uri)}
                  style={[styles.remove, { backgroundColor: 'rgba(28, 20, 19, 0.72)' }]}>
                  <CloseIcon color="#FFF9F6" size={14} />
                </Pressable>
              )}
            </View>
          ))}
          {busy ? (
            <View
              style={[
                styles.thumb,
                styles.pending,
                tileSize,
                { backgroundColor: theme.backgroundSelected, borderColor: theme.line },
              ]}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : null}
        </View>
      ) : null}

      {readOnly ? null : full ? (
        <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
          {MAX_PHOTOS} photos au maximum par rapport.
        </ThemedText>
      ) : (
        <View style={styles.actions}>
          <PrimaryButton
            disabled={busy}
            onPress={() => add('camera')}
            style={styles.action}
            title="Prendre une photo"
            variant="secondary"
          />
          <PrimaryButton
            disabled={busy}
            onPress={() => add('library')}
            style={styles.libraryAction}
            title="Galerie"
            variant="secondary"
          />
        </View>
      )}
    </View>
  );
}

const GAP = 10;

const styles = StyleSheet.create({
  field: {
    gap: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  thumb: {
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pending: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
  libraryAction: {
    paddingHorizontal: 22,
  },
  hint: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: Spacing.one,
  },
});
