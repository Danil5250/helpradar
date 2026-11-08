import type { Review } from '~/types/profile';

export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canEditReview(review: Review, viewerId: number | undefined, now = Date.now()): boolean {
  const age = now - Date.parse(review.dateCreated);
  return viewerId === review.author.id && age >= 0 && age <= REVIEW_EDIT_WINDOW_MS;
}
