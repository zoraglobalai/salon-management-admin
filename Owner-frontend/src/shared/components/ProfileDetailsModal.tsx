import { useEffect, useState, type ComponentProps } from "react";
import { Pencil, X } from "lucide-react";
import { updateOwnerProfile } from "../../core/api";
import { useDashboardTheme } from "../theme/ThemeProvider";
import { cn } from "../utils/cn";

type ProfileDetails = {
  role: "OWNER" | "INDEPENDENT_OWNER" | "MANAGER" | "SUPER_ADMIN";
  fullName: string;
  email: string;
  phone: string;
  shopName: string;
};

type ProfileDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileDetails | null;
  onSaved: () => Promise<void> | void;
  onUserUpdated: (payload: {
    name: string;
    email: string;
    phone: string;
    shopName: string;
  }) => void;
};

const roleLabel: Record<ProfileDetails["role"], string> = {
  OWNER: "Owner",
  INDEPENDENT_OWNER: "Owner",
  MANAGER: "Manager",
  SUPER_ADMIN: "Super Admin",
};

const fullNamePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const gmailPattern = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;
const shopNamePattern = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/;

function normalizeSingleSpaces(value: string) {
  return value.replace(/\s+/g, " ").replace(/^\s+/, "");
}

function sanitizeFullName(value: string) {
  return normalizeSingleSpaces(value).replace(/[^A-Za-z ]/g, "").slice(0, 40);
}

function sanitizeEmail(value: string) {
  return value.replace(/\s+/g, "");
}

function sanitizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function sanitizeShopName(value: string) {
  return normalizeSingleSpaces(value).slice(0, 50);
}

