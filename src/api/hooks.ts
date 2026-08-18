import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from './client';
import { qk } from './queryKeys';
import type { DiaryDate } from './diaryDate';
import type {
  DiaryDay, Goals, HealthConsent, MealSlot, Preferences, Product, RecentItem,
  Recipe, SearchHit, PhotoJob,
} from './types';

/* Lesen */

export const useDiaryDay = (date: DiaryDate) =>
  useQuery({ queryKey: qk.diary(date), queryFn: () => api<DiaryDay>(endpoints.diaryDay(date)) });

export const useSlots = () => useQuery({ queryKey: qk.slots(), queryFn: () => api<MealSlot[]>('/diary/slots') });

export const useRecent = () => useQuery({ queryKey: qk.recent(), queryFn: () => api<RecentItem[]>('/diary/recent?take=10') });

export const useProduct = (id: string) =>
  useQuery({ queryKey: qk.product(id), queryFn: () => api<Product>(`/catalog/products/${id}`), enabled: !!id });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: qk.search(query),
    queryFn: () => api<{ items: SearchHit[] }>(`/search?query=${encodeURIComponent(query)}&take=20`),
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

export const useRecipe = (id: string) =>
  useQuery({ queryKey: qk.recipe(id), queryFn: () => api<Recipe>(`/recipes/${id}`), enabled: id !== 'neu' });

export const useGoals = () => useQuery({ queryKey: qk.goals(), queryFn: () => api<Goals>('/goals') });

export const usePreferences = () => useQuery({ queryKey: qk.preferences(), queryFn: () => api<Preferences>('/preferences') });

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
      api(`${endpoints.entries(date)}/${entryId}`, { method: 'PATCH', body: { grams } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diary(date) }),
  });
}

export function useMoveEntry(date: DiaryDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, mealSlotId }: { entryId: string; mealSlotId: string }) =>
      api(`${endpoints.entries(date)}/${entryId}/slot`, { method: 'PATCH', body: { mealSlotId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diary(date) }),
  });
}

export function useDeleteEntry(date: DiaryDate) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => api(`${endpoints.entries(date)}/${entryId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.diary(date) }),
  });
}

export function useSaveGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Goals> | Record<string, unknown>) => api<Goals>('/goals', { method: 'PUT', body }),
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
    onSuccess: (p) => qc.setQueryData(qk.preferences(), p),
  });
}

export function useSlotMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: qk.slots() });
  return {
    add: useMutation({ mutationFn: (b: { id: string; name: string }) => api('/diary/slots', { method: 'POST', body: b }), onSuccess: done }),
    rename: useMutation({ mutationFn: (b: { id: string; name: string }) => api(`/diary/slots/${b.id}`, { method: 'PATCH', body: { name: b.name } }), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => api(`/diary/slots/${id}`, { method: 'DELETE' }), onSuccess: done }),
  };
}

export function useSaveRecipe(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { id: string; name: string; portions: number; ingredients: { id: string; productId: string; grams: number }[]; etag?: string }) =>
      id === 'neu'
        ? api<Recipe>('/recipes', { method: 'POST', body, idempotencyKey: body.id })
        : api<Recipe>(`/recipes/${id}`, { method: 'PUT', body, ifMatch: body.etag }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.recipes() }),
  });
}

export function useRecipeToDiary(recipeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { date: DiaryDate; mealSlotId: string; amount: number; unit: 'Portion' | 'Gram' }) =>
      api(`/recipes/${recipeId}/portions-to-diary`, { method: 'POST', body: b, idempotencyKey: undefined }),
    onSuccess: (_d, b) => qc.invalidateQueries({ queryKey: qk.diary(b.date) }),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown> & { id: string }) =>
      api<Product>('/catalog/products', { method: 'POST', body, idempotencyKey: body.id }),
    onSuccess: (p) => qc.setQueryData(qk.product(p.id), p),
  });
}
