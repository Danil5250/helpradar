import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/** SRS 3.4.9 PersonInNeed class: residential profile of a user who requests help. */
@Entity('persons_in_need')
export class PersonInNeed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  street: string | null;

  @Column({ type: 'int', unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.personInNeed, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
