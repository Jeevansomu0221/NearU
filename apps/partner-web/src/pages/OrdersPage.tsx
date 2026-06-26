import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPartnerOrders, type Order } from "@vyaha/api-client";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = () => getPartnerOrders().then((res) => setOrders(res.data || []));

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <h2>Orders</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Status</th>
            <th>Total</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id}>
              <td>
                <Link to={`/orders/${order._id}`}>{order._id.slice(-8)}</Link>
              </td>
              <td>{order.status}</td>
              <td>₹{order.grandTotal}</td>
              <td>{new Date(order.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 ? <p>No orders yet.</p> : null}
    </div>
  );
}
