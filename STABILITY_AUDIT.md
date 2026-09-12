# Stability audit

Last documentation update: 2026-09-12. Application code reference: `3d5ef3432d6d3ffd72820473690100f5bd44d305`. The original audit below and the later live CMS test are distinct evidence sets. See [PROJECT_REPORT.md](PROJECT_REPORT.md) for the consolidated Arabic report.

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

During the original stabilization audit, no SQL migration file was changed or executed, and no production write, reset, drop, truncate, repair, migration push or other schema operation was performed. A later owner-authorized CMS content test did write and restore content, as documented below; it performed no schema or migration operation.

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

- At the time of the original stabilization audit, no Supabase application credentials or authenticated test accounts were supplied. The local Docker daemon was unavailable. Live database introspection, SQL/RLS execution, email delivery and authenticated end-to-end workflows were therefore not verified. Historical checkpoint claims are not new audit evidence.
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


## Later owner-authorized live CMS verification — 2026-09-12

After the owner configured the local environment, a temporary in-memory authenticated browser session and a separate anonymous visitor context tested the running application at 127.0.0.1:3000. No password or role was changed, no email was sent, and only the test session was signed out.

The test changed the homepage Hero title and selected the studio-lighting course session dated 2026-09-21, saved through the actual admin UI, verified the database values, reloaded the admin editor, and verified the public page after refresh. An already-open visitor tab did not update until reload. The incomplete original manual selection fell back to the automatic course, as implemented.

Save took 9362ms and the measured public reload took 824ms in this sample; these are observations, not performance guarantees. Original title and upcoming selection were restored. Content in all 14 homepage tables matched after excluding generated row IDs and timestamps; restoration does not mean byte-identical database rows. No captured browser JavaScript errors occurred. No migration or schema operation was performed.

This expands evidence only for the tested homepage workflow. Community authenticated E2E, live RLS exploit tests, email delivery, remote-host cache behavior, and full production introspection remain unverified by this review. Code inspection additionally confirms that several editor ImageUpload fields are local previews, not durable Storage uploads.

## Documentation refresh — 2026-09-12

TypeScript, ESLint, and all 70 tests/214 assertions were rerun successfully. No application code or dependency changed. The prior successful production build remains the build evidence; it was not rerun against the running server merely for Markdown edits.
