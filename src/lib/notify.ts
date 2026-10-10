import { toast } from "sonner";

let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
}

function chime(kind: "info" | "alert" | "success") {
  if (!ctx) return;
  const notes = kind === "alert" ? [880, 660, 880] : kind === "success" ? [523, 659, 784] : [740, 988];
  notes.forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const t = ctx!.currentTime + i * 0.16;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(ctx!.destination);
    o.start(t);
    o.stop(t + 0.32);
  });
}

export function notify(title: string, body: string, kind: "info" | "alert" | "success" = "info") {
  chime(kind);
  if (kind === "success") toast.success(title, { description: body });
  else if (kind === "alert") toast.warning(title, { description: body });
  else toast.info(title, { description: body });
  try {
    if ("vibrate" in navigator) navigator.vibrate?.(200);
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}

export async function askNotificationPermission() {
  unlockAudio();
  if (!("Notification" in window)) return "unsupported";
  if (window.top !== window.self) return "iframe";
  return Notification.requestPermission();
}
