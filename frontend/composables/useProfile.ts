import type { Profile, ProfilePayload, ProfileUpdated, PublicProfile, Review, ReviewPage, ReviewPayload, ReviewSort } from '~/types/profile';

interface ReviewSaved {
  code: string;
  message: string;
  comment: Review;
}

export const useProfile = () => ({
  get: (): Promise<Profile> => apiFetch<Profile>('/profile'),

  update: (payload: ProfilePayload): Promise<ProfileUpdated> => apiFetch<ProfileUpdated>('/profile', { method: 'PATCH', body: payload }),

  uploadAvatar: (file: File): Promise<{ code: string; avatarUrl: string }> => {
    const body = new FormData();
    body.append('avatar', file);
    return apiFetch('/profile/avatar', { method: 'POST', body });
  },

  confirmEmail: (token: string): Promise<{ code: string; message: string }> =>
    apiFetch('/profile/confirm-email', { method: 'POST', body: { token } }),

  publicProfile: (id: number | string): Promise<PublicProfile> => apiFetch<PublicProfile>(`/users/${id}`),

  reviews: (userId: number | string, query: { page?: number; sort?: ReviewSort }): Promise<ReviewPage> =>
    apiFetch<ReviewPage>(`/users/${userId}/comments`, { query }),

  leaveReview: (announcementId: number, payload: ReviewPayload): Promise<ReviewSaved> =>
    apiFetch<ReviewSaved>(`/announcements/${announcementId}/comments`, { method: 'POST', body: payload }),
});
