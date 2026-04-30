import { useEffect, useState } from "react";

type ReportResponse<T> = Promise<{ success: boolean; data: T }>;

type UseReportOptions = {
  refreshMs?: number;
};

export function useReport<T, F extends Record<string, any>>(
  fetchFn: (filters: F) => ReportResponse<T>,
  initialFilters: F,
  options: UseReportOptions = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<F>(initialFilters);

  const loadData = async (currentFilters: F, showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const res = await fetchFn(currentFilters);
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error("Report fetch failed:", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
  }, [filters]);

  useEffect(() => {
    if (!options.refreshMs) return;

    const timer = window.setInterval(() => {
      void loadData(filters, false);
    }, options.refreshMs);

    return () => window.clearInterval(timer);
  }, [filters, options.refreshMs]);

  return {
    data,
    loading,
    filters,
    setFilters,
    refresh: () => loadData(filters),
  };
}
