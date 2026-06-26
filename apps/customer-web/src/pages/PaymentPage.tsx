import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  cancelOrder,
  createRazorpayOrder,
  createShopOrder,
  verifyPayment,
  type UserProfile
} from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";
import { useCart } from "../contexts/CartContext";
import { openRazorpayCheckout } from "../utils/razorpay";

type OrderSummary = {
  items: Array<{ name: string; price: number; quantity: number; menuItemId?: string }>;
  subtotal: number;
  total: number;
  address: string;
  deliveryLocation: { latitude: number; longitude: number };
  note?: string;
  groupedShops?: Array<{ shopId: string; shopName: string; items: unknown[]; subtotal: number }>;
  deliveryFee?: number;
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clear } = useCart();
  const { userProfile, orderSummary } = (location.state || {}) as {
    userProfile: UserProfile;
    orderSummary: OrderSummary;
  };
  const [method, setMethod] = useState<"CASH_ON_DELIVERY" | "RAZORPAY">("CASH_ON_DELIVERY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!userProfile || !orderSummary) {
    return (
      <CustomerShell title="Payment" backTo="/cart" showNav={false}>
        <div className="empty-state">
          <p>Checkout session expired.</p>
          <button className="btn" onClick={() => navigate("/cart")}>
            Back to cart
          </button>
        </div>
      </CustomerShell>
    );
  }

  const group = orderSummary.groupedShops?.[0];

  const placeOrder = async () => {
    setError("");
    setLoading(true);
    let createdOrderId = "";
    try {
      const items = orderSummary.items.map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        menuItemId: i.menuItemId
      }));
      const createRes = await createShopOrder(
        group!.shopId,
        orderSummary.address,
        items,
        orderSummary.note,
        method,
        orderSummary.deliveryLocation
      );
      if (!createRes.success || !createRes.data?._id) {
        throw new Error(createRes.message || "Failed to create order");
      }
      createdOrderId = createRes.data._id;

      if (method === "RAZORPAY") {
        const paymentOrder = await createRazorpayOrder(createdOrderId);
        if (!paymentOrder.success || !paymentOrder.data) {
          throw new Error(paymentOrder.message || "Failed to start payment");
        }
        const result = await openRazorpayCheckout({
          key: paymentOrder.data.keyId,
          amount: paymentOrder.data.amount,
          currency: paymentOrder.data.currency,
          name: "Vyaha",
          description: `Order ${createdOrderId}`,
          order_id: paymentOrder.data.id,
          prefill: { name: userProfile.name, contact: userProfile.phone, email: userProfile.email }
        });
        const verifyRes = await verifyPayment({
          orderId: createdOrderId,
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature
        });
        if (!verifyRes.success) {
          throw new Error(verifyRes.message || "Payment verification failed");
        }
      }

      clear();
      navigate(`/orders/${createdOrderId}`, { replace: true });
    } catch (err) {
      if (createdOrderId) {
        try {
          await cancelOrder(createdOrderId);
        } catch {
          // ignore
        }
      }
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerShell title="Payment" backTo="/cart" showNav={false}>
      <div className="card">
        <p>
          <strong>{group?.shopName}</strong>
        </p>
        <p>Items total: ₹{orderSummary.subtotal}</p>
        {orderSummary.deliveryFee != null ? <p>Delivery: ₹{orderSummary.deliveryFee}</p> : null}
        <p>
          <strong>Payable: ₹{orderSummary.total}</strong>
        </p>
      </div>
      <div className="field">
        <label>Payment method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
          <option value="CASH_ON_DELIVERY">Cash on delivery</option>
          <option value="RAZORPAY">Online (UPI / card / wallet)</option>
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn" style={{ width: "100%" }} disabled={loading} onClick={placeOrder}>
        {loading ? "Processing..." : "Place order"}
      </button>
    </CustomerShell>
  );
}
