import { useSyncExternalStore } from "react";

export const LANGS = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
  { code: "bn", label: "বাংলা", dir: "ltr" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];

const D = {
  home: ["الرئيسية", "Home", "ہوم", "होम", "হোম"],
  rep: ["زيارة جديدة", "New visit", "نیا دورہ", "नई विज़िट", "নতুন ভিজিট"],
  warehouse: ["المستودع", "Warehouse", "گودام", "गोदाम", "গুদাম"],
  dispatch: ["الإسناد والتتبع", "Dispatch", "ترسیل", "डिस्पैच", "ডিসপ্যাচ"],
  driver: ["طلباتي", "My deliveries", "میری ڈیلیوریاں", "मेरी डिलीवरी", "আমার ডেলিভারি"],
  deliveries: ["إثباتات التسليم", "Delivery proofs", "ڈیلیوری ثبوت", "डिलीवरी प्रमाण", "ডেলিভারি প্রমাণ"],
  visits: ["الزيارات", "Visits", "دورے", "विज़िट", "ভিজিট"],
  messages: ["رسائل العملاء", "Customer messages", "گاہک پیغامات", "ग्राहक संदेश", "গ্রাহক বার্তা"],
  invites: ["الدعوات", "Invites", "دعوتیں", "आमंत्रण", "আমন্ত্রণ"],
  attendance: ["الحضور", "Attendance", "حاضری", "हाज़िरी", "উপস্থিতি"],
  payroll: ["الرواتب", "Payroll", "تنخواہ", "वेतन", "বেতন"],
  team: ["الفريق", "Team", "ٹیم", "टीम", "টিম"],
  menu: ["القائمة", "Menu", "مینو", "मेनू", "মেনু"],
  g_field: ["الميدان", "Field", "فیلڈ", "फ़ील्ड", "মাঠ"],
  g_ops: ["المستودع والتوصيل", "Warehouse & delivery", "گودام اور ترسیل", "गोदाम और डिलीवरी", "গুদাম ও ডেলিভারি"],
  g_people: ["الموظفون والإدارة", "Staff & admin", "عملہ اور انتظام", "स्टाफ़ और प्रबंधन", "কর্মী ও প্রশাসন"],
  language: ["اللغة", "Language", "زبان", "भाषा", "ভাষা"],
  notifications: ["تفعيل الإشعارات", "Enable notifications", "اطلاعات فعال کریں", "सूचनाएँ चालू करें", "নোটিফিকেশন চালু করুন"],
  password: ["تغيير كلمة المرور", "Change password", "پاس ورڈ تبدیل کریں", "पासवर्ड बदलें", "পাসওয়ার্ড বদলান"],
  logout: ["تسجيل الخروج", "Sign out", "لاگ آؤٹ", "साइन आउट", "সাইন আউট"],
  install: ["ثبّت التطبيق على هاتفك", "Install the app on your phone", "ایپ اپنے فون پر انسٹال کریں", "ऐप फ़ोन पर इंस्टॉल करें", "অ্যাপটি ফোনে ইনস্টল করুন"],
  install_btn: ["تثبيت", "Install", "انسٹال", "इंस्टॉल", "ইনস্টল"],
  installed: ["التطبيق مثبت على جهازك ✓", "App installed on this device ✓", "ایپ انسٹال ہے ✓", "ऐप इंस्टॉल है ✓", "অ্যাপ ইনস্টল আছে ✓"],
  ios_steps: ["في Safari: اضغط زر المشاركة ⎋ ثم «إضافة إلى الشاشة الرئيسية» ➕", "In Safari: tap Share ⎋ then “Add to Home Screen” ➕", "Safari میں: شیئر ⎋ دبائیں پھر “Add to Home Screen” ➕", "Safari में: शेयर ⎋ दबाएँ फिर “Add to Home Screen” ➕", "Safari-তে: শেয়ার ⎋ চাপুন তারপর “Add to Home Screen” ➕"],
  android_steps: ["من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»", "From the browser menu ⋮ choose “Install app” or “Add to Home screen”", "براؤزر مینو ⋮ سے “Install app” منتخب کریں", "ब्राउज़र मेनू ⋮ से “Install app” चुनें", "ব্রাউজার মেনু ⋮ থেকে “Install app” বাছুন"],
  later: ["لاحقاً", "Later", "بعد میں", "बाद में", "পরে"],
  no_access: ["هذه الواجهة غير متاحة لدورك", "This screen is not available for your role", "یہ اسکرین آپ کے کردار کے لیے نہیں", "यह स्क्रीन आपकी भूमिका के लिए नहीं है", "এই স্ক্রিন আপনার ভূমিকার জন্য নয়"],
  back_home: ["العودة إلى واجهتي", "Back to my screen", "میری اسکرین پر واپس", "मेरी स्क्रीन पर लौटें", "আমার স্ক্রিনে ফিরুন"],
  waiting_role: ["بانتظار تحديد الصلاحية", "Waiting for your role", "کردار کا انتظار", "भूमिका का इंतज़ार", "ভূমিকার অপেক্ষা"],
  waiting_role_desc: ["اطلب من المدير تعيين دورك.", "Ask the manager to assign your role.", "مینیجر سے کردار مقرر کروائیں۔", "मैनेजर से अपनी भूमिका तय करवाएँ।", "ম্যানেজারকে আপনার ভূমিকা দিতে বলুন।"],
  invite_title: ["دعوة للانضمام إلى فريقك", "You're invited to join your team", "اپنی ٹیم میں شامل ہونے کی دعوت", "अपनी टीम से जुड़ने का निमंत्रण", "আপনার দলে যোগ দেওয়ার আমন্ত্রণ"],
  invite_desc: ["أنشئ حسابك من الرابط نفسه، ثم يمنحك المدير الصلاحية المناسبة لعملك.", "Create your account from this link, then the manager gives you the right access.", "اسی لنک سے اکاؤنٹ بنائیں، پھر مینیجر آپ کو رسائی دے گا۔", "इसी लिंक से खाता बनाएँ, फिर मैनेजर आपको सही पहुँच देगा।", "এই লিংক থেকে অ্যাকাউন্ট খুলুন, তারপর ম্যানেজার আপনাকে অনুমতি দেবেন।"],
  invite_create: ["إنشاء حسابي", "Create my account", "میرا اکاؤنٹ بنائیں", "मेरा खाता बनाएँ", "আমার অ্যাকাউন্ট খুলুন"],
  invite_have: ["لدي حساب بالفعل", "I already have an account", "میرا اکاؤنٹ پہلے سے ہے", "मेरा खाता पहले से है", "আমার অ্যাকাউন্ট আছে"],
  excel: ["إكسيل", "Excel", "ایکسل", "एक्सेल", "এক্সেল"],
  print: ["طباعة", "Print", "پرنٹ", "प्रिंट", "প্রিন্ট"],
} satisfies Record<string, [string, string, string, string, string]>;
export type TKey = keyof typeof D;

const KEY = "ast-lang";
let current: Lang = "ar";
const listeners = new Set<() => void>();

export function detectLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const saved = localStorage.getItem(KEY);
    const cands = [q, saved, ...(navigator.languages ?? [navigator.language])];
    for (const c of cands) {
      const base = c?.toLowerCase().split("-")[0];
      if (base && LANGS.some((l) => l.code === base)) return base as Lang;
    }
  } catch { /* ignore */ }
  return "ar";
}
function apply(l: Lang) {
  current = l;
  const meta = LANGS.find((x) => x.code === l)!;
  document.documentElement.lang = l;
  document.documentElement.dir = meta.dir;
  listeners.forEach((f) => f());
}
/** Call once from an effect after hydration. */
export function initLang() { apply(detectLang()); }
export function setLang(l: Lang) { try { localStorage.setItem(KEY, l); } catch { /* ignore */ } apply(l); }
export function translate(l: Lang, k: TKey) { return D[k][LANGS.findIndex((x) => x.code === l)] ?? D[k][0]; }

export function useLang() {
  const lang = useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => current, () => "ar" as Lang);
  return { lang, t: (k: TKey) => translate(lang, k), dir: LANGS.find((x) => x.code === lang)!.dir };
}
