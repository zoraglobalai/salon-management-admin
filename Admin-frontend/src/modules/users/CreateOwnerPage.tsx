import React, { useState } from 'react';
import { usersApi } from '../../services/api';
import { UserPlus, Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';

interface CreatedCredential {
  email: string;
  temporaryPassword: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const collapseSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();
const removeAllSpaces = (value: string) => value.replace(/\s+/g, '');
const sanitizeName = (value: string) =>
  value
    .replace(/[^A-Za-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, 30);
const sanitizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 10);
const sanitizeText = (value: string) => value.replace(/\s+/g, ' ').trimStart();
const sanitizeBusinessName = (value: string) =>
  value
    .replace(/[^A-Za-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, 40);

const getInitialFormState = () => ({
  name: '',
  email: '',
  businessName: '',
  phone: '',
  alternativePhone: '',
  mainBranchLocation: '',
  numberOfBranches: 1,
  branchAddresses: [] as string[],
  password: '',
});

const CreateOwnerPage: React.FC = () => {
  const [form, setForm] = useState(getInitialFormState);
  const [branchCountInput, setBranchCountInput] = useState('1');
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCredential | null>(null);
  const [copied, setCopied] = useState(false);

  const syncBranchCount = (value: number) => {
    const normalizedCount = Number.isNaN(value) || value < 1 ? 1 : Math.floor(value);
    const extraBranchCount = Math.max(normalizedCount - 1, 0);

    setForm((current) => ({
      ...current,
      numberOfBranches: normalizedCount,
      branchAddresses: Array.from(
        { length: extraBranchCount },
        (_, index) => current.branchAddresses[index] || ''
      ),
    }));
  };

  const handleBranchCountChange = (value: string) => {
    if (value.trim() === '') {
      setBranchCountInput('1');
      syncBranchCount(1);
      return;
    }

    setBranchCountInput(value);

    const parsedValue = Number(value);
    if (Number.isInteger(parsedValue)) {
      syncBranchCount(parsedValue);
    }
  };

  const normalizeBranchCountInput = () => {
    const normalizedValue =
      branchCountInput.trim() === '' ? 1 : Number.parseInt(branchCountInput, 10);
    const safeValue = Number.isNaN(normalizedValue) || normalizedValue < 1 ? 1 : normalizedValue;

    syncBranchCount(safeValue);
    setBranchCountInput(String(safeValue));
  };

  const handleBranchAddressChange = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      branchAddresses: current.branchAddresses.map((address, addressIndex) =>
        addressIndex === index ? sanitizeText(value) : address
      ),
    }));
  };

  const validateForm = () => {
    const normalizedName = collapseSpaces(form.name);
    const normalizedEmail = removeAllSpaces(form.email).toLowerCase();
    const normalizedBusinessName = collapseSpaces(form.businessName);
    const normalizedMainBranchLocation = collapseSpaces(form.mainBranchLocation);
    const normalizedBranchAddresses = form.branchAddresses.map((address) => collapseSpaces(address));
    const normalizedPhone = form.phone ? sanitizePhone(form.phone) : '';
    const normalizedAlternativePhone = form.alternativePhone
      ? sanitizePhone(form.alternativePhone)
      : '';

    if (!normalizedName) return 'Name is required.';
    if (normalizedName.length > 30) return 'Name must be 30 characters or fewer.';
    if (!/^[A-Za-z ]+$/.test(normalizedName)) return 'Name should contain letters only.';
    if (!normalizedEmail) return 'Email is required.';
    if (!EMAIL_REGEX.test(normalizedEmail)) return 'Please enter a valid email address.';
    if (!normalizedBusinessName) return 'Business name is required.';
    if (normalizedBusinessName.length > 40) return 'Business name must be 40 characters or fewer.';
    if (!/^[A-Za-z0-9 ]+$/.test(normalizedBusinessName)) {
      return 'Business name should not contain special characters.';
    }
    if (!normalizedMainBranchLocation) return 'Main branch location is required.';
    if (normalizedPhone && normalizedPhone.length !== 10) return 'Primary phone must be exactly 10 digits.';
    if (normalizedAlternativePhone && normalizedAlternativePhone.length !== 10) {
      return 'Alternative phone must be exactly 10 digits.';
    }
    if (normalizedBranchAddresses.some((address) => !address)) {
      return 'Please fill in every extra branch address.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setIsLoading(false);
        return;
      }

      const payload = {
        name: collapseSpaces(form.name),
        email: removeAllSpaces(form.email).toLowerCase(),
        businessName: collapseSpaces(form.businessName),
        phone: form.phone ? sanitizePhone(form.phone) : undefined,
        alternativePhone: form.alternativePhone ? sanitizePhone(form.alternativePhone) : undefined,
        mainBranchLocation: collapseSpaces(form.mainBranchLocation),
        numberOfBranches: form.numberOfBranches,
        branchAddresses: form.branchAddresses.map((address) => collapseSpaces(address)),
        password: useCustomPassword && form.password ? form.password.trim() : undefined,
      };

      const res = await usersApi.createOwner(payload);
      setCreated(res.data.data.credentials);
      setForm(getInitialFormState());
      setBranchCountInput('1');
      setUseCustomPassword(false);
      setShowPassword(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create owner.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPassword = async () => {
    if (created?.temporaryPassword) {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const resetForm = () => {
    setCreated(null);
    setError(null);
    setForm(getInitialFormState());
    setBranchCountInput('1');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Create Owner Credentials</h1>
        <p className="page-subtitle">Generate login credentials for salon owners to access the client application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus size={18} className="text-[var(--color-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Owner Information</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Full Name *</label>
                <input
                  id="owner-name"
                  type="text"
                  required
                  className="input"
                  placeholder="Jane Doe"
                  value={form.name}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, name: sanitizeName(e.target.value) })}
                  onBlur={() => setForm((current) => ({ ...current, name: collapseSpaces(current.name) }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Primary Phone</label>
                <input
                  id="owner-phone"
                  type="tel"
                  className="input"
                  placeholder="9876543210"
                  value={form.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Email Address *</label>
                <input
                  id="owner-email"
                  type="email"
                  required
                  className="input"
                  placeholder="owner@salon.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: removeAllSpaces(e.target.value) })}
                  onBlur={() =>
                    setForm((current) => ({ ...current, email: removeAllSpaces(current.email).toLowerCase() }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Alternative Phone</label>
                <input
                  id="owner-alt-phone"
                  type="tel"
                  className="input"
                  placeholder="9876543210"
                  value={form.alternativePhone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => setForm({ ...form, alternativePhone: sanitizePhone(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Business Name *</label>
              <input
                id="owner-business"
                type="text"
                required
                className="input"
                placeholder="The Style Studio"
                value={form.businessName}
                maxLength={40}
                onChange={(e) => setForm({ ...form, businessName: sanitizeBusinessName(e.target.value) })}
                onBlur={() =>
                  setForm((current) => ({ ...current, businessName: collapseSpaces(current.businessName) }))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Main Branch Location *</label>
              <textarea
                id="owner-main-branch-location"
                required
                className="input min-h-[96px] resize-y"
                placeholder="Enter the main branch address"
                value={form.mainBranchLocation}
                onChange={(e) => setForm({ ...form, mainBranchLocation: sanitizeText(e.target.value) })}
                onBlur={() =>
                  setForm((current) => ({
                    ...current,
                    mainBranchLocation: collapseSpaces(current.mainBranchLocation),
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">No. of Branches *</label>
              <input
                id="owner-branch-count"
                type="number"
                min={1}
                required
                className="input"
                value={branchCountInput}
                onChange={(e) => handleBranchCountChange(e.target.value)}
                onBlur={normalizeBranchCountInput}
              />
            </div>

            {form.numberOfBranches > 1 && (
              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-xs text-[var(--color-text-muted)]">
                  Add the addresses for branch 2 onward. The main branch location above is treated as branch 1.
                </div>
                {form.branchAddresses.map((address, index) => (
                  <div key={`branch-address-${index}`}>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">
                      Branch {index + 2} Address *
                    </label>
                    <textarea
                      required
                      className="input min-h-[96px] resize-y"
                      placeholder={`Enter branch ${index + 2} address`}
                      value={address}
                      onChange={(e) => handleBranchAddressChange(index, e.target.value)}
                      onBlur={(e) => handleBranchAddressChange(index, collapseSpaces(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Password</label>
                <button
                  type="button"
                  onClick={() => setUseCustomPassword(!useCustomPassword)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {useCustomPassword ? 'Use auto-generated' : 'Set custom password'}
                </button>
              </div>
              {useCustomPassword ? (
                <div className="relative">
                  <input
                    id="owner-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value.trim() })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5 text-xs text-[var(--color-text-muted)]">
                  A secure password will be auto-generated and shown once after creation.
                </div>
              )}
            </div>

            <button id="create-owner-submit" type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                <>
                  <UserPlus size={14} /> Create Owner Account
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card flex flex-col p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Generated Credentials</h2>

          {created ? (
            <div className="flex-1">
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-green-700">
                  <Check size={16} />
                  <span className="text-sm font-semibold">Owner account created successfully!</span>
                </div>
                <p className="text-xs text-green-600">
                  Share these credentials with the owner. The password will <strong>not</strong> be shown again.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Email</label>
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 font-mono text-sm text-[var(--color-text-primary)]">
                    {created.email}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-secondary)]">Temporary Password</label>
                  <div className="flex gap-2">
                    <div className="flex-1 break-all rounded-lg border border-amber-200 bg-amber-50 p-3 font-mono text-sm text-amber-800">
                      {created.temporaryPassword}
                    </div>
                    <button onClick={copyPassword} className="btn-secondary shrink-0 px-3" title="Copy password">
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                  The owner must change this password on first login to the client application.
                </div>
              </div>

              <button onClick={resetForm} className="btn-secondary mt-5 w-full gap-2">
                <RefreshCw size={13} /> Create Another Owner
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-light)]">
                <UserPlus size={22} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">No credentials generated yet</p>
              <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
                Fill the form and submit to generate login credentials for the salon owner.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          How Credential Management Works
        </h3>
        <div className="grid grid-cols-1 gap-4 text-xs text-[var(--color-text-muted)] md:grid-cols-3">
          <div>
            <strong className="text-[var(--color-text-secondary)]">Create</strong> Fill in the owner details, set the branch count, and add extra branch addresses when needed.
          </div>
          <div>
            <strong className="text-[var(--color-text-secondary)]">Share</strong> Send the generated email and temporary password to the owner securely. The password is shown only once.
          </div>
          <div>
            <strong className="text-[var(--color-text-secondary)]">Access</strong> The owner logs in to the client application and updates their password on first login.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOwnerPage;
