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
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {children}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Please wait...' : submitText}
        </button>
      </div>
    </form>
  );
};
