import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementShares1794100003000 implements MigrationInterface {
  name = 'AddAnnouncementShares1794100003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "announcement_shares" (
      "announcement_id" integer NOT NULL REFERENCES "announcements"("id") ON DELETE CASCADE,
      "channel" varchar(16) NOT NULL CHECK ("channel" IN ('telegram', 'whatsapp', 'viber', 'x', 'facebook', 'email', 'copy', 'native')),
      "count" integer NOT NULL DEFAULT 0 CHECK ("count" >= 0),
      PRIMARY KEY ("announcement_id", "channel")
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "announcement_shares"');
  }
}
