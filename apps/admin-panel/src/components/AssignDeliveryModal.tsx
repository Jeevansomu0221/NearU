import { useEffect, useState } from "react";
import { assignDeliveryPartnerToOrder, getDeliveryPartners, type DeliveryPartnerRecord } from "../api/admin.api";

export default function AssignDeliveryModal({ orderId, onClose }: any) {
  const [partners, setPartners] = useState<DeliveryPartnerRecord[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    getDeliveryPartners().then((result) => {
      setPartners(result.filter((partner) => partner.status === "ACTIVE"));
    });
  }, []);

  const assign = async () => {
    if (!selected) return;
    await assignDeliveryPartnerToOrder(orderId, selected);
    onClose();
    window.location.reload();
  };

  return (
    <div className="modal">
      <h3>Assign Delivery</h3>

      <select onChange={(e) => setSelected(e.target.value)} value={selected}>
        <option value="">Select Delivery Partner</option>
        {partners.map((partner) => (
          <option key={partner._id} value={partner._id}>
            {(partner.userId?.name || partner.name || "Rider")} ({partner.userId?.phone || partner.phone || "No phone"})
          </option>
        ))}
      </select>

      <button onClick={assign} disabled={!selected}>Assign</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
