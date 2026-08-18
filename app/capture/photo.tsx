import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, CameraFrame, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { api } from '../../src/api/client';

const hints = [
  'Ganze Tabelle inklusive Kopfzeile erfassen',
  'Gerade halten, Reflexionen vermeiden',
  'Angaben pro 100 g bevorzugen',
];

export default function PhotoScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);

  async function shoot() {
    if (!cam.current) return;
    setBusy(true);
    try {
      const shot = await cam.current.takePictureAsync({ quality: 1 });
      if (!shot) return;
      const small = await ImageManipulator.manipulateAsync(shot.uri, [{ resize: { width: 2000 } }], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const form = new FormData();
      form.append('file', { uri: small.uri, name: 'table.jpg', type: 'image/jpeg' } as unknown as Blob);
      if (params.barcode) form.append('barcode', params.barcode);
      const job = await api<{ photoId: string }>('/catalog/photos', { method: 'POST', formData: form });
      router.replace({ pathname: '/capture/processing', params: { ...params, photoId: job.photoId } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll={false}>
      <Text style={[t.font.title, { color: t.color.text }]}>Nährwerttabelle</Text>
      <CameraFrame height={360} style={{ marginTop: t.space[4] }}>
        {permission?.granted ? <CameraView ref={cam} style={{ flex: 1 }} /> : null}
      </CameraFrame>
      {params.notice ? (
        <Text style={[t.font.body, { color: t.color.accent, marginTop: t.space[4] }]}>{params.notice}</Text>
      ) : null}
      <View style={{ gap: t.space[2], marginTop: t.space[6] }}>
        {hints.map((h) => (
          <Text key={h} style={[t.font.micro, { color: t.color.textMuted }]}>
            {h}
          </Text>
        ))}
      </View>
      <View style={{ marginTop: t.space[8] }}>
        {permission?.granted ? (
          <OutlineButton label={busy ? 'Wird gesendet …' : 'Foto aufnehmen'} onPress={shoot} disabled={busy} />
        ) : (
          <OutlineButton label="Kamera freigeben" onPress={requestPermission} />
        )}
      </View>
    </Screen>
  );
}
