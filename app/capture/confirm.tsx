import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, ValueField, ConfidenceBadge, confidenceOf, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { usePhotoJob, useCreateProduct } from '../../src/api/hooks';
import { newId } from '../../src/api/ids';
import { ctxParams } from '../../src/nav';
import { parseDiaryDate, today } from '../../src/api/diaryDate';

type Key = 'kcal' | 'fatG' | 'saturatedFatG' | 'carbsG' | 'sugarG' | 'proteinG' | 'saltG';

const rows: { key: Key; label: string; unit: string; required: boolean }[] = [
  { key: 'kcal', label: 'Energie', unit: 'kcal', required: true },
  { key: 'fatG', label: 'Fett', unit: 'g', required: true },
  { key: 'saturatedFatG', label: 'davon gesättigte Fettsäuren', unit: 'g', required: false },
  { key: 'carbsG', label: 'Kohlenhydrate', unit: 'g', required: true },
  { key: 'sugarG', label: 'davon Zucker', unit: 'g', required: false },
  { key: 'proteinG', label: 'Eiweiß', unit: 'g', required: true },
  { key: 'saltG', label: 'Salz', unit: 'g', required: false },
];

export default function ConfirmScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();
  const date = params.date ? parseDiaryDate(params.date) : today();
  const { data: job } = usePhotoJob(params.photoId ?? '', 99);
  const extracted = job?.status === 'Completed' ? job : null;

  const [name, setName] = useState<string | null>(null);
  const [edits, setEdits] = useState<Partial<Record<Key, string>>>({});
  const create = useCreateProduct();

  const valueOf = (k: Key) => {
    if (edits[k] !== undefined) return edits[k]!;
    const v = extracted?.fields?.[k]?.value;
    return v == null ? '' : String(v);
  };

  const missing = useMemo(() => rows.filter((r) => r.required && valueOf(r.key).trim() === '').map((r) => r.key), [edits, extracted]);

  async function submit() {
    const num = (k: Key) => {
      const raw = valueOf(k).replace(',', '.').trim();
      return raw === '' ? null : Number(raw);
    };
    const product = await create.mutateAsync({
      id: newId(),
      barcode: params.barcode ?? extracted?.barcode ?? null,
      name: name ?? extracted?.suggestedName ?? '',
      brand: null,
      basisUnit: 'Gram',
      source: 'Ocr',
      verifiedByUser: true,
      photoId: params.photoId ?? null,
      nutrientsPer100g: {
        kcal: num('kcal'),
        fatG: num('fatG'),
        saturatedFatG: num('saturatedFatG'),
        carbsG: num('carbsG'),
        sugarG: num('sugarG'),
        proteinG: num('proteinG'),
        saltG: num('saltG'),
      },
    });
    if (params.target === 'recipe') {
      router.replace({ pathname: '/recipe/[id]', params: { id: params.recipeId!, addProductId: product.id, date } });
    } else {
      router.replace({ pathname: '/product/[id]', params: { id: product.id, ...ctxParams({ date, slotId: params.slotId, target: 'diary' }) } });
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: t.space[4] }}>
        <View style={{ width: 64, height: 64, backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.divider }} />
        <View style={{ flex: 1 }}>
          <TextInput
            value={name ?? extracted?.suggestedName ?? ''}
            onChangeText={setName}
            placeholder="Produktname"
            placeholderTextColor={t.color.textMuted}
            style={[
              t.font.body,
              {
                color: t.color.text,
                backgroundColor: t.color.inputBg,
                borderWidth: 1,
                borderColor: t.color.neutral600,
                borderRadius: t.radius.md,
                paddingHorizontal: t.space[3],
                minHeight: t.hit,
              },
            ]}
          />
          <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted, marginTop: t.space[2] }]}>
            {params.barcode ?? extracted?.barcode ?? 'ohne Barcode'} · Angaben pro 100 g
          </Text>
        </View>
      </View>

      <View style={{ marginTop: t.space[8] }}>
        {rows.map((r) => {
          const raw = valueOf(r.key);
          const isMissing = r.required && raw.trim() === '';
          return (
            <View
              key={r.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space[4],
                paddingVertical: t.space[3],
                borderBottomWidth: 1,
                borderBottomColor: t.color.divider,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[t.font.body, { color: t.color.text }]}>{r.label}</Text>
                <ConfidenceBadge level={confidenceOf(extracted?.fields?.[r.key]?.confidence, raw.trim() !== '')} />
              </View>
              <ValueField
                value={raw}
                onChangeText={(v) => setEdits((e) => ({ ...e, [r.key]: v }))}
                unit={r.unit}
                missing={isMissing}
              />
            </View>
          );
        })}
      </View>

      {/* Kein erklärender Hinweissatz: der Rand und der deaktivierte Knopf sagen genug. */}
      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton label="Übernehmen" onPress={submit} disabled={missing.length > 0 || create.isPending} />
      </View>
    </Screen>
  );
}
