import { IsString, Length } from 'class-validator';
import { v } from '../../../common/validation';

export class SearchAddressRequestDto {
  @IsString(v('QUERY_TOO_SHORT', 'Enter at least 3 characters.'))
  @Length(3, 200, v('QUERY_TOO_SHORT', 'Enter at least 3 characters.'))
  q: string;
}
