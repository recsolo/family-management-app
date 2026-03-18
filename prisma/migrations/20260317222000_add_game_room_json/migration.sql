ALTER TABLE "households"
ADD COLUMN "game_room_json" TEXT NOT NULL DEFAULT '{"selectedArcadeMemberId":null,"arcadeRuns":[],"uno":null}';
