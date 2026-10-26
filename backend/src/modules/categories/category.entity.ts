import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Announcement } from '../announcement/entities/announcement.entity';

/** SRS 3.4.11 Category class (data store D8). The initial values come from Appendix A.2. */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @OneToMany(() => Announcement, (announcement) => announcement.category)
  announcements?: Announcement[];
}
