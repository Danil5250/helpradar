import { getRequestURL } from 'h3';
import { announcementSharing, shareHeadTags } from '../../utils/sharing';
import type { AnnouncementDetails } from '../../types/announcement';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html, { event }) => {
    const requestUrl = getRequestURL(event);
    const match = requestUrl.pathname.match(/^\/main\/announcement\/([1-9]\d*)\/?$/);
    if (!match) return;
    const config = useRuntimeConfig(event);
    try {
      // fetch the public announcement without forwarding the visitor's session.
      const { announcement } = await $fetch<{ announcement: AnnouncementDetails }>(`${config.apiBase}/api/announcements/${match[1]}`, { timeout: 2000 });
      if (announcement.status === 'Hidden' || announcement.status === 'Deleted') return;
      const preview = announcementSharing(announcement, requestUrl.origin);
      html.head = html.head.map((tag) => tag.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, ''));
      html.head.push(...shareHeadTags({ ...preview, description: preview.category.name }));
    } catch {
      // keep the page available when the API is temporarily unreachable.
    }
  });
});
