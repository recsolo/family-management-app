# FamilyFlow AI

FamilyFlow AI is a staged Next.js web app for family planning. Stage 5A added role-aware household management, and Stage 5B hardens the app for deployment with stronger env handling, security headers, and deployment checks.

## Current stages

- Stage 1: dashboard, pantry-aware meals, budget planner
- Stage 2: chores, reminders, and reusable routines
- Stage 3: AI assistant, AI meal planning, and AI budget coaching
- Stage 4: authenticated household workspaces with invite codes and persistent database storage
- Stage 5A: household roles, member management, and invite controls
- Stage 5B: production hardening and deployment readiness

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
- `npm run check:env`: verify deployment env settings and database path

## Deployment checklist

1. Set `NEXTAUTH_URL` to the final public app URL.
2. Set `NEXTAUTH_SECRET` to a long random value of at least 32 characters.
3. Set `FAMILYFLOW_DB_PATH` to the SQLite file you want the app to use. If you omit it, the app defaults to `data/familyflow.db`.
4. Set `OPENAI_API_KEY` if AI features should be enabled in production.
5. Run `npm run check:env`.
6. Run `npm run build`.

## Railway deploy

1. Create a new Railway project from this GitHub repo.
2. Add a Railway Volume and mount it to the service.
3. Set `FAMILYFLOW_DB_PATH` to a file inside that mounted volume, for example `/app/data/familyflow.db`.
4. Set `NEXTAUTH_SECRET` to a long random value.
5. Set `NEXTAUTH_URL` to your Railway public URL, or rely on `RAILWAY_PUBLIC_DOMAIN`.
6. Set `OPENAI_API_KEY` if you want AI features enabled.
7. Railway will use [railway.json](C:\Users\recso\Documents\New%20project\familyflow-ai\railway.json), build with `npm run build`, start with `npm run start`, and health check [health route](C:\Users\recso\Documents\New%20project\familyflow-ai\src\app\api\health\route.ts) at `/api/health`.

## Key files

- `src/app/page.tsx`: session-aware entry page
- `src/components/auth-panel.tsx`: sign-in / create / join flow
- `src/components/familyflow-app.tsx`: authenticated household workspace UI
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js route
- `src/app/api/auth/register/route.ts`: household registration and join route
- `src/app/api/health/route.ts`: Railway health check route
- `src/app/api/workspace/route.ts`: household workspace persistence route
- `src/app/api/assistant/route.ts`: OpenAI-backed planning route
- `src/lib/db.ts`: SQLite database setup
- `src/lib/env.ts`: shared environment and database path helpers
- `src/lib/validation.ts`: API input validation helpers
- `src/lib/auth.ts`: Auth.js configuration
- `src/lib/workspace.ts`: shared household persistence helpers

## Notes

- Household data is stored in `data/familyflow.db` by default, but the database location can now be overridden with `FAMILYFLOW_DB_PATH`.
- AI actions still work only when `OPENAI_API_KEY` is set.
- `next.config.ts` now applies baseline security headers for all routes.
- `railway.json` configures Railway build, start, restart, and healthcheck settings.
- Node's built-in SQLite module is currently marked experimental, so you may see a runtime warning during builds.
