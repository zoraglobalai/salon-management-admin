import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { AuthForm } from '../components/AuthForm';
import { authApi } from '../services/auth.api';
import { getStoredOwnerUser, updateStoredOwnerUser } from '../services/sessionSync';

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const CreateNewPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Confirm password must match new password.');
      return;
    }

    if (!PASSWORD_RULE.test(newPassword)) {
      setError('Use at least 8 chars with uppercase, lowercase, number, and special character.');
      return;
    }

    try {
      setIsLoading(true);
      await authApi.createNewPassword({ newPassword });

      const user = getStoredOwnerUser();
      if (user) {
        updateStoredOwnerUser({
          ...user,
          passwordResetRequired: false,
          isTemporaryPassword: false,
        });
      }

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Unable to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h3 className="font-['Outfit'] text-3xl font-semibold tracking-[-0.03em] text-[#17181F]">Create New Password</h3>
        <p className="mt-2 text-sm text-[#8a6b58]">Set a secure password to continue to your dashboard.</p>
      </div>

      <AuthForm onSubmit={handleSubmit} isLoading={isLoading} submitText="Save new password" error={error}>
        <div>
          <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-[#4d3b2f]">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full rounded-[14px] border border-[rgba(139,94,60,0.16)] bg-white px-4 py-3 pr-11 text-sm text-[#17181F] shadow-sm outline-none transition-all placeholder:text-[#b09a8a] focus:border-[#8B5E3C] focus:ring-4 focus:ring-[rgba(139,94,60,0.12)]"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a6b58] transition hover:text-[#5b321c] focus:outline-none"
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#4d3b2f]">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-[14px] border border-[rgba(139,94,60,0.16)] bg-white px-4 py-3 pr-11 text-sm text-[#17181F] shadow-sm outline-none transition-all placeholder:text-[#b09a8a] focus:border-[#8B5E3C] focus:ring-4 focus:ring-[rgba(139,94,60,0.12)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a6b58] transition hover:text-[#5b321c] focus:outline-none"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </AuthForm>
    </AuthLayout>
  );
};
