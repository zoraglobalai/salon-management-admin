import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";

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
  return (
    <div className="flex flex-col rounded-[20px] border border-[#E8E1D8] bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#4B5563]">
          <thead className="bg-[#FAF7F3] text-xs uppercase text-[#6B7280]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-4 font-semibold ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  } ${col.sortable ? "cursor-pointer select-none hover:bg-[#F0EBE5]" : ""}`}
                  onClick={() => col.sortable && col.accessorKey && onSort?.(col.accessorKey)}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                    {col.header}
                    {col.sortable && sortKey === col.accessorKey && (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E1D8]">
            {data.map((item, rowIndex) => (
              <tr key={rowIndex} className="transition-colors hover:bg-[#FAF7F3]/50">
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`whitespace-nowrap px-6 py-4 ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {col.cell ? col.cell(item) : col.accessorKey ? (item[col.accessorKey] as ReactNode) : null}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-[#6B7280]">
                  No data available for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E8E1D8] px-6 py-3">
          <span className="text-sm text-[#6B7280]">
            Page <span className="font-medium text-[#111827]">{page}</span> of{" "}
            <span className="font-medium text-[#111827]">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[#E5E7EB] p-2 text-[#4B5563] transition hover:bg-[#FAF7F3] disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#E5E7EB] p-2 text-[#4B5563] transition hover:bg-[#FAF7F3] disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
