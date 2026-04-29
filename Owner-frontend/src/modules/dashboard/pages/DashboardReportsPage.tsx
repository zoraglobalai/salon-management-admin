import { SectionCard } from "../../../shared/components/SectionCard";

export function DashboardReportsPage() {
  return (
    <SectionCard
      title="Branch reports"
      hint="Branch-only exports for operations, finance, and attendance."
    >
      <ul className="stack-list">
        <li>Download daily sales and appointment summaries.</li>
        <li>Review staff attendance and service performance by shift.</li>
        <li>Share focused branch insights upward without leaking other branch data.</li>
      </ul>
    </SectionCard>
  );
}
