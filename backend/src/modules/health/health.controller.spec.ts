import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports readiness only when its database probe succeeds', async () => {
    const query = jest.fn().mockResolvedValue([{ result: 1 }]);
    const controller = new HealthController({ query } as unknown as DataSource);
    expect(await controller.check()).toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
    query.mockRejectedValue(new Error('database unavailable'));
    await expect(controller.check()).rejects.toMatchObject({ status: 503 });
  });
});
