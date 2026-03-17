ALTER TABLE "households"
ADD COLUMN "member_profiles_json" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "family_achievements_json" TEXT NOT NULL DEFAULT '[]';
