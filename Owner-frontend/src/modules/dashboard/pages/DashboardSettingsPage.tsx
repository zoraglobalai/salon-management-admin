import { SectionCard } from "../../../shared/components/SectionCard";

export function DashboardSettingsPage() {
  return (
    <SectionCard
      title="Branch settings"
      hint="Manager-level controls for local operations."
    >
      <ul className="stack-list">
        <li>Set branch hours, slot buffers, and reminder timing preferences.</li>
        <li>Update service availability based on staff coverage and stock.</li>
        <li>Maintain a fast daily workflow without cross-branch configuration access.</li>
      </ul>
    </SectionCard>
  );
}
