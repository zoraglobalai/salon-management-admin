import { useEffect, useState } from "react";
import { fetchResource } from "../../core/api";
import type { ResourceItem } from "../../core/types";
import { DataTable } from "./DataTable";
import { SectionCard } from "./SectionCard";

type ResourceSectionProps = {
  resource: string;
  title: string;
  hint: string;
  columns: string[];
};

export function ResourceSection({ resource, title, hint, columns }: ResourceSectionProps) {
  const [rows, setRows] = useState<ResourceItem[]>([]);
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    let isMounted = true;

    fetchResource(resource)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setRows(response.items);
        setStatus(response.items.length ? "" : "No data yet");
      })
      .catch((error: Error) => {
        if (isMounted) {
          setStatus(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resource]);

  return (
    <SectionCard title={title} hint={hint}>
      {status && !rows.length ? <p className="empty-state">{status}</p> : null}
      <DataTable columns={columns} rows={rows} />
    </SectionCard>
  );
}
