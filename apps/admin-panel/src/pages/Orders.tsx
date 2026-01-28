import { useEffect, useState } from "react";
import api from "../api/client";
import "../styles/orders.css";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryUsers, setDeliveryUsers] = useState<any[]>([]);
  const [pricingOrder, setPricingOrder] = useState<any | null>(null);
  const [assignOrder, setAssignOrder] = useState<any | null>(null);

  const [itemTotal, setItemTotal] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryUserId, setDeliveryUserId] = useState("");

  const loadOrders = async () => {
    const res = await api.get("/admin/orders");
    setOrders(res.data);
  };

  const loadDeliveryUsers = async () => {
  const res = await api.get("/admin/partners");
  setDeliveryUsers(
    res.data.filter((p: any) => p.role === "delivery")
  );
};


  useEffect(() => {
    loadOrders();
    loadDeliveryUsers();
  }, []);

  const priceOrder = async () => {
    await api.post(`/orders/${pricingOrder._id}/price`, {
      itemTotal: Number(itemTotal),
      deliveryFee: Number(deliveryFee)
    });

    setPricingOrder(null);
    setItemTotal("");
    setDeliveryFee("");
    loadOrders();
  };

  const assignDelivery = async () => {
    await api.post(`/orders/${assignOrder._id}/assign-delivery`, {
      deliveryPartnerId: deliveryUserId
    });

    setAssignOrder(null);
    setDeliveryUserId("");
    loadOrders();
  };

  return (
    <div className="page">
      <h1>Orders</h1>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Request</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {orders.map(o => (
            <tr key={o._id}>
              <td>{o._id.slice(-6)}</td>
              <td>{o.note || "-"}</td>
              <td>{o.status}</td>
              <td>
                {o.orderType === "CUSTOM" && o.status === "CREATED" && (
                  <button onClick={() => setPricingOrder(o)}>
                    Price
                  </button>
                )}

                {o.status === "CONFIRMED" && (
                  <button onClick={() => setAssignOrder(o)}>
                    Assign Delivery
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PRICE MODAL */}
      {pricingOrder && (
        <div className="modal">
          <div className="modal-content">
            <h3>Price Order</h3>
            <p>{pricingOrder.note}</p>

            <input
              type="number"
              placeholder="Item Total"
              value={itemTotal}
              onChange={e => setItemTotal(e.target.value)}
            />

            <input
              type="number"
              placeholder="Delivery Fee"
              value={deliveryFee}
              onChange={e => setDeliveryFee(e.target.value)}
            />

            <div className="actions">
              <button onClick={priceOrder}>Send Price</button>
              <button onClick={() => setPricingOrder(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN DELIVERY MODAL */}
      {assignOrder && (
        <div className="modal">
          <div className="modal-content">
            <h3>Assign Delivery</h3>

            <select
              value={deliveryUserId}
              onChange={e => setDeliveryUserId(e.target.value)}
            >
              <option value="">Select delivery partner</option>
              {deliveryUsers.map(d => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.phone})
                </option>
              ))}
            </select>

            <div className="actions">
              <button onClick={assignDelivery}>Assign</button>
              <button onClick={() => setAssignOrder(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
