import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiWithMeta, ApiError, endpoints, pathSegment, type ApiResponse } from './client';
import { qk } from './queryKeys';
import { newId, NEW_RECIPE_ID } from './ids';
import { clientProblems } from './problems';
import { preferLanguage } from '../language';
import { texts } from '../i18n';
import type { DiaryDate } from './diaryDate';
import type {
  AccountDeletion,
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

/* Reading */

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

/** While Processing: ask again every 1.5 s, at most 30 s (20 attempts). */
export const usePhotoJob = (photoId: string, attempts: number) =>
  useQuery({
    queryKey: qk.photo(photoId),
    queryFn: () => api<PhotoJob>(endpoints.photo(photoId)),
    refetchInterval: (q) => (q.state.data?.status === 'Processing' && attempts < 20 ? 1500 : false),
  });

export const useRecipes = () => useQuery({ queryKey: qk.recipes(), queryFn: () => api<Recipe[]>('/recipes?sort=name_desc') });

/** Pinned to the recipe, because saving picks it up again as `If-Match` from there. */
const withEtag = (r: ApiResponse<Recipe>): Recipe => ({ ...r.data, etag: r.headers.get('ETag') ?? undefined });

export const useRecipe = (id: string) =>
  useQuery({
    queryKey: qk.recipe(id),
    queryFn: () => apiWithMeta<Recipe>(`/recipes/${pathSegment(id)}`).then(withEtag),
    enabled: id !== NEW_RECIPE_ID,
  });

/**
 * Who is signed in — after a cold start the device holds a session but no name.
 * There is no id in the path: no screen reads someone else's account.
 */
export const useMe = () => useQuery({ queryKey: qk.me(), queryFn: () => api<AccountUser>('/identity/me') });

export const useGoals = () => useQuery({ queryKey: qk.goals(), queryFn: () => api<Goals>('/goals') });

/**
 * The preferences, and with them the chosen language: passed on to the seam as
 * soon as it is there, so `Accept-Language` follows the choice and not the
 * phone.
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

/* Writing */

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
    // The language that applies now, not the one that was sent — and it takes
    // effect at once, so the next error does not arrive in the old language.
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
      // The client id is at the same time the idempotency key: a request
      // delivered twice must not yield two slots.
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
      if (id === NEW_RECIPE_ID) {
        return apiWithMeta<Recipe>('/recipes', { method: 'POST', body, idempotencyKey: body.id }).then(withEtag);
      }
      // No ETag, no save: a `PUT` without `If-Match` silently overwrites a
      // version saved in the meantime.
      if (!body.etag) {
        throw new ApiError({ type: clientProblems.preconditionRequired, title: texts().errorStaleRecipe, status: 428 });
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
      // Without a key the wrapper may not repeat after a renewal — and with it
      // a request delivered twice still puts the portions in once.
      api(`/recipes/${pathSegment(recipeId)}/portions-to-diary`, { method: 'POST', body: b, idempotencyKey: newId() }),
    onSuccess: (_d, b) => qc.invalidateQueries({ queryKey: qk.diary(b.date) }),
  });
}

/**
 * Delete one's own account: no `Idempotency-Key`, no cache reset, no sign-out
 * (`docs/decisions/2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`); key and `gcTime` keep the deadline past an unmount
 * (`docs/decisions/2026-08-21-2200-die-frist-lebt-im-cache-und-haengt-am-rumpf.md`).
 */
export const useDeleteAccount = () =>
  useMutation({
    mutationKey: qk.accountDeletion(),
    gcTime: Infinity,
    mutationFn: () => api<AccountDeletion>('/identity/me', { method: 'DELETE' }),
  });

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreate) => api<Product>('/catalog/products', { method: 'POST', body, idempotencyKey: body.id }),
    onSuccess: (p) => qc.setQueryData(qk.product(p.id), p),
  });
}
