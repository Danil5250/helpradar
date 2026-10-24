import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792873883328 implements MigrationInterface {
  name = 'InitialSchema1792873883328';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "persons_in_need" ("id" SERIAL NOT NULL, "region" character varying(100), "city" character varying(100), "street" character varying(255), "user_id" integer NOT NULL, CONSTRAINT "UQ_017c7f584eb41c35d425300abbb" UNIQUE ("user_id"), CONSTRAINT "REL_017c7f584eb41c35d425300abb" UNIQUE ("user_id"), CONSTRAINT "PK_b0ed12d15ba58e55f4b22335225" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."support_type" AS ENUM('psychological', 'humanitarian', 'informational', 'material')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."working_day" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
    );
    await queryRunner.query(
      `CREATE TABLE "volunteers" ("id" SERIAL NOT NULL, "region" character varying(100), "city" character varying(100), "supports" "public"."support_type" array NOT NULL DEFAULT '{}', "support_description" text NOT NULL DEFAULT '', "user_id" integer NOT NULL, "rating" numeric(3,2) NOT NULL DEFAULT '0', "start_working_day" "public"."working_day" NOT NULL DEFAULT 'Monday', "end_working_day" "public"."working_day" NOT NULL DEFAULT 'Friday', "start_time" character varying(5) NOT NULL DEFAULT '9:00', "end_time" character varying(5) NOT NULL DEFAULT '17:00', "description" text NOT NULL DEFAULT '', "moderator_answer" text, "is_show_my_profile" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_b476166961c3d8f8f22198f88e6" UNIQUE ("user_id"), CONSTRAINT "REL_b476166961c3d8f8f22198f88e" UNIQUE ("user_id"), CONSTRAINT "PK_f4e65e37cf47256e3f580ecee62" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('guest', 'person_in_need', 'volunteer', 'administrator')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."gender_type" AS ENUM('male', 'female', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "password" character varying(255) NOT NULL, "email" character varying(254) NOT NULL, "phone_number" character varying(16), "birth_date" date, "age" integer, "role" "public"."user_role" NOT NULL DEFAULT 'guest', "gender" "public"."gender_type", "rnokpp" bigint, "avatar_url" character varying(255) NOT NULL DEFAULT '/avatar-placeholder.svg', "is_phone_verified" boolean NOT NULL DEFAULT false, "is_confirmed_email" boolean NOT NULL DEFAULT false, "blocked_until" TIMESTAMP WITH TIME ZONE, "block_reason" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_e27f4f416a922265d69351b2e51" UNIQUE ("rnokpp"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."announcement_type" AS ENUM('HelpRequest', 'HelpOffer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."announcement_status" AS ENUM('Active', 'InProgress', 'Completed', 'Hidden', 'Closed', 'Deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "announcements" ("id" SERIAL NOT NULL, "type" "public"."announcement_type" NOT NULL, "date_posted" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying(255), "details" text, "description" text NOT NULL, "views_count" integer NOT NULL DEFAULT '0', "current_location" character varying(255), "latitude" numeric(9,6) NOT NULL, "longitude" numeric(9,6) NOT NULL, "approx_latitude" numeric(9,6) NOT NULL, "approx_longitude" numeric(9,6) NOT NULL, "category_id" integer NOT NULL, "responses_count" integer NOT NULL DEFAULT '0', "is_urgent" boolean NOT NULL DEFAULT false, "status" "public"."announcement_status" NOT NULL DEFAULT 'Active', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "closed_at" TIMESTAMP WITH TIME ZONE, "expiry_reminder_sent_at" TIMESTAMP WITH TIME ZONE, "is_flagged_for_moderation" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer NOT NULL, "volunteer_who_complete_id" integer, CONSTRAINT "chk_announcements_expires_after_posted" CHECK ("expires_at" > "date_posted"), CONSTRAINT "chk_announcements_longitude" CHECK ("longitude" BETWEEN -180 AND 180), CONSTRAINT "chk_announcements_latitude" CHECK ("latitude" BETWEEN -90 AND 90), CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_announcements_user_status" ON "announcements" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_announcements_status_expires" ON "announcements" ("status", "expires_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "announcement_photos" ("id" SERIAL NOT NULL, "announcement_id" integer NOT NULL, "storage_key" character varying(100) NOT NULL, "content_type" character varying(50) NOT NULL, "size_bytes" integer NOT NULL, "position" smallint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bcf23e49d5d0e27bc8244930df3" UNIQUE ("storage_key"), CONSTRAINT "PK_5b80ec679b121f9bd9425db64f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_verification_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" integer NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c20ed35f3d31d486aabcd0564da" UNIQUE ("token_hash"), CONSTRAINT "PK_417a095bbed21c2369a6a01ab9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_email_verification_tokens_user" ON "email_verification_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "login_attempts" ("user_id" integer NOT NULL, "failed_count" integer NOT NULL DEFAULT '0', "window_started_at" TIMESTAMP WITH TIME ZONE, "locked_until" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5f88175f39e2b2ebf9e2295a9fd" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" integer NOT NULL, "token_hash" character varying(64) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "ip" character varying(64), "user_agent" character varying(255), CONSTRAINT "UQ_6596adb3b8927b35bda97e734aa" UNIQUE ("token_hash"), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_sessions_expires" ON "user_sessions" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "email_outbox" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "to_address" character varying(254) NOT NULL, "subject" character varying(255) NOT NULL, "text_body" text NOT NULL, "html_body" text, "kind" character varying(50) NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sent_at" TIMESTAMP WITH TIME ZONE, "last_error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b6fbfc201f705fbf1ac87bd7197" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_email_outbox_pending" ON "email_outbox" ("sent_at", "next_attempt_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "persons_in_need" ADD CONSTRAINT "FK_017c7f584eb41c35d425300abbb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteers" ADD CONSTRAINT "FK_b476166961c3d8f8f22198f88e6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "FK_7871410d6468d06a598d1f668ce" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "FK_2e02da2019c7fcdbbd5d30b6816" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "FK_af1daa15c1d296f5bfab4ecafad" FOREIGN KEY ("volunteer_who_complete_id") REFERENCES "volunteers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcement_photos" ADD CONSTRAINT "FK_aaf7ad40991b3771c165b4ba96b" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "login_attempts" ADD CONSTRAINT "FK_5f88175f39e2b2ebf9e2295a9fd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"`,
    );
    await queryRunner.query(
      `ALTER TABLE "login_attempts" DROP CONSTRAINT "FK_5f88175f39e2b2ebf9e2295a9fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcement_photos" DROP CONSTRAINT "FK_aaf7ad40991b3771c165b4ba96b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_af1daa15c1d296f5bfab4ecafad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_2e02da2019c7fcdbbd5d30b6816"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_7871410d6468d06a598d1f668ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteers" DROP CONSTRAINT "FK_b476166961c3d8f8f22198f88e6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "persons_in_need" DROP CONSTRAINT "FK_017c7f584eb41c35d425300abbb"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_email_outbox_pending"`);
    await queryRunner.query(`DROP TABLE "email_outbox"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_sessions_expires"`);
    await queryRunner.query(`DROP TABLE "user_sessions"`);
    await queryRunner.query(`DROP TABLE "login_attempts"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_email_verification_tokens_user"`,
    );
    await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
    await queryRunner.query(`DROP TABLE "announcement_photos"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_announcements_status_expires"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_announcements_user_status"`,
    );
    await queryRunner.query(`DROP TABLE "announcements"`);
    await queryRunner.query(`DROP TYPE "public"."announcement_status"`);
    await queryRunner.query(`DROP TYPE "public"."announcement_type"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."gender_type"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP TABLE "volunteers"`);
    await queryRunner.query(`DROP TYPE "public"."working_day"`);
    await queryRunner.query(`DROP TYPE "public"."support_type"`);
    await queryRunner.query(`DROP TABLE "persons_in_need"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
