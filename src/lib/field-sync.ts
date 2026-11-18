import { supabase } from "@/integrations/supabase/client";
import { fieldDB, queued, type FieldRecord } from "./field-store";

export async function uploadFieldRecord(record: FieldRecord) {
  // Confirm a previous response was not lost before attempting another upload.
  const { data: existing, error: readError } = await supabase.from("visits").select("id,rep_id").eq("id", record.id).maybeSingle();
  if (readError) throw readError;
  if (existing?.rep_id === record.owner) return;
  if (!record.photo) throw new Error("صورة المحل مفقودة");
  const path = `${record.owner}/${record.id}.jpg`;
  const { error: uploadError } = await supabase.storage.from("shop-photos").upload(path, record.photo, { contentType: record.photo.type || "image/jpeg" });
  // A deterministic path plus INSERT-only storage means an interrupted upload is safe to retry.
  if (uploadError && String(uploadError.statusCode) !== "409" && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
  const { error } = await supabase.rpc("sync_field_record", { payload: {
    id: record.id, order_id: record.orderId, customer_id: record.resolvedCustomerId,
    new_customer: record.customerId === "new", name: record.newName, phone: record.phone,
    address: record.address, lat: record.loc?.lat ?? null, lng: record.loc?.lng ?? null,
    photo_path: path, note: record.note, has_order: record.hasOrder,
    items: record.items.filter(i => i.product_id && i.qty > 0),
    delivery_at: record.deliveryAt ? new Date(record.deliveryAt).toISOString() : "",
    captured_at: record.capturedAt,
  } });
  if (error) throw error;
}

let running = false;
export async function syncFieldQueue(owner: string, send = uploadFieldRecord) {
  if (running || !navigator.onLine) return 0;
  running = true;
  let sent = 0;
  try {
    const db = await fieldDB();
    const records = await queued(owner);
    if (!records.length) return 0;
    // Never submit a previous user's records under a new session (verified with the server once per run).
    const { data } = await supabase.auth.getUser();
    if (data.user?.id !== owner) return 0;
    for (const record of records) {
      if (!navigator.onLine) break;
      try {
        await send(record);
        await db.delete("outbox", record.id);
        sent++;
      } catch (error) {
        await db.put("outbox", { ...record, error: error instanceof Error ? error.message : (error as { message?: string })?.message || "تعذر الإرسال" }, record.id);
        break;
      }
    }
  } finally {
    running = false;
    window.dispatchEvent(new Event("field-outbox"));
  }
  return sent;
}