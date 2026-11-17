import { describe, expect, it } from "vitest";
import { detectLang, translate } from "@/lib/i18n";
import { toCSV } from "@/lib/export";

describe("device language", () => {
  it("opens in Bengali on a Bengali phone even if the invite was sent in Arabic", () => {
    Object.defineProperty(navigator, "languages", { value: ["bn-BD", "en"], configurable: true });
    localStorage.clear();
    expect(detectLang()).toBe("bn");
  });
  it("falls back to Arabic for unsupported languages", () => {
    Object.defineProperty(navigator, "languages", { value: ["fr-FR"], configurable: true });
    localStorage.clear();
    expect(detectLang()).toBe("ar");
    expect(translate("ur", "attendance")).toBe("حاضری");
  });
});

describe("excel export", () => {
  it("starts with a BOM and quotes commas", () => {
    const csv = toCSV(["a"], [["x,y"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"x,y"');
  });
});
