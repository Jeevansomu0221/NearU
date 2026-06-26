import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatAddressText,
  getUserProfile,
  quoteOrderPricing,
  type OrderPricingQuote,
  type UserProfile
} from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";
import { useCart } from "../contexts/CartContext";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getCartTotal, currentShopId, currentShopName } = useCart();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [quote, setQuote] = useState<OrderPricingQuote | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getUserProfile()
      .then((res) => setProfile(res.data || null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const address = profile?.address || profile?.addresses?.find((a) => a.isDefault) || profile?.addresses?.[0];
    if (!address?.latitude || !address?.longitude || !currentShopId || items.length === 0) {
      setQuote(null);
      return;
    }
    setLoading(true);
    quoteOrderPricing(
      [{ partnerId: currentShopId, itemTotal: getCartTotal() }],
      { latitude: address.latitude, longitude: address.longitude }
    )
      .then((res) => setQuote(res.data || null))
      .catch(() => setQuote(null))
      .finally(() => setLoading(false));
  }, [profile, currentShopId, items, getCartTotal]);

  if (items.length === 0) {
    return (
      <CustomerShell title="Cart" backTo="/">
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <button className="btn" onClick={() => navigate("/")}>
            Browse shops
          </button>
        </div>
      </CustomerShell>
    );
  }

  const address = profile?.address || profile?.addresses?.find((a) => a.isDefault) || profile?.addresses?.[0];
  const addressText = formatAddressText(address);

  const proceed = () => {
    if (!profile || !address?.latitude || !address?.longitude) {
      setError("Complete your delivery address in Profile before checkout.");
      return;
    }
    navigate("/payment", {
      state: {
        userProfile: profile,
        orderSummary: {
          items,
          subtotal: getCartTotal(),
          deliveryFee: quote?.deliveryFee || 0,
          foodGst: quote?.foodGst,
          deliveryGst: quote?.deliveryGst,
          platformFee: quote?.platformFee,
          taxDiscount: quote?.taxDiscount,
          deliveryDistanceKm: quote?.deliveryDistanceKm,
          total: quote?.payableTotal || quote?.grandTotal || getCartTotal(),
          address: addressText,
          deliveryLocation: { latitude: address.latitude, longitude: address.longitude },
          note,
          groupedShops: [
            {
              shopId: currentShopId!,
              shopName: currentShopName || "Shop",
              items,
              subtotal: getCartTotal(),
              deliveryFee: quote?.deliveryFee,
              foodGst: quote?.foodGst,
              deliveryGst: quote?.deliveryGst,
              platformFee: quote?.platformFee,
              taxDiscount: quote?.taxDiscount,
              deliveryDistanceKm: quote?.deliveryDistanceKm
            }
          ]
        }
      }
    });
  };

  return (
    <CustomerShell title="Cart" backTo="/" showNav={false}>
      <div className="card" style={{ marginBottom: 12 }}>
        <strong>{currentShopName}</strong>
        {items.map((item) => (
          <div key={`${item.shopId}-${item.menuItemId || item.name}`} style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <div>
              {item.name} × {item.quantity}
              <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>₹{item.price * item.quantity}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn ghost" onClick={() => updateQuantity(item, item.quantity - 1)}>
                −
              </button>
              <button className="btn ghost" onClick={() => updateQuantity(item, item.quantity + 1)}>
                +
              </button>
              <button className="btn ghost" onClick={() => removeItem(item)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="field">
        <label>Order note (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
      <div className="card">
        <p>Deliver to: {addressText || "Add address in Profile"}</p>
        {quote ? (
          <>
            <p>Delivery fee: ₹{quote.deliveryFee}</p>
            <p>
              <strong>Total: ₹{quote.payableTotal || quote.grandTotal}</strong>
            </p>
          </>
        ) : (
          <p>Subtotal: ₹{getCartTotal()}</p>
        )}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn" style={{ width: "100%", marginTop: 12 }} disabled={loading} onClick={proceed}>
        {loading ? "Calculating..." : "Proceed to payment"}
      </button>
    </CustomerShell>
  );
}
