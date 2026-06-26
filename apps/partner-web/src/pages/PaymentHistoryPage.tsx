import { useEffect, useState } from "react";
import { getPartnerWallet, type PartnerWallet } from "@vyaha/api-client";

export default function PaymentHistoryPage() {
  const [wallet, setWallet] = useState<PartnerWallet | null>(null);

  useEffect(() => {
    getPartnerWallet().then((res) => setWallet(res.data || null));
  }, []);

  if (!wallet) return <p>Loading wallet...</p>;

  return (
    <div>
      <h2>Wallet & payouts</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Wallet balance</div>
          <strong>₹{wallet.walletBalance}</strong>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Lifetime earnings</div>
          <strong>₹{wallet.lifetimeEarnings}</strong>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Next payout</div>
          <strong>{new Date(wallet.nextPayoutDate).toLocaleDateString()}</strong>
        </div>
      </div>
      <p style={{ color: "var(--muted)" }}>{wallet.payoutNote}</p>
      <h3>Pending payout orders</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Amount</th>
            <th>Delivered</th>
          </tr>
        </thead>
        <tbody>
          {wallet.recentPendingPayoutOrders.map((o) => (
            <tr key={o._id}>
              <td>{o._id.slice(-8)}</td>
              <td>₹{o.grandTotal}</td>
              <td>{new Date(o.deliveredAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Payout history</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Amount</th>
            <th>Paid on</th>
          </tr>
        </thead>
        <tbody>
          {wallet.payouts.map((p) => (
            <tr key={p._id}>
              <td>
                {new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}
              </td>
              <td>₹{p.amount}</td>
              <td>{new Date(p.paidAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
