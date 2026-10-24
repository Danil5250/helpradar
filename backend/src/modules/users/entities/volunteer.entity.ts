import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers';
import { SupportType } from '../enums/support-type.enum';
import { WorkingDays } from '../enums/working-days.enum';
import { User } from './user.entity';

/** SRS 3.4.10 Volunteer class: service profile of a volunteer. */
@Entity('volunteers')
export class Volunteer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({
    type: 'enum',
    enum: SupportType,
    enumName: 'support_type',
    array: true,
    default: '{}',
  })
  supports: SupportType[];

  @Column({ type: 'text', default: '' })
  supportDescription: string;

  @Column({ type: 'int', unique: true })
  userId: number;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  rating: number;

  @Column({
    type: 'enum',
    enum: WorkingDays,
    enumName: 'working_day',
    default: WorkingDays.Monday,
  })
  startWorkingDay: WorkingDays;

  @Column({
    type: 'enum',
    enum: WorkingDays,
    enumName: 'working_day',
    default: WorkingDays.Friday,
  })
  endWorkingDay: WorkingDays;

  @Column({ type: 'varchar', length: 5, default: '9:00' })
  startTime: string;

  @Column({ type: 'varchar', length: 5, default: '17:00' })
  endTime: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'text', nullable: true })
  moderatorAnswer: string | null;

  @Column({ type: 'boolean', default: true })
  isShowMyProfile: boolean;

  @OneToOne(() => User, (user) => user.volunteer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
