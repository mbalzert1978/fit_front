import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Screen, MacroBar, ListRow, SquareIconButton, DayPickerOverlay } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts, type Texts } from '../../src/i18n';
import { today, type DiaryDate } from '../../src/api/diaryDate';
import { useDiaryDay } from '../../src/api/hooks';
import type { DiaryDay, MealSlotDay } from '../../src/api/types';

/** Steht für den noch nicht geladenen Tag: alles null, kein Datum. */
const EMPTY_DAY = {
  totals: { kcal: 0, carbsG: 0, proteinG: 0, fatG: 0 },
  goal: { dailyKcal: 0, carbsG: 0, proteinG: 0, fatG: 0 },
  remainingKcal: 0,
  slots: [],
  activity: null,
} satisfies Omit<DiaryDay, 'date'>;

function dayLabel(date: DiaryDate, txt: Texts) {
  const d = parseISO(date);
  const prefix = date === today() ? txt.diaryTodayPrefix : '';
  return prefix + format(d, txt.dayFormat, { locale: txt.dateLocale }).toUpperCase();
}

function DayTotals({ totals, goal, remaining }: { totals: DiaryDay['totals']; goal: DiaryDay['goal']; remaining: number }) {
  const t = useTheme();
  const txt = useTexts();
  const filled = goal.dailyKcal > 0 ? Math.min((totals.kcal / goal.dailyKcal) * 100, 100) : 0;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: t.space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] }}>
          <Text style={[t.font.display, t.tabular, { color: t.color.text }]}>{totals.kcal}</Text>
          <Text style={[t.font.body, t.tabular, { color: t.color.textMuted }]}>/ {goal.dailyKcal} kcal</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[t.font.label, { color: t.color.textMuted }]}>{txt.diaryRemaining}</Text>
          <Text style={[t.font.body, t.tabular, { color: t.color.text }]}>{remaining}</Text>
        </View>
      </View>

      <View style={{ height: 10, backgroundColor: t.color.divider, marginTop: t.space[4] }}>
        <View style={{ width: `${filled}%`, height: 10, backgroundColor: t.color.accent }} />
      </View>

      <View style={{ flexDirection: 'row', gap: t.space[6], marginTop: t.space[6] }}>
        <MacroBar label={txt.macroCarbs} value={totals.carbsG} target={goal.carbsG} />
        <MacroBar label={txt.macroProtein} value={totals.proteinG} target={goal.proteinG} />
        <MacroBar label={txt.macroFat} value={totals.fatG} target={goal.fatG} />
      </View>
    </>
  );
}

function SlotBlock({ slot, date }: { slot: MealSlotDay; date: DiaryDate }) {
  const t = useTheme();
  const txt = useTexts();

  return (
    <View style={{ marginTop: t.space[8] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[3] }}>
          <Text style={[t.font.label, { color: t.color.text }]}>{slot.name}</Text>
          <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted }]}>{slot.kcal} kcal</Text>
        </View>
        <SquareIconButton
          glyph="+"
          label={txt.diaryAddToSlot(slot.name)}
          onPress={() => router.push({ pathname: '/(tabs)/scan', params: { date, slotId: slot.id, target: 'diary' } })}
        />
      </View>
      <View style={{ height: 1, backgroundColor: t.color.divider, marginTop: t.space[2] }} />
      {/* Leerer Slot zeigt bewusst keinen Hinweistext. */}
      {slot.entries.map((e) => (
        <ListRow
          key={e.id}
          title={e.displayName}
          subtitle={e.portionText}
          value={`${e.kcal}`}
          onPress={() => router.push({ pathname: '/entry/[id]', params: { id: e.id, date } })}
        />
      ))}
    </View>
  );
}

function ActivityBlock({ activity }: { activity: NonNullable<DiaryDay['activity']> }) {
  const t = useTheme();
  const txt = useTexts();

  return (
    <View style={{ marginTop: t.space[8] }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[3] }}>
        <Text style={[t.font.label, { color: t.color.text }]}>{txt.diaryActivity}</Text>
        <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted }]}>+{activity.totalKcal}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: t.color.divider, marginTop: t.space[2] }} />
      {activity.entries.map((a) => (
        <ListRow key={a.externalId} title={a.name} subtitle={a.detail} value={`+${a.kcal}`} />
      ))}
    </View>
  );
}

export default function DiaryScreen() {
  const t = useTheme();
  const txt = useTexts();
  const [date, setDate] = useState<DiaryDate>(today());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const { data: day } = useDiaryDay(date);
  const d = day ?? EMPTY_DAY;
  const activity = d.activity;
  // Reine Client-Sache: der Tag des Servers wäre ein anderer als der gezeigte
  // (docs/decisions/2026-08-20-0925-kalendertag-ist-reine-client-sache.md).
  const isFuture = date > today();

  useEffect(() => {
    if (!confirmation) return;
    const id = setTimeout(() => setConfirmation(null), 3200);
    return () => clearTimeout(id);
  }, [confirmation]);

  return (
    <Screen>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: t.hit }}
      >
        <Text style={[t.font.label, { color: t.color.textMuted }]}>{dayLabel(date, txt)}</Text>
        <Text style={[t.font.micro, { color: t.color.accent }]}>▾</Text>
      </Pressable>

      <DayTotals totals={d.totals} goal={d.goal} remaining={d.remainingKcal} />

      {isFuture ? <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[6] }]}>{txt.diaryPlannedDay}</Text> : null}

      {confirmation ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: t.space[6],
            padding: t.space[4],
            backgroundColor: t.color.accentWash,
            borderWidth: 1,
            borderColor: t.color.accent,
            borderRadius: t.radius.md,
          }}
        >
          <Text style={[t.font.body, { color: t.color.accent }]}>{txt.diaryEntrySaved}</Text>
          <Text style={[t.font.body, { color: t.color.accent }]}>{confirmation}</Text>
        </View>
      ) : null}

      {d.slots.map((slot) => (
        <SlotBlock key={slot.id} slot={slot} date={date} />
      ))}

      {activity?.connected ? <ActivityBlock activity={activity} /> : null}

      <DayPickerOverlay visible={pickerOpen} value={date} onSelect={setDate} onClose={() => setPickerOpen(false)} />
    </Screen>
  );
}
