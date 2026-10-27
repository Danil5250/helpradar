import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';

/** SRS 3.2.5.2: edited fields follow the same rules as in 3.2.4; every field is optional. */
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
