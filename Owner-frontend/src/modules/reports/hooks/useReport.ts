import { useEffect, useState, useCallback } from "react";
import { useGlobalFilters } from "../../../shared/context/FilterContext";

type ReportResponse<T> = Promise<{ success: boolean; data: T }>;

type UseReportOptions = {
  refreshMs?: number;
};

export function useReport<T, F extends Record<string, any>>(
  fetchFn: (filters: F) => ReportResponse<T>,
  initialFilters: F,
  options: UseReportOptions = {},
) {
  const { filters: globalFilters } = useGlobalFilters();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<F>(initialFilters);

  const getMergedFilters = useCallback(() => {
    const localLocation = (filters as Record<string, any>)?.locationId;
    const localStartDate = (filters as Record<string, any>)?.startDate;
    const localEndDate = (filters as Record<string, any>)?.endDate;
    const localPaymentMethod = (filters as Record<string, any>)?.paymentMethod;

    const locationId =
      localLocation !== undefined
        ? localLocation === "all"
          ? undefined
          : localLocation
        : globalFilters.locationId === "all"
          ? undefined
          : globalFilters.locationId;

    return {
      ...filters,
      startDate: localStartDate ?? globalFilters.startDate,
      endDate: localEndDate ?? globalFilters.endDate,
      locationId,
      paymentMethod: localPaymentMethod ?? globalFilters.paymentMethod,
    } as unknown as F;
  }, [filters, globalFilters]);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    try {
      const merged = getMergedFilters();
      const res = await fetchFn(merged);
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error("Report fetch failed:", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [fetchFn, getMergedFilters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!options.refreshMs) return;

    const timer = window.setInterval(() => {
      void loadData(false);
    }, options.refreshMs);

    return () => window.clearInterval(timer);
  }, [loadData, options.refreshMs]);

  return {
    data,
    loading,
    filters,
    setFilters,
    refresh: () => loadData(),
  };
}
