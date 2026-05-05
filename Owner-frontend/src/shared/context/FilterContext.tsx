import { createContext, useContext, useEffect, useState, type ReactNode } from "react";



type FilterState = {
  locationId: string;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  dateRangeType: string;
};

type FilterContextType = {
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DEFAULT_FILTERS: FilterState = {
  locationId: "all",
  startDate: formatLocalDate(new Date()),
  endDate: formatLocalDate(new Date()),
  paymentMethod: "all",
  dateRangeType: "Today",
};

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(() => {
    const saved = localStorage.getItem("global_filters");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_FILTERS;
      }
    }
    return DEFAULT_FILTERS;
  });

  useEffect(() => {
    localStorage.setItem("global_filters", JSON.stringify(filters));
  }, [filters]);

  const setFilters = (updates: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  };

  const resetFilters = () => {
    setFiltersState(DEFAULT_FILTERS);
  };

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useGlobalFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useGlobalFilters must be used within a FilterProvider");
  }
  return context;
}
