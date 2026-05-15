import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isLoading, error, showDefaultPasswordModal, closeDefaultPasswordModal } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <h3 className="font-['Outfit'] text-3xl font-semibold tracking-[-0.03em] text-[#17181F]">Login</h3>
        <p className="mt-2 text-sm text-[#8a6b58]">
          Sign in with your Groomvy owner account
        </p>
      </div>
      
      <AuthForm 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
        submitText="Sign in" 
        error={error}
      >
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#4d3b2f]">
            Email address
          </label>
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Enter your email address"
              value={email}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
              className="block w-full rounded-[14px] border border-[rgba(139,94,60,0.16)] bg-white px-4 py-3 pl-11 text-sm text-[#17181F] shadow-sm outline-none transition-all placeholder:text-[#b09a8a] focus:border-[#8B5E3C] focus:ring-4 focus:ring-[rgba(139,94,60,0.12)]"
            />
            <Mail size={16} className="absolute left-3.5 top-3.5 text-[#8B5E3C]" />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#4d3b2f]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Enter your password"

              value={password}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
              className="block w-full rounded-[14px] border border-[rgba(139,94,60,0.16)] bg-white px-4 py-3 pl-11 pr-11 text-sm text-[#17181F] shadow-sm outline-none transition-all placeholder:text-[#b09a8a] focus:border-[#8B5E3C] focus:ring-4 focus:ring-[rgba(139,94,60,0.12)]"
            />
            <Lock size={16} className="absolute left-3.5 top-3.5 text-[#8B5E3C]" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-[#8a6b58] transition hover:text-[#5b321c] focus:outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <Link to="/forgot-password" className="font-medium text-[#8B5E3C] hover:text-[#5a3422]">
              Forgot your password?
            </Link>
          </div>
        </div>
      </AuthForm>

      {/* Default Password Modal */}
      {showDefaultPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(248,244,238,0.96)] px-4 py-4 backdrop-blur-[6px]"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[360px] rounded-[24px] border border-[rgba(139,94,60,0.14)] bg-[linear-gradient(180deg,rgba(255,253,250,0.98)_0%,rgba(248,241,233,0.98)_100%)] p-4 shadow-[0_22px_52px_rgba(88,56,32,0.22)] sm:p-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f5e3cf_0%,#edd1b3_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <ShieldAlert size={20} className="text-[#8B5E3C]" />
            </div>

            <div className="mt-3 text-center">
              <h3 className="mx-auto max-w-[240px] font-['Outfit'] text-[1.4rem] font-semibold leading-tight tracking-[-0.03em] text-[#17181F]" id="modal-title">
                Update Password Recommended
              </h3>
              <p className="mx-auto mt-2.5 max-w-[280px] text-[13px] leading-6 text-[#8a6b58]">
                You are using the default password for this account. For better security, we recommend changing it before continuing into the owner dashboard.
              </p>
            </div>

            <div className="mx-auto mt-4 max-w-[300px] rounded-[16px] border border-[rgba(139,94,60,0.1)] bg-white/70 px-3.5 py-2.5 text-center text-[11px] font-medium leading-5 text-[#7a6657]">
              Changing it now helps protect client data, sales activity, and branch access.
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
              <Link
                to="/change-password"
                className="inline-flex w-full items-center justify-center rounded-[14px] border border-transparent bg-[linear-gradient(135deg,#8B5E3C_0%,#5a3422_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(88,56,32,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(88,56,32,0.2)] focus:outline-none focus:ring-2 focus:ring-[#d9b48a] focus:ring-offset-2"
              >
                Change Password
              </Link>
              <button
                type="button"
                onClick={closeDefaultPasswordModal}
                className="inline-flex w-full items-center justify-center rounded-[14px] border border-[rgba(139,94,60,0.16)] bg-white px-4 py-2.5 text-sm font-semibold text-[#5a3422] shadow-sm transition-all hover:bg-[#faf4ee] focus:outline-none focus:ring-2 focus:ring-[#d9b48a] focus:ring-offset-2"
              >
                Continue to App
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};
