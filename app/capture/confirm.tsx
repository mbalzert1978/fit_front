import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, ValueField, ConfidenceBadge, confidenceOf, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts, type Texts } from '../../src/i18n';
import { usePhotoJob, useCreateProduct } from '../../src/api/hooks';
import { newId } from '../../src/api/ids';
import { ctxParams } from '../../src/nav';
import { parseDiaryDate, today } from '../../src/api/diaryDate';
import type { PhotoJob } from '../../src/api/types';

type Key = 'kcal' | 'fatG' | 'saturatedFatG' | 'carbsG' | 'sugarG' | 'proteinG' | 'saltG';

const rowsOf = (txt: Texts): { key: Key; label: string; unit: string; required: boolean }[] => [
  { key: 'kcal', label: txt.energy, unit: 'kcal', required: true },
  { key: 'fatG', label: txt.macroFat, unit: 'g', required: true },
  { key: 'saturatedFatG', label: txt.nutrientSaturatedFat, unit: 'g', required: false },
  { key: 'carbsG', label: txt.macroCarbs, unit: 'g', required: true },
  { key: 'sugarG', label: txt.nutrientSugar, unit: 'g', required: false },
  { key: 'proteinG', label: txt.macroProtein, unit: 'g', required: true },
  { key: 'saltG', label: txt.nutrientSalt, unit: 'g', required: false },
];

function ProductHeader({
  name,
  onChangeName,
  suggested,
  barcode,
}: {
  name: string | null;
  onChangeName: (v: string) => void;
  suggested: string | null | undefined;
  barcode: string | null | undefined;
}) {
  const t = useTheme();
  const txt = useTexts();

  return (
    <View style={{ flexDirection: 'row', gap: t.space[4] }}>
      <View style={{ width: 64, height: 64, backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.divider }} />
      <View style={{ flex: 1 }}>
        <TextInput
          value={name ?? suggested ?? ''}
          onChangeText={onChangeName}
          placeholder={txt.confirmName}
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
          {barcode ?? txt.confirmNoBarcode} · {txt.confirmPer100g}
        </Text>
      </View>
    </View>
  );
}

export default function ConfirmScreen() {
  const t = useTheme();
  const txt = useTexts();
  const rows = rowsOf(txt);
  const params = useLocalSearchParams<Record<string, string>>();
  const date = params.date ? parseDiaryDate(params.date) : today();
  const job: PhotoJob | undefined = usePhotoJob(params.photoId ?? '', 99).data;
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
      router.replace({
        pathname: '/product/[id]',
        params: { id: product.id, ...ctxParams({ date, slotId: params.slotId, target: 'diary' }) },
      });
    }
  }

  return (
    <Screen>
      <ProductHeader
        name={name}
        onChangeName={setName}
        suggested={extracted?.suggestedName}
        barcode={params.barcode ?? extracted?.barcode}
      />

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
              <ValueField value={raw} onChangeText={(v) => setEdits((e) => ({ ...e, [r.key]: v }))} unit={r.unit} missing={isMissing} />
            </View>
          );
        })}
      </View>

      {/* No explaining sentence: the border and the disabled button say enough. */}
      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton label={txt.confirmSubmit} onPress={submit} disabled={missing.length > 0 || create.isPending} />
      </View>
    </Screen>
  );
}
