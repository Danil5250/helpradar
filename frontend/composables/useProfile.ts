import type { Profile, ProfilePayload, ProfileUpdated, PublicProfile } from '~/types/profile';

export const useProfile = () => ({
  get: (): Promise<Profile> => apiFetch<Profile>('/profile'),

  update: (payload: ProfilePayload): Promise<ProfileUpdated> => apiFetch<ProfileUpdated>('/profile', { method: 'PATCH', body: payload }),

  confirmEmail: (token: string): Promise<{ code: string; message: string }> =>
    apiFetch('/profile/confirm-email', { method: 'POST', body: { token } }),

  publicProfile: (id: number | string): Promise<PublicProfile> => apiFetch<PublicProfile>(`/users/${id}`),
});
