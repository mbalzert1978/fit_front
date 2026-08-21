import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Screen, MacroBar, ListRow, SquareIconButton, DayPickerOverlay } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
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

function dayLabel(date: DiaryDate) {
  const d = parseISO(date);
  const prefix = date === today() ? 'HEUTE · ' : '';
  return prefix + format(d, 'EEEE, d. MMMM', { locale: de }).toUpperCase();
}

function DayTotals({ totals, goal, remaining }: { totals: DiaryDay['totals']; goal: DiaryDay['goal']; remaining: number }) {
  const t = useTheme();
  const filled = goal.dailyKcal > 0 ? Math.min((totals.kcal / goal.dailyKcal) * 100, 100) : 0;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: t.space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] }}>
          <Text style={[t.font.display, t.tabular, { color: t.color.text }]}>{totals.kcal}</Text>
          <Text style={[t.font.body, t.tabular, { color: t.color.textMuted }]}>/ {goal.dailyKcal} kcal</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[t.font.label, { color: t.color.textMuted }]}>Noch</Text>
          <Text style={[t.font.body, t.tabular, { color: t.color.text }]}>{remaining}</Text>
        </View>
      </View>

      <View style={{ height: 10, backgroundColor: t.color.divider, marginTop: t.space[4] }}>
        <View style={{ width: `${filled}%`, height: 10, backgroundColor: t.color.accent }} />
      </View>

      <View style={{ flexDirection: 'row', gap: t.space[6], marginTop: t.space[6] }}>
        <MacroBar label="Kohlenhydrate" value={totals.carbsG} target={goal.carbsG} />
        <MacroBar label="Eiweiß" value={totals.proteinG} target={goal.proteinG} />
        <MacroBar label="Fett" value={totals.fatG} target={goal.fatG} />
      </View>
    </>
  );
}

function SlotBlock({ slot, date }: { slot: MealSlotDay; date: DiaryDate }) {
  const t = useTheme();

  return (
    <View style={{ marginTop: t.space[8] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[3] }}>
          <Text style={[t.font.label, { color: t.color.text }]}>{slot.name}</Text>
          <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted }]}>{slot.kcal} kcal</Text>
        </View>
        <SquareIconButton
          glyph="+"
          label={`Zu ${slot.name} hinzufügen`}
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

  return (
    <View style={{ marginTop: t.space[8] }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[3] }}>
        <Text style={[t.font.label, { color: t.color.text }]}>Aktivität</Text>
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
  const [date, setDate] = useState<DiaryDate>(today());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const { data: day } = useDiaryDay(date);
  const d = day ?? EMPTY_DAY;
  const activity = d.activity;
  // Zukunft ist der Vergleich zweier Kalendertage gegen die Uhr des Geräts.
  // Der Server sagt dazu nichts; sein Tag wäre ein anderer als der hier gezeigte.
  const isFuture = date > today();

  // Bestätigungsleiste blendet nach 3,2 s aus.
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
        <Text style={[t.font.label, { color: t.color.textMuted }]}>{dayLabel(date)}</Text>
        <Text style={[t.font.micro, { color: t.color.accent }]}>▾</Text>
      </Pressable>

      <DayTotals totals={d.totals} goal={d.goal} remaining={d.remainingKcal} />

      {isFuture ? <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[6] }]}>Geplanter Tag</Text> : null}

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
          <Text style={[t.font.body, { color: t.color.accent }]}>Eintrag gespeichert</Text>
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
