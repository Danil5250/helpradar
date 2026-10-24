import { MigrationInterface, QueryRunner } from 'typeorm';

/** SRS Appendix A.2, Table A.2 - System Help Categories (ids 1-11). */
export const INITIAL_CATEGORIES: ReadonlyArray<readonly [number, string]> = [
  [1, 'Food & Water'],
  [2, 'Medicine & Healthcare'],
  [3, 'Transportation & Evacuation'],
  [4, 'Temporary Shelter & Housing'],
  [5, 'Clothing & Basic Needs'],
  [6, 'Psychological Support'],
  [7, 'Animal & Pet Care'],
  [8, 'Household & Repair Help'],
  [9, 'Legal & Bureaucratic Aid'],
  [10, 'Child Care & Education'],
  [11, 'Other Mutual Aid'],
];

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
