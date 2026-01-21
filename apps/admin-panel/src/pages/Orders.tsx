import { useEffect, useState } from "react";
import api from "../api/client";
import "../styles/orders.css";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    api.get("/admin/orders").then(res => setOrders(res.data));
  }, []);

  return (
    <div className="page">
      <h1>Orders</h1>

      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o._id}>
              <td>{o._id}</td>
              <td>{o.status}</td>
              <td>₹{o.totalAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
