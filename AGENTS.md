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
- App-file failures use a shell-level recovery overlay and in-place router retry, never automatic reload; why: keep mounted forms alive and require explicit consent before discarding unsaved work.
- Field drafts and photos use account-scoped IndexedDB, and foreground reconnect/timer sync calls an atomic RLS RPC with stable IDs; why: tolerate lost responses without partial or duplicate orders, and never retain credentials in workers.
- Offline app shell uses generateSW only in published non-preview contexts; why: keep editor updates safe while allowing previously visited pages offline.
- Offline navigation may restore an existing session locally, but every queued write revalidates identity and runs under database RLS; why: cached role display cannot authorize writes.
- Password recovery uses Cloud Auth email links on a public reset page, with recovery-code fallback retained; why: no anonymous account takeover or recovery secrets exposed.
- Screen access is decided only by canAccessPath in src/lib/access.ts; nav lists and the layout guard both derive from it, and admin-only screens hold company totals and salaries; why: one source of truth for role isolation (RLS still enforces data).
- Mobile shell uses a role-specific bottom bar of at most 3 screens plus a grouped side menu; why: large tap targets for field staff.
- UI language comes from src/lib/i18n.ts (?lang, saved choice, then device language), applied after hydration; why: invited staff see their own language automatically.
- Camera photos are compressed in the browser before drafting or upload; why: keep IndexedDB small and sync fast on weak networks.
- AI customer messages learn style from staff-sent examples stored in message_examples and open WhatsApp on the sender's device; why: no business API needed, the model adapts to the company over time.
