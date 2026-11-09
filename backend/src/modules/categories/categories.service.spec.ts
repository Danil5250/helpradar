import type { Repository } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { DEFAULT_CATEGORIES } from './default-categories';

describe('CategoriesService', () => {
  it('seeds an empty catalogue under a transaction lock and advances its sequence', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      exists: jest.fn().mockResolvedValue(false),
      insert: jest.fn().mockResolvedValue({}),
    };
    const transaction = jest.fn(async (work: (manager: any) => Promise<void>) =>
      work(manager),
    );
    const service = new CategoriesService({
      manager: { transaction },
    } as unknown as Repository<Category>);
    await service.onModuleInit();
    expect(manager.query.mock.calls[0][0]).toContain('LOCK TABLE');
    expect(manager.insert).toHaveBeenCalledWith(
      Category,
      DEFAULT_CATEGORIES.map(([id, name]) => ({ id, name })),
    );
    expect(manager.query.mock.calls[1][0]).toContain('setval');
  });
  it('preserves an existing catalogue on subsequent initialization', async () => {
    const manager = {
      query: jest.fn(),
      exists: jest.fn().mockResolvedValue(true),
      insert: jest.fn(),
    };
    const service = new CategoriesService({
      manager: {
        transaction: async (work: (manager: any) => Promise<void>) =>
          work(manager),
      },
    } as unknown as Repository<Category>);
    await service.onModuleInit();
    expect(manager.insert).not.toHaveBeenCalled();
  });
  it('returns a stable category ordering and null for a missing category', async () => {
    const repository = {
      find: jest.fn().mockResolvedValue([{ id: 1, name: 'Food' }]),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    const service = new CategoriesService(
      repository as unknown as Repository<Category>,
    );
    expect(await service.findAll()).toEqual([{ id: 1, name: 'Food' }]);
    expect(repository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    expect(await service.findById(999)).toBeNull();
  });
});
