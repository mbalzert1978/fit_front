import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, CameraFrame, SectionHeading, ListRow, SquareIconButton, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { api, ApiError, endpoints } from '../../src/api/client';
import { useRecent, useSearch } from '../../src/api/hooks';
import { today, parseDiaryDate, type DiaryDate } from '../../src/api/diaryDate';
import { ctxParams } from '../../src/nav';
import type { Product } from '../../src/api/types';

export default function ScanScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ date?: string; slotId?: string; target?: 'diary' | 'recipe'; recipeId?: string }>();
  const date: DiaryDate = params.date ? parseDiaryDate(params.date) : today();
  const target = params.target ?? 'diary';

  const [permission, requestPermission] = useCameraPermissions();
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const lock = useRef(false);

  const { data: recent } = useRecent();
  const { data: results } = useSearch(debounced);

  // Ergebnisse erst bei Eingabe, mit 300 ms Verzögerung.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const ctx = { date, slotId: params.slotId, target, recipeId: params.recipeId } as const;

  async function onBarcode(ean: string) {
    if (lock.current) return;
    lock.current = true;
    setPaused(true); // verhindert Mehrfachauslösung, bis der Nutzer zurückkehrt
    try {
      const product = await api<Product>(endpoints.productByBarcode(ean));
      router.push({ pathname: '/product/[id]', params: { id: product.id, ...ctxParams(ctx) } });
    } catch (e) {
      if (e instanceof ApiError && e.type === 'product-not-found') {
        router.push({ pathname: '/capture/not-found', params: { ...ctxParams({ ...ctx, barcode: ean }) } });
      }
    } finally {
      setTimeout(() => {
        lock.current = false;
        setPaused(false);
      }, 1200);
    }
  }

  return (
    <Screen>
      <CameraFrame scanline hint={target === 'recipe' ? 'ZUTAT SCANNEN — BARCODE IN DEN RAHMEN HALTEN' : 'BARCODE IN DEN RAHMEN HALTEN'}>
        {permission?.granted && !paused ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => onBarcode(data)}
          />
        ) : null}
      </CameraFrame>

      {!permission?.granted ? (
        <View style={{ marginTop: t.space[4] }}>
          <OutlineButton label="Kamera freigeben" onPress={requestPermission} />
        </View>
      ) : null}

      <SectionHeading>Suche</SectionHeading>
      <View
        style={{
          borderWidth: 1,
          borderColor: t.color.neutral600,
          borderRadius: t.radius.md,
          backgroundColor: t.color.inputBg,
          minHeight: t.hit,
          justifyContent: 'center',
          paddingHorizontal: t.space[3],
        }}
      >
        <Text style={[t.font.body, { color: query ? t.color.text : t.color.textMuted }]} onPress={() => {}}>
          {query || 'Produkt, Marke oder Rezept'}
        </Text>
      </View>

      {(results?.items ?? []).map((hit) => (
        <ListRow
          key={`${hit.sourceType}-${hit.id}`}
          title={hit.displayName}
          subtitle={hit.metaLine}
          onPress={() =>
            router.push(
              hit.sourceType === 'Product'
                ? { pathname: '/product/[id]', params: { id: hit.id, ...ctxParams(ctx) } }
                : { pathname: '/recipe/[id]', params: { id: hit.id, ...ctxParams(ctx) } },
            )
          }
        />
      ))}

      <SectionHeading>Letzte Einträge</SectionHeading>
      {(recent ?? []).map((r) => (
        <ListRow
          key={`${r.sourceType}-${r.sourceId}`}
          title={r.displayName}
          subtitle={`${r.sourceType === 'Product' ? 'Produkt' : 'Rezept'} · ${r.lastGrams} g · ${r.kcalPerPortion} kcal`}
          right={
            <SquareIconButton
              glyph="+"
              label={`${r.displayName} hinzufügen`}
              onPress={() =>
                router.push(
                  r.sourceType === 'Product'
                    ? { pathname: '/product/[id]', params: { id: r.sourceId, ...ctxParams(ctx) } }
                    : { pathname: '/recipe/[id]', params: { id: r.sourceId, ...ctxParams(ctx) } },
                )
              }
            />
          }
        />
      ))}
    </Screen>
  );
}
