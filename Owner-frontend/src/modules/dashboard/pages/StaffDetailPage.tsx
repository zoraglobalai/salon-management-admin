import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Briefcase, Home, CreditCard, Shield } from "lucide-react";
import { fetchStaffById, type StaffMember } from "../../../core/api";
import { useDashboardTheme } from "../../../shared/theme/ThemeProvider";

function mask(value: string, show = 4) {
  if (!value) return "-";
  if (value.length <= show) return value;
  return "*".repeat(value.length - show) + value.slice(-show);
}

function InfoRow({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>{label}</span>
      <span className={`text-sm font-semibold ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{value || "-"}</span>
    </div>
  );
}

function Section({ title, children, icon: Icon, isDark }: { title: string; children: React.ReactNode; icon: any; isDark: boolean }) {
  return (
    <div className={`rounded-3xl border p-6 shadow-sm transition-all hover:shadow-md ${
      isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
    }`}>
      <div className={`flex items-center gap-2 mb-5 pb-3 border-b ${
        isDark ? "border-[rgba(255,255,255,0.05)]" : "border-[#F2EDE7]"
      }`}>
        <Icon size={14} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}`}>
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );
}

function EmptySectionNote({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <div className={`sm:col-span-2 rounded-2xl border border-dashed px-4 py-5 text-sm font-medium ${
      isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030] text-[#7A7572]" : "border-[#E8E1D8] bg-[#FCFAF7] text-gray-500"
    }`}>
      {message}
    </div>
  );
}

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [member, setMember] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchStaffById(id)
      .then((r) => { setMember(r.staff); setError(null); })
      .catch((e: Error) => setError(e.message || "Failed to load staff details."))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 text-sm font-medium ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
        Fetching staff record...
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-6">
        <p className={`text-sm font-bold ${isDark ? "text-[#F87171]" : "text-red-600"}`}>{error || "Record not found."}</p>
        <button onClick={() => navigate(-1)} type="button"
          className={`flex items-center gap-2 rounded-full px-8 py-3 text-sm font-black uppercase tracking-widest transition-all ${
            isDark ? "bg-[rgba(255,255,255,0.05)] text-[#C8BFB4] hover:bg-[rgba(255,255,255,0.1)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}>
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  const joiningDateFormatted = member.joiningDate
    ? new Date(member.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "-";

  const identificationDetails =
    member.identificationDetails?.filter((item) => item.idType || item.idNumber).length
      ? member.identificationDetails.filter((item) => item.idType || item.idNumber)
      : member.idType || member.idNumber
        ? [{ idType: member.idType, idNumber: member.idNumber }]
        : [];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto py-2">
      <div className={`rounded-[32px] border p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-6 transition-all ${
        isDark ? "bg-[#151821] border-[rgba(255,255,255,0.07)]" : "bg-white border-[#E8E1D8]"
      }`}>
        <button onClick={() => navigate(-1)} type="button"
          className={`group flex items-center justify-center h-12 w-12 rounded-2xl border transition-all ${
            isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[#7A7572] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#C8BFB4]" : "bg-gray-50 border-[#F2EDE7] text-gray-400 hover:text-gray-900"
          }`}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex items-center gap-5">
          <div className={`h-16 w-16 shrink-0 rounded-[22px] flex items-center justify-center text-3xl font-black shadow-xl transform rotate-3 transition-transform hover:rotate-0 ${
            isDark ? "bg-[linear-gradient(135deg,#C9A96E,#A67C3D)] text-[#0F1115]" : "bg-[linear-gradient(135deg,#8B5E3C,#4E2D1B)] text-white"
          }`}>
            <span className="-rotate-3">{member.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className={`text-3xl font-black font-['Outfit'] ${isDark ? "text-[#F0EBE3]" : "text-gray-900"}`}>{member.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Briefcase size={12} className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"} />
              <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                {member.role} . <span className={isDark ? "text-[#C8BFB4]" : "text-gray-700"}>{member.locationName?.split("-")[0].trim()}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest ${
            isDark ? "bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[rgba(16,185,129,0.2)]" : "bg-green-50 text-green-700 border border-green-100"
          }`}>
            <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Employment Details" icon={User} isDark={isDark}>
          <InfoRow label="Legal Name" value={member.name} isDark={isDark} />
          <InfoRow label="Primary Contact" value={member.phoneNumber} isDark={isDark} />
          <InfoRow label="Onboarding Date" value={joiningDateFormatted} isDark={isDark} />
          <InfoRow label="Assignment" value={member.locationName} isDark={isDark} />
        </Section>

        <Section title="Payroll & Financials" icon={CreditCard} isDark={isDark}>
          {member.payroll ? (
            <>
              <InfoRow label="Salary Type" value={member.payroll.salaryType === 'monthly' ? 'Monthly' : 'Weekly'} isDark={isDark} />
              <InfoRow label="Salary Amount" value={`₹${member.payroll.salaryAmount}`} isDark={isDark} />
              <InfoRow label="Payment Method" value={member.payroll.paymentMethod} isDark={isDark} />
              {member.payroll.paymentMethod === 'UPI' && (
                <InfoRow label="UPI ID" value={member.payroll.upiId || "-"} isDark={isDark} />
              )}
              {(member.payroll.paymentMethod === 'Bank Transfer' || (!member.payroll.paymentMethod && (member.bankName || member.accountNumber))) && (
                <>
                  <InfoRow label="Institution" value={member.payroll.bankName || member.bankName} isDark={isDark} />
                  <InfoRow label="IFSC Code" value={member.payroll.ifscCode || member.ifscCode} isDark={isDark} />
                  <div className="sm:col-span-2">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Account Number</span>
                      <span className={`text-lg font-black tracking-[0.2em] font-mono ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>
                        {mask(member.payroll.accountNumber || member.accountNumber, 4)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            member.bankName || member.accountNumber || member.ifscCode ? (
              <>
                <InfoRow label="Institution" value={member.bankName} isDark={isDark} />
                <InfoRow label="IFSC Code" value={member.ifscCode} isDark={isDark} />
                <div className="sm:col-span-2">
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Account Number</span>
                    <span className={`text-lg font-black tracking-[0.2em] font-mono ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>
                      {mask(member.accountNumber, 4)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <EmptySectionNote message="Payroll and bank details have not been added for this staff member yet." isDark={isDark} />
            )
          )}
        </Section>

        {(member.currentState || member.currentCity || member.currentAddressLine || member.state || member.city || member.addressLine) && (
          <Section title="Residency" icon={Home} isDark={isDark}>
            {(member.currentState || member.currentCity || member.currentAddressLine) ? (
              <>
                <InfoRow label="Current State" value={member.currentState} isDark={isDark} />
                <InfoRow label="Current City" value={member.currentCity} isDark={isDark} />
                <div className="sm:col-span-2">
                  <InfoRow label="Current Address" value={member.currentAddressLine} isDark={isDark} />
                </div>
              </>
            ) : null}
            {(member.state || member.city || member.addressLine) ? (
              <>
                <InfoRow label="Permanent State" value={member.state} isDark={isDark} />
                <InfoRow label="Permanent City" value={member.city} isDark={isDark} />
                <div className="sm:col-span-2">
                  <InfoRow label="Permanent Address" value={member.addressLine} isDark={isDark} />
                </div>
              </>
            ) : null}
          </Section>
        )}

        <Section title="Identification" icon={Shield} isDark={isDark}>
          {identificationDetails.length > 0 ? (
            identificationDetails.map((item, index) => (
              <div
                key={`${item.idType}-${item.idNumber}-${index}`}
                className={`sm:col-span-2 rounded-2xl border p-4 ${
                  isDark ? "border-[rgba(255,255,255,0.08)] bg-[#1C2030]" : "border-[#F2EDE7] bg-[#FCFAF7]"
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoRow label={`ID Type ${index + 1}`} value={item.idType} isDark={isDark} />
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>Document Number</span>
                    <span className={`text-lg font-black tracking-[0.2em] font-mono ${isDark ? "text-[#E8C98A]" : "text-[#8B5E3C]"}`}>
                      {mask(item.idNumber, 4)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptySectionNote message="No identification documents have been added for this staff member yet." isDark={isDark} />
          )}
        </Section>
      </div>
    </div>
  );
}
