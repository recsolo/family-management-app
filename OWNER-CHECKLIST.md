# FamilyFlow Owner Checklist

## Live app

- App URL: `https://family-management-app-production-4d5a.up.railway.app/`
- GitHub repo: `https://github.com/recsolo/family-management-app`

## Normal checks

- Open `/api/health`
- Click through the main pages
- Test sign in
- Test one AI action
- Test one family action like a chore, reminder, or message

## If you change code

- Run `npm run build`
- Push to `master`
- Wait for Railway to finish deploying
- Recheck `/api/health`

## If you want email later

- Verify the sending domain in Resend
- Keep `RESEND_API_KEY` set in Railway
- Keep `REMINDER_FROM_EMAIL` set to a verified sender
- Re-test:
  - email verification
  - password reset
  - reminder emails

## Important Railway variables

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `REMINDER_FROM_EMAIL`
- `REMINDER_DISPATCH_SECRET`

## Nice-to-do later

- custom domain
- favicon and logo cleanup
- privacy / terms pages
- deeper automated QA
