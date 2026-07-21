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
  const [foodQuality, setFoodQuality] = useState(0);
  const [packaging, setPackaging] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState("");
  const [deliveryComment, setDeliveryComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasDeliveryPartner = Boolean(order?.deliveryPartnerId);

  const load = async () => {
    try {
      const res = await getOrderDetails(orderId);
      const next = res.data || null;
      setOrder(next);
      if (next?.restaurantRating) {
        setFoodQuality(Number(next.restaurantRating.foodQuality || 0));
        setPackaging(Number(next.restaurantRating.packaging || 0));
        setRestaurantComment(String(next.restaurantRating.comment || ""));
      }
      if (next?.deliveryRating) {
        setRiderRating(
          Number(next.deliveryRating.deliverySpeed || next.deliveryRating.partnerBehavior || 0)
        );
        setDeliveryComment(String(next.deliveryRating.comment || ""));
      }
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
    if (foodQuality < 1 || packaging < 1) {
      setError("Please rate food quality and packaging.");
      return;
    }
    if (hasDeliveryPartner && riderRating < 1) {
      setError("Please rate the delivery rider.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const overallExperience = Number(((foodQuality + packaging) / 2).toFixed(2));
      await submitOrderRating(orderId, {
        restaurantRating: {
          foodQuality,
          packaging,
          overallExperience,
          comment: restaurantComment.trim()
        },
        deliveryRating: hasDeliveryPartner
          ? {
              deliverySpeed: riderRating,
              partnerBehavior: riderRating,
              comment: deliveryComment.trim()
            }
          : {
              deliverySpeed: 5,
              partnerBehavior: 5,
              comment: ""
            }
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    foodQuality >= 1 &&
    packaging >= 1 &&
    (!hasDeliveryPartner || riderRating >= 1) &&
    !submitting;

  return (
    <CustomerShell title="Order status" backTo="/orders" showNav={false}>
      {error ? <p className="error-text">{error}</p> : null}
      {order ? (
        <div className="card">
          <p>
            <strong>Status:</strong> {order.status}
          </p>
          <p>Total: ₹{order.grandTotal}</p>
          <p>
            Payment: {order.paymentMethod || "—"} ({order.paymentStatus || "—"})
          </p>
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
              <p style={{ color: "#667085", fontSize: 14 }}>
                Separate ratings for the restaurant and delivery. Comments are optional.
              </p>

              <h5 style={{ marginBottom: 8 }}>Restaurant</h5>
              <div className="field">
                <label>Food quality (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={foodQuality || ""}
                  onChange={(e) => setFoodQuality(+e.target.value || 0)}
                />
              </div>
              <div className="field">
                <label>Packaging (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={packaging || ""}
                  onChange={(e) => setPackaging(+e.target.value || 0)}
                />
              </div>
              <div className="field">
                <label>Restaurant feedback (optional)</label>
                <textarea
                  value={restaurantComment}
                  onChange={(e) => setRestaurantComment(e.target.value)}
                  rows={3}
                />
              </div>

              {hasDeliveryPartner ? (
                <>
                  <h5 style={{ marginBottom: 8 }}>Delivery</h5>
                  <div className="field">
                    <label>Rider rating (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={riderRating || ""}
                      onChange={(e) => setRiderRating(+e.target.value || 0)}
                    />
                  </div>
                  <div className="field">
                    <label>Rider feedback (optional)</label>
                    <textarea
                      value={deliveryComment}
                      onChange={(e) => setDeliveryComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : null}

              <button className="btn" onClick={onRate} disabled={!canSubmit}>
                {submitting ? "Submitting..." : "Submit rating"}
              </button>
            </div>
          ) : null}
          {order.status === "DELIVERED" && order.ratingSubmittedAt ? (
            <p style={{ marginTop: 16, color: "#216E39", fontWeight: 700 }}>Thanks for your review.</p>
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
