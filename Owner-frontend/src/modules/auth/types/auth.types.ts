export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  shopName?: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'INDEPENDENT_OWNER' | 'MANAGER';
  mode?: 'OPERATOR' | 'MONITOR';
  tenantId?: string;
  branchId?: string;
  hasManager?: boolean;
  location?: string;
  numberOfBranches?: number;
  branches?: { id: string; name: string; city: string }[];
  passwordResetRequired?: boolean;
  isTemporaryPassword?: boolean;
  createdByRole?: 'ADMIN' | 'OWNER' | 'SYSTEM' | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: User;
    isDefaultPassword?: boolean;
  };
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}
