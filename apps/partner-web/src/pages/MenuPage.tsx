import { useEffect, useState } from "react";
import {
  completeSetup,
  createMenuItem,
  deleteMenuItem,
  getPartnerProfile,
  getPartnerMenuItems,
  toggleMenuAvailability,
  updateMenuItem,
  uploadImage
} from "@vyaha/api-client";

type ExtraChoice = {
  name: string;
  price: number;
};

type MenuRow = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  preparationTime?: number;
  extraChoices?: ExtraChoice[];
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuRow[]>([]);
  const [partnerCategory, setPartnerCategory] = useState<string>("other");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["Main Items"]);

  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "Main Items",
    isVegetarian: true,
    preparationTime: "15",
    isAvailable: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extraChoices, setExtraChoices] = useState<ExtraChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const withCommonCategories = (categories: string[]) => [...categories, "Hots", "Other"];
  const CATEGORY_BY_SHOP_TYPE: Record<string, string[]> = {
    bakery: withCommonCategories(["Breads", "Cakes", "Pastries", "Cookies", "Puffs", "Buns"]),
    restaurant: withCommonCategories(["Veg Meals", "Non Veg Meals", "Biryani", "Curries", "Rice", "Combos"]),
    "cloud-kitchen": withCommonCategories(["Veg Meals", "Non Veg Meals", "Biryani", "Curries", "Rice", "Combos"]),
    "mini-restaurant": withCommonCategories(["Veg Meals", "Non Veg Meals", "Biryani", "Curries", "Rice", "Combos"]),
    grocery: withCommonCategories(["Staples", "Snacks", "Dairy", "Beverages", "Personal Care", "Household"]),
    "tiffin-center": withCommonCategories(["Idli", "Dosa", "Poori", "Uttapam", "Meals", "Snacks"]),
    "fast-food": withCommonCategories(["Pizza", "Burgers", "Fries", "Wraps", "Sandwiches", "Combos"]),
    sweets: withCommonCategories(["Milk Sweets", "Dry Sweets", "Namkeen", "Festival Specials", "Sugar-Free"]),
    "ice-creams": withCommonCategories(["Scoops", "Cups", "Family Packs", "Sundaes", "Shakes"]),
    juice: withCommonCategories(["Fresh Juice", "Milkshakes", "Smoothies", "Mocktails", "Fruit Bowls"]),
    other: withCommonCategories(["Main Items", "Snacks", "Beverages", "Desserts", "Specials"])
  };

  const ALL_CATEGORIES_FILTER = "All";

  const visibleItems = items
    .filter((item) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return item.name?.toLowerCase().includes(q);
    })
    .filter((item) => selectedCategory === ALL_CATEGORIES_FILTER || item.category === selectedCategory);

  const menuStats = {
    total: items.length,
    available: items.filter((item) => item.isAvailable !== false).length,
    unavailable: items.filter((item) => item.isAvailable === false).length
  };

  const load = () => getPartnerMenuItems().then((res) => setItems((res.data as MenuRow[]) || []));

  useEffect(() => {
    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const profileRes = await getPartnerProfile();
        const data = (profileRes.data || {}) as Record<string, unknown>;
        const cat = String(data.category || data.shopType || "other");
        const safePartnerCategory = cat || "other";
        const opts = CATEGORY_BY_SHOP_TYPE[safePartnerCategory] || CATEGORY_BY_SHOP_TYPE.other;
        if (!active) return;
        setPartnerCategory(safePartnerCategory);
        setCategoryOptions(opts);
        setSelectedCategory(ALL_CATEGORIES_FILTER);
        setForm((prev) => ({
          ...prev,
          category: opts[0] || "Main Items"
        }));
      } catch {
        // If profile doesn't load, keep defaults
      } finally {
        if (!active) return;
        await load();
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const save = async () => {
    setSaving(true);
    try {
      setMessage("");
      const name = form.name.trim();

      // Users often type "50/-" in this UI; Number("50/-") => NaN.
      // Keep digits + dot only so "50/-" becomes 50.
      const cleanedPrice = String(form.price).replace(/[^0-9.]/g, "");
      const price = parseFloat(cleanedPrice);

      if (!name) throw new Error("Name is required");
      if (!Number.isFinite(price) || price <= 0) throw new Error("Valid price is required");

      const parsedPrepTime = form.preparationTime ? parseInt(form.preparationTime.replace(/\D/g, ""), 10) : undefined;
      const preparationTime = Number.isFinite(parsedPrepTime) && parsedPrepTime! > 0 ? parsedPrepTime : undefined;

      const normalizedExtras = Array.isArray(extraChoices)
        ? extraChoices
            .map((choice) => ({
              name: String(choice.name || "").trim(),
              price: Number.isFinite(choice.price) ? Math.max(0, Number(choice.price)) : 0
            }))
            .filter((choice) => choice.name.length > 0)
        : [];

      let imageUrl: string | undefined;
      if (imageFile) {
        const res = await uploadImage(imageFile);
        if (!res.success || !res.data?.url) throw new Error("Image upload failed");
        imageUrl = res.data.url;
      }

      const payload: Record<string, unknown> = {
        name,
        price,
        description: form.description,
        category: form.category,
        isVegetarian: form.isVegetarian,
        preparationTime,
        isAvailable: form.isAvailable,
        extraChoices: normalizedExtras,
        ...(imageUrl ? { imageUrl } : {})
      };

      if (editingId) {
        await updateMenuItem(editingId, payload);
      } else {
        await createMenuItem(payload);
        if (items.length === 0) {
          await completeSetup();
        }
      }

      setForm({
        name: "",
        price: "",
        description: "",
        category: categoryOptions[0] || "Main Items",
        isVegetarian: true,
        preparationTime: "15",
        isAvailable: true
      });
      setEditingId(null);
      setExtraChoices([]);
      setImageFile(null);
      setMessage("Menu saved.");
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (id: string, file: File) => {
    const res = await uploadImage(file);
    if (res.success && res.data?.url) {
      await updateMenuItem(id, { imageUrl: res.data.url });
      load();
    }
  };

  const startEdit = (item: MenuRow) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      price: String(item.price),
      description: item.description || "",
      category: item.category || categoryOptions[0] || "Main Items",
      isVegetarian: item.isVegetarian !== false,
      preparationTime: String(item.preparationTime ?? 15),
      isAvailable: item.isAvailable !== false
    });
    setExtraChoices(item.extraChoices || []);
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <h2>Menu</h2>

      {loading ? (
        <p>Loading menu…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <strong>{menuStats.total}</strong>
            <div style={{ color: "#5b7393", marginTop: 4 }}>Total items</div>
          </div>
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <strong>{menuStats.available}</strong>
            <div style={{ color: "#5b7393", marginTop: 4 }}>Available</div>
          </div>
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <strong>{menuStats.unavailable}</strong>
            <div style={{ color: "#5b7393", marginTop: 4 }}>Unavailable</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, marginBottom: 14 }}>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item name" />
        </label>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Category</span>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value={ALL_CATEGORIES_FILTER}>All</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <h3>{editingId ? "Edit item" : "Add item"}</h3>
        <div className="field">
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Price</label>
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="menu-toggles">
          <label className="menu-toggle-row">
            <span>
              <strong>Vegetarian</strong>
              <small>Show a veg badge on this item</small>
            </span>
            <span className="menu-switch">
              <input
                type="checkbox"
                checked={form.isVegetarian}
                onChange={(e) => setForm({ ...form, isVegetarian: e.target.checked })}
              />
              <span className="menu-switch__track" aria-hidden />
            </span>
          </label>
          <label className="menu-toggle-row">
            <span>
              <strong>Available for order</strong>
              <small>Hidden items will not appear to customers</small>
            </span>
            <span className="menu-switch">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
              />
              <span className="menu-switch__track" aria-hidden />
            </span>
          </label>
        </div>

        <div className="field">
          <label>Prep time (minutes)</label>
          <input value={form.preparationTime} onChange={(e) => setForm({ ...form, preparationTime: e.target.value.replace(/\D/g, "") })} />
        </div>

        <section className="menu-extras">
          <div className="menu-extras__header">
            <div>
              <h4>Extra choices</h4>
              <p>Optional add-ons for this item only, like extra cheese or a larger portion.</p>
            </div>
            <span className="menu-extras__count">
              {extraChoices.length} {extraChoices.length === 1 ? "add-on" : "add-ons"}
            </span>
          </div>

          {extraChoices.length === 0 ? (
            <div className="menu-extras__empty">No extra choices yet. Add one if this item has optional extras.</div>
          ) : null}

          {extraChoices.map((choice, index) => (
            <div key={`extra-${index}`} className="menu-extras__row">
              <label className="menu-extras__field">
                <span>Choice name</span>
                <input
                  value={choice.name}
                  placeholder="e.g. Extra cheese"
                  onChange={(e) => {
                    const next = [...extraChoices];
                    next[index] = { ...next[index], name: e.target.value };
                    setExtraChoices(next);
                  }}
                />
              </label>
              <label className="menu-extras__field">
                <span>Extra price</span>
                <div className="menu-extras__price">
                  <span>₹</span>
                  <input
                    value={choice.price > 0 ? String(choice.price) : ""}
                    placeholder="0"
                    inputMode="decimal"
                    onChange={(e) => {
                      const next = [...extraChoices];
                      const parsed = e.target.value ? parseFloat(e.target.value.replace(/[^0-9.]/g, "")) : 0;
                      next[index] = { ...next[index], price: Number.isFinite(parsed) ? parsed : 0 };
                      setExtraChoices(next);
                    }}
                  />
                </div>
              </label>
              <button
                className="menu-extras__remove"
                type="button"
                onClick={() => setExtraChoices(extraChoices.filter((_, rowIndex) => rowIndex !== index))}
                disabled={saving}
                aria-label="Remove extra choice"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            className="menu-extras__add"
            type="button"
            onClick={() => setExtraChoices([...extraChoices, { name: "", price: 0 }])}
            disabled={saving}
          >
            + Add extra choice
          </button>
        </section>

        <div className="field" style={{ marginTop: 8 }}>
          <label className="btn secondary" style={{ cursor: "pointer" }}>
            Image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setImageFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {imagePreviewUrl ? (
            <div style={{ marginTop: 8 }}>
              <img src={imagePreviewUrl} alt="Preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }} />
            </div>
          ) : null}
        </div>
        <button className="btn" onClick={save} disabled={saving}>
          {editingId ? "Update" : "Add"} item
        </button>
        {message ? <p>{message}</p> : null}
      </div>
      <section className="menu-list card">
        <div className="menu-list__head">
          <div>
            <h3>Menu items</h3>
            <p>Prices, add-ons, and availability for what customers see.</p>
          </div>
          <span className="menu-list__count">{visibleItems.length} shown</span>
        </div>

        {visibleItems.length === 0 ? (
          <div className="menu-list__empty">No items match this search or category.</div>
        ) : (
          <div className="menu-list__rows">
            {visibleItems.map((item) => {
              const extraCount = item.extraChoices?.length || 0;
              const available = item.isAvailable !== false;
              return (
                <article key={item._id} className={`menu-item ${available ? "" : "is-unavailable"}`}>
                  {item.imageUrl ? (
                    <img className="menu-item__image" src={item.imageUrl} alt="" />
                  ) : (
                    <div className="menu-item__image menu-item__image--empty" aria-hidden>
                      {item.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="menu-item__body">
                    <strong>{item.name}</strong>
                    <div className="menu-item__pills">
                      {item.category ? <span className="menu-pill">{item.category}</span> : null}
                      <span className="menu-pill">{item.preparationTime || 15} min</span>
                      {item.isVegetarian ? <span className="menu-pill menu-pill--veg">Veg</span> : <span className="menu-pill">Non-veg</span>}
                      {extraCount > 0 ? <span className="menu-pill menu-pill--addons">{extraCount} add-on{extraCount === 1 ? "" : "s"}</span> : null}
                    </div>
                  </div>

                  <div className="menu-item__price">
                    <span>Price</span>
                    <strong>₹{item.price}</strong>
                  </div>

                  <label className="menu-switch">
                    <input
                      type="checkbox"
                      checked={available}
                      onChange={(e) => toggleMenuAvailability(item._id, e.target.checked).then(load)}
                    />
                    <span className="menu-switch__track" aria-hidden />
                    <span>{available ? "Available" : "Hidden"}</span>
                  </label>

                  <div className="menu-item__actions">
                    <button type="button" className="menu-action" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <label className="menu-action">
                      Image
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => e.target.files?.[0] && onUpload(item._id, e.target.files[0])}
                      />
                    </label>
                    <button
                      type="button"
                      className="menu-action menu-action--danger"
                      onClick={() => {
                        if (confirm(`Delete “${item.name}”?`)) {
                          void deleteMenuItem(item._id).then(load);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
