import { describe, expect, it, vi } from 'vitest';
import { announcementSharing, shareHeadTags, shareWithFallback, socialShareUrl } from '~/utils/sharing';

const announcement = {
  id: 42,
  title: 'Need <help>',
  description: 'Bring food and warm clothes.\nPlease call first.',
  category: { id: 1, name: 'Food' },
  type: 'HelpRequest' as const,
  status: 'Active' as const,
};

describe('sharing acceptance criteria', () => {
  it('opens the native share dialog immediately with the specific public request URL', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const fallback = vi.fn();
    const preview = announcementSharing(announcement, 'https://helpradar.example');
    const pending = shareWithFallback({ title: preview.title, text: preview.description, url: preview.url }, share, fallback);
    expect(share).toHaveBeenCalledWith({
      title: announcement.title,
      text: 'Bring food and warm clothes. Please call first.',
      url: 'https://helpradar.example/main/announcement/42',
    });
    expect(await pending).toBe(true);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('shows platform options when the native API is unavailable or fails', async () => {
    const fallback = vi.fn();
    expect(await shareWithFallback({ url: 'https://helpradar.example/main/announcement/42' }, undefined, fallback)).toBe(false);
    expect(fallback).toHaveBeenCalledOnce();
    await shareWithFallback({}, vi.fn().mockRejectedValue(new Error('Unavailable')), fallback);
    expect(fallback).toHaveBeenCalledTimes(2);
  });

  it('does not open a second dialog after the user cancels native sharing', async () => {
    const fallback = vi.fn();
    await shareWithFallback({}, vi.fn().mockRejectedValue({ name: 'AbortError' }), fallback);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('puts the actual request description, rather than its category, in escaped social metadata', () => {
    const preview = announcementSharing(announcement, 'https://helpradar.example');
    const tags = shareHeadTags(preview).join('\n');
    expect(tags).toContain('content="Need &lt;help&gt; - HelpRadar"');
    expect(tags).toContain('property="og:description" content="Bring food and warm clothes. Please call first."');
    expect(tags).toContain('name="twitter:description" content="Bring food and warm clothes. Please call first."');
    expect(tags).not.toContain('content="Food"');
    expect(announcementSharing({ ...announcement, description: 'x'.repeat(300) }, 'https://helpradar.example').description).toHaveLength(160);
  });

  it.each(['telegram', 'viber', 'x'] as const)('prefills the specific request link for %s', (channel) => {
    const url = 'https://helpradar.example/main/announcement/42';
    expect(decodeURIComponent(socialShareUrl(channel, url, announcement.title, 'Help nearby'))).toContain(url);
  });
});
