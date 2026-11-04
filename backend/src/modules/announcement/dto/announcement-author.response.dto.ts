export class AnnouncementAuthorResponseDto {
  id: number;
  /** First name and the initial of the last name. */
  name: string;
  /** Volunteer rating; null for persons in need. */
  rating: number | null;
}
