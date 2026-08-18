import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Screen, ValueField, ListRow, OutlineButton, SectionHeading } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useDiaryDay, useUpdateEntry, useDeleteEntry } from '../../src/api/hooks';
import { parseDiaryDate, today } from '../../src/api/diaryDate';
import type { DiaryEntry, MealSlotDay } from '../../src/api/types';

type Found = { entry: DiaryEntry; slot: MealSlotDay } | null;

/** Gramm aus Eingabe oder Eintrag, daraus der Energiewert je 100 g und für die Menge. */
function amountOf(found: Found, grams: string | null) {
  const g = Number((grams ?? String(found?.entry.grams ?? 0)).replace(',', '.')) || 0;
  const per100 = found && found.entry.grams > 0 ? found.entry.kcal / found.entry.grams : 0;
  return { g, per100, kcal: Math.round(per100 * g) };
}

/** Beschriftungen; solange der Eintrag nicht geladen ist, bleiben die Felder leer. */
function labelsOf(found: Found, grams: string | null) {
  return {
    slotName: found?.slot.name ?? '',
    name: found?.entry.displayName ?? '',
    gramsValue: grams ?? String(found?.entry.grams ?? ''),
  };
}

export default function EntryScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id: string; date?: string }>();
  const date = params.date ? parseDiaryDate(params.date) : today();
  const { data: day } = useDiaryDay(date);
  const update = useUpdateEntry(date);
  const remove = useDeleteEntry(date);

  const found = useMemo<Found>(() => {
    for (const s of day?.slots ?? []) {
      const e = s.entries.find((x) => x.id === params.id);
      if (e) return { entry: e, slot: s };
    }
    return null;
  }, [day, params.id]);

  const [grams, setGrams] = useState<string | null>(null);
  const { g, per100, kcal } = amountOf(found, grams);
  const { slotName, name, gramsValue } = labelsOf(found, grams);

  return (
    <Screen>
      <Text style={[t.font.label, { color: t.color.textMuted }]}>
        {slotName} · {format(parseISO(date), 'd. MMMM', { locale: de })}
      </Text>
      <Text style={[t.font.title, { color: t.color.text, marginTop: t.space[2] }]}>{name}</Text>
      <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted, marginTop: t.space[2] }]}>
        {Math.round(per100 * 100)} kcal / 100 g
      </Text>

      <SectionHeading>Menge</SectionHeading>
      <ValueField value={gramsValue} onChangeText={setGrams} unit="g" large />

      <SectionHeading>Für diese Menge</SectionHeading>
      <ListRow title="Energie" value={`${kcal} kcal`} />

      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton
          label="Änderung speichern"
          disabled={!found || update.isPending}
          onPress={async () => {
            await update.mutateAsync({ entryId: params.id, grams: g });
            router.back();
          }}
        />
        <OutlineButton
          label="Eintrag löschen"
          variant="muted"
          disabled={!found || remove.isPending}
          onPress={async () => {
            await remove.mutateAsync(params.id);
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}
