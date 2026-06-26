import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders, type Order } from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then((res) => setOrders(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerShell title="My orders">
      {loading ? <p>Loading...</p> : null}
      {!loading && orders.length === 0 ? <div className="empty-state">No orders yet.</div> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((order) => (
          <Link key={order._id} to={`/orders/${order._id}`} className="card" style={{ textDecoration: "none" }}>
            <strong>{order.status}</strong>
            <p style={{ margin: "4px 0", color: "var(--muted)" }}>
              {new Date(order.createdAt).toLocaleString()} · ₹{order.grandTotal}
            </p>
          </Link>
        ))}
      </div>
    </CustomerShell>
  );
}
