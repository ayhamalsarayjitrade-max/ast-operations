import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./orders";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
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
    },
  });
}

export function hasRole(me: { roles: AppRole[] } | null | undefined, ...r: AppRole[]) {
  if (!me) return false;
  return me.roles.includes("admin") || r.some((x) => me.roles.includes(x));
}
