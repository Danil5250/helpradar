import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { AnnouncementStatus } from '../../announcement/enums/announcement-status.enum';
import type {
  HelpInitiator,
  HelpResponseStatus,
} from '../entities/help-response.entity';

export type HelpAction =
  'accept' | 'decline' | 'withdraw' | 'complete' | 'cancel';

export class RequestHelpDto {
  @ApiProperty({
    description: 'Your active help request to send to this volunteer',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestId: number;
}

export class HelpPersonDto {
  id: number;
  name: string;
  avatarUrl: string;
}

export class HelpConnectionDto {
  id: number;
  status: HelpResponseStatus;
  initiatedBy: HelpInitiator;
  dateCreated: string;
  request: { id: number; title: string; status: AnnouncementStatus };
  requester: HelpPersonDto;
  volunteer: HelpPersonDto;
  actions: HelpAction[];
  contactPhone: string | null;
  canReview: boolean;
  hasReview: boolean;
}

export class HelpOverviewDto {
  canRespond: boolean;
  requests: { id: number; title: string }[];
  connections: HelpConnectionDto[];
}
