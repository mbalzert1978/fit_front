import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, CameraFrame, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts } from '../../src/i18n';
import { uploadNutritionPhoto } from '../../src/api/photoUpload';

export default function PhotoScreen() {
  const t = useTheme();
  const txt = useTexts();
  const hints = [txt.photoHint1, txt.photoHint2, txt.photoHint3];
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
      // Drei Schritte, jeder kann für sich scheitern. Ohne diesen Zweig stünde
      // der Nutzer vor einer wieder freigegebenen Kamera, die nichts dazu sagt.
      setFailed(txt.photoUploadFailed);
    } finally {
      setBusy(false);
    }
  }

  const notice = failed ?? params.notice;

  return (
    <Screen scroll={false}>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.photoTitle}</Text>
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
          <OutlineButton label={busy ? txt.photoBusy : txt.photoShoot} onPress={shoot} disabled={busy} />
        ) : (
          <OutlineButton label={txt.cameraPermission} onPress={requestPermission} />
        )}
      </View>
    </Screen>
  );
}
