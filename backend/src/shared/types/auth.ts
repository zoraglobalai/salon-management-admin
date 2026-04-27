import type { BusinessRole, OperatorUserType, UserMode } from "../../entities/platform/User";

export type AuthUserPayload = {
  id?: string;
  tenant_id: string | null;
  user_id: string;
  branch_id: string | null;
  type: OperatorUserType;
  role?: BusinessRole;
  mode?: UserMode;
  email: string;
  full_name: string;
  tenant_name?: string;
  branch_name?: string;
};
