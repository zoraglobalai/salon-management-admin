import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboardTheme } from "../../../../shared/theme/ThemeProvider";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
}

interface ReportDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: keyof T) => void;
  sortKey?: keyof T;
  sortDirection?: "asc" | "desc";
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function ReportDataTable<T>({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection,
  page = 1,
  totalPages = 1,
  onPageChange,
}: ReportDataTableProps<T>) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`flex flex-col rounded-[20px] border overflow-hidden transition-all ${
        isDark
          ? "bg-[#151821] border-[rgba(255,255,255,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_28px_rgba(0,0,0,0.28)]"
          : "bg-white border-[#E8E1D8] shadow-sm"
      }`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead
            className={`text-xs uppercase tracking-wider ${
              isDark ? "bg-[#1C2030] text-[#7A7572]" : "bg-[#FAF7F3] text-[#6B7280]"
            }`}
          >
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-4 font-semibold ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  } ${
                    col.sortable
                      ? isDark
                        ? "cursor-pointer select-none hover:bg-[rgba(255,255,255,0.04)] hover:text-[#C9A96E]"
                        : "cursor-pointer select-none hover:bg-[#F0EBE5]"
                      : ""
                  }`}
                  onClick={() => col.sortable && col.accessorKey && onSort?.(col.accessorKey)}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === "right" ? "justify-end" : ""}`}>
                    {col.header}
                    {col.sortable && sortKey === col.accessorKey && (
                      <span className={isDark ? "text-[#C9A96E]" : "text-[#8B5E3C]"}>
                        {sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={`divide-y ${isDark ? "divide-[rgba(255,255,255,0.05)] text-[#C8BFB4]" : "divide-[#E8E1D8] text-[#4B5563]"}`}
          >
            {data.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                className={`transition-colors ${
                  isDark ? "hover:bg-[rgba(201,169,110,0.04)]" : "hover:bg-[#FAF7F3]/50"
                }`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`whitespace-nowrap px-6 py-4 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {col.cell ? col.cell(item) : col.accessorKey ? (item[col.accessorKey] as ReactNode) : null}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className={`px-6 py-12 text-center ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDark ? "bg-[rgba(255,255,255,0.05)]" : "bg-[#F9FAFB]"}`}>
                      <span className="text-xl">📊</span>
                    </div>
                    <span>No data available for this period.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className={`flex items-center justify-between border-t px-6 py-3 ${
            isDark ? "border-[rgba(255,255,255,0.06)] bg-[#1C2030]" : "border-[#E8E1D8]"
          }`}
        >
          <span className={`text-sm ${isDark ? "text-[#7A7572]" : "text-[#6B7280]"}`}>
            Page{" "}
            <span className={`font-medium ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{page}</span>{" "}
            of{" "}
            <span className={`font-medium ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className={`rounded-lg border p-2 transition-all disabled:opacity-40 ${
                isDark
                  ? "border-[rgba(255,255,255,0.1)] text-[#C8BFB4] hover:bg-[rgba(201,169,110,0.1)] hover:border-[rgba(201,169,110,0.3)] hover:text-[#C9A96E]"
                  : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#FAF7F3]"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className={`rounded-lg border p-2 transition-all disabled:opacity-40 ${
                isDark
                  ? "border-[rgba(255,255,255,0.1)] text-[#C8BFB4] hover:bg-[rgba(201,169,110,0.1)] hover:border-[rgba(201,169,110,0.3)] hover:text-[#C9A96E]"
                  : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#FAF7F3]"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
