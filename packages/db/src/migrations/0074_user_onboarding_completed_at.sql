ALTER TABLE "user" ADD COLUMN "onboarding_completed_at" timestamp;

UPDATE "user" AS "u"
SET "onboarding_completed_at" = "u"."created_at"
WHERE EXISTS (
  SELECT 1
  FROM "workspace_team_member" AS "m"
  WHERE "m"."user_id" = "u"."id"
);
