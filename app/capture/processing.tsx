import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts } from '../../src/i18n';
import { usePhotoJob } from '../../src/api/hooks';

export default function ProcessingScreen() {
  const t = useTheme();
  const txt = useTexts();
  const steps = [txt.processingStep1, txt.processingStep2, txt.processingStep3];
  const params = useLocalSearchParams<Record<string, string>>();
  const [attempts, setAttempts] = useState(0);
  const { data: job } = usePhotoJob(params.photoId!, attempts);
  const started = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setAttempts((a) => a + 1), 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timedOut = Date.now() - started.current > 30_000;
    if (job?.status === 'Completed') {
      router.replace({ pathname: '/capture/confirm', params: { ...params } });
    } else if (job?.status === 'Failed' || timedOut) {
      router.replace({ pathname: '/capture/photo', params: { ...params, notice: txt.processingUnreadable } });
    }
  }, [job, attempts, params, txt]);

  const reached = job?.status === 'Completed' ? 3 : Math.min(1 + Math.floor(attempts / 4), 2);

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.processingTitle}</Text>
      <View style={{ height: 10, backgroundColor: t.color.divider, marginTop: t.space[6] }}>
        <View style={{ width: `${(reached / 3) * 100}%`, height: 10, backgroundColor: t.color.accent }} />
      </View>
      <View style={{ gap: t.space[3], marginTop: t.space[6] }}>
        {steps.map((s, i) => (
          <Text key={s} style={[t.font.body, { color: i < reached ? t.color.text : t.color.textMuted }]}>
            {s}
          </Text>
        ))}
      </View>
    </Screen>
  );
}
