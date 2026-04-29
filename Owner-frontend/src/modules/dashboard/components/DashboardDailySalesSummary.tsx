import { useEffect, useState } from "react";
import { fetchResource } from "../../../core/api";
import type { ResourceItem } from "../../../core/types";
import { SectionCard } from "../../../shared/components/SectionCard";

type SaleRecord = {
  id: string;
  amount: number;
  paymentMethod: string;
  saleDate: string;
  clientId: string | null;
  appointmentId: string | null;
};

type AppointmentRecord = {
  id: string;
  serviceId: string | null;
  status: string | null;
};

type ServiceRecord = {
  id: string;
  name: string;
  category: string | null;
};

type ClientRecord = {
  id: string;
  fullName: string;
};

type TransactionSummaryRow = {
  itemType: string;
  salesQty: number;
  refundQty: number;
  grossTotal: number;
};

type CashSummaryRow = {
  paymentType: string;
  paymentsCollected: number;
  refundsPaid: number;
};

type FilteredSaleRow = {
  id: string;
  saleDate: string;
  paymentMethod: string;
  clientName: string;
  serviceName: string;
  serviceCategory: string;
  appointmentStatus: string;
  amount: number;
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
    amount: asNumber(item.amount),
    paymentMethod: asString(item.payment_method) || "Other",
    saleDate: asString(item.sale_date) || "",
    clientId: asString(item.client_id),
    appointmentId: asString(item.appointment_id),
  }));
}

function normalizeAppointments(items: ResourceItem[]): AppointmentRecord[] {
  return items.map((item) => ({
    id: String(item.id),
    serviceId: asString(item.service_id),
    status: asString(item.status),
  }));
}

