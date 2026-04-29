import { useEffect, useState } from "react";
import { fetchResource } from "../../../core/api";
import type { ResourceItem } from "../../../core/types";

type SalesTab = "sales" | "drafts";
type SortOption = "newest" | "oldest" | "highest" | "lowest";

type SaleRecord = {
  id: string;
  saleDate: string;
  amount: number;
  paymentMethod: string;
  clientId: string | null;
  appointmentId: string | null;
};

type ClientRecord = {
  id: string;
  fullName: string;
};

type DraftRecord = {
  id: string;
  title: string;
  updatedAt: string;
  status: string;
};

function asString(value: ResourceItem[string]) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: ResourceItem[string]) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function normalizeSales(items: ResourceItem[]): SaleRecord[] {
  return items.map((item) => ({
    id: String(item.id),
    saleDate: asString(item.sale_date) || "",
    amount: asNumber(item.amount),
    paymentMethod: asString(item.payment_method) || "Other",
    clientId: asString(item.client_id),
    appointmentId: asString(item.appointment_id),
  }));
}

function normalizeClients(items: ResourceItem[]): ClientRecord[] {
  return items.map((item) => ({
    id: String(item.id),
    fullName: asString(item.full_name) || "Walk-in client",
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

export function DashboardSalesPage() {
  const [activeTab, setActiveTab] = useState<SalesTab>("sales");
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [todayOnly, setTodayOnly] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [status, setStatus] = useState("Loading sales...");

  const drafts: DraftRecord[] = [
    {
      id: "draft-1",
      title: "Color package - waiting for payment",
      updatedAt: new Date().toISOString(),
      status: "Draft",
    },
    {
      id: "draft-2",
      title: "Product bundle checkout",
      updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      status: "Draft",
    },
  ];

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchResource("sales"), fetchResource("clients")])
      .then(([salesResponse, clientsResponse]) => {
        if (!isMounted) {
          return;
        }

        const normalizedSales = normalizeSales(salesResponse.items);
        setSales(normalizedSales);
        setClients(normalizeClients(clientsResponse.items));
        setStatus(normalizedSales.length ? "" : "No sales yet");
      })
      .catch((error: Error) => {
        if (isMounted) {
          setStatus(error.message || "Unable to load sales");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const clientMap = new Map(clients.map((client) => [client.id, client.fullName]));
  const paymentMethods = Array.from(new Set(sales.map((sale) => sale.paymentMethod))).sort();

  const filteredSales = sales
    .map((sale) => ({
      ...sale,
      clientName: sale.clientId ? clientMap.get(sale.clientId) || "Walk-in client" : "Walk-in client",
    }))
    .filter((sale) => {
      if (todayOnly && !isToday(sale.saleDate)) {
        return false;
      }

      if (paymentFilter !== "all" && sale.paymentMethod !== paymentFilter) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const query = searchTerm.trim().toLowerCase();
      return [sale.id, sale.clientName, sale.paymentMethod, formatCurrency(sale.amount)]
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((left, right) => {
      if (sortBy === "oldest") {
        return left.saleDate.localeCompare(right.saleDate);
      }

      if (sortBy === "highest") {
        return right.amount - left.amount;
      }

      if (sortBy === "lowest") {
        return left.amount - right.amount;
      }

      return right.saleDate.localeCompare(left.saleDate);
    });

  return (
    <section className="sales-page-shell">
      <div className="sales-page-header">
        <div>
          <h2>Sales</h2>
          <p>
            View, filter and export the history of your sales.
            <a href="/branch/reports"> Learn more</a>
          </p>
        </div>

        <div className="sales-page-actions">
          <button className="ghost-button sales-utility-button" type="button">
            Options
          </button>
          <button className="primary-button sales-primary-button" type="button">
            Add new
          </button>
        </div>
      </div>

      <div className="sales-tab-row">
        <button
          className={`sales-tab-button${activeTab === "sales" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("sales")}
        >
          Sales
        </button>
        <button
          className={`sales-tab-button${activeTab === "drafts" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("drafts")}
        >
          Drafts
        </button>
      </div>

      <div className="sales-filter-bar">
        <label className="sales-search-field">
          <span className="sales-filter-icon">⌕</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by Sale or Client"
          />
        </label>

        <button
          className={`sales-filter-pill${todayOnly ? " active" : ""}`}
          type="button"
          onClick={() => setTodayOnly((current) => !current)}
        >
          Today
        </button>

        <label className="sales-select-pill">
          <span>Filters</span>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="all">All payments</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <label className="sales-select-pill sales-sort-pill">
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Amount high-low</option>
            <option value="lowest">Amount low-high</option>
          </select>
        </label>
      </div>

      {activeTab === "sales" ? (
        <section className="sales-results-panel">
          {filteredSales.length ? (
            <>
              <div className="sales-results-summary">
                <strong>{filteredSales.length} sales</strong>
                <span>{todayOnly ? "Showing today’s record" : "Showing all records"}</span>
              </div>

              <div className="sales-results-table">
                <table>
                  <thead>
                    <tr>
                      <th>Sale</th>
                      <th>Client</th>
                      <th>Payment</th>
                      <th>Appointment</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          <div className="sales-primary-cell">
                            <strong>{formatDateTime(sale.saleDate)}</strong>
                            <span>{sale.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td>{sale.clientName}</td>
                        <td>{sale.paymentMethod}</td>
                        <td>{sale.appointmentId ? sale.appointmentId.slice(0, 8) : "Direct sale"}</td>
                        <td>{formatCurrency(sale.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="sales-empty-state">
              <div className="sales-empty-badge">◈</div>
              <h3>{status || "No sales yet"}</h3>
              <p>
                {status && status !== "No sales yet"
                  ? status
                  : todayOnly
                    ? "No sales match today’s filters yet."
                    : "No sales match the current search and filter setup."}
              </p>
              <button className="ghost-button" type="button">
                Create new sale
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="sales-results-panel">
          <div className="sales-results-summary">
            <strong>{drafts.length} drafts</strong>
            <span>Saved sales waiting to be completed</span>
          </div>

          <div className="sales-draft-grid">
            {drafts.map((draft) => (
              <article key={draft.id} className="sales-draft-card">
                <span className="sales-draft-status">{draft.status}</span>
                <h3>{draft.title}</h3>
                <p>Updated {formatDateTime(draft.updatedAt)}</p>
                <button className="ghost-button" type="button">
                  Continue draft
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
