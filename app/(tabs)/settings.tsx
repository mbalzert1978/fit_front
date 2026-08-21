import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { format } from 'date-fns';
import { Screen, SectionHeading, ValueField, FormField, Segmented, Toggle, OutlineButton, SquareIconButton } from '../../src/components';
import { useTheme, useThemeMode } from '../../src/theme/ThemeProvider';
import { useLanguage, useTexts, type Texts } from '../../src/i18n';
import { preferLanguage } from '../../src/language';
import {
  useMe,
  useDeleteAccount,
  useGoals,
  useSaveGoals,
  usePreferences,
  useSavePreferences,
  useSlots,
  useSlotMutations,
  useHealthConsent,
} from '../../src/api/hooks';
import { newId } from '../../src/api/ids';
import { ApiError, OfflineError, signOut } from '../../src/api/client';
import { problems } from '../../src/api/problems';

type MacroKey = 'carbs' | 'protein' | 'fat';
const macroLabel = (txt: Texts): Record<MacroKey, string> => ({ carbs: txt.macroCarbs, protein: txt.macroProtein, fat: txt.macroFat });

function SlotList() {
  const t = useTheme();
  const txt = useTexts();
  const { data: slots } = useSlots();
  const slotOps = useSlotMutations();
  const [slotError, setSlotError] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const list = slots ?? [];

  return (
    <>
      <SectionHeading>{txt.settingsSlots}</SectionHeading>
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
            label={txt.removeNamed(s.name)}
            onPress={() => {
              if (list.length <= 1) return; // the last slot stays
              setSlotError(null);
              slotOps.remove.mutate(s.id, {
                onError: (e) => setSlotError(e instanceof ApiError && e.type === problems.slotNotEmpty ? txt.settingsSlotNotEmpty : null),
              });
            }}
          />
        </View>
      ))}
      {slotError ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[2] }]}>{slotError}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: t.space[3], marginTop: t.space[4] }}>
        <Text style={[t.font.body, { color: t.color.textMuted }]}>{txt.settingsAddSlot}</Text>
        <SquareIconButton
          glyph="+"
          label={txt.settingsAddSlot}
          onPress={() => slotOps.add.mutate({ id: newId(), name: txt.settingsNewSlotName })}
        />
      </View>
    </>
  );
}

function DailyGoal() {
  const t = useTheme();
  const txt = useTexts();
  const { data: goals } = useGoals();
  const saveGoals = useSaveGoals();
  const dailyKcal = goals?.dailyKcal;

  /** The local split; the daily goal freezes while the sum is ≠ 100. */
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
      <SectionHeading>{txt.settingsDailyGoal}</SectionHeading>
      <ValueField value={kcalDraft ?? String(dailyKcal ?? '')} onChangeText={setKcalDraft} unit="kcal" large />
      {kcalDraft !== null && Number(kcalDraft) !== dailyKcal ? (
        <View style={{ marginTop: t.space[4] }}>
          <OutlineButton label={txt.settingsApplyDailyGoal} onPress={() => saveGoals.mutate({ dailyKcal: Number(kcalDraft) || 0 })} />
        </View>
      ) : null}

      {(['carbs', 'protein', 'fat'] as MacroKey[]).map((m) => {
        const row = dist?.[m];
        const kcal = row ? Math.round(row.grams * kcalPerGram(m)) : 0;
        return (
          <View key={m} style={{ marginTop: t.space[6] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[t.font.body, { color: t.color.text }]}>{macroLabel(txt)[m]}</Text>
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
                    // Typing grams drags the percentage along at once.
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
        <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[4] }]}>{txt.settingsDistribution(Math.round(sum))}</Text>
      ) : null}
    </>
  );
}

