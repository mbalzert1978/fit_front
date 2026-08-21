import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, ListRow, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts } from '../../src/i18n';
import { useRecipes } from '../../src/api/hooks';
import { NEW_RECIPE_ID } from '../../src/api/ids';

export default function RecipesScreen() {
  const t = useTheme();
  const txt = useTexts();
  const { data: recipes, isSuccess } = useRecipes();
  const empty = isSuccess && (recipes ?? []).length === 0;

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.tabRecipes}</Text>

      {empty ? (
        <Text style={[t.font.body, { color: t.color.textMuted, marginTop: t.space[6] }]}>{txt.recipesEmpty}</Text>
      ) : (
        <View style={{ marginTop: t.space[6] }}>
          {(recipes ?? []).map((r) => (
            <ListRow
              key={r.id}
              title={r.name}
              subtitle={txt.recipesLine(r.portions, r.gramsPerPortion, r.kcalPerPortion)}
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}
            />
          ))}
        </View>
      )}

      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton label={txt.recipesNew} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: NEW_RECIPE_ID } })} />
      </View>
    </Screen>
  );
}
