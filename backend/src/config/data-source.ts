import { DataSource } from 'typeorm';
import { loadAppConfig } from './app.config';
import { buildDataSourceOptions } from './database.config';

const config = loadAppConfig();

/** Entry point of the TypeORM CLI (`npm run migration:run | migration:generate | migration:revert`). */
export default new DataSource(
  buildDataSourceOptions({
    ...config,
    db: { ...config.db, migrationsRun: false },
  }),
);
