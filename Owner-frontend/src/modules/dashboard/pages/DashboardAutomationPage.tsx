import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";
import { MessageSquare, Bell, Zap, ShieldCheck } from "lucide-react";

export function DashboardAutomationPage() {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  const features = [
    {
      title: "Smart Appointment Nudges",
      description: "Automated WhatsApp reminders sent before booked slots to reduce no-shows and follow-ups for missed sessions.",
      icon: Bell
    },
    {
      title: "Localized Engagement",
      description: "Run targeted branch-specific campaigns tied to your current inventory levels and staff availability.",
      icon: Zap
    },
    {
      title: "Secure Communication",
      description: "Keep all customer messaging branch-specific and secure without exposing global subscription or owner-level controls.",
      icon: ShieldCheck
    }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-4">
      {/* Premium Header */}
      <div className={`rounded-[32px] border p-8 shadow-sm transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform rotate-3 ${
            isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[#8B5E3C] text-white"
          }`}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className={`text-3xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Branch WhatsApp Flows</h2>
            <div className={`flex items-center gap-2 mt-1 text-[10px] font-black uppercase tracking-widest ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
              <ShieldCheck size={12} />
              Manager-Safe Controls
            </div>
          </div>
        </div>
        <p className={`text-sm font-medium leading-loose max-w-2xl ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
          Enhance your branch operations with intelligent automation. Our WhatsApp integration ensures 
          your local customer base remains engaged while maintaining strict operational security for the owner.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, idx) => (
          <div key={idx} className={`group rounded-[32px] border p-6 transition-all hover:shadow-xl hover:-translate-y-1 ${
            isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)] hover:border-[rgba(201,169,110,0.3)]" : "bg-white border-[#E8E1D8] hover:border-[#8B5E3C]"
          }`}>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-6 transition-all ${
              isDark ? "bg-[rgba(255,255,255,0.03)] text-[#C9A96E]" : "bg-gray-50 text-[#8B5E3C]"
            }`}>
              <feature.icon size={20} />
            </div>
            <h3 className={`text-lg font-black font-['Outfit'] mb-3 ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{feature.title}</h3>
            <p className={`text-xs font-bold leading-relaxed ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA / Status Section */}
      <div className={`rounded-[32px] border border-dashed p-10 flex flex-col items-center text-center transition-all ${
        isDark ? "bg-[rgba(201,169,110,0.03)] border-[rgba(201,169,110,0.2)]" : "bg-gray-50 border-[#E8E1D8]"
      }`}>
        <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-6 ${
          isDark ? "bg-[rgba(201,169,110,0.1)] text-[#E8C98A]" : "bg-[#FBF9F6] text-[#8B5E3C]"
        }`}>
          <Zap size={32} className="animate-pulse" />
        </div>
        <h4 className={`text-xl font-black font-['Outfit'] mb-2 ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>Ready to amplify your reach?</h4>
        <p className={`text-sm font-medium mb-8 max-w-md ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
          WhatsApp automation is currently being rolled out across select branches. Contact support to enable these flows for your location.
        </p>
        <button className={`px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1 ${
          isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-gray-900 text-white"
        }`}>
          Activate Branch Flows
        </button>
      </div>
    </div>
  );
}
