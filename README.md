# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deploying to GitHub + Vercel

Follow these steps to prepare the project and deploy to Vercel.

1. Prerequisites
	- A Supabase project (with the DB schema applied). Use the SQL editor or supabase CLI to run `supabase/schema_idempotent.sql`.
	- A Vercel account and GitHub repository.

2. Create repository and push
	- Init git, add files and push to GitHub:
	  ```bash
	  git init
	  git add .
	  git commit -m "Prepare for deployment"
	  git branch -M main
	  git remote add origin <your-github-repo-url>
	  git push -u origin main
	  ```

3. Prepare environment variables on Vercel
	- In your Vercel project settings, add the following Environment Variables:
	  - NEXT_PUBLIC_SUPABASE_URL
	  - NEXT_PUBLIC_SUPABASE_ANON_KEY
	  - NEXT_PUBLIC_SUPER_ADMIN_EMAIL (optional)
	  - SUPABASE_SERVICE_ROLE_KEY (set as a secret; server-only)
	  - Ensure `NEXT_PUBLIC_FORCE_ADMIN` is NOT true in production.

4. Apply database schema & admin emails
	- Run the SQL in `supabase/schema_idempotent.sql` (via Supabase SQL editor or CLI).
	- Add admin emails (replace with real admin accounts):
	  ```sql
	  INSERT INTO public.admin_emails(email) VALUES ('you@yourdomain.com') ON CONFLICT DO NOTHING;
	  ```

5. Deploy on Vercel
	- In Vercel, import the GitHub repo and follow the onboarding.
	- Vercel will run `npm run build` and deploy the site.

6. Post-deploy
	- Verify login flow and that admins can view /admin.
	- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.

If you want, I can add a server-side API route that lists users using the service role key (more secure). Let me know and I implement it.
