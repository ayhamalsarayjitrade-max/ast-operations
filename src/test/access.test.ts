import { describe, expect, it } from "vitest";
import { canAccessPath, homeForRoles } from "@/lib/access";

describe("role interface isolation", () => {
  it("allows a driver to open only the driver interface among operational interfaces", () => {
    expect(canAccessPath(["driver"], "/driver")).toBe(true);
    expect(canAccessPath(["driver"], "/rep")).toBe(false);
    expect(canAccessPath(["driver"], "/warehouse")).toBe(false);
    expect(canAccessPath(["driver"], "/portal")).toBe(false);
  });
  it("restricts a customer to the customer portal", () => {
    expect(canAccessPath(["customer"], "/portal")).toBe(true);
    expect(canAccessPath(["customer"], "/dashboard")).toBe(false);
    expect(canAccessPath(["customer"], "/driver")).toBe(false);
  });
  it("sends customers and drivers directly to their own home interfaces", () => {
    expect(homeForRoles(["customer"])).toBe("/portal");
    expect(homeForRoles(["driver"])).toBe("/driver");
  });
  it("keeps administration available to admins", () => {
    expect(canAccessPath(["admin"], "/invites")).toBe(true);
    expect(canAccessPath(["admin"], "/team")).toBe(true);
  });
});
