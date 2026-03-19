ALTER TABLE "households"
ADD COLUMN "family_quest_board_json" TEXT NOT NULL DEFAULT '{"sharedPoints":0,"lifetimeSharedPoints":0,"quests":[],"rewards":[]}';
