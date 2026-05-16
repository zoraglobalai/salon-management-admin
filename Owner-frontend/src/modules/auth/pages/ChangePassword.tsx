import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AuthForm } from '../components/AuthForm';
import { authApi } from '../services/auth.api';
import { Eye, EyeOff } from 'lucide-react';

export const ChangePassword: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      setSuccess('Password updated successfully. You will be redirected shortly.');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-[380px]">
      <div className="mb-5 text-center">
        <h3 className="text-3xl font-semibold text-gray-900">Change Password</h3>
        <p className="mt-2 text-sm text-gray-600">
          Please update your password to something secure.
        </p>
      </div>
      
      {success && (
        <div className="mb-4 bg-green-50 p-3 rounded-md border border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <AuthForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
        submitText="Update password" 
        error={error}
      >
        <div>
          <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <div className="relative mt-1">
            <input
              id="oldPassword"
              type={showOldPassword ? "text" : "password"}
              required
              placeholder="Enter current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="appearance-none block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-[#8B5E3C] focus:outline-none focus:ring-[#8B5E3C] sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword((current) => !current)}
              className="absolute right-3 top-2.5 text-[#8a6b58] transition hover:text-[#5b321c] focus:outline-none"
            >
              {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="relative mt-1">
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              required
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="appearance-none block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-[#8B5E3C] focus:outline-none focus:ring-[#8B5E3C] sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((current) => !current)}
              className="absolute right-3 top-2.5 text-[#8a6b58] transition hover:text-[#5b321c] focus:outline-none"
            >
              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <div className="relative mt-1">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-[#8B5E3C] focus:outline-none focus:ring-[#8B5E3C] sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-3 top-2.5 text-[#8a6b58] transition hover:text-[#5b321c] focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <button 
            type="button"
            onClick={() => navigate('/dashboard')} 
            className="cursor-pointer border-0 bg-transparent text-sm font-medium text-[#8B5E3C] hover:text-[#5a3422]"
          >
            Skip for now
          </button>
        </div>
      </AuthForm>
      </div>
    </AuthLayout>
  );
};
