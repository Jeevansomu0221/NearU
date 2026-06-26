import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cancelOrder, getOrderDetails, submitOrderRating, type Order } from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";

const ACTIVE = new Set(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]);

export default function OrderStatusPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState({ food: 5, packaging: 5, experience: 5, speed: 5, behavior: 5 });

  const load = async () => {
    try {
      const res = await getOrderDetails(orderId);
      setOrder(res.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [orderId]);

  const onCancel = async () => {
    if (!confirm("Cancel this order?")) return;
    await cancelOrder(orderId);
    load();
  };

  const onRate = async () => {
    await submitOrderRating(orderId, {
      restaurantRating: {
        foodQuality: rating.food,
        packaging: rating.packaging,
        overallExperience: rating.experience
      },
      deliveryRating: { deliverySpeed: rating.speed, partnerBehavior: rating.behavior }
    });
    load();
  };

  return (
    <CustomerShell title="Order status" backTo="/orders" showNav={false}>
      {error ? <p className="error-text">{error}</p> : null}
      {order ? (
        <div className="card">
          <p>
            <strong>Status:</strong> {order.status}
          </p>
          <p>Total: ₹{order.grandTotal}</p>
          <p>Payment: {order.paymentMethod || "—"} ({order.paymentStatus || "—"})</p>
          <ul>
            {order.items?.map((item, idx) => (
              <li key={idx}>
                {item.name} × {item.quantity}
              </li>
            ))}
          </ul>
          {ACTIVE.has(order.status) ? (
            <button className="btn secondary" onClick={onCancel}>
              Cancel order
            </button>
          ) : null}
          {order.status === "DELIVERED" && !order.ratingSubmittedAt ? (
            <div style={{ marginTop: 16 }}>
              <h4>Rate your order</h4>
              <div className="field">
                <label>Food quality (1-5)</label>
                <input type="number" min={1} max={5} value={rating.food} onChange={(e) => setRating({ ...rating, food: +e.target.value })} />
              </div>
              <button className="btn" onClick={onRate}>
                Submit rating
              </button>
            </div>
          ) : null}
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => navigate("/")}>
            Back to home
          </button>
        </div>
      ) : (
        <p>Loading order...</p>
      )}
    </CustomerShell>
  );
}
