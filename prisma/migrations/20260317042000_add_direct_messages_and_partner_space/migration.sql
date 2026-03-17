ALTER TABLE "households"
ADD COLUMN "direct_threads_json" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "partner_space_json" TEXT;
