CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "pantry_json" TEXT NOT NULL DEFAULT '[]',
    "budget_income" INTEGER NOT NULL DEFAULT 6200,
    "budget_family_size" INTEGER NOT NULL DEFAULT 4,
    "budget_goal" TEXT NOT NULL DEFAULT 'savings',
    "budget_style" TEXT NOT NULL DEFAULT 'balanced',
    "chores_json" TEXT NOT NULL DEFAULT '[]',
    "reminders_json" TEXT NOT NULL DEFAULT '[]',
    "routines_json" TEXT NOT NULL DEFAULT '[]',
    "assistant_history_json" TEXT NOT NULL DEFAULT '[]',
    "latest_meal_plan_json" TEXT,
    "latest_budget_coach_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "households_invite_code_key" ON "households"("invite_code");
CREATE UNIQUE INDEX "memberships_user_id_household_id_key" ON "memberships"("user_id", "household_id");

ALTER TABLE "memberships"
ADD CONSTRAINT "memberships_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "memberships"
ADD CONSTRAINT "memberships_household_id_fkey"
FOREIGN KEY ("household_id")
REFERENCES "households"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
