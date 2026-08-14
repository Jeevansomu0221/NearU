import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPartnerOrders, type Order } from "@vyaha/api-client";
import { formatPublicOrderId } from "../utils/publicOrderId";

type FilterKey = "all" | "action" | "preparing" | "delivery" | "completed";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "action", label: "Needs action" },
  { key: "preparing", label: "Preparing" },
  { key: "delivery", label: "Delivery" },
  { key: "completed", label: "Completed" }
];

const statusLabel = (status: string) => {
  switch (status) {
    case "PENDING":
      return "Payment pending";
    case "CONFIRMED":
      return "Needs acceptance";
    case "ACCEPTED":
      return "Accepted";
    case "PREPARING":
      return "Preparing";
    case "READY":
      return "Ready";
    case "ASSIGNED":
      return "Assigned";
    case "PICKED_UP":
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "REJECTED":
      return "Rejected";
    default:
      return status.replace(/_/g, " ").toLowerCase();
  }
};

const statusTone = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return "warn";
    case "ACCEPTED":
    case "PREPARING":
    case "READY":
      return "info";
    case "ASSIGNED":
    case "PICKED_UP":
    case "OUT_FOR_DELIVERY":
      return "info";
    case "DELIVERED":
      return "success";
    case "CANCELLED":
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
};

const matchesFilter = (status: string, filter: FilterKey) => {
  if (filter === "all") return true;
  if (filter === "action") return status === "CONFIRMED";
  if (filter === "preparing") return status === "ACCEPTED" || status === "PREPARING";
  if (filter === "delivery") return status === "READY" || status === "ASSIGNED" || status === "PICKED_UP" || status === "OUT_FOR_DELIVERY";
  return status === "DELIVERED";
};

const customerName = (order: Order) => {
  const customer = order.customerId;
  if (customer && typeof customer === "object" && "name" in customer) {
    const name = String((customer as { name?: string }).name || "").trim();
    if (name) return name;
  }
  return "Customer";
};

const itemSummary = (order: Order) => {
  const items = order.items || [];
  if (items.length === 0) return "No items listed";
  const preview = items
    .slice(0, 2)
    .map((item) => `${item.name} × ${item.quantity}`)
    .join(", ");
  return items.length > 2 ? `${preview} +${items.length - 2} more` : preview;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = () =>
    getPartnerOrders()
      .then((res) => setOrders(res.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const counts = useMemo(
    () => ({
      all: orders.length,
      action: orders.filter((order) => matchesFilter(order.status, "action")).length,
      preparing: orders.filter((order) => matchesFilter(order.status, "preparing")).length,
      delivery: orders.filter((order) => matchesFilter(order.status, "delivery")).length,
      completed: orders.filter((order) => matchesFilter(order.status, "completed")).length
    }),
    [orders]
  );

  const visibleOrders = orders.filter((order) => matchesFilter(order.status, filter));

  return (
    <div className="orders-page">
      <header className="orders-hero">
        <div>
          <p className="dash-eyebrow">Live workspace</p>
          <h2>Orders</h2>
          <p>Accept new orders, track preparation, and follow deliveries in one place.</p>
        </div>
        <span className="menu-list__count">{counts.action > 0 ? `${counts.action} need action` : "Up to date"}</span>
      </header>

      <div className="orders-filters">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`orders-filter ${filter === item.key ? "is-active" : ""}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
            <span>{counts[item.key]}</span>
          </button>
        ))}
      </div>

      <section className="card orders-list">
        {loading ? (
          <div className="orders-empty">Loading orders…</div>
        ) : visibleOrders.length === 0 ? (
          <div className="orders-empty">
            <strong>{filter === "all" ? "No orders yet" : "Nothing in this view"}</strong>
            <p>
              {filter === "all"
                ? "New customer orders will appear here automatically."
                : "Try another filter, or wait for the next order update."}
            </p>
          </div>
        ) : (
          <div className="orders-rows">
            {visibleOrders.map((order) => (
              <Link key={order._id} className="order-card" to={`/orders/${order._id}`}>
                <div className="order-card__main">
                  <strong>{formatPublicOrderId(order._id)}</strong>
                  <p>{itemSummary(order)}</p>
                  <span>{customerName(order)} · {new Date(order.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}</span>
                </div>
                <div className="order-card__meta">
                  <span className={`order-status order-status--${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
                  <strong>₹{order.grandTotal}</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
