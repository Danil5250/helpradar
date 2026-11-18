import { MigrationInterface, QueryRunner } from 'typeorm';

/** Rebuild the enum so this migration also works inside a transaction. */
export class AddResolvedAnnouncementStatus1794700000000 implements MigrationInterface {
  name = 'AddResolvedAnnouncementStatus1794700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceEnum(queryRunner, [
      'Active',
      'InProgress',
      'Completed',
      'Hidden',
      'Closed',
      'Resolved',
      'Deleted',
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "announcements" SET "status" = 'Closed' WHERE "status" = 'Resolved'`,
    );
    await this.replaceEnum(queryRunner, [
      'Active',
      'InProgress',
      'Completed',
      'Hidden',
      'Closed',
      'Deleted',
    ]);
  }

  private async replaceEnum(
    queryRunner: QueryRunner,
    values: string[],
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "announcements" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."announcement_status" RENAME TO "announcement_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."announcement_status" AS ENUM(${values.map((value) => `'${value}'`).join(', ')})`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ALTER COLUMN "status" TYPE "public"."announcement_status" USING "status"::text::"public"."announcement_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ALTER COLUMN "status" SET DEFAULT 'Active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."announcement_status_old"`);
  }
}
