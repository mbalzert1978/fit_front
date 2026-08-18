import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, ListRow, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useRecipes } from '../../src/api/hooks';

export default function RecipesScreen() {
  const t = useTheme();
  const { data: recipes, isSuccess } = useRecipes();
  const empty = isSuccess && (recipes ?? []).length === 0;

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Rezepte</Text>

      {empty ? (
        <Text style={[t.font.body, { color: t.color.textMuted, marginTop: t.space[6] }]}>
          Zutaten einzeln erfassen — die App summiert die Mengen und rechnet Gramm und Nährwerte pro Portion aus.
        </Text>
      ) : (
        <View style={{ marginTop: t.space[6] }}>
          {(recipes ?? []).map((r) => (
            <ListRow
              key={r.id}
              title={r.name}
              subtitle={`${r.portions} Portionen · ${r.gramsPerPortion} g · ${r.kcalPerPortion} kcal je Portion`}
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}
            />
          ))}
        </View>
      )}

      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton label="Neues Rezept anlegen" onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: 'neu' } })} />
      </View>
    </Screen>
  );
}
