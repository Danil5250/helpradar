import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEvent } from 'h3';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function renderSharingPage(status = 'Active') {
  let render: (html: { head: string[] }, context: { event: object }) => Promise<void> = async () => {};
  vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin);
  vi.stubGlobal('useRuntimeConfig', () => ({ apiBase: 'http://api.example' }));
  const fetch = vi.fn().mockResolvedValue({
    announcement: {
      id: 42,
      title: 'Request title',
      description: 'Actual short request description.',
      status,
      type: 'HelpRequest',
      category: { id: 1, name: 'Food' },
    },
  });
  vi.stubGlobal('$fetch', fetch);
  const { default: plugin } = await import('../server/plugins/announcement-sharing');
  (plugin as unknown as (app: object) => void)({
    hooks: {
      hook: (_name: string, callback: typeof render) => {
        render = callback;
      },
    },
  });
  const html = { head: ['<title>HelpRadar</title>'] };
  const request = new IncomingMessage(new Socket());
  request.url = '/main/announcement/42';
  request.headers.host = 'helpradar.example';
  await render(html, { event: createEvent(request, new ServerResponse(request)) });
  return { head: html.head.join('\n'), fetch };
}

describe('request link previews rendered for social crawlers', () => {
  it.each(['Active', 'Resolved'])('renders the title and actual description for a public %s request', async (status) => {
    const { head, fetch } = await renderSharingPage(status);
    expect(head).toContain('property="og:title" content="Request title - HelpRadar"');
    expect(head).toContain('property="og:description" content="Actual short request description."');
    expect(head).toContain('name="twitter:description" content="Actual short request description."');
    expect(head.match(/<title>/g)).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith('http://api.example/api/announcements/42', { timeout: 2000 });
  });

  it.each(['Hidden', 'Deleted'])('does not disclose metadata for a %s request', async (status) => {
    const { head } = await renderSharingPage(status);
    expect(head).toBe('<title>HelpRadar</title>');
  });
});
