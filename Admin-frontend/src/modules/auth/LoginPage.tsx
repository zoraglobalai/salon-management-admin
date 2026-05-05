import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { Eye, EyeOff } from 'lucide-react';
import groovmyLogo from '../../assets/groovmy-logo.png';

const EMAIL_MAX_LENGTH = 40;
const PASSWORD_MAX_LENGTH = 20;
const ADMIN_EMAIL_PATTERN = /^[A-Za-z][A-Za-z0-9._%+-]*@gmail\.com$/;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleEmailChange = (value: string) => {
    const sanitizedEmail = value.replace(/\s+/g, '').slice(0, EMAIL_MAX_LENGTH);
    setValidationError('');
    setForm((prev) => ({ ...prev, email: sanitizedEmail }));
  };

  const handlePasswordChange = (value: string) => {
    setValidationError('');
    setForm((prev) => ({ ...prev, password: value.slice(0, PASSWORD_MAX_LENGTH) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!ADMIN_EMAIL_PATTERN.test(form.email) || form.email.length > EMAIL_MAX_LENGTH) {
      setValidationError(
        'Email must start with a letter, contain no spaces, use @gmail.com, and stay within 40 characters.',
      );
      return;
    }

    if (form.password.length > PASSWORD_MAX_LENGTH) {
      setValidationError('Password must be 20 characters or fewer.');
      return;
    }

    setValidationError('');

    try {
      await login(form.email, form.password);
      // Wait for store state to update and verify isAuthenticated
      // The store update is synchronous after the await
      if (useAuthStore.getState().isAuthenticated) {
        navigate('/dashboard');
      }
    } catch {
      // error already set in store
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:28px_28px] opacity-60 pointer-events-none" />

      <div className="relative w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={groovmyLogo}
            alt="Groomvy logo"
            className="mx-auto mb-4 h-20 w-20 rounded-full border border-[var(--color-border)] object-cover shadow-lg"
          />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Groomvy</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Admin Panel</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Welcome back</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Sign in to your admin account</p>
          </div>

          {(validationError || error) && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <span className="mt-0.5">⚠</span>
              <span>{validationError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="text"
                required
                className="input"
                inputMode="email"
                maxLength={EMAIL_MAX_LENGTH}
                placeholder="superadmin@gmail.com"
                value={form.email}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input pr-10"
                  maxLength={PASSWORD_MAX_LENGTH}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] text-center">
              This panel is restricted to Super Administrators only<br />
              Contact your system administrator for access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
