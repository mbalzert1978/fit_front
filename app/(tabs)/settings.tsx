import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Screen, SectionHeading, ValueField, Segmented, Toggle, OutlineButton, SquareIconButton } from '../../src/components';
import { useTheme, useThemeMode } from '../../src/theme/ThemeProvider';
import {
  useGoals,
  useSaveGoals,
  usePreferences,
  useSavePreferences,
  useSlots,
  useSlotMutations,
  useHealthConsent,
} from '../../src/api/hooks';
import { newId } from '../../src/api/ids';
import { ApiError } from '../../src/api/client';
import { problems } from '../../src/api/problems';

type MacroKey = 'carbs' | 'protein' | 'fat';
const macroLabel: Record<MacroKey, string> = { carbs: 'Kohlenhydrate', protein: 'Eiweiß', fat: 'Fett' };

function SlotList() {
  const t = useTheme();
  const { data: slots } = useSlots();
  const slotOps = useSlotMutations();
  const [slotError, setSlotError] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const list = slots ?? [];

  return (
    <>
      <SectionHeading>Mahlzeiten-Slots</SectionHeading>
      {list.map((s, i) => (
        <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3], paddingVertical: t.space[2] }}>
          <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted, width: 18 }]}>{i + 1}</Text>
          <TextInput
            value={names[s.id] ?? s.name}
            onChangeText={(v) => setNames((n) => ({ ...n, [s.id]: v }))}
            onEndEditing={() => slotOps.rename.mutate({ id: s.id, name: names[s.id] ?? s.name })}
            style={[
              t.font.body,
              {
                flex: 1,
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
          <SquareIconButton
            glyph="−"
            label={`${s.name} entfernen`}
            onPress={() => {
              if (list.length <= 1) return; // letzter Slot bleibt
              setSlotError(null);
              slotOps.remove.mutate(s.id, {
                onError: (e) =>
                  setSlotError(e instanceof ApiError && e.type === problems.slotNotEmpty ? 'Dieser Slot enthält noch Einträge' : null),
              });
            }}
          />
        </View>
      ))}
      {slotError ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[2] }]}>{slotError}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: t.space[3], marginTop: t.space[4] }}>
        <Text style={[t.font.body, { color: t.color.textMuted }]}>Slot hinzufügen</Text>
        <SquareIconButton glyph="+" label="Slot hinzufügen" onPress={() => slotOps.add.mutate({ id: newId(), name: 'Neue Mahlzeit' })} />
      </View>
    </>
  );
}

function DailyGoal() {
  const t = useTheme();
  const { data: goals } = useGoals();
  const saveGoals = useSaveGoals();
  const dailyKcal = goals?.dailyKcal;

  /** Lokale Verteilung; das Tagesziel friert ein, solange die Summe ≠ 100 ist. */
  const [dist, setDist] = useState<Record<MacroKey, { percent: number; grams: number }> | null>(null);
  const [kcalDraft, setKcalDraft] = useState<string | null>(null);

  useEffect(() => {
    if (goals && !dist) {
      setDist({
        carbs: { percent: goals.macros.carbs.percent, grams: goals.macros.carbs.grams },
        protein: { percent: goals.macros.protein.percent, grams: goals.macros.protein.grams },
        fat: { percent: goals.macros.fat.percent, grams: goals.macros.fat.grams },
      });
    }
  }, [goals, dist]);

  const sum = dist ? dist.carbs.percent + dist.protein.percent + dist.fat.percent : 100;
  const frozen = Math.round(sum) !== 100;

  function commitIfBalanced(next: Record<MacroKey, { percent: number; grams: number }>) {
    const s = next.carbs.percent + next.protein.percent + next.fat.percent;
    if (Math.round(s) === 100) {
      saveGoals.mutate({
        macros: {
          carbs: { percent: Math.round(next.carbs.percent) },
          protein: { percent: Math.round(next.protein.percent) },
          fat: { percent: Math.round(next.fat.percent) },
        },
      });
    }
  }

  const kcalPerGram = (m: MacroKey) => (goals?.energyStandard === 'Physiological' ? (m === 'fat' ? 9.3 : 4.1) : m === 'fat' ? 9 : 4);

  return (
    <>
      <SectionHeading>Tagesziel</SectionHeading>
      <ValueField value={kcalDraft ?? String(dailyKcal ?? '')} onChangeText={setKcalDraft} unit="kcal" large />
      {kcalDraft !== null && Number(kcalDraft) !== dailyKcal ? (
        <View style={{ marginTop: t.space[4] }}>
          <OutlineButton label="Tagesziel übernehmen" onPress={() => saveGoals.mutate({ dailyKcal: Number(kcalDraft) || 0 })} />
        </View>
      ) : null}

      {(['carbs', 'protein', 'fat'] as MacroKey[]).map((m) => {
        const row = dist?.[m];
        const kcal = row ? Math.round(row.grams * kcalPerGram(m)) : 0;
        return (
          <View key={m} style={{ marginTop: t.space[6] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[t.font.body, { color: t.color.text }]}>{macroLabel[m]}</Text>
              <Text style={[t.font.body, t.tabular, { color: t.color.textMuted }]}>{kcal} kcal</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3], marginTop: t.space[2] }}>
              <Slider
                style={{ flex: 1, height: t.hit }}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={row?.percent ?? 0}
                minimumTrackTintColor={t.color.accent}
                maximumTrackTintColor={t.color.divider}
                thumbTintColor={t.color.accent}
                onValueChange={(percent) =>
                  setDist((d) => {
                    if (!d || !goals) return d;
                    const grams = Math.round((goals.dailyKcal * percent) / 100 / kcalPerGram(m));
                    return { ...d, [m]: { percent, grams } };
                  })
                }
                onSlidingComplete={() => dist && commitIfBalanced(dist)}
              />
              <ValueField
                value={String(row?.grams ?? '')}
                unit="g"
                onChangeText={(v) =>
                  setDist((d) => {
                    if (!d || !goals) return d;
                    const grams = Number(v.replace(',', '.')) || 0;
                    // Gramm-Eingabe zieht den Prozentwert sofort nach.
                    const percent = goals.dailyKcal > 0 ? (grams * kcalPerGram(m) * 100) / goals.dailyKcal : 0;
                    const next = { ...d, [m]: { percent, grams } };
                    commitIfBalanced(next);
                    return next;
                  })
                }
              />
              <Text style={[t.font.body, t.tabular, { color: t.color.textMuted, width: 44, textAlign: 'right' }]}>
                {Math.round(row?.percent ?? 0)} %
              </Text>
            </View>
          </View>
        );
      })}
      {frozen ? (
        <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[4] }]}>
          Verteilung ergibt {Math.round(sum)} % — Tagesziel aktualisiert sich bei 100 %.
        </Text>
      ) : null}
    </>
  );
}

