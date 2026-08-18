import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Screen, MacroBar, ListRow, SquareIconButton, DayPickerOverlay } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { today, type DiaryDate } from '../../src/api/diaryDate';
import { useDiaryDay } from '../../src/api/hooks';

function dayLabel(date: DiaryDate) {
  const d = parseISO(date);
  const prefix = date === today() ? 'HEUTE · ' : '';
  return prefix + format(d, 'EEEE, d. MMMM', { locale: de }).toUpperCase();
}

export default function DiaryScreen() {
  const t = useTheme();
  const [date, setDate] = useState<DiaryDate>(today());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const { data: day } = useDiaryDay(date);

  // Bestätigungsleiste blendet nach 3,2 s aus.
  useEffect(() => {
    if (!confirmation) return;
    const id = setTimeout(() => setConfirmation(null), 3200);
    return () => clearTimeout(id);
  }, [confirmation]);

  return (
    <Screen>
      <Pressable onPress={() => setPickerOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: t.hit }}>
        <Text style={[t.font.label, { color: t.color.textMuted }]}>{dayLabel(date)}</Text>
        <Text style={[t.font.micro, { color: t.color.accent }]}>▾</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: t.space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] }}>
          <Text style={[t.font.display, t.tabular, { color: t.color.text }]}>{day?.totals.kcal ?? 0}</Text>
          <Text style={[t.font.body, t.tabular, { color: t.color.textMuted }]}>/ {day?.goal.dailyKcal ?? 0} kcal</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[t.font.label, { color: t.color.textMuted }]}>Noch</Text>
          <Text style={[t.font.body, t.tabular, { color: t.color.text }]}>{day?.remainingKcal ?? 0}</Text>
        </View>
      </View>

      <View style={{ height: 10, backgroundColor: t.color.divider, marginTop: t.space[4] }}>
        <View
          style={{
            width: `${day && day.goal.dailyKcal > 0 ? Math.min((day.totals.kcal / day.goal.dailyKcal) * 100, 100) : 0}%`,
            height: 10,
            backgroundColor: t.color.accent,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: t.space[6], marginTop: t.space[6] }}>
        <MacroBar label="Kohlenhydrate" value={day?.totals.carbsG ?? 0} target={day?.goal.carbsG ?? 0} />
        <MacroBar label="Eiweiß" value={day?.totals.proteinG ?? 0} target={day?.goal.proteinG ?? 0} />
        <MacroBar label="Fett" value={day?.totals.fatG ?? 0} target={day?.goal.fatG ?? 0} />
      </View>

      {day?.isFuture ? (
        <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[6] }]}>Geplanter Tag</Text>
      ) : null}

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

      {(day?.slots ?? []).map((slot) => (
        <View key={slot.id} style={{ marginTop: t.space[8] }}>
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
      ))}

      {day?.activity?.connected ? (
        <View style={{ marginTop: t.space[8] }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[3] }}>
            <Text style={[t.font.label, { color: t.color.text }]}>Aktivität</Text>
            <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted }]}>+{day.activity.totalKcal}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: t.color.divider, marginTop: t.space[2] }} />
          {day.activity.entries.map((a) => (
            <ListRow key={a.externalId} title={a.name} subtitle={a.detail} value={`+${a.kcal}`} />
          ))}
        </View>
      ) : null}

      <DayPickerOverlay visible={pickerOpen} value={date} onSelect={setDate} onClose={() => setPickerOpen(false)} />
    </Screen>
  );
}
