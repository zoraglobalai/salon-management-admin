import { Rocket, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardTheme } from '../theme/ThemeProvider';

export function ComingSoonPage() {
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`flex min-h-[400px] flex-col items-center justify-center rounded-[30px] p-8 text-center transition-all ${isDark ? 'bg-[#151821]' : 'bg-white'}`}>
      <div className={`mb-8 flex h-24 w-24 items-center justify-center rounded-3xl ${isDark ? 'bg-[#1C2030] text-[#C9A96E]' : 'bg-[#fdf8f3] text-[#8B5E3C] shadow-sm'}`}>
        <Rocket size={48} className="animate-pulse" />
      </div>
      
      <h1 className={`mb-4 text-3xl font-bold tracking-tight md:text-4xl ${isDark ? 'text-[#F0EBE3]' : 'text-[#17181F]'}`}>
        Coming Soon
      </h1>
      
      <p className={`mb-10 max-w-md text-lg font-medium leading-relaxed ${isDark ? 'text-[#7A7572]' : 'text-[#8d837b]'}`}>
        We're working hard to bring you this feature. Stay tuned for updates as we continue to enhance your salon management experience.
      </p>
      
      <button
        onClick={() => navigate(-1)}
        className={`group flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold transition-all ${
          isDark 
            ? 'bg-[#C9A96E] text-[#0F1115] hover:bg-[#E8C98A]' 
            : 'bg-[#17181F] text-white hover:bg-[#2d2119]'
        } shadow-lg hover:translate-y-[-2px]`}
      >
        <ArrowLeft size={18} className="transition-transform group-hover:translate-x-[-4px]" />
        Go Back
      </button>
      
      <div className="mt-16 grid grid-cols-3 gap-8 opacity-50">
        <div className={`h-1 rounded-full ${isDark ? 'bg-[#222637]' : 'bg-[#E8E1D8]'}`} />
        <div className={`h-1 rounded-full ${isDark ? 'bg-[#C9A96E]' : 'bg-[#8B5E3C]'}`} />
        <div className={`h-1 rounded-full ${isDark ? 'bg-[#222637]' : 'bg-[#E8E1D8]'}`} />
      </div>
    </div>
  );
}
