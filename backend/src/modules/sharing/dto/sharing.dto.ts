import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const SHARE_CHANNELS = ['telegram', 'whatsapp', 'viber', 'x', 'facebook', 'email', 'copy', 'native'] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export class RecordShareDto {
  @ApiProperty({ enum: SHARE_CHANNELS })
  @IsIn(SHARE_CHANNELS)
  channel: ShareChannel;
}

