import { describe, expect, test } from "bun:test";
import { scopeAdminData } from "@/lib/admin/data-access";
import type { AdminSession } from "@/lib/admin/session";
import { seedAdminData } from "@/data/admin/seed";
import { buildEmptyPermissions, ownerPermissions } from "@/data/admin/permissions";
import { validateOwnedMediaPath, validateProjectDate } from "@/lib/community/validation";
import { safeInternalNext } from "@/lib/cms/result";
import { canDelegatePermissions } from "@/lib/admin/role-access";

const session: AdminSession = {
  userId: seedAdminData.users[0].id, email: "owner@example.test", name: "Owner", avatarPath: null,
  roleId: seedAdminData.roles[0].id,
  role: { ...seedAdminData.roles[0], key: "owner", kind: "system", permissions: ownerPermissions() },
};

describe("server-side CMS data boundaries", () => {
  test("homepage editors retain public picker data without receiving drafts", () => {
    const permissions = buildEmptyPermissions();
    permissions.homepage = ["view", "edit"];
    const data = scopeAdminData(seedAdminData, { ...session, role: { ...session.role, permissions } });
    expect(data.courses).toEqual(seedAdminData.courses.filter((course) => course.status !== "draft"));
    expect(data.testimonials).toEqual(seedAdminData.testimonials.filter((item) => item.visible));
    expect(data.requests).toEqual([]);
  });
  test("staff cannot grant themselves permissions they do not hold", () => {
    const held = buildEmptyPermissions();
    held.users = ["view", "edit"];
    expect(canDelegatePermissions(held, { users: ["view"] })).toBe(true);
    expect(canDelegatePermissions(held, { roles: ["edit"] })).toBe(false);
    expect(canDelegatePermissions(held, { payments: ["edit"] })).toBe(false);
    expect(canDelegatePermissions(held, { users: "edit" })).toBe(false);
  });
  test("owner retains all authorized data", () => {
    expect(scopeAdminData(seedAdminData, session)).toEqual({ ...seedAdminData, currentUserId: session.userId });
  });
  test("restricted staff cannot receive other modules or user details", () => {
    const permissions = buildEmptyPermissions();
    permissions.blog = ["view"];
    const data = scopeAdminData(seedAdminData, { ...session, role: { ...session.role, permissions } });
    expect(data.posts).toEqual(seedAdminData.posts);
    for (const key of ["courses", "trainers", "paths", "requests", "payments", "media", "legal", "testimonials"] as const) {
      expect(data[key]).toEqual([]);
    }
    expect(data.users.map((user) => user.id)).toEqual([session.userId]);
    expect(data.roles.map((role) => role.id)).toEqual([session.roleId]);
    expect(seedAdminData.requests.length).toBeGreaterThan(0);
  });
});

describe("input regressions", () => {
  test("rejects impossible calendar dates accepted by Date.parse", () => {
    for (const date of ["2025-02-29", "2026-02-30", "2026-04-31", "0000-01-01"]) {
      expect(validateProjectDate(date)).not.toBeNull();
    }
    expect(validateProjectDate("2024-02-29")).toBeNull();
    expect(validateProjectDate("")).toBeNull();
  });
  test("rejects dot segments and another member's media", () => {
    const uid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    for (const suffix of [".", "..", "../photo.jpg"]) {
      expect(validateOwnedMediaPath(`community/${uid}/${suffix}`, uid, 1)).not.toBeNull();
    }
    expect(validateOwnedMediaPath(`community/${uid}/photo.jpg`, uid, 1)).toBeNull();
  });
  test("rejects whitespace and backslash redirect tricks", () => {
    for (const path of ["/\t/evil.test", "/\u0000/evil.test", "/foo\\bar", "//evil.test"]) {
      expect(safeInternalNext(path)).toBeNull();
    }
    expect(safeInternalNext("/community?tab=saved")).toBe("/community?tab=saved");
  });
});
