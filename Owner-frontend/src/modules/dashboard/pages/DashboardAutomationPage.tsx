import { SectionCard } from "../../../shared/components/SectionCard";

export function DashboardAutomationPage() {
  return (
    <SectionCard
      title="Branch WhatsApp flows"
      hint="Manager-safe reminders and local customer re-engagement."
    >
      <ul className="stack-list">
        <li>Send reminder nudges before booked slots and follow-ups after no-shows.</li>
        <li>Run localized campaigns tied to branch inventory and available staff.</li>
        <li>Keep messaging branch-specific without exposing subscription controls.</li>
      </ul>
    </SectionCard>
  );
}
