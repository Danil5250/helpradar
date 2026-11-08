import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHelpResponses1794100000000 implements MigrationInterface {
  name = 'AddHelpResponses1794100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "help_responses" (
      "id" SERIAL PRIMARY KEY,
      "announcement_id" integer NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
      "volunteer_id" integer NOT NULL REFERENCES "volunteers"("id") ON DELETE CASCADE,
      "offer_id" integer REFERENCES "announcements"("id") ON DELETE SET NULL,
      "initiated_by" varchar(16) NOT NULL CHECK ("initiated_by" IN ('volunteer', 'requester')),
      "status" varchar(16) NOT NULL DEFAULT 'Pending' CHECK ("status" IN ('Pending', 'Accepted', 'Declined', 'Withdrawn')),
      "date_created" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_help_response_request_volunteer" UNIQUE ("announcement_id", "volunteer_id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "idx_help_responses_volunteer" ON "help_responses" ("volunteer_id", "date_created")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_help_response_accepted" ON "help_responses" ("announcement_id") WHERE "status" = 'Accepted'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "help_responses"`);
  }
}
