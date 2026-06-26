import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPartnerOrderDetails, updatePartnerOrderStatus, type Order } from "@vyaha/api-client";

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "OUT_FOR_DELIVERY"
};

export default function OrderDetailsPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  const load = () => getPartnerOrderDetails(orderId).then((res) => setOrder(res.data || null));

  useEffect(() => {
    load();
  }, [orderId]);

  const setStatus = async (status: string) => {
    await updatePartnerOrderStatus(orderId, status);
    load();
  };

  if (!order) return <p>Loading...</p>;

  const next = NEXT_STATUS[order.status];

  return (
    <div>
      <button className="btn secondary" onClick={() => navigate("/orders")}>
        ← Back
      </button>
      <h2>Order {order._id.slice(-8)}</h2>
      <div className="card">
        <p>
          <strong>Status:</strong> {order.status}
        </p>
        <p>Total: ₹{order.grandTotal}</p>
        <p>Payment: {order.paymentMethod}</p>
        <ul>
          {order.items?.map((item, i) => (
            <li key={i}>
              {item.name} × {item.quantity} — ₹{item.price}
            </li>
          ))}
        </ul>
        {order.deliveryAddress ? <p>Deliver to: {order.deliveryAddress}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {order.status === "CONFIRMED" ? (
            <>
              <button className="btn" onClick={() => setStatus("PREPARING")}>
                Accept
              </button>
              <button className="btn secondary" onClick={() => setStatus("REJECTED")}>
                Reject
              </button>
            </>
          ) : null}
          {next ? (
            <button className="btn" onClick={() => setStatus(next)}>
              Mark {next.replace(/_/g, " ").toLowerCase()}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
