import type { HelpAction, HelpConnection, HelpOverview } from '~/types/help';

export const useHelp = () => ({
  mine: async (): Promise<HelpConnection[]> => (await apiFetch<{ items: HelpConnection[] }>('/help')).items,
  overview: (id: number): Promise<HelpOverview> => apiFetch(`/announcements/${id}/help`),
  respond: (id: number): Promise<HelpConnection> => apiFetch(`/announcements/${id}/respond`, { method: 'POST' }),
  requestHelp: (offerId: number, requestId: number): Promise<HelpConnection> =>
    apiFetch(`/announcements/${offerId}/request-help`, { method: 'POST', body: { requestId } }),
  act: (id: number, action: HelpAction): Promise<HelpConnection> => apiFetch(`/help/${id}/${action}`, { method: 'POST' }),
});
