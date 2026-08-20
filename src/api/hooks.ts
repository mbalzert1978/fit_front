import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiWithMeta, ApiError, endpoints, pathSegment, type ApiResponse } from './client';
import { qk } from './queryKeys';
import { newId } from './ids';
import { clientProblems } from './problems';
import { preferLanguage } from '../language';
import type { DiaryDate } from './diaryDate';
import type {
  AccountUser,
  DiaryDay,
  Goals,
  GoalsUpdate,
  HealthConsent,
  MealSlot,
  Preferences,
  Product,
  ProductCreate,
  RecentItem,
  Recipe,
  RecipeSave,
  SearchHit,
  PhotoJob,
} from './types';

/* Lesen */

export const useDiaryDay = (date: DiaryDate) =>
  useQuery({ queryKey: qk.diary(date), queryFn: () => api<DiaryDay>(endpoints.diaryDay(date)) });

export const useSlots = () => useQuery({ queryKey: qk.slots(), queryFn: () => api<MealSlot[]>('/diary/slots') });

export const useRecent = () => useQuery({ queryKey: qk.recent(), queryFn: () => api<RecentItem[]>('/diary/recent?take=10') });

export const useProduct = (id: string) =>
  useQuery({ queryKey: qk.product(id), queryFn: () => api<Product>(`/catalog/products/${pathSegment(id)}`), enabled: !!id });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: qk.search(query),
    queryFn: () => api<SearchHit[]>(`/search?query=${encodeURIComponent(query)}&take=20`),
    enabled: query.trim().length > 0,
  });

/** Solange Processing: alle 1,5 s erneut fragen, maximal 30 s (20 Versuche). */
export const usePhotoJob = (photoId: string, attempts: number) =>
  useQuery({
    queryKey: qk.photo(photoId),
    queryFn: () => api<PhotoJob>(endpoints.photo(photoId)),
    refetchInterval: (q) => (q.state.data?.status === 'Processing' && attempts < 20 ? 1500 : false),
  });

export const useRecipes = () => useQuery({ queryKey: qk.recipes(), queryFn: () => api<Recipe[]>('/recipes?sort=name_desc') });

/**
 * Der ETag steht im gleichnamigen Header, nicht im Rumpf. Er wird ans Rezept
 * geheftet, weil genau von dort das Speichern ihn als `If-Match` wieder aufnimmt.
 */
const withEtag = (r: ApiResponse<Recipe>): Recipe => ({ ...r.data, etag: r.headers.get('ETag') ?? undefined });

export const useRecipe = (id: string) =>
  useQuery({
    queryKey: qk.recipe(id),
    queryFn: () => apiWithMeta<Recipe>(`/recipes/${pathSegment(id)}`).then(withEtag),
    enabled: id !== 'neu',
  });

/**
 * Wer angemeldet ist. Nach einem Kaltstart weiß die App sonst nichts über ihren
 * Nutzer — sie hat eine Sitzung im Gerät, aber keinen Namen dazu. `/identity/me`
 * ist der einzige Weg zum Konto, den diese API kennt; eine Id im Pfad gäbe es
 * nicht, weil kein Screen ein fremdes Konto liest.
 */
export const useMe = () => useQuery({ queryKey: qk.me(), queryFn: () => api<AccountUser>('/identity/me') });

export const useGoals = () => useQuery({ queryKey: qk.goals(), queryFn: () => api<Goals>('/goals') });

/**
 * Die Einstellungen — und mit ihnen die Sprache, in der der Nutzer lesen will.
 * Sie geht an die Naht weiter, sobald sie da ist: von dort füllt sie
 * `Accept-Language` an jeder folgenden Anfrage, und die Sätze des Servers
 * kommen so, wie der Nutzer sie gewählt hat, nicht wie sein Telefon steht.
 */
export const usePreferences = () =>
  useQuery({
    queryKey: qk.preferences(),
    queryFn: async () => {
      const p = await api<Preferences>('/preferences');
      preferLanguage(p.language);
      return p;
    },
  });

export const useHealthConsent = () => useQuery({ queryKey: ['health', 'consent'], queryFn: () => api<HealthConsent>('/health/consent') });

/* Schreiben */

