import { DashboardSnapshot } from "./DashboardSnapshot";
import { SectionCard } from "./SectionCard";

type MetricConfig = {
  label: string;
  value: (metrics: Record<string, number>) => string;
};

type OverviewBlock = {
  title: string;
  hint: string;
  items: string[];
};

type RoleOverviewProps = {
  metrics: MetricConfig[];
  blocks: OverviewBlock[];
};

export function RoleOverview({ metrics, blocks }: RoleOverviewProps) {
  return (
    <>
      <DashboardSnapshot blueprints={metrics} />

      <div className="content-grid">
        {blocks.map((block) => (
          <SectionCard key={block.title} title={block.title} hint={block.hint}>
            <ul className="stack-list">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
    </>
  );
}
