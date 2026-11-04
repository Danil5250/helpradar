import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude } from 'class-validator';
import { v } from '../../../common/validation';

export class ReverseGeocodeRequestDto {
  @Type(() => Number)
  @IsLatitude(v('COORDINATES_INVALID', 'Invalid coordinates.'))
  lat: number;

  @Type(() => Number)
  @IsLongitude(v('COORDINATES_INVALID', 'Invalid coordinates.'))
  lng: number;
}
