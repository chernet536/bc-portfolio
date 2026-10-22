# Business Central consultant portfolio

Astro (server mode) + React/Tiptap admin + Supabase (Postgres, Auth, Storage) on Cloudflare. Only the domain costs money.

**Status:** code written and checked with `npm run verify` (lint, type check, 11 unit tests, production build). **Not yet verified:** the SQL migrations, the admin screens in a browser, the 3 database security tests, deployment, and the domain. Do the steps below and treat any failure as a bug to report.

## 1. Local setup (Windows, PowerShell in VS Code: Terminal > New Terminal)

```powershell
node -v      # needs 20 or newer
npm -v
git --version
cd C:\path\to\bc-portfolio
npm install
Copy-Item .env.example .env
```

### Supabase (done in the browser, not the terminal)
1. Sign up at supabase.com and create a project (Free). **If it asks for a payment card, stop.** Do not upgrade, and never click Upgrade.
2. Project Settings > API: copy the Project URL and the `anon` public key into `.env` (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`). Never copy the `service_role` key anywhere.
3. **SQL Editor** (SQL, not PowerShell): paste and run `supabase/migrations/0001_schema.sql`, then `0003_reading_time.sql`. Fix any error before continuing and tell me the message.
4. Authentication > Users > Add user: your email and a strong password, tick auto-confirm.
5. Authentication settings: switch **off** new-user signups (look for "Allow new users to sign up"; the label may differ).
6. SQL Editor: edit the email in `0002_first_admin.sql` and run it. This is the only way to become an admin.
7. Storage: confirm a bucket named `media` exists (created by migration 1).
8. SQL Editor: add a few categories, for example
   `insert into categories (kind,name,slug) values ('post','Business Central','business-central'),('project','AL development','al-development');`

### Run and try it
```powershell
npm run dev        # open http://localhost:4321
```
Open `/admin`, sign in, then: create an article, Save draft, Preview, Publish; check it appears at `/blog`. Create and publish a project with a screenshot. Open a private browser window: drafts must not appear and `/blog/<draft-slug>` must give the 404 page. Edit and delete both items.

### Checks
```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify     # all four
```
Database security tests (use a separate TEST project):
```powershell
$env:TEST_SUPABASE_URL="https://xxxx.supabase.co"; $env:TEST_SUPABASE_ANON_KEY="..."
$env:TEST_ADMIN_EMAIL="you@example.com"; $env:TEST_ADMIN_PASSWORD="..."
npm test
```

## 2. Personal details
Edit `src/lib/profile.ts` (name, links, expertise, certifications, highlights). Write only true information.

## 3. GitHub
```powershell
git init; git add .; git commit -m "Initial commit"
git status            # .env must NOT be listed
```
Create an empty repository on github.com, then `git remote add origin <url>`, `git branch -M main`, `git push -u origin main`. Check on github.com that no `.env` file is present. Add repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Settings > Secrets and variables > Actions) so `.github/workflows/keepalive.yml` keeps the project awake.

## 4. Cloudflare (verify each screen as you go)
1. Sign up at cloudflare.com on the **Free** plan. If a card is requested, stop.
2. Workers & Pages > Create > import your GitHub repository. Build command `npm run build`. If it asks for a deploy command, the build output is `dist/server/wrangler.json`, so use `npx wrangler deploy --config dist/server/wrangler.json`. **I have not run a real deployment;** this is the most likely step to need adjusting.
3. Variables: add `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_SITE_URL` (your final https address) as **build** variables, because they are read at build time.
4. The build declares a `SESSION` KV binding that the site does not use. If deployment complains, tell me; it can be removed.
5. Redeploy after changes by pushing to `main`; read failures in the build log. Do not add billing details or enable any paid add-on.
6. Content changes (articles, projects) never need a redeploy. Public pages refresh within about 60 seconds.

## 5. Domain from Yegara (not verified: I could not see Yegara's panel)
1. Buy the domain; keep it registered at Yegara.
2. In Cloudflare add the domain as a site on the Free plan. Cloudflare shows two nameservers: copy them exactly.
3. At Yegara find the domain's DNS or nameserver settings, replace the nameservers with Cloudflare's two, save. This changes DNS hosting only; the registration stays with Yegara. If Yegara does not allow custom nameservers, use `www.yourdomain.com` instead and tell me.
4. Wait until Cloudflare shows the site as Active (minutes to 24 hours).
5. In your Worker: Settings > Domains & Routes > add `yourdomain.com` and `www.yourdomain.com`. Use only the records Cloudflare shows; do not invent any.
6. Add a redirect from `www` to the bare domain (or the reverse) in Cloudflare Rules; HTTPS certificates are issued automatically.
7. Set `PUBLIC_SITE_URL` to the final address and redeploy. In Supabase, Authentication > URL Configuration, set Site URL to the same address.
8. Test: public pages, `/admin` login, publish, image upload, contact form (message appears under Admin > Messages).

## 6. Troubleshooting
- `Missing PUBLIC_SUPABASE_URL`: `.env` missing or the dev server was not restarted.
- Admin says "Not authorized": `0002_first_admin.sql` was not run, or used another email.
- Save fails silently or "Save failed": you are not an admin, or a migration did not run; check the browser console.
- Upload fails: type or size rule (JPEG/PNG/WebP/GIF, 5 MB), or the `media` bucket is missing.
- Site shows "temporarily unavailable": the Supabase project may be paused. Open it in the dashboard and restore it.
- Build fails on Cloudflare: read the log; confirm Node 20+ and the build variables.
- Domain not working: wait for propagation, confirm the nameservers, check Cloudflare shows Active.

## 7. Free-plan limits and cost checklist
Figures come from third-party pages dated 2026; confirm on the official pages.
- Supabase Free: 500 MB database, about 1 GB file storage, 5 GB egress (sources disagree), 50,000 users, **pauses after 7 days of inactivity**; no card per secondary sources. One source mentions a change affecting free projects from 30 October 2026: check Supabase announcements.
- Cloudflare Free: 100,000 Worker requests/day, 500 builds/month. Measured Worker size: about 325 KiB gzipped (local dry run).
- GitHub Free: repository and Actions. Scheduled workflows may stop after a period without repository activity; check the Actions tab now and then.
- Backups: free projects have no guaranteed downloadable backup (unverified). Export regularly with the Supabase CLI (`supabase db dump`) or copy your content from the dashboard.
- Never: add a card, click Upgrade, enable paid add-ons, or put the `service_role` key anywhere.

## 8. Production-readiness checklist
- [ ] Migrations ran without errors; signups disabled; one admin only
- [ ] `npm run verify` passes; database security tests passed on a test project
- [ ] Draft invisible to the public; unauthorized writes rejected
- [ ] Deployed on the Free plan with no billing method attached
- [ ] Domain Active, HTTPS working, `PUBLIC_SITE_URL` correct
- [ ] Keep-alive workflow runs; a backup export taken
- [ ] Profile details replaced with real ones
