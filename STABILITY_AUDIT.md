# Stability audit

Baseline: `4980e8aea7b9d5e3bccc05285c835512355a36f9` (`main`).

## Scope and fixes

- Retained Next.js App Router, Supabase, existing CMS/Admin and Community V1.
- Removed unused Prisma/SQLite scaffold and its database commands, plus template runtime tests referencing absent `.zscripts`. No application code imported Prisma. Removed unused vulnerable editor/auth/i18n/syntax-highlighting dependencies.
- Updated the dependency lockfile for security fixes, including Next.js and Sharp. Supabase versions remain pinned to 0.12.6 / 2.115.0.
- Replaced Unix-specific build/start commands with Node scripts usable from Windows CMD; production startup loads Next.js environment files. Type errors are no longer ignored. Upload request limit accommodates the existing 10 MB CMS / 5 MB Community limits.
- Disambiguated the Community notification actor foreign key; fixed pagination lookahead rows, self-block filtering, profile-post like/save state, impossible dates, media ownership checks and zero-row update handling.
- Preserved error status on the feed API so failed requests do not masquerade as successful empty feeds.
- Restricted serialized admin data to the session's module permissions, required active staff status, prevented delegation of unheld permissions, protected owner management, corrected payment permission checks and role-permission deletion order.
- Replaced unusable randomly passworded staff creation with the existing feature's email invitation flow and password acceptance on the login screen. No invitation was sent during this audit.
- Prevented CMS deletion of images referenced by content. Fixed loading state and React external subscriptions without redesigning the UI.
- Missing environment variables no longer crash the admin session loader.

## Database compatibility

No SQL migration file was changed or executed. No production write, reset, drop, truncate, repair, migration push or other schema operation was performed.

The twelve actual Community tables are:

`community_profiles`, `community_posts`, `community_post_media`,
`community_post_likes`, `community_post_comments`, `community_saved_posts`,
`community_follows`, `community_portfolio_projects`, `community_portfolio_media`,
`community_notifications`, `community_content_reports`, `community_user_blocks`.

The repository has handwritten database row interfaces in mapper modules, not a generated Supabase `Database` type. The checked-in SQL, those interfaces, actions, loaders, API routes and moderation queries were compared. Automated contract tests check literal application table names against migrations and all twelve Community RLS enablements. Query regression tests use the real Supabase/PostgREST client with mocked HTTP, not a production database.

## Verification limits and existing database risks

Local quality gates: TypeScript 0 errors; ESLint 0 errors / 0 warnings;
70 tests passed (214 assertions); standalone production build passed.
Gitleaks found no source/history secrets, and `bun audit` reported no dependency advisories.
Browser smoke tests cover 16 routes and four mobile layouts without authenticated production access.

- No Supabase application credentials or authenticated test accounts were supplied. The local Docker daemon was unavailable. Live database introspection, SQL/RLS execution, email delivery and authenticated end-to-end workflows were therefore not verified. Historical checkpoint claims are not new audit evidence.
- SQL RLS tests create/delete fixture accounts and records; they were deliberately not run on Production.
- Existing Community policies do not enforce column-level immutability for all member updates: notification owners can update columns beyond `read_at` through direct REST. Several child-media update policies omit folder ownership from their `WITH CHECK`, and not every member write rechecks active status. Application checks do not fix direct REST exposure. Resolving those database policies requires a separately authorized database change.
- Existing multi-request parent/child edits are not database transactions. A network/database failure during replacement can leave partial changes; full atomicity requires database-side transactional support and was not introduced in this code-only task.
- Block-list SELECT policy exposes only the viewer's own blocks. Incoming blocks cannot be discovered through this client; reciprocal interaction prevention remains enforced by the existing SQL helper.
- Public Storage URLs remain public by the existing database contract, including after hiding a post. Moderation is not a storage-access revocation mechanism.

The application can be downloaded and run locally with the documented environment setup. Passing local checks does not certify the production database or remove the above existing database limitations.

## References used for fixes

- [Supabase join disambiguation](https://supabase.com/docs/guides/database/joins-and-nesting)
- [Supabase email invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [Next.js Server Action body limits](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
