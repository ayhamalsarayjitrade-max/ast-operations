import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { OrderStatus } from "./orders";

export async function setStatus(id: string, status: OrderStatus) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) toast.error(error.message);
}
