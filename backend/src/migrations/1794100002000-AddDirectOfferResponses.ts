import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDirectOfferResponses1794100002000 implements MigrationInterface {
  name = 'AddDirectOfferResponses1794100002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "help_responses"
      ADD "requester_id" integer,
      ADD "help_status" varchar(16),
      ADD "completed_at" timestamptz,
      ALTER COLUMN "announcement_id" DROP NOT NULL`);
    await queryRunner.query(`UPDATE "help_responses" AS response
      SET "requester_id" = request."user_id"
      FROM "announcements" AS request WHERE request."id" = response."announcement_id"`);
    await queryRunner.query(`ALTER TABLE "help_responses"
      ALTER COLUMN "requester_id" SET NOT NULL,
      ADD CONSTRAINT "FK_help_response_requester" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "CHK_help_response_source" CHECK ("announcement_id" IS NOT NULL OR "offer_id" IS NOT NULL),
      ADD CONSTRAINT "CHK_help_response_progress" CHECK ("help_status" IN ('InProgress', 'Completed')),
      DROP CONSTRAINT "help_responses_offer_id_fkey",
      ADD CONSTRAINT "help_responses_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "announcements"("id") ON DELETE CASCADE`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_help_direct_offer_requester"
      ON "help_responses" ("offer_id", "requester_id") WHERE "announcement_id" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_help_responses_requester"
      ON "help_responses" ("requester_id", "date_created")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "help_responses" WHERE "announcement_id" IS NULL`,
    );
    await queryRunner.query(`DROP INDEX "idx_help_responses_requester"`);
    await queryRunner.query(`DROP INDEX "UQ_help_direct_offer_requester"`);
    await queryRunner.query(`ALTER TABLE "help_responses"
      DROP CONSTRAINT "CHK_help_response_progress",
      DROP CONSTRAINT "CHK_help_response_source",
      DROP CONSTRAINT "FK_help_response_requester",
      DROP CONSTRAINT "help_responses_offer_id_fkey",
      ADD CONSTRAINT "help_responses_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "announcements"("id") ON DELETE SET NULL,
      DROP COLUMN "completed_at",
      DROP COLUMN "help_status",
      DROP COLUMN "requester_id",
      ALTER COLUMN "announcement_id" SET NOT NULL`);
  }
}
