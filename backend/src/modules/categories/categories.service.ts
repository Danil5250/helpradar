import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { DEFAULT_CATEGORIES } from './default-categories';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.categories.manager.transaction(async (manager) => {
      // prevent concurrent starts from seeding the same empty table.
      await manager.query(
        'LOCK TABLE "categories" IN SHARE ROW EXCLUSIVE MODE',
      );
      if (await manager.exists(Category)) return;
      await manager.insert(
        Category,
        DEFAULT_CATEGORIES.map(([id, name]) => ({ id, name })),
      );
      await manager.query(
        `SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX("id") FROM "categories"))`,
      );
    });
  }

  findAll(): Promise<Category[]> {
    return this.categories.find({ order: { id: 'ASC' } });
  }

  findById(id: number): Promise<Category | null> {
    return this.categories.findOneBy({ id });
  }
}
