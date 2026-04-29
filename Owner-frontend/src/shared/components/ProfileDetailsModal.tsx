import { useEffect, useState, type ComponentProps } from "react";
import { Pencil, X } from "lucide-react";
import { updateOwnerProfile } from "../../core/api";

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

export function ProfileDetailsModal({
  isOpen,
  onClose,
  profile,
  onSaved,
  onUserUpdated,
}: ProfileDetailsModalProps) {
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

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await updateOwnerProfile({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        shopName: form.shopName,
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-[#eadfce] bg-[rgba(255,250,244,0.98)] p-5 shadow-[0_24px_60px_rgba(54,37,14,0.24)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-[#eadfce] p-2 text-[#6f6558] transition hover:bg-white"
          aria-label="Close profile details"
        >
          <X size={18} />
        </button>

        <h2 className="pr-10 text-2xl font-semibold text-[#1d160f] sm:text-[1.9rem]">Profile Details</h2>

        <div className="mt-5 space-y-3 overflow-y-auto pr-1">
          <label className="block">
            <span className="mb-1.5 block text-lg font-medium text-[#1d160f]">Role:</span>
            <input
              value={roleLabel[profile.role] || "Owner"}
              disabled
              className="w-full rounded-[16px] border border-[#d8c8b4] bg-transparent px-4 py-2.5 text-lg text-[#241910] outline-none"
            />
          </label>

          <FieldRow
            label="Full Name:"
            value={form.fullName}
            isEditing={editing.fullName}
            onChange={(value) => setForm((current) => ({ ...current, fullName: value }))}
            onEdit={() => toggleField("fullName")}
          />

          <FieldRow
            label="Email:"
            value={form.email}
            isEditing={editing.email}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            onEdit={() => toggleField("email")}
            type="email"
          />

          <FieldRow
            label="Phone:"
            value={form.phone}
            isEditing={editing.phone}
            onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
            onEdit={() => toggleField("phone")}
            inputMode="tel"
          />

          <FieldRow
            label="Shop Name:"
            value={form.shopName}
            isEditing={editing.shopName}
            onChange={(value) => setForm((current) => ({ ...current, shopName: value }))}
            onEdit={() => toggleField("shopName")}
          />
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="mt-5 self-start rounded-full bg-[#eadbc9] px-6 py-3 text-lg font-semibold text-[#241910] transition hover:bg-[#e4d3ba] disabled:cursor-not-allowed disabled:opacity-60"
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
  onChange: (value: string) => void;
  onEdit: () => void;
  type?: string;
  inputMode?: ComponentProps<"input">["inputMode"];
};

function FieldRow({
  label,
  value,
  isEditing,
  onChange,
  onEdit,
  type = "text",
  inputMode,
}: FieldRowProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-lg font-medium text-[#1d160f]">{label}</span>
      <div
        className={`flex items-center gap-2 rounded-[16px] border px-3.5 py-2.5 transition-colors ${
          isEditing
            ? "border-[#d7b787] bg-[#fff8ef] shadow-[0_0_0_3px_rgba(215,183,135,0.15)]"
            : "border-[#e4d4c1] bg-[#f7efe6]"
        }`}
      >
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={!isEditing}
          className="min-w-0 flex-1 bg-transparent text-lg text-[#2a1e14] outline-none placeholder:text-[#a08f7d] disabled:cursor-default disabled:text-[#5f5245]"
        />
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-full p-1.5 text-[#8a7158] transition hover:bg-white/70"
          aria-label={`Edit ${label}`}
        >
          <Pencil size={18} />
        </button>
      </div>
    </label>
  );
}
