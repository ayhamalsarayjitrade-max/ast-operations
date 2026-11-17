import { describe, expect, it } from "vitest";
import { canAccessPath, homeForRoles } from "@/lib/access";

describe("role interface isolation", () => {
  it("allows a driver to open only the driver interface among operational interfaces", () => {
    expect(canAccessPath(["driver"], "/driver")).toBe(true);
    expect(canAccessPath(["driver"], "/rep")).toBe(false);
    expect(canAccessPath(["driver"], "/warehouse")).toBe(false);
  });
  it("gives the removed customer role no interface", () => {
    expect(canAccessPath(["customer"], "/portal")).toBe(false);
    expect(canAccessPath(["customer"], "/dashboard")).toBe(false);
  });
  it("sends drivers directly to their own home interface", () => {
    expect(homeForRoles(["driver"])).toBe("/driver");
  });
  it("keeps administration available to admins", () => {
    expect(canAccessPath(["admin"], "/invites")).toBe(true);
    expect(canAccessPath(["admin"], "/team")).toBe(true);
  });
});

describe("salaries and company totals stay with the manager", () => {
  it("blocks reps and drivers from payroll, team, invites and the company dashboard", () => {
    for (const p of ["/payroll", "/team", "/invites", "/dashboard"]) {
      expect(canAccessPath(["rep"], p)).toBe(false);
      expect(canAccessPath(["driver"], p)).toBe(false);
    }
    expect(canAccessPath(["warehouse"], "/payroll")).toBe(false);
  });
  it("lets reps write customer messages but not drivers", () => {
    expect(canAccessPath(["rep"], "/messages")).toBe(true);
    expect(canAccessPath(["driver"], "/messages")).toBe(false);
  });
});
