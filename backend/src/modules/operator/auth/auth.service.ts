import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env";
import { query } from "../../../database/pool";
import { UserMode, UserRole, type AuthenticatedUser, type BusinessRole } from "../../../entities/platform/User";
import type { AuthUserPayload } from "../../../shared/types/auth";

type LoginResultRow = AuthenticatedUser & {
  tenant_name: string | null;
  branch_name: string | null;
};

function toBusinessRole(type: LoginResultRow["type"]): BusinessRole | null {
  if (type === "owner") {
    return UserRole.OWNER;
  }

  if (type === "manager") {
    return UserRole.MANAGER;
  }

  return null;
}

async function resolveMode(user: LoginResultRow): Promise<UserMode | null> {
  const role = toBusinessRole(user.type);

  if (!role) {
    return null;
  }

  if (role === "MANAGER") {
    return UserMode.OPERATOR;
  }

  const managerResult = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM users
        WHERE COALESCE(tenant_id, "tenantId") = $1
          AND (
            type = 'manager'
            OR (type IS NULL AND role = 'MANAGER')
          )
          AND COALESCE(is_active, "isActive", TRUE) = TRUE
      ) AS exists
    `,
    [user.tenant_id],
  );

  return managerResult.rows[0]?.exists ? UserMode.MONITOR : UserMode.OPERATOR;
}

export function signToken(user: LoginResultRow, role: BusinessRole | null, mode: UserMode | null) {
  return jwt.sign(
    {
      tenant_id: user.tenant_id,
      user_id: user.id,
      branch_id: user.branch_id,
      type: user.type,
      role: role ?? undefined,
      mode: mode ?? undefined,
      email: user.email,
      full_name: user.full_name,
      tenant_name: user.tenant_name ?? undefined,
      branch_name: user.branch_name ?? undefined,
    },
    env.JWT_SECRET,
    { expiresIn: "12h" },
  );
}

export async function loginUser(email: string, password: string) {
  const result = await query<LoginResultRow>(
    `
      SELECT
        u.id,
        COALESCE(u.tenant_id, u."tenantId") AS tenant_id,
        COALESCE(u.branch_id, u."branchId") AS branch_id,
        CASE
          WHEN u.type IS NOT NULL THEN u.type
          WHEN u.role = 'SUPER_ADMIN' THEN 'admin'
          WHEN u.role = 'MANAGER' THEN 'manager'
          ELSE 'owner'
        END AS type,
        u.email,
        COALESCE(u.full_name, u.name) AS full_name,
        COALESCE(u.password_hash, u.password) AS password_hash,
        COALESCE(u.is_active, u."isActive", TRUE) AS is_active,
        t.name AS tenant_name,
        b.name AS branch_name
      FROM users u
      LEFT JOIN tenants t ON t.id = COALESCE(u.tenant_id, u."tenantId")
      LEFT JOIN branches b ON b.id = COALESCE(u.branch_id, u."branchId")
      WHERE u.email = $1
        AND COALESCE(u.is_active, u."isActive", TRUE) = TRUE
    `,
    [email.toLowerCase()],
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return null;
  }

  const role = toBusinessRole(user.type);
  const mode = await resolveMode(user);

  return {
    token: signToken(user, role, mode),
    user: {
      id: user.id,
      tenant_id: user.tenant_id,
      user_id: user.id,
      branch_id: user.branch_id,
      type: user.type,
      role: role ?? undefined,
      mode: mode ?? undefined,
      email: user.email,
      full_name: user.full_name,
      tenant_name: user.tenant_name ?? undefined,
      branch_name: user.branch_name ?? undefined,
    } satisfies AuthUserPayload,
  };
}
