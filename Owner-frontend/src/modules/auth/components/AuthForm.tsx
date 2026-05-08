import React from 'react';

interface AuthFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  submitText: string;
  error: string | null;
  children: React.ReactNode;
}

export const AuthForm: React.FC<AuthFormProps> = ({ 
  onSubmit, 
  isLoading, 
  submitText, 
  error, 
  children,
  ...props
}) => {
  return (
    <form className="space-y-6" onSubmit={onSubmit} {...props}>
      {error && (
        <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}
      
      {children}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-[16px] border border-transparent bg-[linear-gradient(135deg,#8B5E3C_0%,#5a3422_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(88,56,32,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(88,56,32,0.2)] focus:outline-none focus:ring-2 focus:ring-[#d9b48a] focus:ring-offset-2 disabled:translate-y-0 disabled:opacity-50"
        >
          {isLoading ? 'Please wait...' : submitText}
        </button>
      </div>
    </form>
  );
};
