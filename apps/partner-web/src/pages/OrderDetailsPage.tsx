import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPartnerOrderDetails,
  getPartnerProfile,
  updatePartnerOrderStatus,
  type Order
} from "@vyaha/api-client";

const MIN_PREP_TIME_MINUTES = 5;
const MAX_PREP_TIME_MINUTES = 90;
const PREP_TIME_STEP_MINUTES = 5;
const DEFAULT_PREP_TIME_MINUTES = 10;

const NEXT_STATUS: Record<string, string> = {
  ACCEPTED: "PREPARING",
  PREPARING: "READY"
};

const clampPrepTime = (value: number) =>
  Math.min(MAX_PREP_TIME_MINUTES, Math.max(MIN_PREP_TIME_MINUTES, value));

export default function OrderDetailsPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(DEFAULT_PREP_TIME_MINUTES);
  const [updating, setUpdating] = useState(false);

  const load = () => getPartnerOrderDetails(orderId).then((res) => setOrder(res.data || null));

  useEffect(() => {
    load();
  }, [orderId]);

  useEffect(() => {
    getPartnerProfile()
      .then((res) => {
        const estimated = Number((res.data as any)?.settings?.estimatedPrepTime);
        if (Number.isFinite(estimated) && estimated > 0) {
          setPrepTimeMinutes(clampPrepTime(Math.round(estimated)));
        }
      })
      .catch(() => {
        // Keep default prep time.
      });
  }, []);

  const setStatus = async (status: string, options?: { prepTimeMinutes?: number }) => {
    try {
      setUpdating(true);
      await updatePartnerOrderStatus(orderId, status, options);
      await load();
    } finally {
      setUpdating(false);
    }
  };

  if (!order) return <p>Loading...</p>;

  const next = NEXT_STATUS[order.status];
  const needsAccept = order.status === "CONFIRMED";

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
        {order.prepTimeMinutes ? <p>Prep time: {order.prepTimeMinutes} mins</p> : null}
        <ul>
          {order.items?.map((item, i) => (
            <li key={i}>
              {item.name} × {item.quantity} — ₹{item.price}
            </li>
          ))}
        </ul>
        {order.deliveryAddress ? <p>Deliver to: {order.deliveryAddress}</p> : null}

        {needsAccept ? (
          <div className="prep-accept-panel">
            <p className="prep-accept-label">Set food preparation time</p>
            <div className="prep-time-stepper" role="group" aria-label="Food preparation time">
              <button
                type="button"
                className="prep-time-stepper__btn"
                disabled={updating || prepTimeMinutes <= MIN_PREP_TIME_MINUTES}
                onClick={() => setPrepTimeMinutes((value) => clampPrepTime(value - PREP_TIME_STEP_MINUTES))}
                aria-label="Decrease preparation time"
              >
                −
              </button>
              <span className="prep-time-stepper__value">{prepTimeMinutes} mins</span>
              <button
                type="button"
                className="prep-time-stepper__btn"
                disabled={updating || prepTimeMinutes >= MAX_PREP_TIME_MINUTES}
                onClick={() => setPrepTimeMinutes((value) => clampPrepTime(value + PREP_TIME_STEP_MINUTES))}
                aria-label="Increase preparation time"
              >
                +
              </button>
            </div>
            <div className="prep-accept-actions">
              <button
                className="btn reject-outline"
                disabled={updating}
                onClick={() => setStatus("REJECTED")}
              >
                Reject
              </button>
              <button
                className="btn accept-order"
                disabled={updating}
                onClick={() => setStatus("ACCEPTED", { prepTimeMinutes })}
              >
                Accept order
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: needsAccept ? 12 : 0 }}>
          {next ? (
            <button className="btn" disabled={updating} onClick={() => setStatus(next)}>
              Mark {next.replace(/_/g, " ").toLowerCase()}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
