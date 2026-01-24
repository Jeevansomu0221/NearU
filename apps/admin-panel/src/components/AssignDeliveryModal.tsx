import { useEffect, useState } from "react";
import api from "../api/client";

export default function AssignDeliveryModal({ orderId, onClose }: any) {
  const [partners, setPartners] = useState<any[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    api.get("/admin/delivery-partners").then(res => setPartners(res.data));
  }, []);

  const assign = async () => {
    await api.post("/admin/assign-delivery", {
      orderId,
      deliveryPartnerId: selected
    });
    onClose();
    window.location.reload();
  };

  return (
    <div className="modal">
      <h3>Assign Delivery</h3>

      <select onChange={e => setSelected(e.target.value)}>
        <option>Select Delivery Partner</option>
        {partners.map(p => (
          <option key={p._id} value={p._id}>
            {p.phone}
          </option>
        ))}
      </select>

      <button onClick={assign}>Assign</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
