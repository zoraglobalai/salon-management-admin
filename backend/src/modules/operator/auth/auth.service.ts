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
        WHERE tenant_id = $1
          AND type = 'manager'
          AND is_active = TRUE
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
      SELECT u.*, t.name AS tenant_name, b.name AS branch_name
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE u.email = $1 AND u.is_active = TRUE
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
