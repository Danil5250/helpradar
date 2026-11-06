import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SRS 3.2.12 (profile: "About me" for every role, e-mail change with confirmation),
 * 3.2.14 / 3.4.2 (comments = reviews of volunteers) and the completion time of a request
 * used for the 14-day review period.
 */
export class AddProfileAndComments1793100000000 implements MigrationInterface {
  name = 'AddProfileAndComments1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "persons_in_need" ADD "about_me" character varying(500) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" ADD "new_email" character varying(254)`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD "completed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" SERIAL NOT NULL, "rating" numeric(3,2) NOT NULL, "date_created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "description" character varying(1000) NOT NULL DEFAULT '', "author_id" integer NOT NULL, "volunteer_id" integer NOT NULL, "announcement_id" integer NOT NULL, CONSTRAINT "UQ_comments_announcement_author" UNIQUE ("announcement_id", "author_id"), CONSTRAINT "CHK_comments_rating" CHECK ("rating" >= 1 AND "rating" <= 5), CONSTRAINT "PK_comments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_comments_volunteer_created" ON "comments" ("volunteer_id", "date_created")`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_volunteer" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_comments_announcement" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_announcement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_volunteer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_comments_author"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_comments_volunteer_created"`,
    );
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP COLUMN "completed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" DROP COLUMN "new_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "persons_in_need" DROP COLUMN "about_me"`,
    );
  }
}
