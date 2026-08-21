import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, ValueField, ListRow, OutlineButton, SectionHeading } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts, type Texts } from '../../src/i18n';
import { useProduct, useAddEntry } from '../../src/api/hooks';
import { newId } from '../../src/api/ids';
import { parseDiaryDate, today } from '../../src/api/diaryDate';

const sourceText = (txt: Texts) => ({
  Curated: txt.productSourceCurated,
  Ocr: txt.productSourceOcr,
  Manual: txt.productSourceManual,
});

export default function ProductScreen() {
  const t = useTheme();
  const txt = useTexts();
  const params = useLocalSearchParams<{ id: string; date?: string; slotId?: string }>();
  const date = params.date ? parseDiaryDate(params.date) : today();
  const { data: product } = useProduct(params.id);
  const add = useAddEntry(date);
  const [grams, setGrams] = useState('100');

  // Anzeige ganzzahlig; die verbindliche Rechnung macht das Backend beim Speichern.
  const scaled = useMemo(() => {
    const g = Number(grams.replace(',', '.')) || 0;
    const n = product?.nutrientsPer100g;
    // Fehlender Nährwert zählt als 0 — so stand es auch vorher in der Anzeige.
    const at = (v: number | null | undefined) => (v == null ? 0 : Math.round((v * g) / 100));
    return { kcal: at(n?.kcal), fatG: at(n?.fatG), carbsG: at(n?.carbsG), proteinG: at(n?.proteinG) };
  }, [grams, product]);

  async function submit() {
    if (!product || !params.slotId) return;
    await add.mutateAsync({
      id: newId(),
      mealSlotId: params.slotId,
      sourceType: 'Product',
      sourceId: product.id,
      grams: Number(grams.replace(',', '.')) || 0,
    });
    router.dismissAll();
    router.replace('/(tabs)/diary');
  }

  return (
    <Screen>
      <Text style={[t.font.label, { color: t.color.textMuted }]}>{product?.brand ?? ' '}</Text>
      <Text style={[t.font.title, { color: t.color.text, marginTop: t.space[2] }]}>{product?.name ?? ''}</Text>
      <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[2] }]}>
        {product ? sourceText(txt)[product.source] : ''}
      </Text>

      <SectionHeading>{txt.amount}</SectionHeading>
      <ValueField value={grams} onChangeText={setGrams} unit="g" large />

      <SectionHeading>{txt.productNutrients}</SectionHeading>
      <ListRow title={txt.energy} value={`${scaled.kcal} kcal`} />
      <ListRow title={txt.macroCarbs} value={`${scaled.carbsG} g`} />
      <ListRow title={txt.macroProtein} value={`${scaled.proteinG} g`} />
      <ListRow title={txt.macroFat} value={`${scaled.fatG} g`} />

      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton label={txt.productAdd} onPress={submit} disabled={!product || !params.slotId || add.isPending} />
      </View>
    </Screen>
  );
}