export function useAddEntry(date: DiaryDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: string; mealSlotId: string; sourceType: 'Product' | 'Recipe'; sourceId: string; grams: number }) =>
      api(endpoints.entries(date), { method: 'POST', body, idempotencyKey: body.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.diary(date) });
      qc.invalidateQueries({ queryKey: qk.recent() });
    },
  });
}

export function useUpdateEntry(date: DiaryDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, grams }: { entryId: string; grams: number }) =>
      api(`${endpoints.entries(date)}/${pathSegment(entryId)}`, { method: 'PATCH', body: { grams } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diary(date) }),
  });
}

export function useMoveEntry(date: DiaryDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, mealSlotId }: { entryId: string; mealSlotId: string }) =>
      api(`${endpoints.entries(date)}/${pathSegment(entryId)}/slot`, { method: 'PATCH', body: { mealSlotId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diary(date) }),
  });
}

export function useDeleteEntry(date: DiaryDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => api(`${endpoints.entries(date)}/${pathSegment(entryId)}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diary(date) }),
  });
}

export function useSaveGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GoalsUpdate) => api<Goals>('/goals', { method: 'PUT', body }),
    onSuccess: (g) => {
      qc.setQueryData(qk.goals(), g);
      qc.invalidateQueries({ queryKey: ['diary'] });
    },
  });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Preferences>) => api<Preferences>('/preferences', { method: 'PATCH', body }),
    // Die Antwort trägt die Sprache, die jetzt gilt — nicht die, die geschickt
    // wurde. Ab hier fragt der Client in ihr, und zwar sofort: sonst käme der
    // nächste Fehler noch in der alten Sprache, unmittelbar nach einer
    // Umstellung, die der Nutzer eben vorgenommen hat.
    onSuccess: (p) => {
      preferLanguage(p.language);
      qc.setQueryData(qk.preferences(), p);
    },
  });
}

export function useSlotMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: qk.slots() });
  return {
    add: useMutation({
      // Die Client-Id ist zugleich der Idempotency-Key: derselbe Slot entsteht
      // auch dann genau einmal, wenn die Anfrage ein zweites Mal hinausgeht.
      mutationFn: (b: { id: string; name: string }) => api('/diary/slots', { method: 'POST', body: b, idempotencyKey: b.id }),
      onSuccess: done,
    }),
    rename: useMutation({
      mutationFn: (b: { id: string; name: string }) =>
        api(`/diary/slots/${pathSegment(b.id)}`, { method: 'PATCH', body: { name: b.name } }),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/diary/slots/${pathSegment(id)}`, { method: 'DELETE' }),
      onSuccess: done,
    }),
  };
}

export function useSaveRecipe(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RecipeSave) => {
      if (id === 'neu') {
        return apiWithMeta<Recipe>('/recipes', { method: 'POST', body, idempotencyKey: body.id }).then(withEtag);
      }
      // Ohne ETag kein bedingtes Speichern. Ein `PUT` ohne `If-Match` überschreibt
      // eine fremde, zwischenzeitlich gespeicherte Fassung lautlos — lieber hier
      // scheitern und neu laden lassen als dort Arbeit verlieren.
      if (!body.etag) {
        throw new ApiError({ type: clientProblems.preconditionRequired, title: 'Rezept neu laden und erneut speichern', status: 428 });
      }
      return apiWithMeta<Recipe>(`/recipes/${pathSegment(id)}`, { method: 'PUT', body, ifMatch: body.etag }).then(withEtag);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recipes() }),
  });
}

export function useRecipeToDiary(recipeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { date: DiaryDate; mealSlotId: string; amount: number; unit: 'Portion' | 'Gram' }) =>
      // Der Schlüssel entsteht einmal je Auslösung und bleibt über eine
      // Wiederholung derselben Anfrage hinweg derselbe. Ohne ihn dürfte die
      // Hülle nach einer Erneuerung nicht wiederholen — und mit ihm legt auch
      // eine doppelt zugestellte Anfrage die Portionen nur einmal ins Tagebuch.
      api(`/recipes/${pathSegment(recipeId)}/portions-to-diary`, { method: 'POST', body: b, idempotencyKey: newId() }),
    onSuccess: (_d, b) => qc.invalidateQueries({ queryKey: qk.diary(b.date) }),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreate) => api<Product>('/catalog/products', { method: 'POST', body, idempotencyKey: body.id }),
    onSuccess: (p) => qc.setQueryData(qk.product(p.id), p),
  });
}
