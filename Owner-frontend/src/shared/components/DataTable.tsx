import type { ResourceItem } from "../../core/types";

type DataTableProps = {
  columns: string[];
  rows: ResourceItem[];
};

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${index}-${String(row[columns[0]])}`}>
                {columns.map((column) => (
                  <td key={column}>{String(row[column] ?? "-")}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No records available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
