import { describe, expect, it } from 'vitest';
import type { Review } from '~/types/profile';
import { canEditReview } from '~/utils/reviews';

const created = Date.parse('2026-11-08T08:00:00Z');
const review: Review = {
  id: 7,
  rating: 4,
  description: 'Thank you!',
  dateCreated: new Date(created).toISOString(),
  announcementId: 12,
  author: { id: 3, name: 'Olena S.', avatarUrl: '/avatar-placeholder.svg' },
};

describe('editing your own review', () => {
  it('allows the author to edit within 24 hours', () => {
    expect(canEditReview(review, 3, created + 60_000)).toBe(true);
  });

  it('does not allow guests or other users to edit', () => {
    expect(canEditReview(review, undefined, created + 60_000)).toBe(false);
    expect(canEditReview(review, 4, created + 60_000)).toBe(false);
  });

  it('uses the original posting time and the same 24-hour boundary as the backend', () => {
    const deadline = Date.parse('2026-11-09T08:00:00Z');
    expect(canEditReview(review, 3, deadline)).toBe(true);
    expect(canEditReview(review, 3, deadline + 1)).toBe(false);
  });

  it('does not offer editing for invalid or future posting dates', () => {
    expect(canEditReview({ ...review, dateCreated: 'invalid' }, 3, created)).toBe(false);
    expect(canEditReview(review, 3, created - 1)).toBe(false);
  });
});
