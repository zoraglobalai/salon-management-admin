import { useEffect, useState } from "react";
import { fetchDashboard } from "../../core/api";
import type { DashboardMetrics } from "../../core/types";
import { MetricCard } from "./MetricCard";

type MetricBlueprint = {
  label: string;
  value: (metrics: DashboardMetrics) => string;
};

type DashboardSnapshotProps = {
  blueprints: MetricBlueprint[];
};

export function DashboardSnapshot({ blueprints }: DashboardSnapshotProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({});

  useEffect(() => {
    let mounted = true;

    fetchDashboard()
      .then((response) => {
        if (mounted) {
          setMetrics(response.metrics);
        }
      })
      .catch(() => {
        if (mounted) {
          setMetrics({});
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[18px]">
      {blueprints.map((blueprint, index) => (
        <MetricCard
          key={blueprint.label}
          label={blueprint.label}
          value={blueprint.value(metrics)}
          tone={index === 0 ? "accent" : "default"}
        />
      ))}
    </div>
  );
}
