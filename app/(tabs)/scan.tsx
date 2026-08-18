import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, CameraFrame, SectionHeading, ListRow, SquareIconButton, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { api, ApiError, endpoints } from '../../src/api/client';
import { useRecent, useSearch } from '../../src/api/hooks';
import { today, parseDiaryDate, type DiaryDate } from '../../src/api/diaryDate';
import { ctxParams, type CaptureContext } from '../../src/nav';
import type { Product } from '../../src/api/types';

function SearchResults({ query, ctx }: { query: string; ctx: CaptureContext }) {
  const { data: results } = useSearch(query);

  return (
    <>
      {(results ?? []).map((hit) => (
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
    </>
  );
}

function RecentList({ ctx }: { ctx: CaptureContext }) {
  const { data: recent } = useRecent();

  return (
    <>
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
    </>
  );
}

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
  const granted = !!permission?.granted;

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
        {granted && !paused ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => onBarcode(data)}
          />
        ) : null}
      </CameraFrame>

      {!granted ? (
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
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Produkt, Marke oder Rezept"
          placeholderTextColor={t.color.textMuted}
          style={[t.font.body, { color: t.color.text }]}
        />
      </View>

      <SearchResults query={debounced} ctx={ctx} />

      <SectionHeading>Letzte Einträge</SectionHeading>
      <RecentList ctx={ctx} />
    </Screen>
  );
}
