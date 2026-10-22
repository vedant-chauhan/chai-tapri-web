/**
 * Role → capability map (DATABASE.md §1 "permissions as code-defined capabilities",
 * API.md staff endpoint table, SECURITY.md "Privilege misuse"). Deny by default:
 * anything not listed here is not allowed.
 */
import type { StaffRole } from "@/server/db/schema";

export const CAPABILITIES = [
  "board.view",
  "orders.accept",
  "orders.decline",
  "orders.ready",
  "orders.collected",
  "orders.reveal_phone",
  "orders.cancel",
  "orders.refund",
  "ordering.close",
  "ordering.open",
  "availability.edit",
  "hours.edit",
  "menu.edit",
  "staff.manage",
  "integrations.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const STAFF: Capability[] = [
  "board.view",
  "orders.accept",
  "orders.decline",
  "orders.ready",
  "orders.collected",
  "orders.reveal_phone",
  "ordering.close", // staff: until ≤ +2 h (enforced by the endpoint)
  "availability.edit",
];

const MANAGER: Capability[] = [...STAFF, "orders.cancel", "orders.refund", "menu.edit"];

// ordering.open and hours.edit are owner-only in slice 1 (API.md; delegation to managers is a later option).
const OWNER: Capability[] = [...MANAGER, "ordering.open", "hours.edit", "staff.manage", "integrations.manage"];

const BY_ROLE: Record<StaffRole, ReadonlySet<Capability>> = {
  staff: new Set(STAFF),
  manager: new Set(MANAGER),
  owner: new Set(OWNER),
};

export function can(role: StaffRole | null | undefined, capability: Capability): boolean {
  return role ? BY_ROLE[role].has(capability) : false;
}

/** Roles that must have TOTP enabled before they can use the admin (SECURITY.md). */
export const MFA_REQUIRED_ROLES: ReadonlySet<StaffRole> = new Set(["manager", "owner"]);
