import { describe, expect, it } from "vitest";
import { deliveryProofError } from "@/lib/delivery-proof";

const location = { lat: 25.2, lng: 55.3 };
const photo = new Blob(["photo"], { type: "image/jpeg" });
const signature = new Blob(["signature"], { type: "image/png" });

describe("delivery proof requirements", () => {
  it("requires the recipient name", () => {
    expect(deliveryProofError({ recipientName: "", photo, signature: null, location })).toBe("اكتب اسم المستلم كاملاً");
  });
  it("requires either a photo or a signature", () => {
    expect(deliveryProofError({ recipientName: "محمد أحمد", photo: null, signature: null, location })).toBe("أضف صورة التسليم أو توقيع المستلم");
    expect(deliveryProofError({ recipientName: "محمد أحمد", photo: null, signature, location })).toBeNull();
  });
  it("requires the delivery location", () => {
    expect(deliveryProofError({ recipientName: "محمد أحمد", photo, signature: null, location: null })).toBe("حدّد موقع التسليم الحالي");
  });
  it("accepts a complete recipient, photo and location proof", () => {
    expect(deliveryProofError({ recipientName: "محمد أحمد", photo, signature: null, location })).toBeNull();
  });
});
