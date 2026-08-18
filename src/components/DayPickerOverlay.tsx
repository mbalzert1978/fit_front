import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { addDays, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTheme } from '../theme/ThemeProvider';
import { toDiaryDate, type DiaryDate } from '../api/diaryDate';

/** Überlagerndes, scrollbares Datumsfeld: 30 Tage zurück bis 14 Tage vorwärts. */
export function DayPickerOverlay({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: DiaryDate;
  onSelect: (d: DiaryDate) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const days = useMemo(() => {
    const today = new Date();
    const out: { date: DiaryDate; weekday: string; day: string }[] = [];
    for (let offset = -30; offset <= 14; offset++) {
      const d = addDays(today, offset);
      const weekday = offset === 0 ? 'Heute' : offset === 1 ? 'Morgen' : offset === -1 ? 'Gestern' : format(d, 'EEEE', { locale: de });
      out.push({ date: toDiaryDate(d), weekday, day: format(d, 'd. MMMM', { locale: de }) });
    }
    return out;
  }, []);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable
          onPress={() => {}}
          style={{
            marginTop: 90,
            marginHorizontal: t.gutter,
            backgroundColor: t.color.surface,
            borderWidth: 1,
            borderColor: t.color.divider,
            borderRadius: t.radius.md,
            maxHeight: '70%',
            overflow: 'hidden',
          }}
        >
          <ScrollView>
            {days.map((d) => {
              const active = d.date === value;
              return (
                <Pressable
                  key={d.date}
                  onPress={() => {
                    onSelect(d.date);
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    minHeight: t.hit,
                    alignItems: 'center',
                    paddingHorizontal: t.space[6],
                    backgroundColor: active ? t.color.accentWash : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: t.color.divider,
                  }}
                >
                  <Text style={[t.font.body, { color: active ? t.color.accent : t.color.text }]}>{d.weekday}</Text>
                  <Text style={[t.font.body, t.tabular, { color: t.color.textMuted }]}>{d.day}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
