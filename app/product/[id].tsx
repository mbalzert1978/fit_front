import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, ValueField, ListRow, OutlineButton, SectionHeading } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useProduct, useAddEntry } from '../../src/api/hooks';
import { newId } from '../../src/api/ids';
import { parseDiaryDate, today } from '../../src/api/diaryDate';

const sourceText = { Curated: 'Quelle: Katalog', Ocr: 'Quelle: OCR, von dir bestätigt', Manual: 'Quelle: von dir eingegeben' } as const;

export default function ProductScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id: string; date?: string; slotId?: string }>();
  const date = params.date ? parseDiaryDate(params.date) : today();
  const { data: product } = useProduct(params.id);
  const add = useAddEntry(date);
  const [grams, setGrams] = useState('100');

  // Anzeige ganzzahlig; die verbindliche Rechnung macht das Backend beim Speichern.
  const scaled = useMemo(() => {
    const g = Number(grams.replace(',', '.')) || 0;
    const n = product?.nutrientsPer100g;
    if (!n) return null;
    const at = (v: number | null | undefined) => (v == null ? null : Math.round((v * g) / 100));
    return { kcal: at(n.kcal), fatG: at(n.fatG), carbsG: at(n.carbsG), proteinG: at(n.proteinG) };
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
        {product ? sourceText[product.source] : ''}
      </Text>

      <SectionHeading>Menge</SectionHeading>
      <ValueField value={grams} onChangeText={setGrams} unit="g" large />

      <SectionHeading>Nährwerte für diese Menge</SectionHeading>
      <ListRow title="Energie" value={`${scaled?.kcal ?? 0} kcal`} />
      <ListRow title="Kohlenhydrate" value={`${scaled?.carbsG ?? 0} g`} />
      <ListRow title="Eiweiß" value={`${scaled?.proteinG ?? 0} g`} />
      <ListRow title="Fett" value={`${scaled?.fatG ?? 0} g`} />

      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton label="Hinzufügen" onPress={submit} disabled={!product || !params.slotId || add.isPending} />
      </View>
    </Screen>
  );
}
