import type { AnnouncementStatus } from '~/types/announcement';

export type HelpAction = 'accept' | 'decline' | 'withdraw' | 'complete' | 'cancel';
export interface HelpPerson {
  id: number;
  name: string;
  avatarUrl: string;
}
export interface HelpConnection {
  id: number;
  status: 'Pending' | 'Accepted' | 'Rejected';
  initiatedBy: 'volunteer' | 'requester';
  isDirect: boolean;
  dateCreated: string;
  request: { id: number; title: string; status: AnnouncementStatus };
  requester: HelpPerson;
  volunteer: HelpPerson;
  actions: HelpAction[];
  contactPhone: string | null;
  canReview: boolean;
  hasReview: boolean;
}
export interface HelpOverview {
  canRespond: boolean;
  canReceiveOffer: boolean;
  requests: { id: number; title: string }[];
  connections: HelpConnection[];
}
