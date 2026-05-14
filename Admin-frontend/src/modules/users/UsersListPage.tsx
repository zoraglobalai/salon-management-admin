import React, { useEffect, useState } from 'react';
import { subscriptionsApi, usersApi } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import { Search, RefreshCw, Users } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  businessName: string;
  ownerType: string;
  status: string;
  phone: string;
  createdAt: string;
  branches: any[];
  currentSubscription?: {
    plan: string;
    status: string;
    endDate: string;
  } | null;
}

interface UsersListPageProps {
  statusFilter?: string;
  title?: string;
  subtitle?: string;
}

const UsersListPage: React.FC<UsersListPageProps> = ({ statusFilter, title = 'Users', subtitle }) => {
  const [users, setUsers] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Tenant | null>(null);
  const [targetPlan, setTargetPlan] = useState<'STANDARD' | 'PRO'>('PRO');
  const [step, setStep] = useState<'select' | 'summary' | 'gateway'>('select');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH'>('UPI');
  const [selectedUpi, setSelectedUpi] = useState<'GPay' | 'PhonePe' | 'Paytm'>('GPay');
  const [pricing, setPricing] = useState<{ basePlanPrice: number; remainingCredit: number; finalPayableAmount: number } | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const getCurrentPlan = (row: Tenant): 'TRIAL' | 'STANDARD' | 'PRO' => {
    const normalized = (row.currentSubscription?.plan || '').toUpperCase();
    if (normalized === 'PRO') return 'PRO';
    if (normalized === 'STANDARD' || normalized === 'BASIC') return 'STANDARD';
    return 'TRIAL';
  };

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await usersApi.getAll(statusFilter);
      setUsers(res.data.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.businessName.toLowerCase().includes(search.toLowerCase())
  );

  const openPlanModal = (row: Tenant) => {
    const current = getCurrentPlan(row);
    setSelectedUser(row);
    setTargetPlan(current === 'TRIAL' ? 'STANDARD' : 'PRO');
    setStep('select');
    setPaymentMethod('UPI');
    setSelectedUpi('GPay');
    setPricing(null);
    setPlanModalOpen(true);
  };

  const loadPricing = async (tenantId: string, plan: 'STANDARD' | 'PRO') => {
    const res = await subscriptionsApi.adminGetPricing({ tenantId, plan });
    const data = res.data.data || {};
    setPricing({
      basePlanPrice: Number(data.basePlanPrice || 0),
      remainingCredit: Number(data.remainingCredit || 0),
      finalPayableAmount: Number(data.finalPayableAmount || 0),
    });
  };

  const goToPaymentStep = async () => {
    if (!selectedUser) return;
    const currentPlan = getCurrentPlan(selectedUser);
    if (currentPlan === 'PRO' && targetPlan === 'PRO') return;
    if (currentPlan === 'STANDARD' && targetPlan === 'STANDARD') return;
    setUpdatingPlan(true);
    try {
      await loadPricing(selectedUser.id, targetPlan);
      setStep('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load pricing.');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const applyPlanChange = async () => {
    if (!selectedUser) return;
    setUpdatingPlan(true);
    try {
      await subscriptionsApi.adminChangePlan({
        tenantId: selectedUser.id,
        plan: targetPlan,
        paymentMethod,
      });
      setPlanModalOpen(false);
      setSelectedUser(null);
      setStep('select');
      setPricing(null);
      await fetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update plan.');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Owner',
      render: (row: Tenant) => (
        <div>
          <p className="font-medium text-[var(--color-text-primary)]">{row.name}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{row.email}</p>
        </div>
      ),
    },
    { key: 'businessName', header: 'Business Name' },
    {
      key: 'phone',
      header: 'Phone',
      render: (row: Tenant) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.phone || '—'}
        </span>
      ),
    },
    {
      key: 'ownerType',
      header: 'Type',
      render: (row: Tenant) => <StatusBadge status={row.ownerType} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Tenant) => <StatusBadge status={row.status} />,
    },
    {
      key: 'currentSubscription',
      header: 'Plan',
      render: (row: Tenant) =>
        row.currentSubscription ? (
          <div>
            <button
              type="button"
              onClick={() => openPlanModal(row)}
              className="rounded-full transition hover:opacity-85"
              title="Change owner plan"
            >
              <StatusBadge status={row.currentSubscription.plan} />
            </button>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {row.currentSubscription.status} until {new Date(row.currentSubscription.endDate).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => openPlanModal(row)}
              className="rounded-full transition hover:opacity-85"
              title="Choose paid plan from trial"
            >
              <StatusBadge status="TRIAL" />
            </button>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">No paid plan</p>
          </div>
        ),
    },
    {
      key: 'branches',
      header: 'Branches',
      render: (row: Tenant) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.branches?.length || 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: Tenant) => (
        <span className="text-[var(--color-text-muted)]">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        <button onClick={fetch} className="btn-secondary ml-auto shrink-0 gap-1.5 px-3 text-xs">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              className="input pl-8"
              placeholder="Search by name, email, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] sm:ml-auto">
            <Users size={13} />
            {filtered.length} records
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No users found."
          keyExtractor={(row) => row.id}
        />
      </div>

      {planModalOpen && selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`w-full ${step === 'gateway' ? 'max-w-5xl' : 'max-w-xl'} rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl transition-all`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {step === 'select' ? 'Upgrade Plan' : step === 'summary' ? 'Order Summary' : 'Select Payment Method'}
              </h3>
              {step === 'gateway' && (
                <span className="text-sm font-medium text-emerald-600">100% Secure Payments</span>
              )}
            </div>
            {step === 'select' && (
              <p className="text-sm text-[var(--color-text-muted)]">{selectedUser.businessName} ({selectedUser.name || 'Owner'})</p>
            )}

            {step === 'select' ? (
              <>
                <div className="mt-4 rounded-xl bg-[var(--color-surface-raised)] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Current plan</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {getCurrentPlan(selectedUser)}
                    </span>
                  </div>
                </div>
                {getCurrentPlan(selectedUser) === 'PRO' ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    Already you are in upgraded version (PRO).
                  </div>
                ) : getCurrentPlan(selectedUser) === 'STANDARD' ? (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    Current plan is below upgraded version. Choose upgraded version (PRO) to continue.
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    You are on Trial. Choose Standard or Pro plan to continue.
                  </div>
                )}
                {getCurrentPlan(selectedUser) !== 'PRO' && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetPlan('STANDARD')}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                        targetPlan === 'STANDARD'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetPlan('PRO')}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                        targetPlan === 'PRO'
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      Pro (Upgraded)
                    </button>
                  </div>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPlanModalOpen(false);
                      setSelectedUser(null);
                      setStep('select');
                    }}
                    className="btn-secondary"
                    disabled={updatingPlan}
                  >
                    Cancel
                  </button>
                  {getCurrentPlan(selectedUser) !== 'PRO' && (
                    <button
                      type="button"
                      onClick={() => void goToPaymentStep()}
                      className="btn-primary"
                      disabled={
                        updatingPlan ||
                        (getCurrentPlan(selectedUser) === 'STANDARD' && targetPlan === 'STANDARD')
                      }
                    >
                      {updatingPlan ? 'Loading...' : 'Apply'}
                    </button>
                  )}
                </div>
              </>
            ) : step === 'summary' ? (
              <>
                <div className="mt-4">
                  <div className="mx-auto max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-sm">
                    <div className="text-sm font-medium text-[var(--color-text-muted)]">Order Summary</div>
                    <div className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">Rs {Number(pricing?.finalPayableAmount || 0).toFixed(2)}</div>
                    {Number(pricing?.remainingCredit || 0) > 0 ? (
                      <p className="text-sm text-[var(--color-text-muted)] line-through">Rs {Number(pricing?.basePlanPrice || 0).toFixed(2)}</p>
                    ) : null}
                    <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-text-muted)]">Credit Applied: Rs {Number(pricing?.remainingCredit || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
                  <button type="button" onClick={() => setStep('select')} className="btn-secondary" disabled={updatingPlan}>
                    Back
                  </button>
                  <button type="button" onClick={() => setStep('gateway')} className="btn-primary" disabled={updatingPlan}>
                    Make a Payment
                  </button>
                </div>
              </>
            ) : step === 'gateway' ? (
              <>
                 <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr_2fr]">
                   <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                     <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Order Summary</div>
                     <div className="mt-2 flex items-center justify-between">
                       <span className="text-2xl font-bold text-[var(--color-text-primary)]">Rs {Number(pricing?.finalPayableAmount || 0).toFixed(2)}</span>
                     </div>
                     <div className="mt-1 text-xs text-[var(--color-text-muted)]">Amount to pay</div>
                     <div className="mt-4 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-text-secondary)]">
                       {targetPlan === 'PRO' ? 'Pro' : 'Standard'} / month
                     </div>
                   </div>

                   <div className="flex flex-col gap-2">
                     <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Recommended</div>
                     {(['CARD', 'UPI', 'CASH'] as const).map((method) => (
                       <button
                         key={method}
                         type="button"
                         onClick={() => setPaymentMethod(method)}
                         className={`w-full rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                           paymentMethod === method 
                             ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]' 
                             : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]'
                         }`}
                       >
                         {method === 'CARD' ? 'Card' : method === 'UPI' ? 'UPI' : 'Cash'}
                       </button>
                     ))}
                   </div>

                   <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
                     {paymentMethod === 'UPI' ? (
                       <>
                         <h4 className="text-xl font-bold text-[var(--color-text-primary)]">Pay via UPI</h4>
                         <p className="mt-1 text-sm text-[var(--color-text-muted)]">Select an app or scan QR to complete payment.</p>
                         
                         <div className="mt-4 grid grid-cols-3 gap-2">
                           {(['GPay', 'PhonePe', 'Paytm'] as const).map((app) => (
                             <button
                               key={app}
                               type="button"
                               onClick={() => setSelectedUpi(app)}
                               className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-colors ${
                                 selectedUpi === app 
                                   ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]' 
                                   : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]'
                               }`}
                             >
                               <span className="text-xs font-medium">{app}</span>
                             </button>
                           ))}
                         </div>
                         
                         <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
                           <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Sample QR Code</div>
                           <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-lg bg-[var(--color-border)] opacity-30">
                              <span className="font-mono text-xs text-[var(--color-text-muted)]">QR_CODE</span>
                           </div>
                         </div>
                       </>
                     ) : (
                       <>
                         <h4 className="text-xl font-bold text-[var(--color-text-primary)]">Pay via {paymentMethod === 'CARD' ? 'Card' : 'Cash'}</h4>
                         <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                           {paymentMethod === 'CARD' ? 'Enter your card details to proceed.' : 'Confirm cash collection to proceed.'}
                         </p>
                         <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">
                           {paymentMethod === 'CARD' ? 'Card Input Fields Placeholder' : 'Cash Payment Instructions Placeholder'}
                         </div>
                       </>
                     )}
                     
                     <button 
                       type="button" 
                       onClick={() => void applyPlanChange()} 
                       className="btn-primary mt-6 w-full py-3" 
                       disabled={updatingPlan}
                     >
                       {updatingPlan ? 'Processing...' : paymentMethod === 'UPI' ? `Pay with ${selectedUpi}` : paymentMethod === 'CARD' ? 'Pay with Card' : 'Confirm Cash'}
                     </button>
                     <div className="mt-3 text-center">
                       <button type="button" onClick={() => setStep('summary')} className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)]" disabled={updatingPlan}>
                         Cancel & Go Back
                       </button>
                     </div>
                   </div>
                 </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AllUsersPage: React.FC = () => (
  <UsersListPage title="All Users" subtitle="All registered salon owners across the platform" />
);

export const ActiveUsersPage: React.FC = () => (
  <UsersListPage
    statusFilter="ACTIVE"
    title="Active Users"
    subtitle="Owners with active subscriptions"
  />
);

export const TrialUsersPage: React.FC = () => (
  <UsersListPage
    statusFilter="TRIAL"
    title="Trial Users"
    subtitle="Owners currently in their trial period"
  />
);

export const ExpiredUsersPage: React.FC = () => (
  <UsersListPage
    statusFilter="EXPIRED"
    title="Expired Users"
    subtitle="Owners whose subscription or trial has expired"
  />
);

export default UsersListPage;
