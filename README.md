# FamilyFlow AI

FamilyFlow AI is a staged Next.js web app for family planning. Stage 4 adds authenticated household workspaces with persistent SQLite storage, alongside the existing AI meal planning and budget coaching tools.

## Current stages

- Stage 1: dashboard, pantry-aware meals, budget planner
- Stage 2: chores, reminders, and reusable routines
- Stage 3: AI assistant, AI meal planning, and AI budget coaching
- Stage 4: authenticated household workspaces with invite codes and persistent database storage

## Run locally

1. Review `.env` or copy `.env.example` values into your local environment.
2. Set `OPENAI_API_KEY` if you want the AI features enabled.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.
5. Create a household workspace or join one with an invite code.

## Scripts

- `npm run dev`: start the development server
- `npm run lint`: run ESLint
- `npm run build`: production build

## Key files

- `src/app/page.tsx`: session-aware entry page
- `src/components/auth-panel.tsx`: sign-in / create / join flow
- `src/components/familyflow-app.tsx`: authenticated household workspace UI
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js route
- `src/app/api/auth/register/route.ts`: household registration and join route
- `src/app/api/workspace/route.ts`: household workspace persistence route
- `src/app/api/assistant/route.ts`: OpenAI-backed planning route
- `src/lib/db.ts`: SQLite database setup
- `src/lib/auth.ts`: Auth.js configuration
- `src/lib/workspace.ts`: shared household persistence helpers

## Notes

- Household data is stored in `data/familyflow.db`.
- AI actions still work only when `OPENAI_API_KEY` is set.
- Node's built-in SQLite module is currently marked experimental, so you may see a runtime warning during builds.
