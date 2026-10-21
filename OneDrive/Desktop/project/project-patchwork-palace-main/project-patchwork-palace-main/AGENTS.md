<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Auth-required pages live under `src/routes/_authenticated/`; admin-only pages under `_authenticated/_admin/` whose `beforeLoad` redirects non-admins — keeps role gating in one place.
- Roles live in `user_roles` checked via `has_role()`; the first signed-up account becomes admin via the signup trigger — avoids privilege escalation and needs no manual bootstrap.
- Data reads use shared `queryOptions` in `src/lib/queries.ts` with the browser client; RLS enforces access.
- Appearance is managed by the shared ThemeProvider using a dedicated local preference; it must never affect authentication or financial settings.
- Street-art styling is centralized in semantic global tokens and shared shell/control styles, keeping page calculations and data handlers unchanged.
