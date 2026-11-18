import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./orders";
import { cachedRead } from "./field-store";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    networkMode: "always",
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;
      const userId = session.session.user.id;
      return cachedRead(`me:${userId}`, async () => {
      const { data: u, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        name: profile?.full_name || u.user.email || "",
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
      });
    },
  });
}

export function hasRole(me: { roles: AppRole[] } | null | undefined, ...r: AppRole[]) {
  if (!me) return false;
  return me.roles.includes("admin") || r.some((x) => me.roles.includes(x));
}
