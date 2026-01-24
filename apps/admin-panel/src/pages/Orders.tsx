import { useEffect, useState } from "react";
import api from "../api/client";
import AssignPartnerModal from "../components/AssignModal";
import AssignDeliveryModal from "../components/AssignDeliveryModal";
import "../styles/orders.css";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partnerOrder, setPartnerOrder] = useState<string | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<string | null>(null);

  const loadOrders = async () => {
    const res = await api.get("/admin/orders");
    setOrders(res.data);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="page">
      <h1>Orders</h1>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Partner</th>
            <th>Delivery</th>
          </tr>
        </thead>

        <tbody>
          {orders.map(o => (
            <tr key={o._id}>
              <td>{o._id.slice(-6)}</td>
              <td>{o.status}</td>

              <td>
                <button onClick={() => setPartnerOrder(o._id)}>
                  Assign Partner
                </button>
              </td>

              <td>
                <button onClick={() => setDeliveryOrder(o._id)}>
                  Assign Delivery
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {partnerOrder && (
        <AssignPartnerModal
          orderId={partnerOrder}
          onClose={() => setPartnerOrder(null)}
          onSuccess={loadOrders}
        />
      )}

      {deliveryOrder && (
        <AssignDeliveryModal
          orderId={deliveryOrder}
          onClose={() => setDeliveryOrder(null)}
        />
      )}
    </div>
  );
}
