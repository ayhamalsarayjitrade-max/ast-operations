export type DeliveryProofInput = {
  recipientName: string;
  photo: Blob | null;
  signature: Blob | null;
  location: { lat: number; lng: number } | null;
};

export function deliveryProofError(input: DeliveryProofInput) {
  if (input.recipientName.trim().length < 2) return "اكتب اسم المستلم كاملاً";
  if (!input.photo && !input.signature) return "أضف صورة التسليم أو توقيع المستلم";
  if (!input.location) return "حدّد موقع التسليم الحالي";
  if (input.photo && input.photo.size > 10 * 1024 * 1024) return "الصورة أكبر من 10 ميجابايت";
  return null;
}
