import { useEffect, useState } from "react";
import api from "../api/client";

export default function AssignPartnerModal({
  orderId,
  onClose,
  onSuccess
}: {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    api.get("/admin/partners").then(res => setPartners(res.data));
  }, []);

  const assign = async () => {
    await api.post("/admin/assign-partner", {
      orderId,
      partnerId,
      items: [{ name: itemName, quantity }],
      price
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Assign Partner</h3>

        <select value={partnerId} onChange={e => setPartnerId(e.target.value)}>
          <option value="">Select Partner</option>
          {partners.map(p => (
            <option key={p._id} value={p._id}>
              {p.shopName}
            </option>
          ))}
        </select>

        <input
          placeholder="Item name"
          value={itemName}
          onChange={e => setItemName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={e => setQuantity(Number(e.target.value))}
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={e => setPrice(Number(e.target.value))}
        />

        <div className="actions">
          <button onClick={assign}>Assign</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
