import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, CameraFrame, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { uploadNutritionPhoto } from '../../src/api/photoUpload';

const hints = ['Ganze Tabelle inklusive Kopfzeile erfassen', 'Gerade halten, Reflexionen vermeiden', 'Angaben pro 100 g bevorzugen'];

export default function PhotoScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const cam = useRef<CameraView>(null);

  async function shoot() {
    if (!cam.current) return;
    setBusy(true);
    setFailed(null);
    try {
      const shot = await cam.current.takePictureAsync({ quality: 1 });
      if (!shot) return;
      const small = await ImageManipulator.manipulateAsync(shot.uri, [{ resize: { width: 2000 } }], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const photoId = await uploadNutritionPhoto(small.uri, params.barcode);
      router.replace({ pathname: '/capture/processing', params: { ...params, photoId } });
    } catch {
      // Der Upload sind jetzt drei Schritte statt einem, und jeder kann für sich
      // scheitern. Ohne diesen Zweig bliebe der Nutzer vor einer Kamera stehen,
      // die wieder freigegeben ist und nichts dazu sagt.
      setFailed('Hochladen fehlgeschlagen — bitte erneut versuchen');
    } finally {
      setBusy(false);
    }
  }

  const notice = failed ?? params.notice;

  return (
    <Screen scroll={false}>
      <Text style={[t.font.title, { color: t.color.text }]}>Nährwerttabelle</Text>
      <CameraFrame height={360} style={{ marginTop: t.space[4] }}>
        {permission?.granted ? <CameraView ref={cam} style={{ flex: 1 }} /> : null}
      </CameraFrame>
      {notice ? <Text style={[t.font.body, { color: t.color.accent, marginTop: t.space[4] }]}>{notice}</Text> : null}
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
