import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/orders/${id}`).then((res: any) => {
      setOrder(res.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!order) return <p>Order not found</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Order Details</h2>

      <p><b>Order ID:</b> {order._id}</p>
      <p><b>Status:</b> {order.status}</p>
      <p><b>Total:</b> ₹{order.totalAmount}</p>

      <hr />

      <h3>Customer</h3>
      <p>{order.customer?.phone}</p>
      <p>{order.deliveryAddress}</p>

      <hr />

      <h3>Sub Orders</h3>
      {order.subOrders?.length > 0 ? (
        order.subOrders.map((s: any) => (
          <div key={s._id} style={{ border: "1px solid #ddd", marginBottom: 10, padding: 10 }}>
            <p>Partner: {s.partnerId}</p>
            <p>Status: {s.status}</p>
            <p>Price: ₹{s.price || "Not set"}</p>
          </div>
        ))
      ) : (
        <p>No suborders yet</p>
      )}
    </div>
  );
}
