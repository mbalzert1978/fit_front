import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen, SectionHeading, ValueField, Segmented, ListRow, OutlineButton, SquareIconButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts } from '../../src/i18n';
import { useRecipe, useSaveRecipe, useRecipeToDiary, useSlots, useProduct } from '../../src/api/hooks';
import { newId } from '../../src/api/ids';
import { ApiError } from '../../src/api/client';
import { problems } from '../../src/api/problems';
import { qk } from '../../src/api/queryKeys';
import { parseDiaryDate, today } from '../../src/api/diaryDate';
import type { Recipe, RecipeIngredient } from '../../src/api/types';
import type { DiaryDate } from '../../src/api/diaryDate';

type Draft = { name: string; portions: string; ingredients: RecipeIngredient[] };
type Totals = { grams: number; kcal: number; perPortionG: number; perPortionKcal: number; portions: number };

/** Makros je Portion stehen nur, solange der Entwurf dem Serverstand entspricht. */
function ComputedTotals({ totals, server, changed }: { totals: Totals; server?: Recipe; changed: boolean }) {
  const txt = useTexts();
  return (
    <>
      <SectionHeading>{txt.recipeComputed}</SectionHeading>
      <ListRow title={txt.recipeTotalGrams} value={`${totals.grams} g`} />
      <ListRow title={txt.recipeTotalKcal} value={`${totals.kcal} kcal`} />
      <ListRow title={txt.recipePerPortion} value={`${totals.perPortionG} g`} />
      <ListRow title={txt.recipePerPortion} value={`${totals.perPortionKcal} kcal`} />
      {server && !changed ? (
        <>
          <ListRow title={txt.recipeCarbsPerPortion} value={`${server.macrosPerPortion.carbsG} g`} />
          <ListRow title={txt.recipeProteinPerPortion} value={`${server.macrosPerPortion.proteinG} g`} />
          <ListRow title={txt.recipeFatPerPortion} value={`${server.macrosPerPortion.fatG} g`} />
        </>
      ) : null}
    </>
  );
}

/**
 * Speichern samt den beiden Ausgängen, die kein Erfolg sind.
 *
 * Ohne ETag wird gar nicht erst geschrieben: ein `PUT` ohne `If-Match`
 * überschriebe eine fremde, zwischenzeitlich gespeicherte Fassung lautlos.
 * Kommt der Konflikt vom Server, bleibt der Entwurf stehen und der Serverstand
 * wird nachgeladen — verloren geht nichts.
 */
function SaveRecipe({
  id,
  isNew,
  draft,
  etag,
  canSave,
  onReload,
}: {
  id: string;
  isNew: boolean;
  draft: Draft;
  etag?: string;
  canSave: boolean;
  onReload: () => void;
}) {
  const t = useTheme();
  const txt = useTexts();
  const qc = useQueryClient();
  const save = useSaveRecipe(id);
  const [hint, setHint] = useState<string | null>(null);
  const missingEtag = !isNew && !etag;

  async function submit() {
    setHint(null);
    try {
      const saved = await save.mutateAsync({
        id: isNew ? newId() : id,
        name: draft.name,
        portions: Number(draft.portions) || 1,
        ingredients: draft.ingredients.map((i) => ({ id: i.id, productId: i.productId, grams: i.grams })),
        etag,
      });
      onReload();
      router.replace({ pathname: '/recipe/[id]', params: { id: saved.id } });
    } catch (e) {
      const conflict = e instanceof ApiError && e.type === problems.concurrencyConflict;
      setHint(conflict ? txt.recipeConflict : txt.recipeSaveFailed);
      if (conflict) {
        onReload();
        qc.invalidateQueries({ queryKey: qk.recipe(id) });
      }
    }
  }

  const note = { color: t.color.accent, marginTop: t.space[3] };

  return (
    <View style={{ marginTop: t.space[8] }}>
      <OutlineButton label={txt.recipeSave} disabled={!canSave || save.isPending || missingEtag} onPress={submit} />
      {missingEtag ? <Text style={[t.font.micro, note]}>{txt.recipeNoEtag}</Text> : null}
      {hint ? <Text style={[t.font.micro, note]}>{hint}</Text> : null}
    </View>
  );
}

function AddToDiary({ recipeId, date, totals }: { recipeId: string; date: DiaryDate; totals: Totals }) {
  const t = useTheme();
  const txt = useTexts();
  const { data: slots } = useSlots();
  const toDiary = useRecipeToDiary(recipeId);
  const [unit, setUnit] = useState<'Portion' | 'Gram'>('Portion');
  const [amount, setAmount] = useState('1');
  const [slotId, setSlotId] = useState<string | null>(null);
  const n = Number(amount) || 0;

  useEffect(() => {
    if (!slotId && slots?.length) setSlotId(slots[0].id);
  }, [slots, slotId]);

  return (
    <>
      <SectionHeading>{txt.recipeToDiary}</SectionHeading>
      <Segmented
        options={[
          { value: 'Portion', label: txt.recipePortions },
          { value: 'Gram', label: txt.recipeGrams },
        ]}
        value={unit}
        onChange={setUnit}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[4], marginTop: t.space[4] }}>
        <ValueField value={amount} onChangeText={setAmount} unit={unit === 'Portion' ? '' : 'g'} />
        <Text style={[t.font.body, t.tabular, { color: t.color.textMuted }]}>
          {unit === 'Portion'
            ? `${Math.round(n * totals.perPortionG)} g · ${Math.round(n * totals.perPortionKcal)} kcal`
            : `${Math.round((n / Math.max(totals.grams, 1)) * totals.kcal)} kcal`}
        </Text>
      </View>
      <View style={{ marginTop: t.space[6] }}>
        {(slots ?? []).map((s) => (
          <ListRow key={s.id} title={s.name} value={s.id === slotId ? '✓' : ''} onPress={() => setSlotId(s.id)} />
        ))}
      </View>
      <View style={{ marginTop: t.space[6] }}>
        <OutlineButton
          label={txt.recipeToDiary}
          disabled={!slotId || toDiary.isPending}
          onPress={async () => {
            await toDiary.mutateAsync({ date, mealSlotId: slotId!, amount: n, unit });
            router.replace('/(tabs)/diary');
          }}
        />
      </View>
    </>
  );
}

