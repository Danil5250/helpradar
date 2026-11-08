import type { AnnouncementSharing, ShareableAnnouncement, SocialChannel } from '~/types/sharing';

export const SOCIAL_CHANNELS: readonly SocialChannel[] = ['telegram', 'whatsapp', 'viber', 'x', 'facebook', 'email'];

export function announcementShareUrl(origin: string, id: number): string {
  const url = new URL(`/main/announcement/${id}`, origin);
  if (!['http:', 'https:'].includes(url.protocol) || !Number.isSafeInteger(id) || id < 1) throw new Error('Invalid announcement URL');
  return url.href;
}

export function announcementSharing(announcement: ShareableAnnouncement, origin: string): AnnouncementSharing {
  return {
    id: announcement.id,
    title: announcement.title,
    type: announcement.type,
    category: { id: announcement.category.id, name: announcement.category.name },
    url: announcementShareUrl(origin, announcement.id),
    imageUrl: new URL('/images/share-card.png', origin).href,
  };
}

export function socialShareUrl(channel: SocialChannel, url: string, title: string, text: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const message = encodeURIComponent(`${text}\n${url}`);
  switch (channel) {
    case 'telegram': return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    case 'whatsapp': return `https://wa.me/?text=${message}`;
    case 'viber': return `viber://forward?text=${encodeURIComponent(`${url}\n${Array.from(text).slice(0, 100).join('')}`)}`;
    case 'x': return `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(Array.from(text).slice(0, 110).join(''))}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'email': return `mailto:?subject=${encodeURIComponent(title)}&body=${message}`;
  }
}

export function escapeShareHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function shareHeadTags(data: { title: string; description: string; url: string; imageUrl: string }): string[] {
  const title = escapeShareHtml(`${data.title} - HelpRadar`);
  const description = escapeShareHtml(data.description);
  const url = escapeShareHtml(data.url);
  const image = escapeShareHtml(data.imageUrl);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="article">',
    '<meta property="og:site_name" content="HelpRadar">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
  ];
}
