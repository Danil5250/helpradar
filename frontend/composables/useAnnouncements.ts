import type {
  AnnouncementDetails,
  AnnouncementPage,
  AnnouncementPayload,
  AnnouncementSort,
  Category,
  OwnAnnouncementItem,
  Photo,
  PlaceSuggestion,
} from '~/types/announcement';

interface ActionResult {
  code: string;
  message: string;
  announcement: AnnouncementDetails;
}

export const useAnnouncements = () => ({
  categories: async (): Promise<Category[]> => (await apiFetch<{ items: Category[] }>('/categories')).items,

  list: (query: { page?: number; sort?: AnnouncementSort; lat?: number; lng?: number }): Promise<AnnouncementPage> =>
    apiFetch<AnnouncementPage>('/announcements', { query }),

  mine: async (): Promise<OwnAnnouncementItem[]> =>
    (await apiFetch<{ items: OwnAnnouncementItem[] }>('/announcements/mine')).items,

  get: async (id: number | string): Promise<AnnouncementDetails> =>
    (await apiFetch<{ announcement: AnnouncementDetails }>(`/announcements/${id}`)).announcement,

  create: (payload: AnnouncementPayload): Promise<ActionResult> =>
    apiFetch<ActionResult>('/announcements', { method: 'POST', body: payload }),

  update: (id: number, payload: Partial<AnnouncementPayload>): Promise<ActionResult> =>
    apiFetch<ActionResult>(`/announcements/${id}`, { method: 'PATCH', body: payload }),

  close: (id: number): Promise<ActionResult> => apiFetch<ActionResult>(`/announcements/${id}/close`, { method: 'POST' }),

  extend: (id: number, days?: number): Promise<ActionResult> =>
    apiFetch<ActionResult>(`/announcements/${id}/extend`, { method: 'POST', body: days ? { days } : {} }),

  republish: (id: number, expiryDays?: number): Promise<ActionResult> =>
    apiFetch<ActionResult>(`/announcements/${id}/republish`, { method: 'POST', body: expiryDays ? { expiryDays } : {} }),

  remove: (id: number): Promise<{ code: string; message: string }> =>
    apiFetch(`/announcements/${id}`, { method: 'DELETE' }),

  addPhoto: async (id: number, file: File): Promise<Photo> => {
    const body = new FormData();
    body.append('photo', file);
    return (await apiFetch<{ photo: Photo }>(`/announcements/${id}/photos`, { method: 'POST', body })).photo;
  },

  removePhoto: (id: number, photoId: number): Promise<{ code: string }> =>
    apiFetch(`/announcements/${id}/photos/${photoId}`, { method: 'DELETE' }),

  searchAddress: async (q: string): Promise<PlaceSuggestion[]> =>
    (await apiFetch<{ items: PlaceSuggestion[] }>('/geocoding/search', { query: { q } })).items,

  reverseGeocode: async (lat: number, lng: number): Promise<PlaceSuggestion | null> =>
    (await apiFetch<{ place: PlaceSuggestion | null }>('/geocoding/reverse', { query: { lat, lng } })).place,
});