function MacroCalc() {
  const { data: goals } = useGoals();
  const saveGoals = useSaveGoals();

  return (
    <>
      <SectionHeading>Makro-Berechnung</SectionHeading>
      <Toggle
        label="Physiologisch"
        hint="4,1 / 4,1 / 9,3 kcal je g · Atwater"
        value={goals?.energyStandard === 'Physiological'}
        onChange={() => saveGoals.mutate({ energyStandard: 'Physiological' })}
      />
      <Toggle
        label="Deklaration"
        hint="4 / 4 / 9 kcal je g · EU 1169/2011"
        value={goals?.energyStandard === 'Declaration'}
        onChange={() => saveGoals.mutate({ energyStandard: 'Declaration' })}
      />
      <Toggle
        label="Aufrunden"
        hint="nie zu wenig gezählt"
        value={goals?.rounding === 'Up'}
        onChange={() => saveGoals.mutate({ rounding: 'Up' })}
      />
      <Toggle
        label="Abrunden"
        hint="nie zu viel gezählt"
        value={goals?.rounding === 'Down'}
        onChange={() => saveGoals.mutate({ rounding: 'Down' })}
      />
    </>
  );
}

function HealthSection() {
  const t = useTheme();
  const { data: health } = useHealthConsent();
  const { data: goals } = useGoals();
  const saveGoals = useSaveGoals();
  const connected = !!health?.connected;

  return (
    <>
      <SectionHeading>Apple Health</SectionHeading>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.hit }}>
        <Text style={[t.font.body, { color: t.color.textMuted }]}>{connected ? 'Verbunden' : 'Nicht verbunden'}</Text>
        <View style={{ minWidth: 130 }}>
          <OutlineButton label={connected ? 'Trennen' : 'Verbinden'} variant={connected ? 'muted' : 'primary'} />
        </View>
      </View>
      <Toggle label="Aktivität & Verbrauch importieren" value={!!health?.importActivity} onChange={() => {}} />
      <Toggle label="Ernährung exportieren" value={!!health?.exportNutrition} onChange={() => {}} />
      <Toggle
        label="Aktivkalorien aufs Ziel addieren"
        value={!!goals?.includeActivityInGoal}
        onChange={(v) => saveGoals.mutate({ includeActivityInGoal: v })}
      />
      <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[3] }]}>
        Android nutzt Health Connect mit denselben Datentypen.
      </Text>
    </>
  );
}

function Appearance() {
  const { mode, setMode } = useThemeMode();
  const { data: prefs } = usePreferences();
  const savePrefs = useSavePreferences();

  return (
    <>
      <SectionHeading>Darstellung</SectionHeading>
      <Segmented
        options={[
          { value: 'dark', label: 'Dunkel' },
          { value: 'light', label: 'Hell' },
        ]}
        value={mode}
        onChange={(v) => {
          setMode(v);
          savePrefs.mutate({ theme: v === 'dark' ? 'Dark' : 'Light' });
        }}
      />

      <SectionHeading>Sprache</SectionHeading>
      <Segmented
        options={[
          { value: 'de', label: 'Deutsch' },
          { value: 'en', label: 'English' },
        ]}
        value={prefs?.language ?? 'de'}
        onChange={(language) => savePrefs.mutate({ language })}
      />
    </>
  );
}

export default function SettingsScreen() {
  const t = useTheme();

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Mehr</Text>
      <SlotList />
      <DailyGoal />
      <MacroCalc />
      <HealthSection />
      <Appearance />
    </Screen>
  );
}