function MacroCalc() {
  const txt = useTexts();
  const { data: goals } = useGoals();
  const saveGoals = useSaveGoals();

  return (
    <>
      <SectionHeading>{txt.settingsMacroCalc}</SectionHeading>
      <Toggle
        label={txt.settingsPhysiological}
        hint={txt.settingsPhysiologicalHint}
        value={goals?.energyStandard === 'Physiological'}
        onChange={() => saveGoals.mutate({ energyStandard: 'Physiological' })}
      />
      <Toggle
        label={txt.settingsDeclaration}
        hint={txt.settingsDeclarationHint}
        value={goals?.energyStandard === 'Declaration'}
        onChange={() => saveGoals.mutate({ energyStandard: 'Declaration' })}
      />
      <Toggle
        label={txt.settingsRoundUp}
        hint={txt.settingsRoundUpHint}
        value={goals?.rounding === 'Up'}
        onChange={() => saveGoals.mutate({ rounding: 'Up' })}
      />
      <Toggle
        label={txt.settingsRoundDown}
        hint={txt.settingsRoundDownHint}
        value={goals?.rounding === 'Down'}
        onChange={() => saveGoals.mutate({ rounding: 'Down' })}
      />
    </>
  );
}

function HealthSection() {
  const t = useTheme();
  const txt = useTexts();
  const { data: health } = useHealthConsent();
  const { data: goals } = useGoals();
  const saveGoals = useSaveGoals();
  const connected = !!health?.connected;

  return (
    <>
      <SectionHeading>{txt.settingsHealth}</SectionHeading>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.hit }}>
        <Text style={[t.font.body, { color: t.color.textMuted }]}>{connected ? txt.settingsConnected : txt.settingsNotConnected}</Text>
        <View style={{ minWidth: 130 }}>
          <OutlineButton label={connected ? txt.settingsDisconnect : txt.settingsConnect} variant={connected ? 'muted' : 'primary'} />
        </View>
      </View>
      <Toggle label={txt.settingsImportActivity} value={!!health?.importActivity} onChange={() => {}} />
      <Toggle label={txt.settingsExportNutrition} value={!!health?.exportNutrition} onChange={() => {}} />
      <Toggle
        label={txt.settingsActivityInGoal}
        value={!!goals?.includeActivityInGoal}
        onChange={(v) => saveGoals.mutate({ includeActivityInGoal: v })}
      />
      <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: t.space[3] }]}>{txt.settingsHealthConnectNote}</Text>
    </>
  );
}

/**
 * Appearance and language take effect at once and are written at the same time:
 * the language goes to the seam before the response is there, so the user does
 * not wait a round trip to see that their tap did something.
 *
 * `usePreferences()` stands here without a reader — the query is the way the
 * stored preference gets into the seam at all.
 */
function Appearance() {
  const txt = useTexts();
  const language = useLanguage();
  const { mode, setMode } = useThemeMode();
  const savePrefs = useSavePreferences();
  usePreferences();

  return (
    <>
      <SectionHeading>{txt.settingsAppearance}</SectionHeading>
      <Segmented
        options={[
          { value: 'dark', label: txt.settingsDark },
          { value: 'light', label: txt.settingsLight },
        ]}
        value={mode}
        onChange={(v) => {
          setMode(v);
          savePrefs.mutate({ theme: v === 'dark' ? 'Dark' : 'Light' });
        }}
      />

      <SectionHeading>{txt.settingsLanguage}</SectionHeading>
      <Segmented
        options={[
          { value: 'de', label: txt.languageDe },
          { value: 'en', label: txt.languageEn },
        ]}
        value={language}
        onChange={(chosen) => {
          preferLanguage(chosen);
          savePrefs.mutate({ language: chosen });
        }}
      />
    </>
  );
}

/**
 * The sentence for a failed deletion attempt. The server speaks first: `detail`
 * is its sentence about exactly this incident, in the language it was asked in.
 * The app has sentences of its own only where none arrives.
 */
function deletionHint(e: unknown, txt: Texts): string {
  if (e instanceof OfflineError) return txt.noConnection;
  if (e instanceof ApiError) return e.detail ?? e.message;
  return txt.settingsDeleteFailed;
}