function normalizeServices(items: ResourceItem[]): ServiceRecord[] {
  return items.map((item) => ({
    id: String(item.id),
    name: asString(item.name) || "Service",
    category: asString(item.category),
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

function formatDateLabel(value: string) {
  if (!value) {
    return "Select date";
  }

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toDateInputValue(value: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toSentenceCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function DashboardDailySalesSummary() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [status, setStatus] = useState("Loading daily sales summary...");

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchResource("sales"),
      fetchResource("appointments"),
      fetchResource("services"),
      fetchResource("clients"),
    ])
      .then(([salesResponse, appointmentsResponse, servicesResponse, clientsResponse]) => {
        if (!isMounted) {
          return;
        }

        const normalizedSales = normalizeSales(salesResponse.items);
        const normalizedAppointments = normalizeAppointments(appointmentsResponse.items);
        const normalizedServices = normalizeServices(servicesResponse.items);
        const normalizedClients = normalizeClients(clientsResponse.items);
        const sortedDates = normalizedSales
          .map((item) => toDateInputValue(item.saleDate))
          .filter(Boolean)
          .sort((left, right) => right.localeCompare(left));

        setSales(normalizedSales);
        setAppointments(normalizedAppointments);
        setServices(normalizedServices);
        setClients(normalizedClients);
        setSelectedDate((currentValue) => currentValue || sortedDates[0] || toDateInputValue(new Date().toISOString()));
        setStatus(normalizedSales.length ? "" : "No sales data is available for this branch yet.");
      })
      .catch((error: Error) => {
        if (isMounted) {
          setStatus(error.message || "Unable to load daily sales summary.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const appointmentMap = new Map(appointments.map((appointment) => [appointment.id, appointment]));
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const clientMap = new Map(clients.map((client) => [client.id, client]));

  const availableDates = Array.from(new Set(sales.map((item) => toDateInputValue(item.saleDate)).filter(Boolean))).sort();
  const availablePaymentMethods = Array.from(new Set(sales.map((item) => item.paymentMethod).filter(Boolean))).sort();
  const selectedDateIndex = availableDates.indexOf(selectedDate);

  const filteredRows = sales
    .filter((sale) => !selectedDate || toDateInputValue(sale.saleDate) === selectedDate)
    .map<FilteredSaleRow>((sale) => {
      const appointment = sale.appointmentId ? appointmentMap.get(sale.appointmentId) : undefined;
      const service = appointment?.serviceId ? serviceMap.get(appointment.serviceId) : undefined;
      const client = sale.clientId ? clientMap.get(sale.clientId) : undefined;

      return {
        id: sale.id,
        saleDate: sale.saleDate,
        paymentMethod: sale.paymentMethod,
        clientName: client?.fullName || "Walk-in client",
        serviceName: service?.name || "General sale",
        serviceCategory: service?.category || "Unassigned",
        appointmentStatus: appointment?.status ? toSentenceCase(appointment.status) : "Direct sale",
        amount: sale.amount,
      };
    })
    .filter((row) => {
      if (paymentFilter !== "all" && row.paymentMethod !== paymentFilter) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const query = searchTerm.trim().toLowerCase();
      return [
        row.id,
        row.clientName,
        row.serviceName,
        row.serviceCategory,
        row.paymentMethod,
        row.appointmentStatus,
        formatCurrency(row.amount),
      ].some((value) => value.toLowerCase().includes(query));
    })
    .sort((left, right) => right.saleDate.localeCompare(left.saleDate));

  const transactionSummaryMap = new Map<string, TransactionSummaryRow>();
  const cashSummaryMap = new Map<string, CashSummaryRow>();

  filteredRows.forEach((row) => {
    const transactionKey = row.serviceCategory;
    const existingTransaction = transactionSummaryMap.get(transactionKey) || {
      itemType: transactionKey,
      salesQty: 0,
      refundQty: 0,
      grossTotal: 0,
    };

    existingTransaction.salesQty += 1;
    existingTransaction.grossTotal += row.amount;
    transactionSummaryMap.set(transactionKey, existingTransaction);

    const cashKey = row.paymentMethod;
    const existingCash = cashSummaryMap.get(cashKey) || {
      paymentType: cashKey,
      paymentsCollected: 0,
      refundsPaid: 0,
    };

    existingCash.paymentsCollected += row.amount;
    cashSummaryMap.set(cashKey, existingCash);
  });

  const transactionSummary = Array.from(transactionSummaryMap.values()).sort((left, right) => right.grossTotal - left.grossTotal);
  const cashSummary = Array.from(cashSummaryMap.values()).sort((left, right) =>
    left.paymentType.localeCompare(right.paymentType),
  );

  const totalCollected = filteredRows.reduce((sum, row) => sum + row.amount, 0);

  function moveDate(step: number) {
    if (selectedDateIndex === -1) {
      return;
    }

    const nextIndex = selectedDateIndex + step;

    if (nextIndex >= 0 && nextIndex < availableDates.length) {
      setSelectedDate(availableDates[nextIndex]);
    }
  }

  function exportRows() {
    if (!filteredRows.length) {
      return;
    }

    const header = [
      "Sale ID",
      "Date",
      "Client",
      "Service",
      "Category",
      "Appointment Status",
      "Payment Method",
      "Amount",
    ];
    const rows = filteredRows.map((row) => [
      row.id,
      row.saleDate,
      row.clientName,
      row.serviceName,
      row.serviceCategory,
      row.appointmentStatus,
      row.paymentMethod,
      row.amount.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `daily-sales-summary-${selectedDate || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="daily-sales-shell">
      <div className="daily-sales-hero">
        <div>
          <p className="daily-sales-kicker">Sales</p>
          <h2>Daily sales summary</h2>
          <p className="daily-sales-copy">View, filter, search, and export branch transactions for the selected day.</p>
        </div>

        <button className="ghost-button daily-sales-export" type="button" onClick={exportRows} disabled={!filteredRows.length}>
          Export CSV
        </button>
      </div>

      <div className="daily-sales-toolbar">
        <div className="date-pill-group">
          <button
            className="date-nav-button"
            type="button"
            onClick={() => moveDate(-1)}
            disabled={selectedDateIndex <= 0}
            aria-label="Previous day"
          >
            {"<"}
          </button>
          <button className="date-chip" type="button" onClick={() => setSelectedDate(toDateInputValue(new Date().toISOString()))}>
            Today
          </button>
          <div className="date-label">{formatDateLabel(selectedDate)}</div>
          <button
            className="date-nav-button"
            type="button"
            onClick={() => moveDate(1)}
            disabled={selectedDateIndex === -1 || selectedDateIndex >= availableDates.length - 1}
            aria-label="Next day"
          >
            {">"}
          </button>
        </div>

        <label className="filter-field">
          <span>Date</span>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>

        <label className="filter-field filter-field-search">
          <span>Search</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Client, service, payment method..."
          />
        </label>

        <label className="filter-field">
          <span>Payment</span>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
            <option value="all">All methods</option>
            {availablePaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status && !sales.length ? <p className="empty-state">{status}</p> : null}

      <div className="daily-sales-summary-grid">
        <SectionCard title="Transaction summary" hint={`${filteredRows.length} transactions for ${formatDateLabel(selectedDate)}`}>
          <div className="summary-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item type</th>
                  <th>Sales qty</th>
                  <th>Refund qty</th>
                  <th>Gross total</th>
                </tr>
              </thead>
              <tbody>
                {transactionSummary.length ? (
                  transactionSummary.map((row) => (
                    <tr key={row.itemType}>
                      <td>{row.itemType}</td>
                      <td>{row.salesQty}</td>
                      <td>{row.refundQty}</td>
                      <td>{formatCurrency(row.grossTotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No transactions match the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Cash movement summary" hint={`${availablePaymentMethods.length} payment methods tracked`}>
          <div className="summary-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Payment type</th>
                  <th>Payments collected</th>
                  <th>Refunds paid</th>
                </tr>
              </thead>
              <tbody>
                {cashSummary.length ? (
                  <>
                    {cashSummary.map((row) => (
                      <tr key={row.paymentType}>
                        <td>{row.paymentType}</td>
                        <td>{formatCurrency(row.paymentsCollected)}</td>
                        <td>{formatCurrency(row.refundsPaid)}</td>
                      </tr>
                    ))}
                    <tr className="summary-total-row">
                      <td>Total collected</td>
                      <td>{formatCurrency(totalCollected)}</td>
                      <td>{formatCurrency(0)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={3}>No cash movement data matches the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Filtered transactions"
        hint={`${filteredRows.length} row${filteredRows.length === 1 ? "" : "s"} ready for search and export`}
      >
        <div className="summary-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Client</th>
                <th>Service</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {new Intl.DateTimeFormat("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(row.saleDate))}
                    </td>
                    <td>{row.clientName}</td>
                    <td>
                      <div className="transaction-service-cell">
                        <strong>{row.serviceName}</strong>
                        <span>{row.serviceCategory}</span>
                      </div>
                    </td>
                    <td>{row.appointmentStatus}</td>
                    <td>{row.paymentMethod}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No transactions found for this date and filter combination.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </section>
  );
}
