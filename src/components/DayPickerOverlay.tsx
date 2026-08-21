import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { addDays, format } from 'date-fns';
import { useTheme } from '../theme/ThemeProvider';
import { useTexts } from '../i18n';
import { toDiaryDate, type DiaryDate } from '../api/diaryDate';
import { time } from '../time';

/**
 * 30 days back to 14 forward. The client sets the span; the server measures the
 * same fourteen days against UTC with a day of leeway, so that no time zone hits
 * the edge.
 */
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
  const txt = useTexts();
  const days = useMemo(() => {
    const today = time.now();
    const locale = txt.dateLocale;
    const out: { date: DiaryDate; weekday: string; day: string }[] = [];
    for (let offset = -30; offset <= 14; offset++) {
      const d = addDays(today, offset);
      const named = offset === 0 ? txt.dayToday : offset === 1 ? txt.dayTomorrow : offset === -1 ? txt.dayYesterday : null;
      const weekday = named ?? format(d, txt.weekdayFormat, { locale });
      out.push({ date: toDiaryDate(d), weekday, day: format(d, txt.dayMonthFormat, { locale }) });
    }
    return out;
  }, [txt]);

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
