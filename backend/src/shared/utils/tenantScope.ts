import type { AuthUserPayload } from "../types/auth";
import { UserRole } from "../../entities/platform/User";

const BRANCH_RESTRICTED_TYPES = new Set<AuthUserPayload["type"]>(["manager", "staff"]);

export type TenantScope = {
  filters: string[];
  values: Array<string | null>;
};

export function buildTenantScope(user: AuthUserPayload): TenantScope {
  if (user.type === "admin") {
    return { filters: [], values: [] };
  }

  const filters = ["tenant_id = $1"];
  const values: Array<string | null> = [user.tenant_id];

  if (BRANCH_RESTRICTED_TYPES.has(user.type)) {
    filters.push(`branch_id = $${values.length + 1}`);
    values.push(user.branch_id);
  }

  return { filters, values };
}

export function applyTenantFields<T extends Record<string, unknown>>(
  payload: T,
  user: AuthUserPayload,
  allowBranchOverride = false,
) {
  if (user.type === "admin") {
    return payload;
  }

  return {
    ...payload,
    tenant_id: user.tenant_id,
    branch_id: allowBranchOverride && user.type === "owner" ? payload.branch_id || user.branch_id : user.branch_id,
    user_id: user.user_id,
  };
}

export function ensureBranchAccess(user: AuthUserPayload, branchId: string) {
  if (user.type === "admin" || user.type === "owner") {
    return true;
  }

  return user.branch_id === branchId;
}
