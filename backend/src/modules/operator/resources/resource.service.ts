import { query } from "../../../database/pool";
import type { AuthUserPayload } from "../../../shared/types/auth";
import { applyTenantFields, buildTenantScope, ensureBranchAccess } from "../../../shared/utils/tenantScope";
import { resourceMap, type ResourceKey } from "./resource.config";

type ResourceItem = Record<string, unknown>;

export function getResource(resource: string) {
  return resourceMap[resource as ResourceKey];
}

export function getScopedFilters(user: AuthUserPayload, resource: NonNullable<ReturnType<typeof getResource>>) {
  const scope = buildTenantScope(user);

  if (resource.branchScopeColumn && user.type !== "admin" && user.type !== "owner") {
    const tenantValue = scope.values[0];
    return {
      filters: ["tenant_id = $1", `${resource.branchScopeColumn} = $2`],
      values: [tenantValue, user.branch_id],
    };
  }

  return scope;
}

export async function listResources(resourceName: string, user: AuthUserPayload) {
  const resource = getResource(resourceName);

  if (!resource) {
    return { status: 404 as const, body: { message: "Resource not found" } };
  }

  if (!resource.roles.includes(user.type)) {
    return { status: 403 as const, body: { message: "Insufficient permissions" } };
  }

  const scope = getScopedFilters(user, resource);
  const where = scope.filters.length ? `WHERE ${scope.filters.join(" AND ")}` : "";
  const result = await query<ResourceItem>(
    `SELECT ${resource.select} FROM ${resource.table} ${where} ORDER BY ${resource.orderBy}`,
    scope.values,
  );

  return { status: 200 as const, body: { items: result.rows } };
}

export async function createResourceItem(resourceName: string, payload: Record<string, unknown>, user: AuthUserPayload) {
  const resource = getResource(resourceName);

  if (!resource) {
    return { status: 404 as const, body: { message: "Resource not found" } };
  }

  if (resource.readonly) {
    return { status: 405 as const, body: { message: "This resource is read-only" } };
  }

  if (!resource.roles.includes(user.type)) {
    return { status: 403 as const, body: { message: "Insufficient permissions" } };
  }

  const resolvedPayload = applyTenantFields(payload, user, resource.ownerBranchOverride);

  if (typeof resolvedPayload.branch_id === "string" && !ensureBranchAccess(user, resolvedPayload.branch_id)) {
    return { status: 403 as const, body: { message: "Branch access denied" } };
  }

  const columns = (resource.createColumns || []).filter((column) => resolvedPayload[column] !== undefined);
  const values = columns.map((column) => resolvedPayload[column]);
  const placeholders = values.map((_, index) => `$${index + 1}`);
  const result = await query<ResourceItem>(
    `
      INSERT INTO ${resource.table} (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING ${resource.select}
    `,
    values,
  );

  return { status: 201 as const, body: { item: result.rows[0] } };
}