/**
 * The sentence for the accepted deletion, with the deadline as day and time of
 * the device.
 *
 * `new Date(iso)` is no reach for the clock here and therefore goes past
 * `src/time.ts` — what is read is a point in time the server named, not the
 * current one.
 *
 * The contract assures the instant. Should it stay away anyway or be none, the
 * app says exactly that: `format` would throw and take the screen with it, and
 * "deleted at  o'clock" would be a gap nobody reads as an error. Accepted the
 * deletion is either way — so it is not kept quiet.
 */
function deadlineSentence(iso: string | undefined, txt: Texts): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return txt.settingsDeleteNoDeadline;
  return txt.settingsDeletedAt(format(d, txt.instantFormat, { locale: txt.dateLocale }));
}

/**
 * The only path in this app that cannot be taken back.
 *
 * Three states, in this order: closed, open with input, accepted. The backend
 * does **not** delete right away — it answers with 202 and a deadline, and
 * exactly that stands here afterwards. A "done" would be wrong: the data is
 * still there. The session ends only on a second tap, because the account lives
 * on until the deadline; see
 * `docs/decisions/2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`.
 */
function AccountDeletionSection() {
  const t = useTheme();
  const txt = useTexts();
  const del = useDeleteAccount();
  /** `null` means: the section is closed and only the button stands there. */
  const [word, setWord] = useState<string | null>(null);
  // Closing also means: forget the last failure. Otherwise "No connection"
  // would stand red under an empty field on the next opening, about an attempt
  // that never happened in this round.
  const close = () => {
    setWord(null);
    del.reset();
  };

  // `isSuccess` and not `data`: accepted is accepted. A body with `data: null`
  // would otherwise leave the user in front of the same form as if nothing had
  // happened — while their account is marked for deletion.
  if (del.isSuccess) {
    return (
      <View style={{ gap: t.space[4], marginTop: t.space[6] }}>
        <Text style={[t.font.body, { color: t.color.text }]}>{deadlineSentence(del.data?.deletionEffectiveUtc, txt)}</Text>
        <OutlineButton label={txt.settingsSignOut} onPress={() => void signOut()} />
      </View>
    );
  }

  if (word === null) {
    return (
      <View style={{ marginTop: t.space[6] }}>
        <OutlineButton label={txt.settingsDeleteAccount} variant="muted" onPress={() => setWord('')} />
      </View>
    );
  }

  return (
    <View style={{ gap: t.space[4], marginTop: t.space[6] }}>
      <FormField
        label={txt.settingsDeleteConfirm(txt.settingsDeleteWord)}
        note={del.error ? deletionHint(del.error, txt) : txt.settingsDeleteHint}
        noteInvalid={!!del.error}
        value={word}
        onChangeText={setWord}
        // A hint to the on-screen keyboard and nothing else — hence the
        // comparison below ignores case and surrounding whitespace: on a
        // hardware keyboard, in the web or when pasting the button would
        // otherwise stay off without anything saying why.
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <OutlineButton
        label={del.isPending ? txt.settingsDeleteBusy : txt.settingsDeleteSubmit}
        onPress={() => del.mutate()}
        disabled={word.trim().toUpperCase() !== txt.settingsDeleteWord.toUpperCase() || del.isPending}
      />
      <OutlineButton label={txt.settingsCancel} variant="muted" onPress={close} />
    </View>
  );
}

/** The only place that says whose account you are looking at — and the caller for `GET /identity/me`. */
function Account() {
  const t = useTheme();
  const txt = useTexts();
  const { data: me } = useMe();

  return (
    <>
      <SectionHeading>{txt.settingsAccount}</SectionHeading>
      <View style={{ minHeight: t.hit, justifyContent: 'center' }}>
        <Text style={[t.font.body, { color: t.color.text }]}>{me?.displayName ?? '—'}</Text>
        <Text style={[t.font.micro, { color: t.color.textMuted }]}>{me?.email ?? ''}</Text>
      </View>
      <AccountDeletionSection />
    </>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const txt = useTexts();

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.tabMore}</Text>
      <Account />
      <SlotList />
      <DailyGoal />
      <MacroCalc />
      <HealthSection />
      <Appearance />
    </Screen>
  );
}
