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

- Data access uses the browser Supabase client with RLS (role checks via has_role/is_staff); why: internal staff app, no secrets needed server-side.
- Roles live in public.user_roles; first signup becomes admin, admins assign roles via set_user_role RPC; why: avoid privilege escalation through metadata.
- Live updates come from one realtime channel in src/routes/_authenticated/route.tsx that invalidates queries and fires notify(); why: single subscription, consistent sound/visual alerts.
- Order status history and stock deduction are handled by DB triggers on orders; why: consistent regardless of which client updates.
