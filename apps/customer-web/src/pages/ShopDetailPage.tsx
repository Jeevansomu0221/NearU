import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getPartnerDetails, getPartnerMenu, getShopName, type MenuItem, type Shop } from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";
import { useCart } from "../contexts/CartContext";

export default function ShopDetailPage() {
  const { shopId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialShop = (location.state as { shop?: Shop; vegMode?: boolean } | null)?.shop;
  const vegMode = (location.state as { vegMode?: boolean } | null)?.vegMode;
  const [shop, setShop] = useState<Shop | null>(initialShop || null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addItem, items } = useCart();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!shop) {
          const shopRes = await getPartnerDetails(shopId);
          setShop(shopRes.data as Shop);
        }
        const menuRes = await getPartnerMenu(shopId);
        let list = (menuRes.data as MenuItem[]) || [];
        if (vegMode) list = list.filter((m) => m.isVeg !== false);
        setMenu(list.filter((m) => m.isAvailable !== false));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load menu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shopId, shop, vegMode]);

  const shopName = shop ? getShopName(shop) : "Shop";

  return (
    <CustomerShell title={shopName} backTo="/" showNav={false}>
      {loading ? <p>Loading menu...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {menu.map((item) => (
          <div key={item._id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover" }} />
            ) : null}
            <div style={{ flex: 1 }}>
              <strong>{item.name}</strong>
              {item.description ? <p style={{ margin: "4px 0", color: "var(--muted)" }}>{item.description}</p> : null}
              <p style={{ margin: 0 }}>₹{item.price}</p>
            </div>
            <button
              className="btn"
              onClick={() =>
                addItem({
                  menuItemId: item._id,
                  name: item.name,
                  price: item.price,
                  quantity: 1,
                  shopId,
                  shopName
                })
              }
            >
              Add
            </button>
          </div>
        ))}
      </div>
      {items.length > 0 ? (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: 16 }}>
          <button className="btn" style={{ width: "100%" }} onClick={() => navigate("/cart")}>
            View cart ({items.reduce((c, i) => c + i.quantity, 0)} items)
          </button>
        </div>
      ) : null}
    </CustomerShell>
  );
}
