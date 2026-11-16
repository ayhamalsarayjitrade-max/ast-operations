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