export default function RecipeScreen() {
  const t = useTheme();
  const txt = useTexts();
  const params = useLocalSearchParams<{ id: string; addProductId?: string; date?: string }>();
  const isNew = params.id === 'neu';
  const date = params.date ? parseDiaryDate(params.date) : today();

  const { data: server } = useRecipe(params.id);
  const { data: addedProduct } = useProduct(params.addProductId ?? '');

  const [draft, setDraft] = useState<Draft>({ name: '', portions: '1', ingredients: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (server && !loaded) {
      setDraft({ name: server.name, portions: String(server.portions), ingredients: server.ingredients });
      setLoaded(true);
    }
  }, [server, loaded]);

  // Aus dem Scan zurückgekehrt: das erfasste Produkt wird Zutat des offenen Rezepts.
  useEffect(() => {
    if (!addedProduct) return;
    setDraft((d) =>
      d.ingredients.some((i) => i.productId === addedProduct.id)
        ? d
        : {
            ...d,
            ingredients: [
              ...d.ingredients,
              {
                id: newId(),
                productId: addedProduct.id,
                displayName: addedProduct.name,
                grams: 100,
                computedKcal: Math.round(addedProduct.nutrientsPer100g.kcal),
              },
            ],
          },
    );
  }, [addedProduct]);

  const totals = useMemo(() => {
    const grams = draft.ingredients.reduce((s, i) => s + i.grams, 0);
    const kcal = draft.ingredients.reduce((s, i) => s + i.computedKcal, 0);
    const portions = Math.max(Number(draft.portions) || 1, 1);
    return { grams, kcal, perPortionG: Math.round(grams / portions), perPortionKcal: Math.round(kcal / portions), portions };
  }, [draft]);

  // Vergleich gegen den zuletzt geladenen Serverstand: Name, Portionen, (Zutat, Gramm).
  const changed = useMemo(() => {
    if (isNew) return true;
    if (!server) return false;
    if (draft.name !== server.name) return true;
    if (Number(draft.portions) !== server.portions) return true;
    if (draft.ingredients.length !== server.ingredients.length) return true;
    return draft.ingredients.some((i, n) => i.productId !== server.ingredients[n].productId || i.grams !== server.ingredients[n].grams);
  }, [draft, server, isNew]);

  const hasIngredients = draft.ingredients.length > 0;

  const nameField = {
    color: t.color.text,
    backgroundColor: t.color.inputBg,
    borderWidth: 1,
    borderColor: t.color.neutral600,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space[3],
    minHeight: t.hit,
  };

  return (
    <Screen>
      <Text style={[t.font.label, { color: t.color.textMuted }]}>{txt.sourceRecipe}</Text>
      <TextInput
        value={draft.name}
        onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
        placeholder={txt.recipeName}
        placeholderTextColor={t.color.textMuted}
        style={[t.font.body, nameField, { marginTop: t.space[3] }]}
      />

      <SectionHeading>{txt.recipeIngredients}</SectionHeading>
      {draft.ingredients.map((i) => (
        <View
          key={i.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space[3],
            paddingVertical: t.space[3],
            borderBottomWidth: 1,
            borderBottomColor: t.color.divider,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[t.font.body, { color: t.color.text }]}>{i.displayName}</Text>
            <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted, marginTop: 2 }]}>{i.computedKcal} kcal</Text>
          </View>
          <ValueField
            value={String(i.grams)}
            unit="g"
            onChangeText={(v) =>
              setDraft((d) => ({
                ...d,
                ingredients: d.ingredients.map((x) => (x.id === i.id ? { ...x, grams: Number(v.replace(',', '.')) || 0 } : x)),
              }))
            }
          />
          <SquareIconButton
            glyph="−"
            label={txt.removeNamed(i.displayName)}
            onPress={() => setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((x) => x.id !== i.id) }))}
          />
        </View>
      ))}
      <View style={{ marginTop: t.space[6], gap: t.space[3] }}>
        <OutlineButton
          label={txt.recipeScanIngredient}
          onPress={() => router.push({ pathname: '/(tabs)/scan', params: { target: 'recipe', recipeId: params.id, date } })}
        />
        <Text style={[t.font.micro, { color: t.color.textMuted }]}>{txt.recipeIngredientsOnlyScanned}</Text>
      </View>

      <SectionHeading>{txt.recipePortioning}</SectionHeading>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[4] }}>
        <ValueField value={draft.portions} onChangeText={(portions) => setDraft((d) => ({ ...d, portions }))} />
        {hasIngredients ? (
          <Text style={[t.font.body, t.tabular, { color: t.color.textMuted }]}>{txt.recipePerPortionHint(totals.perPortionG)}</Text>
        ) : null}
      </View>

      {hasIngredients ? <ComputedTotals totals={totals} server={server} changed={changed} /> : null}

      {changed ? (
        <SaveRecipe
          id={params.id}
          isNew={isNew}
          draft={draft}
          etag={server?.etag}
          canSave={!!draft.name && hasIngredients}
          onReload={() => setLoaded(false)}
        />
      ) : (
        <AddToDiary recipeId={params.id} date={date} totals={totals} />
      )}
    </Screen>
  );
}
