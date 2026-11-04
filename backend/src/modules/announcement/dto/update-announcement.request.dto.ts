import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementRequestDto } from './create-announcement.request.dto';

/** SRS 3.2.5.2: edited fields follow the same rules as in 3.2.4; every field is optional. */
export class UpdateAnnouncementRequestDto extends PartialType(
  CreateAnnouncementRequestDto,
) {}
