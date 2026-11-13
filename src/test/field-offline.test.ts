import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueue, fieldDB, queued, saveDraft, type FieldRecord } from "@/lib/field-store";
import { isOfflinePreview } from "@/lib/offline-shell";
const identity = vi.hoisted(() => ({ id: "rep-a" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: identity.id } } }) } } }));
import { syncFieldQueue } from "@/lib/field-sync";
function record(id = "visit-a"): FieldRecord {
  return { id, owner: "rep-a", orderId: "order-a", resolvedCustomerId: "customer-a", customerId: "new", newName: "Shop", newPhone: "123", phone: "123", address: "Street", loc: { lat: 23, lng: 58 }, photo: new Blob(["photo"], { type: "image/jpeg" }), note: "Visit", hasOrder: true, items: [{ product_id: "product-a", qty: 2 }], deliveryAt: "", capturedAt: "2026-11-13T04:00:00Z" };
}
beforeEach(async () => {
  const db = await fieldDB(); await db.clear("outbox"); await db.clear("drafts");
  identity.id = "rep-a";
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
describe("Offline field records", () => {
  it("retains draft photo and order quantities across database reopen", async () => {
    await saveDraft("rep-a", record());
    (await fieldDB()).close();
    const draft = await (await fieldDB()).get("drafts", "rep-a");
    expect(draft?.photo?.size).toBe(5); expect(draft?.items[0]?.qty).toBe(2);
  });
  it("moves a submitted draft into a durable outbox atomically", async () => {
    await saveDraft("rep-a", record()); await enqueue(record());
    expect(await (await fieldDB()).get("drafts", "rep-a")).toBeUndefined();
    expect((await queued("rep-a"))[0]?.orderId).toBe("order-a");
  });
  it("does not send while offline", async () => {
    await enqueue(record()); vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const send = vi.fn(); expect(await syncFieldQueue("rep-a", send)).toBe(0);
    expect(send).not.toHaveBeenCalled(); expect(await queued("rep-a")).toHaveLength(1);
  });
  it("keeps failed records and retries the same IDs without deleting work", async () => {
    await enqueue(record()); const send = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
    await syncFieldQueue("rep-a", send); expect((await queued("rep-a"))[0]?.error).toBe("network");
    expect(await syncFieldQueue("rep-a", send)).toBe(1);
    expect(send.mock.calls[0]?.[0].id).toBe(send.mock.calls[1]?.[0].id);
    expect(await queued("rep-a")).toHaveLength(0);
  });
  it("never sends another account's pending records", async () => {
    await enqueue(record()); identity.id = "rep-b";
    const send = vi.fn(); await syncFieldQueue("rep-a", send);
    expect(send).not.toHaveBeenCalled(); expect(await queued("rep-a")).toHaveLength(1);
  });
  it("blocks workers in previews but allows published custom domains", () => {
    expect(isOfflinePreview("id-preview--example.lovable.app", false, true, false)).toBe(true);
    expect(isOfflinePreview("connectkit-field.lovable.app", false, true, false)).toBe(false);
    expect(isOfflinePreview("preview-v2--shop.example.com", false, true, false)).toBe(false);
    expect(isOfflinePreview("shop.example.com", true, true, false)).toBe(true);
    expect(isOfflinePreview("shop.example.com", false, true, true)).toBe(true);
  });
});