import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Announcement } from '../../announcement/entities/announcement.entity';
import { GenderType } from '../enums/gender.enum';
import { Role } from '../enums/role.enum';
import { PersonInNeed } from './person-in-need.entity';
import { Volunteer } from './volunteer.entity';

/** SRS 3.4.8 User class (data store D1). `createdAt` is added to support 3.2.1.3 step 9. */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  /** Salted bcrypt hash (SRS 3.5.4); never selected unless explicitly requested. */
  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'user_role',
    default: Role.Guest,
  })
  role: Role;

  @Column({
    type: 'enum',
    enum: GenderType,
    enumName: 'gender_type',
    nullable: true,
  })
  gender: GenderType | null;

  @Column({ type: 'bigint', unique: true, nullable: true })
  rnokpp: string | null;

  @Column({ type: 'varchar', length: 255, default: '/avatar-placeholder.svg' })
  avatarUrl: string;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isConfirmedEmail: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  blockedUntil: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  blockReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToOne(() => PersonInNeed, (profile) => profile.user)
  personInNeed?: PersonInNeed;

  @OneToOne(() => Volunteer, (profile) => profile.user)
  volunteer?: Volunteer;

  @OneToMany(() => Announcement, (announcement) => announcement.user)
  announcements?: Announcement[];
}
