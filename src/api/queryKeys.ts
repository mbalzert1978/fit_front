import type { DiaryDate } from './diaryDate';

export const qk = {
  me: () => ['me'] as const,
  diary: (date: DiaryDate) => ['diary', date] as const,
  recent: () => ['diary', 'recent'] as const,
  slots: () => ['slots'] as const,
  product: (id: string) => ['product', id] as const,
  search: (query: string) => ['search', query] as const,
  photo: (photoId: string) => ['photo', photoId] as const,
  recipes: () => ['recipes'] as const,
  recipe: (id: string) => ['recipe', id] as const,
  goals: () => ['goals'] as const,
  preferences: () => ['preferences'] as const,
  activity: (date: DiaryDate) => ['activity', date] as const,
  accountDeletion: () => ['accountDeletion'] as const,
};
