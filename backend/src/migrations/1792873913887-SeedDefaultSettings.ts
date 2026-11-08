import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_CATEGORIES } from '../modules/categories/default-categories';

/** SRS Appendix A.2, Table A.2 - System Help Categories (ids 1-11). */
export const INITIAL_CATEGORIES = DEFAULT_CATEGORIES;

export class SeedDefaultSettings1792873913887 implements MigrationInterface {
  name = 'SeedDefaultSettings1792873913887';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [id, name] of INITIAL_CATEGORIES) {
      await queryRunner.query(
        `INSERT INTO "categories" ("id", "name") VALUES ($1, $2) ON CONFLICT ("id") DO NOTHING`,
        [id, name],
      );
    }
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT MAX("id") FROM "categories"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "categories" WHERE "id" = ANY($1::int[])`,
      [INITIAL_CATEGORIES.map(([id]) => id)],
    );
  }
}
