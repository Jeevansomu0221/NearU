import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addFavoriteRestaurant,
  getMyFavorites,
  getPartners,
  getShopName,
  removeFavoriteRestaurant,
  type Shop
} from "@vyaha/api-client";
import CustomerShell from "../components/CustomerShell";
import { useGeolocation } from "../hooks/useGeolocation";

const categories = [
  { key: "all", label: "All" },
  { key: "bakery", label: "Bakery" },
  { key: "mini-restaurant", label: "Restaurant" },
  { key: "tiffin-center", label: "Tiffins" },
  { key: "fast-food", label: "Fast Food" }
];

export default function HomePage() {
  const navigate = useNavigate();
  const { coords, error: geoError, loading: geoLoading, radiusKm } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [vegMode, setVegMode] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = coords
        ? { latitude: coords.latitude, longitude: coords.longitude, radiusKm }
        : undefined;
      const res = await getPartners(params);
      setShops((res.data as Shop[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shops");
    } finally {
      setLoading(false);
    }
  }, [coords, radiusKm]);

  useEffect(() => {
    if (!geoLoading) loadShops();
  }, [geoLoading, loadShops]);

  useEffect(() => {
    getMyFavorites()
      .then((res) => {
        const ids = new Set((res.data?.restaurants || []).map((r) => r._id));
        setFavorites(ids);
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    return shops.filter((shop) => {
      const name = getShopName(shop).toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      const matchesCategory = category === "all" || shop.category === category;
      return matchesSearch && matchesCategory && shop.isOpen !== false;
    });
  }, [shops, search, category]);

  const toggleFavorite = async (shopId: string) => {
    const isFav = favorites.has(shopId);
    const res = isFav ? await removeFavoriteRestaurant(shopId) : await addFavoriteRestaurant(shopId);
    if (res.success) {
      const ids = new Set((res.data?.restaurants || []).map((r) => r._id));
      setFavorites(ids);
    }
  };

  return (
    <CustomerShell title="Order Food">
      <div className="field">
        <input placeholder="Search local shops" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {categories.map((c) => (
          <button
            key={c.key}
            className={`btn ${category === c.key ? "" : "ghost"}`}
            style={{ padding: "8px 12px" }}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
        <button className={`btn ${vegMode ? "" : "ghost"}`} style={{ padding: "8px 12px" }} onClick={() => setVegMode((v) => !v)}>
          Veg mode
        </button>
      </div>
      {geoError ? <p className="error-text">{geoError}</p> : null}
      {loading ? <p>Loading nearby shops...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <div className="grid-shops">
        {filtered.map((shop) => (
          <article
            key={shop._id}
            className="card shop-card"
            onClick={() => navigate(`/shop/${shop._id}`, { state: { shop, vegMode } })}
          >
            <img src={shop.shopImageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"} alt="" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <h3 style={{ margin: 0 }}>{getShopName(shop)}</h3>
              <button
                className="btn ghost"
                style={{ padding: "4px 8px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(shop._id);
                }}
              >
                {favorites.has(shop._id) ? "★" : "☆"}
              </button>
            </div>
            <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: "0.9rem" }}>{shop.category}</p>
            <span className={`badge ${shop.isOpen ? "open" : "closed"}`}>{shop.isOpen ? "Open" : "Closed"}</span>
            {shop.distanceKm != null ? (
              <span style={{ marginLeft: 8, fontSize: "0.85rem", color: "var(--muted)" }}>
                {shop.distanceKm.toFixed(1)} km
              </span>
            ) : null}
          </article>
        ))}
      </div>
      {!loading && filtered.length === 0 ? (
        <div className="empty-state">
          <p>No shops found nearby.</p>
          <button className="btn secondary" onClick={loadShops}>
            Retry
          </button>
        </div>
      ) : null}
      <p style={{ marginTop: 20 }}>
        <Link to="https://www.vyaha.com">Marketing site</Link>
      </p>
    </CustomerShell>
  );
}
