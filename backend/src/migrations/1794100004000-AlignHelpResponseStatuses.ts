import { MigrationInterface, QueryRunner } from 'typeorm';

/** Align legacy statuses with the current HelpResponseStatus API contract. */
export class AlignHelpResponseStatuses1794100004000 implements MigrationInterface {
  name = 'AlignHelpResponseStatuses1794100004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "help_responses"
      DROP CONSTRAINT "help_responses_status_check"`);
    await queryRunner.query(`UPDATE "help_responses" SET "status" = 'Rejected'
      WHERE "status" IN ('Declined', 'Withdrawn')`);
    await queryRunner.query(`ALTER TABLE "help_responses"
      ADD CONSTRAINT "help_responses_status_check"
      CHECK ("status" IN ('Pending', 'Accepted', 'Rejected'))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "help_responses"
      DROP CONSTRAINT "help_responses_status_check"`);
    // Rejection does not retain the original actor; use the legacy declined state.
    await queryRunner.query(`UPDATE "help_responses" SET "status" = 'Declined'
      WHERE "status" = 'Rejected'`);
    await queryRunner.query(`ALTER TABLE "help_responses"
      ADD CONSTRAINT "help_responses_status_check"
      CHECK ("status" IN ('Pending', 'Accepted', 'Declined', 'Withdrawn'))`);
  }
}
