import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Screen, ValueField, ListRow, OutlineButton, SectionHeading } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts } from '../../src/i18n';
import { useDiaryDay, useUpdateEntry, useDeleteEntry } from '../../src/api/hooks';
import { parseDiaryDate, today } from '../../src/api/diaryDate';
import type { DiaryEntry, MealSlotDay } from '../../src/api/types';

type Found = { entry: DiaryEntry; slot: MealSlotDay } | null;

/** Grams from the input or the entry, and from those the energy per 100 g and for the amount. */
function amountOf(found: Found, grams: string | null) {
  const g = Number((grams ?? String(found?.entry.grams ?? 0)).replace(',', '.')) || 0;
  const per100 = found && found.entry.grams > 0 ? found.entry.kcal / found.entry.grams : 0;
  return { g, per100, kcal: Math.round(per100 * g) };
}

/** Labels; while the entry is not loaded, the fields stay empty. */
function labelsOf(found: Found, grams: string | null) {
  return {
    slotName: found?.slot.name ?? '',
    name: found?.entry.displayName ?? '',
    gramsValue: grams ?? String(found?.entry.grams ?? ''),
  };
}

export default function EntryScreen() {
  const t = useTheme();
  const txt = useTexts();
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
        {slotName} · {format(parseISO(date), txt.dayMonthFormat, { locale: txt.dateLocale })}
      </Text>
      <Text style={[t.font.title, { color: t.color.text, marginTop: t.space[2] }]}>{name}</Text>
      <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted, marginTop: t.space[2] }]}>
        {Math.round(per100 * 100)} kcal / 100 g
      </Text>

      <SectionHeading>{txt.amount}</SectionHeading>
      <ValueField value={gramsValue} onChangeText={setGrams} unit="g" large />

      <SectionHeading>{txt.entryForThisAmount}</SectionHeading>
      <ListRow title={txt.energy} value={`${kcal} kcal`} />

      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton
          label={txt.entrySave}
          disabled={!found || update.isPending}
          onPress={async () => {
            await update.mutateAsync({ entryId: params.id, grams: g });
            router.back();
          }}
        />
        <OutlineButton
          label={txt.entryDelete}
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
