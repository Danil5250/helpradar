import type { ShareChannel } from '~/types/sharing';

export const useSharing = () => ({
  record: (id: number, channel: ShareChannel): Promise<{ code: string }> => apiFetch(`/announcements/${id}/shares`, { method: 'POST', body: { channel } }),
});