export function ProfileDetailsModal({
  isOpen,
  onClose,
  profile,
  onSaved,
  onUserUpdated,
}: ProfileDetailsModalProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    shopName: "",
  });
  const [editing, setEditing] = useState({
    fullName: false,
    email: false,
    phone: false,
    shopName: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !isOpen) return;
    setForm({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      shopName: profile.shopName || "",
    });
    setEditing({
      fullName: false,
      email: false,
      phone: false,
      shopName: false,
    });
    setError(null);
  }, [profile, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !profile) {
    return null;
  }

  const toggleField = (field: keyof typeof editing) => {
    setEditing((current) => ({ ...current, [field]: !current[field] }));
  };

  const validateForm = () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const shopName = form.shopName.trim();

    if (!fullName) {
      return "Full name is required.";
    }

    if (fullName.length > 40 || !fullNamePattern.test(fullName)) {
      return "Full name must be 40 characters or fewer and contain only letters with single spaces.";
    }

    if (!email) {
      return "Email is required.";
    }

    if (!gmailPattern.test(email)) {
      return "Email must be a valid @gmail.com address.";
    }

    if (!/^\d{10}$/.test(phone)) {
      return "Phone must contain exactly 10 digits.";
    }

    if (!shopName) {
      return "Shop name is required.";
    }

    if (shopName.length > 50 || !shopNamePattern.test(shopName)) {
      return "Shop name must be 50 characters or fewer and use only single spaces between words.";
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await updateOwnerProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        shopName: form.shopName.trim(),
      });

      onUserUpdated({
        name: response.data.fullName,
        email: response.data.email,
        phone: response.data.phone,
        shopName: response.data.shopName,
      });

      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[70] flex items-center justify-center px-4 py-6 transition-colors duration-300",
      isDark ? "bg-black/60 backdrop-blur-sm" : "bg-black/35 backdrop-blur-sm"
    )}>
      <div className={cn(
        "relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border p-5 sm:p-6 transition-all duration-200",
        "bg-[rgba(255,250,244,0.98)] border-[#eadfce] shadow-[0_24px_60px_rgba(54,37,14,0.24)]",
        "dark:bg-[#151821] dark:border-[rgba(255,255,255,0.07)] dark:shadow-card-dark"
      )}>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute right-5 top-5 rounded-full border p-2 transition-all",
            "border-[#eadfce] text-[#6f6558] hover:bg-white",
            "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#1C2030] dark:text-[#C8BFB4] dark:hover:bg-white/5 dark:hover:text-[#F0EBE3]"
          )}
          aria-label="Close profile details"
        >
          <X size={18} />
        </button>

        <h2 className={cn(
          "pr-10 text-3xl font-black font-['Outfit'] tracking-tight transition-colors",
          "text-[#1d160f] dark:text-[#F0EBE3]"
        )}>
          Profile Details
        </h2>

        <div className="mt-5 space-y-4 overflow-y-auto pr-1 scrollbar-hide">
          <label className="block">
            <span className={cn(
              "mb-1.5 block text-[13px] font-bold transition-colors",
              "text-[#1d160f] dark:text-[#C8BFB4]"
            )}>Role</span>
            <input
              value={roleLabel[profile.role] || "Owner"}
              disabled
              className={cn(
                "w-full rounded-[14px] border px-3.5 py-2 text-[14px] font-semibold outline-none transition-all",
                "border-[#d8c8b4] bg-transparent text-[#241910]",
                "dark:border-[rgba(255,255,255,0.07)] dark:bg-[#1C2030] dark:text-[#7A7572]"
              )}
            />
          </label>

          <FieldRow
            label="Full Name"
            value={form.fullName}
            isEditing={editing.fullName}
            isDark={isDark}
            onChange={(value) => {
              setForm((current) => ({ ...current, fullName: sanitizeFullName(value) }));
              setError(null);
            }}
            onEdit={() => toggleField("fullName")}
            maxLength={40}
          />

          <FieldRow
            label="Email"
            value={form.email}
            isEditing={editing.email}
            isDark={isDark}
            onChange={(value) => {
              setForm((current) => ({ ...current, email: sanitizeEmail(value) }));
              setError(null);
            }}
            onEdit={() => toggleField("email")}
            type="email"
          />

          <FieldRow
            label="Phone"
            value={form.phone}
            isEditing={editing.phone}
            isDark={isDark}
            onChange={(value) => {
              setForm((current) => ({ ...current, phone: sanitizePhone(value) }));
              setError(null);
            }}
            onEdit={() => toggleField("phone")}
            inputMode="tel"
            maxLength={10}
          />

          <FieldRow
            label="Shop Name"
            value={form.shopName}
            isEditing={editing.shopName}
            isDark={isDark}
            onChange={(value) => {
              setForm((current) => ({ ...current, shopName: sanitizeShopName(value) }));
              setError(null);
            }}
            onEdit={() => toggleField("shopName")}
            maxLength={50}
          />
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className={cn(
            "mt-6 self-end rounded-full px-6 py-2.5 text-[14px] font-bold text-white transition-all",
            "bg-[#8B5E3C] shadow-[0_8px_20px_rgba(139,94,60,0.2)] hover:-translate-y-0.5 hover:bg-[#744A2E]",
            "dark:bg-[#C9A96E] dark:text-[#0F1115] dark:shadow-[0_8px_20px_rgba(201,169,110,0.2)] dark:hover:brightness-110",
            "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          )}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

type FieldRowProps = {
  label: string;
  value: string;
  isEditing: boolean;
  isDark: boolean;
  onChange: (value: string) => void;
  onEdit: () => void;
  type?: string;
  inputMode?: ComponentProps<"input">["inputMode"];
  maxLength?: number;
};

function FieldRow({
  label,
  value,
  isEditing,
  isDark,
  onChange,
  onEdit,
  type = "text",
  inputMode,
  maxLength,
}: FieldRowProps) {
  return (
    <label className="block">
      <span className={cn(
        "mb-1.5 block text-[13px] font-bold transition-colors",
        "text-[#1d160f] dark:text-[#C8BFB4]"
      )}>{label}</span>
      <div
        className={cn(
          "flex items-center gap-2 rounded-[14px] border px-3 py-1.5 transition-all",
          isEditing
            ? "border-[#d7b787] bg-[#fff8ef] shadow-[0_0_0_3px_rgba(215,183,135,0.15)] dark:border-[#C9A96E] dark:bg-[#C9A96E]/5 dark:shadow-[0_0_0_3px_rgba(201,169,110,0.15)]"
            : "border-[#e4d4c1] bg-[#f7efe6] dark:border-[rgba(255,255,255,0.07)] dark:bg-[#1C2030]"
        )}
      >
        <input
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={!isEditing}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none transition-colors",
            "text-[#2a1e14] placeholder:text-[#a08f7d] disabled:text-[#5f5245]",
            "dark:text-[#F0EBE3] dark:placeholder:text-[#4A4744] dark:disabled:text-[#7A7572]"
          )}
        />
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "shrink-0 rounded-full p-1.5 transition-all",
            "text-[#8a7158] hover:bg-[#eaddcc]",
            "dark:text-[#C8BFB4] dark:hover:bg-white/5 dark:hover:text-[#F0EBE3]"
          )}
          aria-label={`Edit ${label}`}
        >
          <Pencil size={15} />
        </button>
      </div>
    </label>
  );
}
