import React from 'react';
import logo from '../../../assets/Groomvy Logo word.png';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-[radial-gradient(circle_at_top_left,rgba(122,74,52,0.18),transparent_24%),linear-gradient(135deg,#f8f4ee_0%,#f4efe8_45%,#fbfaf8_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <img src={logo} alt="Groomvy Logo" className="mb-3 h-20 w-auto" />
          <p className="text-center text-sm font-medium text-[#8a6b58]">
            Owner portal login
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-[24px] border border-[rgba(139,94,60,0.12)] bg-[rgba(255,251,246,0.96)] px-5 py-8 shadow-[0_18px_42px_rgba(88,56,32,0.12)] backdrop-blur-sm sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
};
